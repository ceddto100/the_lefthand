import type { NormalizedContent, DiscordDraft, ComposeOptions, DiscordEmbed } from '../types/index.js';
import { config } from '../config/index.js';

/**
 * Build Discord embed from normalized content
 * Enforces SEO rules:
 * - Title contains primary keyword
 * - Description includes 3 bullet takeaways
 * - Canonical URL prominently included
 * - Optional discussion prompt
 */
export function buildDiscordEmbed(
  content: NormalizedContent,
  options?: Partial<ComposeOptions> & { useUtm?: boolean; utmUrl?: string }
): DiscordDraft {
  const opts = options || {};
  const linkToUse = opts.useUtm && opts.utmUrl ? opts.utmUrl : content.canonicalUrl;

  // Build title with primary keyword
  const title = buildTitle(content);

  // Build description with bullet takeaways
  const description = buildDescription(content, linkToUse, opts);

  // Build embed
  const embed: DiscordEmbed = {
    title: truncate(title, config.limits.discord.maxEmbedTitleLength),
    description: truncate(description, config.limits.discord.maxEmbedDescriptionLength),
    url: content.canonicalUrl,
    color: getColorForBrandVoice(content.brandVoice || 'professional'),
    timestamp: new Date().toISOString(),
  };

  // Add image if provided
  if (content.mediaUrls && content.mediaUrls.length > 0) {
    embed.image = {
      url: content.mediaUrls[0],
    };
  }

  // Add fields for secondary keywords or metadata
  if (content.secondaryKeywords && content.secondaryKeywords.length > 0) {
    embed.fields = [
      {
        name: '🔑 Key Topics',
        value: content.secondaryKeywords.slice(0, 5).join(', '),
        inline: false,
      },
    ];
  }

  // Add footer
  embed.footer = {
    text: `Topic: ${content.topic || content.primaryKeyword}`,
  };

  return {
    channel_id_suggestion: config.discord.defaultChannelId,
    embed,
  };
}

/**
 * Build title with primary keyword
 */
function buildTitle(content: NormalizedContent): string {
  const topic = content.topic || content.primaryKeyword;

  switch (content.brandVoice) {
    case 'bold':
      return `🚀 ${topic.toUpperCase()}`;
    case 'funny':
      return `😄 ${topic} (And Why You Should Care)`;
    case 'casual':
      return `💬 Let's Talk About ${topic}`;
    case 'professional':
    default:
      return `📊 ${topic}`;
  }
}

/**
 * Build description with bullet takeaways
 */
function buildDescription(
  content: NormalizedContent,
  link: string,
  options?: Partial<ComposeOptions>
): string {
  const opts = options || {};
  // Extract key sentences from body (up to 3)
  const sentences = content.body.split(/\.\s+/).filter(s => s.trim().length > 0);
  const takeaways = sentences.slice(0, 3).map(s => `• ${s.trim()}.`);

  let description = `**${content.primaryKeyword}**\n\n`;
  description += takeaways.join('\n');

  // Add CTA if provided
  if (content.cta) {
    description += `\n\n**${content.cta}**`;
  }

  // Add canonical link
  description += `\n\n🔗 [Read the full article](${link})`;

  // Add discussion prompt if requested
  if (opts.includeDiscordPrompt !== false) {
    const prompt = buildDiscussionPrompt(content);
    description += `\n\n${prompt}`;
  }

  return description;
}

/**
 * Build a discussion prompt question
 */
function buildDiscussionPrompt(content: NormalizedContent): string {
  const topic = content.topic || content.primaryKeyword;

  const prompts = [
    `💭 What's your experience with ${topic}?`,
    `🤔 Have you encountered this with ${topic}?`,
    `💬 What are your thoughts on ${topic}?`,
    `🗣️ Let's discuss: How do you approach ${topic}?`,
  ];

  // Pick a prompt based on brand voice
  switch (content.brandVoice) {
    case 'bold':
      return `💥 **Drop your hot takes on ${topic} below!**`;
    case 'funny':
      return `😂 Share your funniest ${topic} story below! ⬇️`;
    case 'casual':
      return prompts[0];
    case 'professional':
    default:
      return prompts[3];
  }
}

/**
 * Get embed color based on brand voice
 */
function getColorForBrandVoice(brandVoice: string): number {
  switch (brandVoice) {
    case 'bold':
      return 0xff6b6b; // Red
    case 'funny':
      return 0xffd93d; // Yellow
    case 'casual':
      return 0x6bcf7f; // Green
    case 'professional':
    default:
      return 0x4a90e2; // Blue
  }
}

/**
 * Truncate text to max length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}
