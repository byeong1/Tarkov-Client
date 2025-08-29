#nullable disable
using System;
using System.Text.RegularExpressions;
using System.Globalization;

namespace TarkovClient
{
    /// <summary>
    /// TarkovMonitor의 GameWatcher 로직을 포팅한 위치 파싱 서비스
    /// 스크린샷 파일명에서 게임 위치 정보를 추출합니다
    /// </summary>
    public static class PositionParser
    {
        // TarkovMonitor와 동일한 정규식 패턴
        private static readonly Regex PositionPattern = new Regex(
            @"(?<map>\w+)_(?<x>-?\d+\.?\d*)_(?<y>-?\d+\.?\d*)_(?<z>-?\d+\.?\d*)_(?<qx>-?\d+\.?\d*)_(?<qy>-?\d+\.?\d*)_(?<qz>-?\d+\.?\d*)_(?<qw>-?\d+\.?\d*)",
            RegexOptions.Compiled | RegexOptions.IgnoreCase
        );

        // 파일명 전체 패턴 (날짜 포함)
        private static readonly Regex FullPattern = new Regex(
            @"\d{4}-\d{2}-\d{2}\[\d{2}-\d{2}\]_?(?<position>.+) \(\d\)\.png",
            RegexOptions.Compiled | RegexOptions.IgnoreCase
        );

        /// <summary>
        /// 스크린샷 파일명에서 Position 객체를 파싱합니다
        /// </summary>
        /// <param name="filename">스크린샷 파일명 (예: "2024-08-27[15-30]_FactoryDay_-25.8_-18.2_5.1_0.0_-0.7_0.0_0.7 (1).png")</param>
        /// <returns>파싱된 Position 객체 또는 null (실패 시)</returns>
        public static Position? ParseFromFilename(string filename)
        {
            if (string.IsNullOrEmpty(filename))
                return null;

            try
            {
                // 1단계: 전체 파일명 패턴 매칭
                var fullMatch = FullPattern.Match(filename);
                if (!fullMatch.Success)
                {
                    return null;
                }

                var positionString = fullMatch.Groups["position"].Value;

                // 2단계: 위치 정보 패턴 매칭
                var positionMatch = PositionPattern.Match(positionString);
                if (!positionMatch.Success)
                {
                    return null;
                }

                // 3단계: 값 추출 및 변환
                var position = new Position
                {
                    // 좌표 정보
                    X = ParseFloat(positionMatch.Groups["x"].Value),
                    Y = ParseFloat(positionMatch.Groups["y"].Value),
                    Z = ParseFloat(positionMatch.Groups["z"].Value),
                    
                    // 쿼터니언 정보
                    QuaternionX = ParseFloat(positionMatch.Groups["qx"].Value),
                    QuaternionY = ParseFloat(positionMatch.Groups["qy"].Value),
                    QuaternionZ = ParseFloat(positionMatch.Groups["qz"].Value),
                    QuaternionW = ParseFloat(positionMatch.Groups["qw"].Value),
                    
                    // 맵 이름 및 메타데이터
                    MapName = CleanMapName(positionMatch.Groups["map"].Value),
                    Timestamp = DateTime.UtcNow,
                    Accuracy = 1.0f
                };

                return position;
            }
            catch (Exception ex)
            {
                // 로깅 (추후 Logger 클래스 사용)
                Console.WriteLine($"위치 파싱 실패: {filename}, 오류: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// 문자열을 float로 안전하게 변환
        /// </summary>
        private static float ParseFloat(string value)
        {
            if (float.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out float result))
            {
                return result;
            }
            return 0f;
        }

        /// <summary>
        /// 맵 이름을 정리하고 표준화
        /// </summary>
        private static string CleanMapName(string mapName)
        {
            if (string.IsNullOrEmpty(mapName))
                return "Unknown";

            // 일반적인 맵 이름 표준화
            return mapName switch
            {
                "FactoryDay" or "FactoryNight" => "Factory",
                "Wood" or "Woods" => "Woods",
                "CustomsDay" or "CustomsNight" => "Customs",
                "InterchangeDay" or "InterchangeNight" => "Interchange",
                "ShorelineDay" or "ShorelineNight" => "Shoreline",
                "ReserveDay" or "ReserveNight" => "Reserve",
                "Lab" or "Labs" or "The_Lab" => "Labs",
                "LightHouse" or "Lighthouse" => "Lighthouse",
                "StreetEfTarkov" or "Streets" => "Streets",
                _ => mapName
            };
        }

        /// <summary>
        /// 파일명이 위치 정보를 포함하는지 빠르게 확인
        /// </summary>
        /// <param name="filename">파일명</param>
        /// <returns>위치 정보 포함 여부</returns>
        public static bool ContainsPositionInfo(string filename)
        {
            if (string.IsNullOrEmpty(filename))
                return false;

            // 빠른 사전 검사: 필수 패턴 확인
            return filename.Contains("_") && 
                   filename.Contains(".png") &&
                   FullPattern.IsMatch(filename);
        }

        /// <summary>
        /// 디버깅용: 파일명 파싱 단계별 정보 반환
        /// </summary>
        public static PositionParseResult ParseWithDetails(string filename)
        {
            var result = new PositionParseResult
            {
                OriginalFilename = filename,
                Success = false
            };

            if (string.IsNullOrEmpty(filename))
            {
                result.ErrorMessage = "파일명이 비어있습니다";
                return result;
            }

            // 1단계: 전체 패턴 검사
            var fullMatch = FullPattern.Match(filename);
            if (!fullMatch.Success)
            {
                result.ErrorMessage = "전체 파일명 패턴이 맞지 않습니다";
                return result;
            }

            var positionString = fullMatch.Groups["position"].Value;
            result.ExtractedPositionString = positionString;

            // 2단계: 위치 패턴 검사
            var positionMatch = PositionPattern.Match(positionString);
            if (!positionMatch.Success)
            {
                result.ErrorMessage = "위치 정보 패턴이 맞지 않습니다";
                return result;
            }

            // 성공
            result.Success = true;
            result.Position = ParseFromFilename(filename);
            result.ExtractedGroups = new
            {
                Map = positionMatch.Groups["map"].Value,
                X = positionMatch.Groups["x"].Value,
                Y = positionMatch.Groups["y"].Value,
                Z = positionMatch.Groups["z"].Value,
                QX = positionMatch.Groups["qx"].Value,
                QY = positionMatch.Groups["qy"].Value,
                QZ = positionMatch.Groups["qz"].Value,
                QW = positionMatch.Groups["qw"].Value
            };

            return result;
        }
    }

    /// <summary>
    /// 위치 파싱 결과 정보 (디버깅용)
    /// </summary>
    public class PositionParseResult
    {
        public string OriginalFilename { get; set; } = string.Empty;
        public bool Success { get; set; }
        public string ErrorMessage { get; set; } = string.Empty;
        public string ExtractedPositionString { get; set; } = string.Empty;
        public Position? Position { get; set; }
        public object? ExtractedGroups { get; set; }

        public override string ToString()
        {
            if (Success)
            {
                return $"파싱 성공: {Position}";
            }
            else
            {
                return $"파싱 실패: {ErrorMessage}";
            }
        }
    }
}