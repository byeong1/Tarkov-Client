// =========================
// Dashboard Component Class
// =========================
class DashboardComponent {
    constructor() {
        this.isInitialized = false;
        this.stats = {
            completedQuests: 0,
            activeObjectives: 0,
            requiredItems: 0
        };
        this.activities = [];
    }

    async init() {
        if (this.isInitialized) return;

        try {
            console.log('Dashboard 컴포넌트 초기화 중...');

            // 이벤트 리스너 설정
            this.setupEventListeners();

            // 초기 데이터 로드
            await this.loadDashboardData();

            // 활동 기록 로드
            this.loadRecentActivities();

            this.isInitialized = true;
            console.log('Dashboard 컴포넌트 초기화 완료');

        } catch (error) {
            console.error('Dashboard 컴포넌트 초기화 실패:', error);
            this.showError('대시보드 로딩에 실패했습니다.');
        }
    }

    setupEventListeners() {
        // 동기화 버튼 이벤트
        const syncButton = document.getElementById('syncButton');
        if (syncButton) {
            syncButton.addEventListener('click', () => {
                this.syncData();
            });
        }
    }

    async loadDashboardData() {
        try {
            this.showLoading(true);

            // 퀘스트 매니저가 있으면 퀘스트 데이터 사용
            if (window.QuestManager) {
                const questManager = new window.QuestManager();
                await questManager.fetchQuests();

                if (questManager.quests) {
                    this.calculateQuestStats(questManager.quests);
                }
            }

            // 통계 업데이트
            this.updateStatsDisplay();

        } catch (error) {
            console.error('대시보드 데이터 로드 실패:', error);
        } finally {
            this.showLoading(false);
        }
    }

    calculateQuestStats(quests) {
        const userProfile = window.CommonUtils?.storage?.get('userProfile', { playerLevel: 1 });
        const playerLevel = userProfile.playerLevel || 1;

        let completedCount = 0;
        let activeObjectivesCount = 0;
        let requiredItemsSet = new Set();

        quests.forEach(quest => {
            // QuestManager의 상태 확인 로직 사용
            const questManager = new window.QuestManager();
            const status = questManager.getQuestStatus(quest, playerLevel);

            if (status === 'completed') {
                completedCount++;
            }

            // 활성화된 퀘스트의 목표 계산
            if (status === 'active' && quest.objectives) {
                activeObjectivesCount += quest.objectives.length;

                // 필요한 아이템 수집
                quest.objectives.forEach(obj => {
                    if (obj.targetItem) {
                        requiredItemsSet.add(obj.targetItem.name);
                    }
                    if (obj.requiredItems) {
                        obj.requiredItems.forEach(item => {
                            requiredItemsSet.add(item.name);
                        });
                    }
                });
            }
        });

        this.stats = {
            completedQuests: completedCount,
            activeObjectives: activeObjectivesCount,
            requiredItems: requiredItemsSet.size
        };
    }

    updateStatsDisplay() {
        // 완료된 퀘스트
        const completedElement = document.getElementById('dashCompletedTasks');
        if (completedElement) {
            this.animateNumber(completedElement, this.stats.completedQuests);
        }

        // 진행 중인 목표
        const activeElement = document.getElementById('dashActiveObjectives');
        if (activeElement) {
            this.animateNumber(activeElement, this.stats.activeObjectives);
        }

        // 필수 아이템
        const requiredElement = document.getElementById('dashRequiredItems');
        if (requiredElement) {
            this.animateNumber(requiredElement, this.stats.requiredItems);
        }
    }

