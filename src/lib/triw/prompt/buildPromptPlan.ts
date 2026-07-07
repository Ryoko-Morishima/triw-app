// src/lib/triw/prompt/buildPromptPlan.ts

import { getKeywordCard } from "@/lib/triw/input/cards/keywordCards";
import { musicAffectMap } from "./musicAffectMap";

export type PromptPlan = {
  emotionalDirection: string;
  movement: string;
  texture: string[];
  culturalHints: string[];
  searchHints: string[];
};

function formatCard(card: any): string {
  return `「${card.label}」: ${card.promptText}`;
}

export function buildPromptPlan(params: {
  programInput: any;
  interpretation: any;
}): PromptPlan {
  const { programInput, interpretation } = params;

  const keywordIds = Array.isArray(programInput?.keywords)
    ? programInput.keywords.map((k: any) => String(k).trim()).filter(Boolean)
    : [];

  const cards = keywordIds
    .map((id: string) => getKeywordCard(id))
    .filter(Boolean);

  const emotionCards = cards.filter((card: any) => card.category === "emotion");

  const textureCards = cards.filter((card: any) => card.category === "texture");

  const cultureCards = cards.filter((card: any) => card.category === "culture");

  const sceneCards = cards.filter((card: any) => card.category === "scene");

  const tasteCards = cards.filter((card: any) => card.category === "taste");

  const affectRules = keywordIds
    .map((id: string) => musicAffectMap[id])
    .filter(Boolean);

  const affectSummary =
    affectRules.length === 0
      ? ""
      : Array.from(
          new Set(
            affectRules.flatMap((rule: any) => [
              rule.tempo ? `tempo:${rule.tempo}` : "",

              rule.harmony ? `harmony:${rule.harmony}` : "",

              rule.energy ? `energy:${rule.energy}` : "",

              ...(rule.texture ?? []).map((v: string) => `texture:${v}`),
            ]),
          ),
        )
          .filter(Boolean)
          .join("\n");

  const softPreferencesText = interpretation?.soft_preferences_text ?? "";

  return {
    emotionalDirection: [
      "感情・場面・ムードに関わる入力を、候補曲全体の空気として反映する。",
      ...emotionCards.map(formatCard),
      ...sceneCards.map(formatCard),
      ...tasteCards.map(formatCard),
    ]
      .filter(Boolean)
      .join("\n"),

    movement: [
      "テンポやエネルギーは固定値ではなく、入力された温度・年代・人気傾向に合わせて自然に調整する。",
      softPreferencesText,
    ]
      .filter(Boolean)
      .join("\n"),

    texture: textureCards.map(formatCard),

    culturalHints: cultureCards.map(formatCard),

    searchHints: [
      ...sceneCards.map(formatCard),

      ...cultureCards.map(formatCard),

      ...emotionCards.map(formatCard),

      ...tasteCards.map(formatCard),

      affectSummary,
    ].filter(Boolean),
  };
}
