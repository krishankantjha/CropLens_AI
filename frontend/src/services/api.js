import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT Authorization header if stored token exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('croplens_jwt');
  if (token && !token.startsWith('demo_jwt_token')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralized Authentication API Routines
export const loginUserApi = async (mobile_number, password) => {
  const response = await api.post('/api/v1/auth/login', { mobile_number, password });
  return response.data;
};

export const registerUserApi = async (payload) => {
  const response = await api.post('/api/v1/auth/register', payload);
  return response.data;
};

export const sendOtpApi = async (mobile_number) => {
  const response = await api.post('/api/v1/auth/otp/send', { mobile_number });
  return response.data;
};

export const verifyOtpApi = async (mobile_number, otp_code) => {
  const response = await api.post('/api/v1/auth/otp/verify', { mobile_number, otp_code });
  return response.data;
};

export const fetchMeApi = async () => {
  const response = await api.get('/api/v1/auth/me');
  return response.data;
};

// Multi-Channel WhatsApp & Telegram Alert Service Endpoints
export const sendWhatsappAdvisoryApi = async (payload) => {
  const response = await api.post('/api/v1/alerts/send-whatsapp', payload);
  return response.data;
};

export const testWhatsappAlertApi = async (payload) => {
  const response = await api.post('/api/v1/alerts/test-whatsapp', payload);
  return response.data;
};

export const subscribeAlertApi = async (payload) => {
  const response = await api.post('/api/v1/alerts/subscribe', payload);
  return response.data;
};

export const fetchSubscriptionsApi = async (mobile_number) => {
  const query = mobile_number ? `?mobile_number=${encodeURIComponent(mobile_number)}` : '';
  const response = await api.get(`/api/v1/alerts/subscriptions${query}`);
  return response.data;
};

export const deleteSubscriptionApi = async (subscriptionId) => {
  const response = await api.delete(`/api/v1/alerts/subscriptions/${subscriptionId}`);
  return response.data;
};

export const testTelegramAlertApi = async (payload) => {
  const response = await api.post('/api/v1/alerts/telegram/test', payload);
  return response.data;
};

export const fetchTelegramStatusApi = async () => {
  const response = await api.get('/api/v1/alerts/telegram/status');
  return response.data;
};

export const dispatchAlertsNowApi = async () => {
  const response = await api.post('/api/v1/alerts/dispatch-now');
  return response.data;
};

export const fetchAlertLogsApi = async (limit = 20) => {
  const response = await api.get(`/api/v1/alerts/logs?limit=${limit}`);
  return response.data;
};

export const activateAlertsApi = async (payload) => {
  return subscribeAlertApi(payload);
};

export const fetchHealthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    return null;
  }
};

export const fetchPricePrediction = async (params) => {
  try {
    const response = await api.post('/api/v1/predict/price', params);
    return response.data;
  } catch (error) {
    console.error('Price prediction fetch error:', error);
    throw error;
  }
};

export const fetch7DayForecast = async (commodity, market, date) => {
  try {
    const queryParams = new URLSearchParams({
      commodity: commodity || 'Potato',
      market: market || 'Agra',
    });
    if (date) queryParams.append('date', date);

    const response = await api.get(`/api/v1/predict/forecast-7d?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('7-Day recursive forecast fetch error:', error);
    throw error;
  }
};

export const fetchSupplyShocks = async (commodity, market, days = 30) => {
  try {
    const queryParams = new URLSearchParams();
    if (commodity) queryParams.append('commodity', commodity);
    if (market) queryParams.append('market', market);
    if (days) queryParams.append('days', days);

    const response = await api.get(`/api/v1/predict/shocks?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Supply shock detection fetch error:', error);
    throw error;
  }
};

export const fetchArbitrage = async (commodity, baseMarket, date) => {
  try {
    const queryParams = new URLSearchParams({
      commodity: commodity || 'Tomato',
      base_market: baseMarket || 'Kolar',
    });
    if (date) queryParams.append('date', date);

    const response = await api.get(`/api/v1/procurement/arbitrage?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Spatial arbitrage fetch error:', error);
    throw error;
  }
};

export const fetchAnalyticsTrends = async (commodity, market, days = 30) => {
  try {
    const queryParams = new URLSearchParams({
      commodity: commodity || 'Tomato',
      market: market || 'Azadpur',
      days: days || 30,
    });

    const response = await api.get(`/api/v1/analytics/trends?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Analytics trend fetch error:', error);
    throw error;
  }
};

export const downloadProcurementPdfApi = async (commodity, market) => {
  const queryParams = new URLSearchParams({
    commodity: commodity || 'Potato',
    market: market || 'Agra',
  });

  const response = await api.get(`/api/v1/procurement/pdf?${queryParams.toString()}`, {
    responseType: 'blob'
  });
  return response;
};

export default api;
