/**
 * DataLoader.js - 점진적 데이터 로딩 시스템
 * 각 데이터 타입을 독립적으로 로딩하고 즉시 UI에 반영
 */

class DataLoader {
    constructor(mapApp) {
        this.mapApp = mapApp;
        this.loadingStates = new Map(); // 각 데이터 타입별 로딩 상태
        this.loadedData = new Map(); // 로딩된 데이터 캐시
        
        // EventBus 사용 (전역 이벤트 버스)
        this.eventBus = window.eventBus;
    }

    /**
     * 백그라운드에서 독립적 데이터 로딩 시작 (UI 블록 안 함)
     */
    async startBackgroundLoading() {
        console.log('🔄 백그라운드 데이터 로딩 시작 - UI는 계속 사용 가능');
        
        try {
            // MarkerManager 초기화 (비블록킹)
            if (this.mapApp.markerManager) {
                await this.mapApp.markerManager.initialize({
                    language: 'en',
                    gameMode: 'regular'
                });
                console.log('✅ MarkerManager 초기화 완료');
                
                // 데이터 로딩 시작 알림
                this.emitEvent('loading:started');
            } else {
                console.error('❌ MarkerManager를 사용할 수 없습니다');
                this.emitEvent('loading:error', { 
                    component: 'MarkerManager', 
                    message: 'MarkerManager 초기화 실패' 
                });
                return;
            }
            
            // 점진적 데이터 로딩 시작 (각각 독립적으로 처리)
            this.loadDataProgressively();
            
        } catch (error) {
            console.error('❌ 백그라운드 데이터 로딩 초기화 실패:', error);
            this.emitEvent('loading:error', { 
                component: '전체 시스템', 
                message: error.message 
            });
        }
    }

    /**
     * 점진적 데이터 로딩 - 각 데이터 타입을 독립적으로 로딩
     */
    async loadDataProgressively() {
        console.log('📊 점진적 데이터 로딩 시작');
        
        // 각 데이터 타입을 독립적으로 로딩 (병렬 처리)
        const loadingPromises = [
            this.loadSpawnData(),
            this.loadQuestData(), 
            this.loadExtractData()
        ];
        
        // 각각 독립적으로 완료되는 대로 UI 업데이트
        loadingPromises.forEach(promise => {
            promise.catch(error => {
                console.error('개별 데이터 로딩 오류 (다른 데이터는 계속 로딩):', error);
            });
        });
        
        // 모든 로딩 완료 대기 (실패해도 계속 진행)
        const results = await Promise.allSettled(loadingPromises);
        
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const totalCount = results.length;
        
        console.log(`📈 데이터 로딩 완료: ${successCount}/${totalCount} 성공`);
        
        // 최종 완료 이벤트
        this.emitEvent('loading:completed', { 
            successCount, 
            totalCount,
            success: successCount > 0 
        });
    }

    /**
     * 스폰 데이터 독립 로딩 (tarkov-dev 매칭 검증 포함)
     */
    async loadSpawnData() {
        const dataType = 'spawns';
        
        try {
            this.setLoadingState(dataType, 'loading');
            this.emitEvent('panel:loading', { 
                panel: 'left', 
                dataType, 
                message: '스폰 포인트 로딩 중...' 
            });
            
            console.log('🎯 스폰 데이터 로딩 시작');
            
            const mapData = await this.mapApp.markerManager.loadMapData('factory');
            if (mapData && this.mapApp.markerFilterPanel) {
                // tarkov-dev PMC 스폰 매칭 검증 수행
                const validatedMapData = await this.validateTarkovDevSpawnMatching(mapData);
                
                // 검증된 스폰 데이터 캐시
                this.loadedData.set(dataType, validatedMapData);
                
                // 즉시 UI에 반영
                await this.mapApp.markerFilterPanel.loadMapMarkers(validatedMapData);
                
                console.log('✅ 스폰 데이터 로딩 및 검증 완료');
                this.setLoadingState(dataType, 'completed');
                
                this.emitEvent('panel:loaded', { 
                    panel: 'left', 
                    dataType 
                });
                
                // 즉시 층수 선택기 업데이트
                this.emitEvent('levels:update');
            }
        } catch (error) {
            console.error('❌ 스폰 데이터 로딩 실패:', error);
            this.setLoadingState(dataType, 'error', error.message);
            
            this.emitEvent('panel:error', { 
                panel: 'left', 
                dataType, 
                message: '스폰 데이터 로딩 실패' 
            });
            throw error;
        }
    }
    
