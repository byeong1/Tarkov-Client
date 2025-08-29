# TarkovClient UI 컴포넌트 설계 (UI Components Design)

## 📱 UI 아키텍처 개요

### 컴포넌트 계층 구조
TarkovClient의 지도 시스템은 Leaflet.js 기반의 반응형 웹 컴포넌트로 구성됩니다:

```
MapContainer
├── MapControls
│   ├── ZoomControls
│   ├── LayerControls
│   └── SettingsPanel
├── PlayerMarker
│   ├── PositionIndicator
│   ├── DirectionArrow
│   └── PlayerTooltip
├── MapOverlays
│   ├── GridOverlay
│   ├── LootOverlay
│   └── ExitOverlay
└── StatusBar
    ├── CoordinateDisplay
    ├── ConnectionStatus
    └── MapInfo
```

---

## 🗺️ 메인 맵 컨테이너 (MapContainer)

### HTML 구조
```html
<div id="tarkov-map-container" class="map-container">
    <div id="map" class="leaflet-map"></div>
    
    <!-- 오버레이 컨트롤 -->
    <div class="map-controls">
        <div class="control-panel left">
            <button id="zoom-in" class="control-btn">
                <i class="icon-zoom-in"></i>
            </button>
            <button id="zoom-out" class="control-btn">
                <i class="icon-zoom-out"></i>
            </button>
        </div>
        
        <div class="control-panel right">
            <button id="layers-toggle" class="control-btn">
                <i class="icon-layers"></i>
            </button>
            <button id="settings-toggle" class="control-btn">
                <i class="icon-settings"></i>
            </button>
        </div>
    </div>
    
    <!-- 상태 표시바 -->
    <div class="status-bar">
        <div class="status-item">
            <span class="label">좌표:</span>
            <span id="current-coords">---, ---</span>
        </div>
        <div class="status-item">
            <span class="label">맵:</span>
            <span id="current-map">Loading...</span>
        </div>
        <div class="status-item">
            <span id="connection-status" class="status-indicator offline">
                ● 연결 대기중
            </span>
        </div>
    </div>
</div>
```

### CSS 스타일
```css
/* 메인 컨테이너 */
.map-container {
    position: relative;
    width: 100%;
    height: 100vh;
    background-color: #2c2c2c;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.leaflet-map {
    width: 100%;
    height: 100%;
    background-color: #1a1a1a;
}

/* 컨트롤 패널 */
.map-controls {
    position: absolute;
    top: 10px;
    width: 100%;
    z-index: 1000;
    pointer-events: none;
}

.control-panel {
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.control-panel.left {
    position: absolute;
    left: 10px;
}

.control-panel.right {
    position: absolute;
    right: 10px;
}

.control-btn {
    width: 40px;
    height: 40px;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid #444;
    border-radius: 8px;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.control-btn:hover {
    background: rgba(0, 0, 0, 0.9);
    border-color: #666;
    transform: scale(1.05);
}

/* 상태 표시바 */
.status-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40px;
    background: linear-gradient(to right, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.7));
    display: flex;
    align-items: center;
    padding: 0 15px;
    z-index: 1000;
}

.status-item {
    margin-right: 20px;
    color: #ccc;
    font-size: 14px;
}

.status-item .label {
    font-weight: 600;
    margin-right: 5px;
}

.status-indicator {
    font-weight: bold;
}

.status-indicator.online {
    color: #4caf50;
}

.status-indicator.offline {
    color: #f44336;
}
```

---

## 👤 플레이어 마커 시스템 (PlayerMarker)

