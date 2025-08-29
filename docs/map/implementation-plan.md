# TarkovClient 위치 공유 시스템 - 구현 계획서 (Implementation Plan)

## 📋 개요

이 문서는 TarkovClient에 실시간 위치 공유 기능을 통합하기 위한 상세 구현 계획을 제공합니다. WebView2 Direct Communication을 통한 고성능 통신 시스템으로 설계되었습니다.

---

## 🎯 Phase 1: 데이터 모델 및 파싱 로직 (3-4일)

### 1.1 데이터 모델 설계 (1일)

#### 작업 항목
- [ ] ⏳ **PlayerPosition 모델 확장**
- [ ] ⏳ **MapConfiguration 모델 생성**
- [ ] ⏳ **좌표 변환 모델 정의**
- [ ] ⏳ **설정 관리 모델 구현**

#### 구현 세부사항
```csharp
// src/Models/MapModels.cs (신규)
public class PlayerPosition
{
    public float X { get; set; }
    public float Y { get; set; }
    public float Z { get; set; }
    
    // 쿼터니언 회전값
    public float QuaternionX { get; set; }
    public float QuaternionY { get; set; }
    public float QuaternionZ { get; set; }
    public float QuaternionW { get; set; }
    
    // 계산된 Yaw 각도
    public float Rotation => CalculateYawFromQuaternion();
    
    // 부가 정보
    public string MapName { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public float Accuracy { get; set; } = 1.0f;
    
    private float CalculateYawFromQuaternion()
    {
        // TarkovMonitor의 쿼터니언 변환 로직 포팅
        float siny_cosp = 2 * (QuaternionW * QuaternionY + QuaternionZ * QuaternionX);
        float cosy_cosp = 1 - 2 * (QuaternionY * QuaternionY + QuaternionZ * QuaternionZ);
        float yaw = (float)Math.Atan2(siny_cosp, cosy_cosp);
        
        float yawDegrees = yaw * (180.0f / (float)Math.PI);
        return yawDegrees < 0 ? yawDegrees + 360.0f : yawDegrees;
    }
}

public class MapConfiguration
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public MapBounds Bounds { get; set; } = new();
    public MapSize ImageSize { get; set; } = new();
    public CoordinateTransform Transform { get; set; } = new();
}

public class MapBounds
{
    public float MinX { get; set; }
    public float MaxX { get; set; }
    public float MinZ { get; set; }
    public float MaxZ { get; set; }
}
```

### 1.2 위치 파싱 시스템 (1.5일)

#### 작업 항목
- [ ] ⏳ **TarkovMonitor 정규식 패턴 포팅**
- [ ] ⏳ **파일명 파싱 로직 구현**
- [ ] ⏳ **오류 처리 및 검증**
- [ ] ⏳ **성능 최적화**

#### 구현 세부사항
```csharp
// src/Core/PositionParser.cs (신규)
public static class PositionParser
{
    private static readonly Regex PositionPattern = new Regex(
        @"(?<map>\w+)_(?<x>-?\d+\.?\d*)_(?<y>-?\d+\.?\d*)_(?<z>-?\d+\.?\d*)_" +
        @"(?<qx>-?\d+\.?\d*)_(?<qy>-?\d+\.?\d*)_(?<qz>-?\d+\.?\d*)_(?<qw>-?\d+\.?\d*)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase
    );

    public static PlayerPosition? ParseFromFilename(string filename)
    {
        if (string.IsNullOrWhiteSpace(filename))
            return null;

        try
        {
            // 기본 파일명 패턴 매칭
            var dateMatch = Regex.Match(filename, @"\d{4}-\d{2}-\d{2}\[\d{2}-\d{2}\]_?(?<position>.+) \(\d\)\.png");
            if (!dateMatch.Success)
                return null;

            var positionString = dateMatch.Groups["position"].Value;
            var positionMatch = PositionPattern.Match(positionString);
            
            if (!positionMatch.Success)
                return null;

            return new PlayerPosition
            {
                MapName = positionMatch.Groups["map"].Value,
                X = float.Parse(positionMatch.Groups["x"].Value, CultureInfo.InvariantCulture),
                Y = float.Parse(positionMatch.Groups["y"].Value, CultureInfo.InvariantCulture),
                Z = float.Parse(positionMatch.Groups["z"].Value, CultureInfo.InvariantCulture),
                QuaternionX = float.Parse(positionMatch.Groups["qx"].Value, CultureInfo.InvariantCulture),
                QuaternionY = float.Parse(positionMatch.Groups["qy"].Value, CultureInfo.InvariantCulture),
                QuaternionZ = float.Parse(positionMatch.Groups["qz"].Value, CultureInfo.InvariantCulture),
                QuaternionW = float.Parse(positionMatch.Groups["qw"].Value, CultureInfo.InvariantCulture),
                Timestamp = DateTime.UtcNow,
                Accuracy = CalculateAccuracy(positionString)
            };
        }
        catch (Exception ex)
        {
            Logger.Warning($"위치 파싱 실패 - {filename}: {ex.Message}");
            return null;
        }
    }

    private static float CalculateAccuracy(string positionString)
    {
        // 파싱된 데이터의 완성도를 기반으로 정확도 계산
        return positionString.Contains("_") && positionString.Split('_').Length >= 7 ? 0.95f : 0.7f;
    }
}
```

