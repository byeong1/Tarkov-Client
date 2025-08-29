# TarkovClient 맵 변경 감지 시스템 (Map Detection System)

## 🎯 맵 감지 시스템 개요

### 목적
게임 내에서 맵 변경이 발생했을 때 이를 자동으로 감지하여 지도 인터페이스를 해당 맵으로 자동 전환하는 시스템을 구현합니다.

### 감지 방식
1. **주 감지 방식**: 게임 로그 파일 모니터링 (높은 정확도, 빠른 반응)
2. **보조 감지 방식**: 스크린샷 위치 데이터 분석 (검증 목적)
3. **수동 감지 방식**: 사용자 직접 선택 (fallback)

### 시스템 아키텍처
```
[Game Logs] → [LogsWatcher] → [BundleToMapConverter] → [MapChanged Event]
     ↓              ↓                    ↓                    ↓
[Screenshots] → [PositionParser] → [MapValidator] → [Confirmation]
```

---

## 📋 로그 기반 감지 시스템

### 게임 로그 구조 분석
Escape from Tarkov는 맵 로드 시 다음과 같은 로그를 생성합니다:

```
[2024-08-27 15:30:25] Loading bundle: factory4_day
[2024-08-27 15:30:26] Map loaded: Factory
[2024-08-27 15:30:27] Player spawned at coordinates...
```

### 로그 감시 시스템
```csharp
public class GameLogsWatcher : IDisposable
{
    private readonly FileSystemWatcher _logWatcher;
    private readonly Queue<string> _logBuffer = new();
    private readonly Timer _processingTimer;
    
    // EFT 로그 파일 경로
    private string LogsPath => Path.Combine(Env.GameFolder, "Logs");
    private string CurrentLogFile => Path.Combine(LogsPath, 
        $"EscapeFromTarkov_{DateTime.Now:yyyy.MM.dd}.log");

    public GameLogsWatcher()
    {
        InitializeWatcher();
        _processingTimer = new Timer(ProcessLogBuffer, null, 1000, 1000);
    }

    private void InitializeWatcher()
    {
        _logWatcher = new FileSystemWatcher(LogsPath)
        {
            Filter = "*.log",
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.Size,
            EnableRaisingEvents = true
        };

        _logWatcher.Changed += OnLogFileChanged;
        _logWatcher.Created += OnLogFileChanged;
    }

    private void OnLogFileChanged(object sender, FileSystemEventArgs e)
    {
        if (e.Name.Contains("EscapeFromTarkov"))
        {
            ReadNewLogEntries(e.FullPath);
        }
    }

    private void ReadNewLogEntries(string filePath)
    {
        try
        {
            var lines = File.ReadLines(filePath).Skip(_lastReadLine);
            foreach (var line in lines)
            {
                _logBuffer.Enqueue(line);
                _lastReadLine++;
            }
        }
        catch (IOException ex)
        {
            // 파일이 사용 중일 때 재시도
            Logger.Warning($"로그 파일 읽기 실패, 재시도 예정: {ex.Message}");
        }
    }
}
```

