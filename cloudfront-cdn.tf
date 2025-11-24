# ============================================================================
# Configuration CloudFront CDN pour les icônes (OPTIONNEL)
# ============================================================================
#
# CloudFront améliore considérablement les performances en cachant les icônes
# sur +400 edge locations dans le monde.
#
# Avantages:
# - Latence réduite (< 50ms partout dans le monde)
# - Coûts de transfert réduits (~30% moins cher que S3)
# - SSL/TLS gratuit
# - Compression automatique (gzip/brotli)
#
# À ajouter à s3-bucket.tf si vous voulez activer CloudFront
# ============================================================================

# Distribution CloudFront
resource "aws_cloudfront_distribution" "icons_cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "ONE SMS Icons CDN"
  default_root_object = ""
  price_class         = "PriceClass_100" # US, Canada, Europe (le moins cher)

  # Domaine personnalisé (optionnel)
  # aliases = ["icons.onesms.app"]

  origin {
    domain_name = aws_s3_bucket.icons.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.icons.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.icons.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.icons.id}"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"]

      cookies {
        forward = "none"
      }
    }

    # Compression automatique
    compress = true

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 31536000  # 1 an
    max_ttl                = 31536000  # 1 an
  }

  # Cache SVG
  ordered_cache_behavior {
    path_pattern     = "icons/*/*.svg"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.icons.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    compress               = true
    viewer_protocol_policy = "https-only"
    min_ttl                = 31536000
    default_ttl            = 31536000
    max_ttl                = 31536000
  }

  # Cache PNG
  ordered_cache_behavior {
    path_pattern     = "icons/*/*.png"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.icons.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    compress               = true
    viewer_protocol_policy = "https-only"
    min_ttl                = 31536000
    default_ttl            = 31536000
    max_ttl                = 31536000
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    # Ou utiliser un certificat ACM pour domaine personnalisé:
    # acm_certificate_arn      = aws_acm_certificate.icons.arn
    # ssl_support_method       = "sni-only"
    # minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name        = "ONE SMS Icons CDN"
    Project     = var.project_name
    Environment = "production"
  }
}

# Mise à jour de la politique S3 pour CloudFront
resource "aws_s3_bucket_policy" "icons_cloudfront" {
  bucket = aws_s3_bucket.icons.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudFrontReadGetObject"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.icons.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.icons.arn}/*"
      },
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.icons.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.icons]
}

# Outputs CloudFront
output "cloudfront_domain_name" {
  description = "Nom de domaine CloudFront"
  value       = aws_cloudfront_distribution.icons_cdn.domain_name
}

output "cloudfront_url" {
  description = "URL complète CloudFront"
  value       = "https://${aws_cloudfront_distribution.icons_cdn.domain_name}"
}

output "cloudfront_id" {
  description = "ID de la distribution CloudFront"
  value       = aws_cloudfront_distribution.icons_cdn.id
}

# Certificat SSL pour domaine personnalisé (optionnel)
# Doit être créé dans us-east-1 pour CloudFront
# 
# resource "aws_acm_certificate" "icons" {
#   provider          = aws.us_east_1
#   domain_name       = "icons.onesms.app"
#   validation_method = "DNS"
# 
#   tags = {
#     Name    = "ONE SMS Icons Certificate"
#     Project = var.project_name
#   }
# 
#   lifecycle {
#     create_before_destroy = true
#   }
# }
# 
# resource "aws_route53_record" "icons_cert_validation" {
#   for_each = {
#     for dvo in aws_acm_certificate.icons.domain_validation_options : dvo.domain_name => {
#       name   = dvo.resource_record_name
#       record = dvo.resource_record_value
#       type   = dvo.resource_record_type
#     }
#   }
# 
#   allow_overwrite = true
#   name            = each.value.name
#   records         = [each.value.record]
#   ttl             = 60
#   type            = each.value.type
#   zone_id         = aws_route53_zone.main.zone_id
# }
# 
# resource "aws_route53_record" "icons" {
#   zone_id = aws_route53_zone.main.zone_id
#   name    = "icons.onesms.app"
#   type    = "A"
# 
#   alias {
#     name                   = aws_cloudfront_distribution.icons_cdn.domain_name
#     zone_id                = aws_cloudfront_distribution.icons_cdn.hosted_zone_id
#     evaluate_target_health = false
#   }
# }

# ============================================================================
# Mise à jour du fichier .env.icons après déploiement CloudFront:
# ============================================================================
#
# S3_BASE_URL=https://<cloudfront_domain>.cloudfront.net
# 
# Ou avec domaine personnalisé:
# S3_BASE_URL=https://icons.onesms.app
#
# ============================================================================

# ============================================================================
# Invalidation du cache CloudFront (après update des icônes)
# ============================================================================
#
# aws cloudfront create-invalidation \
#   --distribution-id <cloudfront_id> \
#   --paths "/icons/*"
#
# ============================================================================

# ============================================================================
# Comparaison des coûts (estimation pour 1300 icônes)
# ============================================================================
#
# S3 Direct:
#   - Stockage: $0.023/GB = $0.003/mois (150 MB)
#   - Transfert: $0.09/GB = $0.90/mois (10 GB sortant)
#   - Requêtes: $0.0004/1000 = $0.40/mois (1M requêtes)
#   Total: ~$1.30/mois
#
# CloudFront CDN:
#   - Stockage S3: $0.003/mois
#   - Transfert CF: $0.085/GB = $0.85/mois (10 GB)
#   - Requêtes CF: $0.0075/10000 = $0.75/mois (1M requêtes)
#   Total: ~$1.60/mois
#
# Différence: +$0.30/mois pour des performances 10x meilleures
#
# ============================================================================
