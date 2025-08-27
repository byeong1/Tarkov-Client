# Phase 3: tracker 앱 분리

## 목표
현재 완성된 SPA 구조를 Webs/tracker/ 폴더로 이동하여 독립 앱으로 분리

## 작업 단계

### 3.1 Webs/tracker/ 폴더 구조 생성
```
Webs/tracker/
├── index.html          # SPA 진입점
├── index.js            # 앱 컨트롤러
├── router/
│   └── index.js        # 라우팅 시스템
├── components/         # 5개 컴포넌트
│   ├── Dashboard/
│   ├── Quest/
│   ├── Hideout/
│   ├── Item/
│   └── Settings/
├── css/               # tracker 전용 스타일
└── js/                # tracker 전용 로직
```

### 3.2 현재 파일들을 tracker/로 이동
- [ ] `index.html` → `tracker/index.html`
- [ ] `index.js` → `tracker/index.js`
- [ ] `router/` → `tracker/router/`
- [ ] `components/` → `tracker/components/`
- [ ] tracker 전용 리소스 이동

### 3.3 경로 수정 및 독립성 확보
- [ ] HTML 내 CSS/JS 경로 수정
- [ ] JavaScript import 경로 수정
- [ ] 공통 리소스 경로 업데이트 (`../Common/`)

## 수정이 필요한 파일들

### tracker/index.html
```html
<!-- 기존 -->
<link rel="stylesheet" href="./Common/css/global.css">
<script src="./Common/javascript/LocalStorageManager.js"></script>

<!-- 수정 후 -->
<link rel="stylesheet" href="../Common/css/global.css">
<script src="../Common/javascript/LocalStorageManager.js"></script>
```

### tracker/components/ 내 각 컴포넌트
- CSS 경로: `../../Common/css/` 
- JS 경로: `../../Common/javascript/`

## WebView2 연동 테스트
- [ ] C# → tracker 앱 메시지 전달 테스트
- [ ] tracker → C# 응답 테스트
- [ ] 기존 기능 동작 확인

## 완료 기준
- tracker 앱이 독립적으로 동작
- 모든 기능이 정상 작동
- WebView2 통신 정상

---
*Phase 4 시작 준비 완료*