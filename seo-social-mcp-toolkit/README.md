# SEO Social MCP Toolkit

Production-ready, maintainable SEO Social Media MCP Toolkit that helps generate, repurpose, and publish SEO-aligned social content to X (Twitter) and Discord.

## Features

- 🎯 **SEO-First**: Enforces keyword discipline, canonical links, and UTM tracking
- 🔄 **Idempotent**: Safe retries with request_id-based deduplication
- 📊 **Multi-Platform**: X (Twitter) and Discord with platform-specific transformers
- 🛠️ **MCP Server**: HTTP API with stable tool contracts and strong typing
- 💾 **Full Tracking**: PostgreSQL-backed request/result logging
- 🔁 **Retry Safety**: Exponential backoff with per-target retries (max 3)
- 🎨 **Brand Voice**: Support for bold, professional, casual, and funny tones
- 🔗 **UTM Support**: Automatic UTM parameter generation for tracking

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server (HTTP API)                     │
├─────────────────────────────────────────────────────────────┤
│  Tools:                                                      │
│  • seo_social_compose  - Generate platform-ready drafts     │
│  • publish_post        - Publish with idempotency           │
│  • get_post_status     - Retrieve post status               │
│  • list_recent_posts   - List recent posts                  │
│  • seo_link_pack       - Generate UTM links                 │
├─────────────────────────────────────────────────────────────┤
│  Transformers: X Format | Discord Format                    │
│  Publishers: X Publisher | Discord Publisher                │
│  Store: PostgreSQL (idempotency + tracking)                 │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Discord Bot Token ([Get one here](https://discord.com/developers/applications))
- X API Credentials (optional, uses stub if not configured)

### Installation

1. **Clone the repository**

```bash
cd seo-social-mcp-toolkit
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
PORT=3000
DATABASE_URL=postgres://seo_toolkit:seo_toolkit_pass@localhost:5432/seo_toolkit

# Discord (REQUIRED)
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_DEFAULT_CHANNEL_ID=your_default_channel_id_here

# X (optional - uses stub if not configured)
X_BEARER_TOKEN=your_x_bearer_token_here

# SEO & UTM
SEO_DEFAULT_UTM_SOURCE=twitter
SEO_DEFAULT_UTM_MEDIUM=social
SEO_DEFAULT_UTM_CAMPAIGN=seo_toolkit
```

4. **Start PostgreSQL**

```bash
docker-compose up -d postgres
```

5. **Run database migrations**

The migrations will run automatically when the container starts. To verify:

```bash
docker-compose exec postgres psql -U seo_toolkit -d seo_toolkit -c "\dt"
```

You should see: `post_requests`, `post_drafts`, `post_results`

6. **Start the server**

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Health Check

```bash
curl http://localhost:3000/health
```

### Tool: seo_social_compose

Generate platform-ready drafts without publishing.

```bash
curl -X POST http://localhost:3000/tools/seo_social_compose \
  -H "Content-Type: application/json" \
  -d '{
    "content": {
      "primaryKeyword": "TypeScript Best Practices",
      "body": "TypeScript has become essential for modern web development. Type safety catches bugs early. Interfaces and types improve code documentation. Strict mode ensures better code quality.",
      "canonicalUrl": "https://example.com/blog/typescript-best-practices",
      "cta": "Read the full guide",
      "brandVoice": "professional",
      "tags": ["typescript", "webdev", "programming"]
    },
    "options": {
      "useUtm": true,
      "includeThread": true,
      "includeDiscordPrompt": true
    }
  }'
```

**Response:**

```json
{
  "content_hash": "a3f2b1c...",
  "drafts": {
    "x": {
      "mode": "single",
      "posts": [
        "TypeScript Best Practices: TypeScript has become essential for modern web development.\n\n...\n\nhttps://example.com/blog/typescript-best-practices?utm_source=twitter&utm_medium=social #typescript #webdev"
      ],
      "hashtags": ["typescript", "webdev", "programming"]
    },
    "discord": {
      "channel_id_suggestion": "...",
      "embed": {
        "title": "📊 TypeScript Best Practices",
        "description": "**TypeScript Best Practices**\n\n• TypeScript has become essential...",
        "url": "https://example.com/blog/typescript-best-practices",
        "color": 4886754
      }
    }
  },
  "notes": [
    "✅ Created single X tweet (245 chars)",
    "✅ Created Discord embed with 1 fields",
    "✅ Primary keyword appears in Discord title",
    "✅ Using UTM-tracked links"
  ]
}
```

### Tool: publish_post

Publish to X and/or Discord with full idempotency.

```bash
curl -X POST http://localhost:3000/tools/publish_post \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_20240115_typescript_001",
    "content": {
      "primaryKeyword": "TypeScript Best Practices",
      "body": "TypeScript has become essential for modern web development. Type safety catches bugs early. Interfaces and types improve code documentation. Strict mode ensures better code quality.",
      "canonicalUrl": "https://example.com/blog/typescript-best-practices",
      "cta": "Read the full guide",
      "brandVoice": "professional",
      "tags": ["typescript", "webdev", "programming"]
    },
    "targets": ["x", "discord"],
    "options": {
      "discord_channel_id": "1234567890",
      "dry_run": false,
      "useUtm": true
    }
  }'
```

**Response:**

```json
{
  "request_id": "req_20240115_typescript_001",
  "content_hash": "a3f2b1c...",
  "overall_status": "success",
  "per_target_results": [
    {
      "target": "x",
      "status": "success",
      "platform_id": "1234567890",
      "platform_url": "https://twitter.com/i/web/status/1234567890",
      "posted_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "target": "discord",
      "status": "success",
      "platform_id": "9876543210",
      "platform_url": "https://discord.com/channels/.../9876543210",
      "posted_at": "2024-01-15T10:30:01.000Z"
    }
  ]
}
```

### Tool: get_post_status

Retrieve full post status by request_id.

```bash
curl -X POST http://localhost:3000/tools/get_post_status \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_20240115_typescript_001"
  }'
```

### Tool: list_recent_posts

List recent posts with summary information.

```bash
curl -X POST http://localhost:3000/tools/list_recent_posts \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 10
  }'
```

**Response:**

```json
{
  "posts": [
    {
      "request_id": "req_20240115_typescript_001",
      "created_at": "2024-01-15T10:30:00.000Z",
      "targets": ["x", "discord"],
      "overall_status": "success",
      "canonicalUrl": "https://example.com/blog/typescript-best-practices",
      "primaryKeyword": "TypeScript Best Practices",
      "platform_urls": {
        "x": "https://twitter.com/i/web/status/1234567890",
        "discord": "https://discord.com/channels/.../9876543210"
      }
    }
  ],
  "total": 1
}
```

### Tool: seo_link_pack

Generate canonical + UTM variants.

```bash
curl -X POST http://localhost:3000/tools/seo_link_pack \
  -H "Content-Type: application/json" \
  -d '{
    "canonicalUrl": "https://example.com/blog/typescript-best-practices",
    "campaign": "winter_2024",
    "source": "twitter",
    "medium": "social"
  }'
```

**Response:**

```json
{
  "canonicalUrl": "https://example.com/blog/typescript-best-practices",
  "utmUrl": "https://example.com/blog/typescript-best-practices?utm_source=twitter&utm_medium=social&utm_campaign=winter_2024",
  "params": {
    "utm_source": "twitter",
    "utm_medium": "social",
    "utm_campaign": "winter_2024"
  }
}
```

## Idempotency Behavior

The toolkit guarantees idempotent publishing:

1. **Same request_id + same content** → Returns existing results (no double-post)
2. **Same request_id + different content** → Returns 409 error (content mismatch)
3. **Retry failed targets** → Use `force_retry_failed_targets: true`

### Example: Retry Failed Targets

```bash
curl -X POST http://localhost:3000/tools/publish_post \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_20240115_typescript_001",
    "content": { ... },
    "targets": ["x", "discord"],
    "options": {
      "force_retry_failed_targets": true
    }
  }'
```

This will only retry targets that previously failed, without re-posting to successful targets.

## Platform-Specific Rules

### X (Twitter)

- ✅ Primary keyword appears at least once
- ✅ Canonical/UTM link included
- ✅ Strong hook in first ~12 words
- ✅ Maximum 3 hashtags
- ✅ Auto-thread if content exceeds 280 characters

### Discord

- ✅ Embed title contains primary keyword
- ✅ Description includes 3 bullet takeaways
- ✅ Canonical URL prominently included
- ✅ Discussion prompt question (optional)
- ✅ Color-coded by brand voice

## Integration with n8n

The toolkit can be orchestrated with n8n for scheduling and approval workflows.

### Option 1: n8n Cloud

1. Sign up at [n8n.io](https://n8n.io)
2. Create a new workflow
3. Add nodes:
   - **Cron Trigger** → Schedule posts
   - **HTTP Request** → Call `seo_social_compose` tool
   - **Manual Approval** (optional) → Review drafts
   - **HTTP Request** → Call `publish_post` tool
   - **IF** → Check for failures
   - **HTTP Request** → Notify Discord admin channel on error

### Option 2: Self-Hosted n8n

Uncomment the n8n service in `docker-compose.yml`:

```yaml
n8n:
  image: n8nio/n8n:latest
  ports:
    - "5678:5678"
  environment:
    - N8N_BASIC_AUTH_ACTIVE=true
    - N8N_BASIC_AUTH_USER=admin
    - N8N_BASIC_AUTH_PASSWORD=admin
  volumes:
    - n8n_data:/home/node/.n8n
```

Then run:

```bash
docker-compose up -d n8n
```

Access n8n at `http://localhost:5678`

### Example n8n Workflow

```
[Cron: Daily at 9 AM]
  ↓
[HTTP: POST /tools/seo_social_compose]
  ↓
[Set Variable: Store drafts]
  ↓
[Manual Approval Node] (optional)
  ↓
[HTTP: POST /tools/publish_post]
  ↓
[IF: overall_status === "success"]
  ├─ Yes → [Log Success]
  └─ No  → [HTTP: Notify Discord Admin Channel]
```

## X (Twitter) Authentication Setup

### Current Status

The toolkit includes a **pluggable X client interface** with two implementations:

- **StubbedXClient**: Returns fake IDs/URLs (no real posting)
- **RealXClient**: Uses `twitter-api-v2` library

### TODO: Full OAuth2 Setup

To use real X posting, you need to:

1. **Create a Twitter Developer Account**
   - Go to [developer.twitter.com](https://developer.twitter.com)
   - Apply for a developer account
   - Create a new app

2. **Enable OAuth 2.0**
   - In your app settings, enable OAuth 2.0
   - Set redirect URI (e.g., `http://localhost:3000/auth/callback`)
   - Note your Client ID and Client Secret

3. **Generate Access Token**

   Use the OAuth 2.0 PKCE flow to get an access token:

   ```typescript
   import { TwitterApi } from 'twitter-api-v2';

   const client = new TwitterApi({
     clientId: 'YOUR_CLIENT_ID',
     clientSecret: 'YOUR_CLIENT_SECRET',
   });

   const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
     'http://localhost:3000/auth/callback',
     { scope: ['tweet.read', 'tweet.write', 'users.read'] }
   );

   // Visit the URL, authorize, get the code
   // Then exchange it for tokens:
   const { accessToken, refreshToken } = await client.loginWithOAuth2({
     code: 'CODE_FROM_CALLBACK',
     codeVerifier,
     redirectUri: 'http://localhost:3000/auth/callback',
   });
   ```

4. **Update .env**

   ```env
   X_CLIENT_ID=your_client_id
   X_CLIENT_SECRET=your_client_secret
   X_ACCESS_TOKEN=your_access_token
   X_REFRESH_TOKEN=your_refresh_token
   X_BEARER_TOKEN=your_bearer_token
   ```

5. **Restart Server**

   The toolkit will automatically use `RealXClient` when credentials are detected.

### Alternative: Bearer Token (Read-Only)

For read-only operations or testing, you can use a Bearer Token:

```env
X_BEARER_TOKEN=your_bearer_token_here
```

## Database Schema

### Tables

**post_requests**
- `request_id` (PK) - Client-provided unique identifier
- `content_json` - Full normalized content
- `content_hash` - SHA-256 hash for duplicate detection
- `targets_json` - Array of target platforms
- `options_json` - Publish options
- `created_at`, `updated_at`

**post_drafts**
- `id` (PK, auto-increment)
- `request_id` (FK)
- `drafts_json` - Platform-specific drafts
- `created_at`

**post_results**
- `id` (PK, auto-increment)
- `request_id` (FK)
- `target` - Platform name (x, discord)
- `status` - success, failed, skipped
- `platform_id` - Platform-specific message/tweet ID
- `platform_url` - Direct link to post
- `error_message` - Error details if failed
- `posted_at` - Timestamp of successful post
- `created_at`, `updated_at`

## Development

### Project Structure

```
seo-social-mcp-toolkit/
├── src/
│   ├── config/          # Configuration management
│   ├── types/           # TypeScript types & Zod schemas
│   ├── tools/           # MCP tool implementations
│   ├── transformers/    # Platform-specific formatters
│   ├── publishers/      # Platform-specific publishers
│   ├── store/           # Database layer
│   ├── utils/           # Utilities (hash, retry, logger)
│   ├── server.ts        # Fastify server setup
│   └── index.ts         # Main entry point
├── migrations/          # Database migrations
├── docker-compose.yml   # Docker services
├── package.json
├── tsconfig.json
└── README.md
```

### Running Tests

```bash
# TODO: Add tests
npm test
```

### Building for Production

```bash
npm run build
npm start
```

## Extending the Toolkit

### Adding a New Platform (e.g., LinkedIn)

1. **Create transformer**: `src/transformers/linkedin.format.ts`
2. **Create publisher**: `src/publishers/linkedin.publisher.ts`
3. **Update types**: Add `'linkedin'` to `TargetPlatformSchema`
4. **Update publish-post tool**: Add LinkedIn publishing logic
5. **Update seo-social-compose**: Include LinkedIn drafts

### Adding Custom SEO Rules

Edit `src/transformers/x.format.ts` or `src/transformers/discord.format.ts` to add custom validation or formatting rules.

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `DISCORD_BOT_TOKEN` | Yes | - | Discord bot token |
| `DISCORD_DEFAULT_CHANNEL_ID` | Yes | - | Default Discord channel |
| `X_BEARER_TOKEN` | No | - | X API bearer token |
| `X_ACCESS_TOKEN` | No | - | X API access token |
| `SEO_DEFAULT_UTM_SOURCE` | No | `twitter` | Default UTM source |
| `SEO_DEFAULT_UTM_MEDIUM` | No | `social` | Default UTM medium |
| `SEO_DEFAULT_UTM_CAMPAIGN` | No | `seo_toolkit` | Default UTM campaign |
| `LOG_LEVEL` | No | `info` | Logging level |

## Troubleshooting

### Database connection failed

Ensure PostgreSQL is running:

```bash
docker-compose ps postgres
docker-compose logs postgres
```

### Discord bot token invalid

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your app → Bot → Copy token
3. Update `.env` with new token
4. Restart server

### X posts not appearing

If using stubbed client, check logs for `STUBBED:` warnings. To enable real posting, configure X API credentials (see X Authentication Setup section).

## License

MIT

## Support

For issues and questions:
- Create an issue in the repository
- Check logs: `docker-compose logs -f`
- Review database state: `docker-compose exec postgres psql -U seo_toolkit`

---

**Built with ❤️ for SEO-driven social media marketing**
