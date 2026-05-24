import type {
  ProgramEvent,
  ProgramVisibleTrack,
} from "@/lib/triw/program/types";

export function buildEvents(
  visibleQueue: ProgramVisibleTrack[]
): ProgramEvent[] {
  return visibleQueue.map((track) => ({
    type: "track",
    track,
  }));
}