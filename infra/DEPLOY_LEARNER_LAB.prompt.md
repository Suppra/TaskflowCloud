# PROMPT PARA GITHUB COPILOT — Despliegue completo de TaskFlow Cloud en AWS Academy Learner Lab

> **Cómo usar este archivo:** ábrelo en VS Code y, en GitHub Copilot Chat (modo **Agent**),
> escribe: *"Lee `infra/DEPLOY_LEARNER_LAB.prompt.md` y ejecútalo paso a paso, deteniéndote
> en cada checkpoint para que yo confirme."*

---

## 0. ROL Y OBJETIVO

Actúa como **Senior DevOps / Cloud Engineer**. Tu objetivo es **desplegar en su totalidad** el
proyecto **TaskFlow Cloud** (monorepo en este workspace) sobre una cuenta de **AWS Academy
Learner Lab (Vocareum)**, dejando la aplicación accesible públicamente por HTTPS, con todas las
automatizaciones event-driven funcionando.

NO improvises arquitectura nueva: **adapta** la IaC Terraform existente en `infra/terraform/`
a las restricciones del Learner Lab (sección 2). Trabaja en **fases**, y al final de cada fase
imprime un **CHECKPOINT** y espera mi confirmación antes de continuar.

---

## 1. CONTEXTO DEL PROYECTO

- **Monorepo** con:
  - `frontend/` — React 19 + Vite + Tailwind v4 + React Query + Zustand + dnd-kit + socket.io-client. SPA.
  - `backend/` — Node.js 20 + Express 5 + TypeScript + AWS SDK v3 + JWT + Zod + Socket.io + PDFKit + Groq SDK. Expone REST en `/api/v1` y WebSockets (path `/socket.io`) en el puerto `3001`. `Dockerfile` multi-stage ya existe.
  - `lambdas/` — 4 Lambdas Node.js: `notifications` (consumidor SQS), `overdue-tasks` (cron), `alerts-engine` (cron), `scheduled-reports` (cron; **depende de `pdfkit`**, tiene su `package.json`).
  - `infra/terraform/` — IaC completa ya escrita (VPC, ECS Fargate, DynamoDB x8, S3 x3, SQS+DLQ, SNS, SES, Lambda x4, EventBridge, CloudWatch, Secrets Manager, ECR, ALB, CloudFront). **`terraform validate` pasa**, pero está pensada para una cuenta AWS normal, NO para el Learner Lab.
- **Arquitectura:** 3 capas + event-driven. El backend publica eventos a SQS; las Lambdas los consumen.
- **Config relevante del backend** (`backend/src/config/env.ts`): variables `NODE_ENV`, `PORT=3001`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `AWS_REGION`, `S3_BUCKET_ATTACHMENTS`, `S3_BUCKET_REPORTS`, `SQS_QUEUE_URL`, `SES_FROM_EMAIL`, `FRONTEND_URL`, `CORS_ORIGINS`, `MAX_TASKS_PER_MEMBER`, `GROQ_API_KEY` (opcional). En AWS, `DYNAMODB_ENDPOINT` debe quedar **sin definir** (usa DynamoDB real).
- **Frontend:** `api.ts` usa `VITE_API_URL ?? '/api/v1'` (ruta relativa por defecto). `useSocket.ts` en producción usa `window.location.origin`. Por tanto, **si servimos frontend y API bajo el MISMO dominio (CloudFront), no hace falta configurar URLs ni CORS cross-origin.**

---

## 2. RESTRICCIONES CRÍTICAS DEL LEARNER LAB (OBLIGATORIO RESPETARLAS)

Estas reglas del entorno **invalidan partes del Terraform actual**. Debes adaptarlas SÍ o SÍ:

