// src/lib/triw/selection/buildSelectionPrompt.ts

export function buildSelectionPrompt(params: {
  interpretation: any;
  outCount: number;
}): { system: string; user: string } {
  const { interpretation, outCount } = params;

  // --- interpretation整理（ここが今後の拡張ポイント）
  const rationale = interpretation?.rationale ?? "";
  const softPreferencesText = interpretation?.soft_preferences_text ?? "";
  const selectionRules = interpretation?.selection_rules ?? "";

  const system = [
    "あなたはTRIWの軽量な一次選曲エンジンです。",
    "入力条件に合う実在曲の候補を出してください。",
    "Spotifyで検索しやすい正式な曲名とアーティスト名を使ってください。",
    "説明文は書かず、JSONのみを返してください。",
  ].join("\n");

  const user = `
# 解釈メモ

${rationale}

# 条件の扱い方

- スライダーは選曲傾向として扱う
- 極端な値のスライダーほど強めに反映する
- ニュートラルに近いスライダーは弱く扱う
- キーワードは雰囲気・意味の方向性として扱う
- どれか1つの条件だけで全体を支配しない
- 条件が衝突する場合は、典型曲だけに逃げず、自然に両立する候補を探す

# スライダー条件

${softPreferencesText}

# 選曲ルール

${selectionRules}

# 追加ルール

- 人気傾向が低い場合は、曲単位で現在よく聴かれている代表曲・大ヒット曲を避ける
- 人気傾向が低い場合でも、アーティストが有名かどうかだけでは除外しない
- 年代指定がある場合は、できるだけその時代感に合う曲を選ぶ
- 温度指定がある場合は、できるだけその温度感に合う曲を選ぶ
- 同一アーティストに偏らない
- 架空の曲名や曖昧な曲名は避ける

# 出力

ちょうど ${outCount} 件出してください。

JSONのみ：

{
  "candidates": [
    { "title": "曲名", "artist": "アーティスト名" }
  ]
}
`.trim();

  return { system, user };
}