# TarkovClient 지도 시스템 문제 해결 가이드 (Troubleshooting Guide)

## 🚨 긴급 문제 해결

### 🔴 치명적 오류 (Critical Issues)

#### 1. 애플리케이션이 시작되지 않음
**증상**: TarkovClient 실행 시 크래시 또는 무한 로딩

**원인 분석**:
```csharp
// 로그 확인 위치
var logPath = Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
    "TarkovClient", "Logs", "application.log"
);
```

**해결 방법**:
1. **WebView2 런타임 확인**
```bash
# PowerShell에서 확인
Get-AppxPackage -Name "Microsoft.WebView2"

# 또는 레지스트리 확인
reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
```

2. **권한 문제 해결**
```csharp
// 관리자 권한으로 실행 확인
public static bool IsRunningAsAdmin()
{
    var identity = WindowsIdentity.GetCurrent();
    var principal = new WindowsPrincipal(identity);
    return principal.IsInRole(WindowsBuiltInRole.Administrator);
}
```

3. **종속성 설치**
```bash
# .NET 8 런타임 확인
dotnet --info

# 필요한 Visual C++ 재배포 패키지 설치
# https://aka.ms/vs/17/release/vc_redist.x64.exe
```

**응급 복구 스크립트**:
```powershell
# emergency-repair.ps1
Write-Host "TarkovClient 응급 복구 시작..."

# 1. WebView2 재설치
$webview2Url = "https://go.microsoft.com/fwlink/p/?LinkId=2124703"
$webview2Path = "$env:TEMP\MicrosoftEdgeWebview2Setup.exe"
Invoke-WebRequest -Uri $webview2Url -OutFile $webview2Path
Start-Process -FilePath $webview2Path -ArgumentList "/silent" -Wait

# 2. 설정 파일 초기화
$configPath = "$env:LOCALAPPDATA\TarkovClient\config.json"
if (Test-Path $configPath) {
    Move-Item $configPath "$configPath.backup"
}

# 3. 캐시 정리
$cachePath = "$env:LOCALAPPDATA\TarkovClient\Cache"
if (Test-Path $cachePath) {
    Remove-Item $cachePath -Recurse -Force
}

Write-Host "응급 복구 완료. 애플리케이션을 다시 시작하세요."
```

#### 2. 지도가 로드되지 않음
**증상**: 빈 화면 또는 "Loading..." 상태에서 멈춤

**진단 도구**:
```javascript
// 브라우저 콘솔에서 실행
console.log('Map Status:', {
    isInitialized: window.tarkovMapApp?.isInitialized,
    currentMap: window.tarkovMap?.currentMapId,
    leafletMap: window.tarkovMap?.map?._loaded,
    errors: window.tarkovMapApp?.errors || []
});
```

**해결 방법**:
1. **맵 파일 무결성 확인**
```csharp
public async Task<bool> ValidateMapFiles()
{
    var mapDirectory = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "maps");
    var requiredMaps = new[] { "Factory.json", "Customs.json", "Woods.json" };
    
    foreach (var mapFile in requiredMaps)
    {
        var filePath = Path.Combine(mapDirectory, mapFile);
        if (!File.Exists(filePath))
        {
            Logger.LogError($"Missing map file: {mapFile}");
            return false;
        }
        
        try
        {
            var content = await File.ReadAllTextAsync(filePath);
            JsonDocument.Parse(content);
        }
        catch (JsonException ex)
        {
            Logger.LogError($"Invalid map file {mapFile}: {ex.Message}");
            return false;
        }
    }
    
    return true;
}
```

2. **네트워크 연결 확인**
```javascript
// 네트워크 상태 확인
async function checkNetworkConnectivity() {
    try {
        const response = await fetch('/api/health', { 
            method: 'GET',
            timeout: 5000 
        });
        return response.ok;
    } catch (error) {
        console.error('Network connectivity issue:', error);
        return false;
    }
}
```

### 🟡 경고 수준 문제 (Warning Issues)

#### 1. 위치 업데이트 지연
**증상**: 플레이어 마커가 실제 게임 위치와 다름

