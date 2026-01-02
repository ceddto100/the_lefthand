import type { ComposeInput, ComposeOutput } from '../types/index.js';
import { ComposeInputSchema, ComposeOptionsSchema } from '../types/index.js';
import { generateContentHash } from '../utils/hash.js';
import { buildXDraft } from '../transformers/x.format.js';
import { buildDiscordEmbed } from '../transformers/discord.format.js';
import { seoLinkPack } from './seo-link-pack.js';
import { logger } from '../utils/logger.js';

/**
 * seo_social_compose tool
 * Produces platform-ready drafts from NormalizedContent without posting
 */
export async function seoSocialCompose(input: ComposeInput): Promise<ComposeOutput> {
  // Validate input
  const validated = ComposeInputSchema.parse(input);

  const { content, options } = validated;
  const opts = ComposeOptionsSchema.parse(options || {});

  logger.info({ primaryKeyword: content.primaryKeyword, options: opts }, 'Composing SEO social content');

  // Generate content hash
  const content_hash = generateContentHash(content);

  // Generate UTM URL if needed
  let utmUrl: string | undefined;
  if (opts.useUtm) {
    const linkPack = await seoLinkPack({
      canonicalUrl: content.canonicalUrl,
    });
    utmUrl = linkPack.utmUrl;
  }

  // Build drafts for each platform
  const xDraft = buildXDraft(content, { ...opts, utmUrl });
  const discordDraft = buildDiscordEmbed(content, { ...opts, utmUrl });

  // Collect notes about the composition
  const notes: string[] = [];

  // Check if primary keyword appears in X draft
  const xText = xDraft.posts.join(' ').toLowerCase();
  if (!xText.includes(content.primaryKeyword.toLowerCase())) {
    notes.push('⚠️  Primary keyword may not be prominent in X draft');
  }

  // Check if canonical URL is included
  if (!xText.includes(content.canonicalUrl) && !xText.includes(utmUrl || '')) {
    notes.push('⚠️  Canonical URL missing from X draft');
  }

  // Check X length
  if (xDraft.mode === 'thread') {
    notes.push(`✅ Created X thread with ${xDraft.posts.length} tweets`);
  } else {
    notes.push(`✅ Created single X tweet (${xDraft.posts[0].length} chars)`);
  }

  // Check Discord
  notes.push(`✅ Created Discord embed with ${discordDraft.embed.fields?.length || 0} fields`);

  // SEO checks passed
  if (discordDraft.embed.title.toLowerCase().includes(content.primaryKeyword.toLowerCase())) {
    notes.push('✅ Primary keyword appears in Discord title');
  }

  if (opts.useUtm) {
    notes.push('✅ Using UTM-tracked links');
  }

  logger.info({ content_hash, notes }, 'Composition complete');

  return {
    content_hash,
    drafts: {
      x: xDraft,
      discord: discordDraft,
    },
    notes,
  };
}
