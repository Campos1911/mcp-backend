import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import type { TaskPriority, TaskStatus } from '../entities/task.entity.js';

export class UpdateTaskDto {
  @IsString()
  @MinLength(1, { message: 'O título da tarefa não pode ser vazio' })
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['PENDING', 'IN_PROGRESS', 'COMPLETED'], {
    message: 'Status inválido. Valores aceitos: PENDING, IN_PROGRESS ou COMPLETED',
  })
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(['LOW', 'MEDIUM', 'HIGH'], {
    message: 'Prioridade inválida. Valores aceitos: LOW, MEDIUM ou HIGH',
  })
  @IsOptional()
  priority?: TaskPriority;
}