**성능 진단**:
```javascript
class PerformanceDiagnostic {
    constructor() {
        this.metrics = {
            updateCount: 0,
            totalLatency: 0,
            maxLatency: 0,
            errors: 0
        };
    }
    
    measureUpdate(updateFunction) {
        return async (...args) => {
            const startTime = performance.now();
            
            try {
                await updateFunction.apply(this, args);
                
                const latency = performance.now() - startTime;
                this.metrics.updateCount++;
                this.metrics.totalLatency += latency;
                this.metrics.maxLatency = Math.max(this.metrics.maxLatency, latency);
                
                if (latency > 50) {
                    console.warn(`Slow update detected: ${latency}ms`);
                }
            } catch (error) {
                this.metrics.errors++;
                console.error('Update failed:', error);
            }
        };
    }
    
    getReport() {
        return {
            avgLatency: this.metrics.totalLatency / this.metrics.updateCount,
            maxLatency: this.metrics.maxLatency,
            successRate: (this.metrics.updateCount - this.metrics.errors) / this.metrics.updateCount,
            updatesPerSecond: this.metrics.updateCount / (performance.now() / 1000)
        };
    }
}
```

**최적화 방법**:
```javascript
// 배치 업데이트로 성능 향상
class BatchPositionUpdater {
    constructor(interval = 16) { // 60 FPS
        this.queue = [];
        this.interval = interval;
        this.isRunning = false;
        this.startBatchProcess();
    }
    
    queueUpdate(positionData) {
        // 같은 클라이언트의 이전 업데이트 제거
        this.queue = this.queue.filter(item => item.clientId !== positionData.clientId);
        this.queue.push({ ...positionData, timestamp: performance.now() });
    }
    
    startBatchProcess() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        const processBatch = () => {
            if (this.queue.length > 0) {
                const batch = this.queue.splice(0, this.queue.length);
                this.processBatch(batch);
            }
            
            setTimeout(processBatch, this.interval);
        };
        
        processBatch();
    }
    
    processBatch(batch) {
        // 가장 최근 위치만 처리
        const latestPositions = new Map();
        
        batch.forEach(update => {
            const existing = latestPositions.get(update.clientId);
            if (!existing || update.timestamp > existing.timestamp) {
                latestPositions.set(update.clientId, update);
            }
        });
        
        // 한 번에 모든 마커 업데이트
        latestPositions.forEach(position => {
            window.tarkovMap.updatePlayerPosition(position);
        });
    }
}
```

#### 2. 메모리 사용량 증가
**증상**: 시간이 지날수록 애플리케이션이 느려짐

**메모리 모니터링**:
```csharp
public class MemoryMonitor
{
    private readonly Timer _monitorTimer;
    private readonly ILogger _logger;
    
    public MemoryMonitor(ILogger logger)
    {
        _logger = logger;
        _monitorTimer = new Timer(CheckMemoryUsage, null, TimeSpan.Zero, TimeSpan.FromMinutes(5));
    }
    
    private void CheckMemoryUsage(object state)
    {
        var process = Process.GetCurrentProcess();
        var workingSet = process.WorkingSet64;
        var privateMemory = process.PrivateMemorySize64;
        
        var workingSetMB = workingSet / (1024 * 1024);
        var privateMemoryMB = privateMemory / (1024 * 1024);
        
        _logger.LogInformation($"Memory Usage - Working Set: {workingSetMB}MB, Private: {privateMemoryMB}MB");
        
        // 경고 임계값: 500MB
        if (workingSetMB > 500)
        {
            _logger.LogWarning($"High memory usage detected: {workingSetMB}MB");
            
            // 가비지 컬렉션 강제 실행
            GC.Collect();
            GC.WaitForPendingFinalizers();
            GC.Collect();
        }
        
        // 위험 임계값: 1GB
        if (workingSetMB > 1000)
        {
            _logger.LogError($"Critical memory usage: {workingSetMB}MB - Consider restarting application");
        }
    }
}
```

