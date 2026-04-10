# Ghost MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server for the Ghost Admin API. Fork of [@densh/ghost-mcp-server](https://github.com/densh/ghost-mcp-server) with extended features and security hardening.

Written in TypeScript. 24 tools. 68 tests.

## Features

**Content management** - Full CRUD for posts, pages, members, tags, and authors with filtering, sorting, and search.

**Image uploads** - Base64 and URL-based uploads with MIME type detection, dimension validation, and SVG sanitization.

**Security**
- SSRF protection on URL-based image uploads (blocks private IPs, cloud metadata endpoints, localhost)
- SVG sanitization (strips script tags, event handlers, javascript: URLs)
- HTML sanitization via DOMPurify on all content writes
- Token bucket rate limiting per tool category (read/write/upload/delete)

**This fork adds:**
- Featured image support (`feature_image`, `feature_image_alt`, `feature_image_caption`)
- Custom excerpt and template fields
- Optimistic locking on update operations
- Advanced query parameters (order, formats, include, filter) on all list/search tools
- Configurable Ghost API version via environment variable

## Prerequisites

- Node.js (v18 or higher recommended)
- Ghost CMS instance
- Ghost Admin API key

## Installation

Clone and install from GitHub:

```bash
git clone https://github.com/nautis/ghost-mcp-server.git
cd ghost-mcp-server
npm install
```

Or install globally:

```bash
npm install -g github:nautis/ghost-mcp-server
```

## Configuration

1. Create a new custom integration in your Ghost Admin dashboard under Settings > Integrations.

2. Set the following environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `GHOST_API_URL` | Yes | Your Ghost site URL (e.g., `https://your-ghost-blog.com`) |
| `GHOST_ADMIN_API_KEY` | Yes | Admin API key from Ghost Integrations |
| `GHOST_API_VERSION` | No | Ghost API version (default: `v5.0`) |
| `GHOST_RATE_LIMIT_DISABLED` | No | Set to `true` to disable rate limiting |

```bash
export GHOST_API_URL="https://your-ghost-blog.com"
export GHOST_ADMIN_API_KEY="your_admin_api_key"
```

For MCP client configuration, see `.mcp.json.example`.

## Usage

After installation, start the server with:

```bash
node build/index.js
```

### Development

```bash
npm run dev      # Run with tsx (hot reload)
npm test         # Run tests
npm run build    # Compile TypeScript
```

## Content Formats

Ghost uses **Lexical** as its rich text format. The `lexical` parameter accepts a JSON string.

### Using Markdown in Lexical

The easiest way to write content is using a markdown card inside lexical:

```json
{
  "root": {
    "children": [{
      "type": "markdown",
      "version": 1,
      "markdown": "## Your Heading\n\nYour paragraph with **bold** and *italic* text.\n\n- List item 1\n- List item 2\n\n[Link text](https://example.com)"
    }],
    "direction": null,
    "format": "",
    "indent": 0,
    "type": "root",
    "version": 1
  }
}
```

### Plain Text Paragraph

For simple text without markdown:

```json
{
  "root": {
    "children": [{
      "children": [{
        "detail": 0,
        "format": 0,
        "mode": "normal",
        "style": "",
        "text": "Your paragraph text here.",
        "type": "text",
        "version": 1
      }],
      "direction": "ltr",
      "format": "",
      "indent": 0,
      "type": "paragraph",
      "version": 1
    }],
    "direction": "ltr",
    "format": "",
    "indent": 0,
    "type": "root",
    "version": 1
  }
}
```

**Note:** The `lexical` parameter must be a JSON **string** (use `JSON.stringify()`), not a JSON object.

## Available Tools (24)

### Posts

| Tool | Description | Required params |
|------|-------------|-----------------|
| `get_posts` | List posts with pagination, sorting, filtering | - |
| `get_post` | Get a post by ID | `id` |
| `get_post_by_slug` | Get a post by slug | `slug` |
| `search_posts` | Full-text search posts | `query` |
| `create_post` | Create a new post | `title` |
| `update_post` | Update a post (optimistic locking) | `id` |
| `delete_post` | Delete a post | `id` |

### Pages

| Tool | Description | Required params |
|------|-------------|-----------------|
| `get_pages` | List pages with pagination, sorting, filtering | - |
| `get_page` | Get a page by ID | `id` |
| `get_page_by_slug` | Get a page by slug | `slug` |
| `search_pages` | Search pages by title/slug | `query` |
| `create_page` | Create a new page | `title` |
| `update_page` | Update a page (optimistic locking) | `id` |
| `delete_page` | Delete a page | `id` |

### Members

