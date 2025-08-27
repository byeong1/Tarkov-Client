// =========================
// Settings Component Class
// =========================
class SettingsComponent {
    constructor() {
        this.isInitialized = false;
        this.settings = {};
        this.isDirty = false; // 설정 변경 여부
    }

    async init() {
        if (this.isInitialized) return;

        try {
            console.log('Settings 컴포넌트 초기화 중...');

            // 설정 로드
            this.loadSettings();

            // 이벤트 리스너 설정
            this.setupEventListeners();

            // UI 업데이트
            this.updateUI();

            // 데이터 크기 계산
            this.calculateDataSize();

            this.isInitialized = true;
            console.log('Settings 컴포넌트 초기화 완료');

        } catch (error) {
            console.error('Settings 컴포넌트 초기화 실패:', error);
        }
    }

    loadSettings() {
        // 기본 설정값
        const defaultSettings = {
            playerLevel: 1,
            playerName: '',
            playStyle: 'pve',
            hideCompleted: false,
            showOnlyAvailable: true,
            autoSync: true,
            questCompleteNotification: true,
            levelUpNotification: true
        };

        // 저장된 설정 불러오기
        this.settings = {
            ...defaultSettings,
            ...window.CommonUtils?.storage?.get('appSettings', {})
        };

        // 사용자 프로필 정보도 함께 로드
        const userProfile = window.CommonUtils?.storage?.get('userProfile', {});
        if (userProfile.playerLevel) {
            this.settings.playerLevel = userProfile.playerLevel;
        }
        if (userProfile.playerName) {
            this.settings.playerName = userProfile.playerName;
        }
    }

