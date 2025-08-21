# 🎯 Tarkov Client

> Tarkov Market Pilot을 위한 전용 데스크톱 애플리케이션

Tarkov Client는 Tarkov Market Pilot 웹사이트를 전용 데스크톱 앱으로 실행하는 프로그램입니다.  
게임과 연동하여 실시간 맵 감지, 위치 추적, 자동 파일 정리 기능을 제공합니다.

## ⚡ 주요 특징

- ✅ **Self-Contained 배포** - .NET Runtime 별도 설치 불필요
- ✅ **단일 실행 파일** - 복잡한 설치 과정 없이 즉시 실행
- ✅ **다중 탭 지원** - 여러 웹페이지 동시 사용 가능
- ✅ **실시간 맵 감지** - 게임 로그 기반 자동 맵 변경 감지
- ✅ **스크린샷 추적** - 게임 스크린샷 기반 위치 및 방향 추적
- ✅ **자동 파일 정리** - 로그 폴더 및 스크린샷 자동 정리 (성능 최적화)
- ✅ **병렬 처리 최적화** - 파일 처리 성능 향상

## 📥 다운로드

**파일**: [TarkovClient-v0.1.0.zip](../../releases/latest/download/TarkovClient-v0.1.0.zip)  
_최신 버전_: [Latest Release](../../releases/latest)

**설치 방법**:

1. ZIP 파일 다운로드
2. 압축 해제
3. `TarkovClient.exe` 더블클릭

**장점**: 설치 없이 바로 실행, 이동 가능

## 🖥️ 시스템 요구사항

- **운영체제**: Windows 10/11 (64비트)
- **메모리**: 최소 512MB 여유 공간
- **기타**: WebView2 Runtime (Windows 11 기본 포함)

