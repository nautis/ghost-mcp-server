#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import {
  getPost,
  getPosts,
  searchPosts,
  createPost,
  updatePost,
  deletePost,
  getPostBySlug,
  getPage,
  getPages,
  searchPages,
  createPage,
  updatePage,
  deletePage,
  getPageBySlug,
  getTags,
  getAuthors,
  getMember,
  getMembers,
  searchMembers,
  createMember,
  updateMember,
  deleteMember,
  uploadImage,
  uploadImageFromUrl,
  toolSchemas,
} from './tools/index.js';

import {
  isPaginationParams,
  isSearchParams,
  isMemberPaginationParams,
  isMemberSearchParams,
  isCreateMemberParams,
  isUpdateMemberParams,
  isImageUploadParams,
  isImageUrlUploadParams,
  isPostStatus,
  isPostVisibility,
} from './types/index.js';

import { rateLimiter } from './utils/rate-limiter.js';

// Redirect console.log to stderr for MCP stdio transport compatibility
const originalConsoleLog = console.log;
console.log = (...args: unknown[]) => console.error(...args);

class GhostServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'ghost-mcp-server',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.server.onerror = (error: unknown) => console.error('[MCP Error]', error);

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: toolSchemas,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        // Rate limiting check
        const toolName = request.params.name;
        const rateCheck = rateLimiter.consume(toolName);
        if (!rateCheck.allowed) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Rate limit exceeded for ${rateCheck.category} operations. Retry after ${Math.ceil(rateCheck.retryAfterMs! / 1000)} seconds.`
          );
        }

        const args = (request.params.arguments || {}) as Record<string, unknown>;

        switch (request.params.name) {
          case 'get_posts':
            if (!isPaginationParams(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid pagination parameters');
            }
            return getPosts(args);

          case 'get_post': {
            const id = args.id;
            if (typeof id !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'ID must be a string');
            }
            return getPost({ id });
          }

          case 'search_posts':
            if (!isSearchParams(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid search parameters');
            }
            return searchPosts(args);

          case 'get_tags':
            if (!isPaginationParams(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid pagination parameters');
            }
            return getTags(args);

          case 'get_authors':
            if (!isPaginationParams(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid pagination parameters');
            }
            return getAuthors(args);

          case 'create_post': {
            const {
              title, html, lexical, status, visibility, published_at,
              tags, authors, featured, email_subject, email_only, newsletter,
              feature_image, feature_image_alt, feature_image_caption,
              custom_excerpt, custom_template,
            } = args;
            if (!title || typeof title !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Title is required and must be a string');
            }
            return createPost({
              title,
              html: typeof html === 'string' ? html : undefined,
              lexical: typeof lexical === 'string' ? lexical : undefined,
              status: typeof status === 'string' && isPostStatus(status) ? status : undefined,
              visibility: typeof visibility === 'string' && isPostVisibility(visibility) ? visibility : undefined,
              published_at: typeof published_at === 'string' ? published_at : undefined,
              tags: Array.isArray(tags) ? tags.filter((t: unknown) => typeof t === 'string') : undefined,
              authors: Array.isArray(authors) ? authors.filter((a: unknown) => typeof a === 'string') : undefined,
              featured: typeof featured === 'boolean' ? featured : undefined,
              email_subject: typeof email_subject === 'string' ? email_subject : undefined,
              email_only: typeof email_only === 'boolean' ? email_only : undefined,
              newsletter: typeof newsletter === 'boolean' ? newsletter : undefined,
              feature_image: typeof feature_image === 'string' ? feature_image : undefined,
              feature_image_alt: typeof feature_image_alt === 'string' ? feature_image_alt : undefined,
              feature_image_caption: typeof feature_image_caption === 'string' ? feature_image_caption : undefined,
              custom_excerpt: typeof custom_excerpt === 'string' ? custom_excerpt : undefined,
              custom_template: typeof custom_template === 'string' ? custom_template : undefined,
            });
          }

          case 'update_post': {
            const {
              id, title, html, lexical, status, visibility, published_at,
              tags, authors, featured, email_subject, email_only, newsletter,
              feature_image, feature_image_alt, feature_image_caption,
              custom_excerpt, custom_template,
            } = args;
            if (typeof id !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'ID must be a string');
            }
            return updatePost({
              id,
              title: typeof title === 'string' ? title : undefined,
              html: typeof html === 'string' ? html : undefined,
              lexical: typeof lexical === 'string' ? lexical : undefined,
              status: typeof status === 'string' && isPostStatus(status) ? status : undefined,
              visibility: typeof visibility === 'string' && isPostVisibility(visibility) ? visibility : undefined,
              published_at: typeof published_at === 'string' ? published_at : undefined,
              tags: Array.isArray(tags) ? tags.filter((t: unknown) => typeof t === 'string') : undefined,
              authors: Array.isArray(authors) ? authors.filter((a: unknown) => typeof a === 'string') : undefined,
              featured: typeof featured === 'boolean' ? featured : undefined,
              email_subject: typeof email_subject === 'string' ? email_subject : undefined,
              email_only: typeof email_only === 'boolean' ? email_only : undefined,
              newsletter: typeof newsletter === 'boolean' ? newsletter : undefined,
              feature_image: typeof feature_image === 'string' ? feature_image : undefined,
              feature_image_alt: typeof feature_image_alt === 'string' ? feature_image_alt : undefined,
              feature_image_caption: typeof feature_image_caption === 'string' ? feature_image_caption : undefined,
              custom_excerpt: typeof custom_excerpt === 'string' ? custom_excerpt : undefined,
              custom_template: typeof custom_template === 'string' ? custom_template : undefined,
            });
          }

          case 'delete_post': {
            const { id } = args;
            if (typeof id !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'ID must be a string');
            }
            return deletePost({ id });
          }

          case 'get_post_by_slug': {
            const { slug, formats, include } = args;
            if (typeof slug !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Slug must be a string');
            }
            return getPostBySlug({
              slug,
              formats: Array.isArray(formats)
                ? formats.filter((f: unknown) => typeof f === 'string' && ['html', 'mobiledoc', 'lexical'].includes(f as string))
                : undefined,
              include: Array.isArray(include)
                ? include.filter((i: unknown) => typeof i === 'string' && ['authors', 'tags'].includes(i as string))
                : undefined,
            });
          }

          // Pages
          case 'get_pages':
            if (!isPaginationParams(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid pagination parameters');
            }
            return getPages(args);

          case 'get_page': {
            const id = args.id;
            if (typeof id !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'ID must be a string');
            }
            return getPage({ id });
          }

          case 'create_page': {
            const {
              title, html, lexical, status, visibility, published_at,
              tags, authors, featured,
            } = args;
            if (!title || typeof title !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Title is required and must be a string');
            }
            return createPage({
              title,
              html: typeof html === 'string' ? html : undefined,
              lexical: typeof lexical === 'string' ? lexical : undefined,
              status: typeof status === 'string' && isPostStatus(status) ? status : undefined,
              visibility: typeof visibility === 'string' && isPostVisibility(visibility) ? visibility : undefined,
              published_at: typeof published_at === 'string' ? published_at : undefined,
              tags: Array.isArray(tags) ? tags.filter((t: unknown) => typeof t === 'string') : undefined,
              authors: Array.isArray(authors) ? authors.filter((a: unknown) => typeof a === 'string') : undefined,
              featured: typeof featured === 'boolean' ? featured : undefined,
            });
          }

          case 'update_page': {
            const {
              id, title, html, lexical, status, visibility, published_at,
              tags, authors, featured,
            } = args;
            if (typeof id !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'ID must be a string');
            }
            return updatePage({
              id,
              title: typeof title === 'string' ? title : undefined,
              html: typeof html === 'string' ? html : undefined,
              lexical: typeof lexical === 'string' ? lexical : undefined,
              status: typeof status === 'string' && isPostStatus(status) ? status : undefined,
              visibility: typeof visibility === 'string' && isPostVisibility(visibility) ? visibility : undefined,
              published_at: typeof published_at === 'string' ? published_at : undefined,
              tags: Array.isArray(tags) ? tags.filter((t: unknown) => typeof t === 'string') : undefined,
              authors: Array.isArray(authors) ? authors.filter((a: unknown) => typeof a === 'string') : undefined,
              featured: typeof featured === 'boolean' ? featured : undefined,
              updated_at: new Date().toISOString(),
            });
          }

          case 'delete_page': {
            const { id } = args;
            if (typeof id !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'ID must be a string');
            }
            return deletePage({ id });
          }

          case 'get_page_by_slug': {
            const { slug, formats, include } = args;
            if (typeof slug !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Slug must be a string');
            }
            return getPageBySlug({
              slug,
              formats: Array.isArray(formats)
                ? formats.filter((f: unknown) => typeof f === 'string' && ['html', 'mobiledoc', 'lexical'].includes(f as string))
                : undefined,
              include: Array.isArray(include)
                ? include.filter((i: unknown) => typeof i === 'string' && ['authors', 'tags'].includes(i as string))
                : undefined,
            });
          }

          case 'search_pages': {
            const { query, limit, formats, include } = args;
            if (typeof query !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Query must be a string');
            }
            return searchPages({
              query,
              limit: typeof limit === 'number' ? limit : undefined,
              formats: Array.isArray(formats)
                ? formats.filter((f: unknown) => typeof f === 'string' && ['html', 'mobiledoc', 'lexical'].includes(f as string))
                : undefined,
              include: Array.isArray(include)
                ? include.filter((i: unknown) => typeof i === 'string' && ['authors', 'tags'].includes(i as string))
                : undefined,
            });
          }

          // Members
          case 'get_members':
            if (!isMemberPaginationParams(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid pagination parameters');
            }
            return getMembers(args);

          case 'get_member': {
            const { id, include } = args;
            if (typeof id !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'ID must be a string');
            }
            return getMember({
              id,
              include: Array.isArray(include)
                ? include.filter((i: unknown) => typeof i === 'string' && ['labels', 'newsletters'].includes(i as string))
                : undefined,
            });
          }

          case 'search_members':
            if (!isMemberSearchParams(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid search parameters');
            }
            return searchMembers(args);

          case 'create_member':
            if (!isCreateMemberParams(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid member parameters');
            }
            return createMember(args);

          case 'update_member':
            if (!isUpdateMemberParams(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid member parameters');
            }
            return updateMember(args);

          case 'delete_member': {
            const { id } = args;
            if (typeof id !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'ID must be a string');
            }
            return deleteMember({ id });
          }

          // Images
          case 'upload_image':
            if (!isImageUploadParams(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid image upload parameters');
            }
            return uploadImage(args);

          case 'upload_image_from_url':
            if (!isImageUrlUploadParams(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid image URL upload parameters');
            }
            return uploadImageFromUrl(args);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        console.error('Ghost API Error:', error);
        throw new McpError(
          ErrorCode.InternalError,
          `Ghost API error: ${(error as Error).message}`
        );
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Ghost MCP server running on stdio');
  }
}

const server = new GhostServer();
server.run().catch(console.error);
