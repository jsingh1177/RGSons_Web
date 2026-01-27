# Azure Deployment Instructions

This guide helps you deploy the RGSons application (Spring Boot + React) to Microsoft Azure.

## Prerequisites
- Azure Account
- Azure CLI installed (`az login`)
- Docker Desktop installed

## Strategy: Azure App Service (Web App for Containers)
This is the easiest way to deploy a multi-container application or separate containers.

### Option 1: Deploy using Docker Compose (Preview)
Azure App Service supports Docker Compose, which allows you to deploy both frontend and backend together easily.

1. **Create an Azure Container Registry (ACR)**
   ```bash
   az group create --name rg-rgsons --location eastus
   az acr create --resource-group rg-rgsons --name rgsonsacr --sku Basic --admin-enabled true
   az acr login --name rgsonsacr
   ```

2. **Build and Push Images**
   *Navigate to the project root directory first.*
   ```bash
   # Build and push backend
   docker build -t rgsonsacr.azurecr.io/backend:latest .
   docker push rgsonsacr.azurecr.io/backend:latest

   # Build and push frontend
   cd frontend
   docker build -t rgsonsacr.azurecr.io/frontend:latest .
   docker push rgsonsacr.azurecr.io/frontend:latest
   cd ..
   ```

3. **Update `docker-compose.azure.yml`**
   I have created a `docker-compose.azure.yml` file for you with the database URL pre-filled:
   `jdbc:sqlserver://rgs-sqlserver.database.windows.net:1433;databaseName=RGSons...`
   
   **Action Required:** Open `docker-compose.azure.yml` and update `DB_USERNAME` and `DB_PASSWORD` with your actual Azure SQL credentials.

4. **Create Azure SQL Database**
   ```bash
   # If you haven't created the server yet (skip if 'rgs-sqlserver' already exists)
   az sql server create --name rgs-sqlserver --resource-group rg-rgsons --location eastus --admin-user sqladmin --admin-password "YourStrongPassword123"
   
   az sql db create --resource-group rg-rgsons --server rgs-sqlserver --name RGSons --service-objective S0
   
   # Allow Azure services to access server
   az sql server firewall-rule create --resource-group rg-rgsons --server rgs-sqlserver --name AllowAzure --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0
   ```

5. **Create the Web App**
   ```bash
   az appservice plan create --name rgsons-plan --resource-group rg-rgsons --sku B1 --is-linux
   
   az webapp create --resource-group rg-rgsons --plan rgsons-plan --name rgsons-app --multicontainer-config-type compose --multicontainer-config-file docker-compose.azure.yml
   ```

6. **Configure App Settings**
   Enable the ACR credentials for the Web App so it can pull images.
   ```bash
   # Get ACR credentials
   ACR_PASSWORD=$(az acr credential show --name rgsonsacr --query "passwords[0].value" -o tsv)
   
   az webapp config container set --name rgsons-app --resource-group rg-rgsons --docker-registry-server-url https://rgsonsacr.azurecr.io --docker-registry-server-user rgsonsacr --docker-registry-server-password $ACR_PASSWORD
   ```

## Option 2: Separate Deployments (Recommended for Production)
For better scalability, deploy frontend to **Azure Static Web Apps** and backend to **Azure App Service**.

### Backend (App Service)
1. Build and push the backend image as shown above.
2. Create a Web App for Containers pointing to `rgsonsacr.azurecr.io/backend:latest`.
3. Set Environment Variables in the Azure Portal > Configuration > Application Settings:
   - `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`.

### Frontend (Static Web Apps)
1. Since we used Nginx in the Dockerfile, you can stick to App Service or use Static Web Apps.
2. If using Static Web Apps, you don't need the Dockerfile. You just connect your GitHub repository, and Azure builds the React app automatically.
3. Configure the `routes.json` or `staticwebapp.config.json` to proxy `/api` to your Backend App Service URL.