### 맵 번들 식별 시스템
```csharp
public static class MapBundleIdentifier
{
    // 게임 번들명 → 맵명 매핑
    private static readonly Dictionary<string, string> BundleToMapMapping = 
        new Dictionary<string, string>
        {
            // Factory variants
            { "factory4_day", MapName.Factory },
            { "factory4_night", MapName.Factory },
            
            // Customs variants  
            { "bigmap", MapName.Customs },
            { "customs", MapName.Customs },
            
            // Interchange
            { "interchange", MapName.Interchange },
            
            // Woods variants
            { "woods", MapName.Woods },
            { "forest", MapName.Woods },
            
            // Shoreline
            { "shoreline", MapName.Shoreline },
            { "lighthouse_zone", MapName.Shoreline },
            
            // Reserve
            { "rezervbase", MapName.Reserve },
            { "reserve", MapName.Reserve },
            
            // Labs
            { "laboratory", MapName.The_Lab },
            { "the_lab", MapName.The_Lab },
            
            // Lighthouse
            { "lighthouse", MapName.Lighthouse },
            
            // Streets of Tarkov
            { "tarkovstreets", MapName.Streets },
            { "streets", MapName.Streets }
        };

    public static string? GetMapFromBundle(string bundleName)
    {
        // 부분 매칭 지원 (대소문자 무시)
        var normalizedBundle = bundleName.ToLowerInvariant();
        
        foreach (var kvp in BundleToMapMapping)
        {
            if (normalizedBundle.Contains(kvp.Key))
            {
                return kvp.Value;
            }
        }
        
        return null;
    }

    public static float GetConfidence(string bundleName, string detectedMap)
    {
        var normalizedBundle = bundleName.ToLowerInvariant();
        
        // 정확한 매칭
        if (BundleToMapMapping.TryGetValue(normalizedBundle, out var exactMatch))
        {
            return exactMatch == detectedMap ? 1.0f : 0.0f;
        }
        
        // 부분 매칭 신뢰도
        var partialMatches = BundleToMapMapping
            .Where(kvp => normalizedBundle.Contains(kvp.Key))
            .ToList();
            
        if (partialMatches.Count == 1 && partialMatches[0].Value == detectedMap)
        {
            return 0.8f; // 부분 매칭은 80% 신뢰도
        }
        
        return 0.0f; // 매칭 없음
    }
}
```

### 로그 패턴 매칭
```csharp
public class LogPatternMatcher
{
    private static readonly List<Regex> MapLoadPatterns = new()
    {
        // 번들 로딩 패턴
        new Regex(@"Loading bundle:\s*(\w+)", RegexOptions.IgnoreCase),
        new Regex(@"Bundle loaded:\s*(\w+)", RegexOptions.IgnoreCase),
        
        // 맵 로딩 패턴  
        new Regex(@"Map loaded:\s*(\w+)", RegexOptions.IgnoreCase),
        new Regex(@"Loading map:\s*(\w+)", RegexOptions.IgnoreCase),
        
        // 레이드 시작 패턴
        new Regex(@"Starting raid on:\s*(\w+)", RegexOptions.IgnoreCase),
        new Regex(@"Spawning on map:\s*(\w+)", RegexOptions.IgnoreCase)
    };

    public MapDetectionResult AnalyzeLogLine(string logLine)
    {
        foreach (var pattern in MapLoadPatterns)
        {
            var match = pattern.Match(logLine);
            if (match.Success)
            {
                var bundleOrMap = match.Groups[1].Value;
                
                // 번들명에서 맵명 추출
                var detectedMap = MapBundleIdentifier.GetMapFromBundle(bundleOrMap);
                if (!string.IsNullOrEmpty(detectedMap))
                {
                    return new MapDetectionResult
                    {
                        MapName = detectedMap,
                        Confidence = MapBundleIdentifier.GetConfidence(bundleOrMap, detectedMap),
                        Source = MapDetectionSource.GameLog,
                        RawData = bundleOrMap,
                        Timestamp = DateTime.UtcNow
                    };
                }
            }
        }
        
        return MapDetectionResult.NoDetection;
    }
}
```

---

## 📷 스크린샷 기반 보조 감지

