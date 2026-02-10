export interface User {
  id: number;
  nickname: string;
  email: string;
  is_expert: boolean;
  expert_verified_at?: Date | null;
  expert_field?: string | null;
  career_info?: string | null;
  email_verified: boolean;
  account_status: 'active' | 'inactive' | 'suspended' | 'withdrawn';
  profile_image_url?: string | null;
  created_at: Date;
  last_login_at?: Date | null;
  updated_at: Date;
  withdrawn_at?: Date | null;
}

export interface SignUpData {
  email: string;
  password: string;
  nickname: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface UpdateProfileData {
  nickname?: string;
  profile_image_url?: string;
  expert_field?: string;
  career_info?: string;
}
