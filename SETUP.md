# Financial OS — Complete Setup Guide

This guide takes you from zero to a fully running app, locally and on AWS.

---

## Part 1: Local Development (30 minutes)

### Step 1: Prerequisites

Install these if you don't have them:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | https://nodejs.org |
| Docker Desktop | latest | https://docker.com |
| Git | any | https://git-scm.com |

Verify:
```bash
node -v        # v20.x.x
npm -v         # 10.x.x
docker -v      # Docker version 25+
```

---

### Step 2: Get a FREE Groq API Key

1. Go to https://console.groq.com
2. Sign up (free — no credit card needed)
3. Go to **API Keys** → **Create API Key**
4. Copy the key (starts with `gsk_...`)

**Available free models on Groq:**
| Model | Speed | Quality | Context |
|-------|-------|---------|---------|
| `llama-3.3-70b-versatile` | Fast | Best ⭐ | 128k |
| `llama3-8b-8192` | Fastest | Good | 8k |
| `mixtral-8x7b-32768` | Medium | Good | 32k |

The default is `llama-3.3-70b-versatile` — best quality, still very fast.

---

### Step 3: Clone and extract the project

```bash
# If you downloaded the zip:
unzip financial-os.zip
cd financial-os

# If using git:
git clone <your-repo>
cd financial-os
```

---

### Step 4: One-command setup

```bash
chmod +x scripts/setup-local.sh
./scripts/setup-local.sh
```

This will:
- Create all `.env` files
- Install Node dependencies
- Start PostgreSQL in Docker
- Run database migrations
- Seed demo data (login: `demo@financialos.in` / `demo1234`)

Then edit `backend/.env` and add your Anthropic key:
```bash
# Open backend/.env and change:
ANTHROPIC_API_KEY=sk-ant-YOUR-REAL-KEY-HERE
```

---

### Step 5: Start the application

**Option A — Docker Compose (easiest):**
```bash
docker compose up --build
```

**Option B — Manual (two terminals):**
```bash
# Terminal 1: Backend
cd backend
npm run dev
# → Running on http://localhost:3001

# Terminal 2: Frontend
cd frontend
npm run dev
# → Running on http://localhost:5173
```

---

### Step 6: Open the app

| URL | What |
|-----|------|
| http://localhost:5173 | Main app |
| http://localhost:3001/health | API health check |
| http://localhost:5050 | pgAdmin (admin/admin) |

Login with:
- Email: `demo@financialos.in`
- Password: `demo1234`

Or register a new account.

---

### Step 7: Run tests

```bash
cd backend

# Set test DB URL
export DATABASE_URL=postgresql://postgres:password@localhost:5432/financialos

npm test
```

---

## Part 2: AWS Deployment (1–2 hours)

### Prerequisites

1. **AWS Account** — https://aws.amazon.com
2. **AWS CLI** configured:
   ```bash
   brew install awscli        # macOS
   aws configure              # enter key, secret, region (us-east-1)
   aws sts get-caller-identity  # verify
   ```
3. **Terraform**:
   ```bash
   brew install terraform     # macOS
   # or: https://developer.hashicorp.com/terraform/install
   terraform -v               # Terraform v1.5+
   ```
4. **A domain name** — any registrar (Namecheap, GoDaddy, Porkbun)
5. **ACM SSL Certificate** for your domain

---

### Step 1: Request ACM Certificate

```bash
# Request certificate (must be us-east-1 for CloudFront)
aws acm request-certificate \
  --domain-name financialos.in \
  --validation-method DNS \
  --subject-alternative-names "*.financialos.in" \
  --region us-east-1

# Note the CertificateArn from output
```

Then go to **AWS Console → ACM → Certificates** and complete DNS validation by adding the CNAME records to your domain registrar.

Wait until status shows **Issued** (5–10 min).

---

### Step 2: Configure Terraform variables

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
aws_region    = "us-east-1"
project       = "financialos"
environment   = "production"

domain_name         = "financialos.in"          # your domain
acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/abc-def"

db_password       = "YourSecurePassword123!"    # min 16 chars
db_instance_class = "db.t3.micro"

anthropic_api_key = "sk-ant-your-key-here"
jwt_secret        = "generate-with-openssl-rand-base64-32"

backend_desired_count  = 1
frontend_desired_count = 1
```

Generate a secure JWT secret:
```bash
openssl rand -base64 32
```

---

### Step 3: Create ECR repositories first

```bash
cd infrastructure/terraform
terraform init
terraform apply -target=aws_ecr_repository.backend -target=aws_ecr_repository.frontend
```

---

### Step 4: Build and push Docker images

```bash
cd ../../scripts
chmod +x deploy.sh

