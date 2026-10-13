import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const DEFAULT_EMAIL = process.env.MCP_USER_EMAIL || 'anthoni@teste.com';
const DEFAULT_PASSWORD = process.env.MCP_USER_PASSWORD || 'senha123456';

let cachedToken = process.env.API_TOKEN || '';

// ==========================================
// CLIENTE HTTP AUTENTICADO COM AUTO-HEALING
// ==========================================
async function getAuthToken(): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }

  // 1. Tentar Login
  try {
    const loginRes = await fetch(API_BASE_URL + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD }),
    });

    if (loginRes.ok) {
      const data = (await loginRes.json()) as { accessToken: string };
      cachedToken = data.accessToken;
      return cachedToken;
    }
  } catch (err) {
    console.error('[MCP] Falha ao tentar login:', err);
  }

  // 2. Se o usuário não existir (ex: backend reiniciou memória), registra automaticamente
  try {
    const regRes = await fetch(API_BASE_URL + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Anthoni (MCP)',
        email: DEFAULT_EMAIL,
        password: DEFAULT_PASSWORD,
      }),
    });

    if (regRes.ok) {
      const data = (await regRes.json()) as { accessToken: string };
      cachedToken = data.accessToken;
      return cachedToken;
    }
  } catch (err) {
    console.error('[MCP] Falha ao registrar usuário padrão:', err);
  }

  return '';
}

async function authenticatedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  let token = await getAuthToken();

  const makeHeaders = (t: string) => {
    const headers = new Headers(options.headers || {});
    if (t) {
      headers.set('Authorization', 'Bearer ' + t);
    }
    return headers;
  };

  let res = await fetch(API_BASE_URL + path, {
    ...options,
    headers: makeHeaders(token),
  });

  // Se receber 401 e não for token fixo de env, limpa o cache e tenta uma nova autenticação
  if (res.status === 401 && !process.env.API_TOKEN) {
    cachedToken = '';
    token = await getAuthToken();
    res = await fetch(API_BASE_URL + path, {
      ...options,
      headers: makeHeaders(token),
    });
  }

  return res;
}

const server = new McpServer({
  name: 'tasks-mcp-server',
  version: '2.0.0',
});

// ==========================================
// 1. TOOLS (Ações executáveis pela IA)
// ==========================================

// Ferramenta 1: Listar tarefas com suporte à paginação e filtros
server.tool(
  'list_tasks',
  'Lista tarefas do usuário autenticado com filtros e suporte a paginação',
  {
    page: z.number().int().positive().optional().describe('Número da página (padrão: 1)'),
    limit: z.number().int().positive().max(100).optional().describe('Itens por página (padrão: 10, max: 100)'),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional().describe('Filtrar por status'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().describe('Filtrar por prioridade'),
    search: z.string().optional().describe('Termo de busca no título ou descrição'),
  },
  async ({ page, limit, status, priority, search }) => {
    try {
      const params = new URLSearchParams();
      if (page) params.set('page', String(page));
      if (limit) params.set('limit', String(limit));
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);
      if (search) params.set('search', search);

      const url = '/tasks' + (params.toString() ? '?' + params.toString() : '');
      const response = await authenticatedFetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: 'Erro [' + errorData.errorCode + ']: ' + errorData.message,
            },
          ],
          isError: true,
        };
      }

      const result = await response.json();
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: 'Falha de conexão com backend: ' + String(error) }],
        isError: true,
      };
    }
  },
);

// Ferramenta 2: Criar tarefa
server.tool(
  'create_task',
  'Cria uma nova tarefa associada ao usuário autenticado',
  {
    title: z.string().describe('Título claro da tarefa'),
    description: z.string().optional().describe('Descrição detalhada da tarefa'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().describe('Prioridade da tarefa (padrão MEDIUM)'),
  },
  async ({ title, description, priority }) => {
    try {
      const response = await authenticatedFetch('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, priority }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: 'Erro [' + errorData.errorCode + ']: ' + errorData.message,
            },
          ],
          isError: true,
        };
      }

      const created = await response.json();
      return {
        content: [
          {
            type: 'text',
            text: 'Tarefa criada com sucesso!\n' + JSON.stringify(created, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: 'Falha ao conectar ao backend: ' + String(error) }],
        isError: true,
      };
    }
  },
);

// Ferramenta 3: Atualizar status da tarefa
server.tool(
  'update_task_status',
  'Atualiza o status de uma tarefa do usuário autenticado',
  {
    id: z.string().describe('ID da tarefa a ser alterada'),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).describe('Novo status da tarefa'),
  },
  async ({ id, status }) => {
    try {
      const response = await authenticatedFetch('/tasks/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: 'Erro [' + errorData.errorCode + ']: ' + errorData.message,
            },
          ],
          isError: true,
        };
      }

      const updated = await response.json();
      return {
        content: [
          {
            type: 'text',
            text: 'Tarefa atualizada com sucesso:\n' + JSON.stringify(updated, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: 'Falha ao conectar ao backend: ' + String(error) }],
        isError: true,
      };
    }
  },
);

// ==========================================
// 2. RESOURCES (Contexto Passivo)
// ==========================================
server.resource(
  'tasks-stats',
  'tasks://stats',
  async (uri) => {
    try {
      const response = await authenticatedFetch('/tasks/stats');
      const stats = await response.json();

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(stats, null, 2),
            mimeType: 'application/json',
          },
        ],
      };
    } catch (error) {
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify({ error: 'Backend indisponível: ' + String(error) }),
            mimeType: 'application/json',
          },
        ],
      };
    }
  },
);

// ==========================================
// 3. PROMPTS (Templates de Instruções)
// ==========================================
server.prompt(
  'planejar_dia',
  'Instrui a IA a consultar as tarefas do usuário autenticado e montar uma rotina diária',
  async () => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Por favor, consulte a lista de tarefas pendentes (status=PENDING) com "list_tasks" e leia o contexto estatístico em "tasks://stats". Com base nas prioridades, proponha um plano ordenado para a minha jornada de hoje.',
          },
        },
      ],
    };
  },
);

// ==========================================
// 4. TRANSPORTE (STDIO)
// ==========================================
async function bootstrap() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] Servidor MCP v2 (Autenticado & Paginado) conectado via stdio.');
}

bootstrap().catch((err) => {
  console.error('[MCP] Erro fatal no servidor:', err);
  process.exit(1);
});
