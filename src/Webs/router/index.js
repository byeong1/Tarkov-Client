// =========================
// Tarkov Tracker SPA - Router System
// =========================

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.contentContainer = null;
        this.loadedScripts = new Set();
        this.loadedStyles = new Set();
    }

    // 라우트 등록
    addRoute(name, config) {
        this.routes.set(name, {
            name,
            path: config.path,
            script: config.script,
            css: config.css,
            component: null
        });
    }

    // 라우팅 실행
    async navigate(routeName) {
        if (!this.contentContainer) {
            this.contentContainer = document.getElementById('app-content');
            if (!this.contentContainer) {
                throw new Error('콘텐츠 컨테이너를 찾을 수 없습니다.');
            }
        }

        const route = this.routes.get(routeName);
        if (!route) {
            console.error(`라우트를 찾을 수 없습니다: ${routeName}`);
            return false;
        }

        try {
            console.log(`라우팅 시작: ${routeName}`);

            // 현재 컴포넌트 정리
            await this.cleanup();

            // 새 컴포넌트 로드
            await this.loadComponent(route);

            this.currentRoute = routeName;
            console.log(`라우팅 완료: ${routeName}`);
            return true;

        } catch (error) {
            console.error(`라우팅 실패 (${routeName}):`, error);
            return false;
        }
    }

    // 컴포넌트 로드
    async loadComponent(route) {
        try {
            // 1. HTML 로드
            const html = await this.loadHTML(route.path);
            this.contentContainer.innerHTML = html;

            // 2. CSS 로드
            if (route.css && !this.loadedStyles.has(route.css)) {
                await this.loadCSS(route.css);
            }

            // 3. JavaScript 로드 및 컴포넌트 초기화
            if (route.script && !this.loadedScripts.has(route.script)) {
                await this.loadScript(route.script);
            }

            // 4. 컴포넌트 클래스 인스턴스 생성
            const componentClassName = this.getComponentClassName(route.name);
            if (window[componentClassName]) {
                route.component = new window[componentClassName]();
                
                // 전역 현재 컴포넌트 설정
                if (window.app && window.app.setCurrentComponent) {
                    window.app.setCurrentComponent(route.component);
                }

                // 컴포넌트 초기화
                if (route.component.init) {
                    await route.component.init();
                }

                console.log(`컴포넌트 초기화 완료: ${componentClassName}`);
            } else {
                console.warn(`컴포넌트 클래스를 찾을 수 없습니다: ${componentClassName}`);
            }

        } catch (error) {
            console.error('컴포넌트 로드 실패:', error);
            throw error;
        }
    }

    // HTML 파일 로드
    async loadHTML(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTML 로드 실패: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`HTML 로드 오류 (${path}):`, error);
            throw error;
        }
    }

    // CSS 파일 로드
    async loadCSS(path) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = path;
            
            link.onload = () => {
                this.loadedStyles.add(path);
                console.log(`CSS 로드 완료: ${path}`);
                resolve();
            };
            
            link.onerror = () => {
                console.error(`CSS 로드 실패: ${path}`);
                reject(new Error(`CSS 로드 실패: ${path}`));
            };

            document.head.appendChild(link);
        });
    }

    // JavaScript 파일 로드
    async loadScript(path) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = path;
            script.async = true;
            
            script.onload = () => {
                this.loadedScripts.add(path);
                console.log(`JavaScript 로드 완료: ${path}`);
                resolve();
            };
            
            script.onerror = () => {
                console.error(`JavaScript 로드 실패: ${path}`);
                reject(new Error(`JavaScript 로드 실패: ${path}`));
            };

            document.head.appendChild(script);
        });
    }

    // 컴포넌트 클래스명 생성
    getComponentClassName(routeName) {
        return routeName.charAt(0).toUpperCase() + routeName.slice(1) + 'Component';
    }

    // 현재 컴포넌트 정리
    async cleanup() {
        if (this.currentRoute) {
            const currentRouteObj = this.routes.get(this.currentRoute);
            if (currentRouteObj && currentRouteObj.component) {
                // 컴포넌트 정리 메서드 호출
                if (currentRouteObj.component.cleanup) {
                    await currentRouteObj.component.cleanup();
                }
                currentRouteObj.component = null;
            }
        }

        // 현재 컴포넌트 전역 참조 제거
        if (window.app && window.app.setCurrentComponent) {
            window.app.setCurrentComponent(null);
        }
    }

    // 현재 라우트 반환
    getCurrentRoute() {
        return this.currentRoute;
    }

    // 라우트 목록 반환
    getRoutes() {
        return Array.from(this.routes.keys());
    }

    // 브라우저 뒤로가기/앞으로가기 지원 (향후 확장용)
    setupHistoryAPI() {
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.route) {
                this.navigate(event.state.route);
            }
        });
    }

    // 히스토리 상태 추가 (향후 확장용)
    pushState(routeName) {
        const state = { route: routeName };
        const url = `#${routeName}`;
        history.pushState(state, '', url);
    }
}

// 전역 Router 클래스 등록
window.Router = Router;