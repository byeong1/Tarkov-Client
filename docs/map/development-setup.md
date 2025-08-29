# TarkovClient 개발 환경 설정 가이드 (Cursor IDE)

## 🛠️ 개발 환경 개요

### 필수 도구 스택
- **IDE**: Cursor (AI-powered code editor)
- **Runtime**: .NET 8 SDK
- **UI Framework**: WPF + WebView2
- **Frontend**: HTML5 + CSS3 + JavaScript (Leaflet.js)
- **Version Control**: Git

---

## 📥 설치 가이드

### 1. .NET 8 SDK 설치
```bash
# Windows에서 직접 다운로드
# https://dotnet.microsoft.com/download/dotnet/8.0

# 또는 winget 사용
winget install Microsoft.DotNet.SDK.8

# 설치 확인
dotnet --version
# 8.0.x가 출력되어야 함
```

### 2. WebView2 Runtime 설치
```bash
# WebView2 Runtime 다운로드 및 설치
# https://go.microsoft.com/fwlink/p/?LinkId=2124703

# 또는 winget 사용
winget install Microsoft.EdgeWebView2

# PowerShell에서 설치 확인
Get-AppxPackage -Name "Microsoft.WebView2"
```

### 3. Git 설정 (이미 있을 가능성 높음)
```bash
# Git 설치 확인
git --version

# 설정 확인
git config --global user.name
git config --global user.email
```

---

## 🎯 Cursor IDE 설정

### 프로젝트 열기
```bash
# 프로젝트 폴더에서 Cursor 실행
cd C:\Users\qoqud\code\TarkovClient
cursor .
```

### 확장 프로그램 권장 사항

#### C# 개발용
- **C# Dev Kit**: Microsoft의 공식 C# 확장
- **C#**: C# 언어 지원
- **NuGet Package Manager**: 패키지 관리

#### 웹 개발용
- **Live Server**: HTML 로컬 서버
- **JavaScript (ES6) code snippets**: JS 코드 스니펫
- **CSS Peek**: CSS 클래스 정의 찾기

#### 유틸리티
- **GitLens**: Git 기능 강화
- **Prettier**: 코드 포매터
- **Bracket Pair Colorizer**: 괄호 색상 구분

### Cursor 설정 파일
```json
// .vscode/settings.json (Cursor가 VS Code 설정을 사용)
{
  "dotnet.completion.showCompletionItemsFromUnimportedNamespaces": true,
  "dotnet.enablePackageRestore": true,
  "files.associations": {
    "*.cs": "csharp",
    "*.xaml": "xml"
  },
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "csharp.format.enable": true,
  "csharp.semanticHighlighting.enabled": true,
  "javascript.preferences.quoteStyle": "single",
  "html.autoClosingTags": true
}
```

### 작업 공간 설정
```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build",
      "command": "dotnet",
      "type": "process",
      "args": ["build", "${workspaceFolder}/TarkovClient.csproj"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "silent",
        "focus": false,
        "panel": "shared"
      },
      "problemMatcher": "$msCompile"
    },
    {
      "label": "run",
      "command": "dotnet",
      "type": "process",
      "args": ["run", "--project", "${workspaceFolder}/TarkovClient.csproj"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": true,
        "panel": "new"
      }
    },
    {
      "label": "test",
      "command": "dotnet",
      "type": "process",
      "args": ["test", "${workspaceFolder}/Tests/Tests.csproj"],
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always"
      }
    }
  ]
}
```

### 디버그 설정
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": ".NET Core Launch (WPF)",
      "type": "coreclr",
      "request": "launch",
      "program": "${workspaceFolder}/bin/Debug/net8.0-windows/TarkovClient.exe",
      "args": [],
      "cwd": "${workspaceFolder}",
      "console": "internalConsole",
      "stopAtEntry": false,
      "requireExactSource": false
    },
    {
      "name": ".NET Core Attach",
      "type": "coreclr",
      "request": "attach",
      "processId": "${command:pickProcess}"
    }
  ]
}
```

---

## 🔧 개발 워크플로우

### 1. 빌드 및 실행
```bash
# 터미널에서 (Cursor 내장 터미널 사용)
# Ctrl + ` 로 터미널 열기

# 프로젝트 복원
dotnet restore

# 빌드
dotnet build

# 실행
dotnet run

# 또는 Cursor 명령 팔레트 사용 (Ctrl + Shift + P)
# "Tasks: Run Task" -> "build" 또는 "run" 선택
```

### 2. 패키지 관리
```bash
# 새 패키지 추가
dotnet add package Microsoft.Web.WebView2

