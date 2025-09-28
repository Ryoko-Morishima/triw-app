import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner"; // ★ 追加
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
          {children}
          <Toaster richColors /> {/* ★ 追加 */}
        </ThemeProvider>
      </body>
    </html>
  );
}
