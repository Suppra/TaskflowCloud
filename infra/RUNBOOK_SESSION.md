# Runbook de sesion (Learner Lab)

Objetivo: volver operativo el entorno en menos de 2 minutos cuando expiren credenciales.

## 1) Cargar credenciales temporales

En PowerShell, pega y ejecuta:

```powershell
$env:AWS_ACCESS_KEY_ID="<AWS_ACCESS_KEY_ID>"
$env:AWS_SECRET_ACCESS_KEY="<AWS_SECRET_ACCESS_KEY>"
$env:AWS_SESSION_TOKEN="<AWS_SESSION_TOKEN>"
$env:AWS_DEFAULT_REGION="us-east-1"
$env:AWS_PAGER=""
```

## 2) Verificar sesion y contexto

```powershell
aws sts get-caller-identity
```

Debe devolver tu `Account` del lab (ej. `319399332824`).

## 3) Reanudar operacion Terraform

```powershell
Set-Location "infra/terraform"
terraform init -upgrade
terraform plan -var "backend_image_tag=20260610-163606" -var "alerts_email=cristianfwc@gmail.com"
```

Si el plan es correcto:

```powershell
terraform apply -auto-approve -var "backend_image_tag=20260610-163606" -var "alerts_email=cristianfwc@gmail.com"
```

## Nota sobre SES en Learner Lab

El proyecto queda con `ses_enabled=false` por defecto para evitar errores de sandbox/permisos. Si quieres reintentar envio real de correo:

```powershell
terraform apply -auto-approve -var "ses_enabled=true" -var "ses_from_email=<email_verificado_en_ses>" -var "alerts_email=<email_verificado_en_ses>"
```

En sandbox, tambien deben estar verificados los destinatarios.
