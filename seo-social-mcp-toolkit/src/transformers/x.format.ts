import type { NormalizedContent, XDraft, ComposeOptions } from '../types/index.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Build X (Twitter) draft from normalized content
 * Enforces SEO rules:
 * - Primary keyword must appear at least once
 * - Include canonical URL (or UTM variant)
 * - Strong hook in first 12 words
 * - Maximum 3 hashtags
 * - Auto-thread if content too long
 */
export function buildXDraft(
  content: NormalizedContent,
  options?: Partial<ComposeOptions> & { useUtm?: boolean; utmUrl?: string }
): XDraft {
  const opts = options || {};
  const maxLength = config.limits.x.maxTweetLength;
  const maxHashtags = config.limits.x.maxHashtags;

  // Determine the link to use
  const linkToUse = opts.useUtm && opts.utmUrl ? opts.utmUrl : content.canonicalUrl;

  // Generate hashtags from tags or keywords
  const hashtags = generateHashtags(content, maxHashtags);

  // Build the main content
  const hook = buildHook(content);
  const body = truncateBody(content.body, 200); // Keep body concise for tweets

  // Check if primary keyword appears in hook or body
  const keywordInContent = (hook + body).toLowerCase().includes(content.primaryKeyword.toLowerCase());
  const keywordSuffix = keywordInContent ? '' : ` ${content.primaryKeyword}`;

  // Build CTA if provided
  const cta = content.cta ? `\n\n${content.cta}` : '';

  // Assemble full tweet
  const hashtagString = hashtags.length > 0 ? ' ' + hashtags.map(h => `#${h}`).join(' ') : '';
  const fullTweet = `${hook}\n\n${body}${keywordSuffix}${cta}\n\n${linkToUse}${hashtagString}`;

  // Determine if we need to thread
  if (fullTweet.length > maxLength && opts.includeThread !== false) {
    logger.debug({ length: fullTweet.length, maxLength }, 'Tweet exceeds max length, creating thread');
    return buildThread(content, linkToUse, hashtags, opts);
  }

  // Single tweet (may be slightly over if link is long, Twitter auto-shortens)
  return {
    mode: 'single',
    posts: [fullTweet],
    hashtags,
  };
}

/**
 * Build a strong hook (first tweet in thread or single tweet)
 */
function buildHook(content: NormalizedContent): string {
  const topic = content.topic || content.primaryKeyword;

  // Adjust hook based on brand voice
  switch (content.brandVoice) {
    case 'bold':
      return `🚀 ${topic}: ${content.body.split('.')[0]}.`;
    case 'funny':
      return `😄 Hot take on ${topic}: ${content.body.split('.')[0]}.`;
    case 'casual':
      return `Hey! Quick thoughts on ${topic}: ${content.body.split('.')[0]}.`;
    case 'professional':
    default:
      return `${topic}: ${content.body.split('.')[0]}.`;
  }
}

/**
 * Truncate body to a reasonable length
 */
function truncateBody(body: string, maxWords: number): string {
  const words = body.split(/\s+/);
  if (words.length <= maxWords) {
    return body;
  }
  return words.slice(0, maxWords).join(' ') + '...';
}

/**
 * Generate hashtags from content
 */
function generateHashtags(content: NormalizedContent, maxHashtags: number): string[] {
  const candidates: string[] = [];

  // Add tags if provided
  if (content.tags) {
    candidates.push(...content.tags);
  }

  // Add primary keyword if no tags
  if (candidates.length === 0) {
    const keyword = content.primaryKeyword.replace(/\s+/g, '');
    if (keyword.length > 2) {
      candidates.push(keyword);
    }
  }

  // Add secondary keywords
  if (content.secondaryKeywords && candidates.length < maxHashtags) {
    const secondaryHashtags = content.secondaryKeywords
      .map(k => k.replace(/\s+/g, ''))
      .filter(k => k.length > 2);
    candidates.push(...secondaryHashtags);
  }

  // Return up to maxHashtags
  return candidates.slice(0, maxHashtags).map(tag => tag.replace(/^#/, ''));
}

/**
 * Build a thread when content is too long
 */
function buildThread(
  content: NormalizedContent,
  link: string,
  hashtags: string[],
  _options?: Partial<ComposeOptions>
): XDraft {
  const maxLength = config.limits.x.maxTweetLength;
  const maxThreadLength = config.limits.x.maxThreadLength;

  const posts: string[] = [];

  // Tweet 1: Hook
  const hook = buildHook(content);
  posts.push(`${hook}\n\n🧵 Thread 👇`);

  // Tweet 2+: Split body into chunks
  const sentences = content.body.split(/\.\s+/);
  let currentTweet = '';

  for (const sentence of sentences) {
    const withSentence = currentTweet + sentence + '. ';

    if (withSentence.length > maxLength - 50) {
      // Leave room for numbering
      if (currentTweet) {
        posts.push(currentTweet.trim());
      }
      currentTweet = sentence + '. ';
    } else {
      currentTweet = withSentence;
    }

    // Safety: don't exceed max thread length
    if (posts.length >= maxThreadLength - 1) {
      break;
    }
  }

  // Add remaining content
  if (currentTweet && posts.length < maxThreadLength - 1) {
    posts.push(currentTweet.trim());
  }

  // Final tweet: CTA + link + hashtags
  const cta = content.cta || 'Learn more:';
  const hashtagString = hashtags.length > 0 ? ' ' + hashtags.map(h => `#${h}`).join(' ') : '';
  posts.push(`${cta}\n\n${link}${hashtagString}`);

  // Number tweets (2/5, 3/5, etc.)
  const numberedPosts = posts.map((post, idx) => {
    if (idx === 0) return post; // Don't number the first tweet
    return `${idx}/${posts.length - 1}\n\n${post}`;
  });

  return {
    mode: 'thread',
    posts: numberedPosts,
    hashtags,
  };
}