    setupEventListeners() {
        // 저장 버튼
        const saveBtn = document.getElementById('saveSettingsBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        // 데이터 초기화 버튼들
        const resetBtn = document.getElementById('resetDataBtn');
        const resetAllBtn = document.getElementById('resetAllDataBtn');
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.showResetConfirmModal();
            });
        }
        
        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', () => {
                this.showResetConfirmModal();
            });
        }

        // 데이터 크기 계산 버튼
        const calculateBtn = document.getElementById('calculateDataSizeBtn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => {
                this.calculateDataSize();
            });
        }

        // 모든 입력 요소에 변경 감지 이벤트 추가
        this.setupInputChangeListeners();

        // 모달 이벤트 설정
        this.setupModalEvents();
    }

    setupInputChangeListeners() {
        const inputs = [
            'playerLevelInput',
            'playerNameInput', 
            'playStyleSelect',
            'hideCompletedCheck',
            'showOnlyAvailableCheck',
            'autoSyncCheck',
            'questCompleteNotificationCheck',
            'levelUpNotificationCheck'
        ];

        inputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                const eventType = element.type === 'checkbox' ? 'change' : 'input';
                element.addEventListener(eventType, () => {
                    this.markDirty();
                });
            }
        });
    }

    setupModalEvents() {
        const modal = document.getElementById('resetConfirmModal');
        const cancelBtn = document.getElementById('cancelResetBtn');
        const confirmBtn = document.getElementById('confirmResetBtn');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideResetConfirmModal();
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.confirmReset();
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideResetConfirmModal();
                }
            });
        }
    }

    updateUI() {
        // 플레이어 레벨
        const levelInput = document.getElementById('playerLevelInput');
        if (levelInput) {
            levelInput.value = this.settings.playerLevel;
        }

        // 플레이어 이름
        const nameInput = document.getElementById('playerNameInput');
        if (nameInput) {
            nameInput.value = this.settings.playerName;
        }

        // 플레이 스타일
        const styleSelect = document.getElementById('playStyleSelect');
        if (styleSelect) {
            styleSelect.value = this.settings.playStyle;
        }

        // 체크박스들
        const checkboxes = [
            { id: 'hideCompletedCheck', setting: 'hideCompleted' },
            { id: 'showOnlyAvailableCheck', setting: 'showOnlyAvailable' },
            { id: 'autoSyncCheck', setting: 'autoSync' },
            { id: 'questCompleteNotificationCheck', setting: 'questCompleteNotification' },
            { id: 'levelUpNotificationCheck', setting: 'levelUpNotification' }
        ];

        checkboxes.forEach(({ id, setting }) => {
            const element = document.getElementById(id);
            if (element) {
                element.checked = this.settings[setting];
            }
        });

        // 마지막 동기화 시간
        this.updateLastSyncTime();
    }

    updateLastSyncTime() {
        const lastSyncElement = document.getElementById('lastSyncTime');
        if (!lastSyncElement) return;

        const lastSync = window.CommonUtils?.storage?.get('lastSyncTime');
        if (lastSync) {
            const date = new Date(lastSync);
            lastSyncElement.textContent = date.toLocaleString('ko-KR');
        } else {
            lastSyncElement.textContent = '없음';
        }
    }

    calculateDataSize() {
        const sizeElement = document.getElementById('dataSize');
        if (!sizeElement) return;

        let totalSize = 0;
        
        try {
            // 로컬 스토리지의 모든 데이터 크기 계산
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length;
                }
            }

            // 바이트를 적절한 단위로 변환
            const formatSize = (bytes) => {
                if (bytes < 1024) return `${bytes}B`;
                if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
                return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
            };

            const formattedSize = formatSize(totalSize);
            sizeElement.textContent = formattedSize;

            // 크기에 따른 스타일 적용
            sizeElement.className = '';
            if (totalSize > 1024 * 1024) { // 1MB 이상
                sizeElement.classList.add('data-size-warning');
            } else if (totalSize > 100 * 1024) { // 100KB 이상
                sizeElement.classList.add('data-size-large');
            }

        } catch (error) {
            console.error('데이터 크기 계산 실패:', error);
            sizeElement.textContent = '계산 실패';
        }
    }

    markDirty() {
        this.isDirty = true;
        
        // 저장 버튼 상태 업데이트
        const saveBtn = document.getElementById('saveSettingsBtn');
        if (saveBtn && !saveBtn.textContent.includes('*')) {
            saveBtn.textContent = saveBtn.textContent + ' *';
        }
    }

    saveSettings() {
        try {
            // 입력값들을 설정 객체에 저장
            this.collectSettingsFromUI();

            // 로컬 스토리지에 저장
            window.CommonUtils?.storage?.set('appSettings', this.settings);

            // 사용자 프로필 정보 별도 저장
            const userProfile = {
                playerLevel: this.settings.playerLevel,
                playerName: this.settings.playerName,
                playStyle: this.settings.playStyle
            };
            window.CommonUtils?.storage?.set('userProfile', userProfile);

            // 레벨 변경 시 다른 컴포넌트들에 알림
            if (window.app && window.app.currentComponent && window.app.currentComponent.updatePlayerLevel) {
                window.app.currentComponent.updatePlayerLevel(this.settings.playerLevel);
            }

            // 상위 앱의 레벨 컨트롤도 업데이트
            const sidebarLevelInput = document.getElementById('sidebarPlayerLevel');
            if (sidebarLevelInput) {
                sidebarLevelInput.value = this.settings.playerLevel;
            }

            this.isDirty = false;
            this.showSaveStatus('success', '설정이 저장되었습니다');

            // 저장 버튼 텍스트 복원
            const saveBtn = document.getElementById('saveSettingsBtn');
            if (saveBtn) {
                saveBtn.textContent = '설정 저장';
            }

            // C#에 설정 변경 알림
            if (window.sendMessageToCSharp) {
                window.sendMessageToCSharp('SETTINGS_UPDATED', {
                    settings: this.settings,
                    timestamp: new Date().toISOString()
                });
            }

        } catch (error) {
            console.error('설정 저장 실패:', error);
            this.showSaveStatus('error', '설정 저장에 실패했습니다');
        }
    }

    collectSettingsFromUI() {
        // 플레이어 레벨
        const levelInput = document.getElementById('playerLevelInput');
        if (levelInput) {
            this.settings.playerLevel = parseInt(levelInput.value) || 1;
        }

        // 플레이어 이름
        const nameInput = document.getElementById('playerNameInput');
        if (nameInput) {
            this.settings.playerName = nameInput.value.trim();
        }

        // 플레이 스타일
        const styleSelect = document.getElementById('playStyleSelect');
        if (styleSelect) {
            this.settings.playStyle = styleSelect.value;
        }

        // 체크박스들
        const checkboxes = [
            { id: 'hideCompletedCheck', setting: 'hideCompleted' },
            { id: 'showOnlyAvailableCheck', setting: 'showOnlyAvailable' },
            { id: 'autoSyncCheck', setting: 'autoSync' },
            { id: 'questCompleteNotificationCheck', setting: 'questCompleteNotification' },
            { id: 'levelUpNotificationCheck', setting: 'levelUpNotification' }
        ];

        checkboxes.forEach(({ id, setting }) => {
            const element = document.getElementById(id);
            if (element) {
                this.settings[setting] = element.checked;
            }
        });
    }

    showSaveStatus(type, message) {
        // 기존 상태 엘리먼트 제거
        const existingStatus = document.querySelector('.save-status');
        if (existingStatus) {
            existingStatus.remove();
        }

        // 새 상태 엘리먼트 생성
        const statusElement = document.createElement('div');
        statusElement.className = `save-status ${type}`;
        statusElement.textContent = message;

        document.body.appendChild(statusElement);

        // 애니메이션 표시
        setTimeout(() => {
            statusElement.classList.add('show');
        }, 100);

        // 3초 후 자동 제거
        setTimeout(() => {
            statusElement.classList.remove('show');
            setTimeout(() => {
                statusElement.remove();
            }, 300);
        }, 3000);
    }

    showResetConfirmModal() {
        const modal = document.getElementById('resetConfirmModal');
        if (modal) {
            modal.classList.add('show');
        }
    }

    hideResetConfirmModal() {
        const modal = document.getElementById('resetConfirmModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    confirmReset() {
        try {
            // 로컬 스토리지 전체 삭제
            localStorage.clear();

            // 기본 설정으로 리셋
            this.loadSettings();
            this.updateUI();

            // 데이터 크기 다시 계산
            this.calculateDataSize();

            // 모달 닫기
            this.hideResetConfirmModal();

            this.showSaveStatus('success', '모든 데이터가 초기화되었습니다');

            // C#에 데이터 초기화 알림
            if (window.sendMessageToCSharp) {
                window.sendMessageToCSharp('DATA_RESET', {
                    timestamp: new Date().toISOString()
                });
            }

            console.log('모든 데이터가 초기화되었습니다');

        } catch (error) {
            console.error('데이터 초기화 실패:', error);
            this.showSaveStatus('error', '데이터 초기화에 실패했습니다');
        }
    }

    // 외부에서 호출되는 메서드들
    updatePlayerLevel(level) {
        this.settings.playerLevel = level;
        
        const levelInput = document.getElementById('playerLevelInput');
        if (levelInput) {
            levelInput.value = level;
        }
        
        this.markDirty();
    }

    handleQuestUpdate(data) {
        console.log('퀘스트 업데이트 수신 (Settings):', data);
        // 퀘스트 관련 통계가 변경될 수 있으므로 필요시 UI 업데이트
    }

    syncData() {
        console.log('설정 데이터 동기화');
        // 마지막 동기화 시간 업데이트
        window.CommonUtils?.storage?.set('lastSyncTime', new Date().toISOString());
        this.updateLastSyncTime();
    }

    // 정리 메서드 (컴포넌트 언로드 시 호출)
    async cleanup() {
        this.isInitialized = false;
        
        // 저장되지 않은 변경사항이 있으면 경고 (선택적)
        if (this.isDirty) {
            console.warn('저장되지 않은 설정 변경사항이 있습니다');
        }

        // 상태 엘리먼트 정리
        const statusElement = document.querySelector('.save-status');
        if (statusElement) {
            statusElement.remove();
        }

        console.log('Settings 컴포넌트 정리 완료');
    }
}

// 전역 Settings 컴포넌트 클래스 등록
window.SettingsComponent = SettingsComponent;