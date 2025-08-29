/**
 * Quest Filter Panel - Tarkov-dev Style Level Selector and Quest List
 * 오른쪽 패널에 표시되는 레벨 선택기와 퀘스트 리스트 시스템
 */

class QuestFilterPanel {
    constructor(containerId, mapApplication) {
        this.containerId = containerId;
        this.mapApp = mapApplication;
        this.questsData = [];
        this.questLayers = new Map();
        this.selectedQuests = new Set();
        
        // 레벨 선택 상태
        this.levelFilter = {
            min: 1,
            max: 79,
            current: [1, 79]
        };
        
        // 퀘스트 필터 상태
        this.filterState = {
            searchQuery: '',
            selectedQuests: new Set(),
            questStates: new Map() // quest ID -> state mapping
        };

        // 퀘스트 상태 정의
        this.QuestState = {
            LOCKED: 'locked',       // 잠김 (회색)
            AVAILABLE: 'available', // 수락 가능 (파란색)
            ACTIVE: 'active',       // 진행 중 (노란색)
            COMPLETED: 'completed'  // 완료 (녹색)
        };

        this.initialize();
    }

    /**
     * 패널 초기화
     */
    async initialize() {
        try {
            console.log('QuestFilterPanel 초기화 시작...');
            
            // UI 생성
            this.createPanelUI();
            
            // 이벤트 핸들러 설정
            this.setupEventHandlers();
            
            // 레이어 그룹 초기화
            this.initializeLayers();
            
            console.log('QuestFilterPanel 초기화 완료');
            
        } catch (error) {
            console.error('QuestFilterPanel 초기화 실패:', error);
        }
    }

