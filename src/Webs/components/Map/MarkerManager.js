/**
 * Marker Manager - 마커 관리 및 통합 시스템
 * 모든 마커 시스템(일반 마커, 퀘스트 마커)을 통합 관리하고
 * 실제 tarkov-dev API 데이터와 연동하는 중앙 관리자
 */

class MarkerManager {
    constructor(mapApplication) {
        this.mapApp = mapApplication;
        this.api = null;
        this.markerFilterPanel = null;
        this.questFilterPanel = null;
        
        // 데이터 캐시
        this.mapData = null;
        this.questData = [];
        this.currentMapName = 'factory';
        
        // 초기화 상태
        this.isInitialized = false;
        this.isLoading = false;
        
        // 이벤트 리스너들
        this.eventListeners = new Map();
        
        console.log('MarkerManager 생성됨');
    }

    /**
     * 마커 매니저 초기화
     * @param {object} options - 초기화 옵션
     */
    async initialize(options = {}) {
        try {
            console.log('MarkerManager 초기화 시작...');
            
            if (this.isInitialized) {
                console.warn('MarkerManager는 이미 초기화되었습니다');
                return;
            }
            
            this.showLoadingState('시스템 초기화 중...');
            
            // API 클라이언트 초기화
            this.api = new TarkovDevAPI({
                apiUrl: options.apiUrl || 'https://api.tarkov.dev/graphql',
                language: options.language || 'en',
                gameMode: options.gameMode || 'regular',
                cacheTimeout: options.cacheTimeout || 300000
            });
            
            // 이벤트 핸들러 설정
            this.setupEventHandlers();
            
            this.hideLoadingState();
            this.isInitialized = true;
            
            console.log('MarkerManager 초기화 완료');
            
            // 초기화 완료 이벤트 발생
            this.emitEvent('initialized', { success: true });
            
        } catch (error) {
            console.error('MarkerManager 초기화 실패:', error);
            this.showErrorState('시스템 초기화 실패: ' + error.message);
            this.emitEvent('initialized', { success: false, error: error.message });
        }
    }

    /**
     * 퀘스트 데이터만 별도로 로드하는 메서드
     */
    async loadQuestData() {
        try {
            console.log('퀘스트 데이터 로딩 시작...');
            
            const questData = await this.api.getQuestsData('factory');
            
            this.questData = questData || [];
            console.log(`퀘스트 데이터 로딩 완료: ${this.questData.length}개 퀘스트`);
            
            return this.questData;
            
        } catch (error) {
            console.error('퀘스트 데이터 로딩 실패:', error);
            return [];
        }
    }

    /**
     * 이벤트 핸들러 설정
     */
    setupEventHandlers() {
        // API 상태 변경 감지 (주기적으로 체크)
        setInterval(() => {
            this.checkApiStatus();
        }, 60000); // 1분마다

        // 맵 변경 이벤트 (MapApplication에서 호출될 때)
        if (this.mapApp) {
            // 맵 애플리케이션에서 맵 변경 이벤트를 받을 준비
            this.mapApp.onMapChange = (mapName) => {
                this.handleMapChange(mapName);
            };
        }

        console.log('이벤트 핸들러 설정 완료');
    }


    /**
     * 맵 데이터 로드
     * @param {string} mapName - 맵 이름
     */
    async loadMapData(mapName) {
        try {
            if (this.isLoading) {
                console.warn('이미 데이터를 로드 중입니다');
                return;
            }
            
            this.isLoading = true;
            this.currentMapName = mapName;
            
            console.log(`맵 데이터 로딩 시작: ${mapName}`);
            
            // 단계별 로딩 상태 표시
            this.showLoadingState('맵 정보 가져오는 중...');
            
            // 맵 데이터 로드 (퀘스트는 별도 메서드로 분리)
            const mapData = await this.api.getMapsData(mapName);
            
            // 데이터 검증
            if (!mapData || mapData.length === 0) {
                throw new Error(`${mapName} 맵 데이터를 찾을 수 없습니다`);
            }
            
            const currentMapData = mapData[0];
            this.mapData = currentMapData;
            
            console.log(`맵 데이터 로드 완료:`, {
                mapName: currentMapData.name,
                spawns: currentMapData.spawns?.length || 0,
                extracts: currentMapData.extracts?.length || 0,
                bosses: currentMapData.bosses?.length || 0
            });
            
            // 데이터 반환 (패널 연결은 Map.js에서 처리)
            const result = currentMapData;
            
            // 로딩 완료
            this.hideLoadingState();
            this.isLoading = false;
            
            // 데이터 로드 완료 이벤트 발생
            this.emitEvent('dataLoaded', {
                mapName: mapName,
                mapData: currentMapData
            });
            
            return result;
            
        } catch (error) {
            console.error(`맵 데이터 로드 실패 (${mapName}):`, error);
            this.showErrorState(`맵 데이터 로드 실패: ${error.message}`);
            this.isLoading = false;
            
            // 에러 이벤트 발생
            this.emitEvent('dataLoadError', { mapName: mapName, error: error.message });
            
            throw error;
        }
    }