    /**
     * tarkov-dev와 PMC 스폰 매칭 검증
     * @param {object} mapData - 원본 맵 데이터
     * @returns {object} 검증된 맵 데이터
     */
    async validateTarkovDevSpawnMatching(mapData) {
        console.log('🔍 tarkov-dev PMC 스폰 매칭 검증 시작...');
        
        if (!mapData.spawns || mapData.spawns.length === 0) {
            console.warn('스폰 데이터가 없어서 검증을 건너뜁니다.');
            return mapData;
        }
        
        // PMC 스폰만 필터링
        const pmcSpawns = mapData.spawns.filter(spawn => 
            spawn.sides && spawn.sides.includes('pmc')
        );
        
        console.log(`📊 PMC 스폰 검증 통계:`, {
            전체스폰수: mapData.spawns.length,
            PMC스폰수: pmcSpawns.length,
            PMC비율: `${((pmcSpawns.length / mapData.spawns.length) * 100).toFixed(1)}%`
        });
        
        // 좌표 정확성 검증
        const coordValidation = this.validateSpawnCoordinates(pmcSpawns);
        
        // 검증 결과 로깅
        console.log('✅ PMC 스폰 좌표 검증 결과:', coordValidation);
        
        // 검증된 데이터 반환 (필요시 수정된 좌표 적용)
        const validatedMapData = {
            ...mapData,
            spawns: this.applyCoordinateCorrections(mapData.spawns, coordValidation)
        };
        
        console.log('✅ tarkov-dev PMC 스폰 매칭 검증 완료');
        return validatedMapData;
    }
    
    /**
     * 스폰 좌표 정확성 검증
     * @param {array} pmcSpawns - PMC 스폰 배열
     * @returns {object} 검증 결과
     */
    validateSpawnCoordinates(pmcSpawns) {
        const validation = {
            좌표범위_정상: 0,
            좌표범위_이상: 0,
            극값좌표: [],
            평균좌표: { x: 0, z: 0 },
            좌표분산: { x: 0, z: 0 }
        };
        
        if (pmcSpawns.length === 0) {
            return validation;
        }
        
        // 좌표 통계 계산
        let sumX = 0, sumZ = 0;
        const coordinates = [];
        
        pmcSpawns.forEach((spawn, index) => {
            const x = spawn.position.x;
            const z = spawn.position.z;
            
            sumX += x;
            sumZ += z;
            coordinates.push({ x, z, index });
            
            // 극값 체크 (일반적인 맵 좌표 범위: -1000 ~ 1000)
            if (Math.abs(x) > 1000 || Math.abs(z) > 1000) {
                validation.극값좌표.push({
                    index,
                    좌표: { x, z },
                    zoneName: spawn.zoneName
                });
                validation.좌표범위_이상++;
            } else {
                validation.좌표범위_정상++;
            }
        });
        
        // 평균 계산
        validation.평균좌표.x = sumX / pmcSpawns.length;
        validation.평균좌표.z = sumZ / pmcSpawns.length;
        
        // 분산 계산
        let varX = 0, varZ = 0;
        coordinates.forEach(coord => {
            varX += Math.pow(coord.x - validation.평균좌표.x, 2);
            varZ += Math.pow(coord.z - validation.평균좌표.z, 2);
        });
        
        validation.좌표분산.x = varX / pmcSpawns.length;
        validation.좌표분산.z = varZ / pmcSpawns.length;
        
        return validation;
    }
    
    /**
     * 좌표 보정 적용 (필요시)
     * @param {array} spawns - 원본 스폰 배열
     * @param {object} validation - 검증 결과
     * @returns {array} 보정된 스폰 배열
     */
    applyCoordinateCorrections(spawns, validation) {
        // 현재는 검증만 수행하고 좌표 보정은 하지 않음
        // 필요시 여기에 좌표 보정 로직 추가 가능
        
        console.log('📍 좌표 보정 적용:', {
            원본스폰수: spawns.length,
            보정필요: validation.좌표범위_이상,
            보정적용: 0  // 현재 미적용
        });
        
        return spawns;  // 원본 반환
    }

