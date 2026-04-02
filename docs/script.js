const revealNodes = [...document.querySelectorAll('.reveal')];
const progressBarRoot = document.documentElement;
const topbar = document.querySelector('.topbar');
const copyButtons = [...document.querySelectorAll('[data-copy-target]')];
const parallaxGroups = [...document.querySelectorAll('[data-parallax-group]')];
const motionSafe = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    }
  },
  { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
);

for (const node of revealNodes) revealObserver.observe(node);

function updateScrollProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
  progressBarRoot.style.setProperty('--scroll-progress', `${ratio * 100}%`);
  topbar?.classList.toggle('is-scrolled', window.scrollY > 18);
}

function updateParallax(event) {
  if (!motionSafe) return;

  for (const group of parallaxGroups) {
    const bounds = group.getBoundingClientRect();
    if (!bounds.width || !bounds.height) continue;

    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    const layers = [...group.querySelectorAll('[data-depth]')];

    for (const layer of layers) {
      const depth = Number.parseFloat(layer.getAttribute('data-depth') || '0');
      const moveX = x * depth;
      const moveY = y * depth * 0.8;
      layer.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
    }
  }
}

function resetParallax() {
  if (!motionSafe) return;

  for (const group of parallaxGroups) {
    const layers = [...group.querySelectorAll('[data-depth]')];
    for (const layer of layers) {
      layer.style.transform = 'translate3d(0, 0, 0)';
    }
  }
}

for (const button of copyButtons) {
  button.addEventListener('click', async () => {
    const targetId = button.getAttribute('data-copy-target');
    const targetNode = targetId ? document.getElementById(targetId) : null;
    const content = targetNode?.textContent?.trim();
    if (!content) return;

    const original = button.textContent || '复制';

    try {
      await navigator.clipboard.writeText(content);
      button.textContent = '已复制';
      window.setTimeout(() => {
        button.textContent = original;
      }, 1400);
    } catch {
      button.textContent = '复制失败';
      window.setTimeout(() => {
        button.textContent = original;
      }, 1400);
    }
  });
}

updateScrollProgress();

window.addEventListener('scroll', updateScrollProgress, { passive: true });
window.addEventListener('mousemove', updateParallax, { passive: true });
window.addEventListener('mouseleave', resetParallax);