**메모리 정리 방법**:
```javascript
// JavaScript 메모리 정리
class MemoryManager {
    constructor() {
        this.cleanupInterval = 300000; // 5분
        this.startCleanupTimer();
    }
    
    startCleanupTimer() {
        setInterval(() => {
            this.performCleanup();
        }, this.cleanupInterval);
    }
    
    performCleanup() {
        // 오래된 마커 제거
        this.cleanupOldMarkers();
        
        // 캐시 정리
        this.cleanupCache();
        
        // 이벤트 리스너 정리
        this.cleanupEventListeners();
        
        console.log('Memory cleanup completed');
    }
    
    cleanupOldMarkers() {
        const now = Date.now();
        const maxAge = 60000; // 1분
        
        Object.keys(this.markers).forEach(markerId => {
            const marker = this.markers[markerId];
            if (now - marker.lastUpdate > maxAge) {
                marker.remove();
                delete this.markers[markerId];
            }
        });
    }
}
```

---

## 🔧 일반적인 문제 해결

### 📍 위치 파싱 문제

#### 스크린샷 파일명 인식 실패
**증상**: 게임에서 스크린샷을 찍어도 위치가 업데이트되지 않음

**디버그 방법**:
```csharp
public void DiagnosePositionParsing()
{
    var screenshotDir = GetScreenshotDirectory();
    var files = Directory.GetFiles(screenshotDir, "*.png")
        .OrderByDescending(f => File.GetCreationTime(f))
        .Take(10);
    
    foreach (var file in files)
    {
        var filename = Path.GetFileName(file);
        Console.WriteLine($"File: {filename}");
        
        var position = PositionParser.ParseFromFilename(filename);
        if (position != null)
        {
            Console.WriteLine($"  ✅ Parsed: {position.MapName} ({position.X}, {position.Y}, {position.Z})");
        }
        else
        {
            Console.WriteLine($"  ❌ Failed to parse");
            
            // 정규식 매칭 단계별 테스트
            TestRegexPatterns(filename);
        }
    }
}

private void TestRegexPatterns(string filename)
{
    var patterns = new Dictionary<string, string>
    {
        ["DateTime"] = @"\d{4}-\d{2}-\d{2}\[\d{2}-\d{2}\]",
        ["MapName"] = @"_(?<map>\w+)_",
        ["Coordinates"] = @"_(?<x>-?\d+\.?\d*)_(?<y>-?\d+\.?\d*)_(?<z>-?\d+\.?\d*)",
        ["Quaternion"] = @"_(?<qx>-?\d+\.?\d*)_(?<qy>-?\d+\.?\d*)_(?<qz>-?\d+\.?\d*)_(?<qw>-?\d+\.?\d*)"
    };
    
    foreach (var (name, pattern) in patterns)
    {
        var match = Regex.Match(filename, pattern);
        Console.WriteLine($"    {name}: {(match.Success ? "✅" : "❌")} - {pattern}");
        
        if (match.Success)
        {
            foreach (Group group in match.Groups.Cast<Group>().Skip(1))
            {
                Console.WriteLine($"      {group.Name}: {group.Value}");
            }
        }
    }
}
```

**일반적인 해결책**:
1. **게임 설정 확인**: 스크린샷 파일명에 위치 정보가 포함되는지 확인
2. **파일 권한**: 스크린샷 폴더에 읽기 권한이 있는지 확인
3. **폴더 경로**: 게임의 스크린샷 저장 경로가 올바른지 확인

#### 좌표 변환 오류
**증상**: 지도에서 플레이어 위치가 잘못된 곳에 표시됨

