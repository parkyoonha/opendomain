"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PROMPT_VERSION, type BigCategory, type ChipKind } from "@/lib/constants";
import type { TopicDecomposition } from "@/lib/types";
import type { ChipRecommendations, CombinedIdea } from "@/lib/llm";
import {
  loadTopicDecomposition,
  saveTopicDecomposition,
} from "@/lib/storage";
import { lensKey, type SelectedLens } from "@/lib/lenses";
import { apiPath } from "@/lib/apiPath";
import type { ChipSearchMode } from "@/lib/prompts";
import {
  DEFAULT_PURPOSE_ID,
  kBuiltinPurposes,
  type ThinkingPurpose,
} from "@/lib/purposes";
import {
  DEFAULT_DIRECTION_ID,
  kBuiltinDirections,
  type ThinkingDirection,
} from "@/lib/directions";

type Status = "idle" | "loading" | "error";

export type SelectedPrinciple = { axis: string; name: string; text: string };
export type SelectedChip = { kind: ChipKind; text: string };

export type CombineInput = {
  chipKind?: ChipKind | null;
  chipCategory?: string | null;
  chipText: string;
  chipReason?: string | null;
  chipFacet?: { axis: string; principle: string } | null;
  topicFacet?: { axis: string; principle: string } | null;
};

export type CombinedIdeaRecord = CombinedIdea & {
  id: string;
  createdAt: number;
  chipText: string;
  chipLabel: string;
  topicAxis: string | null;
  topicName: string | null;
};

export type InputMode = "topic" | "memo";

export type ChipSearchHistoryItem = {
  id: string;
  query: string;
  mode: ChipSearchMode;
  at: number;
  count: number;
};

export type DecompositionHistoryItem = {
  id: string;
  chipKind: ChipKind;
  chipText: string;
  directionId: string;
  lens: SelectedLens | null;
  resultType: BigCategory | null;
  axisToPrinciple: Record<string, string>;
  at: number;
};

export type Memo = {
  id: string;
  text: string;
  createdAt: number;
};

export type Page = {
  id: string;
  type: "topic" | "memo";
  title: string;
  createdAt: number;
  topicSnapshot?: TopicDecomposition;
  memoIds?: string[]; // memos belonging to this memo folder page
};

export type ActivityPayload =
  | {
      kind: "topic";
      topicText: string;
      bigCategory: BigCategory;
      purposeId: string;
    }
  | { kind: "chip"; query: string; mode: ChipSearchMode }
  | { kind: "combine"; combinedIdeaId: string }
  | { kind: "memo"; memoId: string };

export type ActivityEntry = {
  id: string;
  createdAt: number;
  kind: "topic" | "chip" | "memo" | "combine";
  title: string;
  subtitle?: string;
  payload?: ActivityPayload;
};

export type AttachedChip = {
  id: string;
  chipText: string;
  chipKind?: ChipKind;
  reason?: string;
  source: "library" | "similar" | "search";
  kindOrCategory: string;
};

export type UserChipKind = ChipKind | "memo";

export type UserChip = {
  id: string;
  name: string;
  definition: string;
  text: string; // canonical text used for combine/decompose APIs
  kind: UserChipKind;
  source: "memo";
  createdAt: number;
};

