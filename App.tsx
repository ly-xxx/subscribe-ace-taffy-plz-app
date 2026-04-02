import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { cacheDirectory, makeDirectoryAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';

import { laughAudioModule, modelGlbModule, resolveAssetUri } from './src/assets';
import { createModelViewerHtml } from './src/modelViewerHtml';
import { cameraPresets, type CameraPresetId } from './src/showConfig';

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash).toString(36);
}

type ViewerState = 'booting' | 'loading' | 'ready' | 'error';

function DockButton({
  icon,
  onPress,
  active = false,
  large = false,
}: {
  icon: string;
  onPress: () => void;
  active?: boolean;
  large?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.dockButton,
        large ? styles.dockButtonLarge : null,
        active ? styles.dockButtonActive : null,
      ]}
    >
      <Text
        style={[
          styles.dockButtonIcon,
          large ? styles.dockButtonIconLarge : null,
          active ? styles.dockButtonIconActive : null,
        ]}
      >
        {icon}
      </Text>
    </Pressable>
  );
}

function CameraChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.cameraChip, active ? styles.cameraChipActive : null]}>
      <Text style={[styles.cameraChipLabel, active ? styles.cameraChipLabelActive : null]}>
        {label}
      </Text>
    </Pressable>
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
  const autoStartedRef = useRef(false);

  const [modelUri, setModelUri] = useState<string | null>(null);
  const [viewerPageUri, setViewerPageUri] = useState<string | null>(null);
  const [viewerState, setViewerState] = useState<ViewerState>('booting');
  const [viewerDetail, setViewerDetail] = useState('正在准备离线舞台。');
  const [isLooping, setIsLooping] = useState(true);
  const [queuedStart, setQueuedStart] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cameraPresetId, setCameraPresetId] = useState<CameraPresetId>('full');

  const selectedCamera = useMemo(
    () => cameraPresets.find((preset) => preset.id === cameraPresetId) ?? cameraPresets[0],
    [cameraPresetId]
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
        // Some Android devices reject parts of the audio mode request.
      }
    }

    async function loadModel() {
      if (!modelGlbModule) {
        setModelUri(null);
        setViewerDetail('没有找到 GLB 资源。');
        setViewerState('error');
        return;
      }

      try {
        const uri = await resolveAssetUri(modelGlbModule);
        if (!cancelled) {
          setModelUri(uri);
          setViewerState('loading');
          setViewerDetail('模型已找到，正在挂载离线舞台。');
        }
      } catch {
        if (!cancelled) {
          setViewerDetail('GLB 资源解析失败。');
          setViewerState('error');
        }
      }
    }

    void prepareAudioMode();
    void loadModel();

    return () => {
      cancelled = true;
    };
  }, []);

  function postViewerMessage(message: Record<string, unknown>) {
    webViewRef.current?.postMessage(JSON.stringify(message));
  }

  function buildViewerPayload() {
    return {
      animationSpeed: 1,
      cameraOrbit: selectedCamera.cameraOrbit,
    };
  }

  async function runShowFromStart() {
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
      // Seeking can race with initial decoder warmup.
    }

    player.play();
    postViewerMessage({
      type: 'playFromStart',
      ...buildViewerPayload(),
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
      await runShowFromStart();
      return;
    }

    player.play();
    postViewerMessage({
      type: 'resume',
      ...buildViewerPayload(),
    });
  }

  useEffect(() => {
    if (viewerState !== 'ready') {
      return;
    }

    postViewerMessage({
      type: 'configure',
      ...buildViewerPayload(),
    });
  }, [selectedCamera.cameraOrbit, viewerState]);

  useEffect(() => {
    if (viewerState === 'ready' && queuedStart) {
      void runShowFromStart();
    }
  }, [queuedStart, viewerState]);

  useEffect(() => {
    if (viewerState !== 'ready' || autoStartedRef.current) {
      return;
    }

    autoStartedRef.current = true;
    void runShowFromStart();
  }, [viewerState]);

  useEffect(() => {
    if (status.didJustFinish && !finishHandledRef.current) {
      finishHandledRef.current = true;

      if (isLooping) {
        void runShowFromStart();
      }
    }

    if (!status.didJustFinish) {
      finishHandledRef.current = false;
    }
  }, [isLooping, status.didJustFinish]);

  const html = useMemo(
    () =>
      createModelViewerHtml({
        modelUri,
        posterText: '离线 GLB 尚未完成挂载。',
        initialAnimationSpeed: 1,
        initialCameraOrbit: cameraPresets[0].cameraOrbit,
      }),
    [modelUri]
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

        if (!cancelled) {
          setViewerPageUri(fileUri);
        }
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
        detail?: string | { message?: string };
      };

      if (payload.type === 'viewer-loading') {
        setViewerState('loading');
        if (typeof payload.detail === 'string') {
          setViewerDetail(payload.detail);
        }
        return;
      }

      if (payload.type === 'viewer-ready') {
        setViewerState('ready');
        if (typeof payload.detail === 'string') {
          setViewerDetail(payload.detail);
        } else if (payload.detail && typeof payload.detail === 'object') {
          setViewerDetail(payload.detail.message ?? '离线舞台已完成挂载。');
        }
        return;
      }

      if (payload.type === 'viewer-error') {
        setViewerState('error');
        setViewerDetail(
          typeof payload.detail === 'string' ? payload.detail : '3D 舞台初始化失败。'
        );
      }
    } catch {
      // Ignore non-JSON bridge messages.
    }
  }

  const playIcon = queuedStart ? '•' : status.playing ? '❚❚' : '▶';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.stage}>
        <View style={styles.glowWarm} />
        <View style={styles.glowCool} />
        <View style={styles.glowBounce} />

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
                <View style={styles.stateBadgeError}>
                  <Text style={styles.stateBadgeText}>失败</Text>
                </View>
              ) : (
                <ActivityIndicator size="small" color="#c58a27" />
              )}

              <Text style={styles.stateTitle}>
                {viewerState === 'error' ? '载入失败' : '准备中'}
              </Text>
              <Text style={styles.stateBody}>{viewerDetail}</Text>
            </View>
          </View>
        ) : null}

        <View pointerEvents="box-none" style={styles.overlay}>
          <View style={styles.topFade} />

          <View style={styles.bottomDock}>
            <View style={styles.dockGroup}>
              <DockButton
                icon="↻"
                onPress={() => setIsLooping((value) => !value)}
                active={isLooping}
              />
              <View style={styles.dockDivider} />
              <DockButton icon={playIcon} onPress={() => void pauseOrResume()} large active />
            </View>

            <DockButton icon="⋯" onPress={() => setSettingsOpen(true)} />
          </View>
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={settingsOpen}
        onRequestClose={() => setSettingsOpen(false)}
      >
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setSettingsOpen(false)} />

          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>镜头</Text>
              <Pressable onPress={() => setSettingsOpen(false)} style={styles.sheetCloseButton}>
                <Text style={styles.sheetCloseButtonText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.cameraRow}>
              {cameraPresets.map((preset) => (
                <CameraChip
                  key={preset.id}
                  label={preset.label}
                  active={preset.id === cameraPresetId}
                  onPress={() => setCameraPresetId(preset.id)}
                />
              ))}
            </View>

            <View style={styles.sheetActionRow}>
              <Pressable
                onPress={() => setIsLooping((value) => !value)}
                style={[styles.sheetActionButton, isLooping ? styles.sheetActionButtonActive : null]}
              >
                <Text
                  style={[
                    styles.sheetActionButtonLabel,
                    isLooping ? styles.sheetActionButtonLabelActive : null,
                  ]}
                >
                  循环
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setSettingsOpen(false);
                  void runShowFromStart();
                }}
                style={[styles.sheetActionButton, styles.sheetActionButtonPrimary]}
              >
                <Text style={[styles.sheetActionButtonLabel, styles.sheetActionButtonLabelPrimary]}>
                  重播
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#faf6ef',
  },
  stage: {
    flex: 1,
    backgroundColor: '#faf6ef',
    overflow: 'hidden',
  },
  glowWarm: {
    position: 'absolute',
    top: -140,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 320,
    backgroundColor: 'rgba(255, 219, 163, 0.58)',
  },
  glowCool: {
    position: 'absolute',
    top: 70,
    right: -110,
    width: 320,
    height: 320,
    borderRadius: 320,
    backgroundColor: 'rgba(220, 232, 255, 0.34)',
  },
  glowBounce: {
    position: 'absolute',
    bottom: -130,
    left: 30,
    right: 30,
    height: 240,
    borderRadius: 240,
    backgroundColor: 'rgba(255, 229, 187, 0.48)',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
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
    borderRadius: 28,
    backgroundColor: 'rgba(255, 253, 249, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(108, 84, 40, 0.08)',
    shadowColor: '#8a672a',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  stateBadgeError: {
    minWidth: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#2e2115',
  },
  stateBadgeText: {
    color: '#fffaf2',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  stateTitle: {
    color: '#21160d',
    fontSize: 26,
    fontWeight: '900',
  },
  stateBody: {
    maxWidth: 280,
    color: '#7a6550',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topFade: {
    height: 110,
    backgroundColor: 'rgba(250, 246, 239, 0.26)',
  },
  bottomDock: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dockGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 253, 249, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(112, 91, 58, 0.1)',
    shadowColor: '#7f6232',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  dockDivider: {
    width: 1,
    height: 26,
    marginHorizontal: 8,
    backgroundColor: 'rgba(112, 91, 58, 0.12)',
  },
  dockButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 250, 243, 0.78)',
    shadowColor: '#7f6232',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  dockButtonLarge: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  dockButtonActive: {
    backgroundColor: '#21160d',
  },
  dockButtonIcon: {
    color: '#21160d',
    fontSize: 25,
    fontWeight: '800',
  },
  dockButtonIconLarge: {
    fontSize: 30,
  },
  dockButtonIconActive: {
    color: '#fffaf2',
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(22, 14, 8, 0.18)',
  },
  sheetCard: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#fffbf6',
    borderTopWidth: 1,
    borderColor: 'rgba(112, 91, 58, 0.08)',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(112, 91, 58, 0.16)',
  },
  sheetHeader: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    color: '#21160d',
    fontSize: 22,
    fontWeight: '900',
  },
  sheetCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4ede2',
  },
  sheetCloseButtonText: {
    color: '#2d2116',
    fontSize: 18,
    fontWeight: '700',
  },
  cameraRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  cameraChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: '#f7f0e6',
  },
  cameraChipActive: {
    backgroundColor: '#21160d',
  },
  cameraChipLabel: {
    color: '#2d2116',
    fontSize: 16,
    fontWeight: '800',
  },
  cameraChipLabelActive: {
    color: '#fffaf2',
  },
  sheetActionRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  sheetActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 18,
    backgroundColor: '#f4ede2',
  },
  sheetActionButtonActive: {
    backgroundColor: '#f2cf8f',
  },
  sheetActionButtonPrimary: {
    backgroundColor: '#21160d',
  },
  sheetActionButtonLabel: {
    color: '#2d2116',
    fontSize: 15,
    fontWeight: '800',
  },
  sheetActionButtonLabelActive: {
    color: '#684208',
  },
  sheetActionButtonLabelPrimary: {
    color: '#fffaf2',
  },
});
