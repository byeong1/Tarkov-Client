#nullable disable
using System;
using System.Threading.Tasks;
using System.Globalization;
using System.IO;
using Microsoft.Web.WebView2.Wpf;
using Microsoft.Web.WebView2.Core;

namespace TarkovClient
{
    /// <summary>
    /// WebView2 Direct Communication을 통한 지도 시스템 컨트롤러
    /// C# ↔ JavaScript 간 실시간 통신을 담당
    /// </summary>
    public class MapViewController : IDisposable
    {
        private readonly WebView2 _webView;
        private bool _isInitialized = false;
        private bool _isDisposed = false;
        private string _currentMapId = string.Empty;

        // 이벤트
        public event Action<Position> PositionUpdated;
        public event Action<string> MapChanged;
        public event Action<string> ErrorOccurred;
        public event Action InitializationCompleted;

        public bool IsInitialized => _isInitialized;
        public string CurrentMapId => _currentMapId;

        public MapViewController(WebView2 webView)
        {
            _webView = webView ?? throw new ArgumentNullException(nameof(webView));
        }

        /// <summary>
        /// MapViewController 초기화
        /// </summary>
        public async Task<bool> InitializeAsync()
        {
            try
            {
                if (_isInitialized)
                    return true;

                // WebView2 환경 및 이벤트 설정
                await SetupWebViewEnvironment();
                await SetupEventHandlers();
                await LoadMapInterface();

                // 초기화 완료 대기
                await WaitForInitialization();

                _isInitialized = true;
                InitializationCompleted?.Invoke();

                Console.WriteLine("MapViewController 초기화 완료");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"MapViewController 초기화 실패: {ex.Message}");
                ErrorOccurred?.Invoke($"초기화 실패: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// WebView2 환경 설정
        /// </summary>
        private async Task SetupWebViewEnvironment()
        {
            // 가상 호스트 매핑 설정 (로컬 HTML 파일 접근용)
            _webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "tarkov.local",
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "src", "Webs"),
                CoreWebView2HostResourceAccessKind.Allow
            );

            // 보안 및 기능 설정
            _webView.CoreWebView2.Settings.AreDevToolsEnabled = true; // 개발 중에만
            _webView.CoreWebView2.Settings.AreHostObjectsAllowed = true;
            _webView.CoreWebView2.Settings.IsGeneralAutofillEnabled = false;
            _webView.CoreWebView2.Settings.IsPasswordAutosaveEnabled = false;
            _webView.CoreWebView2.Settings.IsWebMessageEnabled = true;

            // CORS 설정 (간소화)
            _webView.CoreWebView2.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All);
        }

        /// <summary>
        /// 이벤트 핸들러 설정
        /// </summary>
        private async Task SetupEventHandlers()
        {
            // JavaScript → C# 메시지 수신
            _webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;

            // 네비게이션 이벤트
            _webView.CoreWebView2.NavigationCompleted += OnNavigationCompleted;

            await Task.CompletedTask;
        }

        /// <summary>
        /// 지도 인터페이스 로드
        /// </summary>
        private async Task LoadMapInterface()
        {
            var mapUrl = "https://tarkov.local/components/Map/Map.modular.html";
            _webView.CoreWebView2.Navigate(mapUrl);
            await Task.CompletedTask;
        }

        /// <summary>
        /// 초기화 완료 대기
        /// </summary>
        private async Task WaitForInitialization()
        {
            const int maxRetries = 50; // 5초 대기
            int retryCount = 0;

            while (retryCount < maxRetries)
            {
                try
                {
                    var result = await _webView.CoreWebView2.ExecuteScriptAsync(
                        "window.tarkovMap && window.tarkovMap.isInitialized"
                    );

                    if (result.Trim('"') == "true")
                    {
                        return; // 초기화 완료
                    }
                }
                catch
                {
                    // 스크립트 실행 실패는 정상 (아직 로딩 중)
                }

                await Task.Delay(100);
                retryCount++;
            }

            throw new InvalidOperationException("지도 인터페이스 초기화 타임아웃");
        }

