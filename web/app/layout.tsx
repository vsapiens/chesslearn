import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChessLearn — Play, Challenge, Improve",
  description:
    "Play chess vs friends with a shareable link or challenge a bot. Review your games with engine analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950">
        <nav className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm px-6 py-3 flex items-center gap-6">
          <a href="/" className="text-lg font-bold text-amber-400 tracking-tight">
            ChessLearn
          </a>
          <a href="/play/new" className="text-sm text-zinc-300 hover:text-white transition-colors">
            New Game
          </a>
          <a href="/learn" className="text-sm text-zinc-300 hover:text-white transition-colors">
            Learn
          </a>
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
