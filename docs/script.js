const revealNodes = [...document.querySelectorAll('.reveal')];
const currentYearNodes = [...document.querySelectorAll('[data-current-year]')];
const releaseStatusNodes = [...document.querySelectorAll('[data-release-status]')];
const releaseVersionNodes = [...document.querySelectorAll('[data-release-version]')];
const releaseDateNodes = [...document.querySelectorAll('[data-release-date]')];
const releaseSizeNodes = [...document.querySelectorAll('[data-release-size]')];
const releaseLinkNodes = [...document.querySelectorAll('[data-release-link]')];
const body = document.body;
const repoOwner = body?.dataset.repoOwner || 'ly-xxx';
const repoName = body?.dataset.repoName || 'subscribe-ace-taffy-plz-app';
const releasesPageUrl = `https://github.com/${repoOwner}/${repoName}/releases`;
const latestReleaseApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`;

const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    }
  },
  { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
);

for (const node of revealNodes) {
  revealObserver.observe(node);
}

for (const node of currentYearNodes) {
  node.textContent = String(new Date().getFullYear());
}

function setText(nodes, value) {
  for (const node of nodes) {
    node.textContent = value;
  }
}

function formatMegabytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return '';

  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function setReleaseLink(kind, href, label) {
  for (const node of releaseLinkNodes) {
    if (node.dataset.releaseLink !== kind) continue;
    node.href = href;
    node.textContent = label;
  }
}

function applyReleaseFallback() {
  setText(releaseStatusNodes, '待发布');
  setText(releaseVersionNodes, '尚未发布');
  setText(releaseDateNodes, '推送 tag 后自动更新');
  setText(releaseSizeNodes, 'GitHub Releases / APK');
  setReleaseLink('apk', releasesPageUrl, '查看 Releases');
  setReleaseLink('aab', releasesPageUrl, '查看 AAB');
  setReleaseLink('releases', releasesPageUrl, '全部版本');
}

function findAsset(assets, extension) {
  return assets.find((asset) => asset.name.toLowerCase().endsWith(extension));
}

async function hydrateLatestRelease() {
  try {
    const response = await fetch(latestReleaseApiUrl, {
      headers: {
        Accept: 'application/vnd.github+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const release = await response.json();
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const apkAsset = findAsset(assets, '.apk');
    const aabAsset = findAsset(assets, '.aab');
    const releaseDate = formatDate(release.published_at || release.created_at);
    const releaseName = release.name || release.tag_name || '最新版本';
    const status = release.prerelease ? '预发布' : '正式版';
    const apkSize = apkAsset ? formatMegabytes(apkAsset.size) : '';

    setText(releaseStatusNodes, status);
    setText(releaseVersionNodes, releaseName);
    setText(releaseDateNodes, releaseDate ? `发布于 ${releaseDate}` : 'GitHub Releases');
    setText(releaseSizeNodes, apkSize ? `${apkSize} / APK` : 'GitHub Releases / APK');

    if (apkAsset?.browser_download_url) {
      setReleaseLink('apk', apkAsset.browser_download_url, apkSize ? `下载 APK · ${apkSize}` : '下载 APK');
    } else {
      setReleaseLink('apk', release.html_url || releasesPageUrl, '查看 APK');
    }

    if (aabAsset?.browser_download_url) {
      setReleaseLink('aab', aabAsset.browser_download_url, '下载 AAB');
    } else {
      setReleaseLink('aab', release.html_url || releasesPageUrl, '查看 AAB');
    }

    setReleaseLink('releases', release.html_url || releasesPageUrl, '全部版本');
  } catch (error) {
    applyReleaseFallback();
    console.warn('Failed to fetch latest GitHub release:', error);
  }
}

applyReleaseFallback();
hydrateLatestRelease();