        /// <summary>
        /// 플레이어 위치 업데이트
        /// </summary>
        public async Task<bool> UpdatePlayerPositionAsync(Position position)
        {
            if (!_isInitialized || _isDisposed)
                return false;

            try
            {
                var positionData = PositionUpdateData.FromPosition(position);
                var script = $@"
                    if (window.tarkovMap && window.tarkovMap.updatePlayerPosition) {{
                        window.tarkovMap.updatePlayerPosition({{
                            mapId: '{positionData.MapId}',
                            x: {positionData.X.ToString(CultureInfo.InvariantCulture)},
                            y: {positionData.Y.ToString(CultureInfo.InvariantCulture)},
                            z: {positionData.Z.ToString(CultureInfo.InvariantCulture)},
                            rotation: {positionData.Rotation.ToString(CultureInfo.InvariantCulture)},
                            timestamp: '{positionData.Timestamp}',
                            accuracy: {positionData.Accuracy.ToString(CultureInfo.InvariantCulture)}
                        }});
                        true;
                    }} else {{
                        false;
                    }}
                ";

                var result = await _webView.CoreWebView2.ExecuteScriptAsync(script);
                var success = bool.Parse(result.Trim('"'));

                if (success)
                {
                    PositionUpdated?.Invoke(position);
                }

                return success;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"위치 업데이트 실패: {ex.Message}");
                ErrorOccurred?.Invoke($"위치 업데이트 실패: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// 맵 전환
        /// </summary>
        public async Task<bool> SwitchMapAsync(string mapId)
        {
            if (!_isInitialized || _isDisposed)
                return false;

            try
            {
                var script = $@"
                    if (window.tarkovMap && window.tarkovMap.switchMap) {{
                        window.tarkovMap.switchMap('{mapId}');
                        true;
                    }} else {{
                        false;
                    }}
                ";

                var result = await _webView.CoreWebView2.ExecuteScriptAsync(script);
                var success = bool.Parse(result.Trim('"'));

                if (success)
                {
                    _currentMapId = mapId;
                    MapChanged?.Invoke(mapId);
                }

                return success;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"맵 전환 실패: {ex.Message}");
                ErrorOccurred?.Invoke($"맵 전환 실패: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// 설정 업데이트
        /// </summary>
        public async Task<bool> UpdateSettingsAsync(MapSettingsData settings)
        {
            if (!_isInitialized || _isDisposed)
                return false;

            try
            {
                var message = new WebViewMessage(WebViewMessageTypes.SETTINGS_UPDATE, settings);
                await SendMessageAsync(message);
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"설정 업데이트 실패: {ex.Message}");
                ErrorOccurred?.Invoke($"설정 업데이트 실패: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// JavaScript로 메시지 전송
        /// </summary>
        private async Task SendMessageAsync(WebViewMessage message)
        {
            if (!_isInitialized || _isDisposed)
                return;

            var json = message.ToJson();
            _webView.CoreWebView2.PostWebMessageAsString(json);
        }

        /// <summary>
        /// JavaScript에서 오는 메시지 처리
        /// </summary>
        private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                var json = e.TryGetWebMessageAsString();
                var message = WebViewMessage.FromJson(json);

                if (message == null || !WebViewMessageValidator.IsValid(message))
                {
                    Console.WriteLine($"잘못된 메시지 수신: {json}");
                    return;
                }

                ProcessIncomingMessage(message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"메시지 처리 오류: {ex.Message}");
                ErrorOccurred?.Invoke($"메시지 처리 오류: {ex.Message}");
            }
        }

        /// <summary>
        /// 수신된 메시지 처리
        /// </summary>
        private void ProcessIncomingMessage(WebViewMessage message)
        {
            switch (message.Type)
            {
                case WebViewMessageTypes.MAP_READY:
                    Console.WriteLine("지도 준비 완료");
                    break;

                case WebViewMessageTypes.MAP_ERROR:
                    var errorData = message.GetData<ErrorReportData>();
                    Console.WriteLine($"지도 오류: {errorData?.Message}");
                    ErrorOccurred?.Invoke(errorData?.Message ?? "알 수 없는 지도 오류");
                    break;

                case WebViewMessageTypes.USER_INTERACTION:
                    var interactionData = message.GetData<UserInteractionData>();
                    Console.WriteLine($"사용자 인터랙션: {interactionData?.Action}");
                    break;

                case WebViewMessageTypes.SETTINGS_REQUEST:
                    // 현재 설정을 JavaScript로 전송
                    _ = Task.Run(async () =>
                    {
                        var settings = GetCurrentSettings();
                        await UpdateSettingsAsync(settings);
                    });
                    break;

                default:
                    Console.WriteLine($"처리되지 않은 메시지 타입: {message.Type}");
                    break;
            }
        }

        /// <summary>
        /// 현재 설정 반환
        /// </summary>
        private MapSettingsData GetCurrentSettings()
        {
            // 추후 설정 관리 시스템과 연동
            return new MapSettingsData
            {
                Theme = "dark",
                ShowGrid = true,
                ShowDirection = true,
                MarkerSize = 16,
                UpdateInterval = 50,
                AutoCenter = true,
                AutoZoom = false
            };
        }

        /// <summary>
        /// 네비게이션 완료 이벤트 처리
        /// </summary>
        private void OnNavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
        {
            if (e.IsSuccess)
            {
                Console.WriteLine("지도 페이지 로딩 완료");
            }
            else
            {
                Console.WriteLine($"지도 페이지 로딩 실패: {e.WebErrorStatus}");
                ErrorOccurred?.Invoke($"지도 페이지 로딩 실패: {e.WebErrorStatus}");
            }
        }

        /// <summary>
        /// 디버깅용: JavaScript 콘솔 로그 확인
        /// </summary>
        public async Task<string> GetConsoleLogsAsync()
        {
            if (!_isInitialized || _isDisposed)
                return "MapViewController가 초기화되지 않음";

            try
            {
                var script = @"
                    JSON.stringify({
                        isInitialized: window.tarkovMap ? window.tarkovMap.isInitialized : false,
                        currentMap: window.tarkovMap ? window.tarkovMap.currentMapId : null,
                        errors: window.tarkovMapApp ? window.tarkovMapApp.errors : []
                    })
                ";

                var result = await _webView.CoreWebView2.ExecuteScriptAsync(script);
                return result.Trim('"');
            }
            catch (Exception ex)
            {
                return $"로그 조회 실패: {ex.Message}";
            }
        }

        /// <summary>
        /// 리소스 정리
        /// </summary>
        public void Dispose()
        {
            if (_isDisposed)
                return;

            try
            {
                if (_webView?.CoreWebView2 != null)
                {
                    _webView.CoreWebView2.WebMessageReceived -= OnWebMessageReceived;
                    _webView.CoreWebView2.NavigationCompleted -= OnNavigationCompleted;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"MapViewController 정리 중 오류: {ex.Message}");
            }

            _isInitialized = false;
            _isDisposed = true;

            Console.WriteLine("MapViewController 정리 완료");
        }
    }
}