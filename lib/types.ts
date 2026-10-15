import type { BigCategory, ChipKind } from "./constants";

export type TopicDecomposition = {
  topicText: string;
  bigCategory?: BigCategory;
  purposeId?: string;
  lensKey?: string;
  providerTag?: string;
  // The direction / resultType the user picked on the pending-topic card
  // before pressing 분해 시작. Persisted so cache lookups don't return a
  // stale default-direction decomposition for the same topic, and so
  // history replay reproduces the same customization.
  directionId?: string;
  resultType?: BigCategory | null;
  axisToPrinciple: Record<string, string>;
};

export type ChipDecomposition = {
  chipText: string;
  kind: ChipKind;
  axisToPrinciple: Record<string, string>;
};

export type FacetDecomposition = {
  parentAxis: string;
  subFacets: Record<string, string>;
};

export const topicKey = (
  text: string,
  cat?: BigCategory,
  purposeId?: string,
  lensKey?: string,
  providerTag?: string,
  directionId?: string,
  resultType?: BigCategory | null,
) => {
  const parts = [text.trim()];
  if (cat) parts.push(`cat:${cat}`);
  if (purposeId) parts.push(`p:${purposeId}`);
  if (lensKey && lensKey !== "none") parts.push(`l:${lensKey}`);
  if (providerTag) parts.push(`v:${providerTag}`);
  if (directionId) parts.push(`d:${directionId}`);
  if (resultType) parts.push(`r:${resultType}`);
  return parts.join("||");
};

export const chipKey = (kind: ChipKind, text: string) =>
  `${kind}|${text.trim()}`;
