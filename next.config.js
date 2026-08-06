/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        // Playlist Relay used to live at /dark-playlist; keep old links working.
        source: "/dark-playlist",
        destination: "/playlist-relay",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
