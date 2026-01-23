export * from './posts.js';
export * from './tags.js';
export * from './authors.js';
export * from './pages.js';
export * from './members.js';
export * from './images.js';
export const toolSchemas = [
    // Posts
    {
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
                }
            }
        },
    },
    {
        name: 'get_post',
        description: 'Get a specific post',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: 'Post ID'
                }
            },
            required: ['id']
        },
    },
    {
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
                }
            },
            required: ['query']
        },
    },
    {
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
        },
    },
    {
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
        },
    },
    {
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
        },
    },
    {
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
        },
    },
    // Tags
    {
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
                }
            }
        },
    },
    // Authors
    {
        name: 'get_authors',
        description: 'Get list of authors',
        inputSchema: {
            type: 'object',
            properties: {
                limit: {
                    type: 'number',
                    description: 'Number of authors to retrieve (default: 10)',
                    minimum: 1,
                    maximum: 100
                }
            }
        },
    },
    // Pages
    {
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
        }
    },
    {
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
        }
    },
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    },
    {
        name: 'search_pages',
        description: 'Search pages by title or content',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search keyword'
                },
                limit: {
                    type: 'number',
                    description: 'Number of pages to retrieve (default: 10)',
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
        }
    },
    // Members
    {
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
        }
    },
    {
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
        }
    },
    {
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
        }
    },
    {
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
    },
    {
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
    },
    {
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
    },
    // Images
    {
        name: 'upload_image',
        description: 'Upload an image',
        inputSchema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    description: 'Image file to upload (Base64)'
                },
                purpose: {
                    type: 'string',
                    description: 'Image purpose',
                    enum: ['image', 'profile_image', 'icon']
                },
                ref: {
                    type: 'string',
                    description: 'Image reference info (optional)'
                }
            },
            required: ['file']
        }
    },
    {
        name: 'upload_image_from_url',
        description: 'Download an image from a URL and upload it to Ghost. Returns the permanent Ghost URL.',
        inputSchema: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'Source URL of the image to download'
                },
                filename: {
                    type: 'string',
                    description: 'Desired filename (without extension). If omitted, derived from URL or auto-generated.'
                },
                purpose: {
                    type: 'string',
                    description: 'Ghost image purpose: "image" (default) for post content, "profile_image", or "icon"',
                    enum: ['image', 'profile_image', 'icon']
                },
                ref: {
                    type: 'string',
                    description: 'Reference identifier for tracking'
                }
            },
            required: ['url']
        }
    }
];
