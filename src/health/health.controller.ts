import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // 1. Checagem do Banco de Dados SQLite / Prisma
      async () => {
        try {
          await this.prisma.user.count();
          return { database: { status: 'up' } };
        } catch (error) {
          return { database: { status: 'down', message: String(error) } };
        }
      },
      // 2. Checagem de Consumo de Memória Heap (Alerta se passar de 300MB)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
    ]);
  }
}
