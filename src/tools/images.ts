// ABOUTME: Handles image uploads to Ghost CMS via the Admin API.
// ABOUTME: Supports both base64 uploads and direct URL-to-Ghost transfers.
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import FormData from 'form-data';
import { randomUUID } from 'node:crypto';
import { createGhostApi } from '../config/config.js';
import { handleGhostApiError } from '../utils/error.js';
import { isImageUploadParams, isImageUrlUploadParams } from '../types/index.js';
import type { McpToolResult, ImagePurpose } from '../types/index.js';
import { resolveAndValidate } from '../utils/url-validator.js';
import { sanitizeSvg, isSvgContent } from '../utils/svg-sanitizer.js';
import imageSize from 'image-size';

// Lazy-init Ghost API client (see posts.ts).
let _ghostApi: ReturnType<typeof createGhostApi> | null = null;
function ghostApi() {
  if (!_ghostApi) _ghostApi = createGhostApi();
  return _ghostApi;
}

// Maximum redirect hops on a URL image download. Each hop is independently
// SSRF-validated.
const MAX_REDIRECTS = 3;

// Allowed image formats
const ALLOWED_FORMATS: Record<string, string[]> = {
  image: ['.webp', '.jpg', '.jpeg', '.gif', '.png', '.svg'],
  profile_image: ['.webp', '.jpg', '.jpeg', '.gif', '.png', '.svg'],
  icon: ['.webp', '.jpg', '.jpeg', '.gif', '.png', '.svg', '.ico'],
};

// Maximum file size for base64 uploads (2MB)
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Maximum file size for URL uploads (128MB)
const MAX_URL_FILE_SIZE = 128 * 1024 * 1024;

// Download timeout (30 seconds)
const DOWNLOAD_TIMEOUT_MS = 30000;

// MIME type to extension mapping
const MIME_TO_EXT: Record<string, string> = {
  'image/webp': '.webp',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/png': '.png',
  'image/svg+xml': '.svg',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
};