    animateNumber(element, targetValue) {
        const startValue = parseInt(element.textContent) || 0;
        const duration = 1000; // 1초
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (easeOutQuart)
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.round(startValue + (targetValue - startValue) * easeProgress);

            element.textContent = currentValue;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    loadRecentActivities() {
        // 로컬 스토리지에서 최근 활동 로드
        const activities = window.CommonUtils?.storage?.get('recentActivities', []);
        this.activities = activities.slice(0, 10); // 최근 10개만

        this.updateActivitiesDisplay();
    }

    updateActivitiesDisplay() {
        const activityList = document.getElementById('recentActivityList');
        if (!activityList) return;

        if (this.activities.length === 0) {
            activityList.innerHTML = `
                <div class="activity-item">
                    <span class="activity-icon">🔄</span>
                    <div class="activity-content">
                        <div class="activity-text">데이터를 동기화하려면 "데이터 동기화" 버튼을 클릭하세요</div>
                        <div class="activity-time">시작하기</div>
                    </div>
                </div>
            `;
            return;
        }

        activityList.innerHTML = this.activities.map(activity => `
            <div class="activity-item">
                <span class="activity-icon">${this.getActivityIcon(activity.type)}</span>
                <div class="activity-content">
                    <div class="activity-text">${activity.description}</div>
                    <div class="activity-time">${this.formatActivityTime(activity.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }

    getActivityIcon(type) {
        const iconMap = {
            'quest_completed': '✅',
            'quest_started': '🎯',
            'data_sync': '🔄',
            'level_up': '⬆️',
            'error': '⚠️'
        };
        return iconMap[type] || '📝';
    }

    formatActivityTime(timestamp) {
        const now = new Date();
        const activityTime = new Date(timestamp);
        const diff = now - activityTime;

        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) return '방금 전';
        if (minutes < 60) return `${minutes}분 전`;
        if (hours < 24) return `${hours}시간 전`;
        if (days < 7) return `${days}일 전`;
        
        return activityTime.toLocaleDateString('ko-KR');
    }

    addActivity(type, description) {
        const activity = {
            id: Date.now().toString(),
            type,
            description,
            timestamp: new Date().toISOString()
        };

        this.activities.unshift(activity);
        this.activities = this.activities.slice(0, 10); // 최근 10개만 유지

        // 로컬 스토리지에 저장
        window.CommonUtils?.storage?.set('recentActivities', this.activities);

        // UI 업데이트
        this.updateActivitiesDisplay();
    }

    async syncData() {
        try {
            this.showSyncStatus('syncing', '데이터 동기화 중...');

            // 데이터 다시 로드
            await this.loadDashboardData();

            // 활동 기록 추가
            this.addActivity('data_sync', '데이터가 성공적으로 동기화되었습니다');

            this.showSyncStatus('success', '동기화 완료');

            // C#에 동기화 완료 알림
            if (window.sendMessageToCSharp) {
                window.sendMessageToCSharp('DASHBOARD_SYNC_COMPLETE', {
                    timestamp: new Date().toISOString(),
                    stats: this.stats
                });
            }

        } catch (error) {
            console.error('데이터 동기화 실패:', error);
            this.addActivity('error', '데이터 동기화에 실패했습니다');
            this.showSyncStatus('error', '동기화 실패');
        }
    }

    showSyncStatus(type, message) {
        let statusElement = document.querySelector('.sync-status');
        
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.className = 'sync-status';
            
            const activitySection = document.querySelector('.recent-activity');
            if (activitySection) {
                activitySection.appendChild(statusElement);
            }
        }

        statusElement.className = `sync-status ${type}`;
        statusElement.innerHTML = `
            <span class="sync-icon">${type === 'syncing' ? '🔄' : type === 'success' ? '✅' : '❌'}</span>
            <span class="sync-message">${message}</span>
        `;

        // 3초 후 자동 숨김 (성공/실패 시)
        if (type !== 'syncing') {
            setTimeout(() => {
                if (statusElement) {
                    statusElement.remove();
                }
            }, 3000);
        }
    }

    showLoading(show) {
        const grid = document.querySelector('.dashboard-grid');
        const activity = document.querySelector('.recent-activity');

        if (show) {
            if (grid) grid.style.opacity = '0.5';
            if (activity) activity.style.opacity = '0.5';
        } else {
            if (grid) grid.style.opacity = '1';
            if (activity) activity.style.opacity = '1';
        }
    }

    showError(message) {
        this.addActivity('error', message);
    }

    // 외부에서 통계 업데이트 요청 시 사용
    updateStats(newStats) {
        if (newStats) {
            Object.assign(this.stats, newStats);
            this.updateStatsDisplay();
        }
    }

    // 레벨 변경 알림
    updatePlayerLevel(level) {
        this.addActivity('level_up', `플레이어 레벨이 ${level}로 변경되었습니다`);
        this.loadDashboardData(); // 레벨 변경에 따른 통계 재계산
    }

    // WebView2 통신 메서드
    handleQuestUpdate(data) {
        console.log('퀘스트 업데이트 수신 (Dashboard):', data);
        
        if (data.type === 'quest_completed') {
            this.addActivity('quest_completed', `"${data.questName}" 퀘스트를 완료했습니다`);
        } else if (data.type === 'quest_started') {
            this.addActivity('quest_started', `"${data.questName}" 퀘스트를 시작했습니다`);
        }

        this.loadDashboardData();
    }

    // 정리 메서드 (컴포넌트 언로드 시 호출)
    async cleanup() {
        this.isInitialized = false;
        
        // 동기화 상태 엘리먼트 제거
        const statusElement = document.querySelector('.sync-status');
        if (statusElement) {
            statusElement.remove();
        }

        console.log('Dashboard 컴포넌트 정리 완료');
    }
}

// 전역 Dashboard 컴포넌트 클래스 등록
window.DashboardComponent = DashboardComponent;