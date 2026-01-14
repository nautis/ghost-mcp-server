# Ghost MCP Server

A Model Context Protocol (MCP) server that integrates with the Ghost Admin API. This server enables programmatic access to Ghost CMS features including post management, page management, member management, and more.

## Features

- Post Management (create, read, update, delete, search)
- Page Management (create, read, update, delete)
- Tag Management
- Author Management
- Member Management (create, read, update, delete, search)
- Image Upload (Base64 and URL-based)

## Prerequisites

- Node.js (v18 or higher recommended)
- Ghost CMS instance
- Ghost Admin API key

## Installation

Install the package using npm:

```bash
npm install @densh/ghost-mcp-server
```

## Configuration

1. Create a new custom integration in your Ghost Admin dashboard under Settings > Integrations.

2. Set the following environment variables:

```bash
# macOS/Linux
export GHOST_API_URL="https://your-ghost-blog.com"
export GHOST_ADMIN_API_KEY="your_admin_api_key"

# Windows (PowerShell)
$env:GHOST_API_URL="https://your-ghost-blog.com"
$env:GHOST_ADMIN_API_KEY="your_admin_api_key"
```

Alternatively, you can create a `.env` file:

```env
GHOST_API_URL=https://your-ghost-blog.com
GHOST_ADMIN_API_KEY=your_admin_api_key
```

## Usage

After installation, start the server with:

```bash
npx @densh/ghost-mcp-server
```

## Available Tools

### get_posts
Retrieves a list of blog posts.

Input:
```json
{
  "limit": "number", // Optional: Number of posts to retrieve (1-100, default: 10)
  "page": "number"   // Optional: Page number (default: 1)
}
```

### get_post
Retrieves a specific post by ID.

Input:
```json
{
  "id": "string" // Required: Post ID
}
```

### search_posts
Searches for posts.

Input:
```json
{
  "query": "string", // Required: Search query
  "limit": "number"  // Optional: Number of posts to retrieve (1-100, default: 10)
}
```

### create_post
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

### update_post
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

### delete_post
Deletes a post.

Input:
```json
{
  "id": "string" // Required: Post ID
}
```

### get_pages
Retrieves a list of pages.

Input:
```json
{
  "limit": "number",     // Optional: Number of pages to retrieve (1-100, default: 10)
  "page": "number",      // Optional: Page number (default: 1)
  "order": "string",     // Optional: Sort order
  "formats": ["string"], // Optional: Content formats (html/mobiledoc/lexical)
  "include": ["string"]  // Optional: Related data to include (authors/tags)
}
```

### get_members
Retrieves a list of members.

Input:
```json
{
  "limit": "number",     // Optional: Number of members to retrieve (1-100, default: 10)
  "page": "number",      // Optional: Page number (default: 1)
  "order": "string",     // Optional: Sort order
  "include": ["string"]  // Optional: Related data to include (labels/newsletters)
}
```

### search_members
Searches for members.

Input:
```json
{
  "query": "string",     // Required: Search query
  "limit": "number",     // Optional: Number of members to retrieve (1-100, default: 10)
  "include": ["string"]  // Optional: Related data to include (labels/newsletters)
}
```

### upload_image
Uploads an image from Base64 data.

Input:
```json
{
  "file": "string",   // Required: Base64 encoded image data
  "purpose": "string" // Optional: Image purpose (image/profile_image/icon)
}
```

### upload_image_from_url
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