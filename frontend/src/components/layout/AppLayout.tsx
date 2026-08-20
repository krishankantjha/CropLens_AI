import { Bell, Home, MapPin, Sprout, User, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { BrandMark } from "@/components/brand/BrandMark";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Home", href: "/app", icon: Home },
  { label: "My Crop", href: "/my-crop", icon: Sprout },
  { label: "Mandi", href: "/mandi", icon: MapPin },
  { label: "Alerts", href: "/alerts", icon: Bell },
  { label: "Profile", href: "/profile", icon: User },
];

const CROPS = [
  { id: "Potato", label: "🥔 Potato" },
  { id: "Onion", label: "🧅 Onion" },
  { id: "Tomato", label: "🍅 Tomato" },
];

const MANDIS = [
  "Agra",
  "Mathura",
  "Azadpur",
  "Lasalgaon",
  "Indore",
  "Khanna",
  "Farrukhabad",
  "Karnal",
  "Guntur",
  "Kolkata"
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { status, user, logout, updateProfile } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8F7F2] pb-[calc(6rem+env(safe-area-inset-bottom))] text-[#17201B] lg:pb-0 font-['Manrope']">
      <header className="sticky top-0 z-40 border-b border-[#DDE4DE] bg-[#F8F7F2]/95 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/app" className="flex items-center gap-3"><BrandMark /></Link>

          {/* Center Crop & Mandi Selectors */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-[#DDE4DE] shadow-xs">
            <select
              value={user.primaryCrop}
              onChange={(e) => updateProfile({ primaryCrop: e.target.value })}
              className="bg-transparent text-xs font-black text-[#0E4D35] outline-none cursor-pointer"
              aria-label="Select Commodity"
            >
              {CROPS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            <span className="text-[#66716A] text-xs">·</span>

            <select
              value={user.homeMandi}
              onChange={(e) => updateProfile({ homeMandi: e.target.value })}
              className="bg-transparent text-xs font-black text-[#0E4D35] outline-none cursor-pointer"
              aria-label="Select Mandi"
            >
              {MANDIS.map((m) => (
                <option key={m} value={m}>
                  📍 {m} Mandi
                </option>
              ))}
            </select>
          </div>

          <div className="hidden items-center gap-6 lg:flex">
            <nav className="flex items-center gap-1" aria-label="Desktop application navigation">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B45]/40 ${
                      isActive ? "bg-[#176B45] text-white shadow-xs" : "text-[#66716A] hover:bg-[#E8F4ED] hover:text-[#0E4D35]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3 border-l border-[#DDE4DE] pl-6">
              {status === "guest" && (
                <span className="rounded-full bg-[#E8F4ED] px-3 py-1 text-xs font-extrabold text-[#176B45]">
                  Guest Session
                </span>
              )}
              <div className="text-right">
                <p className="text-xs font-extrabold text-[#0E4D35]">{user.name}</p>
                <p className="text-[11px] text-[#66716A]">{user.mobile}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1 rounded-full border border-[#DDE4DE] bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:border-rose-300 hover:bg-rose-50 transition cursor-pointer"
                title="Logout session"
              >
                <LogOut className="size-3.5" /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container pt-6 sm:pt-8">{children}</main>

      {/* Mobile Bottom Navigation */}
      <nav aria-label="Mobile bottom navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#DDE4DE] bg-white/95 px-3 pb-[calc(.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B45]/40 ${
                  isActive ? "text-[#176B45] font-black" : "text-[#66716A]"
                }`}
              >
                <Icon className="size-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
