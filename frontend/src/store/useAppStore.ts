import { create } from "zustand";
import { UserProfile, Habit } from "../types";

interface AppState {
  user: UserProfile | null;
  habits: Habit[];
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setHabits: (habits: Habit[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  habits: [],
  isLoading: true,
  setUser: (user) => set({ user }),
  setHabits: (habits) => set({ habits }),
  setLoading: (isLoading) => set({ isLoading }),
}));
