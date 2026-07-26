FROM mcr.microsoft.com/dotnet/runtime:8.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["apps/agent/NOS.Agent.csproj", "apps/agent/"]
RUN dotnet restore "apps/agent/NOS.Agent.csproj"
COPY . .
WORKDIR "/src/apps/agent"
RUN dotnet build "NOS.Agent.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "NOS.Agent.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "NOS.Agent.dll"]