    /**
     * 맵 변경 처리
     * @param {string} newMapName - 새 맵 이름
     */
    async handleMapChange(newMapName) {
        try {
            if (newMapName === this.currentMapName) {
                console.log('같은 맵으로 변경 시도됨');
                return;
            }
            
            console.log(`맵 변경: ${this.currentMapName} -> ${newMapName}`);
            
            // 새 맵 데이터 로드
            await this.loadMapData(newMapName);
            
            console.log('맵 변경 완료');
            
        } catch (error) {
            console.error('맵 변경 실패:', error);
            this.showErrorState(`맵 변경 실패: ${error.message}`);
        }
    }

    /**
     * API 상태 확인
     */
    async checkApiStatus() {
        try {
            const status = await this.api.checkApiStatus();
            
            // 연결 상태에 따라 UI 업데이트
            if (this.mapApp?.updateConnectionStatus) {
                if (status.status === 'online') {
                    this.mapApp.updateConnectionStatus('online', '데이터 서버 연결됨');
                } else {
                    this.mapApp.updateConnectionStatus('offline', '데이터 서버 연결 실패');
                }
            }
            
            // 상태 변경 이벤트 발생
            this.emitEvent('apiStatusChanged', status);
            
        } catch (error) {
            console.error('API 상태 확인 실패:', error);
            
            if (this.mapApp?.updateConnectionStatus) {
                this.mapApp.updateConnectionStatus('error', 'API 연결 오류');
            }
        }
    }

    /**
     * 패널 표시/숨김 제어
     * @param {string} panelType - 'markers' 또는 'quests'
     * @param {boolean} show - 표시 여부
     */
    togglePanel(panelType, show = null) {
        switch (panelType) {
            case 'markers':
                if (this.markerFilterPanel) {
                    if (show === null) {
                        this.markerFilterPanel.togglePanel();
                    } else if (show) {
                        this.markerFilterPanel.showPanel();
                    } else {
                        this.markerFilterPanel.hidePanel();
                    }
                }
                break;
                
            case 'quests':
                if (this.questFilterPanel) {
                    if (show === null) {
                        this.questFilterPanel.togglePanel();
                    } else if (show) {
                        this.questFilterPanel.showPanel();
                    } else {
                        this.questFilterPanel.hidePanel();
                    }
                }
                break;
                
            case 'both':
                this.togglePanel('markers', show);
                this.togglePanel('quests', show);
                break;
                
            default:
                console.warn(`알 수 없는 패널 타입: ${panelType}`);
        }
    }

    /**
     * 데이터 새로고침
     * @param {boolean} clearCache - 캐시 클리어 여부
     */
    async refreshData(clearCache = false) {
        try {
            console.log('데이터 새로고침 시작...');
            
            if (clearCache && this.api) {
                this.api.clearCache();
            }
            
            // 현재 맵 데이터 다시 로드
            await this.loadMapData(this.currentMapName);
            
            console.log('데이터 새로고침 완료');
            
            // 새로고침 완료 이벤트 발생
            this.emitEvent('dataRefreshed', { mapName: this.currentMapName });
            
        } catch (error) {
            console.error('데이터 새로고침 실패:', error);
            this.showErrorState(`데이터 새로고침 실패: ${error.message}`);
            
            // 에러 이벤트 발생
            this.emitEvent('refreshError', { error: error.message });
        }
    }

