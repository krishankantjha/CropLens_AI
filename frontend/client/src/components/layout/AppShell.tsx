// Earthline Intelligence: a calm, mobile-first shell that keeps the farmer's next action visible.
import { useEffect, useState } from "react";
import { Bell, ChartNoAxesCombined, Globe2, Home, Leaf, MapPin, ShieldAlert, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { getHealth } from "@/api/client";

const navItems = [
  { label: "Home", href: "#home", icon: Home },
  { label: "Forecast", href: "#forecast", icon: ChartNoAxesCombined },
  { label: "Market Risk", href: "#risk", icon: ShieldAlert },
  { label: "Best Mandi", href: "#mandi", icon: MapPin },
  { label: "Alerts", href: "#alerts", icon: Bell },
];

type AppShellProps = { children: ReactNode };

export function AppShell({ children }: AppShellProps) {
  const [serviceState, setServiceState] = useState<"checking" | "live" | "unavailable">("checking");
  useEffect(() => {
    let active = true;
    getHealth().then((health) => {
      if (active) setServiceState(health.status === "operational" || health.status === "live" ? "live" : "unavailable");
    }).catch(() => { if (active) setServiceState("unavailable"); });
    return () => { active = false; };
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="CropLens AI home">
          <span className="brand-mark"><img src="/manus-storage/croplens-leaf-lens-mark_4789cd4d.png" alt="" /><span className="lens-dot" /></span>
          <span><strong>CropLens AI</strong><small>Your market. Your decision.</small></span>
        </a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map(({ label, href, icon: Icon }) => <a key={href} href={href}><Icon size={17} />{label}</a>)}
        </nav>
        <div className="topbar-actions">
          <button className="language-button" type="button" aria-label="Change language"><Globe2 size={17} /> <span>English / हिन्दी</span></button>
          <span className={`service-pill service-pill--${serviceState}`}><span className="service-dot" />{serviceState === "checking" ? "Checking" : serviceState === "live" ? "Live" : "Unavailable"}</span>
          <a className="account-button" href="/auth"><UserRound size={17} /><span>Account</span></a>
        </div>
      </header>
      <main>{children}</main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.map(({ label, href, icon: Icon }) => <a key={href} href={href}><Icon size={20} /><span>{label === "Market Risk" ? "Risk" : label}</span></a>)}
      </nav>
    </div>
  );
}