1. **IAM bloqueado:** NO se pueden crear roles, usuarios ni políticas IAM. Existe un rol
   pre-creado **`LabRole`** (ARN `arn:aws:iam::<ACCOUNT_ID>:role/LabRole`) con permisos amplios.
   → **Elimina toda creación de roles/políticas en `iam.tf`** y usa `LabRole` como `task_role`,
   `execution_role` (ECS) y `role` (Lambda), vía un `data "aws_iam_role" "lab" { name = "LabRole" }`.

2. **Región:** solo `us-east-1` (úsala).

3. **Sin dominio propio:** no se puede registrar Route53 ni emitir ACM para dominio.
   → **Elimina `dns.tf`**, el provider con alias `us_east_1`, y toda referencia a `var.domain_name`/ACM.
   El acceso HTTPS será por el dominio por defecto de **CloudFront** (`*.cloudfront.net`).

4. **Presupuesto limitado:** los recursos "compute" caros agotan el budget. El **NAT Gateway** es
   de los más caros.
   → **Elimina el NAT Gateway y su EIP.** Coloca las tareas ECS Fargate en **subredes públicas**
   con `assign_public_ip = true`. Mantén el **VPC Gateway Endpoint de DynamoDB** y **añade uno de
   S3** (ambos gratis) para reducir tráfico saliente. El Security Group de ECS sigue aceptando
   tráfico SOLO desde el ALB.

5. **ECR:** `LabRole` tiene solo lectura; tu usuario de consola/CLI tiene escritura.
   → El **push** de la imagen Docker se hace con MIS credenciales del lab (no con `LabRole`).
   El **pull** desde ECS lo hace `LabRole` (lectura), lo cual basta.

6. **SES en sandbox:** solo envía a direcciones verificadas. → Hay que **verificar** el email
   remitente y los destinatarios de prueba.

7. **Secrets Manager, SQS, SNS, S3, DynamoDB, Lambda, EventBridge, CloudWatch, ALB, CloudFront,
   Fargate, VPC** están disponibles y pueden asumir `LabRole`.

8. **Estado de Terraform:** usa **estado local** (el backend S3 ya está comentado en `versions.tf`,
   déjalo así). El lab es efímero entre sesiones; documenta cómo recuperar.

---

## 3. ARQUITECTURA OBJETIVO (adaptada al Lab)

```
Internet
   │  HTTPS (cert por defecto *.cloudfront.net)
   ▼
CloudFront (1 distribución, 2 orígenes)
   ├── default behavior  ───────────────► S3 (frontend estático, OAC)
   ├── /api/*  behavior  ───────────────► ALB (HTTP) ─► ECS Fargate (backend :3001)
   └── /socket.io/* behavior (WebSocket)─► ALB (HTTP) ─► ECS Fargate (backend :3001)
                                                              │
        DynamoDB (8 tablas) ◄── VPC GW endpoint ─────────────┤
        S3 (attachments, reports) ◄── VPC GW endpoint ───────┤
        SQS (events + DLQ) ◄─────────────────────────────────┤──► Lambda notifications
        Secrets Manager (JWT, Groq) ◄────────────────────────┤
        SES (emails) ◄───────────────────────────────────────┘
EventBridge (crons) ─► Lambda overdue-tasks / alerts-engine / scheduled-reports
CloudWatch Logs + Alarmas ─► SNS (email)
```

**Clave:** una sola distribución CloudFront sirve el frontend Y hace de proxy del backend bajo el
mismo dominio → HTTPS de extremo a extremo, sin mixed-content, sin CORS cross-origin, y los
WebSockets funcionan por el mismo host. El frontend usa rutas relativas (`/api/v1`) y
`window.location.origin` para el socket: **no requiere variables de entorno especiales.**

---

## 4. FASE 0 — Preparación

1. Pídeme las **credenciales temporales del Learner Lab** (las de *AWS Details → AWS CLI*):
   `aws_access_key_id`, `aws_secret_access_key`, `aws_session_token`. Indícame que las exporte
   en mi terminal local (no las escribas en ningún archivo del repo):
   ```bash
   export AWS_ACCESS_KEY_ID=...
   export AWS_SECRET_ACCESS_KEY=...
   export AWS_SESSION_TOKEN=...
   export AWS_DEFAULT_REGION=us-east-1
   ```