**캘리브레이션 도구**:
```csharp
public class CoordinateCalibrationTool
{
    public void CalibrateMap(string mapName)
    {
        Console.WriteLine($"Starting calibration for {mapName}...");
        Console.WriteLine("1. 게임에서 알려진 위치로 이동하세요");
        Console.WriteLine("2. 스크린샷을 촬영하세요");
        Console.WriteLine("3. 실제 지도상의 위치를 클릭하세요");
        
        var calibrationPoints = new List<CalibrationPoint>();
        
        while (calibrationPoints.Count < 3)
        {
            Console.WriteLine($"\n캘리브레이션 포인트 {calibrationPoints.Count + 1}/3:");
            
            // 최근 스크린샷에서 게임 좌표 추출
            var gamePosition = GetLatestGamePosition();
            Console.WriteLine($"게임 좌표: ({gamePosition.X}, {gamePosition.Y}, {gamePosition.Z})");
            
            // 사용자로부터 지도 좌표 입력 받기
            Console.Write("지도 X 좌표 입력: ");
            var mapX = float.Parse(Console.ReadLine());
            
            Console.Write("지도 Y 좌표 입력: ");
            var mapY = float.Parse(Console.ReadLine());
            
            calibrationPoints.Add(new CalibrationPoint
            {
                GameX = gamePosition.X,
                GameZ = gamePosition.Z, // Y는 높이, Z가 실제 2D 좌표
                MapX = mapX,
                MapY = mapY
            });
        }
        
        // 변환 매개변수 계산
        var transformation = CalculateTransformation(calibrationPoints);
        SaveCalibration(mapName, transformation);
        
        Console.WriteLine("캘리브레이션 완료!");
    }
}
```

### 🌐 WebView2 통신 문제

#### JavaScript 함수 호출 실패
**증상**: C#에서 JavaScript 함수를 호출해도 응답이 없음

**진단 코드**:
```csharp
public async Task<bool> TestWebViewCommunication()
{
    try
    {
        // 기본 JavaScript 실행 테스트
        var basicResult = await _webView.CoreWebView2.ExecuteScriptAsync("'test'");
        Console.WriteLine($"Basic JS: {basicResult}");
        
        // window 객체 확인
        var windowResult = await _webView.CoreWebView2.ExecuteScriptAsync("typeof window");
        Console.WriteLine($"Window object: {windowResult}");
        
        // TarkovMap 객체 확인
        var tarkovMapResult = await _webView.CoreWebView2.ExecuteScriptAsync(
            "typeof window.tarkovMap !== 'undefined' ? 'exists' : 'missing'"
        );
        Console.WriteLine($"TarkovMap object: {tarkovMapResult}");
        
        // 지도 초기화 상태 확인
        var initResult = await _webView.CoreWebView2.ExecuteScriptAsync(
            "window.tarkovMapApp ? window.tarkovMapApp.isInitialized : false"
        );
        Console.WriteLine($"Map initialized: {initResult}");
        
        return true;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Communication test failed: {ex.Message}");
        return false;
    }
}
```

**해결 방법**:
```csharp
public async Task InitializeWebViewCommunication()
{
    try
    {
        // 1. 문서 로드 완료 대기
        await _webView.CoreWebView2.NavigateToString(GetMapHtml());
        
        var tcs = new TaskCompletionSource<bool>();
        
        _webView.CoreWebView2.DOMContentLoaded += async (sender, args) =>
        {
            try
            {
                // 2. 초기화 완료 대기
                var retryCount = 0;
                const int maxRetries = 50; // 5초 대기
                
                while (retryCount < maxRetries)
                {
                    var result = await _webView.CoreWebView2.ExecuteScriptAsync(
                        "window.tarkovMapApp && window.tarkovMapApp.isInitialized"
                    );
                    
                    if (result.Trim('"') == "true")
                    {
                        tcs.SetResult(true);
                        return;
                    }
                    
                    await Task.Delay(100);
                    retryCount++;
                }
                
                tcs.SetResult(false);
            }
            catch (Exception ex)
            {
                tcs.SetException(ex);
            }
        };
        
        var isInitialized = await tcs.Task;
        
        if (!isInitialized)
        {
            throw new InvalidOperationException("WebView2 initialization timed out");
        }
        
        // 3. 메시지 핸들러 등록
        _webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
        
        Console.WriteLine("WebView2 communication initialized successfully");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Failed to initialize WebView2 communication: {ex.Message}");
        throw;
    }
}
```

#### CORS 오류
**증상**: 브라우저 콘솔에서 CORS 관련 오류 메시지

