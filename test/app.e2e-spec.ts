import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('App Bootstrap & Observabilidade (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('Aplicação deve inicializar todos os módulos com sucesso', () => {
    expect(app).toBeDefined();
  });

  it('GET /health deve responder 200 com status do banco e memória saudáveis', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.info.database.status).toBe('up');
    expect(response.body.info.memory_heap.status).toBe('up');
  });

  afterAll(async () => {
    await app.close();
  });
});
