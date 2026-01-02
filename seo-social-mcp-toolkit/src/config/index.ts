import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Application configuration
 */
export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgres://seo_toolkit:seo_toolkit_pass@localhost:5432/seo_toolkit',
  },

  // Discord
  discord: {
    botToken: process.env.DISCORD_BOT_TOKEN || '',
    defaultChannelId: process.env.DISCORD_DEFAULT_CHANNEL_ID || '',
  },

  // X (Twitter)
  x: {
    clientId: process.env.X_CLIENT_ID || '',
    clientSecret: process.env.X_CLIENT_SECRET || '',
    accessToken: process.env.X_ACCESS_TOKEN || '',
    refreshToken: process.env.X_REFRESH_TOKEN || '',
    bearerToken: process.env.X_BEARER_TOKEN || '',
  },

  // SEO & UTM
  seo: {
    defaultUtmSource: process.env.SEO_DEFAULT_UTM_SOURCE || 'twitter',
    defaultUtmMedium: process.env.SEO_DEFAULT_UTM_MEDIUM || 'social',
    defaultUtmCampaign: process.env.SEO_DEFAULT_UTM_CAMPAIGN || 'seo_toolkit',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Retry configuration
  retry: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  },

  // Platform limits
  limits: {
    x: {
      maxTweetLength: 280,
      maxThreadLength: 10,
      maxHashtags: 3,
    },
    discord: {
      maxEmbedTitleLength: 256,
      maxEmbedDescriptionLength: 4096,
      maxEmbedFields: 25,
      maxEmbedFieldNameLength: 256,
      maxEmbedFieldValueLength: 1024,
    },
  },
} as const;

/**
 * Validate required configuration
 */
export function validateConfig(): void {
  const errors: string[] = [];

  // Check Discord config if enabled
  if (!config.discord.botToken) {
    errors.push('DISCORD_BOT_TOKEN is not set');
  }

  // Database is always required
  if (!config.database.url) {
    errors.push('DATABASE_URL is not set');
  }

  // X config warnings (not errors since we stub it)
  if (!config.x.bearerToken && !config.x.accessToken) {
    console.warn('⚠️  X API credentials not configured. X publishing will use stubbed implementation.');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}