### 마커 클래스 정의
```javascript
class TarkovPlayerMarker {
    constructor(map, options = {}) {
        this.map = map;
        this.options = {
            size: 16,
            color: '#ff4444',
            rotationOffset: 0,
            showDirection: true,
            showTooltip: true,
            ...options
        };
        
        this.marker = null;
        this.directionIndicator = null;
        this.tooltip = null;
        
        this.createMarker();
    }
    
    createMarker() {
        // SVG 아이콘 생성
        const iconSvg = this.createPlayerIcon();
        
        // 커스텀 아이콘 정의
        const playerIcon = L.divIcon({
            html: iconSvg,
            className: 'tarkov-player-marker',
            iconSize: [this.options.size, this.options.size],
            iconAnchor: [this.options.size / 2, this.options.size / 2]
        });
        
        // 마커 생성
        this.marker = L.marker([0, 0], { 
            icon: playerIcon,
            zIndexOffset: 1000 
        });
        
        // 방향 표시기 생성
        if (this.options.showDirection) {
            this.createDirectionIndicator();
        }
        
        // 툴팁 생성
        if (this.options.showTooltip) {
            this.createTooltip();
        }
    }
    
    createPlayerIcon() {
        const size = this.options.size;
        const color = this.options.color;
        
        return `
            <svg width="${size}" height="${size}" viewBox="0 0 16 16" class="player-icon">
                <circle cx="8" cy="8" r="6" 
                        fill="${color}" 
                        stroke="#fff" 
                        stroke-width="2"/>
                <circle cx="8" cy="8" r="2" fill="#fff"/>
                ${this.options.showDirection ? this.createArrowSvg() : ''}
            </svg>
        `;
    }
    
    createArrowSvg() {
        return `
            <polygon points="8,2 10,6 6,6" 
                     fill="#fff" 
                     class="direction-arrow"/>
        `;
    }
    
    updatePosition(lat, lng, rotation = 0) {
        if (!this.marker) return;
        
        // 위치 업데이트
        this.marker.setLatLng([lat, lng]);
        
        // 회전 업데이트
        if (this.options.showDirection) {
            this.updateRotation(rotation);
        }
        
        // 툴팁 업데이트
        if (this.tooltip) {
            this.updateTooltip(lat, lng, rotation);
        }
        
        // 부드러운 애니메이션
        this.animateMovement();
    }
    
    updateRotation(rotation) {
        const element = this.marker.getElement();
        if (element) {
            const adjustedRotation = rotation + this.options.rotationOffset;
            element.style.transform += ` rotate(${adjustedRotation}deg)`;
        }
    }
    
    addToMap() {
        this.marker.addTo(this.map);
    }
    
    removeFromMap() {
        this.map.removeLayer(this.marker);
    }
}
```

### 마커 스타일
```css
/* 플레이어 마커 */
.tarkov-player-marker {
    transition: all 0.3s ease-in-out;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.tarkov-player-marker:hover {
    transform: scale(1.2) !important;
}

.player-icon {
    animation: playerPulse 2s infinite;
}

@keyframes playerPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.direction-arrow {
    transform-origin: 8px 8px;
}

/* 플레이어 툴팁 */
.player-tooltip {
    background: rgba(0, 0, 0, 0.9);
    color: #fff;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    border: 1px solid #444;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.player-tooltip .coord-info {
    margin-bottom: 4px;
}

.player-tooltip .rotation-info {
    color: #aaa;
    font-size: 11px;
}
```

---

## 🎛️ 컨트롤 시스템 (Controls)

### 확대/축소 컨트롤
```javascript
class ZoomControls {
    constructor(map) {
        this.map = map;
        this.initializeControls();
    }
    
    initializeControls() {
        // 확대 버튼
        document.getElementById('zoom-in').addEventListener('click', () => {
            this.map.zoomIn();
            this.updateZoomIndicator();
        });
        
        // 축소 버튼
        document.getElementById('zoom-out').addEventListener('click', () => {
            this.map.zoomOut();
            this.updateZoomIndicator();
        });
        
        // 마우스 휠 이벤트
        this.map.on('zoomend', () => {
            this.updateZoomIndicator();
        });
    }
    
    updateZoomIndicator() {
        const currentZoom = this.map.getZoom();
        const maxZoom = this.map.getMaxZoom();
        const minZoom = this.map.getMinZoom();
        
        // 버튼 상태 업데이트
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        
        zoomInBtn.disabled = currentZoom >= maxZoom;
        zoomOutBtn.disabled = currentZoom <= minZoom;
    }
}
```