### 1.3 맵 변경 감지 시스템 (1.5일)

#### 작업 항목  
- [ ] ⏳ **게임 로그 모니터링**
- [ ] ⏳ **맵 번들 → 맵 ID 변환**
- [ ] ⏳ **스크린샷 기반 2차 확인**
- [ ] ⏳ **신뢰도 기반 결정 시스템**

#### 구현 세부사항
```csharp
// src/Core/MapDetector.cs (신규)
public class MapDetectionEngine
{
    private readonly Dictionary<string, string> _bundleToMapMapping = new()
    {
        { "factory4_day", "Factory" },
        { "factory4_night", "Factory" },
        { "bigmap", "Customs" },
        { "customs", "Customs" },
        { "interchange", "Interchange" },
        { "woods", "Woods" },
        { "shoreline", "Shoreline" },
        { "rezervbase", "Reserve" },
        { "laboratory", "Labs" }
    };

    public event EventHandler<MapChangeEventArgs>? MapChanged;

    public string? DetectMapFromBundle(string bundleName)
    {
        var normalizedBundle = bundleName.ToLowerInvariant();
        
        foreach (var mapping in _bundleToMapMapping)
        {
            if (normalizedBundle.Contains(mapping.Key))
            {
                return mapping.Value;
            }
        }
        
        return null;
    }

    public float CalculateConfidence(string bundleName, string detectedMap)
    {
        var normalizedBundle = bundleName.ToLowerInvariant();
        
        if (_bundleToMapMapping.TryGetValue(normalizedBundle, out var exactMatch))
        {
            return exactMatch == detectedMap ? 1.0f : 0.0f;
        }
        
        var partialMatches = _bundleToMapMapping
            .Where(kvp => normalizedBundle.Contains(kvp.Key) && kvp.Value == detectedMap)
            .ToList();
            
        return partialMatches.Count == 1 ? 0.8f : 0.3f;
    }
}
```

---

## 🔧 Phase 2: WebView2 Direct Communication 구현 (2일)

### 2.1 MapViewController 구현 (1일)

#### 작업 항목
- [ ] ⏳ **WebView2 통신 컨트롤러 생성**
- [ ] ⏳ **C# → JavaScript 메서드 호출**
- [ ] ⏳ **JavaScript → C# 메시지 수신**
- [ ] ⏳ **오류 처리 및 안정성 보장**

