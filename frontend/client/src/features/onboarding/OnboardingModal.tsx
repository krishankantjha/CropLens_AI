import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bell, Check, Leaf, MapPin, X } from "lucide-react";
import { createAlert, getResources, updatePreferences } from "@/api/client";
import { StatePanel } from "@/components/feedback/StatePanel";
import { MandiCombobox } from "@/features/home/MandiCombobox";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";
import { useOnboarding } from "@/hooks/useOnboarding";
import { dispatchOnboardingComplete } from "@/lib/onboarding";
import { appToast } from "@/lib/toast";
import { isPlaceholderFarmerName } from "@/lib/user";
import type { ResourceEntry, ResourceOption } from "@/types/api";

type Step = 1 | 2 | 3;

function normalizeMandis(entries: ResourceEntry[]): ResourceOption[] {
  return entries.map((item) => (typeof item === "string" ? { id: item, label: item } : item));
}

export function OnboardingModal() {
  const { language, setLanguage, t } = useLanguage();
  const { setUser } = useSession();
  const { shouldShow, complete, skip, user } = useOnboarding();

  const [step, setStep] = useState<Step>(1);
  const [fullName, setFullName] = useState("");
  const [homeMandi, setHomeMandi] = useState("");
  const [preferredCrop, setPreferredCrop] = useState("");
  const [enableAlerts, setEnableAlerts] = useState(false);
  const [deliveryTime, setDeliveryTime] = useState("09:00");
  const [commodities, setCommodities] = useState<ResourceOption[]>([]);
  const [markets, setMarkets] = useState<ResourceOption[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const needsName = isPlaceholderFarmerName(user?.full_name);

  useEffect(() => {
    if (!shouldShow) return;
    setStep(1);
    setFullName(needsName ? "" : user?.full_name ?? "");
    setHomeMandi(user?.home_mandi ?? "");
    setPreferredCrop(user?.preferred_commodity ?? "");
    setEnableAlerts(false);
    setDeliveryTime("09:00");
    setError("");
  }, [shouldShow, user?.home_mandi, user?.preferred_commodity, user?.full_name, needsName]);

  useEffect(() => {
    if (!shouldShow) return;
    let active = true;
    setResourcesLoading(true);
    setResourcesError("");
    void getResources()
      .then((resources) => {
        if (!active) return;
        setCommodities(resources.commodities ?? []);
        setMarkets(normalizeMandis(resources.mandis ?? []));
      })
      .catch(() => {
        if (!active) return;
        setResourcesError(t("couldNotLoadChoices"));
      })
      .finally(() => {
        if (active) setResourcesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [shouldShow, t]);

  const stepMeta = useMemo(
    () => [
      { title: t("onboardingMandiTitle"), description: t("onboardingMandiIntro"), icon: MapPin },
      { title: t("onboardingCropTitle"), description: t("onboardingCropIntro"), icon: Leaf },
      { title: t("onboardingAlertTitle"), description: t("onboardingAlertIntro"), icon: Bell },
    ],
    [t],
  );

  if (!shouldShow || !user) return null;

  const current = stepMeta[step - 1];
  const StepIcon = current.icon;

  const handleSkip = () => {
    skip();
  };

  const goNext = () => {
    setError("");
    if (step === 1 && needsName && !fullName.trim()) {
      setError(t("enterName"));
      return;
    }
    if (step === 1 && !homeMandi) {
      setError(t("selectMandi"));
      return;
    }
    if (step === 2 && !preferredCrop) {
      setError(t("selectCrop"));
      return;
    }
    setStep((value) => (value < 3 ? ((value + 1) as Step) : value));
  };

  const finish = async () => {
    if (needsName && !fullName.trim()) {
      setError(t("enterName"));
      return;
    }
    if (!homeMandi || !preferredCrop) {
      setError(t("invalidSelection"));
      return;
    }
    if (enableAlerts && !deliveryTime) {
      setError(t("chooseDeliveryTime"));
      return;
    }

    setBusy(true);
    setError("");
    try {
      const updated = await updatePreferences({
        ...(fullName.trim() && fullName.trim() !== user.full_name ? { full_name: fullName.trim() } : {}),
        home_mandi: homeMandi,
        preferred_commodity: preferredCrop,
        language,
      });
      setUser(updated);
      setLanguage(language);

      if (enableAlerts && user.mobile_number) {
        await createAlert({
          mobile_number: user.mobile_number,
          channel: "whatsapp",
          crop: preferredCrop,
          mandi: homeMandi,
          delivery_time: deliveryTime,
          language,
        });
        appToast.success(t("toastAlertSaved"));
      }

      dispatchOnboardingComplete({
        commodity: preferredCrop,
        market: homeMandi,
        autoCheckMarket: true,
      });
      complete();
      appToast.success(t("onboardingComplete"));
    } catch (requestError) {
      setError((requestError as { message?: string }).message ?? t("couldNotSavePreferences"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onboarding-overlay" role="presentation">
      <div
        className="onboarding-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
        lang={language}
      >
        <div className="onboarding-modal__head">
          <span className="onboarding-modal__step">{t("onboardingStepLabel").replace("{current}", String(step)).replace("{total}", "3")}</span>
          <div className="onboarding-steps" aria-hidden="true">
            {[1, 2, 3].map((dot) => (
              <span key={dot} className={`onboarding-step-dot${dot === step ? " onboarding-step-dot--active" : dot < step ? " onboarding-step-dot--done" : ""}`} />
            ))}
          </div>
          <button type="button" className="onboarding-skip" onClick={handleSkip} disabled={busy}>
            {t("onboardingSkip")}
          </button>
        </div>

        <div className="onboarding-modal__icon">
          <StepIcon size={22} />
        </div>
        <h2 id="onboarding-title">{current.title}</h2>
        <p id="onboarding-description" className="onboarding-modal__intro">{current.description}</p>

        {resourcesError ? (
          <StatePanel kind="error" title={t("couldNotLoadChoices")} message={resourcesError} actionLabel={t("retry")} onAction={() => window.location.reload()} />
        ) : null}

        {step === 1 ? (
          <>
            {needsName ? (
              <label className="field onboarding-field">
                <span>{t("fullName")}</span>
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" placeholder={t("enterName")} disabled={busy} required />
              </label>
            ) : null}
            <div className="onboarding-field">
              <span className="field-label">{t("homeMandi")}</span>
              <MandiCombobox items={markets} value={homeMandi} onChange={setHomeMandi} disabled={resourcesLoading || busy} />
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <label className="field onboarding-field">
            <span>{t("preferredCrop")}</span>
            <select value={preferredCrop} onChange={(event) => setPreferredCrop(event.target.value)} disabled={resourcesLoading || busy}>
              <option value="">{t("selectCrop")}</option>
              {commodities.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        ) : null}

        {step === 3 ? (
          <div className="onboarding-alert-block">
            <label className="onboarding-check">
              <input type="checkbox" checked={enableAlerts} onChange={(event) => setEnableAlerts(event.target.checked)} disabled={busy} />
              <span>{t("onboardingEnableAlerts")}</span>
            </label>
            {enableAlerts ? (
              <label className="field">
                <span>{t("deliveryTime")}</span>
                <input type="time" value={deliveryTime} onChange={(event) => setDeliveryTime(event.target.value)} disabled={busy} required />
              </label>
            ) : null}
            <p className="form-note">{t("onboardingAlertOptional")}</p>
          </div>
        ) : null}

        {error ? <StatePanel kind="error" title={t("serviceCouldNotLoadTitle")} message={error} /> : null}

        <div className="onboarding-modal__actions">
          {step < 3 ? (
            <button type="button" className="primary-button onboarding-action" onClick={goNext} disabled={resourcesLoading || busy}>
              <span>{t("onboardingNext")}</span>
              <ArrowRight size={18} />
            </button>
          ) : (
            <button type="button" className="primary-button onboarding-action" onClick={() => void finish()} disabled={resourcesLoading || busy}>
              <span>{busy ? t("pleaseWait") : t("onboardingSaveAndGo")}</span>
              <Check size={18} />
            </button>
          )}
        </div>

        <button type="button" className="onboarding-close" onClick={handleSkip} aria-label={t("onboardingSkip")} disabled={busy}>
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
