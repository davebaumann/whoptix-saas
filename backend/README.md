# Backend (SkuVaultSaaS)

This README documents how the backend handles initial data seeding and how to customize seeded credentials.

## Database seeding

During startup the application will run a one-shot seeder when `SeedDatabase` is enabled in configuration or when the environment is `Development`.

The seeding behavior is controlled by the following configuration keys (example is in `appsettings.Development.json`):

- `SeedDatabase` (bool) — if true the `SeedHostedService` runs the `DbSeeder` on startup.
- `SeedAdmin:Email` (string) — email of the admin account to create (default `admin@example.com`).
- `SeedAdmin:Password` (string) — password for the admin account (default `P@ssw0rd!`).
- `SeedDefaultUser:Email` (string) — email of a non-admin seeded user (default `Kim.baumann@skuvault.com`).
- `SeedDefaultUser:Password` (string) — password for the default seeded user (default `P@ssw0rd!`).

These are configured by default in `SkuVaultSaaS.Api/appsettings.Development.json` for local development. **Do not use these default credentials in production.**

### Production safety

By default the application will NOT seed data in production. An `appsettings.Production.json` with `"SeedDatabase": false` is included to make this explicit.

If you explicitly enable `SeedDatabase` in Production, the seeder requires that all seed credentials are provided via configuration (for example through environment variables or a secrets store). The required keys are:

- `SeedAdmin:Email`
- `SeedAdmin:Password`
- `SeedDefaultUser:Email`
- `SeedDefaultUser:Password`

If any of these values are missing when seeding is requested in Production, the application will log an error and abort the seeding process to avoid creating insecure accounts.

## How to override

Set the configuration values in the appropriate environment file (e.g., `appsettings.Production.json`) or via environment variables:

* `SeedAdmin__Email`
* `SeedAdmin__Password`
* `SeedDefaultUser__Email`
* `SeedDefaultUser__Password`

Example (PowerShell):

```powershell
$env:SeedAdmin__Email = 'ops-admin@yourorg.com'
$env:SeedAdmin__Password = 'SuperSecretP@ssw0rd123'
dotnet run --project .\SkuVaultSaaS.Api\SkuVaultSaaS.Api.csproj
```

If you need to enable seeding in a controlled production environment, set `SeedDatabase=true` and pass the required secrets via environment variables (or a managed secret provider) using the same `SeedAdmin__Password` style keys shown above.

## Security notes

- The seeder is intended for development and testing convenience. The seeded admin account uses the password configured above — treat it as ephemeral and rotate/disable it for production deployments.
- Consider disabling seeding in production by setting `SeedDatabase` to `false` in production configuration.
