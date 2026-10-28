/* DotField - 点阵场背景
   参数映射（对应 DotField 组件）:
   gradientFrom=#95e410, gradientTo=#3b82f6, dotRadius=1.5, dotSpacing=14,
   cursorRadius=240, bulgeStrength=0.6, glowRadius=160, pattern=grid,
   glowColor=#ffffff, gradientAngle=135, glowIntensity=0.8, baseOpacity=0.55,
   waveAmplitude=0, speed=1, sparkle=false, interactive, holdToZoom, lightMode=false
*/
(function () {
  var cv = document.getElementById('aurora');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var W, H, DPR;
  var dots = [];
  var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, down: 0 };

  var FROM = [149, 228, 16];   // #95e410
  var TO = [59, 130, 246];     // #3b82f6

  var SPACING = 14;        // dotSpacing
  var CURSOR_R = 240;      // cursorRadius
  var BULGE = 0.6;         // bulgeStrength（初始1倍膨胀值）
  var GLOW_R = 160;        // glowRadius
  var GLOW_INT = 0.8;      // glowIntensity
  var BASE_OP = 0.55;      // baseOpacity
  var DOT_R = 1.5;         // dotRadius

  function resize() {
    DPR = window.devicePixelRatio || 1;
    W = cv.width = window.innerWidth * DPR;
    H = cv.height = window.innerHeight * DPR;
    cv.style.width = window.innerWidth + 'px';
    cv.style.height = window.innerHeight + 'px';
    buildDots();
  }

  // 渐变角度 135deg => 从左上到右下
  function lerpColor(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  function buildDots() {
    dots = [];
    var sx = Math.max(SPACING, DPR * 3);
    var sy = Math.max(SPACING, DPR * 3);
    for (var y = sy; y < H; y += sy) {
      for (var x = sx; x < W; x += sx) {
        // gradient angle 135: t along diagonal
        var t = (x / W * 0.7 + y / H * 0.3);
        dots.push({ x: x, y: y, t: t, seed: Math.random() * 100 });
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // 鼠标缓动
    mouse.x += (mouse.tx - mouse.x) * 0.1;
    mouse.y += (mouse.ty - mouse.y) * 0.1;

    // 按住放大
    var bulgeBoost = mouse.down ? 1.8 : 1.0;

    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      var c = lerpColor(FROM, TO, d.t);
      var dx = d.x - mouse.x, dy = d.y - mouse.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      var r = DOT_R * DPR;
      if (mouse.x !== -9999 && dist < CURSOR_R * DPR) {
        var f = 1 - dist / (CURSOR_R * DPR);
        r += f * BULGE * 5 * DPR * bulgeBoost; // 鼓起膨胀，无白色光晕
      }

      ctx.fillStyle = 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + BASE_OP + ')';
      ctx.beginPath();
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop() { draw(); requestAnimationFrame(loop); }

  if (window.addEventListener) {
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', function (e) {
      mouse.tx = e.clientX * DPR;
      mouse.ty = e.clientY * DPR;
    });
    window.addEventListener('mousedown', function () { mouse.down = 1; });
    window.addEventListener('mouseup', function () { mouse.down = 0; });
    window.addEventListener('mouseleave', function () {
      mouse.tx = -9999; mouse.ty = -9999; mouse.down = 0;
    });
  }

  resize();
  loop();
})();
