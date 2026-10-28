/* Ambient contour field — procedural WebGL backdrop.
   No dependencies, degrades to CSS when WebGL is unavailable. */
(function(){
  "use strict";

  const VERT = `
    attribute vec2 a_pos;
    void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time;
    uniform vec2 u_mouse;
    uniform float u_intensity;

    float hash(vec2 p){
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      mat2 R = mat2(0.8, 0.6, -0.6, 0.8);
      for(int i = 0; i < 5; i++){
        v += a * noise(p);
        p = R * p * 2.03;
        a *= 0.5;
      }
      return v;
    }

    void main(){
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
      vec2 p = uv * 1.48;
      float t = u_time * 0.045;

      vec2 warp = vec2(
        fbm(p * 1.25 + vec2(0.0, t)),
        fbm(p * 1.25 + vec2(3.7, -t * 0.8))
      );
      p += (warp - 0.5) * (0.42 + u_intensity * 0.18);
      p += u_mouse * 0.13;

      float f = fbm(p * 1.9 + vec2(t * 0.65, 0.0));
      float bands = abs(fract(f * 7.0 + uv.y * 0.22) - 0.5);
      float line = smoothstep(0.042, 0.0, bands);

      float edge = smoothstep(1.42, 0.12, length(uv * vec2(0.88, 1.04)));
      vec3 warm = vec3(0.64, 0.37, 0.17);
      vec3 cool = vec3(0.20, 0.25, 0.31);
      vec3 tint = mix(cool, warm, smoothstep(-0.75, 0.8, f + uv.y * 0.12));

      vec3 col = vec3(0.0125, 0.0120, 0.0112);
      col += tint * line * edge * 0.60 * u_intensity;

      float glowA = exp(-length((uv - vec2(-0.62, -0.46)) * vec2(1.0, 1.25)) * 2.15);
      float glowB = exp(-length((uv - vec2(0.68, 0.56)) * vec2(1.0, 1.25)) * 2.0);
      col += vec3(0.58, 0.31, 0.13) * glowA * 0.13 * u_intensity;
      col += vec3(0.14, 0.19, 0.25) * glowB * 0.09 * u_intensity;

      float dustSeed = hash(floor(gl_FragCoord.xy * 0.55) + floor(u_time * 0.35));
      float dust = smoothstep(0.992, 1.0, dustSeed) * edge;
      col += vec3(0.86, 0.77, 0.63) * dust * 0.45 * u_intensity;

      col *= smoothstep(1.52, 0.28, length(uv));
      float g = hash(uv * u_res + fract(u_time) * 73.0) - 0.5;
      col += g * 0.022;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(gl, type, src){
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
    return shader;
  }

  class AmbientField {
    constructor(canvas, options){
      this.canvas = canvas;
      this.opts = Object.assign({
        intensity: 1,
        speed: 1,
        dprCap: 1.5,
        mouse: true
      }, options || {});
      this.gl = null;
      this.running = false;
      this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
      this.start = performance.now();
      this.boundFrame = this.frame.bind(this);
      this.boundResize = this.resize.bind(this);
      this.boundPointer = this.onPointer.bind(this);
      this.boundVisibility = this.onVisibility.bind(this);
      this.init();
    }

    init(){
      try{
        const gl = this.canvas.getContext("webgl", {
          alpha: false,
          antialias: false,
          depth: false,
          stencil: false,
          powerPreference: "low-power"
        });
        if(!gl) return;
        this.gl = gl;
        const vs = compile(gl, gl.VERTEX_SHADER, VERT);
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
        if(!vs || !fs) return;
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
        gl.useProgram(prog);
        this.prog = prog;

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, "a_pos");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        this.uRes = gl.getUniformLocation(prog, "u_res");
        this.uTime = gl.getUniformLocation(prog, "u_time");
        this.uMouse = gl.getUniformLocation(prog, "u_mouse");
        this.uIntensity = gl.getUniformLocation(prog, "u_intensity");
        gl.uniform1f(this.uIntensity, this.opts.intensity);

        this.resize();
        window.addEventListener("resize", this.boundResize, { passive:true });
        if(this.opts.mouse){
          window.addEventListener("pointermove", this.boundPointer, { passive:true });
        }
        document.addEventListener("visibilitychange", this.boundVisibility);
        this.canvas.classList.add("is-live");

        if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){
          this.drawStatic();
        }else{
          this.running = true;
          requestAnimationFrame(this.boundFrame);
        }
      }catch(err){
        this.gl = null;
      }
    }

    resize(){
      if(!this.gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, this.opts.dprCap);
      const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
      if(this.canvas.width !== w || this.canvas.height !== h){
        this.canvas.width = w;
        this.canvas.height = h;
        this.gl.viewport(0, 0, w, h);
      }
    }

    onPointer(e){
      this.mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouse.ty = -(e.clientY / window.innerHeight - 0.5) * 2;
    }

    onVisibility(){
      if(document.hidden){
        this.running = false;
      }else if(this.gl && !window.matchMedia("(prefers-reduced-motion: reduce)").matches){
        this.running = true;
        this.start = performance.now() - this.elapsed;
        requestAnimationFrame(this.boundFrame);
      }
    }

    draw(t){
      if(!this.gl) return;
      const gl = this.gl;
      gl.uniform2f(this.uRes, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.uTime, t * this.opts.speed);
      gl.uniform2f(this.uMouse, this.mouse.x, this.mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    drawStatic(){
      this.resize();
      this.draw(8.0);
    }

    frame(now){
      if(!this.running) return;
      this.elapsed = (now - this.start) / 1000;
      this.mouse.x += (this.mouse.tx - this.mouse.x) * 0.035;
      this.mouse.y += (this.mouse.ty - this.mouse.y) * 0.035;
      this.draw(this.elapsed);
      requestAnimationFrame(this.boundFrame);
    }

    destroy(){
      this.running = false;
      window.removeEventListener("resize", this.boundResize);
      window.removeEventListener("pointermove", this.boundPointer);
      document.removeEventListener("visibilitychange", this.boundVisibility);
      if(this.gl){
        const ext = this.gl.getExtension("WEBGL_lose_context");
        if(ext) ext.loseContext();
      }
    }
  }

  window.AmbientField = AmbientField;
})();
