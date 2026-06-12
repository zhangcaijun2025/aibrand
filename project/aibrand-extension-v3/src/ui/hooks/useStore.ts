/**
 * AiBrand Extension v3 — Zustand Store
 *
 * Central state management for the side panel UI.
 * All state is derived from the background service worker via messages.
 */

import { create } from 'zustand';
import type { AuthState, NewTaskPayload, PlatformConfig } from '@/shared/types';

export interface StoreState {
  // Connection
  wsConnected: boolean;

  // Auth
  auth: AuthState;

  // Tasks
  activeTasks: NewTaskPayload[];

  // Platform configs
  platformConfigs: Record<string, PlatformConfig>;

  // Feature flags
  featureFlags: Record<string, boolean>;

  // Error
  error: string | null;

  // Actions
  setWsConnected: (connected: boolean) => void;
  setAuth: (auth: AuthState) => void;
  addTask: (task: NewTaskPayload) => void;
  removeTask: (taskId: string) => void;
  clearTasks: () => void;
  setPlatformConfigs: (configs: Record<string, PlatformConfig>) => void;
  setFeatureFlags: (flags: Record<string, boolean>) => void;
  setError: (error: string | null) => void;
}

export const useStore = create<StoreState>((set) => ({
  // Initial state
  wsConnected: false,
  auth: {
    token: null,
    user: null,
    isAuthenticated: false,
    expiresAt: null,
  },
  activeTasks: [],
  platformConfigs: {},
  featureFlags: {},
  error: null,

  // Actions
  setWsConnected: (connected) => set({ wsConnected: connected }),

  setAuth: (auth) => set({ auth }),

  addTask: (task) =>
    set((state) => ({
      activeTasks: [...state.activeTasks, task],
    })),

  removeTask: (taskId) =>
    set((state) => ({
      activeTasks: state.activeTasks.filter((t) => t.taskId !== taskId),
    })),

  clearTasks: () => set({ activeTasks: [] }),

  setPlatformConfigs: (configs) => set({ platformConfigs: configs }),

  setFeatureFlags: (flags) => set({ featureFlags: flags }),

  setError: (error) => set({ error }),
}));
