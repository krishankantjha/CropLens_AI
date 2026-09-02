import { Link } from "wouter";
import { ShieldAlert } from "lucide-react";
import { LoadingSkeleton } from "@/features/home/LoadingSkeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import type { RiskResponse } from "@/types/api";
import type { ReactNode } from "react";

type RiskWorkspaceProps = {
  isAuthenticated: boolean;
  loading: boolean;
  errorPanel: ReactNode;
  risk: RiskResponse | null;
};

function riskSummary(risk: RiskResponse, hasWarnings: boolean, unusual: string, allClear: string): string {
  if (risk.message?.trim()) return risk.message.trim();
  if (hasWarnings) return unusual;
  return allClear;
}

export function RiskWorkspace({ isAuthenticated, loading, errorPanel, risk }: RiskWorkspaceProps) {
  const { t } = useLanguage();
  const riskRecords = risk?.anomalies ?? risk?.records ?? [];
  const hasWarnings = riskRecords.length > 0;

  if (!isAuthenticated) {
    return (
      <article className="support-card gated-card support-card--risk risk-workspace" id="risk">
        <div className="support-icon support-icon--amber">
          <ShieldAlert size={20} />
        </div>
        <div>
          <span className="card-kicker">{t("marketWarning")}</span>
          <h3>{t("marketRisk")}</h3>
          <p>{t("signInForRisk")}</p>
          <Link className="primary-button alert-link" href="/auth">
            {t("loginOrCreate")}
          </Link>
        </div>
      </article>
    );
  }

  if (loading) {
    return (
      <article className="support-card support-card--risk risk-workspace" id="risk">
        <div className="support-icon support-icon--amber">
          <ShieldAlert size={20} />
        </div>
        <div>
          <span className="card-kicker">{t("checkingMarketRisk")}</span>
          <LoadingSkeleton label={t("reviewingMovement")} />
        </div>
      </article>
    );
  }

  if (errorPanel) {
    return (
      <article className="support-card support-card--risk risk-workspace" id="risk">
        <div className="support-icon support-icon--amber">
          <ShieldAlert size={20} />
        </div>
        <div>{errorPanel}</div>
      </article>
    );
  }

  if (!risk) return null;

  const headline = hasWarnings ? t("riskWatchOut") : t("riskAllClear");
  const detail = riskSummary(risk, hasWarnings, t("unusualPriceMovement"), t("noRiskWarnings"));

  return (
    <article className={`support-card support-card--risk risk-workspace${hasWarnings ? " risk-workspace--alert" : " risk-workspace--clear"}`} id="risk">
      <div className="support-icon support-icon--amber">
        <ShieldAlert size={20} />
      </div>
      <div className="risk-workspace__content">
        <span className="card-kicker">{t("marketWarning")}</span>
        <h3>{headline}</h3>
        <p className="risk-workspace__message">{detail}</p>
      </div>
    </article>
  );
}
