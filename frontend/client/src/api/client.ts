// Earthline Intelligence: the only boundary for backend requests. Failed requests never become substitute data.
import type { ApiError, ForecastResponse, ProcurementResponse, ResourcesResponse, RiskResponse } from "@/types/api";
import type { TokenResponse, UserProfile } from "@/types/auth";
import type { SubscriptionsResponse } from "@/types/alerts";

const developmentHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
const DEVELOPMENT_API_BASE_URL = `http://${developmentHost}:8000`;

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL = (configuredApiBaseUrl ?? (import.meta.env.DEV ? DEVELOPMENT_API_BASE_URL : "")).replace(/\/$/, "");
const CSRF_COOKIE_NAME = "croplens_csrf";

function csrfToken() {
  if (typeof document === "undefined") return "";
  return document.cookie.split("; ").find((item) => item.startsWith(`${CSRF_COOKIE_NAME}=`))?.split("=").slice(1).join("=") ?? "";
}

export const SESSION_EXPIRED_EVENT = "croplens:session-expired";

type RequestOptions = RequestInit & { notifyUnauthorized?: boolean };

async function request<T>(path: string, init?: RequestOptions): Promise<T> {
  const { notifyUnauthorized = true, ...fetchInit } = init ?? {};
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchInit,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(["POST", "PUT", "PATCH", "DELETE"].includes(fetchInit.method?.toUpperCase() ?? "") && csrfToken() ? { "X-CSRF-Token": csrfToken() } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401 && notifyUnauthorized && typeof window !== "undefined") {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    let message = `The live service returned ${response.status}.`;
    try {
      const payload = (await response.json()) as { detail?: string; message?: string };
      message = payload.detail ?? payload.message ?? message;
    } catch {
      // Keep the status-based message when the service did not return JSON.
    }
    const error: ApiError = { status: response.status, message };
    throw error;
  }

  return (await response.json()) as T;
}

function authRequest<T>(path: string, init?: RequestOptions) {
  return request<T>(path, init);
}

export function login(payload: { mobile_number: string; password: string }) {
  return request<TokenResponse>("/api/v1/auth/login", { method: "POST", body: JSON.stringify(payload) });
}

export function register(payload: { mobile_number: string; password: string; full_name: string; role: string; home_mandi?: string; preferred_commodity?: string; language?: string }) {
  return request<TokenResponse>("/api/v1/auth/register", { method: "POST", body: JSON.stringify(payload) });
}

export function sendOtp(payload: { mobile_number: string }) {
  return request<{ message?: string; expires_in_seconds?: number }>("/api/v1/auth/otp/send", { method: "POST", body: JSON.stringify(payload) });
}

export function verifyOtp(payload: { mobile_number: string; otp_code: string }) {
  return request<TokenResponse>("/api/v1/auth/otp/verify", { method: "POST", body: JSON.stringify(payload) });
}

export function getCurrentUser(options?: { notifyUnauthorized?: boolean }) {
  return authRequest<UserProfile>("/api/v1/auth/me", options);
}

export function logout() {
  return authRequest<{ message?: string }>("/api/v1/auth/logout", { method: "POST" });
}

export function updatePreferences(payload: { home_mandi?: string; preferred_commodity?: string; language?: string }) {
  return authRequest<UserProfile>("/api/v1/auth/preferences", { method: "PUT", body: JSON.stringify(payload) });
}

export function createAlert(payload: { mobile_number: string; channel: string; crop: string; mandi: string; delivery_time: string; language: string; telegram_chat_id?: string }) {
  return authRequest<{ message?: string; subscription?: unknown }>("/api/v1/alerts/subscribe", { method: "POST", body: JSON.stringify(payload) });
}

export function listAlerts(mobileNumber: string) {
  const query = new URLSearchParams({ mobile_number: mobileNumber });
  return authRequest<SubscriptionsResponse>(`/api/v1/alerts/subscriptions?${query.toString()}`);
}

export function deleteAlert(id: number, mobileNumber: string) {
  const query = new URLSearchParams({ mobile_number: mobileNumber });
  return authRequest<{ message?: string }>(`/api/v1/alerts/subscriptions/${id}?${query.toString()}`, { method: "DELETE" });
}

export function getHealth() {
  return request<{ status?: string }>("/health");
}

export function getResources() {
  return request<ResourcesResponse>("/api/v1/system/resources");
}

export function getRisk(params: { commodity: string; market: string }) {
  const query = new URLSearchParams(params);
  return request<RiskResponse>(`/api/v1/predict/shocks?${query.toString()}`);
}

export function getProcurement(params: { commodity: string; base_market: string }) {
  const query = new URLSearchParams(params);
  return request<ProcurementResponse>(`/api/v1/procurement/arbitrage?${query.toString()}`);
}

export function getForecast(params: { commodity: string; market: string; horizon: number }) {
  const query = new URLSearchParams({
    commodity: params.commodity,
    market: params.market,
    horizon: String(params.horizon),
  });
  return request<ForecastResponse>(`/api/v1/predict/forecast?${query.toString()}`);
}
