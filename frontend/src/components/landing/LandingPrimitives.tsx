// Field Notes Intelligence reminder: each primitive should make the answer, explanation, risk, detail, and next action legible in that order.
import { ArrowUpRight, CalendarDays, Map, Route, Scale, type LucideIcon } from "lucide-react";
import type { MarketSignal, SignalTone } from "@/types/demo";

const iconMap: Record<string, LucideIcon> = { scale: Scale, calendar: CalendarDays, map: Map, route: Route };

export function SectionHeading({ eyebrow, title, body, align = "left" }: { eyebrow: string; title: string; body?: string; align?: "left" | "center" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <div className={`section-kicker ${align === "center" ? "justify-center" : ""}`}>{eyebrow}</div>
      <h2 className="mt-4 text-[clamp(2rem,4vw,3.2rem)] font-extrabold leading-[1.05] tracking-[-0.055em] text-[#0E4D35]">{title}</h2>
      {body && <p className="mt-4 max-w-xl text-base leading-7 text-[#66716A] sm:text-lg">{body}</p>}
    </div>
  );
}

export function DecisionCard({ title, body, icon, onClick }: { title: string; body: string; icon: string; onClick: () => void }) {
  const Icon = iconMap[icon] ?? Scale;
  return (
    <button type="button" onClick={onClick} className="group flex min-h-[180px] flex-col justify-between rounded-2xl border border-[#DDE4DE] bg-white p-5 text-left paper-shadow transition-all duration-200 hover:-translate-y-1 hover:border-[#9DBDA8] hover:shadow-[0_18px_38px_rgba(23,107,69,.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B45] focus-visible:ring-offset-4 sm:p-6">
      <span className="grid size-10 place-items-center rounded-xl bg-[#E8F4ED] text-[#176B45]"><Icon className="size-5" /></span>
      <span>
        <span className="flex items-center justify-between gap-4 text-[17px] font-extrabold tracking-[-0.02em] text-[#17201B]">{title}<ArrowUpRight className="size-4 text-[#9DBDA8] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#176B45]" /></span>
        <span className="mt-2 block text-sm leading-6 text-[#66716A]">{body}</span>
      </span>
    </button>
  );
}

const toneClass: Record<SignalTone, string> = {
  favorable: "bg-[#E8F4ED] text-[#176B45]",
  neutral: "bg-[#F1F2EC] text-[#66716A]",
  caution: "bg-[#FFF3D6] text-[#8A641B]",
  negative: "bg-[#FBE7E7] text-[#A23C3C]",
};

export function StatusBadge({ tone, children }: { tone: SignalTone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${toneClass[tone]}`}><span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{children}</span>;
}

export function SignalRow({ signal, active, onClick }: { signal: MarketSignal; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={active} className="w-full border-b border-[#EDF0EB] py-4 text-left last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B45] focus-visible:ring-offset-2">
      <span className="flex items-center gap-3">
        <span className={`grid size-9 place-items-center rounded-xl text-sm font-extrabold ${toneClass[signal.tone]}`}>{signal.icon}</span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-[#17201B]">{signal.label}</span><span className="mt-0.5 block text-xs text-[#66716A]">{signal.value}</span></span>
        <span className={`text-xs font-extrabold ${signal.tone === "favorable" ? "text-[#176B45]" : signal.tone === "caution" ? "text-[#8A641B]" : "text-[#66716A]"}`}>{active ? "Hide" : "Why?"}</span>
      </span>
      {active && <span className="mt-3 block pl-12 text-xs leading-5 text-[#66716A]">{signal.explanation}</span>}
    </button>
  );
}

export function DemoStateCard({ kind }: { kind: "loading" | "error" | "empty" }) {
  const copy = {
    loading: { title: "Analyzing current market conditions...", body: "This reusable loading state is ready for a future live data connection." },
    error: { title: "We couldn't refresh today's market data.", body: "Try again when the service is connected in a future phase." },
    empty: { title: "No forecast is available yet.", body: "We don't have enough reliable market data to give you a recommendation." },
  }[kind];
  return <div className="rounded-2xl border border-[#DDE4DE] bg-white p-5"><p className="text-sm font-extrabold text-[#17201B]">{copy.title}</p><p className="mt-2 text-sm leading-6 text-[#66716A]">{copy.body}</p><button type="button" className="mt-4 text-sm font-extrabold text-[#176B45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B45]">{kind === "error" ? "Try Again" : "Explore Market"}</button></div>;
}
