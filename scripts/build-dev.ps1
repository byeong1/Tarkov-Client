Write-Host "====================================" -ForegroundColor Cyan
Write-Host "TarkovClient Development Build" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# 개발용 빌드 설정
Write-Host "[INFO] Building Development version..." -ForegroundColor Green

# 개발용 빌드 (디버그 모드, 빠른 빌드)
$result = dotnet build --configuration Debug --verbosity minimal

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Development build failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

# 웹 자산 복사
Write-Host "[INFO] Copying web assets..." -ForegroundColor Green

$outputDir = "bin\Debug\net8.0-windows"
$webSrcPath = "src\Webs"
$webDestPath = "$outputDir\src\Webs"

try {
    # 대상 디렉토리 생성
    if (-not (Test-Path $webDestPath)) {
        New-Item -Path $webDestPath -ItemType Directory -Force | Out-Null
    }
    
    # 웹 자산 복사
    Copy-Item -Path "$webSrcPath\*" -Destination $webDestPath -Recurse -Force
    Write-Host "[SUCCESS] Web assets copied to $webDestPath" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR] Failed to copy web assets: $($_.Exception.Message)" -ForegroundColor Red
    # 웹 자산 복사 실패는 치명적이지 않으므로 빌드 계속 진행
}

Write-Host "[SUCCESS] Development build completed successfully!" -ForegroundColor Green
Write-Host "[INFO] Output: bin\dev\net8.0-windows\TarkovClient.exe" -ForegroundColor Yellow
Write-Host "[INFO] Features: Debug symbols, Hot reload, Detailed logging" -ForegroundColor Yellow
Write-Host ""