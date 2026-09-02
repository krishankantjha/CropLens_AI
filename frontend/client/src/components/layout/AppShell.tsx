import { useEffect, useState } from "react";
import { Bell, ChartNoAxesCombined, Globe2, Home, MapPin, Moon, ShieldAlert, Sun, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { getHealth } from "@/api/client";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";

type AppShellProps = { children: ReactNode };
type ServiceState = "checking" | "live" | "degraded" | "unavailable";

function currentHash() {
  return window.location.hash || "#home";
}

export function AppShell({ children }: AppShellProps) {
  const { language, setLanguage, t } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const [location] = useLocation();
  const [hash, setHash] = useState(currentHash);
  const [serviceState, setServiceState] = useState<ServiceState>("checking");

  useEffect(() => {
    const syncHash = () => setHash(currentHash());
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    let active = true;
    const load = () => {
      getHealth()
        .then((health) => {
          if (!active) return;
          if (health.status === "healthy" || health.status === "operational" || health.status === "live") setServiceState("live");
          else if (health.status === "degraded") setServiceState("degraded");
          else setServiceState("unavailable");
        })
        .catch(() => {
          if (active) setServiceState("unavailable");
        });
    };
    load();
    const timer = window.setInterval(load, 60000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const mainNav = [
    { label: t("home"), href: "/#home", hash: "#home", icon: Home },
    { label: t("forecast"), href: "/#forecast", hash: "#forecast", icon: ChartNoAxesCombined },
    { label: t("marketRisk"), href: "/#risk", hash: "#risk", icon: ShieldAlert },
    { label: t("bestMandi"), href: "/#mandi", hash: "#mandi", icon: MapPin },
    { label: t("alerts"), href: "/#alerts", hash: "#alerts", icon: Bell },
  ];
  const profileItem = { label: t("farmerProfile"), href: "/profile", hash: "", icon: UserRound };
  const mobileNav = [...mainNav, profileItem];

  const isDark = resolvedTheme === "dark";
  const serviceLabel = serviceState === "checking" ? t("checking") : serviceState === "live" ? t("live") : serviceState === "degraded" ? t("degraded") : t("unavailable");

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">{t("skipToContent")}</a>
      <header className="topbar">
        <a className="brand" href="/#home" aria-label={`${t("home")} CropLens AI`}>
          <BrandLogo size={40} className="brand-icon-img" />
          <span className="brand-title-group">
            <strong>CropLens AI</strong>
            <small>Your market. Your decision.</small>
          </span>
        </a>
        <nav className="desktop-nav" aria-label={t("siteNav")}>
          {mainNav.map(({ label, href, hash: itemHash, icon: Icon }) => {
            const active = itemHash ? location === "/" && hash === itemHash : location === href;
            return (
              <a key={href} href={href} className={active ? "nav-link--active" : undefined} aria-current={active ? "page" : undefined}>
                <Icon size={17} />{label}
              </a>
            );
          })}
        </nav>
        <div className="topbar-actions">
          <button className="language-button" type="button" aria-label={t("changeLanguage")} onClick={() => setLanguage(language === "en" ? "hi" : "en")}>
            <Globe2 size={17} /> <span>{language === "en" ? "English / हिन्दी" : "हिन्दी / English"}</span>
          </button>
          <button
            className="language-button theme-button"
            type="button"
            aria-label={t("switchTheme")}
            aria-pressed={isDark}
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
            <span className="sr-only">{isDark ? t("lightMode") : t("darkMode")}</span>
          </button>
          <span className={`service-pill service-pill--${serviceState}`}>
            <span className="service-dot" />
            {serviceLabel}
          </span>
          <Link className="account-button" href="/profile" aria-label={t("farmerProfile")}>
            <UserRound size={17} />
            <span>{t("farmerProfile")}</span>
          </Link>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="site-footer">
        <strong>CropLens AI</strong> · {t("footerTagline")}
      </footer>
      <nav className="mobile-nav" aria-label={t("mobileNav")}>
        {mobileNav.map(({ label, href, hash: itemHash, icon: Icon }) => {
          const active = itemHash ? location === "/" && hash === itemHash : location === href;
          return (
            <a key={href} href={href} className={active ? "nav-link--active" : undefined} aria-current={active ? "page" : undefined}>
              <Icon size={20} />
              <span>{label === t("marketRisk") ? (language === "en" ? "Risk" : "जोखिम") : label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
