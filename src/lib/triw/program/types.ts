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

export type ProgramState = {
  runId: string;
  input: any;
  description: string;
  visibleQueue: any[];
  reservePool: ProgramEvaluatedTrack[];
  rejected: ProgramEvaluatedTrack[];
  events: any[];
};