import { modelViewerScript } from './vendor/modelViewerScript';

export function createModelViewerHtml({
  modelUri,
  posterText,
  initialAnimationSpeed,
  initialCameraOrbit,
}: {
  modelUri: string | null;
  posterText: string;
  initialAnimationSpeed: number;
  initialCameraOrbit: string;
}) {
  const safeModelUri = modelUri ? JSON.stringify(modelUri) : 'null';
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
        color-scheme: dark;
        --bg: #08111a;
        --panel: rgba(10, 18, 30, 0.96);
        --glow: rgba(247, 176, 64, 0.14);
        --grid: rgba(255, 255, 255, 0.05);
        --text: #f7f7f7;
        --muted: #a9b4c8;
      }
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background:
          radial-gradient(circle at top, var(--glow), transparent 36%),
          linear-gradient(180deg, #0d1829 0%, var(--bg) 100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .shell {
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
      }
      .grid {
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(var(--grid) 1px, transparent 1px),
          linear-gradient(90deg, var(--grid) 1px, transparent 1px);
        background-size: 32px 32px;
        mask-image: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.95) 26%, rgba(0,0,0,0.95) 100%);
        pointer-events: none;
      }
      .placeholder {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 28px;
        color: var(--text);
      }
      .placeholder-card {
        max-width: 340px;
        padding: 22px 18px;
        border-radius: 24px;
        background: rgba(255,255,255,0.05);
        box-shadow: 0 18px 64px rgba(0,0,0,0.3);
        backdrop-filter: blur(12px);
      }
      .eyebrow {
        color: #ffd892;
        font-size: 12px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      .title {
        margin-top: 10px;
        font-size: 24px;
        font-weight: 700;
      }
      .desc {
        margin-top: 10px;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.6;
      }
      model-viewer {
        width: 100%;
        height: 100%;
        --poster-color: transparent;
        background: transparent;
      }
    </style>
    <script>${inlineModelViewerScript}</script>
  </head>
  <body>
    <div class="shell">
      <div id="app"></div>
      <div class="grid"></div>
    </div>
    <script>
      const modelUri = ${safeModelUri};
      const posterText = ${safePosterText};
      const initialAnimationSpeed = ${safeAnimationSpeed};
      const initialCameraOrbit = ${safeCameraOrbit};
      const app = document.getElementById('app');

      function notify(type) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type }));
        }
      }

      function getViewer() {
        return document.getElementById('viewer');
      }

      function applyConfig(config) {
        const viewer = getViewer();
        if (!viewer || !config) {
          return;
        }

        if (typeof config.cameraOrbit === 'string') {
          viewer.setAttribute('camera-orbit', config.cameraOrbit);
        }

        if (typeof config.animationSpeed === 'number' && Number.isFinite(config.animationSpeed)) {
          viewer.timeScale = config.animationSpeed;
        }
      }

      function playFromStart(config) {
        const viewer = getViewer();
        if (!viewer) {
          return;
        }

        applyConfig(config);
        viewer.pause();
        viewer.currentTime = 0;
        viewer.play();
      }

      function resume(config) {
        const viewer = getViewer();
        if (!viewer) {
          return;
        }

        applyConfig(config);
        viewer.play();
      }

      function pauseViewer() {
        const viewer = getViewer();
        if (!viewer) {
          return;
        }

        viewer.pause();
      }

      function stopViewer() {
        const viewer = getViewer();
        if (!viewer) {
          return;
        }

        viewer.pause();
        viewer.currentTime = 0;
      }

      function handleBridgeEvent(event) {
        try {
          const payload = JSON.parse(event.data);
          if (!payload || typeof payload.type !== 'string') {
            return;
          }

          if (payload.type === 'configure') {
            applyConfig(payload);
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
          }
        } catch {
          // Ignore malformed bridge messages.
        }
      }

      window.addEventListener('message', handleBridgeEvent);
      document.addEventListener('message', handleBridgeEvent);

      if (!modelUri) {
        app.innerHTML = \`
          <div class="placeholder">
            <div class="placeholder-card">
              <div class="eyebrow">Conversion Pending</div>
              <div class="title">还没有 GLB</div>
              <div class="desc">\${posterText}</div>
            </div>
          </div>
        \`;
        notify('viewer-error');
      } else {
        app.innerHTML = \`
          <model-viewer
            id="viewer"
            src="\${modelUri}"
            camera-controls
            interaction-prompt="none"
            shadow-intensity="0.82"
            exposure="1.0"
            environment-image="neutral"
          ></model-viewer>
        \`;

        const viewer = getViewer();

        if (!viewer) {
          notify('viewer-error');
        } else {
          viewer.addEventListener('load', () => {
            applyConfig({
              animationSpeed: initialAnimationSpeed,
              cameraOrbit: initialCameraOrbit,
            });
            viewer.pause();
            viewer.currentTime = 0;
            notify('viewer-ready');
          });

          viewer.addEventListener('error', () => {
            notify('viewer-error');
          });
        }
      }
    </script>
  </body>
</html>
  `;
}
