export type MusicAffectRule = {
  tempo?: string;
  harmony?: string;
  energy?: string;
  texture?: string[];
};

export const musicAffectMap: Record<string, MusicAffectRule> = {
  loneliness: {
    tempo: "slower",
    harmony: "minor",
    energy: "lower",
  },

  bittersweet: {
    tempo: "medium",
    harmony: "minor-major mix",
    energy: "medium",
  },

  happiness: {
    tempo: "faster",
    harmony: "major",
    energy: "higher",
  },

  riot: {
    tempo: "fast",
    energy: "high",
    texture: ["distortion"],
  },

  "late-night": {
    tempo: "slower",
    energy: "lower",
    texture: ["space", "quiet"],
  },

  festival: {
    tempo: "faster",
    energy: "higher",
  },
};