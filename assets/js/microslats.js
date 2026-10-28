/*!
 * MicroSlats — vanilla WebGL2 port of the React Bits component
 * https://github.com/DavidHDev/react-bits/tree/main/src/content/Backgrounds/MicroSlats
 * Original component: React + OGL. This port keeps the same shaders and motion,
 * without a build step or runtime dependencies.
 */
(function () {
  'use strict';

  var SWELL_PRESETS = {
    swell: {
      scale: 1.5,
      speed: 0.6,
      direction: 250,
      chop: 0.55,
      stretch: 0,
      glint: 0.7,
      contrast: 1.25,
      perspective: 0.55,
      fog: 0.55
    },
    tide: {
      scale: 1.3,
      speed: 0.5,
      direction: 262,
      chop: 0.2,
      stretch: 0.12,
      glint: 0.45,
      contrast: 1.1,
      perspective: 0.5,
      fog: 0.4
    },
    storm: {
      scale: 0.55,
      speed: 1.6,
      direction: 236,
      chop: 1,
      stretch: 0.3,
      glint: 1.3,
      contrast: 1.8,
      perspective: 0.8,
      fog: 0.35
    },
    signal: {
      scale: 0.85,
      speed: 1.2,
      direction: 180,
      chop: 0.6,
      stretch: 0.85,
      glint: 0.25,
      contrast: 1.2,
      perspective: 0,
      fog: 0
    }
  };

  var FLUID_SIZE = 96;
  var PRESSURE_STEPS = 16;
  var SPLAT_FORCE = 6900;
  var SPLASH_JETS = 3;
  var PIXEL_BUDGET = 4.5e6;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function parseColor(value, fallback) {
    try {
      var ctx = document.createElement('canvas').getContext('2d');
      if (!ctx) return fallback;
      ctx.fillStyle = '#000000';
      ctx.fillStyle = value;
      var resolved = ctx.fillStyle;
      if (resolved.charAt(0) === '#') {
        var n = parseInt(resolved.slice(1), 16);
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
      }
      var parts = resolved.match(/[\d.]+/g);
      if (!parts || parts.length < 3) return fallback;
      return [
        Number(parts[0]) / 255,
        Number(parts[1]) / 255,
        Number(parts[2]) / 255,
        parts[3] ? Number(parts[3]) : 1
      ];
    } catch (err) {
      return fallback;
    }
  }

  var passVertex = [
    '#version 300 es',
    'in vec2 position;',
    'void main() {',
    '  gl_Position = vec4(position, 0.0, 1.0);',
    '}'
  ].join('\n');

  var fluidVertex = [
    '#version 300 es',
    'in vec2 position;',
    'uniform vec2 uTexel;',
    'out vec2 vUv;',
    'out vec2 vL;',
    'out vec2 vR;',
    'out vec2 vT;',
    'out vec2 vB;',
    'void main() {',
    '  vUv = position * 0.5 + 0.5;',
    '  vL = vUv - vec2(uTexel.x, 0.0);',
    '  vR = vUv + vec2(uTexel.x, 0.0);',
    '  vT = vUv + vec2(0.0, uTexel.y);',
    '  vB = vUv - vec2(0.0, uTexel.y);',
    '  gl_Position = vec4(position, 0.0, 1.0);',
    '}'
  ].join('\n');

  var fluidHead = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vUv;',
    'in vec2 vL;',
    'in vec2 vR;',
    'in vec2 vT;',
    'in vec2 vB;',
    'out vec4 fragColor;'
  ].join('\n');

  var splatFragment = [
    fluidHead,
    'uniform sampler2D uTarget;',
    'uniform float uAspect;',
    'uniform vec2 uPoint;',
    'uniform vec3 uValue;',
    'uniform float uRadius;',
    'void main() {',
    '  vec2 offset = vUv - uPoint;',
    '  offset.x *= uAspect;',
    '  float falloff = exp(-dot(offset, offset) / uRadius);',
    '  fragColor = vec4(texture(uTarget, vUv).xyz + uValue * falloff, 1.0);',
    '}'
  ].join('\n');

  var curlFragment = [
    fluidHead,
    'uniform sampler2D uVelocity;',
    'void main() {',
    '  float left = texture(uVelocity, vL).y;',
    '  float right = texture(uVelocity, vR).y;',
    '  float top = texture(uVelocity, vT).x;',
    '  float bottom = texture(uVelocity, vB).x;',
    '  fragColor = vec4(0.5 * (right - left - top + bottom), 0.0, 0.0, 1.0);',
    '}'
  ].join('\n');

  var vorticityFragment = [
    fluidHead,
    'uniform sampler2D uVelocity;',
    'uniform sampler2D uCurl;',
    'uniform float uSwirl;',
    'uniform float uDt;',
    'void main() {',
    '  float left = texture(uCurl, vL).x;',
    '  float right = texture(uCurl, vR).x;',
    '  float top = texture(uCurl, vT).x;',
    '  float bottom = texture(uCurl, vB).x;',
    '  float middle = texture(uCurl, vUv).x;',
    '  vec2 force = 0.5 * vec2(abs(top) - abs(bottom), abs(right) - abs(left));',
    '  force = force / (length(force) + 0.0001) * uSwirl * middle;',
    '  force.y = -force.y;',
    '  vec2 velocity = texture(uVelocity, vUv).xy + force * uDt;',
    '  fragColor = vec4(clamp(velocity, -1000.0, 1000.0), 0.0, 1.0);',
    '}'
  ].join('\n');

  var divergenceFragment = [
    fluidHead,
    'uniform sampler2D uVelocity;',
    'void main() {',
    '  vec2 middle = texture(uVelocity, vUv).xy;',
    '  float left = vL.x < 0.0 ? -middle.x : texture(uVelocity, vL).x;',
    '  float right = vR.x > 1.0 ? -middle.x : texture(uVelocity, vR).x;',
    '  float top = vT.y > 1.0 ? -middle.y : texture(uVelocity, vT).y;',
    '  float bottom = vB.y < 0.0 ? -middle.y : texture(uVelocity, vB).y;',
    '  fragColor = vec4(0.5 * (right - left + top - bottom), 0.0, 0.0, 1.0);',
    '}'
  ].join('\n');

  var pressureFragment = [
    fluidHead,
    'uniform sampler2D uPressure;',
    'uniform sampler2D uDivergence;',
    'void main() {',
    '  float left = texture(uPressure, vL).x;',
    '  float right = texture(uPressure, vR).x;',
    '  float top = texture(uPressure, vT).x;',
    '  float bottom = texture(uPressure, vB).x;',
    '  float divergence = texture(uDivergence, vUv).x;',
    '  fragColor = vec4((left + right + top + bottom - divergence) * 0.25, 0.0, 0.0, 1.0);',
    '}'
  ].join('\n');

  var projectFragment = [
    fluidHead,
    'uniform sampler2D uPressure;',
    'uniform sampler2D uVelocity;',
    'void main() {',
    '  float left = texture(uPressure, vL).x;',
    '  float right = texture(uPressure, vR).x;',
    '  float top = texture(uPressure, vT).x;',
    '  float bottom = texture(uPressure, vB).x;',
    '  vec2 velocity = texture(uVelocity, vUv).xy - vec2(right - left, top - bottom);',
    '  fragColor = vec4(velocity, 0.0, 1.0);',
    '}'
  ].join('\n');

  var advectFragment = [
    fluidHead,
    'uniform sampler2D uVelocity;',
    'uniform sampler2D uSource;',
    'uniform vec2 uTexel;',
    'uniform float uDt;',
    'uniform float uFade;',
    'void main() {',
    '  vec2 from = vUv - uDt * texture(uVelocity, vUv).xy * uTexel;',
    '  fragColor = texture(uSource, from) / (1.0 + uFade * uDt);',
    '}'
  ].join('\n');

  var scaleFragment = [
    fluidHead,
    'uniform sampler2D uSource;',
    'uniform float uValue;',
    'void main() {',
    '  fragColor = texture(uSource, vUv) * uValue;',
    '}'
  ].join('\n');

  var fieldFragment = [
    '#version 300 es',
    'precision highp float;',
    'uniform vec2 uSize;',
    'uniform vec4 uGrid;',
    'uniform vec2 uOrigin;',
    'uniform vec2 uSlat;',
    'uniform float uTime;',
    'uniform float uScale;',
    'uniform float uDirection;',
    'uniform float uChop;',
    'uniform float uStretch;',
    'uniform float uGlint;',
    'uniform float uContrast;',
    'uniform float uPerspective;',
    'uniform float uFog;',
    'uniform float uIntro;',
    'uniform sampler2D tVelocity;',
    'uniform sampler2D tInk;',
    'uniform vec2 uFluidTexel;',
    'uniform float uFluid;',
    'uniform float uInk;',
    'uniform float uLean;',
    'out vec4 fragColor;',
    '',
    'const float TURN[4] = float[4](0.0, -0.95, 0.78, 1.62);',
    'const float LENGTH[4] = float[4](2.6, 1.7, 1.12, 0.76);',
    'const float HEIGHT[4] = float[4](1.0, 0.75, 0.5, 0.3);',
    'const float SHIFT[4] = float[4](0.0, 2.3, 4.1, 1.1);',
    '',
    'void main() {',
    '  vec2 cell = floor(gl_FragCoord.xy);',
    '  float row = uGrid.y - 1.0 - cell.y;',
    '  vec2 center = uOrigin + vec2(cell.x, row) * uGrid.zw + uSlat * 0.5;',
    '  float v = clamp(center.y / uSize.y, 0.0, 1.0);',
    '',
    '  vec2 flow = vec2(0.0);',
    '  float ink = 0.0;',
    '  if (uFluid > 0.5) {',
    '    vec2 fluidUv = clamp(vec2(center.x / uSize.x, 1.0 - center.y / uSize.y), 0.0, 1.0);',
    '    flow = texture(tVelocity, fluidUv).xy * uFluidTexel * uSize;',
    '    ink = texture(tInk, fluidUv).x;',
    '  }',
    '',
    '  float horizon = mix(8.0, 0.5, uPerspective);',
    '  float depth = (1.0 + horizon) / (v + horizon);',
    '  vec2 world = vec2((center.x - uSize.x * 0.5) / uSize.y * depth, (depth - 1.0) * horizon * 2.2);',
    '  world -= flow * 0.00018 * depth;',
    '  world /= max(uScale, 0.05);',
    '',
    '  float meander = 0.55 * sin(dot(world, vec2(0.23, 0.41)) * 0.9 + uTime * 0.13)',
    '    + 0.3 * sin(dot(world, vec2(-0.37, 0.19)) * 1.4 - uTime * 0.09);',
    '',
    '  float steep = uChop * 0.45;',
    '  float height = 0.0;',
    '  float total = 0.0;',
    '  for (int i = 0; i < 4; i++) {',
    '    float angle = uDirection + TURN[i];',
    '    vec2 heading = vec2(cos(angle), sin(angle));',
    '    float k = 6.2831853 / LENGTH[i];',
    '    float omega = sqrt(9.81 * k) * 0.35;',
    '    float theta = k * dot(world, heading) - omega * uTime + SHIFT[i] + meander * (0.6 + 0.3 * float(i));',
    '    height += HEIGHT[i] * (cos(theta) + steep * cos(2.0 * theta));',
    '    total += HEIGHT[i] * (1.0 + steep);',
    '  }',
    '  float level = clamp(0.5 + 0.5 * height / (total * 0.85), 0.0, 1.0);',
    '  float crest = smoothstep(0.6, 1.0, level);',
    '  float glint = crest * crest * uGlint;',
    '',
    '  float haze = mix(1.0, 1.0 - uFog, pow(1.0 - v, 1.4));',
    '  float light = (pow(level, uContrast) + glint * 0.8) * haze;',
    '  float glow = 1.0 - exp(-max(ink, 0.0) * uInk * 1.6);',
    '  light = 1.0 - (1.0 - clamp(light, 0.0, 1.0)) * (1.0 - glow);',
    '',
    '  float front = uIntro * 1.35;',
    '  float reveal = 1.0 - smoothstep(front - 0.35, front, v);',
    '  float sweep = exp(-pow((v - front + 0.22) / 0.07, 2.0)) * (1.0 - uIntro);',
    '  light = (light + sweep * 0.8) * reveal;',
    '  light = max(light, 0.045 * reveal);',
    '  float span = mix(1.0 - uStretch, 1.0, level) + glow * 0.3;',
    '  span = clamp(span, 0.08, 1.0) * mix(0.1, 1.0, reveal);',
    '  float tint = clamp(max(glint * 1.4, glow * 0.9) + sweep, 0.0, 1.0);',
    '  float lean = clamp(flow.x / 1400.0, -1.0, 1.0) * uLean * reveal;',
    '',
    '  fragColor = vec4(clamp(light, 0.0, 1.0), span, tint, 0.5 + 0.5 * lean);',
    '}'
  ].join('\n');

  var slatFragment = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D tField;',
    'uniform vec2 uSize;',
    'uniform float uDpr;',
    'uniform vec4 uGrid;',
    'uniform vec2 uOrigin;',
    'uniform vec2 uSlat;',
    'uniform float uRound;',
    'uniform float uTilt;',
    'uniform vec3 uColor;',
    'uniform vec3 uGlintColor;',
    'uniform vec4 uBackground;',
    'out vec4 fragColor;',
    '',
    'float pill(vec2 p, vec2 b, float r) {',
    '  vec2 q = abs(p) - b + r;',
    '  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;',
    '}',
    '',
    'void main() {',
    '  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;',
    '  vec2 local = p - uOrigin;',
    '  vec2 cell = floor(local / uGrid.zw);',
    '  vec4 background = vec4(uBackground.rgb * uBackground.a, uBackground.a);',
    '  vec4 slat = vec4(0.0);',
    '  int reach = uTilt > 0.0 ? 1 : 0;',
    '  for (int dx = -1; dx <= 1; dx++) {',
    '    if (abs(dx) > reach) continue;',
    '    vec2 neighbour = cell + vec2(float(dx), 0.0);',
    '    if (neighbour.x < 0.0 || neighbour.y < 0.0 || neighbour.x >= uGrid.x || neighbour.y >= uGrid.y) continue;',
    '    vec4 field = texelFetch(tField, ivec2(int(neighbour.x), int(uGrid.y - 1.0 - neighbour.y)), 0);',
    '    vec2 offset = local - neighbour * uGrid.zw - uSlat * 0.5;',
    '    float angle = (field.a - 0.5) * 2.0 * uTilt;',
    '    float c = cos(angle);',
    '    float s = sin(angle);',
    '    vec2 turned = vec2(c * offset.x + s * offset.y, c * offset.y - s * offset.x);',
    '    vec2 halfSize = vec2(uSlat.x * 0.5, uSlat.y * 0.5 * field.g);',
    '    float radius = uRound * min(halfSize.x, halfSize.y);',
    '    float alpha = clamp(0.5 - pill(turned, halfSize, radius) * uDpr, 0.0, 1.0) * field.r;',
    '    if (alpha > slat.a) slat = vec4(mix(uColor, uGlintColor, field.b) * alpha, alpha);',
    '  }',
    '  fragColor = slat + background * (1.0 - slat.a);',
    '}'
  ].join('\n');

  function compileShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error('MicroSlats shader error: ' + log);
    }
    return shader;
  }

  function createProgram(gl, vertexSource, fragmentSource) {
    var program = gl.createProgram();
    var vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    var fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, 'position');
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      var log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error('MicroSlats program error: ' + log);
    }
    return { program: program, locations: new Map() };
  }

  function mount(container, options) {
    if (!container) return function () {};
    if (!window.WebGL2RenderingContext) return function () {};

    var opts = options || {};
    var preset = SWELL_PRESETS[opts.preset] || SWELL_PRESETS.swell;

    function pick(value, key) {
      return value === undefined || value === null ? preset[key] : value;
    }

    var settings = {
      color: parseColor(opts.color || '#A855F7', [0.66, 0.33, 0.97, 1]),
      glintColor: parseColor(opts.glintColor || '#ffffff', [1, 1, 1, 1]),
      backgroundColor: parseColor(opts.backgroundColor || '#000000', [0, 0, 0, 1]),
      slatWidth: opts.slatWidth === undefined ? 10 : opts.slatWidth,
      slatHeight: opts.slatHeight === undefined ? 25 : opts.slatHeight,
      gap: opts.gap === undefined ? 3 : opts.gap,
      roundness: opts.roundness === undefined ? 0.75 : opts.roundness,
      scale: pick(opts.scale, 'scale'),
      speed: pick(opts.speed, 'speed'),
      direction: pick(opts.direction, 'direction'),
      chop: pick(opts.chop, 'chop'),
      stretch: pick(opts.stretch, 'stretch'),
      glint: pick(opts.glint, 'glint'),
      contrast: pick(opts.contrast, 'contrast'),
      perspective: pick(opts.perspective, 'perspective'),
      fog: pick(opts.fog, 'fog'),
      interactive: opts.interactive !== false,
      cursorStrength: opts.cursorStrength === undefined ? 1 : opts.cursorStrength,
      cursorSize: opts.cursorSize === undefined ? 40 : opts.cursorSize,
      swirl: opts.swirl === undefined ? 0 : opts.swirl,
      trail: opts.trail === undefined ? 1.4 : opts.trail,
      lean: opts.lean === undefined ? 0 : opts.lean,
      intro: opts.intro !== false,
      introDuration: opts.introDuration === undefined ? 1.5 : opts.introDuration,
      paused: opts.paused === true
    };

    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false
    });
    if (!gl) return function () {};

    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    gl.clearColor(0, 0, 0, 0);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    var vertexArray = gl.createVertexArray();
    gl.bindVertexArray(vertexArray);
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    var floatTargets = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));

    var blank = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, blank);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    function createTarget(width, height, nearest, useFloat) {
      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (useFloat) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      var filter = nearest ? gl.NEAREST : gl.LINEAR;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      var buffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      return { texture: texture, buffer: buffer, width: width, height: height };
    }

    function disposeTarget(target) {
      if (!target) return;
      gl.deleteFramebuffer(target.buffer);
      gl.deleteTexture(target.texture);
    }

    function uniform(program, name) {
      gl.useProgram(program.program);
      var location = program.locations.get(name);
      if (location === undefined) {
        location = gl.getUniformLocation(program.program, name);
        program.locations.set(name, location);
      }
      return location;
    }

    function set1f(program, name, value) {
      var location = uniform(program, name);
      if (location) gl.uniform1f(location, value);
    }

    function set2f(program, name, x, y) {
      var location = uniform(program, name);
      if (location) gl.uniform2f(location, x, y);
    }

    function set3f(program, name, x, y, z) {
      var location = uniform(program, name);
      if (location) gl.uniform3f(location, x, y, z);
    }

    function set4f(program, name, x, y, z, w) {
      var location = uniform(program, name);
      if (location) gl.uniform4f(location, x, y, z, w);
    }

    function set1i(program, name, value) {
      var location = uniform(program, name);
      if (location) gl.uniform1i(location, value);
    }

    function setTexture(program, name, unit, texture) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      set1i(program, name, unit);
    }

    function draw(program, target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.buffer : null);
      gl.viewport(0, 0, target ? target.width : canvas.width, target ? target.height : canvas.height);
      gl.useProgram(program.program);
      gl.bindVertexArray(vertexArray);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    var fieldTarget = createTarget(1, 1, true, false);
    var fieldPass = createProgram(gl, passVertex, fieldFragment);
    var slatPass = createProgram(gl, passVertex, slatFragment);

    function fluidPass(fragment) {
      return createProgram(gl, fluidVertex, fragment);
    }

    var splatPass = fluidPass(splatFragment);
    var curlPass = fluidPass(curlFragment);
    var vorticityPass = fluidPass(vorticityFragment);
    var divergencePass = fluidPass(divergenceFragment);
    var pressurePass = fluidPass(pressureFragment);
    var projectPass = fluidPass(projectFragment);
    var advectPass = fluidPass(advectFragment);
    var scalePass = fluidPass(scaleFragment);
    var fluidTexel = [1, 1];

    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var width = 1;
    var height = 1;
    var dpr = 1;
    var raf = 0;
    var last = performance.now();
    var time = 0;
    var introClock = 0;
    var visible = true;
    var alive = true;
    var fluid = null;
    var fluidUntil = 0;
    var fluidDirty = false;
    var splashTurn = 0;
    var splats = [];
    var pointer = { x: 0, y: 0, tracked: false };

    function floatTarget(w, h) {
      return createTarget(w, h, false, true);
    }

    function swapPair(w, h) {
      return {
        read: floatTarget(w, h),
        write: floatTarget(w, h),
        swap: function () {
          var next = this.read;
          this.read = this.write;
          this.write = next;
        }
      };
    }

    function disposeFluid() {
      if (!fluid) return;
      [fluid.velocity, fluid.ink, fluid.pressure].forEach(function (pair) {
        disposeTarget(pair.read);
        disposeTarget(pair.write);
      });
      disposeTarget(fluid.divergence);
      disposeTarget(fluid.curl);
      fluid = null;
    }

    function buildFluid() {
      if (!floatTargets) return;
      var aspect = width / height;
      var w = Math.max(8, Math.round(aspect >= 1 ? FLUID_SIZE * aspect : FLUID_SIZE));
      var h = Math.max(8, Math.round(aspect >= 1 ? FLUID_SIZE : FLUID_SIZE / aspect));
      if (fluid && fluid.width === w && fluid.height === h) return;
      disposeFluid();
      fluid = {
        width: w,
        height: h,
        velocity: swapPair(w, h),
        ink: swapPair(w, h),
        pressure: swapPair(w, h),
        divergence: floatTarget(w, h),
        curl: floatTarget(w, h)
      };
      fluidTexel = [1 / w, 1 / h];
    }

    function resize() {
      width = Math.max(1, container.clientWidth);
      height = Math.max(1, container.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(PIXEL_BUDGET / (width * height)));
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      buildFluid();
      start();
    }

    function layout(s) {
      var slatW = clamp(s.slatWidth, 1, 64);
      var slatH = clamp(s.slatHeight, 2, 240);
      var gapSize = clamp(s.gap, 0, 64);
      var pitchX = slatW + gapSize;
      var pitchY = slatH + gapSize;
      var cols = Math.min(2048, Math.ceil((width + gapSize) / pitchX) + 1);
      var rows = Math.min(2048, Math.ceil((height + gapSize) / pitchY) + 1);
      var originX = (width - (cols * pitchX - gapSize)) / 2;
      var originY = (height - (rows * pitchY - gapSize)) / 2;
      if (fieldTarget.width !== cols || fieldTarget.height !== rows) {
        disposeTarget(fieldTarget);
        fieldTarget = createTarget(cols, rows, true, false);
      }
      var tilt = Math.min(0.42, Math.asin(clamp((pitchX * 1.5 - slatW * 0.5) / (slatH * 0.5), 0, 1)));
      return { slatW: slatW, slatH: slatH, tilt: tilt, grid: [cols, rows, pitchX, pitchY], origin: [originX, originY] };
    }

    function setFluidTexel(program) {
      set2f(program, 'uTexel', fluidTexel[0], fluidTexel[1]);
    }

    function splat(pair, point, value, radius) {
      setTexture(splatPass, 'uTarget', 0, pair.read.texture);
      set1f(splatPass, 'uAspect', width / height);
      set2f(splatPass, 'uPoint', point[0], point[1]);
      set3f(splatPass, 'uValue', value[0], value[1], value[2]);
      set1f(splatPass, 'uRadius', radius);
      setFluidTexel(splatPass);
      draw(splatPass, pair.write);
      pair.swap();
    }

    function stepFluid(f, dt, s) {
      if (s.swirl > 0) {
        setTexture(curlPass, 'uVelocity', 0, f.velocity.read.texture);
        setFluidTexel(curlPass);
        draw(curlPass, f.curl);

        setTexture(vorticityPass, 'uVelocity', 0, f.velocity.read.texture);
        setTexture(vorticityPass, 'uCurl', 1, f.curl.texture);
        set1f(vorticityPass, 'uSwirl', clamp(s.swirl, 0, 2) * 40);
        set1f(vorticityPass, 'uDt', dt);
        setFluidTexel(vorticityPass);
        draw(vorticityPass, f.velocity.write);
        f.velocity.swap();
      }

      setTexture(divergencePass, 'uVelocity', 0, f.velocity.read.texture);
      setFluidTexel(divergencePass);
      draw(divergencePass, f.divergence);

      setTexture(scalePass, 'uSource', 0, f.pressure.read.texture);
      set1f(scalePass, 'uValue', 0.8);
      setFluidTexel(scalePass);
      draw(scalePass, f.pressure.write);
      f.pressure.swap();

      setTexture(pressurePass, 'uDivergence', 1, f.divergence.texture);
      for (var i = 0; i < PRESSURE_STEPS; i++) {
        setTexture(pressurePass, 'uPressure', 0, f.pressure.read.texture);
        setFluidTexel(pressurePass);
        draw(pressurePass, f.pressure.write);
        f.pressure.swap();
      }

      setTexture(projectPass, 'uPressure', 0, f.pressure.read.texture);
      setTexture(projectPass, 'uVelocity', 1, f.velocity.read.texture);
      setFluidTexel(projectPass);
      draw(projectPass, f.velocity.write);
      f.velocity.swap();

      var fade = 1 / clamp(s.trail, 0.1, 10);
      set1f(advectPass, 'uDt', dt);
      set1f(advectPass, 'uFade', fade * 1.4);
      setTexture(advectPass, 'uVelocity', 0, f.velocity.read.texture);
      setTexture(advectPass, 'uSource', 1, f.velocity.read.texture);
      setFluidTexel(advectPass);
      draw(advectPass, f.velocity.write);
      f.velocity.swap();

      setTexture(advectPass, 'uVelocity', 0, f.velocity.read.texture);
      setTexture(advectPass, 'uSource', 1, f.ink.read.texture);
      set1f(advectPass, 'uFade', fade);
      draw(advectPass, f.ink.write);
      f.ink.swap();
    }

    function clearFluid(f) {
      set1f(scalePass, 'uValue', 0);
      [f.velocity, f.ink, f.pressure].forEach(function (pair) {
        setTexture(scalePass, 'uSource', 0, pair.read.texture);
        setFluidTexel(scalePass);
        draw(scalePass, pair.write);
        pair.swap();
      });
    }

    function frame(now) {
      raf = 0;
      if (!alive) return;
      var s = settings;
      var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;

      if (!s.paused && !reducedMotion) time += dt * s.speed;
      introClock = s.intro && !reducedMotion ? introClock + dt / Math.max(0.2, s.introDuration) : 1;
      var introLinear = Math.min(introClock, 1);
      var introEase =
        introLinear < 0.5
          ? 4 * introLinear * introLinear * introLinear
          : 1 - Math.pow(-2 * introLinear + 2, 3) / 2;

      if (fluid && splats.length) {
        var radius = Math.pow(clamp(s.cursorSize, 4, 600) / height, 2) * 0.35;
        var aspect = width / height;
        splats.forEach(function (item) {
          var u = item[0];
          var v = item[1];
          var du = item[2];
          var dv = item[3];
          var turn = item[4];
          if (turn === null) {
            splat(fluid.velocity, [u, v], [du * SPLAT_FORCE, dv * SPLAT_FORCE, 0], radius);
            splat(fluid.ink, [u, v], [0.13, 0, 0], radius);
            return;
          }
          var jet = radius * 0.55;
          var reach = Math.sqrt(jet * 0.5) * 1.9;
          var push = SPLAT_FORCE * 0.08;
          for (var j = 0; j < SPLASH_JETS; j++) {
            var angle = turn + (j / SPLASH_JETS) * Math.PI * 2;
            var dx = Math.cos(angle);
            var dy = Math.sin(angle);
            var point = [u + (dx * reach) / aspect, v + dy * reach];
            var spin = [(dx - dy) * Math.SQRT1_2 * push, (dy + dx) * Math.SQRT1_2 * push, 0];
            splat(fluid.velocity, point, spin, jet);
            splat(fluid.ink, point, [0.75, 0, 0], jet);
          }
          splat(fluid.ink, [u, v], [0.45, 0, 0], radius);
        });
        splats = [];
        fluidDirty = true;
      }

      var fluidActive = fluid !== null && now < fluidUntil;
      if (fluid) {
        if (fluidActive) {
          stepFluid(fluid, Math.min(Math.max(dt, 1 / 240), 1 / 30), s);
        } else if (fluidDirty) {
          clearFluid(fluid);
          fluidDirty = false;
        }
      }

      var grid = layout(s);

      set2f(fieldPass, 'uSize', width, height);
      set4f(fieldPass, 'uGrid', grid.grid[0], grid.grid[1], grid.grid[2], grid.grid[3]);
      set2f(fieldPass, 'uOrigin', grid.origin[0], grid.origin[1]);
      set2f(fieldPass, 'uSlat', grid.slatW, grid.slatH);
      set1f(fieldPass, 'uTime', time);
      set1f(fieldPass, 'uScale', s.scale);
      set1f(fieldPass, 'uDirection', (s.direction * Math.PI) / 180);
      set1f(fieldPass, 'uChop', clamp(s.chop, 0, 1.5));
      set1f(fieldPass, 'uStretch', clamp(s.stretch, 0, 0.95));
      set1f(fieldPass, 'uGlint', Math.max(0, s.glint));
      set1f(fieldPass, 'uContrast', clamp(s.contrast, 0.2, 4));
      set1f(fieldPass, 'uPerspective', clamp(s.perspective, 0, 1));
      set1f(fieldPass, 'uFog', clamp(s.fog, 0, 1));
      set1f(fieldPass, 'uIntro', introEase);
      set1f(fieldPass, 'uFluid', fluidActive ? 1 : 0);
      setTexture(fieldPass, 'tVelocity', 0, fluid ? fluid.velocity.read.texture : blank);
      setTexture(fieldPass, 'tInk', 1, fluid ? fluid.ink.read.texture : blank);
      set2f(fieldPass, 'uFluidTexel', fluidTexel[0], fluidTexel[1]);
      set1f(fieldPass, 'uInk', clamp(s.cursorStrength, 0, 3));
      set1f(fieldPass, 'uLean', clamp(s.lean, 0, 1));
      draw(fieldPass, fieldTarget);

      set2f(slatPass, 'uSize', width, height);
      set1f(slatPass, 'uDpr', dpr);
      set4f(slatPass, 'uGrid', grid.grid[0], grid.grid[1], grid.grid[2], grid.grid[3]);
      set2f(slatPass, 'uOrigin', grid.origin[0], grid.origin[1]);
      set2f(slatPass, 'uSlat', grid.slatW, grid.slatH);
      set1f(slatPass, 'uRound', clamp(s.roundness, 0, 1));
      set1f(slatPass, 'uTilt', fluidActive && s.lean > 0 ? grid.tilt : 0);
      set3f(slatPass, 'uColor', s.color[0], s.color[1], s.color[2]);
      set3f(slatPass, 'uGlintColor', s.glintColor[0], s.glintColor[1], s.glintColor[2]);
      set4f(slatPass, 'uBackground', s.backgroundColor[0], s.backgroundColor[1], s.backgroundColor[2], s.backgroundColor[3]);
      setTexture(slatPass, 'tField', 0, fieldTarget.texture);
      draw(slatPass, null);

      var moving = (!s.paused && !reducedMotion && s.speed !== 0) || introClock < 1;
      if (visible && (moving || fluidActive || fluidDirty)) raf = requestAnimationFrame(frame);
    }

    function start() {
      if (raf || !visible || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function locate(event) {
      var rect = container.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      var w = Math.max(1, rect.width);
      var h = Math.max(1, rect.height);
      return { x: x, y: y, u: x / w, v: 1 - y / h, h: h, inside: x >= 0 && y >= 0 && x <= w && y <= h };
    }

    function queue(u, v, du, dv, turn) {
      if (splats.length > 32) splats.shift();
      splats.push([u, v, du, dv, turn]);
      fluidUntil = performance.now() + Math.max(1.5, settings.trail * 5) * 1000;
      start();
    }

    function onPointerMove(event) {
      var spot = locate(event);
      if (!fluid || !settings.interactive || reducedMotion || !spot.inside) {
        pointer.tracked = false;
        return;
      }
      if (pointer.tracked && (spot.x !== pointer.x || spot.y !== pointer.y)) {
        queue(spot.u, spot.v, (spot.x - pointer.x) / spot.h, (pointer.y - spot.y) / spot.h, null);
      }
      pointer.x = spot.x;
      pointer.y = spot.y;
      pointer.tracked = true;
    }

    function onPointerDown(event) {
      var spot = locate(event);
      if (!fluid || !settings.interactive || reducedMotion || !spot.inside) return;
      splashTurn += 2.39996;
      queue(spot.u, spot.v, 0, 0, splashTurn);
    }

    function onPointerLeave() {
      pointer.tracked = false;
    }

    function onPointerOut(event) {
      if (!event.relatedTarget) onPointerLeave();
    }

    function onVisibility() {
      if (!document.hidden) start();
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerout', onPointerOut, { passive: true });
    window.addEventListener('blur', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);

    var resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    var intersectionObserver = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      start();
    });
    intersectionObserver.observe(container);

    resize();

    return function dispose() {
      alive = false;
      visible = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerout', onPointerOut);
      window.removeEventListener('blur', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      disposeFluid();
      disposeTarget(fieldTarget);
      [splatPass, curlPass, vorticityPass, divergencePass, pressurePass, projectPass, advectPass, scalePass, fieldPass, slatPass].forEach(function (program) {
        gl.deleteProgram(program.program);
      });
      gl.deleteTexture(blank);
      gl.deleteBuffer(vertexBuffer);
      gl.deleteVertexArray(vertexArray);
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }

  window.MicroSlatsBackground = { mount: mount };
})();
