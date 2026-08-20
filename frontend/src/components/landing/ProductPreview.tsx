import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Leaf, Sparkles, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";
import { cropLensService } from "@/services/cropLensService";
import type { CropKey, CropForecast } from "@/types/demo";

const crops: Array<{ key: CropKey; label: string; color: string }> = [
  { key: "potato", label: "Potato", color: "#C48B4A" },
  { key: "onion", label: "Onion", color: "#B47A81" },
  { key: "tomato", label: "Tomato", color: "#C95B43" },
];

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export function ProductPreview() {
  const [activeCrop, setActiveCrop] = useState<CropKey>("potato");
  const [showTechnical, setShowTechnical] = useState(false);
  const [forecast, setForecast] = useState<CropForecast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    cropLensService.getForecast(activeCrop, "Agra").then((data) => {
      if (mounted) {
        setForecast(data);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [activeCrop]);

  return (
    <div className="product-shell relative overflow-hidden rounded-[28px] border border-[#DDE4DE] bg-white shadow-[0_26px_80px_rgba(23,107,69,0.16)]">
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#E8F4ED] blur-3xl" aria-hidden="true" />
      <div className="relative border-b border-[#EDF0EB] px-5 pb-4 pt-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#0E4D35]">APMC Price Advisory</p>
            <p className="mt-1 text-xs text-[#66716A]">Live Mandi Intelligence · Agra Region</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-[#F8F7F2] px-2.5 py-1 text-[10px] font-bold text-[#66716A]">
            <span className="size-1.5 rounded-full bg-[#176B45]" aria-hidden="true" />
            Agra APMC
          </div>
        </div>
        <div className="mt-5 flex gap-2" role="tablist" aria-label="Select Commodity">
          {crops.map((crop) => {
            const isActive = crop.key === activeCrop;
            return (
              <button
                key={crop.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCrop(crop.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B45] focus-visible:ring-offset-2 ${isActive ? "border-[#176B45] bg-[#176B45] text-white" : "border-[#DDE4DE] bg-white text-[#66716A] hover:border-[#9DBDA8] hover:text-[#0E4D35]"}`}
              >
                <span className="mr-1.5 inline-block size-1.5 rounded-full" style={{ backgroundColor: crop.color }} aria-hidden="true" />
                {crop.label}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeCrop}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="relative px-5 pb-5 pt-5 sm:px-6"
        >
          {loading || !forecast ? (
            <div className="py-16 text-center">
              <div className="mx-auto size-8 rounded-full border-2 border-[#176B45] border-t-transparent animate-spin" />
              <p className="mt-3 text-xs font-bold text-[#66716A]">Fetching live 7-day model forecast...</p>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#0E4D35]">
                    <Leaf className="size-4 text-[#176B45]" />
                    {forecast.name} · {forecast.market}
                  </div>
                  <p className="mt-1 text-xs text-[#66716A]">{forecast.variety}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#66716A]">Today</p>
                  <motion.p key={forecast.today} initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} className="mt-0.5 text-[30px] font-extrabold leading-none tracking-[-0.05em] text-[#17201B]">
                    {money(forecast.today)}
                  </motion.p>
                  <p className="mt-1 text-[11px] text-[#66716A]">per quintal</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-[#F8F7F2] p-4">
                <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#66716A]">
                  <span>7-day price outlook</span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[#176B45] font-extrabold">LightGBM Model</span>
                </div>
                <div className="relative mt-5 grid grid-cols-3 gap-2">
                  <div className="absolute left-[9%] right-[9%] top-[27px] h-px bg-[#B8D8C5]" aria-hidden="true" />
                  {forecast.outlook.slice(0, 3).map((point) => (
                    <div key={point.day} className="relative z-10 text-center">
                      <div className={`mx-auto grid size-3 place-items-center rounded-full border-[3px] border-[#F8F7F2] ${point.recommended ? "bg-[#176B45] ring-4 ring-[#D1E6D9]" : "bg-[#9DBDA8]"}`} aria-hidden="true" />
                      <p className="mt-3 text-[11px] font-bold text-[#66716A]">{point.label}{point.recommended ? " · peak" : ""}</p>
                      <p className={`mt-1 text-sm font-extrabold ${point.recommended ? "text-[#176B45]" : "text-[#17201B]"}`}>{money(point.price)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 ${forecast.recommendationTone === "caution" ? "border-[#F0D9B0] bg-[#FFF8E8]" : "border-[#CBE3D3] bg-[#F1F8F3]"}`}>
                {forecast.recommendationTone === "caution" ? <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[#D99A21]" /> : <Check className="mt-0.5 size-4 shrink-0 text-[#176B45]" />}
                <div>
                  <p className="text-sm font-extrabold text-[#17201B]">{forecast.recommendation}</p>
                  <p className="mt-1 text-xs text-[#66716A]">{forecast.potentialUpside >= 0 ? `Potential upside: +${money(forecast.potentialUpside)}/qtl` : `Projected downside risk: ${money(Math.abs(forecast.potentialUpside))}/qtl`}</p>
                </div>
                <Sparkles className="ml-auto size-4 shrink-0 text-[#9DBDA8]" />
              </div>
            </>
          )}

          <button type="button" onClick={() => setShowTechnical((value) => !value)} aria-expanded={showTechnical} className="mt-4 flex w-full items-center justify-between border-t border-[#EDF0EB] pt-4 text-left text-xs font-bold text-[#176B45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B45] focus-visible:ring-offset-4 cursor-pointer">
            <span>Technical details →</span>
            <ChevronDown className={`size-4 transition-transform duration-200 ${showTechnical ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence initial={false}>
            {showTechnical && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="grid grid-cols-3 gap-2 pt-3 text-[11px] text-[#66716A]">
                  <div className="rounded-xl bg-[#F8F7F2] p-3"><span className="block font-extrabold text-[#0E4D35]">P10</span>Safety floor</div>
                  <div className="rounded-xl bg-[#F8F7F2] p-3"><span className="block font-extrabold text-[#0E4D35]">P50</span>Expected price</div>
                  <div className="rounded-xl bg-[#F8F7F2] p-3"><span className="block font-extrabold text-[#0E4D35]">P90</span>Potential upside</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
