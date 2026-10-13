import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateTaskDto } from './dto/create-task.dto.js';
import type { UpdateTaskDto } from './dto/update-task.dto.js';
import type { FindTasksQueryDto } from './dto/find-tasks-query.dto.js';
import { AppException } from '../common/exceptions/app-exception.js';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface.js';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query?: FindTasksQueryDto): Promise<PaginatedResult<any>> {
    const rawPage = query?.page ?? 1;
    const rawLimit = query?.limit ?? 10;

    const page = Number(rawPage);
    const limit = Number(rawLimit);

    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      throw new AppException(
        'INVALID_PAGINATION_PARAMS',
        'Os parâmetros "page" e "limit" devem ser números inteiros maiores que zero',
        HttpStatus.BAD_REQUEST,
      );
    }

    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const where: any = { userId };
    if (query?.status) where.status = query.status;
    if (query?.priority) where.priority = query.priority;
    if (query?.search) {
      where.OR = [
        { title: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.task.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / safeLimit) || 1;

    return {
      data,
      meta: {
        page,
        limit: safeLimit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(userId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
    });
    if (!task) {
      throw new AppException(
        'TASK_NOT_FOUND',
        'Tarefa com ID ' + id + ' não encontrada',
        HttpStatus.NOT_FOUND,
      );
    }
    return task;
  }

  async create(userId: string, dto: CreateTaskDto) {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new AppException(
        'TASK_TITLE_REQUIRED',
        'O título da tarefa é obrigatório',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prisma.task.create({
      data: {
        userId,
        title: dto.title.trim(),
        description: dto.description,
        status: 'PENDING',
        priority: dto.priority ?? 'MEDIUM',
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    await this.findOne(userId, id);

    if (dto.title !== undefined) {
      if (dto.title.trim().length === 0) {
        throw new AppException(
          'TASK_TITLE_EMPTY',
          'O título da tarefa não pode ser vazio',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.priority !== undefined) data.priority = dto.priority;

    return this.prisma.task.update({
      where: { id },
      data,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.task.delete({ where: { id } });
    return { success: true, message: 'Tarefa ' + id + ' removida com sucesso' };
  }

  async getStats(userId: string) {
    const [total, pending, inProgress, completed] = await Promise.all([
      this.prisma.task.count({ where: { userId } }),
      this.prisma.task.count({ where: { userId, status: 'PENDING' } }),
      this.prisma.task.count({ where: { userId, status: 'IN_PROGRESS' } }),
      this.prisma.task.count({ where: { userId, status: 'COMPLETED' } }),
    ]);

    return {
      total,
      byStatus: { pending, inProgress, completed },
      completionRate: total > 0 ? Math.round((completed / total) * 100) + '%' : '0%',
    };
  }
}
