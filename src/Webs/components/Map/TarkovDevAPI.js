/**
 * Tarkov-Dev GraphQL API Client
 * tarkov.dev GraphQL API와 통신하여 실제 맵, 퀘스트, 아이템 데이터를 가져오는 클라이언트
 * 
 * Features:
 * - Maps 데이터 (스폰, 추출구, 보스, 루트 등)
 * - Quests 데이터 (퀘스트 목표, 위치, 아이템 등)
 * - 캐싱 시스템
 * - 에러 핸들링 및 폴백
 */

class TarkovDevAPI {
    constructor(options = {}) {
        this.apiUrl = options.apiUrl || 'https://api.tarkov.dev/graphql';
        this.language = options.language || 'en';
        this.gameMode = options.gameMode || 'regular';
        
        // 캐시 설정
        this.cache = new Map();
        this.cacheTimeout = options.cacheTimeout || 300000; // 5분
        
        // 요청 제한 설정
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000;
        
        console.log('TarkovDevAPI 클라이언트 초기화:', {
            apiUrl: this.apiUrl,
            language: this.language,
            gameMode: this.gameMode
        });
    }

    /**
     * GraphQL 쿼리 실행
     * @param {string} query - GraphQL 쿼리
     * @param {object} variables - 쿼리 변수
     * @param {boolean} useCache - 캐시 사용 여부
     * @returns {Promise<object>} API 응답 데이터
     */
    async executeQuery(query, variables = {}, useCache = true) {
        const cacheKey = this.generateCacheKey(query, variables);
        
        // 캐시 확인
        if (useCache) {
            const cachedData = this.getFromCache(cacheKey);
            if (cachedData) {
                console.log('캐시된 데이터 사용:', cacheKey);
                return cachedData;
            }
        }
        
        let lastError = null;
        
        // 재시도 로직
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`API 요청 시도 ${attempt}/${this.maxRetries}:`, this.apiUrl);
                
                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        query: query,
                        variables: variables
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP 에러 ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                // GraphQL 에러 확인
                if (data.errors) {
                    console.error('GraphQL 에러:', data.errors);
                    
                    // 부분적 데이터가 있는 경우 경고와 함께 반환
                    if (data.data) {
                        console.warn('부분적 데이터 반환:', data.data);
                        this.saveToCache(cacheKey, data.data);
                        return data.data;
                    }
                    
                    throw new Error(`GraphQL 에러: ${data.errors[0].message}`);
                }
                
                // 성공적인 응답 캐시 저장
                if (useCache && data.data) {
                    this.saveToCache(cacheKey, data.data);
                }
                
