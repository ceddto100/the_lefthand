import { pool } from './index.js';
import type {
  NormalizedContent,
  TargetPlatform,
  PublishOptions,
  PlatformDrafts,
  PostRequestRow,
  PostDraftRow,
  PostResultRow,
  TargetResult,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Check if a request_id already exists
 */
export async function findRequestById(requestId: string): Promise<PostRequestRow | null> {
  const result = await pool.query<PostRequestRow>(
    'SELECT * FROM post_requests WHERE request_id = $1',
    [requestId]
  );
  return result.rows[0] || null;
}

/**
 * Insert a new post request
 */
export async function insertPostRequest(
  requestId: string,
  content: NormalizedContent,
  contentHash: string,
  targets: TargetPlatform[],
  options?: PublishOptions
): Promise<void> {
  await pool.query(
    `INSERT INTO post_requests (request_id, content_json, content_hash, targets_json, options_json)
     VALUES ($1, $2, $3, $4, $5)`,
    [requestId, JSON.stringify(content), contentHash, JSON.stringify(targets), options ? JSON.stringify(options) : null]
  );
  logger.info({ request_id: requestId, content_hash: contentHash }, 'Post request inserted');
}

/**
 * Insert post drafts
 */
export async function insertPostDrafts(
  requestId: string,
  drafts: PlatformDrafts
): Promise<void> {
  await pool.query(
    `INSERT INTO post_drafts (request_id, drafts_json)
     VALUES ($1, $2)`,
    [requestId, JSON.stringify(drafts)]
  );
  logger.debug({ request_id: requestId }, 'Post drafts inserted');
}

/**
 * Get post drafts by request_id
 */
export async function findDraftsByRequestId(requestId: string): Promise<PlatformDrafts | null> {
  const result = await pool.query<PostDraftRow>(
    'SELECT drafts_json FROM post_drafts WHERE request_id = $1 ORDER BY created_at DESC LIMIT 1',
    [requestId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].drafts_json as unknown as PlatformDrafts;
}

/**
 * Insert a post result for a specific target
 */
export async function insertPostResult(
  requestId: string,
  targetResult: TargetResult
): Promise<void> {
  await pool.query(
    `INSERT INTO post_results (request_id, target, status, platform_id, platform_url, error_message, posted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (request_id, target) DO UPDATE SET
       status = EXCLUDED.status,
       platform_id = EXCLUDED.platform_id,
       platform_url = EXCLUDED.platform_url,
       error_message = EXCLUDED.error_message,
       posted_at = EXCLUDED.posted_at,
       updated_at = now()`,
    [
      requestId,
      targetResult.target,
      targetResult.status,
      targetResult.platform_id || null,
      targetResult.platform_url || null,
      targetResult.error_message || null,
      targetResult.posted_at || null,
    ]
  );
  logger.debug({ request_id: requestId, target: targetResult.target, status: targetResult.status }, 'Post result inserted');
}

/**
 * Get all results for a request_id
 */
export async function findResultsByRequestId(requestId: string): Promise<TargetResult[]> {
 const result = await pool.query<PostResultRow>(
    'SELECT * FROM post_results WHERE request_id = $1 ORDER BY created_at ASC',
    [requestId]
  );

  return result.rows.map((row: PostResultRow) => ({
    target: row.target as TargetPlatform,
    status: row.status as TargetResult['status'],
    platform_id: row.platform_id || undefined,
    platform_url: row.platform_url || undefined,
    error_message: row.error_message || undefined,
    posted_at: row.posted_at?.toISOString() || undefined,
  }));
}

/**
 * Get failed targets for a request_id
 */
export async function findFailedTargets(requestId: string): Promise<TargetPlatform[]> {
  const result = await pool.query<{ target: string }>(
    `SELECT target FROM post_results
     WHERE request_id = $1 AND status = 'failed'`,
    [requestId]
  );

  return result.rows.map((row: { target: string }) => row.target as TargetPlatform);
}

/**
 * List recent posts with pagination
 */
export async function listRecentPosts(limit: number = 50) {
  const result = await pool.query<PostRequestRow & { results: PostResultRow[] }>(
    `SELECT
       pr.*,
       COALESCE(
         json_agg(
           json_build_object(
             'target', res.target,
             'status', res.status,
             'platform_url', res.platform_url
           )
         ) FILTER (WHERE res.id IS NOT NULL),
         '[]'::json
       ) as results
     FROM post_requests pr
     LEFT JOIN post_results res ON pr.request_id = res.request_id
     GROUP BY pr.request_id
     ORDER BY pr.created_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows.map((row: PostRequestRow & { results: PostResultRow[] | null }) => {
    const content = row.content_json as unknown as NormalizedContent;
    const targets = row.targets_json as unknown as TargetPlatform[];
    const results = (row.results || []) as unknown as { target: TargetPlatform; status: string; platform_url?: string }[];

    // Determine overall status
    let overallStatus: 'success' | 'partial' | 'failed' | 'dry_run' = 'failed';
    const successCount = results.filter(r => r.status === 'success').length;
    if (successCount === targets.length) {
      overallStatus = 'success';
    } else if (successCount > 0) {
      overallStatus = 'partial';
    }

    // Build platform URLs map
    const platformUrls: Record<string, string | null> = {};
    for (const result of results) {
      platformUrls[result.target] = result.platform_url || null;
    }

    return {
      request_id: row.request_id,
      created_at: row.created_at.toISOString(),
      targets,
      overall_status: overallStatus,
      canonicalUrl: content.canonicalUrl,
      primaryKeyword: content.primaryKeyword,
      platform_urls: platformUrls as Record<TargetPlatform, string | null>,
    };
  });
}
