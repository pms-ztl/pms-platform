// ============================================================================
// Mentoring API
// ============================================================================

import { api } from './client';

export interface MentorMatch {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  department?: string;
  avatarUrl?: string;
  compatibilityScore: number;
  sharedSkills: string[];
  complementarySkills: string[];
  yearsExperience: number;
}

export interface Mentorship {
  id: string;
  mentorId: string;
  menteeId: string;
  mentor: { firstName: string; lastName: string; jobTitle?: string; avatarUrl?: string };
  mentee: { firstName: string; lastName: string; jobTitle?: string; avatarUrl?: string };
  status: 'active' | 'completed' | 'paused';
  startedAt: string;
  focusAreas: string[];
}

export interface LearningPathItem {
  id: string;
  title: string;
  type: 'course' | 'project' | 'mentorship' | 'certification' | 'book';
  status: 'not_started' | 'in_progress' | 'completed';
  estimatedHours: number;
  targetSkill: string;
}

export const mentoringApi = {
  getMatches: () => api.get<MentorMatch[]>('/mentoring/matches'),
  requestMentorship: (mentorId: string, focusAreas: string[]) =>
    api.post<Mentorship>('/mentoring/request', { mentorId, focusAreas }),
  getMyMentorships: () => api.get<Mentorship[]>('/mentoring/my-mentorships'),
  getLearningPath: () => api.get<LearningPathItem[]>('/mentoring/learning-path'),
};
