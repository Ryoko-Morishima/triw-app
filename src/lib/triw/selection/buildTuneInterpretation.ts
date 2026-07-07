import { getKeywordPromptTexts } from "@/lib/triw/input/cards/keywordCards";
import {
  sliderControls,
  type SliderId,
  getSliderText,
} from "@/lib/triw/input/sliders/sliderControls";

type BuildTuneInterpretationParams = {
  keywords: string[];
  description: string;
} & Record<SliderId, number>;

export function buildTuneInterpretation({
  keywords,
  description,
  ...sliderValues
}: BuildTuneInterpretationParams) {
  const keywordPromptText = getKeywordPromptTexts(keywords).join("\n");

  const sliderPreferenceText = sliderControls
    .map((control) => {
      const value = Number(
        sliderValues[control.id as SliderId] ?? control.defaultValue
      );

      return `${control.label}: ${getSliderText(control.id, value)}`;
    })
    .join("\n");

  return {
    direction_note:
      "カードとスライダー入力をもとに、番組の空気・場面・質感に合う曲を選ぶ。",

    rationale: [description, keywordPromptText].filter(Boolean).join("\n\n"),

    keyword_prompt_text: keywordPromptText,

    flow_style_paragraph:
      "カードとスライダー入力に合う曲を、Spotifyで検索しやすい正式な曲名とアーティスト名で選ぶ。",

    hard_constraints_text:
      "候補は実在する曲名とアーティスト名で出す。架空の曲や曖昧な曲名は避ける。",

    soft_preferences_text: sliderPreferenceText,

    selection_rules: [
      keywordPromptText
        ? `選択されたキーワードの解釈:\n${keywordPromptText}`
        : "",

      "候補は実在する曲名とアーティスト名で出す。",
      "Spotifyで検索しやすい正式な曲名とアーティスト名を使う。",

      "季節・場面・時間帯系などのキーワードに対して、単語そのものが曲名に入っている必要はない。曲名一致だけを理由に選ばず、カードごとの解釈文に基づいて、雰囲気・場面・季節感・身体感覚・音像とのつながりを重視する。歌詞やテーマ、曲調などを考慮して選曲する。",

      "複数のキーワードがある場合は、それぞれを独立に満たすのではなく、複数条件が同時に成立している曲を優先する。",

      "スライダーがニュートラルの場合、その軸は強い選曲条件にしない。",
      "スライダーが左右に寄っている場合は、その軸の意味文に従って選曲の傾向へ反映する。",
      "複数条件がある場合は、キーワードを土台にし、スライダーは空気の傾きとして反映する。",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}