# TarkovClient 실시간 위치 공유 시스템 통합 프로젝트

## 📋 프로젝트 개요

### 목표
기존 웹뷰 기반 TarkovClient를 **독립적인 실시간 위치 공유 시스템**으로 업그레이드하여 외부 웹사이트 의존성을 제거하고 네이티브 지도 표시 기능을 구현합니다.

### 현재 상황
- **TarkovMonitor**: 스크린샷 기반 위치 파싱 → 웹소켓 전송 → tarkov-dev 지도 표시
- **TarkovClient**: WebView2로 외부 사이트 로드하는 기생 방식
- **목표**: TarkovClient를 완전히 독립적인 시스템으로 전환

## 🏗️ 시스템 아키텍처

```
[Tarkov Game] → [Screenshots] → [TarkovClient]
                                      ↓
[Position Parser] → [Direct Call] → [Embedded Map]
                                      ↓
                               [Leaflet.js UI]
```

### 핵심 컴포넌트
1. **위치 파싱 시스템**: 스크린샷 파일명에서 좌표 추출
2. **맵 변경 감지**: 로그/스크린샷 기반 맵 전환 감지
3. **좌표 변환 시스템**: 게임 좌표 → 지도 좌표 변환
4. **실시간 지도**: Leaflet.js 기반 인터랙티브 맵
5. **WebView2 Direct Communication**: C# ↔ JavaScript 직접 통신

## 📈 진행 상황

### ✅ 완료된 분석
- [x] TarkovMonitor 위치 파싱 로직 분석 완료
- [x] tarkov-dev 좌표 변환 시스템 분석 완료
- [x] TarkovClient 기존 인프라 분석 완료
- [x] 적용 가능성 평가 완료 (★★★★★)

### 🔄 현재 작업
- [x] 프로젝트 문서화 시스템 구축
- [ ] 세부 시스템 설계서 작성
- [ ] 구현 계획 및 우선순위 수립

### ⏳ 예정된 작업
- [ ] 위치 파싱 시스템 구현
- [ ] 맵 변경 감지 시스템 구현
- [ ] Leaflet.js 지도 통합
- [ ] UI/UX 개선 및 테스트

## 📊 기술 스택

### Backend (C#)
- **.NET 8 + WPF**: 메인 애플리케이션
- **WebView2**: 웹 콘텐츠 렌더링 및 JavaScript 통신
- **FileSystemWatcher**: 스크린샷/로그 감시

### Frontend (JavaScript)
- **Leaflet.js**: 인터랙티브 지도 라이브러리
- **HTML5/CSS3**: 모던 웹 인터페이스
- **WebView2 JavaScript Bridge**: 네이티브 통신

### 데이터
- **좌표 시스템**: X,Y,Z 3D 좌표 + 회전값
- **맵 데이터**: tarkov-dev 호환 맵 정보
- **설정**: JSON 기반 사용자 설정

## 🚀 주요 기능

### 1. 실시간 위치 추적
- 스크린샷 촬영 시 자동 위치 파싱
- 지도에 플레이어 위치 실시간 표시
- 방향 표시기 포함

### 2. 자동 맵 전환
- 게임 로그 기반 맵 변경 감지
- 스크린샷 기반 2차 확인
- 사용자 설정 가능한 자동/수동 모드

### 3. 독립적 지도 시스템
- 외부 웹사이트 의존성 제거
- 오프라인 동작 가능
- 커스터마이징된 UI/UX

### 4. 성능 최적화
- 로컬 HTML로 빠른 로딩
- 직접 통신으로 1ms 미만 지연시간
- 네트워크 오버헤드 제거
- 메모리 및 CPU 최적화

## 📁 문서 구조

```
docs/map/
├── README.md                # 이 파일 - 프로젝트 개요
├── progress-tracker.md      # 진행도 체크리스트 (진행 중)
├── architecture.md          # 시스템 아키텍처 설계
├── implementation-plan.md   # 세부 구현 계획
├── coordinate-system.md     # 좌표 변환 시스템 문서
├── map-detection.md         # 맵 변경 감지 시스템
├── api-specifications.md    # WebSocket API 설계
├── ui-components.md         # UI 컴포넌트 설계
├── testing-guide.md         # 테스트 가이드
└── troubleshooting.md       # 문제 해결 가이드
```

## ⏱️ 일정 계획

### Phase 1: 설계 및 문서화 (3일)
- 시스템 아키텍처 완성
- API 설계 및 데이터 구조 정의
- 구현 계획 수립

### Phase 2: 핵심 로직 구현 (7일)
- 위치 파싱 시스템
- 맵 변경 감지
- 좌표 변환 로직

### Phase 3: UI 통합 및 완성 (5일)
- Leaflet.js 지도 통합
- WebSocket 통신 구현
- 사용자 인터페이스 완성

### **총 예상 기간: 15일**

## 🔧 개발 환경

### 요구사항
- Visual Studio 2022
- .NET 8 SDK
- WebView2 Runtime
- Git

### 테스트 환경
- Windows 10/11
- Escape from Tarkov 게임
- 다양한 해상도 및 맵 테스트

## 📞 연락처 및 지원

프로젝트 관련 문의사항이나 기술적 지원이 필요한 경우 Claude Code를 통해 연락 주시기 바랍니다.

---
*최종 업데이트: 2025-08-27*
*프로젝트 상태: 설계 단계*