import type { PublishInput, PublishOutput, TargetResult, TargetPlatform } from '../types/index.js';
import { PublishInputSchema, PublishOptionsSchema, ComposeOptionsSchema } from '../types/index.js';
import { generateContentHash } from '../utils/hash.js';
import { seoSocialCompose } from './seo-social-compose.js';
import { getXPublisher } from '../publishers/x.publisher.js';
import { getDiscordPublisher } from '../publishers/discord.publisher.js';
import { logger } from '../utils/logger.js';
import {
  findRequestById,
  insertPostRequest,
  insertPostDrafts,
  insertPostResult,
  findResultsByRequestId,
  findFailedTargets,
} from '../store/queries.js';
import { config } from '../config/index.js';

/**
 * publish_post tool
 * Publishes to X and/or Discord with full idempotency
 */
export async function publishPost(input: PublishInput): Promise<PublishOutput> {
  // Validate input
  const validated = PublishInputSchema.parse(input);

  const { request_id, content, targets, options } = validated;
  const opts = PublishOptionsSchema.parse(options || {});

  logger.info({ request_id, targets, dry_run: opts.dry_run }, 'Publishing post');

  // Generate content hash
  const content_hash = generateContentHash(content);

  // Check if request_id already exists
  const existingRequest = await findRequestById(request_id);

  if (existingRequest) {
    logger.info({ request_id }, 'Request ID already exists, checking idempotency');

    // Verify content hash matches
    if (existingRequest.content_hash !== content_hash) {
      const error = 'Request ID content mismatch: same request_id with different content';
      logger.error({ request_id, existing_hash: existingRequest.content_hash, new_hash: content_hash }, error);
      throw new Error(error);
    }

    // Get existing results
    const existingResults = await findResultsByRequestId(request_id);

    // Check if we should retry failed targets
    if (opts.force_retry_failed_targets) {
      const failedTargets = await findFailedTargets(request_id);

      if (failedTargets.length > 0) {
        logger.info({ request_id, failed_targets: failedTargets }, 'Retrying failed targets');

        // Retry only failed targets
        const retryResults = await publishToTargets(content, failedTargets, opts, content_hash);

        // Update results in database
        for (const result of retryResults) {
          await insertPostResult(request_id, result);
        }

        // Get updated results
        const updatedResults = await findResultsByRequestId(request_id);
        const overall_status = computeOverallStatus(updatedResults, targets);

        return {
          request_id,
          content_hash,
          overall_status,
          per_target_results: updatedResults,
        };
      }
    }

    // Return existing results (idempotency - no double-post)
    logger.info({ request_id }, 'Returning existing results (idempotent)');
    const overall_status = computeOverallStatus(existingResults, targets);

    return {
      request_id,
      content_hash,
      overall_status,
      per_target_results: existingResults,
    };
  }

  // New request - insert into database
  await insertPostRequest(request_id, content, content_hash, targets, options);

  // Generate drafts
  logger.info({ request_id }, 'Generating drafts');
  const composeOptions = ComposeOptionsSchema.parse({
    includeThread: true,
    includeDiscordPrompt: true,
    useUtm: opts.useUtm,
  });
  const composeResult = await seoSocialCompose({
    content,
    options: composeOptions,
  });

  // Store drafts
  await insertPostDrafts(request_id, composeResult.drafts);

  // Publish to targets
  const targetResults = await publishToTargets(content, targets, opts, content_hash, composeResult.drafts);

  // Store results
  for (const result of targetResults) {
    await insertPostResult(request_id, result);
  }

  // Compute overall status
  const overall_status = computeOverallStatus(targetResults, targets);

  logger.info({ request_id, overall_status }, 'Publishing complete');

  return {
    request_id,
    content_hash,
    overall_status,
    per_target_results: targetResults,
  };
}

/**
 * Publish to targets
 */
async function publishToTargets(
  content: any,
  targets: TargetPlatform[],
  options: any,
  _content_hash: string,
  drafts?: any
): Promise<TargetResult[]> {
  const results: TargetResult[] = [];
  const opts = PublishOptionsSchema.parse(options || {});

  // If drafts not provided, generate them
  if (!drafts) {
    const composeOptions = ComposeOptionsSchema.parse({
      includeThread: true,
      includeDiscordPrompt: true,
      useUtm: opts.useUtm,
    });
    const composeResult = await seoSocialCompose({
      content,
      options: composeOptions,
    });
    drafts = composeResult.drafts;
  }

  // Publish to each target
  for (const target of targets) {
    try {
      if (target === 'x') {
        const xPublisher = getXPublisher();
        const result = await xPublisher.publish({
          draft: drafts.x,
          dry_run: opts.dry_run,
        });

        results.push({
          target: 'x',
          status: 'success',
          platform_id: result.platform_ids[0],
          platform_url: result.platform_urls[0],
          posted_at: new Date().toISOString(),
        });

        logger.info({ target: 'x', platform_url: result.platform_urls[0] }, 'Published to X');
      } else if (target === 'discord') {
        const discordPublisher = getDiscordPublisher();
        const channelId = opts.discord_channel_id || config.discord.defaultChannelId;

        if (!channelId) {
          throw new Error('Discord channel ID is required');
        }

        const result = await discordPublisher.publish({
          channel_id: channelId,
          embed: drafts.discord.embed,
          dry_run: opts.dry_run,
        });

        results.push({
          target: 'discord',
          status: 'success',
          platform_id: result.platform_id,
          platform_url: result.platform_url,
          posted_at: new Date().toISOString(),
        });

        logger.info({ target: 'discord', platform_url: result.platform_url }, 'Published to Discord');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ target, error: errorMessage }, 'Failed to publish to target');

      results.push({
        target,
        status: 'failed',
        error_message: errorMessage,
      });
    }
  }

  return results;
}

/**
 * Compute overall status from target results
 */
function computeOverallStatus(
  results: TargetResult[],
  targets: TargetPlatform[]
): PublishOutput['overall_status'] {
  const successCount = results.filter(r => r.status === 'success').length;
  const totalCount = targets.length;

  if (successCount === 0) {
    return 'failed';
  } else if (successCount === totalCount) {
    return 'success';
  } else {
    return 'partial';
  }
}
