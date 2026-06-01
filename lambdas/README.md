# TaskFlow Cloud — Lambda Functions

Funciones serverless AWS Lambda para automatización event-driven.

## Estructura

```
lambdas/
├── notifications/      → Consume SQS, envía emails via SES (TASK_CREATED, COMMENT_CREATED, INVITATION_SENT)
├── overdue-tasks/      → EventBridge cada 1h — detecta tareas vencidas, publica TASK_OVERDUE
├── scheduled-reports/  → EventBridge semanal — genera CSV, sube a S3, notifica miembros
└── alerts-engine/      → EventBridge diario — detecta proyectos con >30% tareas vencidas
```

## Dependencias (instaladas en cada función)

```bash
# En cada subdirectorio de lambda:
npm init -y
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @aws-sdk/client-ses @aws-sdk/client-sqs @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Variables de entorno requeridas

| Variable | Descripción |
|----------|-------------|
| `AWS_REGION` | Región AWS (e.g. `us-east-1`) |
| `SQS_QUEUE_URL` | URL de la cola SQS principal |
| `SES_FROM_EMAIL` | Email remitente verificado en SES |
| `FRONTEND_URL` | URL del frontend para links en emails |
| `S3_BUCKET_REPORTS` | Bucket S3 para reportes (solo `scheduled-reports`) |

## EventBridge Schedules

| Lambda | Cron | Descripción |
|--------|------|-------------|
| `overdue-tasks` | `cron(0 * * * ? *)` | Cada hora |
| `alerts-engine` | `cron(0 9 * * ? *)` | Diario a las 9am UTC |
| `scheduled-reports` | `cron(0 8 ? * MON *)` | Lunes a las 8am UTC |

## Despliegue con Terraform

Ver `/infra/modules/lambda/` para la configuración completa.

## Prueba local con SAM

```bash
sam local invoke NotificationsFunction --event events/task_created.json
sam local invoke OverdueTasksFunction
sam local invoke AlertsEngineFunction
sam local invoke ScheduledReportsFunction
```
