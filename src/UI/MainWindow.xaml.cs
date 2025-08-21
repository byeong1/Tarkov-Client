using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
using TarkovClient.Constants;

namespace TarkovClient;

/// <summary>
/// Interaction logic for MainWindow.xaml
/// </summary>
public partial class MainWindow : Window
{
    private int _tabCounter = 1;
    private readonly Dictionary<TabItem, WebView2> _tabWebViews = new();

    public MainWindow()
    {
        try
        {
            InitializeComponent();

            // 윈도우 로드 완료 후 초기화
            Loaded += MainWindow_Loaded;
            Closed += MainWindow_Closed;
        }
        catch (Exception)
        {
            throw;
        }
    }

    // 탭 제목 업데이트
    private static void UpdateTabTitle(TabItem tabItem, string title)
    {
        if (!string.IsNullOrEmpty(title))
        {
            // "Tarkov Pilot"를 "Tarkov Client"로 변경
            string displayTitle = title.Replace("Tarkov Pilot", "Tarkov Client");
            tabItem.Header =
                displayTitle.Length > 20 ? displayTitle.Substring(0, 20) + "..." : displayTitle;
        }
    }

    // Tarkov Market Map 방향 표시기 추가 (탭별)
    private static async Task AddDirectionIndicators(WebView2 webView)
    {
        try
        {
            await Task.Delay(2000); // 페이지 로딩 완료 대기
            await webView.CoreWebView2.ExecuteScriptAsync(
                JavaScriptConstants.ADD_DIRECTION_INDICATORS_SCRIPT
            );
        }
        catch (Exception)
        {
            // 에러 처리
        }
    }

    // 불필요한 UI 요소 제거 (탭별)
    private static async Task RemoveUnwantedElements(WebView2 webView)
    {
        try
        {
            await webView.CoreWebView2.ExecuteScriptAsync(
                JavaScriptConstants.REMOVE_UNWANTED_ELEMENTS_SCRIPT
            );
        }
        catch (Exception)
        {
            // 에러 처리
        }
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        await InitializeTabs();
    }

    // 탭 시스템 초기화 및 첫 번째 탭 생성
    private async Task InitializeTabs()
    {
        try
        {
            // 첫 번째 탭 생성
            await CreateNewTab();

            // 전체 로딩 패널 숨김
            LoadingPanel.Visibility = Visibility.Collapsed;
        }
        catch (Exception)
        {
            // 로딩 패널에 에러 메시지 표시
            LoadingPanel.Visibility = Visibility.Visible;

            var stackPanel = LoadingPanel.Child as System.Windows.Controls.StackPanel;

            if (stackPanel?.Children.Count > 1)
            {
                var errorText = stackPanel.Children[1] as System.Windows.Controls.TextBlock;
                if (errorText != null)
                {
                    errorText.Text = "탭 시스템 초기화 실패";
                }
            }
        }
    }

    // 새 탭 생성
    private async Task CreateNewTab()
    {
        try
        {
            // 새 TabItem 생성
            var newTab = new TabItem
            {
                Header = $"Tarkov Client {_tabCounter}",
                Background = System.Windows.Media.Brushes.Transparent,
            };

            // 새 WebView2 생성
            var webView = new WebView2
            {
                DefaultBackgroundColor = System.Drawing.Color.FromArgb(255, 26, 26, 26),
            };

            // 탭에 WebView2 추가
            newTab.Content = webView;

            // TabControl에 새 탭 추가
            TabContainer.Items.Add(newTab);
            _tabWebViews[newTab] = webView;

            // 새 탭 선택
            TabContainer.SelectedItem = newTab;

            // WebView2 초기화
            await InitializeWebView(webView, newTab);

            _tabCounter++;
        }
        catch (Exception)
        {
            // 에러 처리는 상위에서
        }
    }

    // WebView2 초기화
    private async Task InitializeWebView(WebView2 webView, TabItem tabItem)
    {
        try
        {
            // WebView2 데이터 폴더를 사용자 앱데이터 폴더로 설정
            var userDataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "TarkovClient",
                "WebView2"
            );
            
            var webView2Environment = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
            await webView.EnsureCoreWebView2Async(webView2Environment);

            // WebView2 설정
            webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
            webView.CoreWebView2.Settings.IsWebMessageEnabled = true;

            // 이벤트 핸들러 등록
            webView.NavigationCompleted += (sender, e) =>
                WebView_NavigationCompleted(sender, e, tabItem);
            webView.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
            webView.CoreWebView2.DocumentTitleChanged += (sender, e) =>
                UpdateTabTitle(tabItem, webView.CoreWebView2.DocumentTitle);

            // 타르코프 마켓 파일럿 페이지 로드
            string pilotUrl = Env.WebsiteUrl;
            webView.Source = new Uri(pilotUrl);
        }
        catch (Exception)
        {
            // 에러 처리
        }
    }

    // 새 탭 추가 버튼 클릭
    private async void NewTab_Click(object sender, RoutedEventArgs e)
    {
        await CreateNewTab();
    }

    // 탭별 WebView2 네비게이션 완료 이벤트
    private void WebView_NavigationCompleted(
        object sender,
        CoreWebView2NavigationCompletedEventArgs e,
        TabItem tabItem
    )
    {
        var webView = sender as WebView2;

        if (e.IsSuccess)
        {
            /* WebSocket 서버에 WebView 준비 완료 알림 (첫 번째 탭에서만) */
            if (TabContainer.Items.IndexOf(tabItem) == 0 && Server.CanSend)
            {
                Server.SendConfiguration();
            }

            // 불필요한 UI 요소 제거 및 방향 표시기 추가
            _ = RemoveUnwantedElements(webView);
            _ = AddDirectionIndicators(webView);
        }
    }

    // 탭 닫기 버튼 클릭
    private void CloseTab_Click(object sender, RoutedEventArgs e)
    {
        var button = sender as System.Windows.Controls.Button;
        var tabItem = button?.Tag as TabItem;

        /* 최소 1개 탭은 유지 */
        if (tabItem != null && TabContainer.Items.Count > 1)
        {
            CloseTab(tabItem);
        }
    }

    // 탭 닫기
    private void CloseTab(TabItem tabItem)
    {
        if (_tabWebViews.TryGetValue(tabItem, out var webView))
        {
            // WebView2 정리
            webView?.Dispose();
            _tabWebViews.Remove(tabItem);
        }

        // TabControl에서 탭 제거
        TabContainer.Items.Remove(tabItem);
    }




    // JavaScript에서 C#로 메시지 수신
    private void CoreWebView2_WebMessageReceived(
        object sender,
        CoreWebView2WebMessageReceivedEventArgs e
    )
    {
        try
        {
            string message = e.TryGetWebMessageAsString();

            // TODO: 웹사이트에서 요청하는 기능 처리 (설정 변경 등)
            // 예: 게임 폴더 경로 변경, 스크린샷 폴더 변경 등
        }
        catch (Exception) { }
    }

    // 윈도우 종료 이벤트
    private void MainWindow_Closed(object sender, EventArgs e)
    {
        try
        {
            // 모든 탭의 WebView2 정리
            foreach (var kvp in _tabWebViews)
            {
                var webView = kvp.Value;
                if (webView?.CoreWebView2 != null)
                {
                    webView.CoreWebView2.WebMessageReceived -= CoreWebView2_WebMessageReceived;
                }
                webView?.Dispose();
            }
            _tabWebViews.Clear();

            // 애플리케이션 종료
            System.Windows.Application.Current.Shutdown();
        }
        catch (Exception)
        {
            // 에러 처리
        }
    }
}