                console.log('API 요청 성공:', cacheKey);
                return data.data;
                
            } catch (error) {
                lastError = error;
                console.error(`API 요청 실패 (시도 ${attempt}):`, error.message);
                
                // 마지막 시도가 아니면 잠시 대기
                if (attempt < this.maxRetries) {
                    const delay = this.retryDelay * attempt; // 지수 백오프
                    console.log(`${delay}ms 후 재시도...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        // 모든 재시도 실패
        console.error('모든 API 요청 시도 실패:', lastError);
        throw new Error(`API 요청 실패: ${lastError.message}`);
    }

    /**
     * Maps 데이터 조회 (완전한 데이터)
     * @param {string} mapName - 맵 이름 (선택적, 모든 맵 또는 특정 맵)
     * @returns {Promise<object[]>} 맵 데이터 배열
     */
    async getMapsData(mapName = null) {
        const query = `
            query GetMapsData($lang: LanguageCode, $gameMode: GameMode) {
                maps(lang: $lang, gameMode: $gameMode) {
                    id
                    tarkovDataId
                    name
                    normalizedName
                    wiki
                    description
                    enemies
                    raidDuration
                    players
                    
                    # 스폰 포인트
                    spawns {
                        zoneName
                        position { x y z }
                        sides
                        categories
                    }
                    
                    # 추출구
                    extracts {
                        id
                        name
                        faction
                        position { x y z }
                        outline { x y z }
                        top
                        bottom
                        switches {
                            id
                            name
                        }
                    }
                    
                    # 보스 정보
                    bosses {
                        name
                        normalizedName
                        spawnChance
                        spawnTime
                        spawnTimeRandom
                        spawnTrigger
                        spawnLocations {
                            spawnKey
                            name
                            chance
                        }
                        escorts {
                            name
                            normalizedName
                            amount {
                                count
                                chance
                            }
                        }
                    }
                    
                    # 루트 컨테이너
                    lootContainers {
                        position { x y z }
                        lootContainer {
                            id
                            name
                            normalizedName
                        }
                    }
                    
                    # 자유 루트
                    lootLoose {
                        position { x y z }
                        items {
                            id
                            name
                            shortName
                        }
                    }
                    
                    # 위험 지역
                    hazards {
                        hazardType
                        name
                        position { x y z }
                        outline { x y z }
                        top
                        bottom
                    }
                    
                    # 자물쇠
                    locks {
                        lockType
                        needsPower
                        position { x y z }
                        outline { x y z }
                        top
                        bottom
                        key {
                            id
                            name
                        }
                    }
                    
                    # 스위치
                    switches {
                        id
                        name
                        switchType
                        position { x y z }
                        activatedBy {
                            id
                            name
                        }
                        activates {
                            operation
                            target {
                                __typename
                                ... on MapSwitch {
                                    id
                                    name
                                }
                                ... on MapExtract {
                                    id
                                    name
                                    faction
                                }
                            }
                        }
                    }
                    
                    # 고정 무기
                    stationaryWeapons {
                        position { x y z }
                        stationaryWeapon {
                            name
                            shortName
                        }
                    }
                }
            }
        `;

        const variables = {
            lang: this.getLanguageCode(this.language),
            gameMode: this.getGameModeCode(this.gameMode)
        };

        try {
            const data = await this.executeQuery(query, variables);
            let maps = data.maps || [];
            
            // 특정 맵 필터링
            if (mapName) {
                maps = maps.filter(map => 
                    map.normalizedName.toLowerCase() === mapName.toLowerCase()
                );
            }
            
            console.log(`맵 데이터 조회 완료: ${maps.length}개 맵`);
            return maps;
            
        } catch (error) {
            console.error('맵 데이터 조회 실패:', error);
            // 폴백 데이터 반환
            return this.getFallbackMapsData(mapName);
        }
    }

    /**
     * Quests 데이터 조회 (특정 맵 필터링 포함)
     * @param {string} mapName - 맵 이름으로 필터링 (선택적)
     * @returns {Promise<object[]>} 퀘스트 데이터 배열
     */
    async getQuestsData(mapName = null) {
        const query = `
            query GetQuestsData($lang: LanguageCode, $gameMode: GameMode) {
                tasks(lang: $lang, gameMode: $gameMode) {
                    id
                    tarkovDataId
                    name
                    normalizedName
                    
                    # 트레이더 정보
                    trader {
                        id
                        name
                        normalizedName
                    }
                    
                    # 맵 정보
                    map {
                        id
                        name
                        normalizedName
                    }
                    
                    experience
                    wikiLink
                    minPlayerLevel
                    
                    # 전제 조건
                    taskRequirements {
                        task {
                            id
                        }
                        status
                    }
                    
                    traderRequirements {
                        trader {
                            id
                            name
                        }
                        requirementType
                        compareMethod
                        value
                    }
                    
                    restartable
                    
                    # 퀘스트 목표
                    objectives {
                        __typename
                        id
                        type
                        description
                        maps {
                            id
                            name
                            normalizedName
                        }
                        optional
                        
                        # 기본 목표 (지역 기반)
                        ... on TaskObjectiveBasic {
                            zones {
                                id
                                map {
                                    id
                                    normalizedName
                                }
                                position { x y z }
                                outline { x y z }
                                top
                                bottom
                            }
                        }
                        
                        # 아이템 목표
                        ... on TaskObjectiveItem {
                            items {
                                id
                                name
                                shortName
                            }
                            count
                            foundInRaid
                            zones {
                                id
                                map {
                                    id
                                    normalizedName
                                }
                                position { x y z }
                                outline { x y z }
                                top
                                bottom
                            }
                        }
                        
                        # 마킹 목표
                        ... on TaskObjectiveMark {
                            markerItem {
                                id
                                name
                            }
                            zones {
                                id
                                map {
                                    id
                                    normalizedName
                                }
                                position { x y z }
                                outline { x y z }
                                top
                                bottom
                            }
                        }
                        
                        # 퀘스트 아이템 목표
                        ... on TaskObjectiveQuestItem {
                            questItem {
                                id
                                name
                                shortName
                                iconLink
                            }
                            possibleLocations {
                                map {
                                    id
                                    normalizedName
                                }
                                positions { x y z }
                            }
                            zones {
                                id
                                map {
                                    id
                                    normalizedName
                                }
                                position { x y z }
                                outline { x y z }
                                top
                                bottom
                            }
                            count
                        }
                        
                        # 사격 목표
                        ... on TaskObjectiveShoot {
                            targetNames
                            count
                            shotType
                            zoneNames
                            bodyParts
                            timeFromHour
                            timeUntilHour
                            zones {
                                id
                                map {
                                    id
                                    normalizedName
                                }
                                position { x y z }
                                outline { x y z }
                                top
                                bottom
                            }
                        }
                        
                        # 아이템 사용 목표
                        ... on TaskObjectiveUseItem {
                            useAny {
                                id
                                name
                            }
                            compareMethod
                            count
                            zoneNames
                            zones {
                                id
                                map {
                                    id
                                    normalizedName
                                }
                                position { x y z }
                                outline { x y z }
                                top
                                bottom
                            }
                        }
                        
                        # 추출 목표
                        ... on TaskObjectiveExtract {
                            exitStatus
                            exitName
                            count
                        }
                    }
                    
                    # 실패 조건
                    failConditions {
                        __typename
                        id
                        type
                        description
                        optional
                    }
                    
                    # 보상
                    startRewards {
                        items {
                            item {
                                id
                                name
                            }
                            count
                        }
                        traderStanding {
                            trader {
                                id
                                name
                            }
                            standing
                        }
                    }
                    
                    finishRewards {
                        items {
                            item {
                                id
                                name
                            }
                            count
                        }
                        traderStanding {
                            trader {
                                id
                                name
                            }
                            standing
                        }
                        skillLevelReward {
                            name
                            level
                        }
                    }
                    
                    factionName
                    kappaRequired
                    lightkeeperRequired
                    taskImageLink
                }
            }
        `;

        const variables = {
            lang: this.getLanguageCode(this.language),
            gameMode: this.getGameModeCode(this.gameMode)
        };

        try {
            const data = await this.executeQuery(query, variables);
            let quests = data.tasks || [];
            
            // 특정 맵과 관련된 퀘스트만 필터링
            if (mapName) {
                quests = this.filterQuestsByMap(quests, mapName);
            }
            
            console.log(`퀘스트 데이터 조회 완료: ${quests.length}개 퀘스트`);
            return quests;
            
        } catch (error) {
            console.error('퀘스트 데이터 조회 실패:', error);
            return []; // 빈 배열 반환
        }
    }

    /**
     * 특정 맵과 관련된 퀘스트 필터링
     * @param {object[]} quests - 전체 퀘스트 배열
     * @param {string} mapName - 맵 이름
     * @returns {object[]} 필터링된 퀘스트 배열
     */
    filterQuestsByMap(quests, mapName) {
        return quests.filter(quest => {
            // 퀘스트가 특정 맵에서 진행되는지 확인
            if (quest.map && quest.map.normalizedName === mapName.toLowerCase()) {
                return true;
            }
            
            // 목표 중에 해당 맵과 관련된 것이 있는지 확인
            return quest.objectives.some(objective => {
                // zones가 있는 목표들
                if (objective.zones) {
                    return objective.zones.some(zone => 
                        zone.map && zone.map.normalizedName === mapName.toLowerCase()
                    );
                }
                
                // possibleLocations가 있는 목표들
                if (objective.possibleLocations) {
                    return objective.possibleLocations.some(location => 
                        location.map && location.map.normalizedName === mapName.toLowerCase()
                    );
                }
                
                // maps가 있는 목표들
                if (objective.maps) {
                    return objective.maps.some(map => 
                        map.normalizedName === mapName.toLowerCase()
                    );
                }
                
                return false;
            });
        });
    }

    /**
     * Factory 맵 완전한 데이터 조회 (맵 + 퀘스트 통합)
     * @returns {Promise<object>} 통합된 Factory 데이터
     */
    async getFactoryCompleteData() {
        try {
            console.log('Factory 완전한 데이터 조회 시작...');
            
            // 병렬로 맵 데이터와 퀘스트 데이터 조회
            const [mapsData, questsData] = await Promise.all([
                this.getMapsData('factory'),
                this.getQuestsData('factory')
            ]);
            
            const factoryMap = mapsData[0]; // Factory 맵 데이터
            
            if (!factoryMap) {
                throw new Error('Factory 맵 데이터를 찾을 수 없습니다');
            }
            
            const completeData = {
                map: factoryMap,
                quests: questsData,
                lastUpdated: new Date().toISOString(),
                
                // 통계 정보
                statistics: {
                    spawns: factoryMap.spawns?.length || 0,
                    extracts: factoryMap.extracts?.length || 0,
                    bosses: factoryMap.bosses?.length || 0,
                    lootContainers: factoryMap.lootContainers?.length || 0,
                    hazards: factoryMap.hazards?.length || 0,
                    quests: questsData.length
                }
            };
            
            console.log('Factory 완전한 데이터 조회 완료:', completeData.statistics);
            return completeData;
            
        } catch (error) {
            console.error('Factory 완전한 데이터 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 캐시 키 생성
     * @param {string} query - GraphQL 쿼리
     * @param {object} variables - 변수
     * @returns {string} 캐시 키
     */
    generateCacheKey(query, variables) {
        const queryHash = this.simpleHash(query);
        const variablesHash = this.simpleHash(JSON.stringify(variables));
        return `${queryHash}_${variablesHash}`;
    }

    /**
     * 언어 코드 변환
     * @param {string} lang - 언어 코드
     * @returns {string} GraphQL LanguageCode enum 값
     */
    getLanguageCode(lang) {
        // tarkov-dev API의 실제 LanguageCode enum 값들
        const languageMap = {
            'en': 'en',
            'ko': 'ko', 
            'ru': 'ru',
            'de': 'de',
            'fr': 'fr',
            'es': 'es',
            'zh': 'zh',
            'ja': 'ja'
        };
        
        return languageMap[lang] || 'en';
    }

    /**
     * 게임 모드 코드 변환
     * @param {string} gameMode - 게임 모드
     * @returns {string} GraphQL GameMode enum 값
     */
    getGameModeCode(gameMode) {
        const gameModeMap = {
            'regular': 'regular',
            'hardcore': 'hardcore',
            'arena': 'arena'
        };
        
        return gameModeMap[gameMode] || 'regular';
    }

    /**
     * 간단한 해시 함수
     * @param {string} str - 해시할 문자열
     * @returns {string} 해시 값
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32비트 정수로 변환
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * 캐시에서 데이터 조회
     * @param {string} key - 캐시 키
     * @returns {object|null} 캐시된 데이터 또는 null
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        const now = Date.now();
        if (now - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }

    /**
     * 캐시에 데이터 저장
     * @param {string} key - 캐시 키
     * @param {object} data - 저장할 데이터
     */
    saveToCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        // 캐시 크기 제한 (최대 50개)
        if (this.cache.size > 50) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    /**
     * 캐시 클리어
     */
    clearCache() {
        this.cache.clear();
        console.log('API 캐시가 클리어되었습니다');
    }

    /**
     * 폴백 맵 데이터 (API 실패 시 사용)
     * @param {string} mapName - 맵 이름
     * @returns {object[]} 기본 맵 데이터
     */
    getFallbackMapsData(mapName = null) {
        console.warn('폴백 맵 데이터 사용');
        
        const fallbackMaps = [
            {
                id: 'factory-fallback',
                name: 'Factory',
                normalizedName: 'factory',
                description: 'Small indoor map (fallback data)',
                raidDuration: 20,
                players: '4-6',
                spawns: [],
                extracts: [],
                bosses: [],
                lootContainers: [],
                hazards: [],
                switches: []
            }
        ];
        
        if (mapName) {
            return fallbackMaps.filter(map => 
                map.normalizedName.toLowerCase() === mapName.toLowerCase()
            );
        }
        
        return fallbackMaps;
    }

    /**
     * API 상태 확인
     * @returns {Promise<object>} API 상태 정보
     */
    async checkApiStatus() {
        const simpleQuery = `
            query CheckStatus {
                maps(lang: en, gameMode: regular) {
                    id
                    name
                }
            }
        `;
        
        const startTime = Date.now();
        
        try {
            await this.executeQuery(simpleQuery, {}, false); // 캐시 사용 안함
            const responseTime = Date.now() - startTime;
            
            return {
                status: 'online',
                responseTime: responseTime,
                message: '정상 작동 중'
            };
        } catch (error) {
            return {
                status: 'offline',
                error: error.message,
                message: 'API 연결 실패'
            };
        }
    }
}

// 내보내기
if (typeof module !== 'undefined' && module.exports) {
    // Node.js 환경
    module.exports = TarkovDevAPI;
} else {
    // 브라우저 환경
    window.TarkovDevAPI = TarkovDevAPI;
}