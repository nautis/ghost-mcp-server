# ghost-mcp-server v2.0 Consolidation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate all hand-edited JS in `build/` into proper TypeScript in `src/`, fix dependencies, add tests, bump to v2.0.0.

**Architecture:** Port every `build/*.js` file to `src/*.ts` with proper type annotations. The 3 existing `.ts` utility files stay as-is. `build/` becomes gitignored compiled output only. Tool schemas move from inline definitions in `tools/index.js` to the individual tool files (which already have more complete schemas with `order`, `formats`, `include`, `filter` fields that the current `tools/index.js` is missing).

**Tech Stack:** TypeScript 5.x, @modelcontextprotocol/sdk 1.29.x, @tryghost/admin-api 1.14.x, vitest

**Important discovery:** The current `build/tools/index.js` defines `toolSchemas` with simplified inline schemas that are LESS complete than the schemas exported by individual tool files (e.g., `posts.js` has `order`, `formats`, `include`, `filter` on `get_posts` but the `toolSchemas` array doesn't). The v2 port fixes this by using the schemas from individual tool files.

---

### Task 1: Project scaffolding and dependency updates

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `tsconfig.json`
- Create: `.mcp.json.example`

- [ ] **Step 1: Update package.json**

```json
{
  "name": "ghost-mcp-server",
  "version": "2.0.0",
  "description": "Ghost CMS MCP Server with full Admin API support",
  "type": "module",
  "main": "build/index.js",
  "scripts": {
    "build": "tsc && chmod +x build/index.js",
    "start": "node build/index.js",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "inspect": "CLIENT_PORT=8080 SERVER_PORT=9000 npx @modelcontextprotocol/inspector build/index.js",
    "prepublishOnly": "npm run build"
  },
  "bin": "build/index.js",
  "files": [
    "build/"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.29.0",
    "@tryghost/admin-api": "^1.14.7",
    "form-data": "^4.0.1",
    "image-size": "^1.2.0",
    "isomorphic-dompurify": "^3.7.1"
  },
  "devDependencies": {
    "@types/form-data": "^2.2.1",
    "@types/node": "^20.11.5",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "vitest": "^3.0.0"
  },
  "keywords": [
    "ghost",
    "mcp",
    "ghost-cms",
    "feature-image"
  ],
  "author": "Matthew Clapp (fork of densh)",
  "license": "MIT"
}
```

Key changes:
- Version bumped to 2.0.0
- Name simplified to `ghost-mcp-server`
- `@types/form-data` moved to devDependencies
- `ts-node` replaced with `tsx` (faster, no config issues)
- `vitest` added
- `engines` field added
- MCP SDK and Ghost Admin API version specs updated
- Build script uses `chmod +x` directly (works on macOS/Linux)

- [ ] **Step 2: Add `build/` to .gitignore**

Append to `.gitignore`:
```
build/
```

(Currently only `node_modules/`, `.env`, `.DS_Store`, `.mcp.json` are listed)

- [ ] **Step 3: Create .mcp.json.example**

```json
{
  "mcpServers": {
    "ghost": {
      "args": ["build/index.js"],
      "command": "node",
      "env": {
        "GHOST_ADMIN_API_KEY": "your-admin-api-key-here",
        "GHOST_API_URL": "https://your-ghost-site.com",
        "GHOST_API_VERSION": "v5.0"
      },
      "type": "stdio"
    }
  }
}
```

- [ ] **Step 4: Install dependencies**

Run: `cd /Users/scrappy/claude-code/ghost-mcp-server && npm install`
Expected: Clean install with updated deps

- [ ] **Step 5: Remove build/ from git tracking**

Run: `cd /Users/scrappy/claude-code/ghost-mcp-server && git rm -r --cached build/`
Expected: Files removed from index but still on disk

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore .mcp.json.example
git commit -m "chore: scaffold v2.0.0 - update deps, gitignore build/"
```

---

### Task 2: Port types and config to TypeScript

**Files:**
- Create: `src/types/index.ts`
- Create: `src/config/config.ts`
- Create: `src/utils/error.ts`
- Create: `src/utils/sanitize.ts`

- [ ] **Step 1: Create src/types/index.ts**

```typescript
// Type definitions and type guards for Ghost MCP Server

export type PostStatus = 'published' | 'draft' | 'scheduled';
export type PostVisibility = 'public' | 'members' | 'paid' | 'tiers';
export type ContentFormat = 'html' | 'mobiledoc' | 'lexical';
export type PostInclude = 'authors' | 'tags';
export type MemberInclude = 'labels' | 'newsletters';
export type ImagePurpose = 'image' | 'profile_image' | 'icon';
export type PostSortOrder =
  | 'published_at DESC' | 'published_at ASC'
  | 'created_at DESC' | 'created_at ASC'
  | 'updated_at DESC' | 'updated_at ASC';
export type MemberSortOrder =
  | 'created_at DESC' | 'created_at ASC'
  | 'updated_at DESC' | 'updated_at ASC';
export type TagSortOrder =
  | 'name ASC' | 'name DESC'
  | 'created_at DESC' | 'created_at ASC';
export type AuthorSortOrder =
  | 'name ASC' | 'name DESC'
  | 'created_at DESC' | 'created_at ASC'
  | 'slug ASC' | 'slug DESC';

export interface PaginationParams {
  limit?: number;
  page?: number;
  order?: string;
}

export interface SearchParams extends PaginationParams {
  query: string;
  formats?: string[];
  include?: string[];
  filter?: string;
}

export interface MemberPaginationParams extends PaginationParams {
  include?: string[];
  filter?: string;
}

export interface MemberSearchParams extends MemberPaginationParams {
  query: string;
}

export interface CreateMemberParams {
  email: string;
  name?: string;
  note?: string;
  labels?: string[];
  newsletters?: string[];
  subscribed?: boolean;
}

export interface UpdateMemberParams {
  id: string;
  email?: string;
  name?: string;
  note?: string;
  labels?: string[];
  newsletters?: string[];
  subscribed?: boolean;
}

export interface ImageUploadParams {
  file: string;
  purpose?: ImagePurpose;
  ref?: string;
}

export interface ImageUrlUploadParams {
  url: string;
  filename?: string;
  purpose?: ImagePurpose;
  ref?: string;
}

export interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
}

