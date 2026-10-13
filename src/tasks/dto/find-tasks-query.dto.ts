import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { TaskPriority, TaskStatus } from '../entities/task.entity.js';

export class FindTasksQueryDto {
  @Type(() => Number)
  @IsInt({ message: 'O parâmetro "page" deve ser um número inteiro' })
  @Min(1, { message: 'Os parâmetros "page" e "limit" devem ser números inteiros maiores que zero' })
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt({ message: 'O parâmetro "limit" deve ser um número inteiro' })
  @Min(1, { message: 'Os parâmetros "page" e "limit" devem ser números inteiros maiores que zero' })
  @IsOptional()
  limit?: number;

  @IsEnum(['PENDING', 'IN_PROGRESS', 'COMPLETED'], { message: 'Status de filtro inválido' })
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(['LOW', 'MEDIUM', 'HIGH'], { message: 'Prioridade de filtro inválida' })
  @IsOptional()
  priority?: TaskPriority;

  @IsString()
  @IsOptional()
  search?: string;
}
