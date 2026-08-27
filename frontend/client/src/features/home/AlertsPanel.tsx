// Earthline Intelligence: alert actions use the signed-in farmer identity and the currently selected live resources.
import { useEffect, useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { createAlert, deleteAlert, getCurrentUser, listAlerts } from "@/api/client";
import { StatePanel } from "@/components/feedback/StatePanel";
import type { AlertSubscription } from "@/types/alerts";

type AlertsPanelProps = { commodity: string; market: string };

export function AlertsPanel({ commodity, market }: AlertsPanelProps) {
  const [subscriptions, setSubscriptions] = useState<AlertSubscription[]>([]);
  const [mobile, setMobile] = useState("");
  const [channel, setChannel] = useState("whatsapp");
  const [time, setTime] = useState("");
  const [language, setLanguage] = useState("en");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(Boolean(window.localStorage.getItem("croplens_access_token")));

  const load = async () => {
    const user = await getCurrentUser();
    setMobile(user.mobile_number);
    setLanguage(user.language || "en");
    const result = await listAlerts(user.mobile_number);
    setSubscriptions(result.subscriptions ?? []);
  };

  useEffect(() => {
    if (signedIn) void load().catch((requestError) => setError((requestError as { message?: string }).message ?? "Could not load your alert subscriptions."));
  }, [signedIn]);

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

  if (!signedIn) return <div className="alert-panel" id="alerts"><div className="alert-panel__heading"><span className="support-icon support-icon--amber"><Bell size={20} /></span><div><div className="card-kicker">Stay informed</div><h2>Receive your market decision</h2><p>Sign in to save your crop and mandi preferences and receive alerts.</p></div></div><a className="primary-button alert-link" href="/auth">Login or create account</a></div>;
  if (!commodity || !market) return <div className="alert-panel" id="alerts"><StatePanel kind="empty" title="Choose a crop and mandi first" message="Your alert will be connected to the live market selection." /></div>;

  return <div className="alert-panel" id="alerts"><div className="alert-panel__heading"><span className="support-icon support-icon--amber"><Bell size={20} /></span><div><div className="card-kicker">Stay informed</div><h2>Receive your market decision</h2><p>Selected market: {commodity} · {market}</p></div></div><div className="alert-form"><label className="field"><span>Channel</span><select value={channel} onChange={(event) => setChannel(event.target.value)}><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option><option value="both">WhatsApp and Telegram</option></select></label><label className="field"><span>Delivery time</span><input value={time} onChange={(event) => setTime(event.target.value)} type="time" required /></label><label className="field"><span>Language</span><select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="en">English</option><option value="hi">हिन्दी</option></select></label><button className="primary-button" type="button" disabled={busy || !time} onClick={() => void save()}><Check size={17} /> Save alert</button></div>{error ? <StatePanel kind="error" title="Alert action failed" message={error} /> : null}{message ? <div className="success-panel" role="status"><Check size={16} /> {message}</div> : null}<div className="subscription-list">{subscriptions.map((subscription) => <div className="subscription-row" key={subscription.id}><span><strong>{subscription.crop ?? "Selected crop"}</strong><small>{subscription.mandi ?? "Selected mandi"} · {subscription.channel ?? "Alert"} · {subscription.delivery_time ?? "Scheduled"}</small></span><button type="button" className="icon-button" disabled={busy} aria-label="Remove alert subscription" onClick={() => void remove(subscription.id)}><Trash2 size={16} /></button></div>)}</div></div>;
}
