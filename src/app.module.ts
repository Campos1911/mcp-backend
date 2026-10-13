import { Module } from '@nestjs/common';
import { TasksModule } from './tasks/tasks.module.js';

@Module({
  imports: [TasksModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
