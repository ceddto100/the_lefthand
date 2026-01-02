# The Left Hand

Multi-project repository for SEO and social media tools.

## Projects

### SEO Social MCP Toolkit

Production-ready MCP (Model Context Protocol) toolkit for managing SEO-optimized social media content across X (Twitter) and Discord.

**Location:** `./seo-social-mcp-toolkit/`

**Documentation:** See [seo-social-mcp-toolkit/README.md](./seo-social-mcp-toolkit/README.md) for detailed information.

## Deployment

This repository is configured for deployment on Render using the `render.yaml` configuration file.

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database
- API credentials for X (Twitter) and Discord

### Environment Variables

Required environment variables are defined in `render.yaml`. Make sure to set them in your Render dashboard:

- `DATABASE_URL`: PostgreSQL connection string
- `DISCORD_BOT_TOKEN`: Discord bot token
- `X_API_KEY`: X (Twitter) API key
- `X_API_SECRET`: X (Twitter) API secret
- `X_ACCESS_TOKEN`: X (Twitter) access token
- `X_ACCESS_SECRET`: X (Twitter) access token secret

### Deployment Steps

1. Connect your repository to Render
2. Render will automatically detect the `render.yaml` configuration
3. Set the required environment variables in the Render dashboard
4. Deploy the service
5. Run database migrations manually: `yarn migrate` (from the `seo-social-mcp-toolkit` directory)

## License

MIT
