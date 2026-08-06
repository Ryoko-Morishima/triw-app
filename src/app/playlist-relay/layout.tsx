// src/app/playlist-relay/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Playlist Relay",
  description: "曲目リストを貼り付けて、Spotifyプレイリストへ。",
};

export default function PlaylistRelayLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
