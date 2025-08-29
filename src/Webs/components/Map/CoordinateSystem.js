/**
 * Tarkov Coordinate System - 좌표 변환 시스템
 * 타르코프 게임 좌표와 지도 좌표 간 변환을 담당하는 클래스
 * 
 * Features:
 * - 게임 좌표 → 지도 좌표 변환
 * - 맵별 변환 설정 지원
 * - 스케일링, 오프셋, 회전 변환
 * - 동적 맵 설정 로드
 */

class TarkovCoordinateSystem {
    constructor() {
        this.mapsConfig = null;
        this.currentMapConfig = null;
        this.isInitialized = false;
        
        // 초기화
        this.initialize();
    }

    /**
     * 좌표 시스템 초기화
     */
    async initialize() {
        try {
            console.log('좌표 시스템 초기화 시작...');
            
            // 맵 설정 로드
            await this.loadMapsConfiguration();
            
            this.isInitialized = true;
            console.log('좌표 시스템 초기화 완료');
            
        } catch (error) {
            console.error('좌표 시스템 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * 맵 설정 파일 로드
     */
    async loadMapsConfiguration() {
        try {
            // 설정 파일 경로
            const configPath = './maps/maps-config.json';
            
            // fetch를 사용하여 설정 파일 로드
            const response = await fetch(configPath);
            if (!response.ok) {
                throw new Error(`설정 파일 로드 실패: ${response.status}`);
            }
            
            this.mapsConfig = await response.json();
            console.log('맵 설정 로드 완료:', Object.keys(this.mapsConfig.maps));
            
            // 기본 맵 설정
            const defaultMapId = this.mapsConfig.defaultMap || 'factory';
            this.setCurrentMap(defaultMapId);
            
        } catch (error) {
            console.error('맵 설정 로드 실패:', error);
            
            // 폴백: 하드코딩된 기본 설정 사용
            this.mapsConfig = this.getDefaultConfiguration();
            this.setCurrentMap('factory');
            
            console.warn('기본 설정으로 폴백');
        }
    }

    /**
     * 기본 설정 반환 (폴백용)
     */
    getDefaultConfiguration() {
        return {
            maps: {
                factory: {
                    displayName: "Factory",
                    displayNameKo: "팩토리",
                    bounds: {
                        gameWorld: { minX: -50, maxX: 50, minZ: -50, maxZ: 50 },
                        mapImage: { width: 1024, height: 1024, minX: -512, maxX: 512, minZ: -512, maxZ: 512 }
                    },
                    transformation: {
                        scale: { x: 10.24, z: 10.24 },
                        offset: { x: 0, y: 0 },
                        rotation: 0,
                        flipY: true
                    },
                    defaultView: { center: [0, 0], zoom: 2 }
                }
            },
            defaultMap: "factory"
        };
    }

    /**
     * 현재 맵 설정
     */
    setCurrentMap(mapId) {
        if (!this.mapsConfig || !this.mapsConfig.maps) {
            console.error('맵 설정이 로드되지 않았습니다.');
            return false;
        }

        const normalizedMapId = this.normalizeMapId(mapId);
        const mapConfig = this.mapsConfig.maps[normalizedMapId];
        
        if (!mapConfig) {
            console.error(`지원하지 않는 맵: ${mapId}`);
            return false;
        }

        this.currentMapConfig = mapConfig;
        this.currentMapId = normalizedMapId;
        
        console.log(`현재 맵 설정: ${normalizedMapId} (${mapConfig.displayName})`);
        return true;
    }

    /**
     * 맵 ID 정규화
     */
    normalizeMapId(mapId) {
        if (!mapId || typeof mapId !== 'string') {
            return this.mapsConfig?.defaultMap || 'factory';
        }

        const normalizedId = mapId.toLowerCase().trim();
        
        // 직접 매치
        if (this.mapsConfig?.maps[normalizedId]) {
            return normalizedId;
        }

        // 패턴 매치
        if (this.mapsConfig?.mapDetection?.patterns) {
            for (const [standardId, patterns] of Object.entries(this.mapsConfig.mapDetection.patterns)) {
                if (patterns.some(pattern => normalizedId.includes(pattern.toLowerCase()))) {
                    return standardId;
                }
            }
        }

        // 폴백
        return this.mapsConfig?.mapDetection?.fallback || 'factory';
    }

    /**
     * 게임 좌표를 지도 좌표로 변환 (tarkov-dev 방식 적용)
     */
    gameToMapCoordinates(gameX, gameZ, gameY = 0) {
        if (!this.isInitialized || !this.currentMapConfig) {
            console.warn('좌표 시스템이 초기화되지 않았습니다. 기본 변환을 사용합니다.');
            return this.defaultTransformation(gameX, gameZ);
        }

        // tarkov-dev pos() 함수 적용: [position.z, position.x]
        // 이는 좌우 반전 문제를 해결하는 핵심 변경사항입니다
        return [gameZ, gameX]; // [lat, lng] = [z, x]
    }
    
    /**
     * tarkov-dev의 getCRS와 호환되는 좌표 변환 생성
     * @param {object} mapData - 맵 데이터 (transform 배열 포함)
     * @returns {object} Leaflet CRS 객체
     */
    createLeafletCRS(mapData) {
        let scaleX = 1;
        let scaleY = 1;
        let marginX = 0;
        let marginY = 0;
        
        // transform 배열 안전성 검증
        if (mapData && mapData.transform && Array.isArray(mapData.transform) && mapData.transform.length >= 4) {
            scaleX = mapData.transform[0] || 1;
            scaleY = (mapData.transform[2] || 1) * -1;  // Y축 반전
            marginX = mapData.transform[1] || 0;
            marginY = mapData.transform[3] || 0;
            
            console.log('✅ CRS transform 적용:', {
                scaleX, scaleY, marginX, marginY,
                원본배열: mapData.transform
            });
        } else {
            console.warn('⚠️ CRS transform 배열 없음/불완전 - 기본값 사용:', {
                mapData존재: !!mapData,
                transform존재: !!(mapData && mapData.transform),
                배열여부: Array.isArray(mapData?.transform),
                배열길이: mapData?.transform?.length,
                기본값: { scaleX, scaleY, marginX, marginY }
            });
        }
        
        // Leaflet CRS 생성 (tarkov-dev와 동일한 방식)
        const coordinateRotation = (mapData && typeof mapData.coordinateRotation === 'number') ? mapData.coordinateRotation : 0;
        
        return L.extend({}, L.CRS.Simple, {
            transformation: new L.Transformation(scaleX, marginX, scaleY, marginY),
            projection: L.extend({}, L.Projection.LonLat, {
                project: latLng => {
                    return L.Projection.LonLat.project(this.applyRotation(latLng, coordinateRotation));
                },
                unproject: point => {
                    return this.applyRotation(L.Projection.LonLat.unproject(point), coordinateRotation * -1);
                },
            }),
        });
    }
    
    /**
     * 회전 변환 적용 (tarkov-dev 방식)
     * @param {object} latLng - 좌표 객체
     * @param {number} rotation - 회전 각도
     * @returns {object} 회전된 좌표
     */
    applyRotation(latLng, rotation) {
        if (!latLng.lng && !latLng.lat) {
            return L.latLng(0, 0);
        }
        if (!rotation) {
            return latLng;
        }

        const angleInRadians = (rotation * Math.PI) / 180;
        const cosAngle = Math.cos(angleInRadians);
        const sinAngle = Math.sin(angleInRadians);

        const {lng: x, lat: y} = latLng;
        const rotatedX = x * cosAngle - y * sinAngle;
        const rotatedY = x * sinAngle + y * cosAngle;
        return L.latLng(rotatedY, rotatedX);
    }

    /**
     * 지도 좌표를 게임 좌표로 변환 (역변환)
     */
    mapToGameCoordinates(mapLat, mapLng) {
        if (!this.isInitialized || !this.currentMapConfig) {
            console.warn('좌표 시스템이 초기화되지 않았습니다. 기본 역변환을 사용합니다.');
            return this.defaultReverseTransformation(mapLat, mapLng);
        }

        const transform = this.currentMapConfig.transformation;
        
        // Leaflet 좌표를 지도 좌표로 변환
        let mapX = mapLng;
        let mapY = mapLat;

        // 1. 오프셋 제거
        mapX -= transform.offset.x || 0;
        mapY -= transform.offset.y || 0;

        // 2. 회전 역변환
        if (transform.rotation && transform.rotation !== 0) {
            const radians = -transform.rotation * Math.PI / 180; // 역변환이므로 음수
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);
            
            const rotatedX = mapX * cos - mapY * sin;
            const rotatedY = mapX * sin + mapY * cos;
            
            mapX = rotatedX;
            mapY = rotatedY;
        }

        // 3. Y축 플립 역변환
        if (transform.flipY) {
            mapY = -mapY;
        }

        // 4. 스케일링 역변환
        const gameX = mapX / transform.scale.x;
        const gameZ = mapY / transform.scale.z;

        return { x: gameX, z: gameZ, y: 0 };
    }

    /**
     * 기본 변환 (폴백용)
     */
    defaultTransformation(gameX, gameZ) {
        // 단순한 1:1 변환
        return [-gameZ * 0.5, gameX * 0.5];
    }

    /**
     * 기본 역변환 (폴백용)
     */
    defaultReverseTransformation(mapLat, mapLng) {
        return {
            x: mapLng / 0.5,
            z: -mapLat / 0.5,
            y: 0
        };
    }

    /**
     * 현재 맵의 경계 반환
     */
    getCurrentMapBounds() {
        if (!this.currentMapConfig) {
            return [[-1000, -1000], [1000, 1000]]; // 기본 경계
        }

        const bounds = this.currentMapConfig.bounds.mapImage;
        return [[bounds.minZ, bounds.minX], [bounds.maxZ, bounds.maxX]];
    }

    /**
     * 현재 맵의 기본 뷰 설정 반환
     */
    getCurrentMapDefaultView() {
        if (!this.currentMapConfig) {
            return { center: [0, 0], zoom: 1 };
        }

        return this.currentMapConfig.defaultView;
    }

    /**
     * 현재 맵 정보 반환
     */
    getCurrentMapInfo() {
        if (!this.currentMapConfig) {
            return {
                id: 'unknown',
                displayName: 'Unknown',
                displayNameKo: '알 수 없음'
            };
        }

        return {
            id: this.currentMapId,
            displayName: this.currentMapConfig.displayName,
            displayNameKo: this.currentMapConfig.displayNameKo
        };
    }

    /**
     * 지원하는 모든 맵 목록 반환
     */
    getSupportedMaps() {
        if (!this.mapsConfig) {
            return [];
        }

        return Object.entries(this.mapsConfig.maps).map(([id, config]) => ({
            id: id,
            displayName: config.displayName,
            displayNameKo: config.displayNameKo
        }));
    }

    /**
     * 좌표 유효성 검사
     */
    isValidGameCoordinate(x, z) {
        if (!this.currentMapConfig) {
            return true; // 설정이 없으면 유효하다고 가정
        }

        const bounds = this.currentMapConfig.bounds.gameWorld;
        return x >= bounds.minX && x <= bounds.maxX && 
               z >= bounds.minZ && z <= bounds.maxZ;
    }

    /**
     * 거리 계산 (게임 좌표 기준)
     */
    calculateDistance(x1, z1, x2, z2) {
        const dx = x2 - x1;
        const dz = z2 - z1;
        return Math.sqrt(dx * dx + dz * dz);
    }

    /**
     * 각도 계산 (게임 좌표 기준)
     */
    calculateAngle(x1, z1, x2, z2) {
        const dx = x2 - x1;
        const dz = z2 - z1;
        const angle = Math.atan2(dz, dx) * 180 / Math.PI;
        return (angle + 360) % 360; // 0-360도로 정규화
    }

    /**
     * 맵 변경 감지 및 자동 설정
     */
    detectAndSetMap(mapName) {
        const normalizedId = this.normalizeMapId(mapName);
        const success = this.setCurrentMap(normalizedId);
        
        if (success) {
            console.log(`맵 자동 감지 및 설정: ${mapName} -> ${normalizedId}`);
        }
        
        return success;
    }

    /**
     * 디버그 정보 반환
     */
    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            currentMapId: this.currentMapId,
            currentMapConfig: this.currentMapConfig,
            supportedMaps: this.getSupportedMaps(),
            mapsConfigLoaded: !!this.mapsConfig
        };
    }

    /**
     * 리소스 정리
     */
    dispose() {
        this.mapsConfig = null;
        this.currentMapConfig = null;
        this.currentMapId = null;
        this.isInitialized = false;
        
        console.log('좌표 시스템 정리 완료');
    }
}

// 전역 함수로 노출
window.TarkovCoordinateSystem = TarkovCoordinateSystem;

console.log('Tarkov Coordinate System 모듈 로드 완료');