### 레이어 컨트롤
```javascript
class LayerControls {
    constructor(map) {
        this.map = map;
        this.layers = {
            grid: null,
            loot: null,
            exits: null,
            spawns: null
        };
        this.initializeControls();
    }
    
    initializeControls() {
        this.createLayerPanel();
        this.bindEvents();
    }
    
    createLayerPanel() {
        const layerPanel = document.createElement('div');
        layerPanel.className = 'layer-panel';
        layerPanel.style.display = 'none';
        layerPanel.innerHTML = `
            <div class="layer-header">
                <h3>레이어 설정</h3>
                <button class="close-btn">&times;</button>
            </div>
            <div class="layer-options">
                <label class="layer-option">
                    <input type="checkbox" id="layer-grid" checked>
                    <span>격자 표시</span>
                </label>
                <label class="layer-option">
                    <input type="checkbox" id="layer-loot">
                    <span>아이템 위치</span>
                </label>
                <label class="layer-option">
                    <input type="checkbox" id="layer-exits">
                    <span>출구 위치</span>
                </label>
                <label class="layer-option">
                    <input type="checkbox" id="layer-spawns">
                    <span>스폰 지점</span>
                </label>
            </div>
        `;
        
        document.querySelector('.map-container').appendChild(layerPanel);
        this.layerPanel = layerPanel;
    }
    
    bindEvents() {
        // 레이어 패널 토글
        document.getElementById('layers-toggle').addEventListener('click', () => {
            this.toggleLayerPanel();
        });
        
        // 레이어 체크박스 이벤트
        Object.keys(this.layers).forEach(layerName => {
            const checkbox = document.getElementById(`layer-${layerName}`);
            checkbox.addEventListener('change', (e) => {
                this.toggleLayer(layerName, e.target.checked);
            });
        });
    }
    
    toggleLayer(layerName, enabled) {
        if (enabled && !this.layers[layerName]) {
            this.loadLayer(layerName);
        } else if (!enabled && this.layers[layerName]) {
            this.map.removeLayer(this.layers[layerName]);
        }
    }
    
    async loadLayer(layerName) {
        try {
            switch(layerName) {
                case 'grid':
                    this.layers.grid = this.createGridLayer();
                    break;
                case 'loot':
                    this.layers.loot = await this.createLootLayer();
                    break;
                case 'exits':
                    this.layers.exits = await this.createExitsLayer();
                    break;
                case 'spawns':
                    this.layers.spawns = await this.createSpawnsLayer();
                    break;
            }
            
            if (this.layers[layerName]) {
                this.layers[layerName].addTo(this.map);
            }
        } catch (error) {
            console.error(`Failed to load layer ${layerName}:`, error);
        }
    }
}
```

---

## ⚙️ 설정 패널 (SettingsPanel)

### 설정 UI 구조
```html
<div class="settings-panel" style="display: none;">
    <div class="settings-header">
        <h3>지도 설정</h3>
        <button class="close-btn">&times;</button>
    </div>
    
    <div class="settings-content">
        <!-- 표시 설정 -->
        <div class="setting-group">
            <h4>표시 옵션</h4>
            <div class="setting-item">
                <label>플레이어 마커 크기</label>
                <input type="range" id="marker-size" min="12" max="32" value="16">
                <span id="marker-size-value">16px</span>
            </div>
            <div class="setting-item">
                <label>
                    <input type="checkbox" id="show-direction" checked>
                    방향 표시
                </label>
            </div>
            <div class="setting-item">
                <label>
                    <input type="checkbox" id="show-coordinates" checked>
                    좌표 표시
                </label>
            </div>
        </div>
        
        <!-- 성능 설정 -->
        <div class="setting-group">
            <h4>성능</h4>
            <div class="setting-item">
                <label>업데이트 주기</label>
                <select id="update-interval">
                    <option value="100">10 FPS (100ms)</option>
                    <option value="50" selected>20 FPS (50ms)</option>
                    <option value="33">30 FPS (33ms)</option>
                </select>
            </div>
            <div class="setting-item">
                <label>
                    <input type="checkbox" id="smooth-movement" checked>
                    부드러운 이동
                </label>
            </div>
        </div>
        
        <!-- 맵 설정 -->
        <div class="setting-group">
            <h4>맵 옵션</h4>
            <div class="setting-item">
                <label>
                    <input type="checkbox" id="auto-center" checked>
                    자동 중앙 정렬
                </label>
            </div>
            <div class="setting-item">
                <label>
                    <input type="checkbox" id="auto-zoom">
                    자동 줌 조정
                </label>
            </div>
        </div>
    </div>
    
    <div class="settings-footer">
        <button class="btn-primary" id="apply-settings">적용</button>
        <button class="btn-secondary" id="reset-settings">초기화</button>
    </div>
</div>
```

