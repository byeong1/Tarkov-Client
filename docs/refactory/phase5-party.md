# Phase 5: party 앱 변환

## 목표
PartyPage.xaml을 HTML/CSS/JS로 변환하여 독립 웹 앱으로 구현

## 작업 단계

### 5.1 PartyPage.xaml 분석
```xml
<!-- PartyPage.xaml 주요 구조 분석 -->
<UserControl Background="#FF000000">
    <ScrollViewer>
        <StackPanel Margin="20">
            <!-- 제목 -->
            <TextBlock Text="파티 (Party)" />
            
            <!-- 50:50 비율 박스 영역 -->
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="1*"/>
                    <ColumnDefinition Width="1*"/>
                </Grid.ColumnDefinitions>
                
                <!-- 왼쪽/오른쪽 박스 -->
            </Grid>
        </StackPanel>
    </ScrollViewer>
</UserControl>
```

### 5.2 HTML/CSS/JS 변환 작업

#### Webs/party/party.html
```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>파티 (Party)</title>
    <link rel="stylesheet" href="../Common/css/global.css">
    <link rel="stylesheet" href="./css/party.css">
</head>
<body class="party-page">
    <div class="scroll-container">
        <div class="content-container">
            <!-- 제목 -->
            <h1 class="page-title">파티 (Party)</h1>
            
            <!-- 구분선 -->
            <hr class="title-separator">
            
            <!-- 50:50 박스 영역 -->
            <div class="party-grid">
                <div class="party-box left-box">
                    <!-- 왼쪽 박스 콘텐츠 -->
                </div>
                <div class="party-box right-box">
                    <!-- 오른쪽 박스 콘텐츠 -->
                </div>
            </div>
        </div>
    </div>
    
    <script src="../Common/javascript/LocalStorageManager.js"></script>
    <script src="./js/party.js"></script>
</body>
</html>
```

#### Webs/party/css/party.css
```css
.party-page {
    background-color: #FF000000;
    color: white;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.scroll-container {
    height: 100vh;
    overflow-y: auto;
}

.content-container {
    padding: 20px;
}

.page-title {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 10px;
}

.title-separator {
    height: 2px;
    background-color: #FF555555;
    border: none;
    margin: 10px 0 20px 0;
}

.party-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.party-box {
    background-color: #FF1A1A1A;
    border-radius: 5px;
    padding: 15px;
}
```

#### Webs/party/js/party.js
```javascript
class PartyComponent {
    constructor() {
        this.init();
        this.setupWebViewCommunication();
    }
    
    init() {
        console.log('Party 앱 초기화 완료');
        // 파티 기능 초기화 로직
    }
    
    setupWebViewCommunication() {
        // C# → JavaScript 메시지 수신
        window.addEventListener('message', (event) => {
            this.handleMessage(event.data);
        });
        
        // 부모 컨테이너로 메시지 전송
        window.sendToParent = (data) => {
            window.parent.postMessage(data, '*');
        };
    }
    
    handleMessage(data) {
        // 파티 관련 메시지 처리
        console.log('Party 앱 메시지 수신:', data);
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.partyApp = new PartyComponent();
});
```

### 5.3 Webs/party/ 구조 완성
```
Webs/party/
├── party.html          # 파티 앱 진입점
├── css/
│   └── party.css       # 파티 전용 스타일
├── js/
│   └── party.js        # 파티 앱 로직
└── components/         # 파티 전용 컴포넌트
```

## XAML → HTML 변환 매핑

### 기본 요소 변환
- `<UserControl>` → `<div class="party-page">`
- `<ScrollViewer>` → `<div class="scroll-container">`
- `<StackPanel>` → `<div class="content-container">`
- `<TextBlock>` → `<h1>`, `<p>`, `<span>`
- `<Grid>` → `<div class="party-grid">`
- `<Border>` → `<div class="party-box">`

### 스타일 속성 변환
- `Background="#FF000000"` → `background-color: #000000`
- `Foreground="White"` → `color: white`
- `FontSize="24"` → `font-size: 24px`
- `Margin="20"` → `margin: 20px`
- `CornerRadius="5"` → `border-radius: 5px`

## 완료 기준
- PartyPage.xaml 기능을 HTML로 완전 복제
- 동일한 UI/UX 구현
- WebView2 통신 정상 동작

---
*Phase 6: 통합 및 테스트 준비 완료*