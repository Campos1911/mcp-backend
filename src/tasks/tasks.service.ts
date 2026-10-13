import { Injectable, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Task, TaskPriority, TaskStatus } from './entities/task.entity.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { AppException } from '../common/exceptions/app-exception.js';

@Injectable()
export class TasksService {
  private tasks: Task[] = [];

  findAll(
    userId: string,
    filters?: { status?: TaskStatus; priority?: TaskPriority; search?: string },
  ): Task[] {
    let result = this.tasks.filter((task) => task.userId === userId);

    if (filters?.status) {
      result = result.filter((task) => task.status === filters.status);
    }
    if (filters?.priority) {
      result = result.filter((task) => task.priority === filters.priority);
    }
    if (filters?.search) {
      const term = filters.search.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(term) ||
          (task.description && task.description.toLowerCase().includes(term)),
      );
    }

    return result;
  }

  findOne(userId: string, id: string): Task {
    const task = this.tasks.find((t) => t.id === id && t.userId === userId);
    if (!task) {
      throw new AppException(
        'TASK_NOT_FOUND',
        'Tarefa com ID ' + id + ' não encontrada',
        HttpStatus.NOT_FOUND,
      );
    }
    return task;
  }

  create(userId: string, dto: CreateTaskDto): Task {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new AppException(
        'TASK_TITLE_REQUIRED',
        'O título da tarefa é obrigatório',
        HttpStatus.BAD_REQUEST,
      );
    }

    const now = new Date().toISOString();
    const newTask: Task = {
      id: randomUUID(),
      userId,
      title: dto.title.trim(),
      description: dto.description,
      status: 'PENDING',
      priority: dto.priority ?? 'MEDIUM',
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.push(newTask);
    return newTask;
  }

  update(userId: string, id: string, dto: UpdateTaskDto): Task {
    const task = this.findOne(userId, id);
    if (dto.title !== undefined) {
      if (dto.title.trim().length === 0) {
        throw new AppException(
          'TASK_TITLE_EMPTY',
          'O título da tarefa não pode ser vazio',
          HttpStatus.BAD_REQUEST,
        );
      }
      task.title = dto.title.trim();
    }
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.priority !== undefined) task.priority = dto.priority;
    task.updatedAt = new Date().toISOString();
    return task;
  }

  remove(userId: string, id: string): { success: boolean; message: string } {
    const index = this.tasks.findIndex((t) => t.id === id && t.userId === userId);
    if (index === -1) {
      throw new AppException(
        'TASK_NOT_FOUND',
        'Tarefa com ID ' + id + ' não encontrada',
        HttpStatus.NOT_FOUND,
      );
    }
    this.tasks.splice(index, 1);
    return { success: true, message: 'Tarefa ' + id + ' removida com sucesso' };
  }

  getStats(userId: string) {
    const userTasks = this.tasks.filter((t) => t.userId === userId);
    const total = userTasks.length;
    const pending = userTasks.filter((t) => t.status === 'PENDING').length;
    const inProgress = userTasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const completed = userTasks.filter((t) => t.status === 'COMPLETED').length;

    return {
      total,
      byStatus: { pending, inProgress, completed },
      completionRate: total > 0 ? Math.round((completed / total) * 100) + '%' : '0%',
    };
  }
}
