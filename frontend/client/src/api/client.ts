// Live backend boundary. Failed requests never become substitute data.
import type { ApiError, ForecastResponse, ProcurementResponse, ResourcesResponse, RiskResponse } from "@/types/api";
import type { AuthSessionResponse, UserProfile } from "@/types/auth";
import type { SubscriptionsResponse } from "@/types/alerts";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
if (import.meta.env.PROD && !configuredApiBaseUrl) {
  throw new Error("VITE_API_BASE_URL must be configured for production builds.");
}
const API_BASE_URL = (configuredApiBaseUrl ?? "").replace(/\/$/, "");

let csrfToken = "";
let refreshInFlight: Promise<boolean> | null = null;

export function setCsrfToken(nextToken: string) {
  csrfToken = nextToken;
}

export function clearCsrfToken() {
  csrfToken = "";
}

export const SESSION_EXPIRED_EVENT = "croplens:session-expired";
export const SESSION_REFRESHED_EVENT = "croplens:session-refreshed";

type RequestOptions = RequestInit & { notifyUnauthorized?: boolean; retryOnUnauthorized?: boolean };

function errorMessageFromPayload(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "msg" in item) return String((item as { msg: unknown }).msg);
      return "";
    }).filter(Boolean);
    if (parts.length) return parts.join(" ");
  }
  const message = (payload as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

async function readError(response: Response): Promise<ApiError> {
  let message = `The live service returned ${response.status}.`;
  try {
    message = errorMessageFromPayload(await response.json(), message);
  } catch {
    // Keep the status-based message when the service did not return JSON.
  }
  return { status: response.status, message };
}

function mutatingHeaders(method: string): HeadersInit {
  const headers: Record<string, string> = {};
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }
  return headers;
}

export async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...mutatingHeaders("POST"),
        },
      });
      if (!response.ok) return false;
      const payload = (await response.json()) as AuthSessionResponse;
      if (!payload.csrf_token) return false;
      setCsrfToken(payload.csrf_token);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(SESSION_REFRESHED_EVENT, { detail: payload.user }));
      }
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function request<T>(path: string, init?: RequestOptions): Promise<T> {
  const { notifyUnauthorized = true, retryOnUnauthorized = true, ...fetchInit } = init ?? {};
  const method = (fetchInit.method ?? "GET").toUpperCase();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchInit,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(fetchInit.body ? { "Content-Type": "application/json" } : {}),
      ...mutatingHeaders(method),
      ...init?.headers,
    },
  });

  if (response.status === 401 && retryOnUnauthorized && path !== "/api/v1/auth/refresh") {
    const refreshed = await refreshSession();
    if (refreshed) {
      return request<T>(path, { ...init, retryOnUnauthorized: false });
    }
    if (notifyUnauthorized && typeof window !== "undefined") {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
  } else if (!response.ok && response.status === 401 && notifyUnauthorized && typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }

  if (!response.ok) {
    throw await readError(response);
  }

  return (await response.json()) as T;
}

export function login(payload: { mobile_number: string; password: string }) {
  return request<AuthSessionResponse>("/api/v1/auth/login", { method: "POST", body: JSON.stringify(payload), notifyUnauthorized: false });
}

export function register(payload: { mobile_number: string; full_name: string; email?: string; password?: string; role?: string; home_mandi?: string; preferred_commodity?: string; language?: string }) {
  return request<AuthSessionResponse>("/api/v1/auth/register", { method: "POST", body: JSON.stringify(payload), notifyUnauthorized: false });
}

export function sendOtp(payload: { mobile_number: string; purpose?: "login" | "signup" }) {
  return request<{ message?: string; expires_in_seconds?: number }>("/api/v1/auth/otp/send", { method: "POST", body: JSON.stringify(payload), notifyUnauthorized: false });
}

export function verifyOtp(payload: { mobile_number: string; otp_code: string; full_name?: string; email?: string }) {
  return request<AuthSessionResponse>("/api/v1/auth/otp/verify", { method: "POST", body: JSON.stringify(payload), notifyUnauthorized: false });
}

export function getCurrentUser(options?: { notifyUnauthorized?: boolean }) {
  return request<UserProfile>("/api/v1/auth/me", options);
}

export function getCsrfToken(options?: { notifyUnauthorized?: boolean }) {
  return request<{ csrf_token: string }>("/api/v1/auth/csrf", options);
}

export function logout() {
  return request<{ message?: string }>("/api/v1/auth/logout", { method: "POST", notifyUnauthorized: false });
}

export function updatePreferences(payload: { full_name?: string; email?: string; home_mandi?: string; preferred_commodity?: string; language?: string }) {
  return request<UserProfile>("/api/v1/auth/preferences", { method: "PUT", body: JSON.stringify(payload) });
}

export function createAlert(payload: { mobile_number: string; channel: string; crop: string; mandi: string; delivery_time: string; language: string; telegram_chat_id?: string }) {
  return request<{ message?: string; subscription?: unknown }>("/api/v1/alerts/subscribe", { method: "POST", body: JSON.stringify(payload) });
}

export function listAlerts(mobileNumber: string) {
  const query = new URLSearchParams({ mobile_number: mobileNumber });
  return request<SubscriptionsResponse>(`/api/v1/alerts/subscriptions?${query.toString()}`);
}

export function deleteAlert(id: number, mobileNumber: string) {
  const query = new URLSearchParams({ mobile_number: mobileNumber });
  return request<{ message?: string }>(`/api/v1/alerts/subscriptions/${id}?${query.toString()}`, { method: "DELETE" });
}

export function getHealth() {
  return request<{ status?: string }>("/health", { notifyUnauthorized: false, retryOnUnauthorized: false });
}

export function getResources() {
  return request<ResourcesResponse>("/api/v1/system/resources", { notifyUnauthorized: false, retryOnUnauthorized: false });
}

export function getRisk(params: { commodity: string; market: string }, options?: { notifyUnauthorized?: boolean }) {
  const query = new URLSearchParams(params);
  return request<RiskResponse>(`/api/v1/predict/shocks?${query.toString()}`, options);
}

export function getProcurement(params: { commodity: string; base_market: string }, options?: { notifyUnauthorized?: boolean }) {
  const query = new URLSearchParams(params);
  return request<ProcurementResponse>(`/api/v1/procurement/arbitrage?${query.toString()}`, options);
}

export function getForecast(params: { commodity: string; market: string; horizon: number }) {
  const query = new URLSearchParams({
    commodity: params.commodity,
    market: params.market,
    horizon: String(params.horizon),
  });
  return request<ForecastResponse>(`/api/v1/predict/forecast?${query.toString()}`, { notifyUnauthorized: false, retryOnUnauthorized: false });
}
