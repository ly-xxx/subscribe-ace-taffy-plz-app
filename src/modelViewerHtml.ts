import { modelViewerScript } from './vendor/modelViewerScript';

export function createModelViewerHtml({
  modelUri,
  audioUri,
  posterText,
  initialAnimationSpeed,
  initialCameraOrbit,
}: {
  modelUri: string | null;
  audioUri: string | null;
  posterText: string;
  initialAnimationSpeed: number;
  initialCameraOrbit: string;
}) {
  const safeModelUri = modelUri ? JSON.stringify(modelUri) : 'null';
  const safeAudioUri = audioUri ? JSON.stringify(audioUri) : 'null';
  const safePosterText = JSON.stringify(posterText);
  const safeAnimationSpeed = JSON.stringify(initialAnimationSpeed);
  const safeCameraOrbit = JSON.stringify(initialCameraOrbit);
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
        --bg: #fff9fb;
        --bg-soft: #ffffff;
        --warm: rgba(255, 226, 235, 0.44);
        --warm-soft: rgba(255, 231, 239, 0.34);
        --cool: rgba(251, 241, 246, 0.28);
        --floor: rgba(63, 44, 17, 0.28);
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
          radial-gradient(circle at 18% 12%, rgba(255, 229, 236, 0.28), transparent 30%),
          radial-gradient(circle at 82% 18%, rgba(255, 240, 246, 0.2), transparent 26%),
          radial-gradient(circle at 50% 116%, rgba(255, 220, 232, 0.18), transparent 30%),
          linear-gradient(180deg, var(--bg-soft) 0%, #fffbfd 34%, var(--bg) 74%, #fff6fa 100%);
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
        filter: blur(34px);
        mix-blend-mode: screen;
        transition: transform 180ms linear, opacity 180ms linear;
      }

      .light-key {
        top: -10%;
        left: -8%;
        width: 70%;
        height: 30%;
        background: radial-gradient(circle at 58% 58%, var(--warm), transparent 74%);
      }

      .light-fill {
        top: 4%;
        right: -18%;
        width: 58%;
        height: 28%;
        background: radial-gradient(circle at 34% 48%, var(--cool), transparent 74%);
      }

      .light-bounce {
        left: 6%;
        right: 6%;
        bottom: -10%;
        height: 30%;
        background: radial-gradient(circle at 50% 24%, var(--warm-soft), transparent 78%);
      }

      .floor-shadow {
        position: absolute;
        left: 14%;
        right: 14%;
        bottom: 6%;
        height: 18%;
        border-radius: 999px;
        background:
          radial-gradient(circle at 50% 45%, rgba(44, 31, 12, 0.36) 0%, rgba(44, 31, 12, 0.2) 32%, transparent 74%);
        filter: blur(26px);
        pointer-events: none;
        transition: transform 180ms linear, opacity 180ms linear;
      }

      .floor-contact {
        position: absolute;
        left: 24%;
        right: 24%;
        bottom: 9.4%;
        height: 9%;
        border-radius: 999px;
        background: radial-gradient(circle at 50% 50%, rgba(48, 34, 12, 0.34), transparent 74%);
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
        filter: saturate(1.24) contrast(1.12) brightness(0.985);
      }
    </style>
    <script>${inlineModelViewerScript}</script>
  </head>
  <body>
    <div class="stage" id="stageRoot">
      <div class="light light-key" id="lightKey"></div>
      <div class="light light-fill" id="lightFill"></div>
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

      const OPAQUE_MATERIALS = new Set(['Body', 'Ear']);
      const BLEND_MATERIALS = new Set(['Dark+Water']);
      const HAIR_MATERIALS = new Set(['MaWei_x2', 'Hair_CeFa', 'Hair_LiuHai']);
      const ACCENT_MATERIALS = new Set(['Glass+Toy+Bow', 'Star+Red', 'Dark+Water']);
      const DEFAULT_CAMERA_TARGET = '0m 0.96m 0m';
      const FRONT_FACING_ROTATION_Y = Math.PI;
      const MODEL_VERTICAL_OFFSET = -0.08;
      const AUTO_TARGET_RATIO = 0.82;

      const app = document.getElementById('app');
      const stageRoot = document.getElementById('stageRoot');
      const lightKey = document.getElementById('lightKey');
      const lightFill = document.getElementById('lightFill');
      const lightBounce = document.getElementById('lightBounce');
      const floorShadowEl = document.getElementById('floorShadow');
      const floorContactEl = document.getElementById('floorContact');

      let currentBlobUrl = null;
      let audioBlobUrl = null;
      let internalSceneHandle = null;
      let internalSceneRoot = null;
      let morphBindings = [];
      let morphAnimationHandle = null;
      let playbackMonitorHandle = null;
      let baseExpressionWeights = Object.create(null);
      let autoCameraTarget = DEFAULT_CAMERA_TARGET;
      let selectedAnimationName = '';
      let isLooping = true;
      let currentAnimationDuration = 0;
      let visualEnergy = 0;
      let lastPlaybackStatus = '';
      let lastPlaybackStatusAt = 0;
      let audioElement = null;
      let audioContext = null;
      let audioAnalyser = null;
      let audioDataArray = null;

      function notify(type, detail) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type, detail }));
        }
      }

      function getViewer() {
        return document.getElementById('viewer');
      }

      function clamp01(value) {
        return Math.min(1, Math.max(0, value));
      }

      function formatMeters(value) {
        return String(Number(value.toFixed(4))) + 'm';
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

        try {
          const blob = await fetchBlobWithFetch(uri);
          const blobUrl = URL.createObjectURL(blob);
          if (kind === 'audio') {
            audioBlobUrl = blobUrl;
          } else {
            currentBlobUrl = blobUrl;
          }
          notify('viewer-loading', '已通过 fetch 预读本地' + label + '。');
          return blobUrl;
        } catch (fetchError) {
          try {
            const blob = await fetchBlobWithXhr(uri);
            const blobUrl = URL.createObjectURL(blob);
            if (kind === 'audio') {
              audioBlobUrl = blobUrl;
            } else {
              currentBlobUrl = blobUrl;
            }
            notify('viewer-loading', '已通过 XHR 预读本地' + label + '。');
            return blobUrl;
          } catch (xhrError) {
            const fetchMessage =
              fetchError && typeof fetchError.message === 'string'
                ? fetchError.message
                : String(fetchError);
            const xhrMessage =
              xhrError && typeof xhrError.message === 'string'
                ? xhrError.message
                : String(xhrError);
            throw new Error('fetch=' + fetchMessage + '; xhr=' + xhrMessage);
          }
        }
      }

      function teardownAudio() {
        if (audioElement) {
          audioElement.pause();
          audioElement.src = '';
          audioElement.load();
          audioElement = null;
        }

        if (audioContext && typeof audioContext.close === 'function') {
          audioContext.close().catch(() => {});
        }

        audioContext = null;
        audioAnalyser = null;
        audioDataArray = null;
        releaseBlobUrl('audio');
      }

      async function prepareAudioTransport(resolvedAudioUri) {
        teardownAudio();

        if (!resolvedAudioUri) {
          return null;
        }

        const audio = new Audio(resolvedAudioUri);
        audio.preload = 'auto';
        audio.loop = isLooping;
        audio.playsInline = true;
        audio.crossOrigin = 'anonymous';

        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (AudioContextCtor) {
          try {
            audioContext = new AudioContextCtor();
            const source = audioContext.createMediaElementSource(audio);
            audioAnalyser = audioContext.createAnalyser();
            audioAnalyser.fftSize = 128;
            source.connect(audioAnalyser);
            audioAnalyser.connect(audioContext.destination);
            audioDataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
          } catch {
            audioContext = null;
            audioAnalyser = null;
            audioDataArray = null;
          }
        }

        audioElement = audio;
        audio.addEventListener('ended', () => {
          const viewer = getViewer();
          if (viewer && !isLooping) {
            viewer.pause();
          }
          sendPlaybackStatus(true);
        });
        audio.addEventListener('pause', () => {
          sendPlaybackStatus(true);
        });
        audio.addEventListener('play', () => {
          sendPlaybackStatus(true);
        });
        audio.addEventListener('loadedmetadata', () => {
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

        if (typeof config.cameraTarget === 'string') {
          viewer.setAttribute('camera-target', config.cameraTarget);
        } else {
          viewer.setAttribute('camera-target', autoCameraTarget);
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
      }

      function readVisualEnergy() {
        if (!audioAnalyser || !audioDataArray) {
          if (audioElement && !audioElement.paused) {
            return 0.08 + Math.max(0, Math.sin(audioElement.currentTime * 3.6)) * 0.08;
          }
          return 0;
        }

        audioAnalyser.getByteFrequencyData(audioDataArray);
        let total = 0;
        const count = Math.min(12, audioDataArray.length);
        for (let index = 0; index < count; index += 1) {
          total += audioDataArray[index];
        }
        return count > 0 ? total / count / 255 : 0;
      }

      function paintStudio() {
        visualEnergy = visualEnergy * 0.82 + readVisualEnergy() * 0.18;
        document.documentElement.style.setProperty('--pulse', visualEnergy.toFixed(4));

        if (stageRoot) {
          stageRoot.style.transform =
            'translate3d(0,' + String((-visualEnergy * 2.4).toFixed(2)) + 'px,0)';
        }
        if (lightKey) {
          lightKey.style.opacity = String(0.9 + visualEnergy * 0.16);
          lightKey.style.transform = 'scale(' + String((1 + visualEnergy * 0.025).toFixed(4)) + ')';
        }
        if (lightFill) {
          lightFill.style.opacity = String(0.86 + visualEnergy * 0.1);
          lightFill.style.transform = 'scale(' + String((1 + visualEnergy * 0.018).toFixed(4)) + ')';
        }
        if (lightBounce) {
          lightBounce.style.opacity = String(0.88 + visualEnergy * 0.12);
        }
        if (floorShadowEl) {
          floorShadowEl.style.transform = 'scale(' + String((1 + visualEnergy * 0.018).toFixed(4)) + ')';
          floorShadowEl.style.opacity = String(0.88 + visualEnergy * 0.12);
        }
        if (floorContactEl) {
          floorContactEl.style.transform = 'scale(' + String((1 + visualEnergy * 0.025).toFixed(4)) + ')';
        }
      }

      function buildPlaybackStatus() {
        const duration =
          audioElement && Number.isFinite(audioElement.duration) ? audioElement.duration : currentAnimationDuration;
        const currentTime =
          audioElement && Number.isFinite(audioElement.currentTime) ? audioElement.currentTime : 0;
        const progress = duration > 0 ? clamp01(currentTime / duration) : 0;
        const playing = Boolean(audioElement && !audioElement.paused && !audioElement.ended);

        return {
          playing,
          progress,
          currentTime,
          duration,
          energy: visualEnergy,
          didFinish: !playing && duration > 0 && currentTime >= duration - 0.03,
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
        if (!viewer || !audioElement) {
          return;
        }

        if (currentAnimationDuration > 0 && audioElement.currentTime >= currentAnimationDuration) {
          if (isLooping) {
            audioElement.currentTime = 0;
            viewer.currentTime = 0;
          } else {
            audioElement.pause();
            audioElement.currentTime = currentAnimationDuration;
            viewer.pause();
            viewer.currentTime = currentAnimationDuration;
          }
        }

        if (!audioElement.paused) {
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
        const isHair = HAIR_MATERIALS.has(name);
        const isAccent = ACCENT_MATERIALS.has(name);

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
          material.roughness = isAccent ? 0.34 : isHair ? 0.68 : 0.74;
        }

        if ('metalness' in material) {
          material.metalness = isAccent ? 0.04 : 0;
        }

        if ('envMapIntensity' in material) {
          material.envMapIntensity = isAccent ? 0.72 : isHair ? 0.46 : 0.36;
        }

        material.side = 2;
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

        return names.length;
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

      function syncAutoCameraTarget(viewer) {
        const bounds = computeSceneBounds(internalSceneRoot);
        if (!bounds || !viewer) {
          return;
        }

        const height = bounds.max.y - bounds.min.y;
        autoCameraTarget =
          formatMeters(bounds.center.x) +
          ' ' +
          formatMeters(bounds.min.y + height * AUTO_TARGET_RATIO) +
          ' ' +
          formatMeters(bounds.center.z);

        viewer.setAttribute('camera-target', autoCameraTarget);
      }

      function stabilizeSceneGraph(viewer) {
        internalSceneHandle = getInternalSceneHandle(viewer);
        internalSceneRoot = internalSceneHandle?.currentGLTF?.scene ?? null;
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

        syncAutoCameraTarget(viewer);
        startMorphLoop();

        return {
          sceneFound: true,
          ...collectMorphMetadata(),
        };
      }

      async function ensureAudioRunning() {
        if (audioContext && audioContext.state === 'suspended') {
          try {
            await audioContext.resume();
          } catch {
            // Some WebViews reject resume until after a gesture.
          }
        }
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

        if (audioElement) {
          await ensureAudioRunning();
          audioElement.currentTime = 0;
          audioElement.loop = isLooping;
          audioElement.play().catch(() => {
            sendPlaybackStatus(true);
          });
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

        if (audioElement) {
          await ensureAudioRunning();
          audioElement.loop = isLooping;
          audioElement.play().catch(() => {
            sendPlaybackStatus(true);
          });
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

        viewer.pause();
        viewer.currentTime = 0;
        applyExpressionWeights();
        sendPlaybackStatus(true);
      }

      function handleBridgeEvent(event) {
        try {
          const payload = JSON.parse(event.data);
          if (!payload || typeof payload.type !== 'string') {
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

        notify('viewer-loading', '离线舞台已启动，正在读取本地 GLB 与配乐。');

        let resolvedModelUri = modelUri;
        let resolvedAudioUri = null;
        try {
          const resolved = await Promise.all([
            resolveAssetSource(modelUri, 'model', 'GLB'),
            audioUri ? resolveAssetSource(audioUri, 'audio', '音频') : Promise.resolve(null),
          ]);
          resolvedModelUri = resolved[0];
          resolvedAudioUri = resolved[1];
        } catch (error) {
          const message =
            error && typeof error.message === 'string' ? error.message : String(error);
          notify('viewer-error', '本地资源预读失败：' + message);
          return;
        }

        await prepareAudioTransport(resolvedAudioUri);

        app.innerHTML = \`
          <model-viewer
            id="viewer"
            src="\${resolvedModelUri}"
            orientation="0deg 0deg 0deg"
            camera-controls
            disable-pan
            camera-orbit="\${initialCameraOrbit}"
            camera-target="\${DEFAULT_CAMERA_TARGET}"
            field-of-view="24deg"
            min-camera-orbit="auto 54deg 2.1m"
            max-camera-orbit="auto 84deg 6.2m"
            interaction-prompt="none"
            shadow-intensity="1.18"
            shadow-softness="0.4"
            exposure="0.98"
            tone-mapping="agx"
            environment-image="neutral"
          ></model-viewer>
        \`;

        const viewer = getViewer();

        if (!viewer) {
          notify('viewer-error', '页面中的 model-viewer 节点没有成功创建。');
          return;
        }

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
          });
          viewer.pause();
          viewer.currentTime = 0;
          setExpressionWeights(baseExpressionWeights);
          startPlaybackMonitor();
          sendPlaybackStatus(true);

          const rect = viewer.getBoundingClientRect();

          notify('viewer-ready', {
            message:
              '离线舞台已完成挂载。视口 ' +
              Math.round(rect.width) +
              'x' +
              Math.round(rect.height) +
              '，动画 ' +
              animationCount +
              '，morph ' +
              sceneInfo.morphTargetCount +
              '，时长 ' +
              Math.round(currentAnimationDuration * 10) / 10 +
              '。',
            sceneFound: sceneInfo.sceneFound,
            morphTargetCount: sceneInfo.morphTargetCount,
            morphTargetNames: sceneInfo.morphTargetNames,
          });
        });

        viewer.addEventListener('error', () => {
          notify(
            'viewer-error',
            'model-viewer 没有成功读取到本地 GLB 资源。当前源：' +
              (resolvedModelUri.startsWith('blob:') ? 'blob URL' : resolvedModelUri)
          );
        });
      }

      void mountViewer();
    </script>
  </body>
</html>
  `;
}