// Type guards

export const isPostStatus = (value: unknown): value is PostStatus =>
  typeof value === 'string' && ['published', 'draft', 'scheduled'].includes(value);

export const isPostVisibility = (value: unknown): value is PostVisibility =>
  typeof value === 'string' && ['public', 'members', 'paid', 'tiers'].includes(value);

export const isImageUploadParams = (args: unknown): args is ImageUploadParams => {
  if (typeof args !== 'object' || args === null) return false;
  const obj = args as Record<string, unknown>;
  return typeof obj.file === 'string' &&
    (obj.purpose === undefined || ['image', 'profile_image', 'icon'].includes(obj.purpose as string)) &&
    (obj.ref === undefined || typeof obj.ref === 'string');
};

export const isImageUrlUploadParams = (args: unknown): args is ImageUrlUploadParams => {
  if (typeof args !== 'object' || args === null) return false;
  const obj = args as Record<string, unknown>;
  return typeof obj.url === 'string' &&
    (obj.filename === undefined || typeof obj.filename === 'string') &&
    (obj.purpose === undefined || ['image', 'profile_image', 'icon'].includes(obj.purpose as string)) &&
    (obj.ref === undefined || typeof obj.ref === 'string');
};

export const isSearchParams = (args: unknown): args is SearchParams => {
  if (typeof args !== 'object' || args === null) return false;
  const obj = args as Record<string, unknown>;
  return typeof obj.query === 'string' &&
    (obj.limit === undefined || typeof obj.limit === 'number') &&
    (obj.page === undefined || typeof obj.page === 'number') &&
    (obj.order === undefined || typeof obj.order === 'string') &&
    (obj.formats === undefined || (Array.isArray(obj.formats) && obj.formats.every((f: unknown) => typeof f === 'string'))) &&
    (obj.include === undefined || (Array.isArray(obj.include) && obj.include.every((i: unknown) => typeof i === 'string')));
};

export const isPaginationParams = (args: unknown): args is PaginationParams => {
  if (typeof args !== 'object' || args === null) return false;
  const obj = args as Record<string, unknown>;
  return (obj.limit === undefined || typeof obj.limit === 'number') &&
    (obj.page === undefined || typeof obj.page === 'number') &&
    (obj.order === undefined || typeof obj.order === 'string');
};

export const isMemberPaginationParams = (args: unknown): args is MemberPaginationParams => {
  if (!isPaginationParams(args)) return false;
  const obj = args as Record<string, unknown>;
  return (obj.include === undefined || (Array.isArray(obj.include) && obj.include.every((i: unknown) => typeof i === 'string'))) &&
    (obj.filter === undefined || typeof obj.filter === 'string');
};

export const isMemberSearchParams = (args: unknown): args is MemberSearchParams => {
  if (!isMemberPaginationParams(args)) return false;
  const obj = args as Record<string, unknown>;
  return typeof obj.query === 'string';
};