> ⚠️ **WebView2 Runtime**: Windows 10 사용자는 **Windows를 최신 버전으로 업데이트**하시면 자동으로 설치됩니다. 업데이트 후에도 문제가 있다면 [Microsoft 다운로드](https://developer.microsoft.com/microsoft-edge/webview2/)에서 수동 설치하세요.

## 🚀 사용법

### 기본 실행

1. **프로그램 시작**

   - `TarkovClient.exe` 더블클릭 실행
   - 자동으로 Tarkov Market Pilot 페이지 로드
   - 시스템 트레이에 아이콘 표시

2. **시스템 트레이 메뉴**
   - **Open**: 웹사이트를 기본 브라우저에서 열기
   - **Exit**: 프로그램 완전 종료

### 탭 사용법

- **새 탭 추가**: 왼쪽 상단 `+` 버튼 클릭
- **탭 닫기**: 각 탭의 `✕` 버튼 클릭
- **최소 1개 탭** 항상 유지됨

### 게임 연동 설정

#### 자동 감지 (권장)

프로그램이 자동으로 게임 설치 경로를 찾습니다:

1. **게임 폴더**: Windows 레지스트리에서 자동 검색
2. **스크린샷 폴더**: 사용자 문서 폴더에서 자동 검색

#### 수동 설정

자동 감지가 실패할 경우 웹 인터페이스에서 수동 설정:

1. **게임 폴더 경로**

   - 기본값: `C:\Battlestate Games\Escape from Tarkov\`
   - 예시 경로: `D:\Games\Escape from Tarkov\`

2. **스크린샷 폴더 경로**
   - 기본값: `%USERPROFILE%\Documents\Escape From Tarkov\Screenshots\`
   - 예시 경로: `C:\Users\사용자명\Documents\Escape From Tarkov\Screenshots\`

### 스크린샷 추적 설정

게임 내에서 스크린샷을 촬영하면 자동으로 위치 추적이 시작됩니다. 게임에서 설정한 스크린샷 키를 사용하여 촬영하세요.

## 🔧 핵심 기능

### 🗺️ 맵 자동 감지

- 게임 로그 파일 실시간 모니터링
- 맵 변경 시 자동 감지 및 표시
- 방향 표시기로 시선 방향 표시

### 📸 스크린샷 기반 위치 추적

- 게임 내 스크린샷 자동 분석
- 실시간 위치 및 방향 업데이트
- 퀘스트 진행 상황 추적

### 🧹 자동 파일 정리 시스템

**성능 최적화로 업그레이드됨!**

#### 로그 폴더 정리

- 프로그램 시작 시 구 로그 폴더 자동 정리
- 최신 폴더 1개만 보존, 나머지 삭제
- 디스크 공간 절약 및 성능 향상

#### 스크린샷 자동 정리

- BattlEye 초기화 시점에 자동 실행
- **병렬 처리**로 빠른 삭제 성능
- 파일 권한 문제 자동 해결
- 시스템 리소스 최적화

### 🌐 WebSocket 서버

- 포트: `localhost:5123`
- 웹 인터페이스와 실시간 통신
- 게임 데이터 실시간 전송

## 🛠️ 문제 해결

### Windows Defender 경고

**원인**: 코드 서명 인증서 미보유 (유료)
**해결**:

1. Windows Defender 경고창에서 **"추가 정보"** 클릭
2. **"실행"** 버튼 클릭
3. 정상 설치 진행

> 💡 **안전성**: 오픈소스 프로젝트로 모든 코드가 공개되어 있어 투명성을 보장합니다.

### WebView2 관련 오류

- **Windows 11**: 기본 포함으로 문제 없음
- **Windows 10**: Windows 업데이트 실행 후 재시도
- **수동 설치**: [WebView2 Runtime 다운로드](https://developer.microsoft.com/microsoft-edge/webview2/)

### 포트 충돌 (5123)

**증상**: 웹소켓 서버 시작 실패
**해결**: 다른 프로그램 종료 후 재실행

### 맵 감지가 되지 않는 경우

**원인**: 로그 파일 접근 실패 또는 권한 문제

**해결 방법**:

1. **관리자 권한으로 실행**
   - `TarkovClient.exe` 우클릭 → **관리자 권한으로 실행**
2. **게임 폴더 경로 확인**
   - 웹 인터페이스에서 게임 폴더 경로가 올바른지 확인
   - 기본값: `C:\Battlestate Games\Escape from Tarkov\`
3. **로그 폴더 접근 권한 확인**
   - `게임폴더\Logs` 폴더에 읽기 권한이 있는지 확인

### 스크린샷 추적이 안되는 경우

**원인**: 스크린샷 폴더 경로 문제 또는 키 설정 문제

**해결 방법**:

1. **스크린샷 폴더 경로 확인**
   - 기본값: `%USERPROFILE%\Documents\Escape From Tarkov\Screenshots\`
2. **스크린샷 기능 테스트**
   - 게임에서 스크린샷을 촬영하여 파일이 생성되는지 확인

### 자동 파일 정리가 작동하지 않는 경우

**원인**: 파일 권한 문제 또는 폴더 접근 실패

**해결 방법**:

1. **관리자 권한으로 실행**
   - 파일 삭제 권한이 필요할 수 있음
2. **폴더 권한 확인**
   - 로그 폴더와 스크린샷 폴더 쓰기 권한 확인
3. **수동 정리**
   - 필요시 폴더를 수동으로 정리 후 프로그램 재시작

### 방화벽 경고가 나타나는 경우

**해결 방법**:

- Windows Defender 방화벽에서 허용 선택
- 포트 5123 사용 확인
- 프로그램을 신뢰할 수 있는 프로그램으로 등록

## 🏗️ 개발 정보

### 기술 스택

- **.NET 8.0** - Self-Contained 배포
- **WPF** - Windows 네이티브 UI
- **WebView2** - Chromium 기반 웹 렌더링
- **Fleck** - WebSocket 서버 라이브러리

### 빌드 명령어

```bash
# 개발용 빌드
./main.ps1 dev

# Self-Contained 배포 빌드
./main.ps1 publish

# GitHub Release용 ZIP 패키지
./main.ps1 package
```

## 🔒 보안 및 개인정보

- ✅ **로컬 실행**: 모든 처리가 로컬에서 수행
- ✅ **읽기 전용**: 게임 파일 수정하지 않음
- ✅ **개인정보 보호**: 개인정보 수집하지 않음
- ✅ **안전한 통신**: Tarkov Market과만 통신

## 📝 업데이트

1. 기존 프로그램 종료
2. 새 ZIP 파일 다운로드
3. 압축 해제 후 덮어쓰기
4. 프로그램 재실행

> 💾 **설정 보존**: 모든 사용자 설정이 자동으로 보존됩니다.

## 🆘 지원 및 문의

**문제 발생 시**:

1. 관리자 권한으로 실행 시도
2. [GitHub Issues](../../issues)에 문의

## 🔗 링크

- **GitHub 저장소**: [TarkovClient](../../)
- **이슈 리포트**: [GitHub Issues](../../issues)
- **최신 릴리스**: [Releases](../../releases)
- **Tarkov Market**: [https://tarkov-market.com/pilot](https://tarkov-market.com/pilot)

---

<div align="center">

**Tarkov Client v0.1.0**  
© 2025 TarkovClient Project

[GitHub](../../) • [Issues](../../issues) • [Releases](../../releases)

</div>
