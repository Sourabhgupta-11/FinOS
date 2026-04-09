# FinOS — AI Personal Finance OS for India

> Your complete financial operating system. Salary allocation, AI advisor, expense tracking, tax calculator, portfolio tracker, and bank linking — all in one app.

## Tech Stack

| Layer              | Tech                               |
| ------------------ | ---------------------------------- |
| Frontend           | React 18 + Vite + TailwindCSS      |
| Backend            | Node.js + Express                  |
| Database           | PostgreSQL 15                      |
| AI                 | Groq (Llama 3.3 70B) + RAG         |
| Cache              | Redis                              |
| Payments           | Razorpay                           |
| Bank Linking       | Setu Account Aggregator            |
| Push Notifications | Web Push (VAPID)                   |
| Infrastructure     | AWS ECS Fargate + RDS + CloudFront |

## Plans

|                      | Free      | Pro ₹99/mo  | Premium ₹199/mo |
| -------------------- | --------- | ----------- | --------------- |
| Salary Allocator     | ✓         | ✓           | ✓               |
| AI Advisor           | 5 msg/day | 100 msg/day | Unlimited       |
| Health Score         | ✓         | ✓           | ✓               |
| Expense Tracker      | ✗         | ✓           | ✓               |
| Bank Account Linking | ✗         | ✓           | ✓               |
| Tax Calculator       | ✗         | ✓           | ✓               |
| Budget Manager       | ✗         | ✓           | ✓               |
| Decision Simulator   | ✗         | ✓           | ✓               |
| Allocation History   | ✗         | ✓           | ✓               |
| Portfolio Tracker    | ✗         | ✗           | ✓               |

## Quick Start

```bash
# 1. Clone and configure
cp backend/.env.example backend/.env
# Edit backend/.env — add GROQ_API_KEY at minimum

# 2. Run everything
docker compose up --build

# App:    http://localhost:5173
# API:    http://localhost:3001
# pgAdmin: http://localhost:5050
# Demo login: demo@financialos.in / demo1234
```

## Get a Free Groq API Key

1. Go to https://console.groq.com
2. Sign up (free, no credit card)
3. Create API key
4. Add to `backend/.env`: `GROQ_API_KEY=gsk_...`

## AWS Deployment

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
# Fill in values
terraform init && terraform apply
```

See `SETUP.md` for complete deployment guide.
