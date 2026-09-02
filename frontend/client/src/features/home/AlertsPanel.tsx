import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Bell, Check, Trash2 } from "lucide-react";
import { createAlert, deleteAlert, getCurrentUser, listAlerts } from "@/api/client";
import { StatePanel } from "@/components/feedback/StatePanel";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";
import { appToast } from "@/lib/toast";
import type { AlertSubscription } from "@/types/alerts";

type AlertsPanelProps = {
  commodity: string;
  market: string;
  showGuestPrompt?: boolean;
};
type RequestError = { message?: string };

export function AlertsPanel({ commodity, market, showGuestPrompt = false }: AlertsPanelProps) {
  const { language: appLanguage, t } = useLanguage();
  const { isAuthenticated } = useSession();
  const [subscriptions, setSubscriptions] = useState<AlertSubscription[]>([]);
  const [mobile, setMobile] = useState("");
  const [channel, setChannel] = useState("whatsapp");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [time, setTime] = useState("");
  const [language, setLocalLanguage] = useState<Language>(appLanguage);
  const [busy, setBusy] = useState(false);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setSubscriptionsLoading(true);
    setSubscriptionError("");
    try {
      const user = await getCurrentUser({ notifyUnauthorized: false });
      setMobile(user.mobile_number ?? "");
      const nextLanguage: Language = user.language === "hi" ? "hi" : "en";
      setLocalLanguage(nextLanguage);
      if (!user.mobile_number) throw new Error(t("addMobileAlert"));
      const result = await listAlerts(user.mobile_number);
      setSubscriptions(result.subscriptions ?? []);
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void load().catch((requestError: RequestError) => setSubscriptionError(requestError.message ?? t("alertsLoadFailed")));
    }
  }, [isAuthenticated, t]);

  const save = async () => {
    if (!commodity || !market) { setError(t("chooseCropMandiAlert")); return; }
    if (!mobile) { setError(t("addMobileAlert")); return; }
    if (!time) { setError(t("chooseDeliveryTime")); return; }
    if ((channel === "telegram" || channel === "both") && !telegramChatId.trim()) { setError(t("enterTelegramChatId")); return; }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await createAlert({ mobile_number: mobile, channel, crop: commodity, mandi: market, delivery_time: time, language, telegram_chat_id: telegramChatId.trim() || undefined });
      const savedMessage = result.message ?? t("toastAlertSaved");
      appToast.success(savedMessage);
      setMessage(savedMessage);
      await load();
    } catch (requestError) {
      setError((requestError as RequestError).message ?? t("alertSaveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm(t("confirmRemoveAlert"))) return;
    setBusy(true);
    setError("");
    try {
      await deleteAlert(id, mobile);
      await load();
      appToast.success(t("toastAlertRemoved"));
      setMessage(t("alertRemoved"));
    } catch (requestError) {
      setError((requestError as RequestError).message ?? t("alertRemoveFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (!isAuthenticated) {
    if (!showGuestPrompt) {
      return <span id="alerts" className="section-anchor" aria-hidden="true" />;
    }
    return (
      <div className="alert-panel" id="alerts">
        <div className="alert-panel__heading">
          <span className="support-icon support-icon--amber"><Bell size={20} /></span>
          <div>
            <div className="card-kicker">{t("stayInformed")}</div>
            <h2>{t("receiveDecision")}</h2>
            <p>{t("signInAlerts")}</p>
          </div>
        </div>
        <Link className="primary-button alert-link" href="/auth">{t("loginOrCreate")}</Link>
      </div>
    );
  }
  if (!commodity || !market) {
    return <div className="alert-panel" id="alerts"><StatePanel kind="empty" title={t("chooseFirst")} message={t("alertConnected")} /></div>;
  }

  return (
    <div className="alert-panel" id="alerts">
      <div className="alert-panel__heading">
        <span className="support-icon support-icon--amber"><Bell size={20} /></span>
        <div>
          <div className="card-kicker">{t("stayInformed")}</div>
          <h2>{t("receiveDecision")}</h2>
          <p>{t("selectedMarket")}: {commodity} · {market}</p>
        </div>
      </div>
      <div className="alert-form">
        <label className="field">
          <span>{t("channel")}</span>
          <select value={channel} onChange={(event) => setChannel(event.target.value)}>
            <option value="whatsapp">{t("whatsappChannel")}</option>
            <option value="telegram">{t("telegramChannel")}</option>
            <option value="both">{t("bothChannels")}</option>
          </select>
        </label>
        {channel === "telegram" || channel === "both" ? (
          <label className="field">
            <span>{t("telegramChatId")}</span>
            <input value={telegramChatId} onChange={(event) => setTelegramChatId(event.target.value)} inputMode="numeric" placeholder="e.g. 123456789" required />
          </label>
        ) : null}
        <label className="field">
          <span>{t("deliveryTime")}</span>
          <input value={time} onChange={(event) => setTime(event.target.value)} type="time" required />
        </label>
        <label className="field">
          <span>{t("alertLanguage")}</span>
          <select value={language} onChange={(event) => setLocalLanguage(event.target.value as Language)}>
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
          </select>
        </label>
        <button className="primary-button" type="button" disabled={busy} onClick={() => void save()}><Check size={17} /> {t("saveAlert")}</button>
      </div>
      {error ? <StatePanel kind="error" title={t("alertActionFailed")} message={error} /> : null}
      {message ? <div className="success-panel" role="status"><Check size={16} /> {message}</div> : null}
      {subscriptionsLoading ? <div className="form-note" role="status">{t("alertsLoading")}</div> : null}
      {subscriptionError ? <StatePanel kind="error" title={t("alertActionFailed")} message={subscriptionError} actionLabel={t("retryAlerts")} onAction={() => void load().catch((requestError: RequestError) => setSubscriptionError(requestError.message ?? t("alertsLoadFailed")))} /> : null}
      <div className="subscription-list">
        {subscriptions.map((subscription) => (
          <div className="subscription-row" key={subscription.id}>
            <span>
              <strong>{subscription.crop ?? "—"}</strong>
              <small>{[subscription.mandi, subscription.channel, subscription.delivery_time].filter(Boolean).join(" · ") || "—"}</small>
            </span>
            <button type="button" className="icon-button-danger" disabled={busy} aria-label={t("removeAlert")} onClick={() => void remove(subscription.id)}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