### 설정 관리 클래스
```javascript
class SettingsManager {
    constructor(map, playerMarker) {
        this.map = map;
        this.playerMarker = playerMarker;
        this.settings = this.loadSettings();
        this.initializePanel();
    }
    
    loadSettings() {
        const defaults = {
            markerSize: 16,
            showDirection: true,
            showCoordinates: true,
            updateInterval: 50,
            smoothMovement: true,
            autoCenter: true,
            autoZoom: false
        };
        
        try {
            const saved = localStorage.getItem('tarkov-map-settings');
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch {
            return defaults;
        }
    }
    
    saveSettings() {
        try {
            localStorage.setItem('tarkov-map-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }
    
    applySettings() {
        // 마커 설정 적용
        if (this.playerMarker) {
            this.playerMarker.updateOptions({
                size: this.settings.markerSize,
                showDirection: this.settings.showDirection
            });
        }
        
        // 업데이트 주기 설정
        this.updatePositionUpdateInterval();
        
        // 기타 설정 적용
        this.applyMapSettings();
    }
    
    updatePositionUpdateInterval() {
        if (window.positionUpdateTimer) {
            clearInterval(window.positionUpdateTimer);
        }
        
        // 새로운 업데이트 주기로 타이머 설정
        window.positionUpdateTimer = setInterval(() => {
            this.checkForPositionUpdates();
        }, this.settings.updateInterval);
    }
}
```

---

## 📱 반응형 디자인 (Responsive Design)

### 모바일 최적화
```css
/* 태블릿 및 모바일 */
@media (max-width: 768px) {
    .control-panel {
        gap: 3px;
    }
    
    .control-btn {
        width: 35px;
        height: 35px;
        font-size: 14px;
    }
    
    .status-bar {
        font-size: 12px;
        height: 35px;
    }
    
    .status-item {
        margin-right: 15px;
    }
    
    /* 설정 패널 모바일 최적화 */
    .settings-panel {
        width: 100% !important;
        height: 100% !important;
        border-radius: 0 !important;
    }
    
    .layer-panel {
        width: 100% !important;
        border-radius: 0 !important;
    }
}

/* 스마트폰 */
@media (max-width: 480px) {
    .map-controls {
        top: 5px;
    }
    
    .control-panel.left {
        left: 5px;
    }
    
    .control-panel.right {
        right: 5px;
    }
    
    .control-btn {
        width: 30px;
        height: 30px;
        font-size: 12px;
    }
    
    .status-bar {
        font-size: 10px;
        height: 30px;
        padding: 0 10px;
    }
    
    .status-item {
        margin-right: 10px;
    }
    
    .status-item .label {
        display: none; /* 모바일에서는 레이블 숨김 */
    }
}
```

### 터치 인터페이스 지원
```javascript
class TouchInterface {
    constructor(map) {
        this.map = map;
        this.touchStartTime = 0;
        this.lastTap = 0;
        this.initializeTouchEvents();
    }
    
    initializeTouchEvents() {
        const mapContainer = this.map.getContainer();
        
        // 더블 탭으로 줌
        mapContainer.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - this.lastTap;
            
            if (tapLength < 500 && tapLength > 0) {
                e.preventDefault();
                this.map.zoomIn();
            }
            
            this.lastTap = currentTime;
        });
        
        // 길게 누르기로 설정 메뉴
        mapContainer.addEventListener('touchstart', (e) => {
            this.touchStartTime = Date.now();
        });
        
        mapContainer.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - this.touchStartTime;
            if (touchDuration > 800) {
                this.showContextMenu(e);
            }
        });
    }
    
    showContextMenu(e) {
        // 터치 위치에 컨텍스트 메뉴 표시
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <div class="menu-item" data-action="center">현재 위치로 이동</div>
            <div class="menu-item" data-action="settings">설정</div>
            <div class="menu-item" data-action="layers">레이어</div>
        `;
        
        // 위치 계산 및 표시
        const rect = this.map.getContainer().getBoundingClientRect();
        const touch = e.changedTouches[0];
        menu.style.left = (touch.clientX - rect.left) + 'px';
        menu.style.top = (touch.clientY - rect.top) + 'px';
        
        this.map.getContainer().appendChild(menu);
        
        // 메뉴 항목 클릭 이벤트
        menu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            this.handleContextMenuAction(action);
            menu.remove();
        });
        
        // 외부 클릭 시 메뉴 닫기
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 100);
    }
}
```

---

## 🎨 테마 시스템 (Theme System)

### 다크/라이트 테마
```css
/* 다크 테마 (기본) */
:root {
    --bg-primary: #2c2c2c;
    --bg-secondary: #1a1a1a;
    --text-primary: #ffffff;
    --text-secondary: #cccccc;
    --border-color: #444444;
    --accent-color: #ff4444;
    --success-color: #4caf50;
    --error-color: #f44336;
}

