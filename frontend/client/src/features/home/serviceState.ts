import type { ApiError } from "@/types/api";

export type ServiceName = "forecast" | "risk" | "procurement";

export type Selection = {
  commodity: string;
  market: string;
  horizon: number;
};

export function asApiError(error: unknown): ApiError {
  if (typeof error === "object" && error !== null && "status" in error && "message" in error) {
    const candidate = error as { status?: unknown; message?: unknown };
    return {
      status: typeof candidate.status === "number" ? candidate.status : 0,
      message: typeof candidate.message === "string" ? candidate.message : "The live service could not be reached.",
    };
  }
  return { status: 0, message: "The live service could not be reached." };
}

export function isUnavailable(error: unknown): boolean {
  const apiError = asApiError(error);
  return apiError.status === 0 || apiError.status === 408 || apiError.status === 429 || apiError.status === 502 || apiError.status === 503 || apiError.status === 504;
}

function serviceLabel(service: ServiceName): string {
  if (service === "forecast") return "forecast";
  if (service === "risk") return "market-risk information";
  return "mandi comparison";
}

export function toFarmerMessage(error: unknown, service: ServiceName): string {
  const { status } = asApiError(error);
  const label = serviceLabel(service);
  if (status === 422) return "Please choose a valid crop and mandi, then try again.";
  if (isUnavailable(error)) return `Live ${label} is temporarily unavailable. Please try again shortly.`;
  if (status >= 500) return `The live ${label} service is having trouble. Please try again later.`;
  return `We could not load ${label} for this selection. Please try again.`;
}

export function isValidSelection(selection: Selection, validCommodities: string[], validMarkets: string[]): boolean {
  return validCommodities.includes(selection.commodity) && validMarkets.includes(selection.market) && selection.horizon > 0;
}
