# TarkovClient 좌표 변환 시스템 (Coordinate Transformation System)

## 📍 좌표계 개요

### 좌표계 구조
TarkovClient의 위치 공유 시스템은 두 가지 주요 좌표계를 다룹니다:

1. **게임 좌표계 (Game Coordinate System)**
   - 3D 공간: X, Y, Z 좌표 + 회전값 (Quaternion)
   - 단위: Unity 좌표계 기준 (미터)
   - 회전: Quaternion (x, y, z, w) → Yaw 각도로 변환

2. **지도 좌표계 (Map Coordinate System)**
   - 2D 평면: Leaflet.js CRS (Coordinate Reference System)
   - 단위: 픽셀 기준
   - 줌 레벨에 따른 스케일링 적용

---

## 🔄 좌표 변환 프로세스

### 1단계: 스크린샷 파일명 파싱
**Input**: `2024-08-27[15-30]_FactoryDay_-25.8_-18.2_5.1_0.0_-0.7_0.0_0.7 (1).png`

```csharp
// TarkovMonitor 기반 파싱 로직
public class PositionParser
{
    private static readonly Regex PositionPattern = new Regex(
        @"(?<map>\w+)_(?<x>-?\d+\.?\d*)_(?<y>-?\d+\.?\d*)_(?<z>-?\d+\.?\d*)_(?<qx>-?\d+\.?\d*)_(?<qy>-?\d+\.?\d*)_(?<qz>-?\d+\.?\d*)_(?<qw>-?\d+\.?\d*)"
    );

    public static Position ParseFromFilename(string filename)
    {
        var match = PositionPattern.Match(filename);
        if (!match.Success) return null;

        return new Position
        {
            X = float.Parse(match.Groups["x"].Value),
            Y = float.Parse(match.Groups["y"].Value), 
            Z = float.Parse(match.Groups["z"].Value),
            QuaternionX = float.Parse(match.Groups["qx"].Value),
            QuaternionY = float.Parse(match.Groups["qy"].Value),
            QuaternionZ = float.Parse(match.Groups["qz"].Value),
            QuaternionW = float.Parse(match.Groups["qw"].Value),
            MapName = match.Groups["map"].Value
        };
    }
}
```

### 2단계: 쿼터니언 → Yaw 각도 변환
**목적**: 플레이어가 바라보는 방향을 0-360도 각도로 변환

```csharp
public static class QuaternionConverter
{
    /// <summary>
    /// TarkovMonitor의 쿼터니언 변환 로직 포팅
    /// </summary>
    public static float QuaternionToYaw(float x, float y, float z, float w)
    {
        // Yaw 계산: atan2(2*(w*y + z*x), 1 - 2*(y*y + z*z))
        float siny_cosp = 2 * (w * y + z * x);
        float cosy_cosp = 1 - 2 * (y * y + z * z);
        float yaw = (float)Math.Atan2(siny_cosp, cosy_cosp);
        
        // 라디안을 도(degree)로 변환
        float yawDegrees = yaw * (180.0f / (float)Math.PI);
        
        // 0-360 범위로 정규화
        if (yawDegrees < 0)
            yawDegrees += 360.0f;
            
        return yawDegrees;
    }
}
```

### 3단계: 게임 좌표 → 지도 좌표 변환
**목적**: Unity 3D 좌표를 Leaflet.js 2D 지도 좌표로 변환

```javascript
// tarkov-dev 기반 좌표 변환 시스템
class CoordinateTransformer {
    constructor(mapConfig) {
        this.mapConfig = mapConfig;
        this.calculateTransformation();
    }

    calculateTransformation() {
        // 맵별 고유 변환 매개변수
        const bounds = this.mapConfig.bounds;
        const imageSize = this.mapConfig.imageSize;
        
        // 스케일 계산
        this.scaleX = imageSize.width / (bounds.max.x - bounds.min.x);
        this.scaleY = imageSize.height / (bounds.max.y - bounds.min.y);
        
        // 오프셋 계산  
        this.offsetX = -bounds.min.x * this.scaleX;
        this.offsetY = bounds.max.y * this.scaleY;
        
        // Leaflet.js 변환 객체 생성
        this.transformation = new L.Transformation(
            this.scaleX, this.offsetX,
            -this.scaleY, this.offsetY  // Y축 반전
        );
    }

    gameToMap(gameX, gameZ) {
        // Unity Y축은 지도에서 Z축으로 매핑
        return this.transformation.transform({
            x: gameX,
            y: gameZ  // Unity Y는 높이, Z가 실제 2D 좌표
        });
    }
}
```

---

## 🗺️ 맵별 좌표 설정

### 좌표 변환 매개변수
각 맵마다 고유한 변환 매개변수가 필요합니다:

