# Tarkov-Dev API 연동 분석 및 계획

## 📊 개요

TarkovClient의 맵 시스템을 하드코딩된 더미 데이터에서 실제 tarkov-dev 프로젝트의 API 데이터로 연동하기 위한 분석 및 구현 계획서입니다.

## 🔍 Tarkov-Dev 프로젝트 분석 결과

### 1. 프로젝트 구조
- **위치**: `C:\Users\qoqud\code\tarkov-dev`
- **타입**: React 기반 웹 애플리케이션
- **API**: GraphQL 엔드포인트 (`https://api.tarkov.dev/graphql`)
- **맵 데이터**: 정적 JSON 파일과 GraphQL API 조합

### 2. GraphQL API 구조

#### 엔드포인트
```
Production: https://api.tarkov.dev/graphql
Dev: https://dev-api.tarkov.dev/graphql
Local: http://127.0.0.1:8787/graphql
```

#### Maps 쿼리 스키마 (do-fetch-maps.mjs)
```graphql
query TarkovDevMaps {
    maps(lang: "en", gameMode: "regular") {
        id
        tarkovDataId
        name
        normalizedName
        wiki
        description
        enemies
        raidDuration
        players
        bosses {
            name
            normalizedName
            spawnChance
            spawnLocations {
                spawnKey
                name
                chance
            }
        }
        spawns {
            zoneName
            position { x y z }
            sides
            categories
        }
        extracts {
            id
            name
            faction
            position { x y z }
            outline { x y z }
            top
            bottom
            switches { id name }
        }
        # ... 기타 필드들
    }
}
```

### 3. 좌표 변환 시스템 핵심 로직

#### Factory 맵 설정 (maps.json)
```json
{
    "normalizedName": "factory",
    "transform": [1.629, 119.9, 1.629, 139.3],
    "coordinateRotation": 90,
    "bounds": [[79, -64.5], [-66.5, 67.4]],
    "heightRange": [-1, 3],
    "tilePath": "https://assets.tarkov.dev/maps/factory/main/{z}/{x}/{y}.png"
}
```

#### 좌표 변환 함수 (Map/index.js)
```javascript
// CRS (좌표 참조 시스템) 생성
function getCRS(mapData) {
    let scaleX = 1, scaleY = 1, marginX = 0, marginY = 0;
    
    if (mapData?.transform) {
        scaleX = mapData.transform[0];        // 1.629
        scaleY = mapData.transform[2] * -1;   // 1.629 * -1
        marginX = mapData.transform[1];       // 119.9
        marginY = mapData.transform[3];       // 139.3
    }
    
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

// 90도 회전 적용
function applyRotation(latLng, rotation) {
    if (!rotation) return latLng;
    
    const angleInRadians = (rotation * Math.PI) / 180;
    const cosAngle = Math.cos(angleInRadians);
    const sinAngle = Math.sin(angleInRadians);
    
    const {lng: x, lat: y} = latLng;
    const rotatedX = x * cosAngle - y * sinAngle;
    const rotatedY = x * sinAngle + y * cosAngle;
    
    return L.latLng(rotatedY, rotatedX);
}

// 3D → 2D 좌표 변환 (Y축 제외)
function pos(position) {
    return [position.z, position.x];
}
```

## 🎯 TarkovClient 연동 계획

### Phase 1: 기본 데이터 교체
**목표**: 하드코딩된 Factory 데이터를 실제 tarkov-dev 데이터로 교체

#### 1.1 좌표 변환 함수 구현
```javascript
// src/Webs/components/Map/Map.js에 추가
class TarkovMapSystem {
    constructor(mapConfig) {
        this.config = mapConfig;
        this.transform = mapConfig.transform;
        this.rotation = mapConfig.coordinateRotation;
        this.bounds = mapConfig.bounds;
    }
    
    // 게임 좌표 → 맵 좌표 변환
    gameToMapCoordinates(gamePos) {
        let lat = gamePos.z;
        let lng = gamePos.x;
        
        // 1. 회전 적용 (90도)
        if (this.rotation) {
            const rad = (this.rotation * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const newLat = lat * cos - lng * sin;
            const newLng = lat * sin + lng * cos;
            lat = newLat;
            lng = newLng;
        }
        
        // 2. Transform 행렬 적용
        const mapLat = lat * this.transform[2] + this.transform[3];
        const mapLng = lng * this.transform[0] + this.transform[1];
        
        return [mapLat, mapLng];
    }
    
    // Leaflet CRS 생성
    createCRS() {
        const scaleX = this.transform[0];
        const scaleY = this.transform[2] * -1;
        const marginX = this.transform[1];
        const marginY = this.transform[3];
        
        return L.extend({}, L.CRS.Simple, {
            transformation: new L.Transformation(scaleX, marginX, scaleY, marginY)
        });
    }
}
```

#### 1.2 정적 맵 설정 교체
```javascript
// 현재 하드코딩된 Factory 설정 교체
const FACTORY_CONFIG = {
    normalizedName: "factory",
    transform: [1.629, 119.9, 1.629, 139.3],
    coordinateRotation: 90,
    bounds: [[79, -64.5], [-66.5, 67.4]],
    heightRange: [-1, 3],
    tilePath: "https://assets.tarkov.dev/maps/factory/main/{z}/{x}/{y}.png",
    tileSize: 256,
    minZoom: 1,
    maxZoom: 6
};
```

