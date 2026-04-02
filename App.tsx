import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAudioPlayer } from 'expo-audio';
import { WebView } from 'react-native-webview';

import { laughAudioModule, modelGlbModule, resolveAssetUri } from './src/assets';
import { createModelViewerHtml } from './src/modelViewerHtml';

export default function App() {
  const player = useAudioPlayer(laughAudioModule);
  const webViewRef = useRef<WebView>(null);

  const [modelUri, setModelUri] = useState<string | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  const [viewerSeed, setViewerSeed] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadModel() {
      if (!modelGlbModule) {
        setModelUri(null);
        return;
      }
      const uri = await resolveAssetUri(modelGlbModule);
      if (!cancelled) {
        setModelUri(uri);
      }
    }

    loadModel();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // expo-audio exposes playback control through the player instance.
    // Looping is toggled from React state so replay behavior stays predictable.
    player.loop = isLooping;
  }, [isLooping, player]);

  const html = useMemo(
    () =>
      createModelViewerHtml({
        modelUri,
        posterText:
          '把 PMX / VMD 在 Blender 里转成带动画的 GLB 之后，这里会直接显示模型，并通过重建 Viewer 来重播动作。',
      }),
    [modelUri, viewerSeed]
  );

  function replay() {
    player.seekTo(0);
    player.play();
    setViewerSeed((seed) => seed + 1);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Expo MVP</Text>
          <Text style={styles.title}>MMD Laugh Player</Text>
          <Text style={styles.subtitle}>
            当前资产链已经齐了：PMX、贴图、VMD、MP3。下一步只差把模型和动作烘成
            GLB。
          </Text>
        </View>

        <View style={styles.stage}>
          <WebView
            key={viewerSeed}
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html }}
            style={styles.webview}
            javaScriptEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
          />
        </View>

        <View style={styles.controls}>
          <Pressable onPress={replay} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>点一下就开播</Text>
          </Pressable>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>循环播放</Text>
              <Text style={styles.switchHint}>
                音频可以先循环，模型动画会在导出 GLB 后跟上。
              </Text>
            </View>
            <Switch value={isLooping} onValueChange={setIsLooping} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09111d',
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 18,
    backgroundColor: '#09111d',
  },
  hero: {
    paddingTop: 12,
    paddingBottom: 18,
  },
  eyebrow: {
    color: '#f4c95d',
    letterSpacing: 2,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 8,
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 10,
    color: '#b7c3d8',
    fontSize: 14,
    lineHeight: 22,
  },
  stage: {
    flex: 1,
    minHeight: 360,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#0d1728',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    elevation: 8,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  controls: {
    paddingTop: 16,
    gap: 14,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4c95d',
  },
  primaryButtonText: {
    color: '#1a1300',
    fontSize: 16,
    fontWeight: '800',
  },
  switchRow: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#111c2f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  switchLabel: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  switchHint: {
    marginTop: 6,
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 260,
  },
});
