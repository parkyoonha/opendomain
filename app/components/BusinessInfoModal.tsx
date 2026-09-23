"use client";

export default function BusinessInfoModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const rows: [string, string][] = [
    ["사업자명", "서처"],
    ["대표자", "박윤하"],
    ["사업자등록번호", "765-25-02199"],
    ["이메일", "grttihat@gmail.com"],
    ["주소", "서울 서대문구 이화여대7길 37"],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-white/20 bg-bg-menu p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted">
              INFO
            </div>
            <h2 className="mt-0.5 text-[14px] font-semibold text-text-primary">
              사업자 정보
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="rounded-md p-1 text-text-muted hover:bg-white/10 hover:text-text-primary"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <dl className="flex flex-col divide-y divide-white/10 rounded-md border border-white/15 bg-black/40 text-[12px]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex gap-3 px-3 py-2">
              <dt className="w-24 shrink-0 text-text-muted">{label}</dt>
              <dd className="min-w-0 flex-1 break-words text-text-primary">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
