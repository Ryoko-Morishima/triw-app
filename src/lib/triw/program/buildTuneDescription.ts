export const keywordLabels: Record<string, string> = {
  rain: "雨",
  summer: "夏",
  night: "夜",
  party: "パーティ",
  drive: "ドライブ",
  alt: "オルタナ",
  world: "ワールド",
  tea: "お茶会",
  happy: "ハッピー",
  gothic: "ゴシック",
  pops: "ポップス",
};

export function getSliderLevel(value: number) {
  if (value < 20) return 1;
  if (value < 40) return 2;
  if (value < 60) return 3;
  if (value < 80) return 4;
  return 5;
}

export function getEraText(value: number) {
  const level = getSliderLevel(value);

  if (level === 1) {
    return "古い曲：かなり古めの時代感を優先する";
  }
  if (level === 2) {
    return "やや古い曲：少し懐かしさのある曲を優先する";
  }
  if (level === 3) {
    return "ニュートラル：年代は特に指定しない";
  }
  if (level === 4) {
    return "やや新しい曲：比較的新しい時代感を優先する";
  }

  return "新しい曲：現在に近い新しめの曲を優先する";
}

export function getTemperatureText(value: number) {
  const level = getSliderLevel(value);

  if (level === 1) {
    return "クール：無機的でクール、感情が抑制され、都会的で距離感のあるサウンド";
  }
  if (level === 2) {
    return "ややクール：ややクール寄りで、落ち着きと洗練を感じるサウンド";
  }
  if (level === 3) {
    return "ニュートラル：温度感については特に指定しない";
  }
  if (level === 4) {
    return "ややホット：やや感情があり、生命感や身体性を感じるサウンド";
  }

  return "ホット：感情にあふれ、生命感と身体性が強く、人間的で野性的なエネルギーを感じる曲";
}

export function getPopularityText(value: number) {
  const level = getSliderLevel(value);

  if (level === 1) {
    return "深掘り:Spotify上で現在よく聴かれている大ヒット曲・超定番曲・代表曲を避け、テーマに合うが少し意外性のある曲、同ジャンル内の二番手・三番手の曲、アルバム曲寄りの曲を優先する";
  }
  if (level === 2) {
    return "やや深掘り：現在よく聴かれている大定番曲を少し避け、少し掘った曲を優先する";
  }
  if (level === 3) {
    return "ニュートラル：人気傾向は特に指定しない";
  }
  if (level === 4) {
    return "やや人気：Spotify上で比較的よく聴かれている曲を優先する";
  }

  return "いま人気：Spotify上で現在よく聴かれている曲を優先する";
}

export function buildDescription(input: any) {
  const labels = (input.keywords ?? [])
    .map((id: string) => keywordLabels[id] ?? id)
    .join("、");

  return [
    `キーワード: ${labels || "なし"}`,
    `年代: ${input.era ?? 50} / ${getEraText(Number(input.era ?? 50))}`,
    `温度: ${input.temperature ?? 50} / ${getTemperatureText(Number(input.temperature ?? 50))}`,
    `人気傾向: ${input.popularity ?? 50} / ${getPopularityText(Number(input.popularity ?? 50))}`,
    `トーク: ${input.talkEnabled ? "あり" : "なし"}`,
  ].join("\n");
}
