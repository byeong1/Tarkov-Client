// =========================
// Tarkov Tracker SPA - Main Entry Point
// =========================

class TarkovTrackerApp {
    constructor() {
        this.router = null;
        this.currentComponent = null;
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log('Tarkov 트래커 SPA 초기화 중...');

        try {
            // 라우터 초기화
            if (window.Router) {
                this.router = new window.Router();
                window.router = this.router;
                
                // 라우터 설정
                this.setupRoutes();
                
                // 네비게이션 이벤트 리스너 설정
                this.setupNavigation();
                
                // 기본 페이지 로드 (대시보드)
                await this.router.navigate('dashboard');
                
                this.isInitialized = true;
                console.log('Tarkov 트래커 SPA 초기화 완료');
            } else {
                throw new Error('Router 클래스를 찾을 수 없습니다.');
            }
        } catch (error) {
            console.error('SPA 초기화 실패:', error);
        }
    }

    setupRoutes() {
        // 라우트 등록
        this.router.addRoute('dashboard', {
            path: './components/Dashboard/Dashboard.html',
            script: './components/Dashboard/Dashboard.js',
            css: './components/Dashboard/Dashboard.css'
        });

        this.router.addRoute('quest', {
            path: './components/Quest/Quest.html',
            script: './components/Quest/Quest.js',
            css: './components/Quest/Quest.css'
        });

        this.router.addRoute('hideout', {
            path: './components/Hideout/Hideout.html',
            script: './components/Hideout/Hideout.js',
            css: './components/Hideout/Hideout.css'
        });

        this.router.addRoute('item', {
            path: './components/Item/Item.html',
            script: './components/Item/Item.js',
            css: './components/Item/Item.css'
        });

        this.router.addRoute('settings', {
            path: './components/Settings/Settings.html',
            script: './components/Settings/Settings.js',
            css: './components/Settings/Settings.css'
        });
    }

    setupNavigation() {
        // 사이드바 네비게이션 이벤트 리스너
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                
                const route = item.getAttribute('data-route');
                if (route) {
                    // 활성 상태 업데이트
                    navItems.forEach(nav => nav.classList.remove('active'));
                    item.classList.add('active');
                    
                    // 라우팅
                    await this.router.navigate(route);
                }
            });
        });

        // 사이드바 토글 버튼
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                const appContainer = document.querySelector('.app-container');
                if (appContainer) {
                    appContainer.classList.toggle('sidebar-hidden');
                }
            });
        }

        // 레벨 조정 버튼들
        this.setupLevelControls();
    }

    setupLevelControls() {
        const levelInput = document.getElementById('sidebarPlayerLevel');
        const minusBtn = document.getElementById('levelMinusBtn');
        const plusBtn = document.getElementById('levelPlusBtn');

        if (levelInput && minusBtn && plusBtn) {
            minusBtn.addEventListener('click', () => {
                const currentValue = parseInt(levelInput.value) || 1;
                if (currentValue > 1) {
                    levelInput.value = currentValue - 1;
                    this.updatePlayerLevel(levelInput.value);
                }
            });

            plusBtn.addEventListener('click', () => {
                const currentValue = parseInt(levelInput.value) || 1;
                if (currentValue < 79) {
                    levelInput.value = currentValue + 1;
                    this.updatePlayerLevel(levelInput.value);
                }
            });

            levelInput.addEventListener('change', () => {
                this.updatePlayerLevel(levelInput.value);
            });
        }
    }

    updatePlayerLevel(level) {
        // 현재 활성 컴포넌트에 레벨 변경 알림
        if (window.currentComponent && window.currentComponent.updatePlayerLevel) {
            window.currentComponent.updatePlayerLevel(level);
        }

        // C#에 레벨 변경 알림
        if (window.sendMessageToCSharp) {
            window.sendMessageToCSharp('PLAYER_LEVEL_UPDATE', { level: parseInt(level) });
        }
    }

    // 현재 컴포넌트 업데이트
    setCurrentComponent(component) {
        this.currentComponent = component;
        window.currentComponent = component;
    }

    // API 요청 공통 메서드
    async apiRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API 요청 실패:', error);
            throw error;
        }
    }
}

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', async function() {
    window.app = new TarkovTrackerApp();
    await window.app.init();
});

// 전역 유틸리티 함수들
window.TarkovUtils = {
    // 숫자 포맷팅
    formatNumber: (num) => {
        return new Intl.NumberFormat('ko-KR').format(num);
    },

    // 시간 포맷팅
    formatTime: (timestamp) => {
        return new Date(timestamp).toLocaleString('ko-KR');
    },

    // 로컬 스토리지 헬퍼
    storage: {
        get: (key) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (error) {
                console.error('로컬 스토리지 읽기 실패:', error);
                return null;
            }
        },
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('로컬 스토리지 저장 실패:', error);
                return false;
            }
        },
        remove: (key) => {
            localStorage.removeItem(key);
        }
    }
};