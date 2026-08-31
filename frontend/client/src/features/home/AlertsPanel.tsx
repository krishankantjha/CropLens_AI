// Earthline Intelligence: alert actions use the signed-in farmer identity and the currently selected live resources.
import { useEffect, useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { createAlert, deleteAlert, getCurrentUser, listAlerts } from "@/api/client";
import { StatePanel } from "@/components/feedback/StatePanel";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";
import type { AlertSubscription } from "@/types/alerts";

type AlertsPanelProps = { commodity: string; market: string };

type RequestError = { message?: string };

export function AlertsPanel({ commodity, market }: AlertsPanelProps) {
  const { language: appLanguage, setLanguage, t } = useLanguage();
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
      const user = await getCurrentUser();
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
    if (!commodity || !market) {
      setError(t("chooseCropMandiAlert"));
      return;
    }
    if (!mobile) {
      setError(t("addMobileAlert"));
      return;
    }
    if (!time) {
      setError(t("chooseDeliveryTime"));
      return;
    }
    if ((channel === "telegram" || channel === "both") && !telegramChatId.trim()) {
      setError(t("enterTelegramChatId"));
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await createAlert({ mobile_number: mobile, channel, crop: commodity, mandi: market, delivery_time: time, language, telegram_chat_id: telegramChatId.trim() || undefined });
      setMessage(result.message ?? t("alertSaved"));
      await load();
    } catch (requestError) {
      setError((requestError as RequestError).message ?? t("alertSaveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setBusy(true);
    setError("");
    try {
      await deleteAlert(id, mobile);
      await load();
      setMessage(t("alertRemoved"));
    } catch (requestError) {
      setError((requestError as RequestError).message ?? t("alertRemoveFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (!isAuthenticated) return <div className="alert-panel" id="alerts"><div className="alert-panel__heading"><span className="support-icon support-icon--amber"><Bell size={20} /></span><div><div className="card-kicker">{t("stayInformed")}</div><h2>{t("receiveDecision")}</h2><p>{t("signInAlerts")}</p></div></div><a className="primary-button alert-link" href="/auth">{t("loginOrCreate")}</a></div>;
  if (!commodity || !market) return <div className="alert-panel" id="alerts"><StatePanel kind="empty" title={t("chooseFirst")} message={t("alertConnected")} /></div>;

  return <div className="alert-panel" id="alerts"><div className="alert-panel__heading"><span className="support-icon support-icon--amber"><Bell size={20} /></span><div><div className="card-kicker">{t("stayInformed")}</div><h2>{t("receiveDecision")}</h2><p>{t("selectedMarket")}: {commodity} · {market}</p></div></div><div className="alert-form"><label className="field"><span>{t("channel")}</span><select value={channel} onChange={(event) => setChannel(event.target.value)}><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option><option value="both">WhatsApp and Telegram</option></select></label>{channel === "telegram" || channel === "both" ? <label className="field"><span>Telegram chat ID</span><input value={telegramChatId} onChange={(event) => setTelegramChatId(event.target.value)} inputMode="numeric" placeholder="e.g. 123456789" required /></label> : null}<label className="field"><span>{t("deliveryTime")}</span><input value={time} onChange={(event) => setTime(event.target.value)} type="time" required /></label><label className="field"><span>{t("language")}</span><select value={language} onChange={(event) => { const next = event.target.value as Language; setLocalLanguage(next); setLanguage(next); }}><option value="en">English</option><option value="hi">हिन्दी</option></select></label><button className="primary-button" type="button" disabled={busy} onClick={() => void save()}><Check size={17} /> {t("saveAlert")}</button></div>{error ? <StatePanel kind="error" title={t("alertActionFailed")} message={error} /> : null}{message ? <div className="success-panel" role="status"><Check size={16} /> {message}</div> : null}{subscriptionsLoading ? <div className="form-note" role="status">{t("alertsLoading")}</div> : null}{subscriptionError ? <StatePanel kind="error" title={t("alertActionFailed")} message={subscriptionError} actionLabel={t("retryAlerts")} onAction={() => void load().catch((requestError: RequestError) => setSubscriptionError(requestError.message ?? t("alertsLoadFailed")))} /> : null}<div className="subscription-list">{subscriptions.map((subscription) => <div className="subscription-row" key={subscription.id}><span><strong>{subscription.crop ?? "Selected crop"}</strong><small>{subscription.mandi ?? "Selected mandi"} · {subscription.channel ?? "Alert"} · {subscription.delivery_time ?? "Scheduled"}</small></span><button type="button" className="icon-button" disabled={busy} aria-label={t("removeAlert")} onClick={() => void remove(subscription.id)}><Trash2 size={16} /></button></div>)}</div></div>;
}
