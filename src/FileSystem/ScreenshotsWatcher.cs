#nullable disable
using System;
using System.IO;

namespace TarkovClient
{
    public static class ScreenshotsWatcher
    {
        static FileSystemWatcher screenshotsWatcher;
        
        // 위치 감지 이벤트
        public static event Action<Position> PositionDetected;
        public static event Action<string> ScreenshotDetected;

        public static void Start()
        {
            if (!Directory.Exists(Env.ScreenshotsFolder))
            {
                return;
            }

            screenshotsWatcher = new FileSystemWatcher(Env.ScreenshotsFolder);
            screenshotsWatcher.Created += OnScreenshot;
            screenshotsWatcher.EnableRaisingEvents = true;
        }

        public static void Stop()
        {
            if (screenshotsWatcher != null)
            {
                screenshotsWatcher.Created -= OnScreenshot;
                screenshotsWatcher.Dispose();
                screenshotsWatcher = null;
            }
        }

        public static void Restart()
        {
            Stop();
            Start();
        }

        static void OnScreenshot(object sender, FileSystemEventArgs e)
        {
            try
            {
                string filename = e.Name ?? "";

                if (!string.IsNullOrEmpty(filename))
                {
                    // 기존 기능 유지 (WebSocket 서버)
                    Server.SendFilename(filename);
                    
                    // 새로운 기능: 위치 파싱 및 지도 시스템 통합
                    ProcessScreenshotForMap(filename);
                    
                    // 스크린샷 감지 이벤트 발생
                    ScreenshotDetected?.Invoke(filename);
                    
                    // 2차 트리거: 스크린샷 생성 시 PiP 활성화
                    if (Env.GetSettings().pipEnabled && PipController.Instance != null)
                    {
                        PipController.Instance.OnScreenshotTaken();
                    }
                }
            }
            catch (Exception ex)
            {
                // 로깅 개선 필요 시 Logger 클래스 사용
                Console.WriteLine($"스크린샷 처리 중 오류: {ex.Message}");
            }
        }
        
        /// <summary>
        /// 스크린샷을 지도 시스템용으로 처리
        /// </summary>
        private static void ProcessScreenshotForMap(string filename)
        {
            try
            {
                // 1. 위치 정보가 포함된 파일인지 빠르게 확인
                if (!PositionParser.ContainsPositionInfo(filename))
                {
                    return;
                }

                // 2. 위치 정보 파싱
                var position = PositionParser.ParseFromFilename(filename);
                if (position == null)
                {
                    return;
                }

                // 3. 위치 감지 이벤트 발생
                PositionDetected?.Invoke(position);

                // 4. 기존 WebSocket 시스템도 호환 (추후 제거 예정)
                Server.SendPosition(position);
                if (!string.IsNullOrEmpty(position.MapName))
                {
                    Server.SendMap(position.MapName);
                }

                // 5. 디버그 로그
                Console.WriteLine($"위치 감지: {position}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"지도용 스크린샷 처리 실패 - 파일: {filename}, 오류: {ex.Message}");
            }
        }

        /// <summary>
        /// 디버깅용: 특정 파일 강제 처리
        /// </summary>
        public static Position? TestParseScreenshot(string filename)
        {
            try
            {
                return PositionParser.ParseFromFilename(filename);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"테스트 파싱 실패: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// 디버깅용: 상세 파싱 정보 반환
        /// </summary>
        public static PositionParseResult TestParseWithDetails(string filename)
        {
            return PositionParser.ParseWithDetails(filename);
        }
    }
}
