import { modelViewerScript } from './vendor/modelViewerScript';

export function createModelViewerHtml({
  modelUri,
  audioUri,
  posterText,
  initialAnimationSpeed,
  initialCameraOrbit,
  initialCameraTarget,
}: {
  modelUri: string | null;
  audioUri: string | null;
  posterText: string;
  initialAnimationSpeed: number;
  initialCameraOrbit: string;
  initialCameraTarget: string | null;
}) {
  const safeModelUri = modelUri ? JSON.stringify(modelUri) : 'null';
  const safeAudioUri = audioUri ? JSON.stringify(audioUri) : 'null';
  const safePosterText = JSON.stringify(posterText);
  const safeAnimationSpeed = JSON.stringify(initialAnimationSpeed);
  const safeCameraOrbit = JSON.stringify(initialCameraOrbit);
  const safeInitialCameraTarget = initialCameraTarget ? JSON.stringify(initialCameraTarget) : 'null';
  const inlineModelViewerScript = modelViewerScript;

  return `
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"
    />
    <style>
      :root {
        color-scheme: light;
        --bg: #fffafd;
        --bg-soft: #ffffff;
        --warm: rgba(255, 225, 236, 0.38);
        --warm-soft: rgba(255, 233, 244, 0.3);
        --cool: rgba(236, 246, 255, 0.24);
        --peach: rgba(255, 241, 224, 0.2);
        --text: #23170d;
        --muted: #7f6a53;
        --pulse: 0;
      }

      html,
      body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background:
          radial-gradient(circle at 18% 12%, rgba(255, 229, 236, 0.26), transparent 30%),
          radial-gradient(circle at 84% 18%, rgba(240, 246, 255, 0.24), transparent 28%),
          radial-gradient(circle at 32% 82%, rgba(255, 239, 224, 0.18), transparent 30%),
          radial-gradient(circle at 50% 116%, rgba(255, 220, 232, 0.14), transparent 30%),
          linear-gradient(180deg, var(--bg-soft) 0%, #fffcfe 34%, var(--bg) 74%, #fff8fb 100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .stage {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        transform: translate3d(0, calc(var(--pulse) * -2.4px), 0);
      }

      .light {
        position: absolute;
        border-radius: 999px;
        pointer-events: none;
        filter: blur(54px);
        mix-blend-mode: screen;
        transition: transform 220ms linear, opacity 220ms linear;
      }

      .light-key {
        top: -4%;
        left: -12%;
        width: 64%;
        height: 28%;
        background: radial-gradient(circle at 58% 56%, rgba(255, 232, 238, 0.34), transparent 78%);
      }

      .light-fill {
        top: 12%;
        right: -18%;
        width: 56%;
        height: 30%;
        background: radial-gradient(circle at 38% 48%, rgba(240, 247, 255, 0.28), transparent 78%);
      }

      .light-rim {
        top: 24%;
        right: -12%;
        width: 34%;
        height: 36%;
        background: radial-gradient(circle at 34% 50%, rgba(255, 242, 247, 0.2), transparent 76%);
      }

      .light-bounce {
        left: 6%;
        right: 6%;
        bottom: -8%;
        height: 32%;
        background:
          radial-gradient(circle at 34% 34%, rgba(255, 241, 222, 0.16), transparent 56%),
          radial-gradient(circle at 62% 28%, rgba(255, 232, 243, 0.24), transparent 80%);
      }

      .floor-shadow {
        position: absolute;
        left: 13%;
        right: 13%;
        bottom: 6.2%;
        height: 18.8%;
        border-radius: 999px;
        background:
          radial-gradient(circle at 50% 45%, rgba(136, 108, 120, 0.08) 0%, rgba(136, 108, 120, 0.038) 34%, transparent 76%);
        filter: blur(34px);
        pointer-events: none;
        transition: transform 220ms linear, opacity 220ms linear;
      }

      .floor-contact {
        position: absolute;
        left: 24%;
        right: 24%;
        bottom: 9.6%;
        height: 8.4%;
        border-radius: 999px;
        background: radial-gradient(circle at 50% 50%, rgba(128, 98, 112, 0.075), transparent 76%);
        filter: blur(20px);
        pointer-events: none;
      }

      .viewer-frame {
        position: absolute;
        inset: 0;
      }

      .placeholder {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 28px;
        box-sizing: border-box;
      }

      .placeholder-card {
        max-width: 300px;
        padding: 22px 20px;
        border-radius: 26px;
        background: rgba(255, 253, 249, 0.92);
        border: 1px solid rgba(112, 91, 58, 0.08);
        color: var(--text);
        box-shadow: 0 18px 40px rgba(77, 53, 18, 0.12);
      }

      .placeholder-title {
        font-size: 28px;
        line-height: 1.08;
        font-weight: 900;
      }

      .placeholder-desc {
        margin-top: 10px;
        font-size: 14px;
        line-height: 1.6;
        color: var(--muted);
      }

      model-viewer {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        background: transparent;
        --poster-color: transparent;
        filter: saturate(1.26) contrast(1.08) brightness(1.015);
      }
    </style>
    <script>${inlineModelViewerScript}</script>
  </head>
  <body>
    <div class="stage" id="stageRoot">
      <div class="light light-key" id="lightKey"></div>
      <div class="light light-fill" id="lightFill"></div>
      <div class="light light-rim" id="lightRim"></div>
      <div class="light light-bounce" id="lightBounce"></div>
      <div class="floor-shadow" id="floorShadow"></div>
      <div class="floor-contact" id="floorContact"></div>
      <div class="viewer-frame" id="app"></div>
    </div>
    <script>
      const modelUri = ${safeModelUri};
      const audioUri = ${safeAudioUri};
      const posterText = ${safePosterText};
      const initialAnimationSpeed = ${safeAnimationSpeed};
      const initialCameraOrbit = ${safeCameraOrbit};
      const initialCameraTarget = ${safeInitialCameraTarget};

      const OPAQUE_MATERIALS = new Set(['Body', 'Ear']);
      const BLEND_MATERIALS = new Set(['Dark+Water']);
      const FACE_MATERIALS = new Set(['Face', 'Eye', 'EyeWhite', 'Mouth+Love+Hot']);
      const HAIR_MATERIALS = new Set(['MaWei_x2', 'Hair_CeFa', 'Hair_LiuHai']);
      const FABRIC_MATERIALS = new Set(['Skirt+Shoes', 'Cape', 'QunZi']);
      const ACCENT_MATERIALS = new Set(['Glass+Toy+Bow', 'Star+Red', 'Dark+Water']);
      const PREFERRED_CAMERA_ANCHOR_NAMES = ['センター', '操作中心', '下半身'];
      const DEFAULT_CAMERA_TARGET = '0m 0.88m 0m';
      const FRONT_FACING_ROTATION_Y = Math.PI - Math.PI / 4;
      const MODEL_VERTICAL_OFFSET = -0.08;
      const AUTO_TARGET_RATIO = 0.74;
      const RAD_TO_DEG = 180 / Math.PI;
      const THREE_FRONT_SIDE = 0;
      const THREE_DOUBLE_SIDE = 2;
      const THREE_INTERPOLATE_LINEAR = 2301;
      const THREE_INTERPOLATE_SMOOTH = 2302;
      const TOON_LITE_VERSION = 'toon-lite-v1';

      const app = document.getElementById('app');
      const stageRoot = document.getElementById('stageRoot');
      const lightKey = document.getElementById('lightKey');
      const lightFill = document.getElementById('lightFill');
      const lightRim = document.getElementById('lightRim');
      const lightBounce = document.getElementById('lightBounce');
      const floorShadowEl = document.getElementById('floorShadow');
      const floorContactEl = document.getElementById('floorContact');

      let currentBlobUrl = null;
      let audioBlobUrl = null;
      let internalSceneHandle = null;
      let internalSceneRoot = null;
      let cameraAnchorNode = null;
      let morphBindings = [];
      let morphAnimationHandle = null;
      let playbackMonitorHandle = null;
      let baseExpressionWeights = Object.create(null);
      let autoCameraTarget = DEFAULT_CAMERA_TARGET;
      let manualCameraTarget = null;
      let cameraTargetOffsetX = 0;
      let selectedAnimationName = '';
      let isLooping = true;
      let currentAnimationDuration = 0;
      let visualEnergy = 0;
      let lastPlaybackStatus = '';
      let lastPlaybackStatusAt = 0;
      let audioElement = null;
      let audioReady = false;
      let playbackRequested = false;
      let currentExpressionPreset = 'default';
      let currentAnimationInterpolation = 'linear';
      let cameraStateHandle = null;
      let lastCameraState = '';
      let lastCameraStateAt = 0;
      let viewerMounted = false;
      let viewerMountRequested = false;

      function notify(type, detail) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type, detail }));
        }
      }

      function getDefaultAssetMimeType(kind) {
        return kind === 'model' ? 'model/gltf-binary' : 'audio/mpeg';
      }

      function createAssetBridgeState(kind) {
        return {
          kind,
          status: 'waiting',
          mimeType: getDefaultAssetMimeType(kind),
          buffers: [],
          totalChunks: 0,
          receivedChunks: 0,
          totalBytes: 0,
        };
      }

      const assetBridgeState = {
        model: modelUri ? createAssetBridgeState('model') : null,
        audio: audioUri ? createAssetBridgeState('audio') : null,
      };

      function getAssetBridge(kind) {
        return kind === 'audio' ? assetBridgeState.audio : assetBridgeState.model;
      }

      function setAssetBridge(kind, nextState) {
        if (kind === 'audio') {
          assetBridgeState.audio = nextState;
        } else {
          assetBridgeState.model = nextState;
        }
      }

      function decodeBase64Chunk(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);

        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }

        return bytes;
      }

      window.addEventListener('error', (event) => {
        const message =
          event && event.error && typeof event.error.message === 'string'
            ? event.error.message
            : event && typeof event.message === 'string'
              ? event.message
              : '页面脚本发生未知错误。';
        notify('viewer-error', 'WebView 脚本错误：' + message);
      });

      window.addEventListener('unhandledrejection', (event) => {
        const reason =
          event && typeof event.reason === 'object' && event.reason && typeof event.reason.message === 'string'
            ? event.reason.message
            : event && typeof event.reason === 'string'
              ? event.reason
              : '未处理的 Promise 异常。';
        notify('viewer-error', 'WebView Promise 错误：' + reason);
      });

      function getViewer() {
        return document.getElementById('viewer');
      }

      function clamp01(value) {
        return Math.min(1, Math.max(0, value));
      }

      function formatMeters(value) {
        return String(Number(value.toFixed(4))) + 'm';
      }

      function roundValue(value, digits) {
        const factor = Math.pow(10, digits);
        return Math.round(value * factor) / factor;
      }

      function normalizeDegrees(value) {
        const normalized = value % 360;
        return normalized < 0 ? normalized + 360 : normalized;
      }

      function readCameraState() {
        const viewer = getViewer();
        if (!viewer || typeof viewer.getCameraOrbit !== 'function') {
          return null;
        }

        const orbit = viewer.getCameraOrbit();
        if (!orbit) {
          return null;
        }

        const azimuthDeg = normalizeDegrees(Number(orbit.theta) * RAD_TO_DEG);
        const polarDeg = Number(orbit.phi) * RAD_TO_DEG;
        const radiusM = Number(orbit.radius);

        if (!Number.isFinite(azimuthDeg) || !Number.isFinite(polarDeg) || !Number.isFinite(radiusM)) {
          return null;
        }

        return {
          azimuthDeg: roundValue(azimuthDeg, 2),
          polarDeg: roundValue(polarDeg, 2),
          radiusM: roundValue(radiusM, 3),
        };
      }

      function stopCameraStateLoop() {
        if (cameraStateHandle) {
          cancelAnimationFrame(cameraStateHandle);
          cameraStateHandle = null;
        }
      }

      function sendCameraState(force) {
        const state = readCameraState();
        if (!state) {
          return;
        }

        const snapshot = JSON.stringify(state);
        const now = performance.now();
        if (!force && snapshot === lastCameraState && now - lastCameraStateAt < 96) {
          return;
        }

        lastCameraState = snapshot;
        lastCameraStateAt = now;
        notify('camera-state', state);
      }

      function scheduleCameraState(force) {
        stopCameraStateLoop();
        cameraStateHandle = requestAnimationFrame(() => {
          cameraStateHandle = null;
          sendCameraState(force);
        });
      }

      function getNodeWorldPosition(node) {
        if (!node || typeof node.getWorldPosition !== 'function' || !node.position) {
          return null;
        }

        const probe = typeof node.position.clone === 'function' ? node.position.clone() : null;
        if (!probe) {
          return null;
        }

        node.getWorldPosition(probe);
        return probe;
      }

      function releaseBlobUrl(kind) {
        if (kind === 'audio') {
          if (audioBlobUrl) {
            URL.revokeObjectURL(audioBlobUrl);
            audioBlobUrl = null;
          }
          return;
        }

        if (currentBlobUrl) {
          URL.revokeObjectURL(currentBlobUrl);
          currentBlobUrl = null;
        }
      }

      function resetAssetBridge(kind) {
        releaseBlobUrl(kind);
        setAssetBridge(kind, kind === 'audio' ? (audioUri ? createAssetBridgeState(kind) : null) : modelUri ? createAssetBridgeState(kind) : null);
      }

      function finalizeAssetBridge(kind) {
        const state = getAssetBridge(kind);
        if (!state || !Array.isArray(state.buffers) || !state.buffers.length) {
          return null;
        }

        const blobUrl = URL.createObjectURL(
          new Blob(state.buffers, {
            type: state.mimeType || getDefaultAssetMimeType(kind),
          })
        );

        if (kind === 'audio') {
          releaseBlobUrl('audio');
          audioBlobUrl = blobUrl;
        } else {
          releaseBlobUrl('model');
          currentBlobUrl = blobUrl;
        }

        state.status = 'ready';
        state.buffers = [];
        return blobUrl;
      }

      function areTransferredAssetsReady() {
        const modelState = assetBridgeState.model;
        if (!modelState || modelState.status !== 'ready' || !currentBlobUrl) {
          return false;
        }

        const audioState = assetBridgeState.audio;
        if (!audioState) {
          return true;
        }

        return audioState.status === 'ready' || audioState.status === 'skipped';
      }

      function stopMorphLoop() {
        if (morphAnimationHandle) {
          cancelAnimationFrame(morphAnimationHandle);
          morphAnimationHandle = null;
        }
      }

      function stopPlaybackMonitor() {
        if (playbackMonitorHandle) {
          cancelAnimationFrame(playbackMonitorHandle);
          playbackMonitorHandle = null;
        }
      }

      async function fetchBlobWithFetch(uri) {
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error('fetch failed (' + response.status + ')');
        }
        return await response.blob();
      }

      function withTimeout(promise, timeoutMs, label) {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(label + ' timed out (' + String(timeoutMs) + 'ms)'));
          }, timeoutMs);

          Promise.resolve(promise).then(
            (value) => {
              clearTimeout(timer);
              resolve(value);
            },
            (error) => {
              clearTimeout(timer);
              reject(error);
            }
          );
        });
      }

      function looksLikeLocalAssetUri(uri) {
        return typeof uri === 'string' && /^(file|content):/i.test(uri);
      }

      function fetchBlobWithXhr(uri) {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', uri, true);
          xhr.responseType = 'blob';
          xhr.onload = () => {
            const ok = xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300);
            if (!ok || !xhr.response) {
              reject(new Error('xhr failed (' + xhr.status + ')'));
              return;
            }
            resolve(xhr.response);
          };
          xhr.onerror = () => {
            reject(new Error('xhr network error'));
          };
          xhr.send();
        });
      }

      async function resolveAssetSource(uri, kind, label) {
        releaseBlobUrl(kind);
        const friendlyMessage = kind === 'audio' ? '正在接入本地配乐' : '正在整理本地模型。';
        const timeoutMs = kind === 'audio' ? 12000 : 20000;
        const preferXhrFirst = looksLikeLocalAssetUri(uri);
        const primaryFetch = preferXhrFirst ? fetchBlobWithXhr(uri) : fetchBlobWithFetch(uri);
        const secondaryFetch = preferXhrFirst ? fetchBlobWithFetch(uri) : fetchBlobWithXhr(uri);
        const primaryLabel = preferXhrFirst ? 'xhr' : 'fetch';
        const secondaryLabel = preferXhrFirst ? 'fetch' : 'xhr';

        try {
          const blob = await withTimeout(primaryFetch, timeoutMs, primaryLabel);
          const blobUrl = URL.createObjectURL(blob);
          if (kind === 'audio') {
            audioBlobUrl = blobUrl;
          } else {
            currentBlobUrl = blobUrl;
          }
          notify('viewer-loading', friendlyMessage);
          return blobUrl;
        } catch (primaryError) {
          try {
            const blob = await withTimeout(secondaryFetch, timeoutMs, secondaryLabel);
            const blobUrl = URL.createObjectURL(blob);
            if (kind === 'audio') {
              audioBlobUrl = blobUrl;
            } else {
              currentBlobUrl = blobUrl;
            }
            notify('viewer-loading', friendlyMessage);
            return blobUrl;
          } catch (secondaryError) {
            const primaryMessage =
              primaryError && typeof primaryError.message === 'string'
                ? primaryError.message
                : String(primaryError);
            const secondaryMessage =
              secondaryError && typeof secondaryError.message === 'string'
                ? secondaryError.message
                : String(secondaryError);
            throw new Error(primaryLabel + '=' + primaryMessage + '; ' + secondaryLabel + '=' + secondaryMessage);
          }
        }
      }

      function teardownAudio() {
        if (audioElement) {
          audioElement.pause();
          audioElement.src = '';
          if (audioElement.parentNode) {
            audioElement.parentNode.removeChild(audioElement);
          }
          audioElement = null;
        }
        audioReady = false;
        playbackRequested = false;
        releaseBlobUrl('audio');
      }

      async function prepareAudioTransport(resolvedAudioUri) {
        teardownAudio();

        if (!resolvedAudioUri) {
          return null;
        }

        const audio = document.createElement('audio');
        audio.src = resolvedAudioUri;
        audio.preload = 'auto';
        audio.loop = isLooping;
        audio.setAttribute('playsinline', 'true');
        audio.style.display = 'none';
        audio.volume = 1;
        document.body.appendChild(audio);

        audioElement = audio;
        audio.addEventListener('canplay', () => {
          audioReady = true;
          sendPlaybackStatus(true);
        });
        audio.addEventListener('error', () => {
          audioReady = false;
          sendPlaybackStatus(true);
        });
        audio.addEventListener('ended', () => {
          const viewer = getViewer();
          if (viewer && !isLooping) {
            viewer.pause();
          }
          playbackRequested = false;
          sendPlaybackStatus(true);
        });
        audio.addEventListener('pause', () => {
          sendPlaybackStatus(true);
        });
        audio.addEventListener('play', () => {
          audioReady = true;
          sendPlaybackStatus(true);
        });
        audio.addEventListener('loadedmetadata', () => {
          audioReady = true;
          sendPlaybackStatus(true);
        });

        return audio;
      }

      function applyConfig(config) {
        const viewer = getViewer();
        if (!viewer || !config) {
          return;
        }

        if (typeof config.cameraOrbit === 'string') {
          viewer.setAttribute('camera-orbit', config.cameraOrbit);
        }

        cameraTargetOffsetX =
          typeof config.cameraTargetOffsetX === 'number' && Number.isFinite(config.cameraTargetOffsetX)
            ? config.cameraTargetOffsetX
            : 0;

        if (typeof config.cameraTarget === 'string') {
          manualCameraTarget = config.cameraTarget;
          viewer.setAttribute('camera-target', config.cameraTarget);
        } else {
          manualCameraTarget = null;
          syncAutoCameraTarget(viewer);
        }

        if (typeof config.animationSpeed === 'number' && Number.isFinite(config.animationSpeed)) {
          viewer.timeScale = config.animationSpeed;
        }

        if (typeof config.isLooping === 'boolean') {
          isLooping = config.isLooping;
          if (audioElement) {
            audioElement.loop = isLooping;
          }
        }

        if (typeof config.expressionPreset === 'string') {
          currentExpressionPreset = config.expressionPreset;
        }

        if (typeof config.animationInterpolation === 'string') {
          currentAnimationInterpolation = config.animationInterpolation;
          applyAnimationInterpolation();
        }

        scheduleCameraState(true);
      }

      function readVisualEnergy() {
        if (audioElement && !audioElement.paused) {
          const current = Number.isFinite(audioElement.currentTime) ? audioElement.currentTime : 0;
          return (
            0.07 +
            Math.max(0, Math.sin(current * 2.8 + 0.4)) * 0.08 +
            Math.max(0, Math.sin(current * 5.2 + 1.4)) * 0.04
          );
        }

        return playbackRequested ? 0.05 : 0;
      }

      function paintStudio() {
        visualEnergy = visualEnergy * 0.82 + readVisualEnergy() * 0.18;
        document.documentElement.style.setProperty('--pulse', visualEnergy.toFixed(4));

        if (stageRoot) {
          stageRoot.style.transform =
            'translate3d(0,' + String((-visualEnergy * 1.6).toFixed(2)) + 'px,0)';
        }
        if (lightKey) {
          lightKey.style.opacity = String(0.74 + visualEnergy * 0.1);
          lightKey.style.transform = 'scale(' + String((1 + visualEnergy * 0.014).toFixed(4)) + ')';
        }
        if (lightFill) {
          lightFill.style.opacity = String(0.76 + visualEnergy * 0.08);
          lightFill.style.transform = 'scale(' + String((1 + visualEnergy * 0.012).toFixed(4)) + ')';
        }
        if (lightRim) {
          lightRim.style.opacity = String(0.6 + visualEnergy * 0.06);
          lightRim.style.transform = 'scale(' + String((1 + visualEnergy * 0.016).toFixed(4)) + ')';
        }
        if (lightBounce) {
          lightBounce.style.opacity = String(0.74 + visualEnergy * 0.06);
        }
        if (floorShadowEl) {
          floorShadowEl.style.transform = 'scale(' + String((1 + visualEnergy * 0.01).toFixed(4)) + ')';
          floorShadowEl.style.opacity = String(0.54 + visualEnergy * 0.06);
        }
        if (floorContactEl) {
          floorContactEl.style.transform = 'scale(' + String((1 + visualEnergy * 0.012).toFixed(4)) + ')';
          floorContactEl.style.opacity = String(0.52 + visualEnergy * 0.06);
        }
      }

      function buildPlaybackStatus() {
        const viewer = getViewer();
        const animationDuration = currentAnimationDuration > 0 ? currentAnimationDuration : 0;
        const audioDuration =
          audioElement && Number.isFinite(audioElement.duration) && audioElement.duration > 0
            ? audioElement.duration
            : 0;
        const duration = Math.max(animationDuration, audioDuration);
        const audioCurrentTime =
          audioElement && Number.isFinite(audioElement.currentTime) ? audioElement.currentTime : 0;
        const viewerCurrentTime =
          viewer && typeof viewer.currentTime === 'number' && Number.isFinite(viewer.currentTime)
            ? viewer.currentTime
            : 0;
        const audioPlaying = Boolean(audioElement && audioReady && !audioElement.paused && !audioElement.ended);
        const viewerPlaying = Boolean(
          viewer &&
            (typeof viewer.paused === 'boolean'
              ? !viewer.paused
              : playbackRequested && viewerCurrentTime < Math.max(duration - 0.03, 0.03))
        );
        const currentTime = audioPlaying ? audioCurrentTime : Math.max(viewerCurrentTime, audioCurrentTime);
        const progress = duration > 0 ? clamp01(currentTime / duration) : 0;
        const playing = playbackRequested && (audioPlaying || viewerPlaying);

        return {
          playing,
          progress,
          currentTime,
          duration,
          energy: visualEnergy,
          didFinish: !playing && !isLooping && duration > 0 && currentTime >= duration - 0.03,
        };
      }

      function sendPlaybackStatus(force) {
        const status = buildPlaybackStatus();
        const snapshot = JSON.stringify(status);
        const now = performance.now();
        if (!force && snapshot === lastPlaybackStatus && now - lastPlaybackStatusAt < 140) {
          return;
        }
        lastPlaybackStatus = snapshot;
        lastPlaybackStatusAt = now;
        notify('playback-status', status);
      }

      function syncViewerToAudio() {
        const viewer = getViewer();
        if (!viewer) {
          return;
        }

        if (currentAnimationDuration > 0 && viewer.currentTime >= currentAnimationDuration) {
          if (isLooping) {
            viewer.currentTime = 0;
          } else {
            viewer.pause();
            viewer.currentTime = currentAnimationDuration;
            if (audioElement) {
              audioElement.pause();
              audioElement.currentTime = currentAnimationDuration;
            }
            playbackRequested = false;
          }
        }

        if (audioElement && !audioElement.paused && audioElement.currentTime > 0.01) {
          const drift = Math.abs(viewer.currentTime - audioElement.currentTime);
          if (drift > 0.033) {
            viewer.currentTime = audioElement.currentTime;
          }
        }
      }

      function startPlaybackMonitor() {
        stopPlaybackMonitor();

        const tick = () => {
          syncViewerToAudio();
          const viewer = getViewer();
          if (viewer && !manualCameraTarget) {
            syncAutoCameraTarget(viewer);
          }
          paintStudio();
          sendPlaybackStatus(false);
          playbackMonitorHandle = requestAnimationFrame(tick);
        };

        tick();
      }

      function materialModeForName(name) {
        if (BLEND_MATERIALS.has(name)) {
          return 'blend';
        }

        if (OPAQUE_MATERIALS.has(name)) {
          return 'opaque';
        }

        return 'mask';
      }

      function patchThreeMaterial(material) {
        if (!material) {
          return;
        }

        const name = material.name || '';
        const mode = materialModeForName(name);
        const isFace = FACE_MATERIALS.has(name);
        const isHair = HAIR_MATERIALS.has(name);
        const isFabric = FABRIC_MATERIALS.has(name);
        const isAccent = ACCENT_MATERIALS.has(name);
        const profile = isFace
          ? {
              key: 'face',
              steps: 3.2,
              shadowFloor: 0.84,
              shadowCeiling: 1.08,
              specularMix: 0.08,
              rimStrength: 0.055,
              rimPower: 2.4,
              pastelLift: 0.082,
              saturationBoost: 1.12,
              emissive: [0.032, 0.018, 0.024],
            }
          : isHair
            ? {
                key: 'hair',
                steps: 4,
                shadowFloor: 0.82,
                shadowCeiling: 1.06,
                specularMix: 0.14,
                rimStrength: 0.072,
                rimPower: 2.15,
                pastelLift: 0.052,
                saturationBoost: 1.16,
                emissive: [0.018, 0.012, 0.02],
              }
            : isAccent
              ? {
                  key: 'accent',
                  steps: 4.4,
                  shadowFloor: 0.86,
                  shadowCeiling: 1.12,
                  specularMix: 0.22,
                  rimStrength: 0.08,
                  rimPower: 1.95,
                  pastelLift: 0.026,
                  saturationBoost: 1.14,
                  emissive: [0.02, 0.016, 0.022],
                }
              : {
                  key: isFabric ? 'fabric' : 'body',
                  steps: isFabric ? 4 : 3.7,
                  shadowFloor: isFabric ? 0.8 : 0.82,
                  shadowCeiling: isFabric ? 1.04 : 1.05,
                  specularMix: isFabric ? 0.1 : 0.07,
                  rimStrength: isFabric ? 0.052 : 0.04,
                  rimPower: isFabric ? 2.3 : 2.5,
                  pastelLift: isFabric ? 0.032 : 0.044,
                  saturationBoost: isFabric ? 1.08 : 1.1,
                  emissive: isFabric ? [0.014, 0.012, 0.016] : [0.016, 0.012, 0.016],
                };

        if (mode === 'blend') {
          material.transparent = true;
          material.alphaTest = 0;
          material.depthWrite = false;
        } else if (mode === 'opaque') {
          material.transparent = false;
          material.alphaTest = 0;
          material.depthWrite = true;
        } else {
          material.transparent = false;
          material.alphaTest = 0.5;
          material.depthWrite = true;
        }

        if ('roughness' in material) {
          material.roughness = isAccent ? 0.36 : isHair ? 0.52 : isFace ? 0.68 : isFabric ? 0.74 : 0.78;
        }

        if ('metalness' in material) {
          material.metalness = isAccent ? 0.02 : 0;
        }

        if ('envMapIntensity' in material) {
          material.envMapIntensity = isAccent ? 0.16 : isHair ? 0.08 : isFace ? 0.035 : isFabric ? 0.045 : 0.04;
        }

        if ('alphaToCoverage' in material) {
          material.alphaToCoverage = mode === 'mask';
        }

        if ('emissive' in material && material.emissive && typeof material.emissive.setRGB === 'function') {
          material.emissive.setRGB(profile.emissive[0], profile.emissive[1], profile.emissive[2]);
        }

        if (material.map && 'colorSpace' in material.map) {
          material.map.colorSpace = 'srgb';
          material.map.needsUpdate = true;
        }

        if (material.emissiveMap && 'colorSpace' in material.emissiveMap) {
          material.emissiveMap.colorSpace = 'srgb';
          material.emissiveMap.needsUpdate = true;
        }

        if ('side' in material) {
          material.side = isHair || isFabric || mode === 'blend' ? THREE_DOUBLE_SIDE : THREE_FRONT_SIDE;
        }

        if (typeof material.onBeforeCompile === 'function') {
          material.onBeforeCompile = (shader) => {
            shader.uniforms.uToonSteps = { value: profile.steps };
            shader.uniforms.uToonShadowFloor = { value: profile.shadowFloor };
            shader.uniforms.uToonShadowCeiling = { value: profile.shadowCeiling };
            shader.uniforms.uToonSpecularMix = { value: profile.specularMix };
            shader.uniforms.uToonRimStrength = { value: profile.rimStrength };
            shader.uniforms.uToonRimPower = { value: profile.rimPower };
            shader.uniforms.uToonPastelLift = { value: profile.pastelLift };
            shader.uniforms.uToonSaturationBoost = { value: profile.saturationBoost };

            shader.fragmentShader = [
              'uniform float uToonSteps;',
              'uniform float uToonShadowFloor;',
              'uniform float uToonShadowCeiling;',
              'uniform float uToonSpecularMix;',
              'uniform float uToonRimStrength;',
              'uniform float uToonRimPower;',
              'uniform float uToonPastelLift;',
              'uniform float uToonSaturationBoost;',
              shader.fragmentShader,
            ].join('\\n');

            shader.fragmentShader = shader.fragmentShader.replace(
              'vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',
              [
                'float toonDiffuseLuma = dot(totalDiffuse, vec3(0.2126, 0.7152, 0.0722));',
                'float toonBand = floor(clamp(toonDiffuseLuma, 0.0, 1.0) * uToonSteps + 0.55) / uToonSteps;',
                'float toonLightMix = mix(uToonShadowFloor, uToonShadowCeiling, toonBand);',
                'float toonRim = pow(1.0 - clamp(dot(normalize(normal), geometryViewDir), 0.0, 1.0), uToonRimPower) * uToonRimStrength;',
                'vec3 stylizedDiffuse = totalDiffuse * toonLightMix + diffuseColor.rgb * uToonPastelLift * (0.18 + toonBand * 0.2);',
                'vec3 stylizedSpecular = totalSpecular * uToonSpecularMix;',
                'vec3 toonComposite = stylizedDiffuse + stylizedSpecular + totalEmissiveRadiance + vec3(toonRim);',
                'float toonCompositeLuma = dot(toonComposite, vec3(0.2126, 0.7152, 0.0722));',
                'vec3 outgoingLight = mix(vec3(toonCompositeLuma), toonComposite, uToonSaturationBoost);',
              ].join('\\n')
            );
          };

          material.customProgramCacheKey = () => [
            TOON_LITE_VERSION,
            profile.key,
            mode,
          ].join(':');
        }

        material.needsUpdate = true;
      }

      function getInternalSceneHandle(viewer) {
        const symbols = Object.getOwnPropertySymbols(viewer);

        for (const symbol of symbols) {
          const value = viewer[symbol];
          if (
            value &&
            typeof value === 'object' &&
            value.currentGLTF &&
            value.currentGLTF.scene &&
            typeof value.currentGLTF.scene.traverse === 'function'
          ) {
            return value;
          }
        }

        return null;
      }

      function collectMorphMetadata() {
        const names = [];
        const seen = new Set();

        for (const binding of morphBindings) {
          for (const [name] of Object.entries(binding.dictionary)) {
            if (!seen.has(name)) {
              seen.add(name);
              names.push(name);
            }
          }
        }

        return {
          morphTargetCount: names.length,
          morphTargetNames: names,
        };
      }

      function selectPrimaryAnimation(viewer) {
        const names = Array.isArray(viewer.availableAnimations)
          ? viewer.availableAnimations.filter((name) => typeof name === 'string')
          : [];

        const preferred = names.find((name) => /_bone$/i.test(name)) || names[0] || '';
        if (preferred && selectedAnimationName !== preferred) {
          selectedAnimationName = preferred;
          viewer.animationName = preferred;
        }

        applyAnimationInterpolation();

        return names.length;
      }

      function applyAnimationInterpolation() {
        const animations = internalSceneHandle?.currentGLTF?.animations;
        if (!Array.isArray(animations)) {
          return;
        }

        const interpolation =
          currentAnimationInterpolation === 'smooth' ? THREE_INTERPOLATE_SMOOTH : THREE_INTERPOLATE_LINEAR;

        for (const clip of animations) {
          if (!clip || !Array.isArray(clip.tracks)) {
            continue;
          }

          for (const track of clip.tracks) {
            if (!track || typeof track.setInterpolation !== 'function') {
              continue;
            }

            try {
              track.setInterpolation(interpolation);
            } catch {
              if (interpolation !== THREE_INTERPOLATE_LINEAR) {
                try {
                  track.setInterpolation(THREE_INTERPOLATE_LINEAR);
                } catch {
                  // Ignore tracks that reject runtime interpolation changes.
                }
              }
            }
          }

          if (typeof clip.resetDuration === 'function') {
            clip.resetDuration();
          }
        }
      }

      function phaseDistance(phase, center) {
        const delta = Math.abs(phase - center);
        return Math.min(delta, 1 - delta);
      }

      function bellPhase(phase, center, width) {
        const normalized = phaseDistance(phase, center) / width;
        if (normalized >= 1) {
          return 0;
        }

        const smooth = 1 - normalized * normalized * (3 - 2 * normalized);
        return smooth;
      }

      function mixWeight(target, name, value) {
        if (!name || !Number.isFinite(value)) {
          return;
        }

        const clamped = clamp01(value);
        if (clamped <= 0) {
          return;
        }

        target[name] = Math.max(target[name] || 0, clamped);
      }

      function buildPerformanceWeights(timeSeconds) {
        const t = Number.isFinite(timeSeconds) ? timeSeconds : 0;
        const weights = Object.create(null);

        if (currentExpressionPreset === 'grin') {
          const blink = Math.max(
            Math.pow(Math.max(0, Math.sin(t * 1.18 + 0.35)), 36),
            Math.pow(Math.max(0, Math.sin(t * 0.64 + 2.2)), 42)
          );

          mixWeight(weights, '真面目', 0.08);
          mixWeight(weights, '笑い', 0.62 * (1 - blink));
          mixWeight(weights, 'にやり', 0.72);
          mixWeight(weights, 'にこり', 0.48);
          mixWeight(weights, '上', 0.1);
          mixWeight(weights, 'まばたき', blink);
          mixWeight(weights, 'い', 0.46);
          mixWeight(weights, 'え', 0.18);
          mixWeight(weights, '∧', 0.3);
          mixWeight(weights, 'ワ', 0.12);

          return weights;
        }

        const laughEnergy = clamp01(
          0.5 + 0.22 * Math.sin(t * 0.68 + 0.4) + 0.12 * Math.sin(t * 1.34 + 2.1)
        );
        const blink = Math.max(
          Math.pow(Math.max(0, Math.sin(t * 1.55 + 0.35)), 30),
          Math.pow(Math.max(0, Math.sin(t * 0.82 + 2.4)), 34)
        );
        const eyeOpen = clamp01(0.18 + Math.max(0, Math.sin(t * 0.92 + 1.1)) * 0.22);
        const laughSquint =
          Math.pow(Math.max(0, Math.sin(t * 4.1 + 0.5)), 1.8) * 0.38 * laughEnergy;
        const sparkle = Math.max(0, Math.sin(t * 0.44 + 1.7));
        const mouthPhase = ((t * 3.8) % 1 + 1) % 1;

        mixWeight(weights, '真面目', 0.18);
        mixWeight(weights, 'びっくり', eyeOpen * (1 - blink));
        mixWeight(weights, '笑い', laughSquint * (1 - blink));
        mixWeight(weights, 'まばたき', blink);
        mixWeight(weights, 'にこり', 0.18 + laughEnergy * 0.28);
        mixWeight(weights, 'にやり', 0.08 + sparkle * 0.18);
        mixWeight(weights, '上', 0.06 + eyeOpen * 0.14);
        mixWeight(weights, '下', laughSquint * 0.12);
        mixWeight(weights, '照れ', sparkle * 0.1);

        mixWeight(weights, 'あ', bellPhase(mouthPhase, 0.08, 0.18) * (0.48 + laughEnergy * 0.24));
        mixWeight(weights, 'お', bellPhase(mouthPhase, 0.34, 0.16) * (0.42 + laughEnergy * 0.18));
        mixWeight(weights, 'ω', bellPhase(mouthPhase, 0.58, 0.14) * (0.26 + laughEnergy * 0.12));
        mixWeight(weights, '∧', bellPhase(mouthPhase, 0.82, 0.12) * (0.24 + laughEnergy * 0.1));
        mixWeight(weights, 'ワ', bellPhase(mouthPhase, 0.93, 0.1) * 0.18);

        if (((t * 0.18) % 1) > 0.86) {
          mixWeight(weights, 'てへぺろ', 0.12 * (1 - blink));
        }

        return weights;
      }

      function getCompositeExpressionWeights() {
        const viewer = getViewer();
        const composite = Object.create(null);

        for (const [name, value] of Object.entries(baseExpressionWeights)) {
          if (typeof value === 'number' && Number.isFinite(value)) {
            composite[name] = clamp01(value);
          }
        }

        const dynamicWeights = buildPerformanceWeights(viewer ? viewer.currentTime : 0);
        for (const [name, value] of Object.entries(dynamicWeights)) {
          composite[name] = Math.max(composite[name] || 0, value);
        }

        return composite;
      }

      function applyExpressionWeights() {
        if (!internalSceneRoot) {
          return;
        }

        if (internalSceneRoot.rotation) {
          internalSceneRoot.rotation.y = FRONT_FACING_ROTATION_Y;
        }

        const weights = getCompositeExpressionWeights();

        for (const binding of morphBindings) {
          for (const [name, index] of Object.entries(binding.dictionary)) {
            binding.influences[index] = weights[name] || 0;
          }
        }
      }

      function startMorphLoop() {
        stopMorphLoop();

        const tick = () => {
          applyExpressionWeights();
          morphAnimationHandle = requestAnimationFrame(tick);
        };

        tick();
      }

      function setExpressionWeights(weights) {
        baseExpressionWeights = Object.create(null);

        if (weights && typeof weights === 'object') {
          for (const [name, value] of Object.entries(weights)) {
            if (typeof value === 'number' && Number.isFinite(value)) {
              baseExpressionWeights[name] = clamp01(value);
            }
          }
        }

        applyExpressionWeights();
      }

      function computeSceneBounds(root) {
        if (!root || typeof root.updateMatrixWorld !== 'function') {
          return null;
        }

        root.updateMatrixWorld(true);

        let minX = Infinity;
        let minY = Infinity;
        let minZ = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let maxZ = -Infinity;

        root.traverse((node) => {
          if (!node || !node.isMesh || !node.geometry) {
            return;
          }

          if (!node.geometry.boundingBox && typeof node.geometry.computeBoundingBox === 'function') {
            node.geometry.computeBoundingBox();
          }

          const box = node.geometry.boundingBox;
          if (!box || !box.min || !box.max || !node.matrixWorld) {
            return;
          }

          const min = box.min;
          const max = box.max;
          const VectorCtor = min.constructor;
          const corners = [
            new VectorCtor(min.x, min.y, min.z),
            new VectorCtor(min.x, min.y, max.z),
            new VectorCtor(min.x, max.y, min.z),
            new VectorCtor(min.x, max.y, max.z),
            new VectorCtor(max.x, min.y, min.z),
            new VectorCtor(max.x, min.y, max.z),
            new VectorCtor(max.x, max.y, min.z),
            new VectorCtor(max.x, max.y, max.z),
          ];

          for (const point of corners) {
            point.applyMatrix4(node.matrixWorld);
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            minZ = Math.min(minZ, point.z);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
            maxZ = Math.max(maxZ, point.z);
          }
        });

        if (!Number.isFinite(minX)) {
          return null;
        }

        return {
          min: { x: minX, y: minY, z: minZ },
          max: { x: maxX, y: maxY, z: maxZ },
          center: {
            x: (minX + maxX) * 0.5,
            y: (minY + maxY) * 0.5,
            z: (minZ + maxZ) * 0.5,
          },
        };
      }

      function findPreferredAnchorNode(root) {
        if (!root || typeof root.traverse !== 'function') {
          return null;
        }

        let matchedNode = null;
        root.traverse((node) => {
          if (matchedNode || !node || typeof node.name !== 'string') {
            return;
          }

          if (PREFERRED_CAMERA_ANCHOR_NAMES.includes(node.name)) {
            matchedNode = node;
          }
        });

        return matchedNode;
      }

      function recenterSceneRoot() {
        if (!internalSceneRoot || !internalSceneRoot.position) {
          return;
        }

        internalSceneRoot.updateMatrixWorld(true);
        const anchorWorldPosition = getNodeWorldPosition(cameraAnchorNode);
        if (anchorWorldPosition) {
          internalSceneRoot.position.x -= anchorWorldPosition.x;
          internalSceneRoot.position.z -= anchorWorldPosition.z;
          return;
        }

        const bounds = computeSceneBounds(internalSceneRoot);
        if (!bounds) {
          return;
        }

        internalSceneRoot.position.x -= bounds.center.x;
        internalSceneRoot.position.z -= bounds.center.z;
      }

      function syncAutoCameraTarget(viewer) {
        const bounds = computeSceneBounds(internalSceneRoot);
        if (!bounds || !viewer) {
          return;
        }

        internalSceneRoot.updateMatrixWorld(true);
        const anchorWorldPosition = getNodeWorldPosition(cameraAnchorNode);
        const height = bounds.max.y - bounds.min.y;
        const targetX =
          (anchorWorldPosition ? anchorWorldPosition.x : bounds.center.x) + cameraTargetOffsetX;
        const targetZ = anchorWorldPosition ? anchorWorldPosition.z : bounds.center.z;
        autoCameraTarget =
          formatMeters(targetX) +
          ' ' +
          formatMeters(bounds.min.y + height * AUTO_TARGET_RATIO) +
          ' ' +
          formatMeters(targetZ);

        viewer.setAttribute('camera-target', autoCameraTarget);
      }

      function stabilizeSceneGraph(viewer) {
        internalSceneHandle = getInternalSceneHandle(viewer);
        internalSceneRoot = internalSceneHandle?.currentGLTF?.scene ?? null;
        cameraAnchorNode = null;
        morphBindings = [];

        if (!internalSceneRoot) {
          return {
            sceneFound: false,
            morphTargetCount: 0,
            morphTargetNames: [],
          };
        }

        if (internalSceneRoot.rotation) {
          internalSceneRoot.rotation.y = FRONT_FACING_ROTATION_Y;
        }

        if (internalSceneRoot.position) {
          internalSceneRoot.position.y = MODEL_VERTICAL_OFFSET;
        }

        cameraAnchorNode = findPreferredAnchorNode(internalSceneRoot);
        recenterSceneRoot();

        internalSceneRoot.traverse((node) => {
          if (!node || !node.isMesh) {
            return;
          }

          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach(patchThreeMaterial);

          if (node.morphTargetDictionary && Array.isArray(node.morphTargetInfluences)) {
            morphBindings.push({
              dictionary: node.morphTargetDictionary,
              influences: node.morphTargetInfluences,
            });
          }
        });

        applyAnimationInterpolation();
        syncAutoCameraTarget(viewer);
        startMorphLoop();

        return {
          sceneFound: true,
          ...collectMorphMetadata(),
        };
      }

      async function playFromStart(config) {
        const viewer = getViewer();
        if (!viewer) {
          return;
        }

        selectPrimaryAnimation(viewer);
        applyConfig(config);
        if (config && typeof config.expressionWeights === 'object') {
          setExpressionWeights(config.expressionWeights);
        }

        viewer.pause();
        viewer.currentTime = 0;
        playbackRequested = true;

        if (audioElement) {
          audioElement.currentTime = 0;
          audioElement.loop = isLooping;
          try {
            await audioElement.play();
          } catch {}
        }

        viewer.play();
        sendPlaybackStatus(true);
      }

      async function resume(config) {
        const viewer = getViewer();
        if (!viewer) {
          return;
        }

        selectPrimaryAnimation(viewer);
        applyConfig(config);
        if (config && typeof config.expressionWeights === 'object') {
          setExpressionWeights(config.expressionWeights);
        }

        playbackRequested = true;
        if (audioElement) {
          audioElement.loop = isLooping;
          try {
            await audioElement.play();
          } catch {}
        }

        viewer.play();
        sendPlaybackStatus(true);
      }

      function pauseViewer() {
        const viewer = getViewer();
        if (!viewer) {
          return;
        }

        if (audioElement) {
          audioElement.pause();
        }

        playbackRequested = false;
        viewer.pause();
        sendPlaybackStatus(true);
      }

      function stopViewer() {
        const viewer = getViewer();
        if (!viewer) {
          return;
        }

        if (audioElement) {
          audioElement.pause();
          audioElement.currentTime = 0;
        }

        playbackRequested = false;
        viewer.pause();
        viewer.currentTime = 0;
        applyExpressionWeights();
        sendPlaybackStatus(true);
      }

      async function mountResolvedViewer(resolvedModelUri, resolvedAudioUri) {
        notify('viewer-loading', '正在接入本地配乐');
        await prepareAudioTransport(resolvedAudioUri);

        app.innerHTML = \`
          <model-viewer
            id="viewer"
            src="\${resolvedModelUri}"
            orientation="0deg 0deg 0deg"
            camera-controls
            disable-pan
            camera-orbit="\${initialCameraOrbit}"
            camera-target="\${initialCameraTarget || DEFAULT_CAMERA_TARGET}"
            field-of-view="24.4deg"
            min-camera-orbit="-360deg 44deg 1.78m"
            max-camera-orbit="360deg 88deg 7.8m"
            interaction-prompt="none"
            shadow-intensity="0.74"
            shadow-softness="1.08"
            exposure="1.05"
            tone-mapping="agx"
            environment-image="neutral"
          ></model-viewer>
        \`;

        const viewer = getViewer();

        if (!viewer) {
          notify('viewer-error', '页面中的 model-viewer 节点没有成功创建。');
          viewerMounted = false;
          return;
        }

        viewer.addEventListener('camera-change', () => {
          scheduleCameraState(false);
        });

        viewer.addEventListener('load', () => {
          const animationCount = selectPrimaryAnimation(viewer);
          const sceneInfo = stabilizeSceneGraph(viewer);
          currentAnimationDuration =
            typeof viewer.duration === 'number' && Number.isFinite(viewer.duration)
              ? viewer.duration
              : 0;
          applyConfig({
            animationSpeed: initialAnimationSpeed,
            cameraOrbit: initialCameraOrbit,
            cameraTarget: initialCameraTarget,
          });
          viewer.pause();
          viewer.currentTime = 0;
          setExpressionWeights(baseExpressionWeights);
          startPlaybackMonitor();
          sendPlaybackStatus(true);
          sendCameraState(true);

          notify('viewer-ready', {
            message: '舞台已准备好。',
            sceneFound: sceneInfo.sceneFound,
            morphTargetCount: sceneInfo.morphTargetCount,
            morphTargetNames: sceneInfo.morphTargetNames,
            animationCount,
          });
        });

        viewer.addEventListener('error', () => {
          viewerMounted = false;
          notify('viewer-error', '舞台资源加载失败，请稍后重试。');
        });
      }

      async function maybeMountTransferredViewer() {
        if (!viewerMountRequested || viewerMounted || !areTransferredAssetsReady()) {
          return;
        }

        viewerMounted = true;
        try {
          await mountResolvedViewer(currentBlobUrl, audioBlobUrl);
        } catch (error) {
          viewerMounted = false;
          const message = error && typeof error.message === 'string' ? error.message : String(error);
          notify('viewer-error', '舞台初始化异常：' + message);
        }
      }

      function handleBridgeEvent(event) {
        try {
          const payload = JSON.parse(event.data);
          if (!payload || typeof payload.type !== 'string') {
            return;
          }

          if (payload.type === 'asset-transfer-start') {
            const kind = payload.kind === 'audio' ? 'audio' : 'model';
            resetAssetBridge(kind);
            const state = getAssetBridge(kind);
            if (!state) {
              return;
            }
            state.status = 'transferring';
            state.mimeType =
              typeof payload.mimeType === 'string' && payload.mimeType
                ? payload.mimeType
                : getDefaultAssetMimeType(kind);
            state.totalChunks =
              typeof payload.totalChunks === 'number' && Number.isFinite(payload.totalChunks)
                ? payload.totalChunks
                : 0;
            state.totalBytes =
              typeof payload.totalBytes === 'number' && Number.isFinite(payload.totalBytes)
                ? payload.totalBytes
                : 0;
            state.receivedChunks = 0;
            state.buffers = [];
            return;
          }

          if (payload.type === 'asset-transfer-chunk') {
            const kind = payload.kind === 'audio' ? 'audio' : 'model';
            const state = getAssetBridge(kind);
            if (!state || typeof payload.data !== 'string') {
              return;
            }
            state.status = 'transferring';
            state.buffers.push(decodeBase64Chunk(payload.data));
            state.receivedChunks += 1;
            return;
          }

          if (payload.type === 'asset-transfer-end') {
            const kind = payload.kind === 'audio' ? 'audio' : 'model';
            const state = getAssetBridge(kind);
            if (!state) {
              return;
            }
            finalizeAssetBridge(kind);
            void maybeMountTransferredViewer();
            return;
          }

          if (payload.type === 'asset-transfer-skip') {
            const kind = payload.kind === 'audio' ? 'audio' : 'model';
            if (kind === 'audio') {
              releaseBlobUrl('audio');
              setAssetBridge('audio', {
                kind: 'audio',
                status: 'skipped',
                mimeType: getDefaultAssetMimeType('audio'),
                buffers: [],
                totalChunks: 0,
                receivedChunks: 0,
                totalBytes: 0,
              });
              void maybeMountTransferredViewer();
            }
            return;
          }

          if (payload.type === 'asset-transfer-error') {
            const message =
              typeof payload.message === 'string' && payload.message
                ? payload.message
                : '离线资源传输失败，请重新打开应用后再试。';
            notify('viewer-error', message);
            return;
          }

          if (payload.type === 'configure') {
            applyConfig(payload);
            if (typeof payload.expressionWeights === 'object') {
              setExpressionWeights(payload.expressionWeights);
            }
            return;
          }

          if (payload.type === 'playFromStart') {
            playFromStart(payload);
            return;
          }

          if (payload.type === 'resume') {
            resume(payload);
            return;
          }

          if (payload.type === 'pause') {
            pauseViewer();
            return;
          }

          if (payload.type === 'stop') {
            stopViewer();
            return;
          }

          if (payload.type === 'expression') {
            setExpressionWeights(payload.weights);
          }
        } catch {
          // Ignore malformed bridge messages.
        }
      }

      window.addEventListener('message', handleBridgeEvent);
      document.addEventListener('message', handleBridgeEvent);

      window.addEventListener('beforeunload', () => {
        stopMorphLoop();
        stopPlaybackMonitor();
        stopCameraStateLoop();
        teardownAudio();
        releaseBlobUrl('model');
      });

      async function mountViewer() {
        if (!modelUri) {
          app.innerHTML = \`
            <div class="placeholder">
              <div class="placeholder-card">
                <div class="placeholder-title">还没有舞台</div>
                <div class="placeholder-desc">\${posterText}</div>
              </div>
            </div>
          \`;
          notify('viewer-error', '没有找到打包进应用内的 GLB 资源。');
          return;
        }

        viewerMounted = false;
        viewerMountRequested = true;
        resetAssetBridge('model');
        resetAssetBridge('audio');
        notify('viewer-loading', '正在唤醒离线舞台。');
        notify('viewer-request-assets', {
          needsAudio: Boolean(audioUri),
        });
      }

      void mountViewer().catch((error) => {
        const message = error && typeof error.message === 'string' ? error.message : String(error);
        notify('viewer-error', '舞台初始化异常：' + message);
      });
    </script>
  </body>
</html>
  `;
}
