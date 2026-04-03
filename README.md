# Financial OS 🇮🇳

> AI-powered personal finance decision engine for India

## Stack
- **Frontend**: React 18 + Vite + TailwindCSS + React Router
- **Backend**: Node.js + Express + PostgreSQL
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514)
- **Auth**: JWT + bcrypt
- **Infra**: AWS ECS Fargate + RDS PostgreSQL + S3 + CloudFront
- **IaC**: Terraform
- **CI/CD**: GitHub Actions

## Project Structure

```
financial-os/
├── frontend/          # React Vite app
├── backend/           # Express API server
├── infrastructure/    # Terraform + Docker
├── scripts/           # Helper scripts
└── docker-compose.yml # Local development
```

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- PostgreSQL 15 (or use Docker)
- Anthropic API Key

### 1. Clone & Install
```bash
git clone <repo>
cd financial-os
cp .env.example .env   # Fill in your values
```

### 2. Start with Docker Compose
```bash
docker-compose up --build
```
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- PgAdmin: http://localhost:5050

### 3. Manual Setup (without Docker)
```bash
# Backend
cd backend
npm install
npm run migrate
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/financialos
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ANTHROPIC_API_KEY=sk-ant-...
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001/api
```

## AWS Deployment

See [infrastructure/README.md](./infrastructure/README.md) for full AWS deployment guide.

```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

## API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET  /api/auth/me`

### Profile
- `POST /api/profile`  
- `GET  /api/profile`

### Finance
- `POST /api/finance/allocate`
- `POST /api/finance/simulate`
- `GET  /api/finance/health-score`
- `GET  /api/finance/history`

### AI Advisor
- `POST /api/advisor/chat`
- `GET  /api/advisor/history`

## License
MIT