### 위치 데이터를 통한 맵 추론
```csharp
public class ScreenshotMapDetector
{
    // 맵별 좌표 경계값 정의
    private static readonly Dictionary<string, MapBounds> MapBoundaries = 
        new Dictionary<string, MapBounds>
        {
            { 
                MapName.Factory, 
                new MapBounds(-200, 200, -150, 150) 
            },
            { 
                MapName.Customs, 
                new MapBounds(-600, 600, -500, 500) 
            },
            { 
                MapName.Interchange, 
                new MapBounds(-400, 400, -350, 350) 
            }
            // ... 다른 맵들
        };

    public MapDetectionResult DetectMapFromPosition(Position position)
    {
        var candidates = new List<(string MapName, float Confidence)>();
        
        foreach (var boundary in MapBoundaries)
        {
            if (boundary.Value.Contains(position.X, position.Z))
            {
                // 경계 중심으로부터의 거리로 신뢰도 계산
                var confidence = CalculatePositionConfidence(position, boundary.Value);
                candidates.Add((boundary.Key, confidence));
            }
        }
        
        // 가장 높은 신뢰도의 맵 선택
        var bestCandidate = candidates.OrderByDescending(c => c.Confidence).FirstOrDefault();
        
        if (bestCandidate.Confidence > 0.5f)
        {
            return new MapDetectionResult
            {
                MapName = bestCandidate.MapName,
                Confidence = bestCandidate.Confidence,
                Source = MapDetectionSource.Screenshot,
                RawData = $"X:{position.X}, Z:{position.Z}",
                Timestamp = DateTime.UtcNow
            };
        }
        
        return MapDetectionResult.NoDetection;
    }

    private float CalculatePositionConfidence(Position position, MapBounds bounds)
    {
        // 맵 중심으로부터의 정규화된 거리
        var centerX = (bounds.MinX + bounds.MaxX) / 2;
        var centerZ = (bounds.MinZ + bounds.MaxZ) / 2;
        
        var distance = Math.Sqrt(
            Math.Pow(position.X - centerX, 2) + 
            Math.Pow(position.Z - centerZ, 2)
        );
        
        var maxDistance = Math.Sqrt(
            Math.Pow(bounds.Width / 2, 2) + 
            Math.Pow(bounds.Height / 2, 2)
        );
        
        // 중심에서 가까울수록 높은 신뢰도
        return Math.Max(0, 1 - (float)(distance / maxDistance));
    }
}
```

### 맵 특징점 기반 검증
```csharp
public class MapLandmarkDetector
{
    // 맵별 특징적인 좌표 포인트들
    private static readonly Dictionary<string, List<Vector2>> MapLandmarks = 
        new Dictionary<string, List<Vector2>>
        {
            { 
                MapName.Factory, 
                new List<Vector2> 
                { 
                    new(-50, -30),   // 공장 건물 중앙
                    new(80, 45),     // 사무실 구역
                    new(-80, 70)     // 지하 터널
                }
            },
            {
                MapName.Customs,
                new List<Vector2>
                {
                    new(0, 0),       // 맵 중앙 (가스 스테이션 근처)
                    new(-200, 150),  // 구 가스 스테이션
                    new(250, -100)   // 도미토리
                }
            }
        };

    public float ValidateMapWithLandmarks(string suspectedMap, Position position)
    {
        if (!MapLandmarks.TryGetValue(suspectedMap, out var landmarks))
            return 0.0f;

        // 가장 가까운 랜드마크까지의 거리 계산
        var closestDistance = landmarks
            .Select(landmark => CalculateDistance(position, landmark))
            .Min();

        // 100 유닛 이내에 랜드마크가 있으면 높은 신뢰도
        if (closestDistance < 100)
            return 0.9f;
        else if (closestDistance < 200)
            return 0.6f;
        else
            return 0.3f;
    }

    private float CalculateDistance(Position position, Vector2 landmark)
    {
        return (float)Math.Sqrt(
            Math.Pow(position.X - landmark.X, 2) + 
            Math.Pow(position.Z - landmark.Y, 2)
        );
    }
}
```

---

## 🧠 통합 맵 감지 엔진

