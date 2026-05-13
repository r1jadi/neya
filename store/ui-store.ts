import { create } from "zustand";

interface UiState {
  fomoPulse: boolean;
  setFomoPulse: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  fomoPulse: true,
  setFomoPulse: (v) => set({ fomoPulse: v }),
}));
