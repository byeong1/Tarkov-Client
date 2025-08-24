using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using TarkovClient.Models;
using Newtonsoft.Json;

namespace TarkovClient.Services
{
    /// <summary>
    /// 파티 관리 핵심 서비스
    /// </summary>
    public class PartyService
    {
        private readonly ObservableCollection<PartyPost> _localParties;
        private readonly List<PartyPost> _dcParties;
        private readonly object _lockObject = new object();

        // 이벤트
        public event EventHandler<PartyPost> PartyCreated;
        public event EventHandler<PartyPost> PartyUpdated;
        public event EventHandler<string> PartyDeleted;
        public event EventHandler PartiesRefreshed;

        public PartyService()
        {
            _localParties = new ObservableCollection<PartyPost>();
            _dcParties = new List<PartyPost>();
        }

        /// <summary>
        /// 로컬 파티 목록 가져오기
        /// </summary>
        public IEnumerable<PartyPost> GetLocalParties()
        {
            lock (_lockObject)
            {
                return _localParties.ToList();
            }
        }

        /// <summary>
        /// 디시인사이드 파티 목록 가져오기
        /// </summary>
        public IEnumerable<PartyPost> GetDCParties()
        {
            lock (_lockObject)
            {
                return _dcParties.ToList();
            }
        }

        /// <summary>
        /// 모든 파티 목록 가져오기
        /// </summary>
        public IEnumerable<PartyPost> GetAllParties()
        {
            lock (_lockObject)
            {
                var allParties = new List<PartyPost>();
                allParties.AddRange(_localParties);
                allParties.AddRange(_dcParties);
                return allParties.OrderByDescending(p => p.CreatedAt);
            }
        }

