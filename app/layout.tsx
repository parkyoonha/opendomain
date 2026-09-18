import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenDomain",
  description: "아이디어와 칩 라이브러리를 탐색하는 작업 공간",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="h-screen overflow-hidden">{children}</body>
    </html>
  );
}
