import { Client, GatewayIntentBits, EmbedBuilder, TextChannel } from 'discord.js';
import type { DiscordPublishInput, DiscordPublishOutput } from '../types/index.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { retryWithBackoff } from '../utils/retry.js';

/**
 * Discord publisher - sends embeds to Discord channels
 */
export class DiscordPublisher {
  private client: Client | null = null;
  private isReady: boolean = false;

  constructor() {
    // Initialize client lazily
  }

  /**
   * Initialize Discord client
   */
  private async ensureClient(): Promise<Client> {
    if (this.client && this.isReady) {
      return this.client;
    }

    if (!config.discord.botToken) {
      throw new Error('Discord bot token is not configured');
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
      ],
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Discord client initialization timeout'));
      }, 30000);

      this.client!.once('ready', () => {
        clearTimeout(timeout);
        this.isReady = true;
        logger.info({ user: this.client!.user?.tag }, 'Discord client ready');
        resolve(this.client!);
      });

      this.client!.on('error', (error) => {
        logger.error({ error: error.message }, 'Discord client error');
      });

      this.client!.login(config.discord.botToken).catch(reject);
    });
  }

  /**
   * Publish an embed to a Discord channel
   */
  async publish(input: DiscordPublishInput): Promise<DiscordPublishOutput> {
    const { channel_id, embed, dry_run } = input;

    logger.info({ channel_id, dry_run }, 'Publishing to Discord');

    // Dry run mode
    if (dry_run) {
      logger.info({ channel_id, embed }, 'Discord dry run - would send embed');
      return {
        platform_id: 'dry_run_message_id',
        platform_url: `https://discord.com/channels/@me/${channel_id}/dry_run`,
      };
    }

    // Ensure client is ready
    const client = await this.ensureClient();

    // Publish with retry
    return retryWithBackoff(
      async () => {
        // Fetch channel
        const channel = await client.channels.fetch(channel_id);

        if (!channel || !(channel instanceof TextChannel)) {
          throw new Error(`Channel ${channel_id} not found or is not a text channel`);
        }

        // Build embed
        const discordEmbed = new EmbedBuilder()
          .setTitle(embed.title)
          .setDescription(embed.description)
          .setColor(embed.color || 0x4a90e2);

        if (embed.url) {
          discordEmbed.setURL(embed.url);
        }

        if (embed.image) {
          discordEmbed.setImage(embed.image.url);
        }

        if (embed.fields) {
          for (const field of embed.fields) {
            discordEmbed.addFields({
              name: field.name,
              value: field.value,
              inline: field.inline || false,
            });
          }
        }

        if (embed.footer) {
          discordEmbed.setFooter({ text: embed.footer.text });
        }

        if (embed.timestamp) {
          discordEmbed.setTimestamp(new Date(embed.timestamp));
        }

        // Send message
        const message = await channel.send({ embeds: [discordEmbed] });

        logger.info({ message_id: message.id, channel_id }, 'Discord message sent');

        return {
          platform_id: message.id,
          platform_url: message.url,
        };
      },
      config.retry,
      `Discord publish to ${channel_id}`
    );
  }

  /**
   * Cleanup - destroy client
   */
  async destroy(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      this.isReady = false;
      logger.info('Discord client destroyed');
    }
  }
}

// Singleton instance
let discordPublisher: DiscordPublisher | null = null;

/**
 * Get Discord publisher singleton
 */
export function getDiscordPublisher(): DiscordPublisher {
  if (!discordPublisher) {
    discordPublisher = new DiscordPublisher();
  }
  return discordPublisher;
}
