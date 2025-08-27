// =========================
// Quest Component Class
// =========================
class QuestComponent {
    constructor() {
        this.questManager = null;
        this.pagination = null;
        this.allFilteredTasks = [];
        this.currentPlayerLevel = 1;
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;

        try {
            console.log('Quest 컴포넌트 초기화 중...');

            // QuestManager와 Pagination 초기화
            await this.initializeManagers();

            // UI 이벤트 설정
            this.setupEventListeners();

            // 사용자 프로필 로드
            this.loadUserProfile();

            // 퀘스트 데이터 로드
            await this.loadQuests();

            this.isInitialized = true;
            console.log('Quest 컴포넌트 초기화 완료');

        } catch (error) {
            console.error('Quest 컴포넌트 초기화 실패:', error);
            this.showError('컴포넌트 초기화에 실패했습니다.');
        }
    }

    async initializeManagers() {
        // QuestManager 초기화 (전역에서 사용 가능한 클래스들 사용)
        if (window.QuestManager) {
            this.questManager = new window.QuestManager();
        } else {
            throw new Error('QuestManager 클래스를 찾을 수 없습니다.');
        }

        // Pagination 초기화
        if (window.Pagination) {
            this.pagination = new window.Pagination(0, 10);
        } else {
            throw new Error('Pagination 클래스를 찾을 수 없습니다.');
        }
    }

    setupEventListeners() {
        // 필터 이벤트
        this.setupFilterEvents();

        // 검색 이벤트
        this.setupSearchEvents();

        // 페이지네이션 이벤트
        this.setupPaginationEvents();

        // 퀘스트 카드 클릭 이벤트 (동적으로 추가됨)
    }

