import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type StickyMarketCtaProps = {
  anchorId: string;
  disabled: boolean;
  loading: boolean;
  onSubmit: (event?: FormEvent) => void;
};

export function StickyMarketCta({ anchorId, disabled, loading, onSubmit }: StickyMarketCtaProps) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const anchor = document.getElementById(anchorId);
    if (!anchor) {
      setVisible(false);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { threshold: 0, rootMargin: "-80px 0px 0px 0px" });
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [anchorId]);

  if (!visible) return null;

  return (
    <div className="sticky-market-cta">
      <button className="primary-button primary-button--ready" type="button" disabled={disabled || loading} onClick={() => onSubmit()}>
        <span>{loading ? t("checkingLiveMarket") : t("checkTodaysMarket")}</span>
        <ArrowRight size={18} />
      </button>
    </div>
  );
}
