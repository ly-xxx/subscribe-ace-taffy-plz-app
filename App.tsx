import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { cacheDirectory, makeDirectoryAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';

import { motionCatalog, resolveAssetUri, type MotionAssetId } from './src/assets';
import { createModelViewerHtml } from './src/modelViewerHtml';
import { cameraPresets, type CameraPresetId } from './src/showConfig';

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) | 0;
  return Math.abs(hash).toString(36);
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

type ViewerState = 'booting' | 'loading' | 'ready' | 'error';
type PlaybackBridgeDetail = {
  playing?: boolean;
  progress?: number;
  currentTime?: number;
  duration?: number;
  energy?: number;
  didFinish?: boolean;
};

function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <View style={styles.pauseIcon}>
      <View style={styles.pauseBar} />
      <View style={styles.pauseBar} />
    </View>
  ) : (
    <View style={styles.playIcon} />
  );
}

function TuneIcon() {
  return (
    <View style={styles.tuneIcon}>
      <View style={styles.tuneRow}>
        <View style={[styles.tuneLine, { width: 18 }]} />
        <View style={[styles.tuneDot, { marginLeft: -12 }]} />
      </View>
      <View style={styles.tuneRow}>
        <View style={[styles.tuneLine, { width: 22 }]} />
        <View style={[styles.tuneDot, { marginLeft: 4 }]} />
      </View>
      <View style={styles.tuneRow}>
        <View style={[styles.tuneLine, { width: 16 }]} />
        <View style={[styles.tuneDot, { marginLeft: -6 }]} />
      </View>
    </View>
  );
}

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const autoStartedKeyRef = useRef<string | null>(null);
  const playingAnim = useRef(new Animated.Value(0)).current;
  const energyAnim = useRef(new Animated.Value(0)).current;

  const [selectedMotionId, setSelectedMotionId] = useState<MotionAssetId>(motionCatalog[0].id);
  const [modelUri, setModelUri] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [viewerPageUri, setViewerPageUri] = useState<string | null>(null);
  const [viewerState, setViewerState] = useState<ViewerState>('booting');
  const [viewerDetail, setViewerDetail] = useState('正在准备离线舞台。');
  const [isLooping, setIsLooping] = useState(true);
  const [isPlaybackActive, setIsPlaybackActive] = useState(false);
  const [queuedStart, setQueuedStart] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cameraPresetId, setCameraPresetId] = useState<CameraPresetId>('full');
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackEnergy, setPlaybackEnergy] = useState(0);
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [didFinish, setDidFinish] = useState(false);

  const selectedMotion = useMemo(
    () => motionCatalog.find((motion) => motion.id === selectedMotionId) ?? motionCatalog[0],
    [selectedMotionId]
  );
  const selectedCamera = useMemo(
    () => cameraPresets.find((preset) => preset.id === cameraPresetId) ?? cameraPresets[0],
    [cameraPresetId]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadSelectedShow() {
      setViewerState('loading');
      setViewerDetail(`正在准备 ${selectedMotion.title} 的离线舞台。`);
      setIsPlaybackActive(false);
      setPlaybackProgress(0);
      setPlaybackCurrentTime(0);
      setPlaybackDuration(0);
      setPlaybackEnergy(0);
      setDidFinish(false);
      setModelUri(null);
      setAudioUri(null);
      setViewerPageUri(null);
      autoStartedKeyRef.current = null;
      try {
        const [resolvedModelUri, resolvedAudioUri] = await Promise.all([
          resolveAssetUri(selectedMotion.glbModule),
          selectedMotion.audioModule ? resolveAssetUri(selectedMotion.audioModule) : Promise.resolve(null),
        ]);
        if (!cancelled) {
          setModelUri(resolvedModelUri);
          setAudioUri(resolvedAudioUri);
          setViewerDetail(`${selectedMotion.title} 资源已就绪，正在挂载离线舞台。`);
        }
      } catch {
        if (!cancelled) {
          setViewerState('error');
          setViewerDetail(`${selectedMotion.title} 的离线资源解析失败。`);
        }
      }
    }
    void loadSelectedShow();
    return () => {
      cancelled = true;
    };
  }, [selectedMotion]);

  useEffect(() => {
    Animated.spring(playingAnim, {
      toValue: isPlaybackActive ? 1 : 0,
      friction: 11,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [isPlaybackActive, playingAnim]);

  useEffect(() => {
    Animated.spring(energyAnim, {
      toValue: clamp01(playbackEnergy),
      friction: 14,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [energyAnim, playbackEnergy]);

  function postViewerMessage(message: Record<string, unknown>) {
    webViewRef.current?.postMessage(JSON.stringify(message));
  }

  function buildViewerPayload() {
    return { animationSpeed: 1, cameraOrbit: selectedCamera.cameraOrbit, isLooping };
  }

  async function runShowFromStart() {
    if (!modelUri) return;
    if (viewerState !== 'ready') {
      setQueuedStart(true);
      return;
    }
    setQueuedStart(false);
    setDidFinish(false);
    postViewerMessage({ type: 'playFromStart', ...buildViewerPayload() });
    setIsPlaybackActive(true);
  }

  async function pauseOrResume() {
    if (queuedStart) {
      setQueuedStart(false);
      return;
    }
    if (viewerState !== 'ready') {
      setQueuedStart(true);
      return;
    }
    if (isPlaybackActive) {
      postViewerMessage({ type: 'pause' });
      setIsPlaybackActive(false);
      return;
    }
    if (didFinish || playbackCurrentTime <= 0.04 || playbackProgress <= 0.015) {
      await runShowFromStart();
      return;
    }
    postViewerMessage({ type: 'resume', ...buildViewerPayload() });
    setIsPlaybackActive(true);
  }

  useEffect(() => {
    if (viewerState === 'ready') postViewerMessage({ type: 'configure', ...buildViewerPayload() });
  }, [isLooping, selectedCamera.cameraOrbit, viewerState]);

  useEffect(() => {
    if (viewerState === 'ready' && queuedStart) void runShowFromStart();
  }, [queuedStart, viewerState]);

  useEffect(() => {
    if (viewerState !== 'ready') return;
    const autoStartKey = `${selectedMotionId}:${viewerPageUri ?? 'inline'}`;
    if (autoStartedKeyRef.current === autoStartKey) return;
    autoStartedKeyRef.current = autoStartKey;
    const timer = setTimeout(() => void runShowFromStart(), 240);
    return () => clearTimeout(timer);
  }, [selectedMotionId, viewerPageUri, viewerState]);

  const html = useMemo(
    () =>
      createModelViewerHtml({
        modelUri,
        audioUri,
        posterText: '离线 GLB 尚未完成挂载。',
        initialAnimationSpeed: 1,
        initialCameraOrbit: cameraPresets[0].cameraOrbit,
      }),
    [audioUri, modelUri]
  );
  const viewerWebViewKey = viewerPageUri ?? `inline-${hashString(html)}`;

  useEffect(() => {
    let cancelled = false;
    async function writeViewerHtml() {
      if (!cacheDirectory) {
        if (!cancelled) {
          setViewerPageUri(null);
          setViewerDetail('设备没有可用缓存目录。');
          setViewerState('error');
        }
        return;
      }
      const viewerDir = `${cacheDirectory}naiwa-viewer/`;
      const fileUri = `${viewerDir}viewer-${hashString(html)}.html`;
      try {
        await makeDirectoryAsync(viewerDir, { intermediates: true });
        await writeAsStringAsync(fileUri, html);
        if (!cancelled) setViewerPageUri(fileUri);
      } catch {
        if (!cancelled) {
          setViewerPageUri(null);
          setViewerDetail('离线舞台页面写入失败。');
          setViewerState('error');
        }
      }
    }
    void writeViewerHtml();
    return () => {
      cancelled = true;
    };
  }, [html]);

  function handleViewerMessage(rawMessage: string) {
    try {
      const payload = JSON.parse(rawMessage) as {
        type?: string;
        detail?: string | { message?: string } | PlaybackBridgeDetail;
      };
      if (payload.type === 'viewer-loading') {
        setViewerState('loading');
        if (typeof payload.detail === 'string') setViewerDetail(payload.detail);
        return;
      }
      if (payload.type === 'viewer-ready') {
        setViewerState('ready');
        if (typeof payload.detail === 'string') setViewerDetail(payload.detail);
        else if (
          payload.detail &&
          typeof payload.detail === 'object' &&
          'message' in payload.detail
        ) {
          setViewerDetail(payload.detail.message ?? '离线舞台已完成挂载。');
        }
        return;
      }
      if (payload.type === 'viewer-error') {
        setViewerState('error');
        setIsPlaybackActive(false);
        setViewerDetail(typeof payload.detail === 'string' ? payload.detail : '3D 舞台初始化失败。');
        return;
      }
      if (payload.type === 'playback-status' && payload.detail && typeof payload.detail === 'object') {
        const detail = payload.detail as PlaybackBridgeDetail;
        if (typeof detail.playing === 'boolean') setIsPlaybackActive(detail.playing);
        if (typeof detail.progress === 'number' && Number.isFinite(detail.progress)) setPlaybackProgress(clamp01(detail.progress));
        if (typeof detail.currentTime === 'number' && Number.isFinite(detail.currentTime)) setPlaybackCurrentTime(detail.currentTime);
        if (typeof detail.duration === 'number' && Number.isFinite(detail.duration)) setPlaybackDuration(detail.duration);
        if (typeof detail.energy === 'number' && Number.isFinite(detail.energy)) setPlaybackEnergy(clamp01(detail.energy));
        if (typeof detail.didFinish === 'boolean') setDidFinish(detail.didFinish);
      }
    } catch {}
  }

  const playbackFill = `${Math.max(8, clamp01(playbackProgress) * 100)}%` as `${number}%`;
  const wave = 0.44 + clamp01(playbackEnergy) * 0.82;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" translucent />
      <View style={styles.stage}>
        <View style={styles.bgTop} />
        <View style={styles.bgRight} />
        <View style={styles.bgBottom} />
        <WebView
          key={viewerWebViewKey}
          ref={webViewRef}
          originWhitelist={['*']}
          onError={(event) => {
            setViewerState('error');
            setViewerDetail(event.nativeEvent.description || 'WebView 打开离线舞台失败。');
          }}
          onMessage={(event) => handleViewerMessage(event.nativeEvent.data)}
          source={viewerPageUri ? { uri: viewerPageUri } : { html }}
          style={styles.webview}
          javaScriptEnabled
          cacheEnabled={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
        />
        {viewerState !== 'ready' ? (
          <View pointerEvents="none" style={styles.stateOverlay}>
            <View style={styles.stateCard}>
              {viewerState === 'error' ? <Text style={styles.stateBadge}>失败</Text> : <ActivityIndicator size="small" color="#7b5364" />}
              <Text style={styles.stateTitle}>{viewerState === 'error' ? '载入失败' : '准备中'}</Text>
              <Text style={styles.stateBody}>{viewerDetail}</Text>
            </View>
          </View>
        ) : null}
        <View pointerEvents="box-none" style={styles.overlay}>
          <View style={styles.bottomDock}>
            <Animated.View style={[styles.playerAura, { opacity: energyAnim.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.28] }), transform: [{ scale: energyAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.05] }) }] }]} />
            <View style={styles.playerRow}>
              <Animated.View style={[styles.playerWrap, { transform: [{ translateY: playingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }, { scale: energyAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] }) }] }]}>
                <Pressable onPress={() => void pauseOrResume()} style={styles.playerBar}>
                  <View style={styles.playerTrack}><View style={[styles.playerTrackFill, { width: playbackFill }]} /></View>
                  <View style={styles.actionBubble}><PlayIcon playing={isPlaybackActive} /></View>
                  <View style={styles.playerMeta}>
                    <View style={styles.timeline}><View style={styles.timelineLine} /><View style={[styles.timelineFill, { width: playbackFill }]} /></View>
                    <View style={styles.waveRow}>
                      <View style={[styles.waveBar, { transform: [{ scaleY: 0.52 + wave * 0.4 }] }]} />
                      <View style={[styles.waveBar, { transform: [{ scaleY: 0.7 + wave * 0.56 }] }]} />
                      <View style={[styles.waveBar, { transform: [{ scaleY: 0.48 + wave * 0.34 }] }]} />
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
              <Pressable onPress={() => setSettingsOpen(true)} style={styles.settingsButton}><TuneIcon /></Pressable>
            </View>
          </View>
        </View>
      </View>
      <Modal animationType="fade" transparent visible={settingsOpen} onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setSettingsOpen(false)} />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>动作与镜头</Text>
              <Pressable onPress={() => setSettingsOpen(false)} style={styles.sheetClose}><Text style={styles.sheetCloseText}>×</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>动作</Text>
              <View style={styles.stack}>
                {motionCatalog.map((motion) => (
                  <Pressable key={motion.id} onPress={() => { setSelectedMotionId(motion.id as MotionAssetId); setQueuedStart(true); }} style={[styles.motionRow, motion.id === selectedMotionId ? styles.motionRowActive : null]}>
                    <View style={[styles.motionDot, motion.id === selectedMotionId ? styles.motionDotActive : null]} />
                    <View style={styles.motionCopy}>
                      <View style={styles.motionTitleRow}>
                        <Text style={styles.motionTitle}>{motion.title}</Text>
                        <Text style={[styles.motionTag, motion.id === selectedMotionId ? styles.motionTagActive : null]}>{motion.accent}</Text>
                      </View>
                      <Text style={styles.motionSubtitle}>{motion.subtitle}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>镜头</Text>
              <View style={styles.chips}>
                {cameraPresets.map((preset) => (
                  <Pressable key={preset.id} onPress={() => setCameraPresetId(preset.id)} style={[styles.chip, preset.id === cameraPresetId ? styles.chipActive : null]}>
                    <Text style={[styles.chipText, preset.id === cameraPresetId ? styles.chipTextActive : null]}>{preset.label}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <Text style={styles.label}>循环播放</Text>
                  <Text style={styles.hint}>当前时长 {Math.round(playbackDuration || 0)}s，第二套音乐超出部分会按动作时长截尾。</Text>
                </View>
                <Pressable onPress={() => setIsLooping((value) => !value)} style={[styles.switchTrack, isLooping ? styles.switchTrackActive : null]}>
                  <View style={[styles.switchThumb, isLooping ? styles.switchThumbActive : null]} />
                </Pressable>
              </View>
              <Text style={styles.label}>配布信息</Text>
              <View style={styles.creditCard}>
                {selectedMotion.credits.map((block) => (
                  <View key={block.title} style={styles.creditBlock}>
                    <Text style={styles.creditTitle}>{block.title}</Text>
                    {block.lines.map((line) => <Text key={line} style={styles.creditLine}>{line}</Text>)}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff9fb' },
  stage: { flex: 1, backgroundColor: '#fff9fb', overflow: 'hidden' },
  bgTop: { position: 'absolute', top: -120, left: -40, right: -40, height: 320, borderRadius: 320, backgroundColor: 'rgba(255,231,239,0.68)' },
  bgRight: { position: 'absolute', top: 82, right: -120, width: 320, height: 320, borderRadius: 320, backgroundColor: 'rgba(255,242,247,0.72)' },
  bgBottom: { position: 'absolute', bottom: -150, left: 14, right: 14, height: 260, borderRadius: 300, backgroundColor: 'rgba(255,229,239,0.66)' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  stateOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  stateCard: { alignItems: 'center', gap: 12, paddingHorizontal: 26, paddingVertical: 22, borderRadius: 30, backgroundColor: 'rgba(255,252,253,0.96)', borderWidth: 1, borderColor: 'rgba(203,175,186,0.18)', shadowColor: '#d3aebc', shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 14 },
  stateBadge: { minWidth: 56, textAlign: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: '#3f2732', color: '#fff8fb', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  stateTitle: { color: '#21161c', fontSize: 24, fontWeight: '900' },
  stateBody: { maxWidth: 286, color: '#7f6974', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  bottomDock: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center' },
  playerAura: { position: 'absolute', left: 28, right: 84, bottom: -2, height: 68, borderRadius: 999, backgroundColor: 'rgba(233,205,216,0.7)' },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playerWrap: { width: 280 },
  playerBar: { height: 64, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', borderRadius: 999, backgroundColor: 'rgba(255,251,253,0.97)', borderWidth: 1, borderColor: 'rgba(212,187,196,0.24)', shadowColor: '#d7b4c2', shadowOpacity: 0.18, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 16, overflow: 'hidden' },
  playerTrack: { ...StyleSheet.absoluteFillObject, margin: 5, borderRadius: 999, backgroundColor: 'rgba(245,235,240,0.64)', overflow: 'hidden' },
  playerTrackFill: { height: '100%', borderRadius: 999, backgroundColor: 'rgba(245,220,229,0.92)' },
  actionBubble: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3e2731', shadowColor: '#4a2d39', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  playerMeta: { flex: 1, paddingLeft: 14, paddingRight: 16, justifyContent: 'center', gap: 10 },
  timeline: { height: 10, justifyContent: 'center' },
  timelineLine: { position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 999, backgroundColor: 'rgba(98,61,75,0.08)' },
  timelineFill: { position: 'absolute', left: 0, height: 4, borderRadius: 999, backgroundColor: '#4d303c' },
  waveRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  waveBar: { width: 4, height: 16, borderRadius: 999, backgroundColor: '#4d303c' },
  settingsButton: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,251,253,0.96)', borderWidth: 1, borderColor: 'rgba(212,187,196,0.24)', shadowColor: '#d7b4c2', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  pauseIcon: { width: 16, height: 18, flexDirection: 'row', justifyContent: 'space-between' },
  pauseBar: { width: 5, height: '100%', borderRadius: 3, backgroundColor: '#fffafc' },
  playIcon: { width: 0, height: 0, marginLeft: 3, borderTopWidth: 10, borderBottomWidth: 10, borderLeftWidth: 16, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#fffafc' },
  tuneIcon: { width: 24, gap: 4 },
  tuneRow: { flexDirection: 'row', alignItems: 'center', height: 4 },
  tuneLine: { height: 2, borderRadius: 999, backgroundColor: '#452b36' },
  tuneDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#452b36' },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(30,16,22,0.18)' },
  sheetCard: { maxHeight: '82%', paddingTop: 12, paddingHorizontal: 18, paddingBottom: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: 'rgba(255,248,251,0.98)', borderWidth: 1, borderColor: 'rgba(224,200,209,0.68)' },
  sheetHandle: { alignSelf: 'center', width: 54, height: 5, borderRadius: 999, backgroundColor: 'rgba(146,121,131,0.22)' },
  sheetHead: { marginTop: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: '#25171d', fontSize: 22, fontWeight: '900' },
  sheetClose: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(83,53,64,0.08)' },
  sheetCloseText: { color: '#4d303c', fontSize: 22, lineHeight: 22 },
  sheetScroll: { paddingBottom: 18, gap: 12 },
  label: { color: '#362028', fontSize: 13, fontWeight: '800', letterSpacing: 0.8, marginTop: 8 },
  stack: { gap: 10 },
  motionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(216,191,201,0.28)' },
  motionRowActive: { backgroundColor: 'rgba(255,241,246,0.96)', borderColor: 'rgba(128,85,99,0.18)' },
  motionDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(173,141,153,0.22)' },
  motionDotActive: { backgroundColor: '#4d303c' },
  motionCopy: { flex: 1, marginLeft: 14, gap: 5 },
  motionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  motionTitle: { color: '#2e1b22', fontSize: 17, fontWeight: '800' },
  motionTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(83,53,64,0.06)', color: '#6f5a63', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  motionTagActive: { backgroundColor: '#4d303c', color: '#fff8fb' },
  motionSubtitle: { color: '#8c7480', fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(216,191,201,0.28)' },
  chipActive: { backgroundColor: '#4d303c', borderColor: '#4d303c' },
  chipText: { color: '#5f4a55', fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: '#fff8fb' },
  toggleRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingHorizontal: 16, paddingVertical: 16, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(216,191,201,0.28)' },
  toggleCopy: { flex: 1 },
  hint: { marginTop: 4, color: '#876e79', fontSize: 12, lineHeight: 18 },
  switchTrack: { width: 54, height: 32, borderRadius: 999, paddingHorizontal: 4, justifyContent: 'center', backgroundColor: 'rgba(182,154,165,0.22)' },
  switchTrackActive: { backgroundColor: '#e8ced8' },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff8fb' },
  switchThumbActive: { alignSelf: 'flex-end', backgroundColor: '#4d303c' },
  creditCard: { gap: 14, paddingHorizontal: 16, paddingVertical: 16, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(216,191,201,0.28)' },
  creditBlock: { gap: 6 },
  creditTitle: { color: '#4a313a', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  creditLine: { color: '#775f69', fontSize: 12, lineHeight: 18 },
});
