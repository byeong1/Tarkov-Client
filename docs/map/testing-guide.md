# TarkovClient 지도 시스템 테스트 가이드 (Testing Guide)

## 📋 테스트 전략 개요

### 테스트 피라미드
TarkovClient 지도 시스템은 다음과 같은 테스트 계층을 사용합니다:

```
        E2E Tests (10%)
    Integration Tests (20%)
      Unit Tests (70%)
```

### 테스트 환경
- **단위 테스트**: Jest + Testing Library
- **통합 테스트**: Playwright + C# NUnit
- **E2E 테스트**: Playwright + 실제 게임 시뮬레이션
- **성능 테스트**: Chrome DevTools + Custom Metrics
- **수동 테스트**: 실제 게임 환경

---

## 🧪 단위 테스트 (Unit Tests)

### JavaScript 컴포넌트 테스트

#### 좌표 변환 시스템 테스트
```javascript
// tests/coordinate-system.test.js
import { CoordinateTransformer } from '../src/js/coordinate-transformer.js';

describe('CoordinateTransformer', () => {
    let transformer;
    
    beforeEach(() => {
        const mockMapConfig = {
            bounds: {
                min: { x: -150, y: -100 },
                max: { x: 150, y: 100 }
            },
            imageSize: { width: 1024, height: 1024 }
        };
        transformer = new CoordinateTransformer(mockMapConfig);
    });
    
    test('should correctly transform game coordinates to map coordinates', () => {
        const gameCoords = { x: -25.8, z: -18.2 };
        const mapCoords = transformer.gameToMap(gameCoords.x, gameCoords.z);
        
        // Factory 맵 기준 예상 결과
        expect(mapCoords.x).toBeCloseTo(394.88, 2);
        expect(mapCoords.y).toBeCloseTo(590.72, 2);
    });
    
    test('should handle edge cases for coordinate boundaries', () => {
        // 맵 경계 좌표 테스트
        const edgeCoords = [
            { x: -150, z: -100 }, // min bounds
            { x: 150, z: 100 },   // max bounds
            { x: 0, z: 0 }        // center
        ];
        
        edgeCoords.forEach(coords => {
            const result = transformer.gameToMap(coords.x, coords.z);
            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.y).toBeGreaterThanOrEqual(0);
            expect(result.x).toBeLessThanOrEqual(1024);
            expect(result.y).toBeLessThanOrEqual(1024);
        });
    });
    
    test('should maintain accuracy with reverse transformation', () => {
        const originalCoords = { x: -25.8, z: -18.2 };
        const mapCoords = transformer.gameToMap(originalCoords.x, originalCoords.z);
        const reversedCoords = transformer.mapToGame(mapCoords.x, mapCoords.y);
        
        expect(reversedCoords.x).toBeCloseTo(originalCoords.x, 1);
        expect(reversedCoords.z).toBeCloseTo(originalCoords.z, 1);
    });
});
```

#### 플레이어 마커 테스트
```javascript
// tests/player-marker.test.js
import { TarkovPlayerMarker } from '../src/js/components/player-marker.js';

describe('TarkovPlayerMarker', () => {
    let mockMap;
    let marker;
    
    beforeEach(() => {
        // Leaflet 모킹
        mockMap = {
            addLayer: jest.fn(),
            removeLayer: jest.fn()
        };
        
        marker = new TarkovPlayerMarker(mockMap);
    });
    
    test('should create marker with default options', () => {
        expect(marker.options.size).toBe(16);
        expect(marker.options.showDirection).toBe(true);
        expect(marker.marker).not.toBeNull();
    });
    
    test('should update position correctly', () => {
        const lat = 100, lng = 200, rotation = 45;
        marker.updatePosition(lat, lng, rotation);
        
        expect(marker.marker.getLatLng().lat).toBe(lat);
        expect(marker.marker.getLatLng().lng).toBe(lng);
    });
    
    test('should handle invalid position gracefully', () => {
        expect(() => {
            marker.updatePosition(null, null, null);
        }).not.toThrow();
    });
});
```

