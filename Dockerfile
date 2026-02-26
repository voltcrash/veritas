# =========================
# Build stage
# =========================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution and project files
COPY veritas.sln .
COPY veritas/veritas/veritas.csproj veritas/veritas/
COPY veritas/veritas.Client/veritas.Client.csproj veritas/veritas.Client/

# Restore
RUN dotnet restore

# Copy all source code
COPY veritas/ veritas/

# Publish
RUN dotnet publish veritas/veritas/veritas.csproj \
    -c Release \
    -o /app/publish

# =========================
# Runtime stage
# =========================
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "veritas.dll"]