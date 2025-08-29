/**
 * UIManager.js - UI 상태 관리 시스템
 * 로딩, 에러, 패널 상태 등 모든 UI 상태를 관리
 */

class UIManager {
    constructor(mapApp) {
        this.mapApp = mapApp;
        this.panelStates = new Map(); // 패널별 상태 관리
        this.loadingElements = new Map(); // 로딩 요소 캐시
        
        // EventBus 사용 (전역 이벤트 버스)
        this.eventBus = window.eventBus;
        
        // 초기화
        this.initializeUIStates();
    }

    /**
     * UI 상태 초기화
     */
    initializeUIStates() {
        // 패널 초기 상태 설정
        this.panelStates.set('left', { 
            state: 'ready', 
            title: 'Markers', 
            dataType: null 
        });
        
        this.panelStates.set('right', { 
            state: 'ready', 
            title: 'Quests', 
            dataType: null 
        });
        
        console.log('🎨 UIManager 초기화 완료');
    }

    /**
     * 전체 페이지 로딩 표시
     */
    showPageLoading(message = '지도 로딩 중...') {
        const loadingElement = document.getElementById('loading-indicator');
        if (loadingElement) {
            const textElement = loadingElement.querySelector('.loading-text');
            if (textElement) {
                textElement.textContent = message;
            }
            loadingElement.style.display = 'flex';
        }
        console.log(`🔄 페이지 로딩: ${message}`);
    }

    /**
     * 전체 페이지 로딩 숨김
     */
    hidePageLoading() {
        const loadingElement = document.getElementById('loading-indicator');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        console.log('✅ 페이지 로딩 완료');
    }

    /**
     * 패널별 로딩 상태 표시
     */
    showPanelLoading(panel, dataType, message) {
        const panelId = panel === 'left' ? 'panel_left' : 'panel_right';
        const panelElement = document.getElementById(panelId);
        
        if (!panelElement) {
            console.warn(`⚠️ 패널 요소를 찾을 수 없습니다: ${panelId}`);
            return;
        }

        // 패널 상태 업데이트
        this.panelStates.set(panel, { 
            state: 'loading', 
            title: message, 
            dataType 
        });

        // 패널 헤더에 로딩 표시 추가
        const header = panelElement.querySelector('.panel-header .panel-title');
        if (header) {
            header.innerHTML = `<span class="loading-spinner-small">⏳</span> ${message}`;
            header.style.opacity = '0.7';
        }

        // 패널 내용에 로딩 오버레이 추가 (선택적)
        this.createPanelOverlay(panelElement, 'loading', message);
        
        console.log(`🔄 ${panel} 패널 로딩: ${message}`);
        
        // 이벤트 발생
        this.emitEvent('panel:loading', { panel, dataType, message });
    }

    /**
     * 패널별 로딩 상태 숨김
     */
    hidePanelLoading(panel, dataType) {
        const panelId = panel === 'left' ? 'panel_left' : 'panel_right';
        const panelElement = document.getElementById(panelId);
        
        if (!panelElement) {
            console.warn(`⚠️ 패널 요소를 찾을 수 없습니다: ${panelId}`);
            return;
        }

        // 패널 상태 업데이트
        const originalTitle = panel === 'left' ? 'Markers' : 'Quests';
        this.panelStates.set(panel, { 
            state: 'ready', 
            title: originalTitle, 
            dataType 
        });

        // 패널 헤더 원복
        const header = panelElement.querySelector('.panel-header .panel-title');
        if (header) {
            header.innerHTML = originalTitle;
            header.style.opacity = '1';
            header.style.color = ''; // 색상 초기화
        }

        // 로딩 오버레이 제거
        this.removePanelOverlay(panelElement);
        
        console.log(`✅ ${panel} 패널 로딩 완료`);
        
        // 이벤트 발생
        this.emitEvent('panel:loaded', { panel, dataType });
    }

    /**
     * 패널별 에러 상태 표시
     */
    showPanelError(panel, dataType, message) {
        const panelId = panel === 'left' ? 'panel_left' : 'panel_right';
        const panelElement = document.getElementById(panelId);
        
        if (!panelElement) {
            console.warn(`⚠️ 패널 요소를 찾을 수 없습니다: ${panelId}`);
            return;
        }

        // 패널 상태 업데이트
        this.panelStates.set(panel, { 
            state: 'error', 
            title: `⚠️ ${message}`, 
            dataType 
        });

        // 패널 헤더에 에러 표시
        const header = panelElement.querySelector('.panel-header .panel-title');
        if (header) {
            header.innerHTML = `<span class="error-icon">⚠️</span> ${message}`;
            header.style.color = '#ff6b6b';
        }

        // 에러 오버레이 생성
        this.createPanelOverlay(panelElement, 'error', message, dataType);
        
        console.error(`❌ ${panel} 패널 에러: ${message}`);
        
        // 이벤트 발생
        this.emitEvent('panel:error', { panel, dataType, message });
    }

