#!/usr/bin/env pwsh
# Create ZIP with Docker setup files only

$ErrorActionPreference = "Stop"

Write-Host "Creating Docker Setup Files ZIP..." -ForegroundColor Cyan
Write-Host ""

$sourceDir = "."
$zipFile = "..\pms-platform-docker-files.zip"

# Files to include
$filesToInclude = @(
    "docker-compose.yml",
    ".env.docker",
    "run.ps1",
    "run.sh",
    ".dockerignore",
    "apps\api\Dockerfile",
    "apps\web\Dockerfile",
    "README_DOCKER.md",
    "DOCKER_QUICK_START.md",
    "CLOUDCODE_HANDOFF.md",
    ".env.example"
)

# Check if files exist and create list
$existingFiles = @()
$missingFiles = @()

Write-Host "Checking files..." -ForegroundColor Yellow
foreach ($file in $filesToInclude) {
    if (Test-Path $file) {
        $existingFiles += $file
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        $missingFiles += $file
        Write-Host "  ✗ $file (not found)" -ForegroundColor Red
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "Warning: Some files are missing!" -ForegroundColor Yellow
    Write-Host "Continuing with available files..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Creating ZIP archive..." -ForegroundColor Yellow

# Create temporary directory with proper structure
$tempDir = ".\temp-docker-files"
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Copy files maintaining directory structure
foreach ($file in $existingFiles) {
    $destPath = Join-Path $tempDir $file
    $destDir = Split-Path $destPath -Parent

    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    Copy-Item -Path $file -Destination $destPath -Force
}

# Create ZIP
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipFile -Force

# Clean up temp directory
Remove-Item -Path $tempDir -Recurse -Force

$zipSize = (Get-Item $zipFile).Length / 1KB

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ ZIP archive created successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "File: $zipFile" -ForegroundColor Cyan
Write-Host "Size: $([math]::Round($zipSize, 2)) KB" -ForegroundColor Cyan
Write-Host "Files included: $($existingFiles.Count)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Location: $(Resolve-Path $zipFile)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Send this file to teammates along with the main project ZIP!" -ForegroundColor Yellow
Write-Host ""