**해결 방법**:
```csharp
public async Task SetupLocalHost()
{
    var options = _webView.CoreWebView2.Environment.CreateCoreWebView2ControllerOptions();
    
    // 가상 호스트 설정
    await _webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
        "tarkov-client.local",
        Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot"),
        CoreWebView2HostResourceAccessKind.Allow
    );
    
    // 보안 설정
    _webView.CoreWebView2.Settings.AreDevToolsEnabled = true; // 개발 중에만
    _webView.CoreWebView2.Settings.AreHostObjectsAllowed = true;
    _webView.CoreWebView2.Settings.IsGeneralAutofillEnabled = false;
    _webView.CoreWebView2.Settings.IsPasswordAutosaveEnabled = false;
    _webView.CoreWebView2.Settings.IsWebMessageEnabled = true;
    
    // 로컬 리소스 액세스 허용
    _webView.CoreWebView2.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All);
    _webView.CoreWebView2.WebResourceRequested += (sender, args) =>
    {
        args.Response = _webView.CoreWebView2.Environment.CreateWebResourceResponse(
            null, 200, "OK", "");
        args.Response.Headers.Add("Access-Control-Allow-Origin", "*");
        args.Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
        args.Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");
    };
}
```

### 🗺️ 지도 렌더링 문제

#### Leaflet 지도가 표시되지 않음
**증상**: 지도 영역이 회색 또는 빈 상태로 표시

**디버그 단계**:
```javascript
// 브라우저 콘솔에서 실행
function debugLeafletMap() {
    console.log('=== Leaflet Map Debug ===');
    
    // 1. Leaflet 라이브러리 로드 확인
    console.log('Leaflet loaded:', typeof L !== 'undefined');
    
    // 2. 맵 인스턴스 확인
    console.log('Map instance:', window.tarkovMap?.map);
    
    // 3. 맵 컨테이너 확인
    const container = document.getElementById('map');
    console.log('Map container:', {
        exists: !!container,
        width: container?.offsetWidth,
        height: container?.offsetHeight,
        visible: container?.offsetParent !== null
    });
    
    // 4. 맵 초기화 상태
    if (window.tarkovMap?.map) {
        const map = window.tarkovMap.map;
        console.log('Map state:', {
            initialized: map._loaded,
            center: map.getCenter(),
            zoom: map.getZoom(),
            bounds: map.getBounds(),
            layers: map._layers
        });
    }
    
    // 5. CSS 스타일 확인
    const mapElement = document.getElementById('map');
    if (mapElement) {
        const styles = window.getComputedStyle(mapElement);
        console.log('Map styles:', {
            width: styles.width,
            height: styles.height,
            display: styles.display,
            visibility: styles.visibility,
            position: styles.position
        });
    }
}

debugLeafletMap();
```

**일반적인 해결책**:
```css
/* CSS 수정 */
.leaflet-map {
    width: 100% !important;
    height: 100vh !important;
    min-height: 400px;
}

.leaflet-container {
    font-family: inherit;
}
```

```javascript
// JavaScript 수정
function fixMapRendering() {
    // 컨테이너 크기 강제 설정
    const mapContainer = document.getElementById('map');
    mapContainer.style.width = '100%';
    mapContainer.style.height = '100vh';
    
    // 맵 크기 재계산
    if (window.tarkovMap?.map) {
        setTimeout(() => {
            window.tarkovMap.map.invalidateSize();
        }, 100);
    }
}
```

#### 타일이 로드되지 않음
**증상**: 지도의 일부 영역이 회색 타일로 표시

**해결 방법**:
```javascript
// 커스텀 타일 레이어 설정
function setupCustomTileLayer(mapId) {
    const tileLayer = L.tileLayer('https://tarkov-client.local/maps/{mapId}/{z}/{x}/{y}.png', {
        mapId: mapId,
        minZoom: 1,
        maxZoom: 5,
        noWrap: true,
        tileSize: 256,
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' // 투명 픽셀
    });
    
    tileLayer.on('tileerror', function(e) {
        console.warn('Tile load error:', e.coords, e.tile.src);
        
        // 대체 타일 로드 시도
        const fallbackUrl = `https://tarkov-client.local/maps/fallback/${e.coords.z}/${e.coords.x}/${e.coords.y}.png`;
        e.tile.src = fallbackUrl;
    });
    
    return tileLayer;
}
```

---

## 📊 성능 문제 해결

### 느린 응답 시간
**진단 도구**:
```csharp
public class PerformanceProfiler
{
    private readonly Dictionary<string, List<TimeSpan>> _measurements = new();
    
