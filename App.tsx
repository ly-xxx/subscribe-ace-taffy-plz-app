import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { WebView } from 'react-native-webview';

import { laughAudioModule, modelGlbModule, resolveAssetUri } from './src/assets';
import { createModelViewerHtml } from './src/modelViewerHtml';
import {
  cameraPresets,
  laughLines,
  speedPresets,
  type CameraPresetId,
  type SpeedPresetId,
} from './src/showConfig';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '00:00';
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

type ViewerState = 'booting' | 'loading' | 'ready' | 'error';

function OptionChip({
  active,
  label,
  hint,
  onPress,
}: {
  active: boolean;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.optionChip, active ? styles.optionChipActive : null]}
    >
      <Text style={[styles.optionChipLabel, active ? styles.optionChipLabelActive : null]}>
        {label}
      </Text>
      <Text style={[styles.optionChipHint, active ? styles.optionChipHintActive : null]}>
        {hint}
      </Text>
    </Pressable>
  );
}

function StatTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function App() {
  const player = useAudioPlayer(laughAudioModule, {
    keepAudioSessionActive: true,
    updateInterval: 150,
  });
  const status = useAudioPlayerStatus(player);
  const webViewRef = useRef<WebView>(null);
  const finishHandledRef = useRef(false);

  const [modelUri, setModelUri] = useState<string | null>(null);
  const [viewerState, setViewerState] = useState<ViewerState>('booting');
  const [isLooping, setIsLooping] = useState(false);
  const [cameraPresetId, setCameraPresetId] = useState<CameraPresetId>('stage');
  const [speedPresetId, setSpeedPresetId] = useState<SpeedPresetId>('steady');
  const [manualReplayCount, setManualReplayCount] = useState(0);
  const [autoLoopCount, setAutoLoopCount] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [queuedStart, setQueuedStart] = useState(false);

  const selectedCamera = useMemo(
    () => cameraPresets.find((preset) => preset.id === cameraPresetId) ?? cameraPresets[0],
    [cameraPresetId]
  );
  const selectedSpeed = useMemo(
    () => speedPresets.find((preset) => preset.id === speedPresetId) ?? speedPresets[0],
    [speedPresetId]
  );

  useEffect(() => {
    let cancelled = false;

    async function prepareAudioMode() {
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          interruptionMode: 'duckOthers',
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          shouldRouteThroughEarpiece: false,
        });
      } catch {
        // Expo Go or some Android devices may reject part of the audio mode setup.
      }
    }

    async function loadModel() {
      if (!modelGlbModule) {
        setModelUri(null);
        setViewerState('error');
        return;
      }

      try {
        const uri = await resolveAssetUri(modelGlbModule);
        if (!cancelled) {
          setModelUri(uri);
          setViewerState('loading');
        }
      } catch {
        if (!cancelled) {
          setViewerState('error');
        }
      }
    }

    prepareAudioMode();
    loadModel();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    player.setPlaybackRate(selectedSpeed.rate, 'medium');
  }, [player, selectedSpeed.rate]);

  function postViewerMessage(message: Record<string, unknown>) {
    webViewRef.current?.postMessage(JSON.stringify(message));
  }

  async function runShowFromStart(options?: {
    countManualReplay?: boolean;
    countLoopReplay?: boolean;
    rotateLine?: boolean;
  }) {
    const countManualReplay = options?.countManualReplay ?? false;
    const countLoopReplay = options?.countLoopReplay ?? false;
    const rotateLine = options?.rotateLine ?? false;

    if (!modelUri) {
      return;
    }

    if (viewerState !== 'ready') {
      setQueuedStart(true);
      return;
    }

    setQueuedStart(false);

    try {
      await player.seekTo(0);
    } catch {
      // Seeking can race with initial load; play() below still handles the normal path.
    }

    player.play();
    postViewerMessage({
      type: 'playFromStart',
      animationSpeed: selectedSpeed.rate,
      cameraOrbit: selectedCamera.cameraOrbit,
    });

    startTransition(() => {
      if (countManualReplay) {
        setManualReplayCount((count) => count + 1);
      }

      if (countLoopReplay) {
        setAutoLoopCount((count) => count + 1);
      }

      if (rotateLine) {
        setLineIndex((index) => (index + 1) % laughLines.length);
      }
    });
  }

  useEffect(() => {
    if (viewerState === 'ready' && queuedStart) {
      void runShowFromStart({
        countManualReplay: true,
        rotateLine: true,
      });
    }
  }, [queuedStart, viewerState]);

  useEffect(() => {
    if (viewerState !== 'ready') {
      return;
    }

    postViewerMessage({
      type: 'configure',
      animationSpeed: selectedSpeed.rate,
      cameraOrbit: selectedCamera.cameraOrbit,
    });
  }, [selectedCamera.cameraOrbit, selectedSpeed.rate, viewerState]);

  useEffect(() => {
    if (status.didJustFinish && !finishHandledRef.current) {
      finishHandledRef.current = true;

      if (isLooping) {
        void runShowFromStart({
          countLoopReplay: true,
          rotateLine: true,
        });
      }
    }

    if (!status.didJustFinish) {
      finishHandledRef.current = false;
    }
  }, [isLooping, status.didJustFinish, lineIndex, selectedCamera.cameraOrbit, selectedSpeed.rate]);

  const html = useMemo(
    () =>
      createModelViewerHtml({
        modelUri,
        posterText:
          'GLB 还没有加载成功时会显示这里。确认 Expo 已经打包 glb 资源，并保持网络可访问 model-viewer 运行脚本。',
        initialAnimationSpeed: speedPresets[0].rate,
        initialCameraOrbit: cameraPresets[0].cameraOrbit,
      }),
    [modelUri]
  );

  const progress =
    status.duration > 0 ? clamp(status.currentTime / status.duration, 0, 1) : 0;
  const currentLine = laughLines[lineIndex % laughLines.length];

  const viewerStatusLabel =
    viewerState === 'ready'
      ? '模型就绪'
      : viewerState === 'loading'
        ? '模型加载中'
        : viewerState === 'error'
          ? '3D 视图异常'
          : '初始化中';

  const playbackStatusLabel = queuedStart
    ? '排队开播中'
    : status.playing
      ? '塔菲正在狂笑'
      : status.currentTime > 0 && progress < 1
        ? '已暂停'
        : manualReplayCount > 0 || autoLoopCount > 0
          ? '等待下一次整活'
          : '待机中';

  async function startShow() {
    await runShowFromStart({
      countManualReplay: true,
      rotateLine: true,
    });
  }

  async function pauseOrResume() {
    if (queuedStart) {
      setQueuedStart(false);
      return;
    }

    if (status.playing) {
      player.pause();
      postViewerMessage({ type: 'pause' });
      return;
    }

    if (status.currentTime <= 0 || status.didJustFinish) {
      await startShow();
      return;
    }

    player.play();
    postViewerMessage({
      type: 'resume',
      animationSpeed: selectedSpeed.rate,
    });
  }

  async function resetShow() {
    setQueuedStart(false);
    player.pause();

    try {
      await player.seekTo(0);
    } catch {
      // Ignore seek races when the audio source is still warming up.
    }

    postViewerMessage({ type: 'stop' });
  }

  async function shareLaugh() {
    await Share.share({
      message: `我把塔菲放进了一个 GLB 梗图原型里。\n当前机位：${selectedCamera.label}\n当前强度：${selectedSpeed.label}\n文案：${currentLine}\n开播次数：${manualReplayCount + autoLoopCount}`,
      title: '塔菲狂笑现场',
    });
  }

  function rotateLine() {
    setLineIndex((index) => (index + 1) % laughLines.length);
  }

  function handleViewerMessage(rawMessage: string) {
    try {
      const payload = JSON.parse(rawMessage) as { type?: string };

      if (payload.type === 'viewer-ready') {
        setViewerState('ready');
        return;
      }

      if (payload.type === 'viewer-error') {
        setViewerState('error');
      }
    } catch {
      // Ignore non-JSON bridge messages.
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <View style={styles.background}>
        <View style={styles.orbPrimary} />
        <View style={styles.orbSecondary} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Naiwa Android Prototype</Text>
          <Text style={styles.title}>点一下就狂笑</Text>
          <Text style={styles.subtitle}>
            现在已经不是单纯的 GLB 验证页了。这一版把塔菲的 3D 播放、配乐、机位和梗图文案都接成了一个可继续扩展的移动端原型。
          </Text>

          <View style={styles.heroMetaRow}>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, viewerState === 'ready' ? styles.statusDotReady : styles.statusDotLoading]} />
              <Text style={styles.statusBadgeText}>{viewerStatusLabel}</Text>
            </View>

            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{playbackStatusLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.stageCard}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            onMessage={(event) => handleViewerMessage(event.nativeEvent.data)}
            source={{ html }}
            style={styles.webview}
            javaScriptEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
          />

          <View pointerEvents="none" style={styles.stageOverlayTop}>
            <View style={styles.stagePill}>
              <Text style={styles.stagePillLabel}>机位</Text>
              <Text style={styles.stagePillValue}>{selectedCamera.label}</Text>
            </View>

            <View style={styles.stagePill}>
              <Text style={styles.stagePillLabel}>强度</Text>
              <Text style={styles.stagePillValue}>{selectedSpeed.label}</Text>
            </View>
          </View>

          <View pointerEvents="none" style={styles.stageOverlayBottom}>
            <Text style={styles.stageOverlayQuote}>{currentLine}</Text>
            <Text style={styles.stageOverlayHint}>
              {queuedStart ? '模型一就绪就会自动开播。' : '你可以边改机位边继续整活。'}
            </Text>
          </View>
        </View>

        <View style={styles.transportCard}>
          <View style={styles.transportHeader}>
            <View>
              <Text style={styles.sectionTitle}>播放台</Text>
              <Text style={styles.sectionHint}>把音频、模型动画和梗文案放在同一个节奏里。</Text>
            </View>

            <View style={styles.loopToggle}>
              <Text style={styles.loopLabel}>连播模式</Text>
              <Switch value={isLooping} onValueChange={setIsLooping} />
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(progress * 100, 2)}%` }]} />
          </View>

          <View style={styles.progressMeta}>
            <Text style={styles.progressText}>
              {formatTime(status.currentTime)} / {formatTime(status.duration)}
            </Text>
            <Text style={styles.progressText}>
              速度 {selectedSpeed.rate.toFixed(2)}x
            </Text>
          </View>

          <View style={styles.primaryActionRow}>
            <Pressable onPress={startShow} style={[styles.actionButton, styles.primaryActionButton]}>
              <Text style={styles.primaryActionText}>
                {manualReplayCount === 0 ? '点一下就开播' : '再来一遍'}
              </Text>
            </Pressable>

            <Pressable onPress={pauseOrResume} style={[styles.actionButton, styles.secondaryActionButton]}>
              <Text style={styles.secondaryActionText}>
                {queuedStart
                  ? '取消排队'
                  : status.playing
                    ? '暂停'
                    : status.currentTime > 0 && progress < 1
                      ? '继续'
                      : '试听'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.secondaryActionRow}>
            <Pressable onPress={resetShow} style={[styles.utilityButton, styles.utilityButtonMuted]}>
              <Text style={styles.utilityButtonText}>归零</Text>
            </Pressable>

            <Pressable onPress={rotateLine} style={[styles.utilityButton, styles.utilityButtonMuted]}>
              <Text style={styles.utilityButtonText}>换句文案</Text>
            </Pressable>

            <Pressable onPress={shareLaugh} style={[styles.utilityButton, styles.utilityButtonAccent]}>
              <Text style={styles.utilityButtonAccentText}>分享文案</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatTile label="手动开播" value={`${manualReplayCount} 次`} />
          <StatTile label="自动续播" value={`${autoLoopCount} 次`} />
          <StatTile label="当前状态" value={status.playing ? '狂笑中' : queuedStart ? '排队中' : '待命'} />
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>镜头机位</Text>
          <Text style={styles.sectionHint}>同一份 GLB 先用不同镜头语言做出梗感变化。</Text>

          <View style={styles.optionsGrid}>
            {cameraPresets.map((preset) => (
              <OptionChip
                key={preset.id}
                active={preset.id === cameraPresetId}
                label={preset.label}
                hint={preset.hint}
                onPress={() => setCameraPresetId(preset.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>狂笑强度</Text>
          <Text style={styles.sectionHint}>这一组会同步控制音频播放速率和模型动画速率。</Text>

          <View style={styles.optionsGrid}>
            {speedPresets.map((preset) => (
              <OptionChip
                key={preset.id}
                active={preset.id === speedPresetId}
                label={preset.label}
                hint={preset.hint}
                onPress={() => setSpeedPresetId(preset.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.quoteCard}>
          <Text style={styles.quoteEyebrow}>当前梗文案</Text>
          <Text style={styles.quoteText}>{currentLine}</Text>
          <Text style={styles.quoteFootnote}>
            这块现在先做成轻量文案池，后面很适合扩成按钮触发、字幕条或者分享页模板。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#071019',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#071019',
  },
  orbPrimary: {
    position: 'absolute',
    top: -70,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: 'rgba(247, 176, 64, 0.14)',
  },
  orbSecondary: {
    position: 'absolute',
    left: -80,
    top: 300,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: 'rgba(77, 156, 255, 0.12)',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 16,
  },
  heroCard: {
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 22,
    backgroundColor: 'rgba(13, 24, 38, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  eyebrow: {
    color: '#f7b040',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 8,
    color: '#f9fbff',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
  },
  subtitle: {
    marginTop: 10,
    color: '#b0bfd2',
    fontSize: 14,
    lineHeight: 22,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#101e31',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 8,
  },
  statusDotReady: {
    backgroundColor: '#49d990',
  },
  statusDotLoading: {
    backgroundColor: '#f7b040',
  },
  statusBadgeText: {
    color: '#dbe7f5',
    fontSize: 12,
    fontWeight: '700',
  },
  stageCard: {
    position: 'relative',
    minHeight: 420,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#08111a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 26,
    shadowOffset: {
      width: 0,
      height: 16,
    },
    elevation: 10,
  },
  webview: {
    flex: 1,
    minHeight: 420,
    backgroundColor: 'transparent',
  },
  stageOverlayTop: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  stageOverlayBottom: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(7, 16, 25, 0.72)',
  },
  stagePill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(7, 16, 25, 0.72)',
    minWidth: 96,
  },
  stagePillLabel: {
    color: '#8fa5bf',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  stagePillValue: {
    marginTop: 4,
    color: '#f9fbff',
    fontSize: 15,
    fontWeight: '800',
  },
  stageOverlayQuote: {
    color: '#f9fbff',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  stageOverlayHint: {
    marginTop: 6,
    color: '#94a8c1',
    fontSize: 12,
    lineHeight: 18,
  },
  transportCard: {
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: 'rgba(12, 21, 34, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 14,
  },
  transportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    color: '#f9fbff',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionHint: {
    marginTop: 4,
    color: '#8fa5bf',
    fontSize: 13,
    lineHeight: 20,
  },
  loopToggle: {
    alignItems: 'center',
    gap: 6,
  },
  loopLabel: {
    color: '#dce7f4',
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#101c2d',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#f7b040',
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  progressText: {
    color: '#adc0d8',
    fontSize: 12,
    fontWeight: '700',
  },
  primaryActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryActionButton: {
    flex: 1.4,
    backgroundColor: '#f7b040',
  },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: '#16273f',
  },
  primaryActionText: {
    color: '#221100',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryActionText: {
    color: '#f9fbff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  utilityButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  utilityButtonMuted: {
    backgroundColor: '#111d2e',
  },
  utilityButtonAccent: {
    backgroundColor: '#204c8e',
  },
  utilityButtonText: {
    color: '#dce7f4',
    fontSize: 13,
    fontWeight: '800',
  },
  utilityButtonAccentText: {
    color: '#eef5ff',
    fontSize: 13,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statTile: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: 'rgba(12, 21, 34, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statLabel: {
    color: '#8fa5bf',
    fontSize: 12,
  },
  statValue: {
    marginTop: 8,
    color: '#f9fbff',
    fontSize: 16,
    fontWeight: '900',
  },
  panel: {
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: 'rgba(12, 21, 34, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  optionsGrid: {
    marginTop: 14,
    gap: 10,
  },
  optionChip: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#101c2d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  optionChipActive: {
    backgroundColor: '#182c48',
    borderColor: 'rgba(247,176,64,0.35)',
  },
  optionChipLabel: {
    color: '#f1f6ff',
    fontSize: 15,
    fontWeight: '800',
  },
  optionChipLabelActive: {
    color: '#ffd892',
  },
  optionChipHint: {
    marginTop: 5,
    color: '#93a7bf',
    fontSize: 12,
    lineHeight: 18,
  },
  optionChipHintActive: {
    color: '#c7d6e6',
  },
  quoteCard: {
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: '#101b2d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  quoteEyebrow: {
    color: '#f7b040',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  quoteText: {
    marginTop: 10,
    color: '#f9fbff',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 28,
  },
  quoteFootnote: {
    marginTop: 10,
    color: '#93a7bf',
    fontSize: 13,
    lineHeight: 20,
  },
});
