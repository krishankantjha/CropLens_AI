// Earthline Intelligence: authenticated farmer identity comes from the backend, never from display defaults.
export type UserProfile = {
  id: number;
  mobile_number: string;
  full_name: string;
  email?: string;
  role: string;
  home_mandi: string;
  preferred_commodity: string;
  language: string;
  created_at?: string;
};

export type AuthSessionResponse = {
  csrf_token: string;
  user: UserProfile;
};