/* 라이트 테마 */
[data-theme="light"] {
    --bg-primary: #f5f5f5;
    --bg-secondary: #ffffff;
    --text-primary: #333333;
    --text-secondary: #666666;
    --border-color: #dddddd;
    --accent-color: #2196f3;
    --success-color: #4caf50;
    --error-color: #f44336;
}

.map-container {
    background-color: var(--bg-primary);
    color: var(--text-primary);
}

.leaflet-map {
    background-color: var(--bg-secondary);
}

.control-btn {
    background: var(--bg-secondary);
    border-color: var(--border-color);
    color: var(--text-primary);
}

.status-bar {
    background: linear-gradient(to right, 
        var(--bg-secondary), 
        transparent);
    color: var(--text-secondary);
}
```

### 테마 전환 기능
```javascript
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.applyTheme(this.currentTheme);
    }
    
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.currentTheme = theme;
        
        // Leaflet 맵 스타일도 업데이트
        this.updateMapTheme(theme);
    }
    
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    }
    
    updateMapTheme(theme) {
        // 맵 타일 레이어 변경 (필요시)
        if (window.tarkovMap && window.tarkovMap.map) {
            // 테마에 따른 맵 스타일 조정
            const mapContainer = window.tarkovMap.map.getContainer();
            mapContainer.classList.toggle('light-theme', theme === 'light');
        }
    }
}
```

---

## 📊 성능 최적화 컴포넌트

### 가상 스크롤링
```javascript
class VirtualLayerManager {
    constructor(map, options = {}) {
        this.map = map;
        this.options = {
            maxMarkersPerView: 500,
            updateThreshold: 100,
            ...options
        };
        
        this.visibleMarkers = new Set();
        this.allMarkers = new Map();
        this.lastViewBounds = null;
        
        this.initializeViewportTracking();
    }
    
    initializeViewportTracking() {
        this.map.on('moveend zoomend', () => {
            this.updateVisibleMarkers();
        });
    }
    
    updateVisibleMarkers() {
        const bounds = this.map.getBounds();
        const currentZoom = this.map.getZoom();
        
        // 현재 뷰포트에 있는 마커들만 표시
        const markersInView = this.getMarkersInBounds(bounds);
        
        // 기존 마커 숨기기
        this.visibleMarkers.forEach(markerId => {
            if (!markersInView.has(markerId)) {
                this.hideMarker(markerId);
            }
        });
        
        // 새로운 마커 표시
        markersInView.forEach(markerId => {
            if (!this.visibleMarkers.has(markerId)) {
                this.showMarker(markerId);
            }
        });
        
        this.visibleMarkers = markersInView;
        this.lastViewBounds = bounds;
    }
    
    addMarker(id, marker, position) {
        this.allMarkers.set(id, { marker, position });
        
        // 현재 뷰포트에 있으면 즉시 표시
        if (this.isInCurrentView(position)) {
            this.showMarker(id);
        }
    }
    
    removeMarker(id) {
        const markerData = this.allMarkers.get(id);
        if (markerData && this.visibleMarkers.has(id)) {
            this.map.removeLayer(markerData.marker);
        }
        
        this.allMarkers.delete(id);
        this.visibleMarkers.delete(id);
    }
}
```

### 애니메이션 최적화
```javascript
class AnimationOptimizer {
    constructor() {
        this.animationQueue = [];
        this.isAnimating = false;
        this.frameRate = 60;
        this.frameInterval = 1000 / this.frameRate;
        this.lastFrameTime = 0;
    }
    
    queueAnimation(animation) {
        this.animationQueue.push(animation);
        this.startAnimationLoop();
    }
    
    startAnimationLoop() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.animateFrame();
    }
    
    animateFrame(currentTime = performance.now()) {
        const deltaTime = currentTime - this.lastFrameTime;
        
        if (deltaTime >= this.frameInterval) {
            // 대기 중인 애니메이션 실행
            const activeAnimations = this.animationQueue.filter(anim => {
                return anim.update(deltaTime);
            });
            
            this.animationQueue = activeAnimations;
            this.lastFrameTime = currentTime;
        }
        
        if (this.animationQueue.length > 0) {
            requestAnimationFrame((time) => this.animateFrame(time));
        } else {
            this.isAnimating = false;
        }
    }
}
```

---

## 🔧 컴포넌트 통합 시스템

### 메인 어플리케이션 클래스
```javascript
class TarkovMapApplication {
    constructor(containerId) {
        this.containerId = containerId;
        this.components = {};
        this.isInitialized = false;
        
        this.initialize();
    }
    
