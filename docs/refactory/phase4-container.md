# Phase 4: 버튼별 고정 탭 시스템 구축

## 목표
현재 탭 시스템을 유지하면서 버튼별로 고정된 앱 타입의 탭을 생성할 수 있도록 구축

## ⚠️ 중요: 앱 타입별 상태 공유
- **같은 버튼**: TC 탭들끼리는 상태 공유, PT 탭들끼리는 상태 공유
- **다른 버튼**: tracker 탭 ↔ party 탭 간에만 독립적

## 작업 단계

### 4.1 탭 생성 버튼 시스템 구축

현재 MainWindow.xaml.cs의 탭 생성 시스템을 확장하여 앱 타입별 탭 생성

```csharp
// MainWindow.xaml.cs에 추가
private async Task CreateNewTab(string appType = "tracker")
{
    var newTab = new TabItem
    {
        Header = GetTabHeader(appType),
        Background = System.Windows.Media.Brushes.Transparent,
    };

    var webView = new WebView2
    {
        DefaultBackgroundColor = System.Drawing.Color.Black,
    };

    newTab.Content = webView;
    TabContainer.Items.Add(newTab);
    _tabWebViews[newTab] = webView;
    TabContainer.SelectedItem = newTab;

    // 앱 타입에 따른 WebView 초기화
    switch(appType)
    {
        case "tracker":
            await InitializeTrackerWebView(webView, newTab);
            break;
        case "party":
            await InitializePartyWebView(webView, newTab);
            break;
    }

    _tabCounter++;
}
```

### 4.2 사이드바 탭 생성 버튼 추가

MainWindow.xaml에 앱별 탭 생성 버튼 추가

```xml
<!-- MainWindow.xaml 사이드바에 추가 -->
<StackPanel Grid.Column="0" Orientation="Vertical" Background="#1A1A1A">
    <!-- 기존 TC 버튼 -->
    <Button x:Name="NewTabButton" Click="NewTab_Click">TC</Button>
    
    <!-- 새로 추가할 버튼들 -->
    <Button x:Name="NewTrackerTabButton" Click="NewTrackerTab_Click">TR</Button>
    <Button x:Name="NewPartyTabButton" Click="NewPartyTab_Click">PT</Button>
    <Button x:Name="SettingsButton" Click="Settings_Click">⚙️</Button>
</StackPanel>
```

### 4.3 탭별 독립적인 WebView 초기화

각 탭은 독립적인 WebView2 인스턴스이므로 iframe이 아닌 직접 로딩

```csharp
// InitializeTrackerWebView (기존 방식 유지)
private async Task InitializeTrackerWebView(WebView2 webView, TabItem tabItem)
{
    string webPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "src", "Webs", "tracker");
    string indexPath = Path.Combine(webPath, "index.html");
    
    await InitializeWebView(webView, tabItem);
    webView.Source = new Uri(indexPath);
}

// InitializePartyWebView (새로 추가)
private async Task InitializePartyWebView(WebView2 webView, TabItem tabItem)
{
    string webPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "src", "Webs", "party");
    string partyPath = Path.Combine(webPath, "party.html");
    
    await InitializeWebView(webView, tabItem);
    webView.Source = new Uri(partyPath);
}
```

### 4.4 탭별 WebView2 통신 시스템

각 탭의 WebView2는 독립적으로 C#와 통신

```csharp
// 메시지 수신 시 현재 활성 탭으로 전달
private void WebView_WebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
{
    try
    {
        // 현재 활성화된 탭의 WebView 확인
        var selectedTab = TabContainer.SelectedItem as TabItem;
        if (selectedTab != null && _tabWebViews.ContainsKey(selectedTab))
        {
            var activeWebView = _tabWebViews[selectedTab];
            
            // 해당 탭의 앱 타입 확인 후 처리
            string appType = GetAppTypeFromTab(selectedTab);
            HandleMessageByAppType(appType, e.WebMessageAsJson, activeWebView);
        }
    }
    catch (Exception ex)
    {
        WriteDebugLog($"메시지 처리 오류: {ex.Message}");
    }
}

private string GetAppTypeFromTab(TabItem tab)
{
    // 탭 헤더나 태그로 앱 타입 구분
    string header = tab.Header?.ToString() ?? "";
    if (header.Contains("Party") || header.Contains("파티")) return "party";
    if (header.Contains("Tracker") || header.Contains("트래커")) return "tracker";
    return "tracker"; // 기본값
}
```

## 앱 타입별 상태 공유 시스템

### 상태 공유 메커니즘
- **LocalStorage**: 도메인별 공유 (tracker/ 도메인의 모든 탭이 공유)
- **SessionStorage**: WebView2 인스턴스별 독립 (탭별 독립)
- **메모리 상태**: JavaScript 전역 상태는 탭별 독립
- **설정 및 데이터**: 같은 앱 타입 탭들끼리 공유 필요

## 완료 기준
- 버튼별 고정 앱 타입 탭 생성 시스템 동작
- 각 탭의 독립적인 WebView2 초기화 성공
- C# ↔ 각 탭 WebView2 통신 체인 구축
- 앱 타입별 상태 공유 시스템 구현 (같은 버튼 탭들끼리 공유)
- 다른 앱 타입 간 독립성 보장 (tracker ↔ party)

---
*Phase 5: party 앱 변환 준비 완료*