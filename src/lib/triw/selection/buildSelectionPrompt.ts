// src/lib/triw/selection/buildSelectionPrompt.ts

export function buildSelectionPrompt(params: {
  interpretation: any;
  outCount: number;
}): { system: string; user: string } {
  const { interpretation, outCount } = params;

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

# 入力傾向

${softPreferencesText}

# 選曲方針

${selectionRules}

# 固定ルール

- 候補は実在する曲名とアーティスト名で出す
- Spotifyで検索しやすい正式な曲名とアーティスト名を使う
- アーティスト名や曲名に引用符（"）を含む候補は避ける
- 同じ曲を重複して出さない
- 同一アーティストに偏らない
- 架空の曲名や曖昧な曲名は避ける
- どれか1つの条件だけで全体を支配しない
- 条件が衝突する場合は、典型曲だけに逃げず、自然に両立する候補を探す
- 各候補には、なぜキーワードの組み合わせに合うのかを短く書く
- 人気傾向が低い場合は、代表曲・最大ヒット曲・超定番曲に偏らない
- cultureカテゴリは単なる雰囲気ではなく、選曲対象や文化圏、シーンの範囲に強く影響させる。
- cultureカテゴリが選ばれている場合、そのcultureの解釈に合うアーティスト、地域シーン、言語圏、音楽文化を優先する。
- cultureカテゴリが選ばれている場合、他の条件に合っていても、そのcultureの解釈から外れる候補ばかりにしない。
- 複数キーワードのうち、texture は音像として必ず反映する。
- tasteカテゴリは、ジャンルではなく空気の方向を決める重要条件として扱う。
- tasteカテゴリは、選曲全体の雰囲気に明確に影響させる。
- textureとtasteが同時に選ばれている場合、textureの音像を満たしたうえで、tasteの空気がはっきり感じられる曲を優先する。
- whyKeywordFit では、曲名一致だけでなく、音像・テンポ・歌詞・演奏・録音質感・空気感のどれがキーワード解釈につながるかを短く説明する

# 出力

ちょうど ${outCount} 件出してください。

JSONのみ：

{
  "candidates": [
    {
      "title": "曲名",
      "artist": "アーティスト名",
      "whyKeywordFit": "複数のキーワード解釈にどう合っているかを短く説明",
      "whyNotTooObvious": "深掘り指定の場合、代表曲すぎない理由を短く説明"
    }
  ]
}
`.trim();

  return { system, user };
}