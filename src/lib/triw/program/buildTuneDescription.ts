import { getKeywordLabels } from "@/lib/triw/input/cards/keywordCards";
import {
  sliderControls,
  type SliderId,
  getSliderText,
} from "@/lib/triw/input/sliders/sliderControls";

export function buildDescription(input: any) {
  const labels = getKeywordLabels(input.keywords ?? []).join("、");

  const sliderLines = sliderControls.map((control) => {
    const value = Number(input[control.id as SliderId] ?? control.defaultValue);

    return `${control.label}: ${value} / ${getSliderText(
      control.id,
      value
    )}`;
  });

  return [
    `キーワード: ${labels || "なし"}`,
    ...sliderLines,
    `トーク: ${input.talkEnabled ? "あり" : "なし"}`,
  ].join("\n");
}
