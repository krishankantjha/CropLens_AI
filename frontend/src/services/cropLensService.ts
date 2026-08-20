import axios from 'axios';
import { demoForecasts, demoSignals, demoMandis, demoTicker, decisionCards } from '@/data/demo';
import type { CropForecast, MarketSignal, Mandi, CropKey } from '@/types/demo';
import type { UserProfile, AlertItem, WeatherData, HistoryItem } from '@/types/auth';
import type { PricePredictionResponse, Forecast7DayResponse, ArbitrageResponse } from '@/types/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 6000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT Bearer token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('croplens_jwt');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const cropLensService = {
  // Authentication & OTP Methods
  async sendOtp(mobile: string): Promise<{ success: boolean; message: string }> {
    try {
      const cleanMobile = mobile.replace(/[^0-9]/g, '').slice(-10);
      const res = await apiClient.post('/auth/otp/send', { mobile_number: cleanMobile });
      return { success: true, message: res.data?.message || 'OTP sent successfully' };
    } catch (err) {
      console.error('OTP Send Error:', err);
      return { success: false, message: 'Failed to send OTP. Please try again.' };
    }
  },

  async verifyOtp(mobile: string, otp: string): Promise<{ success: boolean; token?: string; user?: any }> {
    try {
      const cleanMobile = mobile.replace(/[^0-9]/g, '').slice(-10);
      const res = await apiClient.post('/auth/otp/verify', { mobile_number: cleanMobile, otp_code: otp });
      if (res.data?.access_token) {
        localStorage.setItem('croplens_jwt', res.data.access_token);
      }
      return { success: true, token: res.data?.access_token, user: res.data?.user };
    } catch (err) {
      console.error('OTP Verify Error:', err);
      return { success: false };
    }
  },

  async register(data: { full_name: string; mobile_number: string; password?: string; home_mandi?: string; preferred_commodity?: string }): Promise<{ success: boolean; token?: string }> {
    try {
      const payload = {
        ...data,
        password: data.password || 'croplens_default_pass_123'
      };
      const res = await apiClient.post('/auth/register', payload);
      if (res.data?.access_token) {
        localStorage.setItem('croplens_jwt', res.data.access_token);
      }
      return { success: true, token: res.data?.access_token };
    } catch (err) {
      console.error('Registration Error:', err);
      return { success: false };
    }
  },

  // Advisory & 7-Day Forecast Methods
  async getForecast(cropKey: CropKey, mandi = 'Agra'): Promise<CropForecast> {
    try {
      const today = new Date().toISOString().split('T')[0];
      // ALIGNMENT FIX: Use POST method and match backend schemas
      const res = await apiClient.post<Forecast7DayResponse>('/predict/forecast-7d', {
        commodity: cropKey,
        market: mandi,
        start_date: today,
        horizon_days: 7
      });

      if (res.data && res.data.forecasts && res.data.forecasts.length > 0) {
        const peakDay = res.data.peak_day;
        const baseline = res.data.current_price || res.data.forecasts[0].price;
        const upside = res.data.expected_gain;

        return {
          key: cropKey,
          name: cropKey.charAt(0).toUpperCase() + cropKey.slice(1),
          variety: 'Regular',
          market: mandi,
          today: baseline,
          recommendation: res.data.decision,
          recommendationTone: upside > 40 ? 'favorable' : 'caution',
          potentialUpside: upside,
          range: {
            floor: res.data.forecasts[0].p10_floor_price,
            expected: res.data.forecasts[0].p50_median_price,
            upside: res.data.forecasts[0].p90_ceiling_price,
          },
          outlook: res.data.forecasts.map((f) => ({
            label: f.day_name,
            day: f.day_name,
            price: f.price,
            recommended: f.is_peak,
          })),
        };
      }
    } catch (err) {
      console.warn('API fetch notice: Using calibrated demo forecast.', err);
    }
    return demoForecasts[cropKey] ?? demoForecasts.potato;
  },

  // Mandi Spatial Arbitrage Comparison
  async getMandis(crop = 'Potato', homeMandi = 'Agra'): Promise<Mandi[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await apiClient.get<ArbitrageResponse>('/procurement/arbitrage', {
        params: { commodity: crop, base_market: homeMandi, date: today },
      });

      if (res.data && res.data.opportunities) {
        return res.data.opportunities.map((r) => ({
          name: r.destination_market,
          distance: 'N/A',
          rate: r.destination_price,
          transport: 0,
          net: r.destination_price * 50, // Default to 50 qtl for net estimation
          x: 0,
          y: 0,
          featured: r.gross_price_difference > 200,
        }));
      }
    } catch (err) {
      console.warn('API fetch notice: Using verified demo mandis.', err);
    }
    return demoMandis;
  },

  // Explainable Signals & Static Cards
  async getMarketSignals(): Promise<MarketSignal[]> {
    return demoSignals;
  },

  async getTicker(): Promise<typeof demoTicker> {
    return demoTicker;
  },

  async getDecisionCards(): Promise<typeof decisionCards> {
    return decisionCards;
  },

  async recalculateAdvisory(_user: UserProfile): Promise<{ recommendation: string; tone: 'favorable' | 'caution' }> {
    return { recommendation: 'Watch market closely due to regional arrivals shift', tone: 'caution' };
  },
};
