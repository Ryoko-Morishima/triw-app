// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "TRIW",
  description: "DJが選ぶ、あなたのためのプレイリスト",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* ここで全ページ共通のヘッダーを表示 */}
          <Header />

          {/* 各ページの中身（page.tsx 側で <main> が既にあるのでラップしない） */}
          {children}

          {/* トーストは全体で1つ */}
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
