// ABOUTME: Handles image uploads to Ghost CMS via the Admin API.
// ABOUTME: Supports both base64 uploads and direct URL-to-Ghost transfers.
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import FormData from 'form-data';
import { createGhostApi } from '../config/config.js';
import { handleGhostApiError } from '../utils/error.js';
import { isImageUploadParams, isImageUrlUploadParams } from '../types/index.js';
import imageSize from 'image-size';
// Allowed image formats
const ALLOWED_FORMATS = {
    image: ['.webp', '.jpg', '.jpeg', '.gif', '.png', '.svg'],
    profile_image: ['.webp', '.jpg', '.jpeg', '.gif', '.png', '.svg'],
    icon: ['.webp', '.jpg', '.jpeg', '.gif', '.png', '.svg', '.ico']
};
// Maximum file size for base64 uploads (2MB)
const MAX_FILE_SIZE = 2 * 1024 * 1024;
// Maximum file size for URL uploads (128MB)
const MAX_URL_FILE_SIZE = 128 * 1024 * 1024;
// Download timeout (30 seconds)
const DOWNLOAD_TIMEOUT_MS = 30000;
// MIME type to extension mapping
const MIME_TO_EXT = {
    'image/webp': '.webp',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/gif': '.gif',
    'image/png': '.png',
    'image/svg+xml': '.svg',
    'image/x-icon': '.ico',
    'image/vnd.microsoft.icon': '.ico'
};
// Image format validation
const validateImageFormat = (buffer, mimeType, purpose = 'image') => {
    // Check file size
    if (buffer.length > MAX_FILE_SIZE) {
        throw new McpError(ErrorCode.InvalidParams, `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    // Get extension from MIME type
    const extension = `.${mimeType.split('/')[1]}`.toLowerCase();
    const allowedFormats = ALLOWED_FORMATS[purpose];
    if (!allowedFormats.includes(extension)) {
        throw new McpError(ErrorCode.InvalidParams, `Invalid image format for ${purpose}. Allowed formats: ${allowedFormats.join(', ')}`);
    }
    // Add square dimension check for profile_image and icon
    if (purpose === 'profile_image' || purpose === 'icon') {
        try {
            const dimensions = imageSize.imageSize(buffer);
            if (!dimensions || dimensions.width !== dimensions.height) {
                throw new McpError(ErrorCode.InvalidParams, dimensions ?
                    `${purpose} must be square (current dimensions: ${dimensions.width}x${dimensions.height})` :
                    `Failed to determine image dimensions`);
            }
        }
        catch (error) {
            if (error instanceof McpError)
                throw error;
            throw new McpError(ErrorCode.InvalidParams, 'Failed to read image dimensions');
        }
    }
};
// Convert Base64 to Buffer and extract MIME type
const parseBase64Image = (base64Data) => {
    const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches) {
        throw new McpError(ErrorCode.InvalidParams, 'Invalid Base64 image data format');
    }
    try {
        const [, mimeType, base64Image] = matches;
        const buffer = Buffer.from(base64Image, 'base64');
        return { buffer, mimeType };
    }
    catch (error) {
        throw new McpError(ErrorCode.InvalidParams, 'Failed to decode Base64 image data');
    }
};
// Image upload function
export const uploadImage = async (args) => {
    if (!isImageUploadParams(args)) {
        throw new McpError(ErrorCode.InvalidParams, 'Invalid image upload parameters');
    }
    try {
        const { file, purpose, ref } = args;
        // Parse Base64 data to get buffer and MIME type
        const { buffer, mimeType } = parseBase64Image(file);
        // Validate image format
        validateImageFormat(buffer, mimeType, purpose);
        // Build FormData
        const formData = new FormData();
        formData.append('file', buffer, {
            filename: `image${mimeType.replace('image/', '.')}`,
            contentType: mimeType
        });
        if (purpose)
            formData.append('purpose', purpose);
        if (ref)
            formData.append('ref', ref);
        // Create Ghost Admin API client
        const api = createGhostApi();
        // Send image upload request
        const response = await api.images.upload({
            file: formData,
            purpose,
            ref
        });
        return {
            content: {
                url: response.url,
                ref: response.ref
            }
        };
    }
    catch (error) {
        return handleGhostApiError(error);
    }
};
// Extract filename from URL, stripping query parameters
const extractFilenameFromUrl = (url) => {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length === 0)
            return null;
        const lastSegment = segments[segments.length - 1];
        // Remove extension for clean filename
        const dotIndex = lastSegment.lastIndexOf('.');
        if (dotIndex > 0) {
            return lastSegment.substring(0, dotIndex);
        }
        return lastSegment;
    }
    catch {
        return null;
    }
};
// Generate a simple UUID-like string
const generateUuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
// Detect MIME type from buffer using magic bytes
const detectMimeFromBuffer = (buffer) => {
    if (buffer.length < 4)
        return null;
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        return 'image/png';
    }
    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return 'image/jpeg';
    }
    // GIF: 47 49 46 38
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
        return 'image/gif';
    }
    // WebP: 52 49 46 46 ... 57 45 42 50
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        return 'image/webp';
    }
    // SVG: starts with < (text-based)
    if (buffer[0] === 0x3C) {
        const start = buffer.toString('utf8', 0, Math.min(256, buffer.length));
        if (start.includes('<svg') || start.includes('<?xml')) {
            return 'image/svg+xml';
        }
    }
    // ICO: 00 00 01 00
    if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00) {
        return 'image/x-icon';
    }
    return null;
};
// Upload image from URL
export const uploadImageFromUrl = async (args) => {
    if (!isImageUrlUploadParams(args)) {
        throw new McpError(ErrorCode.InvalidParams, 'Invalid image URL upload parameters');
    }
    const { url, filename, purpose = 'image', ref } = args;
    try {
        // Download image with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
        let response;
        try {
            response = await fetch(url, {
                signal: controller.signal,
                redirect: 'follow'
            });
        }
        catch (error) {
            if (error.name === 'AbortError') {
                return {
                    content: [{
                            type: 'text',
                            text: JSON.stringify({
                                success: false,
                                error: `Download timeout after ${DOWNLOAD_TIMEOUT_MS / 1000}s. Consider retrying.`
                            })
                        }]
                };
            }
            throw error;
        }
        finally {
            clearTimeout(timeoutId);
        }
        if (!response.ok) {
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: `Failed to download: ${response.status} ${response.statusText}`
                        })
                    }]
            };
        }
        // Get buffer from response
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Check file size
        if (buffer.length > MAX_URL_FILE_SIZE) {
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: `File size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of ${MAX_URL_FILE_SIZE / 1024 / 1024}MB`
                        })
                    }]
            };
        }
        // Detect MIME type from headers or magic bytes
        let mimeType = response.headers.get('content-type')?.split(';')[0].trim() || null;
        // Validate or detect from magic bytes
        const detectedMime = detectMimeFromBuffer(buffer);
        if (!mimeType || !MIME_TO_EXT[mimeType]) {
            mimeType = detectedMime;
        }
        if (!mimeType || !MIME_TO_EXT[mimeType]) {
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: `Invalid or unsupported image format. Detected: ${mimeType || 'unknown'}`
                        })
                    }]
            };
        }
        // Validate format for purpose
        const extension = MIME_TO_EXT[mimeType];
        const allowedFormats = ALLOWED_FORMATS[purpose];
        if (!allowedFormats.includes(extension)) {
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: `Image format ${extension} not allowed for purpose '${purpose}'. Allowed: ${allowedFormats.join(', ')}`
                        })
                    }]
            };
        }
        // Determine filename
        const finalFilename = (filename || extractFilenameFromUrl(url) || generateUuid()) + extension;
        // Build FormData using form-data package (required by @tryghost/admin-api)
        const formData = new FormData();
        formData.append('file', buffer, {
            filename: finalFilename,
            contentType: mimeType
        });
        formData.append('purpose', purpose);
        if (ref)
            formData.append('ref', ref);
        // Create Ghost Admin API client
        const api = createGhostApi();
        // Upload to Ghost - pass FormData directly, not wrapped in an object
        const uploadResponse = await api.images.upload(formData);
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        ghost_url: uploadResponse.url,
                        filename: finalFilename,
                        size_bytes: buffer.length,
                        mime_type: mimeType
                    })
                }]
        };
    }
    catch (error) {
        // Return Ghost API errors in structured format
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: `Ghost upload failed: ${errorMessage}`
                    })
                }]
        };
    }
};
// Tool schema definition
export const uploadImageSchema = {
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
};
export const uploadImageFromUrlSchema = {
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
};
