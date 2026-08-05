// Generic track-list resolver: takes already-parsed lines (query or direct
// Spotify URI) and returns Spotify search candidates for each, plus a
// best-effort pick. No track list is hardcoded here — callers supply it.
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  requireSpotifyToken,
  searchTrackBestEffort,
  searchTrackCandidates,
  getTrackAsCandidate,
  type SearchCandidate,
} from "@/lib/spotify";
import type { ParsedLine } from "@/lib/triw/spotify/parseTrackList";

type ResolvedItem = {
  raw: string;
  type: ParsedLine["type"];
  query?: { artist: string; title: string };
  uri?: string;
  candidates: SearchCandidate[];
  best: SearchCandidate | null;
  error?: string;
};

function extractTrackId(uri: string): string {
  return uri.replace(/^spotify:track:/, "");
}

export async function POST(req: NextRequest) {
  try {
    const token = await requireSpotifyToken();
    const body = await req.json();
    const items: ParsedLine[] = Array.isArray(body?.items) ? body.items : [];

    const results: ResolvedItem[] = await Promise.all(
      items.map(async (item): Promise<ResolvedItem> => {
        if (item.type === "invalid") {
          return { raw: item.raw, type: "invalid", candidates: [], best: null, error: "解析できませんでした" };
        }

        if (item.type === "uri") {
          try {
            const cand = await getTrackAsCandidate(token, extractTrackId(item.uri));
            return { raw: item.raw, type: "uri", uri: item.uri, candidates: [cand], best: cand };
          } catch (e: any) {
            return { raw: item.raw, type: "uri", uri: item.uri, candidates: [], best: null, error: String(e?.message || e) };
          }
        }

        // type === "query"
        try {
          const [best, candidates] = await Promise.all([
            searchTrackBestEffort(token, item.title, item.artist),
            searchTrackCandidates(token, item.title, item.artist),
          ]);
          const bestCandidate: SearchCandidate | null = best
            ? candidates.find((c) => c.id === best.id) ?? {
                id: best.id,
                uri: best.uri,
                name: best.name,
                artists: best.artists,
                album: null,
                release_date: null,
                popularity: null,
                external_url: null,
              }
            : null;
          return {
            raw: item.raw,
            type: "query",
            query: { artist: item.artist, title: item.title },
            candidates,
            best: bestCandidate,
          };
        } catch (e: any) {
          return {
            raw: item.raw,
            type: "query",
            query: { artist: item.artist, title: item.title },
            candidates: [],
            best: null,
            error: String(e?.message || e),
          };
        }
      })
    );

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