export const isCreateMemberParams = (args: unknown): args is CreateMemberParams => {
  if (typeof args !== 'object' || args === null) return false;
  const obj = args as Record<string, unknown>;
  return typeof obj.email === 'string' &&
    (obj.name === undefined || typeof obj.name === 'string') &&
    (obj.note === undefined || typeof obj.note === 'string') &&
    (obj.labels === undefined || (Array.isArray(obj.labels) && obj.labels.every((l: unknown) => typeof l === 'string'))) &&
    (obj.newsletters === undefined || (Array.isArray(obj.newsletters) && obj.newsletters.every((n: unknown) => typeof n === 'string'))) &&
    (obj.subscribed === undefined || typeof obj.subscribed === 'boolean');
};

export const isUpdateMemberParams = (args: unknown): args is UpdateMemberParams => {
  if (typeof args !== 'object' || args === null) return false;
  const obj = args as Record<string, unknown>;
  return typeof obj.id === 'string' &&
    (obj.email === undefined || typeof obj.email === 'string') &&
    (obj.name === undefined || typeof obj.name === 'string') &&
    (obj.note === undefined || typeof obj.note === 'string') &&
    (obj.labels === undefined || (Array.isArray(obj.labels) && obj.labels.every((l: unknown) => typeof l === 'string'))) &&
    (obj.newsletters === undefined || (Array.isArray(obj.newsletters) && obj.newsletters.every((n: unknown) => typeof n === 'string'))) &&
    (obj.subscribed === undefined || typeof obj.subscribed === 'boolean');
};
```

- [ ] **Step 2: Create src/config/config.ts**

```typescript
import GhostAdminAPI from '@tryghost/admin-api';

export const getConfig = () => {
  const apiUrl = process.env.GHOST_API_URL;
  const adminApiKey = process.env.GHOST_ADMIN_API_KEY;
  const version = process.env.GHOST_API_VERSION || 'v5.0';

  if (!apiUrl || !adminApiKey) {
    throw new Error('GHOST_API_URL and GHOST_ADMIN_API_KEY environment variables are required');
  }

  return { apiUrl, adminApiKey, version };
};

export const createGhostApi = () => {
  const config = getConfig();
  return new GhostAdminAPI({
    url: config.apiUrl,
    key: config.adminApiKey,
    version: config.version,
  });
};
```

- [ ] **Step 3: Create src/utils/error.ts**

```typescript
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

export const handleGhostApiError = (error: unknown): never => {
  if (error instanceof McpError) {
    throw error;
  }
  console.error('Ghost API Error:', error);
  const message = error instanceof Error ? error.message : String(error);
  throw new McpError(ErrorCode.InternalError, `Ghost API error: ${message}`);
};
```

- [ ] **Step 4: Create src/utils/sanitize.ts**

```typescript
import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'div', 'span', 'br', 'hr',
  'b', 'i', 'strong', 'em', 'u', 's', 'strike',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'figure', 'figcaption',
  'iframe', 'video', 'audio', 'source',
];

const ALLOWED_ATTR = [
  'href', 'name', 'target', 'rel', 'title',
  'src', 'alt', 'width', 'height',
  'frameborder', 'allowfullscreen',
  'controls', 'autoplay', 'loop', 'muted',
  'type', 'colspan', 'rowspan',
  'class', 'id',
];

