import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Bell, Globe2, Home, LogIn, Moon, MoreHorizontal, Sun, UserRound } from "lucide-react";
import { Link, useLocation } from "wouter";

import { getHealth, type HealthResponse } from "@/api/client";
import { formatDataAsOf, formatMarketDate } from "@/lib/format";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OnboardingModal } from "@/features/onboarding/OnboardingModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";
import { useTheme } from "@/contexts/ThemeContext";
import { hasMarketCheckedBefore, MARKET_CHECKED_EVENT } from "@/lib/homeExperience";

type AppShellProps = { children: ReactNode };

type ServiceState = "checking" | "live" | "degraded" | "unavailable";

type NavItem = {
  label: string;
  href: string;
  hash: string;
  icon: LucideIcon;
};

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
  const [liveHealth, setLiveHealth] = useState<HealthResponse | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [alertsNavEnabled, setAlertsNavEnabled] = useState(() => hasMarketCheckedBefore());
  const prefsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncHash = () => setHash(currentHash());
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    const syncAlertsNav = () => setAlertsNavEnabled(hasMarketCheckedBefore());
    window.addEventListener(MARKET_CHECKED_EVENT, syncAlertsNav);
    return () => window.removeEventListener(MARKET_CHECKED_EVENT, syncAlertsNav);
  }, []);

  useEffect(() => {
    let active = true;
    const load = () => {
      getHealth()
        .then((health) => {
          if (!active) return;
          setLiveHealth(health);
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

  const showAlertsNav = isAuthenticated || alertsNavEnabled;

  const mainNav = useMemo(() => {
    const items: NavItem[] = [{ label: t("navMarket"), href: "/#home", hash: "#home", icon: Home }];
    if (showAlertsNav) items.push({ label: t("alerts"), href: "/#alerts", hash: "#alerts", icon: Bell });
    return items;
  }, [showAlertsNav, t]);

  const accountNavItem: NavItem =
    isSessionReady && isAuthenticated
      ? { label: t("account"), href: "/profile", hash: "", icon: UserRound }
      : { label: t("login"), href: "/auth", hash: "", icon: LogIn };

  const mobileNav = [...mainNav, accountNavItem];
  const isDark = resolvedTheme === "dark";

  const serviceLabel =
    serviceState === "checking" ? t("checking") : serviceState === "live" ? t("live") : serviceState === "degraded" ? t("degraded") : t("unavailable");

  const serviceTooltip = useMemo(() => {
    if (serviceState === "checking") return t("serviceStatusChecking");
    if (serviceState === "degraded") return t("serviceStatusDegraded");
    if (serviceState === "unavailable") return t("serviceStatusUnavailable");
    if (!liveHealth?.last_sync_at && liveHealth?.live_data_status === "historical") {
      return t("serviceStatusLiveHistorical");
    }
    const mandiDate = liveHealth?.latest_mandi_date
      ? formatMarketDate(liveHealth.latest_mandi_date, language)
      : null;
    const syncTime = liveHealth?.last_sync_at
      ? formatDataAsOf(new Date(liveHealth.last_sync_at), language)
      : null;
    if (liveHealth?.live_data_status === "fresh" && syncTime && mandiDate) {
      return t("serviceStatusLiveFresh").replace("{syncTime}", syncTime).replace("{mandiDate}", mandiDate);
    }
    if (mandiDate && (liveHealth?.live_data_status === "partial" || syncTime)) {
      return t("serviceStatusLivePartial").replace("{mandiDate}", mandiDate);
    }
    return t("serviceStatusLive");
  }, [language, liveHealth, serviceState, t]);

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "hi" : "en");
    setPrefsOpen(false);
  };

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
    setPrefsOpen(false);
  };

  const renderNavLink = (item: NavItem, iconSize: number, mobile = false) => {
    const { label, href, hash: itemHash, icon: Icon } = item;
    const active = itemHash ? location === "/" && hash === itemHash : location === href;
    return (
      <a
        key={href}
        href={href}
        className={active ? "nav-link--active" : undefined}
        aria-current={active ? "page" : undefined}
      >
        <Icon size={iconSize} />
        {mobile ? <span>{label}</span> : label}
      </a>
    );
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
          {mainNav.map((item) => renderNavLink(item, 17))}
        </nav>

        <div className="topbar-actions">
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

      <nav
        className={`mobile-nav${mobileNav.length === 2 ? " mobile-nav--duo" : ""}`}
        aria-label={t("mobileNav")}
      >
        {mobileNav.map((item) => renderNavLink(item, 20, true))}
      </nav>
    </div>
  );
}
