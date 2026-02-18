import type { Metadata, Viewport } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChessLearn — Play, Challenge, Improve",
  description:
    "Play chess vs friends with a shareable link or challenge a bot. Review your games with engine analysis.",
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
      <body className="min-h-screen bg-zinc-950">
        <Nav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
