import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { SkillInfo, SkillDetail } from '../types/skill';

interface SkillsState {
  skills: SkillInfo[];
  selectedSkill: SkillDetail | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadSkills: () => Promise<void>;
  selectSkill: (skillName: string | null) => Promise<void>;
  clearSelection: () => void;
}

export const useSkillsStore = create<SkillsState>((set) => ({
  skills: [],
  selectedSkill: null,
  loading: false,
  error: null,

  loadSkills: async () => {
    set({ loading: true, error: null });
    try {
      const skills = await invoke<SkillInfo[]>('list_skills');
      set({ skills, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  selectSkill: async (skillName: string | null) => {
    if (!skillName) {
      set({ selectedSkill: null });
      return;
    }

    try {
      const detail = await invoke<SkillDetail>('get_skill', { skillName });
      set({ selectedSkill: detail });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  clearSelection: () => {
    set({ selectedSkill: null });
  },
}));
