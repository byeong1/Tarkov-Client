/**
 * Marker Filter Panel - Tarkov-dev Style Collapsible Tree
 * 왼쪽 패널에 표시되는 collapsible tree 구조의 마커 필터 시스템
 */

class MarkerFilterPanel {
    constructor(containerId, mapApplication) {
        this.containerId = containerId;
        this.mapApp = mapApplication;
        this.markerCategories = new Map();
        this.markerLayers = new Map();
        this.expandedNodes = new Set(['spawns', 'extracts']); // 기본으로 펼쳐진 노드들
        
        // 필터 상태 저장
        this.filterState = {
            spawns: {
                pmc: true,
                scav: true,
                sniper_scav: false,
                boss: true
            },
            extracts: {
                pmc: true,
                scav: true,
                shared: true
            },
            bosses: {
                spawn_locations: true,
                patrol_routes: false
            },
            loot: {
                containers: false,
                loose_loot: false,
                keys: false
            },
            hazards: {
                mines: false,
                sniper_zones: false,
                artillery: false
            },
            interactive: {
                switches: false,
                doors: false,
                elevators: false
            }
        };
        
        this.initialize();
    }

    /**
     * 패널 초기화
     */
    async initialize() {
        try {
            console.log('MarkerFilterPanel 초기화 시작...');
            
            // UI 생성
            this.createTreeUI();
            
            // 이벤트 핸들러 설정
            this.setupEventHandlers();
            
            // 마커 카테고리 정의
            this.defineMarkerCategories();
            
            // 레이어 그룹 초기화
            this.initializeLayers();
            
            console.log('MarkerFilterPanel 초기화 완료');
            
        } catch (error) {
            console.error('MarkerFilterPanel 초기화 실패:', error);
        }
    }

