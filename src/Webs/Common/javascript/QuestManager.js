// =========================
// GraphQL API 관리 클래스
// =========================
class QuestManager {
    constructor() {
        this.apiEndpoint = 'https://api.tarkov.dev/graphql';
        this.quests = [];
        this.tasks = []; // 호환성을 위해 유지
        this.traders = [];
    }
    
    // 새로운 메서드명
    async fetchQuests(limit = null) {
        return this.fetchTasks(limit);
    }
    
    async fetchTasks(limit = null) {
        const query = `
            {
                tasks${limit ? `(limit: ${limit})` : ''} {
                    id
                    name
                    trader {
                        name
                    }
                    wikiLink
                    minPlayerLevel
                    taskRequirements {
                        task {
                            id
                            name
                        }
                    }
                    kappaRequired
                    lightkeeperRequired
                    restartable
                    traderLevelRequirements {
                        trader {
                            name
                        }
                        level
                    }
                    map {
                        name
                        normalizedName
                    }
                    objectives {
                        id
                        type
                        description
                        maps {
                            id
                            name
                            normalizedName
                        }
                        ... on TaskObjectiveItem {
                            item {
                                name
                                shortName
                            }
                            count
                            foundInRaid
                        }
                        ... on TaskObjectiveShoot {
                            targetNames
                            count
                        }
                    }
                    startRewards {
                        items {
                            item {
                                name
                                shortName
                            }
                            count
                        }
                    }
                    finishRewards {
                        items {
                            item {
                                name
                                shortName
                            }
                            count
                        }
                    }
                }
            }
        `;
        
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.errors) {
                throw new Error(data.errors.map(e => e.message).join(', '));
            }
            
            this.tasks = data.data.tasks || [];
            this.quests = this.tasks; // 호환성을 위해 같은 데이터 참조
            this.normalizeQuestData(); // 데이터 정규화
            this.extractTraders();
            
