import { handleGhostApiError } from '../utils/error.js';
import { createGhostApi } from '../config/config.js';
import type { McpToolResult } from '../types/index.js';

const ghostApi = createGhostApi();

// Schemas

export const getTagsSchema = {
  name: 'get_tags',
  description: 'Get list of tags',
  inputSchema: {
    type: 'object' as const,
    properties: {
      limit: {
        type: 'number',
        description: 'Number of tags to retrieve (default: 10)',
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
        description: 'Sort order (default: name ASC)',
        enum: ['name ASC', 'name DESC', 'created_at DESC', 'created_at ASC'],
      },
      include: {
        type: 'string',
        description: 'Related data to include',
        enum: ['count.posts'],
      },
      filter: {
        type: 'string',
        description:
          'Filter condition (e.g., visibility:public, slug:getting-started)',
      },
    },
  },
};

// Param interfaces

interface GetTagsParams {
  limit?: number;
  page?: number;
  order?: string;
  include?: string;
  filter?: string;
}

// Functions

export const getTags = async ({
  limit = 10,
  page = 1,
  order,
  include,
  filter,
}: GetTagsParams): Promise<McpToolResult> => {
  try {
    const params: Record<string, unknown> = { limit, page };
    if (order) params.order = order;
    if (include) params.include = include;
    if (filter) params.filter = filter;

    const tags = await ghostApi.tags.browse(params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(tags, null, 2),
        },
      ],
    };
  } catch (error) {
    throw handleGhostApiError(error);
  }
};