// Image format validation
const validateImageFormat = (
  buffer: Buffer,
  mimeType: string,
  purpose: string = 'image'
): void => {
  // Check file size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    );
  }

  // Get extension from MIME type
  const extension = `.${mimeType.split('/')[1]}`.toLowerCase();
  const allowedFormats = ALLOWED_FORMATS[purpose];
  if (!allowedFormats.includes(extension)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid image format for ${purpose}. Allowed formats: ${allowedFormats.join(', ')}`
    );
  }

  // Add square dimension check for profile_image and icon
  if (purpose === 'profile_image' || purpose === 'icon') {
    try {
      const dimensions = imageSize(buffer);
      if (!dimensions || dimensions.width !== dimensions.height) {
        throw new McpError(
          ErrorCode.InvalidParams,
          dimensions
            ? `${purpose} must be square (current dimensions: ${dimensions.width}x${dimensions.height})`
            : `Failed to determine image dimensions`
        );
      }
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InvalidParams,
        'Failed to read image dimensions'
      );
    }
  }
};

// Convert Base64 to Buffer and extract MIME type
const parseBase64Image = (
  base64Data: string
): { buffer: Buffer; mimeType: string } => {
  const matches = base64Data.match(
    /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/
  );
  if (!matches) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Invalid Base64 image data format'
    );
  }
  try {
    const [, mimeType, base64Image] = matches;
    const buffer = Buffer.from(base64Image, 'base64');
    return { buffer, mimeType };
  } catch {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Failed to decode Base64 image data'
    );
  }
};

// Extract filename from URL, stripping query parameters
const extractFilenameFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;
    const lastSegment = segments[segments.length - 1];
    // Remove extension for clean filename
    const dotIndex = lastSegment.lastIndexOf('.');
    if (dotIndex > 0) {
      return lastSegment.substring(0, dotIndex);
    }
    return lastSegment;
  } catch {
    return null;
  }
};

// Generate a UUID using node:crypto. The previous Math.random() variant was
// not unpredictable; for filenames this isn't security-critical but stronger
// entropy avoids collisions under bursty uploads.
const generateUuid = (): string => randomUUID();

// Detect MIME type from buffer using magic bytes
const detectMimeFromBuffer = (buffer: Buffer): string | null => {
  if (buffer.length < 4) return null;

  // PNG: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  // GIF: 47 49 46 38
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return 'image/gif';
  }
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.length >= 12 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  // SVG: starts with < (text-based)
  if (buffer[0] === 0x3c) {
    const start = buffer.toString('utf8', 0, Math.min(256, buffer.length));
    if (start.includes('<svg') || start.includes('<?xml')) {
      return 'image/svg+xml';
    }
  }
  // ICO: 00 00 01 00
  if (
    buffer[0] === 0x00 &&
    buffer[1] === 0x00 &&
    buffer[2] === 0x01 &&
    buffer[3] === 0x00
  ) {
    return 'image/x-icon';
  }

  return null;
};

// Schemas

export const uploadImageSchema = {
  name: 'upload_image',
  description: 'Upload an image',
  inputSchema: {
    type: 'object' as const,
    properties: {
      file: {
        type: 'string',
        description: 'Image file to upload (Base64)',
      },
      purpose: {
        type: 'string',
        description: 'Image purpose',
        enum: ['image', 'profile_image', 'icon'],
      },
      ref: {
        type: 'string',
        description: 'Image reference info (optional)',
      },
    },
    required: ['file'],
  },
};

export const uploadImageFromUrlSchema = {
  name: 'upload_image_from_url',
  description:
    'Download an image from a URL and upload it to Ghost. Returns the permanent Ghost URL.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      url: {
        type: 'string',
        description: 'Source URL of the image to download',
      },
      filename: {
        type: 'string',
        description:
          'Desired filename (without extension). If omitted, derived from URL or auto-generated.',
      },
      purpose: {
        type: 'string',
        description:
          'Ghost image purpose: "image" (default) for post content, "profile_image", or "icon"',
        enum: ['image', 'profile_image', 'icon'],
      },
      ref: {
        type: 'string',
        description: 'Reference identifier for tracking',
      },
    },
    required: ['url'],
  },
};

// Param interfaces

interface UploadImageArgs {
  file: string;
  purpose?: ImagePurpose;
  ref?: string;
}

interface UploadImageFromUrlArgs {
  url: string;
  filename?: string;
  purpose?: ImagePurpose;
  ref?: string;
}

// Functions

export const uploadImage = async (args: unknown): Promise<McpToolResult | ReturnType<typeof handleGhostApiError>> => {
  if (!isImageUploadParams(args)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Invalid image upload parameters'
    );
  }

  try {
    const { file, purpose, ref } = args as UploadImageArgs;

    // Parse Base64 data to get buffer and MIME type
    let { buffer, mimeType } = parseBase64Image(file);

    // Validate image format
    validateImageFormat(buffer, mimeType, purpose);

    // SVG sanitization: strip dangerous elements and attributes
    if (mimeType === 'image/svg+xml' || isSvgContent(buffer)) {
      const sanitized = sanitizeSvg(buffer.toString('utf8'));
      buffer = Buffer.from(sanitized, 'utf8');
    }

    // Build FormData
    const formData = new FormData();
    formData.append('file', buffer, {
      filename: `image${mimeType.replace('image/', '.')}`,
      contentType: mimeType,
    });
    if (purpose) formData.append('purpose', purpose);
    if (ref) formData.append('ref', ref);

    // Send image upload request
    const response = await ghostApi().images.upload({
      file: formData,
      purpose,
      ref,
    });

    return {
      content: {
        url: response.url,
        ref: response.ref,
      },
    } as unknown as McpToolResult;
  } catch (error) {
    return handleGhostApiError(error);
  }
};

export const uploadImageFromUrl = async (
  args: unknown
): Promise<McpToolResult> => {
  if (!isImageUrlUploadParams(args)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Invalid image URL upload parameters'
    );
  }

  const { url, filename, purpose = 'image', ref } =
    args as UploadImageFromUrlArgs;

  try {
    // Manual redirect handling with per-hop SSRF revalidation. Each hop is
    // (a) DNS-resolved via resolveAndValidate (closes the rebinding hole that
    // hostname-only validation leaves open) and (b) checked against the
    // private-IP blocklist for every returned address.
    let currentUrl = url;
    let response: Response;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

    try {
      // eslint-disable-next-line no-constant-condition
      let hop = 0;
      while (true) {
        const validation = await resolveAndValidate(currentUrl);
        if (!validation.valid) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: hop === 0
                    ? `URL blocked: ${validation.reason}`
                    : `Redirect blocked: ${validation.reason}`,
                }),
              },
            ],
          };
        }

        response = await fetch(currentUrl, {
          signal: controller.signal,
          redirect: 'manual',
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: `Redirect with no Location header (${response.status})`,
                  }),
                },
              ],
            };
          }
          if (++hop > MAX_REDIRECTS) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: `Too many redirects (>${MAX_REDIRECTS})`,
                  }),
                },
              ],
            };
          }
          currentUrl = new URL(location, currentUrl).toString();
          continue;
        }

        break;
      }
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Download timeout after ${DOWNLOAD_TIMEOUT_MS / 1000}s. Consider retrying.`,
              }),
            },
          ],
        };
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Failed to download: ${response.status} ${response.statusText}`,
            }),
          },
        ],
      };
    }

    // Stream the body with a running size cap. Don't trust Content-Length —
    // a server can lie about it or omit it entirely. The previous version
    // called response.arrayBuffer() and only checked size after the whole
    // payload was buffered, which is an OOM vector.
    const reader = response.body?.getReader();
    if (!reader) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: false, error: 'Response body is empty' }),
          },
        ],
      };
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > MAX_URL_FILE_SIZE) {
          await reader.cancel();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: `File size exceeds maximum limit of ${MAX_URL_FILE_SIZE / 1024 / 1024}MB`,
                }),
              },
            ],
          };
        }
        chunks.push(value);
      }
    } finally {
      try { reader.releaseLock(); } catch { /* already released */ }
    }

    const buffer = Buffer.concat(chunks);

    // Detect MIME type from headers or magic bytes
    let mimeType: string | null =
      response.headers.get('content-type')?.split(';')[0].trim() || null;

    // Validate or detect from magic bytes
    const detectedMime = detectMimeFromBuffer(buffer);
    if (!mimeType || !MIME_TO_EXT[mimeType]) {
      mimeType = detectedMime;
    }

    if (!mimeType || !MIME_TO_EXT[mimeType]) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Invalid or unsupported image format. Detected: ${mimeType || 'unknown'}`,
            }),
          },
        ],
      };
    }

    // Validate format for purpose
    const extension = MIME_TO_EXT[mimeType];
    const allowedFormats = ALLOWED_FORMATS[purpose];
    if (!allowedFormats.includes(extension)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Image format ${extension} not allowed for purpose '${purpose}'. Allowed: ${allowedFormats.join(', ')}`,
            }),
          },
        ],
      };
    }

    // SVG sanitization: strip dangerous elements and attributes
    let sanitizedBuffer = buffer;
    if (mimeType === 'image/svg+xml' || isSvgContent(buffer)) {
      const sanitized = sanitizeSvg(buffer.toString('utf8'));
      sanitizedBuffer = Buffer.from(sanitized, 'utf8');
    }

    // Determine filename — use the redirected URL if redirects occurred so
    // the filename reflects the actual source rather than the original URL.
    const finalFilename =
      (filename || extractFilenameFromUrl(currentUrl) || generateUuid()) + extension;

    // Build FormData using form-data package (required by @tryghost/admin-api)
    const formData = new FormData();
    formData.append('file', sanitizedBuffer, {
      filename: finalFilename,
      contentType: mimeType,
    });
    formData.append('purpose', purpose);
    if (ref) formData.append('ref', ref);

    // Upload to Ghost - pass FormData directly, not wrapped in an object
    const uploadResponse = await ghostApi().images.upload(formData);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            ghost_url: uploadResponse.url,
            filename: finalFilename,
            size_bytes: buffer.length,
            mime_type: mimeType,
          }),
        },
      ],
    };
  } catch (error) {
    // Return Ghost API errors in structured format
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Ghost upload failed: ${errorMessage}`,
          }),
        },
      ],
    };
  }
};