#### 구현 세부사항
```csharp
// src/UI/MapViewController.cs (신규)
public class MapViewController : IDisposable
{
    private readonly WebView2 _webView;
    private readonly ILogger _logger;
    private bool _isInitialized = false;

    public event EventHandler<MapChangeEventArgs>? MapChangeRequested;
    public event EventHandler<SettingsChangedEventArgs>? SettingsChanged;
    public event EventHandler<ErrorEventArgs>? JavaScriptError;

    public MapViewController(WebView2 webView, ILogger logger)
    {
        _webView = webView ?? throw new ArgumentNullException(nameof(webView));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        
        InitializeWebView();
    }

    private void InitializeWebView()
    {
        _webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
        _webView.CoreWebView2.NavigationCompleted += OnNavigationCompleted;
    }

    // C# → JavaScript: 위치 업데이트
    public async Task<bool> UpdatePlayerPosition(PlayerPosition position, string mapId)
    {
        if (!_isInitialized) return false;

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
                        accuracy: {position.Accuracy.ToString(CultureInfo.InvariantCulture)}
                    }});
                    true;
                }} else {{
                    false;
                }}
            ";

            var result = await _webView.CoreWebView2.ExecuteScriptAsync(script);
            return bool.Parse(result);
        }
        catch (Exception ex)
        {
            _logger.Error($"위치 업데이트 실패: {ex.Message}");
            return false;
        }
    }

    // C# → JavaScript: 맵 변경 알림
    public async Task<bool> NotifyMapChange(string newMapId, string? previousMapId = null, float confidence = 1.0f)
    {
        if (!_isInitialized) return false;

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
                    true;
                }} else {{
                    false;
                }}
            ";

            var result = await _webView.CoreWebView2.ExecuteScriptAsync(script);
            return bool.Parse(result);
        }
        catch (Exception ex)
        {
            _logger.Error($"맵 변경 알림 실패: {ex.Message}");
            return false;
        }
    }

    // JavaScript → C# 메시지 처리
    private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var messageJson = e.TryGetWebMessageAsString();
            var message = JsonSerializer.Deserialize<WebViewMessage>(messageJson);
            
            ProcessWebViewMessage(message);
        }
        catch (Exception ex)
        {
            _logger.Error($"WebView 메시지 처리 오류: {ex.Message}");
        }
    }

    private void ProcessWebViewMessage(WebViewMessage? message)
    {
        if (message == null) return;

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

    public void Dispose()
    {
        if (_webView?.CoreWebView2 != null)
        {
            _webView.CoreWebView2.WebMessageReceived -= OnWebMessageReceived;
            _webView.CoreWebView2.NavigationCompleted -= OnNavigationCompleted;
        }
    }
}
```

### 2.2 WebView2 메시지 처리 시스템 (0.5일)

#### 작업 항목
- [ ] ⏳ **메시지 타입 정의**
- [ ] ⏳ **JSON 직렬화/역직렬화**
- [ ] ⏳ **메시지 유효성 검증**

#### 구현 세부사항
```csharp
// src/Models/WebViewMessage.cs (신규)
public class WebViewMessage
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;
    
    [JsonPropertyName("data")]
    public JsonElement Data { get; set; }
    
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
    
    [JsonPropertyName("timestamp")]
    public long Timestamp { get; set; }
}

public static class WebViewMessageTypes
{
    public const string INITIALIZATION_COMPLETE = "INITIALIZATION_COMPLETE";
    public const string MAP_CHANGE_COMPLETE = "MAP_CHANGE_COMPLETE";
    public const string SETTINGS_CHANGE_REQUEST = "SETTINGS_CHANGE_REQUEST";
    public const string ERROR_REPORT = "ERROR_REPORT";
    public const string USER_INTERACTION = "USER_INTERACTION";
}

// 메시지 검증
public class WebViewMessageValidator
{
    public static bool IsValid(WebViewMessage message)
    {
        if (string.IsNullOrEmpty(message.Type)) return false;
        if (string.IsNullOrEmpty(message.Id)) return false;
        if (message.Timestamp <= 0) return false;
        
        return true;
    }
}
```

### 2.3 MainWindow WebView2 통합 (0.5일)

#### 작업 항목
- [ ] ⏳ **지도 탭 추가**
- [ ] ⏳ **WebView2 초기화**
- [ ] ⏳ **MapViewController 연결**

