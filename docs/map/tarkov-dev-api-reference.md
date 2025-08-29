# Tarkov-Dev GraphQL API 참조서

## 🌐 API 개요

Tarkov-Dev 프로젝트에서 제공하는 GraphQL API의 상세 명세서입니다.

### 엔드포인트
- **Production**: `https://api.tarkov.dev/graphql`
- **Development**: `https://dev-api.tarkov.dev/graphql`  
- **Local**: `http://127.0.0.1:8787/graphql`

### 인증
- 현재 인증 불필요 (Public API)
- Rate Limiting 가능성 있음

## 📊 Maps Query

### 기본 쿼리
```graphql
query TarkovDevMaps {
    maps(lang: "en", gameMode: "regular") {
        id
        tarkovDataId
        name
        normalizedName
        wiki
        description
        enemies
        raidDuration
        players
    }
}
```

### 매개변수
- **lang**: 언어 코드 (en, ko, ru, de, fr, es, pt, it, ja, pl)
- **gameMode**: 게임 모드 (regular, pve)

### 완전한 Maps 스키마

#### 기본 정보
```graphql
{
    id: String!                    # 고유 식별자
    tarkovDataId: String          # Tarkov 데이터 ID
    name: String!                 # 맵 이름 (한글: "팩토리")
    normalizedName: String!       # 정규화된 이름 ("factory")
    wiki: String                  # 위키 링크
    description: String           # 맵 설명
    enemies: [String]             # 적 유형 목록
    raidDuration: Int             # 레이드 지속시간 (분)
    players: String               # 플레이어 수 ("4-6")
}
```

#### 보스 정보
```graphql
{
    bosses: [Boss] {
        name: String!             # 보스 이름
        normalizedName: String!   # 정규화된 이름  
        spawnChance: Float!       # 스폰 확률 (0.0-1.0)
        spawnTime: Int           # 스폰 시간 (초)
        spawnTimeRandom: Boolean # 랜덤 스폰 여부
        spawnTrigger: String     # 스폰 트리거
        
        spawnLocations: [SpawnLocation] {
            spawnKey: String!     # 스폰 지역 키
            name: String!         # 지역 이름
            chance: Float!        # 해당 지역 스폰 확률
        }
        
        escorts: [Escort] {
            name: String!         # 호위병 이름
            normalizedName: String!
            amount: [Amount] {
                count: Int!       # 호위병 수
                chance: Float!    # 확률
            }
        }
        
        switch: Switch {
            id: String!           # 스위치 ID
        }
    }
}
```

#### 스폰 포인트
```graphql
{
    spawns: [Spawn] {
        zoneName: String!         # 지역 이름
        position: Position! {     # 3D 위치
            x: Float!
            y: Float!
            z: Float!
        }
        sides: [String]!          # 진영 (pmc, scav, all)
        categories: [String]!     # 카테고리 (player, bot, boss, sniper)
    }
}
```

#### 추출구 정보
```graphql
{
    extracts: [Extract] {
        id: String!               # 고유 식별자
        name: String!             # 추출구 이름
        faction: String           # 진영 (pmc, scav, shared)
        
        position: Position! {     # 중심 위치
            x: Float!
            y: Float!
            z: Float!
        }
        
        outline: [Position]       # 경계선 좌표들
        top: Float               # 최대 높이
        bottom: Float            # 최소 높이
        
        switches: [Switch] {      # 활성화 스위치들
            id: String!
            name: String!
        }
    }
}
```

#### 트랜짓 (맵 이동)
```graphql
{
    transits: [Transit] {
        id: String!
        description: String!      # 설명
        conditions: String        # 조건
        position: Position!
        outline: [Position]
        top: Float
        bottom: Float
    }
}
```

#### 자물쇠 정보
```graphql
{
    locks: [Lock] {
        lockType: String!         # 자물쇠 유형 (door, container, trunk)
        needsPower: Boolean!      # 전력 필요 여부
        position: Position!
        outline: [Position]
        top: Float
        bottom: Float
        
        key: Item! {             # 필요한 열쇠
            id: String!
        }
    }
}
```

#### 위험 지역
```graphql
{
    hazards: [Hazard] {
        hazardType: String!       # 위험 유형
        name: String!            # 위험 지역 이름
        position: Position!
        outline: [Position]
        top: Float
        bottom: Float
    }
    
    artillery: Artillery {       # 포격 지역
        zones: [ArtilleryZone] {
            position: Position!
            outline: [Position]
            top: Float
            bottom: Float
        }
    }
}
```

#### 루트 컨테이너
```graphql
{
    lootContainers: [LootContainer] {
        position: Position!
        lootContainer: Container! {
            id: String!
            name: String!
            normalizedName: String!
        }
    }
}
```

#### 자유 루트
```graphql
{
    lootLoose: [LooseLoot] {
        position: Position!
        items: [Item] {
            id: String!
        }
    }
}
```

#### 스위치 및 상호작용
```graphql
{
    switches: [Switch] {
        id: String!
        name: String!
        switchType: String!       # 스위치 유형
        position: Position!
        
        activatedBy: Switch {     # 선행 스위치
            id: String!
            name: String!
        }
        
        activates: [Activation] { # 활성화 대상들
            operation: String!    # 작업 유형
            target: ActivationTarget {
                __typename: String # MapSwitch | MapExtract
                ... on MapSwitch {
                    id: String!
                    name: String!
                }
                ... on MapExtract {
                    id: String!
                    name: String!
                    faction: String!
                }
            }
        }
    }
}
```

