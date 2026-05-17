import type {
  ProgramEvaluatedTrack,
  ProgramVisibleTrack,
} from "@/lib/triw/program/types";

type BuildVisibleQueueOptions = {
  maxTracks: number;
};

export function buildVisibleQueue(
  reservePool: ProgramEvaluatedTrack[],
  options: BuildVisibleQueueOptions
): ProgramVisibleTrack[] {
  const maxTracks = Math.max(1, options.maxTracks || 5);

  const sorted = [...reservePool].sort((a, b) => b.score - a.score);

  return sorted.slice(0, maxTracks).map((track, index) => ({
    title: track.title,
    artist: track.artist,
    uri: track.uri,
    index: index + 1,
    reason: track.reason,
    score: track.score,
    debug: track.debug,
  }));
}