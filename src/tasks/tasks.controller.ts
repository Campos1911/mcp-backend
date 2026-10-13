import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import type { CreateTaskDto } from './dto/create-task.dto.js';
import type { UpdateTaskDto } from './dto/update-task.dto.js';
import type { TaskPriority, TaskStatus } from './entities/task.entity.js';
import { JwtAuthGuard, type AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('stats')
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.getStats(user.sub);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: TaskPriority,
    @Query('search') search?: string,
  ) {
    return this.tasksService.findAll(user.sub, { status, priority, search });
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tasksService.findOne(user.sub, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(user.sub, createTaskDto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user.sub, id, updateTaskDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tasksService.remove(user.sub, id);
  }
}
