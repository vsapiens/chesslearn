export default function LearnPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-phosphor text-glow mb-2">
        // INTEL DATABASE
      </h1>
      <p className="text-phosphor-muted mb-8 sm:mb-10 font-mono text-sm">
        Access tactical protocols. Use every game as training data.
      </p>

      <div className="grid gap-4">
        <TipCard
          code="PROTO-001"
          title="POST-GAME REVIEW"
          body="After every game, click Review Game to see engine analysis. Each move is classified as Best, Good, Inaccuracy, Mistake, or Blunder."
        />
        <TipCard
          code="PROTO-002"
          title="KEY MOMENTS"
          body="The review highlights up to 5 critical moments where the game turned. Study these positions to understand what went wrong."
        />
        <TipCard
          code="PROTO-003"
          title="HINT SYSTEM"
          body="You get 3 hints per game. Save them for positions where you're truly stuck — they reveal the engine's best move."
        />
        <TipCard
          code="PROTO-004"
          title="BOT DIFFICULTY"
          body="Start with Easy bots to learn tactics, move to Medium to sharpen strategy, then challenge Hard when you're ready for a real fight."
        />
        <TipCard
          code="PROTO-005"
          title="EVAL ANALYSIS"
          body="Blunders (200+ cp drop), Mistakes (100+ cp), Inaccuracies (50+ cp). Focus on eliminating blunders first — they have the biggest impact."
        />
      </div>

      <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <a
          href="/play/new?mode=bot"
          className="btn-primary text-center"
        >
          &gt; ENGAGE BOT
        </a>
        <a
          href="/play/new?mode=human"
          className="btn-secondary text-center"
        >
          &gt; CHALLENGE FRIEND
        </a>
      </div>
    </div>
  );
}

function TipCard({
  code,
  title,
  body,
}: {
  code: string;
  title: string;
  body: string;
}) {
  return (
    <div className="panel flex gap-3 sm:gap-4 group hover:border-phosphor/30 transition-all">
      <div className="flex flex-col items-center flex-shrink-0">
        <span className="text-[10px] font-mono text-phosphor-muted/50 tracking-widest writing-vertical"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
          {code}
        </span>
        <div className="flex-1 w-px bg-surface-border mt-2" />
      </div>
      <div>
        <h2 className="font-display text-sm font-semibold text-phosphor-dim mb-1 uppercase">{title}</h2>
        <p className="text-phosphor-muted text-sm leading-relaxed font-mono">{body}</p>
      </div>
    </div>
  );
}