### C# 백엔드 테스트

#### 위치 파싱 테스트
```csharp
// Tests/PositionParsingTests.cs
using NUnit.Framework;
using TarkovClient.Services;
using TarkovClient.Models;

[TestFixture]
public class PositionParsingTests
{
    private PositionParser _parser;
    
    [SetUp]
    public void Setup()
    {
        _parser = new PositionParser();
    }
    
    [Test]
    public void ParseFromFilename_ValidFilename_ReturnsCorrectPosition()
    {
        // Arrange
        const string filename = "2024-08-27[15-30]_FactoryDay_-25.8_-18.2_5.1_0.0_-0.7_0.0_0.7 (1).png";
        
        // Act
        var position = _parser.ParseFromFilename(filename);
        
        // Assert
        Assert.IsNotNull(position);
        Assert.AreEqual("FactoryDay", position.MapName);
        Assert.AreEqual(-25.8f, position.X, 0.1f);
        Assert.AreEqual(-18.2f, position.Y, 0.1f);
        Assert.AreEqual(5.1f, position.Z, 0.1f);
    }
    
    [Test]
    public void ParseFromFilename_InvalidFilename_ReturnsNull()
    {
        // Arrange
        const string filename = "invalid_filename.png";
        
        // Act
        var position = _parser.ParseFromFilename(filename);
        
        // Assert
        Assert.IsNull(position);
    }
    
    [TestCase("Factory", -25.8f, -18.2f)]
    [TestCase("Customs", 100.5f, 200.3f)]
    [TestCase("Woods", -300.1f, 450.7f)]
    public void ParseFromFilename_DifferentMaps_ParsesCorrectly(string mapName, float x, float y)
    {
        // Arrange
        var filename = $"2024-08-27[15-30]_{mapName}_{x}_{y}_5.1_0.0_-0.7_0.0_0.7 (1).png";
        
        // Act
        var position = _parser.ParseFromFilename(filename);
        
        // Assert
        Assert.IsNotNull(position);
        Assert.AreEqual(mapName, position.MapName);
        Assert.AreEqual(x, position.X, 0.1f);
        Assert.AreEqual(y, position.Y, 0.1f);
    }
}
```

#### 쿼터니언 변환 테스트
```csharp
// Tests/QuaternionConverterTests.cs
[TestFixture]
public class QuaternionConverterTests
{
    [Test]
    public void QuaternionToYaw_NorthDirection_Returns0()
    {
        // Arrange - 북쪽을 향하는 쿼터니언
        float x = 0.0f, y = 0.0f, z = 0.0f, w = 1.0f;
        
        // Act
        float yaw = QuaternionConverter.QuaternionToYaw(x, y, z, w);
        
        // Assert
        Assert.AreEqual(0.0f, yaw, 1.0f);
    }
    
    [Test]
    public void QuaternionToYaw_EastDirection_Returns90()
    {
        // Arrange - 동쪽을 향하는 쿼터니언
        float x = 0.0f, y = 0.707f, z = 0.0f, w = 0.707f;
        
        // Act
        float yaw = QuaternionConverter.QuaternionToYaw(x, y, z, w);
        
        // Assert
        Assert.AreEqual(90.0f, yaw, 2.0f);
    }
    
    [Test]
    public void QuaternionToYaw_AllDirections_ReturnsValidRange()
    {
        // Arrange - 다양한 방향의 쿼터니언들
        var testCases = new[]
        {
            new { x = 0.0f, y = -0.7f, z = 0.0f, w = 0.7f },
            new { x = 0.0f, y = 0.5f, z = 0.0f, w = 0.866f },
            new { x = 0.0f, y = -0.5f, z = 0.0f, w = 0.866f }
        };
        
        foreach (var testCase in testCases)
        {
            // Act
            float yaw = QuaternionConverter.QuaternionToYaw(
                testCase.x, testCase.y, testCase.z, testCase.w);
            
            // Assert
            Assert.GreaterOrEqual(yaw, 0.0f);
            Assert.Less(yaw, 360.0f);
        }
    }
}
```

