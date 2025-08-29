/**
 * Tarkov Map Coordinate Transformation System
 * 게임 내 3D 좌표를 2D 맵 좌표로 변환하는 시스템
 * 
 * Based on tarkov-dev coordinate system:
 * - Transform Matrix: [scaleX, offsetX, scaleY, offsetY]
 * - Coordinate Rotation: 90 degrees
 * - 3D to 2D projection: [x, y, z] -> [z, x] (y축 제외)
 */

class TarkovMapSystem {
    constructor(mapConfig) {
        this.config = mapConfig;
        this.transform = mapConfig.transform || [1, 0, 1, 0];
        this.rotation = mapConfig.coordinateRotation || 0;
        this.bounds = mapConfig.bounds || [[0, 0], [100, 100]];
        this.heightRange = mapConfig.heightRange || [-1000, 1000];
    }

    /**
     * 게임 좌표를 맵 좌표로 변환
     * @param {Object} gamePos - {x, y, z} 게임 내 좌표
     * @returns {Array} [lat, lng] Leaflet 맵 좌표
     */
    gameToMapCoordinates(gamePos) {
        // Factory 맵 특화 좌표 변환
        // tarkov-dev 실제 공식을 기반으로 Factory에 최적화
        
        const x = gamePos.x;
        const z = gamePos.z;
        
        console.log('🎯 좌표 변환 시작:', { x, z, y: gamePos.y });
        
        // Factory 맵 특정 매개변수
        // 실제 Factory 맵 크기와 게임 좌표 범위에 맞게 조정
        const scale = 0.5; // 좌표 스케일 (작게 해서 지도 안에 들어가게)
        const offsetX = 0;   // X축 오프셋
        const offsetY = 0;   // Y축 오프셋
        
        // Factory는 비교적 작은 맵이므로 좌표를 축소
        // Z축을 Y축으로, X축을 X축으로 (표준 변환)
        let mapLat = (-z * scale) + offsetY; // Z축 반전하여 위도로
        let mapLng = (x * scale) + offsetX;  // X축을 경도로
        
        // 좌표가 너무 큰 경우 추가 스케일링
        const maxCoord = 500; // 최대 허용 좌표
        if (Math.abs(mapLat) > maxCoord || Math.abs(mapLng) > maxCoord) {
            const maxValue = Math.max(Math.abs(mapLat), Math.abs(mapLng));
            const autoScale = maxCoord / maxValue;
            
            mapLat *= autoScale;
            mapLng *= autoScale;
            
            console.log('📏 자동 스케일 조정:', {
                원본최대값: maxValue.toFixed(2),
                자동스케일: autoScale.toFixed(3),
                조정후: { mapLat: mapLat.toFixed(2), mapLng: mapLng.toFixed(2) }
            });
        }
        
        console.log('🗺️ 최종 변환 결과:', { 
            원본: { x, z },
            변환: { mapLat: mapLat.toFixed(2), mapLng: mapLng.toFixed(2) },
            매개변수: { scale, offsetX, offsetY }
        });

        return [mapLat, mapLng];
    }

