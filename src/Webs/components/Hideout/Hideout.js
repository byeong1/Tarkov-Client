// =========================
// Hideout Component Class
// =========================
class HideoutComponent {
    constructor() {
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;

        try {
            console.log('Hideout 컴포넌트 초기화 중...');

            this.setupEventListeners();

            this.isInitialized = true;
            console.log('Hideout 컴포넌트 초기화 완료');

        } catch (error) {
            console.error('Hideout 컴포넌트 초기화 실패:', error);
        }
    }

    setupEventListeners() {
        const refreshBtn = document.getElementById('refreshHideoutBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshHideout();
            });
        }
    }

    refreshHideout() {
        console.log('은신처 정보 새로고침 (현재는 placeholder)');
        // 향후 실제 은신처 데이터 로딩 구현
    }

    updatePlayerLevel(level) {
        console.log(`은신처 컴포넌트 - 플레이어 레벨 변경: ${level}`);
        // 레벨에 따른 은신처 업그레이드 가능 여부 확인 예정
    }

    handleQuestUpdate(data) {
        console.log('퀘스트 업데이트 수신 (Hideout):', data);
        // 퀘스트 완료에 따른 은신처 업그레이드 조건 변경 확인 예정
    }

    syncData() {
        console.log('은신처 데이터 동기화');
        // 은신처 데이터 동기화 로직 구현 예정
    }

    async cleanup() {
        this.isInitialized = false;
        console.log('Hideout 컴포넌트 정리 완료');
    }
}

// 전역 Hideout 컴포넌트 클래스 등록
window.HideoutComponent = HideoutComponent;