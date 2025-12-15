# Security Configuration Guide

## Environment Variables Setup

### Required Environment Variables

Create a `.env` file in the `backend/SkuVaultSaaS.Api/` directory with the following variables:

```bash
# Database Configuration
DB_PASSWORD=your_secure_database_password

# Encryption Configuration (IMPORTANT: Generate new secure values)
ENCRYPTION_KEY=your_32_character_encryption_key_here
ENCRYPTION_IV=your_16_character_iv_here

# Email Configuration
EMAIL_PASSWORD=your_email_password

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_or_live_your_key_here
STRIPE_SECRET_KEY=sk_test_or_live_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Security Configuration
ALLOWED_HOSTS=localhost;yourdomain.com;production-domain.com

# Environment
ASPNETCORE_ENVIRONMENT=Development
```

### Security Best Practices

1. **Never commit `.env` files to version control**
2. **Generate new encryption keys for production**
3. **Use strong, unique passwords**
4. **Restrict ALLOWED_HOSTS to specific domains**
5. **Use HTTPS in production**
6. **Rotate secrets regularly**

### Production Deployment

For production environments:
- Use Azure Key Vault or similar secret management
- Set environment variables in your hosting platform
- Enable HTTPS enforcement
- Use production Stripe keys
- Implement proper logging and monitoring

### Encryption Key Generation

Generate secure encryption keys using:
```bash
# For ENCRYPTION_KEY (32 characters)
openssl rand -base64 32

# For ENCRYPTION_IV (16 characters)  
openssl rand -hex 8
```

## Security Features Implemented

✅ **Authentication & Authorization**
- JWT token-based authentication
- Role-based access control (Admin/User)
- Multi-tenant data isolation

✅ **Data Protection**
- Environment variable configuration
- Encrypted sensitive data storage
- Secure database connections

✅ **Input Validation**
- Entity Framework parameterized queries
- Model validation attributes
- CORS policy restrictions

✅ **Security Headers**
- HTTPS enforcement (production)
- Secure cookie settings
- CORS configuration