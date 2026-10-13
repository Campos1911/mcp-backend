import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

const server = new McpServer({
  name: 'tasks-mcp-server',
  version: '1.0.0',
});

// ==========================================
// 1. TOOLS (Ações executáveis para a IA)
// ==========================================

// Ferramenta 1: Listar e filtrar tarefas
server.tool(
  'list_tasks',
  'Lista tarefas cadastradas no backend com filtros opcionais de status, prioridade ou termo de busca',
  {
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional().describe('Filtrar por status'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().describe('Filtrar por prioridade'),
    search: z.string().optional().describe('Termo para buscar no título ou descrição'),
  },
  async ({ status, priority, search }) => {
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);
      if (search) params.set('search', search);

      const url = API_BASE_URL + '/tasks' + (params.toString() ? '?' + params.toString() : '');
      const response = await fetch(url);

      if (!response.ok) {
        return {
          content: [{ type: 'text', text: 'Erro ao buscar tarefas: HTTP ' + response.status }],
          isError: true,
        };
      }

      const tasks = await response.json();
      return {
        content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: 'Falha de conexão com backend: ' + String(error) }],
        isError: true,
      };
    }
  },
);

// Ferramenta 2: Criar uma nova tarefa
server.tool(
  'create_task',
  'Cria uma nova tarefa no gerenciador de tarefas do backend',
  {
    title: z.string().describe('Título claro da tarefa'),
    description: z.string().optional().describe('Descrição detalhada ou passos'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().describe('Nível de prioridade (padrão MEDIUM)'),
  },
  async ({ title, description, priority }) => {
    try {
      const response = await fetch(API_BASE_URL + '/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, priority }),
      });

      if (!response.ok) {
        return {
          content: [{ type: 'text', text: 'Erro ao criar tarefa: HTTP ' + response.status }],
          isError: true,
        };
      }

      const created = await response.json();
      return {
        content: [
          {
            type: 'text',
            text: 'Tarefa criada com sucesso! Dados:\n' + JSON.stringify(created, null, 2),
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

// Ferramenta 3: Atualizar status de uma tarefa existente
server.tool(
  'update_task_status',
  'Atualiza o status de uma tarefa existente por ID (PENDING, IN_PROGRESS, COMPLETED)',
  {
    id: z.string().describe('ID da tarefa'),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).describe('Novo status da tarefa'),
  },
  async ({ id, status }) => {
    try {
      const response = await fetch(API_BASE_URL + '/tasks/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        return {
          content: [{ type: 'text', text: 'Erro ao atualizar tarefa: HTTP ' + response.status }],
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
// 2. RESOURCES (Dados passivos / Contexto)
// ==========================================
server.resource(
  'tasks-stats',
  'tasks://stats',
  async (uri) => {
    try {
      const response = await fetch(API_BASE_URL + '/tasks/stats');
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
            text: JSON.stringify({ error: 'Backend indisponível' }),
            mimeType: 'application/json',
          },
        ],
      };
    }
  },
);

// ==========================================
// 3. PROMPTS (Modelos pré-configurados)
// ==========================================
server.prompt(
  'planejar_dia',
  'Instrui a IA a consultar as tarefas pendentes e montar uma sugestão de planejamento diário',
  async () => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Por favor, consulte as tarefas pendentes usando a ferramenta "list_tasks" (status=PENDING) e verifique o contexto geral em "tasks://stats". Com base nisso, elabore um plano de ação sugerido para o meu dia ordenando por prioridade.',
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
  // IMPORTANTE: Logs em servidores MCP via stdio DEVEM ir para stderr, nunca stdout!
  console.error('[MCP] Servidor de Tarefas MCP iniciado e aguardando conexões via stdio.');
}

bootstrap().catch((err) => {
  console.error('[MCP] Erro fatal no servidor:', err);
  process.exit(1);
});
