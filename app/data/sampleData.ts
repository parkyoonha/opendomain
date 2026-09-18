export type MenuKey = "ideas" | "chips";

export const menuMeta: Record<MenuKey, { label: string; description: string }> = {
  ideas: {
    label: "아이디어 찾기",
    description: "주제 → 축 분해 → 칩 조합으로 아이디어 순환",
  },
  chips: {
    label: "칩 라이브러리",
    description: "산업·심리·사물 등 조합용 칩 관리",
  },
};
