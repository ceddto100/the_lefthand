import type { ListRecentPostsInput, ListRecentPostsOutput } from '../types/index.js';
import { ListRecentPostsInputSchema } from '../types/index.js';
import { listRecentPosts as queryListRecentPosts } from '../store/queries.js';
import { logger } from '../utils/logger.js';

/**
 * list_recent_posts tool
 * Lists recent posts with summary information
 */
export async function listRecentPosts(input: ListRecentPostsInput): Promise<ListRecentPostsOutput> {
  // Validate input
  const validated = ListRecentPostsInputSchema.parse(input);

  const { limit = 50 } = validated;

  logger.info({ limit }, 'Listing recent posts');

  // Query database
  const posts = await queryListRecentPosts(limit);

  logger.info({ count: posts.length }, 'Recent posts retrieved');

  return {
    posts,
    total: posts.length,
  };
}
