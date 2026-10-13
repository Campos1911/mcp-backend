import { NestFactory } from '@nestjs/core';
import { ValidationPipe, HttpStatus } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { AppException } from './common/exceptions/app-exception.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        const hasPagination = errors.some((e) => e.property === 'page' || e.property === 'limit');
        const formatted = errors
          .map((e) => Object.values(e.constraints || {}))
          .flat();

        return new AppException(
          hasPagination ? 'INVALID_PAGINATION_PARAMS' : 'VALIDATION_ERROR',
          formatted.length === 1 ? formatted[0] : formatted.join(', '),
          HttpStatus.BAD_REQUEST,
        );
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
