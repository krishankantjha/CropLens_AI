import { useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";

const MANDIS = ["Agra", "Mathura", "Azadpur", "Lasalgaon", "Indore", "Khanna", "Farrukhabad", "Karnal", "Guntur", "Kolkata"];
const CROPS = ["Potato", "Onion", "Tomato"];
const LANGUAGES = ["English", "हिन्दी", "मराठी", "ಕನ್ನಡ", "తెలుగు", "தமிழ்", "ગુજરાતી", "বাংলা", "ਪੰਜਾਬੀ"];

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [mandi, setMandi] = useState(user.homeMandi);
  const [crop, setCrop] = useState(user.primaryCrop);
  const [language, setLanguage] = useState(user.language);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name, homeMandi: mandi, primaryCrop: crop, language });
    setEditing(false);
    toast.success("Profile preferences updated successfully.");
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-xl space-y-6 pb-16">
        <div>
          <div className="section-kicker">Account settings</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-.05em] text-[#0E4D35]">Your Profile</h1>
        </div>

        <div className="rounded-[24px] border border-[#DDE4DE] bg-white p-6 paper-shadow sm:p-8">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-[.12em] text-[#66716A]">Farmer Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#DDE4DE] bg-[#F8F7F2] px-4 py-3 text-sm font-bold text-[#17201B] focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-[.12em] text-[#66716A]">Home Mandi</label>
                  <select
                    value={mandi}
                    onChange={(e) => setMandi(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#DDE4DE] bg-[#F8F7F2] px-3 py-3 text-sm font-bold text-[#17201B] focus:bg-white focus:outline-none"
                  >
                    {MANDIS.map((m) => (
                      <option key={m} value={m}>📍 {m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-[.12em] text-[#66716A]">Primary Crop</label>
                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#DDE4DE] bg-[#F8F7F2] px-3 py-3 text-sm font-bold text-[#17201B] focus:bg-white focus:outline-none"
                  >
                    {CROPS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-[.12em] text-[#66716A]">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#DDE4DE] bg-[#F8F7F2] px-3 py-3 text-sm font-bold text-[#17201B] focus:bg-white focus:outline-none"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="rounded-full bg-[#176B45] hover:bg-[#0E4D35] px-6 py-2.5 text-xs font-extrabold text-white cursor-pointer shadow-sm">
                  Save Changes
                </button>
                <button type="button" onClick={() => setEditing(false)} className="rounded-full border border-[#DDE4DE] px-6 py-2.5 text-xs font-extrabold text-[#66716A] cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#EDF0EB] pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-[#0E4D35]">{user.name}</h3>
                  <p className="text-xs text-[#66716A]">{user.mobile}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-full border border-[#DDE4DE] px-4 py-2 text-xs font-extrabold text-[#0E4D35] hover:bg-[#E8F4ED] cursor-pointer"
                >
                  Edit Profile
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-xs text-[#66716A]">Language</span><p className="mt-0.5 font-extrabold text-[#17201B]">{user.language}</p></div>
                <div><span className="text-xs text-[#66716A]">Home Mandi</span><p className="mt-0.5 font-extrabold text-[#17201B]">📍 {user.homeMandi} APMC</p></div>
                <div><span className="text-xs text-[#66716A]">Primary Crop</span><p className="mt-0.5 font-extrabold text-[#17201B]">{user.primaryCrop}</p></div>
                <div><span className="text-xs text-[#66716A]">Typical Qty</span><p className="mt-0.5 font-extrabold text-[#17201B]">{user.quantity}</p></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
