import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { cacheDirectory, makeDirectoryAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
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

function parseCameraOrbit(cameraOrbit: string) {
  const [azimuthToken = '180deg', polarToken = '68deg', radiusToken = '4.65m'] = cameraOrbit.split(/\s+/);
  return {
    azimuthDeg: Number.parseFloat(azimuthToken),
    polarDeg: Number.parseFloat(polarToken),
    radiusM: Number.parseFloat(radiusToken),
  };
}

function formatCameraOrbit(azimuthDeg: number, polarDeg: number, radiusM: number) {
  return `${Math.round(azimuthDeg * 100) / 100}deg ${Math.round(polarDeg * 100) / 100}deg ${Math.round(radiusM * 100) / 100}m`;
}

const loadingFacts = [
  '你知道吗：永雏塔菲是千早爱音唐笑的音源，唐哭的音源则来自千早爱音声优本人直播',
  '小菲的生日是2022-05-26，那一天小菲第一次出现在塔菲直播间',
  '小菲有很多变种，包括侦探菲、水手服小菲、偶像服小菲等等',
  '在有很多个小菲一起动的直播里面，通常是塔菲字幕组的成员在远程通过vrchat游戏控制其他的小菲',
] as const;

function pickRandomFactIndex(excludeIndex?: number) {
  if (loadingFacts.length <= 1) return 0;

  let nextIndex = Math.floor(Math.random() * loadingFacts.length);
  while (nextIndex === excludeIndex) {
    nextIndex = Math.floor(Math.random() * loadingFacts.length);
  }
  return nextIndex;
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

function LoopIcon({ active }: { active: boolean }) {
  return (
    <View style={styles.loopIcon}>
      <View style={[styles.loopArcTop, active ? styles.loopArcTopActive : null]} />
      <View style={[styles.loopArrowTop, active ? styles.loopArrowActive : null]} />
      <View style={[styles.loopArcBottom, active ? styles.loopArcBottomActive : null]} />
      <View style={[styles.loopArrowBottom, active ? styles.loopArrowActive : null]} />
    </View>
  );
}

function MotionGlyph({ icon, active }: { icon: 'ribbon' | 'burst'; active: boolean }) {
  if (icon === 'burst') {
    return (
      <View style={styles.motionBurst}>
        <View style={[styles.motionBurstCore, active ? styles.motionBurstCoreActive : null]} />
        <View style={[styles.motionBurstRay, styles.motionBurstRayTop, active ? styles.motionBurstRayActive : null]} />
        <View style={[styles.motionBurstRay, styles.motionBurstRayRight, active ? styles.motionBurstRayActive : null]} />
        <View style={[styles.motionBurstRay, styles.motionBurstRayBottom, active ? styles.motionBurstRayActive : null]} />
        <View style={[styles.motionBurstRay, styles.motionBurstRayLeft, active ? styles.motionBurstRayActive : null]} />
      </View>
    );
  }

  return (
    <View style={styles.motionRibbon}>
      <View style={[styles.motionRibbonKnot, active ? styles.motionRibbonKnotActive : null]} />
      <View style={[styles.motionRibbonWing, styles.motionRibbonWingLeft, active ? styles.motionRibbonWingActive : null]} />
      <View style={[styles.motionRibbonWing, styles.motionRibbonWingRight, active ? styles.motionRibbonWingActive : null]} />
      <View style={[styles.motionRibbonTail, styles.motionRibbonTailLeft, active ? styles.motionRibbonTailActive : null]} />
      <View style={[styles.motionRibbonTail, styles.motionRibbonTailRight, active ? styles.motionRibbonTailActive : null]} />
    </View>
  );
}

function MotionPulse({
  active,
  energyAnim,
}: {
  active: boolean;
  energyAnim: Animated.Value;
}) {
  const firstBar = active
    ? energyAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.18] })
    : 0.72;
  const secondBar = active
    ? energyAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.42] })
    : 0.94;
  const thirdBar = active
    ? energyAnim.interpolate({ inputRange: [0, 1], outputRange: [0.64, 1.06] })
    : 0.68;

  return (
    <View style={styles.motionPulse}>
      <Animated.View style={[styles.motionPulseBar, { transform: [{ scaleY: firstBar }] }]} />
      <Animated.View style={[styles.motionPulseBar, { transform: [{ scaleY: secondBar }] }]} />
      <Animated.View style={[styles.motionPulseBar, { transform: [{ scaleY: thirdBar }] }]} />
    </View>
  );
}

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const playingAnim = useRef(new Animated.Value(0)).current;
  const energyAnim = useRef(new Animated.Value(0)).current;
  const loopAnim = useRef(new Animated.Value(1)).current;
  const settingsAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const waveLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const assetUriCacheRef = useRef(new Map<number, string>());
  const assetPromiseCacheRef = useRef(new Map<number, Promise<string>>());

  const [selectedMotionId, setSelectedMotionId] = useState<MotionAssetId>(motionCatalog[0].id);
  const [modelUri, setModelUri] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [viewerPageUri, setViewerPageUri] = useState<string | null>(null);
  const [viewerState, setViewerState] = useState<ViewerState>('booting');
  const [viewerDetail, setViewerDetail] = useState('正在布置灯光、动作和配乐。');
  const [isLooping, setIsLooping] = useState(true);
  const [isPlaybackActive, setIsPlaybackActive] = useState(false);
  const [queuedStart, setQueuedStart] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [cameraPresetId, setCameraPresetId] = useState<CameraPresetId>('full');
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackEnergy, setPlaybackEnergy] = useState(0);
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [didFinish, setDidFinish] = useState(false);
  const [loadingFactIndex, setLoadingFactIndex] = useState(() => pickRandomFactIndex());

  const selectedMotion = useMemo(
    () => motionCatalog.find((motion) => motion.id === selectedMotionId) ?? motionCatalog[0],
    [selectedMotionId]
  );
  const selectedCamera = useMemo(
    () => cameraPresets.find((preset) => preset.id === cameraPresetId) ?? cameraPresets[0],
    [cameraPresetId]
  );
  const effectiveCameraOrbit = useMemo(() => {
    const baseOrbit = parseCameraOrbit(selectedCamera.cameraOrbit);
    return formatCameraOrbit(
      baseOrbit.azimuthDeg + selectedMotion.cameraAzimuthOffsetDeg,
      baseOrbit.polarDeg,
      baseOrbit.radiusM
    );
  }, [selectedCamera.cameraOrbit, selectedMotion.cameraAzimuthOffsetDeg]);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (settingsOpen) {
      setSettingsVisible(true);
      settingsAnim.stopAnimation();
      Animated.spring(settingsAnim, {
        toValue: 1,
        friction: 13,
        tension: 110,
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!settingsVisible) {
      settingsAnim.setValue(0);
      return;
    }

    settingsAnim.stopAnimation();
    Animated.timing(settingsAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setSettingsVisible(false);
    });
  }, [settingsAnim, settingsOpen, settingsVisible]);

  useEffect(() => {
    if (viewerState === 'ready' || viewerState === 'error') return;
    const timer = setInterval(() => {
      setLoadingFactIndex((value) => pickRandomFactIndex(value));
    }, 1400);
    return () => clearInterval(timer);
  }, [viewerState]);

  useEffect(() => {
    setLoadingFactIndex((value) => pickRandomFactIndex(value));
  }, [selectedMotionId]);

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedShow() {
      setViewerState('loading');
      setViewerDetail(`正在为 ${selectedMotion.title} 整理动作和配乐。`);
      setIsPlaybackActive(false);
      setPlaybackProgress(0);
      setPlaybackCurrentTime(0);
      setPlaybackDuration(0);
      setPlaybackEnergy(0);
      setDidFinish(false);
      setModelUri(null);
      setAudioUri(null);
      setViewerPageUri(null);

      try {
        const [resolvedModelUri, resolvedAudioUri] = await Promise.all([
          resolveCachedAsset(selectedMotion.glbModule),
          resolveCachedAsset(selectedMotion.audioModule),
        ]);

        if (!cancelled) {
          setModelUri(resolvedModelUri);
          setAudioUri(resolvedAudioUri);
          setViewerDetail(`正在挂载 ${selectedMotion.title} 舞台。`);
        }
      } catch {
        if (!cancelled) {
          setViewerState('error');
          setViewerDetail(`${selectedMotion.title} 的本地资源加载失败，请稍后重试。`);
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

  useEffect(() => {
    Animated.spring(loopAnim, {
      toValue: isLooping ? 1 : 0,
      friction: 12,
      tension: 110,
      useNativeDriver: true,
    }).start();
  }, [isLooping, loopAnim]);

  useEffect(() => {
    waveLoopRef.current?.stop();
    waveLoopRef.current = null;
    waveAnim.stopAnimation();

    if (!isPlaybackActive) {
      waveAnim.setValue(0);
      return;
    }

    waveAnim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 520,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 640,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    waveLoopRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
      waveLoopRef.current = null;
    };
  }, [isPlaybackActive, waveAnim]);

  useEffect(() => {
    const keepAwakeTag = 'naiwa-playback';

    if (!isPlaybackActive) {
      void deactivateKeepAwake(keepAwakeTag).catch(() => {});
      return;
    }

    void activateKeepAwakeAsync(keepAwakeTag).catch(() => {});
    return () => {
      void deactivateKeepAwake(keepAwakeTag).catch(() => {});
    };
  }, [isPlaybackActive]);

  function postViewerMessage(message: Record<string, unknown>) {
    webViewRef.current?.postMessage(JSON.stringify(message));
  }

  async function resolveCachedAsset(moduleId: number | null) {
    if (!moduleId) return null;

    const cachedUri = assetUriCacheRef.current.get(moduleId);
    if (cachedUri) return cachedUri;

    const pending = assetPromiseCacheRef.current.get(moduleId);
    if (pending) return pending;

    const promise = resolveAssetUri(moduleId).then((uri) => {
      assetUriCacheRef.current.set(moduleId, uri);
      assetPromiseCacheRef.current.delete(moduleId);
      return uri;
    });
    assetPromiseCacheRef.current.set(moduleId, promise);
    return promise;
  }

  function animateSheetSelection() {
    LayoutAnimation.configureNext({
      duration: 220,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  }

  function openSettings() {
    if (settingsOpen) return;
    setSettingsVisible(true);
    setSettingsOpen(true);
  }

  function closeSettings() {
    setSettingsOpen(false);
  }

  function buildViewerPayload() {
    return {
      animationSpeed: 1,
      cameraOrbit: effectiveCameraOrbit,
      cameraTarget: selectedMotion.cameraTargetM ?? null,
      cameraTargetOffsetX: selectedMotion.cameraTargetOffsetXM ?? 0,
      isLooping,
      expressionPreset: selectedMotion.expressionPreset ?? 'default',
    };
  }

  function handleSelectMotion(motionId: MotionAssetId) {
    if (motionId === selectedMotionId) {
      closeSettings();
      return;
    }

    animateSheetSelection();
    setCameraPresetId('full');
    setSelectedMotionId(motionId);
    setQueuedStart(false);
    closeSettings();
  }

  function handleSelectCamera(presetId: CameraPresetId) {
    if (presetId === cameraPresetId) return;
    animateSheetSelection();
    setCameraPresetId(presetId);
  }

  function handleToggleLoop() {
    animateSheetSelection();
    setIsLooping((value) => !value);
  }

  useEffect(() => {
    let cancelled = false;
    const allModuleIds = Array.from(
      new Set(
        motionCatalog.flatMap((motion) =>
          motion.audioModule ? [motion.glbModule, motion.audioModule] : [motion.glbModule]
        )
      )
    );

    async function prewarmAssets() {
      for (const moduleId of allModuleIds) {
        if (cancelled) return;
        await resolveCachedAsset(moduleId).catch(() => null);
      }
    }

    void prewarmAssets();
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (viewerState === 'ready') {
      postViewerMessage({ type: 'configure', ...buildViewerPayload() });
    }
  }, [effectiveCameraOrbit, isLooping, selectedMotion.expressionPreset, viewerState]);

  useEffect(() => {
    if (viewerState === 'ready' && queuedStart) void runShowFromStart();
  }, [queuedStart, viewerState]);

  const html = useMemo(
    () =>
      createModelViewerHtml({
        modelUri,
        audioUri,
        posterText: '离线舞台还没有完成挂载。',
        initialAnimationSpeed: 1,
        initialCameraOrbit: effectiveCameraOrbit,
        initialCameraTarget: selectedMotion.cameraTargetM ?? null,
      }),
    [audioUri, effectiveCameraOrbit, modelUri, selectedMotion.cameraTargetM]
  );
  const viewerWebViewKey = viewerPageUri ?? `inline-${hashString(html)}`;

  useEffect(() => {
    let cancelled = false;

    async function writeViewerHtml() {
      if (!cacheDirectory) {
        if (!cancelled) {
          setViewerPageUri(null);
          setViewerDetail('设备暂时没有可用缓存目录。');
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
          setViewerDetail('离线舞台页面写入失败，请稍后重试。');
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
        if (typeof payload.detail === 'string') {
          setViewerDetail(payload.detail);
        } else if (payload.detail && typeof payload.detail === 'object' && 'message' in payload.detail) {
          setViewerDetail(payload.detail.message ?? '舞台已准备好。');
        } else {
          setViewerDetail('舞台已准备好。');
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
        if (typeof detail.progress === 'number' && Number.isFinite(detail.progress)) {
          setPlaybackProgress(clamp01(detail.progress));
        }
        if (typeof detail.currentTime === 'number' && Number.isFinite(detail.currentTime)) {
          setPlaybackCurrentTime(detail.currentTime);
        }
        if (typeof detail.duration === 'number' && Number.isFinite(detail.duration)) {
          setPlaybackDuration(detail.duration);
        }
        if (typeof detail.energy === 'number' && Number.isFinite(detail.energy)) {
          setPlaybackEnergy(clamp01(detail.energy));
        }
        if (typeof detail.didFinish === 'boolean') setDidFinish(detail.didFinish);
      }
    } catch {
      // Ignore malformed bridge messages.
    }
  }

  const playbackFill = `${Math.round(clamp01(playbackProgress) * 1000) / 10}%` as `${number}%`;
  const waveLift = clamp01(playbackEnergy) * 0.24;
  const wavePulseOne = waveAnim.interpolate({
    inputRange: [0, 0.32, 0.66, 1],
    outputRange: [0.52 + waveLift, 1.12 + waveLift, 0.76 + waveLift, 0.58 + waveLift],
  });
  const wavePulseTwo = waveAnim.interpolate({
    inputRange: [0, 0.28, 0.62, 1],
    outputRange: [0.86 + waveLift, 0.62 + waveLift, 1.18 + waveLift, 0.78 + waveLift],
  });
  const wavePulseThree = waveAnim.interpolate({
    inputRange: [0, 0.4, 0.74, 1],
    outputRange: [0.48 + waveLift, 0.98 + waveLift, 0.68 + waveLift, 1.04 + waveLift],
  });
  const loadingSummary =
    viewerState === 'error'
      ? viewerDetail
      : `正在为 ${selectedMotion.title} 调整灯光、动作和配乐。`;
  const activeFact = loadingFacts[loadingFactIndex % loadingFacts.length];
  const sheetBackdropOpacity = settingsAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const sheetTranslateY = settingsAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
  const sheetScale = settingsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] });
  const sheetOpacity = settingsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor="#fffafd" translucent={false} />
      <View style={styles.stage}>
        <View style={styles.bgTop} />
        <View style={styles.bgLeft} />
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
              {viewerState === 'error' ? (
                <Text style={styles.stateBadge}>失败</Text>
              ) : (
                <ActivityIndicator size="small" color="#7b5364" />
              )}
              <Text style={styles.stateTitle}>{viewerState === 'error' ? '载入失败' : '准备中'}</Text>
              <Text style={styles.stateBody}>{loadingSummary}</Text>
              {viewerState !== 'error' ? (
                <View style={styles.stateFactCard}>
                  <Text style={styles.stateFactText}>{activeFact}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
        <View pointerEvents="box-none" style={styles.overlay}>
          <View style={styles.bottomDock}>
            <Animated.View
              style={[
                styles.playerAura,
                {
                  opacity: energyAnim.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.28] }),
                  transform: [
                    { scale: energyAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.05] }) },
                  ],
                },
              ]}
            />
            <View style={styles.playerRow}>
              <Animated.View
                style={[
                  styles.playerWrap,
                  {
                    transform: [
                      { translateY: playingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
                      { scale: energyAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] }) },
                    ],
                  },
                ]}
              >
                <Pressable onPress={() => void pauseOrResume()} style={styles.playerBar}>
                  <View style={styles.actionBubble}>
                    <PlayIcon playing={isPlaybackActive} />
                  </View>
                  <View style={styles.playerMeta}>
                    <View style={styles.timeline}>
                      <View style={styles.timelineLine} />
                      <View style={[styles.timelineFill, { width: playbackFill }]} />
                    </View>
                    <View style={styles.waveRow}>
                      <Animated.View style={[styles.waveBar, { transform: [{ scaleY: wavePulseOne }] }]} />
                      <Animated.View style={[styles.waveBar, { transform: [{ scaleY: wavePulseTwo }] }]} />
                      <Animated.View style={[styles.waveBar, { transform: [{ scaleY: wavePulseThree }] }]} />
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
              <Pressable onPress={openSettings} style={styles.settingsButton}>
                <TuneIcon />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
      <Modal animationType="none" transparent visible={settingsVisible} onRequestClose={closeSettings}>
        <View style={styles.sheetRoot}>
          <Animated.View style={[styles.sheetBackdrop, { opacity: sheetBackdropOpacity }]} />
          <Pressable style={styles.sheetBackdropPressable} onPress={closeSettings} />
          <Animated.View
            style={[
              styles.sheetCard,
              {
                opacity: sheetOpacity,
                transform: [{ translateY: sheetTranslateY }, { scale: sheetScale }],
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>舞台设置</Text>
              <Pressable onPress={closeSettings} style={styles.sheetClose}>
                <Text style={styles.sheetCloseText}>×</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>动作</Text>
              <View style={styles.stack}>
                {motionCatalog.map((motion) => {
                  const isActive = motion.id === selectedMotionId;
                  const badgeLabel = isActive ? '当前' : motion.accent;
                  const durationLabel =
                    isActive && playbackDuration > 0.1 ? `${Math.round(playbackDuration)}s` : null;

                  return (
                    <Pressable
                      key={motion.id}
                      onPress={() => handleSelectMotion(motion.id as MotionAssetId)}
                      style={({ pressed }) => [
                        styles.motionCardPressable,
                        pressed ? styles.motionCardPressablePressed : null,
                      ]}
                    >
                      <View
                        style={[
                          styles.motionCard,
                          isActive ? styles.motionCardActive : null,
                          { borderColor: isActive ? '#d7b9c6' : motion.theme.stroke },
                        ]}
                      >
                        <View style={[styles.motionCardGlow, { backgroundColor: motion.theme.glow }]} />
                        <View style={[styles.motionCardOrbPrimary, { backgroundColor: motion.theme.wash }]} />
                        <View style={[styles.motionCardOrbSecondary, { backgroundColor: motion.theme.orb }]} />
                        <View style={styles.motionCardHeader}>
                          <View style={[styles.motionGlyphWrap, { backgroundColor: motion.theme.badge }]}>
                            <MotionGlyph icon={motion.theme.icon} active={isActive} />
                          </View>
                          <View style={[styles.motionPill, isActive ? styles.motionPillActive : null]}>
                            <Text style={[styles.motionPillText, isActive ? styles.motionPillTextActive : null]}>
                              {badgeLabel}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.motionCopy}>
                          <View style={styles.motionTitleRow}>
                            <Text style={styles.motionTitle}>{motion.title}</Text>
                            {durationLabel ? <Text style={styles.motionDuration}>{durationLabel}</Text> : null}
                          </View>
                          <Text style={styles.motionSubtitle}>{motion.subtitle}</Text>
                        </View>
                        <View style={styles.motionFooter}>
                          <View style={styles.motionSignatureRow}>
                            <MotionPulse active={isActive} energyAnim={energyAnim} />
                            <Text style={styles.motionSignature}>{motion.signature}</Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.label}>镜头</Text>
              <View style={styles.chips}>
                {cameraPresets.map((preset) => (
                  <Pressable
                    key={preset.id}
                    onPress={() => handleSelectCamera(preset.id)}
                    style={[styles.chip, preset.id === cameraPresetId ? styles.chipActive : null]}
                  >
                    <Text style={[styles.chipText, preset.id === cameraPresetId ? styles.chipTextActive : null]}>
                      {preset.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLead}>
                  <View style={[styles.toggleGlyph, isLooping ? styles.toggleGlyphActive : null]}>
                    <LoopIcon active={isLooping} />
                  </View>
                  <Text style={styles.toggleTitle}>循环播放</Text>
                </View>
                <Pressable onPress={handleToggleLoop} style={[styles.switchTrack, isLooping ? styles.switchTrackActive : null]}>
                  <Animated.View
                    style={[
                      styles.switchThumb,
                      {
                        transform: [
                          { translateX: loopAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) },
                        ],
                      },
                    ]}
                  />
                </Pressable>
              </View>
              <Text style={styles.label}>配布信息</Text>
              <View style={styles.creditCard}>
                {selectedMotion.credits.map((block) => (
                  <View key={block.title} style={styles.creditBlock}>
                    <Text style={styles.creditTitle}>{block.title}</Text>
                    {block.lines.map((line) => (
                      <Text key={line} style={styles.creditLine}>
                        {line}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fffafd' },
  stage: { flex: 1, backgroundColor: '#fffafd', overflow: 'hidden' },
  bgTop: {
    position: 'absolute',
    top: -132,
    left: -48,
    right: -52,
    height: 340,
    borderRadius: 340,
    backgroundColor: 'rgba(255,232,240,0.52)',
  },
  bgLeft: {
    position: 'absolute',
    top: 228,
    left: -126,
    width: 292,
    height: 292,
    borderRadius: 292,
    backgroundColor: 'rgba(255,242,247,0.44)',
  },
  bgRight: {
    position: 'absolute',
    top: 78,
    right: -124,
    width: 328,
    height: 328,
    borderRadius: 328,
    backgroundColor: 'rgba(244,247,255,0.38)',
  },
  bgBottom: {
    position: 'absolute',
    bottom: -156,
    left: 12,
    right: 12,
    height: 272,
    borderRadius: 320,
    backgroundColor: 'rgba(255,229,239,0.42)',
  },
  webview: { flex: 1, backgroundColor: 'transparent' },
  stateOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  stateCard: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 22,
    borderRadius: 30,
    backgroundColor: 'rgba(255,253,254,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(225,201,211,0.22)',
    shadowColor: '#eed7e0',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  stateBadge: {
    minWidth: 56,
    textAlign: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#3f2732',
    color: '#fff8fb',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  stateTitle: { color: '#21161c', fontSize: 24, fontWeight: '900' },
  stateBody: {
    maxWidth: 286,
    color: '#7f6974',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  stateFactCard: {
    marginTop: 4,
    maxWidth: 292,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,245,249,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(229,208,217,0.36)',
  },
  stateFactText: {
    color: '#6a5360',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  bottomDock: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center' },
  playerAura: {
    position: 'absolute',
    left: 24,
    right: 82,
    bottom: -4,
    height: 70,
    borderRadius: 999,
    backgroundColor: 'rgba(244,220,232,0.56)',
  },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playerWrap: { width: 292 },
  playerBar: {
    height: 64,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255,253,254,0.985)',
    borderWidth: 1,
    borderColor: 'rgba(229,208,217,0.28)',
    shadowColor: '#ead6de',
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  actionBubble: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4a2d39',
    shadowColor: '#9e7d8c',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  playerMeta: { flex: 1, paddingLeft: 14, paddingRight: 16, justifyContent: 'center', gap: 10 },
  timeline: { height: 10, justifyContent: 'center' },
  timelineLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(98,61,75,0.08)',
  },
  timelineFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#6a4454',
  },
  waveRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  waveBar: { width: 4, height: 16, borderRadius: 999, backgroundColor: '#6a4454' },
  settingsButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,253,254,0.985)',
    borderWidth: 1,
    borderColor: 'rgba(229,208,217,0.28)',
    shadowColor: '#ead6de',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  pauseIcon: { width: 16, height: 18, flexDirection: 'row', justifyContent: 'space-between' },
  pauseBar: { width: 5, height: '100%', borderRadius: 3, backgroundColor: '#fffafc' },
  playIcon: {
    width: 0,
    height: 0,
    marginLeft: 3,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 16,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#fffafc',
  },
  tuneIcon: { width: 24, gap: 4 },
  tuneRow: { flexDirection: 'row', alignItems: 'center', height: 4 },
  tuneLine: { height: 2, borderRadius: 999, backgroundColor: '#452b36' },
  tuneDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#452b36' },
  loopIcon: { width: 22, height: 18 },
  loopArcTop: {
    position: 'absolute',
    top: 0,
    left: 2,
    width: 14,
    height: 7,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderTopWidth: 2.4,
    borderLeftWidth: 2.4,
    borderRightWidth: 2.4,
    borderColor: '#8f7480',
    borderBottomWidth: 0,
  },
  loopArcTopActive: { borderColor: '#4d303c' },
  loopArcBottom: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    width: 14,
    height: 7,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderBottomWidth: 2.4,
    borderLeftWidth: 2.4,
    borderRightWidth: 2.4,
    borderColor: '#8f7480',
    borderTopWidth: 0,
  },
  loopArcBottomActive: { borderColor: '#4d303c' },
  loopArrowTop: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#8f7480',
  },
  loopArrowBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderRightWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#8f7480',
  },
  loopArrowActive: { borderLeftColor: '#4d303c', borderRightColor: '#4d303c' },
  motionRibbon: { width: 26, height: 24, alignItems: 'center', justifyContent: 'center' },
  motionRibbonKnot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8d6a78', zIndex: 2 },
  motionRibbonKnotActive: { backgroundColor: '#4d303c' },
  motionRibbonWing: {
    position: 'absolute',
    top: 4,
    width: 12,
    height: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(160,122,136,0.34)',
  },
  motionRibbonWingLeft: { left: 0, transform: [{ rotate: '-18deg' }] },
  motionRibbonWingRight: { right: 0, transform: [{ rotate: '18deg' }] },
  motionRibbonWingActive: { backgroundColor: 'rgba(77,48,60,0.24)' },
  motionRibbonTail: {
    position: 'absolute',
    bottom: 0,
    width: 6,
    height: 11,
    borderRadius: 4,
    backgroundColor: 'rgba(160,122,136,0.34)',
  },
  motionRibbonTailLeft: { left: 6, transform: [{ rotate: '10deg' }] },
  motionRibbonTailRight: { right: 6, transform: [{ rotate: '-10deg' }] },
  motionRibbonTailActive: { backgroundColor: 'rgba(77,48,60,0.22)' },
  motionBurst: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  motionBurstCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9c7f74' },
  motionBurstCoreActive: { backgroundColor: '#4d303c' },
  motionBurstRay: {
    position: 'absolute',
    width: 3,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(160,122,136,0.34)',
  },
  motionBurstRayTop: { top: 0 },
  motionBurstRayRight: { right: 0, transform: [{ rotate: '90deg' }] },
  motionBurstRayBottom: { bottom: 0 },
  motionBurstRayLeft: { left: 0, transform: [{ rotate: '90deg' }] },
  motionBurstRayActive: { backgroundColor: 'rgba(77,48,60,0.22)' },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(41,22,30,0.16)' },
  sheetBackdropPressable: { ...StyleSheet.absoluteFillObject },
  sheetCard: {
    maxHeight: '82%',
    paddingTop: 12,
    paddingHorizontal: 18,
    paddingBottom: 20,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: 'rgba(255,248,251,0.985)',
    borderWidth: 1,
    borderColor: 'rgba(233,210,219,0.84)',
    shadowColor: '#f1dbe4',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 54,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(146,121,131,0.18)',
  },
  sheetHead: {
    marginTop: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: { color: '#25171d', fontSize: 23, fontWeight: '900' },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(83,53,64,0.06)',
  },
  sheetCloseText: { color: '#4d303c', fontSize: 22, lineHeight: 22 },
  sheetScroll: { paddingBottom: 18, gap: 14 },
  label: { color: '#3c252e', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  stack: { gap: 12 },
  motionCardPressable: { borderRadius: 28 },
  motionCardPressablePressed: { opacity: 0.96, transform: [{ scale: 0.992 }] },
  motionCard: {
    overflow: 'hidden',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    shadowColor: '#edd7e0',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  motionCardActive: {
    backgroundColor: 'rgba(255,250,252,0.97)',
    borderColor: 'rgba(142,102,117,0.18)',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  motionCardGlow: {
    position: 'absolute',
    top: -44,
    left: -18,
    width: 190,
    height: 132,
    borderRadius: 999,
    opacity: 0.82,
  },
  motionCardOrbPrimary: {
    position: 'absolute',
    right: -20,
    top: 10,
    width: 124,
    height: 124,
    borderRadius: 124,
    opacity: 0.62,
  },
  motionCardOrbSecondary: {
    position: 'absolute',
    right: 48,
    bottom: -36,
    width: 104,
    height: 104,
    borderRadius: 104,
    opacity: 0.48,
  },
  motionCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  motionGlyphWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  motionPill: {
    minWidth: 58,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(224,200,209,0.3)',
  },
  motionPillActive: { backgroundColor: '#4d303c', borderColor: '#4d303c' },
  motionPillText: {
    color: '#745d67',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  motionPillTextActive: { color: '#fff9fb' },
  motionCopy: { marginTop: 16, gap: 6 },
  motionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  motionTitle: { flex: 1, color: '#2e1b22', fontSize: 20, fontWeight: '900', letterSpacing: 0.2 },
  motionSubtitle: { color: '#8b7380', fontSize: 14, fontWeight: '600' },
  motionFooter: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  motionSignatureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  motionSignature: { color: '#715a64', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  motionDuration: { color: '#5a3947', fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },
  motionPulse: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 16 },
  motionPulseBar: { width: 4, height: 16, borderRadius: 999, backgroundColor: '#6a4454' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(222,198,208,0.34)',
  },
  chipActive: { backgroundColor: 'rgba(84,53,65,0.96)', borderColor: 'rgba(84,53,65,0.96)' },
  chipText: { color: '#5f4a55', fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: '#fff8fb' },
  toggleRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(222,198,208,0.34)',
  },
  toggleLead: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  toggleGlyph: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,245,249,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(230,209,217,0.42)',
  },
  toggleGlyphActive: { backgroundColor: 'rgba(255,235,242,0.94)', borderColor: 'rgba(188,155,168,0.3)' },
  toggleTitle: { color: '#302027', fontSize: 15, fontWeight: '800' },
  switchTrack: {
    width: 58,
    height: 34,
    borderRadius: 999,
    paddingHorizontal: 5,
    justifyContent: 'center',
    backgroundColor: 'rgba(190,162,173,0.2)',
  },
  switchTrackActive: { backgroundColor: '#eed7e0' },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4d303c',
    shadowColor: '#9e7d8c',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  creditCard: {
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(222,198,208,0.34)',
  },
  creditBlock: { gap: 6 },
  creditTitle: { color: '#4a313a', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  creditLine: { color: '#775f69', fontSize: 12, lineHeight: 18 },
});
