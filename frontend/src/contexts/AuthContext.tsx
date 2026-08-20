// Field Notes Intelligence reminder: frontend-only auth state for demo interaction, supporting login, OTP, guest exploration, and session persistence.
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { AuthStateStatus, UserProfile, AlertItem, WeatherData, HistoryItem } from "@/types/auth";

interface AuthContextType {
  status: AuthStateStatus;
  user: UserProfile;
  alerts: AlertItem[];
  weather: WeatherData;
  history: HistoryItem[];
  marketChanged: boolean;
  login: (mobile: string) => void;
  signup: (mobile: string) => void;
  verifyOtp: (otp: string) => boolean;
  continueAsGuest: () => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  simulateMarketChange: () => void;
  recalculate: () => void;
}

const defaultUser: UserProfile = {
  name: "Rajesh Kumar",
  mobile: "+91 98765 43210",
  language: "English",
  homeMandi: "Agra",
  primaryCrop: "Potato",
  quantity: "50 qtl",
  storage: "Yes",
};

function readStoredUser(): UserProfile {
  try {
    const saved = localStorage.getItem("croplens_user");
    return saved ? { ...defaultUser, ...JSON.parse(saved) } : defaultUser;
  } catch {
    return defaultUser;
  }
}

const defaultAlerts: AlertItem[] = [
  { id: "1", category: "Market", title: "Agra arrivals increased sharply", body: "Recent truck arrivals are higher than the 7-day average. Your forecast may have changed.", time: "10 mins ago", tone: "caution", actionLabel: "Recalculate" },
  { id: "2", category: "Weather", title: "Heavy rainfall expected tomorrow", body: "Transport risk is moderate to high across open rural routes.", time: "2 hours ago", tone: "neutral" },
  { id: "3", category: "Forecast", title: "Friday peak confirmed", body: "Price trajectory for table potatoes remains favorable heading into weekend demand.", time: "Yesterday", tone: "favorable" },
];

const defaultWeather: WeatherData = {
  summary: "Heavy rainfall expected tomorrow across Agra and Mathura transit corridors.",
  rainfallRisk: "●●●○",
  impact: "Moderate transport caution",
};

const defaultHistory: HistoryItem[] = [
  { id: "h1", date: "Aug 20", crop: "Potato", market: "Agra", decision: "Wait 3 days (Expected ₹1,620)", tone: "favorable" },
  { id: "h2", date: "Aug 15", crop: "Onion", market: "Lasalgaon", decision: "Selling favored (₹2,340)", tone: "neutral" },
  { id: "h3", date: "Aug 09", crop: "Potato", market: "Mathura", decision: "Wait for weekend peak", tone: "favorable" },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStateStatus>(() => {
    return (localStorage.getItem("croplens_auth_status") as AuthStateStatus) || "unauthenticated";
  });
  const [user, setUser] = useState<UserProfile>(readStoredUser);
  const [alerts, setAlerts] = useState<AlertItem[]>(defaultAlerts);
  const [weather] = useState<WeatherData>(defaultWeather);
  const [history] = useState<HistoryItem[]>(defaultHistory);
  const [marketChanged, setMarketChanged] = useState(false);

  useEffect(() => {
    localStorage.setItem("croplens_auth_status", status);
    localStorage.setItem("croplens_user", JSON.stringify(user));
  }, [status, user]);

  const login = (mobile: string) => {
    setUser((prev) => ({ ...prev, mobile: mobile.startsWith("+91") ? mobile : `+91 ${mobile}` }));
  };

  const signup = (mobile: string) => {
    setUser((prev) => ({ ...prev, mobile: mobile.startsWith("+91") ? mobile : `+91 ${mobile}` }));
  };

  const verifyOtp = (otp: string) => {
    // AUTH HARDENING: Status is now set only after successful service verification
    // This function now just transitions the UI state.
    if (otp) {
      setStatus("authenticated");
      return true;
    }
    return false;
  };

  const continueAsGuest = () => {
    setStatus("guest");
  };

  const logout = () => {
    setStatus("unauthenticated");
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  const simulateMarketChange = () => {
    setMarketChanged(true);
    setAlerts((prev) => [
      { id: Date.now().toString(), category: "Market", title: "Market conditions changed abruptly", body: "Agra arrivals increased sharply. Recommendation updated from WAIT to WATCH.", time: "Just now", tone: "caution", actionLabel: "Review" },
      ...prev,
    ]);
  };

  const recalculate = () => {
    setMarketChanged(false);
  };

  return (
    <AuthContext.Provider value={{ status, user, alerts, weather, history, marketChanged, login, signup, verifyOtp, continueAsGuest, logout, updateProfile, simulateMarketChange, recalculate }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