    public async Task<T> MeasureAsync<T>(string operation, Func<Task<T>> action)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            var result = await action();
            return result;
        }
        finally
        {
            stopwatch.Stop();
            
            if (!_measurements.ContainsKey(operation))
                _measurements[operation] = new List<TimeSpan>();
                
            _measurements[operation].Add(stopwatch.Elapsed);
            
            if (stopwatch.ElapsedMilliseconds > 100)
            {
                Console.WriteLine($"⚠️ Slow operation: {operation} took {stopwatch.ElapsedMilliseconds}ms");
            }
        }
    }
    
    public void GenerateReport()
    {
        Console.WriteLine("\n=== Performance Report ===");
        
        foreach (var (operation, times) in _measurements)
        {
            var avgMs = times.Average(t => t.TotalMilliseconds);
            var maxMs = times.Max(t => t.TotalMilliseconds);
            var count = times.Count;
            
            Console.WriteLine($"{operation}:");
            Console.WriteLine($"  Count: {count}, Avg: {avgMs:F2}ms, Max: {maxMs:F2}ms");
        }
    }
}
```

### 높은 CPU 사용률
**최적화 방법**:
```javascript
// 애니메이션 최적화
class OptimizedRenderer {
    constructor() {
        this.animationFrame = null;
        this.pendingUpdates = new Set();
        this.isRendering = false;
    }
    
    scheduleUpdate(updateFunction) {
        this.pendingUpdates.add(updateFunction);
        
        if (!this.isRendering) {
            this.isRendering = true;
            this.animationFrame = requestAnimationFrame(() => this.render());
        }
    }
    
    render() {
        // 모든 업데이트를 한 번에 처리
        this.pendingUpdates.forEach(update => {
            try {
                update();
            } catch (error) {
                console.error('Render error:', error);
            }
        });
        
        this.pendingUpdates.clear();
        this.isRendering = false;
    }
    
    throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        
        return function (...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }
}
```

---

## 🔍 로그 분석 도구

### 통합 로깅 시스템
```csharp
public static class TarkovLogger
{
    private static readonly ILogger _logger = LogManager.GetCurrentClassLogger();
    
    public static void LogPositionUpdate(Position position, bool success, TimeSpan duration)
    {
        var context = new
        {
            MapName = position.MapName,
            Coordinates = new { position.X, position.Y, position.Z },
            Success = success,
            DurationMs = duration.TotalMilliseconds
        };
        
        if (success)
        {
            _logger.Info("Position updated: {@Context}", context);
        }
        else
        {
            _logger.Warn("Position update failed: {@Context}", context);
        }
    }
    
    public static void LogWebViewError(string operation, Exception ex)
    {
        _logger.Error(ex, "WebView operation failed: {Operation}", operation);
    }
    
    public static void LogPerformanceMetric(string metric, double value, string unit = "ms")
    {
        _logger.Info("Performance: {Metric} = {Value}{Unit}", metric, value, unit);
    }
}
```

### 로그 분석 스크립트
```powershell
# analyze-logs.ps1
param(
    [Parameter(Mandatory=$true)]
    [string]$LogPath,
    
    [Parameter()]
    [string]$TimeRange = "1h"
)

Write-Host "Analyzing TarkovClient logs..." -ForegroundColor Green

# 최근 로그 파일들 가져오기
$logFiles = Get-ChildItem -Path $LogPath -Filter "*.log" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 5

