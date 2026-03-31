// gl.js — GPGPU Particle System + Matcap Blob
// Desktop: 16,384 particles | Mobile: 4,096 particles — physics fully on GPU
(function () {
  if (!window.THREE) return;

  const hero   = document.getElementById('home');
  const canvas = document.getElementById('heroParticles');
  if (!hero || !canvas) return;

  // ── Renderer ──────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);

  // ── Scene & Camera ────────────────────────────────────────────────────────
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 5;

  const isMobile = window.innerWidth < 680;

  // ── GPGPU Config ──────────────────────────────────────────────────────────
  // SIZE×SIZE texture = particle count
  const SIZE = isMobile ? 64 : 128;   // 4,096 or 16,384 particles
  const N    = SIZE * SIZE;

  // ── Render Targets (ping-pong pairs) ──────────────────────────────────────
  const rtOpts = {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format:    THREE.RGBAFormat,
    type:      THREE.HalfFloatType,   // half-float: good precision, wide compat
    depthBuffer: false,
  };
  const rtPos = [
    new THREE.WebGLRenderTarget(SIZE, SIZE, rtOpts),
    new THREE.WebGLRenderTarget(SIZE, SIZE, rtOpts),
  ];
  const rtVel = [
    new THREE.WebGLRenderTarget(SIZE, SIZE, rtOpts),
    new THREE.WebGLRenderTarget(SIZE, SIZE, rtOpts),
  ];
  let pp = 0; // read from pp, write to 1-pp, then swap

  // ── Compute Scene (full-screen quad) ─────────────────────────────────────
  const compCam   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const compScene = new THREE.Scene();
  const compQuad  = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  compScene.add(compQuad);

  function compute(mat, target) {
    compQuad.material = mat;
    renderer.setRenderTarget(target);
    renderer.render(compScene, compCam);
    renderer.setRenderTarget(null);
  }

  // Shared vertex shader for all compute passes
  const COMP_VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

  // ── Init Shaders — generate positions/velocities procedurally on GPU ──────
  const initPosMat = new THREE.ShaderMaterial({
    uniforms: { uSeed: { value: Math.random() * 99 } },
    vertexShader: COMP_VERT,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uSeed;
      float h(vec2 p) { p = fract(p * vec2(127.1, 311.7) + uSeed); p += dot(p, p + 19.19); return fract(p.x * p.y); }
      void main() {
        float a = h(vUv), b = h(vUv * 1.7 + 0.4), c = h(vUv * 2.3 + 0.8), id = h(vUv * 0.9 + 1.2);
        float theta = a * 6.28318, phi = acos(2.0 * b - 1.0), r = 2.0 + c * 3.2;
        // Spread in ellipsoid (wider on x, shallower on z)
        gl_FragColor = vec4(
          r * sin(phi) * cos(theta),
          r * sin(phi) * sin(theta) * 0.6,
          (id - 0.5) * 2.5,
          a  // unique id stored in w channel
        );
      }
    `,
  });

  const initVelMat = new THREE.ShaderMaterial({
    uniforms: { uSeed: { value: Math.random() * 99 + 50 } },
    vertexShader: COMP_VERT,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uSeed;
      float h(vec2 p) { p = fract(p * vec2(127.1, 311.7) + uSeed); p += dot(p, p + 19.19); return fract(p.x * p.y); }
      void main() {
        gl_FragColor = vec4(
          (h(vUv) - 0.5) * 0.022,
          (h(vUv * 1.4 + 0.5) - 0.5) * 0.022,
          (h(vUv * 2.1 + 1.0) - 0.5) * 0.012,
          0.0
        );
      }
    `,
  });

  // Initialize all four render targets
  compute(initPosMat, rtPos[0]); compute(initPosMat, rtPos[1]);
  compute(initVelMat, rtVel[0]); compute(initVelMat, rtVel[1]);

  // ── Velocity Update Shader ── GPU physics ─────────────────────────────────
  const velMat = new THREE.ShaderMaterial({
    uniforms: {
      uPos:         { value: null },
      uVel:         { value: null },
      uMouse:       { value: new THREE.Vector3() },
      uTime:        { value: 0 },
      uMouseActive: { value: 0 },
    },
    vertexShader: COMP_VERT,
    fragmentShader: `
      uniform sampler2D uPos, uVel;
      uniform vec3  uMouse;
      uniform float uTime, uMouseActive;
      varying vec2  vUv;

      void main() {
        vec4 pd = texture2D(uPos, vUv);
        vec3 p  = pd.xyz;
        vec3 v  = texture2D(uVel, vUv).xyz;
        float id = pd.w;

        // ── Mouse attraction ──────────────────────────────────────────────
        vec3  toM = uMouse - p;
        float d   = max(length(toM), 0.01);
        // Force falls off with distance, capped to avoid explosion near cursor
        float str = uMouseActive * 0.0020 / (d * 0.25 + 0.12);
        v += normalize(toM) * min(str, 0.022);

        // ── Organic turbulence (unique per-particle via id) ───────────────
        float nt = uTime * 0.28 + id * 12.566;
        v.x += sin(nt * 1.1 + p.y * 0.8) * 0.00025;
        v.y += cos(nt * 0.85 + p.x * 0.6) * 0.00025;
        v.z += sin(nt * 0.6  + p.z * 0.7) * 0.00015;

        // ── Soft boundary — push back before hitting edge ─────────────────
        v.x -= sign(p.x) * max(0.0, abs(p.x) - 4.8) * 0.005;
        v.y -= sign(p.y) * max(0.0, abs(p.y) - 3.4) * 0.005;
        v.z -= sign(p.z) * max(0.0, abs(p.z) - 2.6) * 0.005;

        // ── Damping + speed clamp ─────────────────────────────────────────
        v *= 0.974;
        float spd = length(v);
        if (spd > 0.048) v = v / spd * 0.048;

        gl_FragColor = vec4(v, 1.0);
      }
    `,
  });

  // ── Position Update Shader ────────────────────────────────────────────────
  const posMat = new THREE.ShaderMaterial({
    uniforms: {
      uPos: { value: null },
      uVel: { value: null },
    },
    vertexShader: COMP_VERT,
    fragmentShader: `
      uniform sampler2D uPos, uVel;
      varying vec2 vUv;
      void main() {
        vec4 pd = texture2D(uPos, vUv);
        // Integrate: new position = old position + velocity
        gl_FragColor = vec4(pd.xyz + texture2D(uVel, vUv).xyz, pd.w);
      }
    `,
  });

  // ── Particle Render ───────────────────────────────────────────────────────
  // Each vertex carries a UV that maps to its texel in the position texture
  const pGeo = new THREE.BufferGeometry();
  const pUVs = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    pUVs[i * 2]     = (i % SIZE + 0.5) / SIZE;       // center of texel
    pUVs[i * 2 + 1] = (Math.floor(i / SIZE) + 0.5) / SIZE;
  }
  pGeo.setAttribute('aUV',      new THREE.BufferAttribute(pUVs, 2));
  pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); // dummy

  function isLight() { return document.documentElement.classList.contains('light'); }

  // Colors: glass core (bright) + glass rim (deep)
  function getGlassColors() {
    return isLight()
      ? { c1: new THREE.Color(0xffffff), c2: new THREE.Color(0x5060d8) }
      : { c1: new THREE.Color(0xaae8ff), c2: new THREE.Color(0x2840c8) };
  }
  const { c1, c2 } = getGlassColors();

  const pMat = new THREE.ShaderMaterial({
    uniforms: {
      uPos:  { value: null },
      uVel:  { value: null },
      uTime: { value: 0 },
      uC1:   { value: c1 },        // bright glass core
      uC2:   { value: c2 },        // deep glass rim
      uSize: { value: isMobile ? 3.2 : 5.5 },
    },
    vertexShader: `
      attribute vec2 aUV;
      uniform sampler2D uPos, uVel;
      uniform float uSize;

      varying vec2  vDir;    // 2D velocity direction in clip space
      varying float vSpeed;
      varying float vId;

      void main() {
        vec4 pd   = texture2D(uPos, aUV);
        vec3 p    = pd.xyz;
        vec3 vel  = texture2D(uVel, aUV).xyz;

        vec4 mv   = modelViewMatrix * vec4(p, 1.0);
        vec4 clip = projectionMatrix * mv;
        gl_Position = clip;

        // Project velocity to 2-D clip space — gives cloth orientation
        float vspd = length(vel);
        if (vspd > 0.0005) {
          vec4 mvOff  = modelViewMatrix * vec4(p + (vel / vspd) * 0.4, 1.0);
          vec4 cOff   = projectionMatrix * mvOff;
          vec2 d2     = cOff.xy / cOff.w - clip.xy / clip.w;
          float dlen  = length(d2);
          vDir = dlen > 0.0001 ? d2 / dlen : vec2(1.0, 0.0);
        } else {
          vDir = vec2(1.0, 0.0);
        }
        vSpeed = vspd;
        vId    = pd.w;

        // Larger sprite: cloth pieces need room to elongate
        gl_PointSize = uSize * (13.0 / -mv.z) * (1.0 + vspd * 3.5);
      }
    `,
    fragmentShader: `
      uniform vec3  uC1, uC2;
      uniform float uTime;

      varying vec2  vDir;
      varying float vSpeed;
      varying float vId;

      void main() {
        // Map [0,1] → [-1,1] centered UV
        vec2 uv = gl_PointCoord * 2.0 - 1.0;

        // Rotate UV so X axis aligns with velocity direction
        float cosA =  vDir.x, sinA = vDir.y;
        vec2 ruv   = vec2( uv.x * cosA + uv.y * sinA,
                          -uv.x * sinA + uv.y * cosA);

        // Elongation: cloth piece stretches along velocity at higher speed
        float elong = clamp(3.2 + vSpeed * 160.0, 3.2, 8.0);

        // Distance: ellipse that's narrow in perpendicular direction
        float dx = ruv.x;           // along velocity
        float dy = ruv.y * elong;   // compressed cross-section → thin ribbon

        float d = sqrt(dx * dx + dy * dy);
        if (d > 1.0) discard;

        float edge = 1.0 - d;

        // ── Cloth flutter: sine wave across the ribbon width ──────────────
        float wave   = sin(ruv.x * 9.0 + uTime * 2.0 + vId * 6.28318) * 0.05;
        float ribbon = abs(ruv.y + wave) * elong;

        // Specular highlight: thin bright line down the center of ribbon
        float spec   = max(0.0, 1.0 - ribbon * 3.0);

        // ── Glass color gradient ───────────────────────────────────────────
        // Rim → core: uC2 (deep blue/violet) to uC1 (bright cyan/white)
        vec3 color   = mix(uC2, uC1, edge * edge * 1.1);
        // Specular stripe: almost-white highlight
        color        = mix(color, vec3(1.0, 1.0, 1.15), spec * 0.92);

        // ── Soft alpha — low per-piece, dense when overlapping = melebur ──
        float alpha  = edge * edge * 0.52 + spec * 0.38;

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  });

  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // ── Matcap Blob ───────────────────────────────────────────────────────────
  function makeMatcap(light) {
    const sz = 256;
    const c  = document.createElement('canvas');
    c.width  = c.height = sz;
    const ctx = c.getContext('2d');

    if (!light) {
      const g = ctx.createRadialGradient(sz*.38, sz*.33, 0, sz*.5, sz*.5, sz*.52);
      g.addColorStop(0,    'rgba(240,248,255,1)');
      g.addColorStop(0.12, 'rgba(190,210,255,.95)');
      g.addColorStop(0.35, 'rgba(80,105,245,.92)');
      g.addColorStop(0.65, 'rgba(18,28,155,.96)');
      g.addColorStop(1,    'rgba(4,4,22,1)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sz/2, sz/2, sz/2, 0, Math.PI*2); ctx.fill();
      const rim = ctx.createRadialGradient(sz*.78, sz*.8, 0, sz*.78, sz*.8, sz*.28);
      rim.addColorStop(0, 'rgba(232,245,95,.38)');
      rim.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(sz/2, sz/2, sz/2, 0, Math.PI*2); ctx.fill();
    } else {
      const g = ctx.createRadialGradient(sz*.38, sz*.33, 0, sz*.5, sz*.5, sz*.52);
      g.addColorStop(0,    'rgba(255,255,255,1)');
      g.addColorStop(0.12, 'rgba(255,248,220,.95)');
      g.addColorStop(0.35, 'rgba(215,175,60,.9)');
      g.addColorStop(0.65, 'rgba(150,100,10,.95)');
      g.addColorStop(1,    'rgba(35,18,0,1)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sz/2, sz/2, sz/2, 0, Math.PI*2); ctx.fill();
      const rim = ctx.createRadialGradient(sz*.75, sz*.78, 0, sz*.75, sz*.78, sz*.25);
      rim.addColorStop(0, 'rgba(100,80,220,.3)');
      rim.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(sz/2, sz/2, sz/2, 0, Math.PI*2); ctx.fill();
    }
    return new THREE.CanvasTexture(c);
  }

  const blobDetail = isMobile ? 3 : 4;
  const blobGeo    = new THREE.IcosahedronGeometry(1.3, blobDetail);
  const origPos    = Float32Array.from(blobGeo.attributes.position.array);
  const blobPosAttr = blobGeo.attributes.position;

  const blobMat = new THREE.MeshMatcapMaterial({
    matcap: makeMatcap(isLight()), transparent: true, opacity: 0.88,
  });
  const blob = new THREE.Mesh(blobGeo, blobMat);
  scene.add(blob);

  // ── Mouse — track position in 3D world space ──────────────────────────────
  const raycaster = new THREE.Raycaster();
  const mPlane    = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const mouse3D   = new THREE.Vector3();
  const mouseNDC  = new THREE.Vector2();
  let mActiveTarget = 0, mActiveCur = 0;
  let tmx = 0, tmy = 0, mx = 0, my = 0;

  function onMove(cx, cy) {
    // NDC for raycasting → 3D world position on z=0 plane
    mouseNDC.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(mouseNDC, camera);
    raycaster.ray.intersectPlane(mPlane, mouse3D);
    mActiveTarget = 1;
    // Normalized -1..1 for blob mouse reaction
    tmx = (cx / window.innerWidth  - 0.5) * 2;
    tmy = (cy / window.innerHeight - 0.5) * 2;
  }

  document.addEventListener('mousemove',  e => onMove(e.clientX, e.clientY), { passive: true });
  document.addEventListener('touchmove',  e => onMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  document.addEventListener('mouseleave', () => { mActiveTarget = 0; }, { passive: true });

  // ── Resize ────────────────────────────────────────────────────────────────
  function resize() {
    const w = hero.clientWidth;
    const h = hero.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (w < 680)       { blob.position.set(0,   0.9, 0); blob.scale.setScalar(0.72); }
    else if (w < 1024) { blob.position.set(1.4, 0.1, 0); blob.scale.setScalar(0.9); }
    else               { blob.position.set(1.8, 0.1, 0); blob.scale.setScalar(1);   }
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // ── Theme watcher ─────────────────────────────────────────────────────────
  let lastLight = isLight();
  new MutationObserver(() => {
    const l = isLight();
    if (l === lastLight) return;
    lastLight = l;
    blobMat.matcap = makeMatcap(l);
    blobMat.needsUpdate = true;
    const gc = getGlassColors();
    pMat.uniforms.uC1.value.copy(gc.c1);
    pMat.uniforms.uC2.value.copy(gc.c2);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  // ── Scroll parallax ───────────────────────────────────────────────────────
  let scrollY = 0;
  window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

  // ── Blob noise (sine-based, CPU — 1620 verts on desktop) ──────────────────
  function sn(x, y, z) {
    return (
      Math.sin(x * 2.1 + z * 0.8) * Math.cos(y * 1.9 + x * 0.6) +
      Math.sin(y * 2.6 + z * 1.1) * Math.cos(z * 1.7 + y * 0.9)
    ) * 0.5;
  }

  // ── Animation Loop ────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  let active = true;

  function tick() {
    if (!active) return;
    requestAnimationFrame(tick);

    const t = clock.getElapsedTime();

    // Smooth lerps
    mx += (tmx - mx) * 0.045;
    my += (tmy - my) * 0.045;
    mActiveCur += (mActiveTarget - mActiveCur) * 0.06; // smooth mouse fade in/out

    // ── Blob vertex displacement ───────────────────────────────────────────
    const arr = blobPosAttr.array;
    for (let i = 0, l = arr.length; i < l; i += 3) {
      const ox = origPos[i], oy = origPos[i+1], oz = origPos[i+2];
      const n  = sn(ox*1.4 + t*0.32 + mx*0.22, oy*1.4 + t*0.26, oz*1.4 + t*0.21 + my*0.18);
      arr[i]   = ox + ox * n * 0.27;
      arr[i+1] = oy + oy * n * 0.27;
      arr[i+2] = oz + oz * n * 0.27;
    }
    blobPosAttr.needsUpdate = true;
    blobGeo.computeVertexNormals();
    blob.rotation.x = t * 0.065 + my * 0.055;
    blob.rotation.y = t * 0.105 + mx * 0.065;
    blob.position.y = (window.innerWidth < 680 ? 0.9 : 0.1) - scrollY * 0.0025;

    // ── Camera follow ──────────────────────────────────────────────────────
    camera.position.x += (-mx * 0.18 - camera.position.x) * 0.035;
    camera.position.y += ( my * 0.11  - camera.position.y) * 0.035;
    camera.lookAt(scene.position);

    // ── GPGPU compute passes ───────────────────────────────────────────────
    const r = pp, w = 1 - pp;

    // 1. Update velocities (mouse attraction + turbulence + boundary push)
    velMat.uniforms.uPos.value         = rtPos[r].texture;
    velMat.uniforms.uVel.value         = rtVel[r].texture;
    velMat.uniforms.uMouse.value.copy(mouse3D);
    velMat.uniforms.uTime.value        = t;
    velMat.uniforms.uMouseActive.value = mActiveCur;
    compute(velMat, rtVel[w]);

    // 2. Integrate positions
    posMat.uniforms.uPos.value = rtPos[r].texture;
    posMat.uniforms.uVel.value = rtVel[w].texture;
    compute(posMat, rtPos[w]);

    pp = w; // swap ping-pong

    // 3. Render particles using updated position + velocity texture
    pMat.uniforms.uPos.value  = rtPos[pp].texture;
    pMat.uniforms.uVel.value  = rtVel[pp].texture;
    pMat.uniforms.uTime.value = t;

    renderer.render(scene, camera);
  }

  // Pause when hero scrolls out of view (saves GPU)
  new IntersectionObserver(entries => {
    active = entries[0].isIntersecting;
    if (active) tick();
  }, { threshold: 0 }).observe(hero);

  tick();
})();
