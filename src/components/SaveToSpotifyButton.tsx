"use client";
import { useState } from "react";

export function SaveToSpotifyButton(
  { uris, name, description }:
  { uris: string[]; name: string; description?: string }
) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    try {
      setLoading(true); setError(null); setUrl(null);
      const res = await fetch("/api/playlist/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, uris }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "failed");
      setUrl(json.playlistUrl || null);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={loading || uris.length === 0}
        className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save to Spotify"}
      </button>
      {url && <a className="underline" href={url} target="_blank" rel="noreferrer">Open playlist</a>}
      {error && <span className="text-red-600 text-sm">{error}</span>}
    </div>
  );
}
