/**
 * EventBus.js - 중앙 이벤트 관리 시스템
 * 모든 모듈 간 통신을 처리하는 전역 이벤트 버스
 */

class EventBus {
    constructor() {
        this.events = new EventTarget();
        this.listeners = new Map(); // 리스너 추적을 위한 맵
        this.eventHistory = []; // 디버깅용 이벤트 기록
        this.maxHistorySize = 100;
        
        // 디버그 모드
        this.debugMode = false;
        
        console.log('🎯 EventBus 초기화 완료');
    }

    /**
     * 이벤트 발생
     */
    emit(eventName, data = null) {
        const event = new CustomEvent(eventName, { 
            detail: data,
            bubbles: true,
            cancelable: true 
        });
        
        // 이벤트 기록 저장
        this.addToHistory(eventName, data, 'emit');
        
        if (this.debugMode) {
            console.log(`📡 EventBus emit: ${eventName}`, data);
        }
        
        this.events.dispatchEvent(event);
        return event;
    }

    /**
     * 이벤트 리스너 등록
     */
    on(eventName, callback, options = {}) {
        if (typeof callback !== 'function') {
            console.error('❌ EventBus: 콜백은 함수여야 합니다');
            return false;
        }

        // 리스너 추적
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName).add(callback);

        this.events.addEventListener(eventName, callback, options);
        
        if (this.debugMode) {
            console.log(`👂 EventBus on: ${eventName} (총 ${this.listeners.get(eventName).size}개 리스너)`);
        }
        
        return true;
    }

    /**
     * 일회성 이벤트 리스너 등록
     */
    once(eventName, callback) {
        const onceCallback = (event) => {
            this.off(eventName, onceCallback);
            callback(event);
        };
        
        return this.on(eventName, onceCallback, { once: true });
    }

    /**
     * 이벤트 리스너 제거
     */
    off(eventName, callback) {
        if (callback) {
            // 특정 리스너 제거
            this.events.removeEventListener(eventName, callback);
            
            if (this.listeners.has(eventName)) {
                this.listeners.get(eventName).delete(callback);
                
                if (this.listeners.get(eventName).size === 0) {
                    this.listeners.delete(eventName);
                }
            }
        } else {
            // 모든 리스너 제거
            if (this.listeners.has(eventName)) {
                this.listeners.get(eventName).forEach(listener => {
                    this.events.removeEventListener(eventName, listener);
                });
                this.listeners.delete(eventName);
            }
        }
        
        if (this.debugMode) {
            console.log(`🔇 EventBus off: ${eventName}`);
        }
    }

    /**
     * 모든 이벤트 리스너 제거
     */
    removeAllListeners() {
        this.listeners.forEach((callbacks, eventName) => {
            callbacks.forEach(callback => {
                this.events.removeEventListener(eventName, callback);
            });
        });
        
        this.listeners.clear();
        console.log('🧹 EventBus: 모든 리스너 제거됨');
    }

    /**
     * 이벤트 기록 추가
     */
    addToHistory(eventName, data, action) {
        const historyEntry = {
            timestamp: Date.now(),
            eventName,
            data,
            action,
            id: Math.random().toString(36).substr(2, 9)
        };
        
        this.eventHistory.push(historyEntry);
        
        // 최대 기록 수 제한
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }

    /**
     * 이벤트 기록 조회
     */
    getHistory(eventName = null, limit = 20) {
        let history = [...this.eventHistory];
        
        if (eventName) {
            history = history.filter(entry => entry.eventName === eventName);
        }
        
        return history.slice(-limit).reverse();
    }

    /**
     * 현재 등록된 리스너 정보 조회
     */
    getListenerInfo() {
        const info = {};
        this.listeners.forEach((callbacks, eventName) => {
            info[eventName] = callbacks.size;
        });
        return info;
    }

    /**
     * 디버그 모드 토글
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`🐛 EventBus 디버그 모드: ${enabled ? '활성화' : '비활성화'}`);
    }

    /**
     * 이벤트 통계 조회
     */
    getStats() {
        const stats = {
            totalListeners: 0,
            eventTypes: this.listeners.size,
            historySize: this.eventHistory.length,
            recentEvents: this.getHistory(null, 5)
        };
        
        this.listeners.forEach(callbacks => {
            stats.totalListeners += callbacks.size;
        });
        
        return stats;
    }

    /**
     * Promise 기반 이벤트 대기
     */
    waitFor(eventName, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.off(eventName, handler);
                reject(new Error(`이벤트 대기 시간 초과: ${eventName} (${timeout}ms)`));
            }, timeout);
            
            const handler = (event) => {
                clearTimeout(timeoutId);
                resolve(event.detail);
            };
            
            this.once(eventName, handler);
        });
    }

    /**
     * 여러 이벤트 동시 대기
     */
    waitForAll(eventNames, timeout = 10000) {
        const promises = eventNames.map(eventName => 
            this.waitFor(eventName, timeout)
        );
        
        return Promise.all(promises);
    }

    /**
     * 조건부 이벤트 리스너
     */
    onCondition(eventName, condition, callback) {
        const conditionalCallback = (event) => {
            if (condition(event.detail)) {
                callback(event);
            }
        };
        
        return this.on(eventName, conditionalCallback);
    }

    /**
     * 이벤트 필터링
     */
    filter(eventName, filterFn) {
        const filteredEventName = `${eventName}:filtered:${Date.now()}`;
        
        this.on(eventName, (event) => {
            if (filterFn(event.detail)) {
                this.emit(filteredEventName, event.detail);
            }
        });
        
        return filteredEventName;
    }

    /**
     * 이벤트 그룹화 (배치 처리)
     */
    batch(eventName, batchSize = 10, timeWindow = 1000) {
        let batch = [];
        let timeoutId = null;
        const batchEventName = `${eventName}:batch`;
        
        const processBatch = () => {
            if (batch.length > 0) {
                this.emit(batchEventName, [...batch]);
                batch = [];
            }
            timeoutId = null;
        };
        
        this.on(eventName, (event) => {
            batch.push(event.detail);
            
            if (batch.length >= batchSize) {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                processBatch();
            } else if (!timeoutId) {
                timeoutId = setTimeout(processBatch, timeWindow);
            }
        });
        
        return batchEventName;
    }

    /**
     * 정리 및 해제
     */
    dispose() {
        this.removeAllListeners();
        this.eventHistory = [];
        this.events = null;
        console.log('🧹 EventBus 정리 완료');
    }
}

// 전역 EventBus 인스턴스 생성
const eventBus = new EventBus();

// 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventBus, eventBus };
} else {
    window.EventBus = EventBus;
    window.eventBus = eventBus;
}

// 전역 함수로도 제공 (편의성)
if (typeof window !== 'undefined') {
    window.$emit = (eventName, data) => eventBus.emit(eventName, data);
    window.$on = (eventName, callback, options) => eventBus.on(eventName, callback, options);
    window.$off = (eventName, callback) => eventBus.off(eventName, callback);
    window.$once = (eventName, callback) => eventBus.once(eventName, callback);
}