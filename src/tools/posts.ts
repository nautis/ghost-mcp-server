import { handleGhostApiError } from '../utils/error.js';
import { createGhostApi } from '../config/config.js';
import { sanitizeHtmlContent } from '../utils/sanitize.js';
import type { McpToolResult } from '../types/index.js';

const ghostApi = createGhostApi();

// Schemas

export const getPostsSchema = {
  name: 'get_posts',
  description: 'Get a list of blog posts',
  inputSchema: {
    type: 'object' as const,
    properties: {
      limit: {
        type: 'number',
        description: 'Number of posts to retrieve (default: 10)',
        minimum: 1,
        maximum: 100,
      },
      page: {
        type: 'number',
        description: 'Page number (default: 1)',
        minimum: 1,
      },
      order: {
        type: 'string',
        description: 'Sort order (default: published_at DESC)',
        enum: [
          'published_at DESC',
          'published_at ASC',
          'created_at DESC',
          'created_at ASC',
          'updated_at DESC',
          'updated_at ASC',
        ],
      },
      formats: {
        type: 'array',
        description: 'Content formats to retrieve',
        items: {
          type: 'string',
          enum: ['html', 'mobiledoc', 'lexical'],
        },
      },
      include: {
        type: 'array',
        description: 'Related data to include',
        items: {
          type: 'string',
          enum: ['authors', 'tags'],
        },
      },
      filter: {
        type: 'string',
        description:
          'Filter expression using Ghost filter syntax (e.g., "authors.slug:matthew", "tags.slug:reviews", "authors.slug:matthew+tags.slug:reviews")',
      },
    },
  },
};

export const getPostSchema = {
  name: 'get_post',
  description: 'Get a specific post',
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'string',
        description: 'Post ID',
      },
      formats: {
        type: 'array',
        description: 'Content formats to retrieve',
        items: {
          type: 'string',
          enum: ['html', 'mobiledoc', 'lexical'],
        },
      },
      include: {
        type: 'array',
        description: 'Related data to include',
        items: {
          type: 'string',
          enum: ['authors', 'tags'],
        },
      },
    },
    required: ['id'],
  },
};

export const createPostSchema = {
  name: 'create_post',
  description: 'Create a new post',
  inputSchema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        description: 'Post title',
      },
      html: {
        type: 'string',
        description: 'Content in HTML format',
      },
      lexical: {
        type: 'string',
        description: 'Content in Lexical format',
      },
      status: {
        type: 'string',
        description: 'Post status',
        enum: ['published', 'draft', 'scheduled'],
      },
      visibility: {
        type: 'string',
        description: 'Visibility scope',
        enum: ['public', 'members', 'paid', 'tiers'],
      },
      published_at: {
        type: 'string',
        description: 'Publication date (for scheduled posts)',
      },
      tags: {
        type: 'array',
        description: 'Array of tag IDs',
        items: { type: 'string' },
      },
      authors: {
        type: 'array',
        description: 'Array of author IDs',
        items: { type: 'string' },
      },
      featured: {
        type: 'boolean',
        description: 'Set as featured post',
      },
      email_subject: {
        type: 'string',
        description: 'Email subject line',
      },
      email_only: {
        type: 'boolean',
        description: 'Email-only post',
      },
      newsletter: {
        type: 'boolean',
        description: 'Whether to send email',
      },
      feature_image: {
        type: 'string',
        description:
          'URL of the featured image (must be uploaded to Ghost first via upload_image_from_url)',
      },
      feature_image_alt: {
        type: 'string',
        description: 'Alt text for the featured image',
      },
      feature_image_caption: {
        type: 'string',
        description: 'Caption for the featured image',
      },
      custom_excerpt: {
        type: 'string',
        description: 'Custom excerpt for the post (max 300 characters)',
      },
      custom_template: {
        type: 'string',
        description: 'Custom template name (e.g., custom-post-fullwidth)',
      },
    },
    required: ['title'],
  },
};

