export type TrackPoolState = "visible" | "reserve" | "rejected";

export type ProgramTrackDebug = {
  popularity: number | null;
  year: number | null;
  uri: string | null;
  role?: "anchor" | "deep" | "wildcard" | "unknown";
};

export type ProgramEvaluatedTrack = {
  title: string;
  artist: string;
  uri?: string;

  score: number;
  state: TrackPoolState;
  reasons: string[];
  reason: string;

  // 既存 finalize.ts 互換用。あとで消してよい。
  accepted: boolean;
  confidence: number;

  debug: ProgramTrackDebug;
};

export type ProgramVisibleTrack = {
  title: string;
  artist: string;
  uri?: string;
  index: number;
  reason: string;
  score: number;
  debug: ProgramTrackDebug;
};

export type ProgramEvent = {
  type: "track";
  track: ProgramVisibleTrack;
};

export type ProgramInput = {
  title?: string;
  description?: string;
  keywords: string[];
  era: number;
  temperature: number;
  popularity: number;
  talkEnabled: boolean;
  mode: "count" | "duration";
  count?: number;
  duration?: number;
};

export type ProgramState = {
  runId: string;
  input: ProgramInput;
  description: string;
  visibleQueue: ProgramVisibleTrack[];
  reservePool: ProgramEvaluatedTrack[];
  rejected: ProgramEvaluatedTrack[];
  events: ProgramEvent[];
};

