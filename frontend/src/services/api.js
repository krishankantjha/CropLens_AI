import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export default api;
