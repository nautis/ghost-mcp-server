export {
  getPostsSchema,
  getPostSchema,
  createPostSchema,
  updatePostSchema,
  deletePostSchema,
  getPostBySlugSchema,
  searchPostsSchema,
  getPosts,
  getPost,
  searchPosts,
  createPost,
  updatePost,
  deletePost,
  getPostBySlug,
} from './posts.js';

export {
  getPagesSchema,
  getPageSchema,
  createPageSchema,
  updatePageSchema,
  deletePageSchema,
  getPageBySlugSchema,
  searchPagesSchema,
  getPages,
  getPage,
  createPage,
  updatePage,
  deletePage,
  getPageBySlug,
  searchPages,
} from './pages.js';

export {
  getMembersSchema,
  getMemberSchema,
  createMemberSchema,
  updateMemberSchema,
  deleteMemberSchema,
  searchMembersSchema,
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
  searchMembers,
} from './members.js';

export { getTagsSchema, getTags } from './tags.js';

export { getAuthorsSchema, getAuthors } from './authors.js';

export {
  uploadImageSchema,
  uploadImageFromUrlSchema,
  uploadImage,
  uploadImageFromUrl,
} from './images.js';

import { getPostsSchema } from './posts.js';
import { getPostSchema } from './posts.js';
import { createPostSchema } from './posts.js';
import { updatePostSchema } from './posts.js';
import { deletePostSchema } from './posts.js';
import { getPostBySlugSchema } from './posts.js';
import { searchPostsSchema } from './posts.js';
import { getPagesSchema } from './pages.js';
import { getPageSchema } from './pages.js';
import { createPageSchema } from './pages.js';
import { updatePageSchema } from './pages.js';
import { deletePageSchema } from './pages.js';
import { getPageBySlugSchema } from './pages.js';
import { searchPagesSchema } from './pages.js';
import { getMembersSchema } from './members.js';
import { getMemberSchema } from './members.js';
import { createMemberSchema } from './members.js';
import { updateMemberSchema } from './members.js';
import { deleteMemberSchema } from './members.js';
import { searchMembersSchema } from './members.js';
import { getTagsSchema } from './tags.js';
import { getAuthorsSchema } from './authors.js';
import { uploadImageSchema } from './images.js';
import { uploadImageFromUrlSchema } from './images.js';

export const toolSchemas = [
  // Posts
  getPostsSchema,
  getPostSchema,
  searchPostsSchema,
  createPostSchema,
  updatePostSchema,
  deletePostSchema,
  getPostBySlugSchema,
  // Tags
  getTagsSchema,
  // Authors
  getAuthorsSchema,
  // Pages
  getPagesSchema,
  getPageSchema,
  createPageSchema,
  updatePageSchema,
  deletePageSchema,
  getPageBySlugSchema,
  searchPagesSchema,
  // Members
  getMembersSchema,
  getMemberSchema,
  searchMembersSchema,
  createMemberSchema,
  updateMemberSchema,
  deleteMemberSchema,
  // Images
  uploadImageSchema,
  uploadImageFromUrlSchema,
];
