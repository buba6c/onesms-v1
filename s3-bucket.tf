# ============================================================================
# Configuration Terraform pour S3 Bucket (OPTIONNEL)
# ============================================================================
# 
# Ce fichier permet de créer automatiquement un bucket S3 configuré
# pour héberger les icônes avec les bonnes permissions.
#
# Usage:
#   1. Installer Terraform: https://www.terraform.io/downloads
#   2. Configurer AWS CLI: aws configure
#   3. terraform init
#   4. terraform plan
#   5. terraform apply
# ============================================================================

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Configuration AWS
provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "Nom du bucket S3 pour les icônes"
  type        = string
  default     = "onesms-icons"
}

variable "project_name" {
  description = "Nom du projet"
  type        = string
  default     = "one-sms-v1"
}

# Bucket S3
resource "aws_s3_bucket" "icons" {
  bucket = var.bucket_name

  tags = {
    Name        = "ONE SMS Icons"
    Project     = var.project_name
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}

# Désactiver le blocage des accès publics
resource "aws_s3_bucket_public_access_block" "icons" {
  bucket = aws_s3_bucket.icons.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Configuration du versioning (optionnel mais recommandé)
resource "aws_s3_bucket_versioning" "icons" {
  bucket = aws_s3_bucket.icons.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Politique CORS pour permettre l'accès depuis le frontend
resource "aws_s3_bucket_cors_configuration" "icons" {
  bucket = aws_s3_bucket.icons.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = [
      "https://onesms.app",
      "https://*.onesms.app",
      "http://localhost:3000",
      "http://localhost:5173"
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# Politique de bucket pour lecture publique
resource "aws_s3_bucket_policy" "icons_public_read" {
  bucket = aws_s3_bucket.icons.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
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

# Configuration du cache
resource "aws_s3_bucket_lifecycle_configuration" "icons" {
  bucket = aws_s3_bucket.icons.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# CloudFront Origin Access Identity (optionnel - pour CDN)
resource "aws_cloudfront_origin_access_identity" "icons" {
  comment = "Origin Access Identity for ONE SMS Icons"
}

# Outputs
output "bucket_name" {
  description = "Nom du bucket S3"
  value       = aws_s3_bucket.icons.id
}

output "bucket_arn" {
  description = "ARN du bucket S3"
  value       = aws_s3_bucket.icons.arn
}

output "bucket_url" {
  description = "URL publique du bucket"
  value       = "https://${aws_s3_bucket.icons.bucket}.s3.${var.aws_region}.amazonaws.com"
}

output "cloudfront_oai_iam_arn" {
  description = "ARN de l'Origin Access Identity CloudFront"
  value       = aws_cloudfront_origin_access_identity.icons.iam_arn
}

# Utilisateur IAM pour l'upload (recommandé)
resource "aws_iam_user" "icons_uploader" {
  name = "onesms-icons-uploader"
  path = "/onesms/"

  tags = {
    Name    = "ONE SMS Icons Uploader"
    Project = var.project_name
  }
}

# Politique IAM pour l'upload
resource "aws_iam_user_policy" "icons_uploader_policy" {
  name = "onesms-icons-uploader-policy"
  user = aws_iam_user.icons_uploader.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3Upload"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.icons.arn}/*"
      },
      {
        Sid    = "AllowS3BucketList"
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.icons.arn
      }
    ]
  })
}

# Générer les clés d'accès (à faire manuellement pour plus de sécurité)
output "iam_user_name" {
  description = "Nom de l'utilisateur IAM pour l'upload"
  value       = aws_iam_user.icons_uploader.name
}

output "next_steps" {
  description = "Prochaines étapes"
  value = <<-EOT
    
    ✅ Bucket S3 créé avec succès!
    
    📝 Prochaines étapes:
    
    1. Créer les clés d'accès pour l'utilisateur IAM:
       aws iam create-access-key --user-name ${aws_iam_user.icons_uploader.name}
    
    2. Copier les clés dans .env.icons:
       AWS_ACCESS_KEY_ID=<AccessKeyId>
       AWS_SECRET_ACCESS_KEY=<SecretAccessKey>
       S3_BUCKET=${aws_s3_bucket.icons.id}
       S3_BASE_URL=${aws_s3_bucket.icons.bucket_regional_domain_name}
    
    3. (Optionnel) Configurer CloudFront CDN pour améliorer les performances
    
  EOT
}
