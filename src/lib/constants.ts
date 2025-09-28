// src/lib/constants.ts
export const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
export const SPOTIFY_REDIRECT_URI =
  process.env.SPOTIFY_REDIRECT_URI || `${SITE_URL}/api/spotify/callback`;
