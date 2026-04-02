export function createModelViewerHtml({
  modelUri,
  posterText,
}: {
  modelUri: string | null;
  posterText: string;
}) {
  const safeModelUri = modelUri ? JSON.stringify(modelUri) : 'null';
  const safePosterText = JSON.stringify(posterText);

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
        --bg: #0c1220;
        --panel: #111a2d;
        --accent: #ffd369;
        --text: #f7f7f7;
        --muted: #a9b4c8;
      }
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background:
          radial-gradient(circle at top, rgba(255, 211, 105, 0.14), transparent 34%),
          linear-gradient(180deg, #101828 0%, var(--bg) 100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .shell {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: stretch;
        justify-content: stretch;
      }
      .panel {
        position: relative;
        width: 100%;
        height: 100%;
        border: 1px solid rgba(255,255,255,0.06);
        background: linear-gradient(180deg, rgba(17,26,45,0.92), rgba(11,18,32,0.98));
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
        padding: 20px 18px;
        border-radius: 24px;
        background: rgba(255,255,255,0.04);
        box-shadow: 0 18px 64px rgba(0,0,0,0.26);
        backdrop-filter: blur(12px);
      }
      .eyebrow {
        color: var(--accent);
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
      .badge {
        position: absolute;
        left: 14px;
        top: 14px;
        padding: 7px 10px;
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.32);
        color: #f5e9b9;
        font-size: 12px;
        letter-spacing: 0.05em;
      }
    </style>
    <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
  </head>
  <body>
    <div class="shell">
      <div class="panel">
        <div class="badge">MMD -> GLB Viewer</div>
        <div id="app"></div>
      </div>
    </div>
    <script>
      const modelUri = ${safeModelUri};
      const posterText = ${safePosterText};
      const app = document.getElementById('app');

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
      } else {
        app.innerHTML = \`
          <model-viewer
            id="viewer"
            src="\${modelUri}"
            camera-controls
            autoplay
            interaction-prompt="none"
            shadow-intensity="0.8"
            exposure="1.0"
            environment-image="neutral"
          ></model-viewer>
        \`;
      }
    </script>
  </body>
</html>
  `;
}
