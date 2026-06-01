# TaskFlow Cloud — Infraestructura (Terraform)

IaC que despliega toda la arquitectura AWS documentada de TaskFlow Cloud.

## Arquitectura desplegada

```
                          Route53 (opcional)
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                                 │
   CloudFront ──► S3 (frontend SPA)              ALB (HTTPS)
                                                          │
                                                  ECS Fargate (backend)
                                                          │
        ┌──────────────┬──────────────┬──────────────────┼───────────────┐
        │              │              │                   │               │
   DynamoDB        S3 (adjuntos/    SQS ──► Lambda      SES        Secrets Manager
   (8 tablas)       reportes)     notifications                    (JWT secrets)
                                       ▲
                          EventBridge crons
                          ├─ overdue-tasks (1h)
                          ├─ alerts-engine (6h)
                          └─ scheduled-reports (diario)
```

## Servicios cubiertos

| Servicio AWS         | Archivo            | Propósito                                      |
|----------------------|--------------------|------------------------------------------------|
| VPC, subnets, NAT, SG| `network.tf`       | Red privada + endpoint DynamoDB                |
| DynamoDB (8 tablas)  | `dynamodb.tf`      | Persistencia + GSIs                            |
| S3 (3 buckets)       | `storage.tf`       | Adjuntos, reportes, frontend                   |
| SQS + DLQ, SES       | `messaging.tf`     | Eventos asíncronos y emails                    |
| Secrets Manager      | `secrets.tf`       | Secretos JWT (autogenerados)                   |
| IAM                  | `iam.tf`           | Roles ECS y Lambda (menor privilegio)          |
| ECR                  | `ecr.tf`           | Registro de la imagen del backend              |
| ECS Fargate + ALB    | `ecs.tf`, `alb.tf` | Backend con autoscaling                        |
| Lambda (×4)          | `lambda.tf`        | Consumidores de eventos / crons                |
| EventBridge          | `eventbridge.tf`   | Programación de los crons                      |
| CloudFront           | `cloudfront.tf`    | CDN del frontend                               |
| Route53 + ACM        | `dns.tf`           | DNS y certificados (opcional)                  |
| CloudWatch           | `monitoring.tf`    | Logs + alarmas (DLQ, 5xx)                       |

## Uso

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # ajusta valores

terraform init
terraform plan
terraform apply
```

### Flujo de despliegue completo

```bash
# 1) Provisionar infra
terraform apply

# 2) Construir y subir la imagen del backend a ECR
ECR=$(terraform output -raw ecr_repository_url)
aws ecr get-login-password | docker login --username AWS --password-stdin "$ECR"
docker build -t "$ECR:latest" ../../backend
docker push "$ECR:latest"

# 3) Forzar nuevo despliegue del servicio ECS
aws ecs update-service --cluster $(terraform output -raw ecs_cluster_name) \
  --service $(terraform output -raw ecs_service_name) --force-new-deployment

# 4) Build + deploy del frontend
cd ../../frontend && npm run build
aws s3 sync dist/ "s3://$(cd ../infra/terraform && terraform output -raw frontend_bucket)" --delete
aws cloudfront create-invalidation \
  --distribution-id $(cd ../infra/terraform && terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

> **Nota:** las Lambdas se empaquetan con `archive_file` desde `lambdas/<nombre>`.
> Para dependencias npm en las Lambdas, ejecuta `npm ci --production` en cada
> carpeta antes de `terraform apply`, o delega el empaquetado a CI.

## Estado remoto

Para trabajo en equipo, descomenta el bloque `backend "s3"` en `versions.tf`
tras crear el bucket de estado y la tabla de locks.
