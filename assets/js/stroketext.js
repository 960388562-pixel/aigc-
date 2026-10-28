/*!
 * StrokeText — vanilla port of the React Bits component.
 * SVG outline draw + left-to-right fill wipe + hover redraw.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function svgNode(name, attrs) {
    var node = document.createElementNS(NS, name);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        node.setAttribute(key, attrs[key]);
      });
    }
    return node;
  }

  function createId(prefix) {
    return prefix + '-' + Math.random().toString(36).slice(2, 10);
  }

  function mount(container, options) {
    if (!container) return function () {};
    var opts = options || {};

    var text = String(opts.text || '个人简历');
    var strokeColor = opts.strokeColor || '#ffffff';
    var fillColor = opts.fillColor || 'currentColor';
    var strokeWidth = Math.max(Number(opts.strokeWidth) || 1.4, 0.1);
    var drawDuration = Math.max(Number(opts.drawDuration) || 1.6, 0.1);
    var fillDelay = Math.max(Number(opts.fillDelay) || 0.2, 0);
    var stagger = Math.max(Number(opts.stagger) || 0.05, 0);
    var fontSize = Math.max(Number(opts.fontSize) || 128, 1);
    var fontWeight = opts.fontWeight || 800;
    var fontFamily = opts.fontFamily || 'Georgia, serif';
    var letterSpacing = Number(opts.letterSpacing);
    if (!Number.isFinite(letterSpacing)) letterSpacing = -4;
    var hoverRedraw = opts.hoverRedraw !== false;

    var root = document.createElement('span');
    root.className = 'stroke-text';
    root.setAttribute('role', 'img');
    root.setAttribute('aria-label', text);

    var svg = svgNode('svg', {
      class: 'stroke-text__svg',
      viewBox: '0 -' + fontSize + ' 600 ' + Math.round(fontSize * 1.3),
      preserveAspectRatio: 'xMidYMid meet',
      'aria-hidden': 'true'
    });
    svg.style.visibility = 'hidden';

    var wipeId = createId('stroke-text-wipe');
    var defs = svgNode('defs');
    var clip = svgNode('clipPath', { id: wipeId, clipPathUnits: 'userSpaceOnUse' });
    var wipeRect = svgNode('rect', { x: 0, y: 0, width: 0, height: 0 });
    clip.appendChild(wipeRect);
    defs.appendChild(clip);

    var strokeText = svgNode('text', {
      x: 0,
      y: 0,
      fill: 'none',
      stroke: strokeColor,
      'stroke-width': strokeWidth,
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round'
    });
    var fillText = svgNode('text', {
      x: 0,
      y: 0,
      fill: fillColor,
      stroke: fillColor,
      'stroke-width': 0.8,
      'stroke-linejoin': 'round',
      'clip-path': 'url(#' + wipeId + ')'
    });
    [strokeText, fillText].forEach(function (node) {
      node.style.fontFamily = fontFamily;
      node.style.fontSize = fontSize + 'px';
      node.style.fontWeight = String(fontWeight);
      node.style.letterSpacing = letterSpacing + 'px';
    });

    var chars = Array.from(text);
    var strokeChars = [];
    var fillChars = [];
    chars.forEach(function (char) {
      var strokeSpan = svgNode('tspan', { 'data-stroke-char': '' });
      strokeSpan.textContent = char;
      strokeText.appendChild(strokeSpan);
      strokeChars.push(strokeSpan);

      var fillSpan = svgNode('tspan', { 'data-fill-char': '' });
      fillSpan.textContent = char;
      fillText.appendChild(fillSpan);
      fillChars.push(fillSpan);
    });

    svg.appendChild(defs);
    svg.appendChild(strokeText);
    svg.appendChild(fillText);
    root.appendChild(svg);
    container.appendChild(root);

    var box = null;
    var dash = Math.max(fontSize * 7, 200);
    var fillDuration = Math.max(0.4, drawDuration * 0.5);
    var fillStart = drawDuration + fillDelay;
    var started = false;
    var complete = false;
    var alive = true;
    var startTime = 0;
    var raf = 0;
    var redraw = null;

    strokeChars.forEach(function (span) {
      span.setAttribute('stroke-dasharray', String(dash));
      span.setAttribute('stroke-dashoffset', String(dash));
      span.style.strokeOpacity = '1';
    });

    function easeOutPower2(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function easeInOutPower2(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function setOffsets(value) {
      strokeChars.forEach(function (span) {
        span.setAttribute('stroke-dashoffset', String(value));
      });
    }

    function measure() {
      var bbox;
      try {
        bbox = strokeText.getBBox();
      } catch (error) {
        return;
      }
      if (!bbox || !bbox.width || !bbox.height) return;

      var pad = Math.max(strokeWidth || 1, fontSize * 0.1);
      box = {
        x: bbox.x - pad,
        y: bbox.y - pad,
        width: bbox.width + pad * 2,
        height: bbox.height + pad * 2
      };
      svg.setAttribute('viewBox', box.x + ' ' + box.y + ' ' + box.width + ' ' + box.height);
      root.style.setProperty('--stroke-text-width', box.width + 'px');
      wipeRect.setAttribute('x', String(box.x));
      wipeRect.setAttribute('y', String(box.y));
      wipeRect.setAttribute('height', String(box.height));
      wipeRect.setAttribute('width', complete ? String(box.width) : '0');
      svg.style.visibility = 'visible';

      if (!started) {
        started = true;
        startTime = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }

    function frame(now) {
      raf = 0;
      if (!alive || !box) return;
      var elapsed = (now - startTime) / 1000;

      if (!redraw) {
        for (var i = 0; i < strokeChars.length; i++) {
          var local = clamp((elapsed - i * stagger) / drawDuration, 0, 1);
          strokeChars[i].setAttribute(
            'stroke-dashoffset',
            String(dash * (1 - easeOutPower2(local)))
          );
        }

        var fillLocal = clamp((elapsed - fillStart) / fillDuration, 0, 1);
        wipeRect.setAttribute('width', String(box.width * easeInOutPower2(fillLocal)));

        if (elapsed >= fillStart + fillDuration) {
          setOffsets(0);
          wipeRect.setAttribute('width', String(box.width));
          complete = true;
          return;
        }
        raf = requestAnimationFrame(frame);
        return;
      }

      var redrawTime = (now - redraw.start) / 1000;
      if (redrawTime < 0.2) {
        var opacity = 1 - redrawTime / 0.2;
        strokeChars.forEach(function (span) {
          span.style.strokeOpacity = String(opacity);
        });
        raf = requestAnimationFrame(frame);
        return;
      }

      if (!redraw.reset) {
        strokeChars.forEach(function (span) {
          span.style.strokeOpacity = '1';
        });
        setOffsets(dash);
        redraw.reset = true;
      }

      var phase = redrawTime - 0.2;
      var redrawDuration = drawDuration * 0.8;
      for (var j = 0; j < strokeChars.length; j++) {
        var localRedraw = clamp((phase - j * stagger) / redrawDuration, 0, 1);
        strokeChars[j].setAttribute(
          'stroke-dashoffset',
          String(dash * (1 - easeOutPower2(localRedraw)))
        );
      }
      if (phase >= redrawDuration + (strokeChars.length - 1) * stagger) {
        setOffsets(0);
        strokeChars.forEach(function (span) {
          span.style.strokeOpacity = '1';
        });
        redraw = null;
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    function handleEnter(event) {
      if (!hoverRedraw || !complete || redraw) return;
      if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
        return;
      }
      redraw = { start: performance.now(), reset: false };
      if (!raf) raf = requestAnimationFrame(frame);
    }

    root.addEventListener('pointerenter', handleEnter);

    measure();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measure).catch(function () {});
    }

    var resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(root);

    return function dispose() {
      alive = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      root.removeEventListener('pointerenter', handleEnter);
      if (root.parentNode) root.parentNode.removeChild(root);
    };
  }

  window.StrokeTextEffect = { mount: mount };
})();