foreach ($logFile in $logFiles) {
    Write-Host "`n--- Analyzing $($logFile.Name) ---" -ForegroundColor Yellow
    
    $content = Get-Content $logFile.FullName | Where-Object { $_ -match "ERROR|WARN|FATAL" }
    
    # 오류 분류
    $errors = @{}
    $warnings = @{}
    
    foreach ($line in $content) {
        if ($line -match "ERROR") {
            $errorType = ($line -split " ")[3] # 간단한 분류
            $errors[$errorType] = ($errors[$errorType] ?? 0) + 1
        }
        elseif ($line -match "WARN") {
            $warnType = ($line -split " ")[3]
            $warnings[$warnType] = ($warnings[$warnType] ?? 0) + 1
        }
    }
    
    # 결과 출력
    if ($errors.Count -gt 0) {
        Write-Host "Errors:" -ForegroundColor Red
        $errors.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
            Write-Host "  $($_.Key): $($_.Value)" -ForegroundColor Red
        }
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host "Warnings:" -ForegroundColor Yellow
        $warnings.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
            Write-Host "  $($_.Key): $($_.Value)" -ForegroundColor Yellow
        }
    }
}

Write-Host "`nLog analysis complete." -ForegroundColor Green
```

---

## 📞 지원 요청 가이드

### 버그 리포트 템플릿
```markdown
# TarkovClient 버그 리포트

## 환경 정보
- **OS**: Windows 10/11 (버전: )
- **TarkovClient 버전**: 
- **WebView2 버전**: 
- **.NET 버전**: 

## 문제 설명
(간단하고 명확하게 문제를 설명해주세요)

## 재현 단계
1. 
2. 
3. 

## 예상 결과
(어떤 결과를 예상했는지)

## 실제 결과
(실제로 무엇이 일어났는지)

## 로그 파일
```
(관련 로그 내용을 여기에 붙여넣기)
```

## 스크린샷
(가능하다면 스크린샷 첨부)

## 추가 정보
(기타 관련 정보)
```

### 자가 진단 체크리스트
```
□ WebView2 런타임이 설치되어 있나요?
□ 관리자 권한으로 실행했나요?
□ 방화벽이나 바이러스 백신에서 차단하고 있지 않나요?
□ 게임의 스크린샷 경로가 올바르게 설정되어 있나요?
□ 로그 파일에서 구체적인 오류 메시지를 확인했나요?
□ 최신 버전을 사용하고 있나요?
□ 다른 타르코프 관련 프로그램과 충돌하고 있지 않나요?
□ 시스템 재시작을 해보셨나요?
□ 설정 파일을 초기화해보셨나요?
□ 캐시 폴더를 삭제해보셨나요?
```

### 응급 복구 단계
```
1단계: 기본 복구
- 애플리케이션 재시작
- 시스템 재부팅

2단계: 설정 초기화
- 설정 파일 백업 후 삭제
- 캐시 폴더 정리

3단계: 재설치
- WebView2 런타임 재설치
- TarkovClient 재설치

4단계: 시스템 점검
- Windows 업데이트 확인
- .NET 런타임 재설치
- 바이러스 백신 예외 처리 추가

5단계: 지원 요청
- 로그 파일 수집
- 시스템 정보 수집
- 버그 리포트 작성
```

---

## 🚀 성능 최적화 팁

### 권장 시스템 사양
```
최소 사양:
- OS: Windows 10 1809 이상
- CPU: Intel i3-6100 / AMD Ryzen 3 1200
- RAM: 4GB
- GPU: DirectX 11 지원
- 저장공간: 1GB

권장 사양:
- OS: Windows 11 22H2 이상
- CPU: Intel i5-8400 / AMD Ryzen 5 2600
- RAM: 8GB 이상
- GPU: DirectX 12 지원
- 저장공간: 2GB SSD
```

### 최적화 설정
```json
{
  "performance": {
    "updateInterval": 50,
    "maxFPS": 60,
    "enableVSync": true,
    "memoryLimit": 512,
    "cacheSize": 100
  },
  "features": {
    "animations": true,
    "smoothMovement": true,
    "backgroundUpdates": false,
    "autoCleanup": true
  }
}
```

---

*최종 업데이트: 2025-08-27*  
*문제가 해결되지 않으면 GitHub Issues에서 지원을 요청하세요.*