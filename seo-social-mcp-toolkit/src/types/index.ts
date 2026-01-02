import { z } from 'zod';

// ============================================================================
// CORE CONTENT TYPES
// ============================================================================

/**
 * Brand voice options for content generation
 */
export const BrandVoiceSchema = z.enum(['bold', 'professional', 'casual', 'funny']);
export type BrandVoice = z.infer<typeof BrandVoiceSchema>;

/**
 * Normalized content model - single source of truth for all platforms
 */
export const NormalizedContentSchema = z.object({
  topic: z.string().optional(),
  primaryKeyword: z.string().min(1, 'Primary keyword is required'),
  secondaryKeywords: z.array(z.string()).optional(),
  body: z.string().min(1, 'Body content is required'),
  cta: z.string().optional(),
  canonicalUrl: z.string().url('Canonical URL must be a valid URL'),
  mediaUrls: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
  links: z.array(z.string().url()).optional(),
  brandVoice: BrandVoiceSchema.optional().default('professional'),
  metadata: z.record(z.any()).optional(),
});

export type NormalizedContent = z.infer<typeof NormalizedContentSchema>;

// ============================================================================
// PLATFORM-SPECIFIC TYPES
// ============================================================================

/**
 * Target platforms
 */
export const TargetPlatformSchema = z.enum(['x', 'discord']);
export type TargetPlatform = z.infer<typeof TargetPlatformSchema>;

/**
 * X (Twitter) post mode
 */
export type XPostMode = 'single' | 'thread';

/**
 * X draft output
 */
export interface XDraft {
  mode: XPostMode;
  posts: string[];
  hashtags: string[];
}

/**
 * Discord embed field
 */
export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

/**
 * Discord embed
 */
export interface DiscordEmbed {
  title: string;
  description: string;
  url?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  image?: {
    url: string;
  };
  footer?: {
    text: string;
  };
  timestamp?: string;
}

/**
 * Discord draft output
 */
export interface DiscordDraft {
  channel_id_suggestion?: string;
  embed: DiscordEmbed;
}

/**
 * Combined drafts for all platforms
 */
export interface PlatformDrafts {
  x: XDraft;
  discord: DiscordDraft;
}

// ============================================================================
// TOOL INPUT/OUTPUT SCHEMAS
// ============================================================================

/**
 * seo_social_compose tool inputs
 */
export const ComposeOptionsSchema = z.object({
  variantCount: z.number().int().min(1).max(5).optional().default(2),
  includeThread: z.boolean().optional().default(true),
  includeDiscordPrompt: z.boolean().optional().default(true),
  useUtm: z.boolean().optional().default(false),
});

export type ComposeOptions = z.infer<typeof ComposeOptionsSchema>;

export const ComposeInputSchema = z.object({
  content: NormalizedContentSchema,
  options: ComposeOptionsSchema.optional(),
});

export type ComposeInput = z.infer<typeof ComposeInputSchema>;

export interface ComposeOutput {
  content_hash: string;
  drafts: PlatformDrafts;
  notes: string[];
}

/**
 * publish_post tool inputs
 */
export const PublishOptionsSchema = z.object({
  discord_channel_id: z.string().optional(),
  dry_run: z.boolean().optional().default(false),
  useUtm: z.boolean().optional().default(false),
  force_retry_failed_targets: z.boolean().optional().default(false),
});

export type PublishOptions = z.infer<typeof PublishOptionsSchema>;

export const PublishInputSchema = z.object({
  request_id: z.string().min(1, 'Request ID is required'),
  content: NormalizedContentSchema,
  targets: z.array(TargetPlatformSchema).min(1, 'At least one target platform is required'),
  options: PublishOptionsSchema.optional(),
});

export type PublishInput = z.infer<typeof PublishInputSchema>;

/**
 * Per-target result status
 */
export type TargetStatus = 'success' | 'failed' | 'skipped';

/**
 * Per-target publish result
 */
export interface TargetResult {
  target: TargetPlatform;
  status: TargetStatus;
  platform_id?: string;
  platform_url?: string;
  error_message?: string;
  posted_at?: string;
}

/**
 * Overall publish status
 */
export type OverallStatus = 'success' | 'partial' | 'failed' | 'dry_run';

/**
 * publish_post tool output
 */
export interface PublishOutput {
  request_id: string;
  content_hash: string;
  overall_status: OverallStatus;
  per_target_results: TargetResult[];
}

/**
 * get_post_status tool inputs
 */
export const GetPostStatusInputSchema = z.object({
  request_id: z.string().min(1, 'Request ID is required'),
});

export type GetPostStatusInput = z.infer<typeof GetPostStatusInputSchema>;

/**
 * get_post_status tool output
 */
export interface GetPostStatusOutput {
  request_id: string;
  content_hash: string;
  content: NormalizedContent;
  targets: TargetPlatform[];
  options?: PublishOptions;
  drafts?: PlatformDrafts;
  per_target_results: TargetResult[];
  created_at: string;
}

/**
 * list_recent_posts tool inputs
 */
export const ListRecentPostsInputSchema = z.object({
  limit: z.number().int().min(1).max(200).optional().default(50),
});

export type ListRecentPostsInput = z.infer<typeof ListRecentPostsInputSchema>;

/**
 * list_recent_posts single item
 */
export interface RecentPostItem {
  request_id: string;
  created_at: string;
  targets: TargetPlatform[];
  overall_status: OverallStatus;
  canonicalUrl: string;
  primaryKeyword: string;
  platform_urls: Record<TargetPlatform, string | null>;
}

/**
 * list_recent_posts tool output
 */
export interface ListRecentPostsOutput {
  posts: RecentPostItem[];
  total: number;
}

/**
 * seo_link_pack tool inputs
 */
export const SeoLinkPackInputSchema = z.object({
  canonicalUrl: z.string().url('Canonical URL must be a valid URL'),
  campaign: z.string().optional(),
  source: z.string().optional(),
  medium: z.string().optional(),
});

export type SeoLinkPackInput = z.infer<typeof SeoLinkPackInputSchema>;

/**
 * seo_link_pack tool output
 */
export interface SeoLinkPackOutput {
  canonicalUrl: string;
  utmUrl: string;
  params: Record<string, string>;
}

// ============================================================================
// DATABASE TYPES
// ============================================================================

/**
 * Database post_requests row
 */
export interface PostRequestRow {
  request_id: string;
  content_json: object;
  content_hash: string;
  targets_json: object;
  options_json: object | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Database post_drafts row
 */
export interface PostDraftRow {
  id: number;
  request_id: string;
  drafts_json: object;
  created_at: Date;
}

/**
 * Database post_results row
 */
export interface PostResultRow {
  id: number;
  request_id: string;
  target: string;
  status: string;
  platform_id: string | null;
  platform_url: string | null;
  error_message: string | null;
  posted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Publisher interface
 */
export interface Publisher<TInput, TOutput> {
  publish(input: TInput): Promise<TOutput>;
}

/**
 * X publisher input
 */
export interface XPublishInput {
  draft: XDraft;
  dry_run?: boolean;
}

/**
 * X publisher output
 */
export interface XPublishOutput {
  platform_ids: string[];
  platform_urls: string[];
}

/**
 * Discord publisher input
 */
export interface DiscordPublishInput {
  channel_id: string;
  embed: DiscordEmbed;
  dry_run?: boolean;
}

/**
 * Discord publisher output
 */
export interface DiscordPublishOutput {
  platform_id: string;
  platform_url: string;
}