---

## 🔗 통합 테스트 (Integration Tests)

### WebView2 통신 테스트
```csharp
// Tests/Integration/WebView2CommunicationTests.cs
[TestFixture]
public class WebView2CommunicationTests
{
    private MapViewController _mapController;
    private TestWebView2 _mockWebView;
    
    [SetUp]
    public async Task Setup()
    {
        _mockWebView = new TestWebView2();
        _mapController = new MapViewController(_mockWebView);
        await _mapController.InitializeAsync();
    }
    
    [Test]
    public async Task UpdatePlayerPosition_ValidPosition_SendsCorrectScript()
    {
        // Arrange
        var position = new PlayerPosition
        {
            X = -25.8f,
            Y = -18.2f,
            Z = 5.1f,
            Rotation = 45.0f
        };
        
        // Act
        var result = await _mapController.UpdatePlayerPosition(position, "Factory");
        
        // Assert
        Assert.IsTrue(result);
        Assert.IsTrue(_mockWebView.ExecutedScript.Contains("updatePlayerPosition"));
        Assert.IsTrue(_mockWebView.ExecutedScript.Contains("-25.8"));
        Assert.IsTrue(_mockWebView.ExecutedScript.Contains("45"));
    }
    
    [Test]
    public async Task SwitchMap_DifferentMap_LoadsCorrectMapData()
    {
        // Arrange
        const string newMapId = "Customs";
        
        // Act
        var result = await _mapController.SwitchMapAsync(newMapId);
        
        // Assert
        Assert.IsTrue(result);
        Assert.IsTrue(_mockWebView.ExecutedScript.Contains("switchMap"));
        Assert.IsTrue(_mockWebView.ExecutedScript.Contains("Customs"));
    }
}
```

### 파일 시스템 감시 테스트
```csharp
// Tests/Integration/FileWatcherIntegrationTests.cs
[TestFixture]
public class FileWatcherIntegrationTests
{
    private ScreenshotWatcher _watcher;
    private string _testDirectory;
    private List<Position> _capturedPositions;
    
    [SetUp]
    public void Setup()
    {
        _testDirectory = Path.Combine(Path.GetTempPath(), "TarkovTest");
        Directory.CreateDirectory(_testDirectory);
        
        _capturedPositions = new List<Position>();
        _watcher = new ScreenshotWatcher(_testDirectory);
        _watcher.PositionDetected += (sender, position) => _capturedPositions.Add(position);
    }
    
    [Test]
    public async Task FileWatcher_NewScreenshot_DetectsPositionCorrectly()
    {
        // Arrange
        _watcher.Start();
        const string testFilename = "2024-08-27[15-30]_Factory_-25.8_-18.2_5.1_0.0_-0.7_0.0_0.7 (1).png";
        
        // Act
        var testFilePath = Path.Combine(_testDirectory, testFilename);
        await File.WriteAllTextAsync(testFilePath, "dummy content");
        
        // 파일 시스템 이벤트 처리 대기
        await Task.Delay(500);
        
        // Assert
        Assert.AreEqual(1, _capturedPositions.Count);
        var position = _capturedPositions[0];
        Assert.AreEqual("Factory", position.MapName);
        Assert.AreEqual(-25.8f, position.X, 0.1f);
    }
    
    [TearDown]
    public void TearDown()
    {
        _watcher?.Dispose();
        if (Directory.Exists(_testDirectory))
        {
            Directory.Delete(_testDirectory, true);
        }
    }
}
```

---

## 🎭 E2E 테스트 (End-to-End Tests)