#### 구현 세부사항
```csharp
// MainWindow.xaml.cs 확장
public partial class MainWindow : Window
{
    private MapViewController? _mapController;
    private TabItem? _mapTab;

    private async void InitializeMapIntegration()
    {
        try
        {
            // 맵 탭 생성
            await CreateMapTab();
            
            // 이벤트 핸들러 연결
            if (_mapController != null)
            {
                ScreenshotsWatcher.ScreenshotDetected += OnScreenshotDetected;
                // 기타 이벤트 연결
            }
        }
        catch (Exception ex)
        {
            Logger.Error($"맵 통합 초기화 실패: {ex.Message}");
        }
    }

    private async Task CreateMapTab()
    {
        var webView = new WebView2();
        var mapTab = new TabItem
        {
            Header = "지도",
            Content = webView
        };

        // WebView2 환경 설정
        var webView2Environment = await CoreWebView2Environment.CreateAsync(
            browserExecutableFolder: null,
            userDataFolder: Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "TarkovClient")
        );

        await webView.EnsureCoreWebView2Async(webView2Environment);
        
        // 가상 호스트 매핑 설정 (로컬 HTML 파일 접근용)
        webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
            "tarkov.local",
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Webs", "components", "Map"),
            CoreWebView2HostResourceAccessKind.Allow);

        _mapController = new MapViewController(webView, Logger);
        
        // 맵 페이지 로드
        webView.Source = new Uri("https://tarkov.local/map.html");
        
        TabContainer.Items.Add(mapTab);
        _mapTab = mapTab;
    }

    private async void OnScreenshotDetected(object? sender, FileSystemEventArgs e)
    {
        var position = PositionParser.ParseFromFilename(e.Name);
        if (position != null && _mapController != null)
        {
            await _mapController.UpdatePlayerPosition(position, position.MapName);
        }
    }
}
```

---

## 🎨 Phase 3: 웹 프론트엔드 구현 (3-4일)

### 3.1 HTML/CSS 구조 설계 (1일)

#### 작업 항목
- [ ] ⏳ **기본 HTML 페이지 생성**
- [ ] ⏳ **Leaflet.js 라이브러리 통합**
- [ ] ⏳ **반응형 CSS 스타일**
- [ ] ⏳ **로딩 및 에러 상태 UI**

#### 파일 구조
```
src/Webs/components/Map/
├── map.html              # 메인 지도 페이지
├── map.css               # 스타일시트  
├── map.js                # 지도 로직
├── libs/                 # 외부 라이브러리
│   ├── leaflet/
│   │   ├── leaflet.js
│   │   ├── leaflet.css
│   │   └── images/       # Leaflet 아이콘
│   └── utils.js          # 공통 유틸리티
└── data/                 # 맵 데이터
    ├── maps.json         # 맵 메타데이터
    ├── transforms.json   # 좌표 변환 설정
    └── images/           # 맵 이미지 타일
        ├── customs/
        ├── woods/
        └── ...
```

#### map.html 구조
```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tarkov 실시간 지도</title>
    <link rel="stylesheet" href="libs/leaflet/leaflet.css" />
    <link rel="stylesheet" href="map.css" />
</head>
<body>
    <div id="app">
        <!-- 로딩 상태 -->
        <div id="loading" class="overlay">
            <div class="spinner"></div>
            <p>지도를 불러오는 중...</p>
        </div>

        <!-- 에러 상태 -->
        <div id="error" class="overlay hidden">
            <div class="error-content">
                <h3>오류가 발생했습니다</h3>
                <p id="error-message"></p>
                <button onclick="location.reload()">다시 시도</button>
            </div>
        </div>

        <!-- 메인 지도 컨테이너 -->
        <div id="map-container">
            <div id="map"></div>
            
            <!-- 지도 컨트롤 -->
            <div id="map-controls">
                <div class="control-group">
                    <button id="center-player" title="플레이어 중심">📍</button>
                    <button id="toggle-rotation" title="회전 따라가기">🧭</button>
                </div>
                
                <div class="control-group">
                    <select id="map-selector">
                        <option value="Factory">공장</option>
                        <option value="Customs">세관</option>
                        <option value="Interchange">인터체인지</option>
                        <option value="Woods">숲</option>
                        <option value="Shoreline">해안선</option>
                        <option value="Reserve">리저브</option>
                        <option value="Labs">연구소</option>
                    </select>
                </div>
            </div>

            <!-- 정보 패널 -->
            <div id="info-panel">
                <div class="info-item">
                    <span class="label">현재 맵:</span>
                    <span id="current-map">-</span>
                </div>
                <div class="info-item">
                    <span class="label">위치:</span>
                    <span id="player-coords">-</span>
                </div>
                <div class="info-item">
                    <span class="label">방향:</span>
                    <span id="player-rotation">-</span>
                </div>
            </div>
        </div>
    </div>

    <script src="libs/leaflet/leaflet.js"></script>
    <script src="libs/utils.js"></script>
    <script src="map.js"></script>
</body>
</html>
```