    /**
     * 패널 UI 생성
     */
    createPanelUI() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            throw new Error(`Container element '${this.containerId}' not found`);
        }

        const panelHTML = `
            <!-- Level Selector Section -->
            <div class="level-selector">
                <h3>Level</h3>
                <div class="level-range">
                    <input type="number" id="level-min" class="level-input" min="1" max="79" value="1">
                    <span>-</span>
                    <input type="number" id="level-max" class="level-input" min="1" max="79" value="79">
                </div>
                <input type="range" id="level-slider" class="level-slider" 
                       min="1" max="79" value="79" step="1">
                <div class="level-info">
                    <span>Currently showing quests for levels <span id="level-display">1-79</span></span>
                </div>
            </div>

            <!-- Quest List Section -->
            <div class="quest-list-container">
                <div class="quest-list-header">
                    <h3>Factory Quests</h3>
                    <div class="quest-search">
                        <input type="text" id="quest-search" placeholder="Search quests..." class="search-input">
                    </div>
                </div>
                
                <div class="quest-list" id="quest-list">
                    <!-- Dynamic quest items will be inserted here -->
                </div>
                
                <div class="quest-summary">
                    <span id="quest-count">0 quests available</span>
                    <span id="selected-count">0 selected</span>
                </div>
            </div>
        `;

        container.innerHTML = panelHTML;
    }

    /**
     * 이벤트 핸들러 설정
     */
    setupEventHandlers() {
        // 레벨 입력 필드 이벤트
        const levelMinInput = document.getElementById('level-min');
        const levelMaxInput = document.getElementById('level-max');
        const levelSlider = document.getElementById('level-slider');

        if (levelMinInput) {
            levelMinInput.addEventListener('change', () => {
                this.updateLevelRange();
            });
        }

        if (levelMaxInput) {
            levelMaxInput.addEventListener('change', () => {
                this.updateLevelRange();
            });
        }

        if (levelSlider) {
            levelSlider.addEventListener('input', (e) => {
                const maxLevel = parseInt(e.target.value);
                levelMaxInput.value = maxLevel;
                this.updateLevelRange();
            });
        }

        // 퀘스트 검색 이벤트
        const searchInput = document.getElementById('quest-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterState.searchQuery = e.target.value.toLowerCase();
                this.filterQuestList();
            });
        }
    }

    /**
     * 레벨 범위 업데이트
     */
    updateLevelRange() {
        const minInput = document.getElementById('level-min');
        const maxInput = document.getElementById('level-max');
        const slider = document.getElementById('level-slider');
        const display = document.getElementById('level-display');

        let min = parseInt(minInput.value);
        let max = parseInt(maxInput.value);

        // 범위 유효성 검사
        if (min > max) {
            min = max;
            minInput.value = min;
        }

        if (max < min) {
            max = min;
            maxInput.value = max;
        }

        // 슬라이더 업데이트
        slider.value = max;

        // 현재 범위 저장
        this.levelFilter.current = [min, max];

        // 디스플레이 업데이트
        if (display) {
            display.textContent = `${min}-${max}`;
        }

        // 퀘스트 목록 필터링
        this.filterQuestList();

        console.log(`레벨 범위 업데이트: ${min}-${max}`);
    }

    /**
     * 퀘스트 데이터 로드
     * @param {Array} questsData - API에서 가져온 퀘스트 데이터
     */
    async loadQuests(questsData) {
        try {
            console.log('퀘스트 데이터 로딩 시작...', questsData);

            this.questsData = questsData || [];
            
            // Factory 맵과 관련된 퀘스트만 필터링
            this.questsData = this.questsData.filter(quest => {
                return this.isFactoryQuest(quest);
            });
            
            // 퀘스트 데이터에서 층수 정보 분석
            this.analyzeQuestLevels();

            // 퀘스트 목록 렌더링
            this.renderQuestList();

            // 퀘스트 마커 생성
            this.createQuestMarkers();

            // 카운트 업데이트
            this.updateQuestCounts();

            console.log(`퀘스트 데이터 로딩 완료: ${this.questsData.length}개 퀘스트`);

            // 층수 선택기 UI 업데이트 (퀘스트 로딩 완료 후)
            if (this.mapApp && this.mapApp.updateLevelSelector) {
                this.mapApp.updateLevelSelector();
                console.log('🏢 퀘스트 로딩 완료 후 층수 선택기 업데이트');
            }

        } catch (error) {
            console.error('퀘스트 데이터 로딩 실패:', error);
        }
    }

    /**
     * 퀘스트 데이터에서 층수 정보 분석
     */
    analyzeQuestLevels() {
        console.log('🎯 퀘스트 층수 정보 분석 시작...');
        
        const levelDistribution = {};
        let totalZones = 0;
        
        this.questsData.forEach((quest, questIndex) => {
            if (!quest.objectives) return;
            
            quest.objectives.forEach((objective, objIndex) => {
                if (!objective.zones) return;
                
                objective.zones.forEach((zone, zoneIndex) => {
                    if (!zone.position) return;
                    
                    const y = zone.position.y;
                    const roundedY = Math.round(y);
                    
                    levelDistribution[roundedY] = (levelDistribution[roundedY] || 0) + 1;
                    totalZones++;
                    
                    // 처음 몇 개 샘플 출력
                    if (questIndex < 2 && objIndex < 2 && zoneIndex < 2) {
                        console.log(`퀘스트 존 샘플: ${quest.name} - 목표 ${objIndex} - 존 ${zoneIndex}`, {
                            position: zone.position,
                            level: roundedY
                        });
                    }
                });
            });
        });
        
        if (totalZones > 0) {
            console.log('🏢 퀘스트 존 층수 분포:', levelDistribution);
            const discoveredLevels = Object.keys(levelDistribution).sort((a, b) => a - b);
            console.log('🏢 퀘스트 발견된 층수들:', discoveredLevels);
            console.log('📊 총 퀘스트 존 수:', totalZones);
            
            // 발견된 층수들을 Map 클래스에 등록
            discoveredLevels.forEach(level => {
                this.mapApp.addAvailableLevel(level);
            });
        } else {
            console.log('⚠️ 퀘스트 존에서 층수 정보를 찾을 수 없습니다');
        }
    }

    /**
     * Factory 맵 관련 퀘스트 판별
     * @param {Object} quest - 퀘스트 객체
     * @returns {boolean} Factory 맵 관련 여부
     */
    isFactoryQuest(quest) {
        if (!quest.objectives) return false;

        // 목표에서 Factory 맵 관련 위치를 찾기
        const factoryKeywords = ['factory', 'завод'];
        
        return quest.objectives.some(objective => {
            // 위치 정보에서 Factory 확인
            if (objective.maps) {
                return objective.maps.some(map => 
                    factoryKeywords.some(keyword => 
                        map.normalizedName?.toLowerCase().includes(keyword)
                    )
                );
            }
            
            // 설명에서 Factory 키워드 확인
            if (objective.description) {
                return factoryKeywords.some(keyword =>
                    objective.description.toLowerCase().includes(keyword)
                );
            }
            
            return false;
        });
    }

    /**
     * 퀘스트 목록 렌더링
     */
    renderQuestList() {
        const questList = document.getElementById('quest-list');
        if (!questList) return;

        questList.innerHTML = '';

        // 현재 필터에 맞는 퀘스트들만 표시
        const filteredQuests = this.getFilteredQuests();

        filteredQuests.forEach(quest => {
            const questItem = this.createQuestItem(quest);
            questList.appendChild(questItem);
        });

        console.log(`퀘스트 목록 렌더링 완료: ${filteredQuests.length}개 표시`);
    }

    /**
     * 필터링된 퀘스트 목록 반환
     * @returns {Array} 필터링된 퀘스트 배열
     */
    getFilteredQuests() {
        return this.questsData.filter(quest => {
            // 레벨 범위 필터
            const [minLevel, maxLevel] = this.levelFilter.current;
            const questLevel = quest.minPlayerLevel || 1;
            
            if (questLevel < minLevel || questLevel > maxLevel) {
                return false;
            }

            // 검색 쿼리 필터
            if (this.filterState.searchQuery) {
                const query = this.filterState.searchQuery;
                const questName = (quest.name || '').toLowerCase();
                const traderName = (quest.trader?.name || '').toLowerCase();
                
                if (!questName.includes(query) && !traderName.includes(query)) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * 개별 퀘스트 아이템 생성
     * @param {Object} quest - 퀘스트 객체
     * @returns {HTMLElement} 퀘스트 아이템 DOM 요소
     */
    createQuestItem(quest) {
        const questItem = document.createElement('div');
        questItem.className = 'quest-simple-item';
        questItem.dataset.questId = quest.id;

        const isSelected = this.selectedQuests.has(quest.id);
        const questState = this.getQuestState(quest);
        const questLevel = quest.minPlayerLevel || 1;
        const traderName = quest.trader?.name || 'Unknown';

        questItem.innerHTML = `
            <input type="checkbox" ${isSelected ? 'checked' : ''} 
                   data-quest-id="${quest.id}">
            <div class="quest-simple-name">${quest.name || 'Unnamed Quest'}</div>
            <div class="quest-simple-level">Lv.${questLevel}</div>
            <div class="quest-trader">${traderName}</div>
        `;

        // 퀘스트 상태에 따른 스타일링
        questItem.classList.add(`quest-${questState}`);

        // 체크박스 이벤트 리스너
        const checkbox = questItem.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', (e) => {
            const questId = e.target.dataset.questId;
            const isChecked = e.target.checked;
            
            if (isChecked) {
                this.selectedQuests.add(questId);
            } else {
                this.selectedQuests.delete(questId);
            }
            
            this.updateQuestMarkers();
            this.updateQuestCounts();
        });

        // 퀘스트 아이템 클릭 이벤트
        questItem.addEventListener('click', (e) => {
            // 체크박스 클릭은 이미 처리됨
            if (e.target.type === 'checkbox') return;
            
            // 퀘스트 상세 정보 표시 (추후 구현)
            this.showQuestDetails(quest);
        });

        return questItem;
    }

    /**
     * 퀘스트 상태 확인
     * @param {Object} quest - 퀘스트 객체
     * @returns {string} 퀘스트 상태
     */
    getQuestState(quest) {
        // 실제 게임 상태는 C#에서 받아와야 함
        // 임시로 레벨 기반으로 상태 결정
        const questLevel = quest.minPlayerLevel || 1;
        const currentLevel = 30; // 임시 플레이어 레벨
        
        if (questLevel > currentLevel + 5) {
            return this.QuestState.LOCKED;
        } else if (questLevel > currentLevel) {
            return this.QuestState.AVAILABLE;
        } else {
            return this.QuestState.ACTIVE;
        }
    }

    /**
     * 퀘스트 목록 필터링
     */
    filterQuestList() {
        this.renderQuestList();
        this.updateQuestCounts();
    }

    /**
     * 퀘스트 마커 생성
     */
    createQuestMarkers() {
        // 기존 마커 클리어
        this.clearQuestMarkers();

        let markerCount = 0;

        this.questsData.forEach(quest => {
            if (!quest.objectives) return;

            quest.objectives.forEach((objective, objIndex) => {
                if (!objective.maps) return;

                objective.maps.forEach(map => {
                    if (map.positions && map.positions.length > 0) {
                        map.positions.forEach((position, posIndex) => {
                            const marker = this.createQuestMarker(quest, objective, position, objIndex, posIndex);
                            if (marker) {
                                this.questLayers.get(quest.id).addLayer(marker);
                                markerCount++;
                            }
                        });
                    }
                });
            });
        });

        console.log(`퀘스트 마커 생성 완료: ${markerCount}개`);
    }

    /**
     * 개별 퀘스트 마커 생성
     * @param {Object} quest - 퀘스트 객체
     * @param {Object} objective - 목표 객체
     * @param {Object} position - 위치 정보
     * @param {number} objIndex - 목표 인덱스
     * @param {number} posIndex - 위치 인덱스
     * @returns {L.Marker} Leaflet 마커
     */
    createQuestMarker(quest, objective, position, objIndex, posIndex) {
        if (!this.mapApp?.mapSystem) {
            console.warn('MapSystem이 없어서 퀘스트 마커를 생성할 수 없습니다');
            return null;
        }

        try {
            // 게임 좌표를 맵 좌표로 변환
            const mapCoords = this.mapApp.mapSystem.gameToMapCoordinates(position);
            
            // 퀘스트 상태에 따른 색상 결정
            const questState = this.getQuestState(quest);
            const colors = {
                [this.QuestState.LOCKED]: '#9e9e9e',
                [this.QuestState.AVAILABLE]: '#2196f3',
                [this.QuestState.ACTIVE]: '#ffc107',
                [this.QuestState.COMPLETED]: '#4caf50'
            };
            
            const markerColor = colors[questState] || '#2196f3';

            // 마커 생성
            const marker = L.marker(mapCoords, {
                icon: L.divIcon({
                    html: `<div style="
                        background: ${markerColor};
                        color: white;
                        width: 28px;
                        height: 28px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 14px;
                        font-weight: bold;
                        border: 3px solid white;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    ">!</div>`,
                    className: `quest-marker quest-${questState}`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                }),
                zIndexOffset: 1000
            });

            // 툴팁 추가
            const tooltipContent = this.createQuestTooltip(quest, objective, position);
            marker.bindTooltip(tooltipContent, {
                direction: 'top',
                offset: [0, -16],
                opacity: 0.95
            });

            // 클릭 이벤트 추가
            marker.on('click', () => {
                this.onQuestMarkerClick(quest, objective, position);
            });

            // Y좌표 기반 층수 결정 및 저장 (필터링용)
            const markerLevel = this.mapApp.determineLevel(position.y);
            marker.markerLevel = markerLevel;
            marker.markerCategory = 'quest';
            marker.questId = quest.id;

            return marker;

        } catch (error) {
            console.error(`퀘스트 마커 생성 실패 (${quest.name}):`, error);
            return null;
        }
    }

    /**
     * 퀘스트 툴팁 생성
     * @param {Object} quest - 퀘스트 객체
     * @param {Object} objective - 목표 객체
     * @param {Object} position - 위치 정보
     * @returns {string} HTML 툴팁 내용
     */
    createQuestTooltip(quest, objective, position) {
        const questLevel = quest.minPlayerLevel || 1;
        const traderName = quest.trader?.name || 'Unknown';
        
        let content = `<div class="quest-tooltip">`;
        content += `<strong>${quest.name}</strong><br>`;
        content += `<span class="quest-tooltip-trader">${traderName}</span> | <span class="quest-tooltip-level">Lv.${questLevel}</span><br>`;
        content += `<span class="quest-tooltip-objective">${objective.description || 'Quest objective'}</span><br>`;
        content += `<span class="quest-tooltip-position">위치: (${position.x?.toFixed(1)}, ${position.z?.toFixed(1)})</span>`;
        content += `</div>`;
        
        return content;
    }

    /**
     * 퀘스트 마커 클릭 이벤트
     * @param {Object} quest - 퀘스트 객체
     * @param {Object} objective - 목표 객체
     * @param {Object} position - 위치 정보
     */
    onQuestMarkerClick(quest, objective, position) {
        console.log(`퀘스트 마커 클릭: ${quest.name}`, objective, position);
        
        // 퀘스트 상세 정보 표시
        this.showQuestDetails(quest);
        
        // C#으로 퀘스트 클릭 정보 전송
        if (this.mapApp?.sendWebViewMessage) {
            this.mapApp.sendWebViewMessage('QUEST_MARKER_CLICK', {
                questId: quest.id,
                questName: quest.name,
                objective: objective,
                position: position
            });
        }
    }

    /**
     * 퀘스트 상세 정보 표시
     * @param {Object} quest - 퀘스트 객체
     */
    showQuestDetails(quest) {
        console.log('퀘스트 상세 정보:', quest);
        
        // 추후 모달이나 사이드 패널로 퀘스트 상세 정보 표시
        // 현재는 콘솔에만 출력
    }

    /**
     * 퀘스트 마커 업데이트 (선택된 퀘스트만 표시)
     */
    updateQuestMarkers() {
        if (!this.mapApp?.map) return;

        this.questLayers.forEach((layer, questId) => {
            const isSelected = this.selectedQuests.has(questId);
            
            if (isSelected) {
                if (!this.mapApp.map.hasLayer(layer)) {
                    this.mapApp.map.addLayer(layer);
                }
            } else {
                if (this.mapApp.map.hasLayer(layer)) {
                    this.mapApp.map.removeLayer(layer);
                }
            }
        });
    }

    /**
     * 퀘스트 카운트 업데이트
     */
    updateQuestCounts() {
        const filteredQuests = this.getFilteredQuests();
        const totalCount = filteredQuests.length;
        const selectedCount = this.selectedQuests.size;

        const questCountElement = document.getElementById('quest-count');
        const selectedCountElement = document.getElementById('selected-count');

        if (questCountElement) {
            questCountElement.textContent = `${totalCount} quests available`;
        }

        if (selectedCountElement) {
            selectedCountElement.textContent = `${selectedCount} selected`;
        }

        console.log(`퀘스트 카운트 업데이트: ${totalCount}개 표시, ${selectedCount}개 선택`);
    }

    /**
     * 레이어 그룹 초기화
     */
    initializeLayers() {
        // 각 퀘스트별로 레이어 그룹 생성
        this.questsData.forEach(quest => {
            this.questLayers.set(quest.id, L.layerGroup());
        });

        console.log('QuestFilterPanel 레이어 그룹 초기화 완료');
    }

    /**
     * 모든 퀘스트 마커 클리어
     */
    clearQuestMarkers() {
        this.questLayers.forEach(layer => {
            layer.clearLayers();
        });
        
        console.log('모든 퀘스트 마커가 클리어되었습니다');
    }

    /**
     * 레벨에 따른 퀘스트 마커 필터링
     * @param {string} targetLevel - 표시할 레벨 ('main', '0', '1', etc.)
     */
    filterQuestMarkersByLevel(targetLevel) {
        console.log(`🏢 퀘스트 레벨 필터링 시작: ${targetLevel}`);
        
        let visibleCount = 0;
        let hiddenCount = 0;
        
        // 모든 퀘스트 마커를 순회하며 레벨 필터링 적용
        this.questLayers.forEach((questLayer, questKey) => {
            questLayer.eachLayer((marker) => {
                const markerLevel = marker.markerLevel || 'main';
                
                if (markerLevel === targetLevel) {
                    // 현재 레벨과 일치하는 마커 표시
                    if (!this.mapApp.map.hasLayer(marker)) {
                        marker.addTo(this.mapApp.map);
                    }
                    visibleCount++;
                } else {
                    // 다른 레벨의 마커 숨김
                    if (this.mapApp.map.hasLayer(marker)) {
                        marker.remove();
                    }
                    hiddenCount++;
                }
            });
        });
        
        console.log(`✅ 퀘스트 레벨 필터링 완료: ${visibleCount}개 표시, ${hiddenCount}개 숨김`);
    }

    /**
     * 리소스 정리
     */
    dispose() {
        this.clearQuestMarkers();
        this.questLayers.clear();
        this.questsData = [];
        this.selectedQuests.clear();
        
        console.log('QuestFilterPanel 정리 완료');
    }
}

// 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuestFilterPanel;
} else {
    window.QuestFilterPanel = QuestFilterPanel;
}