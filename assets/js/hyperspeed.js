/*!
 * Hyperspeed — vanilla Three.js port of the React Bits background.
 * Winding three-lane road, green light trails, poles, dust, bloom and steering.
 */
(function () {
  'use strict';

  var TRAVEL = 400;
  var MAX_CARS = 160;
  var MAX_POLES = 80;
  var MAX_DUST = 1500;
  var MAX_COLORS = 8;

  var BEND = `
  uniform float uTime;
  uniform float uCurvature;
  uniform vec4 uCurveA;
  uniform float uCurveB;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uPixel;
  #define PI 3.14159265358979
  float nsin(float v) { return sin(v) * 0.5 + 0.5; }
  vec3 gentle(float p) {
    return vec3(
      cos(p * PI * 5.0 + uTime) * 25.0 - cos(0.02 * PI * 5.0 + uTime) * 25.0,
      sin(p * PI * 2.0 + PI * 0.5 + uTime) * 15.0 - sin(0.02 * PI * 2.0 + PI * 0.5 + uTime) * 15.0,
      0.0
    );
  }
  float windX(float p) { return cos(PI * p * 4.0 + uTime) * 25.0 + pow(cos(PI * p * 8.0 + uTime * 2.0), 2.0) * 5.0; }
  float windY(float p) { return -nsin(PI * p * 8.0 + uTime) * 10.0 - pow(nsin(PI * p + uTime / 8.0), 5.0) * 10.0; }
  vec3 winding(float p) { return vec3(windX(p) - windX(0.0125), windY(p) - windY(0.0125), 0.0); }
  vec3 hills(float p) {
    return vec3(
      cos(p * PI * 3.0 + uTime) * 30.0 - cos(0.02 * PI * 3.0 + uTime) * 30.0,
      nsin(p * PI * 6.0 + uTime) * 30.0 - nsin(0.02 * PI * 6.0 + uTime) * 30.0,
      nsin(p * PI * 10.0 + uTime) * 20.0 - nsin(0.02 * PI * 10.0 + uTime) * 20.0
    );
  }
  vec3 racing(float p) {
    return vec3(
      sin(p * PI * 2.0 + uTime) * 35.0 - sin(0.0125 * PI * 2.0 + uTime) * 35.0,
      sin(p * PI * 3.0 + uTime) * 10.0 - sin(0.0125 * PI * 3.0 + uTime) * 10.0,
      0.0
    );
  }
  float deepX(float p) { return sin(p * PI * 4.0 + uTime) * 10.0; }
  float deepY(float p) { return pow(abs(p * 10.0), 2.0) + sin(p * PI * 8.0 + uTime) * 20.0; }
  vec3 deep(float p) { return vec3(deepX(p) - deepX(0.02), deepY(p) - deepY(0.02), 0.0); }
  vec3 bend(float p) {
    vec3 d = gentle(p) * uCurveA.x + winding(p) * uCurveA.y + hills(p) * uCurveA.z + racing(p) * uCurveA.w + deep(p) * uCurveB;
    return d * uCurvature;
  }
  `;

  var STREAK_VERTEX = `
  ${BEND}
  attribute vec4 aSeedA;
  attribute vec4 aSeedB;
  attribute float aPair;
  attribute float aTone;
  uniform float uTravel;
  uniform float uRoadX;
  uniform float uRoadWidth;
  uniform float uLanes;
  uniform float uDirection;
  uniform vec2 uSpeedRange;
  uniform float uTrail;
  uniform float uStretch;
  uniform float uSize;
  uniform float uRadiusScale;
  uniform float uMirror;
  uniform vec3 uColors[${MAX_COLORS}];
  uniform float uColorCount;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vColor;
  varying float vFog;
  varying float vAbove;
  varying float vThin;
  void main() {
    float laneWidth = uRoadWidth / uLanes;
    float lane = min(floor(aSeedA.x * uLanes), uLanes - 1.0);
    float laneX = (lane + 0.5) * laneWidth - uRoadWidth * 0.5 + (aSeedA.y - 0.5) * 0.5 * laneWidth;
    float carWidth = mix(0.3, 0.5, aSeedA.z) * laneWidth;
    float radius = mix(0.05, 0.14, aSeedA.w) * uSize;
    float len = mix(0.03, 0.2, aSeedB.x) * uTravel * uTrail * (1.0 + uStretch);
    float speed = mix(uSpeedRange.x, uSpeedRange.y, aSeedB.y) * uDirection;
    vec3 center = vec3(
      uRoadX + laneX + aPair * carWidth,
      aSeedB.w * 0.8 + radius * 1.3,
      position.z * len + len - mod(uTime * speed + aSeedB.z * uTravel, uTravel)
    );
    vAbove = center.y;
    center.y = mix(center.y, -center.y * 1.8, uMirror);
    center += bend(abs(center.z / uTravel));
    float depth = max(0.1, -(modelViewMatrix * vec4(center, 1.0)).z);
    float wanted = radius * uRadiusScale;
    float shown = max(wanted, depth * uPixel * 0.75);
    vThin = wanted / shown;
    vec3 p = center + vec3(position.x * shown, position.y * shown * mix(1.0, 2.2, uMirror), 0.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vec3 n = normal;
    n.y *= 1.0 - 2.0 * uMirror;
    vNormal = normalize(normalMatrix * n);
    vView = -mv.xyz;
    vUv = uv;
    vColor = uColors[int(min(floor(aTone * uColorCount), uColorCount - 1.0))];
    vFog = smoothstep(uFogNear, uFogFar, -mv.z);
  }
  `;

  var STREAK_FRAGMENT = `
  uniform vec2 uFade;
  uniform float uIntensity;
  uniform float uSharp;
  uniform float uCore;
  uniform float uMirror;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vColor;
  varying float vFog;
  varying float vAbove;
  varying float vThin;
  void main() {
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float alpha = pow(facing, uSharp) * smoothstep(uFade.x, uFade.y, vUv.x) * uIntensity * vThin * (1.0 - vFog);
    alpha *= mix(1.0, exp(-vAbove * 0.9), uMirror);
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(mix(vColor, vec3(1.0), pow(facing, 12.0) * uCore), min(alpha, 1.0));
  }
  `;

  var POLE_VERTEX = `
  ${BEND}
  attribute vec4 aSeed;
  attribute float aIndex;
  attribute float aSide;
  uniform float uTravel;
  uniform float uCount;
  uniform float uEdge;
  uniform float uHeight;
  uniform float uRadiusScale;
  uniform float uMirror;
  uniform vec3 uColors[${MAX_COLORS}];
  uniform float uColorCount;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vColor;
  varying float vFog;
  varying float vAbove;
  varying float vHeight;
  varying float vThin;
  void main() {
    vHeight = position.y + 0.5;
    float width = mix(0.08, 0.22, aSeed.y);
    float height = mix(1.3, 1.9, aSeed.z) * uHeight;
    float spacing = uTravel / max(uCount, 1.0);
    vec3 center = vec3(
      aSide * uEdge,
      vHeight * height,
      -uTravel + mod(uTime * 120.0 + (aIndex + aSeed.x * 0.6) * spacing, uTravel)
    );
    vAbove = center.y;
    center.y = mix(center.y, -center.y * 1.6, uMirror);
    center += bend(abs(center.z / uTravel));
    float depth = max(0.1, -(modelViewMatrix * vec4(center, 1.0)).z);
    float wanted = width * uRadiusScale;
    float shown = max(wanted, depth * uPixel * 0.75);
    vThin = wanted / shown;
    vec3 p = center + vec3(position.x * shown, 0.0, position.z * shown);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vNormal = normalize(normalMatrix * normal);
    vView = -mv.xyz;
    vColor = uColors[int(min(floor(aSeed.w * uColorCount), uColorCount - 1.0))];
    vFog = smoothstep(uFogNear, uFogFar, -mv.z);
  }
  `;

  var POLE_FRAGMENT = `
  uniform float uIntensity;
  uniform float uSharp;
  uniform float uCore;
  uniform float uMirror;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vColor;
  varying float vFog;
  varying float vAbove;
  varying float vHeight;
  varying float vThin;
  void main() {
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float ends = smoothstep(0.0, 0.08, vHeight) * smoothstep(1.0, 0.9, vHeight);
    float alpha = pow(facing, uSharp) * ends * uIntensity * vThin * (1.0 - vFog);
    alpha *= mix(1.0, exp(-vAbove * 0.6), uMirror);
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(mix(vColor, vec3(1.0), pow(facing, 12.0) * uCore), min(alpha, 1.0));
  }
  `;

  var DUST_VERTEX = `
  ${BEND}
  attribute vec4 aSeed;
  attribute float aEnd;
  uniform float uTravel;
  uniform float uStretch;
  uniform float uSpread;
  varying float vAlpha;
  void main() {
    float x = (aSeed.x - 0.5) * uSpread;
    float y = mix(1.0, 42.0, aSeed.y * aSeed.y);
    float speed = mix(140.0, 260.0, aSeed.w);
    float z = -uTravel + mod(uTime * speed + aSeed.z * uTravel, uTravel);
    float len = (0.6 + uStretch * 7.0) * mix(0.6, 1.4, aSeed.w);
    vec3 p = vec3(x, y, z + aEnd * len);
    p += bend(abs(p.z / uTravel));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vAlpha = aEnd * (1.0 - smoothstep(uFogNear, uFogFar, -mv.z));
  }
  `;

  var DUST_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(uColor, vAlpha * uIntensity);
  }
  `;

  var ROAD_VERTEX = `
  ${BEND}
  uniform float uTravel;
  uniform float uWidth;
  varying vec2 vRoad;
  varying float vFog;
  void main() {
    vec3 p = position;
    p.x *= uWidth;
    vRoad = vec2(p.x, p.z);
    p += bend(abs(p.z / uTravel));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vFog = smoothstep(uFogNear, uFogFar, -mv.z);
  }
  `;

  var ROAD_FRAGMENT = `
  uniform float uTime;
  uniform vec3 uRoadColor;
  uniform vec3 uLineColor;
  uniform vec3 uBackground;
  uniform float uRoadWidth;
  uniform float uMedian;
  uniform float uLanes;
  uniform float uTransparent;
  uniform float uOpacity;
  varying vec2 vRoad;
  varying float vFog;
  float stripe(float d, float w) {
    float aa = fwidth(d) * 1.2;
    return 1.0 - smoothstep(w - aa, w + aa, d);
  }
  void main() {
    float rx = abs(vRoad.x) - uMedian * 0.5;
    vec3 color = rx < 0.0 ? mix(uRoadColor, uLineColor, 0.12) : uRoadColor;
    if (rx >= 0.0) {
      float laneWidth = uRoadWidth / uLanes;
      float shoulder = max(stripe(abs(rx - 0.3), 0.07), stripe(abs(rx - (uRoadWidth - 0.3)), 0.07));
      float nearest = floor(rx / laneWidth + 0.5);
      float inner = step(0.5, nearest) * step(nearest, uLanes - 0.5);
      float dash = step(0.5, fract((vRoad.y - uTime * 120.0) / 14.0));
      float marks = max(shoulder, stripe(abs(rx - nearest * laneWidth), 0.06) * inner * dash);
      color = mix(color, uLineColor, marks);
    }
    float alpha = mix(1.0, 1.0 - vFog, uTransparent) * uOpacity;
    gl_FragColor = vec4(mix(color, uBackground, vFog * (1.0 - uTransparent)), alpha);
  }
  `;

  var QUAD_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
  `;

  var DOWN_FRAGMENT = `
  uniform sampler2D uTexture;
  uniform vec2 uTexel;
  varying vec2 vUv;
  vec4 tap(vec2 offset) {
    return min(texture2D(uTexture, vUv + uTexel * offset), vec4(1.0));
  }
  void main() {
    vec4 sum = tap(vec2(0.0)) * 4.0 + tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0));
    gl_FragColor = sum * 0.125;
  }
  `;

  var TENT = `
  uniform sampler2D uTexture;
  uniform vec2 uTexel;
  varying vec2 vUv;
  vec4 tent() {
    vec4 sum = texture2D(uTexture, vUv + uTexel * vec2(-1.0, 0.0));
    sum += texture2D(uTexture, vUv + uTexel * vec2(1.0, 0.0));
    sum += texture2D(uTexture, vUv + uTexel * vec2(0.0, -1.0));
    sum += texture2D(uTexture, vUv + uTexel * vec2(0.0, 1.0));
    sum += texture2D(uTexture, vUv + uTexel * vec2(-0.5, -0.5)) * 2.0;
    sum += texture2D(uTexture, vUv + uTexel * vec2(0.5, -0.5)) * 2.0;
    sum += texture2D(uTexture, vUv + uTexel * vec2(-0.5, 0.5)) * 2.0;
    sum += texture2D(uTexture, vUv + uTexel * vec2(0.5, 0.5)) * 2.0;
    return sum / 12.0;
  }
  `;

  var UP_FRAGMENT = `
  ${TENT}
  void main() {
    gl_FragColor = tent();
  }
  `;

  var BLOOM_FRAGMENT = `
  ${TENT}
  uniform float uStrength;
  uniform float uCeiling;
  uniform float uLight;
  void main() {
    vec4 color = tent() * uStrength;
    float peak = max(uLight > 0.5 ? color.a : max(color.r, max(color.g, color.b)), 0.0001);
    color *= uCeiling * (1.0 - exp(-peak / uCeiling)) / peak;
    gl_FragColor = uLight > 0.5 ? color : vec4(color.rgb, 0.0);
  }
  `;

  var colorContext = null;

  function toRgb(color) {
    colorContext = colorContext || document.createElement('canvas').getContext('2d');
    if (!colorContext) return [1, 1, 1];
    colorContext.fillStyle = '#000000';
    colorContext.fillStyle = color;
    var value = String(colorContext.fillStyle);
    if (value.charAt(0) === '#') {
      var hex = parseInt(value.slice(1, 7), 16);
      return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
    }
    var parts = value.match(/[\d.]+/g) || [0, 0, 0];
    return [Number(parts[0]) / 255, Number(parts[1]) / 255, Number(parts[2]) / 255];
  }

  function fillPalette(uniform, count, colors) {
    var list = colors.length ? colors : ['#ffffff'];
    for (var i = 0; i < MAX_COLORS; i++) {
      uniform.value[i].fromArray(toRgb(list[i % list.length]));
    }
    count.value = Math.min(list.length, MAX_COLORS);
  }

  function instanced(source) {
    var geometry = new THREE.InstancedBufferGeometry();
    geometry.setIndex(source.index);
    Object.keys(source.attributes).forEach(function (name) {
      geometry.setAttribute(name, source.attributes[name]);
    });
    return geometry;
  }

  function nsin(value) {
    return Math.sin(value) * 0.5 + 0.5;
  }

  function windX(q, t) {
    return Math.cos(Math.PI * q * 4 + t) * 25 + Math.pow(Math.cos(Math.PI * q * 8 + t * 2), 2) * 5;
  }

  function windY(q, t) {
    return -nsin(Math.PI * q * 8 + t) * 10 - Math.pow(nsin(Math.PI * q + t / 8), 5) * 10;
  }

  function deepX(q, t) {
    return Math.sin(q * Math.PI * 4 + t) * 10;
  }

  function deepY(q, t) {
    return Math.pow(Math.abs(q * 10), 2) + Math.sin(q * Math.PI * 8 + t) * 20;
  }

  function lookWinding(t, curvature) {
    var p = 0.025;
    return [
      (windX(p, t) - windX(p + 0.007, t)) * curvature * -2,
      (windY(p, t) - windY(p + 0.007, t)) * curvature * -5,
      -10
    ];
  }

  function mount(container, options) {
    if (!container || !window.THREE) return function () {};
    var opts = options || {};
    var reduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var settings = {
      curvature: Math.max(0, opts.curvature === undefined ? 1 : opts.curvature),
      speed: Math.max(0, opts.speed === undefined ? 1 : opts.speed),
      boost: Math.max(1, opts.boost === undefined ? 3 : opts.boost),
      fov: Math.min(170, Math.max(20, opts.fov === undefined ? 90 : opts.fov)),
      boostFov: Math.min(170, Math.max(20, opts.boostFov === undefined ? 130 : opts.boostFov)),
      lanes: Math.max(1, Math.round(opts.lanes === undefined ? 3 : opts.lanes)),
      roadWidth: Math.max(1, opts.roadWidth === undefined ? 10 : opts.roadWidth),
      medianWidth: Math.max(0, opts.medianWidth === undefined ? 2 : opts.medianWidth),
      density: Math.min(MAX_CARS, Math.max(0, Math.round(opts.density === undefined ? 40 : opts.density))),
      trailLength: Math.max(0.05, opts.trailLength === undefined ? 1 : opts.trailLength),
      lightSize: Math.max(0.1, opts.lightSize === undefined ? 1 : opts.lightSize),
      poles: Math.min(MAX_POLES, Math.max(0, Math.round(opts.poles === undefined ? 20 : opts.poles))),
      dust: Math.min(MAX_DUST, Math.max(0, Math.round(opts.dust === undefined ? 100 : opts.dust))),
      glow: Math.max(0, opts.glow === undefined ? 0.6 : opts.glow),
      reflections: Math.max(0, opts.reflections === undefined ? 0.5 : opts.reflections),
      steer: Math.max(0, opts.steer === undefined ? 0.35 : opts.steer),
      roadColor: opts.roadColor || '#08080a',
      lineColor: opts.lineColor || '#25252d',
      roadOpacity: Math.min(1, Math.max(0, opts.roadOpacity === undefined ? 0.1 : opts.roadOpacity)),
      tailColors: opts.tailColors && opts.tailColors.length ? opts.tailColors : ['#d856bf', '#6750a2', '#c247ac'],
      headColors: opts.headColors && opts.headColors.length ? opts.headColors : ['#03b3c3', '#0e5ea5', '#324555'],
      poleColors: opts.poleColors && opts.poleColors.length ? opts.poleColors : ['#03b3c3'],
      dustColor: '#ffffff',
      interactive: opts.interactive !== false
    };

    var renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.autoClear = false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(settings.fov, 1, 0.1, 10000);
    camera.position.set(0, 8, -5);

    var shared = {
      uTime: { value: 0 },
      uCurvature: { value: settings.curvature },
      uCurveA: { value: new THREE.Vector4(0, 1, 0, 0) },
      uCurveB: { value: 0 },
      uFogNear: { value: TRAVEL * 0.22 },
      uFogFar: { value: TRAVEL * 0.95 },
      uTravel: { value: TRAVEL },
      uStretch: { value: 0 },
      uPixel: { value: 0.001 }
    };
    var disposables = [];
    var effectMaterials = [];

    function material(vertexShader, fragmentShader, uniforms, options) {
      var created = new THREE.ShaderMaterial(
        Object.assign(
          {
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: Object.assign({}, shared, uniforms),
            transparent: true,
            depthWrite: false
          },
          options || {}
        )
      );
      disposables.push(created);
      return created;
    }

    function swatches() {
      return {
        value: Array.from({ length: MAX_COLORS }, function () {
          return new THREE.Vector3(1, 1, 1);
        })
      };
    }

    var roadGeometry = new THREE.PlaneGeometry(1, TRAVEL, 1, 220);
    roadGeometry.rotateX(-Math.PI / 2);
    roadGeometry.translate(0, 0, -TRAVEL / 2);
    disposables.push(roadGeometry);
    var roadUniforms = {
      uWidth: { value: 1 },
      uRoadColor: { value: new THREE.Vector3() },
      uLineColor: { value: new THREE.Vector3() },
      uBackground: { value: new THREE.Vector3() },
      uRoadWidth: { value: settings.roadWidth },
      uMedian: { value: settings.medianWidth },
      uLanes: { value: settings.lanes },
      uTransparent: { value: 1 },
      uOpacity: { value: settings.roadOpacity }
    };
    var roadMaterial = material(ROAD_VERTEX, ROAD_FRAGMENT, roadUniforms, {
      transparent: true,
      depthWrite: false
    });
    var road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.frustumCulled = false;
    road.renderOrder = 0;
    road.layers.enable(1);
    scene.add(road);

    var tube = new THREE.TubeGeometry(
      new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)),
      24,
      1,
      7,
      false
    );
    disposables.push(tube);

    function streakGroup(direction, fade, speedRange) {
      var geometry = instanced(tube);
      var seedA = new Float32Array(MAX_CARS * 2 * 4);
      var seedB = new Float32Array(MAX_CARS * 2 * 4);
      var pair = new Float32Array(MAX_CARS * 2);
      var tone = new Float32Array(MAX_CARS * 2);
      for (var i = 0; i < MAX_CARS; i++) {
        var a = [Math.random(), Math.random(), Math.random(), Math.random()];
        var b = [Math.random(), Math.random(), Math.random(), Math.random() * Math.random()];
        var shade = Math.random();
        for (var side = 0; side < 2; side++) {
          var index = i * 2 + side;
          seedA.set(a, index * 4);
          seedB.set(b, index * 4);
          pair[index] = side ? 0.5 : -0.5;
          tone[index] = shade;
        }
      }
      geometry.setAttribute('aSeedA', new THREE.InstancedBufferAttribute(seedA, 4));
      geometry.setAttribute('aSeedB', new THREE.InstancedBufferAttribute(seedB, 4));
      geometry.setAttribute('aPair', new THREE.InstancedBufferAttribute(pair, 1));
      geometry.setAttribute('aTone', new THREE.InstancedBufferAttribute(tone, 1));
      geometry.instanceCount = 0;
      disposables.push(geometry);
      var uniforms = {
        uRoadX: { value: 0 },
        uRoadWidth: { value: settings.roadWidth },
        uLanes: { value: settings.lanes },
        uDirection: { value: direction },
        uSpeedRange: { value: new THREE.Vector2(speedRange[0], speedRange[1]) },
        uTrail: { value: settings.trailLength },
        uSize: { value: settings.lightSize },
        uColors: swatches(),
        uColorCount: { value: 1 },
        uFade: { value: new THREE.Vector2(fade[0], fade[1]) }
      };
      var layer = function (radiusScale, sharp, mirror, order) {
        var layerMaterial = material(
          STREAK_VERTEX,
          STREAK_FRAGMENT,
          Object.assign({}, uniforms, {
            uRadiusScale: { value: radiusScale },
            uSharp: { value: sharp },
            uMirror: { value: mirror },
            uIntensity: { value: 1 },
            uCore: { value: 0 }
          }),
          { depthTest: !mirror }
        );
        effectMaterials.push(layerMaterial);
        var mesh = new THREE.Mesh(geometry, layerMaterial);
        mesh.frustumCulled = false;
        mesh.renderOrder = order;
        if (!mirror) mesh.layers.enable(1);
        scene.add(mesh);
        return layerMaterial;
      };
      return {
        geometry: geometry,
        uniforms: uniforms,
        reflection: layer(2.1, 1.2, 1, 1),
        core: layer(1, 0.85, 0, 3)
      };
    }

    var tail = streakGroup(1, [0, 0.6], [60, 80]);
    var head = streakGroup(-1, [1, 0.4], [120, 160]);

    var cylinder = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
    disposables.push(cylinder);
    var poleGeometry = instanced(cylinder);
    var poleSeed = new Float32Array(MAX_POLES * 2 * 4);
    var poleIndex = new Float32Array(MAX_POLES * 2);
    var poleSide = new Float32Array(MAX_POLES * 2);
    for (var p = 0; p < MAX_POLES; p++) {
      for (var ps = 0; ps < 2; ps++) {
        var pi = p * 2 + ps;
        poleSeed.set([Math.random(), Math.random(), Math.random(), Math.random()], pi * 4);
        poleIndex[pi] = p + (ps ? 0.5 : 0);
        poleSide[pi] = ps ? 1 : -1;
      }
    }
    poleGeometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(poleSeed, 4));
    poleGeometry.setAttribute('aIndex', new THREE.InstancedBufferAttribute(poleIndex, 1));
    poleGeometry.setAttribute('aSide', new THREE.InstancedBufferAttribute(poleSide, 1));
    poleGeometry.instanceCount = 0;
    disposables.push(poleGeometry);
    var poleUniforms = {
      uCount: { value: settings.poles },
      uEdge: { value: settings.roadWidth + settings.medianWidth / 2 + 0.8 },
      uHeight: { value: 1 },
      uColors: swatches(),
      uColorCount: { value: 1 }
    };
    function poleLayer(radiusScale, sharp, mirror, order) {
      var layerMaterial = material(
        POLE_VERTEX,
        POLE_FRAGMENT,
        Object.assign({}, poleUniforms, {
          uRadiusScale: { value: radiusScale },
          uSharp: { value: sharp },
          uMirror: { value: mirror },
          uIntensity: { value: 1 },
          uCore: { value: 0 }
        }),
        { depthTest: !mirror }
      );
      effectMaterials.push(layerMaterial);
      var mesh = new THREE.Mesh(poleGeometry, layerMaterial);
      mesh.frustumCulled = false;
      mesh.renderOrder = order;
      if (!mirror) mesh.layers.enable(1);
      scene.add(mesh);
      return layerMaterial;
    }
    var polesLayers = {
      reflection: poleLayer(2.4, 1.2, 1, 1),
      core: poleLayer(1, 0.8, 0, 3)
    };

    var dustGeometry = new THREE.BufferGeometry();
    var dustSeed = new Float32Array(MAX_DUST * 2 * 4);
    var dustEnd = new Float32Array(MAX_DUST * 2);
    for (var d = 0; d < MAX_DUST; d++) {
      var seed = [Math.random(), Math.random(), Math.random(), Math.random()];
      dustSeed.set(seed, d * 8);
      dustSeed.set(seed, d * 8 + 4);
      dustEnd[d * 2 + 1] = 1;
    }
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_DUST * 2 * 3), 3));
    dustGeometry.setAttribute('aSeed', new THREE.BufferAttribute(dustSeed, 4));
    dustGeometry.setAttribute('aEnd', new THREE.BufferAttribute(dustEnd, 1));
    dustGeometry.setDrawRange(0, 0);
    disposables.push(dustGeometry);
    var dustUniforms = {
      uSpread: { value: 140 },
      uColor: { value: new THREE.Vector3(1, 1, 1) },
      uIntensity: { value: 0.5 }
    };
    var dustMaterial = material(DUST_VERTEX, DUST_FRAGMENT, dustUniforms);
    effectMaterials.push(dustMaterial);
    var dustLines = new THREE.LineSegments(dustGeometry, dustMaterial);
    dustLines.frustumCulled = false;
    dustLines.renderOrder = 4;
    scene.add(dustLines);

    var floatTargets =
      renderer.extensions.has('EXT_color_buffer_float') ||
      renderer.extensions.has('EXT_color_buffer_half_float');
    var levels = [];
    for (var li = 0; li < 5; li++) {
      var target = new THREE.WebGLRenderTarget(1, 1, {
        type: floatTargets ? THREE.HalfFloatType : THREE.UnsignedByteType,
        depthBuffer: li === 0
      });
      disposables.push(target);
      levels.push(target);
    }
    var quadScene = new THREE.Scene();
    var quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var quadGeometry = new THREE.PlaneGeometry(2, 2);
    disposables.push(quadGeometry);
    var quad = new THREE.Mesh(quadGeometry);
    quad.frustumCulled = false;
    quadScene.add(quad);

    function blur(fragmentShader, options) {
      var created = new THREE.ShaderMaterial(
        Object.assign(
          {
            vertexShader: QUAD_VERTEX,
            fragmentShader: fragmentShader,
            uniforms: {
              uTexture: { value: null },
              uTexel: { value: new THREE.Vector2() },
              uStrength: { value: 1 },
              uCeiling: { value: 1 },
              uLight: { value: 0 }
            },
            depthTest: false,
            depthWrite: false
          },
          options || {}
        )
      );
      disposables.push(created);
      return created;
    }
    var downMaterial = blur(DOWN_FRAGMENT, { blending: THREE.NoBlending });
    var upMaterial = blur(UP_FRAGMENT, {
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneFactor
    });
    var bloomMaterial = blur(BLOOM_FRAGMENT, {
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor
    });
    function pass(passMaterial, source, target) {
      quad.material = passMaterial;
      passMaterial.uniforms.uTexture.value = source.texture;
      passMaterial.uniforms.uTexel.value.set(1 / source.width, 1 / source.height);
      renderer.setRenderTarget(target);
      renderer.render(quadScene, quadCamera);
    }

    var clearColor = new THREE.Color(0, 0, 0);
    var state = {
      boost: 0,
      held: false,
      fov: settings.fov,
      fovVelocity: 0,
      steerX: 0,
      steerY: 0,
      pointerX: 0,
      pointerY: 0,
      visible: true
    };
    var lookTarget = new THREE.Vector3();
    var raf = 0;
    var last = performance.now();
    var alive = true;

    function syncColors() {
      fillPalette(tail.uniforms.uColors, tail.uniforms.uColorCount, settings.tailColors);
      fillPalette(head.uniforms.uColors, head.uniforms.uColorCount, settings.headColors);
      fillPalette(poleUniforms.uColors, poleUniforms.uColorCount, settings.poleColors);
      roadUniforms.uRoadColor.value.fromArray(toRgb(settings.roadColor));
      roadUniforms.uLineColor.value.fromArray(toRgb(settings.lineColor));
      dustUniforms.uColor.value.fromArray(toRgb(settings.dustColor));
      roadUniforms.uBackground.value.fromArray([0, 0, 0]);
      roadUniforms.uTransparent.value = 1;
      effectMaterials.forEach(function (item) {
        item.blending = THREE.AdditiveBlending;
        item.needsUpdate = true;
      });
      bloomMaterial.blendDst = THREE.OneFactor;
      bloomMaterial.blendSrcAlpha = THREE.ZeroFactor;
      bloomMaterial.blendDstAlpha = THREE.OneFactor;
      bloomMaterial.uniforms.uLight.value = 0;
    }

    function resize() {
      var width = Math.max(1, container.clientWidth);
      var height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false);
      levels.forEach(function (target, index) {
        target.setSize(
          Math.max(1, Math.round(width / Math.pow(2, index + 1))),
          Math.max(1, Math.round(height / Math.pow(2, index + 1)))
        );
      });
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      wake();
    }

    function frame(now) {
      raf = 0;
      if (!alive || !state.visible) return;
      var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;

      var wanted = (state.held && settings.interactive) ? 1 : 0;
      state.boost +=
        (wanted - state.boost) * (1 - Math.exp(-dt / (wanted > state.boost ? 0.28 : 0.85)));
      var pace = settings.speed * (reduce ? 0.3 : 1) * (1 + (settings.boost - 1) * state.boost);
      shared.uTime.value += dt * pace;
      shared.uStretch.value = state.boost * 1.1;
      shared.uCurvature.value = settings.curvature;

      tail.geometry.instanceCount = settings.density * 2;
      head.geometry.instanceCount = settings.density * 2;
      var halfRoad = settings.roadWidth / 2 + settings.medianWidth / 2;
      [tail, head].forEach(function (group, index) {
        group.uniforms.uRoadX.value = index ? halfRoad : -halfRoad;
        group.uniforms.uRoadWidth.value = settings.roadWidth;
        group.uniforms.uLanes.value = settings.lanes;
        group.uniforms.uTrail.value = settings.trailLength;
        group.uniforms.uSize.value = settings.lightSize;
        group.core.uniforms.uIntensity.value = 1 + 0.35 * state.boost;
        group.core.uniforms.uCore.value = 0.75;
        group.reflection.uniforms.uIntensity.value =
          settings.reflections * 0.42 * (0.45 + 0.55 * settings.roadOpacity);
      });

      poleGeometry.instanceCount = settings.poles * 2;
      poleUniforms.uCount.value = Math.max(1, settings.poles);
      poleUniforms.uEdge.value = settings.roadWidth + settings.medianWidth / 2 + 0.8;
      poleUniforms.uHeight.value = 1;
      polesLayers.core.uniforms.uIntensity.value = 1;
      polesLayers.core.uniforms.uCore.value = 0.6;
      polesLayers.reflection.uniforms.uIntensity.value =
        settings.reflections * 0.38 * (0.45 + 0.55 * settings.roadOpacity);

      dustGeometry.setDrawRange(0, settings.dust * 2);
      dustUniforms.uIntensity.value = 0.45 * (1 + state.boost);
      dustUniforms.uSpread.value = (settings.roadWidth * 2 + settings.medianWidth) * 5;

      roadUniforms.uWidth.value = settings.roadWidth * 2 + settings.medianWidth + 3;
      roadUniforms.uRoadWidth.value = settings.roadWidth;
      roadUniforms.uMedian.value = settings.medianWidth;
      roadUniforms.uLanes.value = settings.lanes;
      roadUniforms.uOpacity.value = settings.roadOpacity;
      roadMaterial.depthWrite = settings.roadOpacity > 0.5;

      var fovTarget = reduce ? settings.fov : settings.fov + (settings.boostFov - settings.fov) * state.boost;
      state.fovVelocity += ((fovTarget - state.fov) * 90 - state.fovVelocity * 13) * dt;
      state.fov += state.fovVelocity * dt;
      camera.fov = state.fov;
      shared.uPixel.value =
        (2 * Math.tan((state.fov * Math.PI) / 360)) / Math.max(1, renderer.domElement.height);

      var steerBlend = 1 - Math.exp(-dt / 0.35);
      var follow = settings.interactive ? settings.steer : 0;
      state.steerX += (state.pointerX * follow - state.steerX) * steerBlend;
      state.steerY += (state.pointerY * follow - state.steerY) * steerBlend;
      camera.position.set(
        state.steerX * settings.roadWidth * 0.45,
        8 - state.steerY * 2.5,
        -5
      );

      var look = lookWinding(shared.uTime.value, settings.curvature);
      lookTarget.set(look[0] + state.steerX * 2.5, look[1], look[2]);
      lookTarget.add(camera.position);
      camera.lookAt(lookTarget);
      camera.updateProjectionMatrix();

      renderer.setRenderTarget(null);
      renderer.setClearColor(clearColor, 0);
      renderer.clear();
      renderer.render(scene, camera);

      if (settings.glow > 0) {
        var pixel = shared.uPixel.value;
        shared.uPixel.value = pixel * (renderer.domElement.height / levels[0].height);
        camera.layers.set(1);
        roadMaterial.colorWrite = false;
        renderer.setRenderTarget(levels[0]);
        renderer.setClearColor(0x000000, 0);
        renderer.clear();
        renderer.render(scene, camera);
        roadMaterial.colorWrite = true;
        camera.layers.set(0);
        shared.uPixel.value = pixel;
        for (var levelIndex = 1; levelIndex < levels.length; levelIndex++) {
          pass(downMaterial, levels[levelIndex - 1], levels[levelIndex]);
        }
        for (var upIndex = levels.length - 1; upIndex > 1; upIndex--) {
          pass(upMaterial, levels[upIndex], levels[upIndex - 1]);
        }
        bloomMaterial.uniforms.uStrength.value = settings.glow * 1.4;
        bloomMaterial.uniforms.uCeiling.value = settings.glow * 0.5;
        pass(bloomMaterial, levels[1], null);
      }

      if (state.visible && alive) raf = requestAnimationFrame(frame);
    }

    function wake() {
      if (raf || !alive || !state.visible) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function onDown(event) {
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      state.held = true;
      wake();
    }

    function onUp() {
      state.held = false;
      wake();
    }

    function onMove(event) {
      var rect = container.getBoundingClientRect();
      state.pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      state.pointerY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      wake();
    }

    function onLeave() {
      state.pointerX = 0;
      state.pointerY = 0;
    }

    function onMenu(event) {
      if (settings.interactive) event.preventDefault();
    }

    var resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    var visibility = new IntersectionObserver(function (entries) {
      state.visible = entries.some(function (entry) {
        return entry.isIntersecting;
      });
      if (state.visible) wake();
    });
    visibility.observe(container);
    container.addEventListener('pointerdown', onDown);
    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerleave', onLeave);
    container.addEventListener('contextmenu', onMenu);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('blur', onUp);

    syncColors();
    resize();

    return function dispose() {
      alive = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      visibility.disconnect();
      container.removeEventListener('pointerdown', onDown);
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerleave', onLeave);
      container.removeEventListener('contextmenu', onMenu);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onUp);
      disposables.forEach(function (item) {
        if (item && typeof item.dispose === 'function') item.dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }

  window.HyperspeedBackground = { mount: mount };
})();