### 멀티소스 감지 조합기
```csharp
public class MapDetectionEngine
{
    private readonly GameLogsWatcher _logsWatcher;
    private readonly ScreenshotMapDetector _screenshotDetector;
    private readonly MapLandmarkDetector _landmarkDetector;
    private readonly MapDetectionHistory _history;

    private string _currentMap = string.Empty;
    private DateTime _lastMapChange = DateTime.MinValue;

    public event Action<MapChangeEvent>? MapChanged;

    public MapDetectionEngine()
    {
        _logsWatcher = new GameLogsWatcher();
        _screenshotDetector = new ScreenshotMapDetector();
        _landmarkDetector = new MapLandmarkDetector();
        _history = new MapDetectionHistory();

        _logsWatcher.LogEntryDetected += OnLogEntryDetected;
    }

    private void OnLogEntryDetected(string logLine)
    {
        var logResult = new LogPatternMatcher().AnalyzeLogLine(logLine);
        
        if (logResult.IsValid)
        {
            ProcessMapDetection(logResult);
        }
    }

    public void OnScreenshotDetected(Position position)
    {
        var screenshotResult = _screenshotDetector.DetectMapFromPosition(position);
        
        if (screenshotResult.IsValid)
        {
            // 랜드마크 검증 추가
            var landmarkConfidence = _landmarkDetector
                .ValidateMapWithLandmarks(screenshotResult.MapName, position);
            
            screenshotResult.Confidence *= landmarkConfidence;
            
            ProcessMapDetection(screenshotResult);
        }
    }

    private void ProcessMapDetection(MapDetectionResult result)
    {
        // 기록에 추가
        _history.AddDetection(result);
        
        // 맵 변경 결정 로직
        var mapChangeDecision = MakeMapChangeDecision(result);
        
        if (mapChangeDecision.ShouldChange)
        {
            var previousMap = _currentMap;
            _currentMap = mapChangeDecision.NewMap;
            _lastMapChange = DateTime.UtcNow;

            // 맵 변경 이벤트 발생
            MapChanged?.Invoke(new MapChangeEvent
            {
                NewMap = _currentMap,
                PreviousMap = previousMap,
                Confidence = mapChangeDecision.Confidence,
                Source = result.Source,
                Timestamp = DateTime.UtcNow
            });
        }
    }

    private MapChangeDecision MakeMapChangeDecision(MapDetectionResult result)
    {
        // 현재 맵과 같으면 변경하지 않음
        if (_currentMap == result.MapName)
        {
            return MapChangeDecision.NoChange;
        }

        // 최근 감지 결과들 분석
        var recentDetections = _history.GetRecentDetections(TimeSpan.FromMinutes(5));
        var mapVotes = recentDetections
            .Where(d => d.MapName == result.MapName)
            .ToList();

        // 결정 로직
        var shouldChange = false;
        var confidence = result.Confidence;

        if (result.Source == MapDetectionSource.GameLog)
        {
            // 로그 기반은 높은 신뢰도로 즉시 적용
            shouldChange = result.Confidence > 0.7f;
        }
        else if (result.Source == MapDetectionSource.Screenshot)
        {
            // 스크린샷 기반은 여러 번의 일치가 필요
            if (mapVotes.Count >= 3)
            {
                var avgConfidence = mapVotes.Average(v => v.Confidence);
                shouldChange = avgConfidence > 0.6f;
                confidence = avgConfidence;
            }
        }

        return new MapChangeDecision
        {
            ShouldChange = shouldChange,
            NewMap = result.MapName,
            Confidence = confidence,
            Reason = GetDecisionReason(result, mapVotes.Count)
        };
    }
}
```

### 감지 기록 관리
```csharp
public class MapDetectionHistory
{
    private readonly List<MapDetectionResult> _detections = new();
    private readonly object _lock = new object();

    public void AddDetection(MapDetectionResult detection)
    {
        lock (_lock)
        {
            _detections.Add(detection);
            
            // 1시간 이상 된 기록 제거
            var cutoff = DateTime.UtcNow.AddHours(-1);
            _detections.RemoveAll(d => d.Timestamp < cutoff);
        }
    }

    public List<MapDetectionResult> GetRecentDetections(TimeSpan timeSpan)
    {
        var cutoff = DateTime.UtcNow - timeSpan;
        
        lock (_lock)
        {
            return _detections
                .Where(d => d.Timestamp >= cutoff)
                .OrderByDescending(d => d.Timestamp)
                .ToList();
        }
    }

    public MapDetectionStats GetStats()
    {
        lock (_lock)
        {
            return new MapDetectionStats
            {
                TotalDetections = _detections.Count,
                LogDetections = _detections.Count(d => d.Source == MapDetectionSource.GameLog),
                ScreenshotDetections = _detections.Count(d => d.Source == MapDetectionSource.Screenshot),
                AverageConfidence = _detections.Average(d => d.Confidence),
                MostDetectedMap = _detections
                    .GroupBy(d => d.MapName)
                    .OrderByDescending(g => g.Count())
                    .First()?.Key ?? "Unknown"
            };
        }
    }
}
```

