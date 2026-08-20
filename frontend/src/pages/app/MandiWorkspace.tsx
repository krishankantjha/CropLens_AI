import { ArrowRight, MapPin, Star, Truck, Calculator, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { MandiMap } from "@/components/mandi/MandiMap";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { cropLensService } from "@/services/cropLensService";
import { demoMandis } from "@/data/demo";
import type { Mandi } from "@/types/demo";

const money = (val: number) => `₹${val.toLocaleString("en-IN")}`;

export default function MandiWorkspace() {
  const { user } = useAuth();
  const initialQty = parseInt(user.quantity.replace(/\D/g, '')) || 50;
  const [quantity, setQuantity] = useState(initialQty);
  const [mandis, setMandis] = useState<Mandi[]>(demoMandis);

  useEffect(() => {
    async function loadMandiData() {
      const data = await cropLensService.getMandis(user.primaryCrop, user.homeMandi);
      setMandis(data);
    }
    loadMandiData();
  }, [user.primaryCrop, user.homeMandi]);

  const handleDownloadPdf = () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    window.open(`${apiBase}/api/v1/procurement/pdf?commodity=${encodeURIComponent(user.primaryCrop)}&market=${encodeURIComponent(user.homeMandi)}`, '_blank');
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-8 pb-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="section-kicker">Mandi workspace</div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em] text-[#0E4D35]">Compare nearby mandis</h1>
            <p className="mt-1 text-sm text-[#66716A]">Net revenue after estimated transport costs for {user.primaryCrop} in {user.homeMandi}.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Interactive Harvest Quantity Stepper */}
            <div className="flex items-center gap-2 rounded-2xl border border-[#DDE4DE] bg-white p-2 shrink-0">
              <Calculator className="size-4 text-[#176B45]" />
              <span className="text-xs font-bold text-[#66716A]">Batch Size:</span>
              <input
                type="number"
                min="1"
                max="1000"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-16 rounded-xl border border-[#DDE4DE] bg-[#F8F7F2] px-2 py-1 text-center font-extrabold text-sm text-[#0E4D35] outline-none focus:border-[#176B45]"
              />
              <span className="text-xs font-extrabold text-[#0E4D35]">qtl</span>
            </div>

            {/* Export PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#D99A21] hover:bg-[#c78b19] px-3.5 py-2.5 text-xs font-extrabold text-[#17201B] shadow-sm transition-colors cursor-pointer shrink-0"
              title="Download Procurement PDF Report"
            >
              <Download className="size-3.5" /> PDF Report
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="space-y-4">
            <div className="hidden overflow-hidden rounded-[24px] border border-[#DDE4DE] bg-white paper-shadow sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F8F7F2] text-[10px] font-extrabold uppercase tracking-[.15em] text-[#66716A]">
                  <tr>
                    <th className="px-5 py-4">Mandi</th>
                    <th className="px-5 py-4">Distance</th>
                    <th className="px-5 py-4">Rate</th>
                    <th className="px-5 py-4">Total Freight</th>
                    <th className="px-5 py-4">Estimated Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF0EB]">
                  {mandis.map((mandi) => {
                    const freightPerQtl = mandi.freightCost || (mandi.transport ? mandi.transport / 50 : 20);
                    const totalFreight = Math.round(freightPerQtl * quantity);
                    const grossRevenue = mandi.rate * quantity;
                    const netMoney = grossRevenue - totalFreight;

                    return (
                      <tr key={mandi.name} className={mandi.featured ? "bg-[#E8F4ED]/50 font-bold" : ""}>
                        <td className="px-5 py-4 text-[#0E4D35]">
                          {mandi.name}
                          {mandi.featured && <span className="ml-2 rounded-full bg-[#D99A21] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[.1em] text-white">Best net</span>}
                        </td>
                        <td className="px-5 py-4 text-[#66716A]">{mandi.distance}</td>
                        <td className="px-5 py-4 data-mono">{money(mandi.rate)}</td>
                        <td className="px-5 py-4 data-mono text-rose-700 font-semibold">-₹{totalFreight.toLocaleString('en-IN')}</td>
                        <td className="px-5 py-4 data-mono font-extrabold text-[#176B45]">₹{netMoney.toLocaleString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 sm:hidden">
              {mandis.map((mandi) => {
                const freightPerQtl = mandi.freightCost || (mandi.transport ? mandi.transport / 50 : 20);
                const totalFreight = Math.round(freightPerQtl * quantity);
                const grossRevenue = mandi.rate * quantity;
                const netMoney = grossRevenue - totalFreight;

                return (
                  <div key={mandi.name} className={`rounded-[22px] border p-5 ${mandi.featured ? "border-[#176B45] bg-[#E8F4ED]/40 paper-shadow" : "border-[#DDE4DE] bg-white"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-extrabold text-[#0E4D35]">{mandi.name}</span>
                      {mandi.featured && <span className="rounded-full bg-[#D99A21] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[.1em] text-white">⭐ Best Net Profit</span>}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#EDF0EB] pt-4 text-xs">
                      <div><span className="text-[#66716A]">Distance</span><p className="mt-0.5 font-bold text-[#17201B]">{mandi.distance}</p></div>
                      <div><span className="text-[#66716A]">Rate</span><p className="mt-0.5 font-bold text-[#17201B]">{money(mandi.rate)} / qtl</p></div>
                      <div><span className="text-[#66716A]">Total Freight</span><p className="mt-0.5 font-bold text-rose-700">-₹{totalFreight.toLocaleString('en-IN')}</p></div>
                      <div><span className="text-[#66716A]">Estimated Net</span><p className="mt-0.5 data-mono text-sm font-extrabold text-[#176B45]">₹{netMoney.toLocaleString('en-IN')}</p></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <MandiMap />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