type Ctx = {
  topicText: string;
  bigCategory: BigCategory;
  setTopicText: (v: string) => void;
  setBigCategory: (v: BigCategory) => void;

  topicPurposeId: string;
  setTopicPurposeId: (id: string) => void;

  pendingTopic: string | null;
  cancelPending: () => void;
  commitPending: (purposeId: string) => Promise<void>;

  pages: Page[];
  currentPageId: string | null;
  draftType: "topic" | "memo" | null;
  startTopicDraft: () => void;
  startMemoDraft: () => void;
  goHome: () => void;
  openPage: (id: string) => void;
  deletePage: (id: string) => void;

  topicDirectionId: string;
  setTopicDirectionId: (id: string) => void;
  topicResultType: BigCategory | null;
  setTopicResultType: (rt: BigCategory | null) => void;

  decomposition: TopicDecomposition | null;
  status: Status;
  error: string | null;
  clearError: () => void;
  runDecompose: () => Promise<void>;

  selectedAxes: Set<string>;
  toggleAxis: (name: string) => void;
  clearAxes: () => void;

  facetDecompositions: Record<string, Record<string, string>>;
  facetStatus: Record<string, Status>;
  axisFacetGens: Record<
    string,
    Array<{
      key: string;
      directionId: string;
      lens: SelectedLens | null;
      resultType: BigCategory | null;
      subFacets: Record<string, string>;
    }>
  >;
  removeAxisGen: (axis: string, key: string) => void;
  runDecomposeFacet: (
    axis: string,
    directionId?: string,
    lens?: SelectedLens | null,
    resultType?: BigCategory | null,
  ) => Promise<void>;
  facetDirection: Record<string, string>;
  setFacetDirection: (axis: string, directionId: string) => void;
  facetLens: Record<string, SelectedLens | null>;
  setFacetLens: (axis: string, lens: SelectedLens | null) => void;
  facetResultType: Record<string, BigCategory | null>;
  setFacetResultType: (axis: string, resultType: BigCategory | null) => void;

  customPurposes: ThinkingPurpose[];
  addCustomPurpose: (label: string) => void;
  removeCustomPurpose: (id: string) => void;
  customDirections: ThinkingDirection[];
  addCustomDirection: (label: string) => void;
  removeCustomDirection: (id: string) => void;

  subFacetDerived: Record<
    string,
    Array<{
      key: string;
      directionId: string;
      lens: SelectedLens | null;
      resultType: BigCategory | null;
      subFacets: Record<string, string>;
    }>
  >;
  subFacetDerivedStatus: Record<string, Status>;
  runDecomposeSubFacet: (
    axis: string,
    name: string,
    text: string,
    directionId: string,
    lens: SelectedLens | null,
    resultType: BigCategory | null,
  ) => Promise<void>;
  principleDirection: Record<string, string>;
  principleLens: Record<string, SelectedLens | null>;
  principleResultType: Record<string, BigCategory | null>;
  setPrincipleDirection: (pk: string, directionId: string) => void;
  setPrincipleLens: (pk: string, lens: SelectedLens | null) => void;
  setPrincipleResultType: (pk: string, resultType: BigCategory | null) => void;

  selectedPrinciple: SelectedPrinciple | null;
  selectPrinciple: (p: SelectedPrinciple | null) => void;

  // Global set of principle keys currently expanded. Persists across
  // remounts/selection changes; only closes when the user explicitly
  // re-clicks the same card.
  expandedPrinciples: Set<string>;
  markPrincipleExpanded: (pk: string) => void;
  markPrincipleCollapsed: (pk: string) => void;

  chipRecommendations: Record<string, ChipRecommendations>;
  chipStatus: Record<string, Status>;
  runRecommendChips: (axis: string, name: string, text: string) => Promise<void>;

  selectedChip: SelectedChip | null;
  selectChip: (c: SelectedChip | null) => void;
  chipDecompositions: Record<string, Record<string, string>>;
  chipDecompStatus: Record<string, Status>;
  runDecomposeChip: (
    kind: ChipKind,
    text: string,
    directionId?: string,
    lens?: SelectedLens | null,
    resultType?: BigCategory | null,
  ) => Promise<void>;
  chipDecompDirection: Record<string, string>;
  setChipDecompDirection: (
    kind: ChipKind,
    text: string,
    directionId: string,
  ) => void;
  chipDecompLens: Record<string, SelectedLens | null>;
  setChipDecompLens: (
    kind: ChipKind,
    text: string,
    lens: SelectedLens | null,
  ) => void;
  chipDecompResultType: Record<string, BigCategory | null>;
  setChipDecompResultType: (
    kind: ChipKind,
    text: string,
    resultType: BigCategory | null,
  ) => void;

  combinedIdeas: CombinedIdeaRecord[];
  combineStatus: Status;
  runCombine: (input: CombineInput) => Promise<void>;
  clearCombined: () => void;

  inputMode: InputMode;
  setInputMode: (m: InputMode) => void;

  memos: Memo[];
  addMemo: (text: string) => void;
  removeMemo: (id: string) => void;
  reorderMemos: (fromIdx: number, toIdx: number) => void;
  memoAsTopic: (memoId: string, override?: string) => Promise<void>;
  memoAsChip: (memoId: string) => Promise<void>;

  userChips: UserChip[];
  chipifyMemo: (memoId: string, override?: string) => void;
  removeUserChip: (id: string) => void;

  chipifyPending: { memoId: string | null; text: string } | null;
  startChipify: (memoId: string, override?: string) => void;
  cancelChipify: () => void;
  saveChipify: (input: {
    kind: UserChipKind;
    name: string;
    definition: string;
  }) => void;

  splitMemoPageId: string | null;
  setSplitMemoPageId: (v: string | null) => void;
  activeSplitView: "memo" | "topic" | "chip";
  setActiveSplitView: (v: "memo" | "topic" | "chip") => void;
  centerMode: "chip" | "topic";
  setCenterMode: (v: "chip" | "topic") => void;

  memoListMode: boolean;
  showMemoList: () => void;

  multiAxisResults: Record<string, string>;
  multiAxisStatus: Status;
  multiAxisDirection: string;
  multiAxisLens: SelectedLens | null;
  multiAxisResultType: BigCategory | null;
  setMultiAxisDirection: (id: string) => void;
  setMultiAxisLens: (lens: SelectedLens | null) => void;
  setMultiAxisResultType: (rt: BigCategory | null) => void;
  runDecomposeMultiAxis: (
    directionId?: string,
    lens?: SelectedLens | null,
    resultType?: BigCategory | null,
  ) => Promise<void>;

  chipSearchQuery: string;
  setChipSearchQuery: (v: string) => void;
  chipSearchMode: ChipSearchMode;
  setChipSearchMode: (m: ChipSearchMode) => void;
  chipSearchResults: string[];
  chipSearchStatus: Status;
  runChipSearch: () => Promise<void>;
  chipSearchHistory: ChipSearchHistoryItem[];
  rerunChipSearch: (item: ChipSearchHistoryItem) => Promise<void>;
  clearChipSearchHistory: () => void;

  decompositionHistory: DecompositionHistoryItem[];
  clearDecompositionHistory: () => void;
  removeDecompositionHistoryItem: (id: string) => void;

  chipPanelOpen: boolean;
  setChipPanelOpen: (v: boolean) => void;

  activityLog: ActivityEntry[];
  openActivity: (entry: ActivityEntry) => Promise<void>;
  focusedCombinedIdeaId: string | null;
  setFocusedCombinedIdeaId: (id: string | null) => void;
  activityPanelOpen: boolean;
  setActivityPanelOpen: (v: boolean) => void;

  userGeminiKey: string | null;
  setUserGeminiKey: (v: string | null) => void;
  useUserKey: boolean;
  setUseUserKey: (v: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;

  authSession: Session | null;
  authUser: User | null;
  authReady: boolean;
  loginModalOpen: boolean;
  setLoginModalOpen: (v: boolean) => void;
  signOut: () => Promise<void>;

  attachedChips: Record<string, AttachedChip[]>;
  attachChip: (principleKey: string, chip: AttachedChip) => void;
  removeAttachedChip: (principleKey: string, chipId: string) => void;

  selectedLens: SelectedLens | null;
  setSelectedLens: (lens: SelectedLens | null) => void;
  lensHistory: SelectedLens[];
  removeLensFromHistory: (lens: SelectedLens) => void;
  customLenses: { discipline: string; scholars: string[] }[];
  addCustomLens: (discipline: string) => void;
  removeCustomLens: (discipline: string) => void;

  customResultTypes: string[];
  addCustomResultType: (label: string) => void;
  removeCustomResultType: (label: string) => void;
  addCustomScholar: (discipline: string, scholar: string) => void;
  removeCustomScholar: (discipline: string, scholar: string) => void;
};

const IdeaCtx = createContext<Ctx | null>(null);

const principleKey = (axis: string, name: string) => `${axis}::${name}`;
const chipKey = (kind: ChipKind, text: string) => `${kind}::${text}`;
const facetKey = (
  axis: string,
  directionId: string,
  lens: SelectedLens | null,
  resultType: BigCategory | null,
  providerTag: string,
) =>
  `${axis}::${directionId}::${lensKey(lens)}::${resultType ?? "*"}::${providerTag}`;
const chipDecompKey = (
  kind: ChipKind,
  text: string,
  directionId: string,
  lens: SelectedLens | null,
  resultType: BigCategory | null,
  providerTag: string,
) =>
  `${chipKey(kind, text)}::${directionId}::${lensKey(lens)}::${resultType ?? "*"}::${providerTag}`;

export function IdeaProvider({ children }: { children: ReactNode }) {
  const [topicText, setTopicText] = useState("");
  const [bigCategory, setBigCategory] = useState<BigCategory>("서비스");
  const [topicPurposeId, setTopicPurposeId] = useState<string>(DEFAULT_PURPOSE_ID);
  const [pendingTopic, setPendingTopic] = useState<string | null>(null);
  const [userChips, setUserChips] = useState<UserChip[]>([]);
  const [chipifyPending, setChipifyPending] = useState<
    { memoId: string | null; text: string } | null
  >(null);
  const [splitMemoPageId, setSplitMemoPageId] = useState<string | null>(null);
  const [activeSplitView, setActiveSplitView] = useState<
    "memo" | "topic" | "chip"
  >("topic");
  const [centerMode, setCenterMode] = useState<"chip" | "topic">("topic");
  const [memoListMode, setMemoListMode] = useState(false);
  const [multiAxisResultsByKey, setMultiAxisResultsByKey] = useState<
    Record<string, Record<string, string>>
  >({});
  const [multiAxisStatusByKey, setMultiAxisStatusByKey] = useState<
    Record<string, Status>
  >({});
  const [multiAxisDirection, setMultiAxisDirection] = useState<string>(
    DEFAULT_DIRECTION_ID,
  );
  const [multiAxisLens, setMultiAxisLensState] = useState<SelectedLens | null>(
    null,
  );
  const [multiAxisResultType, setMultiAxisResultType] =
    useState<BigCategory | null>(null);

  const showMemoList = useCallback(() => {
    setMemoListMode(true);
    setInputMode("memo");
    setCurrentPageId(null);
    setDraftType("memo");
    setPendingTopic(null);
    setDecomposition(null);
    setSplitMemoPageId(null);
  }, []);
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [draftType, setDraftType] = useState<"topic" | "memo" | null>("topic");
  const [topicDirectionId, setTopicDirectionId] = useState<string>(
    DEFAULT_DIRECTION_ID,
  );
  const [topicResultType, setTopicResultType] = useState<BigCategory | null>(
    null,
  );

  const cancelPending = useCallback(() => {
    setPendingTopic(null);
    setSplitMemoPageId(null);
  }, []);

  const goHome = useCallback(() => {
    setCurrentPageId(null);
    setDraftType(null);
    setPendingTopic(null);
    setTopicText("");
    setDecomposition(null);
    setSplitMemoPageId(null);
  }, []);

  const startTopicDraft = useCallback(() => {
    setCurrentPageId(null);
    setDraftType("topic");
    setInputMode("topic");
    setPendingTopic(null);
    setTopicText("");
    setDecomposition(null);
    setMemoListMode(false);
  }, []);

  const startMemoDraft = useCallback(() => {
    setCurrentPageId(null);
    setDraftType("memo");
    setInputMode("memo");
    setPendingTopic(null);
    setDecomposition(null);
    setMemoListMode(false);
  }, []);

  const openPage = useCallback(
    (id: string) => {
      const page = pages.find((p) => p.id === id);
      if (!page) return;
      setDraftType(null);
      setCurrentPageId(id);
      setPendingTopic(null);
      setMemoListMode(false);
      if (page.type === "topic") {
        setInputMode("topic");
        setDecomposition(page.topicSnapshot ?? null);
      } else {
        setInputMode("memo");
        setDecomposition(null);
      }
    },
    [pages],
  );

  const deletePage = useCallback(
    (id: string) => {
      setPages((prev) => prev.filter((p) => p.id !== id));
      if (currentPageId === id) {
        setCurrentPageId(null);
        setDraftType(null);
        setPendingTopic(null);
        setDecomposition(null);
      }
      if (splitMemoPageId === id) setSplitMemoPageId(null);
    },
    [currentPageId, splitMemoPageId],
  );

  const [userGeminiKey, setUserGeminiKeyState] = useState<string | null>(null);
  const [useUserKey, setUseUserKeyState] = useState<boolean>(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setAuthSession(session);
      setAuthReady(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setAuthSession(null);
  }, []);

  const authUser = authSession?.user ?? null;

  useEffect(() => {
    const key = window.localStorage.getItem("user_gemini_key");
    if (key) setUserGeminiKeyState(key);
    const useKey = window.localStorage.getItem("use_user_key");
    if (useKey !== null) setUseUserKeyState(useKey === "1");
  }, []);

  const setUserGeminiKey = useCallback((v: string | null) => {
    setUserGeminiKeyState(v);
    if (typeof window !== "undefined") {
      if (v && v.trim().length > 0) {
        window.localStorage.setItem("user_gemini_key", v.trim());
      } else {
        window.localStorage.removeItem("user_gemini_key");
      }
    }
  }, []);

  const setUseUserKey = useCallback((v: boolean) => {
    setUseUserKeyState(v);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("use_user_key", v ? "1" : "0");
    }
  }, []);

  const apiHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { "content-type": "application/json" };
    if (
      useUserKey &&
      userGeminiKey &&
      userGeminiKey.trim().length > 0
    ) {
      h["x-user-gemini-key"] = userGeminiKey.trim();
    }
    return h;
  }, [userGeminiKey, useUserKey]);

  const providerTag = useMemo(() => {
    const provider =
      useUserKey && userGeminiKey && userGeminiKey.trim().length > 0
        ? "gemini"
        : "anthropic";
    return `${PROMPT_VERSION}-${provider}`;
  }, [useUserKey, userGeminiKey]);
  const [customDirections, setCustomDirections] = useState<ThinkingDirection[]>(
    [],
  );

  const addCustomDirection = useCallback((label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setCustomDirections((prev) => {
      if (
        prev.some((d) => d.label === trimmed) ||
        kBuiltinDirections.some((d) => d.label === trimmed)
      )
        return prev;
      return [
        ...prev,
        {
          id: `dir-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          label: trimmed,
          isCustom: true,
        },
      ];
    });
  }, []);

  const removeCustomDirection = useCallback((id: string) => {
    setCustomDirections((prev) => prev.filter((d) => d.id !== id));
  }, []);
  const [decomposition, setDecomposition] = useState<TopicDecomposition | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);
  const [selectedAxes, setSelectedAxes] = useState<Set<string>>(new Set());

  const [facetDecompositionsByKey, setFacetDecompositionsByKey] = useState<
    Record<string, Record<string, string>>
  >({});
  const [axisGens, setAxisGens] = useState<
    Record<
      string,
      Array<{
        key: string;
        directionId: string;
        lens: SelectedLens | null;
        resultType: BigCategory | null;
      }>
    >
  >({});
  const appendAxisGen = useCallback(
    (
      axis: string,
      gen: {
        key: string;
        directionId: string;
        lens: SelectedLens | null;
        resultType: BigCategory | null;
      },
    ) => {
      setAxisGens((prev) => {
        const cur = prev[axis] ?? [];
        if (cur.some((g) => g.key === gen.key)) return prev;
        return { ...prev, [axis]: [...cur, gen] };
      });
    },
    [],
  );
  const removeAxisGen = useCallback((axis: string, key: string) => {
    setAxisGens((prev) => {
      const cur = prev[axis] ?? [];
      if (!cur.some((g) => g.key === key)) return prev;
      const next = cur.filter((g) => g.key !== key);
      const clone = { ...prev };
      if (next.length === 0) delete clone[axis];
      else clone[axis] = next;
      return clone;
    });
  }, []);
  const [facetStatusByKey, setFacetStatusByKey] = useState<
    Record<string, Status>
  >({});
  const [facetDirection, setFacetDirectionState] = useState<
    Record<string, string>
  >({});
  const [facetLens, setFacetLensState] = useState<
    Record<string, SelectedLens | null>
  >({});
  const [facetResultType, setFacetResultTypeState] = useState<
    Record<string, BigCategory | null>
  >({});
  const [customPurposes, setCustomPurposes] = useState<ThinkingPurpose[]>([]);

  const setFacetLens = useCallback(
    (axis: string, lens: SelectedLens | null) => {
      setFacetLensState((prev) => ({ ...prev, [axis]: lens }));
      if (lens) {
        setSelectedLensState(lens);
        setLensHistory((prev) => {
          const k = lensKey(lens);
          if (prev.some((l) => lensKey(l) === k)) return prev;
          return [...prev, lens];
        });
      }
    },
    [],
  );

  const [subFacetDerived, setSubFacetDerived] = useState<
    Record<
      string,
      Array<{
        key: string;
        directionId: string;
        lens: SelectedLens | null;
        resultType: BigCategory | null;
        subFacets: Record<string, string>;
      }>
    >
  >({});
  const [subFacetDerivedStatus, setSubFacetDerivedStatus] = useState<
    Record<string, Status>
  >({});
  const [principleDirection, setPrincipleDirectionState] = useState<
    Record<string, string>
  >({});
  const [principleLens, setPrincipleLensState] = useState<
    Record<string, SelectedLens | null>
  >({});
  const [principleResultType, setPrincipleResultTypeState] = useState<
    Record<string, BigCategory | null>
  >({});

  const setPrincipleDirection = useCallback(
    (pk: string, directionId: string) => {
      setPrincipleDirectionState((prev) => ({ ...prev, [pk]: directionId }));
    },
    [],
  );

  const setPrincipleLens = useCallback(
    (pk: string, lens: SelectedLens | null) => {
      setPrincipleLensState((prev) => ({ ...prev, [pk]: lens }));
      if (lens) {
        setSelectedLensState(lens);
        setLensHistory((prev) => {
          const k = lensKey(lens);
          if (prev.some((l) => lensKey(l) === k)) return prev;
          return [...prev, lens];
        });
      }
    },
    [],
  );

  const setMultiAxisLens = useCallback((lens: SelectedLens | null) => {
    setMultiAxisLensState(lens);
    if (lens) {
      setSelectedLensState(lens);
      setLensHistory((prev) => {
        const k = lensKey(lens);
        if (prev.some((l) => lensKey(l) === k)) return prev;
        return [...prev, lens];
      });
    }
  }, []);

  const setPrincipleResultType = useCallback(
    (pk: string, resultType: BigCategory | null) => {
      setPrincipleResultTypeState((prev) => ({ ...prev, [pk]: resultType }));
    },
    [],
  );

  const runDecomposeSubFacet = useCallback(
    async (
      axis: string,
      name: string,
      text: string,
      directionId: string,
      lens: SelectedLens | null,
      resultType: BigCategory | null,
    ) => {
      const pk = `${axis}::${name}`;
      const compound = `${pk}::${directionId}::${lensKey(lens)}::${resultType ?? "*"}::${providerTag}`;
      const existing = subFacetDerived[pk] ?? [];
      if (existing.some((d) => d.key === compound)) return;

      const directionMeta =
        kBuiltinDirections.find((d) => d.id === directionId) ??
        customDirections.find((d) => d.id === directionId);

      setSubFacetDerivedStatus((s) => ({ ...s, [compound]: "loading" }));
      try {
        const res = await fetch(apiPath("/api/decompose-facet"), {
          method: "POST",
          headers: apiHeaders(),
          body: JSON.stringify({
            parentAxis: name,
            parentPrinciple: text,
            rootTopic: decomposition?.topicText,
            bigCategory: decomposition?.bigCategory,
            directionId,
            directionLabel: directionMeta?.label,
            lens,
            resultType,
          }),
        });
        const data = (await res.json()) as {
          subFacets?: Record<string, string>;
          error?: string;
        };
        if (!res.ok || !data.subFacets) {
          throw new Error(data.error ?? `Request failed: ${res.status}`);
        }
        setSubFacetDerived((m) => ({
          ...m,
          [pk]: [
            ...(m[pk] ?? []),
            {
              key: compound,
              directionId,
              lens,
              resultType,
              subFacets: data.subFacets!,
            },
          ],
        }));
        setSubFacetDerivedStatus((s) => ({ ...s, [compound]: "idle" }));
      } catch (err) {
        setSubFacetDerivedStatus((s) => ({ ...s, [compound]: "error" }));
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [subFacetDerived, decomposition, customDirections, providerTag],
  );

  const setFacetDirection = useCallback((axis: string, directionId: string) => {
    setFacetDirectionState((prev) => ({ ...prev, [axis]: directionId }));
  }, []);

  const setFacetResultType = useCallback(
    (axis: string, resultType: BigCategory | null) => {
      setFacetResultTypeState((prev) => ({ ...prev, [axis]: resultType }));
    },
    [],
  );

  const addCustomPurpose = useCallback((label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setCustomPurposes((prev) => {
      if (
        prev.some((p) => p.label === trimmed) ||
        kBuiltinPurposes.some((p) => p.label === trimmed)
      )
        return prev;
      return [
        ...prev,
        {
          id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          label: trimmed,
          isCustom: true,
        },
      ];
    });
  }, []);

  const removeCustomPurpose = useCallback((id: string) => {
    setCustomPurposes((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const facetDecompositions = useMemo(() => {
    const flat: Record<string, Record<string, string>> = {};
    for (const [axis, directionId] of Object.entries(facetDirection)) {
      const val =
        facetDecompositionsByKey[
          facetKey(
            axis,
            directionId,
            facetLens[axis] ?? null,
            facetResultType[axis] ?? null,
            providerTag,
          )
        ];
      if (val) flat[axis] = val;
    }
    return flat;
  }, [facetDecompositionsByKey, facetDirection, facetLens, facetResultType, providerTag]);

  const facetStatus = useMemo(() => {
    const flat: Record<string, Status> = {};
    for (const [axis, directionId] of Object.entries(facetDirection)) {
      const st =
        facetStatusByKey[
          facetKey(
            axis,
            directionId,
            facetLens[axis] ?? null,
            facetResultType[axis] ?? null,
            providerTag,
          )
        ];
      if (st) flat[axis] = st;
    }
    return flat;
  }, [facetStatusByKey, facetDirection, facetLens, facetResultType, providerTag]);

  const axisFacetGens = useMemo(() => {
    const out: Record<
      string,
      Array<{
        key: string;
        directionId: string;
        lens: SelectedLens | null;
        resultType: BigCategory | null;
        subFacets: Record<string, string>;
      }>
    > = {};
    for (const [axis, gens] of Object.entries(axisGens)) {
      const list = gens
        .map((g) => {
          const subFacets = facetDecompositionsByKey[g.key];
          return subFacets ? { ...g, subFacets } : null;
        })
        .filter(
          (
            g,
          ): g is {
            key: string;
            directionId: string;
            lens: SelectedLens | null;
            resultType: BigCategory | null;
            subFacets: Record<string, string>;
          } => Boolean(g),
        );
      if (list.length > 0) out[axis] = list;
    }
    return out;
  }, [axisGens, facetDecompositionsByKey]);

  const [expandedPrinciples, setExpandedPrinciples] = useState<Set<string>>(
    new Set(),
  );
  const markPrincipleExpanded = useCallback((pk: string) => {
    setExpandedPrinciples((prev) => {
      if (prev.has(pk)) return prev;
      const next = new Set(prev);
      next.add(pk);
      return next;
    });
  }, []);
  const markPrincipleCollapsed = useCallback((pk: string) => {
    setExpandedPrinciples((prev) => {
      if (!prev.has(pk)) return prev;
      const next = new Set(prev);
      next.delete(pk);
      return next;
    });
  }, []);

  const [selectedPrinciple, setSelectedPrinciple] =
    useState<SelectedPrinciple | null>(null);

  const [chipRecommendations, setChipRecommendations] = useState<
    Record<string, ChipRecommendations>
  >({});
  const [chipStatus, setChipStatus] = useState<Record<string, Status>>({});

  const [combinedIdeas, setCombinedIdeas] = useState<CombinedIdeaRecord[]>([]);
  const [combineStatus, setCombineStatus] = useState<Status>("idle");

  const [inputMode, setInputMode] = useState<InputMode>("topic");
  const [memos, setMemos] = useState<Memo[]>([]);
  const [chipSearchQuery, setChipSearchQuery] = useState("");
  const [chipSearchMode, setChipSearchMode] = useState<ChipSearchMode>("keyword");
  const [chipSearchResults, setChipSearchResults] = useState<string[]>([]);
  const [chipSearchStatus, setChipSearchStatus] = useState<Status>("idle");
  const [chipSearchHistory, setChipSearchHistory] = useState<
    ChipSearchHistoryItem[]
  >([]);
  const [decompositionHistory, setDecompositionHistory] = useState<
    DecompositionHistoryItem[]
  >([]);
  const [chipPanelOpen, setChipPanelOpen] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [focusedCombinedIdeaId, setFocusedCombinedIdeaId] = useState<
    string | null
  >(null);
  const [activityPanelOpen, setActivityPanelOpen] = useState(false);

  const [attachedChips, setAttachedChips] = useState<
    Record<string, AttachedChip[]>
  >({});
  const [selectedLensState, setSelectedLensState] =
    useState<SelectedLens | null>(null);
  const [lensHistory, setLensHistory] = useState<SelectedLens[]>([]);
  const setSelectedLens = useCallback((lens: SelectedLens | null) => {
    setSelectedLensState(lens);
    if (lens) {
      setLensHistory((prev) => {
        const k = lensKey(lens);
        if (prev.some((l) => lensKey(l) === k)) return prev;
        return [...prev, lens];
      });
    }
  }, []);
  const selectedLens = selectedLensState;
  const removeLensFromHistory = useCallback(
    (lens: SelectedLens) => {
      const k = lensKey(lens);
      setLensHistory((prev) => prev.filter((l) => lensKey(l) !== k));
      if (selectedLensState && lensKey(selectedLensState) === k) {
        setSelectedLensState(null);
      }
    },
    [selectedLensState],
  );
  const [customResultTypes, setCustomResultTypes] = useState<string[]>([]);
  const addCustomResultType = useCallback((label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setCustomResultTypes((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed],
    );
  }, []);
  const removeCustomResultType = useCallback((label: string) => {
    setCustomResultTypes((prev) => prev.filter((x) => x !== label));
  }, []);

  const [customLenses, setCustomLenses] = useState<
    { discipline: string; scholars: string[] }[]
  >([]);

  const addCustomLens = useCallback((discipline: string) => {
    const name = discipline.trim();
    if (!name) return;
    setCustomLenses((prev) =>
      prev.some((l) => l.discipline === name)
        ? prev
        : [...prev, { discipline: name, scholars: [] }],
    );
  }, []);

  const removeCustomLens = useCallback((discipline: string) => {
    setCustomLenses((prev) => prev.filter((l) => l.discipline !== discipline));
  }, []);

  const addCustomScholar = useCallback(
    (discipline: string, scholar: string) => {
      const s = scholar.trim();
      if (!s) return;
      setCustomLenses((prev) => {
        const exists = prev.some((l) => l.discipline === discipline);
        if (!exists) {
          return [...prev, { discipline, scholars: [s] }];
        }
        return prev.map((l) =>
          l.discipline === discipline && !l.scholars.includes(s)
            ? { ...l, scholars: [...l.scholars, s] }
            : l,
        );
      });
    },
    [],
  );

  const removeCustomScholar = useCallback(
    (discipline: string, scholar: string) => {
      setCustomLenses((prev) =>
        prev.map((l) =>
          l.discipline === discipline
            ? { ...l, scholars: l.scholars.filter((x) => x !== scholar) }
            : l,
        ),
      );
    },
    [],
  );

  const pushActivity = useCallback((entry: Omit<ActivityEntry, "id" | "createdAt">) => {
    setActivityLog((prev) => [
      {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
  }, []);

  const addMemo = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setMemoListMode(false);
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const memo: Memo = { id, text: trimmed, createdAt: Date.now() };
      setMemos((prev) => [memo, ...prev]);

      // Prefer current memo page; fall back to split memo page (split-view case).
      const targetPageId =
        pages.find((p) => p.id === currentPageId && p.type === "memo")?.id ??
        pages.find((p) => p.id === splitMemoPageId && p.type === "memo")?.id ??
        null;

      if (targetPageId) {
        setPages((prev) =>
          prev.map((p) =>
            p.id === targetPageId
              ? { ...p, memoIds: [id, ...(p.memoIds ?? [])] }
              : p,
          ),
        );
      } else {
        const pageId = `page-${id}`;
        const newPage: Page = {
          id: pageId,
          type: "memo",
          title: trimmed.slice(0, 40),
          createdAt: memo.createdAt,
          memoIds: [id],
        };
        setPages((prev) => [newPage, ...prev]);
        setCurrentPageId(pageId);
        setDraftType(null);
      }

      pushActivity({
        kind: "memo",
        title: trimmed.slice(0, 40),
        payload: { kind: "memo", memoId: id },
      });
    },
    [pages, currentPageId, splitMemoPageId, pushActivity],
  );

  const removeMemo = useCallback((id: string) => {
    setMemos((prev) => prev.filter((m) => m.id !== id));
    // Remove memo id from any memo page's memoIds. If a page becomes empty, drop it.
    setPages((prev) => {
      const next = prev
        .map((p) => {
          if (p.type !== "memo") return p;
          if (!p.memoIds?.includes(id)) return p;
          const remaining = p.memoIds.filter((mid) => mid !== id);
          return { ...p, memoIds: remaining };
        })
        .filter((p) => p.type !== "memo" || (p.memoIds?.length ?? 0) > 0);
      return next;
    });
  }, []);

  const reorderMemos = useCallback(
    (fromIdx: number, toIdx: number) => {
      // Reorder memoIds within the current memo page
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== currentPageId || p.type !== "memo") return p;
          const ids = p.memoIds ?? [];
          if (
            fromIdx < 0 ||
            toIdx < 0 ||
            fromIdx >= ids.length ||
            toIdx >= ids.length ||
            fromIdx === toIdx
          )
            return p;
          const next = ids.slice();
          const [moved] = next.splice(fromIdx, 1);
          next.splice(toIdx, 0, moved);
          return { ...p, memoIds: next };
        }),
      );
    },
    [currentPageId],
  );

  const doChipSearch = useCallback(
    async (q: string, mode: ChipSearchMode) => {
      const query = q.trim();
      if (!query) return;
      setChipSearchStatus("loading");
      try {
        const res = await fetch(apiPath("/api/chip-search"), {
          method: "POST",
          headers: apiHeaders(),
          body: JSON.stringify({ query, mode }),
        });
        const data = (await res.json()) as {
          chips?: string[];
          error?: string;
        };
        if (!res.ok || !data.chips) {
          throw new Error(data.error ?? `Request failed: ${res.status}`);
        }
        setChipSearchResults(data.chips);
        setChipSearchStatus("idle");
        const modeLabel =
          mode === "attribute" ? "특성" : mode === "mechanism" ? "메커니즘" : "키워드";
        pushActivity({
          kind: "chip",
          title: query,
          subtitle: `${modeLabel} · ${data.chips.length}개`,
          payload: { kind: "chip", query, mode },
        });
        setChipSearchHistory((prev) => {
          const next = [
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              query,
              mode,
              at: Date.now(),
              count: data.chips!.length,
            },
            ...prev.filter((h) => !(h.query === query && h.mode === mode)),
          ];
          return next.slice(0, 20);
        });
      } catch (err) {
        setChipSearchStatus("error");
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [pushActivity],
  );

  const runChipSearch = useCallback(
    () => doChipSearch(chipSearchQuery, chipSearchMode),
    [doChipSearch, chipSearchQuery, chipSearchMode],
  );

  const rerunChipSearch = useCallback(
    async (item: ChipSearchHistoryItem) => {
      setChipSearchQuery(item.query);
      setChipSearchMode(item.mode);
      await doChipSearch(item.query, item.mode);
    },
    [doChipSearch],
  );

  const clearChipSearchHistory = useCallback(
    () => setChipSearchHistory([]),
    [],
  );

  const clearDecompositionHistory = useCallback(
    () => setDecompositionHistory([]),
    [],
  );
  const removeDecompositionHistoryItem = useCallback((id: string) => {
    setDecompositionHistory((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const attachChip = useCallback((pk: string, chip: AttachedChip) => {
    setAttachedChips((prev) => {
      const cur = prev[pk] ?? [];
      if (cur.some((c) => c.chipText === chip.chipText)) return prev;
      return { ...prev, [pk]: [...cur, chip] };
    });
  }, []);

  const removeAttachedChip = useCallback((pk: string, chipId: string) => {
    setAttachedChips((prev) => {
      const cur = prev[pk] ?? [];
      const next = cur.filter((c) => c.id !== chipId);
      if (next.length === cur.length) return prev;
      return { ...prev, [pk]: next };
    });
  }, []);

  const [selectedChip, setSelectedChip] = useState<SelectedChip | null>(null);
  const [chipDecompositionsByKey, setChipDecompositionsByKey] = useState<
    Record<string, Record<string, string>>
  >({});
  const [chipDecompStatusByKey, setChipDecompStatusByKey] = useState<
    Record<string, Status>
  >({});
  const [chipDecompDirection, setChipDecompDirectionState] = useState<
    Record<string, string>
  >({});
  const [chipDecompLens, setChipDecompLensState] = useState<
    Record<string, SelectedLens | null>
  >({});
  const [chipDecompResultType, setChipDecompResultTypeState] = useState<
    Record<string, BigCategory | null>
  >({});

  const setChipDecompDirection = useCallback(
    (kind: ChipKind, text: string, directionId: string) => {
      const k = chipKey(kind, text);
      setChipDecompDirectionState((prev) => ({ ...prev, [k]: directionId }));
    },
    [],
  );

  const setChipDecompLens = useCallback(
    (kind: ChipKind, text: string, lens: SelectedLens | null) => {
      const k = chipKey(kind, text);
      setChipDecompLensState((prev) => ({ ...prev, [k]: lens }));
    },
    [],
  );

  const setChipDecompResultType = useCallback(
    (kind: ChipKind, text: string, resultType: BigCategory | null) => {
      const k = chipKey(kind, text);
      setChipDecompResultTypeState((prev) => ({ ...prev, [k]: resultType }));
    },
    [],
  );

  const chipDecompositions = useMemo(() => {
    const flat: Record<string, Record<string, string>> = {};
    for (const [chipK, directionId] of Object.entries(chipDecompDirection)) {
      const lens = chipDecompLens[chipK] ?? null;
      const resultType = chipDecompResultType[chipK] ?? null;
      const compound = `${chipK}::${directionId}::${lensKey(lens)}::${resultType ?? "*"}::${providerTag}`;
      const val = chipDecompositionsByKey[compound];
      if (val) flat[chipK] = val;
    }
    return flat;
  }, [chipDecompositionsByKey, chipDecompDirection, chipDecompLens, chipDecompResultType, providerTag]);

  const chipDecompStatus = useMemo(() => {
    const flat: Record<string, Status> = {};
    for (const [chipK, directionId] of Object.entries(chipDecompDirection)) {
      const lens = chipDecompLens[chipK] ?? null;
      const resultType = chipDecompResultType[chipK] ?? null;
      const compound = `${chipK}::${directionId}::${lensKey(lens)}::${resultType ?? "*"}::${providerTag}`;
      const st = chipDecompStatusByKey[compound];
      if (st) flat[chipK] = st;
    }
    return flat;
  }, [chipDecompStatusByKey, chipDecompDirection, chipDecompLens, chipDecompResultType, providerTag]);

  const runDecomposeFor = useCallback(
    async (
      trimmed: string,
      cat: BigCategory,
      purposeId: string,
      opts: { pushActivity: boolean },
    ): Promise<TopicDecomposition | null> => {
      if (!trimmed) return null;
      const lk = lensKey(selectedLens);
      const cached = loadTopicDecomposition(trimmed, cat, purposeId, lk, providerTag);
      const resetFacetState = () => {
        setSelectedAxes(new Set());
        setFacetDecompositionsByKey({});
        setFacetStatusByKey({});
        setFacetDirectionState({});
        setFacetLensState({});
        setFacetResultTypeState({});
        setSubFacetDerived({});
        setSubFacetDerivedStatus({});
        setPrincipleDirectionState({});
        setPrincipleLensState({});
        setPrincipleResultTypeState({});
        setSelectedPrinciple(null);
      };
      if (cached) {
        setDecomposition(cached);
        setStatus("idle");
        setError(null);
        resetFacetState();
        return cached;
      }

      setStatus("loading");
      setError(null);
      resetFacetState();
      try {
        const res = await fetch(apiPath("/api/decompose-topic"), {
          method: "POST",
          headers: apiHeaders(),
          body: JSON.stringify({
            topicText: trimmed,
            bigCategory: cat,
            lens: selectedLens,
            purposeId,
          }),
        });
        const data = (await res.json()) as {
          axes?: Record<string, string>;
          error?: string;
        };
        if (!res.ok || !data.axes) {
          throw new Error(data.error ?? `Request failed: ${res.status}`);
        }
        const td: TopicDecomposition = {
          topicText: trimmed,
          bigCategory: cat,
          purposeId,
          lensKey: lk,
          providerTag,
          axisToPrinciple: data.axes,
        };
        saveTopicDecomposition(td);
        setDecomposition(td);
        setStatus("idle");
        if (opts.pushActivity) {
          pushActivity({
            kind: "topic",
            title: trimmed,
            subtitle: cat,
            payload: { kind: "topic", topicText: trimmed, bigCategory: cat, purposeId },
          });
        }
        return td;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
        return null;
      }
    },
    [selectedLens, pushActivity, providerTag],
  );

  const runDecompose = useCallback(async () => {
    const trimmed = topicText.trim();
    if (!trimmed) return;
    // Reset all prior topic state so the new topic's pending controller
    // takes over (otherwise DecompositionTree stays on the old axes view).
    setPendingTopic(trimmed);
    setTopicText("");
    setDecomposition(null);
    setCurrentPageId(null);
    setDraftType("topic");
    setSelectedAxes(new Set());
    setSelectedPrinciple(null);
    setSplitMemoPageId(null);
    setCenterMode("topic");
  }, [topicText]);

  const commitPending = useCallback(
    async (purposeId: string) => {
      const trimmed = pendingTopic?.trim();
      if (!trimmed) return;
      setTopicPurposeId(purposeId);
      setPendingTopic(null);
      const td = await runDecomposeFor(trimmed, bigCategory, purposeId, {
        pushActivity: true,
      });
      if (td) {
        const page: Page = {
          id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: "topic",
          title: trimmed,
          createdAt: Date.now(),
          topicSnapshot: td,
        };
        setPages((prev) => [page, ...prev]);
        setCurrentPageId(page.id);
        setDraftType(null);
      }
    },
    [pendingTopic, bigCategory, runDecomposeFor],
  );

  const memoAsTopic = useCallback(
    async (memoId: string, override?: string) => {
      const memo = memos.find((m) => m.id === memoId);
      if (!memo) return;
      const text = (override && override.trim()) || memo.text;
      const sourceMemoPage = pages.find(
        (p) => p.id === currentPageId && p.type === "memo",
      );
      if (sourceMemoPage) {
        setSplitMemoPageId(sourceMemoPage.id);
      }
      setActiveSplitView("topic");
      setInputMode("topic");
      setDraftType("topic");
      setCurrentPageId(null);
      setDecomposition(null);
      setPendingTopic(text);
    },
    [memos, pages, currentPageId],
  );

  const chipifyMemo = useCallback(
    (memoId: string, override?: string) => {
      const memo = memos.find((m) => m.id === memoId);
      if (!memo) return;
      const text = (override && override.trim()) || memo.text;
      const id = `uchip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setUserChips((prev) => [
        {
          id,
          name: text.slice(0, 40),
          definition: text,
          text,
          kind: "memo",
          source: "memo",
          createdAt: Date.now(),
        },
        ...prev,
      ]);
    },
    [memos],
  );

  const startChipify = useCallback(
    (memoId: string, override?: string) => {
      const memo = memos.find((m) => m.id === memoId);
      if (!memo) return;
      const text = (override && override.trim()) || memo.text;
      const sourceMemoPage = pages.find(
        (p) => p.id === currentPageId && p.type === "memo",
      );
      if (sourceMemoPage) {
        setSplitMemoPageId(sourceMemoPage.id);
        setInputMode("topic");
        setDraftType("topic");
        setCurrentPageId(null);
      }
      setChipifyPending({ memoId, text });
      setCenterMode("chip");
      setActiveSplitView("topic");
    },
    [memos, pages, currentPageId],
  );

  const exitSplitIfIdle = useCallback(() => {
    if (decomposition || pendingTopic) return;
    if (!splitMemoPageId) return;
    setCurrentPageId(splitMemoPageId);
    setInputMode("memo");
    setDraftType(null);
    setCenterMode("topic");
    setActiveSplitView("memo");
    setSplitMemoPageId(null);
  }, [decomposition, pendingTopic, splitMemoPageId]);

  const cancelChipify = useCallback(() => {
    setChipifyPending(null);
    setCenterMode("topic");
    exitSplitIfIdle();
  }, [exitSplitIfIdle]);

  const saveChipify = useCallback(
    (input: { kind: UserChipKind; name: string; definition: string }) => {
      if (!chipifyPending) return;
      const name = input.name.trim();
      const definition = input.definition.trim();
      if (!name && !definition) return;
      const canonical = name || definition;
      const id = `uchip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setUserChips((prev) => [
        {
          id,
          name: name || canonical,
          definition,
          text: canonical,
          kind: input.kind,
          source: "memo",
          createdAt: Date.now(),
        },
        ...prev,
      ]);
      setChipifyPending(null);
      setCenterMode("topic");
      setChipPanelOpen(true);
      // Trigger chip decomposition for library-kind chips (industry/psychology/object)
      if (input.kind !== "memo") {
        void runDecomposeChip(input.kind, canonical);
      }
      exitSplitIfIdle();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chipifyPending, exitSplitIfIdle],
  );

  const removeUserChip = useCallback((id: string) => {
    setUserChips((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const openActivity = useCallback(
    async (entry: ActivityEntry) => {
      const p = entry.payload;
      if (!p) return;
      if (p.kind === "topic") {
        setTopicText(p.topicText);
        setBigCategory(p.bigCategory);
        setTopicPurposeId(p.purposeId);
        await runDecomposeFor(p.topicText.trim(), p.bigCategory, p.purposeId, {
          pushActivity: false,
        });
      } else if (p.kind === "chip") {
        setChipSearchQuery(p.query);
        setChipSearchMode(p.mode);
        setChipPanelOpen(true);
        await doChipSearch(p.query, p.mode);
      } else if (p.kind === "combine") {
        setFocusedCombinedIdeaId(p.combinedIdeaId);
      } else if (p.kind === "memo") {
        // memo lives on the board; nothing extra to open
      }
    },
    [runDecomposeFor, doChipSearch, memos],
  );

  const toggleAxis = useCallback((name: string) => {
    setSelectedAxes((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const clearAxes = useCallback(() => setSelectedAxes(new Set()), []);

  const runDecomposeFacet = useCallback(
    async (
      axis: string,
      directionIdArg?: string,
      lensArg?: SelectedLens | null,
      resultTypeArg?: BigCategory | null,
    ) => {
      if (!decomposition) return;
      const parentPrinciple = decomposition.axisToPrinciple[axis];
      if (!parentPrinciple) return;
      const directionId =
        directionIdArg ?? facetDirection[axis] ?? DEFAULT_DIRECTION_ID;
      const lens =
        lensArg !== undefined
          ? lensArg
          : facetLens[axis] ?? selectedLens ?? null;
      const resultType =
        resultTypeArg !== undefined ? resultTypeArg : facetResultType[axis] ?? null;
      const key = facetKey(axis, directionId, lens, resultType, providerTag);
      setFacetDirectionState((prev) => ({ ...prev, [axis]: directionId }));
      setFacetLensState((prev) => ({ ...prev, [axis]: lens }));
      setFacetResultTypeState((prev) => ({ ...prev, [axis]: resultType }));
      if (facetDecompositionsByKey[key]) {
        appendAxisGen(axis, { key, directionId, lens, resultType });
        return;
      }

      const directionMeta =
        kBuiltinDirections.find((d) => d.id === directionId) ??
        customDirections.find((d) => d.id === directionId);

      setFacetStatusByKey((s) => ({ ...s, [key]: "loading" }));
      try {
        const res = await fetch(apiPath("/api/decompose-facet"), {
          method: "POST",
          headers: apiHeaders(),
          body: JSON.stringify({
            parentAxis: axis,
            parentPrinciple,
            rootTopic: decomposition.topicText,
            bigCategory: decomposition.bigCategory,
            directionId,
            directionLabel: directionMeta?.label,
            lens,
            resultType,
          }),
        });
        const data = (await res.json()) as {
          subFacets?: Record<string, string>;
          error?: string;
        };
        if (!res.ok || !data.subFacets) {
          throw new Error(data.error ?? `Request failed: ${res.status}`);
        }
        setFacetDecompositionsByKey((m) => ({
          ...m,
          [key]: data.subFacets!,
        }));
        setFacetStatusByKey((s) => ({ ...s, [key]: "idle" }));
        appendAxisGen(axis, { key, directionId, lens, resultType });
      } catch (err) {
        setFacetStatusByKey((s) => ({ ...s, [key]: "error" }));
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [
      decomposition,
      facetDecompositionsByKey,
      facetDirection,
      facetLens,
      facetResultType,
      customDirections,
      providerTag,
      appendAxisGen,
      selectedLens,
    ],
  );

  const multiAxisKey = useCallback(
    (
      axesNames: string[],
      directionId: string,
      lens: SelectedLens | null,
      resultType: BigCategory | null,
    ) =>
      `${axesNames.slice().sort().join("|")}::${directionId}::${lensKey(lens)}::${resultType ?? "*"}::${providerTag}`,
    [providerTag],
  );

  const runDecomposeMultiAxis = useCallback(
    async (
      directionIdArg?: string,
      lensArg?: SelectedLens | null,
      resultTypeArg?: BigCategory | null,
    ) => {
      if (!decomposition) return;
      const activeAxes = Array.from(selectedAxes)
        .map((name) => ({
          axis: name,
          principle: decomposition.axisToPrinciple[name],
        }))
        .filter((p) => Boolean(p.principle));
      if (activeAxes.length < 2) return;

      const directionId = directionIdArg ?? multiAxisDirection;
      const lens =
        lensArg !== undefined ? lensArg : multiAxisLens ?? selectedLens;
      const resultType =
        resultTypeArg !== undefined ? resultTypeArg : multiAxisResultType;
      const key = multiAxisKey(
        activeAxes.map((a) => a.axis),
        directionId,
        lens,
        resultType,
      );
      setMultiAxisDirection(directionId);
      setMultiAxisLens(lens);
      setMultiAxisResultType(resultType);
      if (multiAxisResultsByKey[key]) return;

      const directionMeta =
        kBuiltinDirections.find((d) => d.id === directionId) ??
        customDirections.find((d) => d.id === directionId);

      setMultiAxisStatusByKey((s) => ({ ...s, [key]: "loading" }));
      try {
        const res = await fetch(apiPath("/api/decompose-multi-axis"), {
          method: "POST",
          headers: apiHeaders(),
          body: JSON.stringify({
            parents: activeAxes,
            rootTopic: decomposition.topicText,
            bigCategory: decomposition.bigCategory,
            directionId,
            directionLabel: directionMeta?.label,
            lens,
            resultType,
          }),
        });
        const data = (await res.json()) as {
          subFacets?: Record<string, string>;
          error?: string;
        };
        if (!res.ok || !data.subFacets) {
          throw new Error(data.error ?? `Request failed: ${res.status}`);
        }
        setMultiAxisResultsByKey((m) => ({ ...m, [key]: data.subFacets! }));
        setMultiAxisStatusByKey((s) => ({ ...s, [key]: "idle" }));
      } catch (err) {
        setMultiAxisStatusByKey((s) => ({ ...s, [key]: "error" }));
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [
      decomposition,
      selectedAxes,
      multiAxisDirection,
      multiAxisLens,
      multiAxisResultType,
      multiAxisResultsByKey,
      customDirections,
      multiAxisKey,
      selectedLens,
    ],
  );

  const multiAxisResults = useMemo<Record<string, string>>(() => {
    if (!decomposition) return {};
    const axesNames = Array.from(selectedAxes);
    if (axesNames.length < 2) return {};
    const key = multiAxisKey(
      axesNames,
      multiAxisDirection,
      multiAxisLens,
      multiAxisResultType,
    );
    return multiAxisResultsByKey[key] ?? {};
  }, [
    decomposition,
    selectedAxes,
    multiAxisDirection,
    multiAxisLens,
    multiAxisResultType,
    multiAxisResultsByKey,
    multiAxisKey,
  ]);

  const multiAxisStatus = useMemo<Status>(() => {
    if (!decomposition) return "idle";
    const axesNames = Array.from(selectedAxes);
    if (axesNames.length < 2) return "idle";
    const key = multiAxisKey(
      axesNames,
      multiAxisDirection,
      multiAxisLens,
      multiAxisResultType,
    );
    return multiAxisStatusByKey[key] ?? "idle";
  }, [
    decomposition,
    selectedAxes,
    multiAxisDirection,
    multiAxisLens,
    multiAxisResultType,
    multiAxisStatusByKey,
    multiAxisKey,
  ]);

  const selectPrinciple = useCallback((p: SelectedPrinciple | null) => {
    setSelectedPrinciple(p);
  }, []);

  const runRecommendChips = useCallback(
    async (axis: string, name: string, text: string) => {
      if (!decomposition) return;
      const key = principleKey(axis, name);
      if (chipRecommendations[key]) return;

      setChipStatus((s) => ({ ...s, [key]: "loading" }));
      try {
        const res = await fetch(apiPath("/api/recommend-chips"), {
          method: "POST",
          headers: apiHeaders(),
          body: JSON.stringify({
            topicText: decomposition.topicText,
            axis,
            principle: text,
          }),
        });
        const data = (await res.json()) as {
          recommendations?: ChipRecommendations;
          error?: string;
        };
        if (!res.ok || !data.recommendations) {
          throw new Error(data.error ?? `Request failed: ${res.status}`);
        }
        setChipRecommendations((m) => ({ ...m, [key]: data.recommendations! }));
        setChipStatus((s) => ({ ...s, [key]: "idle" }));
      } catch (err) {
        setChipStatus((s) => ({ ...s, [key]: "error" }));
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [decomposition, chipRecommendations],
  );

  const selectChip = useCallback((c: SelectedChip | null) => {
    setSelectedChip(c);
  }, []);

  const runDecomposeChip = useCallback(
    async (
      kind: ChipKind,
      text: string,
      directionIdArg?: string,
      lensArg?: SelectedLens | null,
      resultTypeArg?: BigCategory | null,
    ) => {
      const chipK = chipKey(kind, text);
      const directionId =
        directionIdArg ?? chipDecompDirection[chipK] ?? DEFAULT_DIRECTION_ID;
      const lens = lensArg !== undefined ? lensArg : chipDecompLens[chipK] ?? null;
      const resultType =
        resultTypeArg !== undefined
          ? resultTypeArg
          : chipDecompResultType[chipK] ?? null;
      const compound = chipDecompKey(kind, text, directionId, lens, resultType, providerTag);
      setChipDecompDirectionState((prev) => ({ ...prev, [chipK]: directionId }));
      setChipDecompLensState((prev) => ({ ...prev, [chipK]: lens }));
      setChipDecompResultTypeState((prev) => ({ ...prev, [chipK]: resultType }));
      if (chipDecompositionsByKey[compound]) return;

      const directionMeta =
        kBuiltinDirections.find((d) => d.id === directionId) ??
        customDirections.find((d) => d.id === directionId);

      setChipDecompStatusByKey((s) => ({ ...s, [compound]: "loading" }));
      try {
        const res = await fetch(apiPath("/api/decompose-chip"), {
          method: "POST",
          headers: apiHeaders(),
          body: JSON.stringify({
            chipText: text,
            kind,
            directionId,
            directionLabel: directionMeta?.label,
            lens,
            resultType,
          }),
        });
        const data = (await res.json()) as {
          axisToPrinciple?: Record<string, string>;
          error?: string;
        };
        if (!res.ok || !data.axisToPrinciple) {
          throw new Error(data.error ?? `Request failed: ${res.status}`);
        }
        setChipDecompositionsByKey((m) => ({
          ...m,
          [compound]: data.axisToPrinciple!,
        }));
        setChipDecompStatusByKey((s) => ({ ...s, [compound]: "idle" }));
        setDecompositionHistory((prev) => {
          const filtered = prev.filter(
            (h) =>
              !(
                h.chipKind === kind &&
                h.chipText === text &&
                h.directionId === directionId &&
                lensKey(h.lens) === lensKey(lens) &&
                (h.resultType ?? null) === (resultType ?? null)
              ),
          );
          return [
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              chipKind: kind,
              chipText: text,
              directionId,
              lens,
              resultType,
              axisToPrinciple: data.axisToPrinciple!,
              at: Date.now(),
            },
            ...filtered,
          ].slice(0, 30);
        });
      } catch (err) {
        setChipDecompStatusByKey((s) => ({ ...s, [compound]: "error" }));
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [
      chipDecompositionsByKey,
      chipDecompDirection,
      chipDecompLens,
      chipDecompResultType,
      customDirections,
      providerTag,
    ],
  );

  const clearCombined = useCallback(() => setCombinedIdeas([]), []);

  const runCombine = useCallback(
    async (input: CombineInput) => {
      if (!decomposition) return;
      const topicFacets = input.topicFacet
        ? [input.topicFacet]
        : selectedPrinciple
          ? [{ axis: selectedPrinciple.axis, principle: selectedPrinciple.text }]
          : [];
      const chipFacets = input.chipFacet
        ? [{ axis: input.chipFacet.axis, principle: input.chipFacet.principle }]
        : [];

      setCombineStatus("loading");
      try {
        const res = await fetch(apiPath("/api/combine"), {
          method: "POST",
          headers: apiHeaders(),
          body: JSON.stringify({
            topicText: decomposition.topicText,
            topicFacets,
            chipKind: input.chipKind ?? null,
            chipText: input.chipText,
            chipFacets,
            chipCategory: input.chipCategory ?? null,
            chipReason: input.chipReason ?? null,
            lens: selectedLens,
          }),
        });
        const data = (await res.json()) as {
          ideas?: CombinedIdea[];
          idea?: CombinedIdea;
          error?: string;
        };
        const rawIdeas: CombinedIdea[] =
          data.ideas && data.ideas.length > 0
            ? data.ideas
            : data.idea
              ? [data.idea]
              : [];
        if (!res.ok || rawIdeas.length === 0) {
          throw new Error(data.error ?? `Request failed: ${res.status}`);
        }
        const label = input.chipFacet
          ? `${input.chipText} · ${input.chipFacet.axis}`
          : input.chipText;
        const topicAxis = input.topicFacet?.axis ?? selectedPrinciple?.axis ?? null;
        const topicName =
          input.topicFacet?.axis
            ? "축 전체"
            : selectedPrinciple?.name ?? null;
        const now = Date.now();
        const recs: CombinedIdeaRecord[] = rawIdeas.map((idea, i) => ({
          ...idea,
          id: `${now}-${i}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: now + i,
          chipText: input.chipText,
          chipLabel: label,
          topicAxis,
          topicName,
        }));
        setCombinedIdeas((prev) => [...recs, ...prev]);
        setCombineStatus("idle");
        pushActivity({
          kind: "combine",
          title: recs[0].title || label,
          subtitle: label,
          payload: { kind: "combine", combinedIdeaId: recs[0].id },
        });
      } catch (err) {
        setCombineStatus("error");
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [decomposition, selectedPrinciple, pushActivity, selectedLens],
  );

  const memoAsChip = useCallback(
    async (memoId: string) => {
      const memo = memos.find((m) => m.id === memoId);
      if (!memo) {
        setError("메모를 찾을 수 없습니다.");
        return;
      }
      if (!selectedPrinciple) {
        setError("먼저 사고확장 보드에서 조합할 원리를 선택하세요.");
        return;
      }
      const pk = principleKey(selectedPrinciple.axis, selectedPrinciple.name);
      const attached: AttachedChip = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        chipText: memo.text,
        source: "search",
        kindOrCategory: "메모",
      };
      attachChip(pk, attached);
      await runCombine({
        chipKind: null,
        chipCategory: "메모",
        chipText: memo.text,
        chipReason: null,
      });
    },
    [memos, selectedPrinciple, attachChip, runCombine],
  );

  const value = useMemo<Ctx>(
    () => ({
      topicText,
      bigCategory,
      setTopicText,
      setBigCategory,
      topicPurposeId,
      setTopicPurposeId,
      pendingTopic,
      cancelPending,
      commitPending,
      pages,
      currentPageId,
      draftType,
      startTopicDraft,
      startMemoDraft,
      goHome,
      openPage,
      deletePage,
      topicDirectionId,
      setTopicDirectionId,
      topicResultType,
      setTopicResultType,
      decomposition,
      status,
      error,
      clearError,
      runDecompose,
      selectedAxes,
      toggleAxis,
      clearAxes,
      facetDecompositions,
      facetStatus,
      axisFacetGens,
      removeAxisGen,
      runDecomposeFacet,
      facetDirection,
      setFacetDirection,
      facetResultType,
      setFacetResultType,
      customPurposes,
      addCustomPurpose,
      removeCustomPurpose,
      customDirections,
      addCustomDirection,
      removeCustomDirection,
      facetLens,
      setFacetLens,
      subFacetDerived,
      subFacetDerivedStatus,
      runDecomposeSubFacet,
      principleDirection,
      principleLens,
      principleResultType,
      setPrincipleDirection,
      setPrincipleLens,
      setPrincipleResultType,
      selectedPrinciple,
      selectPrinciple,
      expandedPrinciples,
      markPrincipleExpanded,
      markPrincipleCollapsed,
      chipRecommendations,
      chipStatus,
      runRecommendChips,
      selectedChip,
      selectChip,
      chipDecompositions,
      chipDecompStatus,
      runDecomposeChip,
      chipDecompDirection,
      setChipDecompDirection,
      chipDecompLens,
      setChipDecompLens,
      chipDecompResultType,
      setChipDecompResultType,
      combinedIdeas,
      combineStatus,
      runCombine,
      clearCombined,
      inputMode,
      setInputMode,
      memos,
      addMemo,
      removeMemo,
      reorderMemos,
      memoAsTopic,
      memoAsChip,
      userChips,
      chipifyMemo,
      removeUserChip,
      chipifyPending,
      startChipify,
      cancelChipify,
      saveChipify,
      splitMemoPageId,
      setSplitMemoPageId,
      activeSplitView,
      setActiveSplitView,
      centerMode,
      setCenterMode,
      memoListMode,
      showMemoList,
      multiAxisResults,
      multiAxisStatus,
      multiAxisDirection,
      multiAxisLens,
      multiAxisResultType,
      setMultiAxisDirection,
      setMultiAxisLens,
      setMultiAxisResultType,
      runDecomposeMultiAxis,
      chipSearchQuery,
      setChipSearchQuery,
      chipSearchMode,
      setChipSearchMode,
      chipSearchResults,
      chipSearchStatus,
      runChipSearch,
      chipSearchHistory,
      rerunChipSearch,
      clearChipSearchHistory,
      decompositionHistory,
      clearDecompositionHistory,
      removeDecompositionHistoryItem,
      chipPanelOpen,
      setChipPanelOpen,
      activityLog,
      openActivity,
      focusedCombinedIdeaId,
      setFocusedCombinedIdeaId,
      activityPanelOpen,
      setActivityPanelOpen,
      userGeminiKey,
      setUserGeminiKey,
      useUserKey,
      setUseUserKey,
      settingsOpen,
      setSettingsOpen,
      authSession,
      authUser,
      authReady,
      loginModalOpen,
      setLoginModalOpen,
      signOut,
      attachedChips,
      attachChip,
      removeAttachedChip,
      selectedLens,
      setSelectedLens,
      lensHistory,
      removeLensFromHistory,
      customLenses,
      addCustomLens,
      removeCustomLens,
      customResultTypes,
      addCustomResultType,
      removeCustomResultType,
      addCustomScholar,
      removeCustomScholar,
    }),
    [
      topicText,
      bigCategory,
      topicPurposeId,
      pendingTopic,
      cancelPending,
      commitPending,
      pages,
      currentPageId,
      draftType,
      startTopicDraft,
      startMemoDraft,
      goHome,
      openPage,
      deletePage,
      topicDirectionId,
      topicResultType,
      decomposition,
      status,
      error,
      clearError,
      runDecompose,
      selectedAxes,
      toggleAxis,
      clearAxes,
      facetDecompositions,
      facetStatus,
      axisFacetGens,
      removeAxisGen,
      runDecomposeFacet,
      facetDirection,
      setFacetDirection,
      facetResultType,
      setFacetResultType,
      customPurposes,
      addCustomPurpose,
      removeCustomPurpose,
      customDirections,
      addCustomDirection,
      removeCustomDirection,
      facetLens,
      setFacetLens,
      subFacetDerived,
      subFacetDerivedStatus,
      runDecomposeSubFacet,
      principleDirection,
      principleLens,
      principleResultType,
      setPrincipleDirection,
      setPrincipleLens,
      setPrincipleResultType,
      selectedPrinciple,
      selectPrinciple,
      expandedPrinciples,
      markPrincipleExpanded,
      markPrincipleCollapsed,
      chipRecommendations,
      chipStatus,
      runRecommendChips,
      selectedChip,
      selectChip,
      chipDecompositions,
      chipDecompStatus,
      runDecomposeChip,
      chipDecompDirection,
      setChipDecompDirection,
      chipDecompLens,
      setChipDecompLens,
      chipDecompResultType,
      setChipDecompResultType,
      combinedIdeas,
      combineStatus,
      runCombine,
      clearCombined,
      inputMode,
      memos,
      addMemo,
      removeMemo,
      reorderMemos,
      memoAsTopic,
      memoAsChip,
      userChips,
      chipifyMemo,
      removeUserChip,
      chipifyPending,
      startChipify,
      cancelChipify,
      saveChipify,
      splitMemoPageId,
      activeSplitView,
      centerMode,
      memoListMode,
      showMemoList,
      multiAxisResults,
      multiAxisStatus,
      multiAxisDirection,
      multiAxisLens,
      multiAxisResultType,
      runDecomposeMultiAxis,
      chipSearchQuery,
      chipSearchMode,
      chipSearchResults,
      chipSearchStatus,
      runChipSearch,
      chipSearchHistory,
      rerunChipSearch,
      clearChipSearchHistory,
      decompositionHistory,
      clearDecompositionHistory,
      removeDecompositionHistoryItem,
      chipPanelOpen,
      activityLog,
      openActivity,
      focusedCombinedIdeaId,
      setFocusedCombinedIdeaId,
      activityPanelOpen,
      setActivityPanelOpen,
      userGeminiKey,
      setUserGeminiKey,
      useUserKey,
      setUseUserKey,
      settingsOpen,
      setSettingsOpen,
      authSession,
      authUser,
      authReady,
      loginModalOpen,
      signOut,
      attachedChips,
      attachChip,
      removeAttachedChip,
      selectedLens,
      setSelectedLens,
      lensHistory,
      removeLensFromHistory,
      customLenses,
      addCustomLens,
      removeCustomLens,
      customResultTypes,
      addCustomResultType,
      removeCustomResultType,
      addCustomScholar,
      removeCustomScholar,
    ],
  );

  return <IdeaCtx.Provider value={value}>{children}</IdeaCtx.Provider>;
}

export function useIdea(): Ctx {
  const ctx = useContext(IdeaCtx);
  if (!ctx) throw new Error("useIdea must be used inside IdeaProvider");
  return ctx;
}

export { principleKey, chipKey };
