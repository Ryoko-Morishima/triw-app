export type SliderId = "era" | "temperature" | "popularity";

export type SliderLevel = 1 | 2 | 3 | 4 | 5;

export type SliderLevelDefinition = {
  level: SliderLevel;
  min: number;
  max: number;
  label: string;
  description: string;
};

export type SliderControlDefinition = {
  id: SliderId;
  label: string;
  leftLabel: string;
  centerLabel: string;
  rightLabel: string;
  defaultValue: number;
  levels: SliderLevelDefinition[];
};

export function getSliderLevel(value: number): SliderLevel {
  if (value < 20) return 1;
  if (value < 40) return 2;
  if (value < 60) return 3;
  if (value < 80) return 4;
  return 5;
}

export const sliderControls: SliderControlDefinition[] = [
  {
    id: "era",
    label: "年代",
    leftLabel: "古い",
    centerLabel: "指定なし",
    rightLabel: "新しい",
    defaultValue: 50,
    levels: [
      {
        level: 1,
        min: 0,
        max: 19,
        label: "古い曲",
        description: "かなり古めの時代感を優先する",
      },
      {
        level: 2,
        min: 20,
        max: 39,
        label: "やや古い曲",
        description: "少し懐かしさのある曲を優先する",
      },
      {
        level: 3,
        min: 40,
        max: 59,
        label: "年代指定なし",
        description: "年代は特に指定しない",
      },
      {
        level: 4,
        min: 60,
        max: 79,
        label: "やや新しい曲",
        description: "比較的新しい時代感を優先する",
      },
      {
        level: 5,
        min: 80,
        max: 100,
        label: "新しい曲",
        description: "現在に近い新しめの曲を優先する",
      },
    ],
  },
  {
    id: "temperature",
    label: "温度",
    leftLabel: "クール",
    centerLabel: "指定なし",
    rightLabel: "ホット",
    defaultValue: 50,
    levels: [
      {
        level: 1,
        min: 0,
        max: 19,
        label: "クール",
        description:
          "無機的でクール、感情が抑制され、都会的で距離感のあるサウンド",
      },
      {
        level: 2,
        min: 20,
        max: 39,
        label: "ややクール",
        description:
          "ややクール寄りで、落ち着きと洗練を感じるサウンド",
      },
      {
        level: 3,
        min: 40,
        max: 59,
        label: "温度指定なし",
        description: "温度感については特に指定しない",
      },
      {
        level: 4,
        min: 60,
        max: 79,
        label: "ややホット",
        description:
          "やや感情があり、生命感や身体性を感じるサウンド",
      },
      {
        level: 5,
        min: 80,
        max: 100,
        label: "ホット",
        description:
          "感情にあふれ、生命感と身体性が強く、人間的で野性的なエネルギーを感じる曲",
      },
    ],
  },
  {
    id: "popularity",
    label: "人気傾向",
    leftLabel: "深掘り",
    centerLabel: "指定なし",
    rightLabel: "いま人気",
    defaultValue: 50,
    levels: [
      {
        level: 1,
        min: 0,
        max: 19,
        label: "深掘り",
        description:
          "Spotify上で現在よく聴かれている大ヒット曲・超定番曲・代表曲を避け、テーマに合うが少し意外性のある曲、同ジャンル内の二番手・三番手の曲、アルバム曲寄りの曲を優先する",
      },
      {
        level: 2,
        min: 20,
        max: 39,
        label: "やや深掘り",
        description:
          "現在よく聴かれている大定番曲を少し避け、少し掘った曲を優先する",
      },
      {
        level: 3,
        min: 40,
        max: 59,
        label: "有名度指定なし",
        description: "人気傾向は特に指定しない",
      },
      {
        level: 4,
        min: 60,
        max: 79,
        label: "やや人気",
        description:
          "Spotify上で比較的よく聴かれている曲を優先する",
      },
      {
        level: 5,
        min: 80,
        max: 100,
        label: "いま人気",
        description:
          "Spotify上で現在よく聴かれている曲を優先する",
      },
    ],
  },
];

export function getSliderControl(id: SliderId) {
  return sliderControls.find((control) => control.id === id);
}

export function getSliderLevelDefinition(
  control: SliderControlDefinition,
  value: number
) {
  const level = getSliderLevel(value);
  return control.levels.find((item) => item.level === level) ?? control.levels[2];
}

export function getSliderText(id: SliderId, value: number): string {
  const control = getSliderControl(id);
  if (!control) return "";

  const level = getSliderLevelDefinition(control, value);
  return `${level.label}：${level.description}`;
}

export function getEraText(value: number): string {
  return getSliderText("era", value);
}

export function getTemperatureText(value: number): string {
  return getSliderText("temperature", value);
}

export function getPopularityText(value: number): string {
  return getSliderText("popularity", value);
}