### Playwright 시나리오 테스트
```javascript
// tests/e2e/map-functionality.spec.js
import { test, expect } from '@playwright/test';

test.describe('Tarkov Map Functionality', () => {
    test.beforeEach(async ({ page }) => {
        // TarkovClient 애플리케이션 시작
        await page.goto('http://localhost:8080/map');
        await page.waitForLoadState('networkidle');
    });
    
    test('should display map and initialize correctly', async ({ page }) => {
        // 맵 컨테이너 확인
        await expect(page.locator('#tarkov-map-container')).toBeVisible();
        await expect(page.locator('.leaflet-map')).toBeVisible();
        
        // 컨트롤 버튼들 확인
        await expect(page.locator('#zoom-in')).toBeVisible();
        await expect(page.locator('#zoom-out')).toBeVisible();
        
        // 상태 바 확인
        await expect(page.locator('.status-bar')).toBeVisible();
        await expect(page.locator('#connection-status')).toContainText('연결');
    });
    
    test('should update player position when C# sends data', async ({ page }) => {
        // JavaScript 함수 직접 호출 (C# 호출 시뮬레이션)
        const positionData = {
            mapId: 'Factory',
            x: -25.8,
            y: -18.2,
            z: 5.1,
            rotation: 45
        };
        
        const result = await page.evaluate((data) => {
            return window.tarkovMap.updatePlayerPosition(data);
        }, positionData);
        
        expect(result).toBe(true);
        
        // 좌표 표시 확인
        await expect(page.locator('#current-coords')).toContainText('-25.8, -18.2');
        await expect(page.locator('#current-map')).toContainText('Factory');
    });
    
    test('should handle map switching correctly', async ({ page }) => {
        // 초기 맵 설정
        await page.evaluate(() => {
            window.tarkovMap.switchMap('Factory');
        });
        
        await expect(page.locator('#current-map')).toContainText('Factory');
        
        // 맵 전환
        await page.evaluate(() => {
            window.tarkovMap.switchMap('Customs');
        });
        
        await expect(page.locator('#current-map')).toContainText('Customs');
    });
    
    test('should respond to zoom controls', async ({ page }) => {
        const initialZoom = await page.evaluate(() => {
            return window.tarkovMap.map.getZoom();
        });
        
        // 확대 버튼 클릭
        await page.click('#zoom-in');
        
        const zoomAfterIn = await page.evaluate(() => {
            return window.tarkovMap.map.getZoom();
        });
        
        expect(zoomAfterIn).toBeGreaterThan(initialZoom);
        
        // 축소 버튼 클릭
        await page.click('#zoom-out');
        
        const zoomAfterOut = await page.evaluate(() => {
            return window.tarkov.map.getZoom();
        });
        
        expect(zoomAfterOut).toBeLessThan(zoomAfterIn);
    });
});
```

### 실제 게임 시뮬레이션 테스트
```javascript
// tests/e2e/game-simulation.spec.js
test.describe('Game Integration Simulation', () => {
    test('should handle rapid position updates', async ({ page }) => {
        await page.goto('http://localhost:8080/map');
        
        // 빠른 연속 위치 업데이트 시뮬레이션
        const positions = [
            { x: -25.8, y: -18.2, rotation: 0 },
            { x: -24.5, y: -17.8, rotation: 15 },
            { x: -23.2, y: -17.4, rotation: 30 },
            { x: -21.9, y: -17.0, rotation: 45 }
        ];
        
        for (const pos of positions) {
            await page.evaluate((data) => {
                window.tarkovMap.updatePlayerPosition({
                    mapId: 'Factory',
                    ...data,
                    z: 5.1
                });
            }, pos);
            
            await page.waitForTimeout(50); // 20 FPS 시뮬레이션
        }
        
        // 최종 위치 확인
        const finalCoords = await page.locator('#current-coords').textContent();
        expect(finalCoords).toContain('-21.9');
    });
    
    test('should handle map changes during gameplay', async ({ page }) => {
        await page.goto('http://localhost:8080/map');
        
        // Factory에서 시작
        await page.evaluate(() => {
            window.tarkovMap.switchMap('Factory');
            window.tarkovMap.updatePlayerPosition({
                mapId: 'Factory',
                x: -25.8, y: -18.2, z: 5.1, rotation: 0
            });
        });
        
        // Customs로 전환 (게임에서 맵 이동)
        await page.evaluate(() => {
            window.tarkovMap.switchMap('Customs');
            window.tarkovMap.updatePlayerPosition({
                mapId: 'Customs',
                x: 100.0, y: 200.0, z: 10.0, rotation: 90
            });
        });
        
        // UI 업데이트 확인
        await expect(page.locator('#current-map')).toContainText('Customs');
        await expect(page.locator('#current-coords')).toContainText('100, 200');
    });
});
```

