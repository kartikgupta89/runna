export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp (seconds)
  athlete_id: number;
  athlete_name?: string;
}

export interface StravaSummaryActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string; // ISO 8601
  elapsed_time: number; // seconds
  moving_time: number; // seconds
  distance: number; // meters
  average_speed: number; // m/s
  max_speed?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  total_elevation_gain?: number;
  map?: {
    summary_polyline?: string;
  };
}
