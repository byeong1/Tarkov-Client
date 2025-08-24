using System;
using System.Collections.Generic;

namespace TarkovClient.Models
{
    /// <summary>
    /// 파티 게시글 데이터 모델
    /// </summary>
    public class PartyPost
    {
        // 기본 정보
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Title { get; set; }
        public string Content { get; set; }
        public string Author { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        
        // 파티 정보
        public PartyType Type { get; set; }
        public string Map { get; set; }
        public int CurrentMembers { get; set; } = 1;
        public int MaxMembers { get; set; } = 5;
        public string DiscordLink { get; set; }
        
        // 메타 정보
        public PostSource Source { get; set; } = PostSource.TarkovClient;
        public bool IsFromTarkovClient { get; set; } = true;
        public int ViewCount { get; set; } = 0;
        public PartyStatus Status { get; set; } = PartyStatus.Active;
    }

    /// <summary>
    /// 파티 타입 열거형
    /// </summary>
    public enum PartyType
    {
        PvP,
        PvE,
        Both
    }

    /// <summary>
    /// 게시글 출처 열거형
    /// </summary>
    public enum PostSource
    {
        TarkovClient,
        DCInside
    }

    /// <summary>
    /// 파티 상태 열거형
    /// </summary>
    public enum PartyStatus
    {
        Active,      // 모집중
        Full,        // 인원 마감
        Expired      // 시간 만료
    }

    /// <summary>
    /// 디시인사이드 게시글 작성 요청 모델
    /// </summary>
    public class DCPostRequest
    {
        public string BoardId { get; set; } = "eft";        // 타르코프 갤러리
        public string Title { get; set; }                   // 제목
        public string Contents { get; set; }                // 내용
        public string Name { get; set; } = "ㅇㅇ";          // 작성자명
        public string Password { get; set; } = "1234";      // 비밀번호
        public bool IsMinor { get; set; } = false;          // 미성년자 여부
    }

    /// <summary>
    /// 디시인사이드 게시글 작성 결과 모델
    /// </summary>
    public class DCPostResult
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string PostUrl { get; set; }
    }

    /// <summary>
    /// 파티 관련 WebSocket 메시지
    /// </summary>
    public class PartyUpdateData : WsMessage
    {
        public PartyPost Party { get; set; }
        public string Action { get; set; } // CREATE, UPDATE, DELETE

        public override string ToString()
        {
            return $"PartyUpdate: {Action} - {Party?.Title}";
        }
    }

    /// <summary>
    /// 파티 목록 요청 WebSocket 메시지
    /// </summary>
    public class PartyListRequestData : WsMessage
    {
        public string Filter { get; set; } // 필터 조건 (맵, 타입 등)

        public override string ToString()
        {
            return $"PartyListRequest: {Filter}";
        }
    }

    /// <summary>
    /// 파티 목록 응답 WebSocket 메시지
    /// </summary>
    public class PartyListResponseData : WsMessage
    {
        public List<PartyPost> Parties { get; set; } = new List<PartyPost>();

        public override string ToString()
        {
            return $"PartyListResponse: {Parties.Count} parties";
        }
    }
}