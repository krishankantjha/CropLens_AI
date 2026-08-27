// Earthline Intelligence: alert state is always sourced from the authenticated backend.
export type AlertSubscription = {
  id: number;
  mobile_number?: string;
  telegram_chat_id?: string | null;
  channel?: string;
  crop?: string;
  mandi?: string;
  delivery_time?: string;
  language?: string;
  is_active?: number;
  created_at?: string;
};

export type SubscriptionsResponse = {
  subscriptions?: AlertSubscription[];
  total_count?: number;
  message?: string;
};
