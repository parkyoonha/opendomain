"use client";

// Parent-facet tag used at the top of each controller bar. Now a pure
// display chip — the ⋯ menu moved to the controller's expand-view
// (SessionTimelineModal), which owns the memo / edit actions. The tag
// stretches to fill the row and clips with line-clamp so very long
// facet text doesn't push the bar height around (the bar is now a
// fixed-aspect rectangle; the tag content lives inside its top half).
// maxLines: how many lines before truncating. The default (3) keeps the
// legacy compact layout used inside the tree. PendingTopicCard overrides
// with a larger value so the enlarged parent-facet section can show more
// context before clipping; the 확대 button opens the full-text modal.
export default function ParentFacetTag({
  text,
  maxLines = 3,
}: {
  text: string;
  maxLines?: number;
}) {
  const clampClass =
    maxLines <= 2
      ? "line-clamp-2"
      : maxLines <= 3
        ? "line-clamp-3"
        : maxLines <= 4
          ? "line-clamp-4"
          : maxLines <= 5
            ? "line-clamp-5"
            : maxLines <= 6
              ? "line-clamp-6"
              : "line-clamp-none";
  return (
    <div className="inline-flex min-w-0 max-w-full items-start rounded-md bg-white/[0.1] px-3 py-2 text-text-primary">
      <span
        className={`${clampClass} min-w-0 whitespace-pre-wrap break-words text-[14px] font-medium leading-5`}
      >
        {text}
      </span>
    </div>
  );
}