### 3.2 JavaScript 지도 로직 구현 (1.5일)

#### 작업 항목
- [ ] ⏳ **TarkovMap 클래스 구현**
- [ ] ⏳ **Leaflet.js 지도 초기화**
- [ ] ⏳ **좌표 변환 시스템**
- [ ] ⏳ **플레이어 마커 관리**

#### 구현 세부사항
```javascript
// map.js - 메인 지도 로직
class TarkovMap {
    constructor() {
        this.leafletMap = null;
        this.currentMap = null;
        this.playerMarker = null;
        this.coordinateTransformer = null;
        this.isInitialized = false;
        this.positionHistory = [];
        this.settings = {
            followPlayer: true,
            showRotation: true,
            zoomLevel: 2
        };
    }

    async initialize() {
        try {
            this.showLoading(true);
            
            // 맵 데이터 로드
            await this.loadMapData();
            
            // Leaflet 지도 초기화
            this.initializeLeafletMap();
            
            // WebView2 통신을 위한 API 노출
            this.exposeToWebView();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            this.isInitialized = true;
            this.showLoading(false);
            
            // C#에게 초기화 완료 알림
            this.notifyInitializationComplete();
            
        } catch (error) {
            this.showError('지도 초기화 실패: ' + error.message);
        }
    }

    async loadMapData() {
        const [mapsData, transformsData] = await Promise.all([
            fetch('data/maps.json').then(r => r.json()),
            fetch('data/transforms.json').then(r => r.json())
        ]);
        
        this.mapsData = mapsData;
        this.transformsData = transformsData;
        this.coordinateTransformer = new CoordinateTransformer(transformsData);
    }

    initializeLeafletMap() {
        // 지도 컨테이너 초기화
        this.leafletMap = L.map('map', {
            crs: L.CRS.Simple,
            minZoom: 1,
            maxZoom: 5,
            zoomControl: true,
            attributionControl: false
        });

        // 기본 맵 로드 (Factory)
        this.switchToMap('Factory');
    }

    // C#에서 호출할 메서드들을 window 객체에 노출
    exposeToWebView() {
        window.tarkovMap = {
            updatePlayerPosition: this.updatePlayerPosition.bind(this),
            switchMap: this.switchMap.bind(this),
            updateSettings: this.updateSettings.bind(this),
            getCurrentMap: () => this.currentMap,
            getPlayerPosition: () => this.playerMarker?.getLatLng(),
            isReady: () => this.isInitialized
        };
    }

    // C#에서 호출되는 위치 업데이트 메서드
    updatePlayerPosition(data) {
        try {
            console.log('위치 업데이트 수신:', data);
            
            // 맵이 다르면 자동 전환 (설정에 따라)
            if (data.mapId !== this.currentMap) {
                if (this.settings.autoMapSwitch) {
                    this.switchToMap(data.mapId);
                }
            }
            
            // 좌표 변환
            const mapCoords = this.coordinateTransformer.gameToMap(data.x, data.z, data.mapId);
            
            // 플레이어 마커 업데이트
            this.updatePlayerMarker(mapCoords, data.rotation, data.accuracy);
            
            // UI 정보 업데이트
            this.updateInfoPanel(data);
            
            // 위치 히스토리 저장
            this.addToHistory(data, mapCoords);
            
        } catch (error) {
            console.error('위치 업데이트 오류:', error);
            this.reportError('위치 업데이트 오류', error);
        }
    }

    // C#에서 호출되는 맵 전환 메서드
    switchMap(data) {
        try {
            const mapId = typeof data === 'string' ? data : data.newMapId;
            console.log('맵 전환:', this.currentMap, '→', mapId);
            
            // 신뢰도 확인 (자동 전환인 경우)
            if (typeof data === 'object' && data.confidence < 0.8 && data.source === 'automatic') {
                this.showMapChangeConfirmation(data);
                return;
            }
            
            // 맵 타일 로드
            this.loadMapTiles(mapId);
            this.currentMap = mapId;
            
            // 플레이어 마커 초기화
            if (this.playerMarker) {
                this.leafletMap.removeLayer(this.playerMarker);
                this.playerMarker = null;
            }
            
            // UI 업데이트
            this.updateMapSelector(mapId);
            document.getElementById('current-map').textContent = this.getMapDisplayName(mapId);
            
            // C#에게 맵 변경 완료 알림
            this.sendMessageToCSharp({
                type: 'MAP_CHANGE_COMPLETE',
                data: { mapId: mapId, success: true }
            });
            
        } catch (error) {
            console.error('맵 전환 오류:', error);
            this.reportError('맵 전환 오류', error);
        }
    }

    loadMapTiles(mapId) {
        // 기존 타일 레이어 제거
        this.leafletMap.eachLayer(layer => {
            if (layer instanceof L.TileLayer) {
                this.leafletMap.removeLayer(layer);
            }
        });

        const mapConfig = this.mapsData[mapId];
        if (!mapConfig) {
            throw new Error(`맵 설정을 찾을 수 없음: ${mapId}`);
        }

        // 맵 이미지 레이어 추가
        const bounds = [[mapConfig.bounds.minY, mapConfig.bounds.minX], 
                       [mapConfig.bounds.maxY, mapConfig.bounds.maxX]];
        
        L.imageOverlay(
            `data/images/${mapId.toLowerCase()}/map.jpg`,
            bounds
        ).addTo(this.leafletMap);

        // 뷰 설정
        this.leafletMap.fitBounds(bounds);
        this.leafletMap.setMaxBounds(bounds);
    }

    updatePlayerMarker(position, rotation, accuracy = 1.0) {
        const latLng = L.latLng(position.lat, position.lng);
        
        if (this.playerMarker) {
            // 기존 마커 업데이트
            this.playerMarker.setLatLng(latLng);
            if (this.settings.showRotation) {
                this.playerMarker.setRotationAngle(rotation);
            }
        } else {
            // 새 마커 생성
            const icon = L.divIcon({
                className: 'player-marker',
                html: '📍',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            
            this.playerMarker = L.marker(latLng, { 
                icon: icon,
                rotationAngle: rotation 
            }).addTo(this.leafletMap);
        }
        
        // 정확도에 따른 마커 스타일 조정
        this.updateMarkerAccuracy(accuracy);
        
        // 플레이어 따라가기
        if (this.settings.followPlayer) {
            this.leafletMap.panTo(latLng);
        }
    }

    // JavaScript → C# 메시지 전송
    sendMessageToCSharp(message) {
        if (window.chrome && window.chrome.webview) {
            const messageWithId = {
                ...message,
                id: this.generateMessageId(),
                timestamp: Date.now()
            };
            
            window.chrome.webview.postMessage(JSON.stringify(messageWithId));
            return messageWithId.id;
        } else {
            console.warn('WebView2 환경이 아닙니다');
            return null;
        }
    }

    generateMessageId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    notifyInitializationComplete() {
        this.sendMessageToCSharp({
            type: 'INITIALIZATION_COMPLETE',
            data: { 
                version: '1.0.0',
                supportedMaps: Object.keys(this.mapsData),
                ready: true 
            }
        });
    }

    reportError(title, error) {
        this.sendMessageToCSharp({
            type: 'ERROR_REPORT',
            data: {
                title: title,
                message: error.message,
                stack: error.stack,
                timestamp: Date.now()
            }
        });
    }

    showLoading(show) {
        const loadingEl = document.getElementById('loading');
        loadingEl.classList.toggle('hidden', !show);
    }

    showError(message) {
        const errorEl = document.getElementById('error');
        const messageEl = document.getElementById('error-message');
        messageEl.textContent = message;
        errorEl.classList.remove('hidden');
        this.showLoading(false);
    }
}

// 좌표 변환 클래스
class CoordinateTransformer {
    constructor(transformsData) {
        this.transforms = transformsData;
    }

    gameToMap(gameX, gameZ, mapId) {
        const transform = this.transforms[mapId];
        if (!transform) {
            throw new Error(`좌표 변환 데이터 없음: ${mapId}`);
        }

        // 게임 좌표를 지도 좌표로 변환
        const lat = (gameZ - transform.offsetZ) * transform.scaleZ;
        const lng = (gameX - transform.offsetX) * transform.scaleX;

        return { lat, lng };
    }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    const tarkovMap = new TarkovMap();
    tarkovMap.initialize();
});
```