2. Verifica herramientas locales: `aws --version`, `terraform -version`, `docker --version`,
   `node --version`. Si falta alguna, dímelo y detente.
3. Confirma identidad y cuenta: `aws sts get-caller-identity` (guarda el `Account` para los ARNs de `LabRole`).
4. Pídeme la **GROQ_API_KEY** (opcional; si no la doy, la feature de IA queda desactivada) y un
   **email para SES/alarmas** (lo verificaremos en sandbox).

**CHECKPOINT 0:** muéstrame versiones, `Account ID` y espera confirmación.

---

## 5. FASE 1 — Adaptar Terraform al Learner Lab

> Trabaja sobre `infra/terraform/`. Haz los cambios mínimos y deja `terraform validate` en verde.
> Si prefieres no romper la versión original, crea los cambios y un `lab.auto.tfvars`; pero NO
> dupliques toda la carpeta. Aplica EXACTAMENTE estos cambios:

1. **`iam.tf`** → borra TODOS los recursos `aws_iam_role`, `aws_iam_role_policy`,
   `aws_iam_role_policy_attachment`, y los `data "aws_iam_policy_document"`. Sustituye por:
   ```hcl
   data "aws_iam_role" "lab" { name = "LabRole" }
   ```
2. Reemplaza en **`ecs.tf`**: `execution_role_arn` y `task_role_arn` → `data.aws_iam_role.lab.arn`.
   En **`lambda.tf`**: `role = data.aws_iam_role.lab.arn` en las 4 funciones.
3. **`versions.tf`** → elimina el `provider "aws"` con `alias = "us_east_1"` (no habrá ACM).
   Deja el backend S3 comentado (estado local).
4. **`dns.tf`** → elimínalo por completo. Quita cualquier referencia a `var.domain_name`,
   `var.create_route53`, ACM y registros Route53 en `alb.tf`, `cloudfront.tf` y `variables.tf`.
5. **`network.tf`** → elimina `aws_nat_gateway` y `aws_eip.nat`. La tabla de rutas privada ya no
   enruta `0.0.0.0/0` por NAT. Añade un **VPC Gateway Endpoint de S3** análogo al de DynamoDB.
6. **`ecs.tf` (servicio)** → `network_configuration`: `subnets = aws_subnet.public[*].id`,
   `assign_public_ip = true`. Mantén el SG de ECS aceptando solo desde el SG del ALB.
7. **`alb.tf`** → ALB público en subredes públicas, **solo listener HTTP (80)** apuntando al
   target group del backend. Elimina listener HTTPS/ACM.
8. **`cloudfront.tf`** → reconfigura la distribución con **DOS orígenes**:
   - Origen S3 (frontend) con OAC (ya existe) → *default cache behavior* (SPA, redirige 403/404 a `index.html`).
   - Origen **ALB** (`aws_lb.main.dns_name`, `OriginProtocolPolicy = http-only`).
   - **Behaviors adicionales** que enrutan al origen ALB:
     - `path_pattern = "/api/*"` → ALB, métodos GET/HEAD/OPTIONS/PUT/POST/PATCH/DELETE,
       `cache_policy = CachingDisabled`, `origin_request_policy = AllViewer`.
     - `path_pattern = "/socket.io/*"` → ALB, igual que arriba, con WebSocket habilitado
       (forwardea `Upgrade`/`Connection`; usa `AllViewer` + `CachingDisabled`).
   - Usa el **certificado por defecto** de CloudFront (`cloudfront_default_certificate = true`).
9. **`ecs.tf` (env del contenedor)** → ajusta:
   - `CORS_ORIGINS` y `FRONTEND_URL` = `https://${aws_cloudfront_distribution.main.domain_name}`.
   - NO definir `DYNAMODB_ENDPOINT`.
   - `GROQ_API_KEY` desde Secrets Manager si la proporcioné (ya está el patrón en `secrets.tf`).
