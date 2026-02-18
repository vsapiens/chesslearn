import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
          Play. Challenge. <span className="text-amber-400">Improve.</span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">
          Play chess against friends with a shareable link, or train against
          bots. Review every game with engine analysis.
        </p>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <GameCard
          href="/play/new?mode=human"
          icon="🔗"
          title="Play vs Friend"
          description="Generate a link and share it. No account needed — just click and play."
          cta="Create invite"
          accent="amber"
        />
        <GameCard
          href="/play/new?mode=bot"
          icon="🤖"
          title="Play vs Bot"
          description="Challenge Easy, Medium, or Hard bots powered by Stockfish."
          cta="Play bot"
          accent="sky"
        />
        <GameCard
          href="/learn"
          icon="📚"
          title="Learn & Review"
          description="After every game, see your blunders, best moves, and key moments."
          cta="Review games"
          accent="emerald"
        />
      </div>

      {/* Features list */}
      <div className="mt-16 grid md:grid-cols-2 gap-4 text-sm text-zinc-400">
        {[
          "Real-time moves over WebSocket",
          "Server-side move validation",
          "Resumable games via unique link",
          "Engine-powered post-game review",
          "Blunder / Mistake / Inaccuracy classification",
          "Hint system (3 hints per game)",
          "Legal move highlighting",
          "Drag-drop + click-to-move",
        ].map((f) => (
          <div key={f} className="flex items-center gap-2">
            <span className="text-amber-400">✓</span>
            <span>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GameCard({
  href,
  icon,
  title,
  description,
  cta,
  accent,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  cta: string;
  accent: "amber" | "sky" | "emerald";
}) {
  const accentMap = {
    amber: "border-amber-500/30 hover:border-amber-400/60 bg-amber-500/5",
    sky: "border-sky-500/30 hover:border-sky-400/60 bg-sky-500/5",
    emerald:
      "border-emerald-500/30 hover:border-emerald-400/60 bg-emerald-500/5",
  };
  const btnMap = {
    amber: "bg-amber-500 hover:bg-amber-400 text-black",
    sky: "bg-sky-500 hover:bg-sky-400 text-black",
    emerald: "bg-emerald-500 hover:bg-emerald-400 text-black",
  };

  return (
    <Link
      href={href}
      className={`rounded-xl border p-6 flex flex-col gap-4 transition-all group ${accentMap[accent]}`}
    >
      <div className="text-3xl">{icon}</div>
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">{title}</h2>
        <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
      </div>
      <span
        className={`self-start px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${btnMap[accent]}`}
      >
        {cta}
      </span>
    </Link>
  );
}
