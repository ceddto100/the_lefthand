import type { GetPostStatusInput, GetPostStatusOutput, NormalizedContent, TargetPlatform, PublishOptions } from '../types/index.js';
import { GetPostStatusInputSchema } from '../types/index.js';
import { findRequestById, findResultsByRequestId, findDraftsByRequestId } from '../store/queries.js';
import { logger } from '../utils/logger.js';

/**
 * get_post_status tool
 * Retrieves full post status including content, drafts, and results
 */
export async function getPostStatus(input: GetPostStatusInput): Promise<GetPostStatusOutput> {
  // Validate input
  const validated = GetPostStatusInputSchema.parse(input);

  const { request_id } = validated;

  logger.info({ request_id }, 'Getting post status');

  // Find request
  const request = await findRequestById(request_id);

  if (!request) {
    throw new Error(`Request ID not found: ${request_id}`);
  }

  // Find results
  const results = await findResultsByRequestId(request_id);

  // Find drafts (optional)
  const drafts = await findDraftsByRequestId(request_id);

  // Parse stored JSON
  const content = request.content_json as unknown as NormalizedContent;
  const targets = request.targets_json as unknown as TargetPlatform[];
  const options = request.options_json as unknown as PublishOptions | undefined;

  logger.info({ request_id, results_count: results.length }, 'Post status retrieved');

  return {
    request_id,
    content_hash: request.content_hash,
    content,
    targets,
    options,
    drafts: drafts || undefined,
    per_target_results: results,
    created_at: request.created_at.toISOString(),
  };
}
