import { TwitterApi } from 'twitter-api-v2';
import type { XPublishInput, XPublishOutput } from '../types/index.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { retryWithBackoff } from '../utils/retry.js';

/**
 * X Client interface - allows swapping auth implementations
 */
export interface XClient {
  postTweet(text: string): Promise<{ id: string; url: string }>;
  postThread(texts: string[]): Promise<{ ids: string[]; urls: string[] }>;
}

/**
 * Real X client using twitter-api-v2
 * Requires proper OAuth2 credentials
 */
export class RealXClient implements XClient {
  private client: TwitterApi;

  constructor() {
    if (!config.x.bearerToken && !config.x.accessToken) {
      throw new Error('X API credentials not configured');
    }

    // Use bearer token if available, otherwise access token
    this.client = config.x.bearerToken
      ? new TwitterApi(config.x.bearerToken)
      : new TwitterApi({
          appKey: config.x.clientId,
          appSecret: config.x.clientSecret,
          accessToken: config.x.accessToken,
          accessSecret: config.x.refreshToken,
        });
  }

  async postTweet(text: string): Promise<{ id: string; url: string }> {
    const result = await this.client.v2.tweet(text);
    const tweetId = result.data.id;
    const url = `https://twitter.com/i/web/status/${tweetId}`;

    logger.info({ tweet_id: tweetId }, 'Tweet posted');

    return { id: tweetId, url };
  }

  async postThread(texts: string[]): Promise<{ ids: string[]; urls: string[] }> {
    const ids: string[] = [];
    const urls: string[] = [];
    let replyToId: string | undefined = undefined;

    for (const text of texts) {
      const result: any = await this.client.v2.tweet({
        text,
        reply: replyToId ? { in_reply_to_tweet_id: replyToId } : undefined,
      });

      const tweetId: string = result.data.id;
      ids.push(tweetId);
      urls.push(`https://twitter.com/i/web/status/${tweetId}`);
      replyToId = tweetId;

      logger.debug({ tweet_id: tweetId, thread_position: ids.length }, 'Thread tweet posted');
    }

    logger.info({ thread_length: ids.length }, 'Thread posted');

    return { ids, urls };
  }
}

/**
 * Stubbed X client for testing without real credentials
 * Returns fake IDs and URLs
 */
export class StubbedXClient implements XClient {
  async postTweet(text: string): Promise<{ id: string; url: string }> {
    const fakeId = `stub_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const url = `https://twitter.com/i/web/status/${fakeId}`;

    logger.warn({ fake_id: fakeId, text_preview: text.substring(0, 50) }, 'STUBBED: Tweet would be posted');

    return { id: fakeId, url };
  }

  async postThread(texts: string[]): Promise<{ ids: string[]; urls: string[] }> {
    const ids: string[] = [];
    const urls: string[] = [];

    for (const text of texts) {
      const fakeId = `stub_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      ids.push(fakeId);
      urls.push(`https://twitter.com/i/web/status/${fakeId}`);

      logger.debug({ fake_id: fakeId, text_preview: text.substring(0, 50) }, 'STUBBED: Thread tweet would be posted');
    }

    logger.warn({ thread_length: ids.length }, 'STUBBED: Thread would be posted');

    return { ids, urls };
  }
}

/**
 * X Publisher - publishes tweets and threads
 */
export class XPublisher {
  private client: XClient;

  constructor(client?: XClient) {
    // Use provided client, or try real client, fallback to stubbed
    if (client) {
      this.client = client;
    } else {
      try {
        this.client = new RealXClient();
        logger.info('Using real X API client');
      } catch (error) {
        logger.warn('X API credentials not configured, using stubbed client');
        this.client = new StubbedXClient();
      }
    }
  }

  /**
   * Publish to X (single tweet or thread)
   */
  async publish(input: XPublishInput): Promise<XPublishOutput> {
    const { draft, dry_run } = input;

    logger.info({ mode: draft.mode, post_count: draft.posts.length, dry_run }, 'Publishing to X');

    // Dry run mode
    if (dry_run) {
      logger.info({ draft }, 'X dry run - would post');
      return {
        platform_ids: draft.posts.map((_, i) => `dry_run_tweet_${i}`),
        platform_urls: draft.posts.map((_, i) => `https://twitter.com/i/web/status/dry_run_tweet_${i}`),
      };
    }

    // Publish with retry
    return retryWithBackoff(
      async () => {
        if (draft.mode === 'single') {
          const result = await this.client.postTweet(draft.posts[0]);
          return {
            platform_ids: [result.id],
            platform_urls: [result.url],
          };
        } else {
          const result = await this.client.postThread(draft.posts);
          return {
            platform_ids: result.ids,
            platform_urls: result.urls,
          };
        }
      },
      config.retry,
      `X publish (${draft.mode})`
    );
  }
}

// Singleton instance
let xPublisher: XPublisher | null = null;

/**
 * Get X publisher singleton
 */
export function getXPublisher(): XPublisher {
  if (!xPublisher) {
    xPublisher = new XPublisher();
  }
  return xPublisher;
}

/**
 * Set custom X client (for testing or custom auth)
 */
export function setXPublisher(client: XClient): void {
  xPublisher = new XPublisher(client);
}
