import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Bell, Globe2, Home, LogIn, Moon, MoreHorizontal, Sun, UserRound } from "lucide-react";
import { Link, useLocation } from "wouter";

import { getHealth } from "@/api/client";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OnboardingModal } from "@/features/onboarding/OnboardingModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";
import { useTheme } from "@/contexts/ThemeContext";

type AppShellProps = { children: ReactNode };

type ServiceState = "checking" | "live" | "degraded" | "unavailable";

function currentHash() {
  return window.location.hash || "#home";
}

export function AppShell({ children }: AppShellProps) {
  const { language, setLanguage, t } = useLanguage();
  const { isAuthenticated, isSessionReady } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const [location] = useLocation();
  const [hash, setHash] = useState(currentHash);
  const [serviceState, setServiceState] = useState<ServiceState>("checking");
  const [prefsOpen, setPrefsOpen] = useState(false);
  const prefsRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!prefsOpen) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (prefsRef.current && !prefsRef.current.contains(event.target as Node)) setPrefsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPrefsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [prefsOpen]);

  const mainNav = [
    { label: t("navMarket"), href: "/#home", hash: "#home", icon: Home },
    { label: t("alerts"), href: "/#alerts", hash: "#alerts", icon: Bell },
  ];

  const accountNavItem =
    isSessionReady && isAuthenticated
      ? { label: t("account"), href: "/profile", hash: "", icon: UserRound }
      : { label: t("login"), href: "/auth", hash: "", icon: LogIn };

  const mobileNav = [...mainNav, accountNavItem];
  const isDark = resolvedTheme === "dark";

  const serviceLabel =
    serviceState === "checking" ? t("checking") : serviceState === "live" ? t("live") : serviceState === "degraded" ? t("degraded") : t("unavailable");

  const serviceTooltip = useMemo(() => {
    if (serviceState === "checking") return t("serviceStatusChecking");
    if (serviceState === "live") return t("serviceStatusLive");
    if (serviceState === "degraded") return t("serviceStatusDegraded");
    return t("serviceStatusUnavailable");
  }, [serviceState, t]);

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "hi" : "en");
    setPrefsOpen(false);
  };

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
    setPrefsOpen(false);
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {t("skipToContent")}
      </a>
      <header className="topbar">
        <a className="brand" href="/#home" aria-label={`${t("navMarket")} CropLens AI`}>
          <BrandLogo size={40} className="brand-icon-img" />
          <span className="brand-title-group">
            <strong>CropLens AI</strong>
            <small>{t("brandTagline")}</small>
          </span>
        </a>

        <nav className="desktop-nav" aria-label={t("siteNav")}>
          {mainNav.map(({ label, href, hash: itemHash, icon: Icon }) => {
            const active = itemHash ? location === "/" && hash === itemHash : location === href;
            return (
              <a key={href} href={href} className={active ? "nav-link--active" : undefined} aria-current={active ? "page" : undefined}>
                <Icon size={17} />
                {label}
              </a>
            );
          })}
        </nav>

        <div className="topbar-actions">
          <div className="topbar-prefs-desktop">
            <button
              className="language-button"
              type="button"
              aria-label={language === "en" ? t("changeLanguageToHindi") : t("changeLanguageToEnglish")}
              aria-pressed={language === "hi"}
              onClick={toggleLanguage}
            >
              <Globe2 size={17} /> <span>{language === "en" ? "English" : "हिन्दी"}</span>
            </button>
            <button
              className="language-button theme-button"
              type="button"
              aria-label={t("switchTheme")}
              aria-pressed={isDark}
              onClick={toggleTheme}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
              <span className="sr-only">{isDark ? t("lightMode") : t("darkMode")}</span>
            </button>
          </div>

          <div className="topbar-prefs-overflow" ref={prefsRef}>
            <button
              className="language-button topbar-overflow-trigger"
              type="button"
              aria-label={t("topbarOverflowMenu")}
              aria-haspopup="menu"
              aria-expanded={prefsOpen}
              onClick={() => setPrefsOpen((open) => !open)}
            >
              <MoreHorizontal size={18} />
            </button>
            {prefsOpen ? (
              <div className="topbar-overflow-menu" role="menu" aria-label={t("themeGroup")}>
                <button className="topbar-overflow-item" type="button" role="menuitem" onClick={toggleLanguage}>
                  <Globe2 size={17} aria-hidden />
                  <span>{language === "en" ? t("switchToHindi") : t("switchToEnglish")}</span>
                </button>
                <button className="topbar-overflow-item" type="button" role="menuitem" onClick={toggleTheme}>
                  {isDark ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
                  <span>{isDark ? t("lightMode") : t("darkMode")}</span>
                </button>
              </div>
            ) : null}
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className={`service-pill service-pill--${serviceState}`} aria-label={serviceTooltip}>
                <span className="service-dot" aria-hidden />
                <span className="service-pill__label">{serviceLabel}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="service-pill-tooltip">
              {serviceTooltip}
            </TooltipContent>
          </Tooltip>

          {isSessionReady && isAuthenticated ? (
            <Link className="account-button" href="/profile" aria-label={t("accountSignedInHint")} title={t("accountSignedInHint")}>
              <UserRound size={17} />
              <span>{t("account")}</span>
            </Link>
          ) : (
            <Link className="account-button" href="/auth" aria-label={t("login")}>
              <LogIn size={17} />
              <span>{t("login")}</span>
            </Link>
          )}
        </div>
      </header>

      {serviceState === "unavailable" ? <OfflineBanner /> : null}
      <OnboardingModal />

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
              <span>{label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