    /**
     * 맵 좌표를 게임 좌표로 역변환
     * @param {Array} mapPos - [lat, lng] 맵 좌표
     * @param {number} height - Y축 높이 (기본값 0)
     * @returns {Object} {x, y, z} 게임 좌표
     */
    mapToGameCoordinates(mapPos, height = 0) {
        const [mapLat, mapLng] = mapPos;

        // 1. Transform 행렬 역변환
        const scaleX = this.transform[0];
        const offsetX = this.transform[1];
        const scaleY = this.transform[2] * -1;
        const offsetY = this.transform[3];

        let lat = (mapLat - offsetY) / scaleY;
        let lng = (mapLng - offsetX) / scaleX;

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

        // 3. 2D → 3D 변환
        return {
            x: lng,
            y: height,
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

    /**
     * 높이가 지정된 범위 내에 있는지 확인
     * @param {number} height - Y축 높이
     * @returns {boolean}
     */
    isWithinHeightRange(height) {
        return height >= this.heightRange[0] && height <= this.heightRange[1];
    }

    /**
     * Leaflet CRS (좌표 참조 시스템) 생성
     * @returns {Object} Leaflet CRS 객체
     */
    createLeafletCRS() {
        // transform 배열 안전성 검증
        const scaleX = (this.transform && Array.isArray(this.transform) && this.transform.length >= 4) ? (this.transform[0] || 1) : 1;
        const scaleY = (this.transform && Array.isArray(this.transform) && this.transform.length >= 4) ? ((this.transform[2] || 1) * -1) : -1;
        const marginX = (this.transform && Array.isArray(this.transform) && this.transform.length >= 4) ? (this.transform[1] || 0) : 0;
        const marginY = (this.transform && Array.isArray(this.transform) && this.transform.length >= 4) ? (this.transform[3] || 0) : 0;
        
        if (!this.transform || !Array.isArray(this.transform) || this.transform.length < 4) {
            console.warn('⚠️ TarkovMapSystem CRS - transform 배열 불완전:', {
                transform존재: !!this.transform,
                배열여부: Array.isArray(this.transform),
                배열길이: this.transform?.length,
                기본값사용: { scaleX, scaleY, marginX, marginY }
            });
        }

        return L.extend({}, L.CRS.Simple, {
            transformation: new L.Transformation(scaleX, marginX, scaleY, marginY),
            projection: L.extend({}, L.Projection.LonLat, {
                project: (latLng) => {
                    return L.Projection.LonLat.project(
                        this.applyRotation(latLng, this.rotation)
                    );
                },
                unproject: (point) => {
                    return this.applyRotation(
                        L.Projection.LonLat.unproject(point), 
                        this.rotation * -1
                    );
                }
            })
        });
    }

    /**
     * 좌표에 회전 변환 적용 (Leaflet CRS용 헬퍼)
     * @param {Object} latLng - Leaflet LatLng 객체
     * @param {number} rotation - 회전 각도 (도)
     * @returns {Object} 회전된 LatLng 객체
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

        const { lng: x, lat: y } = latLng;
        const rotatedX = x * cosAngle - y * sinAngle;
        const rotatedY = x * sinAngle + y * cosAngle;
        
        return L.latLng(rotatedY, rotatedX);
    }

    /**
     * 맵 경계를 Leaflet LatLngBounds 형태로 반환
     * @returns {Object} Leaflet LatLngBounds 객체
     */
    getLeafletBounds() {
        const [[lat1, lng1], [lat2, lng2]] = this.bounds;
        return L.latLngBounds([lat1, lng1], [lat2, lng2]);
    }

    /**
     * Factory 맵의 주요 위치들 (테스트용)
     */
    static getFactoryTestPoints() {
        return [
            {
                name: "사무실 건물",
                game: { x: 21, y: 2, z: 39 },
                description: "Factory 중앙 상단의 사무실 건물"
            },
            {
                name: "지하 터널 입구", 
                game: { x: 0, y: -2, z: 0 },
                description: "Factory 중앙 하단 지하 터널"
            },
            {
                name: "북쪽 계단",
                game: { x: 35, y: 1, z: 39 },
                description: "사무실 건물 북쪽 계단"
            },
            {
                name: "남쪽 계단",
                game: { x: 9, y: 1, z: 39 },
                description: "사무실 건물 남쪽 계단"
            }
        ];
    }
}

// Factory 맵 설정 (실제 tarkov-dev 데이터)
const FACTORY_CONFIG = {
    normalizedName: "factory",
    transform: [1.629, 119.9, 1.629, 139.3],
    coordinateRotation: 90,
    bounds: [[79, -64.5], [-66.5, 67.4]],
    heightRange: [-1, 3],
    tilePath: "https://assets.tarkov.dev/maps/factory/main/{z}/{x}/{y}.png",
    tileSize: 256,
    minZoom: 1,
    maxZoom: 6,
    // 층별 레이어 설정
    layers: [
        {
            name: "2nd Floor",
            tilePath: "https://assets.tarkov.dev/maps/factory/2nd/{z}/{x}/{y}.png",
            heightRange: [3, 6],
            show: false
        },
        {
            name: "3rd Floor", 
            tilePath: "https://assets.tarkov.dev/maps/factory/3rd/{z}/{x}/{y}.png",
            heightRange: [6, 10000],
            show: false
        },
        {
            name: "Tunnels",
            tilePath: "https://assets.tarkov.dev/maps/factory/tunnels/{z}/{x}/{y}.png", 
            heightRange: [-10000, -1],
            show: false
        }
    ]
};

// 내보내기
if (typeof module !== 'undefined' && module.exports) {
    // Node.js 환경
    module.exports = { TarkovMapSystem, FACTORY_CONFIG };
} else {
    // 브라우저 환경
    window.TarkovMapSystem = TarkovMapSystem;
    window.FACTORY_CONFIG = FACTORY_CONFIG;
}