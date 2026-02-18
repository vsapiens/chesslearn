export default function LearnPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-white mb-2">Learn & Improve</h1>
      <p className="text-zinc-400 mb-10">
        Use every game as a learning opportunity. Here's how to get the most out of ChessLearn.
      </p>

      <div className="grid gap-5">
        <TipCard
          title="Post-Game Review"
          icon="🔍"
          body="After every game, click Review Game to see engine analysis. Each move is classified as Best, Good, Inaccuracy, Mistake, or Blunder."
        />
        <TipCard
          title="Key Moments"
          icon="⚡"
          body="The review highlights up to 5 critical moments where the game turned. Study these positions to understand what went wrong."
        />
        <TipCard
          title="Use Hints Wisely"
          icon="💡"
          body="You get 3 hints per game. Save them for positions where you're truly stuck — they reveal the engine's best move."
        />
        <TipCard
          title="Play Bots at Your Level"
          icon="🤖"
          body="Start with Easy bots to learn tactics, move to Medium to sharpen strategy, then challenge Hard when you're ready for a real fight."
        />
        <TipCard
          title="Eval Drop = Learning Signal"
          icon="📊"
          body="Blunders (200+ cp drop), Mistakes (100+ cp), Inaccuracies (50+ cp). Focus on eliminating blunders first — they have the biggest impact."
        />
      </div>

      <div className="mt-12 flex gap-4">
        <a
          href="/play/new?mode=bot"
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-sm transition-colors"
        >
          Play a Bot Now
        </a>
        <a
          href="/play/new?mode=human"
          className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
        >
          Challenge a Friend
        </a>
      </div>
    </div>
  );
}

function TipCard({
  title,
  icon,
  body,
}: {
  title: string;
  icon: string;
  body: string;
}) {
  return (
    <div className="flex gap-4 p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <div>
        <h2 className="font-semibold text-white mb-1">{title}</h2>
        <p className="text-zinc-400 text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