    async initialize() {
        try {
            // 맵 초기화
            await this.initializeMap();
            
            // 컴포넌트들 초기화
            this.initializeComponents();
            
            // WebView2 통신 설정
            this.setupWebViewCommunication();
            
            this.isInitialized = true;
            this.onInitialized();
            
        } catch (error) {
            console.error('Failed to initialize Tarkov Map:', error);
            this.onInitializationFailed(error);
        }
    }
    
    initializeComponents() {
        // 핵심 컴포넌트 생성
        this.components.playerMarker = new TarkovPlayerMarker(this.map);
        this.components.zoomControls = new ZoomControls(this.map);
        this.components.layerControls = new LayerControls(this.map);
        this.components.settingsManager = new SettingsManager(this.map, this.components.playerMarker);
        this.components.themeManager = new ThemeManager();
        this.components.touchInterface = new TouchInterface(this.map);
        this.components.virtualLayerManager = new VirtualLayerManager(this.map);
        this.components.animationOptimizer = new AnimationOptimizer();
        
        // 컴포넌트 간 통신 설정
        this.setupComponentCommunication();
    }
    
    setupWebViewCommunication() {
        // C#에서 호출할 수 있는 전역 함수 등록
        window.tarkovMap = {
            updatePlayerPosition: (data) => this.updatePlayerPosition(data),
            switchMap: (mapId) => this.switchMap(mapId),
            updateSettings: (settings) => this.updateSettings(settings),
            getStatus: () => this.getStatus()
        };
        
        // WebView2에 준비 완료 알림
        if (window.chrome && window.chrome.webview) {
            window.chrome.webview.postMessage({
                type: 'map-ready',
                timestamp: Date.now()
            });
        }
    }
    
    updatePlayerPosition(data) {
        if (!this.isInitialized) return false;
        
        try {
            const { mapId, x, y, z, rotation } = data;
            
            // 맵 변경 확인
            if (mapId !== this.currentMapId) {
                this.switchMap(mapId);
            }
            
            // 플레이어 위치 업데이트
            this.components.playerMarker.updatePosition(y, x, rotation);
            
            // 상태 바 업데이트
            this.updateStatusBar(x, y, rotation, mapId);
            
            return true;
        } catch (error) {
            console.error('Failed to update player position:', error);
            return false;
        }
    }
}

// 애플리케이션 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.tarkovMapApp = new TarkovMapApplication('tarkov-map-container');
});
```

---

## 📋 컴포넌트 체크리스트

### 필수 구현 항목
- [x] **MapContainer**: 메인 지도 컨테이너 및 레이아웃
- [x] **PlayerMarker**: 플레이어 위치 마커 시스템
- [x] **ZoomControls**: 확대/축소 컨트롤
- [x] **LayerControls**: 레이어 관리 시스템
- [x] **SettingsPanel**: 사용자 설정 인터페이스
- [x] **StatusBar**: 상태 정보 표시
- [x] **ResponsiveDesign**: 반응형 디자인
- [x] **TouchInterface**: 모바일 터치 지원
- [x] **ThemeSystem**: 다크/라이트 테마
- [x] **PerformanceOptimization**: 성능 최적화
- [x] **ComponentIntegration**: 통합 시스템

### 선택적 구현 항목
- [ ] **MinimapOverview**: 미니맵 오버뷰
- [ ] **ScreenshotCapture**: 스크린샷 캡처 기능
- [ ] **ExportFunction**: 지도 내보내기
- [ ] **CustomMarkers**: 사용자 정의 마커
- [ ] **HotkeySupport**: 키보드 단축키
- [ ] **VoiceCommands**: 음성 명령 (고급)

---

## 🚀 성능 목표

### 렌더링 성능
- **60 FPS**: 부드러운 애니메이션 및 상호작용
- **<16ms**: 프레임당 처리 시간
- **<100MB**: 메모리 사용량
- **<1ms**: WebView2 통신 지연

### 사용자 경험
- **<200ms**: 인터페이스 응답 시간
- **<500ms**: 맵 전환 시간
- **<100ms**: 설정 적용 시간

*최종 업데이트: 2025-08-27*  
*다음 문서: testing-guide.md*