    setupFilterEvents() {
        const filters = ['questTypeFilter', 'traderFilter', 'mapFilter', 'statusFilter'];
        
        filters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => {
                    this.applyFilters();
                });
            }
        });
    }

    setupSearchEvents() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            // 디바운스된 검색
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.applyFilters();
                }, 300);
            });
        }
    }

    setupPaginationEvents() {
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.pagination.goToPrevPage();
                this.renderCurrentPage();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.pagination.goToNextPage();
                this.renderCurrentPage();
            });
        }
    }


    loadUserProfile() {
        if (window.LocalStorageManager) {
            const profile = window.LocalStorageManager.getUserProfile();
            this.currentPlayerLevel = profile.playerLevel || 1;
        }
    }

    updatePlayerLevel(level) {
        this.currentPlayerLevel = level;
        
        // 프로필 저장 (LocalStorageManager 사용)
        if (window.LocalStorageManager) {
            const profile = window.LocalStorageManager.getUserProfile();
            profile.playerLevel = level;
            window.LocalStorageManager.setUserProfile(profile);
        }

        // 퀘스트 필터 다시 적용
        this.applyFilters();

        // 통계 업데이트
        this.updateStats();
    }

    async loadQuests() {
        try {
            this.showLoading(true);

            const quests = await this.questManager.fetchQuests();
            
            if (quests && quests.length > 0) {
                // 트레이더와 맵 필터 옵션 업데이트
                this.updateFilterOptions(quests);

                // 초기 필터 적용
                this.applyFilters();
            } else {
                this.showError('퀘스트 데이터를 불러올 수 없습니다.');
            }

        } catch (error) {
            console.error('퀘스트 로드 실패:', error);
            this.showError('퀘스트 데이터 로딩 중 오류가 발생했습니다.');
        } finally {
            this.showLoading(false);
        }
    }

    updateFilterOptions(quests) {
        // 트레이더 옵션 업데이트
        const traderFilter = document.getElementById('traderFilter');
        if (traderFilter) {
            const traders = [...new Set(quests.map(quest => quest.giver?.name).filter(Boolean))];
            
            // 기존 옵션 제거 (첫 번째 "모든 상인" 제외)
            while (traderFilter.children.length > 1) {
                traderFilter.removeChild(traderFilter.lastChild);
            }

            // 새 옵션 추가
            traders.sort().forEach(trader => {
                const option = document.createElement('option');
                option.value = trader;
                option.textContent = trader;
                traderFilter.appendChild(option);
            });
        }

        // 맵 옵션 업데이트
        const mapFilter = document.getElementById('mapFilter');
        if (mapFilter) {
            const maps = new Set();
            
            quests.forEach(quest => {
                if (quest.objectives) {
                    quest.objectives.forEach(obj => {
                        if (obj.maps && obj.maps.length > 0) {
                            obj.maps.forEach(map => maps.add(map.name));
                        }
                    });
                }
            });

            // 기존 옵션 제거 (첫 번째 "모든 맵" 제외)
            while (mapFilter.children.length > 1) {
                mapFilter.removeChild(mapFilter.lastChild);
            }

            // 새 옵션 추가
            [...maps].sort().forEach(map => {
                const option = document.createElement('option');
                option.value = map;
                option.textContent = map;
                mapFilter.appendChild(option);
            });
        }
    }

    applyFilters() {
        if (!this.questManager || !this.questManager.quests) return;

        const filters = this.getFilterValues();
        
        // QuestManager의 filterTasks 메서드를 사용하여 우선순위 정렬 적용
        const questManagerFilters = {
            trader: filters.trader,
            status: filters.status,
            map: filters.map,
            questType: filters.type,
            search: filters.search,
            playerLevel: this.currentPlayerLevel
        };

        this.allFilteredTasks = this.questManager.filterTasks(questManagerFilters);

        // 페이지네이션 업데이트
        this.pagination.updateTotalItems(this.allFilteredTasks.length);
        this.renderCurrentPage();
        this.updateStats();
    }

    getFilterValues() {
        return {
            type: document.getElementById('questTypeFilter')?.value || 'all',
            trader: document.getElementById('traderFilter')?.value || 'all',
            map: document.getElementById('mapFilter')?.value || 'all',
            status: document.getElementById('statusFilter')?.value || 'all',
            search: document.getElementById('searchInput')?.value || ''
        };
    }

    renderCurrentPage() {
        const pageQuests = this.pagination.getCurrentPageItems(this.allFilteredTasks);

        this.renderQuests(pageQuests);
        this.updatePaginationUI();
    }

    renderQuests(quests) {
        const questsList = document.getElementById('questsList');
        if (!questsList) return;

        if (quests.length === 0) {
            questsList.innerHTML = `
                <div class="no-quests-message">
                    <p>필터 조건에 맞는 퀘스트가 없습니다.</p>
                </div>
            `;
            return;
        }

        questsList.innerHTML = quests.map(quest => this.createQuestHTML(quest)).join('');

        // 개별 목표 체크박스 클릭 이벤트 추가
        questsList.querySelectorAll('.objective-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const questId = checkbox.closest('.objective-item').getAttribute('data-quest-id');
                const objectiveId = checkbox.closest('.objective-item').getAttribute('data-objective-id');
                this.handleObjectiveToggle(questId, objectiveId, checkbox.checked);
            });
        });

        // 일괄 완료 버튼 클릭 이벤트 추가
        questsList.querySelectorAll('.quest-complete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const questId = btn.getAttribute('data-quest-id');
                this.handleQuestCompleteAction(questId);
            });
        });
    }

    createQuestHTML(quest) {
        const status = this.questManager.getQuestStatus(quest, this.currentPlayerLevel);
        const statusIcon = this.getStatusIcon(status);
        const statusText = this.getStatusText(status);
        const primaryMap = this.getPrimaryMap(quest);
        const traderImageUrl = this.getTraderImageUrl(quest.giver?.name);
        
        return `
            <div class="quest-card" data-quest-id="${quest.id}" data-status="${status}">
                <!-- 7:3 비율 메인 컨테이너 -->
                <div class="quest-main-layout">
                    <!-- 좌측 영역 (70%) -->
                    <div class="quest-left-area">
                        <!-- 헤더 영역 (컨테이너) -->
                        <div class="quest-header-area">
                            <!-- 1. 퀘스트명 박스 -->
                            <div class="quest-name-section quest-box">
                                <h3 class="quest-name">${quest.name}</h3>
                            </div>
                            
                            <!-- 2. 맵명+상태 통합 영역 -->
                            <div class="quest-map-status-group">
                                <!-- 2-1. 맵명 박스 -->
                                <div class="quest-map-section quest-box">
                                    ${primaryMap}
                                </div>
                                
                                <!-- 2-2. 상태 박스 -->
                                <div class="quest-status-section quest-box">
                                    <span class="status-icon">${statusIcon}</span>
                                    <span class="status-text">${statusText}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 세부 영역 (컨테이너) -->
                        <div class="quest-details-area">
                            <!-- 4. 위키 박스 -->
                            <div class="quest-wiki-section quest-box">
                                ${quest.wikiLink ? 
                                    `<a href="${quest.wikiLink}" target="_blank" rel="noopener noreferrer" class="wiki-content wiki-link">📖 위키 정보</a>` :
                                    `<span class="wiki-content wiki-disabled">📖 위키 정보 없음</span>`
                                }
                            </div>
                            
                            <!-- 5. 필수 여부 박스 -->
                            <div class="quest-requirements-section quest-box">
                                ${quest.kappaRequired ? '<span class="requirements-content"><span class="requirement-icon">●</span> 카파</span>' : ''}
                                ${quest.lightkeeperRequired ? '<span class="requirements-content"><span class="requirement-icon">●</span> 등대지기</span>' : ''}
                                ${!quest.kappaRequired && !quest.lightkeeperRequired ? '<span class="requirements-content">일반</span>' : ''}
                            </div>
                        </div>
                        
                        <!-- 6. 목표 박스 -->
                        <div class="objectives-list quest-box ${status !== 'active' && status !== 'completed' ? 'disabled' : ''}">
                            ${quest.objectives ? quest.objectives.map((obj, index) => {
                                const objId = `${quest.id}_obj_${obj.id}`;
                                const isCompleted = this.getObjectiveStatus(quest.id, obj.id);
                                const isDisabled = status !== 'active' && status !== 'completed';
                                return `
                                    <div class="objective-item ${isCompleted ? 'completed' : ''}" 
                                         data-quest-id="${quest.id}" 
                                         data-objective-id="${obj.id}">
                                        <input type="checkbox" 
                                               id="${objId}"
                                               ${isCompleted ? 'checked' : ''}
                                               ${isDisabled ? 'disabled' : ''}>
                                        <label for="${objId}" class="objective-label">
                                            ${obj.description}
                                        </label>
                                    </div>
                                `;
                            }).join('') : '<div class="no-objectives">목표가 없습니다.</div>'}
                        </div>

                        ${status === 'locked' ? `
                        <!-- 7. 진행 불가 사유 박스 -->
                        <div class="quest-unavailable-reasons quest-box">
                            <div class="unavailable-list">
                                ${this.getQuestUnavailableReasons(quest, this.currentPlayerLevel).map(reason => 
                                    `<div class="unavailable-item">${reason}</div>`
                                ).join('')}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <!-- 우측 영역 (30%) - 모든 요소 중앙 정렬 -->
                    <div class="quest-right-area">
                        <div class="trader-image-container">
                            <img src="${traderImageUrl}" 
                                 alt="${quest.giver?.name || '알 수 없음'}" 
                                 class="trader-image"
                                 onerror="this.src='data:image/svg+xml;charset=utf-8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'120\\' height=\\'120\\' viewBox=\\'0 0 120 120\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23000000\\'/></svg>'">
                        </div>
                        <div class="trader-name">${quest.giver?.name || '알 수 없음'}</div>
                        <button class="quest-complete-btn ${this.getActionButtonClass(status)}" 
                                data-quest-id="${quest.id}">
                            ${this.getActionButtonText(status)}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getStatusIcon(status) {
        const iconMap = {
            'completed': '●',
            'active': '●',
            'available': '●',
            'locked': '●'
        };
        return iconMap[status] || '●';
    }

    getStatusText(status) {
        const textMap = {
            'completed': '완료됨',
            'active': '진행 중',
            'available': '진행 가능',
            'locked': '진행 불가'
        };
        return textMap[status] || '알 수 없음';
    }

    getActionButtonClass(status) {
        const classMap = {
            'completed': 'btn-completed',
            'active': 'btn-active',
            'available': 'btn-available',
            'locked': 'btn-locked'
        };
        return classMap[status] || 'btn-default';
    }

    getActionButtonText(status) {
        const textMap = {
            'completed': '진행 중으로 변경',
            'active': '완료로 표시',
            'available': '퀘스트 수락',
            'locked': '진행 불가능'
        };
        return textMap[status] || '알 수 없음';
    }

    // 진행 불가 사유 판별
    getQuestUnavailableReasons(quest, playerLevel) {
        const reasons = [];
        
        // 최소 레벨 확인
        if (quest.minPlayerLevel && quest.minPlayerLevel > playerLevel) {
            reasons.push(`레벨 부족: 최소 레벨 ${quest.minPlayerLevel} 필요 (현재: ${playerLevel})`);
        }
        
        // 사전 퀘스트 확인
        if (quest.taskRequirements && quest.taskRequirements.length > 0) {
            const completedQuests = this.questManager.getCompletedQuestIds();
            quest.taskRequirements.forEach(req => {
                if (!completedQuests.includes(req.task.id)) {
                    const prereqQuest = this.questManager.getTaskById(req.task.id);
                    const questName = prereqQuest ? prereqQuest.name : '알 수 없는 퀘스트';
                    reasons.push(`사전 퀘스트 미완료: "${questName}" 완료 필요`);
                }
            });
        }
        
        return reasons;
    }

    handleObjectiveToggle(questId, objectiveId, isChecked) {
        // 개별 목표 완료 상태 업데이트 (ID 기반)
        const questProgress = this.getQuestProgress(questId);
        if (!questProgress.objectives) {
            questProgress.objectives = {};
        }

        if (isChecked) {
            // 완료된 경우 ID를 키로 true 저장
            questProgress.objectives[objectiveId] = true;
        } else {
            // 미완료된 경우 해당 ID 제거
            delete questProgress.objectives[objectiveId];
        }

        // LocalStorage에 저장 (LocalStorageManager 사용)
        if (window.LocalStorageManager) {
            window.LocalStorageManager.updateTaskProgress(questId, questProgress);
        }

        // UI 상태 업데이트 (체크박스의 부모 요소에 완료 클래스 토글)
        const objectiveItem = document.querySelector(`[data-quest-id="${questId}"][data-objective-id="${objectiveId}"]`);
        if (objectiveItem) {
            objectiveItem.classList.toggle('completed', isChecked);
        }

        // 전체 퀘스트 상태 확인 및 업데이트
        this.checkQuestCompletion(questId);
    }

    handleQuestCompleteAction(questId) {
        const quest = this.questManager.getTaskById(questId);
        if (!quest) return;

        const currentStatus = this.questManager.getQuestStatus(quest, this.currentPlayerLevel);
        
        if (currentStatus === 'locked') return; // 잠긴 퀘스트는 처리하지 않음

        let newStatus;
        let questProgress = this.getQuestProgress(questId);

        switch(currentStatus) {
            case 'available':
                // 진행 가능 → 진행 중으로 변경 (퀘스트 수락)
                newStatus = 'active';
                break;

            case 'active':
                // 진행 중 → 완료로 변경 (모든 목표 완료 처리)
                if (quest.objectives && quest.objectives.length > 0) {
                    questProgress.objectives = {};
                    quest.objectives.forEach(obj => {
                        questProgress.objectives[obj.id] = true;
                    });
                    
                    // LocalStorage에 목표 완료 상태 저장 (LocalStorageManager 사용)
                    if (window.LocalStorageManager) {
                        window.LocalStorageManager.updateTaskProgress(questId, questProgress);
                    }
                }
                newStatus = 'completed';
                break;

            case 'completed':
                // 완료됨 → 진행 중으로 되돌리기 (목표 완료 상태 초기화)
                questProgress.objectives = {};
                
                // LocalStorage에 목표 상태 초기화 저장 (LocalStorageManager 사용)
                if (window.LocalStorageManager) {
                    window.LocalStorageManager.updateTaskProgress(questId, questProgress);
                }
                newStatus = 'active';
                break;

            default:
                return; // 처리할 수 없는 상태
        }

        // 퀘스트 상태 변경
        this.questManager.updateQuestStatus(quest.id, newStatus);

        // UI 다시 렌더링
        this.applyFilters();
        this.updateStats();

        // C#에 상태 변경 알림
        this.notifyQuestStatusChange(quest.id, newStatus);
    }

    checkQuestCompletion(questId) {
        const quest = this.questManager.getTaskById(questId);
        if (!quest || !quest.objectives) return;

        const questProgress = this.getQuestProgress(questId);
        const allCompleted = quest.objectives.every(obj => 
            questProgress.objectives && questProgress.objectives[obj.id]
        );

        if (allCompleted) {
            // 모든 목표가 완료되면 퀘스트 상태를 완료로 변경
            this.questManager.updateQuestStatus(quest.id, 'completed');
            this.updateStats();
            this.notifyQuestStatusChange(quest.id, 'completed');
        }
    }

    handleQuestAction(questId) {
        // 기존 메서드는 유지 (하위 호환성)
        this.handleQuestCompleteAction(questId);
    }

    notifyQuestStatusChange(questId, status) {
        if (window.sendMessageToCSharp) {
            window.sendMessageToCSharp('QUEST_STATUS_UPDATE', {
                questId,
                status,
                timestamp: new Date().toISOString()
            });
        }
    }

    getPrimaryMap(quest) {
        if (!quest.objectives || quest.objectives.length === 0) return 'Any Map';
        
        const mapsSet = new Set();
        quest.objectives.forEach(obj => {
            if (obj.maps && obj.maps.length > 0) {
                obj.maps.forEach(map => mapsSet.add(map.name));
            }
        });
        
        const maps = Array.from(mapsSet);
        if (maps.length === 0) return 'Any Map';
        if (maps.length === 1) return maps[0];
        return `${maps[0]} +${maps.length - 1}`;
    }

    getTraderImageUrl(traderName) {
        const traderImages = {
            'Prapor': 'https://assets.tarkov.dev/5ac3b934156ae10c4430e83c-icon.jpg',
            'Therapist': 'https://assets.tarkov.dev/54cb57776803fa99248b456e-icon.jpg', 
            'Fence': 'https://assets.tarkov.dev/579dc571d53a0658a154fbec-icon.jpg',
            'Skier': 'https://assets.tarkov.dev/58330581ace78e27b8b10cee-icon.jpg',
            'Peacekeeper': 'https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9-icon.jpg',
            'Mechanic': 'https://assets.tarkov.dev/5a7c2eca46aef81a7ca2145d-icon.jpg',
            'Ragman': 'https://assets.tarkov.dev/5ac3b86a5acfc400180ae6e4-icon.jpg',
            'Jaeger': 'https://assets.tarkov.dev/5c0647fdd443bc2504c2d371-icon.jpg',
            'Lightkeeper': 'https://assets.tarkov.dev/638f541a29ffd1183d187f57-icon.jpg',
            'Ref': 'https://assets.tarkov.dev/64695f46ab5a0955a73caee8-icon.jpg'
        };
        
        return traderImages[traderName] || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" style="background:%23000000"></svg>';
    }

    getObjectiveStatus(questId, objectiveId) {
        const questProgress = this.getQuestProgress(questId);
        return questProgress.objectives && questProgress.objectives[objectiveId] || false;
    }

    getQuestProgress(questId) {
        if (window.LocalStorageManager) {
            return window.LocalStorageManager.getTaskProgress(questId);
        }
        return { objectives: {} };
    }

    getObjectiveIcon(objective) {
        if (!objective.type) return '📋';
        
        const iconMap = {
            'elimination': '🎯',
            'pickup': '📦',
            'findInRaid': '🔍',
            'plantItem': '📍',
            'visit': '🚶',
            'extract': '🚪'
        };
        
        return iconMap[objective.type] || '📋';
    }

    updatePaginationUI() {
        const paginationContainer = document.getElementById('paginationContainer');
        const paginationInfo = document.getElementById('paginationInfo');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const pageNumbers = document.getElementById('pageNumbers');

        if (!paginationContainer) return;

        if (this.pagination.totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';

        // 페이지 정보 가져오기
        const pageInfo = this.pagination.getPageInfo();
        
        // 정보 업데이트
        if (paginationInfo) {
            paginationInfo.textContent = `${pageInfo.startIndex}-${pageInfo.endIndex} / ${pageInfo.totalItems}개 퀘스트`;
        }

        // 버튼 상태 업데이트
        if (prevBtn) {
            prevBtn.disabled = !pageInfo.hasPrev;
        }
        if (nextBtn) {
            nextBtn.disabled = !pageInfo.hasNext;
        }

        // 페이지 번호 업데이트
        if (pageNumbers) {
            this.renderPageNumbers(pageNumbers);
        }
    }

    renderPageNumbers(container) {
        const currentPage = this.pagination.currentPage;
        const totalPages = this.pagination.totalPages;
        const maxVisiblePages = 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        let html = '';
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="page-btn ${i === currentPage ? 'active' : ''}" 
                        data-page="${i}">
                    ${i}
                </button>
            `;
        }

        container.innerHTML = html;

        // 페이지 버튼 이벤트 추가
        container.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                this.pagination.goToPage(page);
                this.renderCurrentPage();
            });
        });
    }

    updateStats() {
        if (!this.questManager || !this.questManager.quests) return;

        const completed = this.questManager.quests.filter(quest => {
            const status = this.questManager.getQuestStatus(quest, this.currentPlayerLevel);
            return status === 'completed';
        }).length;

        const total = this.questManager.quests.length;

        // 사이드바 통계 업데이트
        const completedElement = document.getElementById('completedTasks');
        const totalElement = document.getElementById('totalTasks');

        if (completedElement) completedElement.textContent = completed;
        if (totalElement) totalElement.textContent = total;

        // 상위 컴포넌트에 알림 (프로필 정보 업데이트)
        if (window.app && window.app.updateStats) {
            window.app.updateStats({ completed, total });
        }
    }









    notifyQuestStatusChange(questId, status) {
        if (window.sendMessageToCSharp) {
            window.sendMessageToCSharp('QUEST_STATUS_UPDATE', {
                questId,
                status,
                timestamp: new Date().toISOString()
            });
        }
    }

    showLoading(show) {
        const loadingElement = document.getElementById('questsLoading');
        const questsList = document.getElementById('questsList');
        const paginationContainer = document.getElementById('paginationContainer');

        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
        if (questsList) {
            questsList.style.display = show ? 'none' : 'flex';
        }
        if (paginationContainer) {
            paginationContainer.style.display = show ? 'none' : 'flex';
        }
    }

    showError(message) {
        const questsList = document.getElementById('questsList');
        if (questsList) {
            questsList.innerHTML = `
                <div class="error-message">
                    <p>⚠️ ${message}</p>
                    <button class="btn btn-primary" onclick="window.currentComponent.loadQuests()">
                        다시 시도
                    </button>
                </div>
            `;
        }
    }

    // WebView2 통신 메서드
    handleQuestUpdate(data) {
        console.log('퀘스트 업데이트 수신:', data);
        this.loadQuests();
    }

    async syncData() {
        console.log('퀘스트 데이터 동기화 시작');
        await this.loadQuests();
    }

    // 정리 메서드 (컴포넌트 언로드 시 호출)
    async cleanup() {
        this.isInitialized = false;
        
        // 이벤트 리스너 정리는 DOM 요소와 함께 자동으로 제거됨
        console.log('Quest 컴포넌트 정리 완료');
    }
}

// 전역 Quest 컴포넌트 클래스 등록
window.QuestComponent = QuestComponent;