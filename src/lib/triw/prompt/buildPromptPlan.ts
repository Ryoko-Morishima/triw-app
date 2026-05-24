// src/lib/triw/prompt/buildPromptPlan.ts

export type PromptPlan = {
  emotionalDirection: string;
  movement: string;
  texture: string[];
  culturalHints: string[];
  searchHints: string[];
};

export function buildPromptPlan(params: {
  programInput: any;
  interpretation: any;
}): PromptPlan {
  const { programInput, interpretation } = params;

  const keywords = Array.isArray(programInput?.keywords)
    ? programInput.keywords
        .map((k: any) => {
          if (typeof k === "string") return k;
          return k?.label || k?.id || "";
        })
        .filter(Boolean)
    : [];

  const rationale = interpretation?.rationale ?? "";
  const softPreferencesText = interpretation?.soft_preferences_text ?? "";

  return {
    emotionalDirection: [
      "入力全体から感じられる感情の方向を、候補曲の雰囲気に反映する。",
      rationale,
    ]
      .filter(Boolean)
      .join("\n"),

    movement: [
      "テンポやエネルギーは固定値ではなく、入力された温度・年代・人気傾向に合わせて自然に調整する。",
      softPreferencesText,
    ]
      .filter(Boolean)
      .join("\n"),

    texture: keywords,

    culturalHints: keywords,

    searchHints: [...keywords, interpretation?.direction_note ?? ""].filter(
      Boolean,
    ),
  };
}