---

## ⚡ 성능 테스트 (Performance Tests)

### 프론트엔드 성능 테스트
```javascript
// tests/performance/frontend-performance.spec.js
test.describe('Frontend Performance', () => {
    test('should maintain 60 FPS during position updates', async ({ page }) => {
        await page.goto('http://localhost:8080/map');
        
        // 성능 모니터링 시작
        await page.evaluate(() => {
            window.performanceMetrics = {
                frameCount: 0,
                startTime: performance.now(),
                frameTimes: []
            };
            
            function countFrame(timestamp) {
                if (window.performanceMetrics.lastFrameTime) {
                    const frameTime = timestamp - window.performanceMetrics.lastFrameTime;
                    window.performanceMetrics.frameTimes.push(frameTime);
                }
                window.performanceMetrics.lastFrameTime = timestamp;
                window.performanceMetrics.frameCount++;
                requestAnimationFrame(countFrame);
            }
            
            requestAnimationFrame(countFrame);
        });
        
        // 1초간 연속 위치 업데이트
        for (let i = 0; i < 60; i++) {
            await page.evaluate((frame) => {
                window.tarkovMap.updatePlayerPosition({
                    mapId: 'Factory',
                    x: -25.8 + (frame * 0.1),
                    y: -18.2 + (frame * 0.1),
                    z: 5.1,
                    rotation: frame * 6
                });
            }, i);
            
            await page.waitForTimeout(16); // ~60 FPS
        }
        
        // 성능 메트릭 확인
        const metrics = await page.evaluate(() => {
            const totalTime = performance.now() - window.performanceMetrics.startTime;
            const avgFrameTime = window.performanceMetrics.frameTimes
                .reduce((sum, time) => sum + time, 0) / window.performanceMetrics.frameTimes.length;
            
            return {
                totalTime,
                frameCount: window.performanceMetrics.frameCount,
                avgFrameTime,
                fps: 1000 / avgFrameTime
            };
        });
        
        expect(metrics.fps).toBeGreaterThan(50); // 최소 50 FPS 유지
        expect(metrics.avgFrameTime).toBeLessThan(20); // 프레임당 20ms 미만
    });
    
    test('should load map within performance budget', async ({ page }) => {
        const startTime = Date.now();
        
        await page.goto('http://localhost:8080/map');
        await page.waitForLoadState('networkidle');
        
        // 초기화 완료 대기
        await page.waitForFunction(() => {
            return window.tarkovMapApp && window.tarkovMapApp.isInitialized;
        });
        
        const loadTime = Date.now() - startTime;
        
        // 3초 이내 로딩 완료
        expect(loadTime).toBeLessThan(3000);
    });
});
```

### 메모리 사용량 테스트
```javascript
// tests/performance/memory-usage.spec.js
test('should not exceed memory limits', async ({ page }) => {
    await page.goto('http://localhost:8080/map');
    
    // 초기 메모리 사용량 측정
    const initialMemory = await page.evaluate(() => {
        return performance.memory ? {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
        } : null;
    });
    
    if (!initialMemory) {
        test.skip('Performance memory API not available');
        return;
    }
    
    // 대량의 위치 업데이트 실행 (메모리 리크 테스트)
    for (let i = 0; i < 1000; i++) {
        await page.evaluate((frame) => {
            window.tarkovMap.updatePlayerPosition({
                mapId: 'Factory',
                x: Math.random() * 100,
                y: Math.random() * 100,
                z: 5.1,
                rotation: Math.random() * 360
            });
        }, i);
        
        if (i % 100 === 0) {
            // 가비지 컬렉션 강제 실행
            await page.evaluate(() => {
                if (window.gc) window.gc();
            });
        }
    }
    
    // 최종 메모리 사용량 측정
    const finalMemory = await page.evaluate(() => {
        return {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize
        };
    });
    
    // 메모리 증가량 확인 (50MB 이내)
    const memoryIncrease = finalMemory.used - initialMemory.used;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
});
```

