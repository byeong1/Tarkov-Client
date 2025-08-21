# 📦 TarkovClient 설치 프로그램

TarkovClient용 Windows 설치 프로그램 생성 가이드

## 🔧 필요 프로그램

### Inno Setup 설치
1. [Inno Setup 다운로드](https://jrsoftware.org/isinfo.php)
2. `innosetup-6.x.x.exe` 다운로드 및 설치
3. 기본 경로로 설치: `C:\Program Files (x86)\Inno Setup 6\`

## 🚀 사용법

### 1단계: 애플리케이션 빌드
```bash
# Self-Contained 실행파일 생성
./build.ps1 publish
```

### 2단계: 설치 프로그램 생성
```bash
# 설치 프로그램 빌드
cd setup
.\build-installer.bat
```

### 결과 파일
- `setup\Output\TarkovClientSetup.exe` - **배포용 설치 프로그램**

## 📋 설치 프로그램 기능

### ✅ 자동 설치 기능
- **설치 위치**: `C:\Program Files\TarkovClient\`
- **바탕화면 바로가기** 생성
- **시작 메뉴** 등록
- **프로그램 추가/제거** 등록

### ✅ 사용자 편의 기능
- 한국어/영어 지원
- WebView2 Runtime 검사
- 관리자 권한 요청
- 설치 완료 후 바로 실행 옵션

### ✅ 완전한 제거 지원
- 제어판에서 완전 제거
- 임시 파일 자동 정리
- 레지스트리 정리
- 바로가기 자동 삭제

## 🛠️ 고급 설정

### 스크립트 수정
`TarkovClient.iss` 파일을 편집하여 다음을 수정할 수 있습니다:

- **앱 정보**: 버전, 회사명, 설명
- **설치 옵션**: 기본 경로, 필수 구성 요소
- **UI 설정**: 언어, 아이콘, 라이선스
- **고급 기능**: 사전/사후 설치 스크립트

### 버전 업데이트
`TarkovClient.iss`에서 다음 값 수정:
```pascal
#define MyAppVersion "0.1.0"  // 새 버전으로 변경
```

## 📁 폴더 구조

```
setup/
├── TarkovClient.iss      # Inno Setup 스크립트
├── build-installer.bat   # 설치 프로그램 빌드 스크립트
├── README.md            # 이 파일
└── Output/              # 생성된 설치 프로그램 위치
    └── TarkovClientSetup.exe
```

## 🔍 문제 해결

### Inno Setup을 찾을 수 없음
```bash
[ERROR] Inno Setup이 설치되어 있지 않습니다.
```
**해결**: [Inno Setup 공식 사이트](https://jrsoftware.org/isinfo.php)에서 설치

### TarkovClient.exe가 없음
```bash
[ERROR] TarkovClient.exe가 publish 폴더에 없습니다.
```
**해결**: `./build.ps1 publish` 먼저 실행

### 관리자 권한 필요
```bash
[ERROR] 관리자 권한이 필요합니다.
```
**해결**: PowerShell을 관리자 권한으로 실행

## 🎯 배포 가이드

### 사용자 배포 방법
1. `TarkovClientSetup.exe` 파일만 사용자에게 전달
2. 사용자가 더블클릭으로 설치
3. 설치 완료 후 바탕화면 바로가기로 실행

### 설치 시 사용자 경험
1. **설치 위치 선택** (기본: Program Files)
2. **바탕화면 바로가기** 생성 옵션
3. **WebView2 Runtime** 자동 검사
4. **설치 완료** 후 바로 실행 옵션

### 제거 시 사용자 경험
1. **제어판 > 프로그램 추가/제거**에서 "TarkovClient" 선택
2. **제거** 버튼 클릭
3. 모든 파일과 설정 자동 정리
4. 바탕화면 바로가기 자동 삭제