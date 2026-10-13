import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import type { CreateTaskDto } from './dto/create-task.dto.js';
import type { UpdateTaskDto } from './dto/update-task.dto.js';
import type { TaskPriority, TaskStatus } from './entities/task.entity.js';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('stats')
  getStats() {
    return this.tasksService.getStats();
  }

  @Get()
  findAll(
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: TaskPriority,
    @Query('search') search?: string,
  ) {
    return this.tasksService.findAll({ status, priority, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post()
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