        /// <summary>
        /// 새 파티 생성
        /// </summary>
        public async Task<PartyPost> CreatePartyAsync(PartyPost party)
        {
            try
            {
                if (party == null)
                    throw new ArgumentNullException(nameof(party));

                if (string.IsNullOrWhiteSpace(party.Title))
                    throw new ArgumentException("파티 제목이 필요합니다.");

                // ID 생성 및 메타데이터 설정
                party.Id = Guid.NewGuid().ToString();
                party.CreatedAt = DateTime.Now;
                party.Source = PostSource.TarkovClient;
                party.IsFromTarkovClient = true;
                party.Status = PartyStatus.Active;

                lock (_lockObject)
                {
                    _localParties.Add(party);
                }

                // 이벤트 발생
                PartyCreated?.Invoke(this, party);

                // WebSocket으로 다른 사용자들에게 브로드캐스트
                await BroadcastPartyUpdateAsync(party, "CREATE");

                return party;
            }
            catch (Exception ex)
            {
                throw new Exception($"파티 생성 실패: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// 파티 정보 업데이트
        /// </summary>
        public async Task<bool> UpdatePartyAsync(PartyPost party)
        {
            try
            {
                if (party == null)
                    throw new ArgumentNullException(nameof(party));

                lock (_lockObject)
                {
                    var existingParty = _localParties.FirstOrDefault(p => p.Id == party.Id);
                    if (existingParty == null)
                        return false;

                    // 파티 정보 업데이트
                    existingParty.Title = party.Title;
                    existingParty.Content = party.Content;
                    existingParty.Type = party.Type;
                    existingParty.Map = party.Map;
                    existingParty.CurrentMembers = party.CurrentMembers;
                    existingParty.MaxMembers = party.MaxMembers;
                    existingParty.DiscordLink = party.DiscordLink;
                    existingParty.Status = party.Status;
                }

                // 이벤트 발생
                PartyUpdated?.Invoke(this, party);

                // WebSocket으로 브로드캐스트
                await BroadcastPartyUpdateAsync(party, "UPDATE");

                return true;
            }
            catch (Exception ex)
            {
                throw new Exception($"파티 업데이트 실패: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// 파티 삭제
        /// </summary>
        public async Task<bool> DeletePartyAsync(string partyId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(partyId))
                    return false;

                PartyPost deletedParty = null;

                lock (_lockObject)
                {
                    deletedParty = _localParties.FirstOrDefault(p => p.Id == partyId);
                    if (deletedParty != null)
                    {
                        _localParties.Remove(deletedParty);
                    }
                }

                if (deletedParty != null)
                {
                    // 이벤트 발생
                    PartyDeleted?.Invoke(this, partyId);

                    // WebSocket으로 브로드캐스트
                    await BroadcastPartyUpdateAsync(deletedParty, "DELETE");

                    return true;
                }

                return false;
            }
            catch (Exception ex)
            {
                throw new Exception($"파티 삭제 실패: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// 만료된 파티 자동 제거
        /// </summary>
        public async Task CleanupExpiredPartiesAsync(TimeSpan expireAfter = default)
        {
            if (expireAfter == default)
                expireAfter = TimeSpan.FromHours(2); // 기본 2시간 후 만료

            try
            {
                var expiredParties = new List<PartyPost>();
                var cutoffTime = DateTime.Now - expireAfter;

                lock (_lockObject)
                {
                    expiredParties = _localParties
                        .Where(p => p.CreatedAt < cutoffTime || p.Status == PartyStatus.Expired)
                        .ToList();

                    foreach (var party in expiredParties)
                    {
                        _localParties.Remove(party);
                    }
                }

                // 만료된 파티들 브로드캐스트
                foreach (var party in expiredParties)
                {
                    PartyDeleted?.Invoke(this, party.Id);
                    await BroadcastPartyUpdateAsync(party, "DELETE");
                }
            }
            catch (Exception ex)
            {
                // 로깅만 하고 예외는 던지지 않음 (백그라운드 작업)
                Console.WriteLine($"만료된 파티 정리 중 오류: {ex.Message}");
            }
        }

        /// <summary>
        /// 디시인사이드 파티 목록 업데이트
        /// </summary>
        public void UpdateDCParties(IEnumerable<PartyPost> dcParties)
        {
            if (dcParties == null)
                return;

            try
            {
                lock (_lockObject)
                {
                    _dcParties.Clear();
                    _dcParties.AddRange(dcParties);
                }

                PartiesRefreshed?.Invoke(this, EventArgs.Empty);
            }
            catch (Exception ex)
            {
                throw new Exception($"디시인사이드 파티 목록 업데이트 실패: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// 파티 검색
        /// </summary>
        public IEnumerable<PartyPost> SearchParties(string keyword, PartyType? type = null, string map = null)
        {
            var allParties = GetAllParties();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                allParties = allParties.Where(p => 
                    p.Title.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                    p.Content.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                    p.Author.Contains(keyword, StringComparison.OrdinalIgnoreCase));
            }

            if (type.HasValue)
            {
                allParties = allParties.Where(p => p.Type == type.Value || p.Type == PartyType.Both);
            }

            if (!string.IsNullOrWhiteSpace(map) && map != "전체")
            {
                allParties = allParties.Where(p => 
                    p.Map.Contains(map, StringComparison.OrdinalIgnoreCase));
            }

            return allParties.ToList();
        }

        /// <summary>
        /// 파티 상태 통계
        /// </summary>
        public (int total, int active, int full, int expired) GetPartyStatistics()
        {
            var allParties = GetAllParties().ToList();
            return (
                total: allParties.Count,
                active: allParties.Count(p => p.Status == PartyStatus.Active),
                full: allParties.Count(p => p.Status == PartyStatus.Full),
                expired: allParties.Count(p => p.Status == PartyStatus.Expired)
            );
        }

        /// <summary>
        /// WebSocket으로 파티 업데이트 브로드캐스트
        /// </summary>
        private async Task BroadcastPartyUpdateAsync(PartyPost party, string action)
        {
            try
            {
                var updateData = new PartyUpdateData
                {
                    messageType = "PARTY_UPDATE",
                    Party = party,
                    Action = action
                };

                var json = JsonConvert.SerializeObject(updateData);
                
                // TODO: WebSocketServer를 통해 브로드캐스트
                // await _webSocketServer.BroadcastAsync(json);
                
                await Task.CompletedTask; // 임시
            }
            catch (Exception ex)
            {
                // 브로드캐스트 실패는 로깅만 하고 예외 던지지 않음
                Console.WriteLine($"파티 브로드캐스트 실패: {ex.Message}");
            }
        }

        /// <summary>
        /// 외부 WebSocket 메시지 처리
        /// </summary>
        public async Task HandleWebSocketMessageAsync(string message)
        {
            try
            {
                var wsMessage = JsonConvert.DeserializeObject<WsMessage>(message);
                
                if (wsMessage.messageType == "PARTY_UPDATE")
                {
                    var updateData = JsonConvert.DeserializeObject<PartyUpdateData>(message);
                    
                    switch (updateData.Action)
                    {
                        case "CREATE":
                            await HandleExternalPartyCreated(updateData.Party);
                            break;
                        case "UPDATE":
                            await HandleExternalPartyUpdated(updateData.Party);
                            break;
                        case "DELETE":
                            await HandleExternalPartyDeleted(updateData.Party.Id);
                            break;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"WebSocket 메시지 처리 오류: {ex.Message}");
            }
        }

        private async Task HandleExternalPartyCreated(PartyPost party)
        {
            if (party?.Source == PostSource.TarkovClient)
            {
                lock (_lockObject)
                {
                    if (!_localParties.Any(p => p.Id == party.Id))
                    {
                        _localParties.Add(party);
                    }
                }
                
                PartyCreated?.Invoke(this, party);
            }
            
            await Task.CompletedTask;
        }

        private async Task HandleExternalPartyUpdated(PartyPost party)
        {
            if (party?.Source == PostSource.TarkovClient)
            {
                lock (_lockObject)
                {
                    var existing = _localParties.FirstOrDefault(p => p.Id == party.Id);
                    if (existing != null)
                    {
                        // 업데이트 로직은 UpdatePartyAsync와 동일
                        existing.Title = party.Title;
                        existing.Content = party.Content;
                        existing.Type = party.Type;
                        existing.Map = party.Map;
                        existing.CurrentMembers = party.CurrentMembers;
                        existing.MaxMembers = party.MaxMembers;
                        existing.DiscordLink = party.DiscordLink;
                        existing.Status = party.Status;
                    }
                }
                
                PartyUpdated?.Invoke(this, party);
            }
            
            await Task.CompletedTask;
        }

        private async Task HandleExternalPartyDeleted(string partyId)
        {
            lock (_lockObject)
            {
                var party = _localParties.FirstOrDefault(p => p.Id == partyId);
                if (party != null)
                {
                    _localParties.Remove(party);
                }
            }
            
            PartyDeleted?.Invoke(this, partyId);
            await Task.CompletedTask;
        }
    }
}