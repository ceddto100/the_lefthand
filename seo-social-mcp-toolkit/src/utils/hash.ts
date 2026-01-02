import crypto from 'crypto';
import type { NormalizedContent } from '../types/index.js';

/**
 * Generate a stable SHA-256 hash of content for idempotency checking
 * Uses deterministic JSON serialization to ensure same content = same hash
 */
export function generateContentHash(content: NormalizedContent): string {
  // Create a stable representation by sorting keys
  const stableContent = {
    body: content.body,
    brandVoice: content.brandVoice || 'professional',
    canonicalUrl: content.canonicalUrl,
    cta: content.cta || '',
    links: content.links?.sort() || [],
    mediaUrls: content.mediaUrls?.sort() || [],
    metadata: content.metadata || {},
    primaryKeyword: content.primaryKeyword,
    secondaryKeywords: content.secondaryKeywords?.sort() || [],
    tags: content.tags?.sort() || [],
    topic: content.topic || '',
  };

  const contentString = JSON.stringify(stableContent, Object.keys(stableContent).sort());
  return crypto.createHash('sha256').update(contentString).digest('hex');
}

/**
 * Generate a short hash for display purposes
 */
export function generateShortHash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 12);
}
