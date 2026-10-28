import { createRoot } from 'react-dom/client';
import GradientASCII from './GradientASCII';

const roots = new WeakMap();

function mount(target) {
  if (!target || roots.has(target)) return;

  const root = createRoot(target);
  roots.set(target, root);
  root.render(
    <GradientASCII
      colors={['#10b981', '#f6f8ff', '#a5d8ff', '#84cc16']}
      shape="horizon"
      characters=" =+xX0S8#@"
      cellSize={18}
      density={0.8}
      glyphOpacity={0.85}
      glow={0.2}
      depthOfField={0}
      flicker={0.2}
      softness={0.5}
      scale={1}
      flow={0.5}
      speed={1}
      gradientOpacity={0.9}
      grain={0.08}
      variation={0}
      mouseInteraction
      scrambleRadius={0.1}
      clickEffect="wave"
      intro
      lightMode={false}
    />,
  );
}

function unmount(target) {
  const root = roots.get(target);
  if (!root) return;
  root.unmount();
  roots.delete(target);
}

window.PortfolioGradientASCII = { mount, unmount };

function autoMount() {
  mount(document.getElementById('gradientAsciiBg'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoMount, { once: true });
} else {
  autoMount();
}
