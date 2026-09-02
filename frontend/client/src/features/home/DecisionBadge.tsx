import { useLanguage } from "@/contexts/LanguageContext";
import type { DecisionTone } from "@/lib/format";

type DecisionBadgeProps = {
  tone: DecisionTone;
};

export function DecisionBadge({ tone }: DecisionBadgeProps) {
  const { t } = useLanguage();
  const label = tone === "sell" ? t("decisionSell") : tone === "profit" ? t("decisionProfit") : t("decisionWait");

  return (
    <span className={`decision-badge decision-badge--${tone}`} aria-label={label}>
      {label}
    </span>
  );
}