export const sanitizeHtmlContent = (html: string): string => {
  if (!html || typeof html !== 'string') {
    return html;
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
};
```

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/config/config.ts src/utils/error.ts src/utils/sanitize.ts
git commit -m "feat: port types, config, error, and sanitize to TypeScript"
```

---

### Task 3: Port tool implementations to TypeScript

**Files:**
- Create: `src/tools/posts.ts`
- Create: `src/tools/pages.ts`
- Create: `src/tools/members.ts`
- Create: `src/tools/tags.ts`
- Create: `src/tools/authors.ts`
- Create: `src/tools/images.ts`
- Create: `src/tools/index.ts`

- [ ] **Step 1: Create src/tools/posts.ts**

Port from `build/tools/posts.js`. Key changes: add type annotations, import types from `../types/index.js`, keep schemas and functions together. Use the MORE COMPLETE schemas from `build/tools/posts.js` (which include `order`, `formats`, `include`, `filter`) rather than the simplified ones from `build/tools/index.js`.

```typescript
import { handleGhostApiError } from '../utils/error.js';
import { createGhostApi } from '../config/config.js';
import { sanitizeHtmlContent } from '../utils/sanitize.js';
import type { McpToolResult } from '../types/index.js';

const ghostApi = createGhostApi();

export const getPostsSchema = {
  name: 'get_posts',
  description: 'Get a list of blog posts',
  inputSchema: {
    type: 'object' as const,
    properties: {
      limit: { type: 'number' as const, description: 'Number of posts to retrieve (default: 10)', minimum: 1, maximum: 100 },
      page: { type: 'number' as const, description: 'Page number (default: 1)', minimum: 1 },
      order: { type: 'string' as const, description: 'Sort order (default: published_at DESC)', enum: ['published_at DESC', 'published_at ASC', 'created_at DESC', 'created_at ASC', 'updated_at DESC', 'updated_at ASC'] },
      formats: { type: 'array' as const, description: 'Content formats to retrieve', items: { type: 'string' as const, enum: ['html', 'mobiledoc', 'lexical'] } },
      include: { type: 'array' as const, description: 'Related data to include', items: { type: 'string' as const, enum: ['authors', 'tags'] } },
      filter: { type: 'string' as const, description: 'Filter expression using Ghost filter syntax (e.g., "authors.slug:matthew", "tags.slug:reviews")' },
    },
  },
};

// ... (remaining schemas follow the same pattern as build/tools/posts.js)
// Copy all schema objects: getPostSchema, createPostSchema, updatePostSchema,
// deletePostSchema, getPostBySlugSchema, searchPostsSchema
// Add `as const` to all type string literals for TS compatibility

// Function implementations are identical to build/tools/posts.js with type annotations added:

interface GetPostsParams {
  limit?: number;
  page?: number;
  order?: string;
  formats?: string[];
  include?: string[];
  filter?: string;
}

export const getPosts = async ({ limit = 10, page = 1, order, formats, include, filter }: GetPostsParams): Promise<McpToolResult> => {
  try {
    const params: Record<string, unknown> = { limit, page };
    if (order) params.order = order;
    if (formats?.length) params.formats = formats.join(',');
    if (include?.length) params.include = include.join(',');
    if (filter) params.filter = filter;
    const posts = await ghostApi.posts.browse(params);
    return { content: [{ type: 'text', text: JSON.stringify(posts, null, 2) }] };
  } catch (error) {
    throw handleGhostApiError(error);
  }
};

// ... (remaining functions: getPost, searchPosts, createPost, updatePost, deletePost, getPostBySlug)
// All follow the exact same logic as build/tools/posts.js with type annotations
```

The full file ports ALL 7 schema exports and ALL 7 function exports from `build/tools/posts.js`. Each function gets a typed params interface. The `createPost` and `updatePost` functions include HTML sanitization and the optimistic locking pattern (fetching `updated_at` before edit).

- [ ] **Step 2: Create src/tools/pages.ts**

Same pattern as posts.ts. Port from `build/tools/pages.js`. Includes schemas: `getPagesSchema`, `getPageSchema`, `createPageSchema`, `updatePageSchema`, `deletePageSchema`, `searchPagesSchema`, `getPageBySlugSchema`. Functions use `ghostApi.pages` instead of `ghostApi.posts`.

- [ ] **Step 3: Create src/tools/members.ts**

Port from `build/tools/members.js`. Includes schemas: `getMembersSchema`, `getMemberSchema`, `createMemberSchema`, `updateMemberSchema`, `deleteMemberSchema`, `searchMembersSchema`. Functions use `ghostApi.members`.

- [ ] **Step 4: Create src/tools/tags.ts**

Port from `build/tools/tags.js`. One schema (`getTagsSchema`), one function (`getTags`). Uses `ghostApi.tags.browse()`.

- [ ] **Step 5: Create src/tools/authors.ts**

Port from `build/tools/authors.js`. One schema (`getAuthorsSchema`), one function (`getAuthors`). Uses `ghostApi.users.browse()`.

- [ ] **Step 6: Create src/tools/images.ts**

Port from `build/tools/images.js`. This is the most complex file. Includes:
- Constants: `ALLOWED_FORMATS`, `MAX_FILE_SIZE`, `MAX_URL_FILE_SIZE`, `DOWNLOAD_TIMEOUT_MS`, `MIME_TO_EXT`
- Helper functions: `validateImageFormat`, `parseBase64Image`, `extractFilenameFromUrl`, `generateUuid`, `detectMimeFromBuffer`
- Main functions: `uploadImage`, `uploadImageFromUrl`
- Schemas: `uploadImageSchema`, `uploadImageFromUrlSchema`

All imports stay the same but typed. The SSRF validation and SVG sanitization are imported from existing `.ts` files.

- [ ] **Step 7: Create src/tools/index.ts**

This replaces the current `build/tools/index.js` which has inline schemas. Instead, reference the schema objects from individual tool files:

```typescript
export { getPosts, getPost, searchPosts, createPost, updatePost, deletePost, getPostBySlug } from './posts.js';
export { getPostsSchema, getPostSchema, searchPostsSchema, createPostSchema, updatePostSchema, deletePostSchema, getPostBySlugSchema } from './posts.js';

export { getPages, getPage, searchPages, createPage, updatePage, deletePage, getPageBySlug } from './pages.js';
export { getPagesSchema, getPageSchema, searchPagesSchema, createPageSchema, updatePageSchema, deletePageSchema, getPageBySlugSchema } from './pages.js';

export { getMembers, getMember, searchMembers, createMember, updateMember, deleteMember } from './members.js';
export { getMembersSchema, getMemberSchema, searchMembersSchema, createMemberSchema, updateMemberSchema, deleteMemberSchema } from './members.js';

export { getTags } from './tags.js';
export { getTagsSchema } from './tags.js';

export { getAuthors } from './authors.js';
export { getAuthorsSchema } from './authors.js';

export { uploadImage, uploadImageFromUrl } from './images.js';
export { uploadImageSchema, uploadImageFromUrlSchema } from './images.js';

import { getPostsSchema, getPostSchema, searchPostsSchema, createPostSchema, updatePostSchema, deletePostSchema, getPostBySlugSchema } from './posts.js';
import { getPagesSchema, getPageSchema, searchPagesSchema, createPageSchema, updatePageSchema, deletePageSchema, getPageBySlugSchema } from './pages.js';
import { getMembersSchema, getMemberSchema, searchMembersSchema, createMemberSchema, updateMemberSchema, deleteMemberSchema } from './members.js';
import { getTagsSchema } from './tags.js';
import { getAuthorsSchema } from './authors.js';
import { uploadImageSchema, uploadImageFromUrlSchema } from './images.js';

export const toolSchemas = [
  // Posts
  getPostsSchema,
  getPostSchema,
  searchPostsSchema,
  createPostSchema,
  updatePostSchema,
  deletePostSchema,
  getPostBySlugSchema,
  // Pages
  getPagesSchema,
  getPageSchema,
  searchPagesSchema,
  createPageSchema,
  updatePageSchema,
  deletePageSchema,
  getPageBySlugSchema,
  // Members
  getMembersSchema,
  getMemberSchema,
  searchMembersSchema,
  createMemberSchema,
  updateMemberSchema,
  deleteMemberSchema,
  // Tags & Authors
  getTagsSchema,
  getAuthorsSchema,
  // Images
  uploadImageSchema,
  uploadImageFromUrlSchema,
];
```

- [ ] **Step 8: Commit**

```bash
git add src/tools/
git commit -m "feat: port all tool implementations to TypeScript"
```

---

### Task 4: Port main entry point

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create src/index.ts**

Port from `build/index.js`. Add type annotations, use typed imports:

```typescript
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
  getPost, getPosts, searchPosts, createPost, updatePost, deletePost, getPostBySlug,
  getPage, getPages, searchPages, createPage, updatePage, deletePage, getPageBySlug,
  getTags, getAuthors,
  getMember, getMembers, searchMembers, createMember, updateMember, deleteMember,
  uploadImage, uploadImageFromUrl,
  toolSchemas,
} from './tools/index.js';
import {
  isPaginationParams, isSearchParams,
  isMemberPaginationParams, isMemberSearchParams,
  isCreateMemberParams, isUpdateMemberParams,
  isImageUploadParams, isImageUrlUploadParams,
  isPostStatus, isPostVisibility,
} from './types/index.js';
import { rateLimiter } from './utils/rate-limiter.js';

// Redirect console.log to stderr for MCP stdio transport compatibility
console.log = (...args: unknown[]) => console.error(...args);

class GhostServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: 'ghost-mcp-server', version: '2.0.0' },
      { capabilities: { tools: {} } },
    );
    this.setupToolHandlers();
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  // setupToolHandlers() is identical to build/index.js lines 31-284
  // with type annotations on the request parameter and args
  // ... (full switch statement dispatching all 19 tools)

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Ghost MCP server running on stdio');
  }
}

const server = new GhostServer();
server.run().catch(console.error);
```

The full `setupToolHandlers()` method is copied from `build/index.js` with type annotations added. The switch statement dispatching all 19 tools stays identical.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/scrappy/claude-code/ghost-mcp-server && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Build**

Run: `cd /Users/scrappy/claude-code/ghost-mcp-server && npm run build`
Expected: Clean compile, `build/index.js` created

- [ ] **Step 4: Verify tool listing**

Run: `cd /Users/scrappy/claude-code/ghost-mcp-server && echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | GHOST_API_URL=https://example.com GHOST_ADMIN_API_KEY=fake:key node build/index.js 2>/dev/null | head -c 500`
Expected: JSON response listing all 19 tools

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: port main entry point to TypeScript"
```

---

### Task 5: Add tests for security utilities

**Files:**
- Create: `src/utils/url-validator.test.ts`
- Create: `src/utils/svg-sanitizer.test.ts`
- Create: `src/utils/rate-limiter.test.ts`
- Create: `src/types/index.test.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 2: Create src/utils/url-validator.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { validateUrlForSsrf } from './url-validator.js';

describe('validateUrlForSsrf', () => {
  // Valid URLs
  it('allows public HTTPS URLs', () => {
    expect(validateUrlForSsrf('https://example.com/image.png')).toEqual({ valid: true });
  });

  it('allows public HTTP URLs', () => {
    expect(validateUrlForSsrf('http://example.com/image.png')).toEqual({ valid: true });
  });

  // Blocked protocols
  it('blocks file:// protocol', () => {
    const result = validateUrlForSsrf('file:///etc/passwd');
    expect(result.valid).toBe(false);
  });

  it('blocks ftp:// protocol', () => {
    const result = validateUrlForSsrf('ftp://example.com/file');
    expect(result.valid).toBe(false);
  });

  // Private IP ranges
  it('blocks 10.x.x.x (RFC1918)', () => {
    const result = validateUrlForSsrf('http://10.0.0.1/image.png');
    expect(result.valid).toBe(false);
  });

  it('blocks 172.16.x.x (RFC1918)', () => {
    const result = validateUrlForSsrf('http://172.16.0.1/image.png');
    expect(result.valid).toBe(false);
  });

  it('blocks 192.168.x.x (RFC1918)', () => {
    const result = validateUrlForSsrf('http://192.168.1.1/image.png');
    expect(result.valid).toBe(false);
  });

  // Loopback
  it('blocks 127.0.0.1', () => {
    const result = validateUrlForSsrf('http://127.0.0.1/');
    expect(result.valid).toBe(false);
  });

  it('blocks localhost', () => {
    const result = validateUrlForSsrf('http://localhost/');
    expect(result.valid).toBe(false);
  });

  // Cloud metadata
  it('blocks 169.254.169.254 (cloud metadata)', () => {
    const result = validateUrlForSsrf('http://169.254.169.254/latest/meta-data/');
    expect(result.valid).toBe(false);
  });

  it('blocks metadata.google.internal', () => {
    const result = validateUrlForSsrf('http://metadata.google.internal/');
    expect(result.valid).toBe(false);
  });

  // Hostname patterns
  it('blocks .internal domains', () => {
    const result = validateUrlForSsrf('http://api.internal/secret');
    expect(result.valid).toBe(false);
  });

  it('blocks .local domains', () => {
    const result = validateUrlForSsrf('http://printer.local/');
    expect(result.valid).toBe(false);
  });

  // URL encoding bypasses
  it('blocks URL-encoded localhost', () => {
    const result = validateUrlForSsrf('http://%6C%6F%63%61%6C%68%6F%73%74/');
    expect(result.valid).toBe(false);
  });

  // Invalid URLs
  it('rejects invalid URL format', () => {
    const result = validateUrlForSsrf('not-a-url');
    expect(result.valid).toBe(false);
  });
});
```

- [ ] **Step 3: Create src/utils/svg-sanitizer.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { sanitizeSvg, isSvgContent } from './svg-sanitizer.js';

describe('sanitizeSvg', () => {
  it('removes script elements', () => {
    const input = '<svg><script>alert("xss")</script><circle r="10"/></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('<script');
    expect(result).toContain('<circle');
  });

  it('removes foreignObject elements', () => {
    const input = '<svg><foreignobject><body>evil</body></foreignobject></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('foreignobject');
  });

  it('removes iframe elements', () => {
    const input = '<svg><iframe src="http://evil.com"></iframe></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('iframe');
  });

  it('removes onclick attributes', () => {
    const input = '<svg><circle onclick="alert(1)" r="10"/></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('onclick');
    expect(result).toContain('r="10"');
  });

  it('removes onerror attributes', () => {
    const input = '<svg><image onerror="alert(1)" href="x"/></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('onerror');
  });

  it('removes javascript: URLs from href', () => {
    const input = '<svg><a href="javascript:alert(1)">link</a></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('javascript:');
  });

  it('removes javascript: URLs from xlink:href', () => {
    const input = '<svg><a xlink:href="javascript:alert(1)">link</a></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('javascript:');
  });

  it('removes data:text/html URLs', () => {
    const input = '<svg><a href="data:text/html,<script>alert(1)</script>">link</a></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('data:text/html');
  });

  it('removes dangerous XML processing instructions', () => {
    const input = '<svg><?xml-stylesheet href="evil.css"?><circle r="10"/></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('xml-stylesheet');
  });

  it('preserves safe SVG content', () => {
    const input = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red"/></svg>';
    const result = sanitizeSvg(input);
    expect(result).toBe(input);
  });
});

describe('isSvgContent', () => {
  it('detects SVG with <svg tag', () => {
    expect(isSvgContent(Buffer.from('<svg viewBox="0 0 100 100"></svg>'))).toBe(true);
  });

  it('detects SVG with XML declaration', () => {
    expect(isSvgContent(Buffer.from('<?xml version="1.0"?><svg></svg>'))).toBe(true);
  });

  it('rejects non-SVG content', () => {
    expect(isSvgContent(Buffer.from('<html><body>not svg</body></html>'))).toBe(false);
  });
});
```

- [ ] **Step 4: Create src/utils/rate-limiter.test.ts**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter, DEFAULT_LIMITS } from './rate-limiter.js';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(DEFAULT_LIMITS, true);
  });

  it('allows requests within burst limit', () => {
    const result = limiter.consume('get_posts');
    expect(result.allowed).toBe(true);
    expect(result.category).toBe('read');
  });

  it('exhausts tokens after burst limit', () => {
    // Read category has 60 burst tokens
    for (let i = 0; i < 60; i++) {
      expect(limiter.consume('get_posts').allowed).toBe(true);
    }
    const result = limiter.consume('get_posts');
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('categorizes write operations correctly', () => {
    const result = limiter.consume('create_post');
    expect(result.category).toBe('write');
  });

  it('categorizes delete operations correctly', () => {
    const result = limiter.consume('delete_post');
    expect(result.category).toBe('delete');
  });

  it('categorizes upload operations correctly', () => {
    const result = limiter.consume('upload_image');
    expect(result.category).toBe('upload');
  });

  it('defaults unknown tools to read category', () => {
    const result = limiter.consume('unknown_tool');
    expect(result.allowed).toBe(true);
  });

  it('bypasses rate limiting when disabled', () => {
    const disabled = new RateLimiter(DEFAULT_LIMITS, false);
    for (let i = 0; i < 100; i++) {
      expect(disabled.consume('get_posts').allowed).toBe(true);
    }
  });

  it('resets all buckets', () => {
    // Exhaust tokens
    for (let i = 0; i < 60; i++) {
      limiter.consume('get_posts');
    }
    expect(limiter.consume('get_posts').allowed).toBe(false);

    limiter.reset();
    expect(limiter.consume('get_posts').allowed).toBe(true);
  });

  it('reports status correctly', () => {
    const status = limiter.getStatus();
    expect(status.read.maxTokens).toBe(60);
    expect(status.write.maxTokens).toBe(20);
    expect(status.upload.maxTokens).toBe(10);
    expect(status.delete.maxTokens).toBe(10);
  });
});
```

- [ ] **Step 5: Create src/types/index.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import {
  isImageUploadParams, isImageUrlUploadParams,
  isSearchParams, isPaginationParams,
  isMemberPaginationParams, isMemberSearchParams,
  isCreateMemberParams, isUpdateMemberParams,
  isPostStatus, isPostVisibility,
} from './index.js';

describe('isPostStatus', () => {
  it('accepts valid statuses', () => {
    expect(isPostStatus('published')).toBe(true);
    expect(isPostStatus('draft')).toBe(true);
    expect(isPostStatus('scheduled')).toBe(true);
  });
  it('rejects invalid statuses', () => {
    expect(isPostStatus('archived')).toBe(false);
    expect(isPostStatus(123)).toBe(false);
  });
});

describe('isPostVisibility', () => {
  it('accepts valid visibilities', () => {
    expect(isPostVisibility('public')).toBe(true);
    expect(isPostVisibility('members')).toBe(true);
    expect(isPostVisibility('paid')).toBe(true);
    expect(isPostVisibility('tiers')).toBe(true);
  });
  it('rejects invalid visibilities', () => {
    expect(isPostVisibility('private')).toBe(false);
  });
});

describe('isPaginationParams', () => {
  it('accepts empty object', () => {
    expect(isPaginationParams({})).toBe(true);
  });
  it('accepts valid params', () => {
    expect(isPaginationParams({ limit: 10, page: 1 })).toBe(true);
  });
  it('rejects non-object', () => {
    expect(isPaginationParams(null)).toBe(false);
    expect(isPaginationParams('string')).toBe(false);
  });
  it('rejects wrong types', () => {
    expect(isPaginationParams({ limit: 'ten' })).toBe(false);
  });
});

describe('isSearchParams', () => {
  it('accepts valid search params', () => {
    expect(isSearchParams({ query: 'test' })).toBe(true);
    expect(isSearchParams({ query: 'test', limit: 5, formats: ['html'] })).toBe(true);
  });
  it('rejects missing query', () => {
    expect(isSearchParams({ limit: 5 })).toBe(false);
  });
});

describe('isImageUploadParams', () => {
  it('accepts valid params', () => {
    expect(isImageUploadParams({ file: 'data:image/png;base64,abc' })).toBe(true);
    expect(isImageUploadParams({ file: 'data:image/png;base64,abc', purpose: 'image' })).toBe(true);
  });
  it('rejects missing file', () => {
    expect(isImageUploadParams({ purpose: 'image' })).toBe(false);
  });
  it('rejects invalid purpose', () => {
    expect(isImageUploadParams({ file: 'abc', purpose: 'banner' })).toBe(false);
  });
});

describe('isImageUrlUploadParams', () => {
  it('accepts valid params', () => {
    expect(isImageUrlUploadParams({ url: 'https://example.com/img.png' })).toBe(true);
  });
  it('rejects missing url', () => {
    expect(isImageUrlUploadParams({ filename: 'test' })).toBe(false);
  });
});

describe('isCreateMemberParams', () => {
  it('accepts valid params', () => {
    expect(isCreateMemberParams({ email: 'test@example.com' })).toBe(true);
    expect(isCreateMemberParams({ email: 'test@example.com', name: 'Test', subscribed: true })).toBe(true);
  });
  it('rejects missing email', () => {
    expect(isCreateMemberParams({ name: 'Test' })).toBe(false);
  });
});

describe('isUpdateMemberParams', () => {
  it('accepts valid params', () => {
    expect(isUpdateMemberParams({ id: '123' })).toBe(true);
    expect(isUpdateMemberParams({ id: '123', email: 'new@example.com' })).toBe(true);
  });
  it('rejects missing id', () => {
    expect(isUpdateMemberParams({ email: 'test@example.com' })).toBe(false);
  });
});
```