    /**
     * 통계 정보 반환
     * @returns {object} 통계 정보
     */
    getStatistics() {
        const stats = {
            currentMap: this.currentMapName,
            isLoading: this.isLoading,
            isInitialized: this.isInitialized,
            mapData: null,
            questData: null,
            markerCounts: {},
            questCounts: {}
        };

        if (this.mapData) {
            stats.mapData = {
                name: this.mapData.name,
                spawns: this.mapData.spawns?.length || 0,
                extracts: this.mapData.extracts?.length || 0,
                bosses: this.mapData.bosses?.length || 0,
                lootContainers: this.mapData.lootContainers?.length || 0,
                hazards: this.mapData.hazards?.length || 0,
                switches: this.mapData.switches?.length || 0
            };
        }

        if (this.questData) {
            stats.questData = {
                total: this.questData.length,
                byTrader: {}
            };

            // 트레이더별 퀘스트 수 계산
            this.questData.forEach(quest => {
                const trader = quest.trader?.normalizedName || 'unknown';
                stats.questData.byTrader[trader] = (stats.questData.byTrader[trader] || 0) + 1;
            });
        }

        return stats;
    }

    /**
     * 검색 기능
     * @param {string} query - 검색어
     * @param {string} type - 검색 타입 ('all', 'markers', 'quests')
     * @returns {object} 검색 결과
     */
    search(query, type = 'all') {
        const results = {
            markers: [],
            quests: [],
            total: 0
        };

        if (!query || query.length < 2) {
            return results;
        }

        const searchQuery = query.toLowerCase();

        // 마커 검색 (맵 데이터에서)
        if ((type === 'all' || type === 'markers') && this.mapData) {
            // 스폰 포인트 검색
            if (this.mapData.spawns) {
                this.mapData.spawns.forEach(spawn => {
                    if (spawn.zoneName?.toLowerCase().includes(searchQuery)) {
                        results.markers.push({
                            type: 'spawn',
                            name: spawn.zoneName,
                            data: spawn
                        });
                    }
                });
            }

            // 추출구 검색
            if (this.mapData.extracts) {
                this.mapData.extracts.forEach(extract => {
                    if (extract.name?.toLowerCase().includes(searchQuery)) {
                        results.markers.push({
                            type: 'extract',
                            name: extract.name,
                            data: extract
                        });
                    }
                });
            }

            // 보스 검색
            if (this.mapData.bosses) {
                this.mapData.bosses.forEach(boss => {
                    if (boss.name?.toLowerCase().includes(searchQuery)) {
                        results.markers.push({
                            type: 'boss',
                            name: boss.name,
                            data: boss
                        });
                    }
                });
            }
        }

        // 퀘스트 검색
        if ((type === 'all' || type === 'quests') && this.questData) {
            this.questData.forEach(quest => {
                const questName = quest.name?.toLowerCase() || '';
                const traderName = quest.trader?.name?.toLowerCase() || '';
                const objectives = quest.objectives?.map(obj => obj.description?.toLowerCase() || '').join(' ') || '';

                if (questName.includes(searchQuery) || traderName.includes(searchQuery) || objectives.includes(searchQuery)) {
                    results.quests.push({
                        type: 'quest',
                        name: quest.name,
                        trader: quest.trader?.name,
                        data: quest
                    });
                }
            });
        }

        results.total = results.markers.length + results.quests.length;

        console.log(`검색 완료 (${query}): ${results.total}개 결과`);
        return results;
    }

    /**
     * 내보내기 기능 (설정 및 선택된 퀘스트)
     * @returns {object} 내보낼 데이터
     */
    exportSettings() {
        const exportData = {
            timestamp: new Date().toISOString(),
            currentMap: this.currentMapName,
            version: '1.0',
            markerFilters: {},
            questSelections: {},
            panelStates: {}
        };

        // 마커 필터 상태
        if (this.markerFilterPanel) {
            exportData.markerFilters = this.markerFilterPanel.filterState;
        }

        // 퀘스트 선택 상태
        if (this.questFilterPanel) {
            exportData.questSelections = {
                selectedQuests: Array.from(this.questFilterPanel.filterState.selectedQuests),
                showOnlyActive: this.questFilterPanel.filterState.showOnlyActive,
                selectedTraders: Array.from(this.questFilterPanel.filterState.selectedTraders)
            };
        }

        // 패널 상태
        exportData.panelStates = {
            markersVisible: this.markerFilterPanel?.isVisible || false,
            questsVisible: this.questFilterPanel?.isVisible || false
        };

        console.log('설정 내보내기 완료');
        return exportData;
    }