---

## ⚙️ 사용자 설정 시스템

### 감지 모드 설정
```csharp
public class MapDetectionSettings
{
    public MapDetectionMode Mode { get; set; } = MapDetectionMode.Automatic;
    public float MinConfidenceThreshold { get; set; } = 0.7f;
    public bool EnableLogDetection { get; set; } = true;
    public bool EnableScreenshotDetection { get; set; } = true;
    public bool ShowDetectionNotifications { get; set; } = true;
    public TimeSpan MinTimeBetweenChanges { get; set; } = TimeSpan.FromSeconds(10);
}

public enum MapDetectionMode
{
    Automatic,      // 자동 감지
    SemiAutomatic,  // 확인 후 적용
    Manual          // 수동 선택만
}
```

### 사용자 인터페이스
```csharp
public partial class MapDetectionSettingsControl : UserControl
{
    private MapDetectionSettings _settings;

    private void OnModeChanged(object sender, SelectionChangedEventArgs e)
    {
        var mode = (MapDetectionMode)ModeComboBox.SelectedValue;
        _settings.Mode = mode;
        
        // UI 상태 업데이트
        UpdateUIForMode(mode);
    }

    private void UpdateUIForMode(MapDetectionMode mode)
    {
        ConfidenceSlider.IsEnabled = mode != MapDetectionMode.Manual;
        DetectionOptionsPanel.IsEnabled = mode != MapDetectionMode.Manual;
        
        if (mode == MapDetectionMode.SemiAutomatic)
        {
            NotificationsCheckBox.IsChecked = true;
            NotificationsCheckBox.IsEnabled = false;
        }
        else
        {
            NotificationsCheckBox.IsEnabled = true;
        }
    }
}
```

---

## 🎛️ 고급 감지 기능

### 맵 전환 패턴 학습
```csharp
public class MapTransitionLearner
{
    private readonly Dictionary<(string From, string To), int> _transitionCounts = new();
    
    public void RecordTransition(string fromMap, string toMap)
    {
        var key = (fromMap, toMap);
        _transitionCounts[key] = _transitionCounts.GetValueOrDefault(key, 0) + 1;
    }
    
    public float GetTransitionProbability(string fromMap, string toMap)
    {
        var totalFromTransitions = _transitionCounts
            .Where(kvp => kvp.Key.From == fromMap)
            .Sum(kvp => kvp.Value);
            
        if (totalFromTransitions == 0) return 0.0f;
        
        var specificTransitions = _transitionCounts
            .GetValueOrDefault((fromMap, toMap), 0);
            
        return (float)specificTransitions / totalFromTransitions;
    }
    
    public List<string> PredictLikelyMaps(string currentMap, int count = 3)
    {
        return _transitionCounts
            .Where(kvp => kvp.Key.From == currentMap)
            .OrderByDescending(kvp => kvp.Value)
            .Take(count)
            .Select(kvp => kvp.Key.To)
            .ToList();
    }
}
```

### 게임 세션 추적
```csharp
public class GameSessionTracker
{
    private GameSession? _currentSession;
    
    public void OnMapChanged(string newMap)
    {
        if (_currentSession == null || _currentSession.HasEnded)
        {
            StartNewSession(newMap);
        }
        else
        {
            _currentSession.AddMapVisit(newMap);
        }
    }
    
    private void StartNewSession(string initialMap)
    {
        _currentSession = new GameSession
        {
            Id = Guid.NewGuid(),
            StartTime = DateTime.UtcNow,
            InitialMap = initialMap
        };
        
        _currentSession.AddMapVisit(initialMap);
    }
    
    public void EndCurrentSession()
    {
        if (_currentSession != null)
        {
            _currentSession.EndTime = DateTime.UtcNow;
            _currentSession.HasEnded = true;
            
            // 세션 데이터 저장
            SaveSession(_currentSession);
        }
    }
}
```

