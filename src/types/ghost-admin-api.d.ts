declare module '@tryghost/admin-api' {
  interface GhostAdminAPIOptions {
    url: string;
    key: string;
    version: string;
  }

  class GhostAdminAPI {
    constructor(options: GhostAdminAPIOptions);
    posts: any;
    pages: any;
    tags: any;
    authors: any;
    members: any;
    images: any;
    site: any;
    themes: any;
    users: any;
    newsletters: any;
  }

  export default GhostAdminAPI;
}
