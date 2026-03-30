export type HouseholdRole = "admin" | "full" | "view";

export type HouseholdMemberRow = {
  user_id: string;
  role: HouseholdRole;
  joined_at: string;
  display_name?: string | null;
};

export type HouseholdInviteRow = {
  id: string;
  token: string;
  email: string | null;
  role: string;
  expires_at: string;
  created_at: string;
};