# 패키지 업데이트
dotnet list package --outdated
dotnet update

# 패키지 제거
dotnet remove package PackageName
```

### 3. 테스트 실행
```bash
# 모든 테스트 실행
dotnet test

# 특정 테스트 실행
dotnet test --filter "TestName"

# 커버리지 리포트 생성
dotnet test --collect:"XPlat Code Coverage"
```

---

## 🎨 프론트엔드 개발 설정

### HTML/CSS/JS 파일 구조
```
wwwroot/
├── index.html          # 메인 맵 페이지
├── css/
│   ├── main.css        # 메인 스타일
│   ├── leaflet.css     # Leaflet 스타일
│   └── components/     # 컴포넌트별 CSS
├── js/
│   ├── app.js          # 메인 애플리케이션
│   ├── components/     # UI 컴포넌트들
│   ├── services/       # 서비스 레이어
│   └── utils/          # 유틸리티 함수들
├── maps/               # 지도 이미지 및 데이터
└── lib/                # 외부 라이브러리
```

### Live Server 설정
```json
// .vscode/settings.json에 추가
{
  "liveServer.settings.root": "/wwwroot",
  "liveServer.settings.port": 8080,
  "liveServer.settings.host": "localhost"
}
```

### 개발용 HTML 파일
```html
<!-- wwwroot/dev.html - 개발 전용 -->
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TarkovClient Map - Development</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="lib/leaflet/leaflet.css">
</head>
<body>
    <div id="tarkov-map-container" class="map-container">
        <!-- 맵 컨테이너 -->
    </div>
    
    <!-- 개발용 디버그 패널 -->
    <div id="debug-panel" style="position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px; z-index: 9999;">
        <h4>Debug Info</h4>
        <div>Map: <span id="debug-map">-</span></div>
        <div>Pos: <span id="debug-position">-</span></div>
        <div>FPS: <span id="debug-fps">-</span></div>
        <button onclick="testPosition()">Test Position</button>
    </div>
    
    <script src="lib/leaflet/leaflet.js"></script>
    <script src="js/app.js"></script>
    <script>
        // 개발용 테스트 함수들
        function testPosition() {
            if (window.tarkovMap) {
                window.tarkovMap.updatePlayerPosition({
                    mapId: 'Factory',
                    x: Math.random() * 100 - 50,
                    y: Math.random() * 100 - 50,
                    z: 5.1,
                    rotation: Math.random() * 360
                });
            }
        }
        
        // 디버그 정보 업데이트
        setInterval(() => {
            if (window.tarkovMap) {
                document.getElementById('debug-map').textContent = window.tarkovMap.currentMapId || '-';
                document.getElementById('debug-fps').textContent = (window.debugInfo?.fps || 0).toFixed(1);
            }
        }, 1000);
    </script>
</body>
</html>
```

---

## 🐛 디버깅 설정

### C# 디버깅
```csharp
// 개발 모드에서만 활성화되는 디버그 코드
#if DEBUG
public class DebugHelper
{
    public static void LogPositionUpdate(PlayerPosition position)
    {
        Console.WriteLine($"[DEBUG] Position Update: {position.MapName} ({position.X:F2}, {position.Y:F2}, {position.Z:F2}) @ {position.Rotation:F1}°");
    }
    
    public static void LogWebViewMessage(string message)
    {
        Console.WriteLine($"[DEBUG] WebView: {message}");
    }
}
#endif
```

### JavaScript 디버깅
```javascript
// js/utils/debug.js
class DebugUtils {
    static isDebugMode = window.location.hostname === 'localhost' || 
                         window.location.search.includes('debug=true');
    
    static log(...args) {
        if (this.isDebugMode) {
            console.log('[DEBUG]', ...args);
        }
    }
    
    static warn(...args) {
        if (this.isDebugMode) {
            console.warn('[DEBUG]', ...args);
        }
    }
    
    static error(...args) {
        console.error('[DEBUG]', ...args);
    }
    
    static logPerformance(name, duration) {
        if (this.isDebugMode && duration > 16) {
            console.warn(`[PERF] ${name} took ${duration.toFixed(2)}ms`);
        }
    }
}

// 전역 디버그 객체
window.debugInfo = {
    fps: 0,
    frameCount: 0,
    lastFrameTime: performance.now()
};

// FPS 측정
function measureFPS() {
    const now = performance.now();
    const delta = now - window.debugInfo.lastFrameTime;
    window.debugInfo.fps = 1000 / delta;
    window.debugInfo.lastFrameTime = now;
    window.debugInfo.frameCount++;
    
    requestAnimationFrame(measureFPS);
}

