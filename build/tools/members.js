import { handleGhostApiError } from '../utils/error.js';
import { createGhostApi } from '../config/config.js';
const ghostApi = createGhostApi();
export const getMembersSchema = {
    name: 'get_members',
    description: 'Get list of members',
    inputSchema: {
        type: 'object',
        properties: {
            limit: {
                type: 'number',
                description: 'Number of members to retrieve (default: 10)',
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
                description: 'Sort order (default: created_at DESC)',
                enum: [
                    'created_at DESC',
                    'created_at ASC',
                    'updated_at DESC',
                    'updated_at ASC'
                ]
            },
            include: {
                type: 'array',
                description: 'Related data to include',
                items: {
                    type: 'string',
                    enum: ['labels', 'newsletters']
                }
            }
        }
    },
};
export const getMemberSchema = {
    name: 'get_member',
    description: 'Get a specific member',
    inputSchema: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                description: 'Member ID'
            },
            include: {
                type: 'array',
                description: 'Related data to include',
                items: {
                    type: 'string',
                    enum: ['labels', 'newsletters']
                }
            }
        },
        required: ['id']
    },
};
export const createMemberSchema = {
    name: 'create_member',
    description: 'Create a new member',
    inputSchema: {
        type: 'object',
        properties: {
            email: {
                type: 'string',
                description: 'Email address'
            },
            name: {
                type: 'string',
                description: 'Name'
            },
            note: {
                type: 'string',
                description: 'Note'
            },
            labels: {
                type: 'array',
                description: 'Array of label IDs',
                items: {
                    type: 'string'
                }
            },
            newsletters: {
                type: 'array',
                description: 'Array of newsletter IDs',
                items: {
                    type: 'string'
                }
            },
            subscribed: {
                type: 'boolean',
                description: 'Newsletter subscription status'
            }
        },
        required: ['email']
    }
};
export const updateMemberSchema = {
    name: 'update_member',
    description: 'Update a member',
    inputSchema: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                description: 'Member ID'
            },
            email: {
                type: 'string',
                description: 'Email address'
            },
            name: {
                type: 'string',
                description: 'Name'
            },
            note: {
                type: 'string',
                description: 'Note'
            },
            labels: {
                type: 'array',
                description: 'Array of label IDs (replaces existing labels)',
                items: {
                    type: 'string'
                }
            },
            newsletters: {
                type: 'array',
                description: 'Array of newsletter IDs (replaces existing newsletters)',
                items: {
                    type: 'string'
                }
            },
            subscribed: {
                type: 'boolean',
                description: 'Newsletter subscription status'
            }
        },
        required: ['id']
    }
};
export const deleteMemberSchema = {
    name: 'delete_member',
    description: 'Delete a member',
    inputSchema: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                description: 'Member ID'
            }
        },
        required: ['id']
    }
};
export const searchMembersSchema = {
    name: 'search_members',
    description: 'Search members',
    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Search keyword'
            },
            limit: {
                type: 'number',
                description: 'Number of members to retrieve (default: 10)',
                minimum: 1,
                maximum: 100
            },
            include: {
                type: 'array',
                description: 'Related data to include',
                items: {
                    type: 'string',
                    enum: ['labels', 'newsletters']
                }
            }
        },
        required: ['query']
    },
};
export const getMembers = async ({ limit = 10, page = 1, order, include }) => {
    try {
        const params = { limit, page };
        if (order)
            params.order = order;
        if (include?.length)
            params.include = include.join(',');
        const members = await ghostApi.members.browse(params);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(members, null, 2),
                },
            ],
        };
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
export const getMember = async ({ id, include }) => {
    try {
        const params = { id };
        if (include?.length)
            params.include = include.join(',');
        const member = await ghostApi.members.read(params);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(member, null, 2),
                },
            ],
        };
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
export const searchMembers = async ({ query, limit = 10, include }) => {
    try {
        const params = { limit, search: query };
        if (include?.length)
            params.include = include.join(',');
        const members = await ghostApi.members.browse(params);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(members, null, 2),
                },
            ],
        };
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
export const createMember = async (params) => {
    try {
        const member = await ghostApi.members.add(params);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(member, null, 2),
                },
            ],
        };
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
export const updateMember = async ({ id, ...params }) => {
    try {
        const member = await ghostApi.members.edit({ id, ...params });
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(member, null, 2),
                },
            ],
        };
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
export const deleteMember = async ({ id }) => {
    try {
        await ghostApi.members.delete({ id });
        return {
            content: [
                {
                    type: 'text',
                    text: 'Member deleted successfully',
                },
            ],
        };
    }
    catch (error) {
        throw handleGhostApiError(error);
    }
};
