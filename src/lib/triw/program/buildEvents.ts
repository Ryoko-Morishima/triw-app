type FLike = {
  tracks?: any[];
  setlist?: any[];
  items?: any[];
};

export function buildEvents(input: any) {
  const source = Array.isArray(input)
    ? input
    : ((input ?? {}) as FLike).tracks ??
      ((input ?? {}) as FLike).setlist ??
      ((input ?? {}) as FLike).items ??
      [];

  return source.map((t: any) => ({
    type: "track",
    track: t,
  }));
}