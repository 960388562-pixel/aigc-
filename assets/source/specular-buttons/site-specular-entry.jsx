import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import SpecularButton from './SpecularButton';
import './site-specular.css';

const roots = new WeakMap();

function mount(target) {
  if (!target || roots.has(target)) return;
  const { dataset } = target;
  const root = createRoot(target);
  roots.set(target, root);

  flushSync(() => {
    root.render(
      <SpecularButton
        size={dataset.sbSize || 'lg'}
        radius={Number(dataset.sbRadius) || 18}
        tint="#ffffff"
        tintOpacity={0.04}
        textColor="#f5f5f5"
        lineColor="#84cc16"
        baseColor="#94a3b8"
        intensity={1}
        idleIntensity={0.35}
        shineSize={10}
        shineFade={34}
        thickness={1.2}
        glow={1}
        followMouse
        proximity={250}
        href={dataset.sbHref || undefined}
        download={dataset.sbDownload === 'true' ? true : undefined}
        as={dataset.sbAs || undefined}
        id={dataset.sbId || undefined}
        className={dataset.sbClass || undefined}
        aria-hidden={dataset.sbAriaHidden === 'true' ? 'true' : undefined}
        onClick={
          dataset.sbEvent
            ? () => window.dispatchEvent(new CustomEvent(dataset.sbEvent))
            : undefined
        }
      >
        {dataset.sbLabel ?? 'Button'}
      </SpecularButton>,
    );
  });
}

function mountAll() {
  document.querySelectorAll('[data-specular-button]').forEach(mount);
}

mountAll();
window.SiteSpecularButtons = { mount, mountAll };
