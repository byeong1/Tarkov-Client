# 파티 구하기 시스템 설계 문서

## 📋 현재 상태: 프로토타입 (Prototype)

**⚠️ 주의사항**: 현재 이 문서는 초기 기획 문서이며, 실제 구현은 단순한 프로토타입 수준입니다.

### 프로토타입 현황 (2025-08-24)
- ✅ **기본 파티 페이지 UI**: 설정 페이지와 동일한 단순한 구조
- ✅ **파티 버튼 연동**: 사이드바에서 파티 탭 열기 기능
- ✅ **기본 설정 UI**: 파티 기능 활성화, 디스코드 연동 체크박스
- ❌ **실제 파티 생성**: 미구현 (추후 작업)
- ❌ **디시인사이드 연동**: 미구현 (추후 작업)
- ❌ **실시간 동기화**: 미구현 (추후 작업)

### 다음 작업 계획
1. **1단계**: 현재 프로토타입 검증 및 안정화
2. **2단계**: 새 브랜치에서 실제 파티 기능 구현
3. **3단계**: 디스코드/디시인사이드 연동 구현

## 📋 개요 (기획 문서)

타르코프 파티 구하기 시스템은 TarkovClient 사용자들이 쉽게 파티를 구성하고, 디시인사이드 타르코프 갤러리의 파티모집 게시글과 연동하여 통합된 파티 매칭 경험을 제공하는 기능입니다.

## 🎯 핵심 목표 (기획)

1. **간편한 파티 생성**: 몇 번의 클릭으로 파티 모집 게시
2. **디시인사이드 연동**: 자동으로 디시 갤러리에 게시글 작성
3. **통합 파티 목록**: TarkovClient 파티와 디시 파티를 한 곳에서 확인
4. **실시간 업데이트**: WebSocket을 통한 실시간 파티 정보 동기화

## 🏗️ 시스템 아키텍처

### 1. 데이터 흐름

```
[사용자 파티 생성]
    ↓
[TarkovClient 내부 저장]
    ↓
[WebSocket 브로드캐스트] → [다른 사용자들에게 전달]
    ↓
[디시인사이드 자동 게시] (선택적)
    
[디시인사이드 크롤링]
    ↓
[파티모집 게시글 파싱]
    ↓
[TarkovClient 파티 목록에 통합]
```

### 2. 컴포넌트 구조

```
src/
├── Pages/
│   ├── PartyPage.xaml           # 파티 페이지 UI
│   └── PartyPage.xaml.cs        # 파티 페이지 로직
├── Services/
│   ├── PartyService.cs          # 파티 관리 핵심 로직
│   ├── DCInsideCrawler.cs       # 디시 크롤링 서비스
│   ├── DCInsidePoster.cs        # 디시 자동 게시 서비스
│   └── DCInsideAPI.cs           # 디시 API 클라이언트
├── Models/
│   └── PartyModels.cs           # 파티 관련 데이터 모델
└── Utils/
    └── PartyFormatter.cs        # 게시글 포맷팅 유틸리티
```

## 📊 데이터 모델

### PartyPost (파티 게시글)

```csharp
public class PartyPost
{
    // 기본 정보
    public string Id { get; set; }                    // 고유 ID
    public string Title { get; set; }                 // 제목
    public string Content { get; set; }               // 내용
    public string Author { get; set; }                // 작성자
    public DateTime CreatedAt { get; set; }           // 생성 시간
    
    // 파티 정보
    public PartyType Type { get; set; }               // PvP, PvE, Both
    public string Map { get; set; }                   // 맵 이름
    public int CurrentMembers { get; set; }           // 현재 인원
    public int MaxMembers { get; set; }               // 최대 인원
    public string DiscordLink { get; set; }           // 디스코드 초대 링크
    
    // 메타 정보
    public PostSource Source { get; set; }            // TarkovClient, DCInside
    public bool IsFromTarkovClient { get; set; }      // TC로 생성된 글인지
    public int ViewCount { get; set; }                // 조회수
    public PartyStatus Status { get; set; }           // Active, Full, Expired
}

public enum PartyType
{
    PvP,
    PvE,
    Both
}

public enum PostSource
{
    TarkovClient,
    DCInside
}

public enum PartyStatus
{
    Active,      // 모집중
    Full,        // 인원 마감
    Expired      // 시간 만료
}
```

## 🔍 디시인사이드 크롤링

