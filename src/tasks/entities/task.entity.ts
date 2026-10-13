export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
}
