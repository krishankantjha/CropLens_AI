// Field Notes Intelligence reminder: history records previous decisions clearly.
import { Calendar, CheckCircle2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";

export default function HistoryPage() {
  const { history } = useAuth();

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6 pb-16">
        <div>
          <div className="section-kicker">Archive</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em] text-[#0E4D35]">Your decision history</h1>
          <p className="mt-1 text-sm text-[#66716A]">A log of past harvest advisory recommendations and outcomes.</p>
        </div>

        <div className="space-y-4">
          {history.map((item) => (
            <div key={item.id} className="rounded-[22px] border border-[#DDE4DE] bg-white p-6 paper-shadow">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#F8F7F2] px-3 py-1 text-xs font-bold text-[#66716A]">
                  <Calendar className="size-3.5 text-[#176B45]" /> {item.date}
                </span>
                <span className="rounded-full bg-[#E8F4ED] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.1em] text-[#176B45]">
                  {item.crop} · {item.market}
                </span>
              </div>
              <p className="mt-4 text-base font-extrabold text-[#17201B]">{item.decision}</p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[#176B45]">
                <CheckCircle2 className="size-4" /> Completed advisory session
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
