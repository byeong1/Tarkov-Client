/**
 * Tarkov Map Application - Core JavaScript Implementation
 * 타르코프 지도 애플리케이션 핵심 구현
 * 
 * Features:
 * - Leaflet.js 지도 통합
 * - WebView2 Direct Communication
 * - 실시간 위치 업데이트
 * - 좌표 변환 시스템
 * - 사용자 인터랙션 처리
 */

class TarkovMapApplication {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.isInitialized = false;
        this.currentMapId = '';
        this.playerMarker = null;
        this.layers = new Map();
        this.settings = this.getDefaultSettings();
        this.errors = [];
        this.coordinateSystem = null;
        
        // 바인딩
        this.handleWebViewMessage = this.handleWebViewMessage.bind(this);
        this.updatePlayerPosition = this.updatePlayerPosition.bind(this);
        this.switchMap = this.switchMap.bind(this);
        
        // 초기화 시작
        this.initialize();
    }

    /**
     * 기본 설정 반환
     */
    getDefaultSettings() {
        return {
            theme: 'dark',
            showGrid: true,
            showDirection: true,
            markerSize: 16,
            updateInterval: 50,
            autoCenter: true,
            autoZoom: false,
            smoothMovement: true
        };
    }

    /**
     * 애플리케이션 초기화
     */
    async initialize() {
        try {
            console.log('타르코프 지도 시스템 초기화 시작...');
            
            // DOM 요소 확인
            if (!document.getElementById(this.containerId)) {
                throw new Error(`Container element '${this.containerId}' not found`);
            }

            // 좌표 시스템 초기화
            this.coordinateSystem = new TarkovCoordinateSystem();
            await this.coordinateSystem.initialize();

            // 지도 초기화
            await this.initializeMap();
            
            // UI 이벤트 설정
            this.setupUIEventHandlers();
            
            // 레이어 초기화
            this.initializeLayers();
            
            // 로딩 완료
            this.hideLoading();
            this.isInitialized = true;
            
            // 기본 맵으로 factory 설정
            this.currentMapId = 'factory';
            this.updateMapDisplay('factory');
            
            console.log('타르코프 지도 시스템 초기화 완료');
            
            // 전역 객체 설정
            window.tarkovMap = this;
            
        } catch (error) {
            console.error('지도 초기화 실패:', error);
            this.addError('지도 초기화 실패', error.message);
            this.showError(error.message);
        }
    }

    /**
     * Leaflet 지도 초기화
     */
    async initializeMap() {
        const mapElement = document.getElementById('map');
        
        // WebView2에서 DOM이 완전히 준비될 때까지 대기
        if (!mapElement) {
            console.error('지도 엘리먼트를 찾을 수 없습니다');
            return;
        }
        
        // WebView2에서 CSS 계산이 완료될 때까지 추가 대기
        await new Promise(resolve => {
            const checkSize = () => {
                const rect = mapElement.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    resolve();
                } else {
                    setTimeout(checkSize, 50);
                }
            };
            checkSize();
        });
        
        // 기본 지도 생성 (좌표계 없이 시작, WebView2 호환성 옵션 포함)
        this.map = L.map('map', {
            crs: L.CRS.Simple,
            center: [0, 0],
            zoom: 1,
            minZoom: 0,
            maxZoom: 5,
            zoomControl: false,
            attributionControl: true,
            preferCanvas: true,           // WebView2에서 Canvas 렌더링 선호
            renderer: L.canvas(),         // Canvas 렌더러 강제 사용
            zoomAnimation: false,         // 줌 애니메이션 비활성화 (WebView2 호환성)
            fadeAnimation: false,         // 페이드 애니메이션 비활성화
            markerZoomAnimation: false    // 마커 줌 애니메이션 비활성화
        });

        // 기본 레이어 (빈 지도)
        const bounds = [[-1000, -1000], [1000, 1000]];
        this.currentBaseLayer = L.rectangle(bounds, {
            color: '#2a2a2a',
            fillColor: '#2a2a2a',
            fillOpacity: 1,
            stroke: false
        }).addTo(this.map);

        // 지도 이벤트 설정
        this.setupMapEventHandlers();
        
        // WebView2에서 지도 렌더링 완료 대기 및 검증
        setTimeout(() => {
            try {
                this.map.invalidateSize();  // 크기 재계산 강제
                const mapContainer = this.map.getContainer();
                const mapPanes = mapContainer.querySelector('.leaflet-map-pane');
                
                if (mapPanes) {
                    console.log('Leaflet 지도 초기화 완료 - 렌더링 성공');
                    console.log('지도 컨테이너 크기:', mapContainer.getBoundingClientRect());
                } else {
                    console.warn('Leaflet 지도 렌더링 확인 실패');
                }
            } catch (error) {
                console.error('지도 렌더링 검증 중 오류:', error);
            }
        }, 100);
    }

    /**
     * 지도 이벤트 핸들러 설정
     */
    setupMapEventHandlers() {
        // 마우스 이동 시 좌표 표시
        this.map.on('mousemove', (e) => {
            const coords = e.latlng;
            this.updateCoordinateDisplay(coords.lat, coords.lng);
        });

        // 줌 변경 시
        this.map.on('zoomend', () => {
            this.sendUserInteraction('zoom_change', 'map', [this.map.getZoom()]);
        });

        // 지도 클릭 시
        this.map.on('click', (e) => {
            const coords = e.latlng;
            this.sendUserInteraction('map_click', 'map', [coords.lat, coords.lng]);
        });
    }

    /**
     * UI 이벤트 핸들러 설정
     */
    setupUIEventHandlers() {
        // 줌 버튼
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                this.map.zoomIn();
                this.sendUserInteraction('zoom_in', 'button');
            });
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                this.map.zoomOut();
                this.sendUserInteraction('zoom_out', 'button');
            });
        }

        // 레이어 패널 토글
        const layersToggle = document.getElementById('layers-toggle');
        const layerPanel = document.getElementById('layer-panel');
        const layerClose = document.getElementById('layer-close');
        
        if (layersToggle && layerPanel) {
            layersToggle.addEventListener('click', () => {
                const isVisible = layerPanel.style.display !== 'none';
                layerPanel.style.display = isVisible ? 'none' : 'block';
                this.sendUserInteraction('toggle_layers', 'button');
            });
        }
        
        if (layerClose && layerPanel) {
            layerClose.addEventListener('click', () => {
                layerPanel.style.display = 'none';
            });
        }

        // 설정 패널 토글
        const settingsToggle = document.getElementById('settings-toggle');
        const settingsPanel = document.getElementById('settings-panel');
        const settingsClose = document.getElementById('settings-close');
        
        if (settingsToggle && settingsPanel) {
            settingsToggle.addEventListener('click', () => {
                const isVisible = settingsPanel.style.display !== 'none';
                settingsPanel.style.display = isVisible ? 'none' : 'block';
                this.sendUserInteraction('toggle_settings', 'button');
            });
        }
        
        if (settingsClose && settingsPanel) {
            settingsClose.addEventListener('click', () => {
                settingsPanel.style.display = 'none';
            });
        }

        // 레이어 체크박스
        this.setupLayerControls();
        
        // 설정 컨트롤
        this.setupSettingsControls();
        
        // 오류 메시지 닫기
        const errorClose = document.querySelector('.error-close');
        if (errorClose) {
            errorClose.addEventListener('click', () => {
                this.hideError();
            });
        }
    }

    /**
     * 레이어 컨트롤 설정
     */
    setupLayerControls() {
        const layerControls = {
            'layer-grid': 'showGrid',
            'layer-player': 'showPlayer', 
            'layer-direction': 'showDirection',
            'layer-loot': 'showLoot',
            'layer-exits': 'showExits'
        };

        Object.entries(layerControls).forEach(([elementId, settingKey]) => {
            const checkbox = document.getElementById(elementId);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    const isEnabled = e.target.checked;
                    this.toggleLayer(settingKey, isEnabled);
                    this.sendUserInteraction('toggle_layer', elementId, [isEnabled]);
                });
            }
        });
    }

    /**
     * 설정 컨트롤 설정
     */
    setupSettingsControls() {
        // 마커 크기 슬라이더
        const markerSizeSlider = document.getElementById('marker-size');
        const markerSizeValue = document.getElementById('marker-size-value');
        
        if (markerSizeSlider && markerSizeValue) {
            markerSizeSlider.addEventListener('input', (e) => {
                const size = parseInt(e.target.value);
                markerSizeValue.textContent = `${size}px`;
                this.updateMarkerSize(size);
            });
        }

        // 업데이트 주기 선택
        const updateInterval = document.getElementById('update-interval');
        if (updateInterval) {
            updateInterval.addEventListener('change', (e) => {
                this.settings.updateInterval = parseInt(e.target.value);
                this.sendUserInteraction('change_update_interval', 'select', [this.settings.updateInterval]);
            });
        }

        // 설정 체크박스
        const settingsCheckboxes = [
            'show-direction', 'show-coordinates', 'smooth-movement',
            'auto-center', 'auto-zoom'
        ];

        settingsCheckboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    const isEnabled = e.target.checked;
                    this.updateSetting(id, isEnabled);
                    this.sendUserInteraction('change_setting', id, [isEnabled]);
                });
            }
        });

        // 설정 버튼
        const applyBtn = document.getElementById('apply-settings');
        const resetBtn = document.getElementById('reset-settings');
        
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applySettings();
                this.sendUserInteraction('apply_settings', 'button');
            });
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetSettings();
                this.sendUserInteraction('reset_settings', 'button');
            });
        }
    }

    /**
     * 레이어 초기화
     */
    initializeLayers() {
        // 격자 레이어
        this.layers.set('grid', L.layerGroup());
        
        // 플레이어 레이어
        this.layers.set('players', L.layerGroup());
        
        // 방향 표시 레이어
        this.layers.set('directions', L.layerGroup());
        
        // 아이템 레이어
        this.layers.set('loot', L.layerGroup());
        
        // 출구 레이어
        this.layers.set('exits', L.layerGroup());

        // 기본 레이어를 지도에 추가
        this.layers.get('players').addTo(this.map);
        this.layers.get('directions').addTo(this.map);
        
        console.log('레이어 초기화 완료');
    }

    /**
     * 맵 전환
     */
    async switchMap(mapId) {
        try {
            console.log(`맵 전환: ${this.currentMapId} -> ${mapId}`);
            
            if (this.currentMapId === mapId) {
                console.log('이미 같은 맵입니다.');
                return true;
            }

            // 로딩 표시
            this.showLoading();
            
            // 기존 마커들 제거
            this.clearAllMarkers();
            
            // 좌표 시스템에서 맵 변경
            if (this.coordinateSystem) {
                this.coordinateSystem.setCurrentMap(mapId);
            }
            
            // 맵 이미지 로드 (실제 구현에서는 맵 파일 경로 사용)
            await this.loadMapImage(mapId);
            
            // 맵 설정 업데이트
            this.currentMapId = mapId;
            this.updateMapDisplay(mapId);
            
            // 지도 뷰를 새 맵의 기본 설정으로 조정
            if (this.coordinateSystem) {
                const defaultView = this.coordinateSystem.getCurrentMapDefaultView();
                const bounds = this.coordinateSystem.getCurrentMapBounds();
                
                this.map.fitBounds(bounds);
                if (defaultView.center && defaultView.zoom) {
                    this.map.setView(defaultView.center, defaultView.zoom);
                }
            }
            
            // 로딩 숨김
            this.hideLoading();
            
            console.log(`맵 전환 완료: ${mapId}`);
            return true;
            
        } catch (error) {
            console.error('맵 전환 실패:', error);
            this.addError('맵 전환 실패', error.message);
            this.hideLoading();
            this.showError(`맵 전환 실패: ${error.message}`);
            return false;
        }
    }

    /**
     * 맵 이미지 로드
     */
    async loadMapImage(mapId) {
        // 임시: 색상 배경으로 맵 표현 (실제 구현에서는 이미지 로드)
        const mapColors = {
            'factory': '#4a5568',
            'customs': '#2d5a27',
            'shoreline': '#1a365d',
            'woods': '#22543d',
            'interchange': '#553c9a',
            'reserve': '#744210',
            'labs': '#2c5282'
        };

        const color = mapColors[mapId.toLowerCase()] || '#2a2a2a';
        
        if (this.currentBaseLayer) {
            this.map.removeLayer(this.currentBaseLayer);
        }

        const bounds = [[-1000, -1000], [1000, 1000]];
        this.currentBaseLayer = L.rectangle(bounds, {
            color: color,
            fillColor: color,
            fillOpacity: 0.8,
            stroke: false
        }).addTo(this.map);

        // 맵 뷰 설정
        this.map.fitBounds(bounds);
        
        return true;
    }

    /**
     * 플레이어 위치 업데이트
     */
    updatePlayerPosition(positionData) {
        try {
            if (!this.isInitialized) {
                console.warn('지도가 아직 초기화되지 않았습니다.');
                return false;
            }

            // 맵 ID 확인 및 전환
            if (positionData.mapId && positionData.mapId !== this.currentMapId) {
                this.switchMap(positionData.mapId);
            }

            // 좌표 변환 (게임 좌표 -> 지도 좌표)
            const mapCoords = this.gameToMapCoordinates(positionData.x, positionData.z);
            
            // 기존 플레이어 마커 제거
            if (this.playerMarker) {
                this.layers.get('players').removeLayer(this.playerMarker);
                this.layers.get('directions').clearLayers();
            }

            // 새 플레이어 마커 생성
            this.playerMarker = L.circleMarker(mapCoords, {
                radius: this.settings.markerSize / 2,
                fillColor: '#4a9eff',
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9,
                className: 'player-marker current-player'
            });

            // 방향 표시 화살표 추가
            if (this.settings.showDirection && positionData.rotation !== undefined) {
                const arrow = this.createDirectionArrow(mapCoords, positionData.rotation);
                this.layers.get('directions').addLayer(arrow);
            }

            // 마커를 레이어에 추가
            this.layers.get('players').addLayer(this.playerMarker);

            // 툴팁 추가
            const tooltipText = `좌표: (${positionData.x.toFixed(1)}, ${positionData.z.toFixed(1)})`;
            this.playerMarker.bindTooltip(tooltipText, {
                permanent: false,
                direction: 'top',
                offset: [0, -20]
            });

            // 자동 중앙 정렬
            if (this.settings.autoCenter) {
                if (this.settings.smoothMovement) {
                    this.map.panTo(mapCoords, { animate: true, duration: 0.25 });
                } else {
                    this.map.setView(mapCoords);
                }
            }

            // 좌표 표시 업데이트
            this.updateCoordinateDisplay(positionData.x, positionData.z);
            
            console.log(`플레이어 위치 업데이트: (${positionData.x}, ${positionData.z}) -> (${mapCoords[0]}, ${mapCoords[1]})`);
            return true;
            
        } catch (error) {
            console.error('플레이어 위치 업데이트 실패:', error);
            this.addError('위치 업데이트 실패', error.message);
            return false;
        }
    }

    /**
     * 게임 좌표를 지도 좌표로 변환
     */
    gameToMapCoordinates(gameX, gameZ, gameY = 0) {
        if (this.coordinateSystem && this.coordinateSystem.isInitialized) {
            return this.coordinateSystem.gameToMapCoordinates(gameX, gameZ, gameY);
        } else {
            // 폴백: 기본 변환
            console.warn('좌표 시스템을 사용할 수 없습니다. 기본 변환을 사용합니다.');
            const mapX = gameX * 0.5;
            const mapY = -gameZ * 0.5; // Y축 반전
            return [mapY, mapX];
        }
    }

    /**
     * 방향 표시 화살표 생성
     */
    createDirectionArrow(position, rotation) {
        const arrowIcon = L.divIcon({
            className: 'direction-arrow',
            html: `<div style="transform: rotate(${rotation}deg);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        return L.marker(position, { icon: arrowIcon });
    }

    /**
     * 좌표 표시 업데이트
     */
    updateCoordinateDisplay(x, z) {
        const coordsElement = document.getElementById('current-coords');
        if (coordsElement) {
            coordsElement.textContent = `${x.toFixed(1)}, ${z.toFixed(1)}`;
        }
    }

    /**
     * 맵 표시 업데이트
     */
    updateMapDisplay(mapId) {
        const mapElement = document.getElementById('current-map');
        if (mapElement) {
            if (this.coordinateSystem) {
                const mapInfo = this.coordinateSystem.getCurrentMapInfo();
                mapElement.textContent = mapInfo.displayNameKo || mapInfo.displayName || mapId || 'Unknown';
            } else {
                mapElement.textContent = mapId || 'Unknown';
            }
        }
    }

    /**
     * 모든 마커 제거
     */
    clearAllMarkers() {
        this.layers.get('players').clearLayers();
        this.layers.get('directions').clearLayers();
        this.playerMarker = null;
    }

    /**
     * 레이어 토글
     */
    toggleLayer(layerName, enabled) {
        const layerMap = {
            'showGrid': 'grid',
            'showPlayer': 'players',
            'showDirection': 'directions', 
            'showLoot': 'loot',
            'showExits': 'exits'
        };

        const leafletLayerName = layerMap[layerName];
        if (!leafletLayerName) return;

        const layer = this.layers.get(leafletLayerName);
        if (!layer) return;

        if (enabled) {
            if (!this.map.hasLayer(layer)) {
                this.map.addLayer(layer);
            }
        } else {
            if (this.map.hasLayer(layer)) {
                this.map.removeLayer(layer);
            }
        }

        console.log(`레이어 ${layerName} ${enabled ? '활성화' : '비활성화'}`);
    }

    /**
     * 마커 크기 업데이트
     */
    updateMarkerSize(size) {
        this.settings.markerSize = size;
        
        if (this.playerMarker) {
            this.playerMarker.setRadius(size / 2);
        }
        
        console.log(`마커 크기 업데이트: ${size}px`);
    }

    /**
     * 설정 업데이트
     */
    updateSetting(settingId, value) {
        const settingMap = {
            'show-direction': 'showDirection',
            'show-coordinates': 'showCoordinates',
            'smooth-movement': 'smoothMovement',
            'auto-center': 'autoCenter',
            'auto-zoom': 'autoZoom'
        };

        const settingKey = settingMap[settingId];
        if (settingKey) {
            this.settings[settingKey] = value;
            console.log(`설정 업데이트: ${settingKey} = ${value}`);
        }
    }

    /**
     * 설정 적용
     */
    applySettings() {
        // 실제 적용 로직 구현
        console.log('설정 적용:', this.settings);
        
        // C#에 설정 변경 알림
        this.sendWebViewMessage('SETTINGS_UPDATE', this.settings);
    }

    /**
     * 설정 초기화
     */
    resetSettings() {
        this.settings = this.getDefaultSettings();
        
        // UI 요소들도 초기화
        this.updateUIFromSettings();
        
        console.log('설정 초기화 완료');
    }

    /**
     * 설정에 따라 UI 업데이트
     */
    updateUIFromSettings() {
        // 체크박스 업데이트
        const checkboxMappings = {
            'layer-grid': this.settings.showGrid,
            'layer-player': true, // 플레이어는 항상 표시
            'layer-direction': this.settings.showDirection,
            'show-direction': this.settings.showDirection,
            'show-coordinates': this.settings.showCoordinates,
            'smooth-movement': this.settings.smoothMovement,
            'auto-center': this.settings.autoCenter,
            'auto-zoom': this.settings.autoZoom
        };

        Object.entries(checkboxMappings).forEach(([id, value]) => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.checked = value;
            }
        });

        // 슬라이더 업데이트
        const markerSlider = document.getElementById('marker-size');
        const markerValue = document.getElementById('marker-size-value');
        if (markerSlider && markerValue) {
            markerSlider.value = this.settings.markerSize;
            markerValue.textContent = `${this.settings.markerSize}px`;
        }

        // 선택 박스 업데이트
        const intervalSelect = document.getElementById('update-interval');
        if (intervalSelect) {
            intervalSelect.value = this.settings.updateInterval;
        }
    }

    /**
     * WebView 메시지 처리
     */
    handleWebViewMessage(message) {
        try {
            if (!message || !message.type) {
                console.warn('잘못된 메시지 형식:', message);
                return;
            }

            console.log('WebView 메시지 수신:', message.type, message.data);

            switch (message.type) {
                case 'POSITION_UPDATE':
                    this.updatePlayerPosition(message.data);
                    break;
                    
                case 'MAP_CHANGE':
                    if (message.data && message.data.mapId) {
                        this.switchMap(message.data.mapId);
                    }
                    break;
                    
                case 'SETTINGS_UPDATE':
                    if (message.data) {
                        this.settings = { ...this.settings, ...message.data };
                        this.updateUIFromSettings();
                    }
                    break;
                    
                default:
                    console.log(`처리되지 않은 메시지 타입: ${message.type}`);
                    break;
            }
        } catch (error) {
            console.error('WebView 메시지 처리 오류:', error);
            this.addError('메시지 처리 오류', error.message);
        }
    }

    /**
     * C#으로 메시지 전송
     */
    sendWebViewMessage(type, data) {
        if (!window.chrome || !window.chrome.webview) {
            console.warn('WebView2 환경이 아닙니다.');
            return;
        }

        const message = {
            type: type,
            data: data,
            timestamp: Date.now(),
            source: 'javascript'
        };

        try {
            window.chrome.webview.postMessage(JSON.stringify(message));
            console.log('WebView 메시지 전송:', type, data);
        } catch (error) {
            console.error('WebView 메시지 전송 실패:', error);
        }
    }

    /**
     * 사용자 인터랙션 전송
     */
    sendUserInteraction(action, target, coordinates = null) {
        this.sendWebViewMessage('USER_INTERACTION', {
            action: action,
            target: target,
            coordinates: coordinates,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 연결 상태 업데이트
     */
    updateConnectionStatus(status, message) {
        const statusElement = document.getElementById('connection-status');
        if (!statusElement) return;

        // 기존 클래스 제거
        statusElement.classList.remove('online', 'offline', 'error');
        
        // 새 상태 적용
        statusElement.classList.add(status);
        statusElement.textContent = `● ${message}`;

        console.log(`연결 상태 업데이트: ${status} - ${message}`);
    }

    /**
     * 로딩 표시
     */
    showLoading() {
        const loadingElement = document.getElementById('loading-indicator');
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }
    }

    /**
     * 로딩 숨김
     */
    hideLoading() {
        const loadingElement = document.getElementById('loading-indicator');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }

    /**
     * 오류 표시
     */
    showError(message) {
        const errorElement = document.getElementById('error-message');
        const errorText = errorElement?.querySelector('.error-text');
        
        if (errorElement && errorText) {
            errorText.textContent = message;
            errorElement.style.display = 'flex';
        }
        
        // 로딩 숨김
        this.hideLoading();
    }

    /**
     * 오류 숨김
     */
    hideError() {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    /**
     * 오류 추가 (디버깅용)
     */
    addError(type, message) {
        const error = {
            type: type,
            message: message,
            timestamp: new Date().toISOString()
        };
        
        this.errors.push(error);
        
        // 최대 50개의 오류만 보관
        if (this.errors.length > 50) {
            this.errors.shift();
        }
        
        console.error(`[${type}] ${message}`);
    }

    /**
     * 정리 및 리소스 해제
     */
    dispose() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        
        if (this.coordinateSystem) {
            this.coordinateSystem.dispose();
            this.coordinateSystem = null;
        }
        
        this.layers.clear();
        this.playerMarker = null;
        this.isInitialized = false;
        
        console.log('타르코프 지도 시스템 정리 완료');
    }
}

// 전역 함수로 노출 (C#에서 호출 가능)
window.TarkovMapApplication = TarkovMapApplication;

console.log('Tarkov Map JavaScript 모듈 로드 완료');