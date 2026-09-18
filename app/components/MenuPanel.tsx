"use client";

import type { MenuKey } from "../data/sampleData";

type Props = {
  isActive: (key: MenuKey) => boolean;
  onToggle: (key: MenuKey) => void;
};

const items: { key: MenuKey; label: string; icon: React.ReactNode }[] = [
  {
    key: "ideas",
    label: "아이디어 찾기",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7c.7.6 1 1.5 1 2.3v.5h6v-.5c0-.8.3-1.7 1-2.3A7 7 0 0012 2z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: "chips",
    label: "칩 라이브러리",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <rect
          x="6"
          y="6"
          width="12"
          height="12"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function MenuPanel({ isActive, onToggle }: Props) {
  const renderItem = (item: (typeof items)[number]) => {
    const active = isActive(item.key);
    return (
      <button
        key={item.key}
        onClick={() => onToggle(item.key)}
        className={`flex h-9 items-center gap-3 self-start rounded-full pl-4 pr-7 text-left transition-colors ${
          active
            ? "bg-accent-blue text-black"
            : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
        }`}
      >
        {item.icon}
        <span className={`text-[13px] ${active ? "font-bold" : "font-medium"}`}>
          {item.label}
        </span>
      </button>
    );
  };

  const topItems = items.filter((i) => i.key !== "chips");
  const bottomItems = items.filter((i) => i.key === "chips");

  return (
    <nav className="flex h-full w-60 flex-col bg-bg-menu px-3 py-4">
      <div className="mb-4 flex items-center gap-2 px-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-blue/20 text-accent-blue">
          <span className="text-sm font-semibold">OD</span>
        </div>
        <span className="text-sm font-semibold text-text-primary">OpenDomain</span>
      </div>

      <div className="flex flex-1 flex-col gap-1">{topItems.map(renderItem)}</div>

      <div className="flex flex-1 flex-col justify-start gap-1">
        {bottomItems.map(renderItem)}
      </div>
    </nav>
  );
}
