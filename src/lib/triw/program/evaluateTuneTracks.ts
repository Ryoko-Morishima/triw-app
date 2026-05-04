type Era = { start: number; end: number };

type Input = {
  popularity?: number; // 0-100
  decade?: string; // "1990s"
};

type Evaluated = {
  title: string;
  artist: string;
  uri?: string;
  accepted: boolean;
  reason: string;
  debug: {
    popularity: number | null;
    year: number | null;
    uri: string | null;
  };
};

function decadeToEra(decade?: string): Era | null {
  if (!decade) return null;

  const start = Number(String(decade).replace("s", ""));
  if (!Number.isFinite(start)) return null;

  return { start, end: start + 9 };
}

function getTrackObject(item: any) {
  return item?.track ?? item?.spotify ?? item;
}

function getTitle(item: any, track: any) {
  return item?.title ?? track?.name ?? track?.title ?? "タイトル不明";
}

function getArtist(item: any, track: any) {
  return (
    item?.artist ??
    track?.artists?.[0]?.name ??
    track?.artist ??
    "アーティスト不明"
  );
}

function getUri(track: any) {
  return track?.uri ?? null;
}

function getPopularity(item: any, track: any) {
  return track?.popularity ?? item?.popularity ?? null;
}

function getYear(item: any, track: any) {
  const releaseDate =
    track?.album?.release_date ??
    item?.release_date ??
    item?.release_year ??
    null;

  if (typeof releaseDate === "number") return releaseDate;

  if (typeof releaseDate === "string" && releaseDate.length >= 4) {
    const year = Number(releaseDate.slice(0, 4));
    return Number.isFinite(year) ? year : null;
  }

  return null;
}

export function evaluateTuneTracks(
  tracks: any[],
  input: Input
): { picked: Evaluated[]; rejected: Evaluated[] } {
  const picked: Evaluated[] = [];
  const rejected: Evaluated[] = [];

  const era = decadeToEra(input.decade);
  const inputPop = input.popularity ?? 50;

  for (const item of tracks ?? []) {
    const track = getTrackObject(item);

    const title = getTitle(item, track);
    const artist = getArtist(item, track);
    const uri = getUri(track);
    const pop = getPopularity(item, track);
    const year = getYear(item, track);

    let accepted = true;
    const reasons: string[] = [];

    if (!uri) {
      accepted = false;
      reasons.push("Spotify未解決");
    } else {
      reasons.push("Spotify解決済み");
    }

    if (accepted && era && year != null) {
      if (year < era.start || year > era.end) {
        accepted = false;
        reasons.push(`年代外（${era.start}-${era.end}）`);
      } else {
        reasons.push("年代一致");
      }
    }

if (accepted && pop != null) {
  if (inputPop < 30 && pop > 80) {
    accepted = false;
    reasons.push(`人気傾向が高すぎ（${pop}）`);
  } else if (inputPop > 70 && pop < 35) {
    accepted = false;
    reasons.push(`人気傾向が低すぎ（${pop}）`);
  } else {
    reasons.push(`人気傾向OK（${pop}）`);
  }
} else if (accepted) {
  reasons.push("人気傾向不明");
}

    const evaluated: Evaluated = {
      title,
      artist,
      uri: uri ?? undefined,
      accepted,
      reason: reasons.join(" / "),
      debug: {
        popularity: pop,
        year,
        uri,
      },
    };

    if (accepted) {
      picked.push(evaluated);
    } else {
      rejected.push(evaluated);
    }
  }

  return { picked, rejected };
}