### Phase 2: API 통합
**목표**: GraphQL API에서 실시간 데이터 로딩

#### 2.1 GraphQL 클라이언트 구현
```javascript
class TarkovDevAPI {
    constructor(apiUrl = 'https://api.tarkov.dev/graphql') {
        this.apiUrl = apiUrl;
    }
    
    async fetchMapData(mapName = 'factory') {
        const query = `
            query GetMapData {
                maps(lang: "en", gameMode: "regular") {
                    id
                    name
                    normalizedName
                    description
                    raidDuration
                    players
                    spawns {
                        position { x y z }
                        sides
                        categories
                    }
                    extracts {
                        id
                        name
                        faction
                        position { x y z }
                    }
                    bosses {
                        name
                        spawnChance
                        spawnLocations {
                            spawnKey
                            chance
                        }
                    }
                }
            }
        `;
        
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        
        const data = await response.json();
        return data.data.maps.find(m => m.normalizedName === mapName);
    }
}
```

#### 2.2 동적 타일 레이어 구현
```javascript
// 실시간 타일 로딩
const setupMapLayers = (mapConfig) => {
    const tileLayer = L.tileLayer(mapConfig.tilePath, {
        tileSize: mapConfig.tileSize || 256,
        minZoom: mapConfig.minZoom || 1,
        maxZoom: mapConfig.maxZoom || 6,
        bounds: L.latLngBounds(mapConfig.bounds[0], mapConfig.bounds[1])
    });
    
    return tileLayer;
};
```

### Phase 3: 고급 기능 통합
**목표**: 완전한 tarkov-dev 기능 세트 지원

#### 3.1 다중 맵 지원
- 맵별 동적 설정 로딩
- 맵 전환 UI 구현
- 맵별 좌표계 자동 설정

#### 3.2 층별 레이어 시스템
```javascript
const FACTORY_LAYERS = {
    main: "https://assets.tarkov.dev/maps/factory/main/{z}/{x}/{y}.png",
    "2nd_floor": "https://assets.tarkov.dev/maps/factory/2nd/{z}/{x}/{y}.png",
    "3rd_floor": "https://assets.tarkov.dev/maps/factory/3rd/{z}/{x}/{y}.png",
    tunnels: "https://assets.tarkov.dev/maps/factory/tunnels/{z}/{x}/{y}.png"
};
```

#### 3.3 실시간 마커 시스템
- 추출구 위치 표시
- 스폰 포인트 표시
- 보스 스폰 위치 표시
- 퀘스트 목표 위치 표시

## 🔧 구현 단계별 체크리스트

### ✅ Phase 1 (기본 데이터 교체)
- [ ] TarkovMapSystem 클래스 구현
- [ ] FACTORY_CONFIG 정적 설정 추가
- [ ] 좌표 변환 함수 테스트
- [ ] 기존 하드코딩 데이터 제거
- [ ] 실제 tarkov-dev 타일 이미지 연동

### ⏳ Phase 2 (API 통합)
- [ ] TarkovDevAPI 클래스 구현
- [ ] GraphQL 쿼리 최적화
- [ ] 에러 핸들링 및 폴백 시스템
- [ ] 캐싱 시스템 구현
- [ ] 네트워크 상태 표시

### ⏳ Phase 3 (고급 기능)
- [ ] 다중 맵 지원 시스템
- [ ] 층별 레이어 전환 UI
- [ ] 실시간 마커 시스템
- [ ] 퀘스트 진행 상황 연동
- [ ] 성능 최적화

## 📁 영향받는 파일들

### 수정 필요 파일
- `src/Webs/components/Map/Map.js` - 메인 맵 컴포넌트
- `src/Webs/components/Map/Map.css` - 스타일 조정
- `src/Controllers/MapViewController.cs` - C# 백엔드 연동

### 추가할 파일
- `src/Webs/components/Map/TarkovMapSystem.js` - 좌표 변환 시스템
- `src/Webs/components/Map/TarkovDevAPI.js` - API 클라이언트
- `src/Webs/components/Map/MapLayers.js` - 레이어 관리 시스템

## 🎯 즉시 개선 가능한 부분

1. **정확한 좌표계** - 실제 게임과 일치하는 좌표 변환
2. **고품질 맵 이미지** - 공식 tarkov-dev 타일 사용
3. **정확한 맵 경계** - 실제 맵 범위 설정
4. **확장 가능한 구조** - 다른 맵 추가 용이

## ⚠️ 주의사항

1. **API 요청 제한** - tarkov-dev API 사용량 제한 확인 필요
2. **CORS 정책** - WebView2에서 외부 API 호출 시 CORS 이슈 가능성
3. **네트워크 의존성** - 오프라인 환경에서의 폴백 방안 필요
4. **버전 호환성** - tarkov-dev API 버전 변경에 대한 대응

## 🚀 다음 단계

1. **Phase 1 구현 시작** - 기본 좌표 변환 시스템 구현
2. **테스트 환경 구축** - 로컬에서 tarkov-dev 데이터 테스트
3. **점진적 배포** - 기능별 단계적 통합 및 테스트
4. **사용자 피드백** - 실제 게임 데이터와의 정확도 검증

---

*작성일: 2025-08-27*  
*작성자: Claude Code SuperClaude*  
*버전: 1.0*