10. **Lambdas (`lambda.tf`)** → asegúrate de que `scheduled-reports` se empaqueta CON `pdfkit`
    (ya hay un `null_resource` que hace `npm install --omit=dev` antes del `archive_file`;
    verifica que se ejecute en el entorno; si Terraform local no puede correr `npm`, hazlo tú
    manualmente antes del apply).
11. Ejecuta `terraform fmt -recursive` y `terraform validate`. **Ambos deben pasar.**

**CHECKPOINT 1:** muéstrame el `git diff` de `infra/terraform/` y la salida de `terraform validate`.

---

## 6. FASE 2 — Provisionar infraestructura

```bash
cd infra/terraform
terraform init
terraform plan -out lab.plan \
  -var "groq_api_key=$GROQ_API_KEY" \
  -var "alerts_email=<MI_EMAIL>"
terraform apply lab.plan
```
- Si algún recurso falla por permisos de `LabRole`, NO inventes políticas: ajústate a `LabRole`
  y reporta el recurso problemático.
- Al terminar, captura los **outputs**: `ecr_repository_url`, `frontend_bucket`,
  `cloudfront_distribution_id`, `cloudfront_domain` (añádelo a `outputs.tf` si no existe),
  `alb_dns_name`, `ecs_cluster_name`, `ecs_service_name`, `sqs_queue_url`.

**CHECKPOINT 2:** muéstrame los outputs.

---

## 7. FASE 3 — Construir y publicar la imagen del backend (ECR)

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URL=$(terraform -chdir=infra/terraform output -raw ecr_repository_url)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "$ECR_URL"
docker build -t "$ECR_URL:latest" ./backend
docker push "$ECR_URL:latest"
aws ecs update-service \
  --cluster $(terraform -chdir=infra/terraform output -raw ecs_cluster_name) \
  --service $(terraform -chdir=infra/terraform output -raw ecs_service_name) \
  --force-new-deployment
```
Espera a que el servicio ECS quede `RUNNING` y el target group `healthy`
(`aws ecs describe-services ...` y consola de EC2 → Target Groups).

**CHECKPOINT 3:** confirma 1+ tarea ECS healthy y el `/api/v1/health` respondiendo a través del ALB.

---

## 8. FASE 4 — Verificar Lambdas y triggers

- Confirma que las 4 Lambdas existen y que:
  - `notifications` tiene el **event source mapping** a la cola SQS (batch 10, ReportBatchItemFailures).
  - `overdue-tasks`, `alerts-engine`, `scheduled-reports` tienen sus **reglas EventBridge** (crons).
- Invoca manualmente `overdue-tasks` y `scheduled-reports` con un evento de prueba y revisa
  CloudWatch Logs. Si `scheduled-reports` falla por `Cannot find module 'pdfkit'`, re-empaqueta
  incluyendo `node_modules` y actualiza el código:
  `aws lambda update-function-code --function-name <name> --zip-file fileb://...zip`.

**CHECKPOINT 4:** logs de una ejecución correcta de cada Lambda cron.

---

## 9. FASE 5 — Desplegar el frontend (S3 + CloudFront)

```bash
cd frontend
npm ci
npm run build          # usa rutas relativas /api/v1 y socket por window.location.origin
aws s3 sync dist "s3://$(terraform -chdir=../infra/terraform output -raw frontend_bucket)" --delete
aws cloudfront create-invalidation \
  --distribution-id $(terraform -chdir=../infra/terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```
> No definas `VITE_API_URL` ni `VITE_SOCKET_URL`: al servir todo bajo el dominio CloudFront,
> las rutas relativas y `window.location.origin` resuelven solas. Si por alguna razón decides
> exponer la API por el ALB directo (HTTP), entonces SÍ tendrías que setear esas variables y
> habilitar CORS — pero el camino recomendado es CloudFront mismo-origen.

