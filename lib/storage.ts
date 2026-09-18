import type { TopicDecomposition, ChipDecomposition } from "./types";
import { topicKey, chipKey } from "./types";
import type { BigCategory, ChipKind } from "./constants";

const TOPIC_KEY = "topic_decompositions_v1";
const CHIP_KEY = "chip_decompositions_v1";

function readMap<T>(storageKey: string): Record<string, T> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, T>;
  } catch {
    return {};
  }
}

function writeMap<T>(storageKey: string, map: Record<string, T>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(map));
}

export function loadTopicDecomposition(
  text: string,
  cat?: BigCategory,
  purposeId?: string,
  lensKey?: string,
  providerTag?: string,
): TopicDecomposition | null {
  const map = readMap<TopicDecomposition>(TOPIC_KEY);
  return (
    map[topicKey(text, cat, purposeId, lensKey, providerTag)] ?? null
  );
}

export function saveTopicDecomposition(td: TopicDecomposition) {
  const map = readMap<TopicDecomposition>(TOPIC_KEY);
  map[
    topicKey(
      td.topicText,
      td.bigCategory,
      td.purposeId,
      td.lensKey,
      td.providerTag,
    )
  ] = td;
  writeMap(TOPIC_KEY, map);
}

export function loadChipDecomposition(
  kind: ChipKind,
  text: string,
): ChipDecomposition | null {
  const map = readMap<ChipDecomposition>(CHIP_KEY);
  return map[chipKey(kind, text)] ?? null;
}

export function saveChipDecomposition(cd: ChipDecomposition) {
  const map = readMap<ChipDecomposition>(CHIP_KEY);
  map[chipKey(cd.kind, cd.chipText)] = cd;
  writeMap(CHIP_KEY, map);
}
