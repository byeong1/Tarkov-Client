# 좌표 변환 시스템 기술 명세서

## 📐 개요

Escape from Tarkov의 게임 내 3D 좌표를 2D 맵 상의 픽셀 좌표로 변환하는 시스템에 대한 기술 명세서입니다.

## 🔧 좌표계 시스템

### 1. 게임 좌표계 (Game Coordinates)
- **형식**: `{x, y, z}` (3차원)
- **단위**: 게임 내 미터 단위
- **용도**: 플레이어 위치, 아이템 위치, 추출구 위치 등

### 2. 맵 좌표계 (Map Coordinates) 
- **형식**: `[lat, lng]` (위도, 경도)
- **단위**: Leaflet.js 표준 좌표
- **용도**: 웹 맵 상의 위치 표시

### 3. 픽셀 좌표계 (Pixel Coordinates)
- **형식**: `[x, y]` (2차원)
- **단위**: 픽셀
- **용도**: 실제 화면 상의 위치

## 🎯 Factory 맵 변환 매개변수

### Transform Matrix
```json
"transform": [1.629, 119.9, 1.629, 139.3]
```

- `transform[0]` = **scaleX**: 1.629 (X축 스케일)
- `transform[1]` = **marginX**: 119.9 (X축 오프셋)
- `transform[2]` = **scaleY**: 1.629 (Y축 스케일) 
- `transform[3]` = **marginY**: 139.3 (Y축 오프셋)

### 기타 매개변수
```json
{
    "coordinateRotation": 90,          // 90도 회전
    "bounds": [[79, -64.5], [-66.5, 67.4]],  // 맵 경계
    "heightRange": [-1, 3]             // 높이 범위
}
```

## ⚡ 변환 알고리즘

### 1단계: 3D → 2D 변환
게임의 3D 좌표에서 Y축(높이)을 제외하고 X, Z 좌표만 사용:
```javascript
function pos(position) {
    return [position.z, position.x];  // [lat, lng] 형태로 반환
}
```

### 2단계: 회전 변환 (90도)
좌표계 회전을 통해 게임 좌표계와 맵 좌표계 정렬:
```javascript
function applyRotation(latLng, rotation) {
    if (!rotation) return latLng;
    
    // 도 → 라디안 변환
    const angleInRadians = (rotation * Math.PI) / 180;
    const cosAngle = Math.cos(angleInRadians);
    const sinAngle = Math.sin(angleInRadians);
    
    // 회전 행렬 적용
    const {lng: x, lat: y} = latLng;
    const rotatedX = x * cosAngle - y * sinAngle;
    const rotatedY = x * sinAngle + y * cosAngle;
    
    return L.latLng(rotatedY, rotatedX);
}
```

### 3단계: 스케일링 및 오프셋 적용
Transform Matrix를 사용하여 최종 맵 좌표 계산:
```javascript
function getCRS(mapData) {
    const scaleX = mapData.transform[0];        // 1.629
    const scaleY = mapData.transform[2] * -1;   // 1.629 * -1 (Y축 반전)
    const marginX = mapData.transform[1];       // 119.9
    const marginY = mapData.transform[3];       // 139.3
    
    return L.extend({}, L.CRS.Simple, {
        transformation: new L.Transformation(scaleX, marginX, scaleY, marginY),
        projection: L.extend({}, L.Projection.LonLat, {
            project: latLng => {
                return L.Projection.LonLat.project(
                    applyRotation(latLng, mapData.coordinateRotation)
                );
            },
            unproject: point => {
                return applyRotation(
                    L.Projection.LonLat.unproject(point), 
                    mapData.coordinateRotation * -1
                );
            }
        })
    });
}
```

## 🧮 완전한 변환 함수

### 게임 좌표 → 맵 좌표 변환
```javascript
class CoordinateTransformer {
    constructor(mapConfig) {
        this.transform = mapConfig.transform;
        this.rotation = mapConfig.coordinateRotation || 0;
        this.bounds = mapConfig.bounds;
    }
    
    /**
     * 게임 좌표를 맵 좌표로 변환
     * @param {Object} gamePos - {x, y, z} 게임 좌표
     * @returns {Array} [lat, lng] 맵 좌표
     */
    gameToMapCoordinates(gamePos) {
        // 1. 3D → 2D 변환 (Y축 제외)
        let lat = gamePos.z;
        let lng = gamePos.x;
        
        // 2. 회전 적용
        if (this.rotation) {
            const rad = (this.rotation * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            
            const newLat = lat * cos - lng * sin;
            const newLng = lat * sin + lng * cos;
            
            lat = newLat;
            lng = newLng;
        }
        
        // 3. Transform 행렬 적용
        const mapLat = lat * this.transform[2] + this.transform[3];
        const mapLng = lng * this.transform[0] + this.transform[1];
        
        return [mapLat, mapLng];
    }
    
    /**
     * 맵 좌표를 게임 좌표로 역변환
     * @param {Array} mapPos - [lat, lng] 맵 좌표
     * @returns {Object} {x, z} 게임 좌표 (Y축 제외)
     */
    mapToGameCoordinates(mapPos) {
        const [mapLat, mapLng] = mapPos;
        
        // 1. Transform 행렬 역변환
        let lat = (mapLat - this.transform[3]) / this.transform[2];
        let lng = (mapLng - this.transform[1]) / this.transform[0];
        
        // 2. 회전 역변환
        if (this.rotation) {
            const rad = (-this.rotation * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            
            const newLat = lat * cos - lng * sin;
            const newLng = lat * sin + lng * cos;
            
            lat = newLat;
            lng = newLng;
        }
        
        // 3. 2D → 3D 변환 (Y=0으로 가정)
        return {
            x: lng,
            y: 0,
            z: lat
        };
    }
    
    /**
     * 좌표가 맵 경계 내에 있는지 확인
     * @param {Object} gamePos - {x, y, z} 게임 좌표
     * @returns {boolean}
     */
    isWithinBounds(gamePos) {
        const [lat, lng] = this.gameToMapCoordinates(gamePos);
        const [[maxLat, minLng], [minLat, maxLng]] = this.bounds;
        
        return lat >= minLat && lat <= maxLat && 
               lng >= minLng && lng <= maxLng;
    }
}
```