---

## 🔍 시각적 회귀 테스트 (Visual Regression Tests)

### 스크린샷 기반 테스트
```javascript
// tests/visual/visual-regression.spec.js
test.describe('Visual Regression Tests', () => {
    test('should match baseline map appearance', async ({ page }) => {
        await page.goto('http://localhost:8080/map');
        await page.waitForLoadState('networkidle');
        
        // 특정 맵 및 위치로 설정
        await page.evaluate(() => {
            window.tarkovMap.switchMap('Factory');
            window.tarkovMap.updatePlayerPosition({
                mapId: 'Factory',
                x: 0, y: 0, z: 5.1, rotation: 0
            });
        });
        
        await page.waitForTimeout(1000); // 렌더링 완료 대기
        
        // 스크린샷 비교
        await expect(page).toHaveScreenshot('factory-baseline.png');
    });
    
    test('should display player marker correctly', async ({ page }) => {
        await page.goto('http://localhost:8080/map');
        
        await page.evaluate(() => {
            window.tarkovMap.switchMap('Factory');
            window.tarkovMap.updatePlayerPosition({
                mapId: 'Factory',
                x: -25.8, y: -18.2, z: 5.1, rotation: 45
            });
        });
        
        // 플레이어 마커 영역만 스크린샷
        const markerElement = page.locator('.tarkov-player-marker').first();
        await expect(markerElement).toHaveScreenshot('player-marker.png');
    });
    
    test('should handle different themes correctly', async ({ page }) => {
        await page.goto('http://localhost:8080/map');
        
        // 다크 테마 스크린샷
        await expect(page).toHaveScreenshot('map-dark-theme.png');
        
        // 라이트 테마로 전환
        await page.evaluate(() => {
            window.tarkovMapApp.components.themeManager.applyTheme('light');
        });
        
        await page.waitForTimeout(500);
        await expect(page).toHaveScreenshot('map-light-theme.png');
    });
});
```

---

## 📱 모바일 및 반응형 테스트

### 다양한 화면 크기 테스트
```javascript
// tests/responsive/mobile-tests.spec.js
const devices = [
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 }
];

devices.forEach(device => {
    test(`should work correctly on ${device.name}`, async ({ page }) => {
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.goto('http://localhost:8080/map');
        
        // 기본 UI 요소들이 보이는지 확인
        await expect(page.locator('.map-container')).toBeVisible();
        await expect(page.locator('.control-panel')).toBeVisible();
        
        // 터치 인터페이스 테스트 (모바일)
        if (device.width < 768) {
            // 더블 탭으로 줌 테스트
            await page.locator('.leaflet-map').dblclick();
            
            // 길게 누르기 테스트
            await page.locator('.leaflet-map').click({ delay: 1000 });
        }
        
        // 줌 컨트롤 작동 확인
        await page.click('#zoom-in');
        await page.click('#zoom-out');
    });
});
```

---

## 🚀 부하 테스트 (Load Tests)

