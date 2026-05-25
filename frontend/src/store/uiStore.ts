import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  activeModal: string | null;
  selectedTaskId: string | null;
  toggleSidebar: () => void;
  openModal: (name: string, taskId?: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeModal: null,
  selectedTaskId: null,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  openModal: (name, taskId) => set({ activeModal: name, selectedTaskId: taskId ?? null }),
  closeModal: () => set({ activeModal: null, selectedTaskId: null }),
}));
