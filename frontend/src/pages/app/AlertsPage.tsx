// Field Notes Intelligence reminder: every alert must answer what happened and what to do.
import { Bell, RefreshCw, TriangleAlert, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";

export default function AlertsPage() {
  const { alerts, simulateMarketChange } = useAuth();

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6 pb-16">
        <div className="flex items-center justify-between">
          <div>
            <div className="section-kicker">Notifications</div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em] text-[#0E4D35]">Market & weather alerts</h1>
          </div>
          <button type="button" onClick={simulateMarketChange} className="inline-flex items-center gap-2 rounded-full border border-[#DDE4DE] bg-white px-4 py-2 text-xs font-extrabold text-[#0E4D35] transition-colors hover:border-[#176B45]">
            <RefreshCw className="size-3.5" /> Trigger Shift
          </button>
        </div>

        <div className="space-y-4">
          {alerts.map((alert) => (
            <div key={alert.id} className={`rounded-[22px] border p-6 paper-shadow ${alert.tone === "caution" ? "border-[#F0D9B0] bg-[#FFF8E8]" : "border-[#DDE4DE] bg-white"}`}>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#176B45] shadow-sm">
                  <Bell className="size-3" /> {alert.category}
                </span>
                <span className="text-xs text-[#66716A]">{alert.time}</span>
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-[#17201B]">{alert.title}</h3>
              <p className="mt-1 text-sm leading-6 text-[#66716A]">{alert.body}</p>
              {alert.actionLabel && (
                <div className="mt-5 flex items-center justify-between border-t border-[#EDF0EB] pt-4">
                  <span className="text-xs font-bold text-[#D99A21]">Action required</span>
                  <Link href="/app" className="inline-flex items-center gap-1.5 rounded-full bg-[#176B45] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#0E4D35]">
                    {alert.actionLabel}
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