### 동시 다중 클라이언트 테스트
```csharp
// Tests/LoadTests/ConcurrentClientsTest.cs
[TestFixture]
public class ConcurrentClientsTest
{
    [Test]
    public async Task HandleMultipleClients_ConcurrentRequests_MaintainsPerformance()
    {
        const int clientCount = 10;
        const int updatesPerClient = 100;
        
        var clients = Enumerable.Range(0, clientCount)
            .Select(i => new TestMapClient($"Client_{i}"))
            .ToArray();
        
        var stopwatch = Stopwatch.StartNew();
        
        // 동시 클라이언트 위치 업데이트
        var tasks = clients.Select(async client =>
        {
            for (int i = 0; i < updatesPerClient; i++)
            {
                var position = new PlayerPosition
                {
                    X = Random.Shared.NextSingle() * 100,
                    Y = Random.Shared.NextSingle() * 100,
                    Z = 5.1f,
                    Rotation = Random.Shared.NextSingle() * 360
                };
                
                await client.UpdatePositionAsync(position);
                await Task.Delay(10); // 100 FPS 시뮬레이션
            }
        });
        
        await Task.WhenAll(tasks);
        
        stopwatch.Stop();
        
        // 성능 검증
        var totalUpdates = clientCount * updatesPerClient;
        var updatesPerSecond = totalUpdates / stopwatch.Elapsed.TotalSeconds;
        
        Assert.Greater(updatesPerSecond, 500); // 최소 500 updates/sec
        
        // 메모리 사용량 확인
        GC.Collect();
        GC.WaitForPendingFinalizers();
        var memoryUsed = GC.GetTotalMemory(false);
        
        Assert.Less(memoryUsed, 100 * 1024 * 1024); // 100MB 미만
    }
}
```

---

## 🛠️ 테스트 도구 설정

### Jest 설정
```javascript
// jest.config.js
module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    collectCoverageFrom: [
        'src/**/*.{js,jsx}',
        '!src/**/*.test.{js,jsx}',
        '!src/index.js'
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    }
};
```

### Playwright 설정
```javascript
// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30000,
    expect: {
        timeout: 5000
    },
    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:8080',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure'
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] }
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] }
        },
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] }
        },
        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] }
        }
    ],
    webServer: {
        command: 'npm run serve',
        url: 'http://localhost:8080',
        reuseExistingServer: !process.env.CI
    }
});
```

### C# 테스트 설정
```xml
<!-- Tests/Tests.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.8.0" />
    <PackageReference Include="NUnit" Version="3.14.0" />
    <PackageReference Include="NUnit3TestAdapter" Version="4.5.0" />
    <PackageReference Include="NUnit.Analyzers" Version="3.9.0" />
    <PackageReference Include="coverlet.collector" Version="6.0.0" />
    <PackageReference Include="Moq" Version="4.20.69" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\TarkovClient\TarkovClient.csproj" />
  </ItemGroup>
</Project>
```

---

## 📊 CI/CD 통합

### GitHub Actions 워크플로우
```yaml
# .github/workflows/tests.yml
name: Tests

on:
  push:
    branches: [ master, develop ]
  pull_request:
    branches: [ master ]

jobs:
  unit-tests:
    runs-on: windows-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v3
      with:
        dotnet-version: 8.0.x
        
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: |
        dotnet restore
        npm install
        
    - name: Run C# unit tests
      run: dotnet test --configuration Release --logger trx --collect:"XPlat Code Coverage"
      
    - name: Run JavaScript unit tests
      run: npm run test:unit
      
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: windows-latest
    needs: unit-tests
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Install Playwright browsers
      run: npx playwright install --with-deps
      
    - name: Run E2E tests
      run: npm run test:e2e
      
    - name: Upload Playwright report
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        
  performance-tests:
    runs-on: windows-latest
    needs: unit-tests
    steps:
    - uses: actions/checkout@v4
    
    - name: Run performance tests
      run: npm run test:performance
      
    - name: Generate performance report
      run: npm run report:performance
```

---

## 🎯 테스트 성공 기준

### 커버리지 목표
- **JavaScript**: 최소 80% 라인 커버리지
- **C#**: 최소 85% 라인 커버리지
- **통합 테스트**: 주요 시나리오 100% 커버

### 성능 기준
- **로딩 시간**: 3초 이내
- **위치 업데이트**: 16ms 이내 (60 FPS)
- **메모리 사용량**: 100MB 이내
- **WebView2 통신**: 1ms 이내

### 안정성 기준
- **단위 테스트 통과율**: 100%
- **E2E 테스트 통과율**: 95% 이상
- **크로스 브라우저 호환성**: Chrome, Firefox, Edge 지원

---

*최종 업데이트: 2025-08-27*  
*다음 문서: troubleshooting.md*