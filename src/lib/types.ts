import type { Condition, DeptKey } from "./catalog";

export type ProfileLite = {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  city: string;
  is_demo?: boolean;
  verified_bank?: boolean;
};

export type Profile = ProfileLite & {
  bio: string | null;
  goal: "buy_and_sell" | "mostly_buy";
  verified_bank: boolean;
  banned_at: string | null;
  created_at: string;
};

export type ProfileStats = { follower_count: number; following_count: number; listing_count: number };

export type ListingStatus = "active" | "reserved" | "sold" | "removed";

export type Listing = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  department: DeptKey;
  category: string;
  brand: string | null;
  size: string | null;
  dimensions: string | null;
  condition: Condition;
  tested_working: boolean;
  price_kobo: number;
  was_price_kobo: number | null;
  city: string;
  area: string | null;
  status: ListingStatus;
  is_auction: boolean;
  save_count: number;
  created_at: string;
  seller: ProfileLite;
  photos: { url: string; path: string; position: number }[];
};

export type Viewer = {
  userId: string;
  email: string | null;
  profile: Profile | null;
  isAdmin: boolean;
  banned: boolean;
};

export type Ratings = { seller_avg: number | null; seller_count: number; buyer_avg: number | null; buyer_count: number };
