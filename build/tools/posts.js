import { handleGhostApiError } from '../utils/error.js';
import { createGhostApi } from '../config/config.js';
const ghostApi = createGhostApi();
export const getPostsSchema = {
    name: 'get_posts',
    description: 'Get a list of blog posts',
    inputSchema: {
        type: 'object',
        properties: {
            limit: {
                type: 'number',
                description: 'Number of posts to retrieve (default: 10)',
                minimum: 1,
                maximum: 100
            },
            page: {
                type: 'number',
                description: 'Page number (default: 1)',
                minimum: 1
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
                    'updated_at ASC'
                ]
            },
            formats: {
                type: 'array',
                description: 'Content formats to retrieve',
                items: {
                    type: 'string',
                    enum: ['html', 'mobiledoc', 'lexical']
                }
            },
            include: {
                type: 'array',
                description: 'Related data to include',
                items: {
                    type: 'string',
                    enum: ['authors', 'tags']
                }
            }
        }
    },
};
export const getPostSchema = {
    name: 'get_post',
    description: 'Get a specific post',
    inputSchema: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                description: 'Post ID'
            },
            formats: {
                type: 'array',
                description: 'Content formats to retrieve',
                items: {
                    type: 'string',
                    enum: ['html', 'mobiledoc', 'lexical']
                }
            },
            include: {
                type: 'array',
                description: 'Related data to include',
                items: {
                    type: 'string',
                    enum: ['authors', 'tags']
                }
            }
        },
        required: ['id']
    },
};
export const createPostSchema = {
    name: 'create_post',
    description: 'Create a new post',
    inputSchema: {
        type: 'object',
        properties: {
            title: {
                type: 'string',
                description: 'Post title'
            },
            html: {
                type: 'string',
                description: 'Content in HTML format'
            },
            lexical: {
                type: 'string',
                description: 'Content in Lexical format'
            },
            status: {
                type: 'string',
                description: 'Post status',
                enum: ['published', 'draft', 'scheduled']
            },
            visibility: {
                type: 'string',
                description: 'Visibility scope',
                enum: ['public', 'members', 'paid', 'tiers']
            },
            published_at: {
                type: 'string',
                description: 'Publication date (for scheduled posts)'
            },
            tags: {
                type: 'array',
                description: 'Array of tag IDs',
                items: {
                    type: 'string'
                }
            },
            authors: {
                type: 'array',
                description: 'Array of author IDs',
                items: {
                    type: 'string'
                }
            },
            featured: {
                type: 'boolean',
                description: 'Set as featured post'
            },
            email_subject: {
                type: 'string',
                description: 'Email subject line'
            },
            email_only: {
                type: 'boolean',
                description: 'Email-only post'
            },
            newsletter: {
                type: 'boolean',
                description: 'Whether to send email'
            },
            feature_image: {
                type: 'string',
                description: 'URL of the featured image (must be uploaded to Ghost first via upload_image_from_url)'
            },
            feature_image_alt: {
                type: 'string',
                description: 'Alt text for the featured image'
            },
            feature_image_caption: {
                type: 'string',
                description: 'Caption for the featured image'
            }
        },
        required: ['title']
    }
};
export const updatePostSchema = {
    name: 'update_post',
    description: 'Update a post',
    inputSchema: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                description: 'Post ID'
            },
            title: {
                type: 'string',
                description: 'Post title'
            },
            html: {
                type: 'string',
                description: 'Content in HTML format'
            },
            lexical: {
                type: 'string',
                description: 'Content in Lexical format'
            },
            status: {
                type: 'string',
                description: 'Post status',
                enum: ['published', 'draft', 'scheduled']
            },
            visibility: {
                type: 'string',
                description: 'Visibility scope',
                enum: ['public', 'members', 'paid', 'tiers']
            },
            published_at: {
                type: 'string',
                description: 'Publication date (for scheduled posts)'
            },
            tags: {
                type: 'array',
                description: 'Array of tag IDs (replaces existing tags)',
                items: {
                    type: 'string'
                }
            },
            authors: {
                type: 'array',
                description: 'Array of author IDs (replaces existing authors)',
                items: {
                    type: 'string'
                }
            },
            featured: {
                type: 'boolean',
                description: 'Set as featured post'
            },
            email_subject: {
                type: 'string',
                description: 'Email subject line'
            },
            email_only: {
                type: 'boolean',
                description: 'Email-only post'
            },
            newsletter: {
                type: 'boolean',
                description: 'Whether to send email'
            },
            feature_image: {
                type: 'string',
                description: 'URL of the featured image (must be uploaded to Ghost first via upload_image_from_url)'
            },
            feature_image_alt: {
                type: 'string',
                description: 'Alt text for the featured image'
            },
            feature_image_caption: {
                type: 'string',
                description: 'Caption for the featured image'
            }
        },
        required: ['id']
    }
};
export const deletePostSchema = {
    name: 'delete_post',
    description: 'Delete a post',
    inputSchema: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                description: 'Post ID'
            }
        },
        required: ['id']
    }
};
export const getPostBySlugSchema = {
    name: 'get_post_by_slug',
    description: 'Get a post by slug',
    inputSchema: {
        type: 'object',
        properties: {
            slug: {
                type: 'string',
                description: 'Post slug'
            },
            formats: {
                type: 'array',
                description: 'Content formats to retrieve',
                items: {
                    type: 'string',
                    enum: ['html', 'mobiledoc', 'lexical']
                }
            },
            include: {
                type: 'array',
                description: 'Related data to include',
                items: {
                    type: 'string',
                    enum: ['authors', 'tags']
                }
            }
        },
        required: ['slug']
    }
};
export const searchPostsSchema = {
    name: 'search_posts',
    description: 'Search posts',
    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Search keyword'
            },
            limit: {
                type: 'number',
                description: 'Number of posts to retrieve (default: 10)',
                minimum: 1,
                maximum: 100
            },
            formats: {
                type: 'array',
                description: 'Content formats to retrieve',
                items: {
                    type: 'string',
                    enum: ['html', 'mobiledoc', 'lexical']
                }
            },
            include: {
                type: 'array',
                description: 'Related data to include',
                items: {
                    type: 'string',
                    enum: ['authors', 'tags']
                }
            }
        },
        required: ['query']
    },
};
export const getPosts = async ({ limit = 10, page = 1, order, formats, include }) => {
    try {
        const params = { limit, page };
        if (order)
            params.order = order;
        if (formats?.length)
            params.formats = formats.join(',');
        if (include?.length)
            params.include = include.join(',');
        const posts = await ghostApi.posts.browse(params);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(posts, null, 2),
                },
            ],
        };
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
export const getPost = async ({ id, formats, include }) => {
    try {
        const params = { id };
        if (formats?.length)
            params.formats = formats.join(',');
        if (include?.length)
            params.include = include.join(',');
        const post = await ghostApi.posts.read(params);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(post, null, 2),
                },
            ],
        };
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
export const searchPosts = async ({ query, limit = 10, formats, include }) => {
    try {
        const params = { limit, search: query };
        if (formats?.length)
            params.formats = formats.join(',');
        if (include?.length)
            params.include = include.join(',');
        const posts = await ghostApi.posts.browse(params);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(posts, null, 2),
                },
            ],
        };
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
export const createPost = async (params) => {
    try {
        const post = await ghostApi.posts.add(params);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(post, null, 2),
                },
            ],
        };
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
export const updatePost = async ({ id, ...params }) => {
    try {
        // updated_at is required
        if (!params.updated_at) {
            params.updated_at = new Date().toISOString();
        }
        const post = await ghostApi.posts.edit({ id, ...params });
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(post, null, 2),
                },
            ],
        };
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
export const deletePost = async ({ id }) => {
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
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
export const getPostBySlug = async ({ slug, formats, include }) => {
    try {
        const params = { filter: `slug:${slug}` };
        if (formats?.length)
            params.formats = formats.join(',');
        if (include?.length)
            params.include = include.join(',');
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
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
