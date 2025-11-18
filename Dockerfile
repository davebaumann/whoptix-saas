# Use the official .NET 8.0 runtime image as the base image for the final stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

# Use the official .NET 8.0 SDK image for building
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

# Copy project files
COPY backend/SkuVaultSaaS.Api/SkuVaultSaaS.Api.csproj backend/SkuVaultSaaS.Api/
COPY backend/SkuVaultSaaS.Infrastructure/SkuVaultSaaS.Infrastructure.csproj backend/SkuVaultSaaS.Infrastructure/
COPY backend/SkuVaultSaas.Core/SkuVaultSaaS.Core.csproj backend/SkuVaultSaas.Core/

# Restore dependencies
RUN dotnet restore backend/SkuVaultSaaS.Api/SkuVaultSaaS.Api.csproj

# Copy the rest of the application code
COPY backend/ backend/

# Build and publish the application
RUN dotnet publish backend/SkuVaultSaaS.Api/SkuVaultSaaS.Api.csproj -c Release -o /app/publish --no-restore

# Build the final runtime image
FROM runtime AS final
WORKDIR /app
COPY --from=build /app/publish .

# Expose the port
EXPOSE 8080

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Start the application
ENTRYPOINT ["dotnet", "SkuVaultSaaS.Api.dll"]