### 3.3 CSS 스타일링 (0.5일)

#### 구현 세부사항
```css
/* map.css - 지도 스타일 */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body, html {
    height: 100%;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: #1a1a1a;
    color: #ffffff;
}

#app {
    height: 100vh;
    position: relative;
}

#map-container {
    width: 100%;
    height: 100%;
    position: relative;
}

#map {
    width: 100%;
    height: 100%;
    background: #2a2a2a;
}

/* 로딩 오버레이 */
.overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(26, 26, 26, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    transition: opacity 0.3s ease;
}

.overlay.hidden {
    opacity: 0;
    pointer-events: none;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #444;
    border-top: 4px solid #ff6b35;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* 지도 컨트롤 */
#map-controls {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.control-group {
    display: flex;
    gap: 8px;
    background: rgba(42, 42, 42, 0.9);
    border-radius: 8px;
    padding: 8px;
    backdrop-filter: blur(10px);
}

.control-group button {
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 6px;
    background: #3a3a3a;
    color: #ffffff;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 16px;
}

.control-group button:hover {
    background: #ff6b35;
    transform: translateY(-1px);
}

.control-group select {
    background: #3a3a3a;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    padding: 0 12px;
    height: 40px;
    min-width: 120px;
    cursor: pointer;
}

/* 정보 패널 */
#info-panel {
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: rgba(42, 42, 42, 0.9);
    border-radius: 8px;
    padding: 16px;
    backdrop-filter: blur(10px);
    z-index: 1000;
    min-width: 200px;
}

.info-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
}

.info-item:last-child {
    margin-bottom: 0;
}

.label {
    color: #aaa;
    margin-right: 12px;
}

/* 플레이어 마커 */
.player-marker {
    background: #ff6b35;
    border: 3px solid #ffffff;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
}

/* 에러 상태 */
.error-content {
    text-align: center;
    max-width: 400px;
    padding: 32px;
    background: rgba(42, 42, 42, 0.95);
    border-radius: 12px;
    border: 1px solid #ff4444;
}

.error-content h3 {
    color: #ff4444;
    margin-bottom: 16px;
    font-size: 24px;
}

.error-content button {
    background: #ff6b35;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    margin-top: 16px;
    transition: background 0.2s ease;
}

.error-content button:hover {
    background: #e55a2e;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
    #map-controls {
        top: 10px;
        right: 10px;
        scale: 0.9;
    }
    
    #info-panel {
        bottom: 10px;
        left: 10px;
        right: 10px;
        scale: 0.9;
    }
    
    .control-group select {
        min-width: 100px;
    }
}
```

