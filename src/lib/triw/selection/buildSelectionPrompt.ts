// src/lib/triw/selection/buildSelectionPrompt.ts

export function buildSelectionPrompt(params: {
  interpretation: any;
  promptPlan?: any;
  outCount: number;
}): { system: string; user: string } {
  const { interpretation, promptPlan, outCount } = params;

  const rationale = interpretation?.rationale ?? "";
  const softPreferencesText = interpretation?.soft_preferences_text ?? "";
  const selectionRules = interpretation?.selection_rules ?? "";

  const emotionalDirection = promptPlan?.emotionalDirection ?? "";
  const movement = promptPlan?.movement ?? "";

  const textureHints = Array.isArray(promptPlan?.texture)
    ? promptPlan.texture.join(", ")
    : "";

  const culturalHints = Array.isArray(promptPlan?.culturalHints)
    ? promptPlan.culturalHints.join(", ")
    : "";

  const searchHints = Array.isArray(promptPlan?.searchHints)
    ? promptPlan.searchHints.join(", ")
    : "";

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

# 選曲補助ヒント

感情方向:
${emotionalDirection}

動き:
${movement}

音像:
${textureHints}

文化ヒント:
${culturalHints}

検索ヒント:
${searchHints}

# 固定ルール

- 候補は実在する曲名とアーティスト名で出す
- Spotifyで検索しやすい正式表記を使う
- 架空の曲名や曖昧な候補は出さない
- 同じ曲を重複して出さない
- 同一アーティストへの極端な偏りを避ける
- 条件が複数ある場合は、できるだけ自然に両立する候補を探す
- 各候補には選定理由を短く付ける
- whyKeywordFitでは音像・テンポ・歌詞・演奏・録音質感・空気感などを簡潔に説明する

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