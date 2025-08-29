@echo off
echo ================================
echo 타르코프 클라이언트 지도 시스템 테스트
echo ================================
echo.

:: 프로젝트 루트 디렉토리로 이동
cd /d "%~dp0.."

:: 빌드 확인
echo [1/4] 프로젝트 빌드 확인...
if not exist "bin\Debug\net8.0-windows\TarkovClient.exe" (
    echo 프로젝트가 빌드되지 않았습니다. 빌드를 먼저 실행하세요.
    echo dotnet build --configuration Debug
    pause
    exit /b 1
)

:: WebView2 파일 확인
echo [2/4] WebView2 구성 요소 확인...
if not exist "src\Webs\components\Map\Map.html" (
    echo 지도 HTML 파일이 없습니다.
    pause
    exit /b 1
)

if not exist "src\Webs\components\Map\Map.css" (
    echo 지도 CSS 파일이 없습니다.
    pause
    exit /b 1
)

if not exist "src\Webs\components\Map\Map.js" (
    echo 지도 JavaScript 파일이 없습니다.
    pause
    exit /b 1
)

if not exist "src\Webs\components\Map\CoordinateSystem.js" (
    echo 좌표 시스템 JavaScript 파일이 없습니다.
    pause
    exit /b 1
)

if not exist "src\Webs\components\Map\maps\maps-config.json" (
    echo 지도 설정 파일이 없습니다.
    pause
    exit /b 1
)

echo ✅ 모든 구성 요소가 확인되었습니다.
echo.

:: 파일 구조 확인
echo [3/4] 파일 구조 확인...
echo.
echo 📁 프로젝트 구조:
echo   📂 src/
echo     📂 Models/
echo       📄 Position.cs
echo       📄 WebViewMessage.cs
echo     📂 Services/
echo       📄 PositionParser.cs
echo     📂 Controllers/
echo       📄 MapViewController.cs
echo     📂 FileSystem/
echo       📄 ScreenshotsWatcher.cs
echo     📂 UI/
echo       📄 MainWindow.xaml
echo       📄 MainWindow.xaml.cs
echo     📂 Webs/
echo       📂 components/
echo         📂 Map/
echo           📄 Map.html
echo           📄 Map.css
echo           📄 Map.js
echo           📄 CoordinateSystem.js
echo           📂 maps/
echo             📄 maps-config.json
echo     📂 Tests/
echo       📄 MapIntegrationTest.cs
echo.

:: 실행 가능한 작업 목록
echo [4/4] 실행 가능한 작업:
echo.
echo 🎯 1. 애플리케이션 실행 및 지도 기능 테스트
echo    - TarkovClient.exe 실행
echo    - 지도 버튼(🗺️) 클릭
echo    - 지도 인터페이스 확인
echo.
echo 🧪 2. 수동 테스트 시나리오:
echo    a) 스크린샷 파일 생성하여 위치 파싱 테스트
echo    b) 지도 컨트롤 (줌, 레이어, 설정) 테스트
echo    c) 맵 전환 기능 테스트
echo    d) WebView2 통신 테스트
echo.
echo 📊 3. 성능 모니터링:
echo    - 메모리 사용량 확인
echo    - CPU 사용률 모니터링  
echo    - WebView2 응답 시간 확인
echo.
echo ⚠️ 주의사항:
echo - WebView2 Runtime이 설치되어 있어야 합니다
echo - 지도 기능은 실제 스크린샷 파일이 있을 때 완전히 테스트 가능합니다
echo - 네트워크 연결이 필요합니다 (Leaflet.js CDN)
echo.

echo ================================
echo 테스트 준비 완료
echo ================================
echo.

:: 사용자 선택
:menu
echo 다음 중 선택하세요:
echo 1) TarkovClient.exe 실행
echo 2) 프로젝트 빌드
echo 3) 종료
echo.
set /p choice=선택 (1-3): 

if "%choice%"=="1" goto run_app
if "%choice%"=="2" goto build_project
if "%choice%"=="3" goto end
echo 잘못된 선택입니다.
goto menu

:run_app
echo.
echo 🚀 TarkovClient 실행 중...
echo.
start "TarkovClient" "bin\Debug\net8.0-windows\TarkovClient.exe"
echo 애플리케이션이 실행되었습니다.
echo 지도 기능을 테스트하려면 🗺️ 버튼을 클릭하세요.
echo.
goto menu

:build_project
echo.
echo 🔨 프로젝트 빌드 중...
echo.
dotnet build --configuration Debug
if %errorlevel% equ 0 (
    echo ✅ 빌드 성공
) else (
    echo ❌ 빌드 실패
    echo 오류를 확인하고 다시 시도하세요.
)
echo.
goto menu

:end
echo.
echo 테스트 스크립트를 종료합니다.
pause