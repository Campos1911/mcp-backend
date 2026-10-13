import { TaskPriority } from '../entities/task.entity.js';

export interface CreateTaskDto {
  title: string;
  description?: string;
  priority?: TaskPriority;
}
