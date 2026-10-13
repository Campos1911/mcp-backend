import { TaskPriority, TaskStatus } from '../entities/task.entity.js';

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}