### 3.4 맵 데이터 및 설정 (1일)

#### 작업 항목
- [ ] ⏳ **maps.json 메타데이터 생성**
- [ ] ⏳ **transforms.json 좌표 변환 설정**
- [ ] ⏳ **맵 이미지 타일 준비**
- [ ] ⏳ **utils.js 공통 함수**

#### maps.json 구조
```json
{
  "Factory": {
    "displayName": "공장",
    "bounds": {
      "minX": -150,
      "maxX": 150,
      "minY": -100,
      "maxY": 100
    },
    "imageSize": {
      "width": 1024,
      "height": 1024
    },
    "defaultZoom": 2
  },
  "Customs": {
    "displayName": "세관",
    "bounds": {
      "minX": -500,
      "maxX": 500,
      "minY": -400,
      "maxY": 400
    },
    "imageSize": {
      "width": 2048,
      "height": 1536
    },
    "defaultZoom": 1
  }
}
```

---

## 🔗 Phase 4: 시스템 통합 및 테스트 (2일)

### 4.1 이벤트 통합 (1일)

#### 작업 항목
- [ ] ⏳ **ScreenshotsWatcher → MapViewController 연동**
- [ ] ⏳ **MapDetector → MapViewController 연동**
- [ ] ⏳ **설정 시스템 통합**
- [ ] ⏳ **에러 처리 시스템**