export const updatePostSchema = {
  name: 'update_post',
  description: 'Update a post',
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'string',
        description: 'Post ID',
      },
      title: {
        type: 'string',
        description: 'Post title',
      },
      html: {
        type: 'string',
        description: 'Content in HTML format',
      },
      lexical: {
        type: 'string',
        description: 'Content in Lexical format',
      },
      status: {
        type: 'string',
        description: 'Post status',
        enum: ['published', 'draft', 'scheduled'],
      },
      visibility: {
        type: 'string',
        description: 'Visibility scope',
        enum: ['public', 'members', 'paid', 'tiers'],
      },
      published_at: {
        type: 'string',
        description: 'Publication date (for scheduled posts)',
      },
      tags: {
        type: 'array',
        description: 'Array of tag IDs (replaces existing tags)',
        items: { type: 'string' },
      },
      authors: {
        type: 'array',
        description: 'Array of author IDs (replaces existing authors)',
        items: { type: 'string' },
      },
      featured: {
        type: 'boolean',
        description: 'Set as featured post',
      },
      email_subject: {
        type: 'string',
        description: 'Email subject line',
      },
      email_only: {
        type: 'boolean',
        description: 'Email-only post',
      },
      newsletter: {
        type: 'boolean',
        description: 'Whether to send email',
      },
      feature_image: {
        type: 'string',
        description:
          'URL of the featured image (must be uploaded to Ghost first via upload_image_from_url)',
      },
      feature_image_alt: {
        type: 'string',
        description: 'Alt text for the featured image',
      },
      feature_image_caption: {
        type: 'string',
        description: 'Caption for the featured image',
      },
      custom_excerpt: {
        type: 'string',
        description: 'Custom excerpt for the post (max 300 characters)',
      },
      custom_template: {
        type: 'string',
        description: 'Custom template name (e.g., custom-post-fullwidth)',
      },
    },
    required: ['id'],
  },
};

export const deletePostSchema = {
  name: 'delete_post',
  description: 'Delete a post',
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'string',
        description: 'Post ID',
      },
    },
    required: ['id'],
  },
};

export const getPostBySlugSchema = {
  name: 'get_post_by_slug',
  description: 'Get a post by slug',
  inputSchema: {
    type: 'object' as const,
    properties: {
      slug: {
        type: 'string',
        description: 'Post slug',
      },
      formats: {
        type: 'array',
        description: 'Content formats to retrieve',
        items: {
          type: 'string',
          enum: ['html', 'mobiledoc', 'lexical'],
        },
      },
      include: {
        type: 'array',
        description: 'Related data to include',
        items: {
          type: 'string',
          enum: ['authors', 'tags'],
        },
      },
    },
    required: ['slug'],
  },
};

export const searchPostsSchema = {
  name: 'search_posts',
  description: 'Search posts',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Search keyword',
      },
      limit: {
        type: 'number',
        description: 'Number of posts to retrieve (default: 10)',
        minimum: 1,
        maximum: 100,
      },
      formats: {
        type: 'array',
        description: 'Content formats to retrieve',
        items: {
          type: 'string',
          enum: ['html', 'mobiledoc', 'lexical'],
        },
      },
      include: {
        type: 'array',
        description: 'Related data to include',
        items: {
          type: 'string',
          enum: ['authors', 'tags'],
        },
      },
      filter: {
        type: 'string',
        description:
          'Filter expression using Ghost filter syntax (e.g., "authors.slug:matthew", "tags.slug:reviews", "authors.slug:matthew+tags.slug:reviews")',
      },
    },
    required: ['query'],
  },
};

// Param interfaces

interface GetPostsParams {
  limit?: number;
  page?: number;
  order?: string;
  formats?: string[];
  include?: string[];
  filter?: string;
}

interface GetPostParams {
  id: string;
  formats?: string[];
  include?: string[];
}

interface SearchPostsParams {
  query: string;
  limit?: number;
  formats?: string[];
  include?: string[];
  filter?: string;
}

interface CreatePostParams {
  title: string;
  html?: string;
  lexical?: string;
  status?: string;
  visibility?: string;
  published_at?: string;
  tags?: string[];
  authors?: string[];
  featured?: boolean;
  email_subject?: string;
  email_only?: boolean;
  newsletter?: boolean;
  feature_image?: string;
  feature_image_alt?: string;
  feature_image_caption?: string;
  custom_excerpt?: string;
  custom_template?: string;
}

