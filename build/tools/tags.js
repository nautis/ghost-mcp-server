import { handleGhostApiError } from '../utils/error.js';
import { createGhostApi } from '../config/config.js';
const ghostApi = createGhostApi();
export const getTagsSchema = {
    name: 'get_tags',
    description: 'Get list of tags',
    inputSchema: {
        type: 'object',
        properties: {
            limit: {
                type: 'number',
                description: 'Number of tags to retrieve (default: 10)',
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
                description: 'Sort order (default: name ASC)',
                enum: [
                    'name ASC',
                    'name DESC',
                    'created_at DESC',
                    'created_at ASC'
                ]
            },
            include: {
                type: 'string',
                description: 'Related data to include',
                enum: ['count.posts']
            },
            filter: {
                type: 'string',
                description: 'Filter condition (e.g., visibility:public, slug:getting-started)'
            }
        }
    },
};
export const getTags = async ({ limit = 10, page = 1, order, include, filter }) => {
    try {
        const params = { limit, page };
        if (order)
            params.order = order;
        if (include)
            params.include = include;
        if (filter)
            params.filter = filter;
        const tags = await ghostApi.tags.browse(params);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(tags, null, 2),
                },
            ],
        };
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
