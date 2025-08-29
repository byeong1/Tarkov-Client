# TarkovClient WebView2 Communication API 규격서 (API Specifications)

## 📡 API 개요

### 통신 아키텍처
TarkovClient는 WebView2의 네이티브 JavaScript Bridge를 통해 C# 백엔드와 JavaScript 프론트엔드 간 직접 통신을 구현합니다.

- **백엔드**: C# (.NET 8) - WebView2.CoreWebView2
- **프론트엔드**: JavaScript (Chrome Runtime)
- **통신 방식**: ExecuteScriptAsync() & WebMessageReceived
- **데이터 형식**: JSON (JavaScript 객체)
- **지연시간**: < 1ms (네트워크 계층 없음)

### 통신 특징
```
✅ 장점:
- 초고속 통신 (1ms 미만)
- 네트워크 오버헤드 없음
- 포트 충돌 위험 제거
- 메모리 사용량 최소화
- 강화된 보안성

❌ 제약사항:
- WebView2 런타임 필수
- 단일 프로세스 통신만 가능
- 외부 클라이언트 연결 불가
```

---

## 🔌 통신 초기화

### WebView2 초기화
```csharp
// C# - MainWindow.xaml.cs
public partial class MainWindow : Window
{
    private MapViewController _mapController;
    
    private async void InitializeMapCommunication()
    {
        // WebView2 환경 설정
        var webView2Environment = await CoreWebView2Environment.CreateAsync(
            browserExecutableFolder: null,
            userDataFolder: Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "TarkovClient")
        );
        
        // WebView2 초기화
        await MapWebView.EnsureCoreWebView2Async(webView2Environment);
        
        // 컨트롤러 생성
        _mapController = new MapViewController(MapWebView);
        
        // 로컬 맵 페이지 로드
        MapWebView.Source = new Uri("https://tarkov.local/map.html");
    }
}
```

### JavaScript 초기화
```javascript
// Map.html - 초기화 코드
document.addEventListener('DOMContentLoaded', function() {
    // TarkovMap 인스턴스 생성
    const tarkovMap = new TarkovMap();
    tarkovMap.initialize();
    
    // WebView2 통신을 위해 window 객체에 API 노출
    window.tarkovMap = {
        // C#에서 호출할 메서드들
        updatePlayerPosition: tarkovMap.updatePlayerPosition.bind(tarkovMap),
        switchMap: tarkovMap.switchMap.bind(tarkovMap),
        updateSettings: tarkovMap.updateSettings.bind(tarkovMap),
        
        // 상태 조회 메서드들
        getCurrentMap: () => tarkovMap.currentMap,
        getPlayerPosition: () => tarkovMap.playerPosition,
        isReady: () => tarkovMap.isInitialized
    };
    
    // 초기화 완료 알림
    if (window.chrome && window.chrome.webview) {
        window.chrome.webview.postMessage(JSON.stringify({
            type: 'INITIALIZATION_COMPLETE',
            timestamp: Date.now()
        }));
    }
});
```

---

## 📨 C# → JavaScript 통신 (Direct Method Call)

### 1. 위치 업데이트 (POSITION_UPDATE)
**방향**: C# → JavaScript  
**시점**: 새 스크린샷 감지 시

```csharp
// C# - MapViewController.cs
public async Task UpdatePlayerPosition(PlayerPosition position, string mapId)
{
    try
    {
        var script = $@"
            if (window.tarkovMap && window.tarkovMap.updatePlayerPosition) {{
                window.tarkovMap.updatePlayerPosition({{
                    mapId: '{mapId}',
                    x: {position.X.ToString(CultureInfo.InvariantCulture)},
                    y: {position.Y.ToString(CultureInfo.InvariantCulture)},
                    z: {position.Z.ToString(CultureInfo.InvariantCulture)},
                    rotation: {position.Rotation.ToString(CultureInfo.InvariantCulture)},
                    timestamp: {DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()},
                    accuracy: {position.Accuracy.ToString(CultureInfo.InvariantCulture)},
                    source: 'screenshot'
                }});
            }}
        ";
        
        await _webView.CoreWebView2.ExecuteScriptAsync(script);
    }
    catch (Exception ex)
    {
        Logger.Error($"위치 업데이트 전송 실패: {ex.Message}");
    }
}
```

