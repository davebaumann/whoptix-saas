# Production Pre-Flight Checklist

Complete this checklist before any production deployment.

---

## Code Quality & Build

- [ ] **Backend builds without errors**
  ```powershell
  cd backend
  dotnet clean
  dotnet build -c Release
  ```
  
- [ ] **Frontend builds without errors**
  ```powershell
  cd frontend
  npm run build
  # Check for any TypeScript errors or warnings
  ```

- [ ] **No console errors or warnings in browser dev tools**
  - Clear `dist/` and rebuild
  - Test in incognito window to avoid cache issues

- [ ] **All tests passing (if applicable)**
  - Backend unit tests
  - Frontend component tests
  - Integration tests

---

## Configuration & Secrets

- [ ] **No hardcoded secrets in source code**
  - Search for: `password`, `secret`, `key`, `token` (case-insensitive)
  - All secrets should use `${ENV_VAR}` placeholders

- [ ] **appsettings.Production.json reviewed**
  - All `${VAR}` placeholders identified
  - Database connection uses production server
  - Logging level set to Warning or higher
  - Stripe keys are LIVE keys (not test)

- [ ] **Environment variables documented**
  - All required variables listed
  - Defaults are safe for production
  - Sensitive values stored in Azure Key Vault

- [ ] **Frontend API_BASE_URL points to production**
  - Not localhost
  - Not development server
  - Includes HTTPS protocol

---

## Database

- [ ] **All migrations created and tested**
  - No pending Entity Framework migrations
  - Migration file naming follows convention
  - Migration contains no hardcoded data except essential lookups

- [ ] **Production database created**
  - Database name: `skuvault_prod`
  - Server accessible from App Service
  - SSL/TLS enabled

- [ ] **Schema verified in production database**
  ```sql
  SHOW TABLES;
  -- Verify all required tables exist:
  -- Customers, Users, Products, Locations, Transactions, InventoryLevels, etc.
  ```

- [ ] **No test/demo data in production database**
  - No seed data from Development
  - Default accounts (admin@example.com) removed
  - Only production data present

- [ ] **Backups configured**
  - Daily backups enabled
  - Retention policy set (minimum 7 days)
  - Test restore process works

---

## Security

- [ ] **HTTPS enforced**
  - All endpoints redirect HTTP → HTTPS
  - HSTS headers configured
  - Certificate valid and not self-signed

- [ ] **CORS properly configured**
  - AllowedOrigins restricted to production domain only
  - Wildcards removed
  - Credentials handling correct

- [ ] **Authentication & Authorization**
  - JWT tokens using secure algorithms
  - Token expiration set appropriately
  - Role-based access control verified
  - Multi-tenant isolation working

- [ ] **Database security**
  - Credentials not stored in code
  - Connection pooling configured
  - Slow query logging enabled
  - Unused accounts disabled

- [ ] **API security**
  - Input validation on all endpoints
  - SQL injection protection (parameterized queries)
  - Rate limiting configured
  - Error messages don't leak sensitive info

- [ ] **Sensitive endpoints require authentication**
  - Admin endpoints protected
  - Customer data access validated
  - Payment endpoints secured

---

## Stripe Integration

- [ ] **Production Stripe keys configured**
  - `STRIPE_PUBLISHABLE_KEY` starts with `pk_live_`
  - `STRIPE_SECRET_KEY` starts with `sk_live_`
  - NOT test keys (`pk_test_` / `sk_test_`)

- [ ] **Webhook endpoint configured**
  - Endpoint: `/api/stripe/webhook`
  - Events: `payment_intent.succeeded`, `customer.subscription.updated`, `invoice.payment_succeeded`
  - Webhook signing secret stored in `STRIPE_WEBHOOK_SECRET`

- [ ] **Payment flow tested**
  - Create account → upgrade plan → pay → webhook → access granted
  - Webhook updates customer membership level
  - Subscription data syncs correctly

---

## Email & Notifications

- [ ] **Email service configured**
  - SMTP credentials set via environment variables
  - Not hardcoded in appsettings
  - Email address valid for production

- [ ] **Low-stock notifications enabled**
  - Notification service started
  - Email recipients configured
  - Test email sent successfully

- [ ] **Account notifications working**
  - Welcome emails sent on signup
  - Password reset emails working
  - Low-stock alerts delivering

---

## Performance & Monitoring

- [ ] **Application Insights configured**
  - Instrumentation key set
  - Logging to Application Insights
  - Alerts configured for errors

- [ ] **API response times acceptable**
  - Dashboard loads < 2 seconds
  - Reports generate < 5 seconds
  - No N+1 query problems

- [ ] **Database query performance verified**
  - Slow queries identified
  - Necessary indexes created
  - Connection pooling optimized

- [ ] **Memory usage reasonable**
  - No obvious memory leaks
  - Azure App Service memory sufficient
  - Cache implemented for frequently accessed data

- [ ] **Frontend bundle size optimized**
  - No unnecessary dependencies
  - Code splitting implemented
  - CSS/JS minified

---

## Testing

- [ ] **Happy path tested end-to-end**
  1. User registration → confirmation
  2. Login → dashboard
  3. View report → download/export
  4. Upgrade membership → payment → success

- [ ] **Error handling verified**
  - Network errors gracefully handled
  - Invalid input shows helpful messages
  - 404/500 errors display correctly

- [ ] **Cross-browser compatibility**
  - Chrome, Firefox, Safari, Edge
  - Mobile responsive working

- [ ] **Accessibility verified**
  - Keyboard navigation works
  - Screen reader friendly
  - Color contrast sufficient

---

## Documentation

- [ ] **README updated for production**
  - Deployment instructions clear
  - Environment variables documented
  - Troubleshooting guide included

- [ ] **API documentation current**
  - All endpoints documented
  - Request/response examples provided
  - Authentication requirements clear

- [ ] **Support documentation ready**
  - User guides for key features
  - FAQ prepared
  - Support contact information listed

- [ ] **Runbooks created**
  - How to deploy
  - How to rollback
  - How to scale
  - How to monitor
  - Emergency procedures

---

## Infrastructure

- [ ] **Azure resources created**
  - App Service for backend
  - Static Web App for frontend
  - MySQL database
  - Application Insights
  - Key Vault (optional but recommended)

- [ ] **DNS configured**
  - Custom domain pointing to App Service
  - SSL certificate valid
  - Mail records (SPF, DKIM, DMARC) for emails

- [ ] **Scaling policies configured**
  - Auto-scale rules set
  - Max instances appropriate
  - Min instances set to 1+

---

## Final Sign-Off

- [ ] **Technical lead approval**: __________________ Date: ________
- [ ] **Product owner approval**: __________________ Date: ________
- [ ] **Security review passed**: __________________ Date: ________
- [ ] **Operations approval**: __________________ Date: ________

---

## Notes

Use this section to document any exceptions or special configurations:

```

```

---

## Deployment Date & Time

**Scheduled for**: ___________  
**Time zone**: ___________  
**Estimated duration**: 30 minutes  
**Rollback plan**: See PRODUCTION-DEPLOYMENT.md Phase 10

---

## Post-Deployment Verification

After deployment, verify:

- [ ] Application loads without 404 errors
- [ ] Users can login successfully
- [ ] Reports display data correctly
- [ ] Payment flow works end-to-end
- [ ] Emails are being sent
- [ ] No JavaScript console errors
- [ ] API response times acceptable
- [ ] Database queries returning expected data
- [ ] Monitoring showing healthy metrics
- [ ] Backups completed successfully