## 📋 사용 예제

### 기본 사용법
```javascript
// Factory 맵 설정
const factoryConfig = {
    transform: [1.629, 119.9, 1.629, 139.3],
    coordinateRotation: 90,
    bounds: [[79, -64.5], [-66.5, 67.4]]
};

// 변환기 초기화
const transformer = new CoordinateTransformer(factoryConfig);

// 게임 좌표 예제 (Factory 사무실 건물 근처)
const gamePosition = { x: 21, y: 2, z: 39 };

// 맵 좌표로 변환
const mapPosition = transformer.gameToMapCoordinates(gamePosition);
console.log('Map Position:', mapPosition);  // [lat, lng]

// 경계 내 확인
const isValid = transformer.isWithinBounds(gamePosition);
console.log('Within bounds:', isValid);

// 역변환
const backToGame = transformer.mapToGameCoordinates(mapPosition);
console.log('Back to game:', backToGame);  // {x, y, z}
```

### Leaflet.js 통합
```javascript
// Leaflet 맵에 마커 추가
const addPlayerMarker = (map, gamePosition) => {
    const mapCoords = transformer.gameToMapCoordinates(gamePosition);
    
    const marker = L.marker(mapCoords, {
        icon: L.divIcon({
            className: 'player-marker',
            html: '<div class="player-icon"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        })
    }).addTo(map);
    
    return marker;
};
```

## 🔍 변환 정확도 검증

### 테스트 포인트들
```javascript
const testPoints = [
    // Factory 주요 위치들 (예상값)
    { 
        name: "사무실 건물", 
        game: {x: 21, y: 2, z: 39},
        expected: "맵 중앙 상단"
    },
    { 
        name: "지하 터널", 
        game: {x: 0, y: -2, z: 0},
        expected: "맵 중앙 하단"
    },
    { 
        name: "북쪽 계단", 
        game: {x: 35, y: 1, z: 39},
        expected: "맵 우측 상단"
    }
];

// 정확도 테스트
testPoints.forEach(point => {
    const mapCoords = transformer.gameToMapCoordinates(point.game);
    const backToGame = transformer.mapToGameCoordinates(mapCoords);
    
    console.log(`${point.name}:`);
    console.log(`  Original: ${JSON.stringify(point.game)}`);
    console.log(`  Map: ${mapCoords}`);
    console.log(`  Back: ${JSON.stringify(backToGame)}`);
    console.log(`  Error: ${Math.abs(point.game.x - backToGame.x) + Math.abs(point.game.z - backToGame.z)}`);
});
```

## ⚠️ 주의사항 및 제한사항

### 1. Y축 (높이) 처리
- 현재 구현은 Y축을 무시하고 2D 평면으로 투영
- 층별 표시가 필요한 경우 별도 레이어 시스템 필요

### 2. 정확도 한계
- Transform Matrix는 선형 변환만 지원
- 맵 가장자리에서 약간의 오차 발생 가능

### 3. 성능 고려사항
- 대량의 좌표 변환 시 배치 처리 권장
- 자주 사용되는 좌표는 캐싱 고려

### 4. 다른 맵 적용
- 각 맵마다 고유한 Transform Matrix 필요
- 맵별로 별도의 CoordinateTransformer 인스턴스 생성 필요

## 🔗 참고 자료

- **Leaflet.js CRS 문서**: https://leafletjs.com/reference.html#crs
- **Tarkov-Dev Maps 데이터**: `C:\Users\qoqud\code\tarkov-dev\src\data\maps.json`
- **변환 알고리즘 원본**: `C:\Users\qoqud\code\tarkov-dev\src\pages\map\index.js`

---

*작성일: 2025-08-27*  
*작성자: Claude Code SuperClaude*  
*버전: 1.0*