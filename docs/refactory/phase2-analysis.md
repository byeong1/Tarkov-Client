# Phase 2: 현재 구조 분석 및 백업

## 목표
현재 Webs/ 폴더의 완전한 구조 분석과 tracker 앱 분리를 위한 준비 작업

## 작업 단계

### 2.1 현재 Webs/ 구조 완전 분석
- [ ] 모든 파일과 폴더 매핑
- [ ] 파일 크기 및 중요도 평가
- [ ] 공통 리소스와 앱별 리소스 구분

### 2.2 중요 파일 백업 및 의존성 매핑
- [ ] 현재 완성된 SPA 구조 백업
- [ ] 파일 간 의존성 관계 분석
- [ ] import/require 관계 매핑

### 2.3 WebView2 통신 인터페이스 분석
- [ ] C# → JavaScript 메시지 흐름 분석
- [ ] JavaScript → C# 응답 패턴 분석
- [ ] 3개 앱에서 필요한 통신 채널 설계

## 예상 결과물

### 구조 분석 결과
```
Webs/
├── index.html          # [CORE] SPA 진입점
├── index.js            # [CORE] 앱 컨트롤러
├── router/
│   └── index.js        # [CORE] 라우팅 시스템
├── components/         # [CORE] 5개 컴포넌트
│   ├── Dashboard/
│   ├── Quest/
│   ├── Hideout/
│   ├── Item/
│   └── Settings/
├── Common/             # [SHARED] 3개 앱 공통 리소스
│   ├── css/
│   ├── javascript/
│   └── images/
└── ...기타 파일들
```

### 의존성 매핑 결과
- 각 컴포넌트가 사용하는 공통 리소스
- WebView2 통신에 필요한 인터페이스
- 경로 변경 시 영향받는 파일들

## 다음 단계 준비
- tracker/ 폴더 구조 설계 완료
- 파일 이동 계획 수립
- 경로 수정 목록 작성

---
*Phase 3 진행 전 필수 완료 단계*