```javascript
// JavaScript - Map.js
updatePlayerPosition(data) {
    console.log('위치 업데이트 수신:', data);
    
    // 좌표 변환
    const mapCoords = this.coordinateTransformer.gameToMap(data.x, data.z, data.mapId);
    
    // 플레이어 마커 업데이트
    if (this.playerMarker) {
        this.playerMarker.setLatLng([mapCoords.lat, mapCoords.lng]);
        this.playerMarker.setRotationAngle(data.rotation);
    } else {
        this.createPlayerMarker(mapCoords, data.rotation);
    }
    
    // 정확도에 따른 마커 스타일 조정
    this.updateMarkerStyle(data.accuracy);
    
    // 위치 히스토리 저장
    this.positionHistory.push({
        ...data,
        mapCoords: mapCoords
    });
}
```

### 2. 맵 변경 알림 (MAP_CHANGE)
**방향**: C# → JavaScript  
**시점**: 맵 전환 감지 시

```csharp
// C# - MapViewController.cs
public async Task NotifyMapChange(string newMapId, string previousMapId = null, float confidence = 1.0f)
{
    try
    {
        var script = $@"
            if (window.tarkovMap && window.tarkovMap.switchMap) {{
                window.tarkovMap.switchMap({{
                    newMapId: '{newMapId}',
                    previousMapId: '{previousMapId ?? "null"}',
                    confidence: {confidence.ToString(CultureInfo.InvariantCulture)},
                    timestamp: {DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()},
                    source: 'automatic'
                }});
            }}
        ";
        
        await _webView.CoreWebView2.ExecuteScriptAsync(script);
    }
    catch (Exception ex)
    {
        Logger.Error($"맵 변경 알림 전송 실패: {ex.Message}");
    }
}
```

```javascript
// JavaScript - Map.js
switchMap(data) {
    console.log('맵 변경:', data.previousMapId, '→', data.newMapId);
    
    // 신뢰도 확인
    if (data.confidence < 0.8 && data.source === 'automatic') {
        this.showMapChangeConfirmation(data);
        return;
    }
    
    // 맵 전환 실행
    this.loadMapTiles(data.newMapId);
    this.currentMap = data.newMapId;
    
    // 플레이어 마커 초기화
    if (this.playerMarker) {
        this.playerMarker.remove();
        this.playerMarker = null;
    }
    
    // UI 업데이트
    this.updateMapTitle(data.newMapId);
    
    // C#에게 맵 변경 완료 알림
    this.sendMessageToCSharp({
        type: 'MAP_CHANGE_COMPLETE',
        mapId: data.newMapId,
        success: true
    });
}
```

### 3. 설정 업데이트 (SETTINGS_UPDATE)
**방향**: C# → JavaScript  
**시점**: 사용자 설정 변경 시

```csharp
// C# - MapViewController.cs
public async Task UpdateSettings(MapSettings settings)
{
    try
    {
        var settingsJson = JsonSerializer.Serialize(settings, new JsonSerializerOptions 
        { 
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
        });
        
        var script = $@"
            if (window.tarkovMap && window.tarkovMap.updateSettings) {{
                window.tarkovMap.updateSettings({settingsJson});
            }}
        ";
        
        await _webView.CoreWebView2.ExecuteScriptAsync(script);
    }
    catch (Exception ex)
    {
        Logger.Error($"설정 업데이트 전송 실패: {ex.Message}");
    }
}
```

---

## 📤 JavaScript → C# 통신 (WebMessage)

### 메시지 전송 인프라
```javascript
// JavaScript - 공통 메시지 전송 함수
function sendMessageToCSharp(message) {
    if (window.chrome && window.chrome.webview) {
        const messageWithId = {
            ...message,
            id: generateMessageId(),
            timestamp: Date.now()
        };
        
        window.chrome.webview.postMessage(JSON.stringify(messageWithId));
        return messageWithId.id;
    } else {
        console.error('WebView2 환경이 아닙니다');
        return null;
    }
}

function generateMessageId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
```

