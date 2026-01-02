import type { SeoLinkPackInput, SeoLinkPackOutput } from '../types/index.js';
import { SeoLinkPackInputSchema } from '../types/index.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * seo_link_pack tool
 * Generates canonical + UTM variants consistently
 */
export async function seoLinkPack(input: SeoLinkPackInput): Promise<SeoLinkPackOutput> {
  // Validate input
  const validated = SeoLinkPackInputSchema.parse(input);

  const { canonicalUrl, campaign, source, medium } = validated;

  // Build UTM parameters
  const params: Record<string, string> = {
    utm_source: source || config.seo.defaultUtmSource,
    utm_medium: medium || config.seo.defaultUtmMedium,
    utm_campaign: campaign || config.seo.defaultUtmCampaign,
  };

  // Build UTM URL
  const url = new URL(canonicalUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const utmUrl = url.toString();

  logger.info({ canonical: canonicalUrl, utm: utmUrl }, 'Generated UTM link pack');

  return {
    canonicalUrl,
    utmUrl,
    params,
  };
}