            return this.tasks;
        } catch (error) {
            console.error('퀘스트 데이터 로드 실패:', error);
            throw error;
        }
    }
    
    extractTraders() {
        const traderSet = new Set();
        this.tasks.forEach(task => {
            if (task.trader && task.trader.name) {
                traderSet.add(task.trader.name);
            }
        });
        this.traders = Array.from(traderSet).sort();
    }
    
    getTraders() {
        return this.traders;
    }
    
    getTasks() {
        return this.tasks;
    }
    
    getTaskById(taskId) {
        return this.tasks.find(task => task.id === taskId);
    }
    
    // 퀘스트 진행 가능 여부 확인
    isQuestAvailable(task, playerLevel = 1) {
        // 최소 레벨 확인
        if (task.minPlayerLevel && task.minPlayerLevel > playerLevel) {
            return false;
        }
        
        // 사전 퀘스트 확인
        if (task.taskRequirements && task.taskRequirements.length > 0) {
            const completedQuests = this.getCompletedQuestIds();
            return task.taskRequirements.every(req => 
                completedQuests.includes(req.task.id)
            );
        }
        
        return true;
    }
    
    // 완료된 퀘스트 ID 목록 가져오기
    getCompletedQuestIds() {
        const allProgress = LocalStorageManager.getAllTaskProgress();
        return Object.keys(allProgress).filter(taskId => 
            allProgress[taskId].status === 'completed'
        );
    }
    
    // 퀘스트의 실제 상태 계산 (4단계: locked → available → active → completed)
    calculateQuestStatus(task, playerLevel = 1) {
        const progress = LocalStorageManager.getTaskProgress(task.id);
        
        // 이미 완료된 경우
        if (progress.status === 'completed') {
            return 'completed';
        }
        
        // 진행 중인 경우 (수락된 상태 또는 목표가 하나라도 시작된 경우)
        if (progress.status === 'active' || 
            Object.values(progress.objectives || {}).some(obj => obj.completed === true)) {
            return 'active';
        }
        
        // 진행 가능 여부 확인
        if (this.isQuestAvailable(task, playerLevel)) {
            return 'available';
        }
        
        // 진행 불가
        return 'locked';
    }
    
    filterTasks(filters) {
        let filteredTasks = [...this.tasks];
        const playerLevel = filters.playerLevel || 1;
        
        // 상인 필터
        if (filters.trader && filters.trader !== 'all') {
            filteredTasks = filteredTasks.filter(task => 
                task.trader && task.trader.name === filters.trader
            );
        }
        
        // 상태 필터 (5가지 상태)
        if (filters.status && filters.status !== 'all') {
            filteredTasks = filteredTasks.filter(task => {
                const actualStatus = this.calculateQuestStatus(task, playerLevel);
                return actualStatus === filters.status;
            });
        }
        
        // 맵 필터
        if (filters.map && filters.map !== 'all') {
            filteredTasks = filteredTasks.filter(task => {
                if (!task.objectives) return false;
                return task.objectives.some(obj => 
                    obj.maps && obj.maps.some(map => map.name === filters.map)
                );
            });
        }
        
        // 퀘스트 타입 필터
        if (filters.questType && filters.questType !== 'all') {
            if (filters.questType === 'kappa') {
                filteredTasks = filteredTasks.filter(task => task.kappaRequired === true);
            } else if (filters.questType === 'lightkeeper') {
                filteredTasks = filteredTasks.filter(task => task.lightkeeperRequired === true);
            }
        }
        
        // 검색 필터
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filteredTasks = filteredTasks.filter(task => {
                const nameMatch = task.name.toLowerCase().includes(searchLower);
                const traderMatch = task.trader && task.trader.name.toLowerCase().includes(searchLower);
                const mapMatch = task.objectives && task.objectives.some(obj =>
                    obj.maps && obj.maps.some(map => map.name.toLowerCase().includes(searchLower))
                );
                return nameMatch || traderMatch || mapMatch;
            });
        }
        
        // 모든 상태 필터일 때 상태별 우선순위 정렬
        if (filters.status === 'all') {
            const statusPriority = {
                'active': 1,     // 진행 중 (우선순위 최상위)
                'available': 2,  // 진행 가능
                'locked': 3,     // 진행 불가능
                'completed': 4,  // 완료됨 (우선순위 최하위)
            };
            
            filteredTasks.sort((a, b) => {
                const statusA = this.calculateQuestStatus(a, playerLevel);
                const statusB = this.calculateQuestStatus(b, playerLevel);
                return statusPriority[statusA] - statusPriority[statusB];
            });
        }
        
        return filteredTasks;
    }
    
    // 맵 목록 추출
    extractMaps() {
        const mapSet = new Set();
        this.tasks.forEach(task => {
            if (task.objectives) {
                task.objectives.forEach(obj => {
                    if (obj.maps && obj.maps.length > 0) {
                        obj.maps.forEach(map => mapSet.add(map.name));
                    }
                });
            }
        });
        return Array.from(mapSet).sort();
    }
    
    // 퀘스트의 모든 조건과 충족 여부 반환
    getAllRequirements(task, playerLevel = 1) {
        const requirements = [];
        const completedQuestIds = this.getCompletedQuestIds();
        
        // 1. 플레이어 레벨 조건
        if (task.minPlayerLevel && task.minPlayerLevel > 1) {
            const isMet = playerLevel >= task.minPlayerLevel;
            requirements.push({
                type: 'playerLevel',
                icon: '📊',
                text: `플레이어 레벨: Lv.${task.minPlayerLevel} 이상`,
                detail: isMet ? `충족됨 (현재: Lv.${playerLevel})` : `미충족 (현재: Lv.${playerLevel})`,
                isMet: isMet,
                priority: 1
            });
        }
        
        // 2. 상인 레벨 조건
        if (task.traderLevelRequirements && task.traderLevelRequirements.length > 0) {
            task.traderLevelRequirements.forEach(req => {
                // 상인 레벨은 현재 확인할 방법이 없으므로 미충족으로 표시
                requirements.push({
                    type: 'traderLevel',
                    icon: '🏪',
                    text: `${req.trader.name} Lv.${req.level} 필요`,
                    detail: '상인 레벨 확인 불가',
                    isMet: false, // 임시로 false, 추후 상인 레벨 확인 로직 추가 필요
                    priority: 2
                });
            });
        }
        
        // 3. 사전 퀘스트 조건
        if (task.taskRequirements && task.taskRequirements.length > 0) {
            task.taskRequirements.forEach(req => {
                const isCompleted = completedQuestIds.includes(req.task.id);
                requirements.push({
                    type: 'prerequisiteQuest',
                    icon: '✅',
                    text: `사전 퀘스트: "${req.task.name}"`,
                    detail: isCompleted ? '완료됨' : '미완료',
                    isMet: isCompleted,
                    priority: 3
                });
            });
        }
        
        
        // 우선순위별로 정렬
        return requirements.sort((a, b) => a.priority - b.priority);
    }
    
    // 퀘스트가 진행 가능한지 확인 (모든 필수 조건 충족 여부)
    areAllRequirementsMet(task, playerLevel = 1) {
        const requirements = this.getAllRequirements(task, playerLevel);
        // 정보성 조건(맵, 특수)을 제외한 필수 조건들만 체크
        const essentialRequirements = requirements.filter(req => 
            req.type === 'playerLevel' || 
            req.type === 'traderLevel' || 
            req.type === 'prerequisiteQuest'
        );
        
        return essentialRequirements.every(req => req.isMet);
    }

    // 새 구조에 필요한 메서드들 추가
    
    // 퀘스트 상태 조회 (새 메서드명)
    getQuestStatus(quest, playerLevel = 1) {
        return this.calculateQuestStatus(quest, playerLevel);
    }

    // 퀘스트 상태 업데이트
    updateQuestStatus(questId, status) {
        const progress = {
            status: status,
            timestamp: new Date().toISOString(),
            objectives: {}
        };
        
        LocalStorageManager.updateTaskProgress(questId, progress);
    }

    // 퀘스트별 통계 조회
    getQuestStats(playerLevel = 1) {
        if (!this.quests || this.quests.length === 0) {
            return {
                total: 0,
                completed: 0,
                active: 0,
                available: 0,
                locked: 0
            };
        }

        const stats = {
            total: this.quests.length,
            completed: 0,
            active: 0, 
            available: 0,
            locked: 0
        };

        this.quests.forEach(quest => {
            const status = this.getQuestStatus(quest, playerLevel);
            stats[status]++;
        });

        return stats;
    }

    // giver 필드를 trader와 같은 구조로 매핑
    normalizeQuestData() {
        if (this.quests) {
            this.quests.forEach(quest => {
                if (quest.trader && !quest.giver) {
                    quest.giver = quest.trader;
                }
            });
        }
    }
}

// 모듈 export (다른 파일에서 사용할 수 있도록)
window.QuestManager = QuestManager;