export function buildEvents(tracks: any[]) {
  return tracks.map((t) => ({
    type: "track",
    track: t,
  }));
}