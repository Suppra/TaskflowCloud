# ─────────────────────────────────────────────────────────────────────────────
# Route53 + ACM (opcional — solo si create_route53 = true y domain_name != "")
# ─────────────────────────────────────────────────────────────────────────────

data "aws_route53_zone" "main" {
  count = var.create_route53 && var.domain_name != "" ? 1 : 0
  name  = var.domain_name
}

# ── Certificado para el ALB (región principal) ───────────────────────────────
resource "aws_acm_certificate" "alb" {
  count             = var.create_route53 && var.domain_name != "" ? 1 : 0
  domain_name       = "api.${var.domain_name}"
  validation_method = "DNS"
  lifecycle { create_before_destroy = true }
}

# ── Certificado para CloudFront (DEBE estar en us-east-1) ────────────────────
resource "aws_acm_certificate" "cloudfront" {
  count             = var.create_route53 && var.domain_name != "" ? 1 : 0
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"
  lifecycle { create_before_destroy = true }
}

# ── Registros DNS de validación + alias ──────────────────────────────────────
resource "aws_route53_record" "api" {
  count   = var.create_route53 && var.domain_name != "" ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "frontend" {
  count   = var.create_route53 && var.domain_name != "" ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}