**CHECKPOINT 5:** abre `https://<cloudfront_domain>` y muéstrame que carga la SPA.

---

## 10. FASE 6 — Configuración post-deploy

1. **SES (sandbox):** verifica el remitente y los emails de prueba:
   ```bash
   aws ses verify-email-identity --email-address <MI_EMAIL>
   ```
   Confirma desde la bandeja de entrada. Repite para cualquier email que use de prueba.
2. **SNS:** confirma la suscripción de alarmas (email de confirmación de AWS Notifications).
3. **Secrets Manager:** verifica que `JWT_SECRET`, `JWT_REFRESH_SECRET` (y `GROQ_API_KEY` si aplica)
   existen y que la tarea ECS los está leyendo (revisa que el backend arrancó sin error de env).

**CHECKPOINT 6:** confirmaciones de SES/SNS y backend levantado con secretos.

---

## 11. FASE 7 — Verificación end-to-end (smoke test)

Contra `https://<cloudfront_domain>`:
1. Registro de usuario → login → token.
2. Crear proyecto → crear tablero → crear tarea (verifica auto-asignación).
3. Mover tarjeta entre columnas (drag & drop) y confirmar **sincronización en tiempo real**
   abriendo dos pestañas (prueba de WebSockets vía CloudFront).
4. Generar un reporte **PDF** y **CSV** y descargarlos (S3 presigned).
5. Probar "Generar con IA" si configuré `GROQ_API_KEY`.
6. Forzar una tarea vencida y verificar que `overdue-tasks` la procesa (logs + notificación).

**CHECKPOINT 7:** resultados del smoke test (idealmente con capturas o salidas `curl`).

---

## 12. CRITERIOS DE ACEPTACIÓN

- [ ] `terraform apply` completa sin errores usando **solo `LabRole`** (cero creación de IAM).
- [ ] App accesible por **HTTPS** en el dominio CloudFront, SPA + API + WebSockets bajo el mismo host.
- [ ] ECS Fargate con ≥1 tarea healthy detrás del ALB; **sin NAT Gateway**.
- [ ] DynamoDB (8 tablas), S3 (3 buckets), SQS+DLQ, SNS, Secrets, ECR operativos.
- [ ] 4 Lambdas desplegadas; `notifications` consumiendo SQS; crons en EventBridge.
- [ ] `scheduled-reports` genera PDF (pdfkit incluido en el zip).
- [ ] Alarmas CloudWatch (DLQ, 5xx) conectadas a SNS y notificando.
- [ ] Smoke test end-to-end (sección 11) en verde.

---

## 13. TEARDOWN (preservar presupuesto)

Cuando yo lo indique, destruye todo para no gastar budget:
```bash
cd infra/terraform && terraform destroy \
  -var "groq_api_key=$GROQ_API_KEY" -var "alerts_email=<MI_EMAIL>"
```
Verifica que no queden: ALB, ECS service/cluster, CloudFront, buckets con objetos
(vacíalos antes si `destroy` se queja), Lambdas, ni reglas EventBridge.
**Recuerda:** sin NAT ni EC2, el costo en reposo es mínimo, pero ALB y CloudFront sí cobran por hora/uso.

---

## 14. REGLAS PARA TI (COPILOT)

- Trabaja **por fases** y **detente en cada CHECKPOINT** esperando mi confirmación.
- **Nunca** escribas credenciales del lab, la `GROQ_API_KEY` ni secretos en archivos del repo.
- Si un paso falla por una restricción del Learner Lab, **NO** intentes crear IAM ni elevar
  permisos: reporta el bloqueo y propón la alternativa compatible con `LabRole`.
- Prefiere **modificar** la Terraform existente sobre reescribirla desde cero.
- Mantén `terraform fmt`/`validate` en verde tras cada cambio de IaC.
- Explica brevemente cada comando antes de ejecutarlo.
- Si las credenciales del lab caducan a mitad (sesión expirada), avísame para renovarlas.
```
