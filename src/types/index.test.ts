import { describe, it, expect } from 'vitest';
import {
  isPostStatus,
  isPostVisibility,
  isPaginationParams,
  isSearchParams,
  isImageUploadParams,
  isImageUrlUploadParams,
  isCreateMemberParams,
  isUpdateMemberParams,
} from './index.js';

describe('isPostStatus', () => {
  it('accepts published', () => expect(isPostStatus('published')).toBe(true));
  it('accepts draft', () => expect(isPostStatus('draft')).toBe(true));
  it('accepts scheduled', () => expect(isPostStatus('scheduled')).toBe(true));
  it('rejects invalid value', () => expect(isPostStatus('archived')).toBe(false));
  it('rejects non-string', () => expect(isPostStatus(42)).toBe(false));
});

describe('isPostVisibility', () => {
  it('accepts public', () => expect(isPostVisibility('public')).toBe(true));
  it('accepts members', () => expect(isPostVisibility('members')).toBe(true));
  it('accepts paid', () => expect(isPostVisibility('paid')).toBe(true));
  it('accepts tiers', () => expect(isPostVisibility('tiers')).toBe(true));
  it('rejects invalid value', () => expect(isPostVisibility('private')).toBe(false));
  it('rejects non-string', () => expect(isPostVisibility(null)).toBe(false));
});

describe('isPaginationParams', () => {
  it('accepts empty object', () => expect(isPaginationParams({})).toBe(true));
  it('accepts valid params', () => expect(isPaginationParams({ limit: 10, page: 1, order: 'created_at asc' })).toBe(true));
  it('rejects null', () => expect(isPaginationParams(null)).toBe(false));
  it('rejects non-object', () => expect(isPaginationParams('string')).toBe(false));
  it('rejects wrong types', () => expect(isPaginationParams({ limit: 'ten' })).toBe(false));
});

describe('isSearchParams', () => {
  it('accepts with query', () => expect(isSearchParams({ query: 'test' })).toBe(true));
  it('rejects without query', () => expect(isSearchParams({ limit: 10 })).toBe(false));
  it('rejects non-object', () => expect(isSearchParams(null)).toBe(false));
});

describe('isImageUploadParams', () => {
  it('accepts with file', () => expect(isImageUploadParams({ file: '/path/to/image.png' })).toBe(true));
  it('rejects without file', () => expect(isImageUploadParams({ purpose: 'image' })).toBe(false));
  it('rejects invalid purpose', () => expect(isImageUploadParams({ file: '/path.png', purpose: 'banner' })).toBe(false));
});

describe('isImageUrlUploadParams', () => {
  it('accepts with url', () => expect(isImageUrlUploadParams({ url: 'https://example.com/img.png' })).toBe(true));
  it('rejects without url', () => expect(isImageUrlUploadParams({ filename: 'test.png' })).toBe(false));
  it('rejects non-object', () => expect(isImageUrlUploadParams(null)).toBe(false));
});

describe('isCreateMemberParams', () => {
  it('accepts with email', () => expect(isCreateMemberParams({ email: 'test@example.com' })).toBe(true));
  it('rejects without email', () => expect(isCreateMemberParams({ name: 'Test' })).toBe(false));
  it('rejects non-object', () => expect(isCreateMemberParams(null)).toBe(false));
});

describe('isUpdateMemberParams', () => {
  it('accepts with id', () => expect(isUpdateMemberParams({ id: 'abc123' })).toBe(true));
  it('rejects without id', () => expect(isUpdateMemberParams({ email: 'test@example.com' })).toBe(false));
  it('rejects non-object', () => expect(isUpdateMemberParams(null)).toBe(false));
});
