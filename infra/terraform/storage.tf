# ─────────────────────────────────────────────────────────────────────────────
# S3: adjuntos de tareas, reportes generados y hosting estático del frontend
# ─────────────────────────────────────────────────────────────────────────────

# ── Bucket de adjuntos (privado, acceso vía presigned URLs) ──────────────────
resource "aws_s3_bucket" "attachments" {
  bucket = "${local.name_prefix}-attachments-${local.account_id}"
  tags   = { Name = "${local.name_prefix}-attachments" }
}

resource "aws_s3_bucket_public_access_block" "attachments" {
  bucket                  = aws_s3_bucket.attachments.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "attachments" {
  bucket = aws_s3_bucket.attachments.id
  cors_rule {
    allowed_methods = ["GET", "PUT"]
    allowed_origins = ["http://${aws_lb.main.dns_name}"]
    allowed_headers = ["*"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "attachments" {
  bucket = aws_s3_bucket.attachments.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

# ── Bucket de reportes (privado) ─────────────────────────────────────────────
resource "aws_s3_bucket" "reports" {
  bucket = "${local.name_prefix}-reports-${local.account_id}"
  tags   = { Name = "${local.name_prefix}-reports" }
}

resource "aws_s3_bucket_public_access_block" "reports" {
  bucket                  = aws_s3_bucket.reports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id
  rule {
    id     = "expire-old-reports"
    status = "Enabled"
    filter {} # aplica a todos los objetos del bucket
    expiration { days = 90 }
  }
}

