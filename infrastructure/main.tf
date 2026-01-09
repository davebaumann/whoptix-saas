# Terraform Configuration for JUSTSKU Production Infrastructure
# Usage: terraform init && terraform apply

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "justsku-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "JUSTSKU"
      Environment = "Production"
      ManagedBy   = "Terraform"
    }
  }
}

# ============================================================================
# VARIABLES
# ============================================================================

variable "aws_region" {
  default = "us-east-1"
}

variable "app_name" {
  default = "justsku"
}

variable "domain_name" {
  default = "justsku.com"
}

variable "rds_master_username" {
  default = "admin"
  sensitive = true
}

variable "rds_master_password" {
  sensitive = true
}

variable "admin_email" {
  default = "info@justsku.com"
}

variable "admin_password" {
  sensitive = true
}

# ============================================================================
# SECURITY GROUPS
# ============================================================================

resource "aws_security_group" "ec2" {
  name        = "${var.app_name}-api-sg"
  description = "Security group for JUSTSKU API EC2 instance"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Restrict to your IP in production
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.app_name}-api-sg"
  }
}

resource "aws_security_group" "rds" {
  name        = "${var.app_name}-rds-sg"
  description = "Security group for JUSTSKU RDS"

  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.app_name}-rds-sg"
  }
}

# ============================================================================
# EC2 KEY PAIR
# ============================================================================

resource "aws_key_pair" "deployer" {
  key_name   = "${var.app_name}-key"
  public_key = file("${path.module}/id_rsa.pub")

  tags = {
    Name = "${var.app_name}-key"
  }
}

# ============================================================================
# EC2 INSTANCE
# ============================================================================

resource "aws_instance" "api" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "t2.micro"
  key_name               = aws_key_pair.deployer.key_name
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
  }

  user_data = base64encode(templatefile("${path.module}/ec2-init.sh", {
    ECR_REGISTRY     = "324152623799.dkr.ecr.us-east-1.amazonaws.com"
    IMAGE_NAME       = var.app_name
    DB_HOST          = aws_db_instance.postgres.endpoint
    DB_NAME          = aws_db_instance.postgres.db_name
    DB_USER          = var.rds_master_username
    DB_PASSWORD      = var.rds_master_password
    ADMIN_EMAIL      = var.admin_email
    ADMIN_PASSWORD   = var.admin_password
  }))

  monitoring              = true
  associate_public_ip_address = true

  tags = {
    Name = "${var.app_name}-api"
  }

  depends_on = [aws_db_instance.postgres]
}

# Elastic IP for consistent DNS
resource "aws_eip" "api" {
  instance = aws_instance.api.id
  domain   = "vpc"

  tags = {
    Name = "${var.app_name}-api-eip"
  }
}

# ============================================================================
# RDS MYSQL DATABASE
# ============================================================================

resource "aws_db_instance" "postgres" {
  identifier            = "${var.app_name}-db"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = "db.t3.micro"
  db_name              = "justsku_prod"
  username             = var.rds_master_username
  password             = var.rds_master_password
  allocated_storage    = 20
  storage_encrypted    = true
  storage_type         = "gp3"

  multi_az               = false
  publicly_accessible    = false
  skip_final_snapshot    = false
  final_snapshot_identifier = "${var.app_name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  enabled_cloudwatch_logs_exports = ["error", "general", "slowquery"]

  tags = {
    Name = "${var.app_name}-db"
  }
}

# ============================================================================
# S3 FRONTEND BUCKET
# ============================================================================

resource "aws_s3_bucket" "frontend" {
  bucket = "${var.app_name}-frontend"

  tags = {
    Name = "${var.app_name}-frontend"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ============================================================================
# IAM ROLES & POLICIES
# ============================================================================

resource "aws_iam_role" "ec2_role" {
  name = "${var.app_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "ec2_policy" {
  name   = "${var.app_name}-ec2-policy"
  role   = aws_iam_role.ec2_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:DescribeRepositories",
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:SendCommand",
          "ssm:GetCommandInvocation"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.app_name}-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# ============================================================================
# DATA SOURCES
# ============================================================================

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "ec2_public_ip" {
  description = "Public IP of API server"
  value       = aws_eip.api.public_ip
}

output "rds_endpoint" {
  description = "RDS database endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "s3_bucket_name" {
  description = "S3 bucket for frontend"
  value       = aws_s3_bucket.frontend.id
}