#### 구현 세부사항
```csharp
// 통합 이벤트 처리
public class MapIntegrationManager
{
    private readonly MapViewController _mapController;
    private readonly MapDetectionEngine _mapDetector;
    private readonly PositionParser _positionParser;
    
    public MapIntegrationManager(
        MapViewController mapController,
        MapDetectionEngine mapDetector)
    {
        _mapController = mapController;
        _mapDetector = mapDetector;
        _positionParser = new PositionParser();
        
        SetupEventHandlers();
    }
    
    private void SetupEventHandlers()
    {
        ScreenshotsWatcher.ScreenshotDetected += OnScreenshotDetected;
        _mapDetector.MapChanged += OnMapChanged;
        _mapController.SettingsChanged += OnSettingsChanged;
    }
    
    private async void OnScreenshotDetected(object? sender, FileSystemEventArgs e)
    {
        try
        {
            var position = _positionParser.ParseFromFilename(e.Name ?? string.Empty);
            if (position != null)
            {
                await _mapController.UpdatePlayerPosition(position, position.MapName);
                Logger.Debug($"위치 업데이트: {position.MapName} ({position.X}, {position.Z})");
            }
        }
        catch (Exception ex)
        {
            Logger.Error($"스크린샷 처리 실패: {ex.Message}");
        }
    }
    
    private async void OnMapChanged(object? sender, MapChangeEventArgs e)
    {
        try
        {
            await _mapController.NotifyMapChange(e.NewMap, e.PreviousMap, e.Confidence);
            Logger.Info($"맵 변경 알림: {e.PreviousMap} → {e.NewMap} (신뢰도: {e.Confidence})");
        }
        catch (Exception ex)
        {
            Logger.Error($"맵 변경 알림 실패: {ex.Message}");
        }
    }
}
```

### 4.2 성능 최적화 및 테스트 (1일)

#### 작업 항목
- [ ] ⏳ **WebView2 통신 성능 측정**
- [ ] ⏳ **좌표 변환 정확도 검증**
- [ ] ⏳ **메모리 사용량 최적화**
- [ ] ⏳ **사용자 시나리오 테스트**

#### 성능 목표
- [ ] WebView2 통신 지연시간 < 1ms
- [ ] 위치 업데이트 빈도 10-30 FPS
- [ ] 좌표 변환 정확도 ±2 pixel
- [ ] 메모리 사용량 < 추가 100MB

---

## 📋 구현 체크리스트

### Phase 1: 데이터 모델 및 파싱 로직
- [ ] PlayerPosition 모델 확장 완료
- [ ] PositionParser 구현 및 테스트 완료
- [ ] MapDetector 구현 및 테스트 완료
- [ ] 단위 테스트 커버리지 >80%

### Phase 2: WebView2 통신 시스템
- [ ] MapViewController 구현 완료
- [ ] WebView2 메시지 처리 시스템 완료
- [ ] MainWindow 통합 완료
- [ ] 통신 안정성 테스트 완료

### Phase 3: 웹 프론트엔드
- [ ] HTML/CSS 구조 완료
- [ ] JavaScript 지도 로직 완료
- [ ] Leaflet.js 통합 완료
- [ ] 반응형 디자인 완료

### Phase 4: 시스템 통합
- [ ] 이벤트 통합 완료
- [ ] 성능 최적화 완료
- [ ] 사용자 테스트 완료
- [ ] 문서화 완료

---

## 🎯 최종 검증 항목

### 기능 검증
- [ ] 스크린샷 감지 → 위치 파싱 → 지도 표시
- [ ] 맵 변경 감지 → 자동 지도 전환
- [ ] 사용자 설정 → 실시간 반영
- [ ] 오류 상황 → 적절한 복구

### 성능 검증  
- [ ] 평균 통신 지연시간 < 1ms
- [ ] 위치 정확도 ±2 pixel at max zoom
- [ ] 메모리 사용량 안정적 유지
- [ ] CPU 사용량 <5% (idle 상태)

### 사용자 경험 검증
- [ ] 직관적인 인터페이스
- [ ] 부드러운 애니메이션
- [ ] 적절한 피드백 제공
- [ ] 오류 상황 명확한 안내

---

*최종 업데이트: 2025-08-27*  
*예상 완료 기간: 10-12일*  
*다음 문서: ui-components.md*