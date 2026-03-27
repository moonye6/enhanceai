// Auth module - placeholder for future implementation
// next-auth removed for Cloudflare Pages edge compatibility
// TODO: Implement edge-compatible auth (e.g., Auth.js v5 or Cloudflare Access)

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string;
}

export interface AuthSession {
  user: AuthUser | null;
  expires: string;
}

// Empty session for now - auth disabled
export const getEmptySession = (): AuthSession => ({
  user: null,
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
});