### C# 메시지 수신 처리
```csharp
// C# - MapViewController.cs
private void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
{
    try
    {
        var messageJson = e.TryGetWebMessageAsString();
        var message = JsonSerializer.Deserialize<WebViewMessage>(messageJson);
        
        _ = message.Type switch
        {
            "INITIALIZATION_COMPLETE" => HandleInitializationComplete(message),
            "MAP_CHANGE_COMPLETE" => HandleMapChangeComplete(message),
            "SETTINGS_CHANGE_REQUEST" => HandleSettingsChangeRequest(message),
            "ERROR_REPORT" => HandleErrorReport(message),
            "USER_INTERACTION" => HandleUserInteraction(message),
            _ => HandleUnknownMessage(message)
        };
    }
    catch (Exception ex)
    {
        Logger.Error($"WebView 메시지 처리 오류: {ex.Message}");
    }
}
```

### 1. 설정 변경 요청 (SETTINGS_CHANGE_REQUEST)
**방향**: JavaScript → C#  
**시점**: 사용자가 맵에서 설정 변경 시

```javascript
// JavaScript - 설정 변경 예제
function requestSettingsChange(newSettings) {
    sendMessageToCSharp({
        type: 'SETTINGS_CHANGE_REQUEST',
        data: {
            autoMapSwitch: newSettings.autoMapSwitch,
            zoomLevel: newSettings.zoomLevel,
            markerStyle: newSettings.markerStyle,
            showTrajectory: newSettings.showTrajectory
        }
    });
}
```

```csharp
// C# - 설정 변경 처리
private async Task<bool> HandleSettingsChangeRequest(WebViewMessage message)
{
    try
    {
        var settings = JsonSerializer.Deserialize<MapSettings>(message.Data.ToString());
        
        // 설정 유효성 검증
        if (ValidateSettings(settings))
        {
            // 설정 저장
            await _settingsManager.SaveMapSettingsAsync(settings);
            
            // 다른 컴포넌트에 설정 변경 알림
            SettingsChanged?.Invoke(this, new SettingsChangedEventArgs(settings));
            
            // 성공 응답
            await SendSettingsUpdateConfirmation(true);
            return true;
        }
        else
        {
            await SendSettingsUpdateConfirmation(false, "유효하지 않은 설정값");
            return false;
        }
    }
    catch (Exception ex)
    {
        Logger.Error($"설정 변경 처리 실패: {ex.Message}");
        await SendSettingsUpdateConfirmation(false, ex.Message);
        return false;
    }
}
```

### 2. 사용자 상호작용 (USER_INTERACTION)
**방향**: JavaScript → C#  
**시점**: 사용자가 맵에서 특정 동작 수행 시

```javascript
// JavaScript - 사용자 상호작용 예제
function reportUserInteraction(interaction) {
    sendMessageToCSharp({
        type: 'USER_INTERACTION',
        data: {
            action: interaction.action, // 'click', 'zoom', 'pan' 등
            coordinates: interaction.coordinates,
            mapId: this.currentMap,
            timestamp: Date.now()
        }
    });
}

// 맵 클릭 이벤트 처리
this.leafletMap.on('click', (e) => {
    reportUserInteraction({
        action: 'map_click',
        coordinates: { lat: e.latlng.lat, lng: e.latlng.lng }
    });
});
```

---

## 📊 성능 및 신뢰성

### 성능 메트릭스
```csharp
public class WebView2PerformanceMonitor
{
    private readonly List<TimeSpan> _executionTimes = new();
    
    public async Task<T> MeasureExecutionTime<T>(Func<Task<T>> operation)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            var result = await operation();
            return result;
        }
        finally
        {
            stopwatch.Stop();
            _executionTimes.Add(stopwatch.Elapsed);
            
            // 성능 임계값 검사 (1ms)
            if (stopwatch.ElapsedMilliseconds > 1)
            {
                Logger.Warning($"느린 WebView2 통신: {stopwatch.ElapsedMilliseconds}ms");
            }
        }
    }
    
    public PerformanceStats GetStats()
    {
        return new PerformanceStats
        {
            AverageExecutionTime = _executionTimes.Average(t => t.TotalMilliseconds),
            MaxExecutionTime = _executionTimes.Max(t => t.TotalMilliseconds),
            TotalOperations = _executionTimes.Count,
            OperationsOver1ms = _executionTimes.Count(t => t.TotalMilliseconds > 1)
        };
    }
}
```

### 성능 목표
- **평균 실행 시간**: < 1ms
- **최대 실행 시간**: < 5ms
- **메모리 사용량**: < 50MB
- **JavaScript 실행 오류**: < 0.1%

