import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Suíte de Testes de Segurança (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenUserA: string;
  let tokenUserB: string;
  let userATaskId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();

    // 1. Cadastrar Usuário A (Vítima)
    const regResA = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Usuário Legítimo A',
        email: 'user_a@seguranca.com',
        password: 'senhaSegura123',
      })
      .expect(201);
    tokenUserA = regResA.body.accessToken;

    // 2. Cadastrar Usuário B (Atacante)
    const regResB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Usuário Invasor B',
        email: 'user_b@seguranca.com',
        password: 'senhaSegura123',
      })
      .expect(201);
    tokenUserB = regResB.body.accessToken;

    // 3. Usuário A cria uma tarefa privada
    const taskRes = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', 'Bearer ' + tokenUserA)
      .send({
        title: 'Dados Confidenciais do Usuário A',
        description: 'Informações estritamente privadas',
        priority: 'HIGH',
      })
      .expect(201);
    userATaskId = taskRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Controle de Acesso e BOLA / IDOR', () => {
    it('Usuário B NÃO deve conseguir visualizar tarefa do Usuário A', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/' + userATaskId)
        .set('Authorization', 'Bearer ' + tokenUserB)
        .expect(404);

      expect(response.body.errorCode).toBe('TASK_NOT_FOUND');
      expect(response.body.success).toBe(false);
    });

    it('Usuário B NÃO deve conseguir alterar o status da tarefa do Usuário A', async () => {
      const response = await request(app.getHttpServer())
        .patch('/tasks/' + userATaskId)
        .set('Authorization', 'Bearer ' + tokenUserB)
        .send({ status: 'COMPLETED' })
        .expect(404);

      expect(response.body.errorCode).toBe('TASK_NOT_FOUND');
    });

    it('Usuário B NÃO deve conseguir excluir a tarefa do Usuário A', async () => {
      const response = await request(app.getHttpServer())
        .delete('/tasks/' + userATaskId)
        .set('Authorization', 'Bearer ' + tokenUserB)
        .expect(404);

      expect(response.body.errorCode).toBe('TASK_NOT_FOUND');
    });

    it('A listagem de tarefas do Usuário B deve vir vazia (sem vazar dados do Usuário A)', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', 'Bearer ' + tokenUserB)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.meta.totalItems).toBe(0);
    });
  });

  describe('2. Integridade de Autenticação e JWT', () => {
    it('Deve rejeitar requisições sem cabeçalho Authorization', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks')
        .expect(401);

      expect(response.body.errorCode).toBe('UNAUTHORIZED');
    });

    it('Deve rejeitar requisições sem o prefixo Bearer', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', tokenUserA)
        .expect(401);

      expect(response.body.errorCode).toBe('INVALID_TOKEN_FORMAT');
    });

    it('Deve rejeitar tokens com assinatura adulterada (Tampering)', async () => {
      const tokenAdulterado = tokenUserA.slice(0, -1) + 'x';
      const response = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', 'Bearer ' + tokenAdulterado)
        .expect(401);

      expect(response.body.errorCode).toBe('INVALID_TOKEN');
    });
  });

  describe('3. Validação de Limites e Proteção contra DoS na Paginação', () => {
    it('Deve rejeitar parâmetros de paginação negativos', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks?page=-1&limit=10')
        .set('Authorization', 'Bearer ' + tokenUserA)
        .expect(400);

      expect(response.body.errorCode).toBe('INVALID_PAGINATION_PARAMS');
    });

    it('Deve forçar o teto máximo de segurança (limit=100) contra solicitações abusivas', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks?limit=50000')
        .set('Authorization', 'Bearer ' + tokenUserA)
        .expect(200);

      expect(response.body.meta.limit).toBe(100);
    });
  });

  describe('4. Prevenção de Vazamento de Informações Sensíveis (Info Leak)', () => {
    it('Respostas de erro não devem expor stack traces ou caminhos de arquivos do servidor', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/id-inexistente')
        .set('Authorization', 'Bearer ' + tokenUserA)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errorCode');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('path');
      expect(response.body).toHaveProperty('timestamp');

      expect(response.body.stack).toBeUndefined();
      expect(response.body.trace).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain('/home/');
      expect(JSON.stringify(response.body)).not.toContain('/node_modules/');
    });
  });
});
