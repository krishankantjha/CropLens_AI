import { Link } from "wouter";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useLanguage } from "@/contexts/LanguageContext";

export default function NotFoundPage() {
  const { t } = useLanguage();
  return (
    <main className="error-boundary" role="status">
      <section className="error-boundary__card">
        <BrandLogo size={48} />
        <p className="eyebrow">CropLens AI</p>
        <h1>{t("notFoundTitle")}</h1>
        <p className="error-boundary__message">{t("notFoundMessage")}</p>
        <Link className="primary-button error-boundary__action" href="/">{t("goHome")}</Link>
      </section>
    </main>
  );
}
