Write-Host "====================================" -ForegroundColor Cyan
Write-Host "TarkovClient Package Creator" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# 버전 정보 추출 (환경변수 또는 csproj에서)
if ($env:GITHUB_REF -and $env:GITHUB_REF -match "refs/tags/v(.+)") {
    $version = "v" + $matches[1]
    Write-Host "[INFO] Using version from Git tag: $version" -ForegroundColor Cyan
} else {
    # .csproj 파일에서 버전 추출
    $csprojContent = Get-Content "TarkovClient.csproj" -Raw
    if ($csprojContent -match '<Version>([\d\.]+)</Version>') {
        $version = "v" + $matches[1]
        Write-Host "[INFO] Using version from csproj: $version" -ForegroundColor Cyan
    } else {
        $version = "v0.1.0"
        Write-Host "[INFO] Using default version: $version" -ForegroundColor Yellow
    }
}

$releaseDir = "release"
$zipName = "TarkovClient-$version.zip"

Write-Host "[INFO] Creating package for $version..." -ForegroundColor Green

# publish 폴더가 없으면 먼저 publish 빌드 실행
if (-not (Test-Path "publish\TarkovClient.exe")) {
    Write-Host "[INFO] TarkovClient.exe not found. Running publish build first..." -ForegroundColor Yellow
    Write-Host "[INFO] This may take several minutes due to single-file compilation..." -ForegroundColor Cyan
    & "scripts\build-publish.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Publish build failed!" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

# 릴리스 폴더 생성
if (Test-Path $releaseDir) {
    Write-Host "[INFO] Cleaning existing release folder..." -ForegroundColor Yellow
    Remove-Item -Path $releaseDir -Recurse -Force
}
New-Item -Path $releaseDir -ItemType Directory | Out-Null

# 포터블 버전 복사
Write-Host "[INFO] Adding portable version..." -ForegroundColor Green
Copy-Item -Path "publish\TarkovClient.exe" -Destination "$releaseDir\TarkovClient.exe"

# 사용법 파일 복사 (사용자 친화적)
if (Test-Path "사용법.txt") {
    Write-Host "[INFO] Adding 사용법.txt..." -ForegroundColor Green
    Copy-Item -Path "사용법.txt" -Destination "$releaseDir\사용법.txt"
}

# ZIP 파일 생성
Write-Host "[INFO] Creating ZIP package..." -ForegroundColor Green
Compress-Archive -Path "$releaseDir\*" -DestinationPath $zipName -Force

# 파일 크기 확인
$zipInfo = Get-Item $zipName
$zipSizeMB = [math]::Round($zipInfo.Length / 1MB, 2)

Write-Host "[SUCCESS] Package created successfully!" -ForegroundColor Green
Write-Host "[INFO] ZIP File: $zipName ($zipSizeMB MB)" -ForegroundColor Yellow
Write-Host "[INFO] Contents:" -ForegroundColor Yellow
Get-ChildItem $releaseDir | ForEach-Object {
    $fileSizeMB = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  - $($_.Name) ($fileSizeMB MB)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[INFO] Package ready for GitHub Release upload!" -ForegroundColor Green
Write-Host ""