---

## 📊 성능 및 신뢰성

### 성능 메트릭스
```csharp
public class MapDetectionMetrics
{
    private readonly Dictionary<MapDetectionSource, List<TimeSpan>> _detectionTimes = new();
    private readonly Dictionary<string, int> _falsePositives = new();

    public void RecordDetectionTime(MapDetectionSource source, TimeSpan time)
    {
        if (!_detectionTimes.ContainsKey(source))
            _detectionTimes[source] = new List<TimeSpan>();
            
        _detectionTimes[source].Add(time);
    }

    public void RecordFalsePositive(string mapName)
    {
        _falsePositives[mapName] = _falsePositives.GetValueOrDefault(mapName, 0) + 1;
    }

    public MapDetectionPerformanceReport GenerateReport()
    {
        return new MapDetectionPerformanceReport
        {
            AverageLogDetectionTime = _detectionTimes
                .GetValueOrDefault(MapDetectionSource.GameLog, new List<TimeSpan>())
                .DefaultIfEmpty(TimeSpan.Zero)
                .Average(t => t.TotalMilliseconds),
                
            AverageScreenshotDetectionTime = _detectionTimes
                .GetValueOrDefault(MapDetectionSource.Screenshot, new List<TimeSpan>())
                .DefaultIfEmpty(TimeSpan.Zero)
                .Average(t => t.TotalMilliseconds),
                
            FalsePositiveRate = CalculateFalsePositiveRate(),
            TotalDetections = _detectionTimes.Values.Sum(list => list.Count)
        };
    }
}
```

### 자동 보정 시스템
```csharp
public class MapDetectionCalibrator
{
    public async Task CalibrateDetectionSystem()
    {
        // 1. 로그 패턴 정확도 검증
        await ValidateLogPatterns();
        
        // 2. 맵 경계값 최적화
        await OptimizeMapBoundaries();
        
        // 3. 신뢰도 임계값 조정
        await AdjustConfidenceThresholds();
        
        // 4. 랜드마크 포인트 업데이트
        await UpdateLandmarkPoints();
    }

    private async Task ValidateLogPatterns()
    {
        // 실제 로그 데이터로 패턴 검증
        var testLogs = await LoadTestLogData();
        
        foreach (var logLine in testLogs)
        {
            var result = new LogPatternMatcher().AnalyzeLogLine(logLine.Text);
            
            if (result.MapName != logLine.ExpectedMap)
            {
                // 패턴 수정 제안
                SuggestPatternImprovement(logLine.Text, logLine.ExpectedMap);
            }
        }
    }
}
```

---

## 🚨 오류 처리 및 복구

### 감지 실패 처리
```csharp
public class MapDetectionErrorHandler
{
    public void HandleDetectionError(MapDetectionError error)
    {
        switch (error.Type)
        {
            case MapDetectionErrorType.LogFileNotFound:
                // 게임 폴더 경로 재확인
                RequestGameFolderReconfiguration();
                break;
                
            case MapDetectionErrorType.LogParsingFailed:
                // 로그 형식 변경 가능성
                TriggerLogPatternUpdate();
                break;
                
            case MapDetectionErrorType.PositionOutOfBounds:
                // 새로운 맵 추가 가능성
                SuggestNewMapAddition(error.Data);
                break;
                
            case MapDetectionErrorType.ConflictingDetections:
                // 사용자 확인 요청
                RequestUserConfirmation(error.Data);
                break;
        }
    }

    private void RequestUserConfirmation(string errorData)
    {
        var dialog = new MapDetectionConflictDialog(errorData);
        dialog.ShowDialog();
    }
}
```

