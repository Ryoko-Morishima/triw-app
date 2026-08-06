// src/app/playlist-relay/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Playlist Relay",
  description: "曲目リストを貼り付けて、Spotifyプレイリストへ。",
  manifest: "/playlist-relay/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/playlist-relay/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/playlist-relay/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/playlist-relay/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Playlist Relay",
    statusBarStyle: "default",
  },
};

export default function PlaylistRelayLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