### 크롤링 대상 URL
```
https://gall.dcinside.com/mgallery/board/lists/?id=eft&sort_type=N&search_head=40&page=1
```
- `search_head=40`: 파티모집 말머리 필터
- `page=1`: 페이지 번호

### 크롤링 데이터 구조

디시인사이드 파티모집 게시글의 일반적인 구조:
- **제목**: `[🚕모집] [PvP/PvE] 제목...`
- **작성자**: 닉네임 또는 ㅇㅇ(IP)
- **시간**: HH:MM (오늘) 또는 MM.DD (과거)
- **조회수**: 숫자
- **댓글수**: [N]

### 크롤링 주기
- **기본**: 60초 간격
- **피크 시간대**: 30초 간격 (저녁 7-11시)
- **새벽 시간대**: 120초 간격 (새벽 2-6시)

## 📝 DCInside C# API 연동

### Python API 참고 구조

[eunchuldev/dcinside-python3-api](https://github.com/eunchuldev/dcinside-python3-api) 프로젝트 분석 결과:

```python
await api.write_document(
    board_id="eft", 
    title="파티모집 제목", 
    contents="게시글 내용", 
    name="ㅇㅇ", 
    password="1234", 
    is_minor=False
)
```

### C# API 클라이언트 설계

```csharp
public class DCInsideAPI
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl = "https://gall.dcinside.com";
    
    public DCInsideAPI()
    {
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Add("User-Agent", 
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
    }
    
    public async Task<DCPostResult> WriteDocumentAsync(DCPostRequest request)
    {
        try
        {
            var formData = new MultipartFormDataContent
            {
                { new StringContent(request.BoardId), "id" },
                { new StringContent(request.Title), "subject" },
                { new StringContent(request.Contents), "memo" },
                { new StringContent(request.Name), "name" },
                { new StringContent(request.Password), "password" },
                { new StringContent(request.IsMinor ? "1" : "0"), "is_minor" }
            };
            
            var response = await _httpClient.PostAsync($"{_baseUrl}/board/write/", formData);
            
            if (response.IsSuccessStatusCode)
            {
                return new DCPostResult { Success = true, Message = "게시글 작성 성공" };
            }
            else
            {
                return new DCPostResult { Success = false, Message = "게시글 작성 실패" };
            }
        }
        catch (Exception ex)
        {
            return new DCPostResult { Success = false, Message = ex.Message };
        }
    }
}

public class DCPostRequest
{
    public string BoardId { get; set; } = "eft";        // 타르코프 갤러리
    public string Title { get; set; }                   // 제목
    public string Contents { get; set; }                // 내용
    public string Name { get; set; } = "ㅇㅇ";          // 작성자명
    public string Password { get; set; } = "1234";      // 비밀번호
    public bool IsMinor { get; set; } = false;          // 미성년자 여부
}

public class DCPostResult
{
    public bool Success { get; set; }
    public string Message { get; set; }
    public string PostUrl { get; set; }
}
```

### 게시글 작성 플로우

```csharp
public async Task<bool> CreatePartyPostAsync(PartyPost party)
{
    // 1. 게시글 포맷 생성
    var formattedContent = _partyFormatter.FormatPartyPost(party);
    
    // 2. DCInside API 호출
    var request = new DCPostRequest
    {
        Title = $"[TC파티] {party.Title}",
        Contents = formattedContent,
        Name = "TarkovClient",
        Password = GenerateRandomPassword()
    };
    
    var result = await _dcInsideAPI.WriteDocumentAsync(request);
    
    // 3. 결과 처리
    if (result.Success)
    {
        party.Source = PostSource.DCInside;
        await _partyService.SavePartyAsync(party);
        return true;
    }
    
    return false;
}
```

## 🏷️ 게시글 구분 메커니즘

### TarkovClient 생성 게시글 식별 방법

#### 방법 1: 특별한 서명 (Signature) 사용
```
제목: [TC] 커스텀 5인 파티 구함
내용 마지막: 
─────────────────
TarkovClient v0.1.1
```

#### 방법 2: 구조화된 포맷
```
【파티 모집】
━━━━━━━━━━━━━━━━━━━━
📍 맵: 커스텀
⚔️ 타입: PvP
👥 인원: 2/5
🎯 목적: 레이더 퀘스트
💬 디스코드: discord.gg/xxxxx
━━━━━━━━━━━━━━━━━━━━
추가 내용...

[TarkovClient로 작성됨]
```

#### 방법 3: 숨겨진 마커 (Hidden Marker)
```html
<!-- 사용자에게 보이지 않는 Zero-Width 문자 사용 -->
내용​​​TC​​​파티모집​​​
(U+200B 문자를 특정 패턴으로 삽입)
```

#### 방법 4: 메타데이터 해시
```
게시글 끝에 간단한 해시 추가:
#TC-2024-08-24-A3F2
(TC-날짜-체크섬)
```

### 식별 알고리즘

```csharp
public bool IsFromTarkovClient(string content)
{
    // 1. 명시적 서명 확인
    if (content.Contains("[TarkovClient") || 
        content.Contains("TarkovClient v"))
        return true;
    
    // 2. 구조화된 포맷 패턴 확인
    if (Regex.IsMatch(content, @"【파티 모집】.*━━━.*📍 맵:"))
        return true;
    
    // 3. 숨겨진 마커 확인
    if (ContainsHiddenMarker(content))
        return true;
    
    // 4. 메타데이터 해시 확인
    if (Regex.IsMatch(content, @"#TC-\d{4}-\d{2}-\d{2}-[A-F0-9]{4}"))
        return true;
    
    return false;
}
```

## 🎨 UI/UX 디자인

### 파티 페이지 레이아웃

```
┌─────────────────────────────────────────────────────┐
│  🎮 파티 구하기                              [새로고침] │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [🆕 새 파티 만들기]  [🔍 필터]  [⚙️ 설정]           │
│                                                      │
├─────────────────────────────────────────────────────┤
│  📌 TarkovClient 파티 (실시간)                      │
│  ┌────────────────────────────────────────────┐    │
│  │ ┌──────────────┐  ┌──────────────┐         │    │
│  │ │ [PvP] 커스텀  │  │ [PvE] 우드    │        │    │
│  │ │ 👥 3/5       │  │ 👥 2/4        │        │    │
│  │ │ 🕐 10분 전    │  │ 🕐 25분 전     │        │    │
│  │ │ by: 닉네임   │  │ by: 유저123   │        │    │
│  │ │              │  │               │        │    │
│  │ │ [참가하기]   │  │ [참가하기]    │        │    │
│  │ └──────────────┘  └──────────────┘         │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
├─────────────────────────────────────────────────────┤
│  📋 디시인사이드 파티모집 (1분마다 갱신)             │
│  ┌────────────────────────────────────────────┐    │
│  │ • [PvP] 퀘스트 같이할 친구 구함              │    │
│  │   ㅇㅇ(211.241) | 12:43 | 조회 178          │    │
│  │                                             │    │
│  │ • 리저브 글루하르 사냥 파티 3/5              │    │
│  │   닉네임 | 11:30 | 조회 245                 │    │
│  │                                             │    │
│  │ • [PvE] 뉴비 도와주실 분                    │    │
│  │   초보자 | 10:15 | 조회 89                  │    │
│  └────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### 파티 생성 다이얼로그

```
┌─────────────────────────────────────────────────┐
│  새 파티 만들기                            [X]   │
├─────────────────────────────────────────────────┤
│                                                  │
│  제목: [_____________________________________]   │
│                                                  │
│  타입: ○ PvP  ○ PvE  ● 상관없음                 │
│                                                  │
│  맵:   [드롭다운: 전체/커스텀/우드/쇼어라인...]   │
│                                                  │
│  인원: [2-5명 슬라이더] 현재: 3명                │
│                                                  │
│  디스코드 초대링크:                              │
│  [discord.gg/__________________________]       │
│  ℹ️ 디스코드에서 초대링크를 생성하여 붙여넣으세요  │
│                                                  │
│  내용:                                          │
│  ┌─────────────────────────────────────┐      │
│  │                                      │      │
│  │                                      │      │
│  │                                      │      │
│  └─────────────────────────────────────┘      │
│                                                  │
│  ☐ 디시인사이드에도 자동으로 게시               │
│     └─ ⚠️ 디시 계정 로그인이 필요합니다         │
│                                                  │
│  [취소]                        [파티 만들기]     │
└─────────────────────────────────────────────────┘
```

## 🔧 기술 스택

### 필수 패키지
```xml
<!-- HTTP 통신을 위한 기본 패키지 (내장) -->
<!-- HttpClient 사용 -->

<!-- HTML 파싱을 위한 라이브러리 -->
<PackageReference Include="HtmlAgilityPack" Version="1.11.71" />

<!-- 선택적: 고급 웹 자동화가 필요한 경우 -->
<PackageReference Include="Selenium.WebDriver" Version="4.35.0" />
<PackageReference Include="Selenium.WebDriver.ChromeDriver" Version="131.0.6778.108" />
```

## ⚠️ 보안 및 윤리적 고려사항

### 1. 디시인사이드 서비스 약관 준수
```csharp
public class DCInsideRateLimiter
{
    private readonly SemaphoreSlim _semaphore;
    private DateTime _lastPostTime;
    private const int MIN_POST_INTERVAL_SECONDS = 30; // 30초 간격
    
    public async Task<bool> CanPostAsync()
    {
        await _semaphore.WaitAsync();
        try
        {
            var timeSinceLastPost = DateTime.Now - _lastPostTime;
            if (timeSinceLastPost.TotalSeconds < MIN_POST_INTERVAL_SECONDS)
            {
                var waitTime = TimeSpan.FromSeconds(MIN_POST_INTERVAL_SECONDS) - timeSinceLastPost;
                await Task.Delay(waitTime);
            }
            _lastPostTime = DateTime.Now;
            return true;
        }
        finally
        {
            _semaphore.Release();
        }
    }
}
```

### 2. 개인정보 보호
```csharp
public class SecureCredentialManager
{
    public string EncryptPassword(string password)
    {
        // Windows DPAPI를 사용한 암호화
        return Convert.ToBase64String(
            ProtectedData.Protect(
                Encoding.UTF8.GetBytes(password),
                null,
                DataProtectionScope.CurrentUser
            )
        );
    }
    
    public string DecryptPassword(string encryptedPassword)
    {
        return Encoding.UTF8.GetString(
            ProtectedData.Unprotect(
                Convert.FromBase64String(encryptedPassword),
                null,
                DataProtectionScope.CurrentUser
            )
        );
    }
}
```

### 3. 에러 처리 및 재시도 로직
```csharp
public async Task<DCPostResult> WriteDocumentWithRetryAsync(DCPostRequest request)
{
    const int maxRetries = 3;
    var retryDelay = TimeSpan.FromSeconds(5);
    
    for (int attempt = 1; attempt <= maxRetries; attempt++)
    {
        try
        {
            var result = await WriteDocumentAsync(request);
            if (result.Success)
                return result;
                
            if (attempt < maxRetries)
                await Task.Delay(retryDelay * attempt); // 지수적 백오프
        }
        catch (HttpRequestException ex) when (attempt < maxRetries)
        {
            // 네트워크 오류 시 재시도
            await Task.Delay(retryDelay * attempt);
        }
        catch (Exception ex)
        {
            // 기타 오류는 즉시 반환
            return new DCPostResult { Success = false, Message = ex.Message };
        }
    }
    
    return new DCPostResult { Success = false, Message = "최대 재시도 횟수 초과" };
}
```

## 🔧 프로토타입 구현 상태 (2025-08-24)

### ✅ 완료된 컴포넌트

#### 1. 핵심 파일들
```
src/
├── Pages/
│   ├── PartyPage.xaml           ✅ UI 레이아웃 완성
│   └── PartyPage.xaml.cs        ✅ 기본 로직 및 더미 데이터
├── Services/
│   └── PartyService.cs          ✅ 파티 관리 핵심 로직
├── Models/
│   └── PartyModels.cs           ✅ 데이터 모델 정의
└── UI/
    └── MainWindow.xaml.cs       ✅ 🎮 파티 버튼 통합
```

#### 2. 구현된 기능
- **파티 페이지 UI**: 다크 테마, 카드형 레이아웃
- **더미 데이터 시스템**: TC 파티 2개, 디시 파티 2개 테스트용 데이터
- **사이드바 통합**: MainWindow에 🎮 파티 버튼 추가
- **파티 생성 다이얼로그**: 기본적인 제목/디스코드링크 입력
- **서비스 계층**: 파티 CRUD, WebSocket 브로드캐스트 준비

#### 3. UI 레이아웃 구조
```
📌 TarkovClient 파티 (실시간)
┌─────────────────────────────────────────┐
│ [커스텀 퀘스트 도움]    [우드 PvP 파티]  │
│ ⚔️ PvE | 📍 커스텀     ⚔️ PvP | 📍 우드  │
│ 👥 2/4 | by: 플레이어1  👥 3/5 | by: 전투광 │
│ [참가하기]             [참가하기]         │
└─────────────────────────────────────────┘

📋 디시인사이드 파티모집 (1분마다 갱신)
┌─────────────────────────────────────────┐
│ • [PvP] 퀘스트 같이할 친구 구함          │
│   ㅇㅇ(211.241) | 12:43 | 조회 178      │
│ • 리저브 글루하르 사냥 파티 3/5          │
│   닉네임 | 11:30 | 조회 245             │
└─────────────────────────────────────────┘
```

### ✅ 해결된 이슈들 

#### 1. 프로그램 크래시 문제 (해결완료 - 2025-08-24)
**이전 증상**: 🎮 파티 버튼 클릭 시 프로그램이 즉시 종료됨

**원인**: 복잡한 UI 레이아웃과 `BooleanToVisibilityConverter` 참조 문제
```xml
Visibility="{Binding IsFromTarkovClient, Converter={StaticResource BooleanToVisibilityConverter}}"
```

**해결**: 설정 페이지와 동일한 단순한 구조로 완전 재구현
- ✅ **XAML 구조 단순화**: ScrollViewer + StackPanel + Border 패턴 사용
- ✅ **더미 데이터 제거**: 복잡한 ObservableCollection 및 데이터 바인딩 제거
- ✅ **기본 설정 UI**: 파티 기능 활성화, 디스코드 연동 체크박스만 유지
- ✅ **간단한 코드비하인드**: 기본 LoadSettings(), Save_Click() 메서드만 구현

**결과**: 이제 파티 버튼 클릭 시 정상적으로 탭이 열림

#### 2. WPF/WinForms 혼용 문제 (해결완료)
**문제**: 프로젝트에서 `<UseWPF>true</UseWPF>`와 `<UseWindowsForms>true</UseWindowsForms>`가 동시에 활성화되어 모호한 참조 에러 발생

**해결**: PartyPage.xaml.cs에 WPF 별칭 추가
```csharp
using WpfButton = System.Windows.Controls.Button;
using WpfMessageBox = System.Windows.MessageBox;
// ... 기타 별칭들
```

#### 3. 빌드 에러 해결 과정 (해결완료)
- **XAML CornerRadius 에러**: Button 요소의 잘못된 CornerRadius 속성 제거
- **WriteDebugLog 미존재**: TarkovClientLogger 클래스로 올바른 호출 수정

### 🚧 다음 브랜치 작업 계획

#### 1. 우선순위 높음
1. **BooleanToVisibilityConverter 문제 해결**
2. **DCInsideCrawler.cs 구현** - HtmlAgilityPack 사용
3. **파티 생성 다이얼로그 고도화** - 맵 선택, 타입 선택, 인원 설정

#### 2. 우선순위 중간  
1. **WebSocket 실시간 동기화 구현**
2. **파티 필터링 및 검색 기능**
3. **디스코드 연결 기능 개선**

#### 3. 향후 계획
1. **DCInsideAPI.cs 구현** - 자동 게시 기능
2. **보안 및 레이트 리미팅**
3. **UI/UX 개선 및 애니메이션**

### 📊 테스트 데이터 구조

현재 프로토타입에서 사용되는 더미 데이터:

#### TarkovClient 파티 데이터 (2개)
```csharp
// 파티 1
{
    Title = "커스텀 퀘스트 도움",
    Author = "플레이어1", 
    Type = PartyType.PvE,
    Map = "커스텀",
    CurrentMembers = 2,
    MaxMembers = 4,
    DiscordLink = "discord.gg/test123",
    CreatedAt = DateTime.Now.AddMinutes(-15)
}

// 파티 2  
{
    Title = "우드 PvP 파티",
    Author = "전투광",
    Type = PartyType.PvP, 
    Map = "우드",
    CurrentMembers = 3,
    MaxMembers = 5,
    DiscordLink = "discord.gg/pvp456",
    CreatedAt = DateTime.Now.AddMinutes(-8)
}
```

#### 디시인사이드 파티 데이터 (2개)
```csharp
// 디시 파티 1
{
    Title = "[PvP] 퀘스트 같이할 친구 구함",
    Author = "ㅇㅇ(211.241)",
    Type = PartyType.PvP,
    Map = "리저브",
    ViewCount = 178,
    Source = PostSource.DCInside,
    IsFromTarkovClient = false,
    CreatedAt = DateTime.Now.AddMinutes(-25)
}

// 디시 파티 2
{
    Title = "리저브 글루하르 사냥 파티 3/5", 
    Author = "닉네임",
    Type = PartyType.PvE,
    Map = "리저브", 
    ViewCount = 245,
    Source = PostSource.DCInside,
    IsFromTarkovClient = false,
    CreatedAt = DateTime.Now.AddMinutes(-45)
}
```

### 🎮 프로토타입 테스트 가이드

#### 정상 작동하는 기능들
1. **MainWindow 사이드바**: TC 버튼, 🎮 파티 버튼, ⚙️ 설정 버튼
2. **빌드 시스템**: `dotnet build` 명령어로 성공적으로 컴파일
3. **기본 UI 구조**: 다크 테마, 반응형 레이아웃

#### 현재 테스트 불가능한 기능들 (크래시 발생)
1. **파티 페이지 진입**: BooleanToVisibilityConverter 문제로 크래시
2. **파티 생성/참가**: 파티 페이지 진입 불가로 테스트 불가
3. **실시간 업데이트**: WebSocket 연동 미완성

---

## 🔧 기존 프로젝트 모듈 활용 가이드

### 📝 로깅 시스템

#### 사용법
```csharp
// 파티 관련 로그 작성
TarkovClientLogger.TarkovClientLogger.WriteDebugLog("파티 생성 완료");
TarkovClientLogger.TarkovClientLogger.WriteDebugLog($"파티 ID: {party.Id}, 제목: {party.Title}");
```

#### 로그 파일 위치 및 형식
- **파일 경로**: 실행 디렉토리의 `test_log.txt`
- **로그 형식**: `yyyy-MM-dd HH:mm:ss.fff - [WindowTopmost] 메시지`
- **예시**: `2025-08-24 14:01:54.775 - [WindowTopmost] 파티 탭이 생성되었습니다.`

#### PartyService에서 활용 예시
```csharp
public async Task<PartyPost> CreatePartyAsync(PartyPost party)
{
    TarkovClientLogger.TarkovClientLogger.WriteDebugLog($"파티 생성 시작: {party.Title}");
    
    try 
    {
        // 파티 생성 로직...
        TarkovClientLogger.TarkovClientLogger.WriteDebugLog($"파티 생성 성공: ID={party.Id}");
        return party;
    }
    catch (Exception ex)
    {
        TarkovClientLogger.TarkovClientLogger.WriteDebugLog($"파티 생성 실패: {ex.Message}");
        throw;
    }
}
```

### ⚙️ 설정 시스템

#### 기존 설정 구조 (`AppSettings`)
```csharp
// 현재 설정 가져오기
AppSettings settings = Env.GetSettings();

// 설정 값 확인
bool pipEnabled = settings.pipEnabled;
string gameFolder = settings.gameFolder;
Dictionary<string, MapSetting> mapSettings = settings.mapSettings;
```

#### 파티 시스템용 설정 추가 방법
```csharp
// AppSettings 클래스에 파티 관련 설정 추가 예시
public class AppSettings
{
    // 기존 설정들...
    
    // 파티 시스템 설정 추가
    public bool partyEnabled { get; set; } = true;
    public bool autoPostToDcInside { get; set; } = false;
    public string dcInsidePassword { get; set; } = "";
    public int partyRefreshIntervalSeconds { get; set; } = 60;
    public int partyExpirationHours { get; set; } = 2;
}
```

#### 설정 저장
```csharp
// 설정 변경 후 저장
var settings = Env.GetSettings();
settings.partyEnabled = true;
Settings.Save(); // settings.json에 저장됨
```

### 🌐 WebSocket 통신 시스템

#### 기존 WebSocket 서버 구조
```csharp
// 서버 정보
- URL: "ws://0.0.0.0:5123"
- 클래스: TarkovClient.Server (static)
- 연결 상태 확인: Server.CanSend
```

#### 파티 데이터 브로드캐스트 방법
```csharp
// 1. PartyUpdateData를 WsMessage를 상속하도록 수정 필요
public class PartyUpdateData : WsMessage
{
    public PartyPost Party { get; set; }
    public string Action { get; set; } // "CREATE", "UPDATE", "DELETE"
}

// 2. PartyService에서 브로드캐스트
private async Task BroadcastPartyUpdateAsync(PartyPost party, string action)
{
    if (Server.CanSend)
    {
        var updateData = new PartyUpdateData
        {
            messageType = "PARTY_UPDATE",
            Party = party,
            Action = action
        };
        
        Server.SendData(updateData);
        TarkovClientLogger.TarkovClientLogger.WriteDebugLog($"파티 브로드캐스트: {action} - {party.Title}");
    }
}
```

#### WebSocket 메시지 처리
```csharp
// 기존 서버에 파티 메시지 타입 추가 필요
// WebSocketServer.cs의 메시지 라우팅에 "PARTY_UPDATE" 케이스 추가
```

### 🎨 WPF/WinForms 혼용 환경 대응

#### using 별칭 패턴 (필수)
```csharp
using System;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Windows;
using System.Windows.Controls;
using TarkovClient.Models;

// WPF 컨트롤 명시적 별칭 (WinForms와의 충돌 방지)
using WpfButton = System.Windows.Controls.Button;
using WpfTextBox = System.Windows.Controls.TextBox;
using WpfTextBlock = System.Windows.Controls.TextBlock;
using WpfStackPanel = System.Windows.Controls.StackPanel;
using WpfGrid = System.Windows.Controls.Grid;
using WpfMessageBox = System.Windows.MessageBox;
using WpfMessageBoxButton = System.Windows.MessageBoxButton;
using WpfMessageBoxImage = System.Windows.MessageBoxImage;
using WpfOrientation = System.Windows.Controls.Orientation;
using WpfHorizontalAlignment = System.Windows.HorizontalAlignment;
using WpfThickness = System.Windows.Thickness;
using WpfWindow = System.Windows.Window;
using WpfWindowStartupLocation = System.Windows.WindowStartupLocation;
```

#### 코드에서 별칭 사용 예시
```csharp
// 잘못된 방법 (모호한 참조 에러)
private void Button_Click(object sender, RoutedEventArgs e)
{
    MessageBox.Show("메시지"); // 에러 발생
    if (sender is Button button) // 에러 발생
    {
        // ...
    }
}

// 올바른 방법 (별칭 사용)
private void Button_Click(object sender, RoutedEventArgs e)
{
    WpfMessageBox.Show("메시지", "제목", WpfMessageBoxButton.OK, WpfMessageBoxImage.Information);
    if (sender is WpfButton button)
    {
        // ...
    }
}
```

### 🏗️ 프로젝트 구조 및 네이밍 규칙

#### 디렉토리 구조
```
src/
├── Constants/          # 상수 정의
├── Core/              # 핵심 시스템 (Env, Settings, PipController, Watcher)
├── FileSystem/        # 파일 감시 및 처리
├── Models/            # 데이터 모델 (DataTypes.cs, PartyModels.cs 등)
├── Network/           # WebSocket 서버
├── Pages/             # XAML 페이지 (PartyPage.xaml/cs)
├── Services/          # 비즈니스 로직 (PartyService.cs 등)
├── UI/                # 메인 UI (MainWindow, SettingsPage 등)
└── Utils/             # 유틸리티 클래스
    └── Logger/        # 로깅 시스템
```

#### 네이밍 규칙
```csharp
// 네임스페이스
TarkovClient.Pages      // UI 페이지
TarkovClient.Services   // 비즈니스 로직
TarkovClient.Models     // 데이터 모델
TarkovClientLogger      // 로깅 (별도 네임스페이스)

// 클래스명
PartyPage              // 파스칼 케이스
PartyService          // 파스칼 케이스
PartyPost             // 파스칼 케이스

// 메서드명
CreatePartyAsync       // 파스칼 케이스, 비동기는 Async 접미사
UpdatePartyAsync       // 파스칼 케이스
DeletePartyAsync       // 파스칼 케이스

// 프로퍼티명 (JSON 직렬화 고려)
public string Id { get; set; }                // 파스칼 케이스 (C#)
public string messageType { get; set; }       // 카멜 케이스 (WebSocket 메시지)
```

### 📦 필수 NuGet 패키지 정보

#### 현재 설치된 패키지
```xml
<PackageReference Include="Fleck" Version="1.2.0" />                    <!-- WebSocket 서버 -->
<PackageReference Include="Microsoft.Web.WebView2" Version="1.0.3405.78" /> <!-- 웹뷰 -->
<PackageReference Include="Newtonsoft.Json" Version="13.0.3" />         <!-- JSON 처리 (기존) -->
<PackageReference Include="HtmlAgilityPack" Version="1.11.71" />        <!-- HTML 파싱 -->
```

#### 파티 시스템을 위한 추가 패키지 (필요시)
```xml
<!-- HTTP 통신 (디시인사이드 API) - 내장 HttpClient 사용 가능 -->
<!-- JSON 처리는 기존 Newtonsoft.Json 또는 System.Text.Json 사용 -->

<!-- 선택적: 고급 웹 자동화가 필요한 경우만 -->
<PackageReference Include="Selenium.WebDriver" Version="4.35.0" />
<PackageReference Include="Selenium.WebDriver.ChromeDriver" Version="131.0.6778.108" />
```

### 🚨 중요한 개발 주의사항

#### 1. BooleanToVisibilityConverter 문제 해결
```xml
<!-- 현재 문제가 되는 코드 (PartyPage.xaml:318) -->
Visibility="{Binding IsFromTarkovClient, Converter={StaticResource BooleanToVisibilityConverter}}"

<!-- 해결 방안 1: App.xaml에 컨버터 추가 -->
<Application.Resources>
    <BooleanToVisibilityConverter x:Key="BooleanToVisibilityConverter"/>
</Application.Resources>

<!-- 해결 방안 2: 코드에서 처리 (권장) -->
<!-- XAML에서 Visibility 바인딩 제거하고, 코드비하인드에서 처리 -->
```

#### 2. JSON 직렬화 호환성
```csharp
// 기존 프로젝트는 System.Text.Json 사용
// PartyModels.cs도 동일한 직렬화 방식 사용 권장
var json = JsonSerializer.Serialize(party, new JsonSerializerOptions { WriteIndented = true });
var party = JsonSerializer.Deserialize<PartyPost>(json);
```

#### 3. 비동기 프로그래밍 패턴
```csharp
// UI 스레드에서 비동기 호출 시 주의
private async void Button_Click(object sender, RoutedEventArgs e)
{
    try
    {
        var result = await _partyService.CreatePartyAsync(newParty);
        // UI 업데이트는 자동으로 UI 스레드에서 실행됨
    }
    catch (Exception ex)
    {
        TarkovClientLogger.TarkovClientLogger.WriteDebugLog($"에러: {ex.Message}");
        WpfMessageBox.Show($"오류: {ex.Message}", "오류", WpfMessageBoxButton.OK, WpfMessageBoxImage.Error);
    }
}
```

---

## 🚀 구현 로드맵

### 1단계: 기본 구조 (2-3시간) ✅ 완료
- [x] PartyPage.xaml 생성
- [x] PartyModels.cs 정의  
- [x] 기본 UI 레이아웃 구성

### 2단계: 로컬 파티 시스템 (3-4시간) ✅ 완료
- [x] PartyService.cs 구현
- [x] 파티 생성 다이얼로그 (기본형)
- [ ] WebSocket 연동 (준비완료, 테스트 필요)

### 3단계: 디시 크롤링 (4-5시간)
- [ ] DCInsideCrawler.cs 구현
- [ ] HTML 파싱 로직
- [ ] 게시글 구분 알고리즘

### 4단계: 디시 API 연동 (4-6시간)
- [ ] DCInsideAPI.cs 구현
- [ ] HTTP 클라이언트 설정
- [ ] 게시글 작성 로직
- [ ] 에러 처리 및 재시도

### 5단계: 보안 및 최적화 (2-3시간)
- [ ] 레이트 리미팅 구현
- [ ] 암호화 저장
- [ ] 성능 최적화

### 6단계: 통합 및 테스트 (2-3시간)
- [ ] 전체 시스템 통합
- [ ] 통합 테스트
- [ ] UI/UX 개선

**총 예상 시간: 17-24시간**

## 📝 추가 아이디어

### 향후 개선사항
1. **파티 매칭 알고리즘**
   - 플레이 스타일 매칭
   - 레벨/경험 기반 매칭
   - 선호 맵/시간대 매칭

2. **평판 시스템**
   - 파티원 평가
   - 신뢰도 점수
   - 블랙리스트

3. **알림 시스템**
   - 원하는 조건의 파티 생성 시 알림
   - 파티 참가 신청 알림
   - 파티 시작 리마인더

4. **통계 및 분석**
   - 인기 맵/시간대 분석
   - 파티 성공률 통계
   - 사용자 활동 패턴

## 🔗 참고 자료

- [디시인사이드 타르코프 갤러리](https://gall.dcinside.com/mgallery/board/lists/?id=eft)
- [DCInside Python API](https://github.com/eunchuldev/dcinside-python3-api)
- [HtmlAgilityPack 문서](https://html-agility-pack.net/)
- [C# HttpClient 가이드](https://docs.microsoft.com/en-us/dotnet/api/system.net.http.httpclient)