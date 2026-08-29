// Earthline Intelligence: a calm, mobile-first shell that keeps the farmer's next action visible.
import { useEffect, useState } from "react";
import { Bell, ChartNoAxesCombined, Globe2, Home, MapPin, Moon, ShieldAlert, Sun, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { getHealth } from "@/api/client";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSession } from "@/contexts/SessionContext";

type AppShellProps = { children: ReactNode };

export function AppShell({ children }: AppShellProps) {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated } = useSession();
  const [serviceState, setServiceState] = useState<"checking" | "live" | "unavailable">("checking");
  useEffect(() => {
    let active = true;
    getHealth().then((health) => { if (active) setServiceState(health.status === "healthy" || health.status === "operational" || health.status === "live" ? "live" : "unavailable"); }).catch(() => { if (active) setServiceState("unavailable"); });
    return () => { active = false; };
  }, []);
  const navItems = [
    { label: t("home"), href: "#home", icon: Home }, { label: t("forecast"), href: "#forecast", icon: ChartNoAxesCombined }, { label: t("marketRisk"), href: "#risk", icon: ShieldAlert }, { label: t("bestMandi"), href: "#mandi", icon: MapPin }, { label: t("alerts"), href: "#alerts", icon: Bell }, { label: t("farmerProfile"), href: "/profile", icon: UserRound },
  ];
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label={`${t("home")} CropLens AI`}>
          <img src="/logo-icon.png" alt="" className="brand-icon-img" />
          <span className="brand-title-group">
            <strong>CropLens AI</strong>
            <small>Your market. Your decision.</small>
          </span>
        </a>
        <nav className="desktop-nav" aria-label={t("home")}>{navItems.map(({ label, href, icon: Icon }) => <a key={href} href={href}><Icon size={17} />{label}</a>)}</nav>
        <div className="topbar-actions">
          <button className="language-button" type="button" aria-label={t("changeLanguage")} onClick={() => setLanguage(language === "en" ? "hi" : "en")}><Globe2 size={17} /> <span>{language === "en" ? "English / हिन्दी" : "हिन्दी / English"}</span></button>
          <button className="theme-button" type="button" aria-label={theme === "dark" ? t("switchToLight") : t("switchToDark")} title={theme === "dark" ? t("switchToLight") : t("switchToDark")} onClick={toggleTheme}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
          <span className={`service-pill service-pill--${serviceState}`}><span className="service-dot" />{serviceState === "checking" ? t("checking") : serviceState === "live" ? t("live") : t("unavailable")}</span>
          <a className="account-button" href="/profile" aria-label={t("farmerProfile")}><UserRound size={17} /><span>{t("farmerProfile")}</span></a>
        </div>
      </header>
      <main>{children}</main>
      <nav className="mobile-nav" aria-label={t("home")}>{navItems.map(({ label, href, icon: Icon }) => <a key={href} href={href}><Icon size={20} /><span>{label === t("marketRisk") ? (language === "en" ? "Risk" : "जोखिम") : label}</span></a>)}</nav>
    </div>
  );
}
