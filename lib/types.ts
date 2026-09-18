import type { BigCategory, ChipKind } from "./constants";

export type TopicDecomposition = {
  topicText: string;
  bigCategory?: BigCategory;
  purposeId?: string;
  lensKey?: string;
  providerTag?: string;
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
) => {
  const parts = [text.trim()];
  if (cat) parts.push(`cat:${cat}`);
  if (purposeId) parts.push(`p:${purposeId}`);
  if (lensKey && lensKey !== "none") parts.push(`l:${lensKey}`);
  if (providerTag) parts.push(`v:${providerTag}`);
  return parts.join("||");
};

export const chipKey = (kind: ChipKind, text: string) =>
  `${kind}|${text.trim()}`;
