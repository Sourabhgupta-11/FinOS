variable "aws_region" {
  description = "AWS region to deploy in"
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Project name prefix for all resources"
  type        = string
  default     = "financialos"
}

variable "environment" {
  description = "Environment (staging | production)"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Your domain name (e.g., financialos.in)"
  type        = string
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS (must be in us-east-1 for CloudFront, or same region as ALB)"
  type        = string
}

variable "db_password" {
  description = "RDS PostgreSQL master password (min 16 chars)"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "groq_api_key" {
  description = "Groq API key (free at console.groq.com)"
  type        = string
  sensitive   = true
}

variable "groq_model" {
  description = "Groq model to use"
  type        = string
  default     = "llama-3.3-70b-versatile"
}

variable "jwt_secret" {
  description = "JWT signing secret (min 32 random chars)"
  type        = string
  sensitive   = true
}

variable "backend_desired_count" {
  description = "Desired number of backend ECS tasks"
  type        = number
  default     = 1
}

variable "frontend_desired_count" {
  description = "Desired number of frontend ECS tasks"
  type        = number
  default     = 1
}
