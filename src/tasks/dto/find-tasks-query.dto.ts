import type { TaskPriority, TaskStatus } from '../entities/task.entity.js';

export interface FindTasksQueryDto {
  page?: number;
  limit?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
}
