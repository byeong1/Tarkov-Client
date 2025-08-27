# TarkovClient 대형 리팩토링 프로젝트

## 프로젝트 개요

현재 단일 앱 구조에서 3개 독립 앱 시스템으로 전환하는 대규모 아키텍처 변경 프로젝트

### 변경 대상

- **현재**: Webs/ 폴더에 타르코프 트래커 기능만 존재
- **목표**: Webs/ 폴더에 3개 앱 공존
  1. `tracker/` - 현재 기능 (퀘스트, 은신처, 아이템 관리)
  2. `party/` - PartyPage.xaml → HTML 변환
  3. `TarkovClient/` - 메인 HTML 컨테이너

## 전체 작업 단계

### Phase 1: 문서화 및 계획 수립 ✅

- [x] 리팩토링 마스터 플랜 작성 (refactory.md)
- [x] 진행상황 추적 시스템 구축 (refactory-result.md)
- [ ] 세부 작업 가이드 작성 (refactory/ 폴더)

### Phase 2: 현재 구조 분석 및 백업

- [ ] 현재 Webs/ 구조 완전 분석
- [ ] 중요 파일 백업 및 의존성 매핑
- [ ] WebView2 통신 인터페이스 분석

### Phase 3: tracker 앱 분리

- [ ] Webs/tracker/ 폴더 구조 생성
- [ ] 현재 파일들을 tracker/로 이동
- [ ] 경로 수정 및 독립성 확보

### Phase 4: TarkovClient HTML 컨테이너 구축

- [ ] Webs/TarkovClient/ 기본 구조 생성
- [ ] 3개 앱 라우팅 시스템 구축
- [ ] MainWindow.xaml과 연동 인터페이스

### Phase 5: party 앱 변환

- [ ] PartyPage.xaml 분석
- [ ] HTML/CSS/JS 변환 작업
- [ ] Webs/party/ 구조 완성

### Phase 6: 통합 및 테스트

- [ ] 3개 앱 간 통신 인터페이스 구축
- [ ] C# WebView2 연동 코드 수정
- [ ] 전체 시스템 테스트

## 기술적 요구사항

### 버튼별 고정 탭 시스템

```
TC 버튼 → TC 탭들 (TarkovClient, 상태 공유)
├── TC탭1: /TarkovClient/index.html
├── TC탭2: /TarkovClient/index.html

QT 버튼 → QT 탭들 (tracker, 상태 공유)
├── QT: /tracker/index.html
├── QT: /tracker/index.html

PT 버튼 → PT 탭들 (party 앱, 상태 공유)
├── PT탭1: /party/party.html
└── PT탭2: /party/party.html

설정 → 기존 SettingsPage (XAML 유지)
```

**중요**: 같은 버튼으로 생성된 탭들끼리는 상태 공유, 다른 버튼 간에만 독립

### WebView2 연동 변경점

- **탭 시스템 유지**: 각 탭은 독립적인 WebView2 인스턴스
- **버튼별 앱 고정**: TC버튼 -> TarkovClient 탭들, QT 버튼-> tracker 탭들 PT 버튼 → party 탭들
- **앱 타입별 상태 공유**: 같은 앱 타입의 탭들끼리는 상태 공유
- **탭 간 독립성**: 다른 앱 타입 간에만 독립적
- C# 메시지 전달 시스템 앱 타입별 + 다중 탭 대응
- 설정 페이지는 별도 탭으로 유지

### 파일 구조 설계

```
Webs/
├── main.html              # TarkovClient 메인 컨테이너
├── Common/               # 3개 앱 공통 리소스
│   ├── css/
│   ├── javascript/
│   └── images/
├── tracker/              # 현재 기능들 이동
│   ├── index.html
│   ├── components/
│   └── router/
├── party/               # PartyPage 변환 결과
│   ├── party.html
│   ├── css/
│   └── js/
└── TarkovClient/        # 메인 컨테이너 로직
    ├── main.html
    ├── css/
    └── js/
```

## 위험 요소 및 대응책

### 주요 위험 요소

1. **WebView2 통신 단절**: C# ↔ JavaScript 메시지 전달 실패
2. **CSS/JS 의존성 깨짐**: 공통 리소스 경로 문제
3. **라우팅 충돌**: 3개 앱 간 URL 라우팅 충돌
4. **성능 저하**: 3개 앱 로딩으로 인한 메모리/성능 문제

### 대응책

1. **점진적 마이그레이션**: 한 번에 하나씩 앱 변환
2. **백업 시스템**: 각 단계별 롤백 지점 확보
3. **테스트 자동화**: 각 앱별 기능 테스트 스크립트
4. **공통 모듈 설계**: 중복 코드 최소화

## 예상 작업 시간

- **Phase 1 (문서화)**: 1-2 세션
- **Phase 2-3 (분석/tracker)**: 2-3 세션
- **Phase 4 (TarkovClient)**: 2-3 세션
- **Phase 5 (party 변환)**: 3-4 세션
- **Phase 6 (통합)**: 2-3 세션

**총 예상**: 10-15 Claude Code 세션

## 컨텍스트 제한 대응 전략

### 문제 인식

- 대형 리팩토링 작업으로 컨텍스트 한계 초과 가능성
- 각 Phase마다 Claude 재실행 필요할 수 있음
- 작업 연속성 보장 메커니즘 필수

### 대응 방안

#### 1. 단계별 체크포인트 시스템

```
Phase 1 → refactory-result.md 업데이트 → 새 세션
Phase 2 → refactory-result.md 업데이트 → 새 세션
...
```

#### 2. 핵심 정보 압축 전달

- **최소 필수 정보**: 현재 단계, 완료된 작업, 다음 작업
- **컨텍스트 최적화**: 불필요한 기록 제거, 핵심만 유지
- **빠른 상황 파악**: refactory-result.md 한 번 읽기로 전체 상황 파악

#### 3. Phase별 독립 실행 가능 설계

각 Phase 가이드는 이전 세션 내용 없이도 실행 가능하도록 설계

#### 4. 긴급 중단 시 복구 방안

- 현재까지 작업 내용을 refactory-result.md에 실시간 기록
- 파일 백업 상태 체크포인트 생성
- 롤백 가능한 단계별 저장점 확보

## 다음 단계

1. `refactory-result.md` 생성으로 진행상황 추적 시작
2. `docs/refactory/` 세부 가이드 폴더 생성
3. 현재 Webs/ 구조 완전 분석 시작

---

_이 문서는 대형 리팩토링 프로젝트의 마스터 플랜입니다. 모든 작업은 refactory-result.md에서 진행상황을 추적합니다._
