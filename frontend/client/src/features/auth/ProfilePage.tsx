// Earthline Intelligence: the account screen reflects the authenticated farmer returned by the backend.
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Leaf, LogOut, Save, UserRound } from "lucide-react";
import { getCurrentUser, updatePreferences } from "@/api/client";
import { StatePanel } from "@/components/feedback/StatePanel";
import type { UserProfile } from "@/types/auth";

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [homeMandi, setHomeMandi] = useState("");
  const [preferredCommodity, setPreferredCommodity] = useState("");
  const [language, setLanguage] = useState("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getCurrentUser().then((profile) => {
      setUser(profile); setHomeMandi(profile.home_mandi); setPreferredCommodity(profile.preferred_commodity); setLanguage(profile.language);
    }).catch((requestError) => setError((requestError as { message?: string }).message ?? "Please sign in to view your profile.")).finally(() => setBusy(false));
  }, []);

  const save = async () => {
    setBusy(true); setError(""); setMessage("");
    try { const updated = await updatePreferences({ home_mandi: homeMandi, preferred_commodity: preferredCommodity, language }); setUser(updated); setMessage("Your preferences were saved."); }
    catch (requestError) { setError((requestError as { message?: string }).message ?? "Could not save your preferences."); }
    finally { setBusy(false); }
  };

  const logout = () => { window.localStorage.removeItem("croplens_access_token"); window.localStorage.removeItem("croplens_refresh_token"); window.location.assign("/"); };
  if (busy && !user) return <div className="auth-page"><StatePanel kind="loading" title="Loading your profile" message="Requesting your saved preferences from the live service." /></div>;
  if (!user) return <div className="auth-page"><div className="profile-error"><StatePanel kind="error" title="Sign in to view your profile" message={error} /><a className="primary-button alert-link" href="/auth">Login or create account</a><a className="back-link profile-back" href="/">Back to market</a></div></div>;

  return <div className="auth-page"><a className="back-link" href="/"><ArrowLeft size={16} /> Back to market</a><section className="profile-card" aria-labelledby="profile-title"><div className="auth-brand"><span className="auth-mark"><img src="/manus-storage/croplens-leaf-lens-mark_4789cd4d.png" alt="" /></span><span><strong>CropLens AI</strong><small>Your market. Your decision.</small></span></div><p className="eyebrow"><UserRound size={14} /> Farmer profile</p><h1 id="profile-title">Your market preferences.</h1><p className="auth-intro">These preferences are loaded from your account and used to personalize live market decisions.</p><div className="profile-identity"><span className="profile-avatar"><Leaf size={21} /></span><span><strong>{user.full_name}</strong><small>{user.mobile_number}</small></span></div><div className="auth-form"><label className="field"><span>Home mandi</span><input value={homeMandi} onChange={(event) => setHomeMandi(event.target.value)} /></label><label className="field"><span>Preferred crop</span><input value={preferredCommodity} onChange={(event) => setPreferredCommodity(event.target.value)} /></label><label className="field"><span>Language</span><select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="en">English</option><option value="hi">हिन्दी</option></select></label><button className="primary-button auth-submit" type="button" onClick={() => void save()} disabled={busy}><Save size={16} /> Save preferences</button></div>{message ? <div className="success-panel"><Check size={16} /> {message}</div> : null}{error ? <StatePanel kind="error" title="Could not save preferences" message={error} /> : null}<button className="logout-button" type="button" onClick={logout}><LogOut size={16} /> Sign out</button></section></div>;
}
