import type { Metadata, Viewport } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChessLearn // SYSTEM ONLINE",
  description:
    "Play chess with friends via a shareable link. No account needed. Real-time multiplayer with post-game analysis.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface crt-overlay crt-vignette grid-bg">
        <Nav />
        <main className="flex-1 animate-crt-on">{children}</main>
      </body>
    </html>
  );
}