- [ ] **Step 6: Run tests**

Run: `cd /Users/scrappy/claude-code/ghost-mcp-server && npm test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts src/**/*.test.ts
git commit -m "test: add tests for security utilities and type guards"
```

---

### Task 6: Clean up and build verification

**Files:**
- Modify: `README.md` (update setup instructions)

- [ ] **Step 1: Full clean build**

Run: `cd /Users/scrappy/claude-code/ghost-mcp-server && rm -rf build && npm run build`
Expected: Clean compile from TypeScript source only

- [ ] **Step 2: Run tests**

Run: `cd /Users/scrappy/claude-code/ghost-mcp-server && npm test`
Expected: All tests pass

- [ ] **Step 3: Verify no secrets in tracked files**

Run: `cd /Users/scrappy/claude-code/ghost-mcp-server && git ls-files | xargs grep -l "GHOST_ADMIN_API_KEY.*:" 2>/dev/null | grep -v node_modules | grep -v .example`
Expected: No output (no files contain actual API keys)

- [ ] **Step 4: Verify tool count**

Run: `cd /Users/scrappy/claude-code/ghost-mcp-server && echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | GHOST_API_URL=https://example.com GHOST_ADMIN_API_KEY=fake:key node build/index.js 2>/dev/null | node -e "process.stdin.on('data',d=>{const r=JSON.parse(d);console.log('Tools:',r.result.tools.length);r.result.tools.forEach(t=>console.log(' -',t.name))})"`
Expected: 19 tools listed, matching the original set

