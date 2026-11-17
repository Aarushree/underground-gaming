export type StationStatus = 'FREE' | 'BOOKED';
export type StationType = 'TABLE' | 'CONSOLE';
export type UserRole = 'CUSTOMER' | 'ADMIN';
export type ActionType = 'ADD_SPEND' | 'REDEEM_HOUR';

export interface Station {
  id: string;
  name: string;
  type: StationType;
  status: StationStatus;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  spend_progress: number;
  total_spent: number;
  free_hours: number;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyLog {
  id: string;
  user_id: string;
  admin_id: string;
  action_type: ActionType;
  amount_inr: number;
  hours_changed: number;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      stations: {
        Row: Station;
        Insert: Omit<Station, 'id' | 'updated_at'>;
        Update: Partial<Omit<Station, 'id'>>;
      };
      loyalty_logs: {
        Row: LoyaltyLog;
        Insert: Omit<LoyaltyLog, 'id' | 'created_at'>;
        Update: never;
      };
    };
    Functions: {
      add_customer_spend: {
        Args: { p_customer_id: string; p_amount_inr: number };
        Returns: {
          success: boolean;
          earned_hours: number;
          new_progress: number;
          new_total: number;
          free_hours: number;
        };
      };
      redeem_free_hour: {
        Args: { p_customer_id: string };
        Returns: { success: boolean; free_hours: number };
      };
      toggle_station_status: {
        Args: { p_station_id: string };
        Returns: { success: boolean; new_status: string };
      };
    };
  };
};