#### 고정 무기
```graphql
{
    stationaryWeapons: [StationaryWeapon] {
        position: Position!
        stationaryWeapon: Weapon! {
            name: String!
            shortName: String!
        }
    }
}
```

## 🔧 실제 사용 예제

### Factory 맵 데이터 조회
```javascript
const FACTORY_QUERY = `
    query GetFactoryMap {
        maps(lang: "en", gameMode: "regular") {
            id
            name
            normalizedName
            description
            raidDuration
            players
            
            spawns {
                zoneName
                position { x y z }
                sides
                categories  
            }
            
            extracts {
                id
                name
                faction
                position { x y z }
                outline { x y z }
            }
            
            bosses {
                name
                spawnChance
                spawnLocations {
                    spawnKey
                    name
                    chance
                }
            }
        }
    }
`;

// API 호출
const fetchFactoryData = async () => {
    const response = await fetch('https://api.tarkov.dev/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            query: FACTORY_QUERY
        })
    });
    
    const data = await response.json();
    const factoryMap = data.data.maps.find(m => m.normalizedName === 'factory');
    return factoryMap;
};
```

### 에러 처리
```javascript
const safeApiCall = async (query, variables = {}) => {
    try {
        const response = await fetch('https://api.tarkov.dev/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                query,
                variables
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.errors) {
            console.error('GraphQL errors:', data.errors);
            // 부분적 데이터가 있는 경우에도 처리
            if (data.data) {
                return data.data;
            }
            throw new Error('GraphQL query failed');
        }
        
        return data.data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
};
```

## 📦 C# 통합 예제

### HTTP 클라이언트 구현
```csharp
public class TarkovDevApiClient
{
    private readonly HttpClient _httpClient;
    private const string ApiUrl = "https://api.tarkov.dev/graphql";
    
    public TarkovDevApiClient()
    {
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
    }
    
    public async Task<dynamic> QueryAsync(string query, object variables = null)
    {
        var request = new
        {
            query = query,
            variables = variables
        };
        
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        var response = await _httpClient.PostAsync(ApiUrl, content);
        response.EnsureSuccessStatusCode();
        
        var responseJson = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<dynamic>(responseJson);
    }
    
    public async Task<MapData> GetFactoryMapAsync()
    {
        const string query = @"
            query GetFactoryMap {
                maps(lang: ""en"", gameMode: ""regular"") {
                    id
                    name
                    normalizedName
                    spawns {
                        position { x y z }
                        sides
                        categories
                    }
                    extracts {
                        id
                        name
                        faction
                        position { x y z }
                    }
                }
            }
        ";
        
        var result = await QueryAsync(query);
        var maps = result.data.maps;
        
        return maps.FirstOrDefault(m => m.normalizedName == "factory");
    }
}
```

### 데이터 모델
```csharp
public class MapData
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string NormalizedName { get; set; }
    public List<SpawnPoint> Spawns { get; set; }
    public List<ExtractPoint> Extracts { get; set; }
    public List<Boss> Bosses { get; set; }
}

public class Position
{
    public float X { get; set; }
    public float Y { get; set; }
    public float Z { get; set; }
}

public class SpawnPoint
{
    public string ZoneName { get; set; }
    public Position Position { get; set; }
    public List<string> Sides { get; set; }
    public List<string> Categories { get; set; }
}

public class ExtractPoint
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string Faction { get; set; }
    public Position Position { get; set; }
    public List<Position> Outline { get; set; }
}
```

## 🚀 성능 최적화

### 쿼리 최적화
```javascript
// 필요한 필드만 요청
const MINIMAL_QUERY = `
    query GetMinimalMapData {
        maps(lang: "en", gameMode: "regular") {
            normalizedName
            spawns {
                position { x z }  // Y축 제외
                categories
            }
            extracts {
                name
                faction
                position { x z }
            }
        }
    }
`;
```

### 캐싱 전략
```javascript
class ApiCache {
    constructor(ttl = 300000) { // 5분 TTL
        this.cache = new Map();
        this.ttl = ttl;
    }
    
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return item.data;
    }
    
    set(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
}

const apiCache = new ApiCache();

const getCachedMapData = async (mapName) => {
    const cacheKey = `map_${mapName}`;
    let data = apiCache.get(cacheKey);
    
    if (!data) {
        data = await fetchMapData(mapName);
        apiCache.set(cacheKey, data);
    }
    
    return data;
};
```

## ⚠️ 제한사항 및 주의사항

### Rate Limiting
- 구체적인 제한은 불명
- 과도한 요청 시 429 에러 가능성
- 캐싱 필수

### CORS 정책
- WebView2에서 직접 호출 시 CORS 이슈 가능
- C# 백엔드를 통한 프록시 권장

### 데이터 신뢰성
- 게임 업데이트 시 데이터 변경 가능성
- 주기적인 데이터 검증 필요

### 네트워크 의존성
- 오프라인 환경에서 동작 불가
- 폴백 메커니즘 필요

---

*작성일: 2025-08-27*  
*작성자: Claude Code SuperClaude*  
*버전: 1.0*