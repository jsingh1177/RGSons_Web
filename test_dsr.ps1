$baseUrl = "http://localhost:8080/api"

# 1. Login (Optional if auth disabled, but likely needed)
# I'll try to update store without login first, if 401, I'll login.
# But wait, I seeded "testuser"/"password123". I should use it.

$token = $null

function Login {
    Write-Host "Logging in..."
    $loginBody = @{
        userName = "testuser"
        password = "testuser"
    } | ConvertTo-Json

    try {
        $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
        if ($loginResponse.success) {
            Write-Host "Login successful!"
            return $loginResponse
        } else {
            Write-Error "Login failed: $($loginResponse.message)"
            exit
        }
    } catch {
        Write-Error "Login request failed: $_"
        exit
    }
}

# Try to fetch stores. If 401, login.
$currentUser = $null
try {
    $storesResponse = Invoke-RestMethod -Uri "$baseUrl/stores" -Method Get
} catch {
    # If it fails, try login regardless of status code just in case
    $loginResult = Login
    $currentUser = $loginResult.user
    $headers = @{} # No token returned by backend apparently
    $storesResponse = Invoke-RestMethod -Uri "$baseUrl/stores" -Method Get -Headers $headers
}

$store = $storesResponse.stores | Select-Object -First 1
if (-not $store) {
    # If response has wrapper
    $store = $storesResponse | Select-Object -First 1
}

if (-not $store) {
    Write-Error "No stores found!"
    exit
}

$storeId = $store.id
$storeCode = $store.storeCode
Write-Host "Using Store ID: $storeId, Code: $storeCode"

# 2. Update Store to OPEN
$userIdToUse = if ($currentUser) { $currentUser.id } else { "test-user-id-script" }

$body = @{
    openStatus = $true
    businessDate = "10-01-2026" # DD-MM-YYYY format as per frontend logic (or check StoreService)
    currentUserId = $userIdToUse
    storeCode = $storeCode
    storeName = $store.storeName
    status = $true
} | ConvertTo-Json

Write-Host "Opening Store with User ID: $userIdToUse..."
try {
    $headers = @{}
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    
    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/stores/$storeId" -Method Put -Body $body -ContentType "application/json" -Headers $headers
    Write-Host "Store Updated. Response Status: $($updateResponse.status)"
} catch {
    Write-Error "Error updating store: $_"
    exit
}

# 3. Check DSR Head
Start-Sleep -Seconds 2
Write-Host "Checking DSR Head..."
try {
    # Use DD-MM-YYYY format as stored in DB
    $headResponse = Invoke-RestMethod -Uri "$baseUrl/dsr/head?storeCode=$storeCode&dsrDate=10-01-2026" -Method Get -Headers $headers
    Write-Host "DSR Head Found: ID=$($headResponse.id), Status=$($headResponse.dsrStatus), UserID=$($headResponse.userId)"
} catch {
    Write-Host "DSR Head not found or error: $_"
}

# 4. Check DSR Details
Write-Host "Checking DSR Details..."
try {
    $detailsResponse = Invoke-RestMethod -Uri "$baseUrl/dsr/by-store-date?store=$storeCode&date=10-01-2026" -Method Get -Headers $headers
    Write-Host "DSR Details Count: $($detailsResponse.Count)"
    if ($detailsResponse.Count -gt 0) {
        $first = $detailsResponse[0]
        Write-Host "First Item: $($first.itemCode) - Opening: $($first.opening)"
    } else {
        Write-Host "No DSR Details found."
    }
} catch {
    Write-Host "Error fetching DSR details: $_"
}
