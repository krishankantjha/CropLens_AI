// Earthline Intelligence: alert actions use the signed-in farmer identity and the currently selected live resources.
import { useEffect, useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { createAlert, deleteAlert, getCurrentUser, listAlerts } from "@/api/client";
import { StatePanel } from "@/components/feedback/StatePanel";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";
import type { AlertSubscription } from "@/types/alerts";

type AlertsPanelProps = { commodity: string; market: string };

export function AlertsPanel({ commodity, market }: AlertsPanelProps) {
  const { language: appLanguage, setLanguage, t } = useLanguage();
  const { isAuthenticated } = useSession();
  const [subscriptions, setSubscriptions] = useState<AlertSubscription[]>([]);
  const [mobile, setMobile] = useState("");
  const [channel, setChannel] = useState("whatsapp");
  const [time, setTime] = useState("");
  const [language, setLocalLanguage] = useState<Language>(appLanguage);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");


  const load = async () => {
    const user = await getCurrentUser();
    setMobile(user.mobile_number);
    const nextLanguage: Language = user.language === "hi" ? "hi" : "en";
    setLocalLanguage(nextLanguage); setLanguage(nextLanguage);
    const result = await listAlerts(user.mobile_number);
    setSubscriptions(result.subscriptions ?? []);
  };

  useEffect(() => {
    if (isAuthenticated) void load().catch((requestError) => setError((requestError as { message?: string }).message ?? "Could not load your alert subscriptions."));
  }, [isAuthenticated]);

  const save = async () => {
    if (!commodity || !market || !mobile || !time) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await createAlert({ mobile_number: mobile, channel, crop: commodity, mandi: market, delivery_time: time, language });
      setMessage(result.message ?? "Your alert subscription was saved.");
      await load();
    } catch (requestError) { setError((requestError as { message?: string }).message ?? "Could not save the alert subscription."); }
    finally { setBusy(false); }
  };

  const remove = async (id: number) => {
    setBusy(true); setError("");
    try { await deleteAlert(id, mobile); await load(); setMessage("The alert subscription was removed."); }
    catch (requestError) { setError((requestError as { message?: string }).message ?? "Could not remove the subscription."); }
    finally { setBusy(false); }
  };

  if (!isAuthenticated) return <div className="alert-panel" id="alerts"><div className="alert-panel__heading"><span className="support-icon support-icon--amber"><Bell size={20} /></span><div><div className="card-kicker">{t("stayInformed")}</div><h2>{t("receiveDecision")}</h2><p>{t("signInAlerts")}</p></div></div><a className="primary-button alert-link" href="/auth">{t("loginOrCreate")}</a></div>;
  if (!commodity || !market) return <div className="alert-panel" id="alerts"><StatePanel kind="empty" title={t("chooseFirst")} message={t("alertConnected")} /></div>;

  return <div className="alert-panel" id="alerts"><div className="alert-panel__heading"><span className="support-icon support-icon--amber"><Bell size={20} /></span><div><div className="card-kicker">{t("stayInformed")}</div><h2>{t("receiveDecision")}</h2><p>{t("selectedMarket")}: {commodity} · {market}</p></div></div><div className="alert-form"><label className="field"><span>{t("channel")}</span><select value={channel} onChange={(event) => setChannel(event.target.value)}><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option><option value="both">WhatsApp and Telegram</option></select></label><label className="field"><span>{t("deliveryTime")}</span><input value={time} onChange={(event) => setTime(event.target.value)} type="time" required /></label><label className="field"><span>{t("language")}</span><select value={language} onChange={(event) => { const next = event.target.value as Language; setLocalLanguage(next); setLanguage(next); }}><option value="en">English</option><option value="hi">हिन्दी</option></select></label><button className="primary-button" type="button" disabled={busy || !time} onClick={() => void save()}><Check size={17} /> {t("saveAlert")}</button></div>{error ? <StatePanel kind="error" title={t("alertActionFailed")} message={error} /> : null}{message ? <div className="success-panel" role="status"><Check size={16} /> {message}</div> : null}<div className="subscription-list">{subscriptions.map((subscription) => <div className="subscription-row" key={subscription.id}><span><strong>{subscription.crop ?? "Selected crop"}</strong><small>{subscription.mandi ?? "Selected mandi"} · {subscription.channel ?? "Alert"} · {subscription.delivery_time ?? "Scheduled"}</small></span><button type="button" className="icon-button" disabled={busy} aria-label={t("removeAlert")} onClick={() => void remove(subscription.id)}><Trash2 size={16} /></button></div>)}</div></div>;
}
