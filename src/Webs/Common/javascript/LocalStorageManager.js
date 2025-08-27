// =========================
// LocalStorage 관리 클래스
// =========================
class LocalStorageManager {
    // 기본 데이터 저장/로드
    static getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(`tarkov_${key}`);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`LocalStorage 읽기 오류 (${key}):`, error);
            return defaultValue;
        }
    }
    
    static setItem(key, value) {
        try {
            localStorage.setItem(`tarkov_${key}`, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`LocalStorage 저장 오류 (${key}):`, error);
            return false;
        }
    }
    
    // 사용자 프로필 관리
    static getUserProfile() {
        return this.getItem('userProfile', {
            playerLevel: 1,
            playStyle: 'pve' // pve 또는 pvp
        });
    }
    
    static setUserProfile(profile) {
        return this.setItem('userProfile', profile);
    }
    
    static getTaskProgress(taskId) {
        const allProgress = this.getItem('taskProgress', {});
        return allProgress[taskId] || {
            status: 'available', // 기본상태: available (locked는 calculateQuestStatus에서 동적 결정)
            objectives: {},
            timestamp: Date.now()
        };
    }
    
    static updateTaskProgress(taskId, progress) {
        const allProgress = this.getItem('taskProgress', {});
        allProgress[taskId] = { 
            ...allProgress[taskId], 
            ...progress,
            timestamp: Date.now()
        };
        return this.setItem('taskProgress', allProgress);
    }
    
    // 전체 진행상황 조회
    static getAllTaskProgress() {
        return this.getItem('taskProgress', {});
    }
}

// 모듈 export (다른 파일에서 사용할 수 있도록)
window.LocalStorageManager = LocalStorageManager;