### Fallback 시스템
```csharp
public class MapDetectionFallback
{
    private readonly Stack<IMapDetectionStrategy> _strategies = new();

    public MapDetectionFallback()
    {
        // 우선순위순으로 스택에 추가 (높은 우선순위가 마지막)
        _strategies.Push(new ManualMapSelection());
        _strategies.Push(new LastKnownMapStrategy());
        _strategies.Push(new ScreenshotBasedDetection());
        _strategies.Push(new LogBasedDetection());
    }

    public MapDetectionResult DetectMap(MapDetectionContext context)
    {
        foreach (var strategy in _strategies.Reverse())
        {
            try
            {
                var result = strategy.DetectMap(context);
                if (result.IsValid && result.Confidence > 0.5f)
                {
                    return result;
                }
            }
            catch (Exception ex)
            {
                Logger.Warning($"맵 감지 전략 실패: {strategy.GetType().Name} - {ex.Message}");
                continue;
            }
        }

        return MapDetectionResult.NoDetection;
    }
}
```

---

## 🔬 테스트 및 검증

### 단위 테스트
```csharp
[TestFixture]
public class MapDetectionTests
{
    private MapDetectionEngine _engine;
    
    [SetUp]
    public void SetUp()
    {
        _engine = new MapDetectionEngine();
    }
    
    [Test]
    [TestCase("Loading bundle: factory4_day", MapName.Factory, 1.0f)]
    [TestCase("Map loaded: Customs", MapName.Customs, 1.0f)]
    [TestCase("Starting raid on: interchange", MapName.Interchange, 0.8f)]
    public void TestLogPatternMatching(string logLine, string expectedMap, float expectedConfidence)
    {
        var matcher = new LogPatternMatcher();
        var result = matcher.AnalyzeLogLine(logLine);
        
        Assert.That(result.MapName, Is.EqualTo(expectedMap));
        Assert.That(result.Confidence, Is.GreaterThanOrEqualTo(expectedConfidence));
    }
    
    [Test]
    public void TestScreenshotMapDetection()
    {
        var detector = new ScreenshotMapDetector();
        var position = new Position { X = -25.8f, Z = -18.2f };
        
        var result = detector.DetectMapFromPosition(position);
        
        Assert.That(result.MapName, Is.EqualTo(MapName.Factory));
        Assert.That(result.Confidence, Is.GreaterThan(0.5f));
    }
}
```

### 통합 테스트
```csharp
[TestFixture]
public class MapDetectionIntegrationTests
{
    [Test]
    public async Task TestFullMapDetectionFlow()
    {
        // 가상의 게임 로그 생성
        await SimulateGameLog("Loading bundle: factory4_day");
        
        // 스크린샷 시뮬레이션
        await SimulateScreenshot(new Position 
        { 
            X = -25.8f, Z = -18.2f, MapName = "Factory" 
        });
        
        // 맵 변경 이벤트 대기
        var mapChangeEvent = await WaitForMapChange(TimeSpan.FromSeconds(5));
        
        Assert.That(mapChangeEvent, Is.Not.Null);
        Assert.That(mapChangeEvent.NewMap, Is.EqualTo(MapName.Factory));
        Assert.That(mapChangeEvent.Confidence, Is.GreaterThan(0.8f));
    }
}
```

---

## 📋 구현 체크리스트

### Phase 1: 기본 감지 시스템
- [ ] GameLogsWatcher 구현
- [ ] LogPatternMatcher 구현  
- [ ] MapBundleIdentifier 구현
- [ ] 기본 맵 변경 이벤트 시스템

### Phase 2: 보조 감지 시스템
- [ ] ScreenshotMapDetector 구현
- [ ] MapLandmarkDetector 구현
- [ ] 맵 경계값 설정 시스템

### Phase 3: 통합 엔진
- [ ] MapDetectionEngine 구현
- [ ] MapDetectionHistory 구현
- [ ] 결정 로직 및 신뢰도 시스템

### Phase 4: 사용자 인터페이스
- [ ] 설정 UI 구현
- [ ] 감지 상태 표시
- [ ] 수동 맵 선택 기능

### Phase 5: 고급 기능
- [ ] 패턴 학습 시스템
- [ ] 성능 모니터링
- [ ] 자동 보정 시스템

---

*최종 업데이트: 2025-08-27*  
*다음 단계: ui-components.md 작성*