```json
{
  "maps": {
    "Factory": {
      "bounds": {
        "min": { "x": -150, "y": -100 },
        "max": { "x": 150, "y": 100 }
      },
      "imageSize": { "width": 1024, "height": 1024 },
      "zoomLevels": { "min": 1, "max": 4 }
    },
    "Customs": {
      "bounds": {
        "min": { "x": -500, "y": -400 },
        "max": { "x": 500, "y": 400 }
      },
      "imageSize": { "width": 2048, "height": 1536 },
      "zoomLevels": { "min": 1, "max": 5 }
    }
  }
}
```

### 맵별 보정 계수
일부 맵은 특별한 보정이 필요할 수 있습니다:

```csharp
public static class MapCalibration
{
    private static readonly Dictionary<string, Vector2> MapOffsets = 
        new Dictionary<string, Vector2>
        {
            { "Factory", new Vector2(0, 0) },           // 기준점
            { "Customs", new Vector2(10.5f, -8.2f) },   // 미세 조정
            { "Interchange", new Vector2(-5.0f, 12.1f) },
            { "Woods", new Vector2(15.7f, -20.3f) },
            { "Shoreline", new Vector2(-8.9f, 5.4f) },
            { "Reserve", new Vector2(3.2f, -15.8f) },
            { "Labs", new Vector2(0, 0) }               // 특별 처리
        };

    public static Vector2 ApplyMapOffset(string mapName, float x, float z)
    {
        if (MapOffsets.TryGetValue(mapName, out Vector2 offset))
        {
            return new Vector2(x + offset.X, z + offset.Y);
        }
        return new Vector2(x, z);
    }
}
```

---

## ⚡ 실시간 좌표 변환 구현

### C# 백엔드 변환기
```csharp
public class RealtimeCoordinateProcessor
{
    private readonly MapConfigurationManager _mapConfig;
    
    public RealtimeCoordinateProcessor(MapConfigurationManager mapConfig)
    {
        _mapConfig = mapConfig;
    }

    public MapPosition ProcessGamePosition(Position gamePos)
    {
        // 1. 회전값 변환
        float yaw = QuaternionConverter.QuaternionToYaw(
            gamePos.QuaternionX, 
            gamePos.QuaternionY,
            gamePos.QuaternionZ, 
            gamePos.QuaternionW
        );

        // 2. 맵별 오프셋 적용
        var corrected = MapCalibration.ApplyMapOffset(
            gamePos.MapName, 
            gamePos.X, 
            gamePos.Z
        );

        // 3. 지도 좌표로 변환
        var mapConfig = _mapConfig.GetMapConfig(gamePos.MapName);
        var mapCoords = ConvertToMapCoordinates(corrected, mapConfig);

        return new MapPosition
        {
            X = mapCoords.X,
            Y = mapCoords.Y,
            Rotation = yaw,
            MapName = gamePos.MapName,
            Timestamp = DateTime.UtcNow
        };
    }
}
```

### JavaScript 프론트엔드 렌더러
```javascript
class RealtimePositionRenderer {
    constructor(leafletMap) {
        this.map = leafletMap;
        this.playerMarker = null;
        this.transformer = null;
    }

    updatePlayerPosition(positionData) {
        // WebSocket에서 받은 좌표 데이터
        const { x, y, rotation, mapName } = positionData;
        
        // 현재 맵과 다르면 맵 변경
        if (this.currentMap !== mapName) {
            this.switchMap(mapName);
        }

        // 플레이어 마커 업데이트
        this.updatePlayerMarker(x, y, rotation);
    }

    updatePlayerMarker(x, y, rotation) {
        const position = L.latLng(y, x);  // Leaflet은 [lat, lng] 순서
        
        if (this.playerMarker) {
            // 기존 마커 위치 업데이트
            this.playerMarker.setLatLng(position);
            this.playerMarker.setRotationAngle(rotation);
        } else {
            // 새 마커 생성
            this.playerMarker = L.marker(position, {
                icon: this.createPlayerIcon(),
                rotationAngle: rotation
            }).addTo(this.map);
        }

        // 부드러운 이동 애니메이션
        this.animateMarkerMovement(position);
    }
}
```

---

## 📏 정확도 및 검증

### 좌표 정확도 검증
```csharp
public class CoordinateAccuracyValidator
{
    public ValidationResult ValidateCoordinates(Position gamePos, MapPosition mapPos)
    {
        var result = new ValidationResult();
        
        // 1. 범위 검증
        var mapBounds = GetMapBounds(gamePos.MapName);
        result.IsWithinBounds = IsWithinBounds(mapPos, mapBounds);
        
        // 2. 변환 정확도 검증
        var reversedPos = ConvertMapToGame(mapPos);
        result.TransformationError = CalculateError(gamePos, reversedPos);
        
        // 3. 회전값 검증
        result.RotationAccuracy = ValidateRotation(gamePos, mapPos);
        
        return result;
    }
}
```