| Tool | Description | Required params |
|------|-------------|-----------------|
| `get_members` | List members | - |
| `get_member` | Get a member by ID | `id` |
| `search_members` | Search members | `query` |
| `create_member` | Create a member | `email` |
| `update_member` | Update a member | `id` |
| `delete_member` | Delete a member | `id` |

### Tags & Authors

| Tool | Description | Required params |
|------|-------------|-----------------|
| `get_tags` | List tags (with optional post counts) | - |
| `get_authors` | List authors (with optional post counts) | - |

### Images

| Tool | Description | Required params |
|------|-------------|-----------------|
| `upload_image` | Upload from Base64 data | `file` |
| `upload_image_from_url` | Download from URL and upload to Ghost | `url` |

### Common optional parameters

Most list and search tools support:
- `limit` / `page` - Pagination (default: 10 per page)
- `order` - Sort order (e.g., `published_at DESC`)
- `formats` - Content formats to return (`html`, `mobiledoc`, `lexical`)
- `include` - Related data (`authors`, `tags` for posts/pages; `labels`, `newsletters` for members)
- `filter` - Ghost filter syntax (e.g., `tags.slug:reviews+authors.slug:matthew`)

### Detailed tool reference

#### create_post
Creates a new post.

Input:
```json
{
  "title": "string",              // Required: Post title
  "html": "string",               // Optional: HTML content
  "lexical": "string",            // Optional: Lexical content (recommended)
  "status": "string",             // Optional: Post status (published/draft/scheduled)
  "visibility": "string",         // Optional: Visibility level (public/members/paid/tiers)
  "tags": ["string"],             // Optional: Array of tag names
  "authors": ["string"],          // Optional: Array of author IDs
  "featured": "boolean",          // Optional: Set as featured post
  "feature_image": "string",      // Optional: Featured image URL (upload via upload_image_from_url first)
  "feature_image_alt": "string",  // Optional: Alt text for featured image
  "feature_image_caption": "string", // Optional: Caption for featured image
  "custom_excerpt": "string",     // Optional: Custom excerpt (max 300 characters)
  "custom_template": "string",    // Optional: Custom template name (e.g., custom-post-fullwidth)
  "email_subject": "string",      // Optional: Email subject line
  "email_only": "boolean",        // Optional: Email-only post
  "newsletter": "boolean",        // Optional: Whether to send email
  "published_at": "string"        // Optional: Publication date (for scheduled posts)
}
```

#### update_post
Updates an existing post.

Input:
```json
{
  "id": "string",                 // Required: Post ID
  "title": "string",              // Optional: Post title
  "html": "string",               // Optional: HTML content
  "lexical": "string",            // Optional: Lexical content (recommended)
  "status": "string",             // Optional: Post status (published/draft/scheduled)
  "visibility": "string",         // Optional: Visibility level (public/members/paid/tiers)
  "tags": ["string"],             // Optional: Array of tag names (replaces existing)
  "authors": ["string"],          // Optional: Array of author IDs (replaces existing)
  "featured": "boolean",          // Optional: Set as featured post
  "feature_image": "string",      // Optional: Featured image URL
  "feature_image_alt": "string",  // Optional: Alt text for featured image
  "feature_image_caption": "string", // Optional: Caption for featured image
  "custom_excerpt": "string",     // Optional: Custom excerpt (max 300 characters)
  "custom_template": "string",    // Optional: Custom template name (e.g., custom-post-fullwidth)
  "email_subject": "string",      // Optional: Email subject line
  "email_only": "boolean",        // Optional: Email-only post
  "newsletter": "boolean",        // Optional: Whether to send email
  "published_at": "string"        // Optional: Publication date (for scheduled posts)
}
```

#### upload_image_from_url
Downloads an image from a URL and uploads it to Ghost. Returns the permanent Ghost URL.

Input:
```json
{
  "url": "string",      // Required: Source URL of the image to download
  "filename": "string", // Optional: Desired filename (without extension)
  "purpose": "string",  // Optional: Image purpose (image/profile_image/icon, default: image)
  "ref": "string"       // Optional: Reference identifier for tracking
}
```

Output (success):
```json
{
  "success": true,
  "ghost_url": "https://your-ghost-blog.com/content/images/2025/12/image.png",
  "filename": "image.png",
  "size_bytes": 245678,
  "mime_type": "image/png"
}
```

Output (failure):
```json
{
  "success": false,
  "error": "Failed to download: 403 Forbidden"
}
```

Supported formats: PNG, JPEG, GIF, WebP, SVG. Maximum file size: 128MB.

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspect
```

The Inspector will provide a URL to access debugging tools in your browser.

## License

MIT License