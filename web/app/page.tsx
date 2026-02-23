import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
      {/* Hero */}
      <div className="text-center mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-6">
          No account needed
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-5 tracking-tight leading-tight">
          Chess with friends,
          <br />
          <span className="text-amber-400">one link away</span>
        </h1>
        <p className="text-zinc-400 text-base sm:text-lg max-w-lg mx-auto leading-relaxed mb-8">
          Create a game, share the link, and play instantly.
          Real-time multiplayer chess with move validation and post-game analysis.
        </p>
        <Link
          href="/play/new"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl text-base transition-colors shadow-lg shadow-amber-500/20"
        >
          Create a Game
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>

      {/* How it works */}
      <div className="grid sm:grid-cols-3 gap-6 mb-12 sm:mb-16">
        <Step num="1" title="Create" description="Set your color preference and start a new game." />
        <Step num="2" title="Share" description="Copy the invite link and send it to your friend." />
        <Step num="3" title="Play" description="Your friend opens the link and the game begins instantly." />
      </div>

      {/* Feature cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <FeatureCard
          href="/play/new"
          icon={<LinkIcon />}
          title="Play a Friend"
          description="Generate an invite link and start playing in seconds. No signup required."
          cta="Start game"
        />
        <FeatureCard
          href="/learn"
          icon={<ChartIcon />}
          title="Review & Improve"
          description="After every game, review blunders, mistakes, and key moments with engine analysis."
          cta="Learn more"
        />
      </div>

      {/* Features list */}
      <div className="mt-12 sm:mt-16 border-t border-zinc-800 pt-8">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4 text-center">Features</h3>
        <div className="grid sm:grid-cols-2 gap-3 text-sm text-zinc-400">
          {[
            "Real-time moves over WebSocket",
            "Server-side move validation",
            "Resumable games via unique link",
            "Engine-powered post-game review",
            "Blunder / Mistake / Inaccuracy detection",
            "In-game hint system",
            "Legal move highlighting",
            "Drag-drop + click-to-move",
          ].map((f) => (
            <div key={f} className="flex items-center gap-2">
              <span className="text-amber-400/80 text-xs">&#9679;</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step({ num, title, description }: { num: string; title: string; description: string }) {
  return (
    <div className="text-center sm:text-left">
      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-bold mb-3">
        {num}
      </div>
      <h3 className="text-white font-semibold mb-1">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureCard({
  href,
  icon,
  title,
  description,
  cta,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-zinc-800 hover:border-amber-500/40 bg-zinc-900/50 p-6 flex flex-col gap-4 transition-all group"
    >
      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">{title}</h2>
        <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
      </div>
      <span className="self-start text-amber-400 text-sm font-medium group-hover:underline">
        {cta} &rarr;
      </span>
    </Link>
  );
}

function LinkIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-5.56a4.5 4.5 0 00-6.364 6.364L12 10.5" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}
