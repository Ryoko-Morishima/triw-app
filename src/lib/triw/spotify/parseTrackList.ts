// Parses free-form, pasted track lists into structured lines.
// Shared by the client page (immediate parsing) and the resolve API route.

export type ParsedLine =
  | { type: "uri"; uri: string; raw: string }
  | { type: "query"; artist: string; title: string; raw: string }
  | { type: "invalid"; raw: string };

const SPOTIFY_TRACK_URL_RE = /open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([a-zA-Z0-9]+)/i;
const SPOTIFY_URI_RE = /^spotify:track:([a-zA-Z0-9]+)$/i;

function stripListMarkers(line: string): string {
  return line
    .replace(/^\s*[-*•‣▪]\s+/, "")
    .replace(/^\s*\d+[.)、]\s*/, "")
    .trim();
}

export function parseLine(raw: string): ParsedLine {
  const cleaned = stripListMarkers(raw);
  if (!cleaned) return { type: "invalid", raw };

  const urlMatch = cleaned.match(SPOTIFY_TRACK_URL_RE);
  if (urlMatch) return { type: "uri", uri: `spotify:track:${urlMatch[1]}`, raw };

  const uriMatch = cleaned.match(SPOTIFY_URI_RE);
  if (uriMatch) return { type: "uri", uri: cleaned, raw };

  if (cleaned.includes("\t")) {
    const [artist, ...rest] = cleaned.split("\t");
    const title = rest.join("\t").trim();
    if (artist.trim() && title) return { type: "query", artist: artist.trim(), title, raw };
  }

  for (const sep of [" – ", " — ", " - "]) {
    const idx = cleaned.indexOf(sep);
    if (idx > 0) {
      const artist = cleaned.slice(0, idx).trim();
      const title = cleaned.slice(idx + sep.length).trim();
      if (artist && title) return { type: "query", artist, title, raw };
    }
  }

  return { type: "invalid", raw };
}

export function parseTrackList(text: string): ParsedLine[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map(parseLine);
}
