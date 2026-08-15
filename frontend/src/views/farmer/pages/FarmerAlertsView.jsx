import React, { useState, useEffect } from 'react';
import { Bell, Zap, CheckCircle, MessageSquare, Send, Clock, ShieldCheck, Phone, Check, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import {
  fetchSupplyShocks,
  subscribeAlertApi,
  fetchSubscriptionsApi,
  deleteSubscriptionApi,
  testWhatsappAlertApi,
  testTelegramAlertApi,
  dispatchAlertsNowApi,
  fetchAlertLogsApi
} from '../../../services/api';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';

export default function FarmerAlertsView({ crop, mandi }) {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const isHi = lang === 'hi';

  const [shocks, setShocks] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [mobileNumber, setMobileNumber] = useState(user?.mobile_number || "9876543210");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("07:00 AM");
  const [channel, setChannel] = useState("whatsapp");

  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    async function loadAlertData() {
      setLoading(true);
      try {
        const [shockData, subData, logData] = await Promise.all([
          fetchSupplyShocks(crop, mandi).catch(() => null),
          fetchSubscriptionsApi(mobileNumber).catch(() => null),
          fetchAlertLogsApi(10).catch(() => null)
        ]);

        setShocks(shockData?.shocks || []);
        setSubscriptions(subData?.subscriptions || []);
        setLogs(logData?.logs || []);
      } catch (err) {
        console.warn("Alert data fetch warning:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAlertData();
  }, [crop, mandi, mobileNumber]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 5000);
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await subscribeAlertApi({
        mobile_number: mobileNumber,
        telegram_chat_id: telegramChatId || null,
        channel: channel,
        crop: crop,
        mandi: mandi,
        delivery_time: deliveryTime,
        language: lang
      });

      showToast(isHi ? `✅ ${res.message}` : `✅ ${res.message}`);
      const updatedSubs = await fetchSubscriptionsApi(mobileNumber).catch(() => null);
      if (updatedSubs?.subscriptions) setSubscriptions(updatedSubs.subscriptions);
    } catch (err) {
      showToast(isHi ? "❌ सदस्यता सहेजने में त्रुटि" : "❌ Failed to save alert subscription");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSub = async (subId) => {
    try {
      await deleteSubscriptionApi(subId);
      setSubscriptions(subscriptions.filter(s => s.id !== subId));
      showToast(isHi ? "सदस्यता हटाई गई" : "Subscription removed");
    } catch (err) {
      showToast(isHi ? "त्रुटि" : "Error removing subscription");
    }
  };

  const handleTestWhatsApp = async () => {
    showToast(isHi ? "⚡ व्हाट्सएप टेस्ट भेजा जा रहा है..." : "⚡ Sending test WhatsApp alert...");
    try {
      const res = await testWhatsappAlertApi({
        mobile_number: mobileNumber,
        crop: crop,
        mandi: mandi,
        lang: lang
      });
      if (res.deeplink_url) {
        window.open(res.deeplink_url, '_blank');
      }
      showToast(isHi ? `✅ टेस्ट व्हाट्सएप संदेश तैयार!` : `✅ WhatsApp test alert dispatched!`);
      const logData = await fetchAlertLogsApi(10).catch(() => null);
      if (logData?.logs) setLogs(logData.logs);
    } catch (err) {
      showToast(isHi ? "व्हाट्सएप टेस्ट विफल" : "WhatsApp test failed");
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramChatId) {
      showToast(isHi ? "⚠️ कृपया अपना टेलीग्राम चैट आईडी दर्ज करें" : "⚠️ Please enter your Telegram Chat ID");
      return;
    }
    showToast(isHi ? "⚡ टेलीग्राम पुश भेजा जा रहा है..." : "⚡ Sending Telegram push alert...");
    try {
      const res = await testTelegramAlertApi({
        chat_id: telegramChatId,
        crop: crop,
        mandi: mandi,
        lang: lang
      });
      showToast(isHi ? `✅ ${res.message}` : `✅ ${res.message}`);
      const logData = await fetchAlertLogsApi(10).catch(() => null);
      if (logData?.logs) setLogs(logData.logs);
    } catch (err) {
      showToast(isHi ? "टेलीग्राम टेस्ट विफल" : "Telegram test failed");
    }
  };

  const handleManualDispatchNow = async () => {
    showToast(isHi ? "⚡ सभी सक्रिय सलाह भेजी जा रही हैं..." : "⚡ Executing morning advisory dispatch...");
    try {
      const res = await dispatchAlertsNowApi();
      showToast(isHi ? `✅ ${res.message}` : `✅ ${res.message}`);
      const logData = await fetchAlertLogsApi(10).catch(() => null);
      if (logData?.logs) setLogs(logData.logs);
    } catch (err) {
      showToast(isHi ? "सलाह प्रेषण विफल" : "Advisory dispatch failed");
    }
  };

  return (
    <div className="space-y-6 font-['Inter']">
      {/* Toast Banner */}
      {toastMsg && (
        <div className="p-4 rounded-2xl bg-emerald-900 text-emerald-100 border border-emerald-700 text-xs font-bold shadow-lg flex items-center justify-between animate-fade-in">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="text-emerald-300 font-extrabold hover:text-white ml-3">✕</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-xs uppercase tracking-wider">
            <Bell className="h-4 w-4" />
            {isHi ? "मल्टी-चैनल लाइव बाजार अलर्ट केंद्र" : "Dual-Channel Real-Time Alert Dispatcher"}
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">
            {isHi ? `दैनिक अलर्ट एवं सूचनाएं (${crop} - ${mandi})` : `Daily Alerts & Subscriptions (${crop} - ${mandi})`}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {isHi
              ? "व्हाट्सएप (1-क्लिक wa.me) और टेलीग्राम (100% फ्री पुश) द्वारा प्रतिदिन प्रातः 07:00 बजे सटीक मंडी सलाह प्राप्त करें।"
              : "Receive automated daily 07:00 AM market advisories via direct WhatsApp and free Telegram server-push."}
          </p>
        </div>

        <button
          onClick={handleManualDispatchNow}
          className="px-4 py-2.5 rounded-2xl bg-emerald-50 text-[#046c4e] border border-emerald-200 font-extrabold text-xs hover:bg-emerald-100 flex items-center gap-2 transition shadow-sm self-start md:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {isHi ? "⚡ अभी सभी अलर्ट भेजें (टेस्ट)" : "⚡ Trigger Morning Dispatch Now"}
        </button>
      </div>

      {/* Grid: Channel 1 (WhatsApp) & Channel 2 (Telegram) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel 1: WhatsApp Advisory */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-sm">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {isHi ? "चैनल 1: व्हाट्सएप दैनिक सलाह" : "Channel 1: WhatsApp Daily Advisory"}
                </h3>
                <span className="text-[11px] font-bold text-emerald-700">100% Free · wa.me Deep-Link</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
              Active
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {isHi
              ? "रोजाना सुबह 07:00 बजे आपके व्हाट्सएप नंबर पर हिंदी सलाह, अनुमानित भाव और ध्वनि संदेश लिंक भेजा जाएगा।"
              : "Automated morning WhatsApp alert with recommended holding/selling advisory, peak day price target, and audio voice note."}
          </p>

          <form onSubmit={handleSubscribe} className="space-y-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {isHi ? "व्हाट्सएप मोबाइल नंबर" : "WhatsApp Mobile Number"}
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="9876543210"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isHi ? "डिलीवरी समय" : "Delivery Time"}
                </label>
                <select
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="07:00 AM">07:00 AM (प्रातः)</option>
                  <option value="08:00 AM">08:00 AM</option>
                  <option value="06:00 PM">06:00 PM (सायं)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isHi ? "चैनल चयन" : "Alert Channel"}
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="whatsapp">WhatsApp Only</option>
                  <option value="telegram">Telegram Only</option>
                  <option value="both">Both (WhatsApp + Telegram)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 rounded-2xl bg-[#046c4e] text-white font-extrabold text-xs hover:bg-[#03543d] transition shadow-md flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" />
                {isHi ? "दैनिक अलर्ट सक्रिय करें" : "Save Daily Subscription"}
              </button>

              <button
                type="button"
                onClick={handleTestWhatsApp}
                className="px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-[#046c4e] font-extrabold text-xs hover:bg-emerald-100 transition flex items-center gap-1"
                title="Open 1-Click WhatsApp Deep-Link Test"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {isHi ? "टेस्ट खोलें" : "1-Click Test"}
              </button>
            </div>
          </form>
        </div>

        {/* Channel 2: Telegram Bot Autonomous Push */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center font-bold shadow-sm">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {isHi ? "चैनल 2: टेलीग्राम ऑटो-पुश बॉट" : "Channel 2: Autonomous Telegram Push"}
                </h3>
                <span className="text-[11px] font-bold text-sky-700">100% Free · Direct Device Push</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-[10px] font-extrabold border border-sky-200">
              Bot API
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {isHi
              ? "टेलीग्राम बॉट सीधे आपके फोन पर बिना किसी शुल्क के पुश नोटिफिकेशन और ऑडियो नोट्स भेजता है।"
              : "Autonomous server-to-phone push messaging via Telegram Bot API with zero fees and unlimited push alerts."}
          </p>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  {isHi ? "टेलीग्राम चैट आईडी" : "Telegram Chat ID / Username"}
                </label>
                <a
                  href="https://t.me/CropLensAlertsBot"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-extrabold text-sky-600 hover:underline flex items-center gap-0.5"
                >
                  @CropLensAlertsBot <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="e.g. 182739485 or @my_telegram_handle"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-[11px] font-semibold space-y-1">
              <p>💡 <strong>{isHi ? "चैट आईडी कैसे प्राप्त करें?" : "How to get Telegram Chat ID:"}</strong></p>
              <p>{isHi ? "1. टेलीग्राम में @userinfobot खोजें और Start दबाएं। 2. अपना आईडी यहाँ पेस्ट करें।" : "1. Open Telegram, search @userinfobot & press Start. 2. Paste your ID here."}</p>
            </div>

            <button
              type="button"
              onClick={handleTestTelegram}
              className="w-full py-2.5 rounded-2xl bg-sky-600 text-white font-extrabold text-xs hover:bg-sky-700 transition shadow-md flex items-center justify-center gap-1.5"
            >
              <Send className="h-4 w-4" />
              {isHi ? "⚡ टेस्ट टेलीग्राम पुश अलर्ट भेजें" : "⚡ Send Test Telegram Push Alert"}
            </button>
          </div>
        </div>
      </div>

      {/* Active Subscriptions Ledger */}
      {subscriptions.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              {isHi ? "आपकी सक्रिय अलर्ट सदस्यताएँ (SQLite लेज़र)" : "Active Subscriptions (SQLite Ledger)"}
            </h3>
            <span className="text-xs font-bold text-slate-500">{subscriptions.length} Registered</span>
          </div>

          <div className="divide-y divide-slate-100">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900">{sub.crop} ({sub.mandi})</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200 uppercase">
                      {sub.channel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Phone: {sub.mobile_number} · Time: {sub.delivery_time}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteSub(sub.id)}
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                  title="Remove Subscription"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery History Logs */}
      {logs.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-600" />
              {isHi ? "हाल ही में भेजे गए अलर्ट (डिलीवरी लॉग)" : "Recent Alert Delivery History (Audit Logs)"}
            </h3>
            <span className="text-xs font-bold text-slate-500">{logs.length} Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Recipient</th>
                  <th className="p-3">Crop / Mandi</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono text-[11px] text-slate-500">
                      {log.dispatched_at ? new Date(log.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                    </td>
                    <td className="p-3 font-extrabold uppercase text-[10px]">
                      {log.channel === 'telegram' ? '✈️ Telegram' : '💬 WhatsApp'}
                    </td>
                    <td className="p-3 font-mono text-[11px]">{log.recipient}</td>
                    <td className="p-3 font-bold text-slate-900">{log.crop} - {log.mandi}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
