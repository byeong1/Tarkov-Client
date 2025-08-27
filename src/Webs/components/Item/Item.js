// =========================
// Item Component Class
// =========================
class ItemComponent {
    constructor() {
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;

        try {
            console.log('Item 컴포넌트 초기화 중...');

            this.setupEventListeners();

            this.isInitialized = true;
            console.log('Item 컴포넌트 초기화 완료');

        } catch (error) {
            console.error('Item 컴포넌트 초기화 실패:', error);
        }
    }

    setupEventListeners() {
        const refreshBtn = document.getElementById('refreshItemsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshItems();
            });
        }
    }

    refreshItems() {
        console.log('아이템 목록 새로고침 (현재는 placeholder)');
        // 향후 실제 아이템 데이터 로딩 구현
    }

    updatePlayerLevel(level) {
        console.log(`아이템 컴포넌트 - 플레이어 레벨 변경: ${level}`);
        // 레벨에 따른 아이템 필터링 로직 구현 예정
    }

    handleQuestUpdate(data) {
        console.log('퀘스트 업데이트 수신 (Item):', data);
        // 퀘스트 변경에 따른 필수 아이템 목록 업데이트 예정
    }

    syncData() {
        console.log('아이템 데이터 동기화');
        // 아이템 데이터 동기화 로직 구현 예정
    }

    async cleanup() {
        this.isInitialized = false;
        console.log('Item 컴포넌트 정리 완료');
    }
}

// 전역 Item 컴포넌트 클래스 등록
window.ItemComponent = ItemComponent;