    /**
     * Tree UI 생성
     */
    createTreeUI() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            throw new Error(`Container element '${this.containerId}' not found`);
        }

        const treeHTML = `
            <div class="tree-container">
                <!-- Spawns Node -->
                <div class="tree-node ${this.expandedNodes.has('spawns') ? 'expanded' : ''}" data-node="spawns">
                    <div class="tree-header">
                        <span class="tree-toggle">${this.expandedNodes.has('spawns') ? '−' : '+'}</span>
                        <span>📍 Spawns</span>
                        <span class="tree-item-count" id="spawns-total-count">0</span>
                    </div>
                    <div class="tree-content">
                        <div class="tree-item">
                            <input type="checkbox" id="spawn-pmc" data-category="spawns" data-type="pmc" checked>
                            <span>PMC spawns</span>
                            <span class="tree-item-count" id="spawn-pmc-count">0</span>
                        </div>
                        <div class="tree-item">
                            <input type="checkbox" id="spawn-scav" data-category="spawns" data-type="scav" checked>
                            <span>Scav spawns</span>
                            <span class="tree-item-count" id="spawn-scav-count">0</span>
                        </div>
                        <div class="tree-item">
                            <input type="checkbox" id="spawn-sniper-scav" data-category="spawns" data-type="sniper_scav">
                            <span>Sniper scav</span>
                            <span class="tree-item-count" id="spawn-sniper-scav-count">0</span>
                        </div>
                        <div class="tree-item">
                            <input type="checkbox" id="spawn-boss" data-category="spawns" data-type="boss" checked>
                            <span>Boss spawns</span>
                            <span class="tree-item-count" id="spawn-boss-count">0</span>
                        </div>
                    </div>
                </div>

                <!-- Extracts Node -->
                <div class="tree-node ${this.expandedNodes.has('extracts') ? 'expanded' : ''}" data-node="extracts">
                    <div class="tree-header">
                        <span class="tree-toggle">${this.expandedNodes.has('extracts') ? '−' : '+'}</span>
                        <span>🚪 Extracts</span>
                        <span class="tree-item-count" id="extracts-total-count">0</span>
                    </div>
                    <div class="tree-content">
                        <div class="tree-item">
                            <input type="checkbox" id="extract-pmc" data-category="extracts" data-type="pmc" checked>
                            <span>PMC extracts</span>
                            <span class="tree-item-count" id="extract-pmc-count">0</span>
                        </div>
                        <div class="tree-item">
                            <input type="checkbox" id="extract-scav" data-category="extracts" data-type="scav" checked>
                            <span>Scav extracts</span>
                            <span class="tree-item-count" id="extract-scav-count">0</span>
                        </div>
                        <div class="tree-item">
                            <input type="checkbox" id="extract-shared" data-category="extracts" data-type="shared" checked>
                            <span>Shared extracts</span>
                            <span class="tree-item-count" id="extract-shared-count">0</span>
                        </div>
                    </div>
                </div>

                <!-- Bosses Node -->
                <div class="tree-node" data-node="bosses">
                    <div class="tree-header">
                        <span class="tree-toggle">+</span>
                        <span>👑 Bosses</span>
                        <span class="tree-item-count" id="bosses-total-count">0</span>
                    </div>
                    <div class="tree-content">
                        <div class="tree-item">
                            <input type="checkbox" id="boss-spawns" data-category="bosses" data-type="spawn_locations" checked>
                            <span>Spawn locations</span>
                            <span class="tree-item-count" id="boss-spawns-count">0</span>
                        </div>
                        <div class="tree-item">
                            <input type="checkbox" id="boss-patrols" data-category="bosses" data-type="patrol_routes">
                            <span>Patrol routes</span>
                            <span class="tree-item-count" id="boss-patrols-count">0</span>
                        </div>
                    </div>
                </div>

                <!-- Loot Node -->
                <div class="tree-node" data-node="loot">
                    <div class="tree-header">
                        <span class="tree-toggle">+</span>
                        <span>💰 Loot</span>
                        <span class="tree-item-count" id="loot-total-count">0</span>
                    </div>
                    <div class="tree-content">
                        <div class="tree-item">
                            <input type="checkbox" id="loot-containers" data-category="loot" data-type="containers">
                            <span>Containers</span>
                            <span class="tree-item-count" id="loot-containers-count">0</span>
                        </div>
                        <div class="tree-item">
                            <input type="checkbox" id="loot-loose" data-category="loot" data-type="loose_loot">
                            <span>Loose loot</span>
                            <span class="tree-item-count" id="loot-loose-count">0</span>
                        </div>
                        <div class="tree-item">
                            <input type="checkbox" id="loot-keys" data-category="loot" data-type="keys">
                            <span>Keys</span>
                            <span class="tree-item-count" id="loot-keys-count">0</span>
                        </div>
                    </div>
                </div>

                <!-- Hazards Node -->
                <div class="tree-node" data-node="hazards">
                    <div class="tree-header">
                        <span class="tree-toggle">+</span>
                        <span>⚠️ Hazards</span>
                        <span class="tree-item-count" id="hazards-total-count">0</span>
                    </div>
                    <div class="tree-content">
                        <div class="tree-item">
                            <input type="checkbox" id="hazard-mines" data-category="hazards" data-type="mines">
                            <span>Mines</span>
                            <span class="tree-item-count" id="hazard-mines-count">0</span>
                        </div>
                        <div class="tree-item">
                            <input type="checkbox" id="hazard-snipers" data-category="hazards" data-type="sniper_zones">
                            <span>Sniper zones</span>
                            <span class="tree-item-count" id="hazard-snipers-count">0</span>
                        </div>
                        <div class="tree-item">
                            <input type="checkbox" id="hazard-artillery" data-category="hazards" data-type="artillery">
                            <span>Artillery</span>
                            <span class="tree-item-count" id="hazard-artillery-count">0</span>
                        </div>
                    </div>
                </div>

                <!-- Interactive Node -->
                <div class="tree-node" data-node="interactive">
                    <div class="tree-header">
                        <span class="tree-toggle">+</span>
                        <span>🔧 Interactive</span>
                        <span class="tree-item-count" id="interactive-total-count">0</span>
                    </div>
                    <div class="tree-content">
                        <div class="tree-item">
                            <input type="checkbox" id="interactive-switches" data-category="interactive" data-type="switches">
                            <span>Switches</span>
                            <span class="tree-item-count" id="interactive-switches-count">0</span>
                        </div>
                        <div class="tree-item">
                            <input type="checkbox" id="interactive-doors" data-category="interactive" data-type="doors">
                            <span>Locked doors</span>
                            <span class="tree-item-count" id="interactive-doors-count">0</span>
                        </div>
                        <div class="tree-item">
                            <input type="checkbox" id="interactive-elevators" data-category="interactive" data-type="elevators">
                            <span>Elevators</span>
                            <span class="tree-item-count" id="interactive-elevators-count">0</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = treeHTML;
    }

    /**
     * 이벤트 핸들러 설정
     */
    setupEventHandlers() {
        // Tree 노드 토글 이벤트
        const treeHeaders = document.querySelectorAll('.tree-header');
        treeHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                // 체크박스 클릭은 토글하지 않음
                if (e.target.type === 'checkbox') return;
                
                const node = e.currentTarget.parentElement;
                const nodeName = node.dataset.node;
                this.toggleTreeNode(nodeName);
            });
        });

        // 필터 체크박스들
        const checkboxes = document.querySelectorAll('input[type="checkbox"][data-category]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const category = e.target.dataset.category;
                const type = e.target.dataset.type;
                const isChecked = e.target.checked;
                
                this.updateFilterState(category, type, isChecked);
                this.applyFilters();
            });
        });
    }

    /**
     * Tree 노드 토글
     * @param {string} nodeName - 노드 이름
     */
    toggleTreeNode(nodeName) {
        const node = document.querySelector(`[data-node="${nodeName}"]`);
        if (!node) return;

        const toggle = node.querySelector('.tree-toggle');
        const isExpanded = node.classList.contains('expanded');

        if (isExpanded) {
            node.classList.remove('expanded');
            toggle.textContent = '+';
            this.expandedNodes.delete(nodeName);
        } else {
            node.classList.add('expanded');
            toggle.textContent = '−';
            this.expandedNodes.add(nodeName);
        }
    }

    /**
     * 마커 카테고리 정의
     */
    defineMarkerCategories() {
        // 스폰 포인트 카테고리
        this.markerCategories.set('spawns', {
            name: 'Spawns',
            types: {
                pmc: { 
                    name: 'PMC spawns', 
                    color: '#00e599', 
                    icon: '🟢',
                    zIndex: 500
                },
                scav: { 
                    name: 'Scav spawns', 
                    color: '#ff7800', 
                    icon: '🟠',
                    zIndex: 490
                },
                sniper_scav: { 
                    name: 'Sniper scav', 
                    color: '#ff0000', 
                    icon: '🔴',
                    zIndex: 520
                },
                boss: { 
                    name: 'Boss spawns', 
                    color: '#800080', 
                    icon: '👑',
                    zIndex: 600
                }
            }
        });

        // 추출구 카테고리
        this.markerCategories.set('extracts', {
            name: 'Extracts',
            types: {
                pmc: { 
                    name: 'PMC extracts', 
                    color: '#00e599', 
                    icon: '🚪',
                    zIndex: 550
                },
                scav: { 
                    name: 'Scav extracts', 
                    color: '#ff7800', 
                    icon: '🚪',
                    zIndex: 540
                },
                shared: { 
                    name: 'Shared extracts', 
                    color: '#00e4e5', 
                    icon: '🚪',
                    zIndex: 560
                }
            }
        });

        // 보스 & NPC 카테고리
        this.markerCategories.set('bosses', {
            name: 'Bosses',
            types: {
                spawn_locations: { 
                    name: 'Spawn locations', 
                    color: '#800080', 
                    icon: '👑',
                    zIndex: 600
                },
                patrol_routes: { 
                    name: 'Patrol routes', 
                    color: '#9d4edd', 
                    icon: '🔄',
                    zIndex: 400
                }
            }
        });

        // 루트 아이템 카테고리
        this.markerCategories.set('loot', {
            name: 'Loot',
            types: {
                containers: { 
                    name: 'Containers', 
                    color: '#ffd60a', 
                    icon: '📦',
                    zIndex: 300
                },
                loose_loot: { 
                    name: 'Loose loot', 
                    color: '#ffb700', 
                    icon: '💎',
                    zIndex: 290
                },
                keys: { 
                    name: 'Keys', 
                    color: '#f72585', 
                    icon: '🔑',
                    zIndex: 310
                }
            }
        });

        // 위험 지역 카테고리
        this.markerCategories.set('hazards', {
            name: 'Hazards',
            types: {
                mines: { 
                    name: 'Mines', 
                    color: '#dc2626', 
                    icon: '💣',
                    zIndex: 700
                },
                sniper_zones: { 
                    name: 'Sniper zones', 
                    color: '#ef4444', 
                    icon: '🎯',
                    zIndex: 690
                },
                artillery: { 
                    name: 'Artillery', 
                    color: '#b91c1c', 
                    icon: '💥',
                    zIndex: 710
                }
            }
        });

        // 상호작용 카테고리
        this.markerCategories.set('interactive', {
            name: 'Interactive',
            types: {
                switches: { 
                    name: 'Switches', 
                    color: '#3b82f6', 
                    icon: '⚡',
                    zIndex: 350
                },
                doors: { 
                    name: 'Locked doors', 
                    color: '#6366f1', 
                    icon: '🔒',
                    zIndex: 340
                },
                elevators: { 
                    name: 'Elevators', 
                    color: '#8b5cf6', 
                    icon: '🔀',
                    zIndex: 330
                }
            }
        });
    }

    /**
     * 레이어 그룹 초기화
     */
    initializeLayers() {
        if (!this.mapApp || !this.mapApp.map) {
            console.error('지도가 초기화되지 않아서 레이어를 생성할 수 없습니다');
            return;
        }

        // 각 카테고리별로 레이어 그룹 생성
        this.markerCategories.forEach((category, categoryName) => {
            const categoryLayers = {};
            
            Object.keys(category.types).forEach(typeName => {
                // 레이어 그룹 생성
                const layerGroup = L.layerGroup();
                
                // ⭐ 중요: 레이어를 지도에 추가
                layerGroup.addTo(this.mapApp.map);
                
                categoryLayers[typeName] = layerGroup;
                
                console.log(`레이어 생성 및 지도에 추가: ${categoryName}.${typeName}`);
            });
            
            this.markerLayers.set(categoryName, categoryLayers);
        });

        console.log('✅ MarkerFilterPanel 레이어 그룹 초기화 및 지도 추가 완료');
    }

    /**
     * 맵 데이터를 기반으로 마커 생성
     * @param {object} mapData - API에서 가져온 맵 데이터
     */
    async loadMapMarkers(mapData) {
        try {
            console.log('맵 마커 로딩 시작...', mapData);

            // 지도 상태 확인
            if (this.mapApp && this.mapApp.map) {
                const center = this.mapApp.map.getCenter();
                const bounds = this.mapApp.map.getBounds();
                const zoom = this.mapApp.map.getZoom();
                
                console.log('🗺️ 현재 지도 상태:', {
                    center: { lat: center.lat.toFixed(2), lng: center.lng.toFixed(2) },
                    zoom: zoom,
                    bounds: {
                        north: bounds.getNorth().toFixed(2),
                        south: bounds.getSouth().toFixed(2),
                        east: bounds.getEast().toFixed(2),
                        west: bounds.getWest().toFixed(2)
                    }
                });
            }

            // 기존 마커 클리어
            this.clearAllMarkers();

            let totalMarkers = 0;

            // 스폰 포인트 마커 생성
            if (mapData.spawns) {
                console.log('스폰 데이터 샘플 (첫 3개):', mapData.spawns.slice(0, 3));
                
                // 좌표 범위 및 층수 정보 분석
                const coords = mapData.spawns.map(s => s.position).filter(p => p);
                if (coords.length > 0) {
                    const xValues = coords.map(p => p.x);
                    const zValues = coords.map(p => p.z);
                    const yValues = coords.map(p => p.y);
                    
                    console.log('📊 스폰 좌표 분석:', {
                        x: { min: Math.min(...xValues), max: Math.max(...xValues) },
                        z: { min: Math.min(...zValues), max: Math.max(...zValues) },
                        y: { min: Math.min(...yValues), max: Math.max(...yValues) }, // 층수 정보
                        count: coords.length
                    });
                    
                    // 모든 Y좌표 값들 출력 (디버깅용)
                    console.log('🔍 모든 Y좌표 값들:', yValues);
                    
                    // Y값(층수) 분포 분석
                    const yDistribution = {};
                    const levelMapping = {}; // 실제 Y좌표 → 층수 매핑
                    
                    yValues.forEach(y => {
                        const roundedY = Math.round(y);
                        yDistribution[roundedY] = (yDistribution[roundedY] || 0) + 1;
                        
                        if (!levelMapping[roundedY]) {
                            levelMapping[roundedY] = [];
                        }
                        levelMapping[roundedY].push(y);
                    });
                    
                    console.log('🏢 층수 분포 분석:', yDistribution);
                    console.log('🏢 층수별 실제 Y좌표 매핑:', levelMapping);
                    
                    const discoveredLevels = Object.keys(yDistribution).sort((a, b) => a - b);
                    console.log('🏢 발견된 층수들:', discoveredLevels);
                    
                    // determineLevel 로직 테스트
                    yValues.forEach((y, index) => {
                        if (index < 5) { // 처음 5개만 테스트
                            const level = this.mapApp.determineLevel(y);
                            console.log(`🧪 테스트 ${index + 1}: Y=${y} → Level=${level}`);
                        }
                    });
                    
                    // 발견된 층수들을 Map 클래스에 등록
                    discoveredLevels.forEach(level => {
                        this.mapApp.addAvailableLevel(level);
                    });
                }
                
                totalMarkers += this.createSpawnMarkers(mapData.spawns);
            }

            // 추출구 마커 생성
            if (mapData.extracts) {
                console.log('추출구 데이터 샘플 (첫 3개):', mapData.extracts.slice(0, 3));
                
                // 추출구 층수 정보 분석
                const extractCoords = mapData.extracts.map(e => e.position).filter(p => p);
                if (extractCoords.length > 0) {
                    const extractYValues = extractCoords.map(p => p.y);
                    const extractYDistribution = {};
                    
                    extractYValues.forEach(y => {
                        const roundedY = Math.round(y);
                        extractYDistribution[roundedY] = (extractYDistribution[roundedY] || 0) + 1;
                    });
                    
                    console.log('🚪 추출구 층수 분포:', extractYDistribution);
                    
                    // 추출구 층수들도 등록
                    Object.keys(extractYDistribution).forEach(level => {
                        this.mapApp.addAvailableLevel(level);
                    });
                }
                
                totalMarkers += this.createExtractMarkers(mapData.extracts);
            }

            // 보스 마커 생성
            if (mapData.bosses) {
                totalMarkers += this.createBossMarkers(mapData.bosses);
            }

            // 루트 컨테이너 마커 생성
            if (mapData.lootContainers) {
                totalMarkers += this.createLootMarkers(mapData.lootContainers, 'containers');
            }

            // 자유 루트 마커 생성
            if (mapData.lootLoose) {
                totalMarkers += this.createLootMarkers(mapData.lootLoose, 'loose_loot');
            }

            // 위험 지역 마커 생성
            if (mapData.hazards) {
                totalMarkers += this.createHazardMarkers(mapData.hazards);
            }

            // 스위치 마커 생성
            if (mapData.switches) {
                totalMarkers += this.createInteractiveMarkers(mapData.switches, 'switches');
            }

            // 자물쇠 마커 생성
            if (mapData.locks) {
                totalMarkers += this.createInteractiveMarkers(mapData.locks, 'doors');
            }

            // 마커 카운트 업데이트
            this.updateMarkerCounts();
            
            // 필터 적용
            this.applyFilters();

            console.log(`맵 마커 로딩 완료: 총 ${totalMarkers}개 마커`);
            
            // 층수 선택기 UI 업데이트 (마커 생성 완료 후)
            if (this.mapApp && this.mapApp.updateLevelSelector) {
                this.mapApp.updateLevelSelector();
                console.log('🏢 마커 로딩 완료 후 층수 선택기 업데이트');
            }
            
            // 테스트 마커 추가 (좌표계 검증용)
            this.addTestMarker();

        } catch (error) {
            console.error('맵 마커 로딩 실패:', error);
        }
    }

    /**
     * 좌표계 검증을 위한 테스트 마커 추가
     */
    addTestMarker() {
        if (!this.mapApp || !this.mapApp.map) return;
        
        console.log('🧪 테스트 마커 추가 시작...');
        
        // 지도 중심점에 테스트 마커 추가
        const center = this.mapApp.map.getCenter();
        
        const testMarker = L.marker([center.lat, center.lng], {
            icon: L.divIcon({
                html: `<div style="
                    background: #ff0000;
                    color: white;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    font-weight: bold;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.5);
                    z-index: 10000;
                ">🎯</div>`,
                className: 'test-marker-center',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            }),
            zIndexOffset: 10000
        });
        
        testMarker.bindTooltip('테스트 마커 - 지도 중심', {
            permanent: true,
            direction: 'top'
        });
        
        testMarker.addTo(this.mapApp.map);
        
        console.log(`🧪 테스트 마커 추가 완료: 중심(${center.lat.toFixed(2)}, ${center.lng.toFixed(2)})`);
        
        // 추가 테스트 마커들 (상하좌우 100 단위)
        const testPositions = [
            { pos: [center.lat + 100, center.lng], label: '북쪽+100', color: '#00ff00' },
            { pos: [center.lat - 100, center.lng], label: '남쪽-100', color: '#0000ff' },
            { pos: [center.lat, center.lng + 100], label: '동쪽+100', color: '#ffff00' },
            { pos: [center.lat, center.lng - 100], label: '서쪽-100', color: '#ff00ff' }
        ];
        
        testPositions.forEach(test => {
            const marker = L.marker(test.pos, {
                icon: L.divIcon({
                    html: `<div style="
                        background: ${test.color};
                        color: white;
                        width: 30px;
                        height: 30px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                        font-weight: bold;
                        border: 2px solid white;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.5);
                    ">T</div>`,
                    className: 'test-marker',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                })
            });
            
            marker.bindTooltip(test.label);
            marker.addTo(this.mapApp.map);
            
            console.log(`🧪 테스트 마커: ${test.label} (${test.pos[0].toFixed(2)}, ${test.pos[1].toFixed(2)})`);
        });
    }

    /**
     * 스폰 포인트 마커 생성
     * @param {object[]} spawns - 스폰 포인트 데이터
     * @returns {number} 생성된 마커 수
     */
    createSpawnMarkers(spawns) {
        let count = 0;
        
        spawns.forEach((spawn, index) => {
            if (!spawn.position || !spawn.sides || !spawn.categories) {
                console.log(`스폰 ${index} 스킵됨:`, {
                    hasPosition: !!spawn.position,
                    hasSides: !!spawn.sides, 
                    hasCategories: !!spawn.categories,
                    spawn
                });
                return;
            }
            
            // 'all' 진영 데이터 필터링 - 'all'이 포함된 경우 제외
            if (spawn.sides.includes('all')) {
                console.log(`'all' 진영 스폰 제외됨:`, spawn);
                return;
            }
            
            // 스폰 타입 결정
            let spawnType = 'scav'; // 기본값
            
            if (spawn.categories.includes('boss')) {
                spawnType = 'boss';
            } else if (spawn.categories.includes('sniper')) {
                spawnType = 'sniper_scav';
            } else if (spawn.sides.includes('pmc')) {
                spawnType = 'pmc';
            }
            
            const marker = this.createMarker(
                spawn.position,
                'spawns',
                spawnType,
                spawn.zoneName || `${spawnType.toUpperCase()} 스폰`,
                spawn
            );
            
            if (marker) {
                const layer = this.markerLayers.get('spawns')[spawnType];
                layer.addLayer(marker);
                count++;
                console.log(`마커 추가됨: ${spawnType} 스폰 (총 ${count}개) - 레이어에 마커 수: ${layer.getLayers().length}`);
            } else {
                console.warn(`마커 생성 실패: ${spawnType} 스폰`);
            }
        });
        
        console.log(`스폰 마커 생성 완료: ${count}개`);
        return count;
    }

    /**
     * 추출구 마커 생성
     * @param {object[]} extracts - 추출구 데이터
     * @returns {number} 생성된 마커 수
     */
    createExtractMarkers(extracts) {
        let count = 0;
        
        extracts.forEach(extract => {
            if (!extract.position) return;
            
            // 추출구 타입 결정
            let extractType = extract.faction || 'shared';
            if (extractType === 'any') extractType = 'shared';
            
            // 'all' 진영 데이터 필터링 - 'all'이 포함된 경우 제외
            if (extractType === 'all') {
                console.log(`'all' 진영 추출구 제외됨:`, extract);
                return;
            }
            
            const marker = this.createMarker(
                extract.position,
                'extracts',
                extractType,
                extract.name || '추출구',
                extract
            );
            
            if (marker && this.markerLayers.get('extracts')[extractType]) {
                this.markerLayers.get('extracts')[extractType].addLayer(marker);
                count++;
            }
        });
        
        console.log(`추출구 마커 생성 완료: ${count}개`);
        return count;
    }

    /**
     * 보스 마커 생성
     * @param {object[]} bosses - 보스 데이터
     * @returns {number} 생성된 마커 수
     */
    createBossMarkers(bosses) {
        let count = 0;
        
        bosses.forEach(boss => {
            if (!boss.spawnLocations) return;
            
            boss.spawnLocations.forEach(location => {
                // 위치 정보가 있다면 마커 생성 (실제 구현에서는 위치 데이터가 필요)
                if (location.spawnKey) {
                    // 임시로 보스 이름과 확률 정보만 저장
                    console.log(`보스 ${boss.name} 스폰 위치: ${location.spawnKey} (${location.chance * 100}%)`);
                    count++;
                }
            });
        });
        
        console.log(`보스 마커 생성 완료: ${count}개`);
        return count;
    }

    /**
     * 루트 마커 생성
     * @param {object[]} lootItems - 루트 아이템 데이터
     * @param {string} lootType - 루트 타입
     * @returns {number} 생성된 마커 수
     */
    createLootMarkers(lootItems, lootType) {
        let count = 0;
        
        lootItems.forEach(item => {
            if (!item.position) return;
            
            const marker = this.createMarker(
                item.position,
                'loot',
                lootType,
                item.lootContainer?.name || item.items?.[0]?.name || '루트 아이템',
                item
            );
            
            if (marker && this.markerLayers.get('loot')[lootType]) {
                this.markerLayers.get('loot')[lootType].addLayer(marker);
                count++;
            }
        });
        
        console.log(`${lootType} 루트 마커 생성 완료: ${count}개`);
        return count;
    }

    /**
     * 위험 지역 마커 생성
     * @param {object[]} hazards - 위험 지역 데이터
     * @returns {number} 생성된 마커 수
     */
    createHazardMarkers(hazards) {
        let count = 0;
        
        hazards.forEach(hazard => {
            if (!hazard.position) return;
            
            // 위험 타입 결정
            let hazardType = 'mines'; // 기본값
            if (hazard.hazardType) {
                if (hazard.hazardType.includes('sniper')) {
                    hazardType = 'sniper_zones';
                } else if (hazard.hazardType.includes('artillery')) {
                    hazardType = 'artillery';
                }
            }
            
            const marker = this.createMarker(
                hazard.position,
                'hazards',
                hazardType,
                hazard.name || '위험 지역',
                hazard
            );
            
            if (marker && this.markerLayers.get('hazards')[hazardType]) {
                this.markerLayers.get('hazards')[hazardType].addLayer(marker);
                count++;
            }
        });
        
        console.log(`위험 지역 마커 생성 완료: ${count}개`);
        return count;
    }

    /**
     * 상호작용 마커 생성
     * @param {object[]} items - 상호작용 아이템 데이터
     * @param {string} interactiveType - 상호작용 타입
     * @returns {number} 생성된 마커 수
     */
    createInteractiveMarkers(items, interactiveType) {
        let count = 0;
        
        items.forEach(item => {
            if (!item.position) return;
            
            const marker = this.createMarker(
                item.position,
                'interactive',
                interactiveType,
                item.name || '상호작용',
                item
            );
            
            if (marker && this.markerLayers.get('interactive')[interactiveType]) {
                this.markerLayers.get('interactive')[interactiveType].addLayer(marker);
                count++;
            }
        });
        
        console.log(`${interactiveType} 상호작용 마커 생성 완료: ${count}개`);
        return count;
    }

    /**
     * 개별 마커 생성
     * @param {object} position - 위치 정보 {x, y, z}
     * @param {string} category - 카테고리
     * @param {string} type - 타입
     * @param {string} name - 마커 이름
     * @param {object} data - 추가 데이터
     * @returns {L.Marker} Leaflet 마커
     */
    createMarker(position, category, type, name, data) {
        if (!this.mapApp?.mapSystem) {
            console.warn('MapSystem이 없어서 마커를 생성할 수 없습니다');
            return null;
        }

        try {
            // 디버깅: 원본 위치 데이터 확인
            console.log('원본 position 데이터:', position);
            
            // 게임 좌표를 맵 좌표로 변환 (tarkov-dev 방식: x, z, y 순서)
            const mapCoords = this.mapApp.mapSystem.gameToMapCoordinates(position.x, position.z, position.y);
            
            // 디버깅: 변환된 좌표 확인
            console.log('변환된 mapCoords:', mapCoords);
            
            // 좌표가 유효한지 확인
            if (!mapCoords || !Array.isArray(mapCoords) || mapCoords.length < 2) {
                console.warn('유효하지 않은 좌표:', mapCoords);
                return null;
            }
            
            // 좌표가 극단적인 값인지 확인 (디버깅용)
            const [lat, lng] = mapCoords;
            if (Math.abs(lat) > 1000 || Math.abs(lng) > 1000) {
                console.warn('❌ 극단적인 좌표값:', { lat, lng, originalPosition: position });
            }
            
            // 지도 경계 내에 있는지 확인
            if (this.mapApp && this.mapApp.map) {
                const bounds = this.mapApp.map.getBounds();
                const inBounds = bounds.contains([lat, lng]);
                
                if (!inBounds) {
                    // 마커가 얼마나 멀리 떨어져 있는지 계산
                    const mapCenter = this.mapApp.map.getCenter();
                    const distance = mapCenter.distanceTo([lat, lng]);
                    
                    console.warn('⚠️ 마커가 지도 범위 밖:', {
                        마커위치: { lat: lat.toFixed(2), lng: lng.toFixed(2) },
                        지도중심: { lat: mapCenter.lat.toFixed(2), lng: mapCenter.lng.toFixed(2) },
                        거리: `${distance.toFixed(0)}m`,
                        지도경계: {
                            north: bounds.getNorth().toFixed(2),
                            south: bounds.getSouth().toFixed(2),
                            east: bounds.getEast().toFixed(2),
                            west: bounds.getWest().toFixed(2)
                        },
                        마커정보: { category, type, name },
                        원본좌표: position
                    });
                } else {
                    console.log('✅ 마커가 지도 범위 내:', { 
                        위치: { lat: lat.toFixed(2), lng: lng.toFixed(2) },
                        마커: `${category}.${type}`,
                        이름: name 
                    });
                }
            }
            
            // 마커 스타일 가져오기
            const markerConfig = this.markerCategories.get(category)?.types[type];
            if (!markerConfig) {
                console.warn(`알 수 없는 마커 타입: ${category}.${type}`);
                return null;
            }

            // 마커의 층수 결정
            const markerLevel = this.mapApp.determineLevel(position.y);
            
            // 마커 생성
            const marker = L.marker(mapCoords, {
                icon: L.divIcon({
                    html: `<div style="
                        background: ${markerConfig.color};
                        color: white;
                        width: 24px;
                        height: 24px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                        font-weight: bold;
                        border: 2px solid white;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    ">${markerConfig.icon}</div>`,
                    className: `marker-${category}-${type} level-${markerLevel}`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                }),
                zIndexOffset: markerConfig.zIndex || 100
            });
            
            // 마커에 층수 정보 저장 (필터링용)
            marker.markerLevel = markerLevel;
            marker.originalPosition = position;
            marker.markerCategory = category;
            marker.markerType = type;

            // 툴팁 추가 (층수 정보 포함)
            const tooltipContent = this.createTooltipContent(name, category, type, position, data, markerLevel);
            marker.bindTooltip(tooltipContent, {
                direction: 'top',
                offset: [0, -12],
                opacity: 0.9
            });

            // 클릭 이벤트 추가
            marker.on('click', () => {
                this.onMarkerClick(category, type, name, data);
            });

            return marker;

        } catch (error) {
            console.error(`마커 생성 실패 (${category}.${type}):`, error);
            return null;
        }
    }

    /**
     * 툴팁 내용 생성
     * @param {string} name - 마커 이름
     * @param {string} category - 카테고리
     * @param {string} type - 타입
     * @param {object} position - 위치
     * @param {object} data - 추가 데이터
     * @returns {string} HTML 툴팁 내용
     */
    createTooltipContent(name, category, type, position, data, markerLevel = null) {
        let content = `<strong>${name}</strong><br>`;
        content += `위치: (${position.x.toFixed(1)}, ${position.z.toFixed(1)})<br>`;
        
        // 층수 정보 추가 (Y 좌표 기반)
        if (markerLevel !== null) {
            content += `층수: ${markerLevel}<br>`;
        } else if (position.y !== undefined) {
            content += `높이: ${position.y.toFixed(1)}<br>`;
        }
        
        // 카테고리별 추가 정보
        switch (category) {
            case 'spawns':
                if (data.sides) {
                    content += `진영: ${data.sides.join(', ')}<br>`;
                }
                break;
                
            case 'extracts':
                if (data.switches && data.switches.length > 0) {
                    content += `필요 스위치: ${data.switches.length}개<br>`;
                }
                break;
                
            case 'bosses':
                if (data.spawnChance) {
                    content += `스폰 확률: ${(data.spawnChance * 100).toFixed(1)}%<br>`;
                }
                break;
                
            case 'loot':
                if (data.lootContainer) {
                    content += `컨테이너: ${data.lootContainer.name}<br>`;
                }
                break;
        }
        
        return content;
    }

    /**
     * 마커 클릭 이벤트 처리
     * @param {string} category - 카테고리
     * @param {string} type - 타입
     * @param {string} name - 마커 이름
     * @param {object} data - 마커 데이터
     */
    onMarkerClick(category, type, name, data) {
        console.log(`마커 클릭: ${category}.${type} - ${name}`, data);
        
        // 추후 상세 정보 패널 표시 또는 C#으로 정보 전송
        if (this.mapApp?.sendWebViewMessage) {
            this.mapApp.sendWebViewMessage('MARKER_CLICK', {
                category: category,
                type: type,
                name: name,
                data: data
            });
        }
    }

    /**
     * 필터 상태 업데이트
     * @param {string} category - 카테고리
     * @param {string} type - 타입
     * @param {boolean} isEnabled - 활성화 여부
     */
    updateFilterState(category, type, isEnabled) {
        if (!this.filterState[category]) {
            this.filterState[category] = {};
        }
        
        this.filterState[category][type] = isEnabled;
        
        console.log(`필터 상태 업데이트: ${category}.${type} = ${isEnabled}`);
    }

    /**
     * 모든 필터 적용
     */
    applyFilters() {
        if (!this.mapApp?.map) {
            console.warn('맵이 초기화되지 않았습니다');
            return;
        }

        let visibleCount = 0;

        // 각 카테고리의 레이어 표시/숨김 처리
        this.markerLayers.forEach((categoryLayers, categoryName) => {
            const categoryFilter = this.filterState[categoryName];
            if (!categoryFilter) return;

            Object.keys(categoryLayers).forEach(typeName => {
                const layer = categoryLayers[typeName];
                const isEnabled = categoryFilter[typeName];

                if (isEnabled) {
                    if (!this.mapApp.map.hasLayer(layer)) {
                        this.mapApp.map.addLayer(layer);
                    }
                    // 해당 레이어의 마커 수 계산
                    layer.eachLayer(() => visibleCount++);
                } else {
                    if (this.mapApp.map.hasLayer(layer)) {
                        this.mapApp.map.removeLayer(layer);
                    }
                }
            });
        });

        console.log(`필터 적용 완료: ${visibleCount}개 마커 표시 중`);
    }

    /**
     * 마커 카운트 업데이트
     */
    updateMarkerCounts() {
        let totalCount = 0;
        const categoryCounts = {};

        this.markerLayers.forEach((categoryLayers, categoryName) => {
            let categoryTotal = 0;
            
            Object.keys(categoryLayers).forEach(typeName => {
                const layer = categoryLayers[typeName];
                let count = 0;
                layer.eachLayer(() => count++);

                // 개별 타입 카운트 업데이트
                const countElement = document.getElementById(`${categoryName.slice(0, -1)}-${typeName.replace('_', '-')}-count`);
                if (countElement) {
                    countElement.textContent = count;
                }

                categoryTotal += count;
                totalCount += count;
            });

            categoryCounts[categoryName] = categoryTotal;
            
            // 카테고리 전체 카운트 업데이트
            const categoryCountElement = document.getElementById(`${categoryName}-total-count`);
            if (categoryCountElement) {
                categoryCountElement.textContent = categoryTotal;
            }
        });

        console.log('마커 카운트 업데이트 완료:', categoryCounts, `총 ${totalCount}개`);
    }

    /**
     * 레벨에 따른 마커 필터링
     * @param {string} targetLevel - 표시할 레벨 ('main', '0', '1', etc.)
     */
    filterMarkersByLevel(targetLevel) {
        console.log(`🏢 레벨 필터링 시작: ${targetLevel}`);
        
        let visibleCount = 0;
        let hiddenCount = 0;
        
        // 모든 마커 레이어를 순회하며 레벨 필터링 적용
        this.markerLayers.forEach((categoryLayers, category) => {
            Object.values(categoryLayers).forEach(layer => {
                layer.eachLayer((marker) => {
                    const markerLevel = marker.markerLevel || 'main';
                    
                    if (markerLevel === targetLevel) {
                        // 현재 레벨과 일치하는 마커 표시
                        if (!this.mapApp.map.hasLayer(marker)) {
                            marker.addTo(this.mapApp.map);
                        }
                        visibleCount++;
                    } else {
                        // 다른 레벨의 마커 숨김
                        if (this.mapApp.map.hasLayer(marker)) {
                            marker.remove();
                        }
                        hiddenCount++;
                    }
                });
            });
        });
        
        console.log(`✅ 레벨 필터링 완료: ${visibleCount}개 표시, ${hiddenCount}개 숨김`);
        
        // 마커 카운트 업데이트
        this.updateMarkerCounts();
    }

    /**
     * 모든 마커 클리어
     */
    clearAllMarkers() {
        this.markerLayers.forEach((categoryLayers) => {
            Object.values(categoryLayers).forEach(layer => {
                layer.clearLayers();
            });
        });

        console.log('모든 마커가 클리어되었습니다');
    }

    /**
     * 리소스 정리
     */
    dispose() {
        this.clearAllMarkers();
        this.markerLayers.clear();
        this.markerCategories.clear();
        
        console.log('MarkerFilterPanel 정리 완료');
    }
}

// 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkerFilterPanel;
} else {
    window.MarkerFilterPanel = MarkerFilterPanel;
}