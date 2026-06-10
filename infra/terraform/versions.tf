# ─────────────────────────────────────────────────────────────────────────────
# Providers y backend de estado
# ─────────────────────────────────────────────────────────────────────────────
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }

  # Estado remoto recomendado para trabajo en equipo / CI.
  # Crea el bucket y la tabla de locks ANTES de `terraform init`, o comenta
  # este bloque para usar estado local mientras experimentas.
  #
  # backend "s3" {
  #   bucket         = "taskflow-terraform-state"
  #   key            = "taskflow-cloud/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "taskflow-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "TaskFlow-Cloud"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Provider adicional para CloudFront/ACM (los certificados de CloudFront
# DEBEN estar en us-east-1, independientemente de la región principal).
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "TaskFlow-Cloud"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