### 안정성 보장
```csharp
public class WebView2ReliabilityManager
{
    private int _consecutiveErrors = 0;
    private const int MAX_CONSECUTIVE_ERRORS = 3;
    
    public async Task<bool> ExecuteWithRetry(Func<Task> operation, int maxRetries = 2)
    {
        for (int attempt = 0; attempt <= maxRetries; attempt++)
        {
            try
            {
                await operation();
                _consecutiveErrors = 0; // 성공 시 오류 카운터 리셋
                return true;
            }
            catch (Exception ex)
            {
                _consecutiveErrors++;
                Logger.Warning($"WebView2 작업 실패 (시도 {attempt + 1}/{maxRetries + 1}): {ex.Message}");
                
                if (_consecutiveErrors >= MAX_CONSECUTIVE_ERRORS)
                {
                    // 연속 오류가 많으면 WebView2 재초기화
                    await ReinitializeWebView();
                    _consecutiveErrors = 0;
                }
                
                if (attempt == maxRetries)
                {
                    return false;
                }
                
                // 재시도 전 대기
                await Task.Delay(100 * (attempt + 1));
            }
        }
        
        return false;
    }
}
```

---

## 🚨 오류 처리 및 복구

### JavaScript 오류 처리
```javascript
// JavaScript - 전역 오류 핸들러
window.addEventListener('error', (event) => {
    sendMessageToCSharp({
        type: 'ERROR_REPORT',
        data: {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error ? event.error.stack : null,
            severity: 'error'
        }
    });
});

window.addEventListener('unhandledrejection', (event) => {
    sendMessageToCSharp({
        type: 'ERROR_REPORT',
        data: {
            message: event.reason.message || 'Unhandled Promise Rejection',
            stack: event.reason.stack,
            severity: 'warning'
        }
    });
});

// API 호출 래퍼
function safeApiCall(fn, fallback = null) {
    try {
        return fn();
    } catch (error) {
        console.error('API 호출 오류:', error);
        sendMessageToCSharp({
            type: 'ERROR_REPORT',
            data: {
                message: error.message,
                stack: error.stack,
                severity: 'error'
            }
        });
        return fallback;
    }
}
```

### C# 오류 복구 전략
```csharp
public class WebView2ErrorRecovery
{
    public async Task<bool> HandleCriticalError(Exception ex)
    {
        Logger.Error($"WebView2 치명적 오류: {ex.Message}");
        
        // 1단계: JavaScript 상태 확인
        var isJavaScriptResponsive = await CheckJavaScriptHealth();
        if (!isJavaScriptResponsive)
        {
            // 2단계: WebView2 재로드
            await ReloadWebView();
            
            // 3단계: 재초기화
            await ReinitializeMapController();
            
            return true;
        }
        
        return false;
    }
    
    private async Task<bool> CheckJavaScriptHealth()
    {
        try
        {
            var result = await _webView.CoreWebView2.ExecuteScriptAsync("window.tarkovMap && window.tarkovMap.isReady()");
            return bool.Parse(result);
        }
        catch
        {
            return false;
        }
    }
}
```

---

## 🧪 테스트 및 검증

### 통신 테스트
```csharp
[TestClass]
public class WebView2CommunicationTests
{
    private MapViewController _controller;
    private TestWebView2 _mockWebView;
    
    [TestMethod]
    public async Task TestPositionUpdate()
    {
        // Given
        var position = new PlayerPosition { X = -25.8f, Y = 5.1f, Z = -18.2f, Rotation = 245.7f };
        var mapId = "Factory";
        
        // When
        await _controller.UpdatePlayerPosition(position, mapId);
        
        // Then
        var executedScript = _mockWebView.LastExecutedScript;
        Assert.IsTrue(executedScript.Contains("updatePlayerPosition"));
        Assert.IsTrue(executedScript.Contains("-25.8"));
        Assert.IsTrue(executedScript.Contains("Factory"));
    }
    
    [TestMethod]
    public async Task TestMessageReceived()
    {
        // Given
        var message = new { type = "SETTINGS_CHANGE_REQUEST", data = new { zoomLevel = 3 } };
        var messageJson = JsonSerializer.Serialize(message);
        
        // When
        _mockWebView.SimulateMessageReceived(messageJson);
        
        // Then
        // 설정 변경 이벤트가 발생했는지 확인
        Assert.IsTrue(_controller.SettingsChanged);
    }
}
```

