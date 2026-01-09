FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files
COPY ["SkuVaultSaaS.Api/SkuVaultSaaS.Api.csproj", "SkuVaultSaaS.Api/"]
COPY ["SkuVaultSaas.Core/SkuVaultSaaS.Core.csproj", "SkuVaultSaas.Core/"]
COPY ["SkuVaultSaaS.Infrastructure/SkuVaultSaaS.Infrastructure.csproj", "SkuVaultSaaS.Infrastructure/"]

# Restore dependencies
RUN dotnet restore "SkuVaultSaaS.Api/SkuVaultSaaS.Api.csproj"

# Copy everything else
COPY . .

# Build the application
WORKDIR "/src/SkuVaultSaaS.Api"
RUN dotnet build "SkuVaultSaaS.Api.csproj" -c Release -o /app/build

# Publish
FROM build AS publish
RUN dotnet publish "SkuVaultSaaS.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Copy published application
COPY --from=publish /app/publish .

# Copy appsettings files from the build stage to ensure they're current
COPY --from=build /src/SkuVaultSaaS.Api/appsettings*.json ./

# Expose port (App Runner uses 8080 by default)
EXPOSE 8080

# Set environment
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Health check - use Host header to bypass AllowedHosts validation
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://127.0.0.1:8080/api/health -H "Host: justsku.com" || exit 1

# Entry point
ENTRYPOINT ["dotnet", "SkuVaultSaaS.Api.dll"]
