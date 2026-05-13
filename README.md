# CollabAI Platform

An AI-powered real-time collaboration platform built as a NestJS monorepo of microservices. CollabAI provides workspace management, real-time chat, AI-assisted features, and a secure JWT-based authentication system.

---

## Architecture

```
collabai-platform/
├── apps/
│   ├── api-gateway/          # Public-facing API (port 3000)
│   ├── auth-service/         # Authentication & authorization (port 3001)
│   ├── ai-service/           # AI features
│   ├── chat-service/         # Real-time chat
│   ├── notification-service/ # Notifications
│   └── workspace-service/    # Workspace management
├── libs/
│   ├── auth/                 # Shared JWT guards, decorators, RolesGuard
│   ├── common/               # AllExceptionsFilter, shared utilities
│   └── database/             # Prisma service
└── prisma/                   # Schema & migrations
```

### Services

| Service              | Port | Description                                      |
|----------------------|------|--------------------------------------------------|
| API Gateway          | 3000 | Single entry point; routes to downstream services |
| Auth Service         | 3001 | Register, login, token refresh, logout, `/me`    |
| AI Service           | —    | AI-assisted collaboration features               |
| Chat Service         | —    | Real-time messaging                              |
| Notification Service | —    | Push / in-app notifications                      |
| Workspace Service    | —    | Workspace and member management                  |

### Shared Libraries

| Library       | Path alias    | Exports                                          |
|---------------|---------------|--------------------------------------------------|
| `auth`        | `@app/auth`   | `CurrentUser` decorator, `Roles` decorator, `RolesGuard`, `AuthModule` |
| `database`    | `@app/database` | `DatabaseModule`, `PrismaService`              |
| `common`      | `@app/common` | `AllExceptionsFilter`                            |

---

## Tech Stack

- **Runtime** — Node.js, NestJS 11, TypeScript 5.9
- **Database** — PostgreSQL 16 via Prisma ORM
- **Cache / Pub-Sub** — Redis 7
- **Message Broker** — Apache Kafka (Confluent)
- **Auth** — JWT access + refresh tokens (rotation + reuse detection), Passport.js, bcrypt
- **API Docs** — Swagger / OpenAPI (`/docs` on each service)
- **Security** — Helmet, CORS, compression, `ValidationPipe` (whitelist mode)

---

## Prerequisites

- Node.js ≥ 20
- Docker & Docker Compose
- npm ≥ 10

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start infrastructure

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Kafka on `localhost:9092`

### 3. Configure environment

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://postgres:root@localhost:5432/collabai"

# Auth Service
AUTH_SERVICE_PORT=3001
JWT_ACCESS_SECRET=your-access-secret-change-me
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-change-me
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# API Gateway
API_GATEWAY_PORT=3000
```

### 4. Run database migrations

```bash
npx prisma migrate deploy
```

Generate the Prisma client (already runs on `npm install` via postinstall, but if needed):

```bash
npx prisma generate
```

### 5. Start services

```bash
# Auth Service
npm run start:dev auth-service

# API Gateway
npm run start:dev api-gateway
```

---

## Auth Service — API Reference

Base URL: `http://localhost:3001/api/v1`  
Swagger docs: `http://localhost:3001/docs`

### Endpoints

| Method | Path              | Auth     | Description                        |
|--------|-------------------|----------|------------------------------------|
| POST   | `/auth/register`  | None     | Create a new account               |
| POST   | `/auth/login`     | None     | Login and receive tokens           |
| POST   | `/auth/refresh`   | Refresh  | Rotate refresh token               |
| POST   | `/auth/logout`    | None     | Revoke refresh token family        |
| GET    | `/auth/me`        | Bearer   | Return the authenticated user      |

### Register

```json
POST /auth/register
{
  "email": "jane@collabai.dev",
  "password": "Str0ngP@ss!",
  "name": "Jane Doe"
}
```

### Login

```json
POST /auth/login
{
  "email": "jane@collabai.dev",
  "password": "Str0ngP@ss!"
}
```

Response:
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

### Refresh

```json
POST /auth/refresh
{
  "refreshToken": "<jwt>"
}
```

The old refresh token is revoked and a new pair is issued. Reuse of a revoked token revokes the entire token family (refresh token rotation).

---

## Auth Design

- **Access token** — short-lived (default 15 min), stateless JWT verified by signature
- **Refresh token** — long-lived (default 7 days), SHA-256 hash stored in `refresh_tokens` table
- **Token rotation** — each `/refresh` call revokes the presented token and issues a new family member
- **Reuse detection** — presenting an already-revoked refresh token immediately revokes all tokens in that family
- **Role-based access** — `RolesGuard` + `@Roles()` decorator, user roles: `USER | ADMIN`

---

## Database Schema

```prisma
model User {
  id            String         @id @default(uuid())
  email         String         @unique
  password      String         // bcrypt hash
  name          String?
  role          Role           @default(USER)
  isActive      Boolean        @default(true)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  refreshTokens RefreshToken[]
}

model RefreshToken {
  id         String    @id @default(uuid())
  tokenHash  String    @unique   // SHA-256 of the raw token
  userId     String
  family     String              // token rotation family
  expiresAt  DateTime
  revokedAt  DateTime?
  replacedBy String?             // audit chain
  userAgent  String?
  ipAddress  String?
  createdAt  DateTime  @default(now())
}
```

---

## Development Scripts

```bash
# Build all
npm run build

# Format
npm run format

# Lint (with auto-fix)
npm run lint

# Unit tests
npm run test

# Test coverage
npm run test:cov

# Prisma Studio
npx prisma studio
```

---

## Project Status

| Day | Feature                                                           |
|-----|-------------------------------------------------------------------|
| 1   | Monorepo setup, Docker infra, Prisma, shared libs, Swagger        |
| 2   | Auth service — register, login, JWT rotation, reuse detection     |

---

## License

Private — all rights reserved.