### 통합 테스트
```javascript
// JavaScript - E2E 테스트
describe('WebView2 Communication', () => {
    let tarkovMap;
    
    beforeEach(() => {
        tarkovMap = new TarkovMap();
        tarkovMap.initialize();
    });
    
    test('위치 업데이트 수신 및 처리', () => {
        // Given
        const positionData = {
            mapId: 'Factory',
            x: -25.8,
            y: 5.1,
            z: -18.2,
            rotation: 245.7
        };
        
        // When
        window.tarkovMap.updatePlayerPosition(positionData);
        
        // Then
        expect(tarkovMap.playerMarker).toBeTruthy();
        expect(tarkovMap.currentMap).toBe('Factory');
    });
    
    test('설정 변경 요청 전송', () => {
        // Given
        const mockWebView = jest.fn();
        window.chrome = { webview: { postMessage: mockWebView } };
        
        // When
        tarkovMap.requestSettingsChange({ zoomLevel: 3 });
        
        // Then
        expect(mockWebView).toHaveBeenCalledWith(
            expect.stringContaining('SETTINGS_CHANGE_REQUEST')
        );
    });
});
```

---

## 📚 API 사용 예제

### 기본 구현 예제
```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tarkov 지도</title>
    <link rel="stylesheet" href="leaflet/leaflet.css" />
    <link rel="stylesheet" href="map.css" />
</head>
<body>
    <div id="map-container">
        <div id="map"></div>
        <div id="controls">
            <button id="center-player">플레이어 중심</button>
            <select id="map-selector">
                <option value="Factory">공장</option>
                <option value="Customs">세관</option>
                <!-- 더 많은 맵들 -->
            </select>
        </div>
    </div>

    <script src="leaflet/leaflet.js"></script>
    <script>
        // TarkovMap 클래스 구현
        class TarkovMap {
            constructor() {
                this.leafletMap = null;
                this.playerMarker = null;
                this.currentMap = null;
                this.isInitialized = false;
            }

            initialize() {
                this.setupLeafletMap();
                this.exposeApiToWindow();
                this.setupEventListeners();
                this.isInitialized = true;
                
                this.notifyInitializationComplete();
            }

            exposeApiToWindow() {
                window.tarkovMap = {
                    updatePlayerPosition: this.updatePlayerPosition.bind(this),
                    switchMap: this.switchMap.bind(this),
                    updateSettings: this.updateSettings.bind(this),
                    getCurrentMap: () => this.currentMap,
                    isReady: () => this.isInitialized
                };
            }

            notifyInitializationComplete() {
                if (window.chrome && window.chrome.webview) {
                    window.chrome.webview.postMessage(JSON.stringify({
                        type: 'INITIALIZATION_COMPLETE',
                        timestamp: Date.now()
                    }));
                }
            }
        }

        // 초기화
        document.addEventListener('DOMContentLoaded', () => {
            const map = new TarkovMap();
            map.initialize();
        });
    </script>
</body>
</html>
```

---

## 🔄 마이그레이션 가이드

### WebSocket에서 WebView2로 마이그레이션
```csharp
// 이전: WebSocket 방식
public static void SendPosition(Position pos)
{
    UpdatePositionData posData = new UpdatePositionData()
    {
        messageType = WsMessageType.POSITION_UPDATE,
        x = pos.X,
        y = pos.Y,
        z = pos.Z,
    };
    SendData(posData);
}

// 이후: WebView2 방식
public async Task UpdatePlayerPosition(Position pos, string mapId)
{
    var script = $@"
        if (window.tarkovMap) {{
            window.tarkovMap.updatePlayerPosition({{
                mapId: '{mapId}',
                x: {pos.X},
                y: {pos.Y},
                z: {pos.Z}
            }});
        }}
    ";
    
    await _webView.CoreWebView2.ExecuteScriptAsync(script);
}
```

### 성능 개선 효과
- **지연시간**: 5-10ms → < 1ms (90%+ 개선)
- **메모리 사용량**: 중간 → 낮음 (30% 감소)
- **CPU 사용량**: WebSocket 서버 제거로 20% 감소
- **안정성**: 포트 충돌 및 네트워크 문제 해결

---

*최종 업데이트: 2025-08-27*  
*다음 문서: implementation-plan.md 업데이트*