    /**
     * 가져오기 기능 (설정 복원)
     * @param {object} importData - 가져올 데이터
     */
    importSettings(importData) {
        try {
            console.log('설정 가져오기 시작...');

            if (!importData || importData.version !== '1.0') {
                throw new Error('지원되지 않는 설정 파일 형식입니다');
            }

            // 마커 필터 복원
            if (importData.markerFilters && this.markerFilterPanel) {
                this.markerFilterPanel.filterState = { ...this.markerFilterPanel.filterState, ...importData.markerFilters };
                this.markerFilterPanel.applyFilters();
            }

            // 퀘스트 선택 복원
            if (importData.questSelections && this.questFilterPanel) {
                this.questFilterPanel.filterState.selectedQuests = new Set(importData.questSelections.selectedQuests || []);
                this.questFilterPanel.filterState.showOnlyActive = importData.questSelections.showOnlyActive !== undefined ? 
                    importData.questSelections.showOnlyActive : true;
                this.questFilterPanel.filterState.selectedTraders = new Set(importData.questSelections.selectedTraders || []);
                this.questFilterPanel.applyFilters();
            }

            // 패널 상태 복원
            if (importData.panelStates) {
                this.togglePanel('markers', importData.panelStates.markersVisible);
                this.togglePanel('quests', importData.panelStates.questsVisible);
            }

            console.log('설정 가져오기 완료');
            
            // 가져오기 완료 이벤트 발생
            this.emitEvent('settingsImported', { success: true });

        } catch (error) {
            console.error('설정 가져오기 실패:', error);
            this.emitEvent('settingsImported', { success: false, error: error.message });
            throw error;
        }
    }

    /**
     * 로딩 상태 표시
     * @param {string} message - 로딩 메시지
     */
    showLoadingState(message) {
        console.log(`로딩: ${message}`);
        
        if (this.mapApp?.showLoading) {
            this.mapApp.showLoading();
        }

        // 로딩 상태 이벤트 발생
        this.emitEvent('loadingStateChanged', { isLoading: true, message: message });
    }

    /**
     * 로딩 상태 숨김
     */
    hideLoadingState() {
        if (this.mapApp?.hideLoading) {
            this.mapApp.hideLoading();
        }

        // 로딩 상태 이벤트 발생
        this.emitEvent('loadingStateChanged', { isLoading: false });
    }

    /**
     * 에러 상태 표시
     * @param {string} message - 에러 메시지
     */
    showErrorState(message) {
        console.error(`에러: ${message}`);
        
        if (this.mapApp?.showError) {
            this.mapApp.showError(message);
        }

        // 에러 상태 이벤트 발생
        this.emitEvent('errorStateChanged', { hasError: true, message: message });
    }

    /**
     * 에러 상태 숨김
     */
    hideErrorState() {
        if (this.mapApp?.hideError) {
            this.mapApp.hideError();
        }

        // 에러 상태 이벤트 발생
        this.emitEvent('errorStateChanged', { hasError: false });
    }

    /**
     * 이벤트 리스너 추가
     * @param {string} eventName - 이벤트 이름
     * @param {function} callback - 콜백 함수
     */
    addEventListener(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        
        this.eventListeners.get(eventName).push(callback);
    }

    /**
     * 이벤트 리스너 제거
     * @param {string} eventName - 이벤트 이름
     * @param {function} callback - 콜백 함수
     */
    removeEventListener(eventName, callback) {
        if (this.eventListeners.has(eventName)) {
            const listeners = this.eventListeners.get(eventName);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * 이벤트 발생
     * @param {string} eventName - 이벤트 이름
     * @param {object} data - 이벤트 데이터
     */
    emitEvent(eventName, data) {
        if (this.eventListeners.has(eventName)) {
            const listeners = this.eventListeners.get(eventName);
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`이벤트 핸들러 오류 (${eventName}):`, error);
                }
            });
        }
    }

    /**
     * 리소스 정리
     */
    dispose() {
        console.log('MarkerManager 정리 시작...');
        
        // 패널들 정리
        if (this.markerFilterPanel) {
            this.markerFilterPanel.dispose();
            this.markerFilterPanel = null;
        }
        
        if (this.questFilterPanel) {
            this.questFilterPanel.dispose();
            this.questFilterPanel = null;
        }
        
        // API 캐시 클리어
        if (this.api) {
            this.api.clearCache();
            this.api = null;
        }
        
        // 이벤트 리스너 정리
        this.eventListeners.clear();
        
        // 데이터 클리어
        this.mapData = null;
        this.questData = [];
        
        this.isInitialized = false;
        this.isLoading = false;
        
        console.log('MarkerManager 정리 완료');
    }
}

// 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkerManager;
} else {
    window.MarkerManager = MarkerManager;
}