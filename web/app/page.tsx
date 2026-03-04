import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      {/* System label */}
      <div className="text-center mb-2">
        <span className="text-xs font-mono text-phosphor-muted tracking-widest">
          // SYSTEM INITIALIZED &mdash; SELECT PROTOCOL
        </span>
      </div>

      {/* Hero */}
      <div className="text-center mb-10 sm:mb-16">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-phosphor text-glow mb-4 tracking-tight">
          PLAY. CHALLENGE. <span className="text-amber text-glow-amber">IMPROVE.</span>
        </h1>
        <p className="text-phosphor-dim text-base sm:text-lg max-w-xl mx-auto font-mono">
          Play chess against friends with a shareable link, or train against
          bots. Review every game with engine analysis.
        </p>
        {/* Decorative gradient line */}
        <div className="mt-4 mx-auto w-48 h-px bg-gradient-to-r from-transparent via-phosphor/40 to-transparent" />
      </div>

      {/* Cards */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <GameCard
          href="/play/new?mode=human"
          code="[LINK::CONNECT]"
          title="VS FRIEND"
          description="Generate a link and share it. No account needed — just click and play."
          cta="> CREATE INVITE"
          accent="phosphor"
        />
        <GameCard
          href="/play/new?mode=bot"
          code="[BOT::ENGAGE]"
          title="VS ENGINE"
          description="Challenge Easy, Medium, or Hard bots powered by Stockfish."
          cta="> PLAY BOT"
          accent="amber"
        />
        <GameCard
          href="/learn"
          code="[DATA::ANALYZE]"
          title="LEARN & REVIEW"
          description="After every game, see your blunders, best moves, and key moments."
          cta="> REVIEW GAMES"
          accent="cyan"
        />
      </div>

      {/* Features list */}
      <div className="mt-10 sm:mt-16">
        <div className="text-xs font-mono text-phosphor-muted tracking-widest mb-4">
          // SYSTEM CAPABILITIES
        </div>
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 text-sm text-phosphor-dim font-mono">
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
              <span className="text-phosphor text-glow text-xs">[OK]</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GameCard({
  href,
  code,
  title,
  description,
  cta,
  accent,
}: {
  href: string;
  code: string;
  title: string;
  description: string;
  cta: string;
  accent: "phosphor" | "amber" | "cyan";
}) {
  const accentMap = {
    phosphor: "border-phosphor/20 hover:border-phosphor/50 hover:shadow-phosphor",
    amber: "border-amber/20 hover:border-amber/50 hover:shadow-amber",
    cyan: "border-cyan/20 hover:border-cyan/50 hover:shadow-cyan",
  };
  const ctaMap = {
    phosphor: "text-phosphor border-phosphor/40 hover:border-phosphor/70",
    amber: "text-amber border-amber/40 hover:border-amber/70",
    cyan: "text-cyan border-cyan/40 hover:border-cyan/70",
  };
  const codeColor = {
    phosphor: "text-phosphor/60",
    amber: "text-amber/60",
    cyan: "text-cyan/60",
  };

  return (
    <Link
      href={href}
      className={`panel flex flex-col gap-4 transition-all group ${accentMap[accent]}`}
    >
      <span className={`text-xs font-mono ${codeColor[accent]}`}>{code}</span>
      <div>
        <h2 className="text-lg font-display font-semibold text-phosphor-dim mb-1">{title}</h2>
        <p className="text-phosphor-muted text-sm leading-relaxed font-mono">{description}</p>
      </div>
      <span
        className={`self-start px-4 py-1.5 border text-sm font-mono transition-all ${ctaMap[accent]}`}
      >
        {cta}
      </span>
    </Link>
  );
}
