import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { TaskPriority } from '../entities/task.entity.js';

export class CreateTaskDto {
  @IsString({ message: 'O título deve ser um texto' })
  @IsNotEmpty({ message: 'O título da tarefa é obrigatório' })
  title: string;

  @IsString({ message: 'A descrição deve ser um texto' })
  @IsOptional()
  description?: string;

  @IsEnum(['LOW', 'MEDIUM', 'HIGH'], {
    message: 'Prioridade inválida. Valores aceitos: LOW, MEDIUM ou HIGH',
  })
  @IsOptional()
  priority?: TaskPriority;
}
