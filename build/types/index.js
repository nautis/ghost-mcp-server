export const isImageUploadParams = (args) => {
    if (typeof args !== 'object' || args === null)
        return false;
    const obj = args;
    return typeof obj.file === 'string' &&
        (obj.purpose === undefined || ['image', 'profile_image', 'icon'].includes(obj.purpose)) &&
        (obj.ref === undefined || typeof obj.ref === 'string');
};
export const isImageUrlUploadParams = (args) => {
    if (typeof args !== 'object' || args === null)
        return false;
    const obj = args;
    return typeof obj.url === 'string' &&
        (obj.filename === undefined || typeof obj.filename === 'string') &&
        (obj.purpose === undefined || ['image', 'profile_image', 'icon'].includes(obj.purpose)) &&
        (obj.ref === undefined || typeof obj.ref === 'string');
};
export const isSearchParams = (args) => {
    if (typeof args !== 'object' || args === null)
        return false;
    const obj = args;
    return typeof obj.query === 'string' &&
        (obj.limit === undefined || typeof obj.limit === 'number') &&
        (obj.page === undefined || typeof obj.page === 'number') &&
        (obj.order === undefined || typeof obj.order === 'string') &&
        (obj.formats === undefined || (Array.isArray(obj.formats) && obj.formats.every(f => typeof f === 'string'))) &&
        (obj.include === undefined || (Array.isArray(obj.include) && obj.include.every(i => typeof i === 'string')));
};
export const isPaginationParams = (args) => {
    if (typeof args !== 'object' || args === null)
        return false;
    const obj = args;
    return (obj.limit === undefined || typeof obj.limit === 'number') &&
        (obj.page === undefined || typeof obj.page === 'number') &&
        (obj.order === undefined || typeof obj.order === 'string');
};
export const isMemberPaginationParams = (args) => {
    if (!isPaginationParams(args))
        return false;
    const obj = args;
    return (obj.include === undefined || (Array.isArray(obj.include) && obj.include.every(i => typeof i === 'string'))) &&
        (obj.filter === undefined || typeof obj.filter === 'string');
};
export const isMemberSearchParams = (args) => {
    if (!isMemberPaginationParams(args))
        return false;
    const obj = args;
    return typeof obj.query === 'string';
};
export const isCreateMemberParams = (args) => {
    if (typeof args !== 'object' || args === null)
        return false;
    const obj = args;
    return typeof obj.email === 'string' &&
        (obj.name === undefined || typeof obj.name === 'string') &&
        (obj.note === undefined || typeof obj.note === 'string') &&
        (obj.labels === undefined || (Array.isArray(obj.labels) && obj.labels.every(l => typeof l === 'string'))) &&
        (obj.newsletters === undefined || (Array.isArray(obj.newsletters) && obj.newsletters.every(n => typeof n === 'string'))) &&
        (obj.subscribed === undefined || typeof obj.subscribed === 'boolean');
};
export const isUpdateMemberParams = (args) => {
    if (typeof args !== 'object' || args === null)
        return false;
    const obj = args;
    return typeof obj.id === 'string' &&
        (obj.email === undefined || typeof obj.email === 'string') &&
        (obj.name === undefined || typeof obj.name === 'string') &&
        (obj.note === undefined || typeof obj.note === 'string') &&
        (obj.labels === undefined || (Array.isArray(obj.labels) && obj.labels.every(l => typeof l === 'string'))) &&
        (obj.newsletters === undefined || (Array.isArray(obj.newsletters) && obj.newsletters.every(n => typeof n === 'string'))) &&
        (obj.subscribed === undefined || typeof obj.subscribed === 'boolean');
};
