import { WifiOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function OfflineBanner() {
  const { t } = useLanguage();

  return (
    <div className="offline-banner" role="status">
      <WifiOff size={17} aria-hidden />
      <span>{t("offlineBannerMessage")}</span>
    </div>
  );
}