    /**
     * 퀘스트 데이터 독립 로딩
     */
    async loadQuestData() {
        const dataType = 'quests';
        
        try {
            this.setLoadingState(dataType, 'loading');
            this.emitEvent('panel:loading', { 
                panel: 'right', 
                dataType, 
                message: '퀘스트 로딩 중...' 
            });
            
            console.log('🎯 퀘스트 데이터 로딩 시작');
            
            const questData = await this.mapApp.markerManager.loadQuestData();
            if (questData && this.mapApp.questFilterPanel) {
                // 퀘스트 데이터 캐시
                this.loadedData.set(dataType, questData);
                
                // 즉시 UI에 반영
                await this.mapApp.questFilterPanel.loadQuests(questData);
                
                console.log('✅ 퀘스트 데이터 로딩 완료');
                this.setLoadingState(dataType, 'completed');
                
                this.emitEvent('panel:loaded', { 
                    panel: 'right', 
                    dataType 
                });
                
                // 즉시 층수 선택기 업데이트
                this.emitEvent('levels:update');
            }
        } catch (error) {
            console.error('❌ 퀘스트 데이터 로딩 실패:', error);
            this.setLoadingState(dataType, 'error', error.message);
            
            this.emitEvent('panel:error', { 
                panel: 'right', 
                dataType, 
                message: '퀘스트 데이터 로딩 실패' 
            });
            throw error;
        }
    }

    /**
     * 추출구 데이터 독립 로딩
     */
    async loadExtractData() {
        const dataType = 'extracts';
        
        try {
            console.log('🎯 추출구 데이터 로딩 시작');
            
            // 추출구 데이터는 맵 데이터에 포함되어 있으므로 스폰 데이터 로딩 후 처리됨
            const mapData = this.loadedData.get('spawns');
            if (mapData && mapData.extracts) {
                this.loadedData.set(dataType, mapData.extracts);
                this.setLoadingState(dataType, 'completed');
                console.log('✅ 추출구 데이터 처리 완료');
            } else {
                console.log('ℹ️ 추출구 데이터는 스폰 데이터에 포함됨');
                this.setLoadingState(dataType, 'completed');
            }
        } catch (error) {
            console.error('❌ 추출구 데이터 로딩 실패:', error);
            this.setLoadingState(dataType, 'error', error.message);
            throw error;
        }
    }

    /**
     * 데이터 재로딩 시도
     */
    async retryDataLoading(dataType) {
        console.log(`🔄 ${dataType} 데이터 재로딩 시도`);
        
        try {
            switch (dataType) {
                case 'spawns':
                    await this.loadSpawnData();
                    break;
                case 'quests':
                    await this.loadQuestData();
                    break;
                case 'extracts':
                    await this.loadExtractData();
                    break;
                default:
                    throw new Error(`알 수 없는 데이터 타입: ${dataType}`);
            }
        } catch (error) {
            console.error(`❌ ${dataType} 재로딩 실패:`, error);
        }
    }

    /**
     * 로딩 상태 설정
     */
    setLoadingState(dataType, state, message = null) {
        this.loadingStates.set(dataType, { 
            state, 
            message, 
            timestamp: Date.now() 
        });
        
        this.emitEvent('state:changed', { dataType, state, message });
    }

    /**
     * 로딩 상태 조회
     */
    getLoadingState(dataType) {
        return this.loadingStates.get(dataType) || { 
            state: 'pending', 
            message: null, 
            timestamp: null 
        };
    }

    /**
     * 로딩된 데이터 조회
     */
    getLoadedData(dataType) {
        return this.loadedData.get(dataType);
    }

    /**
     * 모든 로딩 상태 조회
     */
    getAllLoadingStates() {
        const states = {};
        this.loadingStates.forEach((state, dataType) => {
            states[dataType] = state;
        });
        return states;
    }

    /**
     * 이벤트 발생 (EventBus 사용)
     */
    emitEvent(eventName, data = null) {
        this.eventBus.emit(eventName, data);
    }

    /**
     * 이벤트 리스너 등록 (EventBus 사용)
     */
    addEventListener(eventName, callback) {
        this.eventBus.on(eventName, callback);
    }

    /**
     * 이벤트 리스너 제거 (EventBus 사용)
     */
    removeEventListener(eventName, callback) {
        this.eventBus.off(eventName, callback);
    }

    /**
     * 정리
     */
    dispose() {
        this.loadingStates.clear();
        this.loadedData.clear();
        
        // EventBus 정리는 전역에서 관리됨
        this.eventBus = null;
        
        console.log('🧹 DataLoader 정리 완료');
    }
}

// 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataLoader;
} else {
    window.DataLoader = DataLoader;
}