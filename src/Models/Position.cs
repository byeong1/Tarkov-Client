using System;
using System.Globalization;

namespace TarkovClient
{
    public class Position
    {
        // 기본 위치 좌표
        public float X { get; set; }
        public float Y { get; set; }
        public float Z { get; set; }
        
        // 쿼터니언 회전값 (TarkovMonitor 호환)
        public float QuaternionX { get; set; }
        public float QuaternionY { get; set; }
        public float QuaternionZ { get; set; }
        public float QuaternionW { get; set; }
        
        // 메타데이터
        public string MapName { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public float Accuracy { get; set; } = 1.0f;
        
        // 계산된 Yaw 각도 (TarkovMonitor 로직 포팅)
        public float Rotation => CalculateYawFromQuaternion();

        // 기존 생성자 (하위 호환성)
        public Position(float x, float y, float z)
        {
            X = x;
            Y = y;
            Z = z;
        }

        public Position(string x, string y, string z)
        {
            X = float.Parse(x, CultureInfo.InvariantCulture);
            Y = float.Parse(y, CultureInfo.InvariantCulture);
            Z = float.Parse(z, CultureInfo.InvariantCulture);
        }
        
        // 전체 데이터 생성자
        public Position(float x, float y, float z, float qx, float qy, float qz, float qw, string mapName = "")
        {
            X = x;
            Y = y;
            Z = z;
            QuaternionX = qx;
            QuaternionY = qy;
            QuaternionZ = qz;
            QuaternionW = qw;
            MapName = mapName;
        }
        
        // 기본 생성자
        public Position() { }
        
        /// <summary>
        /// TarkovMonitor의 쿼터니언 변환 로직 포팅
        /// 쿼터니언을 0-360도 Yaw 각도로 변환
        /// </summary>
        private float CalculateYawFromQuaternion()
        {
            if (QuaternionW == 0 && QuaternionX == 0 && QuaternionY == 0 && QuaternionZ == 0)
                return 0f;
                
            // Yaw 계산: atan2(2*(w*y + z*x), 1 - 2*(y*y + z*z))
            float siny_cosp = 2 * (QuaternionW * QuaternionY + QuaternionZ * QuaternionX);
            float cosy_cosp = 1 - 2 * (QuaternionY * QuaternionY + QuaternionZ * QuaternionZ);
            float yaw = (float)Math.Atan2(siny_cosp, cosy_cosp);
            
            // 라디안을 도(degree)로 변환
            float yawDegrees = yaw * (180.0f / (float)Math.PI);
            
            // 0-360 범위로 정규화
            return yawDegrees < 0 ? yawDegrees + 360.0f : yawDegrees;
        }
        
        /// <summary>
        /// 디버깅용 문자열 표현
        /// </summary>
        public override string ToString()
        {
            return $"Position({X:F2}, {Y:F2}, {Z:F2}) Rot:{Rotation:F1}° Map:{MapName}";
        }
        
        /// <summary>
        /// JSON 직렬화 호환용 (WebView2 통신)
        /// </summary>
        public object ToJsonObject()
        {
            return new
            {
                x = X,
                y = Y,
                z = Z,
                rotation = Rotation,
                mapName = MapName,
                timestamp = Timestamp.ToString("o"), // ISO 8601 형식
                accuracy = Accuracy
            };
        }
    }
}
