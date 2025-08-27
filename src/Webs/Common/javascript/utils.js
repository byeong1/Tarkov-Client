// =========================
// Tarkov Tracker - Common Utilities
// =========================

// 공통 유틸리티 클래스
class CommonUtils {
    // API 요청 헬퍼
    static async apiRequest(url, options = {}) {
        try {
            const defaultOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const config = { ...defaultOptions, ...options };
            if (config.body && typeof config.body === 'object') {
                config.body = JSON.stringify(config.body);
            }

            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API 요청 실패:', error);
            throw error;
        }
    }

    // GraphQL 쿼리 실행
    static async graphqlQuery(query, variables = {}) {
        const tarkovApiUrl = 'https://api.tarkov.dev/graphql';
        
        return await this.apiRequest(tarkovApiUrl, {
            method: 'POST',
            body: {
                query,
                variables
            }
        });
    }

    // 로컬 스토리지 관리
    static storage = {
        get: (key, defaultValue = null) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('로컬 스토리지 읽기 실패:', error);
                return defaultValue;
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
        },

        clear: () => {
            localStorage.clear();
        }
    };

    // 숫자 포맷팅
    static formatNumber(num) {
        return new Intl.NumberFormat('ko-KR').format(num);
    }

    // 시간 포맷팅
    static formatTime(timestamp) {
        return new Date(timestamp).toLocaleString('ko-KR');
    }

    // 디바운스 함수
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 스로틀 함수
    static throttle(func, wait) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, wait);
            }
        };
    }

    // DOM 요소 생성 헬퍼
    static createElement(tag, options = {}) {
        const element = document.createElement(tag);
        
        if (options.className) {
            element.className = options.className;
        }
        
        if (options.id) {
            element.id = options.id;
        }
        
        if (options.textContent) {
            element.textContent = options.textContent;
        }
        
        if (options.innerHTML) {
            element.innerHTML = options.innerHTML;
        }
        
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }
        
        if (options.styles) {
            Object.entries(options.styles).forEach(([key, value]) => {
                element.style[key] = value;
            });
        }
        
        if (options.eventListeners) {
            Object.entries(options.eventListeners).forEach(([event, handler]) => {
                element.addEventListener(event, handler);
            });
        }
        
        return element;
    }

    // 이벤트 에미터
    static createEventEmitter() {
        const events = {};
        
        return {
            on: (event, callback) => {
                if (!events[event]) {
                    events[event] = [];
                }
                events[event].push(callback);
            },

            off: (event, callback) => {
                if (events[event]) {
                    events[event] = events[event].filter(cb => cb !== callback);
                }
            },

            emit: (event, ...args) => {
                if (events[event]) {
                    events[event].forEach(callback => callback(...args));
                }
            }
        };
    }

    // 퀘스트 상태 관련 유틸리티
    static questUtils = {
        getStatusIcon: (status) => {
            const statusIcons = {
                'active': '🟢',
                'locked': '🔴',
                'available': '⚪',
                'completed': '⚫'
            };
            return statusIcons[status] || '⚪';
        },

        getStatusText: (status) => {
            const statusTexts = {
                'active': '진행 중',
                'locked': '진행 불가',
                'available': '진행 가능', 
                'completed': '완료됨'
            };
            return statusTexts[status] || '알 수 없음';
        },

        getStatusClass: (status) => {
            return `quest-status-${status}`;
        }
    };

    // 로딩 상태 관리
    static loading = {
        show: (container, message = '로딩 중...') => {
            const loadingElement = CommonUtils.createElement('div', {
                className: 'loading-overlay',
                innerHTML: `
                    <div class="loading-spinner"></div>
                    <div class="loading-message">${message}</div>
                `
            });
            
            if (typeof container === 'string') {
                container = document.querySelector(container);
            }
            
            if (container) {
                container.appendChild(loadingElement);
                return loadingElement;
            }
        },

        hide: (loadingElement) => {
            if (loadingElement && loadingElement.parentNode) {
                loadingElement.parentNode.removeChild(loadingElement);
            }
        }
    };

    // 에러 처리
    static handleError(error, context = '') {
        console.error(`오류 발생${context ? ` (${context})` : ''}:`, error);
        
        // 사용자에게 표시할 오류 메시지 생성
        let userMessage = '오류가 발생했습니다.';
        
        if (error.message) {
            if (error.message.includes('Failed to fetch')) {
                userMessage = '네트워크 연결을 확인해 주세요.';
            } else if (error.message.includes('404')) {
                userMessage = '요청한 리소스를 찾을 수 없습니다.';
            } else if (error.message.includes('500')) {
                userMessage = '서버 오류가 발생했습니다.';
            }
        }
        
        return userMessage;
    }
}

// 전역 사용을 위해 window 객체에 등록
window.CommonUtils = CommonUtils;