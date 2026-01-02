import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { testConnection } from './store/index.js';
import {
  seoSocialCompose,
  publishPost,
  getPostStatus,
  listRecentPosts,
  seoLinkPack,
} from './tools/index.js';
import { ZodError } from 'zod';

/**
 * Create and configure Fastify server
 */
export async function createServer() {
  const fastify = Fastify({
    logger: true,
  });

  // Register CORS
  await fastify.register(cors, {
    origin: true,
  });

  // Health check
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'seo-social-mcp-toolkit',
    };
  });

  // Root endpoint
  fastify.get('/', async () => {
    return {
      service: 'SEO Social MCP Toolkit',
      version: '1.0.0',
      description: 'Production-ready SEO Social Media MCP Toolkit for X and Discord',
      endpoints: {
        health: 'GET /health',
        tools: {
          seo_social_compose: 'POST /tools/seo_social_compose',
          publish_post: 'POST /tools/publish_post',
          get_post_status: 'POST /tools/get_post_status',
          list_recent_posts: 'POST /tools/list_recent_posts',
          seo_link_pack: 'POST /tools/seo_link_pack',
        },
      },
    };
  });

  // Tool: seo_social_compose
  fastify.post('/tools/seo_social_compose', async (request, reply) => {
    try {
      const result = await seoSocialCompose(request.body as any);
      return result;
    } catch (error) {
      if (error instanceof ZodError) {
        reply.code(400);
        return {
          error: 'Validation error',
          details: error.errors,
        };
      }
      throw error;
    }
  });

  // Tool: publish_post
  fastify.post('/tools/publish_post', async (request, reply) => {
    try {
      const result = await publishPost(request.body as any);
      return result;
    } catch (error) {
      if (error instanceof ZodError) {
        reply.code(400);
        return {
          error: 'Validation error',
          details: error.errors,
        };
      }
      if (error instanceof Error && error.message.includes('content mismatch')) {
        reply.code(409);
        return {
          error: 'Conflict',
          message: error.message,
        };
      }
      throw error;
    }
  });

  // Tool: get_post_status
  fastify.post('/tools/get_post_status', async (request, reply) => {
    try {
      const result = await getPostStatus(request.body as any);
      return result;
    } catch (error) {
      if (error instanceof ZodError) {
        reply.code(400);
        return {
          error: 'Validation error',
          details: error.errors,
        };
      }
      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404);
        return {
          error: 'Not found',
          message: error.message,
        };
      }
      throw error;
    }
  });

  // Tool: list_recent_posts
  fastify.post('/tools/list_recent_posts', async (request, reply) => {
    try {
      const result = await listRecentPosts(request.body as any);
      return result;
    } catch (error) {
      if (error instanceof ZodError) {
        reply.code(400);
        return {
          error: 'Validation error',
          details: error.errors,
        };
      }
      throw error;
    }
  });

  // Tool: seo_link_pack
  fastify.post('/tools/seo_link_pack', async (request, reply) => {
    try {
      const result = await seoLinkPack(request.body as any);
      return result;
    } catch (error) {
      if (error instanceof ZodError) {
        reply.code(400);
        return {
          error: 'Validation error',
          details: error.errors,
        };
      }
      throw error;
    }
  });

  // Global error handler
  fastify.setErrorHandler((error, _request, reply) => {
    logger.error({ error: error.message, stack: error.stack }, 'Unhandled error');
    reply.code(500).send({
      error: 'Internal server error',
      message: error.message,
    });
  });

  return fastify;
}

/**
 * Start server
 */
export async function startServer() {
  // Test database connection
  await testConnection();

  // Create server
  const fastify = await createServer();

  // Start listening
  try {
    await fastify.listen({
      port: config.port,
      host: '0.0.0.0',
    });
    logger.info(`🚀 Server listening on http://0.0.0.0:${config.port}`);
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return fastify;
}
