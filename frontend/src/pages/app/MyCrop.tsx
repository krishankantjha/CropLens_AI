// Field Notes Intelligence reminder: keep My Crop decision-oriented.
import { ArrowRight, Sprout, Warehouse, ShieldAlert } from "lucide-react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";

export default function MyCrop() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-8 pb-16">
        <div>
          <div className="section-kicker">Harvest profile</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em] text-[#0E4D35]">My Crop & Infrastructure</h1>
          <p className="mt-1 text-sm text-[#66716A]">Your active harvest configuration used for price forecasts and net profit calculations.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-[24px] border border-[#DDE4DE] bg-white p-6 paper-shadow space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-[#E8F4ED] text-[#176B45]"><Sprout className="size-6" /></span>
              <div>
                <p className="text-xs font-bold text-[#66716A]">Primary Crop</p>
                <h3 className="text-xl font-extrabold text-[#0E4D35]">{user.primaryCrop}</h3>
              </div>
            </div>
            <div className="border-t border-[#EDF0EB] pt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[#66716A]">Typical Quantity</span><span className="font-extrabold">{user.quantity}</span></div>
              <div className="flex justify-between"><span className="text-[#66716A]">Home Mandi</span><span className="font-extrabold">{user.homeMandi}</span></div>
              <div className="flex justify-between"><span className="text-[#66716A]">Storage Capacity</span><span className="font-extrabold">{user.storage}</span></div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#DDE4DE] bg-white p-6 paper-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-[#E8F4ED] text-[#176B45]"><Warehouse className="size-6" /></span>
                <div>
                  <p className="text-xs font-bold text-[#66716A]">Advisory Status</p>
                  <h3 className="text-xl font-extrabold text-[#0E4D35]">Active & Monitored</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#66716A]">Your harvest is monitored against live market arrivals, regional weather, and transport pricing.</p>
            </div>
            <Link href="/app" className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#176B45] px-5 py-3 text-xs font-extrabold text-white hover:bg-[#0E4D35]">
              View Today's Advisory <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
