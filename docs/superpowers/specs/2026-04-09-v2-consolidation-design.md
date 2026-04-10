# ghost-mcp-server v2.0 Consolidation

## Problem

The codebase has diverged: TypeScript source exists only for 3 utility files in `src/`, while the actual tool implementations live as hand-edited JS in `build/`. Dependencies are pinned low, API keys are in plaintext in the repo, there are no tests, and the Ghost API version is hardcoded.

## Goals

1. Make TypeScript the single source of truth (all code in `src/`, `build/` is compiled output only)
2. Remove plaintext API keys from the repo
3. Bump dependency version specs to match reality
4. Add test coverage for security-sensitive utilities
5. Make Ghost API version configurable
6. Bump to v2.0.0

## Non-Goals

- Changing tool schemas or behavior (all 19 tools stay identical)
- Rewriting security utilities (port to TS, don't redesign)
- Adding new tools or features
- Changing the stdio transport or MCP server architecture

## Architecture

```
src/
  index.ts              - Main entry, GhostServer class, tool dispatch
  config/
    config.ts           - Ghost client setup, env var config, API version
  tools/
    index.ts            - Tool schema definitions (JSON)
    posts.ts            - Post CRUD + search
    pages.ts            - Page CRUD + search
    members.ts          - Member CRUD + search
    tags.ts             - Tag listing
    authors.ts          - Author listing
    images.ts           - Image upload (base64 + URL)
  types/
    index.ts            - TypeScript interfaces, type guards, validation
  utils/
    error.ts            - McpError helpers
    rate-limiter.ts     - Token bucket rate limiter (exists)
    sanitize.ts         - HTML sanitization via DOMPurify
    svg-sanitizer.ts    - SVG sanitization (exists)
    url-validator.ts    - SSRF protection (exists)
```

`build/` becomes gitignored compiled output. `tsconfig.json` updated to compile `src/` to `build/`.

## Changes

### 1. Security: API key handling

- Replace plaintext keys in `.mcp.json` with env var references
- Add `.mcp.json` to `.gitignore`
- Create `.mcp.json.example` showing the expected structure with placeholder values
- Document env var setup in README

### 2. TypeScript consolidation

Port all files from `build/` to `src/` as proper TypeScript:
- Add type annotations to all functions
- Use interfaces for Ghost API response types
- Keep the 3 existing `.ts` utility files as-is (already correct)
- Remove `build/` from git tracking

### 3. Dependency updates

| Package | Current spec | Action |
|---------|-------------|--------|
| `@modelcontextprotocol/sdk` | `^1.4.1` | Update to `^1.29.0` |
| `@tryghost/admin-api` | `^1.13.12` | Update to `^1.14.7` |
| `@types/form-data` | prod dep | Move to devDependencies |
| `vitest` | not present | Add as devDependency |

Add `engines` field: `{ "node": ">=18.0.0" }`

### 4. Configurable Ghost API version

- New env var: `GHOST_API_VERSION` (default: `v5.0`)
- Passed to `@tryghost/admin-api` constructor
- Documented in README and `.mcp.json.example`

### 5. Tests (vitest)

Test files alongside source in `src/`:
- `src/utils/url-validator.test.ts` - SSRF protection: private IPs, loopback, cloud metadata, encoded bypasses
- `src/utils/svg-sanitizer.test.ts` - Dangerous elements, event handlers, javascript: URLs
- `src/utils/rate-limiter.test.ts` - Token bucket behavior, burst limits, refill
- `src/types/index.test.ts` - Type guard validation (valid/invalid inputs)

### 6. Version bump

- `package.json` version: `2.0.0`
- Breaking change: config now uses env vars instead of hardcoded `.mcp.json` keys

## Verification

- `npm run build` compiles cleanly with no errors
- `npm test` passes all test suites
- All 19 tools still listed in schema output
- No plaintext secrets in any tracked file
- `build/` is in `.gitignore`