- [ ] **Step 5: Update README.md**

Add/update the configuration section to document:
- `GHOST_API_URL` (required)
- `GHOST_ADMIN_API_KEY` (required)
- `GHOST_API_VERSION` (optional, default: v5.0)
- `GHOST_RATE_LIMIT_DISABLED` (optional, default: false)
- Reference `.mcp.json.example` for MCP client setup

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: ghost-mcp-server v2.0.0 - full TypeScript consolidation

- All source code now in src/ as TypeScript (build/ is compiled output)
- Dependencies updated: MCP SDK ^1.29.0, Ghost Admin API ^1.14.7
- Ghost API version configurable via GHOST_API_VERSION env var
- Tool schemas now use complete definitions (added order, formats, include, filter fields)
- Test suite added for security utilities (SSRF, SVG sanitizer, rate limiter, type guards)
- @types/form-data moved to devDependencies
- Node.js >=18 engine requirement added
- ts-node replaced with tsx for development"
```

---

### Task 7: Post-migration verification

- [ ] **Step 1: Verify MCP server starts with real config**

Run: `cd /Users/scrappy/claude-code/ghost-mcp-server && timeout 3 node build/index.js 2>&1 || true`
Expected: "Ghost MCP server running on stdio" on stderr, then timeout

- [ ] **Step 2: Run the MCP inspector**

Run: `cd /Users/scrappy/claude-code/ghost-mcp-server && npm run inspect`
Expected: Inspector starts and shows all 19 tools. Manual verification step - check a few tool schemas look correct.

- [ ] **Step 3: Spot check - compare a schema before/after**

Compare `get_posts` schema from v2 build against the v1 build to confirm the v2 version has the ADDITIONAL fields (order, formats, include, filter) that were missing from the v1 `toolSchemas` array.