export AWS_REGION=us-east-1
./deploy.sh
```

This builds and pushes both frontend and backend images to ECR.

---

### Step 5: Deploy full infrastructure

```bash
cd ../infrastructure/terraform
terraform plan    # review what will be created
terraform apply   # type 'yes' to confirm
```

This creates (~10 min):
- VPC with public/private subnets
- RDS PostgreSQL
- ECS Cluster + Services (Fargate)
- Application Load Balancer
- CloudFront distribution
- Secrets Manager entries
- IAM roles

Note the outputs:
```
alb_dns_name        = "financialos-alb-xxxxx.us-east-1.elb.amazonaws.com"
cloudfront_domain   = "abc123.cloudfront.net"
rds_endpoint        = "financialos-db.xxxxx.us-east-1.rds.amazonaws.com"
```

---

### Step 6: Point your domain to CloudFront

At your domain registrar, add:
```
CNAME  www   → abc123.cloudfront.net
ALIAS  @     → abc123.cloudfront.net
```
(If registrar doesn't support ALIAS records for apex domain, use A record with CloudFront IP, or use Route53)

DNS propagation takes 15–60 minutes.

---

### Step 7: Run production migrations

```bash
chmod +x scripts/migrate.sh
export AWS_REGION=us-east-1
./scripts/migrate.sh
```

This runs migrations on the production RDS database via ECS Exec.

---

### Step 8: Verify deployment

```bash
# Check services are stable
aws ecs wait services-stable \
  --cluster financialos-cluster \
  --services financialos-backend financialos-frontend

# Check health endpoint
curl https://financialos.in/health
# → {"status":"ok","timestamp":"...","version":"1.0.0"}

# Check API
curl https://financialos.in/api/auth/me
# → {"error":"No token provided"}  ← correct, means API is working
```

---

## Part 3: GitHub Actions CI/CD

### Step 1: Add GitHub Secrets

In your GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | From AWS IAM user |
| `AWS_SECRET_ACCESS_KEY` | From AWS IAM user |
| `AWS_ACCOUNT_ID` | Your 12-digit AWS account ID |

Create a dedicated IAM user for CI:
```bash
aws iam create-user --user-name financialos-ci

aws iam attach-user-policy \
  --user-name financialos-ci \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

aws iam attach-user-policy \
  --user-name financialos-ci \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

aws iam create-access-key --user-name financialos-ci
# → save AccessKeyId and SecretAccessKey
```

### Step 2: Deploy on push

Every push to `main` will:
1. Run tests
2. Build Docker images
3. Push to ECR
4. Deploy to ECS
5. Wait for stable rollout

```bash
git add .
git commit -m "feat: initial deployment"
git push origin main
# → watch GitHub Actions tab
```

---

## Part 4: Common Operations

### View logs
```bash
# Backend logs
aws logs tail /ecs/financialos/backend --follow --region us-east-1

# Frontend logs
aws logs tail /ecs/financialos/frontend --follow --region us-east-1
```

### Scale up/down
```bash
aws ecs update-service \
  --cluster financialos-cluster \
  --service financialos-backend \
  --desired-count 2 \
  --region us-east-1
```

### SSH into running container (ECS Exec)
```bash
TASK=$(aws ecs list-tasks --cluster financialos-cluster \
  --service-name financialos-backend \
  --query 'taskArns[0]' --output text)

aws ecs execute-command \
  --cluster financialos-cluster \
  --task $TASK \
  --container backend \
  --interactive \
  --command "/bin/sh"
```

### Backup database
```bash
aws rds create-db-snapshot \
  --db-instance-identifier financialos-db \
  --db-snapshot-identifier financialos-backup-$(date +%Y%m%d)
```

### Rollback to previous version
```bash
# List recent task definition revisions
aws ecs list-task-definitions \
  --family-prefix financialos-backend \
  --sort DESC \
  --query 'taskDefinitionArns[:5]'

# Update service to specific revision
aws ecs update-service \
  --cluster financialos-cluster \
  --service financialos-backend \
  --task-definition financialos-backend:42   # previous revision
```

### Tear down all AWS resources
```bash
cd infrastructure/terraform
terraform destroy
# type 'yes' — this deletes EVERYTHING including the database
```

---

## Part 5: Environment Variables Reference

### Backend (`backend/.env`)
```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/financialos
JWT_SECRET=random-32-char-string

# Groq — free at https://console.groq.com
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile   # optional override

CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
```

### Frontend (`frontend/.env`)
```bash
VITE_API_URL=http://localhost:3001/api
```

---

## Troubleshooting

**"Cannot connect to database"**
```bash
docker compose up postgres -d
# Wait 5 seconds then retry
```

**"Invalid Groq API key"**
- Verify key in `backend/.env` starts with `gsk_`
- Check you're within free tier limits at console.groq.com
- Try a different model: set `GROQ_MODEL=llama3-8b-8192`

**ECS tasks keep crashing**
```bash
# Check logs
aws logs tail /ecs/financialos/backend --since 10m
# Usually missing secrets or DB connection issue
```

**Frontend shows blank page**
```bash
# Check browser console for errors
# Usually VITE_API_URL is wrong
# For production: should be /api (no host)
```

**Terraform fails with "certificate not found"**
- ACM certificate must be in `us-east-1` even if your app is in another region (CloudFront requirement)
- Certificate must be in `Issued` state (DNS validation complete)
