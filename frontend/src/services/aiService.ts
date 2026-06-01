import { api } from './api';

export interface AiTaskSuggestion {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  labels: string[];
}

export interface SuggestTasksResponse {
  tasks: AiTaskSuggestion[];
  model: string;
  count: number;
}

export const aiService = {
  suggestTasks: (projectName: string, description?: string, count = 8) =>
    api
      .post<{ success: boolean; data: SuggestTasksResponse }>('/ai/suggest-tasks', {
        projectName,
        description,
        count,
      })
      .then(r => r.data.data!),
};
