import { handleGhostApiError } from '../utils/error.js';
import { createGhostApi } from '../config/config.js';
const ghostApi = createGhostApi();
export const getPagesSchema = {
    name: 'get_pages',
    description: 'Get a list of pages',
    inputSchema: {
        type: 'object',
        properties: {
            limit: {
                type: 'number',
                description: 'Number of pages to retrieve (default: 10)',
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
export const getPageSchema = {
    name: 'get_page',
    description: 'Get a specific page',
    inputSchema: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                description: 'Page ID'
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
export const createPageSchema = {
    name: 'create_page',
    description: 'Create a new page',
    inputSchema: {
        type: 'object',
        properties: {
            title: {
                type: 'string',
                description: 'Page title'
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
                description: 'Page status',
                enum: ['published', 'draft', 'scheduled']
            },
            visibility: {
                type: 'string',
                description: 'Visibility scope',
                enum: ['public', 'members', 'paid', 'tiers']
            },
            published_at: {
                type: 'string',
                description: 'Publication date (for scheduled pages)'
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
                description: 'Set as featured page'
            }
        },
        required: ['title']
    }
};
export const updatePageSchema = {
    name: 'update_page',
    description: 'Update a page',
    inputSchema: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                description: 'Page ID'
            },
            title: {
                type: 'string',
                description: 'Page title'
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
                description: 'Page status',
                enum: ['published', 'draft', 'scheduled']
            },
            visibility: {
                type: 'string',
                description: 'Visibility scope',
                enum: ['public', 'members', 'paid', 'tiers']
            },
            published_at: {
                type: 'string',
                description: 'Publication date (for scheduled pages)'
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
                description: 'Set as featured page'
            }
        },
        required: ['id']
    }
};
export const deletePageSchema = {
    name: 'delete_page',
    description: 'Delete a page',
    inputSchema: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                description: 'Page ID'
            }
        },
        required: ['id']
    }
};
export const getPageBySlugSchema = {
    name: 'get_page_by_slug',
    description: 'Get a page by slug',
    inputSchema: {
        type: 'object',
        properties: {
            slug: {
                type: 'string',
                description: 'Page slug'
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
export const getPages = async ({ limit = 10, page = 1, order, formats, include }) => {
    try {
        const params = { limit, page };
        if (order)
            params.order = order;
        if (formats?.length)
            params.formats = formats.join(',');
        if (include?.length)
            params.include = include.join(',');
        const pages = await ghostApi.pages.browse(params);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(pages, null, 2),
                },
            ],
        };
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
export const getPage = async ({ id, formats, include }) => {
    try {
        const params = { id };
        if (formats?.length)
            params.formats = formats.join(',');
        if (include?.length)
            params.include = include.join(',');
        const page = await ghostApi.pages.read(params);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(page, null, 2),
                },
            ],
        };
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
export const createPage = async (params) => {
    try {
        const page = await ghostApi.pages.add(params);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(page, null, 2),
                },
            ],
        };
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
export const updatePage = async ({ id, ...params }) => {
    try {
        // Get current page info
        const currentPage = await ghostApi.pages.read({ id });
        // Use current updated_at
        params.updated_at = currentPage.updated_at || new Date().toISOString();
        const page = await ghostApi.pages.edit({ id, ...params });
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(page, null, 2),
                },
            ],
        };
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
export const deletePage = async ({ id }) => {
    try {
        await ghostApi.pages.delete({ id });
        return {
            content: [
                {
                    type: 'text',
                    text: 'Page deleted successfully',
                },
            ],
        };
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
export const getPageBySlug = async ({ slug, formats, include }) => {
    try {
        const params = { filter: `slug:${slug}` };
        if (formats?.length)
            params.formats = formats.join(',');
        if (include?.length)
            params.include = include.join(',');
        const [page] = await ghostApi.pages.browse(params);
        if (!page) {
            throw new Error(`Page with slug "${slug}" not found`);
        }
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(page, null, 2),
                },
            ],
        };
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
