# Phase 6: 통합 및 테스트

## 목표
3개 앱 시스템의 완전한 통합과 전체 기능 테스트

## 작업 단계

### 6.1 3개 앱 간 통신 인터페이스 구축

#### 탭 기반 통신 아키텍처
```
C# MainWindow (TabControl)
    ↕️
├── 탭1: WebView2 → tracker/index.html (독립)
├── 탭2: WebView2 → party/party.html (독립)
├── 탭3: WebView2 → tracker/index.html (독립)
└── 탭N: WebView2 → settings/ (기존 방식)
```

**중요**: 각 탭의 WebView2는 완전히 독립적임

#### 탭별 독립 통신 시스템
각 탭은 C#와 직접 통신하며 다른 탭과 격리됨

```csharp
// MainWindow.xaml.cs - 탭별 메시지 처리
private void HandleMessageByAppType(string appType, string messageJson, WebView2 webView)
{
    try
    {
        var message = JsonConvert.DeserializeObject<dynamic>(messageJson);
        
        switch (appType)
        {
            case "tracker":
                HandleTrackerMessage(message, webView);
                break;
            case "party":
                HandlePartyMessage(message, webView);
                break;
        }
    }
    catch (Exception ex)
    {
        WriteDebugLog($"앱별 메시지 처리 오류 ({appType}): {ex.Message}");
    }
}

// 특정 탭에만 메시지 전송
private async void SendMessageToTab(TabItem targetTab, object message)
{
    if (_tabWebViews.ContainsKey(targetTab))
    {
        var webView = _tabWebViews[targetTab];
        var script = $"window.handleCSharpMessage({JsonConvert.SerializeObject(message)})";
        await webView.CoreWebView2.ExecuteScriptAsync(script);
    }
}
```

### 6.2 C# WebView2 연동 코드 수정

#### MainWindow.xaml.cs 수정사항
```csharp
public partial class MainWindow : Window
{
    private string _currentApp = "tracker";
    
    // 웹뷰 초기화
    private async Task InitializeWebView()
    {
        // main.html로 진입점 변경
        string webPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "src", "Webs");
        string mainHtmlPath = Path.Combine(webPath, "main.html");
        
        webView.Navigate(new Uri(mainHtmlPath));
    }
    
    // 앱 전환 메서드
    public void NavigateToApp(string appName)
    {
        _currentApp = appName;
        var script = $"window.messageHub.navigateToApp('{appName}')";
        webView.ExecuteScriptAsync(script);
    }
    
    // 메시지 라우팅 처리
    private void WebView_WebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var message = JsonConvert.DeserializeObject<dynamic>(e.WebMessageAsJson);
            
            // 앱별 메시지 처리
            switch (_currentApp)
            {
                case "tracker":
                    HandleTrackerMessage(message);
                    break;
                case "party":
                    HandlePartyMessage(message);
                    break;
            }
        }
        catch (Exception ex)
        {
            WriteDebugLog($"메시지 처리 오류: {ex.Message}");
        }
    }
}
```

#### 설정 페이지 통합 관리
```csharp
// SettingsPage.xaml.cs 수정
public void UpdateWebSettings()
{
    var settings = Env.GetSettings();
    var message = new 
    {
        type = "SETTINGS_UPDATE",
        app = "all", // 모든 앱에 설정 전달
        data = settings
    };
    
    // main.html 허브를 통해 모든 앱에 설정 전달
    var script = $"window.messageHub.broadcastToAllApps({JsonConvert.SerializeObject(message)})";
    _mainWindow.webView.ExecuteScriptAsync(script);
}
```

### 6.3 전체 시스템 테스트

#### 기능 테스트 체크리스트
- [ ] **탭 생성 테스트**
  - TR 버튼으로 tracker 탭 생성
  - PT 버튼으로 party 탭 생성  
  - 각 탭의 독립적인 WebView2 초기화 확인

- [ ] **탭 독립성 테스트**
  - 탭1에서 tracker 로그인 → 탭2 tracker 영향 없음
  - 탭1 party 설정 → 탭2 party 영향 없음
  - LocalStorage, SessionStorage 격리 확인

- [ ] **통신 테스트**
  - C# → 활성 탭 메시지 전달
  - 각 탭별 독립적인 C# 응답
  - 설정 변경 시 모든 탭 동시 반영

- [ ] **기능 완성도 테스트**
  - 각 탭에서 tracker 모든 기능 정상 동작
  - 각 탭에서 party 모든 기능 정상 동작
  - 설정 페이지는 기존 방식 유지
  - WebSocket 서버의 다중 탭 연동

- [ ] **성능 테스트**
  - 다중 탭 메모리 사용량 측정
  - WebView2 인스턴스별 리소스 사용량
  - 탭 전환 성능 최적화

#### 테스트 시나리오
1. **기본 사용 시나리오**
   - 앱 시작 → tracker 기본 로딩
   - party로 전환 → 기능 테스트
   - tracker로 복귀 → 상태 유지 확인

2. **통신 시나리오**
   - 게임 로그 변경 → tracker 실시간 업데이트
   - 설정 변경 → 모든 앱 동시 반영
   - PiP 모드 토글 테스트

3. **오류 시나리오**
   - 앱 로딩 실패 처리
   - 통신 타임아웃 처리
   - iframe 오류 복구

### 6.4 성능 최적화

#### iframe 최적화
```javascript
// 지연 로딩 구현
class AppManager {
    constructor() {
        this.loadedApps = new Set();
        this.preloadNextApp();
    }
    
    async navigateToApp(appName) {
        if (!this.loadedApps.has(appName)) {
            await this.loadApp(appName);
        }
        this.showApp(appName);
    }
    
    async loadApp(appName) {
        // 비동기 앱 로딩
        return new Promise((resolve) => {
            const frame = document.getElementById('app-frame');
            frame.onload = () => {
                this.loadedApps.add(appName);
                resolve();
            };
            frame.src = this.getAppUrl(appName);
        });
    }
}
```

## 완료 기준
- 모든 기능이 완벽히 동작하는 3개 앱 시스템
- C# ↔ 각 앱 간 통신 완전 구현
- 성능 최적화 적용
- 전체 테스트 시나리오 통과

---
*🎉 대형 리팩토링 프로젝트 완료! 🎉*