### 테스트 케이스
```csharp
[Test]
public void TestCoordinateTransformation_Factory()
{
    // 테스트 데이터
    var gamePos = new Position 
    { 
        X = -25.8f, Y = 5.1f, Z = -18.2f,
        QuaternionX = 0.0f, QuaternionY = -0.7f,
        QuaternionZ = 0.0f, QuaternionW = 0.7f,
        MapName = "Factory"
    };
    
    // 변환 실행
    var processor = new RealtimeCoordinateProcessor(_mapConfig);
    var mapPos = processor.ProcessGamePosition(gamePos);
    
    // 검증
    Assert.That(mapPos.X, Is.InRange(200, 800));  // 예상 범위
    Assert.That(mapPos.Y, Is.InRange(300, 700));
    Assert.That(mapPos.Rotation, Is.InRange(0, 360));
}
```

---

## 🎯 성능 최적화

### 캐싱 전략
```csharp
public class CoordinateCache
{
    private readonly Dictionary<string, MapConfiguration> _mapConfigs 
        = new Dictionary<string, MapConfiguration>();
    
    private readonly ConcurrentDictionary<(string, float, float), MapPosition> _transformCache
        = new ConcurrentDictionary<(string, float, float), MapPosition>();

    public MapPosition GetCachedTransformation(string mapName, float x, float z)
    {
        var key = (mapName, x, z);
        
        // 캐시에서 찾기 (100m 반경 내에서 재사용)
        return _transformCache.GetOrAdd(key, _ => 
            ComputeTransformation(mapName, x, z));
    }
}
```

### 배치 처리
```csharp
public class BatchCoordinateProcessor
{
    public async Task<List<MapPosition>> ProcessBatchAsync(List<Position> positions)
    {
        // 맵별로 그룹화
        var groupedByMap = positions.GroupBy(p => p.MapName);
        
        // 병렬 처리
        var tasks = groupedByMap.Select(async group => 
        {
            var mapConfig = await GetMapConfigAsync(group.Key);
            return group.Select(pos => ProcessPosition(pos, mapConfig));
        });
        
        var results = await Task.WhenAll(tasks);
        return results.SelectMany(r => r).ToList();
    }
}
```

---

## 📊 성능 메트릭스

### 목표 성능
- **변환 시간**: <5ms per position
- **메모리 사용량**: <50MB for coordinate cache
- **정확도**: ±2 pixel error at max zoom
- **업데이트 빈도**: 10-30 FPS smooth animation

### 모니터링
```csharp
public class CoordinatePerformanceMonitor
{
    private readonly IMetrics _metrics;
    
    public void RecordTransformation(TimeSpan duration, float accuracy)
    {
        _metrics.Timer("coordinate.transformation.duration").Record(duration);
        _metrics.Gauge("coordinate.transformation.accuracy").Set(accuracy);
    }
}
```

---

## 🔧 설정 및 보정

### 맵 설정 파일
```json
{
  "coordinateSystem": {
    "version": "1.0",
    "defaultPrecision": 2,
    "cacheSize": 1000,
    "maps": {
      "Factory": {
        "displayName": "공장",
        "bounds": { "min": {"x": -150, "y": -100}, "max": {"x": 150, "y": 100} },
        "imageSize": { "width": 1024, "height": 1024 },
        "calibrationPoints": [
          { "game": {"x": 0, "z": 0}, "map": {"x": 512, "y": 512} },
          { "game": {"x": 100, "z": 50}, "map": {"x": 712, "y": 412} }
        ]
      }
    }
  }
}
```

### 자동 보정 시스템
```csharp
public class AutoCalibrationSystem
{
    public async Task CalibrateMapAsync(string mapName)
    {
        // 1. 알려진 기준점들 수집
        var referencePoints = await CollectReferencePointsAsync(mapName);
        
        // 2. 최적의 변환 매개변수 계산
        var optimizedParams = OptimizeTransformationParameters(referencePoints);
        
        // 3. 검증 및 적용
        if (ValidateCalibration(optimizedParams))
        {
            await ApplyCalibrationAsync(mapName, optimizedParams);
        }
    }
}
```

---

## 🚨 오류 처리

### 좌표 변환 오류 처리
```csharp
public enum CoordinateError
{
    InvalidInput,
    OutOfBounds,
    TransformationFailed,
    MapNotFound,
    CalibrationRequired
}

public class CoordinateException : Exception
{
    public CoordinateError ErrorType { get; }
    public Position? OriginalPosition { get; }
    
    public CoordinateException(CoordinateError errorType, string message) 
        : base(message)
    {
        ErrorType = errorType;
    }
}
```

### 복구 전략
```csharp
public class CoordinateErrorHandler
{
    public MapPosition HandleTransformationError(Position gamePos, Exception ex)
    {
        return ex switch
        {
            CoordinateException coordEx when coordEx.ErrorType == CoordinateError.OutOfBounds
                => ClampToMapBounds(gamePos),
            CoordinateException coordEx when coordEx.ErrorType == CoordinateError.CalibrationRequired
                => UseFallbackTransformation(gamePos),
            _ => UseLastKnownPosition(gamePos.MapName)
        };
    }
}
```

---

*최종 업데이트: 2025-08-27*  
*다음 문서: api-specifications.md*