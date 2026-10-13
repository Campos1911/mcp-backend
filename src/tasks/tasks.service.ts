import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Task, TaskPriority, TaskStatus } from './entities/task.entity.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';

@Injectable()
export class TasksService {
  private tasks: Task[] = [
    {
      id: randomUUID(),
      title: 'Aprender conceitos do MCP',
      description: 'Estudar ferramentas (Tools), recursos (Resources) e prompts',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  findAll(filters?: { status?: TaskStatus; priority?: TaskPriority; search?: string }): Task[] {
    let result = [...this.tasks];

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

  findOne(id: string): Task {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) {
      throw new NotFoundException('Tarefa com ID ' + id + ' não encontrada');
    }
    return task;
  }

  create(dto: CreateTaskDto): Task {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: randomUUID(),
      title: dto.title,
      description: dto.description,
      status: 'PENDING',
      priority: dto.priority ?? 'MEDIUM',
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.push(newTask);
    return newTask;
  }

  update(id: string, dto: UpdateTaskDto): Task {
    const task = this.findOne(id);
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.priority !== undefined) task.priority = dto.priority;
    task.updatedAt = new Date().toISOString();
    return task;
  }

  remove(id: string): { success: boolean; message: string } {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundException('Tarefa com ID ' + id + ' não encontrada');
    }
    this.tasks.splice(index, 1);
    return { success: true, message: 'Tarefa ' + id + ' removida com sucesso' };
  }

  getStats() {
    const total = this.tasks.length;
    const pending = this.tasks.filter((t) => t.status === 'PENDING').length;
    const inProgress = this.tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const completed = this.tasks.filter((t) => t.status === 'COMPLETED').length;

    return {
      total,
      byStatus: { pending, inProgress, completed },
      completionRate: total > 0 ? Math.round((completed / total) * 100) + '%' : '0%',
    };
  }
}
