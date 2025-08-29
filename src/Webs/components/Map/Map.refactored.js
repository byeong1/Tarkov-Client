/**
 * Tarkov Map Application - 리팩토링된 코어 클래스
 * 모듈화된 구조로 분리하여 유지보수성 향상
 * 
 * Features:
 * - 모듈 기반 구조
 * - EventBus 통신 시스템
 * - 점진적 데이터 로딩
 * - 즉시 사용 가능한 UI
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
        
        // 패널 가시성 상태
        this.leftPanelVisible = false;
        this.rightPanelVisible = false;
        
        // 층수 관리 시스템
        this.levelManager = {
            availableLevels: new Set(['main']),
            currentLevel: 'main',
            levelData: new Map(),
            callbacks: []
        };
        
        // 모듈 인스턴스들
        this.dataLoader = null;
        this.uiManager = null;
        this.markerManager = null;
        this.markerFilterPanel = null;
        this.questFilterPanel = null;
        
        // EventBus 연결
        this.eventBus = window.eventBus;
        
        // 에러 복구 관련 상태
        this.initializationAttempts = 0;
        this.maxInitializationAttempts = 3;
        this.errorRecoveryEnabled = true;
        this.lastError = null;
        
        // 바인딩
        this.handleWebViewMessage = this.handleWebViewMessage.bind(this);
        this.updatePlayerPosition = this.updatePlayerPosition.bind(this);
        this.switchMap = this.switchMap.bind(this);
        
        // 전역 에러 핸들러 설정
        this.setupGlobalErrorHandlers();
        
        // 이벤트 핸들러 설정
        this.setupEventHandlers();
        
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
     * EventBus 핸들러 설정
     */
    setupEventHandlers() {
        // 데이터 로딩 이벤트
        this.eventBus.on('loading:started', () => {
            console.log('📊 백그라운드 데이터 로딩 시작됨');
        });

        this.eventBus.on('loading:completed', (event) => {
            const { successCount, totalCount } = event.detail;
            console.log(`📈 데이터 로딩 완료: ${successCount}/${totalCount} 성공`);
            
            if (successCount > 0) {
                this.uiManager?.showSuccessToast(`${successCount}개 데이터 로딩 완료`);
            }
        });

        this.eventBus.on('loading:error', (event) => {
            const { component, message } = event.detail;
            console.error(`❌ ${component} 로딩 실패:`, message);
            this.uiManager?.showPageError(`${component} 로딩 실패: ${message}`);
        });

        // 패널 로딩 상태 이벤트
        this.eventBus.on('panel:loading', (event) => {
            const { panel, dataType, message } = event.detail;
            this.uiManager?.showPanelLoading(panel, dataType, message);
        });

        this.eventBus.on('panel:loaded', (event) => {
            const { panel, dataType } = event.detail;
            this.uiManager?.hidePanelLoading(panel, dataType);
        });

        this.eventBus.on('panel:error', (event) => {
            const { panel, dataType, message } = event.detail;
            this.uiManager?.showPanelError(panel, dataType, message);
        });

        // 레벨 업데이트 이벤트
        this.eventBus.on('levels:update', () => {
            this.updateLevelSelector();
        });

        // 재시도 요청 이벤트
        this.eventBus.on('retry:request', (event) => {
            const { panel, dataType } = event.detail;
            console.log(`🔄 ${panel} 패널 ${dataType} 재시도 요청`);
            this.dataLoader?.retryDataLoading(dataType);
        });
    }

    /**
     * 애플리케이션 초기화
     */
    async initialize() {
        try {
            console.log('🚀 타르코프 지도 시스템 초기화 시작...');
            
            // DOM 요소 확인
            if (!document.getElementById(this.containerId)) {
                throw new Error(`Container element '${this.containerId}' not found`);
            }

            // 1. UI 관리자 먼저 초기화 (즉시 피드백 제공용)
            this.uiManager = new UIManager(this);
            console.log('✅ UIManager 초기화 완료');

            // 2. TarkovMapSystem 초기화
            this.mapSystem = new TarkovMapSystem(FACTORY_CONFIG);
            console.log('✅ TarkovMapSystem 초기화 완료');

            // 3. 지도 초기화
            await this.initializeMap();
            console.log('✅ Leaflet 지도 초기화 완료');

            // 4. MarkerManager 초기화
            this.markerManager = new MarkerManager(this);
            console.log('✅ MarkerManager 초기화 완료');
            
            // 5. UI 이벤트 설정
            this.setupUIEventHandlers();
            console.log('✅ UI 이벤트 핸들러 설정 완료');
            
            // 6. 레이어 초기화
            this.initializeLayers();
            console.log('✅ 지도 레이어 초기화 완료');
            
            // 7. 패널 초기화 (데이터 없이도 작동)
            this.initializeTarkovDevPanels();
            console.log('✅ UI 패널 초기화 완료');
            
            // 8. 즉시 페이지 표시 (데이터 로딩과 완전 분리)
            this.hideLoading();
            this.isInitialized = true;
            
            console.log('✅ UI 초기화 완료 - 페이지 즉시 사용 가능');
            
            // 9. 데이터 로더 초기화 및 백그라운드 로딩 시작
            this.dataLoader = new DataLoader(this);
            await this.dataLoader.startBackgroundLoading();
            console.log('✅ 백그라운드 데이터 로딩 시작됨');
            
        } catch (error) {
            console.error('❌ 지도 초기화 실패:', error);
            this.errors.push(error);
            this.uiManager?.showPageError('지도 초기화에 실패했습니다.', error.message);
        }
    }

    /**
     * Leaflet 지도 초기화 (개선된 버전)
     */
    async initializeMap() {
        console.log('🗺️ [모듈화] 지도 초기화 시작...');
        
        // 1단계: DOM 엘리먼트 검증
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('❌ 지도 컨테이너를 찾을 수 없습니다:', this.containerId);
            throw new Error(`지도 컨테이너를 찾을 수 없습니다: ${this.containerId}`);
        }

        // 2단계: DOM 크기 계산 대기
        console.log('⏳ DOM 크기 계산 대기...');
        await new Promise(resolve => {
            const checkSize = () => {
                const rect = container.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    console.log('✅ DOM 크기 확인됨:', { width: rect.width, height: rect.height });
                    resolve();
                } else {
                    setTimeout(checkSize, 50);
                }
            };
            checkSize();
        });

        // 3단계: Leaflet 지도 생성 (안전한 방식)
        console.log('🗺️ Leaflet 지도 인스턴스 생성 중...');
        try {
            this.map = L.map(this.containerId, {
                crs: L.CRS.Simple,
                minZoom: -3,
                maxZoom: 3,
                zoomControl: true,
                attributionControl: false,
                preferCanvas: true,          // WebView2에서 Canvas 렌더링 선호
                renderer: L.canvas(),        // Canvas 렌더러 강제 사용
                zoomAnimation: false,        // 줌 애니메이션 비활성화 (WebView2 호환성)
                fadeAnimation: false,        // 페이드 애니메이션 비활성화
                markerZoomAnimation: false   // 마커 줌 애니메이션 비활성화
            });
            console.log('✅ Leaflet 지도 생성 완료');
        } catch (error) {
            console.error('❌ 지도 생성 실패:', error);
            throw error;
        }

        // 4단계: 초기 뷰 설정
        this.map.setView([0, 0], 0);

        // 5단계: 좌표 변환 시스템 초기화 (안전한 방식)
        console.log('🎯 좌표 변환 시스템 초기화 중...');
        try {
            this.coordinateSystem = new CoordinateTransform();
            console.log('✅ 좌표 변환 시스템 초기화 완료');
        } catch (error) {
            console.error('❌ 좌표 변환 시스템 초기화 실패:', error);
            // 좌표 시스템 없이도 기본 동작 가능하도록 계속 진행
        }
    }

    /**
     * UI 이벤트 핸들러 설정
     */
    setupUIEventHandlers() {
        // 패널 토글 버튼
        const leftToggle = document.querySelector('.panel-left .panel-toggle');
        const rightToggle = document.querySelector('.panel-right .panel-toggle');

        if (leftToggle) {
            leftToggle.addEventListener('click', () => this.togglePanel('left'));
        }

        if (rightToggle) {
            rightToggle.addEventListener('click', () => this.togglePanel('right'));
        }

        // 레벨 선택기
        const levelSelector = document.getElementById('levelSelector');
        if (levelSelector) {
            levelSelector.addEventListener('change', (e) => {
                this.levelManager.currentLevel = e.target.value;
                this.updateMapForLevel(e.target.value);
                console.log(`🏗️ 레벨 변경됨: ${e.target.value}`);
            });
        }

        // 상단 컨트롤 버튼들
        this.setupTopControlButtons();

        // 지도 이벤트
        if (this.map) {
            this.map.on('click', this.handleMapClick.bind(this));
            this.map.on('moveend', this.handleMapMoveEnd.bind(this));
        }
    }

    /**
     * 상단 컨트롤 버튼 설정
     */
    setupTopControlButtons() {
        // 새로고침 버튼
        const refreshBtn = document.querySelector('[data-action="refresh"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('🔄 데이터 새로고침 요청');
                this.dataLoader?.startBackgroundLoading();
            });
        }

        // 설정 버튼
        const settingsBtn = document.querySelector('[data-action="settings"]');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                console.log('⚙️ 설정 패널 토글');
                // TODO: 설정 패널 구현
            });
        }
    }

    /**
     * 레이어 초기화
     */
    initializeLayers() {
        // 기본 레이어 그룹 생성
        this.layers.set('markers', L.layerGroup().addTo(this.map));
        this.layers.set('player', L.layerGroup().addTo(this.map));
        this.layers.set('quests', L.layerGroup().addTo(this.map));
        
        console.log('✅ 기본 레이어 그룹 생성됨');
    }

    /**
     * Tarkov-dev 스타일 패널 초기화
     */
    initializeTarkovDevPanels() {
        // 마커 필터 패널 초기화
        this.markerFilterPanel = new MarkerFilterPanel('panel_left_content', this);
        console.log('✅ 마커 필터 패널 초기화됨');

        // 퀘스트 필터 패널 초기화
        this.questFilterPanel = new QuestFilterPanel('panel_right_content', this);
        console.log('✅ 퀘스트 필터 패널 초기화됨');
    }

    /**
     * 패널 토글
     */
    togglePanel(side) {
        const panel = document.getElementById(side === 'left' ? 'panel_left' : 'panel_right');
        if (!panel) return;

        const isVisible = side === 'left' ? this.leftPanelVisible : this.rightPanelVisible;
        const newVisibility = !isVisible;

        if (side === 'left') {
            this.leftPanelVisible = newVisibility;
        } else {
            this.rightPanelVisible = newVisibility;
        }

        // 패널 표시/숨김
        if (newVisibility) {
            panel.classList.remove('hidden');
            panel.classList.add('visible');
            this.uiManager?.animatePanel(side, 'show');
        } else {
            panel.classList.add('hidden');
            panel.classList.remove('visible');
            this.uiManager?.animatePanel(side, 'hide');
        }

        console.log(`🔧 ${side} 패널 ${newVisibility ? '표시' : '숨김'}`);
    }

    /**
     * 레벨 선택기 업데이트
     */
    updateLevelSelector() {
        const selector = document.getElementById('levelSelector');
        if (!selector) {
            console.warn('⚠️ 레벨 선택기를 찾을 수 없습니다');
            return;
        }

        // 현재 옵션 저장
        const currentValue = selector.value;
        
        // 옵션 초기화
        selector.innerHTML = '';
        
        // 사용 가능한 레벨들 정렬
        const sortedLevels = Array.from(this.levelManager.availableLevels).sort();
        
        // 옵션 추가
        sortedLevels.forEach(level => {
            const option = document.createElement('option');
            option.value = level;
            option.textContent = this.getLevelDisplayName(level);
            selector.appendChild(option);
        });
        
        // 이전 선택값 복원 (가능한 경우)
        if (sortedLevels.includes(currentValue)) {
            selector.value = currentValue;
        } else if (sortedLevels.length > 0) {
            selector.value = sortedLevels[0];
            this.levelManager.currentLevel = sortedLevels[0];
        }
        
        console.log(`🏗️ 레벨 선택기 업데이트: ${sortedLevels.length}개 레벨 사용 가능`);
    }

    /**
     * 레벨 표시 이름 반환
     */
    getLevelDisplayName(level) {
        const displayNames = {
            'main': 'Ground Floor',
            'level1': '1st Floor',
            'level2': '2nd Floor',
            'level3': '3rd Floor',
            'underground': 'Underground',
            'basement': 'Basement'
        };
        return displayNames[level] || level.charAt(0).toUpperCase() + level.slice(1);
    }

    /**
     * 지도 클릭 처리
     */
    handleMapClick(e) {
        const { lat, lng } = e.latlng;
        console.log(`🖱️ 지도 클릭: [${lat.toFixed(2)}, ${lng.toFixed(2)}]`);
        
        // 좌표 표시 업데이트
        this.updateCoordinateDisplay(lat, lng);
    }

    /**
     * 지도 이동 완료 처리
     */
    handleMapMoveEnd() {
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        console.log(`🗺️ 지도 이동 완료: [${center.lat.toFixed(2)}, ${center.lng.toFixed(2)}] 줌: ${zoom}`);
    }

    /**
     * 좌표 표시 업데이트
     */
    updateCoordinateDisplay(lat, lng) {
        const coordDisplay = document.querySelector('.coordinate-display');
        if (coordDisplay) {
            coordDisplay.textContent = `Lat: ${lat.toFixed(2)}, Lng: ${lng.toFixed(2)}`;
        }
    }

    /**
     * 레벨에 따른 지도 업데이트
     */
    updateMapForLevel(level) {
        console.log(`🏗️ 지도를 ${level} 레벨로 업데이트 중...`);
        
        // 마커 필터링
        if (this.markerFilterPanel) {
            this.markerFilterPanel.filterByLevel(level);
        }
        
        // 퀘스트 필터링
        if (this.questFilterPanel) {
            this.questFilterPanel.filterByLevel(level);
        }
        
        // 레벨 변경 이벤트 발생
        this.eventBus.emit('level:changed', { level });
    }

    /**
     * 로딩 화면 숨김
     */
    hideLoading() {
        this.uiManager?.hidePageLoading();
    }

    /**
     * WebView 메시지 처리
     */
    handleWebViewMessage(message) {
        try {
            const data = JSON.parse(message);
            console.log('📨 WebView 메시지 수신:', data);

            switch (data.type) {
                case 'updatePosition':
                    this.updatePlayerPosition(data.position);
                    break;
                case 'switchMap':
                    this.switchMap(data.mapId);
                    break;
                case 'updateSettings':
                    this.updateSettings(data.settings);
                    break;
                default:
                    console.warn('⚠️ 알 수 없는 메시지 타입:', data.type);
            }
        } catch (error) {
            console.error('❌ WebView 메시지 처리 실패:', error);
        }
    }

    /**
     * 플레이어 위치 업데이트
     */
    updatePlayerPosition(position) {
        if (!position || !this.map || !this.coordinateSystem) return;

        try {
            const leafletCoords = this.coordinateSystem.gameToLeaflet(position.x, position.y);
            
            if (this.playerMarker) {
                this.playerMarker.setLatLng(leafletCoords);
            } else {
                this.playerMarker = L.marker(leafletCoords, {
                    icon: this.createPlayerIcon()
                }).addTo(this.layers.get('player'));
            }

            if (this.settings.autoCenter) {
                this.map.setView(leafletCoords, this.map.getZoom());
            }

            console.log(`👤 플레이어 위치 업데이트: [${leafletCoords.lat.toFixed(2)}, ${leafletCoords.lng.toFixed(2)}]`);
        } catch (error) {
            console.error('❌ 플레이어 위치 업데이트 실패:', error);
        }
    }

    /**
     * 플레이어 아이콘 생성
     */
    createPlayerIcon() {
        return L.divIcon({
            className: 'player-marker',
            html: '<div class="player-icon">👤</div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
    }

    /**
     * 지도 전환
     */
    async switchMap(mapId) {
        if (this.currentMapId === mapId) return;

        try {
            console.log(`🗺️ 지도 전환: ${this.currentMapId} → ${mapId}`);
            
            this.uiManager?.showPageLoading(`${mapId} 지도 로딩 중...`);
            
            // 기존 마커 정리
            this.clearAllMarkers();
            
            // 새 지도 데이터 로딩
            await this.dataLoader?.loadMapData(mapId);
            
            this.currentMapId = mapId;
            this.uiManager?.hidePageLoading();
            
            console.log(`✅ 지도 전환 완료: ${mapId}`);
        } catch (error) {
            console.error('❌ 지도 전환 실패:', error);
            this.uiManager?.showPageError('지도 전환에 실패했습니다.', error.message);
        }
    }

    /**
     * 모든 마커 제거
     */
    clearAllMarkers() {
        this.layers.forEach((layer, name) => {
            if (name !== 'player') {
                layer.clearLayers();
            }
        });
    }

    /**
     * 설정 업데이트
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        console.log('⚙️ 설정 업데이트됨:', this.settings);
        
        // 설정 변경 이벤트 발생
        this.eventBus.emit('settings:updated', this.settings);
    }

    /**
     * 정리 및 리소스 해제
     */
    dispose() {
        try {
            // 모듈들 정리
            if (this.dataLoader) {
                this.dataLoader.dispose();
                this.dataLoader = null;
            }

            if (this.uiManager) {
                this.uiManager.dispose();
                this.uiManager = null;
            }

            if (this.markerManager) {
                this.markerManager.dispose();
                this.markerManager = null;
            }

            // 지도 정리
            if (this.map) {
                this.map.remove();
                this.map = null;
            }
            
            if (this.coordinateSystem) {
                this.coordinateSystem.dispose();
                this.coordinateSystem = null;
            }
            
            // 기타 리소스 정리
            this.layers.clear();
            this.playerMarker = null;
            this.isInitialized = false;
            this.eventBus = null;
            
            console.log('🧹 TarkovMapApplication 정리 완료');
        } catch (error) {
            console.error('❌ 정리 중 오류:', error);
        }
    }

    /**
     * 전역 에러 핸들러 설정
     */
    setupGlobalErrorHandlers() {
        // JavaScript 런타임 에러 처리
        window.addEventListener('error', (event) => {
            this.handleGlobalError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });

        // Promise 거부 에러 처리
        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError({
                type: 'promise',
                message: event.reason?.message || '알 수 없는 Promise 에러',
                reason: event.reason
            });
        });

        console.log('✅ 전역 에러 핸들러 설정 완료');
    }

    /**
     * 전역 에러 핸들러
     */
    handleGlobalError(errorInfo) {
        console.error('🚨 [모듈화] 전역 에러 감지:', errorInfo);
        
        this.lastError = {
            ...errorInfo,
            timestamp: Date.now()
        };

        // 맵 관련 에러인지 확인
        if (this.isMapRelatedError(errorInfo)) {
            console.warn('🗺️ 맵 관련 에러로 판단됨');
            this.attemptMapRecovery(errorInfo);
        } else {
            console.warn('⚠️ 비맵 에러 - 기본 처리:', errorInfo.message);
        }
    }

    /**
     * 맵 관련 에러인지 판단
     */
    isMapRelatedError(errorInfo) {
        const mapKeywords = [
            'leaflet', 'map', 'coord', 'crs', 'tile', 'layer', 'bounds',
            'cannot read properties of undefined', 'l.', 'grid', 'marker',
            'polyline', 'latlng', 'transform', 'tarkovmapsystem', 'coordinatesystem'
        ];
        
        const errorText = (errorInfo.message || '').toLowerCase();
        const filename = (errorInfo.filename || '').toLowerCase();
        
        return mapKeywords.some(keyword => 
            errorText.includes(keyword.toLowerCase()) || 
            filename.includes('map')
        );
    }

    /**
     * 맵 복구 시도
     */
    async attemptMapRecovery(errorInfo) {
        if (!this.errorRecoveryEnabled) {
            console.log('📴 에러 복구 비활성화됨');
            return;
        }

        this.initializationAttempts++;
        
        if (this.initializationAttempts > this.maxInitializationAttempts) {
            console.error('❌ 최대 복구 시도 횟수 초과, 안전 모드로 전환');
            this.enableSafeMode();
            return;
        }

        console.log(`🔄 [모듈화] 맵 복구 시도 ${this.initializationAttempts}/${this.maxInitializationAttempts}`);
        
        try {
            // 기존 맵 정리
            if (this.map) {
                console.log('🧹 기존 맵 인스턴스 정리 중...');
                this.map.remove();
                this.map = null;
            }
            
            // 상태 초기화
            this.isInitialized = false;
            this.layers.clear();
            
            // 모듈 인스턴스 정리
            if (this.dataLoader) {
                this.dataLoader.dispose();
                this.dataLoader = null;
            }
            
            // 지연 후 재초기화 시도
            const delay = 1000 * this.initializationAttempts;
            console.log(`⏰ ${delay}ms 후 재시작...`);
            
            setTimeout(async () => {
                try {
                    await this.initialize();
                    console.log('✅ [모듈화] 맵 복구 성공!');
                    this.initializationAttempts = 0; // 성공 시 카운터 리셋
                } catch (recoveryError) {
                    console.error('❌ [모듈화] 맵 복구 실패:', recoveryError);
                }
            }, delay);
            
        } catch (error) {
            console.error('❌ 복구 과정에서 에러 발생:', error);
        }
    }

    /**
     * 안전 모드 활성화 (최소 기능만)
     */
    enableSafeMode() {
        console.log('🛡️ [모듈화] 안전 모드 활성화');
        
        this.errorRecoveryEnabled = false;
        
        try {
            if (!this.map) {
                console.log('⚡ 기본 맵 생성 중...');
                this.map = L.map('map', {
                    crs: L.CRS.Simple,
                    center: [0, 0],
                    zoom: 1,
                    minZoom: 1,
                    maxZoom: 3
                });
                
                // 기본 배경 추가
                const bounds = [[-500, -500], [500, 500]];
                L.rectangle(bounds, {
                    color: '#666666',
                    fillColor: '#333333',
                    fillOpacity: 0.3,
                    weight: 1
                }).addTo(this.map);
                
                this.map.fitBounds(bounds);
                console.log('✅ 안전 모드 맵 생성 완료');
            }
            
        } catch (error) {
            console.error('❌ 안전 모드 활성화 실패:', error);
            
            // DOM에 에러 메시지 표시
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = `
                <div style="
                    position: absolute; 
                    top: 50%; 
                    left: 50%; 
                    transform: translate(-50%, -50%);
                    background: rgba(255,0,0,0.9); 
                    color: white; 
                    padding: 20px; 
                    border-radius: 10px;
                    text-align: center;
                    font-family: Arial, sans-serif;
                    z-index: 10000;
                ">
                    <h3>🚨 지도 로딩 실패</h3>
                    <p>모듈화된 지도를 불러올 수 없습니다.</p>
                    <p>페이지를 새로고침해주세요.</p>
                </div>
            `;
            document.body.appendChild(errorDiv);
        }
    }

    /**
     * 에러 복구 강제 활성화 (디버깅용)
     */
    forceRecovery() {
        console.log('🔧 [모듈화] 강제 복구 시작');
        this.initializationAttempts = 0;
        this.errorRecoveryEnabled = true;
        this.attemptMapRecovery({ type: 'manual', message: '수동 복구 요청' });
    }
}

// 전역 함수로 노출 (C#에서 호출 가능)
window.TarkovMapApplication = TarkovMapApplication;

console.log('✅ Tarkov Map JavaScript 모듈 로드 완료 (리팩토링 버전)');