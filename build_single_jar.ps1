# Build script for Single JAR deployment
$ErrorActionPreference = "Stop"

Write-Host "1. Building React Frontend..."
Push-Location frontend
# Ensure dependencies are installed
if (!(Test-Path "node_modules\\react-scripts\\bin\\react-scripts.js")) {
    npm ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend dependency install failed (npm ci)."
    }
}

node .\node_modules\react-scripts\bin\react-scripts.js build
if ($LASTEXITCODE -ne 0) {
    throw "Frontend build failed (react-scripts build)."
}
Pop-Location

Write-Host "2. Copying Frontend to Backend Resources..."
$staticDir = "src\main\resources\static"
if (!(Test-Path $staticDir)) {
    New-Item -ItemType Directory -Path $staticDir | Out-Null
}

# Clear existing static content to avoid stale files
Get-ChildItem -Path $staticDir -Recurse | Remove-Item -Recurse -Force

# Copy new build files
Copy-Item -Path "frontend\build\*" -Destination $staticDir -Recurse -Force

Write-Host "3. Building Spring Boot Backend..."
# Use the wrapper to ensure correct Maven version
if (Test-Path "target\RGSons-0.0.1-SNAPSHOT.jar.original") {
    Remove-Item -Force "target\RGSons-0.0.1-SNAPSHOT.jar.original"
}
.\mvnw package -DskipTests
if ($LASTEXITCODE -ne 0) {
    throw "Backend build failed (mvn package)."
}

Write-Host "----------------------------------------------------------------"
Write-Host "SUCCESS! Your single JAR is ready."
Write-Host "Location: target\RGSons-0.0.1-SNAPSHOT-boot.jar"
Write-Host "To run it: java -jar target\RGSons-0.0.1-SNAPSHOT-boot.jar"
Write-Host "----------------------------------------------------------------"
