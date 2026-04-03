# AWS Infrastructure — Financial OS

## Architecture

```
Internet → CloudFront → ALB → ECS Fargate (Frontend + Backend)
                                    ↓
                              RDS PostgreSQL
                                    ↓
                           Secrets Manager (API Keys)
```

## AWS Services Used
| Service | Purpose |
|---------|---------|
| ECS Fargate | Run containers (frontend + backend) |
| RDS PostgreSQL 15 | Database |
| ALB | Load balancer with SSL |
| CloudFront | CDN + HTTPS |
| S3 | Static assets / backups |
| Secrets Manager | API keys, JWT secret |
| ECR | Docker image registry |
| Route53 | DNS (optional) |
| VPC | Network isolation |

## Estimated Monthly Cost (us-east-1)
| Resource | Cost |
|----------|------|
| ECS Fargate (0.25 vCPU, 0.5GB × 2) | ~$15 |
| RDS db.t3.micro | ~$15 |
| ALB | ~$20 |
| CloudFront (10GB) | ~$1 |
| Secrets Manager | ~$1 |
| **Total** | **~$52/month** |

## Prerequisites
1. AWS CLI configured: `aws configure`
2. Terraform 1.5+: `brew install terraform`
3. Docker: for building images
4. Domain name (optional but recommended)

## Deployment Steps

### 1. Build & Push Docker Images
```bash
cd financial-os/scripts
chmod +x deploy.sh
./deploy.sh
```

### 2. Terraform Apply
```bash
cd infrastructure/terraform

# Copy and edit variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

terraform init
terraform plan
terraform apply
```

### 3. Run Database Migrations
```bash
# After ECS tasks are running
./scripts/migrate.sh
```

### 4. Set Secrets in AWS Secrets Manager
```bash
aws secretsmanager create-secret \
  --name financialos/production \
  --secret-string '{
    "GROQ_API_KEY": "gsk_...",
    "GROQ_MODEL": "llama-3.3-70b-versatile",
    "JWT_SECRET": "your-32-char-random-secret",
    "DATABASE_URL": "postgresql://..."
  }'
```

## Tear Down
```bash
terraform destroy
```
