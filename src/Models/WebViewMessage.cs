#nullable disable
using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace TarkovClient
{
    /// <summary>
    /// WebView2 Direct Communication을 위한 메시지 구조
    /// C# ↔ JavaScript 간 통신에 사용
    /// </summary>
    public class WebViewMessage
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;
        
        [JsonPropertyName("data")]
        public JsonElement Data { get; set; }
        
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;
        
        [JsonPropertyName("timestamp")]
        public long Timestamp { get; set; }
        
        [JsonPropertyName("source")]
        public string Source { get; set; } = "csharp";

        public WebViewMessage()
        {
            Id = Guid.NewGuid().ToString();
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        }

        public WebViewMessage(string type, object data) : this()
        {
            Type = type;
            Data = JsonSerializer.SerializeToElement(data);
        }

        /// <summary>
        /// JSON 문자열로 직렬화
        /// </summary>
        public string ToJson()
        {
            return JsonSerializer.Serialize(this, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });
        }

        /// <summary>
        /// JSON 문자열에서 역직렬화
        /// </summary>
        public static WebViewMessage? FromJson(string json)
        {
            try
            {
                return JsonSerializer.Deserialize<WebViewMessage>(json, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// 데이터를 지정된 타입으로 역직렬화
        /// </summary>
        public T? GetData<T>()
        {
            try
            {
                return JsonSerializer.Deserialize<T>(Data.GetRawText());
            }
            catch
            {
                return default(T);
            }
        }
    }

    /// <summary>
    /// WebView2 통신에 사용되는 메시지 타입 상수
    /// </summary>
    public static class WebViewMessageTypes
    {
        // 지도 관련 메시지
        public const string POSITION_UPDATE = "POSITION_UPDATE";
        public const string MAP_CHANGE = "MAP_CHANGE";
        public const string MAP_READY = "MAP_READY";
        public const string MAP_ERROR = "MAP_ERROR";
        
        // 설정 관련 메시지
        public const string SETTINGS_UPDATE = "SETTINGS_UPDATE";
        public const string SETTINGS_REQUEST = "SETTINGS_REQUEST";
        
        // 시스템 메시지
        public const string INITIALIZATION_COMPLETE = "INITIALIZATION_COMPLETE";
        public const string HEARTBEAT = "HEARTBEAT";
        public const string ERROR_REPORT = "ERROR_REPORT";
        
        // 사용자 인터랙션
        public const string USER_INTERACTION = "USER_INTERACTION";
        public const string ZOOM_CHANGE = "ZOOM_CHANGE";
        public const string LAYER_TOGGLE = "LAYER_TOGGLE";
    }

    /// <summary>
    /// 메시지 검증 및 유틸리티
    /// </summary>
    public static class WebViewMessageValidator
    {
        /// <summary>
        /// 메시지 유효성 검증
        /// </summary>
        public static bool IsValid(WebViewMessage message)
        {
            if (message == null) return false;
            if (string.IsNullOrEmpty(message.Type)) return false;
            if (string.IsNullOrEmpty(message.Id)) return false;
            if (message.Timestamp <= 0) return false;
            
            return true;
        }

        /// <summary>
        /// 메시지 타입이 유효한지 확인
        /// </summary>
        public static bool IsValidMessageType(string type)
        {
            return type switch
            {
                WebViewMessageTypes.POSITION_UPDATE => true,
                WebViewMessageTypes.MAP_CHANGE => true,
                WebViewMessageTypes.MAP_READY => true,
                WebViewMessageTypes.MAP_ERROR => true,
                WebViewMessageTypes.SETTINGS_UPDATE => true,
                WebViewMessageTypes.SETTINGS_REQUEST => true,
                WebViewMessageTypes.INITIALIZATION_COMPLETE => true,
                WebViewMessageTypes.HEARTBEAT => true,
                WebViewMessageTypes.ERROR_REPORT => true,
                WebViewMessageTypes.USER_INTERACTION => true,
                WebViewMessageTypes.ZOOM_CHANGE => true,
                WebViewMessageTypes.LAYER_TOGGLE => true,
                _ => false
            };
        }
    }

    /// <summary>
    /// 위치 업데이트 메시지 데이터
    /// </summary>
    public class PositionUpdateData
    {
        [JsonPropertyName("mapId")]
        public string MapId { get; set; } = string.Empty;
        
        [JsonPropertyName("x")]
        public float X { get; set; }
        
        [JsonPropertyName("y")]
        public float Y { get; set; }
        
        [JsonPropertyName("z")]
        public float Z { get; set; }
        
        [JsonPropertyName("rotation")]
        public float Rotation { get; set; }
        
        [JsonPropertyName("timestamp")]
        public string Timestamp { get; set; } = string.Empty;
        
        [JsonPropertyName("accuracy")]
        public float Accuracy { get; set; } = 1.0f;

        public static PositionUpdateData FromPosition(Position position)
        {
            return new PositionUpdateData
            {
                MapId = position.MapName,
                X = position.X,
                Y = position.Y,
                Z = position.Z,
                Rotation = position.Rotation,
                Timestamp = position.Timestamp.ToString("o"), // ISO 8601 형식
                Accuracy = position.Accuracy
            };
        }
    }

    /// <summary>
    /// 맵 변경 메시지 데이터 (WebView용)
    /// </summary>
    public class WebViewMapChangeData
    {
        [JsonPropertyName("mapId")]
        public string MapId { get; set; } = string.Empty;
        
        [JsonPropertyName("displayName")]
        public string DisplayName { get; set; } = string.Empty;
        
        [JsonPropertyName("timestamp")]
        public string Timestamp { get; set; } = DateTime.UtcNow.ToString("o");
    }

    /// <summary>
    /// 설정 데이터
    /// </summary>
    public class MapSettingsData
    {
        [JsonPropertyName("theme")]
        public string Theme { get; set; } = "dark";
        
        [JsonPropertyName("showGrid")]
        public bool ShowGrid { get; set; } = true;
        
        [JsonPropertyName("showDirection")]
        public bool ShowDirection { get; set; } = true;
        
        [JsonPropertyName("markerSize")]
        public int MarkerSize { get; set; } = 16;
        
        [JsonPropertyName("updateInterval")]
        public int UpdateInterval { get; set; } = 50;
        
        [JsonPropertyName("autoCenter")]
        public bool AutoCenter { get; set; } = true;
        
        [JsonPropertyName("autoZoom")]
        public bool AutoZoom { get; set; } = false;
    }

    /// <summary>
    /// 오류 리포트 데이터
    /// </summary>
    public class ErrorReportData
    {
        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;
        
        [JsonPropertyName("source")]
        public string Source { get; set; } = string.Empty;
        
        [JsonPropertyName("stack")]
        public string Stack { get; set; } = string.Empty;
        
        [JsonPropertyName("timestamp")]
        public string Timestamp { get; set; } = DateTime.UtcNow.ToString("o");
        
        [JsonPropertyName("severity")]
        public string Severity { get; set; } = "error"; // error, warning, info
    }

    /// <summary>
    /// 사용자 인터랙션 데이터
    /// </summary>
    public class UserInteractionData
    {
        [JsonPropertyName("action")]
        public string Action { get; set; } = string.Empty;
        
        [JsonPropertyName("target")]
        public string Target { get; set; } = string.Empty;
        
        [JsonPropertyName("coordinates")]
        public float[]? Coordinates { get; set; }
        
        [JsonPropertyName("timestamp")]
        public string Timestamp { get; set; } = DateTime.UtcNow.ToString("o");
    }
}