if (DebugUtils.isDebugMode) {
    measureFPS();
}
```

---

## ⚡ 성능 최적화 도구

### 빌드 최적화
```xml
<!-- TarkovClient.csproj에 추가 -->
<PropertyGroup Condition="'$(Configuration)'=='Release'">
  <DebugType>none</DebugType>
  <DebugSymbols>false</DebugSymbols>
  <Optimize>true</Optimize>
  <TrimMode>link</TrimMode>
  <PublishTrimmed>true</PublishTrimmed>
</PropertyGroup>
```

### 프론트엔드 최적화
```javascript
// js/utils/performance.js
class PerformanceOptimizer {
    constructor() {
        this.animationFrame = null;
        this.pendingOperations = [];
    }
    
    // RAF로 배치 처리
    batchOperation(operation) {
        this.pendingOperations.push(operation);
        
        if (!this.animationFrame) {
            this.animationFrame = requestAnimationFrame(() => {
                this.executeBatch();
            });
        }
    }
    
    executeBatch() {
        const operations = this.pendingOperations.splice(0);
        operations.forEach(op => op());
        this.animationFrame = null;
    }
    
    // 쓰로틀링
    throttle(func, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                func.apply(this, args);
            }
        };
    }
    
    // 디바운싱
    debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
}
```

---

## 🧪 개발용 스크립트

### 개발 서버 시작
```bash
# dev-server.bat
@echo off
echo Starting TarkovClient Development Server...

REM .NET 애플리케이션 빌드 및 실행
start "TarkovClient" dotnet run

REM 웹 개발 서버 (선택적)
REM cd wwwroot
REM start "Live Server" npx live-server --port=8080

echo Development servers started!
echo .NET App: Running on default port
echo Web Server: http://localhost:8080
pause
```

### 빠른 테스트 스크립트
```bash
# quick-test.bat
@echo off
echo Running quick tests...

echo.
echo === Building Project ===
dotnet build
if %ERRORLEVEL% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo === Running Unit Tests ===
dotnet test --verbosity quiet
if %ERRORLEVEL% neq 0 (
    echo Tests failed!
    pause
    exit /b 1
)

echo.
echo === All tests passed! ===
pause
```

### 정리 스크립트
```bash
# clean-all.bat
@echo off
echo Cleaning all build artifacts...

rmdir /s /q bin 2>nul
rmdir /s /q obj 2>nul
rmdir /s /q Tests\bin 2>nul
rmdir /s /q Tests\obj 2>nul

echo Clean completed!
pause
```

---

## 📚 Cursor AI 활용 팁

### 1. AI 채팅 활용
- `Ctrl + K`: 인라인 코드 생성/수정
- `Ctrl + L`: AI 채팅 열기
- `Ctrl + I`: 코드 설명 요청

### 2. 유용한 프롬프트 예시
```
"WebView2에서 JavaScript 함수를 호출하는 C# 코드를 작성해줘"

"Leaflet.js에서 플레이어 마커를 회전시키는 방법을 보여줘"

"이 에러를 해결하는 방법을 알려줘: [에러 메시지]"

"성능 최적화를 위해 이 코드를 개선해줘"

"단위 테스트를 작성해줘 for this class"
```

### 3. 코드 리뷰 요청
```
"이 코드에 버그나 개선점이 있는지 검토해줘"

"이 구현이 베스트 프랙티스를 따르는지 확인해줘"

"메모리 누수 가능성을 체크해줘"
```

---

## 🎯 다음 단계

### 즉시 실행 가능한 작업
1. **환경 설정 완료**: 위 가이드에 따라 개발 환경 구축
2. **프로젝트 구조 확인**: 현재 TarkovClient 프로젝트 상태 점검
3. **첫 번째 구현**: `implementation-plan.md`의 Phase 1 시작

### Cursor에서의 개발 워크플로우
```bash
# 1. Cursor에서 프로젝트 열기
cursor C:\Users\qoqud\code\TarkovClient

# 2. 터미널에서 개발 서버 시작
# Ctrl + ` 로 터미널 열고:
dotnet run

# 3. 다른 터미널에서 테스트 실행
dotnet test --watch

# 4. AI 도움 받으며 코딩 진행
# Ctrl + K로 코드 생성/수정
# Ctrl + L로 질문하며 개발
```

이제 Cursor IDE에 최적화된 개발 환경이 준비되었습니다. Visual Studio 대신 Cursor의 AI 기능을 최대한 활용하여 효율적으로 개발할 수 있습니다!