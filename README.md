# Enterprise NestJS Backend & Model Context Protocol (MCP) Server

[![Node.js Version](https://img.shields.io/badge/Node.js-v24-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![NestJS Version](https://img.shields.io/badge/NestJS-v12-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma Version](https://img.shields.io/badge/Prisma-v7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![MCP](https://img.shields.io/badge/Protocol-MCP-4B32C3)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A production-grade backend and autonomous **Model Context Protocol (MCP)** server built with **NestJS 12**, **Node.js 24**, and **Prisma 7**.

This repository showcases a dual architecture: an enterprise REST API with rigorous security defenses and an integrated MCP stdio server designed to connect large language models (**Claude Desktop**, **Cursor**, **Windsurf**) directly to private business logic.

---

## 🏛️ System Architecture

```text
┌────────────────────────────────────────────────────────┐
│                   AI Clients & LLMs                    │
│        (Claude Desktop / Cursor IDE / Windsurf)        │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ stdio (JSON-RPC)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   MCP Stdio Server                     │
│  • Tools: list_tasks, create_task, update_task_status  │
│  • Resource: tasks://stats                             │
│  • Prompt: planejar_dia                                │
│  • Auto-Healing JWT Session Manager                    │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ HTTP + Bearer Token
                            ▼
┌────────────────────────────────────────────────────────┐
│                   NestJS 12 Backend                    │
│  • Global Sanitization (ValidationPipe + Whitelist)    │
│  • Rate Limiting / Anti-Brute-Force (ThrottlerGuard)   │
│  • JWT Auth Guard + @CurrentUser Decorator             │
│  • Strict Multi-Tenant Data Isolation (Zero BOLA)      │
│  • Health Check & Observability (/health)              │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ Prisma 7 (Driver Adapter)
                            ▼
┌────────────────────────────────────────────────────────┐
│                  SQLite Database Disk                  │
│               (prisma/dev.db Persistent)               │
└────────────────────────────────────────────────────────┘
```

---

## ✨ Engineering Highlights

* **Model Context Protocol (MCP):** Exposes tools with pagination support, context resources, and structured prompt templates over `stdio` using `@modelcontextprotocol/sdk` and `zod`.
* **Zero BOLA / IDOR:** Strict tenant data isolation enforced at the database query level. Users cannot access, modify, or infer resources belonging to other tenants.
* **Persistent Relational DB:** Powered by **Prisma 7** using the modern driver adapter (`@prisma/adapter-better-sqlite3`) with automatic schema synchronization.
* **Brute-Force & DoS Protection:** `@nestjs/throttler` guards with strict per-IP rate limits on sensitive endpoints (max 5 login attempts/minute).
* **Enterprise Validation:** Global `ValidationPipe` combined with `class-validator` and `class-transformer` stripping unwhitelisted properties to prevent Mass Assignment.
* **Standardized Error Handling:** Global exception filter intercepting errors into predictable envelopes (`{ success, statusCode, errorCode, message, path, timestamp }`), completely preventing stack trace or internal path leaks.
* **Liveness & Readiness Probes:** `/health` check powered by `@nestjs/terminus` verifying database connection and memory heap consumption.
* **Automated Security E2E Suite:** 12+ comprehensive end-to-end test scenarios asserting auth integrity, token tampering prevention, rate limit enforcement, and isolation guarantees.
* **Multi-Stage Containerization:** Optimized `Dockerfile` and `docker-compose.yml` with health checks and persistent volume mounting.

---

## 🚀 Quickstart

### Option A: Running with Docker Compose (Recommended)

```bash
# Build and run container in detached mode
docker compose up --build -d

# Check running container health
docker compose ps
```

### Option B: Running Locally

**Prerequisites:** Node.js 24+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Push schema to local SQLite database
npm run db:push

# 3. Start development server
npm run start:dev
```

The server will be listening at `http://localhost:3000`.

---

## 🤖 Running the MCP Server

The MCP server connects local AI clients to the backend via `stdio`.

### 1. Test via MCP Inspector (Official GUI)

```bash
# In a separate terminal while backend is running:
npm run inspector
```
Open the generated local URL in your browser to inspect tools, prompts, and resources.

### 2. Configure in Claude Desktop

Add this server to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "task-manager-backend": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/teste-mcp-backend/dist/mcp.js"]
    }
  }
}
```

### 3. Configure in Cursor IDE

Go to **Settings $\rightarrow$ Features $\rightarrow$ MCP $\rightarrow$ Add New MCP Server**:
* **Name:** `tasks-backend`
* **Type:** `command`
* **Command:** `node /ABSOLUTE/PATH/TO/teste-mcp-backend/dist/mcp.js`

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description | Rate Limit |
|---|---|---|---|
| `POST` | `/auth/register` | Register new user and returns JWT token | 10 req/min |
| `POST` | `/auth/login` | Authenticate and returns JWT token | 5 req/min |

### Tasks (Protected - Requires `Authorization: Bearer <token>`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/tasks?page=1&limit=10` | List authenticated user's tasks with pagination |
| `GET` | `/tasks/:id` | Get details of a specific task |
| `POST` | `/tasks` | Create a new task |
| `PATCH` | `/tasks/:id` | Update task status or fields |
| `DELETE` | `/tasks/:id` | Remove task |
| `GET` | `/tasks/stats` | Aggregate completion metrics and counts |

### Observability
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe (Prisma DB status + Memory heap) |

---

## 🧪 Testing

Run the automated test suite:

```bash
# Run End-to-End & Security test suite
npm run test:e2e

# Run with verbose details
npm run test:e2e -- --verbose
```

---

## 🔒 Security Best Practices Implemented

* **Strict Input Whitelisting:** Prevents malicious payload injections.
* **Tamper-Proof JWT:** Validates cryptographic signature and expiration on every protected request.
* **Resource Enumeration Defense:** Returns `404 TASK_NOT_FOUND` rather than `403 FORBIDDEN` on unauthorized ID lookups to eliminate resource enumeration.
* **Upper Limit Bounds:** Restricts pagination `limit` to a maximum of 100 items to defend against heap exhaustion (DoS).
* **AI Security Isolation:** MCP tools do not expose tenant IDs to model prompts; authentication context is sealed within the transport JWT.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
