FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY veritas.sln .
COPY veritas/veritas/veritas.csproj veritas/veritas/
COPY veritas/veritas.Client/veritas.Client.csproj veritas/veritas.Client/

RUN dotnet restore

COPY veritas/veritas/ veritas/veritas/
COPY veritas/veritas.Client/ veritas/veritas.Client/

RUN dotnet publish veritas/veritas/veritas.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .

USER app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "veritas.dll"]