interface UpdatePostParams {
  id: string;
  title?: string;
  html?: string;
  lexical?: string;
  status?: string;
  visibility?: string;
  published_at?: string;
  tags?: string[];
  authors?: string[];
  featured?: boolean;
  email_subject?: string;
  email_only?: boolean;
  newsletter?: boolean;
  feature_image?: string;
  feature_image_alt?: string;
  feature_image_caption?: string;
  custom_excerpt?: string;
  custom_template?: string;
}

interface DeletePostParams {
  id: string;
}

interface GetPostBySlugParams {
  slug: string;
  formats?: string[];
  include?: string[];
}

// Functions

export const getPosts = async ({
  limit = 10,
  page = 1,
  order,
  formats,
  include,
  filter,
}: GetPostsParams): Promise<McpToolResult> => {
  try {
    const params: Record<string, unknown> = { limit, page };
    if (order) params.order = order;
    if (formats?.length) params.formats = formats.join(',');
    if (include?.length) params.include = include.join(',');
    if (filter) params.filter = filter;

    const posts = await ghostApi.posts.browse(params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(posts, null, 2),
        },
      ],
    };
  } catch (error) {
    throw handleGhostApiError(error);
  }
};

export const getPost = async ({
  id,
  formats,
  include,
}: GetPostParams): Promise<McpToolResult> => {
  try {
    const params: Record<string, unknown> = { id };
    if (formats?.length) params.formats = formats.join(',');
    if (include?.length) params.include = include.join(',');

    const post = await ghostApi.posts.read(params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(post, null, 2),
        },
      ],
    };
  } catch (error) {
    throw handleGhostApiError(error);
  }
};

export const searchPosts = async ({
  query,
  limit = 10,
  formats,
  include,
  filter,
}: SearchPostsParams): Promise<McpToolResult> => {
  try {
    const params: Record<string, unknown> = { limit, search: query };
    if (formats?.length) params.formats = formats.join(',');
    if (include?.length) params.include = include.join(',');
    if (filter) params.filter = filter;

    const posts = await ghostApi.posts.browse(params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(posts, null, 2),
        },
      ],
    };
  } catch (error) {
    throw handleGhostApiError(error);
  }
};

export const createPost = async (
  params: CreatePostParams
): Promise<McpToolResult> => {
  try {
    // Sanitize HTML content to prevent XSS
    if (params.html) {
      params.html = sanitizeHtmlContent(params.html);
    }
    // If html is provided, use source: 'html' to tell Ghost to convert it
    const options = params.html ? { source: 'html' } : {};
    const post = await ghostApi.posts.add(params, options);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(post, null, 2),
        },
      ],
    };
  } catch (error) {
    throw handleGhostApiError(error);
  }
};

export const updatePost = async ({
  id,
  ...params
}: UpdatePostParams): Promise<McpToolResult> => {
  try {
    // Sanitize HTML content to prevent XSS
    if (params.html) {
      params.html = sanitizeHtmlContent(params.html);
    }
    // Fetch current post to get updated_at for optimistic locking
    const currentPost = await ghostApi.posts.read({ id });
    const updateParams: Record<string, unknown> = {
      id,
      ...params,
      updated_at: currentPost.updated_at,
    };
    // If html is provided, use source: 'html' to tell Ghost to convert it
    const options = params.html ? { source: 'html' } : {};
    const post = await ghostApi.posts.edit(updateParams, options);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(post, null, 2),
        },
      ],
    };
  } catch (error) {
    throw handleGhostApiError(error);
  }
};

export const deletePost = async ({
  id,
}: DeletePostParams): Promise<McpToolResult> => {
  try {
    await ghostApi.posts.delete({ id });
    return {
      content: [
        {
          type: 'text',
          text: 'Post deleted successfully',
        },
      ],
    };
  } catch (error) {
    throw handleGhostApiError(error);
  }
};

export const getPostBySlug = async ({
  slug,
  formats,
  include,
}: GetPostBySlugParams): Promise<McpToolResult> => {
  try {
    const params: Record<string, unknown> = { filter: `slug:${slug}` };
    if (formats?.length) params.formats = formats.join(',');
    if (include?.length) params.include = include.join(',');

    const [post] = await ghostApi.posts.browse(params);
    if (!post) {
      throw new Error(`Post with slug "${slug}" not found`);
    }
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(post, null, 2),
        },
      ],
    };
  } catch (error) {
    throw handleGhostApiError(error);
  }
};
