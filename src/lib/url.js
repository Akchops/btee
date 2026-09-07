/** Prefix an app path with the deploy base, so the same build works at the site
 *  root or under a project subpath. */
export const u = (p = '/') => (import.meta.env.BASE_URL + String(p).replace(/^\//, '')).replace(/([^:])\/{2,}/g, '$1/');
