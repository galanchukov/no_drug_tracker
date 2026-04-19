export interface UserProfile {
  uid: string;
  username: string;
  createdAt: any;
  achievements: string[];
  xp: number;
  level: number;
}

export interface Habit {
  id?: string;
  userId: string;
  title: string;
  startDate: any;
  createdAt: any;
  currentStreak?: number; // Calculated on client side dynamically or fetched
  bestStreak: number;
  totalRelapses: number;
  color?: string;
  icon?: string;
  reason?: string;
  dailyCost?: number;
}

export interface Relapse {
  id?: string;
  habitId: string;
  userId: string;
  date: any;
  reason: string;
}

export interface MoodEntry {
  id?: string;
  userId: string;
  mood: number; // 1-5
  comment: string;
  date: any;
  tags?: string[];
}

export interface ActivityLog {
  id?: string;
  habitId: string;
  userId: string;
  actionName: string;
  amount: number;
  date: any;
}
