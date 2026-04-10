// Type aliases
export type PostStatus = 'published' | 'draft' | 'scheduled';
export type PostVisibility = 'public' | 'members' | 'paid' | 'tiers';
export type ContentFormat = 'html' | 'mobiledoc' | 'lexical';
export type PostInclude = 'authors' | 'tags';
export type MemberInclude = 'labels' | 'newsletters';
export type ImagePurpose = 'image' | 'profile_image' | 'icon';

export type PostSortField = 'created_at' | 'updated_at' | 'published_at' | 'title';
export type MemberSortField = 'created_at' | 'name' | 'email';
export type TagSortField = 'created_at' | 'updated_at' | 'name' | 'slug';
export type AuthorSortField = 'created_at' | 'updated_at' | 'name' | 'slug';
export type SortDirection = 'asc' | 'desc';
export type PostSortOrder = `${PostSortField} ${SortDirection}`;
export type MemberSortOrder = `${MemberSortField} ${SortDirection}`;
export type TagSortOrder = `${TagSortField} ${SortDirection}`;
export type AuthorSortOrder = `${AuthorSortField} ${SortDirection}`;

// Interfaces
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
const VALID_POST_STATUSES: readonly string[] = ['published', 'draft', 'scheduled'];
const VALID_POST_VISIBILITIES: readonly string[] = ['public', 'members', 'paid', 'tiers'];
const VALID_IMAGE_PURPOSES: readonly string[] = ['image', 'profile_image', 'icon'];

export const isPostStatus = (value: unknown): value is PostStatus => {
  return typeof value === 'string' && VALID_POST_STATUSES.includes(value);
};

export const isPostVisibility = (value: unknown): value is PostVisibility => {
  return typeof value === 'string' && VALID_POST_VISIBILITIES.includes(value);
};

export const isImageUploadParams = (args: unknown): args is ImageUploadParams => {
  if (typeof args !== 'object' || args === null) return false;
  const obj = args as Record<string, unknown>;
  return (
    typeof obj.file === 'string' &&
    (obj.purpose === undefined || VALID_IMAGE_PURPOSES.includes(obj.purpose as string)) &&
    (obj.ref === undefined || typeof obj.ref === 'string')
  );
};

export const isImageUrlUploadParams = (args: unknown): args is ImageUrlUploadParams => {
  if (typeof args !== 'object' || args === null) return false;
  const obj = args as Record<string, unknown>;
  return (
    typeof obj.url === 'string' &&
    (obj.filename === undefined || typeof obj.filename === 'string') &&
    (obj.purpose === undefined || VALID_IMAGE_PURPOSES.includes(obj.purpose as string)) &&
    (obj.ref === undefined || typeof obj.ref === 'string')
  );
};

export const isSearchParams = (args: unknown): args is SearchParams => {
  if (typeof args !== 'object' || args === null) return false;
  const obj = args as Record<string, unknown>;
  return (
    typeof obj.query === 'string' &&
    (obj.limit === undefined || typeof obj.limit === 'number') &&
    (obj.page === undefined || typeof obj.page === 'number') &&
    (obj.order === undefined || typeof obj.order === 'string') &&
    (obj.formats === undefined ||
      (Array.isArray(obj.formats) && obj.formats.every((f: unknown) => typeof f === 'string'))) &&
    (obj.include === undefined ||
      (Array.isArray(obj.include) && obj.include.every((i: unknown) => typeof i === 'string')))
  );
};

export const isPaginationParams = (args: unknown): args is PaginationParams => {
  if (typeof args !== 'object' || args === null) return false;
  const obj = args as Record<string, unknown>;
  return (
    (obj.limit === undefined || typeof obj.limit === 'number') &&
    (obj.page === undefined || typeof obj.page === 'number') &&
    (obj.order === undefined || typeof obj.order === 'string')
  );
};

export const isMemberPaginationParams = (args: unknown): args is MemberPaginationParams => {
  if (!isPaginationParams(args)) return false;
  const obj = args as Record<string, unknown>;
  return (
    (obj.include === undefined ||
      (Array.isArray(obj.include) && obj.include.every((i: unknown) => typeof i === 'string'))) &&
    (obj.filter === undefined || typeof obj.filter === 'string')
  );
};

export const isMemberSearchParams = (args: unknown): args is MemberSearchParams => {
  if (!isMemberPaginationParams(args)) return false;
  const obj = args as Record<string, unknown>;
  return typeof obj.query === 'string';
};

export const isCreateMemberParams = (args: unknown): args is CreateMemberParams => {
  if (typeof args !== 'object' || args === null) return false;
  const obj = args as Record<string, unknown>;
  return (
    typeof obj.email === 'string' &&
    (obj.name === undefined || typeof obj.name === 'string') &&
    (obj.note === undefined || typeof obj.note === 'string') &&
    (obj.labels === undefined ||
      (Array.isArray(obj.labels) && obj.labels.every((l: unknown) => typeof l === 'string'))) &&
    (obj.newsletters === undefined ||
      (Array.isArray(obj.newsletters) &&
        obj.newsletters.every((n: unknown) => typeof n === 'string'))) &&
    (obj.subscribed === undefined || typeof obj.subscribed === 'boolean')
  );
};

export const isUpdateMemberParams = (args: unknown): args is UpdateMemberParams => {
  if (typeof args !== 'object' || args === null) return false;
  const obj = args as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    (obj.email === undefined || typeof obj.email === 'string') &&
    (obj.name === undefined || typeof obj.name === 'string') &&
    (obj.note === undefined || typeof obj.note === 'string') &&
    (obj.labels === undefined ||
      (Array.isArray(obj.labels) && obj.labels.every((l: unknown) => typeof l === 'string'))) &&
    (obj.newsletters === undefined ||
      (Array.isArray(obj.newsletters) &&
        obj.newsletters.every((n: unknown) => typeof n === 'string'))) &&
    (obj.subscribed === undefined || typeof obj.subscribed === 'boolean')
  );
};