    /**
     * 패널 오버레이 생성
     */
    createPanelOverlay(panelElement, type, message, dataType = null) {
        // 기존 오버레이 제거
        this.removePanelOverlay(panelElement);

        const overlay = document.createElement('div');
        overlay.className = `panel-overlay panel-${type}-overlay`;
        
        if (type === 'loading') {
            overlay.innerHTML = `
                <div class="panel-overlay-content">
                    <div class="loading-spinner"></div>
                    <div class="overlay-text">${message}</div>
                </div>
            `;
        } else if (type === 'error') {
            overlay.innerHTML = `
                <div class="panel-overlay-content panel-error-content">
                    <div class="error-icon">⚠️</div>
                    <div class="overlay-text">${message}</div>
                    <button class="retry-button" data-panel="${panelElement.id.includes('left') ? 'left' : 'right'}" data-type="${dataType}">
                        다시 시도
                    </button>
                </div>
            `;
            
            // 재시도 버튼 이벤트
            const retryButton = overlay.querySelector('.retry-button');
            if (retryButton) {
                retryButton.addEventListener('click', (e) => {
                    const panel = e.target.dataset.panel;
                    const type = e.target.dataset.type;
                    this.emitEvent('retry:request', { panel, dataType: type });
                });
            }
        }
        
        panelElement.appendChild(overlay);
    }

    /**
     * 패널 오버레이 제거
     */
    removePanelOverlay(panelElement) {
        const existingOverlay = panelElement.querySelector('.panel-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
    }

    /**
     * 전체 페이지 에러 표시
     */
    showPageError(message, details = null) {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            const textElement = errorElement.querySelector('.error-text');
            if (textElement) {
                textElement.textContent = message;
                if (details) {
                    textElement.innerHTML += `<br><small>${details}</small>`;
                }
            }
            errorElement.style.display = 'flex';
        }
        
        // 로딩 숨김
        this.hidePageLoading();
        
        console.error(`❌ 페이지 에러: ${message}`, details);
        
        // 이벤트 발생
        this.emitEvent('page:error', { message, details });
    }

    /**
     * 전체 페이지 에러 숨김
     */
    hidePageError() {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        
        // 이벤트 발생
        this.emitEvent('page:error:cleared');
    }

    /**
     * 패널 상태 조회
     */
    getPanelState(panel) {
        return this.panelStates.get(panel) || { 
            state: 'unknown', 
            title: 'Unknown', 
            dataType: null 
        };
    }

    /**
     * 모든 패널 상태 조회
     */
    getAllPanelStates() {
        const states = {};
        this.panelStates.forEach((state, panel) => {
            states[panel] = state;
        });
        return states;
    }

    /**
     * 성공 알림 표시 (토스트 형태)
     */
    showSuccessToast(message, duration = 3000) {
        const toast = this.createToast('success', message);
        document.body.appendChild(toast);
        
        // 자동 제거
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, duration);
        
        console.log(`✅ 성공: ${message}`);
    }

    /**
     * 정보 알림 표시 (토스트 형태)
     */
    showInfoToast(message, duration = 3000) {
        const toast = this.createToast('info', message);
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, duration);
        
        console.log(`ℹ️ 정보: ${message}`);
    }

    /**
     * 토스트 생성
     */
    createToast(type, message) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: '✅',
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
            <span class="toast-message">${message}</span>
        `;
        
        return toast;
    }

    /**
     * UI 애니메이션 (패널 토글 등)
     */
    animatePanel(panel, action) {
        const panelId = panel === 'left' ? 'panel_left' : 'panel_right';
        const panelElement = document.getElementById(panelId);
        
        if (!panelElement) return;
        
        if (action === 'show') {
            panelElement.classList.add('panel-slide-in');
            panelElement.classList.remove('panel-slide-out');
        } else if (action === 'hide') {
            panelElement.classList.add('panel-slide-out');
            panelElement.classList.remove('panel-slide-in');
        }
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
        // 모든 오버레이 제거
        document.querySelectorAll('.panel-overlay').forEach(overlay => {
            overlay.remove();
        });
        
        // 모든 토스트 제거
        document.querySelectorAll('.toast').forEach(toast => {
            toast.remove();
        });
        
        // 상태 정리
        this.panelStates.clear();
        this.loadingElements.clear();
        
        // EventBus 정리는 전역에서 관리됨
        this.eventBus = null;
        
        console.log('🧹 UIManager 정리 완료');
    }
}

// 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
} else {
    window.UIManager = UIManager;
}