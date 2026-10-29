// Global patch for iOS / Mobile / Tablet afterprint timing issue
(function () {
  const isMobileOrTablet = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
  if (isMobileOrTablet) {
    const originalAddEventListener = window.addEventListener;
    const originalRemoveEventListener = window.removeEventListener;
    const wrappedListenersMap = new Map();

    window.addEventListener = function (type, listener, options) {
      if (type === 'afterprint') {
        const wrappedListener = function (event) {
          let cleaned = false;
          const runCleanup = function () {
            if (cleaned) return;
            cleaned = true;
            window.removeEventListener('focus', runCleanup);
            if (typeof listener === 'function') {
              listener(event);
            } else if (listener && typeof listener.handleEvent === 'function') {
              listener.handleEvent(event);
            }
          };

          // Listen for window focus to trigger cleanup when print dialog is dismissed
          setTimeout(() => {
            window.addEventListener('focus', runCleanup);
          }, 1000);

          // Safety fallback to clean up after 30 seconds
          setTimeout(runCleanup, 30000);
        };
        wrappedListenersMap.set(listener, wrappedListener);
        return originalAddEventListener.call(window, type, wrappedListener, options);
      }
      return originalAddEventListener.apply(window, arguments);
    };

    window.removeEventListener = function (type, listener, options) {
      if (type === 'afterprint') {
        const wrapped = wrappedListenersMap.get(listener);
        if (wrapped) {
          wrappedListenersMap.delete(listener);
          return originalRemoveEventListener.call(window, type, wrapped, options);
        }
      }
      return originalRemoveEventListener.apply(window, arguments);
    };
  }
})();

// Prevent mouse wheel from accidentally changing number inputs
document.addEventListener("wheel", function (event) {
  if (document.activeElement.type === "number") {
    document.activeElement.blur();
  }
}, { passive: false });

// =========================================================================
// ULTRA-HIGH PERFORMANCE 60FPS 3D MONEY & FINANCIAL ANIMATION SYSTEM
// =========================================================================
(function initLoginMoneyAnimationEngine() {
  let canvas = null;
  let ctx = null;
  let animId = null;
  let particles = [];
  let burstParticles = [];
  let mouse = { x: -1000, y: -1000, active: false };
  let isRunning = false;
  let width = 0;
  let height = 0;

  // Pre-rendered offscreen sprite cache for 0-lag GPU blitting
  const spriteCache = {};

  function createOffscreenCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function prebakeSprites() {
    // 1. Pre-bake Gold Coins (₹ and 🪙)
    ['₹', '🪙'].forEach(sym => {
      const size = 64;
      const off = createOffscreenCanvas(size, size);
      const octx = off.getContext('2d');
      const r = size / 2 - 2;

      // Base gold gradient
      const grad = octx.createRadialGradient(size * 0.35, size * 0.35, size * 0.05, size * 0.5, size * 0.5, r);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.35, '#f59e0b');
      grad.addColorStop(0.8, '#d97706');
      grad.addColorStop(1, '#92400e');

      octx.beginPath();
      octx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
      octx.fillStyle = grad;
      octx.fill();

      // Outer gold rim
      octx.strokeStyle = '#fef08a';
      octx.lineWidth = 2;
      octx.stroke();

      // Inner engraved circle
      octx.beginPath();
      octx.arc(size / 2, size / 2, r * 0.8, 0, Math.PI * 2);
      octx.strokeStyle = 'rgba(254, 240, 138, 0.7)';
      octx.lineWidth = 1.5;
      octx.stroke();

      octx.beginPath();
      octx.arc(size / 2, size / 2, r * 0.75, 0, Math.PI * 2);
      octx.strokeStyle = 'rgba(120, 53, 15, 0.5)';
      octx.lineWidth = 1;
      octx.stroke();

      // Symbol
      octx.font = `bold ${Math.round(size * 0.44)}px "Inter", "Segoe UI", sans-serif`;
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.fillStyle = 'rgba(120, 53, 15, 0.85)';
      octx.fillText(sym, size / 2 + 0.5, size / 2 + 1);
      octx.fillStyle = '#fffbeb';
      octx.fillText(sym, size / 2, size / 2);

      // Specular shine glint
      const glint = octx.createLinearGradient(0, 0, size, size);
      glint.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
      glint.addColorStop(0.3, 'rgba(255, 255, 255, 0.08)');
      glint.addColorStop(0.5, 'transparent');
      octx.beginPath();
      octx.arc(size / 2, size / 2, r * 0.9, 0, Math.PI * 2);
      octx.fillStyle = glint;
      octx.fill();

      spriteCache['coin_' + sym] = off;
    });

    // 2. Pre-bake Banknotes
    const noteColors = [
      { bg: '#065f46', border: '#10b981', light: '#34d399', text: '#ecfdf5' },
      { bg: '#1e3a8a', border: '#3b82f6', light: '#60a5fa', text: '#eff6ff' },
      { bg: '#4c1d95', border: '#8b5cf6', light: '#a78bfa', text: '#f5f3ff' },
      { bg: '#78350f', border: '#f59e0b', light: '#fbbf24', text: '#fffbeb' }
    ];

    noteColors.forEach((nc, idx) => {
      const nw = 80;
      const nh = 42;
      const off = createOffscreenCanvas(nw, nh);
      const octx = off.getContext('2d');

      // Note background
      const grad = octx.createLinearGradient(0, 0, nw, nh);
      grad.addColorStop(0, nc.bg);
      grad.addColorStop(0.5, nc.border);
      grad.addColorStop(1, nc.bg);

      octx.beginPath();
      if (octx.roundRect) {
        octx.roundRect(1, 1, nw - 2, nh - 2, 4);
      } else {
        octx.rect(1, 1, nw - 2, nh - 2);
      }
      octx.fillStyle = grad;
      octx.fill();

      octx.strokeStyle = nc.light;
      octx.lineWidth = 1.5;
      octx.stroke();

      // Inner ornate line
      octx.beginPath();
      if (octx.roundRect) {
        octx.roundRect(4, 4, nw - 8, nh - 8, 2);
      } else {
        octx.rect(4, 4, nw - 8, nh - 8);
      }
      octx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      octx.lineWidth = 0.8;
      octx.stroke();

      // Watermark circle
      octx.beginPath();
      octx.arc(nw / 2, nh / 2, nh * 0.3, 0, Math.PI * 2);
      octx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      octx.fill();
      octx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      octx.stroke();

      // Rupee Symbol
      octx.font = `bold 16px "Inter", sans-serif`;
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.fillStyle = nc.text;
      octx.fillText('₹', nw / 2, nh / 2);

      // Edge decorative marks
      octx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      octx.fillRect(6, 6, 12, 2);
      octx.fillRect(6, nh - 8, 12, 2);
      octx.fillRect(nw - 18, 6, 12, 2);
      octx.fillRect(nw - 18, nh - 8, 12, 2);

      spriteCache['note_' + idx] = off;
    });
  }

  class FastCoin {
    constructor(isInitial = false) {
      this.reset(isInitial);
    }
    reset(isInitial = false) {
      this.radius = 12 + Math.random() * 14; // 12px to 26px
      this.x = Math.random() * (width || window.innerWidth);
      this.y = isInitial ? Math.random() * (height || window.innerHeight) : (height + this.radius + Math.random() * 50);
      this.speedY = 0.6 + Math.random() * 1.1;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.swaySpeed = 0.012 + Math.random() * 0.018;
      this.swayOffset = Math.random() * Math.PI * 2;
      this.angleX = Math.random() * Math.PI * 2;
      this.rotSpeedX = 0.02 + Math.random() * 0.04;
      this.tiltAngle = (Math.random() - 0.5) * 0.4;
      this.opacity = 0.55 + Math.random() * 0.4;
      this.spriteKey = Math.random() < 0.85 ? 'coin_₹' : 'coin_🪙';
    }
    update(time) {
      this.y -= this.speedY;
      this.x += Math.sin(time * this.swaySpeed + this.swayOffset) * 0.6 + this.speedX;
      this.angleX += this.rotSpeedX;

      if (mouse.active) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 110 && dist > 0) {
          const force = (110 - dist) / 110;
          this.x += (dx / dist) * force * 3;
          this.y += (dy / dist) * force * 3;
        }
      }

      if (this.y < -this.radius * 2) {
        this.reset(false);
      }
    }
    draw(ctx) {
      const sprite = spriteCache[this.spriteKey];
      if (!sprite) return;

      const scaleX = Math.cos(this.angleX);
      const absScaleX = Math.abs(scaleX);
      const drawW = this.radius * 2 * absScaleX;
      const drawH = this.radius * 2;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.tiltAngle);
      ctx.globalAlpha = this.opacity;

      // 3D edge cylinder
      if (absScaleX < 0.8) {
        const edgeW = 4 * (1 - absScaleX);
        const edgeDir = scaleX < 0 ? -1 : 1;
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(edgeDir * edgeW, 0, Math.max(1, drawW / 2), drawH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    }
  }

  class FastBanknote {
    constructor(isInitial = false) {
      this.reset(isInitial);
    }
    reset(isInitial = false) {
      this.w = 38 + Math.random() * 22;
      this.h = this.w * 0.525;
      this.x = Math.random() * (width || window.innerWidth);
      this.y = isInitial ? Math.random() * (height || window.innerHeight) : (height + this.w + Math.random() * 60);
      this.speedY = 0.5 + Math.random() * 0.8;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.swaySpeed = 0.01 + Math.random() * 0.015;
      this.swayOffset = Math.random() * Math.PI * 2;
      this.angle = (Math.random() - 0.5) * 0.5;
      this.rotSpeed = (Math.random() - 0.5) * 0.01;
      this.wobblePhase = Math.random() * Math.PI * 2;
      this.wobbleSpeed = 0.02 + Math.random() * 0.03;
      this.opacity = 0.45 + Math.random() * 0.4;
      this.spriteKey = 'note_' + Math.floor(Math.random() * 4);
    }
    update(time) {
      this.y -= this.speedY;
      this.x += Math.sin(time * this.swaySpeed + this.swayOffset) * 0.6 + this.speedX;
      this.angle += this.rotSpeed;
      this.wobblePhase += this.wobbleSpeed;

      if (mouse.active) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 110 && dist > 0) {
          const force = (110 - dist) / 110;
          this.x += (dx / dist) * force * 2.5;
          this.y += (dy / dist) * force * 2.5;
        }
      }

      if (this.y < -this.w * 2) {
        this.reset(false);
      }
    }
    draw(ctx) {
      const sprite = spriteCache[this.spriteKey];
      if (!sprite) return;

      const wobble = Math.sin(this.wobblePhase);
      const drawH = this.h * (0.88 + wobble * 0.12);

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle + wobble * 0.08);
      ctx.globalAlpha = this.opacity;
      ctx.drawImage(sprite, -this.w / 2, -drawH / 2, this.w, drawH);
      ctx.restore();
    }
  }

  class FastSymbol {
    constructor(isInitial = false) {
      this.reset(isInitial);
    }
    reset(isInitial = false) {
      this.x = Math.random() * (width || window.innerWidth);
      this.y = isInitial ? Math.random() * (height || window.innerHeight) : (height + 25 + Math.random() * 40);
      this.speedY = 0.35 + Math.random() * 0.7;
      this.speedX = (Math.random() - 0.5) * 0.4;
      const syms = ['₹', '💰', '🪙', '💸', '📈', '✨'];
      this.symbol = syms[Math.floor(Math.random() * syms.length)];
      this.size = 14 + Math.random() * 14;
      this.opacity = 0.4 + Math.random() * 0.45;
      this.rot = (Math.random() - 0.5) * 0.3;
      this.rotSpeed = (Math.random() - 0.5) * 0.01;
      this.pulsePhase = Math.random() * Math.PI * 2;
    }
    update() {
      this.y -= this.speedY;
      this.x += this.speedX;
      this.rot += this.rotSpeed;
      this.pulsePhase += 0.025;

      if (this.y < -35) {
        this.reset(false);
      }
    }
    draw(ctx) {
      const pulse = 1 + Math.sin(this.pulsePhase) * 0.1;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.scale(pulse, pulse);
      ctx.globalAlpha = this.opacity;
      ctx.font = `${Math.round(this.size)}px "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(this.symbol, 0, 0);
      ctx.restore();
    }
  }

  class FastSparkle {
    constructor(isInitial = false) {
      this.reset(isInitial);
    }
    reset(isInitial = false) {
      this.x = Math.random() * (width || window.innerWidth);
      this.y = isInitial ? Math.random() * (height || window.innerHeight) : (height + 10 + Math.random() * 30);
      this.speedY = 0.2 + Math.random() * 0.4;
      this.size = 2 + Math.random() * 3.5;
      this.maxOpacity = 0.35 + Math.random() * 0.5;
      this.opacity = 0;
      this.life = 0;
      this.maxLife = 100 + Math.random() * 140;
      this.color = Math.random() < 0.75 ? '#fbbf24' : '#ffffff';
    }
    update() {
      this.life++;
      this.y -= this.speedY;

      const progress = this.life / this.maxLife;
      if (progress < 0.25) {
        this.opacity = (progress / 0.25) * this.maxOpacity;
      } else if (progress > 0.75) {
        this.opacity = ((1 - progress) / 0.25) * this.maxOpacity;
      } else {
        this.opacity = this.maxOpacity;
      }

      if (this.life >= this.maxLife || this.y < -15) {
        this.reset(false);
      }
    }
    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = this.color;

      const s = this.size;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.4);
      ctx.lineTo(s * 0.35, -s * 0.35);
      ctx.lineTo(s * 1.4, 0);
      ctx.lineTo(s * 0.35, s * 0.35);
      ctx.lineTo(0, s * 1.4);
      ctx.lineTo(-s * 0.35, s * 0.35);
      ctx.lineTo(-s * 1.4, 0);
      ctx.lineTo(-s * 0.35, -s * 0.35);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  class FastBurst {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5.5;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed - 2;
      this.gravity = 0.16;
      this.radius = 4 + Math.random() * 6;
      this.isCoin = Math.random() < 0.65;
      this.opacity = 1;
      this.decay = 0.02 + Math.random() * 0.02;
    }
    update() {
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.opacity -= this.decay;
    }
    draw(ctx) {
      if (this.opacity <= 0) return;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.globalAlpha = Math.max(0, this.opacity);

      if (this.isCoin) {
        const sprite = spriteCache['coin_₹'];
        if (sprite) {
          const s = this.radius * 2;
          ctx.drawImage(sprite, -s / 2, -s / 2, s, s);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#fbbf24';
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a';
        ctx.fill();
      }

      ctx.restore();
    }
  }

  function resize() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
  }

  function spawnBurst(x, y, count = 15) {
    for (let i = 0; i < count; i++) {
      burstParticles.push(new FastBurst(x, y));
    }
  }

  function initParticles() {
    particles = [];
    burstParticles = [];
    const w = width || window.innerWidth;
    const coinCount = Math.min(16, Math.max(8, Math.floor(w / 80)));
    const noteCount = Math.min(10, Math.max(5, Math.floor(w / 120)));
    const symbolCount = Math.min(8, Math.max(4, Math.floor(w / 160)));
    const sparkleCount = Math.min(20, Math.max(10, Math.floor(w / 70)));

    for (let i = 0; i < coinCount; i++) particles.push(new FastCoin(true));
    for (let i = 0; i < noteCount; i++) particles.push(new FastBanknote(true));
    for (let i = 0; i < symbolCount; i++) particles.push(new FastSymbol(true));
    for (let i = 0; i < sparkleCount; i++) particles.push(new FastSparkle(true));
  }

  function animate(time) {
    if (!isRunning) return;
    time = time || 0;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.update(time * 0.001);
      p.draw(ctx);
    }

    for (let i = burstParticles.length - 1; i >= 0; i--) {
      const bp = burstParticles[i];
      bp.update();
      bp.draw(ctx);
      if (bp.opacity <= 0) {
        burstParticles.splice(i, 1);
      }
    }

    animId = requestAnimationFrame(animate);
  }

  function start() {
    canvas = document.getElementById('loginMoneyCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    if (isRunning) return;
    isRunning = true;

    prebakeSprites();
    resize();
    initParticles();
    window.addEventListener('resize', resize, { passive: true });

    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
      loginScreen.onmousemove = (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
      };
      loginScreen.onmouseleave = () => {
        mouse.active = false;
      };
      loginScreen.onclick = (e) => {
        spawnBurst(e.clientX, e.clientY, 15);
      };
      loginScreen.ontouchstart = (e) => {
        if (e.touches && e.touches[0]) {
          mouse.x = e.touches[0].clientX;
          mouse.y = e.touches[0].clientY;
          mouse.active = true;
          spawnBurst(e.touches[0].clientX, e.touches[0].clientY, 12);
        }
      };
    }

    animId = requestAnimationFrame(animate);
  }

  function stop() {
    isRunning = false;
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  window.startLoginMoneyAnimation = start;
  window.stopLoginMoneyAnimation = stop;
  window.triggerMoneyBurst = spawnBurst;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const login = document.getElementById('loginScreen');
      if (login && window.getComputedStyle(login).display !== 'none') {
        start();
      }
    });
  } else {
    const login = document.getElementById('loginScreen');
    if (login && window.getComputedStyle(login).display !== 'none') {
      start();
    }
  }

  const targetLogin = document.getElementById('loginScreen');
  if (targetLogin) {
    const observer = new MutationObserver(() => {
      if (targetLogin.style.display !== 'none') {
        start();
      } else {
        stop();
      }
    });
    observer.observe(targetLogin, { attributes: true, attributeFilter: ['style', 'class'] });
  }
})();// =========================================================================
// HIGH-FIDELITY TACTILE AUDIO SYNTHESIZER ENGINE (Web Audio API)
// Rich acoustic chimes, success harmonies, print tones & tactile feedback
// Zero external MP3 downloads • Zero network latency • Enabled by Default
// =========================================================================
(function () {
  let audioCtx = null;
  // Read stored preference: DEFAULT IS OFF / SILENT MODE as requested
  const savedSoundPref = localStorage.getItem('church_sound_enabled');
  let isSoundEnabled = (savedSoundPref === 'true'); // false (Silent) by default

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSound(type = 'success') {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === 'success' || type === 'save') {
        // Melodic triple chime in high C major (C6, E6, G6, C7) with warm bell decay
        const notes = [
          { freq: 1046.50, delay: 0.00, dur: 0.35, gain: 0.22 },
          { freq: 1318.51, delay: 0.08, dur: 0.40, gain: 0.24 },
          { freq: 1567.98, delay: 0.16, dur: 0.50, gain: 0.28 },
          { freq: 2093.00, delay: 0.24, dur: 0.70, gain: 0.32 }
        ];
        notes.forEach(n => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(n.freq, now + n.delay);

          gain.gain.setValueAtTime(0.0001, now + n.delay);
          gain.gain.exponentialRampToValueAtTime(n.gain, now + n.delay + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + n.delay + n.dur);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + n.delay);
          osc.stop(now + n.delay + n.dur + 0.05);
        });
      } else if (type === 'submit' || type === 'transaction') {
        // Golden Rupee cash register / prosperity acoustic chime
        const chords = [
          { freq: 880.00, delay: 0.00, dur: 0.25, gain: 0.18 },
          { freq: 1108.73, delay: 0.05, dur: 0.30, gain: 0.22 },
          { freq: 1318.51, delay: 0.10, dur: 0.45, gain: 0.26 },
          { freq: 1760.00, delay: 0.15, dur: 0.60, gain: 0.28 },
          { freq: 2637.02, delay: 0.22, dur: 0.55, gain: 0.18 }
        ];
        chords.forEach(c => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(c.freq, now + c.delay);

          gain.gain.setValueAtTime(0.0001, now + c.delay);
          gain.gain.exponentialRampToValueAtTime(c.gain, now + c.delay + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + c.delay + c.dur);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + c.delay);
          osc.stop(now + c.delay + c.dur + 0.05);
        });
      } else if (type === 'print') {
        // Crisp tactile document dispatch acoustic tone
        const printNotes = [
          { freq: 1479.98, delay: 0.00, dur: 0.15, gain: 0.18 },
          { freq: 1760.00, delay: 0.07, dur: 0.18, gain: 0.22 },
          { freq: 2217.46, delay: 0.15, dur: 0.40, gain: 0.25 }
        ];
        printNotes.forEach(p => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(p.freq, now + p.delay);

          gain.gain.setValueAtTime(0.0001, now + p.delay);
          gain.gain.exponentialRampToValueAtTime(p.gain, now + p.delay + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + p.delay + p.dur);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + p.delay);
          osc.stop(now + p.delay + p.dur + 0.05);
        });
      } else if (type === 'refresh' || type === 'sync') {
        // Celestial rising crystal ripple
        const syncNotes = [
          { freq: 783.99, delay: 0.00, dur: 0.20, gain: 0.15 },
          { freq: 987.77, delay: 0.06, dur: 0.25, gain: 0.18 },
          { freq: 1174.66, delay: 0.12, dur: 0.35, gain: 0.22 },
          { freq: 1567.98, delay: 0.18, dur: 0.50, gain: 0.25 }
        ];
        syncNotes.forEach(s => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(s.freq, now + s.delay);

          gain.gain.setValueAtTime(0.0001, now + s.delay);
          gain.gain.exponentialRampToValueAtTime(s.gain, now + s.delay + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + s.delay + s.dur);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + s.delay);
          osc.stop(now + s.delay + s.dur + 0.05);
        });
      } else if (type === 'warning' || type === 'delete') {
        // Subtle soft descending notification tap
        const warnNotes = [
          { freq: 440.00, delay: 0.00, dur: 0.12, gain: 0.14 },
          { freq: 349.23, delay: 0.08, dur: 0.22, gain: 0.12 }
        ];
        warnNotes.forEach(w => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(w.freq, now + w.delay);

          gain.gain.setValueAtTime(0.0001, now + w.delay);
          gain.gain.exponentialRampToValueAtTime(w.gain, now + w.delay + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + w.delay + w.dur);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + w.delay);
          osc.stop(now + w.delay + w.dur + 0.05);
        });
      } else if (type === 'click' || type === 'pop') {
        // Ultra-light 30ms tactile click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.035);
      }
    } catch (e) {
      console.warn("Audio feedback notice:", e);
    }
  }

  function updateSoundUI() {
    const isMuted = !isSoundEnabled;

    // 1. Header toggle next to Live Sync
    const headerBtn = document.getElementById('headerSoundToggleBtn');
    if (headerBtn) {
      headerBtn.setAttribute('data-muted', isMuted ? 'true' : 'false');
      headerBtn.innerHTML = isMuted ? '🔇' : '🔊';
      headerBtn.title = isMuted ? "Voice is Silent (Click to Turn On)" : "Voice is Active (Click for Silent Mode)";
      if (isMuted) {
        headerBtn.style.background = '#f1f5f9';
        headerBtn.style.color = '#64748b';
        headerBtn.style.borderColor = '#cbd5e1';
      } else {
        headerBtn.style.background = '#ecfdf5';
        headerBtn.style.color = '#047857';
        headerBtn.style.borderColor = '#a7f3d0';
      }
    }

    // 2. Sidebar mini speaker button right beside Admin/Treasurer info
    const sidebarBtn = document.getElementById('sidebarSoundToggleBtn');
    if (sidebarBtn) {
      sidebarBtn.setAttribute('data-muted', isMuted ? 'true' : 'false');
      sidebarBtn.innerHTML = isMuted ? '🔇' : '🔊';
      sidebarBtn.title = isMuted ? "Voice is Silent (Click to Turn On)" : "Voice is Active (Click for Silent Mode)";
      if (isMuted) {
        sidebarBtn.style.background = '#f1f5f9';
        sidebarBtn.style.color = '#64748b';
        sidebarBtn.style.borderColor = '#cbd5e1';
      } else {
        sidebarBtn.style.background = '#ecfdf5';
        sidebarBtn.style.color = '#047857';
        sidebarBtn.style.borderColor = '#a7f3d0';
      }
    }

    // 3. Settings tab toggle switch
    const settingsToggle = document.getElementById('settingsVoiceToggle');
    if (settingsToggle) {
      settingsToggle.checked = isSoundEnabled;
    }
    const settingsStatus = document.getElementById('settingsVoiceStatusText');
    if (settingsStatus) {
      settingsStatus.innerText = isSoundEnabled ? "Active (Voice & Chimes Enabled)" : "Silent Mode (All Sounds & Voice Muted)";
      settingsStatus.style.color = isSoundEnabled ? "#059669" : "#64748b";
    }
  }

  function toggleSound(forceState) {
    if (typeof forceState === 'boolean') {
      isSoundEnabled = forceState;
    } else {
      isSoundEnabled = !isSoundEnabled;
    }
    localStorage.setItem('church_sound_enabled', isSoundEnabled ? 'true' : 'false');
    updateSoundUI();
    if (isSoundEnabled) {
      playSound('success');
      if (typeof showAlert === 'function') {
        showAlert("🔊 Voice & Audio feedback turned ON", "info");
      }
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (typeof showAlert === 'function') {
        showAlert("🔇 Silent Mode activated", "info");
      }
    }
  }

  // Auto-init UI when document is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateSoundUI);
  } else {
    setTimeout(updateSoundUI, 50);
  }

  // Pre-unlock AudioContext on first user interaction anywhere
  const unlockAudio = () => {
    getAudioContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true });

  // Expand abbreviations in names for natural human speech pronunciation & remove dots so "dot" is never spoken
  function expandHonorificsForSpeech(name) {
    if (!name) return '';
    let cleaned = name.trim();

    // 1. Expand title prefixes (Brother, Sister, Pastor, Evangelist, Reverend, Doctor)
    cleaned = cleaned
      .replace(/^(br\.|bro\.|br\b|bro\b)\s*/i, 'Brother ')
      .replace(/^(sis\.|sr\.|sis\b|sr\b)\s*/i, 'Sister ')
      .replace(/^(pr\.|pr\b)\s*/i, 'Pastor ')
      .replace(/^(evg\.|evg\b)\s*/i, 'Evangelist ')
      .replace(/^(rev\.|rev\b)\s*/i, 'Reverend ')
      .replace(/^(dr\.|dr\b)\s*/i, 'Doctor ')
      .replace(/^(mr\.|mr\b)\s*/i, 'Mister ')
      .replace(/^(mrs\.|mrs\b)\s*/i, 'Mrs ');

    // 2. Remove all periods/dots after initials (e.g. "A.C. Thomas" -> "A C Thomas", "I.K." -> "I K", "P.J." -> "P J")
    cleaned = cleaned.replace(/\b([a-zA-Z])\./g, '$1 ');

    // 3. Remove any remaining dots or punctuation
    cleaned = cleaned.replace(/\./g, ' ').replace(/[#_\[\]()\-]/g, ' ');

    // 4. Normalize multiple spaces into single space
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  // Convert numbers to clean English spoken words (e.g., 5000 -> "Five Thousand", 10000 -> "Ten Thousand")
  function numberToEnglishWords(num) {
    if (isNaN(num) || num <= 0) return '';
    num = Math.floor(num);

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertChunk(n) {
      let str = '';
      if (n >= 100) {
        str += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
        if (n > 0) str += 'and ';
      }
      if (n >= 20) {
        str += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      }
      if (n > 0) {
        str += ones[n] + ' ';
      }
      return str.trim();
    }

    if (num === 0) return 'Zero';

    let result = '';

    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const remainder = num;

    if (crore > 0) {
      result += convertChunk(crore) + ' Crore ';
    }
    if (lakh > 0) {
      result += convertChunk(lakh) + ' Lakh ';
    }
    if (thousand > 0) {
      result += convertChunk(thousand) + ' Thousand ';
    }
    if (remainder > 0) {
      result += convertChunk(remainder);
    }

    return result.trim();
  }

  // Helper to format an amount into English words (e.g. 5000 -> "Five Thousand rupees")
  function formatAmountInWords(amt) {
    amt = parseFloat(amt || 0);
    if (isNaN(amt) || amt <= 0) return '';
    const whole = Math.floor(amt);
    const paise = Math.round((amt - whole) * 100);
    const words = numberToEnglishWords(whole);
    if (words) {
      let str = words + " rupees";
      if (paise > 0) {
        const paiseWords = numberToEnglishWords(paise);
        if (paiseWords) str += " and " + paiseWords + " paise";
      }
      return str;
    }
    return whole + " rupees";
  }

  // Helper to format a single item/row in words (e.g. "Five Thousand rupees Subscription for September 2026")
  function formatSplitItemVoice(item, defaultMode) {
    if (!item) return '';
    const itemAmt = parseFloat(item.amount || item.amt || item.receipt || item.payment || 0);
    const amtStr = formatAmountInWords(itemAmt);

    let category = (item.subtype && item.subtype !== '-' && item.subtype !== 'General') ? item.subtype : (item.type || '');
    if (!category || category === '-') {
      category = (defaultMode === 'Payment' || item.payment > 0) ? 'Payment' : 'Receipt';
    }
    const month = item.subMonth || item.month || '';
    if (month && category.toLowerCase().includes('subscription')) {
      category = `Subscription for ${month}`;
    }
    category = category.replace(/\./g, ' ').replace(/\s+/g, ' ').trim();

    if (amtStr && category) {
      return `${amtStr} ${category}`;
    } else if (amtStr) {
      return amtStr;
    } else if (category) {
      return category;
    }
    return '';
  }

  function formatTxVoiceSentence(tx, action = 'added') {
    // For delete action, speak the receipt or voucher number clearly as requested
    if (action === 'deleted') {
      let num = '';
      if (tx) {
        let rawNum = tx.vrNo || tx.rcptNo || tx.payNo || tx.originalVrNo || '';
        num = String(rawNum).replace(/^#+/, '').replace(/\/b$/i, '').trim();
      }
      const isPayment = tx && ((tx.payment && tx.payment > 0) || tx.mode === 'Payment');
      const label = isPayment ? 'Payment voucher' : 'Receipt';
      if (num && num !== '-' && num !== '--') {
        return `${label} number ${num} deleted successfully`;
      }
      return "Your entry deleted successfully";
    }

    if (action === 'cancelled') {
      let num = '';
      if (tx) {
        let rawNum = tx.vrNo || tx.rcptNo || tx.payNo || tx.originalVrNo || '';
        num = String(rawNum).replace(/^#+/, '').replace(/\/b$/i, '').trim();
      }
      const isPayment = tx && ((tx.payment && tx.payment > 0) || tx.mode === 'Payment');
      const label = isPayment ? 'Payment voucher' : 'Receipt';
      if (num && num !== '-' && num !== '--') {
        return `${label} number ${num} cancelled successfully`;
      }
      return "Your entry cancelled successfully";
    }

    if (!tx) {
      return action === 'updated' ? "Your entry updated successfully" : "Entry recorded successfully";
    }
    if (typeof tx === 'string') return tx.replace(/\./g, ' ').trim();

    // 1. Clean & Expand Person / Account Name (Brother, Sister, Pastor, Evangelist, AC Thomas, PJ Thomas)
    let rawName = (tx.accountName || tx.name || tx.paidTo || '').trim();
    if (rawName === '-' || rawName === '--' || rawName.toLowerCase() === 'general' || rawName.toLowerCase() === 'inter-bank transfer') {
      rawName = '';
    }
    const spokenName = expandHonorificsForSpeech(rawName);
    const verb = action === 'updated' ? 'updated successfully' : 'added successfully';

    // 2. Check for Split Entry with multiple split items (e.g. 5000 Subscription + 2000 Charity)
    const splitList = (Array.isArray(tx.splitItems) && tx.splitItems.length > 0)
      ? tx.splitItems
      : ((Array.isArray(tx._splitItems) && tx._splitItems.length > 0) ? tx._splitItems : null);

    if (splitList && splitList.length > 1) {
      const itemPhrases = splitList
        .map(item => formatSplitItemVoice(item, tx.mode))
        .filter(Boolean);

      if (itemPhrases.length > 0) {
        let joinedItems = '';
        if (itemPhrases.length === 1) {
          joinedItems = itemPhrases[0];
        } else if (itemPhrases.length === 2) {
          joinedItems = `${itemPhrases[0]} and ${itemPhrases[1]}`;
        } else {
          joinedItems = `${itemPhrases.slice(0, -1).join(', ')} and ${itemPhrases[itemPhrases.length - 1]}`;
        }

        if (spokenName) {
          return `${spokenName}, ${joinedItems} ${verb}`;
        } else {
          return `${joinedItems} ${verb}`;
        }
      }
    } else if (splitList && splitList.length === 1) {
      const singleSplitPhrase = formatSplitItemVoice(splitList[0], tx.mode);
      if (singleSplitPhrase) {
        if (spokenName) {
          return `${spokenName}, ${singleSplitPhrase} ${verb}`;
        } else {
          return `${singleSplitPhrase} ${verb}`;
        }
      }
    }

    // 3. Extract Amount as Spoken English Words
    const amt = parseFloat(tx.amount || tx.receipt || tx.payment || tx.totalAmt || tx.splitTotalAmount || 0);
    const amtStr = formatAmountInWords(amt);

    // 4. Extract Category / Type
    let category = (tx.subtype && tx.subtype !== '-' && tx.subtype !== 'General') ? tx.subtype : (tx.type || '');
    if (!category || category === '-') {
      category = (tx.mode === 'Payment' || (tx.payment && tx.payment > 0)) ? 'Payment' : 'Receipt';
    }
    if (tx.subMonth && category.toLowerCase().includes('subscription')) {
      category = `Subscription for ${tx.subMonth}`;
    }
    category = category.replace(/\./g, ' ').replace(/\s+/g, ' ').trim();

    // 5. Construct natural sentence without mentioning receipt/voucher numbers on add/edit
    let parts = [];
    if (spokenName) parts.push(spokenName);
    if (amtStr && category) {
      parts.push(`${amtStr} ${category} ${verb}`);
    } else if (amtStr) {
      parts.push(`${amtStr} ${verb}`);
    } else if (category) {
      parts.push(`${category} ${verb}`);
    } else {
      parts.push(`Entry ${verb}`);
    }

    return parts.join(', ');
  }

  // Get preferred Natural Male Voice (Prioritizes Google UK English Male, Microsoft Mark, George, Ryan, Guy, Alex, Daniel)
  function getPreferredMaleVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const englishVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
    const candidatePool = englishVoices.length > 0 ? englishVoices : voices;

    const femaleKeywords = ['female', 'zira', 'samantha', 'karen', 'victoria', 'susan', 'hazel', 'heera', 'veena', 'aria', 'jenny', 'sonia', 'catherine', 'fiona', 'moira', 'tessa'];

    // Distinct male voice priorities across Windows, Mac, Chrome, iOS
    const maleVoiceOrder = [
      'google uk english male',
      'microsoft mark',
      'microsoft george',
      'microsoft ryan',
      'microsoft guy',
      'daniel',
      'oliver',
      'rishi',
      'arthur',
      'alex',
      'microsoft ravi',
      'microsoft prabhat',
      'microsoft david',
      'male'
    ];

    for (const kw of maleVoiceOrder) {
      const match = candidatePool.find(v => {
        const name = (v.name || '').toLowerCase();
        return name.includes(kw) && !femaleKeywords.some(f => name.includes(f));
      });
      if (match) return match;
    }

    // Fallback: any voice without female keywords
    const fallbackMale = candidatePool.find(v => {
      const name = (v.name || '').toLowerCase();
      return !femaleKeywords.some(f => name.includes(f));
    });

    return fallbackMale || candidatePool[0] || voices[0];
  }

  // Natural Voice Success Announcer (Web Speech API - Male Voice, Faster Cadence)
  function speakVoiceMessage(txOrText, action = 'added') {
    if (!txOrText || !isSoundEnabled) return;
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();

      let text = (typeof txOrText === 'object') ? formatTxVoiceSentence(txOrText, action) : String(txOrText);
      if (!text) return;

      // Clean out any lingering dots/periods to prevent TTS engines saying the word "dot"
      text = text.replace(/\b([a-zA-Z])\./g, '$1 ').replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
      if (!text) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.15; // Faster, crisp & prompt speech rate
      utterance.pitch = 0.98; // Clear, confident male tone
      utterance.volume = 0.95;

      const maleVoice = getPreferredMaleVoice();
      if (maleVoice) utterance.voice = maleVoice;

      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn("Speech synthesis notice:", e);
        }
      }, 120);
    } catch (err) {
      console.warn("Speech synthesis notice:", err);
    }
  }

  // Pre-load available speech synthesis voices
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      try { window.speechSynthesis.getVoices(); } catch (e) { }
    };
  }

  window.playChurchAudio = playSound;
  window.speakSuccessMessage = speakVoiceMessage;
  window.toggleChurchAudio = toggleSound;
  window.isChurchAudioEnabled = () => isSoundEnabled;
  window.initChurchAudioUI = updateSoundUI;
})();

function normalizeVrLocally(val) {
  if (val === null || val === undefined) return "";
  var str = val.toString().trim().replace(/^#/, '').replace(/\/b$/i, '').trim();
  if (/^\d+$/.test(str)) {
    var num = parseInt(str, 10);
    return isNaN(num) ? str.toLowerCase() : num.toString();
  }
  return str.toLowerCase();
}

function togglePasswordVisibility() {
  const passInput = document.getElementById('loginPassword');
  const toggleIcon = document.getElementById('togglePassword');
  if (passInput.type === 'password') {
    passInput.type = 'text';
    toggleIcon.innerText = '🙈'; // Hide icon
    toggleIcon.title = "Hide Password";
  } else {
    passInput.type = 'password';
    toggleIcon.innerText = '👁️'; // Show icon
    toggleIcon.title = "Show Password";
  }
}

function showGlobalLoading(text) {
  const overlay = document.getElementById('globalLoadingOverlay');
  const msg = document.getElementById('globalLoadingText');
  if (overlay && msg) {
    msg.innerText = text || 'Loading...';
    overlay.style.display = 'flex';
  }
}
function hideGlobalLoading() {
  const overlay = document.getElementById('globalLoadingOverlay');
  if (overlay) overlay.style.display = 'none';
}
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx1GRNbM8zaTaH2l-0WqEx0AAlfPZ56SSSqSKcg52DzQPoWGv_setfsKyqzYowSRQL1/exec";

// Global Phone Prefix Settings State & Helpers
let globalAutoPhonePrefix = true;
let globalPhonePrefixCode = '+91';

const ALL_WORLD_COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", name: "India (+91)" },
  { code: "+971", flag: "🇦🇪", name: "UAE (+971)" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia (+966)" },
  { code: "+974", flag: "🇶🇦", name: "Qatar (+974)" },
  { code: "+965", flag: "🇰🇼", name: "Kuwait (+965)" },
  { code: "+968", flag: "🇴🇲", name: "Oman (+968)" },
  { code: "+973", flag: "🇧🇭", name: "Bahrain (+973)" },
  { code: "+1", flag: "🇺🇸", name: "USA/Canada (+1)" },
  { code: "+44", flag: "🇬🇧", name: "UK (+44)" },
  { code: "+61", flag: "🇦🇺", name: "Australia (+61)" },
  { code: "+65", flag: "🇸🇬", name: "Singapore (+65)" },
  { code: "+64", flag: "🇳ℤ", name: "New Zealand (+64)" },
  { code: "+49", flag: "🇩🇪", name: "Germany (+49)" },
  { code: "+33", flag: "🇫🇷", name: "France (+33)" },
  { code: "+39", flag: "🇮🇹", name: "Italy (+39)" },
  { code: "+34", flag: "🇪🇸", name: "Spain (+34)" },
  { code: "+31", flag: "🇳🇱", name: "Netherlands (+31)" },
  { code: "+41", flag: "🇨🇭", name: "Switzerland (+41)" },
  { code: "+46", flag: "🇸🇪", name: "Sweden (+46)" },
  { code: "+47", flag: "🇳🇴", name: "Norway (+47)" },
  { code: "+353", flag: "🇮🇪", name: "Ireland (+353)" },
  { code: "+27", flag: "🇿🇦", name: "South Africa (+27)" },
  { code: "+234", flag: "🇳🇬", name: "Nigeria (+234)" },
  { code: "+254", flag: "🇰🇪", name: "Kenya (+254)" },
  { code: "+86", flag: "🇨🇳", name: "China (+86)" },
  { code: "+81", flag: "🇯🇵", name: "Japan (+81)" },
  { code: "+82", flag: "🇰🇷", name: "South Korea (+82)" },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh (+880)" },
  { code: "+94", flag: "🇱🇰", name: "Sri Lanka (+94)" },
  { code: "+977", flag: "🇳🇵", name: "Nepal (+977)" },
  { code: "+92", flag: "🇵🇰", name: "Pakistan (+92)" },
  { code: "+63", flag: "🇵🇭", name: "Philippines (+63)" },
  { code: "+66", flag: "🇹🇭", name: "Thailand (+66)" },
  { code: "+84", flag: "🇻🇳", name: "Vietnam (+84)" },
  { code: "+62", flag: "🇮🇩", name: "Indonesia (+62)" },
  { code: "+55", flag: "🇧🇷", name: "Brazil (+55)" },
  { code: "+52", flag: "🇲🇽", name: "Mexico (+52)" },
  { code: "+54", flag: "🇦🇷", name: "Argentina (+54)" },
  { code: "+20", flag: "🇪🇬", name: "Egypt (+20)" },
  { code: "+90", flag: "🇹🇷", name: "Turkey (+90)" },
  { code: "+7", flag: "🇷🇺", name: "Russia (+7)" }
];

function syncPhonePrefixUI() {
  const editSelect = document.getElementById('editMemberCountryCode');
  const newSelect = document.getElementById('newMemberCountryCode');
  const code = (globalPhonePrefixCode || '+91').trim();

  [editSelect, newSelect].forEach(el => {
    if (el && !el.value) {
      el.value = code;
    }
  });
}

function togglePhonePrefixSetting(enabled) {
  globalAutoPhonePrefix = enabled;
  const wrapper = document.getElementById('phonePrefixCodeWrapper');
  if (wrapper) wrapper.style.display = enabled ? 'flex' : 'none';
  syncPhonePrefixUI();
}

function parsePhoneCountryCode(storedPhone) {
  if (!storedPhone) return { code: (globalPhonePrefixCode || '+91').trim(), number: '' };
  let str = String(storedPhone).trim();
  if (!str) return { code: (globalPhonePrefixCode || '+91').trim(), number: '' };

  const sortedCodes = ALL_WORLD_COUNTRY_CODES.map(c => c.code).sort((a, b) => b.length - a.length);
  for (let c of sortedCodes) {
    if (str.startsWith(c)) {
      let rest = str.substring(c.length).trim();
      return { code: c, number: rest };
    }
  }

  if (str.startsWith('+')) {
    const parts = str.split(' ');
    if (parts.length > 1) {
      return { code: parts[0], number: parts.slice(1).join(' ') };
    }
  }

  return { code: (globalPhonePrefixCode || '+91').trim(), number: str };
}

function populatePhoneInput(inputId, storedPhone, codeSelectId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (!codeSelectId) {
    codeSelectId = (inputId === 'editMemberPhone') ? 'editMemberCountryCode' : 'newMemberCountryCode';
  }
  const codeSelect = document.getElementById(codeSelectId);

  if (!storedPhone) {
    input.value = '';
    if (codeSelect) codeSelect.value = (globalPhonePrefixCode || '+91').trim();
    return;
  }

  const parsed = parsePhoneCountryCode(storedPhone);
  if (codeSelect) {
    codeSelect.value = parsed.code;
    if (!codeSelect.value && parsed.code) {
      const opt = document.createElement('option');
      opt.value = parsed.code;
      opt.innerText = parsed.code;
      codeSelect.appendChild(opt);
      codeSelect.value = parsed.code;
    }
  }
  input.value = parsed.number;
}

function getFormattedPhoneToSave(inputId, codeSelectId) {
  const input = document.getElementById(inputId);
  if (!input) return '';

  let raw = input.value.trim();
  if (!raw) return '';

  if (!codeSelectId) {
    codeSelectId = (inputId === 'editMemberPhone') ? 'editMemberCountryCode' : 'newMemberCountryCode';
  }
  const codeSelect = document.getElementById(codeSelectId);
  const selectedCode = (codeSelect ? codeSelect.value : (globalPhonePrefixCode || '+91')).trim();

  if (raw.startsWith('+')) {
    const parsed = parsePhoneCountryCode(raw);
    return `${parsed.code} ${parsed.number}`;
  }

  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly.length > 0) {
    return `${selectedCode} ${digitsOnly}`;
  }

  return raw;
}

function cleanPhoneForWhatsApp(phoneStr) {
  if (!phoneStr) return null;
  let raw = String(phoneStr).trim();
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (raw.startsWith('+')) {
    return digits;
  }

  if (digits.length === 10) {
    const defaultCodeDigits = (globalPhonePrefixCode || '+91').replace(/\D/g, '');
    return (defaultCodeDigits || '91') + digits;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    const defaultCodeDigits = (globalPhonePrefixCode || '+91').replace(/\D/g, '');
    return (defaultCodeDigits || '91') + digits.substring(1);
  }
  return digits;
}

// Initialize Cloud Firestore
const firebaseConfig = {
  apiKey: "AIzaSyALzvrqSgwG1s9M_mFy6D9ZhGSkb4WrFss",
  authDomain: "church-e0f29.firebaseapp.com",
  databaseURL: "https://church-e0f29-default-rtdb.firebaseio.com",
  projectId: "church-e0f29",
  storageBucket: "church-e0f29.firebasestorage.app",
  messagingSenderId: "539755932399",
  appId: "1:539755932399:web:6c9c4bd5450661a939091a",
  measurementId: "G-825YZK5GLW"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let currentLoggedInUser = null;
let currentUserRole = null;
let auth = null;

// Realtime Sync Globals
let globalRawTransactions = [];
let globalRawMembers = [];
let globalRawSuspense = [];
let globalRawBankTransactions = [];
let globalRawOpening = {};
let globalRawSubtypes = null;
let globalRawSubscriptionsSheet = null;
let globalRawBankAccounts = [];
let globalRawFieldRules = {};
let globalRawSidebarOrder = null;
let globalRawTabNames = null;

let globalUnsubscribes = [];

function clearGlobalUnsubscribes() {
  globalUnsubscribes.forEach(unsub => unsub());
  globalUnsubscribes = [];
}
try {
  auth = firebase.auth();
} catch (e) {
  console.warn("Firebase Auth could not be initialized (likely missing apiKey). Falling back to Firestore auth only.", e);
}

// RBAC Configuration & Role Normalization
function getCanonicalRole(roleStr) {
  if (!roleStr) return 'Committee Member';
  const clean = String(roleStr).trim().toLowerCase();
  if (clean === 'admin' || clean === 'administrator' || clean === 'superadmin') return 'Admin';
  if (clean === 'treasurer' || clean === 'cashier') return 'Treasurer';
  if (clean === 'secretary') return 'Secretary';
  if (clean === 'president' || clean === 'vicar' || clean === 'pastor') return 'President';
  return 'Committee Member';
}

const OPERATIONAL_FINANCIAL_PERMISSIONS = [
  'statementTab',
  'entryTab',
  'editTab',
  'transactionsTab',
  'bankBookTab',
  'ledgerTab',
  'membersDirectoryTab',
  'membersTab',
  'offeringTab',
  'charityTab',
  'otherIncomeTab',
  'subscriptionsTab',
  'memberStatementTab',
  'suspenseTab'
];

const VIEW_ONLY_PERMISSIONS = [
  'statementTab',
  'transactionsTab',
  'bankBookTab',
  'ledgerTab',
  'membersDirectoryTab',
  'membersTab',
  'offeringTab',
  'charityTab',
  'otherIncomeTab',
  'subscriptionsTab',
  'memberStatementTab'
];

const ROLE_PERMISSIONS = {
  'Admin': ['*'],
  'Treasurer': OPERATIONAL_FINANCIAL_PERMISSIONS,
  'Secretary': VIEW_ONLY_PERMISSIONS,
  'President': VIEW_ONLY_PERMISSIONS,
  'Committee Member': VIEW_ONLY_PERMISSIONS
};

const ROUTE_MAP = {
  'dashboard': 'statementTab',
  'entry_screen': 'entryTab',
  'edit_screen': 'editTab',
  'cash_book': 'transactionsTab',
  'bank_book': 'bankBookTab',
  'ledger': 'ledgerTab',
  'members_directory': 'membersDirectoryTab',
  'members': 'membersTab',
  'offering': 'offeringTab',
  'charity': 'charityTab',
  'other_income': 'otherIncomeTab',
  'subscriptions': 'subscriptionsTab',
  'member_statement': 'memberStatementTab',
  'suspense': 'suspenseTab',
  'settings': 'settingsTab'
};
const REVERSE_ROUTE_MAP = Object.fromEntries(Object.entries(ROUTE_MAP).map(([k, v]) => [v, k]));

function hasAccess(tabId) {
  if (!currentLoggedInUser) return false;
  const canonicalRole = getCanonicalRole(currentUserRole);
  const allowed = ROLE_PERMISSIONS[canonicalRole] || VIEW_ONLY_PERMISSIONS;
  if (!allowed) return true;
  if (allowed.includes('*')) return true;
  if (tabId.startsWith('dynamicTab_')) return true;
  return allowed.includes(tabId);
}

function applyRBACUI() {
  const canonicalRole = getCanonicalRole(currentUserRole);

  // Hide forbidden nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    const onclickAttr = item.getAttribute('onclick');
    if (onclickAttr && onclickAttr.includes("switchTab('")) {
      const match = onclickAttr.match(/switchTab\('([^']+)'\)/);
      if (match && match[1]) {
        const tabId = match[1];
        if (!hasAccess(tabId)) {
          item.style.display = 'none';
        } else {
          item.style.display = 'flex';
        }
      }
    }
  });

  const adminBtn = document.getElementById('btnSubTabUsers');
  if (adminBtn) {
    if (canonicalRole === 'Admin') {
      adminBtn.style.display = 'block';
    } else {
      adminBtn.style.display = 'none';
      if (typeof switchSettingsSubTab === 'function') switchSettingsSubTab('general');
    }
  }

  // Non-editor roles (Committee Member, President, Secretary) are view-only
  const isEditor = (canonicalRole === 'Admin' || canonicalRole === 'Treasurer');
  if (!isEditor) {
    document.body.classList.add('role-committee');
  } else {
    document.body.classList.remove('role-committee');
  }

  // If current active tab is inaccessible, safely redirect to statementTab (Dashboard)
  const activeTab = document.querySelector('.page-tab.active');
  if (activeTab && !hasAccess(activeTab.id)) {
    switchTab('statementTab');
  }
}

// Helper to format/convert Google Drive sharing links and direct image URLs to embeddable CDN format
function formatPhotoUrl(url) {
  if (!url || typeof url !== 'string') return '';
  url = url.trim();
  if (!url) return '';

  // Extract Google Drive ID if present (supports drive.google.com/file/d/ID/view, id=ID, /d/ID, etc.)
  const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1 && match1[1]) {
    return `https://lh3.googleusercontent.com/d/${match1[1]}`;
  }
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2 && match2[1]) {
    return `https://lh3.googleusercontent.com/d/${match2[1]}`;
  }
  const match3 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match3 && match3[1]) {
    return `https://lh3.googleusercontent.com/d/${match3[1]}`;
  }

  return url;
}

// Dynamically updates the user avatar display across all portals (sidebar footer and mobile top bar)
function updateUserAvatarUI(photoUrl, name) {
  const formattedUrl = formatPhotoUrl(photoUrl);
  const initial = (name && name.trim().length > 0) ? name.trim().charAt(0).toUpperCase() : '👤';

  // 1. Sidebar Avatar
  const sidebarPhoto = document.getElementById('sidebarUserPhoto');
  const sidebarInitial = document.getElementById('sidebarUserInitial');
  if (sidebarPhoto && sidebarInitial) {
    if (formattedUrl) {
      sidebarPhoto.src = formattedUrl;
      sidebarPhoto.style.display = 'block';
      sidebarInitial.style.display = 'none';
      sidebarPhoto.onerror = () => {
        sidebarPhoto.style.display = 'none';
        sidebarInitial.innerText = initial;
        sidebarInitial.style.display = 'block';
      };
    } else {
      sidebarPhoto.style.display = 'none';
      sidebarInitial.innerText = initial;
      sidebarInitial.style.display = 'block';
    }
  }

  // 2. Mobile Top Bar Avatar
  const mobilePhoto = document.getElementById('mobileUserPhoto');
  const mobileInitial = document.getElementById('mobileUserInitial');
  if (mobilePhoto && mobileInitial) {
    if (formattedUrl) {
      mobilePhoto.src = formattedUrl;
      mobilePhoto.style.display = 'block';
      mobileInitial.style.display = 'none';
      mobilePhoto.onerror = () => {
        mobilePhoto.style.display = 'none';
        mobileInitial.innerText = initial;
        mobileInitial.style.display = 'block';
      };
    } else {
      mobilePhoto.style.display = 'none';
      mobileInitial.innerText = initial;
      mobileInitial.style.display = 'block';
    }
  }
}

function checkPersistedAuth() {
  const stored = localStorage.getItem('church_auth');
  if (stored) {
    try {
      const authData = JSON.parse(stored);
      if (authData && (authData.isFirestoreAuth || authData.uid || authData.email)) {
        currentLoggedInUser = authData;
        currentUserRole = authData.role || 'Committee Member';
        const displayName = authData.name || (authData.email ? authData.email.split('@')[0] : 'User');
        document.getElementById('sidebarUserInfo').innerText = displayName;
        document.getElementById('sidebarUserRole').innerText = currentUserRole;
        updateUserAvatarUI(authData.photoUrl, displayName);
        applyRBACUI();
        showApp();
        return true;
      }
    } catch (e) { }
  }
  return false;
}

async function createUserFromAdmin(e) {
  e.preventDefault();
  const name = document.getElementById('newUserName').value.trim();
  const email = document.getElementById('newUserEmail').value.trim();
  const pass = document.getElementById('newUserPass').value;
  const photoInput = document.getElementById('newUserPhoto') ? document.getElementById('newUserPhoto').value.trim() : '';
  const photoUrl = formatPhotoUrl(photoInput);
  const role = document.getElementById('newUserRole').value;
  const btn = document.getElementById('btnCreateUser');

  btn.innerText = "Creating...";
  btn.disabled = true;

  try {
    // We use a secondary Firebase app so we don't log out the current admin
    const secondaryApp = firebase.initializeApp(firebaseConfig, "SecondaryApp_" + Date.now());
    const res = await secondaryApp.auth().createUserWithEmailAndPassword(email, pass);
    const newUid = res.user.uid;

    // Add to Firestore using primary app
    await db.collection('users').doc(newUid).set({
      name: name,
      email: email,
      username: email,
      password: pass,
      role: role,
      photoUrl: photoUrl || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Clean up secondary app
    await secondaryApp.auth().signOut();
    await secondaryApp.delete();

    showAlert("User successfully created! ✅", "success");
    e.target.reset();
    renderAdminUserList();
  } catch (err) {
    alert("Error creating user: " + err.message);
  } finally {
    btn.innerText = "Create User";
    btn.disabled = false;
  }
}

async function renderAdminUserList() {
  const container = document.getElementById('usersListContainer');
  if (!container) return;
  container.innerHTML = '<div style="color: #64748b; font-size: 0.9rem; text-align: center; padding: 20px; grid-column: 1 / -1;">Loading users...</div>';

  try {
    const snap = await db.collection('users').get();
    if (snap.empty) {
      container.innerHTML = '<div style="color: #64748b; font-size: 0.9rem; text-align: center; padding: 20px; grid-column: 1 / -1;">No registered users found.</div>';
      return;
    }

    let html = '';
    snap.forEach(doc => {
      const user = doc.data();
      const uid = doc.id;
      const status = user.disabled ? 'Disabled' : 'Active';
      const statusColor = user.disabled ? '#ef4444' : '#10b981';
      const formattedPhoto = formatPhotoUrl(user.photoUrl || '');
      const initial = (user.name && user.name.trim().length > 0) ? user.name.trim().charAt(0).toUpperCase() : '👤';

      html += `
            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <div style="display: flex; gap: 12px; align-items: center;">
                <div style="width: 42px; height: 56px; aspect-ratio: 3 / 4; border-radius: 8px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem; flex-shrink: 0; overflow: hidden; border: 2px solid #e2e8f0; position: relative;">
                  ${formattedPhoto ? `<img src="${formattedPhoto}" alt="${user.name || 'User'}" style="width: 100%; height: 100%; aspect-ratio: 3 / 4; object-fit: cover; border-radius: 8px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><span style="display:none;">${initial}</span>` : `<span>${initial}</span>`}
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span style="font-weight: 700; color: #1e293b; font-size: 0.95rem;">${user.name || 'Unknown'}</span>
                    <span style="font-size: 0.72rem; background: ${statusColor}; color: white; padding: 2px 7px; border-radius: 9999px; font-weight: 600;">${status}</span>
                  </div>
                  <div style="font-size: 0.82rem; color: #64748b; margin-top: 2px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${user.email}</div>
                  <div style="font-size: 0.82rem; color: #2563eb; font-weight: 600; margin-top: 2px;">Role: ${user.role || 'Unassigned'}</div>
                </div>
              </div>
              <div style="display: flex; gap: 8px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
                <button onclick="openEditUserModal('${uid}', '${(user.name || '').replace(/'/g, "\\'")}', '${(user.email || '').replace(/'/g, "\\'")}', '${user.role || ''}', '${(user.photoUrl || '').replace(/'/g, "\\'")}')" style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; padding: 7px 12px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; flex: 1; font-weight: 600;">Edit User</button>
                <button onclick="toggleAdminUserStatus('${uid}', ${user.disabled || false})" style="background: ${user.disabled ? '#10b981' : '#ef4444'}; border: none; color: white; padding: 7px 12px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; flex: 1; font-weight: 600;">${user.disabled ? 'Enable' : 'Disable'}</button>
                <button onclick="deleteAdminUser('${uid}')" style="background: #0f172a; border: none; color: white; padding: 7px 12px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-weight: 600;" title="Delete Database Record">🗑️</button>
              </div>
            </div>
          `;
    });
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div style="color: #ef4444; font-size: 0.9rem; text-align: center; padding: 20px; grid-column: 1 / -1;">Error loading users: ${err.message}</div>`;
  }
}

function openEditUserModal(uid, currentName, currentEmail, currentRole, currentPhotoUrl) {
  document.getElementById('editUserUid').value = uid;
  document.getElementById('editUserName').value = currentName;
  document.getElementById('editUserEmail').value = currentEmail;
  if (document.getElementById('editUserPhoto')) {
    document.getElementById('editUserPhoto').value = currentPhotoUrl || '';
  }
  document.getElementById('editUserRole').value = currentRole || 'Committee Member';
  document.getElementById('editUserModal').style.display = 'flex';
}

async function saveEditAdminUser(e) {
  e.preventDefault();
  const uid = document.getElementById('editUserUid').value;
  const newName = document.getElementById('editUserName').value.trim();
  const newEmail = document.getElementById('editUserEmail').value.trim();
  const newRole = document.getElementById('editUserRole').value;
  const photoInput = document.getElementById('editUserPhoto') ? document.getElementById('editUserPhoto').value.trim() : '';
  const newPhoto = formatPhotoUrl(photoInput);
  const btn = document.getElementById('btnSaveEditUser');

  btn.innerText = "Saving...";
  btn.disabled = true;

  try {
    await db.collection('users').doc(uid).update({
      name: newName,
      email: newEmail,
      role: newRole,
      photoUrl: newPhoto || ''
    });

    // If currently logged in user is updated, update active session UI immediately
    if (currentLoggedInUser && (currentLoggedInUser.uid === uid || currentLoggedInUser.email === newEmail)) {
      currentLoggedInUser.name = newName;
      currentLoggedInUser.role = newRole;
      currentLoggedInUser.photoUrl = newPhoto || '';
      currentUserRole = newRole;
      localStorage.setItem('church_auth', JSON.stringify(currentLoggedInUser));
      document.getElementById('sidebarUserInfo').innerText = newName;
      document.getElementById('sidebarUserRole').innerText = newRole;
      updateUserAvatarUI(newPhoto, newName);
      applyRBACUI();
    }

    document.getElementById('editUserModal').style.display = 'none';
    showAlert("User details updated successfully! ✅", "success");
    renderAdminUserList();
  } catch (err) {
    alert("Error updating user: " + err.message);
  } finally {
    btn.innerText = "Save Changes";
    btn.disabled = false;
  }
}

async function toggleAdminUserStatus(uid, currentlyDisabled) {
  const action = currentlyDisabled ? 'Enable' : 'Disable';
  showCustomConfirm(`Are you sure you want to <b>${action}</b> this user?`, async () => {
    try {
      await db.collection('users').doc(uid).update({ disabled: !currentlyDisabled });
      showAlert(`User ${action}d successfully! ✅`, "success");
      renderAdminUserList();
    } catch (err) {
      showAlert(`Error updating user status: ` + err.message, "error");
    }
  }, `${action} User`, action, !currentlyDisabled);
}

async function deleteAdminUser(uid) {
  showCustomConfirm("Are you sure you want to delete this user's database record?<br><br><span style='font-size:0.85rem; color:#64748b;'>(They will still exist in Firebase Auth but lose all roles)</span>", async () => {
    try {
      await db.collection('users').doc(uid).delete();
      showAlert("User record deleted successfully! ✅", "success");
      renderAdminUserList();
    } catch (err) {
      showAlert("Error deleting user: " + err.message, "error");
    }
  }, "Delete User", "Delete", true);
}

if (auth) {
  auth.onAuthStateChanged(user => {
    if (checkPersistedAuth()) return; // Custom auth takes precedence

    if (user) {
      currentLoggedInUser = user;
      document.getElementById('sidebarUserInfo').innerText = 'Loading...';
      // Fetch role and photo from Firestore, auto-create document if missing so admin can edit it
      db.collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists && doc.data().role) {
          currentUserRole = doc.data().role;
          const displayName = doc.data().name || user.email.split('@')[0];
          const userPhoto = doc.data().photoUrl || '';
          currentLoggedInUser.name = displayName;
          currentLoggedInUser.photoUrl = userPhoto;
          currentLoggedInUser.role = currentUserRole;
          localStorage.setItem('church_auth', JSON.stringify({
            email: user.email || '',
            uid: user.uid,
            role: currentUserRole,
            name: displayName,
            photoUrl: userPhoto
          }));
          document.getElementById('sidebarUserInfo').innerText = displayName;
          document.getElementById('sidebarUserRole').innerText = currentUserRole;
          updateUserAvatarUI(userPhoto, displayName);
          applyRBACUI();
          showApp();
        } else {
          // Try searching by email just in case
          db.collection('users').doc(user.email).get().then(docEmail => {
            if (docEmail.exists && docEmail.data().role) {
              currentUserRole = docEmail.data().role;
              const displayName = docEmail.data().name || user.email.split('@')[0];
              const userPhoto = docEmail.data().photoUrl || '';
              currentLoggedInUser.name = displayName;
              currentLoggedInUser.photoUrl = userPhoto;
              currentLoggedInUser.role = currentUserRole;
              localStorage.setItem('church_auth', JSON.stringify({
                email: user.email || '',
                uid: user.uid,
                role: currentUserRole,
                name: displayName,
                photoUrl: userPhoto
              }));
              document.getElementById('sidebarUserInfo').innerText = displayName;
              document.getElementById('sidebarUserRole').innerText = currentUserRole;
              updateUserAvatarUI(userPhoto, displayName);
              applyRBACUI();
              showApp();
            } else {
              // No role document found anywhere! Let's auto-create one in Firestore.
              currentUserRole = 'Committee Member'; // Default
              const displayName = user.email.split('@')[0];
              document.getElementById('sidebarUserInfo').innerText = displayName;
              document.getElementById('sidebarUserRole').innerText = currentUserRole;
              updateUserAvatarUI('', displayName);
              applyRBACUI();
              showApp();
              db.collection('users').doc(user.uid).set({
                email: user.email,
                role: currentUserRole,
                photoUrl: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
              }, { merge: true }).then(() => {
                console.log("Auto-created user document in Firestore for role management.");
              }).catch(e => console.warn("Could not auto-create user document:", e));

              document.getElementById('sidebarUserRole').innerText = currentUserRole;
              applyRBACUI();
              showApp();
            }
          }).catch(() => {
            currentUserRole = 'Committee Member';
            document.getElementById('sidebarUserRole').innerText = 'Unassigned';
            updateUserAvatarUI('', user.email ? user.email.split('@')[0] : 'User');
            applyRBACUI();
            showApp();
          });
        }
      }).catch(err => {
        console.error("Error fetching user role:", err);
        currentUserRole = 'Committee Member';
        document.getElementById('sidebarUserRole').innerText = 'Error';
        updateUserAvatarUI('', user.email ? user.email.split('@')[0] : 'User');
        applyRBACUI();
        showApp();
      });
    } else {
      // Not logged in - show login page
      currentLoggedInUser = null;
      currentUserRole = null;
      updateUserAvatarUI('', '');
      hideGlobalLoading();
      document.getElementById('loginScreen').style.display = 'flex';
      if (typeof startLoginMoneyAnimation === 'function') startLoginMoneyAnimation();
      document.getElementById('portalWrapper').style.display = 'none';
    }
  });
} else {
  // If no Firebase Auth at all, just check local storage on page load
  if (!checkPersistedAuth()) {
    hideGlobalLoading();
    document.getElementById('loginScreen').style.display = 'flex';
    if (typeof startLoginMoneyAnimation === 'function') startLoginMoneyAnimation();
    document.getElementById('portalWrapper').style.display = 'none';
  }
}

// =========================================================================
// HIGH-PERFORMANCE 60FPS CELEBRATORY WELCOME POPUP & CONFETTI ENGINE
// =========================================================================
let welcomeAnimationId = null;

function dismissCelebratoryWelcomePopup() {
  const container = document.getElementById('welcomeCelebrationContainer');
  if (container) {
    const card = container.querySelector('.welcome-toast-card');
    if (card) card.classList.add('welcome-exit');
    setTimeout(() => {
      if (welcomeAnimationId) {
        cancelAnimationFrame(welcomeAnimationId);
        welcomeAnimationId = null;
      }
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }, 320);
  }
}

function triggerCelebratoryWelcomePopup(userName, userRole, photoUrl = '', isDataRefresh = false) {
  // Clean up any existing popup
  const existing = document.getElementById('welcomeCelebrationContainer');
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }
  if (welcomeAnimationId) {
    cancelAnimationFrame(welcomeAnimationId);
    welcomeAnimationId = null;
  }

  const cleanName = (userName || 'User').trim();
  const cleanRole = (userRole || 'Committee Member').trim();
  const formattedPhoto = formatPhotoUrl(photoUrl);

  // Dynamic greetings for data refresh vs direct login
  const subGreeting = isDataRefresh ? '⚡ DATA REFRESHED & SYNCHRONIZED' : '✨ WELCOME BACK';
  const statusTag = isDataRefresh ? 'Live Church Accounts Synced ✅' : 'IPC Horeb Church, Thadiyoor';

  // Create Container
  const container = document.createElement('div');
  container.id = 'welcomeCelebrationContainer';

  // Create Lightweight Canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'welcome-celebration-canvas';
  container.appendChild(canvas);

  // Create Toast Card
  const card = document.createElement('div');
  card.className = 'welcome-toast-card';
  card.innerHTML = `
    <div class="welcome-avatar-wrapper">
      ${formattedPhoto ? `<img src="${formattedPhoto}" alt="${cleanName}" class="welcome-avatar-img" onerror="this.style.display='none'; const em = this.parentElement.querySelector('.welcome-avatar-emoji'); if(em) em.style.display='block';">` : ''}
      <div class="welcome-avatar-ring"></div>
      <span class="welcome-avatar-emoji" style="${formattedPhoto ? 'display:none;' : ''}">✨</span>
    </div>
    <div class="welcome-content">
      <div class="welcome-sub-greeting">${subGreeting}</div>
      <div class="welcome-user-title">${cleanName}</div>
      <div class="welcome-meta-row">
        <span class="welcome-role-badge">${cleanRole}</span>
        <span class="welcome-church-tag">${statusTag}</span>
      </div>
    </div>
  `;
  container.appendChild(card);
  document.body.appendChild(container);

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;

  // Origin from the welcome card
  const originX = w / 2;
  const originY = 65;

  // 65 High-Performance GPU-Friendly Particles (0 shadowBlur, 0 text layout per frame)
  const particles = [];
  const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#facc15', '#06b6d4', '#ef4444', '#ffffff'];

  // 1. Confetti ribbons (45 pieces)
  for (let i = 0; i < 45; i++) {
    const angle = (Math.PI * 0.15) + (Math.random() * Math.PI * 0.7) + (Math.random() > 0.5 ? Math.PI : 0);
    const speed = 4 + Math.random() * 12;
    particles.push({
      type: 0,
      x: originX + (Math.random() - 0.5) * 40,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: -Math.abs(Math.sin(angle) * speed) - 2.5,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      color: colors[i % colors.length],
      rot: Math.random() * Math.PI,
      dRot: (Math.random() - 0.5) * 0.2,
      scaleY: 1,
      dScaleY: (Math.random() - 0.5) * 0.15,
      gravity: 0.22,
      drag: 0.98,
      alpha: 1,
      decay: 0.005 + Math.random() * 0.004
    });
  }

  // 2. Sparkles & stars (20 pieces)
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 9;
    particles.push({
      type: 1,
      x: originX + (Math.random() - 0.5) * 30,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      r: 3 + Math.random() * 3,
      color: (i % 2 === 0) ? '#facc15' : '#38bdf8',
      gravity: 0.15,
      drag: 0.97,
      alpha: 1,
      decay: 0.006 + Math.random() * 0.006
    });
  }

  const startTime = performance.now();
  function renderCelebration(now) {
    ctx.clearRect(0, 0, w, h);
    let active = false;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.alpha <= 0.01) continue;

      p.vx *= p.drag;
      p.vy = (p.vy * p.drag) + p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.alpha > 0.01) {
        active = true;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (p.type === 0) {
          p.rot += p.dRot;
          p.scaleY += p.dScaleY;
          const sy = Math.sin(p.scaleY);

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.w / 2, (-p.h * sy) / 2, p.w, p.h * sy);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, 6.283);
          ctx.fill();
        }
      }
    }

    if (active && (now - startTime < 3500)) {
      welcomeAnimationId = requestAnimationFrame(renderCelebration);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
  }

  welcomeAnimationId = requestAnimationFrame(renderCelebration);

  // Auto-dismiss popup smoothly after 3.2 seconds
  setTimeout(() => {
    dismissCelebratoryWelcomePopup();
  }, 3200);
}

function showApp(isLoginTriggered = false, welcomeUserName = '', welcomePhotoUrl = '') {
  document.getElementById('loginScreen').style.display = 'none';
  if (typeof stopLoginMoneyAnimation === 'function') stopLoginMoneyAnimation();
  document.getElementById('portalWrapper').style.display = 'flex';
  if (typeof initFyDropdown === 'function') initFyDropdown();

  // If user just logged in or if no specific tab hash is present, always default to Dashboard (statementTab)
  if (isLoginTriggered || !window.location.hash || window.location.hash === '#/' || window.location.hash === '#/login') {
    isHashNavigating = true;
    window.location.hash = '#/dashboard';
    switchTab('statementTab', true);
    setTimeout(() => { isHashNavigating = false; }, 50);
  }

  if (!window.initialDataLoaded) {
    window.initialDataLoaded = true;
    fetchInitialDataFromFirebase();
  } else {
    if (isLoginTriggered) {
      switchTab('statementTab', true);
    } else {
      handleHashChange();
    }
  }

  // Trigger Celebratory Welcome Popup with slight delay
  if (isLoginTriggered) {
    switchTab('statementTab', true);
    const greetingName = welcomeUserName || (currentLoggedInUser ? (currentLoggedInUser.name || (currentLoggedInUser.email ? currentLoggedInUser.email.split('@')[0] : 'User')) : 'User');
    const greetingPhoto = welcomePhotoUrl || (currentLoggedInUser ? (currentLoggedInUser.photoUrl || '') : '');
    setTimeout(() => {
      triggerCelebratoryWelcomePopup(greetingName, currentUserRole, greetingPhoto, false);
    }, 120);
  }
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  const errorDiv = document.getElementById('loginError');

  btn.disabled = true;
  btn.innerText = 'Authenticating...';
  errorDiv.style.display = 'none';

  // Robust Firestore query fallback
  const tryFirestoreAuth = async () => {
    const rawInput = email.trim();
    const lowerInput = rawInput.toLowerCase();

    // 1. Direct equality queries
    let snap = await db.collection('users').where('email', '==', rawInput).where('password', '==', pass).get().catch(() => ({ empty: true }));
    if (snap && !snap.empty) return snap.docs[0];

    if (lowerInput !== rawInput) {
      snap = await db.collection('users').where('email', '==', lowerInput).where('password', '==', pass).get().catch(() => ({ empty: true }));
      if (snap && !snap.empty) return snap.docs[0];
    }

    snap = await db.collection('users').where('username', '==', rawInput).where('password', '==', pass).get().catch(() => ({ empty: true }));
    if (snap && !snap.empty) return snap.docs[0];

    snap = await db.collection('users').where('username', '==', lowerInput).where('password', '==', pass).get().catch(() => ({ empty: true }));
    if (snap && !snap.empty) return snap.docs[0];

    // 2. Client-side scan fallback (case-insensitive & trimmed)
    try {
      const allUsersSnap = await db.collection('users').get();
      if (allUsersSnap && !allUsersSnap.empty) {
        for (const doc of allUsersSnap.docs) {
          const uData = doc.data();
          const uEmail = (uData.email || '').trim().toLowerCase();
          const uUsername = (uData.username || '').trim().toLowerCase();
          const uPass = (uData.password || '');
          if ((uEmail === lowerInput || uUsername === lowerInput) && uPass === pass) {
            return doc;
          }
        }
      }
    } catch (errScan) {
      console.warn("Client-side user scan error:", errScan);
    }

    return null;
  };

  let authPromise;
  try {
    if (!auth) throw new Error("Firebase Auth not initialized");
    authPromise = auth.signInWithEmailAndPassword(email, pass);
  } catch (syncErr) {
    authPromise = Promise.reject(syncErr);
  }

  authPromise
    .then(async (userCredential) => {
      btn.disabled = false;
      btn.innerText = 'Secure Sign In';
      if (userCredential && userCredential.user) {
        const user = userCredential.user;
        currentLoggedInUser = user;
        let displayName = user.email ? user.email.split('@')[0] : 'User';
        let userPhoto = '';
        try {
          let doc = await db.collection('users').doc(user.uid).get();
          if ((!doc || !doc.exists) && user.email) {
            doc = await db.collection('users').doc(user.email).get();
          }
          if ((!doc || !doc.exists) && user.email) {
            const snap = await db.collection('users').where('email', '==', user.email).get().catch(() => null);
            if (snap && !snap.empty) doc = snap.docs[0];
          }
          if (doc && doc.exists && doc.data().role) {
            const uData = doc.data();
            currentUserRole = uData.role;
            displayName = uData.name || displayName;
            userPhoto = uData.photoUrl || '';
          } else {
            currentUserRole = 'Committee Member';
          }
        } catch (e) {
          currentUserRole = 'Committee Member';
        }
        currentLoggedInUser.name = displayName;
        currentLoggedInUser.photoUrl = userPhoto;
        currentLoggedInUser.role = currentUserRole;
        document.getElementById('sidebarUserInfo').innerText = displayName;
        document.getElementById('sidebarUserRole').innerText = currentUserRole;
        updateUserAvatarUI(userPhoto, displayName);
        localStorage.setItem('church_auth', JSON.stringify({
          email: user.email || '',
          uid: user.uid,
          role: currentUserRole,
          name: displayName,
          photoUrl: userPhoto
        }));
        applyRBACUI();
        showApp(true, displayName, userPhoto);
      }
    })
    .catch(authErr => {
      // If Firebase Auth fails, try Firestore custom auth fallback
      tryFirestoreAuth().then(userDoc => {
        if (userDoc) {
          const userData = userDoc.data();
          if (userData.disabled) {
            throw new Error("This account is currently disabled. Please contact the administrator.");
          }
          currentLoggedInUser = {
            email: userData.email || email,
            uid: userDoc.id,
            isFirestoreAuth: true,
            role: userData.role || 'Committee Member',
            name: userData.name || '',
            photoUrl: userData.photoUrl || ''
          };
          currentUserRole = currentLoggedInUser.role;
          localStorage.setItem('church_auth', JSON.stringify(currentLoggedInUser));
          const displayName = userData.name || (email.includes('@') ? email.split('@')[0] : email);
          document.getElementById('sidebarUserInfo').innerText = displayName;
          document.getElementById('sidebarUserRole').innerText = currentUserRole;
          updateUserAvatarUI(currentLoggedInUser.photoUrl, displayName);
          applyRBACUI();
          showApp(true, displayName, currentLoggedInUser.photoUrl);
          btn.disabled = false;
          btn.innerText = 'Secure Sign In';
        } else {
          throw authErr;
        }
      }).catch(finalErr => {
        btn.disabled = false;
        btn.innerText = 'Secure Sign In';
        let errorMsg = finalErr.message || "Invalid credentials.";
        if (errorMsg.includes("auth/user-not-found")) errorMsg = "User account not found.";
        if (errorMsg.includes("auth/wrong-password")) errorMsg = "Incorrect password.";
        if (errorMsg.includes("auth/invalid-credential") || errorMsg.includes("auth/invalid-email")) errorMsg = "Invalid email or password.";
        if (errorMsg.includes("API key")) errorMsg = "Invalid credentials.";
        errorDiv.innerText = errorMsg;
        errorDiv.style.display = 'block';
      });
    });
}

function handleLogout() {
  const proceedLogout = () => {
    localStorage.removeItem('church_auth');

    const resetUI = () => {
      currentLoggedInUser = null;
      currentUserRole = null;
      updateUserAvatarUI('', '');
      window.initialDataLoaded = false;
      if (typeof renderedTabs !== 'undefined' && renderedTabs.clear) {
        renderedTabs.clear();
      }
      // Always reset routing hash to dashboard so subsequent login lands directly on Dashboard
      isHashNavigating = true;
      window.location.hash = '#/dashboard';
      setTimeout(() => { isHashNavigating = false; }, 50);

      document.getElementById('loginScreen').style.display = 'flex';
      if (typeof stopPortalAmbientAnimation === 'function') stopPortalAmbientAnimation();
      if (typeof startLoginMoneyAnimation === 'function') startLoginMoneyAnimation();
      document.getElementById('portalWrapper').style.display = 'none';
    };

    if (auth) {
      auth.signOut().then(resetUI).catch(resetUI);
    } else {
      resetUI();
    }
  };

  if (typeof showCustomConfirm === 'function') {
    showCustomConfirm(
      "Are you sure you want to sign out of the accounts portal? 🔒",
      proceedLogout,
      "Sign Out Confirmation",
      "Sign Out",
      true
    );
  } else if (confirm("Are you sure you want to sign out of the accounts portal?")) {
    proceedLogout();
  }
}

// Hash Routing logic
window.addEventListener('hashchange', handleHashChange);
let isHashNavigating = false;

function handleHashChange() {
  if (isHashNavigating) return;
  if (!currentLoggedInUser) return; // Wait until authenticated

  let hash = window.location.hash.replace('#/', '');
  if (!hash) {
    hash = 'dashboard'; // Default
  }

  let targetTabId = ROUTE_MAP[hash] || hash;

  if (!document.getElementById(targetTabId)) {
    targetTabId = 'statementTab'; // Fallback
  }

  switchTab(targetTabId, true);
}

let nextReceiptVrNo = 6701;
let nextPaymentVrNo = 1;
let activeMembersMap = {};
let membersDataStore = [];
let isEditMode = false;
let originalEditVrNo = "";

let treasurerSigImage = new Image();
treasurerSigImage.crossOrigin = "anonymous";
treasurerSigImage.src = "Treasurersign.png";

let presidentSigImage = new Image();
presidentSigImage.crossOrigin = "anonymous";
presidentSigImage.src = "Presidentsign.png";

let sealImage = new Image();
sealImage.crossOrigin = "anonymous";
sealImage.src = "Seal.png";

let defaultRecentTxList = [];
window.openingBalancesStore = {};

let subTypesConfig = {
  "Ledger": [
    "General Expenses",
    "Printing and Stationery",
    "Electricity Expenses Church",
    "Electricity Expenses Parcenage",
    "Lords Supper Sunday School Expenses",
    "Salary Pr. T.T.Simon",
    "Allowance Pr. T.T.Simon",
    "Church Maintenance",
    "General Body Anniversary Meeting Expenses",
    "Fasting wednesday Prayer Expenses",
    "Drinking Water",
    "Church Cleaning Expenses",
    "Conveyance Expenses",
    "Suspenses",
    "Guest Visiting Pastors",
    "Generator Expenses",
    "Church Building Land Taxes",
    "IPC Church Registration Membership",
    "Kerala Water Authority for water Supply"
  ],
  "Charity": ["Charity Paid", "Charity Received"],
  "Other Income": ["Donations", "First fruits", "Anniversary Contributions Received", "Sodari Samajam"],
  "Monthly Meeting": ["Monthly Meeting Collection", "Monthly Meeting Expenses", "General Body / Committee Meeting", "Fasting Prayer Meeting"]
};

let globalRawCategories = [];

function applyDatabaseCategories(categoriesList) {
  if (!Array.isArray(categoriesList) || categoriesList.length === 0) return;
  globalRawCategories = categoriesList;
  window.dbCategories = categoriesList;

  const dynamicSubtypes = {
    "Ledger": [],
    "Charity": [],
    "Other Income": [],
    "Monthly Meeting": []
  };

  categoriesList.forEach(c => {
    const name = (c.name || '').trim();
    const grp = (c.group_name || '').trim();
    const type = c.type || 'Both';
    if (!name || name === '-- None / General --' || name === 'None / General') return;

    if (grp === 'Ledger' || (!grp && type === 'Payment' && !name.toLowerCase().includes('contra') && !name.toLowerCase().includes('charity') && !name.toLowerCase().includes('monthly'))) {
      if (!dynamicSubtypes["Ledger"].some(x => (typeof x === 'string' ? x : x.name) === name)) {
        dynamicSubtypes["Ledger"].push({ name: name, mode: 'Payment' });
      }
    } else if (grp === 'Charity' || name.toLowerCase().includes('charity')) {
      if (!dynamicSubtypes["Charity"].some(x => (typeof x === 'string' ? x : x.name) === name)) {
        dynamicSubtypes["Charity"].push({ name: name, mode: type });
      }
    } else if (grp === 'Monthly Meeting' || name.toLowerCase().includes('monthly meeting') || name.toLowerCase().includes('prayer meeting') || name.toLowerCase().includes('committee meeting')) {
      if (!dynamicSubtypes["Monthly Meeting"].some(x => (typeof x === 'string' ? x : x.name) === name)) {
        dynamicSubtypes["Monthly Meeting"].push({ name: name, mode: type });
      }
    } else if (grp === 'Other Income' || (!grp && type === 'Receipt' && !name.toLowerCase().includes('subscription') && !name.toLowerCase().includes('offering') && !name.toLowerCase().includes('contra'))) {
      if (!dynamicSubtypes["Other Income"].some(x => (typeof x === 'string' ? x : x.name) === name)) {
        dynamicSubtypes["Other Income"].push({ name: name, mode: 'Receipt' });
      }
    } else if (grp && !['Subscription', 'Offering', 'Contra', 'Bank', 'General'].includes(grp)) {
      if (!dynamicSubtypes[grp]) dynamicSubtypes[grp] = [];
      if (!dynamicSubtypes[grp].some(x => (typeof x === 'string' ? x : x.name) === name)) {
        dynamicSubtypes[grp].push({ name: name, mode: type });
      }
      if (typeof globalFieldRules !== 'undefined' && !globalFieldRules[grp]) {
        globalFieldRules[grp] = { showAccount: true, showAddress: false, showSubtype: true, showMonth: false, mode: type };
      }
    }
  });

  if (dynamicSubtypes["Ledger"].length > 0) subTypesConfig["Ledger"] = dynamicSubtypes["Ledger"];
  if (dynamicSubtypes["Other Income"].length > 0) subTypesConfig["Other Income"] = dynamicSubtypes["Other Income"];
  if (dynamicSubtypes["Charity"].length > 0) subTypesConfig["Charity"] = dynamicSubtypes["Charity"];
  if (dynamicSubtypes["Monthly Meeting"].length > 0) subTypesConfig["Monthly Meeting"] = dynamicSubtypes["Monthly Meeting"];

  Object.keys(dynamicSubtypes).forEach(k => {
    if (!subTypesConfig[k] && dynamicSubtypes[k].length > 0) {
      subTypesConfig[k] = dynamicSubtypes[k];
    }
  });

  // Re-populate all dropdowns immediately
  if (typeof updateTypeOptions === 'function') {
    const mode = document.getElementById('txType') ? document.getElementById('txType').value : 'Receipt';
    updateTypeOptions(mode);
  }
  if (typeof updateEditTypeOptions === 'function') {
    const editMode = document.getElementById('edit_txType') ? document.getElementById('edit_txType').value : 'Receipt';
    updateEditTypeOptions(editMode);
  }
  if (typeof populateLedgerSubtypeDropdown === 'function') {
    populateLedgerSubtypeDropdown();
  }
}
window.applyDatabaseCategories = applyDatabaseCategories;

async function loadCategoriesFromApi() {
  try {
    const fetchFn = (typeof apiFetch === 'function') ? apiFetch : fetch;
    const res = await fetchFn('/api/categories');
    if (!res.ok) return;
    const data = await res.json();
    const list = data.categories || data.data || [];
    if (Array.isArray(list) && list.length > 0) {
      applyDatabaseCategories(list);
    }
  } catch (e) {
    console.warn('[Categories] Could not load from /api/categories:', e.message);
  }
}
window.loadCategoriesFromApi = loadCategoriesFromApi;

function buildCategoryOptionsFromDatabase(mode = 'Receipt', entryType = 'Cash') {
  let categories = (window.dbCategories && window.dbCategories.length > 0)
    ? window.dbCategories
    : (window.PG_CATEGORIES || (window.PG_STORE && window.PG_STORE.categories) || (typeof globalRawCategories !== 'undefined' ? globalRawCategories : []) || []);

  const optionsList = [];

  if (Array.isArray(categories) && categories.length > 0) {
    const cMode = (mode === 'OpeningBalance') ? 'Receipt' : mode;

    // Filter by type matching mode ('Receipt', 'Payment', or 'Both')
    const filtered = categories.filter(c => {
      const cType = c.type || 'Both';
      return (cType === 'Both' || cType === cMode);
    });

    filtered.forEach(cat => {
      const name = (cat.name || '').trim();
      let grp = (cat.group_name || '').trim();
      if (!name) return;

      // Handle generic None / General
      if (name === '-- None / General --' || name === 'None / General' || grp === 'General') {
        return;
      }

      // If entryType is Cash, skip purely Bank-internal types
      if (entryType === 'Cash' && grp === 'Bank') {
        return;
      }

      // Contra handling for Cash
      if (name.toLowerCase().includes('(contra)') || grp === 'Contra') {
        if (mode === 'Receipt' && !name.toLowerCase().includes('withdrawal')) return;
        if (mode === 'Payment' && !name.toLowerCase().includes('deposit')) return;
      }

      // Auto-assign group_name if missing
      if (!grp) {
        if (name === 'Subscription') grp = 'Subscription';
        else if (name === 'Offering') grp = 'Offering';
        else if (name.toLowerCase().includes('contra')) grp = 'Contra';
        else if (name.toLowerCase().includes('charity')) grp = 'Charity';
        else if (cat.type === 'Receipt') grp = 'Other Income';
        else grp = 'Ledger';
      }

      let val = '';
      let text = name;

      if (grp === 'Subscription') {
        val = 'Subscription|';
      } else if (grp === 'Offering') {
        val = 'Offering|';
      } else if (grp === 'Charity') {
        if (!name.toLowerCase().startsWith('charity')) {
          text = 'Charity ' + name;
        }
        val = `Charity|${text}`;
      } else if (grp === 'Standalone' || grp === name || !['Ledger', 'Other Income', 'Monthly Meeting', 'Contra'].includes(grp)) {
        val = `${name}|`;
      } else {
        val = `${grp}|${name}`;
      }

      if (!optionsList.some(o => o.val === val)) {
        optionsList.push({
          val: val,
          text: text,
          group: grp,
          id: cat.id
        });
      }
    });
  }

  // Fallback if categories table was not populated yet
  if (optionsList.length === 0 && typeof globalFieldRules !== 'undefined') {
    const typesList = Object.keys(globalFieldRules);
    typesList.forEach(type => {
      const rules = globalFieldRules[type];
      if (typeof isTabApplicableToCurrentFY === 'function' && !isTabApplicableToCurrentFY(rules)) return;
      if (!rules || !rules.mode) {
        if (mode === 'Receipt' && !['Subscription', 'Offering', 'Charity', 'Other Income'].includes(type)) return;
        if (mode === 'Payment' && !['Ledger', 'Charity'].includes(type)) return;
      } else if (rules.mode !== 'Both' && rules.mode !== mode) {
        return;
      }

      let subtypes = (typeof subTypesConfig !== 'undefined' && subTypesConfig[type]) ? subTypesConfig[type] : [];
      if (type === 'Charity') {
        subtypes = (mode === 'Receipt') ? [{ name: 'Charity Received', mode: 'Receipt' }] : [{ name: 'Charity Paid', mode: 'Payment' }];
      }

      if (subtypes.length > 0) {
        subtypes.forEach(opt => {
          let stName = (typeof opt === 'string') ? opt : opt.name;
          const stMode = (typeof opt === 'string') ? 'Both' : (opt.mode || 'Both');
          if (stMode === 'Both' || stMode === mode) {
            let displayName = stName;
            if (type === 'Charity' && !stName.toLowerCase().startsWith('charity')) {
              displayName = "Charity " + stName;
              stName = displayName;
            }
            optionsList.push({ val: `${type}|${stName}`, text: displayName, group: type });
          }
        });
      } else {
        optionsList.push({ val: `${type}|`, text: type, group: type });
      }
    });
  }

  // Ensure Cash Contra is available
  if (entryType === 'Cash') {
    if (mode === 'Receipt' && !optionsList.some(o => o.val.startsWith('Contra|'))) {
      optionsList.push({ val: 'Contra|Cash Withdrawal (Contra)', text: 'Cash Withdrawal (Contra)', group: 'Contra' });
    } else if (mode === 'Payment' && !optionsList.some(o => o.val.startsWith('Contra|'))) {
      optionsList.push({ val: 'Contra|Cash Deposit (Contra)', text: 'Cash Deposit (Contra)', group: 'Contra' });
    }
  }

  // Append None / General option
  if (!optionsList.some(o => o.val === '|')) {
    optionsList.push({ val: '|', text: '-- None / General --', group: 'General' });
  }

  return optionsList;
}
window.buildCategoryOptionsFromDatabase = buildCategoryOptionsFromDatabase;

function populateCategorySelect(selectElement, mode, entryType, targetVal) {
  if (!selectElement) return;
  const currentVal = (targetVal !== undefined && targetVal !== null && targetVal !== '') ? targetVal : selectElement.value;
  selectElement.innerHTML = '';

  const optionsList = buildCategoryOptionsFromDatabase(mode, entryType);

  // Group by category group for clean, intuitive UI
  const groups = {};
  optionsList.forEach(opt => {
    const grp = opt.group || 'Other';
    if (!groups[grp]) groups[grp] = [];
    groups[grp].push(opt);
  });

  const preferredGroupOrder = (mode === 'Payment')
    ? ['Ledger', 'Monthly Meeting', 'Charity', 'Contra', 'General']
    : ['Subscription', 'Offering', 'Other Income', 'Monthly Meeting', 'Charity', 'Contra', 'General'];

  const groupKeys = Object.keys(groups).sort((a, b) => {
    const idxA = preferredGroupOrder.indexOf(a);
    const idxB = preferredGroupOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  groupKeys.forEach(grp => {
    const grpItems = groups[grp];
    grpItems.sort((a, b) => a.text.localeCompare(b.text));
    if (grpItems.length === 1 && (grp === 'General' || grp === 'Subscription' || grp === 'Offering')) {
      const optEl = document.createElement('option');
      optEl.value = grpItems[0].val;
      optEl.innerText = grpItems[0].text;
      if (grpItems[0].id) optEl.dataset.categoryId = grpItems[0].id;
      selectElement.appendChild(optEl);
    } else {
      const optGroup = document.createElement('optgroup');
      optGroup.label = grp;
      grpItems.forEach(item => {
        const optEl = document.createElement('option');
        optEl.value = item.val;
        optEl.innerText = item.text;
        if (item.id) optEl.dataset.categoryId = item.id;
        optGroup.appendChild(optEl);
      });
      selectElement.appendChild(optGroup);
    }
  });

  // Restore selection:
  if (currentVal && optionsList.some(t => t.val === currentVal)) {
    selectElement.value = currentVal;
  } else if (currentVal && currentVal.includes('|') && currentVal.split('|')[1]) {
    const subPart = currentVal.split('|')[1];
    const matchSub = optionsList.find(t => t.val.includes('|' + subPart));
    if (matchSub) selectElement.value = matchSub.val;
    else if (optionsList.length > 0) selectElement.value = optionsList[0].val;
  } else if (currentVal && optionsList.some(t => t.val.startsWith(currentVal.split('|')[0] + '|'))) {
    const matchType = optionsList.find(t => t.val.startsWith(currentVal.split('|')[0] + '|'));
    selectElement.value = matchType ? matchType.val : optionsList[0].val;
  } else if (optionsList.length > 0) {
    selectElement.value = optionsList[0].val;
  }
}
window.populateCategorySelect = populateCategorySelect;

// Fetch categories from DB immediately
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { loadCategoriesFromApi(); });
  } else {
    loadCategoriesFromApi();
  }
}

let globalChurchUpiId = "";

const defaultAutoBackupConfig = {
  enabled: false,
  email: '',
  frequency: 'weekly',
  dayOfWeek: 1, // 1 = Monday
  timeOfDay: '09:00',
  intervalUnit: 'days',
  intervalVal: 7,
  emailServiceUrl: '',
  emailjsServiceId: '',
  emailjsTemplateId: '',
  emailjsPublicKey: '',
  lastBackupTime: null,
  lastStatus: 'Not run yet',
  nextScheduledTime: null
};
let globalAutoBackupConfig = Object.assign({}, defaultAutoBackupConfig);

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const bd = document.getElementById('sidebarBackdrop');
  if (sb) sb.classList.toggle('open');
  if (bd) bd.classList.toggle('open');
}

function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const bd = document.getElementById('sidebarBackdrop');
  if (sb) sb.classList.remove('open');
  if (bd) bd.classList.remove('open');
}

let selectedCharityMode = 'All';
let selectedOtherIncomeMode = 'All';
let selectedMemberName = '';
let selectedMemberAddress = '';

function normalizeTitle(t) {
  if (!t) return 'Br.';
  const s = String(t).trim();
  if (/^Br\.?\b|^Brother\b|^Bro\.?\b/i.test(s)) return 'Br.';
  if (/^Pr\.?\b|^Pastor\b/i.test(s)) return 'Pr.';
  if (/^Sr\.?\b|^Sister\b|^Sis\.?\b/i.test(s)) return 'Sr.';
  if (/^Evg\.?\b|^Evangelist\b/i.test(s)) return 'Evg.';
  const lower = s.toLowerCase().replace(/\./g, '');
  if (['br', 'pr', 'sr', 'evg'].includes(lower)) {
    return lower.charAt(0).toUpperCase() + lower.slice(1) + '.';
  }
  return s.endsWith('.') ? s : s + '.';
}

function getRawName(name, title) {
  if (!name) return '';
  let clean = String(name).trim();
  // Strip any parenthesized nickname at the end: e.g. "Raju Abraham (Moncy)" -> "Raju Abraham"
  clean = clean.replace(/\s*\([^)]*\)\s*$/, '').trim();
  // Strip repeated title prefixes (e.g. "Brother Br. K.V Thomas", "Brother", "Sister Sr.", "Br.", "Br")
  while (/^(Brother|Sister|Pastor|Evangelist|Bro|Sis|Br|Sr|Pr|Evg)\.?\s+/i.test(clean)) {
    clean = clean.replace(/^(Brother|Sister|Pastor|Evangelist|Bro|Sis|Br|Sr|Pr|Evg)\.?\s+/i, '').trim();
  }
  return clean;
}

function getPrefixForTitle(title) {
  const t = normalizeTitle(title);
  return t ? `${t} ` : '';
}

function formatMemberDisplayName(name, title = '', includeNickname = false, nickname = '') {
  if (!name) return '';
  const orig = String(name).trim();
  const lower = orig.toLowerCase();
  if (lower.startsWith('state bank') || lower.startsWith('sbi') || lower.startsWith('contra') ||
      lower.startsWith('opening balance') || lower.startsWith('cash deposit') || lower.startsWith('cash withdrawal') ||
      lower.startsWith('electricity') || lower.startsWith('interest') || lower.startsWith('bank charges')) {
    return orig.replace(/\s*\([^)]*\)\s*$/, '').trim();
  }

  const raw = getRawName(orig, title);
  if (!raw) return '';

  let normTitle = title ? normalizeTitle(title) : '';
  let foundMember = null;
  if (typeof membersDataStore !== 'undefined' && Array.isArray(membersDataStore)) {
    const rawLower = raw.toLowerCase();
    foundMember = membersDataStore.find(m => {
      const mn = (m.name || '').toLowerCase().trim();
      const mr = getRawName(mn).toLowerCase();
      return mn === rawLower || mr === rawLower || (m.nickname && m.nickname.toLowerCase() === rawLower);
    });
    if (foundMember && foundMember.title && !normTitle) {
      normTitle = normalizeTitle(foundMember.title);
    }
  }

  if (!normTitle) {
    if (/^Pr\.?\b|^Pastor\b/i.test(orig)) normTitle = 'Pr.';
    else if (/^Sr\.?\b|^Sister\b|^Sis\.?\b/i.test(orig)) normTitle = 'Sr.';
    else if (/^Evg\.?\b|^Evangelist\b/i.test(orig)) normTitle = 'Evg.';
    else if (/^Br\.?\b|^Brother\b|^Bro\.?\b/i.test(orig)) normTitle = 'Br.';
    else normTitle = 'Br.';
  }

  let finalName = `${normTitle} ${raw}`;
  if (includeNickname) {
    const nick = nickname || (foundMember ? foundMember.nickname : '');
    if (nick && nick.trim()) {
      finalName += ` (${nick.trim()})`;
    }
  }
  return finalName;
}

function compareNamesIgnoringPrefix(a, b) {
  const cleanA = getRawName(a).toLowerCase();
  const cleanB = getRawName(b).toLowerCase();
  return cleanA.localeCompare(cleanB) || (a || '').localeCompare(b || '');
}

function deduplicateMembersList(rawMembers) {
  if (!Array.isArray(rawMembers)) return [];

  const validMembers = rawMembers.filter(m => m && String(m.id) !== 'NaN' && String(m.name) !== 'NaN' && String(m.name || '').trim());
  const merged = [];

  validMembers.forEach(m => {
    const rawName = getRawName(m.name, m.title).toLowerCase().trim();
    if (!rawName) return;
    const addr = (m.address || '').trim();
    const cleanAddr = (addr === '-' || addr.toLowerCase() === 'not specified' || addr.toLowerCase() === 'no address') ? '' : addr.toLowerCase();

    // Check if an existing merged record corresponds to this member
    const existing = merged.find(em => {
      const emRawName = getRawName(em.name, em.title).toLowerCase().trim();
      if (emRawName !== rawName) return false;

      const emAddr = (em.address || '').trim();
      const emCleanAddr = (emAddr === '-' || emAddr.toLowerCase() === 'not specified' || emAddr.toLowerCase() === 'no address') ? '' : emAddr.toLowerCase();

      // If either record has no specific address, or addresses match/contain each other
      if (!cleanAddr || !emCleanAddr) return true;
      return cleanAddr === emCleanAddr || cleanAddr.includes(emCleanAddr) || emCleanAddr.includes(cleanAddr);
    });

    const mDocId = m._docId || m.id;
    const mAlias = String(m.name || '').trim().toLowerCase();

    if (!existing) {
      merged.push({
        ...m,
        _allDocIds: mDocId ? [String(mDocId)] : [],
        _aliases: mAlias ? [mAlias] : []
      });
    } else {
      if (mDocId && !existing._allDocIds.includes(String(mDocId))) {
        existing._allDocIds.push(String(mDocId));
      }
      if (mAlias && !existing._aliases.includes(mAlias)) {
        existing._aliases.push(mAlias);
      }

      // Merge missing address
      const emAddr = (existing.address || '').trim();
      const emCleanAddr = (emAddr === '-' || emAddr.toLowerCase() === 'not specified' || emAddr.toLowerCase() === 'no address') ? '' : emAddr;
      if (!emCleanAddr && addr && addr !== '-' && addr.toLowerCase() !== 'not specified' && addr.toLowerCase() !== 'no address') {
        existing.address = addr;
      }

      // Merge missing phone
      if ((!existing.phone || existing.phone === '-') && (m.phone && m.phone !== '-')) {
        existing.phone = m.phone;
      }

      // Merge title
      if (!existing.title && m.title) {
        existing.title = m.title;
      }

      // Merge nickname
      if (!existing.nickname && m.nickname) {
        existing.nickname = m.nickname;
      }

      // If either has active status, keep active
      if (m.status && m.status !== 'No') {
        existing.status = m.status;
      }
    }
  });

  return merged;
}

async function cleanDuplicateMembersInFirestore(silent = false) {
  if (!globalRawMembers || globalRawMembers.length === 0) {
    if (!silent) showAlert("No members loaded to clean.", "info");
    return { removedCount: 0 };
  }

  if (!silent) showGlobalLoading("Analyzing and fixing duplicate member records...");

  try {
    const rawMap = new Map();
    globalRawMembers.forEach(m => {
      if (!m || !m.name) return;
      const rName = getRawName(m.name, m.title).toLowerCase().trim();
      if (!rName) return;
      if (!rawMap.has(rName)) rawMap.set(rName, []);
      rawMap.get(rName).push(m);
    });

    const toDeleteIds = [];
    const toUpdateOps = [];

    rawMap.forEach((list, rName) => {
      if (list.length <= 1) return;

      const clusters = [];
      list.forEach(m => {
        const addr = (m.address || '').trim();
        const cAddr = (addr === '-' || addr.toLowerCase() === 'not specified' || addr.toLowerCase() === 'no address') ? '' : addr.toLowerCase();

        const matchCluster = clusters.find(cl => {
          if (!cAddr || !cl.cleanAddress) return true;
          return cAddr === cl.cleanAddress || cAddr.includes(cl.cleanAddress) || cl.cleanAddress.includes(cAddr);
        });

        if (!matchCluster) {
          clusters.push({
            cleanAddress: cAddr,
            items: [m]
          });
        } else {
          if (!matchCluster.cleanAddress && cAddr) {
            matchCluster.cleanAddress = cAddr;
          }
          matchCluster.items.push(m);
        }
      });

      clusters.forEach(cl => {
        if (cl.items.length > 1) {
          cl.items.sort((a, b) => {
            const scA = (a.address ? 4 : 0) + (a.phone ? 2 : 0) + (a.title ? 1 : 0);
            const scB = (b.address ? 4 : 0) + (b.phone ? 2 : 0) + (b.title ? 1 : 0);
            return scB - scA;
          });

          const keeper = cl.items[0];
          const dups = cl.items.slice(1);
          const fieldsToUpdate = {};
          let needsUpdate = false;

          dups.forEach(d => {
            const dAddr = (d.address || '').trim();
            if ((!keeper.address || keeper.address === '-' || keeper.address.toLowerCase() === 'not specified') && dAddr && dAddr !== '-' && dAddr.toLowerCase() !== 'not specified') {
              keeper.address = dAddr;
              fieldsToUpdate.address = dAddr;
              needsUpdate = true;
            }
            if ((!keeper.phone || keeper.phone === '-') && d.phone && d.phone !== '-') {
              keeper.phone = d.phone;
              fieldsToUpdate.phone = d.phone;
              needsUpdate = true;
            }
            if (!keeper.title && d.title) {
              keeper.title = d.title;
              fieldsToUpdate.title = d.title;
              needsUpdate = true;
            }
            if (!keeper.nickname && d.nickname) {
              keeper.nickname = d.nickname;
              fieldsToUpdate.nickname = d.nickname;
              needsUpdate = true;
            }

            const docId = d._docId || d.id;
            if (docId) {
              toDeleteIds.push(String(docId));
            }
          });

          const keeperDocId = keeper._docId || keeper.id;
          if (needsUpdate && keeperDocId) {
            toUpdateOps.push({ docId: String(keeperDocId), fields: fieldsToUpdate });
          }
        }
      });
    });

    if (toDeleteIds.length > 0) {
      console.log(`🧹 Removing ${toDeleteIds.length} duplicate member document(s) from Firestore...`);
      const deletePromises = toDeleteIds.map(id => db.collection('members').doc(id).delete().catch(e => console.warn("Delete doc error:", e)));
      const updatePromises = toUpdateOps.map(u => db.collection('members').doc(u.docId).update(u.fields).catch(e => console.warn("Update doc error:", e)));
      await Promise.all([...deletePromises, ...updatePromises]);

      globalRawMembers = globalRawMembers.filter(m => !toDeleteIds.includes(String(m._docId || m.id)));
      membersDataStore = deduplicateMembersList(globalRawMembers);
      _memberCodeCache = null;
      renderMembersTab();
      if (typeof renderMembersDirectoryTab === 'function') renderMembersDirectoryTab();

      if (!silent) hideGlobalLoading();
      if (!silent) {
        showAlert(`🧹 Successfully cleaned ${toDeleteIds.length} duplicate member record(s)!`, "success");
      }
      return { removedCount: toDeleteIds.length };
    } else {
      if (!silent) hideGlobalLoading();
      if (!silent) {
        showAlert("✅ No duplicate member documents found. Directory is already clean!", "info");
      }
      return { removedCount: 0 };
    }
  } catch (err) {
    if (!silent) hideGlobalLoading();
    console.error("Error cleaning duplicate members:", err);
    if (!silent) {
      showAlert("⚠️ Error cleaning duplicate members: " + (err.message || err), "error");
    }
    return { removedCount: 0 };
  }
}

function normalizeAddressStr(addr) {
  if (!addr) return '';
  const s = String(addr).toLowerCase().trim();
  if (s === '-' || s === '--' || s === 'not specified' || s === 'no address' || s === 'null' || s === 'undefined') return '';
  return s.replace(/[\r\n\t,.-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function areAddressesMatching(a1, a2) {
  const n1 = normalizeAddressStr(a1);
  const n2 = normalizeAddressStr(a2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;
  if (n1.length >= 4 && n2.includes(n1)) return true;
  if (n2.length >= 4 && n1.includes(n2)) return true;
  return false;
}

function getMemberObject(mName, mAddr = '') {
  if (!mName) return { name: '', address: '' };
  const nLower = mName.toLowerCase().trim();
  const rawLower = (typeof getRawName === 'function' ? getRawName(mName) : mName).toLowerCase().trim();
  const cleanAddr = normalizeAddressStr(mAddr);

  if (cleanAddr && typeof membersDataStore !== 'undefined' && Array.isArray(membersDataStore)) {
    const found = membersDataStore.find(m => {
      if (!m) return false;
      const mn = (m.name || '').toLowerCase().trim();
      const mr = (typeof getRawName === 'function' ? getRawName(mn) : mn).toLowerCase().trim();
      const matchesName = (mn === nLower || mr === rawLower || (m._aliases && m._aliases.includes(nLower)));
      const matchesAddr = areAddressesMatching(m.address, cleanAddr);
      return matchesName && matchesAddr;
    });
    if (found) return found;
  }

  if (typeof membersDataStore !== 'undefined' && Array.isArray(membersDataStore)) {
    const foundByName = membersDataStore.find(m => {
      if (!m) return false;
      const mn = (m.name || '').toLowerCase().trim();
      const mr = (typeof getRawName === 'function' ? getRawName(mn) : mn).toLowerCase().trim();
      return mn === nLower || mr === rawLower || (m._aliases && m._aliases.includes(nLower));
    });
    if (foundByName) return foundByName;
  }

  return { name: mName, address: mAddr };
}

function resolveMemberAddress(tx) {
  if (!tx) return '';
  // 1. Direct address on transaction if present and valid
  const direct = (tx.address || '').trim();
  if (direct && direct !== '-' && direct.toLowerCase() !== 'not specified') {
    return direct;
  }

  const acc = (tx.accountName || '').trim();
  if (!acc || acc === '-' || acc === '--') return '';

  const lowerAcc = acc.toLowerCase();
  // Skip non-member accounts
  if (lowerAcc.startsWith('state bank') || lowerAcc.startsWith('sbi') || lowerAcc.startsWith('contra') ||
      lowerAcc.startsWith('opening balance') || lowerAcc.startsWith('cash deposit') || lowerAcc.startsWith('cash withdrawal') ||
      lowerAcc.startsWith('electricity') || lowerAcc.startsWith('interest') || lowerAcc.startsWith('bank charges')) {
    return '';
  }

  // 2. Lookup in activeMembersMap
  if (typeof activeMembersMap !== 'undefined' && activeMembersMap) {
    if (activeMembersMap[lowerAcc]) return activeMembersMap[lowerAcc].trim();
    const cleanLower = getRawName(acc).toLowerCase();
    if (activeMembersMap[cleanLower]) return activeMembersMap[cleanLower].trim();
  }

  // 3. Lookup in membersDataStore
  if (typeof membersDataStore !== 'undefined' && Array.isArray(membersDataStore)) {
    const cleanRaw = getRawName(acc).toLowerCase();
    const found = membersDataStore.find(m => {
      if (!m) return false;
      const mn = (m.name || '').toLowerCase().trim();
      const mr = getRawName(mn).toLowerCase();
      const nick = (m.nickname || '').toLowerCase().trim();
      return mn === lowerAcc || mr === cleanRaw || mn === cleanRaw || (nick && nick === cleanRaw);
    });
    if (found && found.address && found.address.trim() && found.address.trim() !== '-' && found.address.toLowerCase() !== 'not specified') {
      return found.address.trim();
    }
  }

  return '';
}

function isTxMatchingMember(tx, mName, mAddr = '') {
  if (!tx) return false;
  const targetName = (mName || '').toLowerCase().trim();
  if (!targetName) return false;

  const cleanTarget = (typeof getRawName === 'function' ? getRawName(targetName) : targetName).toLowerCase().trim();
  const targetMember = getMemberObject(mName, mAddr);

  // Address Resolution
  const rawTargetAddr = (mAddr || (targetMember ? targetMember.address : '') || '').trim();
  const normTargetAddr = normalizeAddressStr(rawTargetAddr);

  const rawTxAddr = (tx.address || (typeof resolveMemberAddress === 'function' ? resolveMemberAddress(tx) : '') || '').trim();
  const normTxAddr = normalizeAddressStr(rawTxAddr);

  // =========================================================================
  // CRITICAL STEP 1: STRICT ADDRESS CONFLICT CHECK (HIGHEST PRECEDENCE)
  // If BOTH transaction and member have a specific address, they MUST match!
  // NO member code, name match, or alias can EVER override an address conflict!
  // =========================================================================
  if (normTxAddr && normTargetAddr) {
    if (!areAddressesMatching(normTxAddr, normTargetAddr)) {
      return false; // Strict conflict rejection: different addresses belong to different members!
    }
  }

  // Also check if transaction description explicitly mentions another member's address
  const txDesc = (tx.description || tx.particulars || '').toLowerCase().trim();
  const normDesc = normalizeAddressStr(txDesc);
  if (normTargetAddr && normDesc && typeof membersDataStore !== 'undefined' && Array.isArray(membersDataStore)) {
    const otherConflict = membersDataStore.some(m => {
      if (m === targetMember) return false;
      const mr = (typeof getRawName === 'function' ? getRawName(m.name, m.title) : (m.name || '')).toLowerCase().trim();
      if (mr !== cleanTarget) return false;
      const otherNorm = normalizeAddressStr(m.address);
      return otherNorm && otherNorm.length >= 5 && normDesc.includes(otherNorm) && !normTargetAddr.includes(otherNorm);
    });
    if (otherConflict) return false;
  }

  // =========================================================================
  // STEP 2: NAME / CODE VERIFICATION
  // =========================================================================
  let rawTxName = (tx.accountName || tx.account_name || tx.name || '').toLowerCase().trim();

  // If no accountName on bank transaction, check if description starts with or includes member name
  if (!rawTxName && txDesc) {
    if (txDesc.startsWith(targetName) || txDesc.includes(' - ' + targetName) || txDesc.includes(targetName + ' - ') ||
        (cleanTarget && (txDesc.startsWith(cleanTarget) || txDesc.includes(' - ' + cleanTarget) || txDesc.includes(cleanTarget + ' - ')))) {
      rawTxName = targetName;
    }
  }

  const cleanRawTx = (typeof getRawName === 'function' ? getRawName(rawTxName) : rawTxName).toLowerCase().trim();
  const isAliasMatch = targetMember && targetMember._aliases && (targetMember._aliases.includes(rawTxName) || targetMember._aliases.includes(cleanRawTx));
  const isNameMatch = (rawTxName === targetName || (cleanRawTx && cleanRawTx === cleanTarget) || isAliasMatch);

  // Check unique member code ONLY if addresses do not conflict
  const targetCode = targetMember ? (targetMember.code || targetMember.member_code || '').toLowerCase().trim() : '';
  const txCode = (tx.memberCode || tx.member_code || '').toLowerCase().trim();
  const isCodeMatch = (targetCode && txCode && targetCode === txCode);

  if (!isNameMatch && !isCodeMatch) {
    return false;
  }

  // =========================================================================
  // STEP 3: AMBIGUITY RESOLUTION FOR SAME-NAME MEMBERS
  // =========================================================================
  // A. If transaction has a specific address, but selected member has no address recorded:
  if (normTxAddr && !normTargetAddr && typeof membersDataStore !== 'undefined' && Array.isArray(membersDataStore)) {
    const otherMemberHasAddr = membersDataStore.some(m => {
      if (m === targetMember) return false;
      const mr = (typeof getRawName === 'function' ? getRawName(m.name, m.title) : (m.name || '')).toLowerCase().trim();
      if (mr !== cleanTarget) return false;
      return areAddressesMatching(m.address, normTxAddr);
    });
    if (otherMemberHasAddr) return false; // Belongs to that other member!
  }

  // B. If selected member has a specific address, but transaction has no explicit address:
  if (!normTxAddr && normTargetAddr && typeof membersDataStore !== 'undefined' && Array.isArray(membersDataStore)) {
    const otherSameNameMembers = membersDataStore.filter(m => {
      if (m === targetMember) return false;
      const mr = (typeof getRawName === 'function' ? getRawName(m.name, m.title) : (m.name || '')).toLowerCase().trim();
      const otherNorm = normalizeAddressStr(m.address);
      return mr === cleanTarget && otherNorm;
    });

    if (otherSameNameMembers.length > 0) {
      if (normDesc && normDesc.includes(normTargetAddr)) {
        return true;
      }
      return false; // Cannot attribute ambiguous tx without address to this member
    }
  }

  return true;
}

const renderedTabs = new Set();

function markAllTabsDirty() {
  renderedTabs.clear();
  if (typeof invalidateMemberCodeCache === 'function') invalidateMemberCodeCache();
}

function renderTabContent(tabId) {
  const activeTab = document.getElementById(tabId);
  if (tabId.startsWith('dynamicTab_')) {
    if (activeTab) {
      const typeName = activeTab.getAttribute('data-type');
      if (typeName) renderDynamicTabTable(typeName);
    }
  } else if (tabId === 'statementTab') {
    renderDashboard();
  } else if (tabId === 'entryTab') {
    isEditMode = false;
    originalEditVrNo = "";
    if (typeof calculateNextVoucherNumbers === 'function') calculateNextVoucherNumbers();
    const currentMode = document.getElementById('txType') ? document.getElementById('txType').value : 'Receipt';
    setMode(currentMode);
  } else if (tabId === 'transactionsTab') {
    renderRecentTransactions();
  } else if (tabId === 'bankBookTab') {
    refreshBankBookData();
  } else if (tabId === 'ledgerTab') {
    populateLedgerSubtypeDropdown();
    renderLedgerTabTable();
  } else if (tabId === 'membersDirectoryTab') {
    renderMembersDirectoryTab();
  } else if (tabId === 'membersTab') {
    renderMembersTab();
  } else if (tabId === 'offeringTab') {
    renderOfferingTabTable();
  } else if (tabId === 'charityTab') {
    renderCharityTabTable();
  } else if (tabId === 'otherIncomeTab') {
    renderOtherIncomeTabTable();
  } else if (tabId === 'subscriptionsTab') {
    if (typeof renderSubscriptionsReport === 'function') renderSubscriptionsReport();
  } else if (tabId === 'memberStatementTab') {
    if (typeof renderMemberStatementReport === 'function') renderMemberStatementReport();
  } else if (tabId === 'suspenseTab') {
    if (typeof renderSuspenseTable === 'function') renderSuspenseTable();
  } else if (tabId === 'settingsTab') {
    if (typeof renderSettingsBankList === 'function') renderSettingsBankList();
    if (typeof renderSettingsTypesList === 'function') renderSettingsTypesList();
    if (typeof populateBankDropdowns === 'function') populateBankDropdowns();
    if (typeof populateTypeDropdowns === 'function') populateTypeDropdowns();
  }
  renderedTabs.add(tabId);
}

function switchTab(tabId, fromHash = false) {
  if (currentLoggedInUser && !hasAccess(tabId)) {
    alert("Access Denied: You do not have permission to view this tab.");
    if (!fromHash) {
      const active = document.querySelector('.page-tab.active');
      if (active) {
        isHashNavigating = true;
        window.location.hash = '#/' + (REVERSE_ROUTE_MAP[active.id] || active.id);
        setTimeout(() => isHashNavigating = false, 50);
      }
    }
    return;
  }

  closeSidebar();

  const initStyle = document.getElementById('initial-tab-style');
  if (initStyle) initStyle.remove();

  // Instant visual tab switch (0ms latency)
  document.querySelectorAll('.page-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

  const activeTab = document.getElementById(tabId);
  if (activeTab) activeTab.classList.add('active');

  const navItemStatic = document.querySelector(`.nav-menu [onclick*="switchTab('${tabId}')"]`);
  if (navItemStatic) {
    navItemStatic.classList.add('active');
  }

  if (tabId.startsWith('dynamicTab_')) {
    const dynamicNav = document.getElementById('nav_' + tabId);
    if (dynamicNav && !navItemStatic) dynamicNav.classList.add('active');
  }

  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }

  // Render tab content if not already rendered or if entry tab
  if (!renderedTabs.has(tabId) || tabId === 'entryTab') {
    renderTabContent(tabId);
  }

  // Update Hash if not coming from hashchange
  if (!fromHash) {
    isHashNavigating = true;
    window.location.hash = '#/' + (REVERSE_ROUTE_MAP[tabId] || tabId);
    setTimeout(() => isHashNavigating = false, 50);
  }

  if (window.innerWidth <= 1200) {
    window.scrollTo(0, 0);
    const titleEl = document.getElementById('mobileBarTitle');
    if (titleEl) titleEl.innerText = 'IPC HOREB CHURCH';
  }
}

// --- LEDGER TAB ---
function normalizeLedgerName(str) {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isGeneralBodyOrAnniversaryTx(tx) {
  if (!tx) return false;
  const t = String(tx.type || '').toLowerCase().trim();
  const c = String(tx.category || '').toLowerCase().trim();
  const s = String(tx.subtype || tx.subType || tx.bank_subtype || tx.bankSubtype || '').toLowerCase().trim();
  const d = String(tx.particulars || tx.description || '').toLowerCase().trim();
  const n = String(tx.accountName || '').toLowerCase().trim();

  // If explicitly categorized or typed as Monthly Meeting, it belongs to Monthly Meeting!
  if (t === 'monthly meeting' || c === 'monthly meeting' || s === 'monthly meeting' ||
      t === 'monthlymeeting' || c === 'monthlymeeting' || s === 'monthlymeeting') {
    return false;
  }

  const allText = `${t} ${c} ${s} ${d} ${n}`;

  return (
    allText.includes('general body') ||
    allText.includes('generalbody') ||
    allText.includes('anniversary')
  );
}

function isMeetingTransaction(tx) {
  if (!tx) return false;
  const t = String(tx.type || '').toLowerCase().trim();
  const c = String(tx.category || '').toLowerCase().trim();
  const s = String(tx.subtype || tx.subType || tx.bank_subtype || tx.bankSubtype || '').toLowerCase().trim();
  const d = String(tx.particulars || tx.description || '').toLowerCase().trim();

  // If explicitly categorized or typed as Monthly Meeting:
  if (t === 'monthly meeting' || c === 'monthly meeting' || s === 'monthly meeting' ||
      t === 'monthlymeeting' || c === 'monthlymeeting' || s === 'monthlymeeting') {
    return true;
  }

  // General Body / Anniversary Meeting Expenses must NEVER be included in Monthly Meeting!
  if (isGeneralBodyOrAnniversaryTx(tx)) return false;

  return (
    t.includes('monthly meeting') || t.includes('monthlymeeting') ||
    c.includes('monthly meeting') || c.includes('monthlymeeting') ||
    s.includes('monthly meeting') || s.includes('monthlymeeting') ||
    d.includes('monthly meeting') || d.includes('monthlymeeting')
  );
}

function isTxForDynamicType(tx, typeName) {
  if (!tx || !typeName) return false;
  const target = typeName.trim().toLowerCase();

  if (target === 'monthly meeting' || target === 'monthlymeeting') {
    if (isGeneralBodyOrAnniversaryTx(tx)) return false;
    return isMeetingTransaction(tx);
  }

  const t = String(tx.type || '').trim().toLowerCase();
  const c = String(tx.category || '').trim().toLowerCase();
  const s = String(tx.subtype || tx.subType || tx.bank_subtype || tx.bankSubtype || '').trim().toLowerCase();
  return t === target || c === target || s === target;
}

function isLedgerExpenseTx(tx) {
  if (!tx) return false;
  const typeStr = (tx.type || tx.category || '').toLowerCase().trim();
  const subStr = (tx.subtype || tx.subType || tx.bank_subtype || tx.bankSubtype || '').toLowerCase().trim();
  const descStr = (tx.description || tx.particulars || '').toLowerCase().trim();
  const modeStr = (tx.mode || '').toLowerCase().trim();
  const catStr = (tx.category || '').toLowerCase().trim();

  // Exclude Receipts
  if (modeStr === 'receipt' || (Number(tx.receipt || 0) > 0 && Number(tx.payment || 0) === 0)) return false;

  // Exclude Contra
  if (typeStr.includes('contra') || subStr.includes('contra') || descStr.includes('cash deposit') || descStr.includes('cash withdrawal')) return false;

  // Exclude Charity (handled in Charity tab)
  if (typeStr.includes('charity') || subStr.includes('charity')) return false;

  // Exclude Monthly Meeting (handled exclusively in Monthly Meeting dynamic tab)
  // General Body / Anniversary Meeting Expenses must NEVER be excluded from Ledger!
  if (!isGeneralBodyOrAnniversaryTx(tx)) {
    if (
      typeStr.includes('monthly meeting') || typeStr.includes('monthlymeeting') ||
      catStr.includes('monthly meeting') || catStr.includes('monthlymeeting') ||
      subStr.includes('monthly meeting') || subStr.includes('monthlymeeting') ||
      isMeetingTransaction(tx)
    ) return false;
  }

  // Exclude Opening Balances
  if (typeStr.includes('opening balance') || descStr.includes('opening balance')) return false;

  // Exclude internal bank transfers
  if (typeStr === 'bank' && !subStr) return false;
  if (subStr.includes('inter-bank transfer')) return false;

  // If explicit Ledger
  if (typeStr === 'ledger') return true;

  // Any payment or debit entry is an expenditure / ledger expense
  const amt = Number(tx.payment || tx.payments || tx.debit || tx.amount || 0);
  if (amt > 0) return true;

  return false;
}

const ledgerAccountsOrder = [
  "General Expense",
  "Printing and Stationery",
  "Electricity Expenses (Church)",
  "Electricity Expenses (Parcenage)",
  "Lord's Supper/Sunday School Expenses",
  "Salary (Pr. T.T.Simon)",
  "Allowance (Pr. T.T.Simon)",
  "Church Maintenance",
  "General Body/Anniversary Meeting Expenses",
  "Fasting/wednesday Prayer Expenses",
  "Drinking Water",
  "Church Cleaning Expenses",
  "Conveyance Expenses",
  "Guest/Visiting Pastors",
  "Generator Expenses",
  "Church Building/Land Taxes",
  "IPC Church Registration & Membership",
  "Kerala Water Authority for water Supply",
  "Purchases"
];

function getLedgerSortWeight(subtypeName) {
  const norm = normalizeLedgerName(subtypeName);
  for (let i = 0; i < ledgerAccountsOrder.length; i++) {
    const itemNorm = normalizeLedgerName(ledgerAccountsOrder[i]);
    if (norm === itemNorm || norm.includes(itemNorm) || itemNorm.includes(norm)) {
      return i;
    }
  }
  return 999;
}

function getCanonicalLedgerHead(tx) {
  if (!tx) return 'General Expense';

  // General Body / Anniversary Meeting Expenses belongs to its designated ledger head
  if (isGeneralBodyOrAnniversaryTx(tx)) {
    return 'General Body/Anniversary Meeting Expenses';
  }

  // Exclude Monthly Meeting from ledger heads
  if (isMeetingTransaction(tx)) {
    return 'Monthly Meeting';
  }

  const genericWrappers = new Set([
    'ledger', 'payment', 'receipt', 'general', 'bank', 'cash', 'expenses', 'expense', '',
    'direct withdrawal for member', 'direct deposit for member', 'cheque issued (to cash)',
    'direct transfer / general', 'bank transaction'
  ]);

  // 1. Primary: Category column directly from Database
  let rawCategory = String(tx.category || '').trim();
  if (genericWrappers.has(rawCategory.toLowerCase())) {
    rawCategory = '';
  }

  // 2. Secondary: Subtype / Bank Subtype from Database
  let rawSubtype = String(tx.subtype || tx.subType || tx.bank_subtype || tx.bankSubtype || '').trim();
  if (genericWrappers.has(rawSubtype.toLowerCase())) {
    rawSubtype = '';
  }

  // 3. Tertiary: Type column from Database (e.g. 'Monthly Meeting', 'Charity', etc.)
  let rawType = String(tx.type || '').trim();
  if (genericWrappers.has(rawType.toLowerCase())) {
    rawType = '';
  }

  const explicitHead = rawCategory || rawSubtype || rawType;

  // If explicit database category/subtype exists, ONLY classify based on it - NEVER look at particulars/description!
  if (explicitHead) {
    const norm = normalizeLedgerName(explicitHead);

    for (let head of ledgerAccountsOrder) {
      const headNorm = normalizeLedgerName(head);
      if (norm === headNorm || norm.includes(headNorm) || headNorm.includes(norm)) {
        return head;
      }
    }

    // Common synonyms and variations
    if (norm.includes('purchase')) return 'Purchases';
    if (norm.includes('salary')) return 'Salary (Pr. T.T.Simon)';
    if (norm.includes('allowance')) return 'Allowance (Pr. T.T.Simon)';
    if (norm.includes('cleaning')) return 'Church Cleaning Expenses';
    if (norm.includes('maintenance')) return 'Church Maintenance';
    if (norm.includes('conveyance')) return 'Conveyance Expenses';
    if (norm.includes('guest') || norm.includes('visiting')) return 'Guest/Visiting Pastors';
    if (norm.includes('water') && (norm.includes('kerala') || norm.includes('authority'))) return 'Kerala Water Authority for water Supply';
    if (norm.includes('water')) return 'Drinking Water';
    if (norm.includes('parcenage') || norm.includes('parsonage')) return 'Electricity Expenses (Parcenage)';
    if (norm.includes('electricity')) return 'Electricity Expenses (Church)';
    if (norm.includes('generator')) return 'Generator Expenses';
    if (norm.includes('printing') || norm.includes('stationery')) return 'Printing and Stationery';
    if (norm.includes('supper') || norm.includes('sunday')) return "Lord's Supper/Sunday School Expenses";
    if (norm.includes('fasting') || norm.includes('wednesday') || norm.includes('prayer')) return 'Fasting/wednesday Prayer Expenses';
    if (norm.includes('tax') || norm.includes('land')) return 'Church Building/Land Taxes';
    if (norm.includes('registration') || norm.includes('membership')) return 'IPC Church Registration & Membership';
    if (norm.includes('anniversary') || norm.includes('generalbody')) return 'General Body/Anniversary Meeting Expenses';

    // If it's a specific custom category head from database, use it directly
    return explicitHead;
  }

  // 4. Last resort: only when database category/subtype is completely empty or generic
  const descNorm = normalizeLedgerName(tx.description || tx.particulars || '');
  const accNorm = normalizeLedgerName(tx.accountName || tx.account_name || '');
  if (descNorm || accNorm) {
    if (descNorm.includes('salary') || accNorm.includes('salary') || (accNorm.includes('simon') && descNorm.includes('salary'))) return 'Salary (Pr. T.T.Simon)';
    if (descNorm.includes('allowance') || accNorm.includes('allowance') || (accNorm.includes('simon') && descNorm.includes('allowance'))) return 'Allowance (Pr. T.T.Simon)';
    for (let head of ledgerAccountsOrder) {
      const headNorm = normalizeLedgerName(head);
      if (descNorm.includes(headNorm) || headNorm.includes(descNorm)) {
        return head;
      }
    }
  }

  return 'General Expense';
}

function populateLedgerSubtypeDropdown(targetCategoryToSelect = null) {
  const select = document.getElementById('ledgerSubtypeFilter');
  if (!select) return;

  const currentVal = targetCategoryToSelect || select.value || 'ALL';

  const subSet = new Set();
  (ledgerAccountsOrder || []).forEach(s => subSet.add(s));

  // Collect any custom ledger heads present in configured subtypes or DB categories
  const ledgerSubtypes = (typeof subTypesConfig !== 'undefined' && subTypesConfig["Ledger"]) ? subTypesConfig["Ledger"] : [];
  ledgerSubtypes.forEach(sub => {
    const subName = (typeof sub === 'string') ? sub : (sub ? sub.name : '');
    if (subName) {
      const canonical = getCanonicalLedgerHead({ category: subName, subtype: subName });
      if (canonical && canonical !== 'Monthly Meeting' && canonical !== 'General Expense') {
        subSet.add(canonical);
      }
    }
  });

  if (typeof window !== 'undefined' && Array.isArray(window.PG_CATEGORIES)) {
    window.PG_CATEGORIES.forEach(cat => {
      if (cat && cat.name && (!cat.type || cat.type.toLowerCase() === 'payment')) {
        const grp = (cat.group_name || '').toLowerCase();
        if (grp === 'ledger') {
          const canonical = getCanonicalLedgerHead({ category: cat.name, subtype: cat.name });
          if (canonical && canonical !== 'Monthly Meeting' && canonical !== 'General Expense') {
            subSet.add(canonical);
          }
        }
      }
    });
  }

  // Also collect any valid canonical heads present in ledger pool transactions
  const pool = (typeof getLedgerPool === 'function') ? getLedgerPool() : [];
  pool.forEach(tx => {
    const head = getCanonicalLedgerHead(tx);
    if (head && head !== 'Monthly Meeting') {
      subSet.add(head);
    }
  });

  const excluded = new Set([
    'monthly meeting', 'monthlymeeting', 'charity', 'offering', 'subscription',
    'contra', 'cash deposit (contra)', 'cash withdrawal (contra)', 'suspenses'
  ]);

  let html = '<option value="ALL">-- All Ledger Accounts --</option>';
  Array.from(subSet)
    .filter(s => {
      const sNorm = (s || '').toLowerCase().trim();
      return !excluded.has(sNorm);
    })
    .sort((a, b) => {
      const weightA = getLedgerSortWeight(a);
      const weightB = getLedgerSortWeight(b);
      if (weightA !== weightB) return weightA - weightB;
      return a.localeCompare(b);
    })
    .forEach(subName => {
      html += `<option value="${subName}">${subName}</option>`;
    });
  select.innerHTML = html;

  if (currentVal && currentVal !== 'ALL') {
    const targetNorm = normalizeLedgerName(currentVal);
    let matchedIndex = -1;
    for (let i = 0; i < select.options.length; i++) {
      const optNorm = normalizeLedgerName(select.options[i].value);
      if (optNorm === targetNorm || optNorm.includes(targetNorm) || targetNorm.includes(optNorm)) {
        matchedIndex = i;
        break;
      }
    }
    if (matchedIndex !== -1) {
      select.selectedIndex = matchedIndex;
    } else {
      select.value = 'ALL';
    }
  } else {
    select.value = 'ALL';
  }
}

function renderLedgerTabTable() {
  const tbody = document.getElementById('ledgerTableBody');
  if (!tbody) return;

  const filterSelect = document.getElementById('ledgerSubtypeFilter');
  const filterVal = filterSelect ? filterSelect.value : 'ALL';
  const searchVal = (document.getElementById('ledgerSearchInput') ? document.getElementById('ledgerSearchInput').value : '').toLowerCase().trim();

  const pool = getLedgerPool();
  const filterNorm = (filterVal !== 'ALL') ? normalizeLedgerName(filterVal) : '';

  let totalAmt = 0;
  const ledgerList = pool.filter(tx => {
    const head = getCanonicalLedgerHead(tx);
    const headNorm = normalizeLedgerName(head);
    const catNorm = normalizeLedgerName(tx.category || '');
    const subNorm = normalizeLedgerName(tx.subtype || tx.subType || tx.bank_subtype || tx.bankSubtype || '');

    if (filterVal !== 'ALL') {
      const matches = (
        headNorm === filterNorm || headNorm.includes(filterNorm) || filterNorm.includes(headNorm) ||
        (catNorm && (catNorm === filterNorm || catNorm.includes(filterNorm) || filterNorm.includes(catNorm))) ||
        (subNorm && (subNorm === filterNorm || subNorm.includes(filterNorm) || filterNorm.includes(subNorm)))
      );
      if (!matches) return false;
    }

    if (searchVal) {
      const accName = (tx.accountName || '').toLowerCase();
      const desc = (tx.description || tx.particulars || '').toLowerCase();
      const vrNo = String(tx.vrNo || '').toLowerCase();
      const sub = (tx.subtype || tx.bank_subtype || '').toLowerCase();
      const cat = (tx.category || '').toLowerCase();
      const h = head.toLowerCase();
      if (!accName.includes(searchVal) && !desc.includes(searchVal) && !vrNo.includes(searchVal) && !sub.includes(searchVal) && !h.includes(searchVal) && !cat.includes(searchVal)) {
        return false;
      }
    }

    return true;
  });

  tbody.innerHTML = '';
  if (ledgerList.length > 0) {
    const grouped = {};
    ledgerList.forEach(tx => {
      const head = getCanonicalLedgerHead(tx);
      if (!grouped[head]) grouped[head] = [];
      grouped[head].push(tx);
    });

    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const weightA = getLedgerSortWeight(a);
      const weightB = getLedgerSortWeight(b);
      if (weightA !== weightB) return weightA - weightB;
      return a.localeCompare(b);
    });

    sortedKeys.forEach(groupName => {
      const groupItems = sortTxDescending(grouped[groupName]);
      const sectionTotalAmt = groupItems.reduce((sum, tx) => sum + Number(tx.payment || tx.debit || tx.amount || tx.receipt || 0), 0);
      totalAmt += sectionTotalAmt;

      tbody.innerHTML += `
        <tr>
          <td colspan="6" style="background: #e2e8f0; font-weight: 700; padding: 8px 12px; color: #0f172a; font-size: 0.95rem; border-top: 2px solid #cbd5e1;">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <span>📂 ${groupName} <span style="font-size: 0.82rem; color: #475569; font-weight: 600; margin-left: 6px;">(${groupItems.length} ${groupItems.length === 1 ? 'Entry' : 'Entries'})</span></span>
              <span style="color: #b91c1c; font-weight: 800; font-size: 0.95rem;">Total: ${formatCurrency(sectionTotalAmt)}</span>
            </div>
          </td>
        </tr>
      `;

      groupItems.forEach(tx => {
        const cleanVr = formatVrNoClean(tx.vrNo);
        const amtVal = Number(tx.payment || tx.debit || tx.amount || tx.receipt || 0);
        const isBank = !!(tx.isBankEntry || (tx.vrNo && String(tx.vrNo).endsWith('/B')) || tx.entryType === 'Bank');
        const badgeLabel = tx.category || tx.subtype || tx.bank_subtype || groupName;

        tbody.innerHTML += `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="font-weight: 500; color: #334155; white-space: nowrap;">${formatDateHtml(tx.date)}</td>
            <td style="font-weight: 700; color: #64748b; text-align: center;">
              <span>${cleanVr}</span>
              ${isBank ? '<span style="font-size: 0.65rem; background: #dbeafe; color: #1e40af; padding: 1px 4px; border-radius: 4px; margin-left: 4px; font-weight: 700;">BANK</span>' : ''}
            </td>
            <td style="color: #0f172a;">${tx.description || tx.particulars || '-'}</td>
            <td><span class="badge" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 0.72rem; font-weight: 600;">${badgeLabel}</span></td>
            <td class="num-col pmt-val" style="font-weight: 700; color: #b91c1c; text-align: right;">${formatCurrency(amtVal)}</td>
            <td style="text-align: center; white-space: nowrap;">
              <button class="btn-action btn-table-action" style="background: #0f172a; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="openTransactionDetailModal('${cleanVr}')" title="View Details">👁️</button>
              <button class="btn-action btn-table-action" style="background: #2563eb; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="loadEntryForEdit('${cleanVr}')" title="Edit Entry">✏️</button>
              ${(tx.receipt && tx.receipt > 0 && !tx.payment) ? `<button class="btn-action btn-table-action" style="background: #059669; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="openReceiptModalByVrNo('${cleanVr}')" title="Print Receipt">🧾</button>` : `<button class="btn-action btn-table-action" style="background: #dc2626; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="openPaymentVoucherModalByVrNo('${cleanVr}')" title="Print Voucher">🧾</button>`}
            </td>
          </tr>
        `;
      });
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 24px;">No ledger account records found matching the filter</td></tr>';
  }

  if (document.getElementById('ledgerTabTotalAmount')) {
    document.getElementById('ledgerTabTotalAmount').innerText = formatCurrency(totalAmt);
  }
  if (document.getElementById('ledgerTabTxCount')) {
    document.getElementById('ledgerTabTxCount').innerText = ledgerList.length;
  }
  if (document.getElementById('ledgerTabFilterLabel')) {
    document.getElementById('ledgerTabFilterLabel').innerText = (filterVal === 'ALL') ? 'All Accounts' : filterVal;
  }
}

let _memberCodeCache = null;
function invalidateMemberCodeCache() {
  _memberCodeCache = null;
}

function getMemberCodeMap() {
  if (_memberCodeCache) return _memberCodeCache;
  const map = new Map();
  const sorted = [...membersDataStore]
    .filter(m => m && m.name)
    .sort((a, b) => compareNamesIgnoringPrefix(a.name, b.name));

  sorted.forEach((m, idx) => {
    const code = m.member_code || m.code || ('H' + String(idx + 1).padStart(2, '0'));
    const fullKey = ((m.name || '').trim() + '||' + (m.address || '').trim()).toLowerCase();
    map.set(fullKey, code);
    const nameKey = (m.name || '').trim().toLowerCase();
    if (!map.has(nameKey)) {
      map.set(nameKey, code);
    }
    if (typeof getRawName === 'function') {
      const rawKey = getRawName(m.name).toLowerCase();
      if (rawKey && !map.has(rawKey)) {
        map.set(rawKey, code);
      }
    }
  });
  _memberCodeCache = map;
  return map;
}

function getMemberCode(memberName, memberAddr) {
  if (!memberName) return '-';
  const cleanRaw = typeof getRawName === 'function' ? getRawName(memberName).toLowerCase() : memberName.toLowerCase().trim();
  const cleanAddr = normalizeAddressStr(memberAddr);

  // 1. If address is provided, find member matching BOTH name and address
  if (cleanAddr && typeof membersDataStore !== 'undefined' && Array.isArray(membersDataStore)) {
    const directWithAddr = membersDataStore.find(m => {
      if (!m || !m.name) return false;
      const mn = m.name.toLowerCase().trim();
      const mr = typeof getRawName === 'function' ? getRawName(mn).toLowerCase() : mn;
      const nameMatch = (mn === memberName.toLowerCase().trim() || mr === cleanRaw);
      if (!nameMatch) return false;
      return areAddressesMatching(m.address, cleanAddr);
    });
    if (directWithAddr && (directWithAddr.member_code || directWithAddr.code)) {
      return directWithAddr.member_code || directWithAddr.code;
    }
  }

  const map = getMemberCodeMap();
  if (cleanAddr) {
    const key = ((memberName || '').trim() + '||' + (memberAddr || '').trim()).toLowerCase();
    if (map.has(key)) return map.get(key);
  }

  // 2. Fallback to direct name match if no address or not found with address
  const directObj = (typeof membersDataStore !== 'undefined' && Array.isArray(membersDataStore))
    ? membersDataStore.find(m => {
        if (!m || !m.name) return false;
        const mn = m.name.toLowerCase().trim();
        const mr = typeof getRawName === 'function' ? getRawName(mn).toLowerCase() : mn;
        return mn === memberName.toLowerCase().trim() || mr === cleanRaw;
      })
    : null;
  if (directObj && (directObj.member_code || directObj.code)) {
    return directObj.member_code || directObj.code;
  }

  const nameKey = (memberName || '').trim().toLowerCase();
  if (map.has(nameKey)) return map.get(nameKey);
  if (map.has(cleanRaw)) return map.get(cleanRaw);
  return '-';
}

// --- MEMBER NAVIGATION & QUICK ACTION HELPERS ---
function navigateToMemberDetails(memberName, memberAddress = '') {
  switchTab('membersTab');
  selectMemberLedger(memberName, memberAddress);
}

function navigateToAddPaymentForMember(memberName, memberAddress = '', mode = 'Receipt') {
  switchTab('entryTab');
  setMode(mode);
  if (memberName) {
    selectMemberItem(memberName, memberAddress || '');
  }
}

// --- MEMBERS DIRECTORY TAB ---
function renderMembersDirectoryTab() {
  const tbody = document.getElementById('membersDirectoryBody');
  if (!tbody) return;

  const search = (document.getElementById('membersDirectorySearch') ? document.getElementById('membersDirectorySearch').value : '').toLowerCase().trim();
  const filtered = membersDataStore.filter(m =>
    !search ||
    (m.name && m.name.toLowerCase().includes(search)) ||
    (m.nickname && m.nickname.toLowerCase().includes(search)) ||
    (m.address && m.address.toLowerCase().includes(search)) ||
    (m.phone && m.phone.toLowerCase().includes(search))
  );

  const countEl = document.getElementById('membersDirectoryCount');
  if (countEl) {
    countEl.innerText = filtered.filter(m => m.status !== 'No').length;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 24px;">No members found</td></tr>';
    return;
  }

  const codeMap = getMemberCodeMap();
  const rows = filtered.map(m => {
    const escapedName = (m.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const escapedAddr = (m.address || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const escapedDocId = (m._docId || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const escapedPhone = (m.phone || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const escapedNickname = (m.nickname || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const statusObj = m.status === 'No'
      ? { bg: '#fee2e2', color: '#b91c1c', text: 'Inactive' }
      : { bg: '#d1fae5', color: '#047857', text: 'Active' };

    const fullKey = ((m.name || '').trim() + '||' + (m.address || '').trim()).toLowerCase();
    const code = codeMap.get(fullKey) || codeMap.get((m.name || '').trim().toLowerCase()) || '-';

    const displayName = formatMemberDisplayName(m.name, m.title, true, m.nickname);
    const rawName = getRawName(m.name, m.title);
    const normTitle = normalizeTitle(m.title) || 'Br.';
    const escapedRawName = rawName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const escapedTitle = normTitle.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; background: #ffffff;">
        <td style="font-weight: 700; color: #2563eb; text-align: center;">
          <a href="javascript:void(0)" onclick="navigateToMemberDetails('${escapedName}', '${escapedAddr}')" style="color: #2563eb; text-decoration: none; font-family: monospace; font-weight: 700;" title="Click to view member details & statement">${code}</a>
        </td>
        <td style="font-weight: 700; color: #0f172a;">
          <a href="javascript:void(0)" onclick="navigateToMemberDetails('${escapedName}', '${escapedAddr}')" style="color: #0f172a; text-decoration: none; border-bottom: 1px dashed #94a3b8;" title="Click to view member details & statement">${displayName}</a>
        </td>
        <td style="color: #475569;">${m.address || '-'}</td>
        <td style="color: #475569; font-family: monospace; font-size: 0.9rem;">${m.phone || '-'}</td>
        <td style="text-align: center;"><span style="background: ${statusObj.bg}; color: ${statusObj.color}; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">${statusObj.text}</span></td>
        <td style="text-align: center; white-space: nowrap;" class="editor-only">
          <button class="btn-action btn-table-action" 
            style="background: #0f172a; color: #ffffff; border: none; padding: 5px 10px; font-size: 0.78rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;" 
            onclick="navigateToMemberDetails('${escapedName}', '${escapedAddr}')" 
            title="View Member Details & Ledger">👁️ Details</button>
          <button class="btn-action btn-table-action" 
            style="background: #2563eb; color: #ffffff; border: none; padding: 5px 10px; font-size: 0.78rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;" 
            onclick="openEditMemberModal('${escapedDocId}', '${escapedRawName}', '${escapedAddr}', '${escapedPhone}', '${(m.status || 'Yes')}', '${escapedTitle}', '${escapedNickname}')" 
            title="Edit Member">✏️ Edit</button>
          <button class="btn-action btn-table-action" 
            style="background: #dc2626; color: #ffffff; border: none; padding: 5px 10px; font-size: 0.78rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;" 
            onclick="deleteMemberFromDirectory('${escapedDocId}', '${escapedName}')" 
            title="Delete Member">🗑️ Delete</button>
        </td>
      </tr>`;
  });

  tbody.innerHTML = rows.join('');
}

function renderMembersTab() {
  const sidebar = document.getElementById('membersListSidebar');
  if (!sidebar) return;

  filterMembersTabList();
}

function filterMembersTabList() {
  const sidebar = document.getElementById('membersListSidebar');
  if (!sidebar) return;

  const search = (document.getElementById('memberSearchInput') ? document.getElementById('memberSearchInput').value : '').toLowerCase().trim();

  const activeMembersSet = new Set();
  const activeNameAddrSet = new Set();

  function trackActiveMemberTx(tx) {
    let name = (tx.accountName && tx.accountName !== '-') ? tx.accountName : (tx.name && tx.name !== '-' ? tx.name : '');
    if (name) {
      const lower = name.toLowerCase().trim();
      activeMembersSet.add(lower);
      const raw = typeof getRawName === 'function' ? getRawName(lower).toLowerCase().trim() : lower;
      if (raw) activeMembersSet.add(raw);

      const rawAddr = (tx.address || (typeof resolveMemberAddress === 'function' ? resolveMemberAddress(tx) : '') || '').toLowerCase().trim();
      const normAddr = normalizeAddressStr(rawAddr);
      if (normAddr) {
        activeNameAddrSet.add(lower + '||' + normAddr);
        if (raw) activeNameAddrSet.add(raw + '||' + normAddr);
      }
    }
  }

  if (typeof currentGeneralTxList !== 'undefined') {
    currentGeneralTxList.forEach(trackActiveMemberTx);
  }
  const bankList = (typeof loadedBankBookTransactions !== 'undefined' && loadedBankBookTransactions.length > 0)
    ? loadedBankBookTransactions
    : (typeof allTimeBankBookList !== 'undefined' ? allTimeBankBookList : []);
  bankList.forEach(trackActiveMemberTx);

  // Pre-calculate name frequencies in O(N) to avoid O(N^2) inner array filtering
  const nameFreqMap = {};
  membersDataStore.forEach(dm => {
    if (dm.name) {
      const k = dm.name.toLowerCase().trim();
      nameFreqMap[k] = (nameFreqMap[k] || 0) + 1;
      const rawK = typeof getRawName === 'function' ? getRawName(k).toLowerCase().trim() : k;
      if (rawK && rawK !== k) {
        nameFreqMap[rawK] = (nameFreqMap[rawK] || 0) + 1;
      }
    }
  });

  const selNameLower = (selectedMemberName || '').toLowerCase().trim();
  const selAddrLower = (selectedMemberAddress || '').toLowerCase().trim();

  const filtered = membersDataStore.filter(m => {
    if (search) {
      return (m.name && m.name.toLowerCase().includes(search)) ||
        (m.nickname && m.nickname.toLowerCase().includes(search)) ||
        (m.address && m.address.toLowerCase().includes(search)) ||
        (m.phone && m.phone.toLowerCase().includes(search));
    }
    return true;
  });

  if (filtered.length > 0) {
    const cards = filtered.map(m => {
      const mNameLower = (m.name || '').toLowerCase().trim();
      const rawMName = typeof getRawName === 'function' ? getRawName(m.name, m.title).toLowerCase().trim() : mNameLower;
      const mAddrLower = (m.address || '').toLowerCase().trim();
      const normMAddr = normalizeAddressStr(m.address);

      const hasDuplicates = (nameFreqMap[mNameLower] || 0) > 1 || (nameFreqMap[rawMName] || 0) > 1;

      let isSel = false;
      if (selNameLower && (mNameLower === selNameLower || rawMName === getRawName(selNameLower).toLowerCase().trim())) {
        if (hasDuplicates) {
          isSel = areAddressesMatching(m.address, selectedMemberAddress);
        } else {
          isSel = true;
        }
      }

      let hasTx = false;
      if (hasDuplicates && normMAddr) {
        hasTx = activeNameAddrSet.has(mNameLower + '||' + normMAddr) ||
                activeNameAddrSet.has(rawMName + '||' + normMAddr) ||
                Array.from(activeNameAddrSet).some(k => (k.startsWith(mNameLower + '||') || k.startsWith(rawMName + '||')) && areAddressesMatching(k.split('||')[1], normMAddr));
      } else {
        hasTx = activeMembersSet.has(mNameLower) || activeMembersSet.has(rawMName);
      }
      const displayName = formatMemberDisplayName(m.name, m.title, true, m.nickname);
      const rawName = getRawName(m.name, m.title);
      const normTitle = normalizeTitle(m.title) || 'Br.';
      const escapedName = (m.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const escapedRawName = rawName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const escapedAddr = (m.address || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const escapedDocId = (m._docId || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const escapedPhone = (m.phone || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const escapedTitle = normTitle.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const escapedNickname = (m.nickname || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

      return `
        <div class="member-item-card ${isSel ? 'active' : ''}" style="padding: 10px 14px; border-radius: 10px; background: ${isSel ? '#eff6ff' : '#ffffff'}; border: 1px solid ${isSel ? '#3b82f6' : '#e2e8f0'}; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="flex: 1; cursor: pointer;" onclick="selectMemberLedger('${escapedName}', '${escapedAddr}')">
            <div style="font-weight: 700; font-size: 0.88rem; color: #0f172a;">
              👤 ${displayName}
            </div>
            <div style="font-size: 0.76rem; color: #64748b; margin-top: 2px; display: flex; justify-content: space-between; align-items: center;">
              <span>📍 ${m.address || 'No address'}</span>
              <span style="font-size: 0.68rem; font-weight: 700; color: ${hasTx ? '#059669' : '#94a3b8'}; background: ${hasTx ? '#d1fae5' : '#f1f5f9'}; padding: 1px 5px; border-radius: 4px;">${hasTx ? 'Active' : 'No Tx'}</span>
            </div>
          </div>
          <button onclick="event.stopPropagation(); openEditMemberModal('${escapedDocId}', '${escapedRawName}', '${escapedAddr}', '${escapedPhone}', '${(m.status || 'Yes')}', '${escapedTitle}', '${escapedNickname}')"
            title="Edit / Rename Member"
            style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; border-radius: 6px; padding: 4px 8px; font-size: 0.78rem; cursor: pointer; flex-shrink: 0; font-weight: 700;">✏️</button>
        </div>`;
    });

    sidebar.innerHTML = cards.join('');
    if (!selectedMemberName && filtered.length > 0) {
      selectMemberLedger(filtered[0].name, filtered[0].address || '');
    }
  } else {
    if (search) {
      sidebar.innerHTML = '<div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 0.82rem;">No matching member found</div>';
    } else {
      sidebar.innerHTML = '<div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 0.82rem;">No registered members found.</div>';
    }
    selectedMemberName = null;
    selectedMemberAddress = null;
    if (document.getElementById('mCardCode')) document.getElementById('mCardCode').innerText = "MEMBER CODE";
    if (document.getElementById('mCardName')) document.getElementById('mCardName').innerText = "Select a Member";
    if (document.getElementById('mCardAddress')) document.getElementById('mCardAddress').innerText = "Click a member from the left list to view their ledger";
    if (document.getElementById('mCardMeta')) document.getElementById('mCardMeta').innerHTML = "";
    if (document.getElementById('mCardTotal')) document.getElementById('mCardTotal').innerText = "₹0.00";
    if (document.getElementById('memberTransactionsBody')) document.getElementById('memberTransactionsBody').innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 24px;">No ledger transactions recorded in this financial year.</td></tr>';
  }
}

function getMemberGroupedTransactions(mName, mAddrTarget = '') {
  const bankList = (typeof loadedBankBookTransactions !== 'undefined' && loadedBankBookTransactions.length > 0)
    ? loadedBankBookTransactions
    : (typeof allTimeBankBookList !== 'undefined' ? filterListByFY(allTimeBankBookList) : []);

  const seenTxIds = new Set();
  const seenSplitGroupIds = new Set();
  const seenVrKeys = new Set();
  const mTxList = [];

  // 1. Process General / Cash Book & Ledger transactions
  (currentGeneralTxList || []).forEach(tx => {
    if (isTxMatchingMember(tx, mName, mAddrTarget)) {
      const txId = String(tx.id || tx._docId || '').trim();
      if (txId && seenTxIds.has(txId)) return;

      const rawVr = String(tx.vrNo || '').trim();
      const cleanVr = typeof normalizeVrLocally === 'function' ? normalizeVrLocally(rawVr) : rawVr.toLowerCase();
      const isPmt = (tx.payment && tx.payment > 0) || (tx.mode === 'Payment');
      const modeStr = isPmt ? 'Payment' : 'Receipt';

      if (txId) seenTxIds.add(txId);
      if (tx.splitGroupId) seenSplitGroupIds.add(String(tx.splitGroupId).trim());
      if (cleanVr && cleanVr !== '-' && cleanVr !== '--') {
        seenVrKeys.add(`${cleanVr}_${tx.date || ''}_${modeStr}`);
      }

      mTxList.push(tx);
    }
  });

  // 2. Process Bank transactions (carefully avoiding duplicates from general txs)
  (bankList || []).forEach(tx => {
    if (isTxMatchingMember(tx, mName, mAddrTarget)) {
      const txId = String(tx.id || tx._docId || '').trim();
      const linkedCashId = String(tx.cashId || tx.cash_id || '').trim();

      // If this transaction was already added in general transactions by ID, skip it!
      if (txId && (seenTxIds.has(txId) || seenTxIds.has(linkedCashId))) return;

      // If this bank transaction belongs to a split group already captured in general txs, skip it!
      if (tx.splitGroupId && seenSplitGroupIds.has(String(tx.splitGroupId).trim())) return;

      const rawVr = String(tx.vrNo || '').trim();
      const cleanVr = typeof normalizeVrLocally === 'function' ? normalizeVrLocally(rawVr) : rawVr.toLowerCase();
      const isCredit = (tx.credit > 0 || tx.receipt > 0 || (tx.mode || '').includes('Credit') || (tx.mode || '').includes('Receipt'));
      const modeStr = isCredit ? 'Receipt' : 'Payment';

      // If a general tx with this exact Vr No, date and mode is already recorded, skip mirror/contra bank duplicate!
      if (cleanVr && cleanVr !== '-' && cleanVr !== '--') {
        const vrKey = `${cleanVr}_${tx.date || ''}_${modeStr}`;
        if (seenVrKeys.has(vrKey)) return;
        seenVrKeys.add(vrKey);
      }

      if (txId) seenTxIds.add(txId);

      mTxList.push({
        ...tx,
        receipt: Number(tx.receipt || tx.credit || 0),
        payment: Number(tx.payment || tx.debit || 0),
        isBankEntry: true
      });
    }
  });

  const groupedMap = {};
  const result = [];

  mTxList.forEach(tx => {
    let rawVr = tx.vrNo || '';
    let cleanVr = typeof normalizeVrLocally === 'function' ? normalizeVrLocally(rawVr) : rawVr.trim().toLowerCase();
    let isBlankVr = !cleanVr || cleanVr === '-' || cleanVr === '--' || cleanVr === 'ob';

    let groupingKey;
    if (tx.splitGroupId) {
      groupingKey = 'split_' + tx.splitGroupId;
    } else if (tx.transactionId && String(tx.transactionId).trim() !== '') {
      groupingKey = 'txid_' + tx.transactionId;
    } else if (!isBlankVr) {
      const mode = (tx.payment && tx.payment > 0) ? 'Payment' : 'Receipt';
      groupingKey = cleanVr + '_' + (tx.date || '') + '_' + mode;
    } else if (tx.isSplitEntry) {
      groupingKey = 'split_legacy_' + (tx.date || '') + '_' + (tx.accountName || '') + '_' + (tx.mode || '') + '_' + (tx.splitTotalAmount || '');
    } else {
      groupingKey = 'unique_' + (tx.id || Math.random());
    }

    const rcpt = Number(tx.receipt || 0);
    const pmt = Number(tx.payment || tx.payments || 0);
    const isPmt = (pmt > 0);
    const amt = isPmt ? pmt : rcpt;

    let dStr = (tx.description || tx.subtype || tx.type || '').trim();
    let typeStr = (tx.subtype && tx.subtype !== '-' && tx.subtype !== 'General') ? tx.subtype : (tx.type || '').trim();

    if (!groupedMap[groupingKey]) {
      const newTx = Object.assign({}, tx);
      newTx.receipt = rcpt;
      newTx.payment = pmt;
      newTx.amount = amt;
      newTx.allVrNos = rawVr ? [rawVr] : [];
      newTx.allTxIds = tx.id ? [String(tx.id)] : [];
      newTx._splitItems = [tx];
      newTx._descParts = [];
      if (dStr) {
        newTx._descParts.push({ text: dStr, amount: amt, type: typeStr });
      }
      newTx._types = typeStr ? [typeStr] : [];
      groupedMap[groupingKey] = newTx;
      result.push(newTx);
    } else {
      const target = groupedMap[groupingKey];
      // CRITICAL: Avoid adding if this exact tx ID is already in target.allTxIds!
      if (tx.id && target.allTxIds.includes(String(tx.id))) {
        return;
      }
      target.receipt += rcpt;
      target.payment += pmt;
      target.amount = (target.receipt || target.payment);
      if (rawVr && !target.allVrNos.includes(rawVr)) target.allVrNos.push(rawVr);
      if (tx.id) target.allTxIds.push(String(tx.id));
      target._splitItems.push(tx);

      if (dStr) {
        target._descParts.push({ text: dStr, amount: amt, type: typeStr });
      }
      if (typeStr && !target._types.includes(typeStr)) {
        target._types.push(typeStr);
      }
    }
  });

  result.forEach(tx => {
    if (tx._splitItems && tx._splitItems.length > 1) {
      const descStrings = tx._descParts.map(p => {
        const amtStr = typeof formatCurrencyNoDecimals === 'function' ? formatCurrencyNoDecimals(p.amount) : ('₹' + p.amount);
        return `${p.text} (${amtStr})`;
      });
      tx.description = descStrings.join(' + ');

      if (tx._types.length === 1) {
        tx.categoryDisplay = tx._types[0];
      } else if (tx._types.length > 1) {
        tx.categoryDisplay = 'Split (' + tx._types.join(', ') + ')';
      } else {
        tx.categoryDisplay = 'Split Receipt';
      }
    } else {
      let cat = tx.subtype || tx.type || (tx.description === '[CANCELLED]' ? 'Cancelled' : 'Subscription');
      if ((tx.type || '').toLowerCase() === 'charity') {
        cat = (tx.payment && tx.payment > 0) ? 'Charity Paid' : 'Charity Received';
      }
      tx.categoryDisplay = cat;
    }
  });

  return result;
}

function selectMemberLedger(mName, mAddr = '') {
  selectedMemberName = mName;
  selectedMemberAddress = mAddr;

  const mNameLower = (mName || '').toLowerCase().trim();
  const mObj = getMemberObject(mName, mAddr);
  const displayAddress = mObj.address || mAddr || activeMembersMap[mNameLower] || "Not specified";
  const code = getMemberCode(mObj.name || mName, displayAddress);

  if (document.getElementById('mCardCode')) {
    document.getElementById('mCardCode').innerText = `MEMBER CODE: ${code}`;
  }
  if (document.getElementById('mCardName')) {
    document.getElementById('mCardName').innerText = formatMemberDisplayName(mObj.name || mName, mObj.title, true, mObj.nickname);
  }
  if (document.getElementById('mCardAddress')) {
    document.getElementById('mCardAddress').innerText = "📍 Address: " + displayAddress;
  }
  if (document.getElementById('mCardMeta')) {
    const statusText = mObj.status === 'No' ? '🔴 Inactive' : '🟢 Active Member';
    const rawP = mObj.phone || (membersDataStore.find(m => m.name && m.name.toLowerCase() === mNameLower) || {}).phone || '';
    const cleanedP = cleanPhoneForWhatsApp(rawP);
    const phoneText = rawP ? `📞 ${rawP}` : '📞 No phone';
    const waButtonHtml = cleanedP
      ? `<button onclick="event.stopPropagation(); shareMemberLedgerWhatsApp()" style="background: #25d366; color: #ffffff; border: none; font-size: 0.78rem; font-weight: 700; padding: 3px 9px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; margin-left: 8px;" title="Send Member Statement on WhatsApp">🟢 WhatsApp</button>`
      : '';
    document.getElementById('mCardMeta').innerHTML = `<span>${phoneText}</span>${waButtonHtml}<span style="margin: 0 6px; color: #475569;">|</span><span>${statusText}</span>`;
  }

  filterMembersTabList();

  const mTxList = getMemberGroupedTransactions(mName, displayAddress);
  let totalContrib = 0;
  const tbody = document.getElementById('memberTransactionsBody');
  tbody.innerHTML = '';

  if (mTxList.length > 0) {
    mTxList.forEach(tx => {
      const isPayment = (tx.payment && tx.payment > 0);
      const amt = tx.receipt || tx.payment || 0;
      totalContrib += (tx.receipt || 0);
      const cleanVr = formatVrNoClean(tx.vrNo);

      const isBankTx = tx.isBankEntry || (tx.entryType && String(tx.entryType).toLowerCase() === 'bank') || (tx.vrNo && String(tx.vrNo).endsWith('/B'));
      const entryTypeParam = isBankTx ? 'Bank' : 'Cash';
      const printBtnHtml = isPayment
        ? `<button class="btn-action btn-table-action" style="background: #dc2626; color: #ffffff; border: none;" onclick="openPaymentVoucherModalByVrNo('${cleanVr}', '${tx.id}', '${entryTypeParam}')" title="Print Payment Voucher">🧾</button>`
        : `<button class="btn-action btn-table-action" style="background: #059669; color: #ffffff; border: none;" onclick="openReceiptModalByVrNo('${cleanVr}', '${tx.id}', '${entryTypeParam}')" title="Print Receipt">🧾</button>`;

      let categoryName = tx.categoryDisplay || tx.subtype || tx.type || (tx.description === '[CANCELLED]' ? 'Cancelled' : 'Subscription');

      tbody.innerHTML += `
            <tr>
              <td style="font-weight: 600; white-space: nowrap;">${formatDateHtml(tx.date)}</td>
              <td style="font-weight: 700; text-align: center;">${cleanVr}</td>
              <td style="line-height: 1.3;">
                <div>${tx.description || '-'}</div>
                ${(tx.address && tx.address !== '-' && tx.address.toLowerCase() !== 'not specified' && tx.address.toLowerCase() !== 'no address') ? `<div style="font-size: 0.72rem; color: #0284c7; margin-top: 2px; font-weight: 600;">📍 ${tx.address}</div>` : ''}
              </td>
              <td><span class="badge" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; font-size: 0.7rem; padding: 2px 5px;">${categoryName}</span></td>
              <td class="num-col ${isPayment ? 'exp-val' : 'rcpt-val'}" style="font-weight: 700;">${formatCurrencyNoDecimals(amt)}</td>
              <td style="text-align: center; white-space: nowrap;">
                <button class="btn-action btn-table-action" style="background: #0f172a; color: #ffffff; border: none; margin-right: 2px;" onclick="openTransactionDetailModal('${cleanVr}', '${tx.id}', '${entryTypeParam}')" title="View Details">👁️</button>
                <button class="btn-action btn-table-action" style="background: #2563eb; color: #ffffff; border: none; margin-right: 2px;" onclick="loadEntryForEdit('${cleanVr}', '${tx.id}', '${entryTypeParam}')" title="Edit Entry">✏️</button>
                ${printBtnHtml}
              </td>
            </tr>
          `;
    });
  } else {
    const escName = (mObj.name || mName || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const escAddr = (displayAddress || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: #64748b; padding: 32px 16px;">
          <div style="font-size: 1.05rem; font-weight: 700; color: #334155; margin-bottom: 6px;">No ledger transactions recorded for this member in this financial year</div>
          <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 16px;">Record a new payment or receipt for this member using the buttons below:</div>
          <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
            <button class="btn-action" style="background: #059669; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer;" onclick="navigateToAddPaymentForMember('${escName}', '${escAddr}', 'Receipt')">
              ↓ Add Receipt / Contribution
            </button>
            <button class="btn-action" style="background: #ea580c; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer;" onclick="navigateToAddPaymentForMember('${escName}', '${escAddr}', 'Payment')">
              ↑ Add Payment Out
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  document.getElementById('mCardTotal').innerText = formatCurrencyNoDecimals(totalContrib);
}

// ============================================================
// EDIT / RENAME MEMBER FUNCTIONS
// ============================================================

function deleteMemberFromDirectory(docId, name) {
  const memberTxs = allTimeTxList.filter(tx => tx.accountName && tx.accountName.toLowerCase() === name.toLowerCase());
  const txCount = memberTxs.length;

  const receiptNumbers = memberTxs.map(tx => tx.vrNo).slice(0, 15).join(', ') + (txCount > 15 ? '...' : '');

  const confirmMsg = txCount > 0
    ? `Are you sure you want to delete member <b>${name}</b>?<br><br>They have <b>${txCount}</b> transaction(s) recorded: <br><span style="font-size:0.85rem; color:#64748b; display:inline-block; margin-top:8px;">${receiptNumbers}</span><br><br>The transactions will NOT be deleted, but the member will be removed from the directory.`
    : `Are you sure you want to delete member <b>${name}</b>?`;

  showCustomConfirm(confirmMsg, () => {
    showGlobalLoading('Deleting member...');

    const deletePromise = docId
      ? db.collection('members').doc(docId).delete()
      : db.collection('members').where('name', '==', name).get().then(snap => {
        if (!snap.empty) return snap.docs[0].ref.delete();
      });

    deletePromise.then(() => {
      membersDataStore = membersDataStore.filter(m => m._docId !== docId && m.name !== name);
      delete activeMembersMap[name.toLowerCase()];

      hideGlobalLoading();
      showAlert(`✅ Member "${name}" deleted successfully!`, 'success');

      renderMembersDirectoryTab();
      renderMembersTab();
    }).catch(err => {
      hideGlobalLoading();
      showAlert('❌ Error deleting member: ' + (err.message || err), 'error');
    });
  }, "Delete Member", "Delete", true);
}

function openEditMemberModal(docId, name, address, phone, status, title, nickname) {
  try {
    // 1. Fetch from membersDataStore if title or nickname are missing
    if (docId && typeof membersDataStore !== 'undefined' && Array.isArray(membersDataStore)) {
      const found = membersDataStore.find(m => String(m.id) === String(docId) || String(m._docId) === String(docId));
      if (found) {
        if (!title && found.title) title = found.title;
        if (!nickname && found.nickname) nickname = found.nickname;
        if (!name && found.name) name = found.name;
        if (!address && found.address) address = found.address;
        if (!phone && found.phone) phone = found.phone;
        if (!status && found.status) status = found.status;
      }
    }

    // 2. Fallback: extract title from name prefix if not found
    if (!title && name) {
      if (/^Br\.?\b|^Brother\b|^Bro\.?\b/i.test(name)) title = 'Br.';
      else if (/^Pr\.?\b|^Pastor\b/i.test(name)) title = 'Pr.';
      else if (/^Sr\.?\b|^Sister\b|^Sis\.?\b/i.test(name)) title = 'Sr.';
      else if (/^Evg\.?\b|^Evangelist\b/i.test(name)) title = 'Evg.';
    }

    const normTitle = normalizeTitle(title);
    const rawName = getRawName(name, normTitle);

    if (document.getElementById('editMemberDocId')) document.getElementById('editMemberDocId').value = docId || '';
    if (document.getElementById('editMemberOldName')) document.getElementById('editMemberOldName').value = name || '';
    if (document.getElementById('editMemberOldAddress')) document.getElementById('editMemberOldAddress').value = address || '';
    if (document.getElementById('editMemberTitle')) document.getElementById('editMemberTitle').value = normTitle || '';
    if (document.getElementById('editMemberName')) document.getElementById('editMemberName').value = rawName || '';
    if (document.getElementById('editMemberNickname')) document.getElementById('editMemberNickname').value = nickname || '';
    if (document.getElementById('editMemberAddress')) document.getElementById('editMemberAddress').value = address || '';
    if (document.getElementById('editMemberPhone')) {
      populatePhoneInput('editMemberPhone', phone || '');
      syncPhonePrefixUI();
    }
    if (document.getElementById('editMemberStatus')) document.getElementById('editMemberStatus').value = status || 'Yes';
    const modal = document.getElementById('editMemberModal');
    if (modal) modal.style.display = 'flex';
  } catch (e) {
    console.error("Error opening edit member modal:", e);
    alert("Failed to open Edit Member modal: " + e.message);
  }
}

function closeEditMemberModal() {
  const modal = document.getElementById('editMemberModal');
  if (modal) modal.style.display = 'none';
}

function submitEditMember(e) {
  e.preventDefault();

  const docId = document.getElementById('editMemberDocId') ? document.getElementById('editMemberDocId').value.trim() : '';
  const oldName = document.getElementById('editMemberOldName') ? document.getElementById('editMemberOldName').value.trim() : '';
  const oldAddress = document.getElementById('editMemberOldAddress') ? document.getElementById('editMemberOldAddress').value.trim() : '';

  const rawNewName = document.getElementById('editMemberName') ? document.getElementById('editMemberName').value.trim() : '';
  const newTitle = document.getElementById('editMemberTitle') ? document.getElementById('editMemberTitle').value : '';
  const normTitle = normalizeTitle(newTitle);
  const cleanRawName = getRawName(rawNewName, normTitle);
  const newName = cleanRawName;
  const newNickname = document.getElementById('editMemberNickname') ? document.getElementById('editMemberNickname').value.trim() : '';

  const newAddress = document.getElementById('editMemberAddress') ? document.getElementById('editMemberAddress').value.trim() : '';
  const newPhone = getFormattedPhoneToSave('editMemberPhone');
  const newStatus = document.getElementById('editMemberStatus') ? document.getElementById('editMemberStatus').value : 'Yes';

  if (!rawNewName) { alert('Name is required.'); return; }

  const btn = document.getElementById('btnSubmitEditMember');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Saving... ⏳';
  }
  showGlobalLoading('Updating member & syncing transactions...');

  const nameChanged = (newName.trim().toLowerCase() !== oldName.trim().toLowerCase());
  const addressChanged = (newAddress.trim().toLowerCase() !== oldAddress.trim().toLowerCase());

  // Step 1: Update the member document
  const memberRef = docId
    ? db.collection('members').doc(docId)
    : db.collection('members').where('name', '==', oldName).limit(1);

  const updateMemberPromise = docId
    ? db.collection('members').doc(docId).update({ name: newName, title: normTitle, nickname: newNickname, address: newAddress, phone: newPhone, status: newStatus })
    : db.collection('members').where('name', '==', oldName).get().then(snap => {
      if (!snap.empty) {
        return snap.docs[0].ref.update({ name: newName, title: normTitle, nickname: newNickname, address: newAddress, phone: newPhone, status: newStatus });
      }
    });

  updateMemberPromise.then(() => {
    // Step 2: If name changed, update all matching transactions
    if (!nameChanged && !addressChanged) {
      return Promise.resolve();
    }

    // Find all transactions that match the old name
    return db.collection('transactions').where('accountName', '==', oldName).get().then(snap => {
      if (snap.empty) return Promise.resolve();

      const batch = db.batch();
      snap.docs.forEach(doc => {
        const txData = doc.data();
        const updateData = {};
        if (nameChanged) updateData.accountName = newName;
        // Only update address on tx if tx had the old address (don't overwrite custom addresses)
        if (addressChanged && (!txData.address || txData.address.trim().toLowerCase() === oldAddress.trim().toLowerCase())) {
          updateData.address = newAddress;
        }
        if (Object.keys(updateData).length > 0) {
          batch.update(doc.ref, updateData);
        }
      });
      return batch.commit();
    });
  })
    .then(() => {
      try {
        // Update in-memory stores
        if (membersDataStore && Array.isArray(membersDataStore)) {
          const mIdx = membersDataStore.findIndex(m => m && ((m._docId && m._docId === docId) || (m.name && m.name.toLowerCase() === oldName.toLowerCase())));
          if (mIdx !== -1) {
            membersDataStore[mIdx].name = newName;
            membersDataStore[mIdx].title = newTitle;
            membersDataStore[mIdx].nickname = newNickname;
            membersDataStore[mIdx].address = newAddress;
            membersDataStore[mIdx].phone = newPhone;
            membersDataStore[mIdx].status = newStatus;
          }
        }

        // Rebuild activeMembersMap
        activeMembersMap = {};
        if (membersDataStore && Array.isArray(membersDataStore)) {
          membersDataStore.forEach(m => { if (m && m.name) activeMembersMap[m.name.toLowerCase()] = m.address; });
        }

        // Update all in-memory transactions
        if (nameChanged) {
          [allTimeGeneralTxList, allTimeTxList].forEach(list => {
            if (Array.isArray(list)) {
              list.forEach(tx => {
                if (tx && (tx.accountName || '').trim().toLowerCase() === oldName.toLowerCase()) {
                  tx.accountName = newName;
                  if (addressChanged && (!tx.address || (tx.address || '').trim().toLowerCase() === oldAddress.toLowerCase())) {
                    tx.address = newAddress;
                  }
                }
              });
            }
          });
          if (typeof filterListByFY === 'function') {
            currentLoadedTxList = filterListByFY(allTimeTxList);
            currentGeneralTxList = filterListByFY(allTimeGeneralTxList);
          }
        }

        // If selected member was the renamed one, update selection
        if (selectedMemberName && typeof selectedMemberName.toLowerCase === 'function' && selectedMemberName.toLowerCase() === oldName.toLowerCase()) {
          selectedMemberName = newName;
          selectedMemberAddress = newAddress;
        }

        // Sync Add Entry form inputs if they match the updated member
        const accountInput = document.getElementById('accountName');
        const addressInput = document.getElementById('addressInput');
        const addressText = document.getElementById('addressText');
        if (accountInput && accountInput.value && accountInput.value.trim().toLowerCase() === oldName.toLowerCase()) {
          accountInput.value = newName;
          if (addressInput) addressInput.value = newAddress;
          if (addressText) {
            addressText.innerText = newAddress || '(No address recorded)';
            addressText.style.color = "#0f172a";
          }
        }

        // Sync Edit Entry form inputs if they match the updated member
        const editAccountInput = document.getElementById('edit_accountName');
        const editAddressInput = document.getElementById('edit_addressInput');
        const editAddressText = document.getElementById('edit_addressText');
        if (editAccountInput && editAccountInput.value && editAccountInput.value.trim().toLowerCase() === oldName.toLowerCase()) {
          editAccountInput.value = newName;
          if (editAddressInput) editAddressInput.value = newAddress;
          if (editAddressText) {
            editAddressText.innerText = newAddress || '(No address recorded)';
            editAddressText.style.color = "#0f172a";
          }
        }

        // Update edit member button visibilities
        if (typeof updateEditMemberButtonsVisibility === 'function') {
          updateEditMemberButtonsVisibility();
        }

        hideGlobalLoading();
        if (btn) {
          btn.disabled = false;
          btn.innerText = 'Save Changes';
        }
        closeEditMemberModal();

        const txCount = nameChanged ? ' (all transactions updated)' : '';
        showAlert('✅ Member updated successfully!' + txCount, 'success');

        if (typeof renderMembersTab === 'function') renderMembersTab();
        if (typeof selectMemberLedger === 'function') selectMemberLedger(newName, newAddress);
        if (typeof renderRecentTransactions === 'function') renderRecentTransactions();
      } catch (e) {
        console.error("Error in submitEditMember post-save logic:", e);
        alert("Error syncing client-side update: " + e.message);
        closeEditMemberModal();
        hideGlobalLoading();
        if (btn) {
          btn.disabled = false;
          btn.innerText = 'Save Changes';
        }
      }
    })
    .catch(err => {
      hideGlobalLoading();
      if (btn) {
        btn.disabled = false;
        btn.innerText = 'Save Changes';
      }
      alert('❌ Error: ' + (err.message || err));
    });
}

function openEditMemberForEntry() {
  const nameVal = document.getElementById('accountName').value.trim();
  const addrVal = document.getElementById('addressInput').value.trim();
  if (!nameVal) {
    showAlert('⚠️ Please select or type a member name first.', 'error');
    return;
  }
  const matches = membersDataStore.filter(m => m.name && m.name.toLowerCase().trim() === nameVal.toLowerCase());
  if (matches.length === 0) {
    showAlert('⚠️ Member not found in system directory.', 'error');
    return;
  }
  let member = matches[0];
  if (matches.length > 1) {
    const matched = matches.find(m => (m.address || '').toLowerCase().trim() === addrVal.toLowerCase());
    if (matched) {
      member = matched;
    }
  }
  openEditMemberModal(member._docId || member.id, member.name, member.address, member.phone, member.status || 'Yes', member.title || '', member.nickname || '');
}

function openEditMemberForEditEntry() {
  const nameVal = document.getElementById('edit_accountName').value.trim();
  const addrVal = document.getElementById('edit_addressInput').value.trim();
  if (!nameVal) {
    showAlert('⚠️ Please select or type a member name first.', 'error');
    return;
  }
  const matches = membersDataStore.filter(m => m.name && m.name.toLowerCase().trim() === nameVal.toLowerCase());
  if (matches.length === 0) {
    showAlert('⚠️ Member not found in system directory.', 'error');
    return;
  }
  let member = matches[0];
  if (matches.length > 1) {
    const matched = matches.find(m => (m.address || '').toLowerCase().trim() === addrVal.toLowerCase());
    if (matched) {
      member = matched;
    }
  }
  openEditMemberModal(member._docId || member.id, member.name, member.address, member.phone, member.status || 'Yes', member.title || '', member.nickname || '');
}

function updateEditMemberButtonsVisibility() {
  try {
    const nameVal = document.getElementById('accountName') ? document.getElementById('accountName').value.trim() : '';
    const editBtn = document.getElementById('editMemberBtn');
    if (editBtn) {
      const hasMember = nameVal && membersDataStore && Array.isArray(membersDataStore)
        ? membersDataStore.some(m => m && m.name && m.name.toLowerCase().trim() === nameVal.toLowerCase())
        : false;
      editBtn.style.display = hasMember ? 'inline-block' : 'none';
    }

    const editEntryNameVal = document.getElementById('edit_accountName') ? document.getElementById('edit_accountName').value.trim() : '';
    const editEntryBtn = document.getElementById('editEntry_editMemberBtn');
    if (editEntryBtn) {
      const hasEditMember = editEntryNameVal && membersDataStore && Array.isArray(membersDataStore)
        ? membersDataStore.some(m => m && m.name && m.name.toLowerCase().trim() === editEntryNameVal.toLowerCase())
        : false;
      editEntryBtn.style.display = hasEditMember ? 'inline-block' : 'none';
    }
  } catch (e) {
    console.warn("Error updating edit member buttons visibility:", e);
  }
}

// (Redundant first definition of openAddMemberModal / submitNewMember removed to avoid duplication)

// --- OFFERING TAB ---
function renderOfferingTabTable() {
  const tbody = document.getElementById('offeringTableBody');
  if (!tbody) return;

  const offeringList = currentGeneralTxList.filter(tx => tx.type === 'Offering');
  tbody.innerHTML = '';

  let totalAmt = 0;
  if (offeringList.length > 0) {
    offeringList.forEach(tx => {
      const cleanDate = formatDateClean(tx.date);
      const cleanVr = formatVrNoClean(tx.vrNo);
      const amt = tx.receipt || tx.payment || 0;
      totalAmt += amt;

      tbody.innerHTML += `
            <tr>
              <td style="font-weight: 600; white-space: nowrap;">${formatDateHtml(tx.date)}</td>
              <td style="font-weight: 700; text-align: center;">${cleanVr}</td>
              <td style="line-height: 1.4;">${tx.accountName && tx.accountName !== '-' ? `<span style="font-weight:600;color:#0f172a;">${tx.accountName}</span><br><span style="font-size:0.85rem;color:#64748b;">${tx.description || 'Offertory / Offering'}</span>` : (tx.description || 'Offertory / Offering')}</td>
              <td class="num-col rcpt-val" style="font-weight: 700;">${formatCurrency(amt)}</td>
              <td style="text-align: center; white-space: nowrap;">
                <button class="btn-action btn-table-action" style="background: #0f172a; color: #ffffff; border: none;" onclick="openTransactionDetailModal('${cleanVr}')" title="View Details">👁️</button>
                <button class="btn-action btn-table-action" style="background: #2563eb; color: #ffffff; border: none;" onclick="loadEntryForEdit('${cleanVr}')" title="Edit Entry">✏️</button>
                <button class="btn-action btn-table-action" style="background: #059669; color: #ffffff; border: none;" onclick="openReceiptModalByVrNo('${cleanVr}')" title="Print Receipt">🧾</button>
              </td>
            </tr>
          `;
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">No offering entries recorded</td></tr>';
  }

  if (document.getElementById('offeringTabTotalAmount')) {
    document.getElementById('offeringTabTotalAmount').innerText = formatCurrency(totalAmt);
  }
}

// --- CHARITY TAB ---
function setCharityTabMode(mode) {
  selectedCharityMode = mode;

  renderCharityTabTable();
}

function getCharityTransactionsPool() {
  const pool = [];
  const seenKeys = new Set();

  function addCharityTx(tx, splitIdx = -1, overrideItem = null) {
    const rawId = tx.id || tx.vrNo || (tx.date + '_' + tx.amount);
    const key = splitIdx >= 0 ? `${rawId}_charity_split_${splitIdx}` : `charity_tx_${rawId}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);

    const isRcpt = overrideItem
      ? ((overrideItem.subtype && overrideItem.subtype.toLowerCase().includes('received')) || (!overrideItem.subtype && (Number(overrideItem.receipt || overrideItem.amt || overrideItem.amount || 0) > 0 || Number(tx.receipt || 0) > 0)))
      : ((tx.subtype && tx.subtype.toLowerCase().includes('received')) || (!tx.subtype && Number(tx.receipt || 0) > 0));

    let sub = overrideItem ? (overrideItem.subtype || (isRcpt ? 'Charity Received' : 'Charity Paid')) : (tx.subtype || (isRcpt ? 'Charity Received' : 'Charity Paid'));
    if (sub.toLowerCase() === 'received' || sub.toLowerCase() === 'charity received') sub = 'Charity Received';
    else if (sub.toLowerCase() === 'paid' || sub.toLowerCase() === 'charity paid') sub = 'Charity Paid';

    const amt = overrideItem ? Number(overrideItem.amount || overrideItem.amt || 0) : Number(tx.receipt || tx.payment || tx.amount || 0);
    if (amt <= 0) return;

    pool.push({
      ...tx,
      id: splitIdx >= 0 ? `${tx.id}_charity_${splitIdx}` : tx.id,
      amount: amt,
      receipt: isRcpt ? amt : 0,
      payment: !isRcpt ? amt : 0,
      type: 'Charity',
      subtype: sub,
      description: overrideItem ? (overrideItem.description || overrideItem.desc || tx.description || '') : (tx.description || '')
    });
  }

  // 1. Scan currentGeneralTxList (Cash / General transactions)
  (currentGeneralTxList || []).forEach(tx => {
    const typeLower = (tx.type || '').toLowerCase();
    const subLower = (tx.subtype || '').toLowerCase();
    const isCharity = typeLower === 'charity' || subLower.includes('charity');

    const splitItems = (Array.isArray(tx.splitItems) && tx.splitItems.length > 0)
      ? tx.splitItems
      : ((Array.isArray(tx._splitItems) && tx._splitItems.length > 0) ? tx._splitItems : null);

    if (splitItems && splitItems.length > 0) {
      let foundSplit = false;
      splitItems.forEach((it, idx) => {
        const itType = (it.type || it.category || '').toLowerCase();
        const itSub = (it.subtype || '').toLowerCase();
        if (itType === 'charity' || itSub.includes('charity')) {
          foundSplit = true;
          addCharityTx(tx, idx, it);
        }
      });
      if (!foundSplit && isCharity) {
        addCharityTx(tx);
      }
    } else if (isCharity) {
      addCharityTx(tx);
    }
  });

  // 2. Scan loadedBankBookTransactions (Bank Transactions)
  (loadedBankBookTransactions || []).forEach(tx => {
    const typeLower = (tx.type || '').toLowerCase();
    const subLower = (tx.subtype || '').toLowerCase();
    const isCharity = typeLower === 'charity' || subLower.includes('charity');

    const splitItems = (Array.isArray(tx.splitItems) && tx.splitItems.length > 0)
      ? tx.splitItems
      : ((Array.isArray(tx._splitItems) && tx._splitItems.length > 0) ? tx._splitItems : null);

    if (splitItems && splitItems.length > 0) {
      let foundSplit = false;
      splitItems.forEach((it, idx) => {
        const itType = (it.type || it.category || '').toLowerCase();
        const itSub = (it.subtype || '').toLowerCase();
        if (itType === 'charity' || itSub.includes('charity')) {
          foundSplit = true;
          addCharityTx(tx, idx, it);
        }
      });
      if (!foundSplit && isCharity) {
        addCharityTx(tx);
      }
    } else if (isCharity) {
      addCharityTx(tx);
    }
  });

  return pool;
}

function renderCharityTabTable() {
  const tbody = document.getElementById('charityTableBody');
  if (!tbody) return;

  const searchVal = (document.getElementById('charitySearchInput') ? document.getElementById('charitySearchInput').value : '').toLowerCase().trim();

  let totalAmt = 0;
  const charityPool = getCharityTransactionsPool();
  const list = charityPool.filter(tx => {
    let matchesMode = true;
    if (selectedCharityMode !== 'All') {
      if (selectedCharityMode === 'Received') {
        matchesMode = (tx.subtype && tx.subtype.toLowerCase().includes('received')) || (!tx.subtype && tx.receipt > 0);
      } else {
        matchesMode = (tx.subtype && tx.subtype.toLowerCase().includes('paid')) || (!tx.subtype && tx.payment > 0);
      }
    }
    if (!matchesMode) return false;

    if (searchVal) {
      const accName = (tx.accountName || '').toLowerCase();
      const desc = (tx.description || '').toLowerCase();
      const addr = (tx.address || activeMembersMap[(tx.accountName || '').toLowerCase()] || '').toLowerCase();
      const vrNo = String(tx.vrNo || '').toLowerCase();
      if (!accName.includes(searchVal) && !desc.includes(searchVal) && !addr.includes(searchVal) && !vrNo.includes(searchVal)) {
        return false;
      }
    }
    return true;
  });

  tbody.innerHTML = '';
  if (list.length > 0) {
    const grouped = {};
    list.forEach(tx => {
      const isRcpt = (tx.subtype && tx.subtype.toLowerCase().includes('received')) || (!tx.subtype && tx.receipt > 0);
      let sub = (tx.subtype || '').trim();
      if (sub.toLowerCase() === 'received' || sub.toLowerCase() === 'charity received') {
        sub = 'Charity Received';
      } else if (sub.toLowerCase() === 'paid' || sub.toLowerCase() === 'charity paid') {
        sub = 'Charity Paid';
      } else if (!sub) {
        sub = isRcpt ? 'Charity Received' : 'Charity Paid';
      }
      if (!grouped[sub]) grouped[sub] = [];
      grouped[sub].push(tx);
    });

    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const isRcptA = a.toLowerCase().includes('received');
      const isRcptB = b.toLowerCase().includes('received');
      if (isRcptA && !isRcptB) return -1;
      if (!isRcptA && isRcptB) return 1;
      return a.localeCompare(b);
    });

    sortedKeys.forEach(groupName => {
      const groupItems = sortTxDescending(grouped[groupName]);
      const sectionTotal = groupItems.reduce((sum, tx) => sum + Number(tx.receipt || tx.payment || 0), 0);

      const isGroupRcpt = groupName.toLowerCase().includes('received') || groupItems.some(tx => (tx.receipt || 0) > 0);

      if (selectedCharityMode === 'All') {
        if (isGroupRcpt) totalAmt += sectionTotal;
        else totalAmt -= sectionTotal;
      } else {
        totalAmt += sectionTotal;
      }

      tbody.innerHTML += `
        <tr>
          <td colspan="7" style="background: #e2e8f0; font-weight: 700; padding: 8px 12px; color: #0f172a; font-size: 0.95rem; border-top: 2px solid #cbd5e1;">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <span>📂 ${groupName} <span style="font-size: 0.82rem; color: #475569; font-weight: 600; margin-left: 6px;">(${groupItems.length} ${groupItems.length === 1 ? 'Entry' : 'Entries'})</span></span>
              <span style="color: ${isGroupRcpt ? '#047857' : '#b91c1c'}; font-weight: 800; font-size: 0.95rem;">Total: ${formatCurrency(sectionTotal)}</span>
            </div>
          </td>
        </tr>
      `;

      groupItems.forEach(tx => {
        const cleanDate = formatDateClean(tx.date);
        const cleanVr = formatVrNoClean(tx.vrNo);
        const amt = Number(tx.receipt || tx.payment || 0);

        const isRcpt = (tx.subtype && tx.subtype.toLowerCase().includes('received')) || (!tx.subtype && tx.receipt > 0);

        const printBtnHtml = isRcpt
          ? `<button class="btn-action btn-table-action" style="background: #059669; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="openReceiptModalByVrNo('${cleanVr}', '${tx.id}')" title="Print Receipt">🧾</button>`
          : `<button class="btn-action btn-table-action" style="background: #dc2626; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="openPaymentVoucherModalByVrNo('${cleanVr}', '${tx.id}')" title="Print Voucher">🧾</button>`;

        let fullAddress = '';
        const addr = (tx.address || activeMembersMap[(tx.accountName || '').toLowerCase()] || '').trim();
        const desc = (tx.description || '').trim();
        if (addr && desc && addr.toLowerCase() !== desc.toLowerCase()) {
          fullAddress = addr + ', ' + desc;
        } else if (addr) {
          fullAddress = addr;
        } else {
          fullAddress = desc || '-';
        }

        tbody.innerHTML += `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="font-weight: 500; color: #334155; white-space: nowrap;">${formatDateHtml(tx.date)}</td>
            <td style="font-weight: 700; color: #64748b; text-align: center;">${cleanVr}</td>
            <td style="font-weight: 600; line-height: 1.3; color: #0f172a;">${tx.accountName || '-'}</td>
            <td style="line-height: 1.3; color: #334155;">${fullAddress}</td>
            <td class="num-col rcpt-val" style="font-weight: 700; color: #047857; text-align: right;">${isRcpt ? formatCurrency(amt) : '-'}</td>
            <td class="num-col pmt-val" style="font-weight: 700; color: #b91c1c; text-align: right;">${!isRcpt ? formatCurrency(amt) : '-'}</td>
            <td style="text-align: center; white-space: nowrap;">
              <button class="btn-action btn-table-action" style="background: #0f172a; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="openTransactionDetailModal('${cleanVr}')" title="View Details">👁️</button>
              <button class="btn-action btn-table-action" style="background: #2563eb; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="loadEntryForEdit('${cleanVr}')" title="Edit Entry">✏️</button>
              ${printBtnHtml}
            </td>
          </tr>
        `;
      });
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">No charity ' + selectedCharityMode.toLowerCase() + ' records found</td></tr>';
  }

  if (document.getElementById('charityTabTotalAmount')) {
    document.getElementById('charityTabTotalAmount').innerText = formatCurrency(totalAmt);
  }
}

// --- OTHER INCOME TAB ---
function setOtherIncomeTabMode(mode) {
  selectedOtherIncomeMode = mode;
  renderOtherIncomeTabTable();
}

function renderOtherIncomeTabTable() {
  const tbody = document.getElementById('otherIncomeTableBody');
  if (!tbody) return;

  const searchVal = (document.getElementById('otherIncomeSearchInput') ? document.getElementById('otherIncomeSearchInput').value : '').toLowerCase().trim();

  let totalAmt = 0;
  const list = currentGeneralTxList.filter(tx => {
    if (tx.type !== 'Other Income') return false;
    const sub = (tx.subtype || tx.description || '').toLowerCase();
    const mode = selectedOtherIncomeMode.toLowerCase();
    const matchesMode = mode === 'all' ? true : sub.includes(mode);
    if (!matchesMode) return false;

    if (searchVal) {
      const accName = (tx.accountName || '').toLowerCase();
      const desc = (tx.description || '').toLowerCase();
      const vrNo = String(tx.vrNo || '').toLowerCase();
      if (!accName.includes(searchVal) && !desc.includes(searchVal) && !vrNo.includes(searchVal) && !sub.includes(searchVal)) {
        return false;
      }
    }

    return true;
  });

  tbody.innerHTML = '';
  if (list.length > 0) {
    const grouped = {};
    list.forEach(tx => {
      const sub = (tx.subtype || '').trim() || 'General Other Income';
      if (!grouped[sub]) grouped[sub] = [];
      grouped[sub].push(tx);
    });

    function getOtherIncomeSortWeight(name) {
      const n = (name || '').toLowerCase();
      if (n.includes('donation')) return 1;
      if (n.includes('first fruit')) return 2;
      if (n.includes('sodhari')) return 3;
      if (n.includes('anniversary')) return 4;
      return 99;
    }

    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const weightA = getOtherIncomeSortWeight(a);
      const weightB = getOtherIncomeSortWeight(b);
      if (weightA !== weightB) return weightA - weightB;
      return a.localeCompare(b);
    });

    sortedKeys.forEach(groupName => {
      const groupItems = sortTxDescending(grouped[groupName]);
      const sectionTotalAmt = groupItems.reduce((sum, tx) => sum + Number(tx.receipt || tx.payment || 0), 0);
      totalAmt += sectionTotalAmt;

      tbody.innerHTML += `
        <tr>
          <td colspan="7" style="background: #e2e8f0; font-weight: 700; padding: 8px 12px; color: #0f172a; font-size: 0.95rem; border-top: 2px solid #cbd5e1;">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <span>📂 ${groupName} <span style="font-size: 0.82rem; color: #475569; font-weight: 600; margin-left: 6px;">(${groupItems.length} ${groupItems.length === 1 ? 'Entry' : 'Entries'})</span></span>
              <span style="color: #047857; font-weight: 800; font-size: 0.95rem;">Total: ${formatCurrency(sectionTotalAmt)}</span>
            </div>
          </td>
        </tr>
      `;

      groupItems.forEach(tx => {
        const cleanDate = formatDateClean(tx.date);
        const cleanVr = formatVrNoClean(tx.vrNo);
        const amt = tx.receipt || tx.payment || 0;

        tbody.innerHTML += `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="font-weight: 500; color: #334155; white-space: nowrap;">${formatDateHtml(tx.date)}</td>
            <td style="font-weight: 700; color: #64748b; text-align: center;">${cleanVr}</td>
            <td style="font-weight: 600; line-height: 1.3; color: #0f172a;">${tx.accountName || '-'}</td>
            <td style="line-height: 1.3;">${tx.subtype || '-'}</td>
            <td style="line-height: 1.3;">${tx.description || '-'}</td>
            <td class="num-col rcpt-val" style="font-weight: 700; color: #047857; text-align: right;">${formatCurrency(amt)}</td>
            <td style="text-align: center; white-space: nowrap;">
              <button class="btn-action btn-table-action" style="background: #0f172a; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="openTransactionDetailModal('${cleanVr}')" title="View Details">👁️</button>
              <button class="btn-action btn-table-action" style="background: #2563eb; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="loadEntryForEdit('${cleanVr}')" title="Edit Entry">✏️</button>
              <button class="btn-action btn-table-action" style="background: #059669; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="openReceiptModalByVrNo('${cleanVr}')" title="Print Receipt">🧾</button>
            </td>
          </tr>
        `;
      });
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">No records found for ' + selectedOtherIncomeMode + '</td></tr>';
  }

  if (document.getElementById('otherIncomeTabTotalAmount')) {
    document.getElementById('otherIncomeTabTotalAmount').innerText = formatCurrency(totalAmt);
  }
}

// --- MONTHLY MEETING TAB ---
let selectedMonthlyMeetingMode = 'All';
function setMonthlyMeetingTabMode(mode) {
  selectedMonthlyMeetingMode = mode;
  renderMonthlyMeetingTabTable();
}


function renderMonthlyMeetingTabTable() {
  const tbody = document.getElementById('monthlyMeetingTableBody');
  if (!tbody) return;

  const searchVal = (document.getElementById('monthlyMeetingSearchInput') ? document.getElementById('monthlyMeetingSearchInput').value : '').toLowerCase().trim();

  let totalReceipts = 0;
  let totalPayments = 0;

  const list = currentGeneralTxList.filter(tx => {
    if (!isMeetingTransaction(tx)) return false;

    const sub = (tx.subtype || tx.description || '').toLowerCase();
    const mode = selectedMonthlyMeetingMode.toLowerCase();
    if (mode !== 'all') {
      if (mode.includes('collection') && !(Number(tx.receipt || 0) > 0 || sub.includes('collection') || sub.includes('received'))) return false;
      if (mode.includes('expenses') && !(Number(tx.payment || 0) > 0 || sub.includes('expense') || sub.includes('paid'))) return false;
      if (mode.includes('general body') && !(sub.includes('general body') || sub.includes('committee'))) return false;
      if (mode.includes('fasting') && !sub.includes('fasting')) return false;
    }

    if (searchVal) {
      const accName = (tx.accountName || '').toLowerCase();
      const desc = (tx.description || '').toLowerCase();
      const vrNo = String(tx.vrNo || '').toLowerCase();
      const subT = (tx.subtype || '').toLowerCase();
      if (!accName.includes(searchVal) && !desc.includes(searchVal) && !vrNo.includes(searchVal) && !subT.includes(searchVal)) {
        return false;
      }
    }

    return true;
  });

  tbody.innerHTML = '';
  if (list.length > 0) {
    const grouped = {};
    list.forEach(tx => {
      let sub = (tx.subtype && tx.subtype !== '-' && tx.subtype !== 'General') ? tx.subtype.trim() : '';
      if (!sub) {
        const desc = (tx.description || '').toLowerCase();
        if (desc.includes('fasting')) sub = 'Fasting Prayer Meeting';
        else if (desc.includes('general body') || desc.includes('anniversary')) sub = 'General Body / Committee Meeting';
        else if (Number(tx.receipt || 0) > 0) sub = 'Monthly Meeting Collection';
        else sub = 'Monthly Meeting Expenses';
      }
      if (!grouped[sub]) grouped[sub] = [];
      grouped[sub].push(tx);
    });

    const sortedKeys = Object.keys(grouped).sort();

    sortedKeys.forEach(groupName => {
      const groupItems = sortTxDescending(grouped[groupName]);
      const groupRcpt = groupItems.reduce((sum, tx) => sum + Number(tx.receipt || 0), 0);
      const groupPmt = groupItems.reduce((sum, tx) => sum + Number(tx.payment || tx.payments || 0), 0);
      totalReceipts += groupRcpt;
      totalPayments += groupPmt;

      tbody.innerHTML += `
        <tr>
          <td colspan="8" style="background: #e2e8f0; font-weight: 700; padding: 8px 12px; color: #0f172a; font-size: 0.95rem; border-top: 2px solid #cbd5e1;">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <span>🤝 ${groupName} <span style="font-size: 0.82rem; color: #475569; font-weight: 600; margin-left: 6px;">(${groupItems.length} ${groupItems.length === 1 ? 'Entry' : 'Entries'})</span></span>
              <div style="display: flex; gap: 14px; font-weight: 800; font-size: 0.9rem;">
                ${groupRcpt > 0 ? `<span style="color: #047857;">In: ${formatCurrency(groupRcpt)}</span>` : ''}
                ${groupPmt > 0 ? `<span style="color: #b91c1c;">Out: ${formatCurrency(groupPmt)}</span>` : ''}
              </div>
            </div>
          </td>
        </tr>
      `;

      groupItems.forEach(tx => {
        const cleanDate = formatDateClean(tx.date);
        const cleanVr = formatVrNoClean(tx.vrNo);
        const rcpt = tx.receipt || 0;
        const pmt = tx.payment || tx.payments || 0;

        tbody.innerHTML += `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="font-weight: 500; color: #334155; white-space: nowrap;">${formatDateHtml(tx.date)}</td>
            <td style="font-weight: 700; color: #64748b; text-align: center;">${cleanVr}</td>
            <td style="font-weight: 600; line-height: 1.3; color: #0f172a;">${tx.accountName || '-'}</td>
            <td style="line-height: 1.3;">${tx.subtype || '-'}</td>
            <td style="line-height: 1.3;">${tx.description || '-'}</td>
            <td class="num-col rcpt-val" style="font-weight: 700; color: #047857; text-align: right;">${rcpt > 0 ? formatCurrency(rcpt) : '-'}</td>
            <td class="num-col pmt-val" style="font-weight: 700; color: #b91c1c; text-align: right;">${pmt > 0 ? formatCurrency(pmt) : '-'}</td>
            <td style="text-align: center; white-space: nowrap;" class="editor-only">
              <button class="btn-action btn-table-action" style="background: #0f172a; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="openTransactionDetailModal('${cleanVr}')" title="View Details">👁️</button>
              <button class="btn-action btn-table-action" style="background: #2563eb; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="loadEntryForEdit('${cleanVr}')" title="Edit Entry">✏️</button>
              <button class="btn-action btn-table-action" style="background: #059669; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="openReceiptModalByVrNo('${cleanVr}')" title="Print Receipt">🧾</button>
            </td>
          </tr>
        `;
      });
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 20px;">No meeting transactions found for ' + selectedMonthlyMeetingMode + '</td></tr>';
  }

  if (document.getElementById('monthlyMeetingTabReceipts')) {
    document.getElementById('monthlyMeetingTabReceipts').innerText = formatCurrency(totalReceipts);
  }
  if (document.getElementById('monthlyMeetingTabPayments')) {
    document.getElementById('monthlyMeetingTabPayments').innerText = formatCurrency(totalPayments);
  }
  if (document.getElementById('monthlyMeetingTabTotalAmount')) {
    const netBal = totalReceipts - totalPayments;
    document.getElementById('monthlyMeetingTabTotalAmount').innerText = formatCurrency(netBal);
  }
}

function printMonthlyMeeting() {
  const printArea = document.getElementById('printArea');
  if (!printArea) return;
  printArea.innerHTML = getMonthlyMeetingHTML();
  document.body.classList.add('print-monthlymeeting-active');

  function cleanup() {
    document.body.classList.remove('print-monthlymeeting-active');
    printArea.innerHTML = '';
  }

  window.addEventListener('afterprint', cleanup, { once: true });

  setTimeout(function () {
    try {
      window.print();
    } catch (e) {
      console.error("Print error:", e);
    }
  }, 300);
}

function getMonthlyMeetingHTML() {
  const searchVal = (document.getElementById('monthlyMeetingSearchInput') ? document.getElementById('monthlyMeetingSearchInput').value : '').toLowerCase().trim();

  const list = currentGeneralTxList.filter(tx => {
    if (!isMeetingTransaction(tx)) return false;
    const sub = (tx.subtype || tx.description || '').toLowerCase();
    const mode = selectedMonthlyMeetingMode.toLowerCase();
    if (mode !== 'all') {
      if (mode.includes('collection') && !(Number(tx.receipt || 0) > 0 || sub.includes('collection') || sub.includes('received'))) return false;
      if (mode.includes('expenses') && !(Number(tx.payment || 0) > 0 || sub.includes('expense') || sub.includes('paid'))) return false;
      if (mode.includes('general body') && !(sub.includes('general body') || sub.includes('committee'))) return false;
      if (mode.includes('fasting') && !sub.includes('fasting')) return false;
    }
    if (searchVal) {
      const accName = (tx.accountName || '').toLowerCase();
      const desc = (tx.description || '').toLowerCase();
      const vrNo = String(tx.vrNo || '').toLowerCase();
      const subT = (tx.subtype || '').toLowerCase();
      if (!accName.includes(searchVal) && !desc.includes(searchVal) && !vrNo.includes(searchVal) && !subT.includes(searchVal)) return false;
    }
    return true;
  });

  var grouped = {};
  list.forEach(function (tx) {
    let sub = (tx.subtype && tx.subtype !== '-' && tx.subtype !== 'General') ? tx.subtype.trim() : '';
    if (!sub) {
      const desc = (tx.description || '').toLowerCase();
      if (desc.includes('fasting')) sub = 'Fasting Prayer Meeting';
      else if (desc.includes('general body') || desc.includes('anniversary')) sub = 'General Body / Committee Meeting';
      else if (Number(tx.receipt || 0) > 0) sub = 'Monthly Meeting Collection';
      else sub = 'Monthly Meeting Expenses';
    }
    if (!grouped[sub]) grouped[sub] = [];
    grouped[sub].push(tx);
  });

  var html = '<table style="width: 100%; border: none !important; margin: 0; padding: 0;">' +
    '<thead><tr><td style="border: none !important; padding: 0;">' +
    getPrintHeaderHTML('MONTHLY MEETING STATEMENT', '', 'Filter: ' + selectedMonthlyMeetingMode + (searchVal ? ' | Search: ' + searchVal : '')) +
    '</td></tr></thead>' +
    '<tbody><tr><td style="border: none !important; padding: 0;">';

  var grandReceipts = 0;
  var grandPayments = 0;

  var sortedKeys = Object.keys(grouped).sort();

  sortedKeys.forEach(function (groupName) {
    var items = grouped[groupName];
    var subRcpt = items.reduce(function (sum, tx) { return sum + Number(tx.receipt || 0); }, 0);
    var subPmt = items.reduce(function (sum, tx) { return sum + Number(tx.payment || tx.payments || 0); }, 0);
    grandReceipts += subRcpt;
    grandPayments += subPmt;

    html += '<div class="print-section-head" style="background: #1e293b; color: #ffffff; padding: 6px 10px; font-weight: 800; font-size: 9.5pt; margin-top: 14px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">' +
      '<span>🤝 ' + groupName + ' (' + items.length + ' Entries)</span>' +
      '<div style="display: flex; gap: 12px;">' +
      (subRcpt > 0 ? '<span>Total Receipts: ' + formatCurrency(subRcpt) + '</span>' : '') +
      (subPmt > 0 ? '<span>Total Expenses: ' + formatCurrency(subPmt) + '</span>' : '') +
      '</div>' +
      '</div>' +
      '<table style="margin-top: 4px; margin-bottom: 12px;">' +
      '<thead>' +
      '<tr><th>Date</th><th>Vr No</th><th>Name</th><th>Description</th><th style="text-align:right">Receipt (₹)</th><th style="text-align:right">Payment (₹)</th></tr></thead>' +
      '<tbody>';
    sortTransactionsAscending(items).forEach(function (tx) {
      var cleanDate = formatDateClean(tx.date);
      var cleanVr = formatVrNoClean(tx.vrNo);
      var rcpt = tx.receipt || 0;
      var pmt = tx.payment || tx.payments || 0;
      html += '<tr>' +
        '<td>' + formatDateHtml(tx.date) + '</td>' +
        '<td style="text-align:center">' + cleanVr + '</td>' +
        '<td>' + (tx.accountName || '-') + '</td>' +
        '<td>' + (tx.description || '-') + '</td>' +
        '<td class="print-rcpt-amt" style="text-align:right">' + (rcpt > 0 ? formatCurrency(rcpt) : '-') + '</td>' +
        '<td class="print-pmt-amt" style="text-align:right">' + (pmt > 0 ? formatCurrency(pmt) : '-') + '</td>' +
        '</tr>';
    });
    html += '</tbody>' +
      '<tfoot><tr class="print-totals-row"><td colspan="4" style="text-align:right">Subtotal (' + groupName + ')</td><td style="text-align:right">' + formatCurrency(subRcpt) + '</td><td style="text-align:right">' + formatCurrency(subPmt) + '</td></tr></tfoot>' +
      '</table>';
  });

  html += '<div style="margin-top:14px;padding:12px;font-weight:800;display:flex;justify-content:space-between;font-size:10.5pt;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;">' +
    '<span>Grand Total Receipts: ' + formatCurrency(grandReceipts) + '</span>' +
    '<span>Grand Total Expenses: ' + formatCurrency(grandPayments) + '</span>' +
    '<span>Net Balance: ' + formatCurrency(grandReceipts - grandPayments) + '</span>' +
    '</div>' +
    '</td></tr></tbody>' +
    '<tfoot><tr><td style="border: none !important; padding: 0;">' +
    getPrintSignaturesHTML('Computer Generated Monthly Meeting Statement') +
    '</td></tr></tfoot></table>';

  return html;
}

function fetchApiData(action, params = {}) {
  // Compatibility fallback
  return Promise.resolve({ success: false });
}

let subscriptionsPaidMap = {};

let globalBankAccounts = ['State Bank of India', 'SBI Fixed Deposit'];
let globalFieldRules = {
  'Subscription': { showAccount: true, showAddress: true, showSubtype: false, showMonth: true, mode: 'Receipt' },
  'Offering': { showAccount: false, showAddress: false, showSubtype: false, showMonth: false, mode: 'Receipt' },
  'Charity': { showAccount: true, showAddress: true, showSubtype: false, showMonth: false, mode: 'Both' },
  'Other Income': { showAccount: true, showAddress: false, showSubtype: true, showMonth: false, mode: 'Receipt' },
  'Monthly Meeting': { showAccount: true, showAddress: false, showSubtype: true, showMonth: false, mode: 'Both' },
  'Ledger': { showAccount: true, showAddress: false, showSubtype: true, showMonth: false, mode: 'Payment' }
};
let globalSidebarOrder = [];
let globalCustomTabNames = {};
const defaultSidebarTabs = [
  { id: 'statementTab', name: 'Dashboard', icon: '📊' },
  { id: 'entryTab', name: 'Entry Screen', icon: '📝' },
  { id: 'editTab', name: 'Editing Screen', icon: '✏️' },
  { id: 'transactionsTab', name: 'Cash Book', icon: '📖' },
  { id: 'bankBookTab', name: 'Bank Book', icon: '🏦' },
  { id: 'ledgerTab', name: 'Ledger Accounts', icon: '📒' },
  { id: 'membersDirectoryTab', name: 'Members Directory', icon: '👥' },
  { id: 'membersTab', name: 'Members Ledger', icon: '👤' },
  { id: 'offeringTab', name: 'Offering Log', icon: '🙏' },
  { id: 'charityTab', name: 'Charity Statement', icon: '❤️' },
  { id: 'otherIncomeTab', name: 'Other Income', icon: '📂' },
  { id: 'subscriptionsTab', name: 'Subscriptions', icon: '📅' },
  { id: 'memberStatementTab', name: 'Member Statement', icon: '📑' },
  { id: 'suspenseTab', name: 'Suspense Account', icon: '⏳' },
  { id: 'settingsTab', name: 'Settings', icon: '⚙️' }
];

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  if (typeof autoSelectMonthFromDate === 'function') {
    autoSelectMonthFromDate(false);
  }
  if (document.getElementById('suspenseDate')) {
    document.getElementById('suspenseDate').value = new Date().toISOString().split('T')[0];
  }

  const todayDate = new Date();
  const firstDay = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  const lastDay = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
  const pad = n => n.toString().padStart(2, '0');
  const firstDayStr = `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-01`;
  const lastDayStr = `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`;
  if (document.getElementById('memStmtFrom')) document.getElementById('memStmtFrom').value = firstDayStr;
  if (window.PG_CATEGORIES && window.PG_CATEGORIES.length > 0) {
    applyDatabaseCategories(window.PG_CATEGORIES);
  }
  loadCategoriesFromApi();
  initFyDropdown();
  attachAmountFormatter('amount', 'amountWordsHint', 'amountWordsText');
  attachAmountFormatter('edit_amount', 'edit_amountWordsHint', 'edit_amountWordsText');
  attachAmountFormatter('suspenseAmount');
  // fetchInitialDataFromFirebase() is now called in showApp() after successful login
  window.addEventListener('resize', scalePrintPopups);
  try {
    const modalObserver = new ResizeObserver(() => {
      scalePrintPopups();
    });
    ['generateReceiptModal', 'generatePaymentVoucherModal', 'generateMemberLedgerModal'].forEach(id => {
      const modal = document.getElementById(id);
      if (modal) {
        const card = modal.querySelector('.modal-card');
        if (card) modalObserver.observe(card);
      }
    });
  } catch (e) {
    console.error("ResizeObserver initialization failed:", e);
  }
});

function extractBaseNum(vrStr) {
  if (!vrStr) return 0;
  const base = String(vrStr).split('/')[0];
  const match = base.match(/\d+$/);
  if (match) return parseInt(match[0], 10);
  return parseInt(base.replace(/\D/g, ''), 10) || 0;
}

function calculateNextVoucherNumbers() {
  let maxReceipt = 6700;
  let maxPayment = 0;

  allTimeGeneralTxList.forEach(tx => {
    let isReceiptVr = false;
    let isPaymentVr = false;

    if (tx.rcptNo) {
      const num = extractBaseNum(tx.rcptNo);
      if (num >= 6701 && num < 100000 && num > maxReceipt) maxReceipt = num;
      isReceiptVr = true;
    }
    if (tx.payNo) {
      const num = extractBaseNum(tx.payNo);
      if (num >= 1 && num < 6000 && num > maxPayment) maxPayment = num;
      isPaymentVr = true;
    }

    if (tx.vrNo && String(tx.vrNo).trim() !== '' && tx.vrNo !== '-' && tx.vrNo !== '--' && !isReceiptVr && !isPaymentVr) {
      const vrStr = String(tx.vrNo).trim();
      const num = extractBaseNum(vrStr);
      if (num > 0) {
        const isPmt = tx.type === 'Ledger' || (tx.type === 'Charity' && tx.mode === 'Payment') || tx.mode === 'Payment' || (!tx.mode && !tx.type && (Number(tx.payment) > 0 || Number(tx.payments) > 0));
        if (isPmt) {
          if (num >= 1 && num < 6000 && num > maxPayment) maxPayment = num;
        } else {
          if (num >= 6701 && num < 100000 && num > maxReceipt) maxReceipt = num;
        }
      }
    }
  });

  if (typeof allTimeBankBookList !== 'undefined' && Array.isArray(allTimeBankBookList)) {
    allTimeBankBookList.forEach(tx => {
      if (!tx.vrNo) return;
      const vrStr = String(tx.vrNo).trim();
      const num = extractBaseNum(vrStr);
      if (num <= 0) return;
      const isPmt = tx.mode === 'Debit (Payment)' || tx.mode === 'Payment' || (Number(tx.debit || tx.payment || 0) > 0);
      if (isPmt) {
        if (num >= 1 && num < 6000 && num > maxPayment) maxPayment = num;
      } else {
        if (num >= 6701 && num < 100000 && num > maxReceipt) maxReceipt = num;
      }
    });
  }

  // Incorporate synced server numbers from PostgreSQL / Firestore bridge if available
  if (typeof window !== 'undefined') {
    if (window.PG_NEXT_RECEIPT && Number(window.PG_NEXT_RECEIPT) > maxReceipt) {
      maxReceipt = Number(window.PG_NEXT_RECEIPT) - 1;
    }
    if (window.PG_NEXT_PAYMENT && Number(window.PG_NEXT_PAYMENT) > maxPayment) {
      maxPayment = Number(window.PG_NEXT_PAYMENT) - 1;
    }
  }

  nextReceiptVrNo = (maxReceipt >= 6700) ? (maxReceipt + 1) : 6701;
  nextPaymentVrNo = (maxPayment >= 1) ? (maxPayment + 1) : 1;
}

function populateBankDropdowns() {
  const selects = ['bankAccountSelect', 'edit_bankAccountSelect'];
  selects.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '';
    globalBankAccounts.forEach(acc => {
      const opt = document.createElement('option');
      opt.value = acc;
      opt.innerText = acc;
      select.appendChild(opt);
    });
    if (globalBankAccounts.includes(currentVal)) {
      select.value = currentVal;
    } else if (globalBankAccounts.length > 0) {
      select.value = globalBankAccounts[0];
    }
  });

  const filterSelect = document.getElementById('bankBookAccountFilter');
  if (filterSelect) {
    const currentVal = filterSelect.value;
    filterSelect.innerHTML = '<option value="ALL">All Bank Accounts</option>';
    globalBankAccounts.forEach(acc => {
      const opt = document.createElement('option');
      opt.value = acc;
      opt.innerText = acc;
      filterSelect.appendChild(opt);
    });
    if (currentVal === 'ALL' || globalBankAccounts.includes(currentVal)) {
      filterSelect.value = currentVal;
    }
  }
}

function populateTypeDropdowns() {
  if (window.PG_CATEGORIES && Array.isArray(window.PG_CATEGORIES) && window.PG_CATEGORIES.length > 0) {
    applyDatabaseCategories(window.PG_CATEGORIES);
  } else if (globalRawCategories && globalRawCategories.length > 0) {
    applyDatabaseCategories(globalRawCategories);
  }

  const mode = document.getElementById('txType') ? document.getElementById('txType').value : 'Receipt';
  if (typeof updateTypeOptions === 'function') updateTypeOptions(mode);

  const editMode = document.getElementById('edit_txType') ? document.getElementById('edit_txType').value : 'Receipt';
  if (typeof updateEditTypeOptions === 'function') updateEditTypeOptions(editMode);

  const entryTypeSelect = document.getElementById('type');
  if (entryTypeSelect) onTypeChanged();

  const editTypeSelect = document.getElementById('edit_type');
  if (editTypeSelect) onEditTypeChanged();

  if (typeof populateLedgerSubtypeDropdown === 'function') populateLedgerSubtypeDropdown();
}

function subscribeToCollection(ref, name, mapFn, globalVarSetter) {
  return new Promise((resolve, reject) => {
    let isFirst = true;
    console.log(`[Firebase Sync] Subscribing to: ${name}`);
    const unsub = ref.onSnapshot(snap => {
      try {
        console.log(`[Firebase Sync] Received snapshot for: ${name}`);
        globalVarSetter(mapFn(snap));
        if (isFirst) {
          isFirst = false;
          resolve(unsub);
        } else {
          processAndRenderAll();
        }
      } catch (e) {
        console.error(`[Firebase Sync] Error mapping ${name}:`, e);
        if (isFirst) {
          isFirst = false;
          reject(e);
        }
      }
    }, err => {
      if (isFirst) reject(err);
      else console.error(`[Firebase Sync] Realtime error on ${name}:`, err);
    });
  });
}

function processAndRenderAll() {
  hideGlobalLoading(); // Ensure loader is hidden when any data arrives
  if (typeof markAllTabsDirty === 'function') markAllTabsDirty();

  if (globalRawBankAccounts && globalRawBankAccounts.length > 0) {
    globalBankAccounts = (globalRawBankAccounts || []).map(b => (typeof b === 'object' && b !== null) ? (b.accountName || b.account_name || '') : String(b || '')).filter(Boolean);
  }
  if (globalRawSidebarOrder && globalRawSidebarOrder.order) {
    globalSidebarOrder = globalRawSidebarOrder.order;
  }
  if (globalRawTabNames) {
    globalCustomTabNames = globalRawTabNames;
  }
  applySidebarOrder();

  if (globalRawFieldRules) {
    Object.keys(globalRawFieldRules).forEach(key => {
      if (globalFieldRules[key]) {
        globalFieldRules[key] = { ...globalFieldRules[key], ...globalRawFieldRules[key] };
      } else {
        globalFieldRules[key] = globalRawFieldRules[key];
      }
    });
  }
  Object.keys(globalFieldRules).forEach(key => {
    if (!globalFieldRules[key].mode) {
      let mode = "Both";
      if (key === 'Offering' || key === 'Subscription' || key === 'Other Income') mode = "Receipt";
      if (key === 'Ledger') mode = "Payment";
      globalFieldRules[key].mode = mode;
    }
  });

  if (typeof initFyDropdown === 'function') initFyDropdown();
  if (typeof renderSettingsBankList === 'function') renderSettingsBankList();
  if (typeof renderSettingsTypesList === 'function') renderSettingsTypesList();
  if (typeof renderSettingsTabOrderList === 'function') renderSettingsTabOrderList();
  if (typeof populateBankDropdowns === 'function') populateBankDropdowns();
  if (typeof populateTypeDropdowns === 'function') populateTypeDropdowns();
  if (typeof renderDynamicTabs === 'function') renderDynamicTabs();
  if (typeof updateActiveFyHeaderDisplay === 'function') updateActiveFyHeaderDisplay();
  if (typeof applyRBACUI === 'function') applyRBACUI();

  window.openingBalancesStore = globalRawOpening || {};

  allTimeGeneralTxList = (globalRawTransactions || []).filter(Boolean);
  allTimeGeneralTxList.forEach(tx => {
    if (tx.bankAccount && !tx.account) tx.account = tx.bankAccount;
    if (tx.payments !== undefined && tx.payment === undefined) tx.payment = tx.payments;
    if (!tx.description && tx.particulars) tx.description = tx.particulars;
    if (!tx.particulars && tx.description) tx.particulars = tx.description;

    const desc = (tx.description || '').toLowerCase();
    const bsub = (tx.bankSubtype || '').toLowerCase();
    const isContra = desc.includes('cash deposit') || desc.includes('cash withdrawal') || bsub.includes('cash deposit') || bsub.includes('cash withdrawal');
    const entryType = (tx.entryType || 'Cash').toLowerCase();
    const isBank = entryType === 'bank' || String(tx.vrNo || '').toLowerCase().endsWith('/b');

    if (isContra) {
      tx.inCashBook = true;
      tx.addToCashBook = true;
    } else if (isBank) {
      tx.inCashBook = (tx.inCashBook === true || tx.addToCashBook === true);
      tx.addToCashBook = tx.inCashBook;
    } else {
      if (tx.addToCashBook !== undefined && tx.inCashBook === undefined) {
        tx.inCashBook = tx.addToCashBook;
      }
    }
  });
  allTimeGeneralTxList.sort((a, b) => a.id - b.id);

  const generalTxMap = new Map();
  allTimeGeneralTxList.forEach(t => generalTxMap.set(String(t.id), t));

  allTimeTxList = allTimeGeneralTxList.filter(tx => {
    if (tx.transactionId && String(tx.transactionId).trim() !== '') return false;
    const bsub = (tx.bankSubtype || '').toLowerCase();
    const desc = (tx.description || '').toLowerCase();
    const type = (tx.type || '').toLowerCase();
    const isInterBank = bsub.includes('inter-bank') || bsub.includes('inter transfer') || desc.includes('inter-bank') || desc.includes('inter transfer') || type.includes('inter-bank');
    if (isInterBank) return false;
    const isContra = desc.includes('cash deposit') || desc.includes('cash withdrawal') || bsub.includes('cash deposit') || bsub.includes('cash withdrawal');
    const entryType = (tx.entryType || 'Cash').toLowerCase();
    const isBank = entryType === 'bank' || String(tx.vrNo || '').toLowerCase().endsWith('/b');
    if (isBank && !isContra && tx.addToCashBook !== true && tx.inCashBook !== true) return false;
    return isContra || tx.addToCashBook === true || tx.inCashBook === true || (!isBank && entryType === 'cash');
  });

  allTimeBankBookList = (globalRawBankTransactions || []).filter(Boolean);
  allTimeBankBookList.forEach(tx => {
    tx.account = tx.account || tx.bankAccount || 'State Bank of India';
    tx.bankAccount = tx.account;
    const gtx = generalTxMap.get(String(tx.id));
    if (gtx) {
      if (!tx.transactionId && gtx.transactionId) tx.transactionId = gtx.transactionId;
      if (gtx.chequeNo && !tx.chequeNo) tx.chequeNo = gtx.chequeNo;
      if (gtx.chqNo && !tx.chqNo) tx.chqNo = gtx.chqNo;
      if (gtx.isCheque && !tx.isCheque) tx.isCheque = gtx.isCheque;
    }
    if (tx.payments !== undefined && tx.payment === undefined) tx.payment = tx.payments;
    if (!tx.description && tx.particulars) tx.description = tx.particulars;
    if (!tx.particulars && tx.description) tx.particulars = tx.description;
    const desc = (tx.description || '').toLowerCase();
    const bsub = (tx.bankSubtype || '').toLowerCase();
    const isContra = desc.includes('cash deposit') || desc.includes('cash withdrawal') ||
      bsub.includes('cash deposit') || bsub.includes('cash withdrawal');
    const isInterBank = bsub.includes('inter-bank') || bsub.includes('inter transfer') || desc.includes('inter-bank') || desc.includes('inter transfer');

    if (isContra) {
      tx.inCashBook = true;
      tx.addToCashBook = true;

      // In Bank Book:
      // Cash Deposit (Contra) → money enters Bank → Credit (Receipt) side
      // Cash Withdrawal (Contra) → money leaves Bank → Debit (Payment) side
      const isCashDeposit = desc.includes('cash deposit') || bsub.includes('cash deposit');
      const amt = Number(tx.amount || tx.receipt || tx.payments || tx.payment || 0);
      if (isCashDeposit) {
        tx.receipt = amt;
        tx.payments = "";
        tx.payment = "";
        tx.credit = amt;
        tx.debit = 0;
        tx.mode = "Credit (Receipt)";
      } else {
        tx.receipt = "";
        tx.payments = amt;
        tx.payment = amt;
        tx.credit = 0;
        tx.debit = amt;
        tx.mode = "Debit (Payment)";
      }
    } else if (isInterBank) {
      tx.inCashBook = false;
      tx.addToCashBook = false;
    }
  });
  allTimeBankBookList.sort((a, b) => a.id - b.id);

  // Merge Bank Contra entries into allTimeTxList for the Cash Book (ONLY if not already present in Cash Book)
  const bankContraForCash = allTimeBankBookList.filter(tx => {
    // If it has a linked cash_id or cashId, it is ALREADY represented in allTimeTxList as ONE entry!
    if (tx.cashId || tx.cash_id) return false;
    // If any cash transaction in allTimeTxList has bankId or bank_id pointing to this bank transaction id, it is ALREADY linked as ONE entry!
    if (allTimeTxList.some(t => (t.bankId && t.bankId == tx.id) || (t.bank_id && t.bank_id == tx.id))) return false;
    return tx.inCashBook && tx.addToCashBook && !(tx.transactionId && String(tx.transactionId).trim() !== '');
  });
  // Avoid duplicates: check linked ID, Voucher Number, Date + Amount, or already merged contra
  const generalVrs = new Set(allTimeTxList.map(tx => normalizeVrLocally(tx.vrNo)).filter(v => v && v !== '-' && v !== '--'));

  bankContraForCash.forEach(tx => {
    if (tx.cashId || tx.cash_id) return;
    const hasLinkedId = allTimeTxList.some(t => 
      (t.bankId && t.bankId == tx.id) || (t.bank_id && t.bank_id == tx.id) ||
      (tx.cashId && tx.cashId == t.id) || (tx.cash_id && tx.cash_id == t.id)
    );
    if (hasLinkedId) return;

    const cleanVr = normalizeVrLocally(tx.vrNo);
    const hasMatchingVr = cleanVr && cleanVr !== '-' && cleanVr !== '--' && generalVrs.has(cleanVr);
    const txAmt = Number(tx.amount || tx.receipt || tx.payments || tx.payment || 0);

    const hasMatchingContra = allTimeTxList.some(t => {
      if (t.date !== tx.date) return false;
      const tAmt = Number(t.amount || t.payment || t.payments || t.receipt || 0);
      if (Math.abs(tAmt - txAmt) > 0.01) return false;
      const tDesc = (t.description || '').toLowerCase();
      const tSub = (t.subtype || '').toLowerCase();
      const tType = (t.type || '').toLowerCase();
      return tType === 'contra' || tSub.includes('contra') || tDesc.includes('cash deposit') || tDesc.includes('cash withdrawal');
    });

    const isAlreadyMerged = allTimeTxList.some(t => t._bankContra && t._bankContraId === tx.id);

    if (!hasMatchingVr && !hasMatchingContra && !isAlreadyMerged) {
      // Create a cash-side representation for the Cash Book:
      // Cash Deposit (Contra) → cash goes OUT of cash box → Payment side in Cash Book
      // Cash Withdrawal (Contra) → cash comes INTO cash box → Receipt side in Cash Book
      const desc = (tx.description || '').toLowerCase();
      const bsub = (tx.bankSubtype || '').toLowerCase();
      const isCashDeposit = desc.includes('cash deposit') || bsub.includes('cash deposit');
      allTimeTxList.push(Object.assign({}, tx, {
        id: `BC_${tx.id}`,
        _bankContra: true,
        _bankContraId: tx.id,
        receipt: isCashDeposit ? "" : txAmt,
        payment: isCashDeposit ? txAmt : "",
        payments: isCashDeposit ? txAmt : "",
        mode: isCashDeposit ? 'Payment' : 'Receipt'
      }));
    }
  });
  allTimeTxList.sort((a, b) => new Date(a.date) - new Date(b.date) || (Number(a.id) || 0) - (Number(b.id) || 0));


  membersDataStore = deduplicateMembersList(globalRawMembers || []);
  membersDataStore.sort((a, b) => compareNamesIgnoringPrefix(a.name, b.name));
  _memberCodeCache = null;
  activeMembersMap = {};
  membersDataStore.forEach(m => {
    const n = (m.name || '').toLowerCase().trim();
    const r = getRawName(m.name, m.title).toLowerCase().trim();
    const addr = m.address || '';
    if (n) activeMembersMap[n] = addr;
    if (r) activeMembersMap[r] = addr;
    if (m._aliases && Array.isArray(m._aliases)) {
      m._aliases.forEach(al => {
        if (al) activeMembersMap[al] = addr;
      });
    }
  });

  if (globalRawCategories && globalRawCategories.length > 0) {
    applyDatabaseCategories(globalRawCategories);
  } else if (globalRawSubtypes) {
    subTypesConfig = globalRawSubtypes;
  }
  Object.keys(subTypesConfig).forEach(key => {
    if (Array.isArray(subTypesConfig[key])) {
      subTypesConfig[key] = subTypesConfig[key]
        .filter(item => {
          if (typeof item === 'string' && item === '[object Object]') return false;
          if (item && item.name === '[object Object]') return false;
          return true;
        })
        .map(item => {
          if (typeof item === 'string') {
            let mode = "Both";
            let lower = item.toLowerCase();
            if (lower.includes("paid") || lower.includes("expenses")) mode = "Payment";
            if (lower.includes("received") || lower.includes("income") || lower.includes("donation")) mode = "Receipt";
            return { name: item, mode: mode };
          }
          return item;
        });
    }
  });

  const subscriptions_sheet = globalRawSubscriptionsSheet ? globalRawSubscriptionsSheet.data : null;
  subscriptionsPaidMap = {};
  if (subscriptions_sheet && Array.isArray(subscriptions_sheet)) {
    subscriptions_sheet.forEach(item => {
      if (item && item.key) {
        subscriptionsPaidMap[item.key] = item.months || [];
      }
    });
  }
  const monthsList = ["april", "may", "june", "july", "august", "september", "october", "november", "december", "january", "february", "march"];
  allTimeGeneralTxList.forEach(tx => {
    if (tx.accountName && tx.type === 'Subscription') {
      const nameLower = tx.accountName.toLowerCase().trim();
      const addrLower = (tx.address || '').toLowerCase().trim();
      const mapKey = addrLower ? (nameLower + "|" + addrLower) : nameLower;
      if (!subscriptionsPaidMap[mapKey]) subscriptionsPaidMap[mapKey] = [];

      const descLower = (tx.description || '').toLowerCase();
      const subMonthLower = (tx.subMonth || '').toLowerCase();
      monthsList.forEach(m => {
        if (descLower.includes(m) || subMonthLower.includes(m)) {
          if (!subscriptionsPaidMap[mapKey].includes(m)) {
            subscriptionsPaidMap[mapKey].push(m);
          }
        }
      });
    }
  });

  calculateNextVoucherNumbers();

  const currentMode = document.getElementById('txType') ? document.getElementById('txType').value : 'Receipt';
  setMode(currentMode);

  allTimeSuspenseTxList = (globalRawSuspense || []).filter(Boolean);
  allTimeSuspenseTxList.sort((a, b) => new Date(b.date) - new Date(a.date));

  const generalIds2 = new Set(allTimeTxList.map(tx => String(tx.id)));
  allTimeSuspenseTxList.forEach(tx => {
    if (!generalIds2.has(String(tx.id))) {
      const isAdvanceRcpt = tx.type === 'Advance Received';
      allTimeTxList.push(Object.assign({}, tx, {
        _suspenseTx: true,
        vrNo: '--', // No receipt generated
        accountName: tx.name,
        description: "Suspense Account",
        receipt: isAdvanceRcpt ? tx.amount : "",
        payment: !isAdvanceRcpt ? tx.amount : "",
        type: "Suspense"
      }));
    }
  });
  allTimeTxList.sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);

  currentLoadedTxList = filterListByFY(allTimeTxList);
  loadedBankBookTransactions = filterListByFY(allTimeBankBookList);
  currentGeneralTxList = filterListByFY(allTimeGeneralTxList);

  renderActiveTabOnly();
}

function renderActiveTabOnly() {
  const activeTab = document.querySelector('.page-tab.active');
  const activeTabId = activeTab ? activeTab.id : 'statementTab';

  if (activeTabId === 'statementTab') {
    if (typeof renderDashboard === 'function') renderDashboard();
  } else if (activeTabId === 'transactionsTab') {
    if (typeof renderRecentTransactions === 'function') renderRecentTransactions();
  } else if (activeTabId === 'bankBookTab') {
    if (typeof renderBankBookTransactions === 'function') renderBankBookTransactions();
  } else if (activeTabId === 'ledgerTab') {
    if (typeof renderLedgerTabTable === 'function') renderLedgerTabTable();
  } else if (activeTabId === 'membersDirectoryTab') {
    if (typeof renderMembersDirectoryTab === 'function') renderMembersDirectoryTab();
  } else if (activeTabId === 'membersTab') {
    if (typeof renderMembersTab === 'function') renderMembersTab();
  } else if (activeTabId === 'offeringTab') {
    if (typeof renderOfferingTabTable === 'function') renderOfferingTabTable();
  } else if (activeTabId === 'charityTab') {
    if (typeof renderCharityTabTable === 'function') renderCharityTabTable();
  } else if (activeTabId === 'otherIncomeTab') {
    if (typeof renderOtherIncomeTabTable === 'function') renderOtherIncomeTabTable();
  } else if (activeTabId === 'subscriptionsTab') {
    if (typeof renderSubscriptionsReport === 'function') renderSubscriptionsReport();
  } else if (activeTabId === 'memberStatementTab') {
    if (typeof renderMemberStatementReport === 'function') renderMemberStatementReport();
  } else if (activeTabId === 'suspenseTab') {
    if (typeof renderSuspenseTable === 'function') renderSuspenseTable();
  } else if (activeTabId && activeTabId.startsWith('dynamicTab_')) {
    const typeName = activeTab.getAttribute('data-type');
    if (typeName && typeof renderDynamicTabTable === 'function') renderDynamicTabTable(typeName);
  }
}

function fetchInitialDataFromFirebase() {
  showGlobalLoading("Loading database from Firestore...");

  clearGlobalUnsubscribes();

  const promises = [
    subscribeToCollection(db.collection("transactions"), "transactions",
      snap => snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })),
      data => globalRawTransactions = data),
    subscribeToCollection(db.collection("members"), "members",
      snap => snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })),
      data => globalRawMembers = data),
    subscribeToCollection(db.collection("settings").doc("subtypes"), "subtypes",
      doc => doc.exists ? doc.data() : null,
      data => globalRawSubtypes = data),
    subscribeToCollection(db.collection("categories"), "categories",
      snap => snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })),
      data => {
        globalRawCategories = data;
        applyDatabaseCategories(data);
      }),
    subscribeToCollection(db.collection("settings").doc("subscriptions_sheet"), "subscriptions_sheet",
      doc => doc.exists ? doc.data() : null,
      data => globalRawSubscriptionsSheet = data),
    subscribeToCollection(db.collection("opening_balances"), "opening_balances",
      snap => {
        const m = {};
        snap.forEach(doc => {
          const d = doc.data() || {};
          const c = Number(d.cash ?? d.cash_amount ?? 0);
          const s = Number(d.sbi ?? d.sbiCurrent ?? d.sbi_current_amount ?? 0);
          const f = Number(d.fd ?? d.sbiFd ?? d.sbi_fd_amount ?? 0);
          const obj = {
            ...d,
            cash: c,
            sbi: s,
            sbiCurrent: s,
            fd: f,
            sbiFd: f,
            cash_amount: c,
            sbi_current_amount: s,
            sbi_fd_amount: f
          };
          m[doc.id] = obj;
          if (d.financial_year) m[d.financial_year] = obj;
          if (d.financialYear) m[d.financialYear] = obj;
          if (!m["2026-2027"]) m["2026-2027"] = obj;
          if (!m["default"]) m["default"] = obj;
        });
        return m;
      },
      data => {
        globalRawOpening = data || {};
        window.openingBalancesStore = window.openingBalancesStore || {};
        Object.assign(window.openingBalancesStore, globalRawOpening);
        if (typeof renderDashboard === 'function') {
          renderDashboard();
        }
        if (typeof renderRecentTransactions === 'function' && currentLoadedTxList) {
          renderRecentTransactions();
        }
        if (typeof renderBankBookTransactions === 'function') {
          renderBankBookTransactions();
        }
      }),
    subscribeToCollection(db.collection("bank_transactions"), "bank_transactions",
      snap => snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })),
      data => {
        globalRawBankTransactions = data;
        if (typeof renderDashboard === 'function' && document.getElementById('dashCashInHand')) {
          renderDashboard();
        }
      }),
    subscribeToCollection(db.collection("settings").doc("bank_accounts"), "bank_accounts",
      doc => doc.exists ? doc.data().accounts : null,
      data => globalRawBankAccounts = data),
    subscribeToCollection(db.collection("settings").doc("field_rules"), "field_rules",
      doc => doc.exists ? doc.data() : null,
      data => globalRawFieldRules = data),
    subscribeToCollection(db.collection("settings").doc("sidebarOrder"), "sidebarOrder",
      doc => doc.exists ? doc.data() : null,
      data => globalRawSidebarOrder = data),
    subscribeToCollection(db.collection("settings").doc("tabNames"), "tabNames",
      doc => doc.exists ? doc.data() : null,
      data => globalRawTabNames = data),
    subscribeToCollection(db.collection("suspense_transactions"), "suspense_transactions",
      snap => snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })),
      data => globalRawSuspense = data)
  ];

  // Load UPI ID separately so it doesn't block the main app load if permissions fail
  subscribeToCollection(db.collection("settings").doc("churchUpiId"), "churchUpiId",
    doc => doc.exists ? doc.data().id : "",
    data => {
      globalChurchUpiId = data || "";
      const el = document.getElementById('churchUpiId');
      if (el) el.value = globalChurchUpiId;
    }).catch(err => console.warn("Could not load churchUpiId:", err));

  // Load Phone Config settings
  subscribeToCollection(db.collection("settings").doc("phoneConfig"), "phoneConfig",
    doc => doc.exists ? doc.data() : { enabled: true, prefix: '+91' },
    data => {
      if (data) {
        globalAutoPhonePrefix = data.enabled !== false;
        globalPhonePrefixCode = data.prefix || '+91';
      }
      const toggleEl = document.getElementById('phonePrefixToggle');
      const codeEl = document.getElementById('phonePrefixCode');
      const wrapperEl = document.getElementById('phonePrefixCodeWrapper');
      if (toggleEl) toggleEl.checked = globalAutoPhonePrefix;
      if (codeEl) codeEl.value = globalPhonePrefixCode;
      if (wrapperEl) wrapperEl.style.display = globalAutoPhonePrefix ? 'flex' : 'none';
      syncPhonePrefixUI();
    }).catch(err => console.warn("Could not load phoneConfig:", err));

  // Load Auto Backup Config settings
  subscribeToCollection(db.collection("settings").doc("auto_backup"), "auto_backup",
    doc => doc.exists ? doc.data() : null,
    data => {
      if (data) {
        globalAutoBackupConfig = Object.assign({}, defaultAutoBackupConfig, data);
      } else {
        globalAutoBackupConfig = Object.assign({}, defaultAutoBackupConfig);
      }
      populateAutoBackupUI(globalAutoBackupConfig);
    }).catch(err => console.warn("Could not load auto_backup config:", err));

  Promise.all(promises)
    .then(unsubs => {
      globalUnsubscribes = unsubs;
      hideGlobalLoading();

      processAndRenderAll();
      handleHashChange(); // Navigate to the correct tab on initial load
      initAutoBackupScheduler();

      // Trigger celebratory welcome & data refreshed popup on every refresh/page load
      if (currentLoggedInUser) {
        const greetingName = currentLoggedInUser.name || (currentLoggedInUser.email ? currentLoggedInUser.email.split('@')[0] : 'User');
        const greetingPhoto = currentLoggedInUser.photoUrl || '';
        setTimeout(() => {
          triggerCelebratoryWelcomePopup(greetingName, currentUserRole, greetingPhoto, true);
        }, 150);
      }
    })
    .catch(err => {
      hideGlobalLoading();
      alert("Failed to connect to Firebase Sync: " + err.message);
    });
}

// --- AUTOMATED EXCEL BACKUP & EMAIL LOGIC ---
function populateAutoBackupUI(cfg) {
  if (!cfg) cfg = globalAutoBackupConfig;
  const toggleEl = document.getElementById('autoBackupToggle');
  const emailEl = document.getElementById('autoBackupEmail');
  const freqEl = document.getElementById('autoBackupFrequency');
  const dayEl = document.getElementById('autoBackupDayOfWeek');
  const timeEl = document.getElementById('autoBackupTime');
  const unitEl = document.getElementById('autoBackupIntervalUnit');
  const valEl = document.getElementById('autoBackupIntervalVal');
  const webhookEl = document.getElementById('autoBackupWebhookUrl');
  const serviceIdEl = document.getElementById('emailjsServiceId');
  const templateIdEl = document.getElementById('emailjsTemplateId');
  const publicKeyEl = document.getElementById('emailjsPublicKey');
  const lastStatusEl = document.getElementById('autoBackupLastStatus');

  if (toggleEl) toggleEl.checked = !!cfg.enabled;
  if (emailEl) emailEl.value = cfg.email || '';
  if (freqEl) freqEl.value = cfg.frequency || 'weekly';
  if (dayEl) dayEl.value = cfg.dayOfWeek !== undefined ? cfg.dayOfWeek : 1;
  if (timeEl) timeEl.value = cfg.timeOfDay || '09:00';
  if (unitEl) unitEl.value = cfg.intervalUnit || 'days';
  if (valEl) valEl.value = cfg.intervalVal || 7;
  if (webhookEl) webhookEl.value = cfg.emailServiceUrl || '';
  if (serviceIdEl) serviceIdEl.value = cfg.emailjsServiceId || '';
  if (templateIdEl) templateIdEl.value = cfg.emailjsTemplateId || '';
  if (publicKeyEl) publicKeyEl.value = cfg.emailjsPublicKey || '';

  if (typeof toggleAutoBackupUI === 'function') toggleAutoBackupUI(!!cfg.enabled);
  if (typeof handleBackupFreqChange === 'function') handleBackupFreqChange(cfg.frequency || 'weekly');

  if (lastStatusEl) {
    if (cfg.lastBackupTime) {
      let formattedDate = new Date(cfg.lastBackupTime).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      lastStatusEl.innerHTML = `Last sent: <b>${formattedDate}</b> (${cfg.lastStatus || 'Success'})`;
      lastStatusEl.style.color = cfg.lastStatus && cfg.lastStatus.toLowerCase().includes('failed') ? '#ef4444' : '#059669';
    } else {
      lastStatusEl.innerText = cfg.lastStatus || 'Not run yet';
      lastStatusEl.style.color = '#64748b';
    }
  }
}

function getAutoBackupSettingsFromUI() {
  const toggleEl = document.getElementById('autoBackupToggle');
  const emailEl = document.getElementById('autoBackupEmail');
  const freqEl = document.getElementById('autoBackupFrequency');
  const dayEl = document.getElementById('autoBackupDayOfWeek');
  const timeEl = document.getElementById('autoBackupTime');
  const unitEl = document.getElementById('autoBackupIntervalUnit');
  const valEl = document.getElementById('autoBackupIntervalVal');
  const webhookEl = document.getElementById('autoBackupWebhookUrl');
  const serviceIdEl = document.getElementById('emailjsServiceId');
  const templateIdEl = document.getElementById('emailjsTemplateId');
  const publicKeyEl = document.getElementById('emailjsPublicKey');

  const updated = {
    enabled: toggleEl ? toggleEl.checked : globalAutoBackupConfig.enabled,
    email: emailEl ? emailEl.value.trim() : globalAutoBackupConfig.email,
    frequency: freqEl ? freqEl.value : globalAutoBackupConfig.frequency,
    dayOfWeek: dayEl ? parseInt(dayEl.value, 10) : globalAutoBackupConfig.dayOfWeek,
    timeOfDay: timeEl ? timeEl.value : globalAutoBackupConfig.timeOfDay,
    intervalUnit: unitEl ? unitEl.value : globalAutoBackupConfig.intervalUnit,
    intervalVal: valEl ? Math.max(1, parseInt(valEl.value, 10) || 1) : globalAutoBackupConfig.intervalVal,
    emailServiceUrl: webhookEl ? webhookEl.value.trim() : globalAutoBackupConfig.emailServiceUrl,
    emailjsServiceId: serviceIdEl ? serviceIdEl.value.trim() : globalAutoBackupConfig.emailjsServiceId,
    emailjsTemplateId: templateIdEl ? templateIdEl.value.trim() : globalAutoBackupConfig.emailjsTemplateId,
    emailjsPublicKey: publicKeyEl ? publicKeyEl.value.trim() : globalAutoBackupConfig.emailjsPublicKey,
    lastBackupTime: globalAutoBackupConfig.lastBackupTime || null,
    lastStatus: globalAutoBackupConfig.lastStatus || 'Not run yet',
    nextScheduledTime: calculateNextBackupScheduleTime({
      enabled: toggleEl ? toggleEl.checked : globalAutoBackupConfig.enabled,
      frequency: freqEl ? freqEl.value : globalAutoBackupConfig.frequency,
      dayOfWeek: dayEl ? parseInt(dayEl.value, 10) : globalAutoBackupConfig.dayOfWeek,
      timeOfDay: timeEl ? timeEl.value : globalAutoBackupConfig.timeOfDay,
      intervalUnit: unitEl ? unitEl.value : globalAutoBackupConfig.intervalUnit,
      intervalVal: valEl ? Math.max(1, parseInt(valEl.value, 10) || 1) : globalAutoBackupConfig.intervalVal,
    })
  };
  globalAutoBackupConfig = Object.assign({}, globalAutoBackupConfig, updated);
  return updated;
}

function calculateNextBackupScheduleTime(cfg) {
  if (!cfg.enabled) return null;
  const now = new Date();
  let next = new Date(now.getTime());

  if (cfg.frequency === 'weekly') {
    const targetDay = cfg.dayOfWeek !== undefined ? cfg.dayOfWeek : 1;
    const currentDay = now.getDay();
    let daysAhead = (targetDay - currentDay + 7) % 7;
    const [hrs, mins] = (cfg.timeOfDay || '09:00').split(':').map(Number);
    next.setHours(hrs || 9, mins || 0, 0, 0);

    if (daysAhead === 0 && now.getTime() >= next.getTime()) {
      daysAhead = 7;
    }
    next.setDate(now.getDate() + daysAhead);
  } else if (cfg.frequency === 'daily') {
    const [hrs, mins] = (cfg.timeOfDay || '09:00').split(':').map(Number);
    next.setHours(hrs || 9, mins || 0, 0, 0);
    if (now.getTime() >= next.getTime()) {
      next.setDate(now.getDate() + 1);
    }
  } else if (cfg.frequency === 'custom') {
    const val = cfg.intervalVal || 7;
    if (cfg.intervalUnit === 'minutes') {
      next = new Date(now.getTime() + val * 60 * 1000);
    } else {
      next = new Date(now.getTime() + val * 24 * 60 * 60 * 1000);
    }
  }
  return next.toISOString();
}

async function sendBackupEmail(targetEmails, backupData) {
  const cfg = globalAutoBackupConfig;
  const dateStr = new Date().toLocaleDateString('en-IN');
  const subject = `Church Accounts Full Data Backup (${dateStr})`;
  const bodyText = `Church Accounts Full Data Excel Backup\nGenerated on: ${new Date().toLocaleString()}\nFile: ${backupData.filename}\nSize: ${Math.round(backupData.blob.size / 1024)} KB`;

  if (cfg.emailServiceUrl && cfg.emailServiceUrl.trim() !== '') {
    const resp = await fetch(cfg.emailServiceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: targetEmails,
        subject: subject,
        filename: backupData.filename,
        base64Content: backupData.base64,
        summary: bodyText,
        sentAt: new Date().toISOString()
      })
    });
    if (!resp.ok) throw new Error("Webhook API returned status " + resp.status);
    return "Sent via Custom Webhook";
  }

  if (cfg.emailjsServiceId && cfg.emailjsTemplateId && cfg.emailjsPublicKey) {
    const resp = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: cfg.emailjsServiceId,
        template_id: cfg.emailjsTemplateId,
        user_id: cfg.emailjsPublicKey,
        template_params: {
          to_email: targetEmails,
          subject: subject,
          message: bodyText,
          content: backupData.base64,
          filename: backupData.filename
        }
      })
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error("EmailJS service error: " + errText);
    }
    return "Sent via EmailJS API";
  }

  const downloadUrl = URL.createObjectURL(backupData.blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = backupData.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

  const mailtoUrl = `mailto:${encodeURIComponent(targetEmails)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText + "\n\nNote: The full Excel backup file has been saved to your downloads folder. Please attach it to this email.")}`;
  window.open(mailtoUrl, '_blank');

  return "Excel Downloaded & Mail Composer Opened";
}

async function triggerImmediateEmailBackup(isAutomated = false) {
  const cfg = getAutoBackupSettingsFromUI();
  const targetEmail = cfg.email || (globalAutoBackupConfig ? globalAutoBackupConfig.email : '');

  if (!targetEmail || targetEmail.trim() === '') {
    if (!isAutomated) {
      alert("Please enter a target Email Address in settings first! 📧");
    }
    return;
  }

  if (!isAutomated && typeof showGlobalLoading === 'function') showGlobalLoading("Generating & Sending Excel Backup...");

  try {
    const backupData = await generateBackupExcelBlob();
    const resultMsg = await sendBackupEmail(targetEmail, backupData);

    const nowIso = new Date().toISOString();
    const updatedStatus = {
      lastBackupTime: nowIso,
      lastStatus: "Success (" + resultMsg + ")",
      nextScheduledTime: calculateNextBackupScheduleTime(cfg)
    };

    globalAutoBackupConfig = Object.assign({}, globalAutoBackupConfig, updatedStatus);
    await db.collection("settings").doc("auto_backup").set(Object.assign({}, cfg, updatedStatus));

    populateAutoBackupUI(globalAutoBackupConfig);

    if (!isAutomated) {
      alert(`✨ Excel Backup Successfully Prepared & Dispatched!\nTarget Email: ${targetEmail}\nStatus: ${resultMsg}`);
    } else {
      console.log(`[AutoBackup] Automated backup executed successfully at ${nowIso} to ${targetEmail}`);
    }
  } catch (err) {
    console.error("Backup failed:", err);
    const nowIso = new Date().toISOString();
    const failedStatus = {
      lastBackupTime: nowIso,
      lastStatus: "Failed: " + err.message
    };
    globalAutoBackupConfig = Object.assign({}, globalAutoBackupConfig, failedStatus);
    db.collection("settings").doc("auto_backup").set(Object.assign({}, cfg, failedStatus)).catch(e => console.warn(e));
    populateAutoBackupUI(globalAutoBackupConfig);

    if (!isAutomated) {
      alert("Oops! Backup sending error: " + err.message + " 🔌");
    }
  } finally {
    if (!isAutomated && typeof hideGlobalLoading === 'function') hideGlobalLoading();
  }
}

let autoBackupSchedulerTimer = null;
function initAutoBackupScheduler() {
  if (autoBackupSchedulerTimer) clearInterval(autoBackupSchedulerTimer);
  autoBackupSchedulerTimer = setInterval(() => {
    try {
      if (!globalAutoBackupConfig || !globalAutoBackupConfig.enabled) return;
      if (!globalAutoBackupConfig.email || globalAutoBackupConfig.email.trim() === '') return;

      const now = Date.now();
      let nextTime = globalAutoBackupConfig.nextScheduledTime ? new Date(globalAutoBackupConfig.nextScheduledTime).getTime() : null;

      if (!nextTime) {
        const computedNext = calculateNextBackupScheduleTime(globalAutoBackupConfig);
        if (computedNext) {
          globalAutoBackupConfig.nextScheduledTime = computedNext;
          db.collection("settings").doc("auto_backup").update({ nextScheduledTime: computedNext }).catch(e => console.warn(e));
        }
        return;
      }

      if (now >= nextTime) {
        console.log("[AutoBackup] Backup schedule due! Triggering automated email backup...");
        triggerImmediateEmailBackup(true);
      }
    } catch (e) {
      console.warn("Error in auto backup scheduler tick:", e);
    }
  }, 60000);
}

function getLedgerPoolForLists(generalList, bankList) {
  const pool = [];
  const seenKeys = new Set();
  const seenVouchers = new Set();

  (generalList || []).forEach(tx => {
    if (!isLedgerExpenseTx(tx)) return;
    const entryType = (tx.entryType || '').toLowerCase();
    const vrStr = String(tx.vrNo || '').trim().toLowerCase();
    const isBank = entryType === 'bank' || vrStr.endsWith('/b');
    if (isBank) return; // Authoritative bank entries are provided by bankList
    const amt = Number(tx.payment || tx.payments || tx.debit || tx.amount || 0);
    if (amt <= 0) return;

    const key = tx.id ? `c_${tx.id}` : `vr_${tx.vrNo}_${tx.date}_${amt}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      if (vrStr) seenVouchers.add(vrStr);
      pool.push(tx);
    }
  });

  (bankList || []).forEach(tx => {
    if (!isLedgerExpenseTx(tx)) return;
    const amt = Number(tx.amount || tx.debit || tx.payment || tx.payments || 0);
    if (amt <= 0) return;

    const vrStr = String(tx.vrNo || '').trim().toLowerCase();

    // Check bank transaction ID uniqueness
    if (tx.id && seenKeys.has(`b_${tx.id}`)) return;
    // Check if linked to an already added cash transaction
    const linkedCashId = tx.cashId || tx.cash_id;
    if (linkedCashId && seenKeys.has(`c_${linkedCashId}`)) return;
    // Check if duplicate identical voucher
    if (vrStr && seenVouchers.has(vrStr)) return;

    const key = tx.id ? `b_${tx.id}` : `bvr_${tx.vrNo}_${tx.date}_${amt}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      if (vrStr) seenVouchers.add(vrStr);
      pool.push({
        ...tx,
        isBankEntry: true
      });
    }
  });

  return pool;
}

function buildDynamicStatementItems(generalList, bankList, suspenseList) {
  const targetIncome = [
    "Opening Balance Cash in Hand",
    "Opening Balance SBI Current A/c",
    "Opening Balance SBI Fixed Deposit",
    "Subscription",
    "Offertory",
    "Charity Received",
    "Donations",
    "First Fruits",
    "Sodari Samajam for Deposit",
    "Anniversary Expenses Received",
    "Monthly Meeting",
    "Bank Interest (Income)"
  ];
  const targetExpense = [
    "General Expense",
    "Printing and Stationery",
    "Electricity Expenses (Church)",
    "Electricity Expenses (Parcenage)",
    "Lord's Supper/Sunday School Expenses",
    "Salary (Pr. T.T.Simon)",
    "Allowance (Pr. T.T.Simon)",
    "Church Maintenance",
    "General Body/Anniversary Meeting Expenses",
    "Fasting/wednesday Prayer Expenses",
    "Drinking Water",
    "Church Cleaning Expenses",
    "Conveyance Expenses",
    "Guest/Visiting Pastors",
    "Generator Expenses",
    "Church Building/Land Taxes",
    "IPC Church Registration & Membership",
    "Kerala Water Authority for water Supply",
    "Charity Paid",
    "Purchases",
    "Monthly Meeting"
  ];

  const cf = calculateCarryForward();

  const incomeMap = {};
  const expenseMap = {};
  const depositMap = {};
  const withdrawalMap = {};
  const categoryTxMap = {};

  targetIncome.forEach(k => incomeMap[k] = 0);
  targetIncome.forEach(k => { depositMap[k] = 0; withdrawalMap[k] = 0; });
  targetExpense.forEach(k => expenseMap[k] = 0);
  targetExpense.forEach(k => { depositMap[k] = 0; withdrawalMap[k] = 0; });

  // Initialize with carry forwards
  incomeMap["Opening Balance Cash in Hand"] = cf.cash;
  incomeMap["Opening Balance SBI Current A/c"] = cf.sbi;
  incomeMap["Opening Balance SBI Fixed Deposit"] = cf.fd;

  let calcTotalIncome = cf.cash + cf.sbi + cf.fd;
  let calcTotalExpenditure = 0;

  function normalize(str) {
    return (str || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function toTitleCase(str) {
    if (!str) return '';
    return str.toString()
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  const normIncomeMap = {};
  const normExpenseMap = {};
  targetIncome.forEach(k => normIncomeMap[normalize(k)] = k);
  targetExpense.forEach(k => normExpenseMap[normalize(k)] = k);

  function classifyCategory(tx, isReceipt) {
    const catVal = String(tx.category || '').trim();
    const subVal = String(tx.subtype || tx.subType || tx.bankSubtype || tx.bank_subtype || '').trim();
    const typeVal = String(tx.type || '').trim();
    const descStr = String(tx.description || tx.particulars || tx.desc || '').toLowerCase();
    const nameStr = String(tx.name || tx.accountName || tx.account_name || '').toLowerCase();

    const vrVal = String(tx.vrNo || tx.vr_no || tx.voucher_no || '').trim();
    const explicitFields = `${catVal} ${subVal} ${typeVal} ${vrVal}`.toLowerCase();
    const subLower = subVal.toLowerCase();
    const typeLower = typeVal.toLowerCase();
    const catLower = catVal.toLowerCase();

    // 0. Primary Category / Subtype Bank Interest matches (explicitly fetching from category)
    if (catLower === 'bank interest (income)' || catLower === 'bank interest' || catLower.includes('bank interest') ||
        subLower === 'bank interest (income)' || subLower === 'bank interest' || subLower.includes('bank interest')) {
      return 'Bank Interest (Income)';
    }
    if (catLower.includes('sodari') || catLower.includes('sodhari') || subLower.includes('sodari') || subLower.includes('sodhari')) {
      return 'Sodari Samajam for Deposit';
    }

    // 1. Primary Database Type matches
    if (typeLower === 'monthly meeting' || isMeetingTransaction(tx)) {
      return 'Monthly Meeting';
    }
    // Offering / Offertory: check type, accountName, and category
    if (typeLower === 'offering' || typeLower === 'offertory' || nameStr.includes('offertory') || nameStr.includes('offering')) {
      return 'Offertory';
    }
    if (typeLower === 'subscription' || explicitFields.includes('subscription')) {
      return 'Subscription';
    }
    if (explicitFields.includes('offering') || explicitFields.includes('offertory')) {
      return 'Offertory';
    }
    if (typeLower === 'charity' || explicitFields.includes('charity')) {
      if (subLower.includes('received')) return 'Charity Received';
      if (subLower.includes('paid')) return 'Charity Paid';
      return isReceipt ? 'Charity Received' : 'Charity Paid';
    }
    if (isGeneralBodyOrAnniversaryTx(tx)) {
      return isReceipt ? 'Anniversary Expenses Received' : 'General Body/Anniversary Meeting Expenses';
    }

    // 2. Specific Subtype checks
    if (subLower.includes('guest') || subLower.includes('visiting')) return 'Guest/Visiting Pastors';
    if (subLower.includes('fasting') || subLower.includes('wednesday')) return 'Fasting/wednesday Prayer Expenses';
    if (subLower.includes('supper') || subLower.includes('sunday')) return "Lord's Supper/Sunday School Expenses";
    if (subLower.includes('salary')) return 'Salary (Pr. T.T.Simon)';
    if (subLower.includes('allowance')) return 'Allowance (Pr. T.T.Simon)';
    if (subLower.includes('maintenance')) return 'Church Maintenance';
    if (subLower.includes('printing') || subLower.includes('stationery')) return 'Printing and Stationery';
    if (subLower.includes('purchase')) return 'Purchases';
    if (subLower.includes('cleaning')) return 'Church Cleaning Expenses';
    if (subLower.includes('drinking water') || (subLower.includes('water') && !subLower.includes('kerala') && !subLower.includes('authority'))) return 'Drinking Water';
    if (subLower.includes('kerala') || subLower.includes('authority')) return 'Kerala Water Authority for water Supply';
    if (subLower.includes('electricity')) {
      return (subLower.includes('parcenage') || subLower.includes('parsonage'))
        ? 'Electricity Expenses (Parcenage)'
        : 'Electricity Expenses (Church)';
    }
    if (subLower.includes('conveyance')) return 'Conveyance Expenses';
    if (subLower.includes('generator')) return 'Generator Expenses';
    if (subLower.includes('tax') || subLower.includes('building') || subLower.includes('land')) return 'Church Building/Land Taxes';
    if (subLower.includes('registration') || subLower.includes('membership')) return 'IPC Church Registration & Membership';
    if (subLower.includes('general body') || subLower.includes('anniversary')) {
      return isReceipt ? 'Anniversary Expenses Received' : 'General Body/Anniversary Meeting Expenses';
    }
    if (subLower.includes('sodari') || subLower.includes('sodhari')) return 'Sodari Samajam for Deposit';
    if (subLower.includes('donation')) return 'Donations';
    if (subLower.includes('first fruit') || subLower.includes('firstfruit')) return 'First Fruits';
    if (subLower.includes('general expense') || subLower.includes('general expenses')) return 'General Expense';
    
    const isSubInterest = subLower.includes('interest') || /\bint(\.|\b|\d)/i.test(subLower) || vrVal.toLowerCase().startsWith('int') || vrVal.toLowerCase().includes('int1') || vrVal.toLowerCase().includes('int2');
    if (isSubInterest) return (subLower.includes('sodari') || descStr.includes('sodari')) ? 'Sodari Samajam for Deposit' : 'Bank Interest (Income)';

    // 3. Fallback checks on combined text only when subtype is generic or empty
    const allText = `${explicitFields} ${descStr} ${nameStr}`.toLowerCase();
    if (allText.includes('salary')) return 'Salary (Pr. T.T.Simon)';
    if (allText.includes('allowance')) return 'Allowance (Pr. T.T.Simon)';
    if (allText.includes('purchase')) return 'Purchases';
    if (allText.includes('sodari') || allText.includes('sodhari')) return 'Sodari Samajam for Deposit';
    if (allText.includes('charity')) return isReceipt ? 'Charity Received' : 'Charity Paid';
    if (allText.includes('subscription')) return 'Subscription';
    if (allText.includes('offering') || allText.includes('offertory')) return 'Offertory';
    if (allText.includes('donation')) return 'Donations';
    if (allText.includes('first fruit') || allText.includes('firstfruit')) return 'First Fruits';
    if (allText.includes('maintenance')) return 'Church Maintenance';
    if (allText.includes('cleaning')) return 'Church Cleaning Expenses';
    if (allText.includes('drinking water') || (allText.includes('water') && !allText.includes('kerala') && !allText.includes('authority'))) return 'Drinking Water';
    if (allText.includes('kerala') || allText.includes('authority')) return 'Kerala Water Authority for water Supply';
    if (allText.includes('electricity')) {
      return (allText.includes('parcenage') || allText.includes('parsonage'))
        ? 'Electricity Expenses (Parcenage)'
        : 'Electricity Expenses (Church)';
    }
    if (allText.includes('printing') || allText.includes('stationery')) return 'Printing and Stationery';
    if (allText.includes('supper') || allText.includes('sunday')) return "Lord's Supper/Sunday School Expenses";
    if (allText.includes('fasting') || allText.includes('wednesday')) return 'Fasting/wednesday Prayer Expenses';
    if (allText.includes('conveyance')) return 'Conveyance Expenses';
    if (allText.includes('guest') || allText.includes('visiting')) return 'Guest/Visiting Pastors';
    if (allText.includes('generator')) return 'Generator Expenses';
    if (allText.includes('tax') || allText.includes('building') || allText.includes('land')) return 'Church Building/Land Taxes';
    if (allText.includes('registration') || allText.includes('membership')) return 'IPC Church Registration & Membership';
    if (allText.includes('interest') || /\bint(\.|\b|\d)/i.test(allText) || vrVal.toLowerCase().startsWith('int') || vrVal.toLowerCase().includes('int1') || vrVal.toLowerCase().includes('int2')) {
      return (allText.includes('sodari') || allText.includes('sodhari')) ? 'Sodari Samajam for Deposit' : 'Bank Interest (Income)';
    }
    if (allText.includes('general expense') || allText.includes('general expenses')) return 'General Expense';

    const genericWrappers = new Set(['ledger', 'payment', 'receipt', 'general', 'bank', 'cash', 'expenses', 'expense', 'other income', 'general expense', 'general expenses', '-', '']);
    if (subVal && !genericWrappers.has(subVal.toLowerCase())) {
      const nSub = normalize(subVal);
      if (isReceipt && normIncomeMap[nSub]) return normIncomeMap[nSub];
      if (!isReceipt && normExpenseMap[nSub]) return normExpenseMap[nSub];
      return toTitleCase(subVal);
    }
    if (catVal && !genericWrappers.has(catVal.toLowerCase())) {
      const nCat = normalize(catVal);
      if (isReceipt && normIncomeMap[nCat]) return normIncomeMap[nCat];
      if (!isReceipt && normExpenseMap[nCat]) return normExpenseMap[nCat];
      return toTitleCase(catVal);
    }

    return isReceipt ? 'Other Income' : 'General Expense';
  }

  // --- 1. EXPENDITURES ---
  // A. Ledger expenditures: exactly mirrors the calculation displayed in Ledger Accounts tab
  const ledgerPool = getLedgerPoolForLists(generalList, bankList);
  ledgerPool.forEach(tx => {
    const head = getCanonicalLedgerHead(tx);
    const amt = Number(tx.payment || tx.payments || tx.debit || tx.amount || 0);
    if (amt > 0) {
      expenseMap[head] = (expenseMap[head] || 0) + amt;
      if (!categoryTxMap[head]) categoryTxMap[head] = [];
      categoryTxMap[head].push({
        date: tx.date,
        name: tx.accountName || tx.name || '-',
        desc: tx.description || tx.particulars || '-',
        amount: amt
      });
    }
  });

  // B. Monthly Meeting expenditures (excluded from ledger pool, tracked dynamically)
  const seenMeetingKeys = new Set();
  const seenMeetingVrs = new Set();
  (generalList || []).forEach(tx => {
    if (isMeetingTransaction(tx)) {
      const entryType = (tx.entryType || '').toLowerCase();
      const vrStr = String(tx.vrNo || '').trim().toLowerCase();
      if (entryType === 'bank' || vrStr.endsWith('/b')) return;
      const amt = Number(tx.payment || tx.payments || tx.debit || 0);
      if (amt > 0) {
        const k = tx.id ? `c_${tx.id}` : `vr_${tx.vrNo}_${tx.date}_${amt}`;
        if (!seenMeetingKeys.has(k)) {
          seenMeetingKeys.add(k);
          if (vrStr) seenMeetingVrs.add(vrStr);
          expenseMap['Monthly Meeting'] = (expenseMap['Monthly Meeting'] || 0) + amt;
          if (!categoryTxMap['Monthly Meeting']) categoryTxMap['Monthly Meeting'] = [];
          categoryTxMap['Monthly Meeting'].push({ date: tx.date, name: tx.accountName || tx.name || '-', desc: tx.description || '-', amount: amt });
        }
      }
    }
  });
  (bankList || []).forEach(tx => {
    if (isMeetingTransaction(tx)) {
      if (tx.cashId && seenMeetingKeys.has(`c_${tx.cashId}`)) return;
      if (tx.id && (seenMeetingKeys.has(`c_${tx.id}`) || seenMeetingKeys.has(`b_${tx.id}`))) return;
      const vrStr = String(tx.vrNo || '').trim().toLowerCase();
      const vrBase = vrStr.replace(/\/b$/i, '');
      if (vrStr && seenMeetingVrs.has(vrStr)) return;
      if (vrBase && seenMeetingVrs.has(vrBase)) return;
      const amt = Number(tx.amount || tx.debit || tx.payment || tx.payments || 0);
      if (amt > 0) {
        const k = tx.id ? `b_${tx.id}` : `bvr_${tx.vrNo}_${tx.date}_${amt}`;
        if (!seenMeetingKeys.has(k)) {
          seenMeetingKeys.add(k);
          if (vrStr) seenMeetingVrs.add(vrStr);
          expenseMap['Monthly Meeting'] = (expenseMap['Monthly Meeting'] || 0) + amt;
          if (!categoryTxMap['Monthly Meeting']) categoryTxMap['Monthly Meeting'] = [];
          categoryTxMap['Monthly Meeting'].push({ date: tx.date, name: tx.accountName || tx.name || '-', desc: tx.description || tx.particulars || '-', amount: amt });
        }
      }
    }
  });

  // C. Charity Paid (excluded from ledger pool, tracked dynamically)
  const seenCharityKeys = new Set();
  const seenCharityVrs = new Set();
  (generalList || []).forEach(tx => {
    const typeStr = (tx.type || '').toLowerCase();
    const subStr = (tx.subtype || tx.description || '').toLowerCase();
    const isCharityPaid = (typeStr.includes('charity') && subStr.includes('paid')) || typeStr.includes('charity paid') || (typeStr === 'charity' && Number(tx.payment || tx.payments || 0) > 0);
    if (isCharityPaid) {
      const entryType = (tx.entryType || '').toLowerCase();
      const vrStr = String(tx.vrNo || '').trim().toLowerCase();
      if (entryType === 'bank' || vrStr.endsWith('/b')) return;
      const amt = Number(tx.payment || tx.payments || tx.amount || 0);
      if (amt > 0) {
        const k = tx.id ? `c_${tx.id}` : `vr_${tx.vrNo}_${tx.date}_${amt}`;
        if (!seenCharityKeys.has(k)) {
          seenCharityKeys.add(k);
          if (vrStr) seenCharityVrs.add(vrStr);
          expenseMap['Charity Paid'] = (expenseMap['Charity Paid'] || 0) + amt;
          if (!categoryTxMap['Charity Paid']) categoryTxMap['Charity Paid'] = [];
          categoryTxMap['Charity Paid'].push({ date: tx.date, name: tx.accountName || tx.name || '-', desc: tx.description || '-', amount: amt });
        }
      }
    }
  });
  (bankList || []).forEach(tx => {
    const typeStr = (tx.type || '').toLowerCase();
    const subStr = (tx.subtype || tx.bankSubtype || tx.description || '').toLowerCase();
    const isCharityPaid = (typeStr.includes('charity') && subStr.includes('paid')) || typeStr.includes('charity paid') || (typeStr === 'charity' && Number(tx.debit || tx.payment || tx.payments || 0) > 0);
    if (isCharityPaid) {
      if (tx.cashId && seenCharityKeys.has(`c_${tx.cashId}`)) return;
      if (tx.id && (seenCharityKeys.has(`c_${tx.id}`) || seenCharityKeys.has(`b_${tx.id}`))) return;
      const vrStr = String(tx.vrNo || '').trim().toLowerCase();
      const vrBase = vrStr.replace(/\/b$/i, '');
      if (vrStr && seenCharityVrs.has(vrStr)) return;
      if (vrBase && seenCharityVrs.has(vrBase)) return;
      const amt = Number(tx.amount || tx.debit || tx.payment || tx.payments || 0);
      if (amt > 0) {
        const k = tx.id ? `b_${tx.id}` : `bvr_${tx.vrNo}_${tx.date}_${amt}`;
        if (!seenCharityKeys.has(k)) {
          seenCharityKeys.add(k);
          if (vrStr) seenCharityVrs.add(vrStr);
          expenseMap['Charity Paid'] = (expenseMap['Charity Paid'] || 0) + amt;
          if (!categoryTxMap['Charity Paid']) categoryTxMap['Charity Paid'] = [];
          categoryTxMap['Charity Paid'].push({ date: tx.date, name: tx.accountName || tx.name || '-', desc: tx.description || tx.particulars || '-', amount: amt });
        }
      }
    }
  });

  // D. Suspense Expenditures: Advance Paid
  if (suspenseList && suspenseList.length > 0) {
    suspenseList.forEach(tx => {
      const isAdvanceRcpt = tx.type === 'Advance Received';
      const amt = Number(tx.amount || 0);
      if (amt <= 0) return;
      if (!isAdvanceRcpt) {
        let actualName = 'Suspense (Advance Paid)';
        expenseMap[actualName] = (expenseMap[actualName] || 0) + amt;
        if (!categoryTxMap[actualName]) categoryTxMap[actualName] = [];
        categoryTxMap[actualName].push({ date: tx.date, name: tx.name || '-', desc: tx.description || '-', amount: amt });
      }
    });
  }

  // --- 2. INCOME ---
  const seenReceiptVrs = new Set();
  const seenReceiptIds = new Set();

  // A. Cash Receipts & direct entries in general list
  if (generalList && generalList.length > 0) {
    generalList.forEach(tx => {
      const typeStr = (tx.type || '').toLowerCase();
      const subStr = (tx.subtype || tx.description || '').toLowerCase();
      const descStr = (tx.description || '').toLowerCase();
      const nameStr = (tx.name || tx.accountName || '').toLowerCase();
      const entryType = (tx.entryType || '').toLowerCase();
      const vrStr = String(tx.vrNo || tx.vr_no || tx.voucher_no || '').trim().toLowerCase();

      const allGenFields = `${tx.category || ''} ${tx.subtype || ''} ${tx.subType || ''} ${tx.bankSubtype || ''} ${tx.bank_subtype || ''} ${tx.type || ''} ${tx.description || ''} ${tx.particulars || ''} ${vrStr}`.toLowerCase();
      const isCatBankInterest = (tx.category || '').toLowerCase().includes('bank interest') || (tx.bankSubtype || '').toLowerCase().includes('bank interest') || (tx.subtype || '').toLowerCase().includes('bank interest');
      const isGenInterest = isCatBankInterest || allGenFields.includes('interest') || /\bint(\.|\b|\d)/i.test(allGenFields) || vrStr.startsWith('int') || vrStr.includes('int1') || vrStr.includes('int2');

      const isOpening = typeStr.includes('opening balance') || descStr.includes('opening balance') || nameStr.includes('opening balance');
      if (isOpening) return;
      const isContra = (descStr.includes('contra') || subStr.includes('contra') || descStr.includes('cash deposit') || descStr.includes('cash withdrawal'));
      if (isContra) return;

      // Pure bank receipts (e.g. Bank Interest, Direct Deposits into Bank) are processed in bankList
      if (entryType === 'bank' || vrStr.endsWith('/b') || vrStr.startsWith('int') || vrStr.includes('int1') || vrStr.includes('int2') || isCatBankInterest) {
        if (bankList && bankList.length > 0) {
          return;
        }
        // Fallback: If bankList is not available or empty, process Bank Interest here directly
        if (isGenInterest) {
          const amt = (Number(tx.amount) > 0 ? Number(tx.amount) : 0) || (Number(tx.receipt) > 0 ? Number(tx.receipt) : 0) || (Number(tx.credit) > 0 ? Number(tx.credit) : 0) || 0;
          if (amt <= 0) return;
          const isSodari = (tx.category || '').toLowerCase().includes('sodari') || allGenFields.includes('sodari') || allGenFields.includes('sodhari');
          const cat = (isCatBankInterest && !(tx.category || '').toLowerCase().includes('sodari')) ? 'Bank Interest (Income)' : (isSodari ? 'Sodari Samajam for Deposit' : 'Bank Interest (Income)');
          calcTotalIncome += amt;
          incomeMap[cat] = (incomeMap[cat] || 0) + amt;
          if (!categoryTxMap[cat]) categoryTxMap[cat] = [];
          categoryTxMap[cat].push({ date: tx.date, name: tx.accountName || tx.name || '-', desc: tx.description || tx.particulars || '-', amount: amt });
          if (tx.id) seenReceiptIds.add(`c_${tx.id}`);
          if (tx.vrNo) seenReceiptVrs.add(vrStr);
          return;
        }
      }

      const isCharityPaid = (typeStr.includes('charity') && subStr.includes('paid')) || typeStr.includes('charity paid');
      const isCharityReceived = (typeStr.includes('charity') && subStr.includes('received')) || typeStr.includes('charity received');
      const isReceipt = isCharityReceived ? true : (isCharityPaid ? false : ((tx.receipt && Number(tx.receipt) > 0) || (tx.credit && Number(tx.credit) > 0) || (tx.mode && (tx.mode === 'Receipt' || tx.mode.includes('Receipt') || tx.mode.includes('Credit')))));

      if (!isReceipt) return;
      const amt = Number(tx.amount || (tx.receipt || tx.credit) || 0);
      if (amt <= 0) return;

      // Check for array-based split items on cash transaction
      const splitItems = (Array.isArray(tx.splitItems) && tx.splitItems.length > 0)
        ? tx.splitItems
        : ((Array.isArray(tx._splitItems) && tx._splitItems.length > 0) ? tx._splitItems : null);

      if (splitItems && splitItems.length > 0) {
        splitItems.forEach(item => {
          const itemAmt = Number(item.amount || item.receipt || item.amt || item.credit || 0);
          if (itemAmt <= 0) return;
          const itemCat = classifyCategory(item, true);
          calcTotalIncome += itemAmt;
          incomeMap[itemCat] = (incomeMap[itemCat] || 0) + itemAmt;
          if (!categoryTxMap[itemCat]) categoryTxMap[itemCat] = [];
          categoryTxMap[itemCat].push({ date: tx.date, name: tx.accountName || tx.name || '-', desc: item.description || item.desc || tx.description || '-', amount: itemAmt });
        });
        if (tx.id) seenReceiptIds.add(`c_${tx.id}`);
        if (tx.vrNo) seenReceiptVrs.add(String(tx.vrNo).trim().toLowerCase());
        return;
      }

      // Check for text-based '+' split on cash transaction
      const descVal = (tx.description || tx.particulars || '').trim();
      if (descVal.includes('+')) {
        const parts = descVal.split(/\s*\+\s*/);
        const parsedParts = [];
        let allocatedSum = 0;

        parts.forEach(part => {
          const partTrimmed = part.trim();
          if (!partTrimmed) return;
          const pLower = partTrimmed.toLowerCase();

          let partAmt = 0;
          const parenMatch = partTrimmed.match(/\((?:[^0-9]*)([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\)/);
          if (parenMatch) partAmt = parseFloat(parenMatch[1].replace(/,/g, ''));
          if (!partAmt || isNaN(partAmt)) {
            const symMatch = partTrimmed.match(/(?:rs\.?|inr|₹)\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/i);
            if (symMatch) partAmt = parseFloat(symMatch[1].replace(/,/g, ''));
          }
          if (!partAmt || isNaN(partAmt)) {
            const slashMatch = partTrimmed.match(/([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*(?:\/-|\/rs)/i);
            if (slashMatch) partAmt = parseFloat(slashMatch[1].replace(/,/g, ''));
          }
          if (!partAmt || isNaN(partAmt)) {
            const numMatches = partTrimmed.match(/\b([0-9]{3,}(?:,[0-9]+)*(?:\.[0-9]+)?)\b/g);
            if (numMatches && numMatches.length === 1) {
              partAmt = parseFloat(numMatches[0].replace(/,/g, ''));
            }
          }

          let cat = 'Other Income';
          if (pLower.includes('subscription')) cat = 'Subscription';
          else if (pLower.includes('offertory') || pLower.includes('offering')) cat = 'Offertory';
          else if (pLower.includes('charity')) cat = 'Charity Received';
          else if (pLower.includes('donation')) cat = 'Donations';
          else if (pLower.includes('first fruit') || pLower.includes('firstfruit')) cat = 'First Fruits';
          else if (pLower.includes('sodari') || pLower.includes('sodhari')) cat = 'Sodari Samajam for Deposit';
          else if (pLower.includes('anniversary')) cat = 'Anniversary Expenses Received';
          else {
            cat = classifyCategory({ description: partTrimmed, particulars: partTrimmed, type: '' }, true);
          }

          parsedParts.push({ partTrimmed, partAmt, cat });
          if (partAmt > 0) allocatedSum += partAmt;
        });

        if (allocatedSum > 0 && allocatedSum < amt) {
          const missing = parsedParts.find(p => !p.partAmt || p.partAmt <= 0);
          if (missing) {
            missing.partAmt = amt - allocatedSum;
            allocatedSum = amt;
          }
        }

        if (allocatedSum > 0) {
          parsedParts.forEach(p => {
            const partAmt = p.partAmt || 0;
            if (partAmt <= 0) return;
            calcTotalIncome += partAmt;
            incomeMap[p.cat] = (incomeMap[p.cat] || 0) + partAmt;
            if (!categoryTxMap[p.cat]) categoryTxMap[p.cat] = [];
            categoryTxMap[p.cat].push({ date: tx.date, name: tx.accountName || tx.name || '-', desc: p.partTrimmed, amount: partAmt });
          });
          if (tx.id) seenReceiptIds.add(`c_${tx.id}`);
          if (tx.vrNo) seenReceiptVrs.add(String(tx.vrNo).trim().toLowerCase());
          return;
        }
      }

      const category = classifyCategory(tx, true);
      calcTotalIncome += amt;
      incomeMap[category] = (incomeMap[category] || 0) + amt;
      if (category.toLowerCase().includes('cash deposit')) depositMap[category] = (depositMap[category] || 0) + amt;
      if (category.toLowerCase().includes('cash withdrawal')) withdrawalMap[category] = (withdrawalMap[category] || 0) + amt;
      if (!categoryTxMap[category]) categoryTxMap[category] = [];
      categoryTxMap[category].push({ date: tx.date, name: tx.accountName || tx.name || '-', desc: tx.description || '-', amount: amt });

      if (tx.id) seenReceiptIds.add(`c_${tx.id}`);
      if (tx.vrNo) seenReceiptVrs.add(String(tx.vrNo).trim().toLowerCase());
    });
  }

  // B. Bank Receipts
  if (bankList && bankList.length > 0) {
    bankList.forEach(tx => {
      const typeStr = (tx.type || '').toLowerCase();
      const subStr = (tx.subtype || tx.subType || tx.bank_subtype || tx.bankSubtype || '').toLowerCase();
      const descStr = (tx.description || tx.particulars || '').toLowerCase();
      const nameStr = (tx.name || tx.accountName || tx.account_name || '').toLowerCase();
      const bsub = (tx.bankSubtype || tx.bank_subtype || '').toLowerCase();
      const catStr = (tx.category || '').toLowerCase();
      const vrStr = String(tx.vrNo || tx.vr_no || tx.voucher_no || '').trim().toLowerCase();

      // Skip Opening Balances
      const isOpening = typeStr.includes('opening balance') || descStr.includes('opening balance') || nameStr.includes('opening balance');
      if (isOpening) return;

      // Skip Contra entries (Cash Deposit / Cash Withdrawal)
      const isContra = descStr.includes('contra') || subStr.includes('contra') || bsub.includes('contra') ||
                       descStr.includes('cash deposit') || subStr.includes('cash deposit') || bsub.includes('cash deposit') ||
                       descStr.includes('cash withdrawal') || subStr.includes('cash withdrawal') || bsub.includes('cash withdrawal');
      if (isContra) return;

      // Skip Inter-bank transfers between church accounts
      const isInterBank = bsub.includes('inter-bank') || bsub.includes('inter transfer') || descStr.includes('inter-bank') || descStr.includes('inter transfer') || typeStr.includes('inter-bank');
      if (isInterBank) return;

      // Skip if already present/linked in generalList to prevent double counting
      const linkedCashId = tx.cashId || tx.cash_id;
      if (linkedCashId && seenReceiptIds.has(`c_${linkedCashId}`)) return;
      if (tx.id && seenReceiptIds.has(`b_${tx.id}`)) return;
      if (vrStr && vrStr.endsWith('/b') && seenReceiptVrs.has(vrStr)) return;

      const catLower = (tx.category || '').toLowerCase().trim();
      const bsubLower = (tx.bankSubtype || tx.bank_subtype || tx.subtype || tx.subType || '').toLowerCase().trim();
      const allText = `${descStr} ${subStr} ${bsub} ${catStr} ${typeStr} ${vrStr} ${nameStr} ${tx.particulars || ''} ${tx.description || ''} ${tx.mode || ''}`.toLowerCase();

      // Check category and bankSubtype directly for Bank Interest (Income)
      const isExplicitBankInterest = catLower === 'bank interest (income)' || catLower === 'bank interest' || catLower.includes('bank interest') ||
                                     bsubLower === 'bank interest (income)' || bsubLower === 'bank interest' || bsubLower.includes('bank interest');
      const isExplicitSodari = catLower.includes('sodari') || catLower.includes('sodhari') || bsubLower.includes('sodari') || bsubLower.includes('sodhari');

      const isOtherExplicitCategory = catLower.includes('subscription') || catLower.includes('offertory') || catLower.includes('offering') ||
                                      catLower.includes('donation') || catLower.includes('charity') || catLower.includes('first fruit') ||
                                      catLower.includes('meeting') || catLower.includes('anniversary');

      const isFallbackInterest = !isOtherExplicitCategory && (
                                   allText.includes('interest') ||
                                   /\bint(\.|\b|\d)/i.test(allText) ||
                                   vrStr.startsWith('int') ||
                                   vrStr.includes('int1') ||
                                   vrStr.includes('int2')
                                 );

      const isInterest = isExplicitBankInterest || isExplicitSodari || isFallbackInterest;

      const isReceipt = isInterest || (Number(tx.credit || 0) > 0) || (Number(tx.receipt || 0) > 0) || (tx.mode && (tx.mode.includes("Receipt") || tx.mode.includes("Credit") || tx.mode.includes("Deposit") || tx.mode.includes("Interest")));
      if (!isReceipt) return;

      const amt = (Number(tx.credit) > 0 ? Number(tx.credit) : 0) ||
                  (Number(tx.amount) > 0 ? Number(tx.amount) : 0) ||
                  (Number(tx.receipt) > 0 ? Number(tx.receipt) : 0) ||
                  (parseFloat(tx.credit) || parseFloat(tx.amount) || parseFloat(tx.receipt) || 0);
      if (amt <= 0) return;

      // Bank Interest specifically for Sodari Samajam FD
      const isSodari = isExplicitSodari || (!isExplicitBankInterest && (allText.includes('sodari') || allText.includes('sodhari')));
      if (isInterest && isSodari && !isExplicitBankInterest) {
        calcTotalIncome += amt;
        incomeMap['Sodari Samajam for Deposit'] = (incomeMap['Sodari Samajam for Deposit'] || 0) + amt;
        if (!categoryTxMap['Sodari Samajam for Deposit']) categoryTxMap['Sodari Samajam for Deposit'] = [];
        categoryTxMap['Sodari Samajam for Deposit'].push({ date: tx.date, name: tx.accountName || tx.name || '-', desc: tx.description || tx.particulars || '-', amount: amt });
        if (tx.id) seenReceiptIds.add(`b_${tx.id}`);
        return;
      }

      // Bank Interest (Income)
      if (isExplicitBankInterest || (isInterest && !isOtherExplicitCategory)) {
        calcTotalIncome += amt;
        incomeMap['Bank Interest (Income)'] = (incomeMap['Bank Interest (Income)'] || 0) + amt;
        if (!categoryTxMap['Bank Interest (Income)']) categoryTxMap['Bank Interest (Income)'] = [];
        categoryTxMap['Bank Interest (Income)'].push({ date: tx.date, name: tx.accountName || tx.name || '-', desc: tx.description || tx.particulars || '-', amount: amt });
        if (tx.id) seenReceiptIds.add(`b_${tx.id}`);
        return;
      }

      // 1. Array-based split items on Bank Transaction (tx.splitItems / tx._splitItems)
      const splitItems = (Array.isArray(tx.splitItems) && tx.splitItems.length > 0)
        ? tx.splitItems
        : ((Array.isArray(tx._splitItems) && tx._splitItems.length > 0) ? tx._splitItems : null);

      if (splitItems && splitItems.length > 0) {
        splitItems.forEach(item => {
          const itemAmt = Number(item.amount || item.credit || item.receipt || item.amt || 0);
          if (itemAmt <= 0) return;
          const itemCat = classifyCategory(item, true);
          calcTotalIncome += itemAmt;
          incomeMap[itemCat] = (incomeMap[itemCat] || 0) + itemAmt;
          if (!categoryTxMap[itemCat]) categoryTxMap[itemCat] = [];
          categoryTxMap[itemCat].push({ date: tx.date, name: tx.accountName || tx.name || '-', desc: item.description || item.desc || tx.particulars || tx.description || '-', amount: itemAmt });
        });
        if (tx.id) seenReceiptIds.add(`b_${tx.id}`);
        return;
      }

      // 2. Text-based '+' split entries in particulars / description (e.g., "Subscription (2000) + Offertory (1000)")
      const fullText = (tx.particulars || tx.description || '').trim();
      let itemsText = fullText;
      if (fullText.includes(' - ')) {
        const dashIdx = fullText.indexOf(' - ');
        const cand = fullText.substring(0, dashIdx).trim().toLowerCase();
        if (!cand.includes('contra') && !cand.includes('transfer') && !cand.includes('cash deposit') && !cand.includes('opening balance')) {
          itemsText = fullText.substring(dashIdx + 3).trim();
        }
      }

      if (itemsText.includes('+')) {
        const parts = itemsText.split(/\s*\+\s*/);
        const parsedParts = [];
        let allocatedSum = 0;

        parts.forEach(part => {
          const partTrimmed = part.trim();
          if (!partTrimmed) return;
          const pLower = partTrimmed.toLowerCase();

          let partAmt = 0;
          const parenMatch = partTrimmed.match(/\((?:[^0-9]*)([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\)/);
          if (parenMatch) partAmt = parseFloat(parenMatch[1].replace(/,/g, ''));
          if (!partAmt || isNaN(partAmt)) {
            const symMatch = partTrimmed.match(/(?:rs\.?|inr|₹)\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/i);
            if (symMatch) partAmt = parseFloat(symMatch[1].replace(/,/g, ''));
          }
          if (!partAmt || isNaN(partAmt)) {
            const slashMatch = partTrimmed.match(/([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*(?:\/-|\/rs)/i);
            if (slashMatch) partAmt = parseFloat(slashMatch[1].replace(/,/g, ''));
          }
          if (!partAmt || isNaN(partAmt)) {
            const numMatches = partTrimmed.match(/\b([0-9]{3,}(?:,[0-9]+)*(?:\.[0-9]+)?)\b/g);
            if (numMatches && numMatches.length === 1) {
              partAmt = parseFloat(numMatches[0].replace(/,/g, ''));
            }
          }

          let cat = 'Other Income';
          if (pLower.includes('subscription')) cat = 'Subscription';
          else if (pLower.includes('offertory') || pLower.includes('offering')) cat = 'Offertory';
          else if (pLower.includes('charity')) cat = 'Charity Received';
          else if (pLower.includes('donation')) cat = 'Donations';
          else if (pLower.includes('first fruit') || pLower.includes('firstfruit')) cat = 'First Fruits';
          else if (pLower.includes('sodari') || pLower.includes('sodhari')) cat = 'Sodari Samajam for Deposit';
          else if (pLower.includes('anniversary')) cat = 'Anniversary Expenses Received';
          else {
            cat = classifyCategory({ description: partTrimmed, particulars: partTrimmed, type: '' }, true);
          }

          parsedParts.push({ partTrimmed, partAmt, cat });
          if (partAmt > 0) allocatedSum += partAmt;
        });

        if (allocatedSum > 0 && allocatedSum < amt) {
          const missing = parsedParts.find(p => !p.partAmt || p.partAmt <= 0);
          if (missing) {
            missing.partAmt = amt - allocatedSum;
            allocatedSum = amt;
          }
        }

        if (allocatedSum > 0) {
          parsedParts.forEach(p => {
            const partAmt = p.partAmt || 0;
            if (partAmt <= 0) return;
            calcTotalIncome += partAmt;
            incomeMap[p.cat] = (incomeMap[p.cat] || 0) + partAmt;
            if (!categoryTxMap[p.cat]) categoryTxMap[p.cat] = [];
            categoryTxMap[p.cat].push({ date: tx.date, name: tx.accountName || tx.name || '-', desc: p.partTrimmed, amount: partAmt });
          });
          if (tx.id) seenReceiptIds.add(`b_${tx.id}`);
          return;
        }
      }

      // 3. Fallback direct deposit regex check (e.g. Subscription + Charity Received without '+')
      const allTxFields = `${tx.category || ''} ${subStr} ${typeStr} ${descStr} ${nameStr} ${bsub}`.toLowerCase();
      if (allTxFields.includes('direct deposit') || (allTxFields.includes('subscription') && allTxFields.includes('charity'))) {
        const subMatches = [...descStr.matchAll(/subscription[^\d]*(\d[\d,]*)/gi)];
        const chMatch = descStr.match(/charity[^\d]*(\d[\d,]*)/i);
        let sAmt = 0;
        subMatches.forEach(m => {
          sAmt += parseFloat(m[1].replace(/,/g, ''));
        });
        const cAmt = chMatch ? parseFloat(chMatch[1].replace(/,/g, '')) : 0;
        if (sAmt > 0 || cAmt > 0) {
          calcTotalIncome += amt;
          if (sAmt > 0) {
            incomeMap['Subscription'] = (incomeMap['Subscription'] || 0) + sAmt;
            if (!categoryTxMap['Subscription']) categoryTxMap['Subscription'] = [];
            categoryTxMap['Subscription'].push({ date: tx.date, name: tx.accountName || tx.name || '-', desc: tx.description || tx.particulars || '-', amount: sAmt });
          }
          if (cAmt > 0) {
            incomeMap['Charity Received'] = (incomeMap['Charity Received'] || 0) + cAmt;
            if (!categoryTxMap['Charity Received']) categoryTxMap['Charity Received'] = [];
            categoryTxMap['Charity Received'].push({ date: tx.date, name: tx.accountName || tx.name || '-', desc: tx.description || tx.particulars || '-', amount: cAmt });
          }
          if (tx.id) seenReceiptIds.add(`b_${tx.id}`);
          return;
        }
      }

      // 4. Standard single bank transaction
      const category = classifyCategory(tx, true);
      calcTotalIncome += amt;
      incomeMap[category] = (incomeMap[category] || 0) + amt;
      if (!categoryTxMap[category]) categoryTxMap[category] = [];
      categoryTxMap[category].push({ date: tx.date, name: tx.accountName || tx.name || '-', desc: tx.description || tx.particulars || '-', amount: amt });
      if (tx.id) seenReceiptIds.add(`b_${tx.id}`);
    });
  }

  // C. Suspense Income: Advance Received
  if (suspenseList && suspenseList.length > 0) {
    suspenseList.forEach(tx => {
      const isAdvanceRcpt = tx.type === 'Advance Received';
      const amt = Number(tx.amount || 0);
      if (amt <= 0) return;
      if (isAdvanceRcpt) {
        calcTotalIncome += amt;
        let actualName = 'Suspense (Advance Received)';
        incomeMap[actualName] = (incomeMap[actualName] || 0) + amt;
        if (!categoryTxMap[actualName]) categoryTxMap[actualName] = [];
        categoryTxMap[actualName].push({ date: tx.date, name: tx.name || '-', desc: tx.description || '-', amount: amt });
      }
    });
  }

  // --- 3. ASSEMBLE STATEMENT ITEMS PURELY DYNAMICALLY (NO FALLBACK DATA) ---
  const incItems = targetIncome.map(k => {
    const amt = incomeMap[k] !== undefined ? incomeMap[k] : 0;
    return { name: k, amount: amt, deposit: depositMap[k] || 0, withdrawal: withdrawalMap[k] || 0 };
  });

  Object.keys(incomeMap).forEach(k => {
    if (!targetIncome.includes(k) && incomeMap[k] !== 0 && !k.toLowerCase().includes('direct deposit')) {
      incItems.push({ name: k, amount: incomeMap[k], deposit: depositMap[k] || 0, withdrawal: withdrawalMap[k] || 0 });
    }
  });

  const expItems = targetExpense.map(k => {
    const amt = expenseMap[k] !== undefined ? expenseMap[k] : 0;
    return { name: k, amount: amt, deposit: depositMap[k] || 0, withdrawal: withdrawalMap[k] || 0 };
  });

  Object.keys(expenseMap).forEach(k => {
    if (!targetExpense.includes(k) && expenseMap[k] !== 0) {
      expItems.push({ name: k, amount: expenseMap[k], deposit: depositMap[k] || 0, withdrawal: withdrawalMap[k] || 0 });
    }
  });

  // Calculate dynamic totals directly from the statement items
  calcTotalIncome = incItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  calcTotalExpenditure = expItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return { incItems, expItems, calcTotalIncome, calcTotalExpenditure, categoryTxMap };
}

function showDrilldownNotice(name, tabTitle) {
  let el = document.getElementById('dashDrillNotice');
  if (!el) {
    el = document.createElement('div');
    el.id = 'dashDrillNotice';
    el.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #0f172a;
      color: #ffffff;
      padding: 10px 22px;
      border-radius: 30px;
      font-size: 0.88rem;
      font-weight: 600;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
      opacity: 0;
    `;
    document.body.appendChild(el);
  }
  el.innerHTML = `<span>🔎</span> <span>Showing breakdown for <b>${name}</b> in <u>${tabTitle}</u></span>`;
  el.style.opacity = '1';
  el.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(-10px)';
  }, 2600);
}

function drilldownFromDashboard(rawCategoryOrName, side) {
  if (!rawCategoryOrName) return;
  const name = String(rawCategoryOrName).trim();
  const lower = name.toLowerCase();

  // 1. Subscriptions
  if (lower.includes('subscription')) {
    switchTab('subscriptionsTab');
    if (typeof renderSubscriptionsReport === 'function') renderSubscriptionsReport();
    showDrilldownNotice(name, 'Subscriptions Register');
    return;
  }

  // 2. Offertory / Offering
  if (lower.includes('offertory') || lower.includes('offering')) {
    switchTab('offeringTab');
    if (typeof renderOfferingTabTable === 'function') renderOfferingTabTable();
    showDrilldownNotice(name, 'Offering Log');
    return;
  }

  // 3. Charity (Received or Paid)
  if (lower.includes('charity')) {
    switchTab('charityTab');
    if (lower.includes('received')) {
      if (typeof setCharityTabMode === 'function') setCharityTabMode('Received');
      else { selectedCharityMode = 'Received'; renderCharityTabTable(); }
    } else if (lower.includes('paid')) {
      if (typeof setCharityTabMode === 'function') setCharityTabMode('Paid');
      else { selectedCharityMode = 'Paid'; renderCharityTabTable(); }
    } else {
      if (typeof setCharityTabMode === 'function') setCharityTabMode('All');
      else { selectedCharityMode = 'All'; renderCharityTabTable(); }
    }
    showDrilldownNotice(name, 'Charity & Relief Register');
    return;
  }

  // 4. Other Income items: Donations, First Fruits, Sodari Samajam, Anniversary, etc.
  if (lower.includes('donation') || lower.includes('first fruit') || lower.includes('sodari') || lower.includes('sodhari') || lower.includes('anniversary') || lower.includes('other income')) {
    switchTab('otherIncomeTab');
    if (lower.includes('donation')) {
      if (typeof setOtherIncomeTabMode === 'function') setOtherIncomeTabMode('Donation');
      else { selectedOtherIncomeMode = 'Donation'; renderOtherIncomeTabTable(); }
    } else if (lower.includes('first fruit')) {
      if (typeof setOtherIncomeTabMode === 'function') setOtherIncomeTabMode('First Fruit');
      else { selectedOtherIncomeMode = 'First Fruit'; renderOtherIncomeTabTable(); }
    } else if (lower.includes('sodari') || lower.includes('sodhari')) {
      if (typeof setOtherIncomeTabMode === 'function') setOtherIncomeTabMode('Sodhari');
      else { selectedOtherIncomeMode = 'Sodhari'; renderOtherIncomeTabTable(); }
    } else if (lower.includes('anniversary')) {
      if (typeof setOtherIncomeTabMode === 'function') setOtherIncomeTabMode('Anniversary');
      else { selectedOtherIncomeMode = 'Anniversary'; renderOtherIncomeTabTable(); }
    } else {
      if (typeof setOtherIncomeTabMode === 'function') setOtherIncomeTabMode('All');
      else { selectedOtherIncomeMode = 'All'; renderOtherIncomeTabTable(); }
    }
    showDrilldownNotice(name, 'Other Income Statement');
    return;
  }

  // 5. Cash in Hand / Cash Opening Balance
  if (lower.includes('cash in hand') || lower.includes('cash balance') || lower === 'opening balance cash in hand') {
    switchTab('transactionsTab');
    if (typeof renderRecentTransactions === 'function') renderRecentTransactions();
    showDrilldownNotice(name, 'Cash Book');
    return;
  }

  // 5.5. Bank Interest (Income) -> Bank Book with Interest Search
  if (lower.includes('bank interest') || (lower.includes('interest') && !lower.includes('sodari'))) {
    switchTab('bankBookTab');
    const accFilter = document.getElementById('bankBookAccountFilter');
    if (accFilter) accFilter.value = 'ALL';
    const searchInput = document.getElementById('bankBookSearchInput');
    if (searchInput) searchInput.value = 'Interest';
    if (typeof renderBankBookTransactions === 'function') renderBankBookTransactions();
    showDrilldownNotice(name, 'Bank Book');
    return;
  }

  // 6. Bank Book Accounts (Current Account, Fixed Deposit, Closing Reserves)
  if (lower.includes('state bank') || lower.includes('sbi') || lower.includes('current') || lower.includes('fixed deposit') || lower.includes('closing balance')) {
    switchTab('bankBookTab');
    const accFilter = document.getElementById('bankBookAccountFilter');
    if (accFilter) {
      if (lower.includes('fixed deposit') || lower.includes('fd')) {
        accFilter.value = 'SBI Fixed Deposit';
      } else if (lower.includes('current') || lower.includes('state bank') || lower.includes('sbi')) {
        accFilter.value = 'State Bank of India';
      } else {
        accFilter.value = 'ALL';
      }
    }
    if (typeof renderBankBookTransactions === 'function') renderBankBookTransactions();
    showDrilldownNotice(name, 'Bank Book');
    return;
  }

  // 7. Suspense
  if (lower.includes('suspense')) {
    switchTab('suspenseTab');
    if (typeof renderSuspenseTable === 'function') renderSuspenseTable();
    showDrilldownNotice(name, 'Suspense Accounts');
    return;
  }

  // 7.3. Salary & Allowance -> Ledger Tab
  if (lower.includes('salary')) {
    switchTab('ledgerTab');
    populateLedgerSubtypeDropdown('Salary (Pr. T.T.Simon)');
    const searchInput = document.getElementById('ledgerSearchInput');
    if (searchInput) searchInput.value = '';
    renderLedgerTabTable();
    showDrilldownNotice(name, 'Ledger Accounts');
    return;
  }
  if (lower.includes('allowance')) {
    switchTab('ledgerTab');
    populateLedgerSubtypeDropdown('Allowance (Pr. T.T.Simon)');
    const searchInput = document.getElementById('ledgerSearchInput');
    if (searchInput) searchInput.value = '';
    renderLedgerTabTable();
    showDrilldownNotice(name, 'Ledger Accounts');
    return;
  }

  // 7.4. General Body / Anniversary Meeting Expenses -> Ledger Tab
  if (lower.includes('general body') || lower.includes('generalbody') || (lower.includes('anniversary') && !lower.includes('received'))) {
    switchTab('ledgerTab');
    populateLedgerSubtypeDropdown('General Body/Anniversary Meeting Expenses');
    const searchInput = document.getElementById('ledgerSearchInput');
    if (searchInput) searchInput.value = '';
    renderLedgerTabTable();
    showDrilldownNotice(name, 'Ledger Accounts');
    return;
  }

  // 7.5. Dynamic Tabs (Monthly Meeting, etc.)
  if ((lower.includes('monthly meeting') || lower.includes('monthlymeeting')) && !lower.includes('general body') && !lower.includes('anniversary')) {
    const mmTabId = 'dynamicTab_MonthlyMeeting';
    if (document.getElementById(mmTabId)) {
      switchTab(mmTabId);
      if (typeof renderDynamicTabTable === 'function') renderDynamicTabTable('Monthly Meeting');
      showDrilldownNotice(name, 'Monthly Meeting');
      return;
    }
  }

  const dynTypes = (typeof dynamicTypes !== 'undefined' && Array.isArray(dynamicTypes)) ? dynamicTypes : ['Monthly Meeting'];
  for (const dt of dynTypes) {
    const dtId = 'dynamicTab_' + dt.replace(/[^a-zA-Z0-9]/g, '');
    if (lower.includes(dt.toLowerCase()) || dt.toLowerCase().includes(lower)) {
      if (document.getElementById(dtId)) {
        switchTab(dtId);
        if (typeof renderDynamicTabTable === 'function') renderDynamicTabTable(dt);
        showDrilldownNotice(name, dt);
        return;
      }
    }
  }

  // 8. General / Ledger Expenditures & custom types -> Ledger Tab
  switchTab('ledgerTab');
  populateLedgerSubtypeDropdown(name);
  const searchInput = document.getElementById('ledgerSearchInput');
  if (searchInput) searchInput.value = '';
  renderLedgerTabTable();
  showDrilldownNotice(name, 'Ledger Accounts');
}

function renderDashboard(data) {
  if (data && data.printStatusMap) {
    Object.assign(globalPrintStatusMap, data.printStatusMap);
  }

  if (data && data.recentTransactions && data.recentTransactions.length > 0) {
    allTimeTxList = data.recentTransactions;
  }

  if (data && data.generalTransactions && data.generalTransactions.length > 0) {
    allTimeGeneralTxList = data.generalTransactions;
  }

  if (data && data.suspense_transactions && data.suspense_transactions.length > 0) {
    allTimeSuspenseTxList = data.suspense_transactions;
  }

  currentLoadedTxList = filterListByFY(allTimeTxList);
  currentGeneralTxList = filterListByFY(allTimeGeneralTxList);
  currentSuspenseTxList = [];
  if (allTimeSuspenseTxList && allTimeSuspenseTxList.length > 0) {
    currentSuspenseTxList = filterListByFY(allTimeSuspenseTxList);
  }
  const txList = currentLoadedTxList;

  if (data && data.bankBookTransactions) {
    allTimeBankBookList = data.bankBookTransactions;
  }
  let targetBankList = [];
  if (allTimeBankBookList && allTimeBankBookList.length > 0) {
    targetBankList = filterListByFY(allTimeBankBookList);
  }
  if (!targetBankList || targetBankList.length === 0) {
    const fallbackBank = (typeof loadedBankBookTransactions !== 'undefined' && loadedBankBookTransactions.length > 0)
      ? loadedBankBookTransactions
      : (typeof globalRawBankTransactions !== 'undefined' && globalRawBankTransactions.length > 0 ? globalRawBankTransactions : []);
    if (fallbackBank.length > 0) {
      targetBankList = filterListByFY(fallbackBank);
    }
  }

  const dyn = buildDynamicStatementItems(currentGeneralTxList, targetBankList, currentSuspenseTxList);

  // Force dynamic frontend calculations so FY filters apply correctly
  const incomeItems = dyn.incItems;
  const expenditureItems = dyn.expItems;

  let incTotal = dyn.calcTotalIncome;
  let expTotal = dyn.calcTotalExpenditure;
  let cf = calculateCarryForward();
  let cashHand = cf.cash;
  if (txList && txList.length > 0) {
    txList.forEach(tx => {
      const typeStr = (tx.type || '').toLowerCase();
      const descStr = (tx.description || '').toLowerCase();
      const nameStr = (tx.name || tx.accountName || '').toLowerCase();
      const isOpening = typeStr.includes('opening balance') || descStr.includes('opening balance') || nameStr.includes('opening balance');
      if (isOpening) return;

      const bSubtype = (tx.bankSubtype || '').toLowerCase();
      const isInterBank = bSubtype.includes('inter-bank') || bSubtype.includes('inter transfer') || descStr.includes('inter-bank') || descStr.includes('inter transfer') || typeStr.includes('inter-bank') || descStr.includes('transfer from state bank of india to sbi fixed deposit');
      if (isInterBank) return;

      const entryType = (tx.entryType || 'Cash').toLowerCase();
      const isContra = bSubtype.includes('cash deposit') || bSubtype.includes('cash withdrawal') || descStr.includes('cash deposit') || descStr.includes('cash withdrawal');
      const isBank = entryType === 'bank' || String(tx.vrNo || '').toLowerCase().endsWith('/b');

      if (isBank && !isContra && tx.addToCashBook !== true && tx.inCashBook !== true) return;

      cashHand += Number(tx.receipt || 0) - Number(tx.payment || tx.payments || 0);
    });
  }

  let sbiCurrentBal = cf.sbi;
  let sbiFdBal = cf.fd;

  if (targetBankList && targetBankList.length > 0) {
    targetBankList.forEach(tx => {
      const type = (tx.type || '').toLowerCase();
      const desc = (tx.description || tx.particulars || '').toLowerCase();
      const name = (tx.name || tx.accountName || '').toLowerCase();
      const isOpening = type === 'opening balance' || desc.includes('opening balance') || name.includes('opening balance');

      if (isOpening) return;

      const isCredit = (typeof isTxReceipt === 'function')
        ? (isTxReceipt(tx) === 1)
        : ((Number(tx.credit || tx.receipt || 0) > 0) || (tx.mode && (tx.mode.includes("Receipt") || tx.mode.includes("Credit"))));
      const amt = Number(tx.amount || tx.credit || tx.receipt || tx.debit || tx.payment || tx.payments || 0);

      const accLower = (tx.account || tx.accountName || tx.account_name || tx.bankAccount || tx.bank_account || '').toLowerCase();
      let isFD = false;
      if (accLower.includes('fixed deposit') || accLower.includes('fd')) {
        isFD = true;
      } else if (accLower.includes('state bank') || accLower.includes('current') || accLower.includes('sbi')) {
        isFD = false;
      } else {
        const bSubLower = (tx.bankSubtype || tx.bank_subtype || '').toLowerCase();
        if (bSubLower.includes('fixed deposit') || bSubLower.includes('fd')) {
          isFD = true;
        }
      }

      if (isFD) {
        if (isCredit) sbiFdBal += amt;
        else sbiFdBal -= amt;
      } else {
        if (isCredit) sbiCurrentBal += amt;
        else sbiCurrentBal -= amt;
      }
    });
  }

  if (document.getElementById('dashCashInHand')) document.getElementById('dashCashInHand').innerText = formatCurrencyNoSymbolWithDecimals(cashHand);
  if (document.getElementById('cashBookTabBalance')) document.getElementById('cashBookTabBalance').innerText = formatCurrency(cashHand);
  if (document.getElementById('entryTabBalance')) document.getElementById('entryTabBalance').innerText = formatCurrency(cashHand);

  const elSbiCurrent = document.getElementById('dashSbiCurrent');
  if (elSbiCurrent) elSbiCurrent.innerText = formatCurrencyNoSymbolWithDecimals(sbiCurrentBal);
  const elSbiFd = document.getElementById('dashSbiFd');
  if (elSbiFd) elSbiFd.innerText = formatCurrencyNoSymbolWithDecimals(sbiFdBal);
  const elBankReserves = document.getElementById('dashBankReserves');
  const totalReservesAmt = cashHand + sbiCurrentBal + sbiFdBal;
  if (elBankReserves) elBankReserves.innerText = formatCurrencyNoSymbolWithDecimals(totalReservesAmt);


  // Header totals (will be adjusted after table-level calculations to include contra flows)
  const incHeader = document.getElementById('incomeHeaderTotal');
  if (incHeader) incHeader.innerText = formatCurrencyNoSymbolWithDecimals(incTotal);

  const expHeader = document.getElementById('expenseHeaderTotal');
  if (expHeader) expHeader.innerText = formatCurrencyNoSymbolWithDecimals(expTotal);
  const footerBalanceEl = document.getElementById('footerTotalBalance');
  if (footerBalanceEl) footerBalanceEl.innerText = formatCurrencyNoSymbolWithDecimals(totalReservesAmt);

  // Suspense Alert logic
  const suspenseBellBtn = document.getElementById('dashSuspenseBellBtn');
  const suspenseBadge = document.getElementById('dashSuspenseBadge');

  if (suspenseBellBtn && suspenseBadge) {
    if (allTimeSuspenseTxList && allTimeSuspenseTxList.length > 0 && (currentUserRole === 'Treasurer' || currentUserRole === 'Admin')) {
      const pendingCount = allTimeSuspenseTxList.length;
      suspenseBadge.innerText = pendingCount;
      suspenseBellBtn.style.display = 'inline-block';

      const pendingAmount = allTimeSuspenseTxList.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
      suspenseBellBtn.title = `You have ${pendingCount} pending suspense entr${pendingCount === 1 ? 'y' : 'ies'} totaling ${formatCurrency(pendingAmount)}. Click to review.`;
    } else {
      suspenseBellBtn.style.display = 'none';
    }
  }

  // Equalize item counts so Total Income and Total Expenditure align on the exact same horizontal line!
  const incItemsCount = incomeItems ? incomeItems.length : 0;
  const expItemsCount = expenditureItems ? expenditureItems.length : 0;
  const maxDashboardRows = Math.max(incItemsCount, expItemsCount);

  // Income Table Render
  const incTbody = document.getElementById('incomeTableBody');
  if (incTbody && incomeItems) {
    let totalAmt = 0;
    let incHtml = '';
    if (incomeItems.length > 0) {
      incomeItems.forEach(item => {
        const isOpening = item.name.toLowerCase().indexOf('opening balance') !== -1;
        const amt = Number(item.amount || 0);
        totalAmt += amt;
        const safeName = (item.name || '').replace(/'/g, "\\'");
        incHtml += `
              <tr class="${isOpening ? 'highlight-row' : ''} dashboard-clickable-row" onclick="drilldownFromDashboard('${safeName}', 'income')" title="Click to inspect ${safeName} breakdown ↗">
                <td style="font-weight: 600; padding: 10px 12px;">
                  <span style="display: inline-flex; align-items: center; justify-content: space-between; width: 100%;">
                    <span>${item.name}</span>
                    <span class="dash-row-drill-icon" style="font-size: 0.72rem; opacity: 0.45; transition: all 0.2s ease; margin-left: 6px;">↗</span>
                  </span>
                </td>
                <td class="amount-col ${amt ? 'income-amt' : 'zero-amt'}" style="font-weight: 700; text-align: right; padding: 10px 12px;">${formatCurrencyNoSymbolWithDecimals(amt)}</td>
              </tr>
            `;
      });
    } else {
      incHtml = '<tr><td colspan="2" style="text-align: center; color: #94a3b8; padding: 20px;">No income records found</td></tr>';
    }

    // Add empty filler rows to align with expense table
    const incFillersNeeded = maxDashboardRows - incItemsCount;
    for (let f = 0; f < incFillersNeeded; f++) {
      incHtml += `
            <tr class="dash-filler-row">
              <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9;">&nbsp;</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9;">&nbsp;</td>
            </tr>
          `;
    }

    incHtml += `
          <tr class="dashboard-total-row" style="font-weight: 800; border-top: 2px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
            <td style="font-weight: 800; padding: 12px 12px;">Total Income</td>
            <td class="amount-col income-amt" style="font-weight: 800; text-align: right; padding: 12px 12px;">${formatCurrencyNoSymbolWithDecimals(totalAmt)}</td>
          </tr>
        `;
    incTbody.innerHTML = incHtml;
    if (document.getElementById('incomeHeaderTotal')) {
      document.getElementById('incomeHeaderTotal').innerText = formatCurrencyNoSymbolWithDecimals(totalAmt);
    }
  }

  // Expenditure Table Render
  const expTbody = document.getElementById('expenseTableBody');
  if (expTbody && expenditureItems) {
    let totalAmt = 0;
    let expHtml = '';
    if (expenditureItems.length > 0) {
      expenditureItems.forEach(item => {
        const isBank = item.name.toLowerCase().indexOf('state bank') !== -1 || item.name.toLowerCase().indexOf('fixed deposit') !== -1;
        const amt = Number(item.amount || 0);
        totalAmt += amt;
        const safeName = (item.name || '').replace(/'/g, "\\'");
        expHtml += `
              <tr class="${isBank ? 'highlight-row' : ''} dashboard-clickable-row" onclick="drilldownFromDashboard('${safeName}', 'expense')" title="Click to inspect ${safeName} breakdown ↗">
                <td style="font-weight: 600; padding: 10px 12px;">
                  <span style="display: inline-flex; align-items: center; justify-content: space-between; width: 100%;">
                    <span>${item.name}</span>
                    <span class="dash-row-drill-icon" style="font-size: 0.72rem; opacity: 0.45; transition: all 0.2s ease; margin-left: 6px;">↗</span>
                  </span>
                </td>
                <td class="amount-col ${amt ? 'expense-amt' : 'zero-amt'}" style="font-weight: 700; text-align: right; padding: 10px 12px;">${formatCurrencyNoSymbolWithDecimals(amt)}</td>
              </tr>
            `;
      });
    } else {
      expHtml = '<tr><td colspan="2" style="text-align: center; color: #94a3b8; padding: 20px;">No expense records found</td></tr>';
    }

    // Add empty filler rows if needed to align with income table
    const expFillersNeeded = maxDashboardRows - expItemsCount;
    for (let f = 0; f < expFillersNeeded; f++) {
      expHtml += `
            <tr class="dash-filler-row">
              <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9;">&nbsp;</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9;">&nbsp;</td>
            </tr>
          `;
    }

    expHtml += `
          <tr class="dashboard-total-row" style="font-weight: 800; border-top: 2px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
            <td style="font-weight: 800; padding: 12px 12px;">Total Expenditure</td>
            <td class="amount-col expense-amt" style="font-weight: 800; text-align: right; padding: 12px 12px;">${formatCurrencyNoSymbolWithDecimals(totalAmt)}</td>
          </tr>
        `;
    expTbody.innerHTML = expHtml;
    if (document.getElementById('expenseHeaderTotal')) {
      document.getElementById('expenseHeaderTotal').innerText = formatCurrencyNoSymbolWithDecimals(totalAmt);
    }
  }

  if (data && data.bankBookTransactions) {
    loadedBankBookTransactions = data.bankBookTransactions;
  }

  if (typeof updateOpeningBalanceButtonVisibility === 'function') {
    updateOpeningBalanceButtonVisibility();
  }
}

function parseDateValue(dateVal) {
  if (!dateVal) return null;

  // Handle Firestore Timestamp
  if (typeof dateVal === 'object') {
    if (typeof dateVal.toDate === 'function') {
      dateVal = dateVal.toDate();
    } else if (typeof dateVal.seconds === 'number') {
      dateVal = new Date(dateVal.seconds * 1000);
    }
  }

  // Handle JS Date object
  if (dateVal instanceof Date) {
    if (!isNaN(dateVal.getTime())) {
      return {
        day: dateVal.getDate(),
        month: dateVal.getMonth(),
        year: dateVal.getFullYear()
      };
    }
    return null;
  }

  let str = String(dateVal).trim().replace(/^#+/, '').trim();
  if (!str || str === '--') return null;

  const shortMonths = {
    "jan": 0, "feb": 1, "mar": 2, "apr": 3, "may": 4, "jun": 5,
    "jul": 6, "aug": 7, "sep": 8, "oct": 9, "nov": 10, "dec": 11,
    "january": 0, "february": 1, "march": 2, "april": 3, "june": 5,
    "july": 6, "august": 7, "september": 8, "october": 9, "november": 10, "december": 11
  };

  // 1. Check for YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss... (ISO date)
  let m = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    return {
      day: parseInt(m[3], 10),
      month: parseInt(m[2], 10) - 1,
      year: parseInt(m[1], 10)
    };
  }

  // 2. Check for DD/MM/YYYY or DD/MM/YY
  m = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (m) {
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    return {
      day: parseInt(m[1], 10),
      month: parseInt(m[2], 10) - 1,
      year: y
    };
  }

  // 3. Check for DD-Mon-YYYY (e.g. 19-Jul-2026 or 19-July-2026)
  m = str.match(/^(\d{1,2})[-/ ]([A-Za-z]+)[-/ ](\d{2,4})/);
  if (m) {
    const mStr = m[2].toLowerCase();
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    if (shortMonths[mStr] !== undefined) {
      return {
        day: parseInt(m[1], 10),
        month: shortMonths[mStr],
        year: y
      };
    }
  }

  // 4. Check for MM/DD shorthand (e.g. "08/09")
  m = str.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (m) {
    return {
      day: parseInt(m[2], 10),
      month: parseInt(m[1], 10) - 1,
      year: 2026
    };
  }

  // 5. Check for Day-of-week or text date strings e.g. "Mon May 04 2026...", "May 04 2026", "Sun May 10 2026 00:00:00 GM"
  m = str.match(/(?:[A-Za-z]{3,}\s+)?([A-Za-z]{3,})\s+(\d{1,2})\s+(\d{4})/);
  if (m) {
    const mStr = m[1].toLowerCase();
    if (shortMonths[mStr] !== undefined) {
      return {
        day: parseInt(m[2], 10),
        month: shortMonths[mStr],
        year: parseInt(m[3], 10)
      };
    }
  }

  // 6. Fall back to standard Date parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return {
      day: d.getDate(),
      month: d.getMonth(),
      year: d.getFullYear()
    };
  }

  return null;
}

function formatDateHtml(dateVal) {
  const parsed = parseDateValue(dateVal);
  if (!parsed) return String(dateVal || '--');

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const day = String(parsed.day).padStart(2, '0');
  const month = monthNames[parsed.month];

  const desktop = `${day} ${month} ${parsed.year}`;
  const mobile = `${day}/${String(parsed.month + 1).padStart(2, '0')}/${String(parsed.year).slice(-2)}`;
  return `<span class="date-desktop">${desktop}</span><span class="date-mobile">${mobile}</span>`;
}

function formatDateClean(dateVal) {
  const parsed = parseDateValue(dateVal);
  if (!parsed) return String(dateVal || '--');

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const day = String(parsed.day).padStart(2, '0');
  const month = monthNames[parsed.month];
  return `${day} ${month} ${parsed.year}`;
}

function formatDateDisplay(dateVal) {
  return formatDateClean(dateVal);
}

function formatDateYMD(dateVal) {
  const p = parseDateValue(dateVal);
  if (!p) return String(dateVal || '');
  return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function formatVrNoClean(vrVal) {
  if (!vrVal || vrVal === '--') return '--';
  let str = String(vrVal).trim();
  str = str.replace(/^#+/, '').trim();

  if (str.includes('GMT') || str.includes('India') || str.includes('Sat ') || str.includes('Sun ') || str.includes('Mon ') || str.includes('Tue ') || str.includes('Wed ') || str.includes('Thu ') || str.includes('Fri ')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const month = d.getMonth() + 1;
      const day = d.getDate();
      return `${month}/${day}`;
    }
  }
  return str;
}

async function generateImageFromContainerForPrint(nodeId, bgColor) {
  const original = document.getElementById(nodeId);
  if (!original) return null;

  // Instead of modifying the live DOM (which causes a visual stutter),
  // we create an off-screen wrapper and clone the element.
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.top = '-10000px';
  wrapper.style.left = '-10000px';
  wrapper.style.zIndex = '-9999';
  // Reset zoom on the wrapper
  wrapper.style.setProperty('zoom', '1', 'important');
  wrapper.style.setProperty('transform', 'none', 'important');
  wrapper.style.setProperty('width', '800px', 'important');

  document.body.appendChild(wrapper);

  // Clone the element deeply
  const clone = original.cloneNode(true);

  // Force 100% scale and exact dimensions on the clone
  clone.style.setProperty('zoom', '1', 'important');
  clone.style.setProperty('transform', 'none', 'important');
  clone.style.setProperty('-webkit-transform', 'none', 'important');
  clone.style.setProperty('-moz-transform', 'none', 'important');
  clone.style.setProperty('width', '800px', 'important');
  clone.style.setProperty('max-width', '800px', 'important');
  clone.style.setProperty('min-width', '800px', 'important');
  clone.style.setProperty('margin', '0', 'important');

  wrapper.appendChild(clone);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: bgColor,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 800,
      onclone: (doc) => {
        // Just in case html2canvas needs further overrides inside its iframe
        const style = doc.createElement('style');
        style.innerHTML = `
              html, body {
                zoom: 1 !important;
                transform: none !important;
                -webkit-transform: none !important;
                -moz-transform: none !important;
                width: 800px !important;
                margin: 0 !important;
                padding: 0 !important;
              }
            `;
        doc.head.appendChild(style);

        const el = doc.getElementById(clone.id);
        if (el) {
          el.style.setProperty('width', '800px', 'important');
          el.style.setProperty('max-width', '800px', 'important');
          el.style.setProperty('min-width', '800px', 'important');
          el.style.setProperty('margin', '0', 'important');
          el.style.setProperty('zoom', '1', 'important');
          el.style.setProperty('transform', 'none', 'important');
          el.style.setProperty('-webkit-transform', 'none', 'important');
          el.style.setProperty('-moz-transform', 'none', 'important');
        }
      }
    });

    return canvas;
  } finally {
    // Clean up our hidden wrapper from the live DOM
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  }
}

let globalPrintStatusMap = {};

function appendPrintCopy(container, canvas, wrapperClass, copyLabel) {
  const img = document.createElement('img');
  img.src = canvas.toDataURL('image/png');
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'contain';
  img.style.display = 'block';

  const wrapper = document.createElement('div');
  wrapper.className = wrapperClass;
  wrapper.style.position = 'relative';

  const label = document.createElement('div');
  label.innerText = copyLabel;
  label.style.position = 'absolute';
  label.style.top = '10px';
  label.style.right = '20px';
  label.style.fontSize = '12px';
  label.style.fontWeight = 'bold';
  label.style.color = '#555';
  label.style.fontFamily = 'Arial, sans-serif';
  label.style.textTransform = 'uppercase';
  label.style.letterSpacing = '1px';
  label.style.background = 'rgba(255,255,255,0.7)';
  label.style.padding = '4px 8px';
  label.style.borderRadius = '4px';

  wrapper.appendChild(img);
  wrapper.appendChild(label);
  container.appendChild(wrapper);
}

function markTransactionAsPrinted(vrNoFieldId) {
  const vrNo = document.getElementById(vrNoFieldId) ? document.getElementById(vrNoFieldId).innerText.trim() : '';
  if (vrNo && vrNo !== '-' && vrNo !== '--') {
    const clean = normalizeVrLocally(vrNo);
    globalPrintStatusMap[clean] = true;

    const currentTx = (vrNoFieldId === 'rRcptNo') ? currentReceiptTx : currentPaymentTx;
    const isBank = currentTx && (
      (currentTx.entryType && String(currentTx.entryType).toLowerCase() === 'bank') ||
      currentTx.bankAccount ||
      (currentTx.vrNo && String(currentTx.vrNo).endsWith('/B')) ||
      currentTx.bank_name ||
      currentTx.bankSubtype
    );

    const bankTxs = (typeof loadedBankBookTransactions !== 'undefined' && loadedBankBookTransactions.length > 0)
      ? loadedBankBookTransactions
      : (typeof allTimeBankBookList !== 'undefined' ? allTimeBankBookList : []);
    const cashTxs = (typeof allTimeGeneralTxList !== 'undefined' && allTimeGeneralTxList.length > 0)
      ? allTimeGeneralTxList
      : (typeof globalRawTransactions !== 'undefined' ? globalRawTransactions : []);

    let tx = null;
    let targetCollection = 'transactions';

    if (isBank) {
      if (currentTx && (currentTx.id || currentTx._docId)) {
        tx = bankTxs.find(t => String(t.id) === String(currentTx.id) || String(t._docId) === String(currentTx._docId || currentTx.id));
      }
      if (!tx) {
        tx = bankTxs.find(t => normalizeVrLocally(t.vrNo) === clean || normalizeVrLocally(t.rcptNo) === clean || normalizeVrLocally(t.payNo) === clean);
      }
      if (tx) {
        targetCollection = 'bank_transactions';
      }
    } else {
      if (currentTx && (currentTx.id || currentTx._docId)) {
        tx = cashTxs.find(t => String(t.id) === String(currentTx.id) || String(t._docId) === String(currentTx._docId || currentTx.id));
      }
      if (!tx) {
        tx = cashTxs.find(t => normalizeVrLocally(t.vrNo) === clean || normalizeVrLocally(t.rcptNo) === clean || normalizeVrLocally(t.payNo) === clean);
      }
      if (!tx) {
        tx = bankTxs.find(t => normalizeVrLocally(t.vrNo) === clean || normalizeVrLocally(t.rcptNo) === clean || normalizeVrLocally(t.payNo) === clean);
        if (tx) targetCollection = 'bank_transactions';
      }
    }

    if (tx && !tx.printed) {
      tx.printed = true;
      if (typeof db !== 'undefined' && db && db.collection) {
        db.collection(targetCollection).doc(String(tx._docId || tx.id)).update({ printed: true });
      }
    }
    if (typeof renderRecentTransactions === 'function') renderRecentTransactions();
    if (typeof renderBankBookTransactions === 'function') renderBankBookTransactions();
  }
}

function toggleSelectAll(type) {
  const isChecked = document.getElementById(type === 'cash' ? 'selectAllCash' : 'selectAllBank').checked;
  const checkboxes = document.querySelectorAll('.' + type + '-batch-checkbox');
  checkboxes.forEach(cb => cb.checked = isChecked);
}

async function batchPrint(type) {
  const checkboxes = document.querySelectorAll('.' + type + '-batch-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('Please select at least one transaction to print.');
    return;
  }
  const vrNos = Array.from(checkboxes).map(cb => cb.value);
  const txList = type === 'cash' ? currentLoadedTxList : loadedBankBookTransactions;

  let container = document.getElementById('batchPrintArea');
  if (!container) {
    container = document.createElement('div');
    container.id = 'batchPrintArea';
    document.body.appendChild(container);
  }
  container.innerHTML = '';

  showGlobalLoading("Generating PDF images...");

  for (let i = 0; i < vrNos.length; i++) {
    const vr = vrNos[i];
    const clean = String(vr).replace(/^#+/, '').trim().toLowerCase();
    const matchingTxs = txList.filter(t => String(t.vrNo).replace(/^#+/, '').trim().toLowerCase() === clean);
    if (!matchingTxs || matchingTxs.length === 0) continue;

    const tx = matchingTxs[0];

    let isRcpt = false;
    if (type === 'cash') {
      isRcpt = (tx.receipt && tx.receipt > 0) || (tx.type && tx.type.toLowerCase() === 'receipt');
    } else {
      isRcpt = tx.mode && tx.mode.includes('Receipt');
    }

    let canvas, wrapperClass;
    if (isRcpt) {
      populateReceiptModalData(matchingTxs);
      canvas = await generateImageFromContainerForPrint('receiptPaperContainer', '#cce3d0');
      wrapperClass = 'print-receipt-wrapper';
    } else {
      populatePaymentVoucherModalData(tx);
      canvas = await generateImageFromContainerForPrint('paymentVoucherPaperContainer', '#fffae6');
      wrapperClass = 'print-voucher-wrapper';
    }

    appendPrintCopy(container, canvas, wrapperClass, 'Office Copy');
    appendPrintCopy(container, canvas, wrapperClass, isRcpt ? 'Payer Copy' : 'Payee Copy');
  }

  let style = document.getElementById('dynamicPrintStyle');
  if (!style) {
    style = document.createElement('style');
    style.id = 'dynamicPrintStyle';
    document.head.appendChild(style);
  }
  let hasRcpt = false;
  let hasVoucher = false;
  for (let i = 0; i < vrNos.length; i++) {
    const vr = vrNos[i];
    const clean = String(vr).replace(/^#+/, '').trim().toLowerCase();
    const tx = txList.find(t => String(t.vrNo).replace(/^#+/, '').trim().toLowerCase() === clean);
    if (!tx) continue;
    let isRcpt = false;
    if (type === 'cash') {
      isRcpt = (tx.receipt && tx.receipt > 0) || (tx.type && tx.type.toLowerCase() === 'receipt');
    } else {
      isRcpt = tx.mode && tx.mode.includes('Receipt');
    }
    if (isRcpt) hasRcpt = true;
    else hasVoucher = true;
  }
  let bgColor = '#ffffff';
  if (hasRcpt && !hasVoucher) bgColor = '#cce3d0';
  else if (hasVoucher && !hasRcpt) bgColor = '#fffae6';

  if (vrNos.length === 1) {
    style.innerHTML = `
          @page { size: 210mm 297mm; margin: 0; }
          html, body { height: 100% !important; min-height: 100% !important; }
          body.print-batch-active #batchPrintArea { height: 100% !important; background: ${bgColor} !important; }
          body.print-batch-active #batchPrintArea>div { 
            height: 50% !important; 
            display: flex !important; 
            justify-content: center !important; 
            align-items: center !important; 
          }
        `;
  } else {
    style.innerHTML = `
          @page { size: 210mm 297mm; margin: 0; }
          body.print-batch-active { background: ${bgColor} !important; }
          body.print-batch-active #batchPrintArea { background: ${bgColor} !important; }
          body.print-batch-active #batchPrintArea>div { height: 135mm !important; }
        `;
  }

  if (vrNos.length === 1) {
    document.documentElement.classList.add('print-batch-active-html');
  }
  document.body.classList.add('print-batch-active');
  hideGlobalLoading();

  function cleanup() {
    document.documentElement.classList.remove('print-batch-active-html');
    style.innerHTML = '';
    container.innerHTML = '';
    document.body.classList.remove('print-batch-active');

    vrNos.forEach(vr => {
      globalPrintStatusMap[normalizeVrLocally(vr)] = true;
      const clean = normalizeVrLocally(vr);
      const tx = allTimeGeneralTxList.find(t => normalizeVrLocally(t.vrNo) === clean || normalizeVrLocally(t.rcptNo) === clean || normalizeVrLocally(t.payNo) === clean);
      if (tx) {
        tx.printed = true;
        db.collection("transactions").doc(String(tx.id)).update({ printed: true });
      }
    });
    renderRecentTransactions();
    renderBankBookTransactions();
  }

  window.addEventListener('afterprint', cleanup, { once: true });

  setTimeout(function () {
    window.print();
  }, 500);
}

async function batchDelete(type) {
  const checkboxes = document.querySelectorAll('.' + type + '-batch-checkbox:checked');
  if (checkboxes.length === 0) {
    showAlert('Please select at least one transaction to delete.', 'error');
    return;
  }

  showCustomConfirm(`Are you sure you want to permanently delete the <b>${checkboxes.length}</b> selected transactions? This cannot be undone.`, async () => {
    showGlobalLoading("Deleting selected entries...");

    const allGen = (typeof allTimeGeneralTxList !== 'undefined') ? allTimeGeneralTxList : [];
    const allBank = (typeof loadedBankBookTransactions !== 'undefined') ? loadedBankBookTransactions : [];
    const allRawGen = (typeof globalRawTransactions !== 'undefined') ? globalRawTransactions : [];
    const allRawBank = (typeof globalRawBankTransactions !== 'undefined') ? globalRawBankTransactions : [];

    const targetDocIds = new Set();

    checkboxes.forEach(cb => {
      const vr = cb.value;
      const cleanVr = normalizeVrLocally(vr);
      const dataTxIds = (cb.getAttribute('data-tx-ids') || '').split(',').map(s => s.trim()).filter(Boolean);
      const splitGroup = cb.getAttribute('data-split-group') || '';

      // 1. Add direct tx IDs stored on the checkbox
      dataTxIds.forEach(id => targetDocIds.add(id));

      // 2. Add all docs belonging to the split group
      if (splitGroup) {
        allGen.forEach(t => { if (t.splitGroupId === splitGroup) targetDocIds.add(String(t.id)); });
        allBank.forEach(t => { if (t.splitGroupId === splitGroup) targetDocIds.add(String(t.id)); });
        allRawGen.forEach(t => { if (t.splitGroupId === splitGroup) targetDocIds.add(String(t.id || t._docId)); });
        allRawBank.forEach(t => { if (t.splitGroupId === splitGroup) targetDocIds.add(String(t.id || t._docId)); });
      }

      // 3. Add all docs matching cleanVr (if vrNo is not blank/dash)
      if (cleanVr && cleanVr !== '-' && cleanVr !== '--' && cleanVr !== 'ob') {
        allGen.forEach(t => {
          if (normalizeVrLocally(t.vrNo) === cleanVr || normalizeVrLocally(t.rcptNo) === cleanVr || normalizeVrLocally(t.payNo) === cleanVr) {
            targetDocIds.add(String(t.id));
            if (t.splitGroupId) {
              allGen.forEach(st => { if (st.splitGroupId === t.splitGroupId) targetDocIds.add(String(st.id)); });
              allBank.forEach(st => { if (st.splitGroupId === t.splitGroupId) targetDocIds.add(String(st.id)); });
            }
          }
        });
        allBank.forEach(t => {
          if (normalizeVrLocally(t.vrNo) === cleanVr || normalizeVrLocally(t.rcptNo) === cleanVr || normalizeVrLocally(t.payNo) === cleanVr) {
            targetDocIds.add(String(t.id));
            if (t.splitGroupId) {
              allGen.forEach(st => { if (st.splitGroupId === t.splitGroupId) targetDocIds.add(String(st.id)); });
              allBank.forEach(st => { if (st.splitGroupId === t.splitGroupId) targetDocIds.add(String(st.id)); });
            }
          }
        });
        allRawGen.forEach(t => {
          if (normalizeVrLocally(t.vrNo) === cleanVr || normalizeVrLocally(t.rcptNo) === cleanVr || normalizeVrLocally(t.payNo) === cleanVr) {
            targetDocIds.add(String(t.id || t._docId));
          }
        });
        allRawBank.forEach(t => {
          if (normalizeVrLocally(t.vrNo) === cleanVr || normalizeVrLocally(t.rcptNo) === cleanVr || normalizeVrLocally(t.payNo) === cleanVr) {
            targetDocIds.add(String(t.id || t._docId));
          }
        });
      }
    });

    let deletes = [];
    targetDocIds.forEach(id => {
      if (!id) return;
      deletes.push(db.collection("transactions").doc(String(id)).delete());
      deletes.push(db.collection("bank_transactions").doc(String(id)).delete());

      // Handle mirror payloads for inter-bank transfers
      let mirrorId = String(id).includes("_mirror") ? String(id).replace("_mirror", "") : String(id) + "_mirror";
      deletes.push(db.collection("transactions").doc(mirrorId).delete());
      deletes.push(db.collection("bank_transactions").doc(mirrorId).delete());
    });

    try {
      await Promise.all(deletes);
      hideGlobalLoading();
      showAlert("Your selected entries are deleted successfully! 🗑️", 'success');
      const selectAllCb = document.getElementById(type === 'cash' ? 'selectAllCash' : 'selectAllBank');
      if (selectAllCb) selectAllCb.checked = false;
    } catch (err) {
      hideGlobalLoading();
      showAlert("Error during bulk delete: " + err.message, 'error');
    }
  }, "Bulk Delete", "Delete", true);
}


async function printReceiptPaper() {
  const oldTitle = document.title;
  document.title = getReceiptFilename();

  let container = document.getElementById('batchPrintArea');
  if (!container) {
    container = document.createElement('div');
    container.id = 'batchPrintArea';
    document.body.appendChild(container);
  }
  container.innerHTML = '';

  showGlobalLoading("Preparing Print...");

  const canvas = await generateImageFromContainerForPrint('receiptPaperContainer', '#cce3d0');

  appendPrintCopy(container, canvas, 'print-receipt-wrapper', 'Office Copy');
  appendPrintCopy(container, canvas, 'print-receipt-wrapper', 'Payer Copy');

  let style = document.getElementById('dynamicPrintStyle');
  if (!style) {
    style = document.createElement('style');
    style.id = 'dynamicPrintStyle';
    document.head.appendChild(style);
  }
  style.innerHTML = `
        @page { size: auto !important; margin: 0mm !important; }
        html, body { height: 100% !important; min-height: 100% !important; }
        body.print-batch-active #batchPrintArea { height: 100% !important; background: #cce3d0 !important; }
        body.print-batch-active #batchPrintArea>div { 
          height: 50% !important; 
          display: flex !important; 
          justify-content: center !important; 
          align-items: center !important; 
        }
      `;

  document.documentElement.classList.add('print-batch-active-html');
  document.body.classList.remove('print-receipt-active');
  document.body.classList.add('print-batch-active');

  hideGlobalLoading();

  function cleanup() {
    document.documentElement.classList.remove('print-batch-active-html');
    document.title = oldTitle;
    style.innerHTML = '';
    container.innerHTML = '';
    document.body.classList.remove('print-batch-active');
    const rModal = document.getElementById('generateReceiptModal');
    if (rModal && rModal.style.display !== 'none') {
      document.body.classList.add('print-receipt-active');
    } else {
      document.body.classList.remove('print-receipt-active');
    }
    markTransactionAsPrinted('rRcptNo');
  }

  window.addEventListener('afterprint', cleanup, { once: true });

  setTimeout(function () {
    window.print();
  }, 500);
}

function directPrintReceipt(tx) {
  if (!tx) return;
  currentReceiptTx = tx;

  const cleanVr = String(tx.vrNo).replace(/^#+/, '').trim().toLowerCase();
  const matchingTxs = globalRawTransactions.filter(t => String(t.vrNo).replace(/^#+/, '').trim().toLowerCase() === cleanVr);
  const txsToPass = (matchingTxs && matchingTxs.length > 0) ? matchingTxs : tx;

  populateReceiptModalData(txsToPass);
  const modal = document.getElementById('generateReceiptModal');
  if (modal) modal.style.display = 'none';
  printReceiptPaper();
}

async function printPaymentVoucherPaper() {
  const oldTitle = document.title;
  document.title = getPaymentVoucherFilename();

  let container = document.getElementById('batchPrintArea');
  if (!container) {
    container = document.createElement('div');
    container.id = 'batchPrintArea';
    document.body.appendChild(container);
  }
  container.innerHTML = '';

  showGlobalLoading("Preparing Print...");

  const canvas = await generateImageFromContainerForPrint('paymentVoucherPaperContainer', '#fffae6');

  appendPrintCopy(container, canvas, 'print-voucher-wrapper', 'Office Copy');
  appendPrintCopy(container, canvas, 'print-voucher-wrapper', 'Payee Copy');

  let style = document.getElementById('dynamicPrintStyle');
  if (!style) {
    style = document.createElement('style');
    style.id = 'dynamicPrintStyle';
    document.head.appendChild(style);
  }
  style.innerHTML = `
        @page { size: auto !important; margin: 0mm !important; }
        html, body { height: 100% !important; min-height: 100% !important; }
        body.print-batch-active #batchPrintArea { height: 100% !important; background: #fffae6 !important; }
        body.print-batch-active #batchPrintArea>div { 
          height: 50% !important; 
          display: flex !important; 
          justify-content: center !important; 
          align-items: center !important; 
        }
      `;

  document.documentElement.classList.add('print-batch-active-html');
  document.body.classList.remove('print-voucher-active');
  document.body.classList.add('print-batch-active');

  hideGlobalLoading();

  function cleanup() {
    document.documentElement.classList.remove('print-batch-active-html');
    document.title = oldTitle;
    style.innerHTML = '';
    container.innerHTML = '';
    document.body.classList.remove('print-batch-active');
    const pModal = document.getElementById('generatePaymentVoucherModal');
    if (pModal && pModal.style.display !== 'none') {
      document.body.classList.add('print-voucher-active');
    } else {
      document.body.classList.remove('print-voucher-active');
    }
    markTransactionAsPrinted('pVoucherNo');
  }

  window.addEventListener('afterprint', cleanup, { once: true });

  setTimeout(function () {
    window.print();
  }, 500);
}

function directPrintPaymentVoucher(tx) {
  if (!tx) return;
  currentPaymentTx = tx;
  populatePaymentVoucherModalData(tx);
  const modal = document.getElementById('generatePaymentVoucherModal');
  if (modal) modal.style.display = 'none';
  printPaymentVoucherPaper();
}

let currentLoadedTxList = [];
let allTimeTxList = [];
let allTimeBankBookList = [];
let allTimeGeneralTxList = [];
let allTimeSuspenseTxList = [];
let currentGeneralTxList = [];
let currentSuspenseTxList = [];
let currentGlobalFY = "2026-2027"; // Active financial year for database records

// Parse the date string into a Date object
function parseTxDate(tx) {
  if (!tx || !tx.date) return null;
  if (typeof parseDateValue === 'function') {
    const p = parseDateValue(tx.date);
    if (p && !isNaN(p.year) && !isNaN(p.month) && !isNaN(p.day)) {
      return new Date(p.year, p.month, p.day);
    }
  }
  let dateStr = typeof formatDateClean === 'function' ? formatDateClean(tx.date) : String(tx.date);
  if (dateStr === '--') return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d;
}

function parseVrNoForSort(vrNo) {
  if (!vrNo) return { main: 0, sub: 0 };
  const str = String(vrNo).trim();
  const parts = str.split(/[\/\-]/);
  const main = parseInt(parts[0].replace(/[^0-9]/g, ''), 10) || 0;
  const sub = parts.length > 1 ? (parseInt(parts[1].replace(/[^0-9]/g, ''), 10) || 0) : 0;
  return { main: main, sub: sub };
}

function sortTransactionsAscending(rawList) {
  const list = rawList.slice();
  list.sort((a, b) => {
    const dateA = typeof parseTxDate === 'function' ? parseTxDate(a) : new Date(a.date);
    const dateB = typeof parseTxDate === 'function' ? parseTxDate(b) : new Date(b.date);
    const timeA = dateA ? dateA.getTime() : 0;
    const timeB = dateB ? dateB.getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    const isRcptA = isTxReceipt(a);
    const isRcptB = isTxReceipt(b);
    if (isRcptA !== isRcptB) return isRcptB - isRcptA; // Credit (1) before Debit (0)
    const numA = parseVrNoForSort(a.vrNo);
    const numB = parseVrNoForSort(b.vrNo);
    if (numA.main !== numB.main) return numA.main - numB.main;
    return numA.sub - numB.sub;
  });
  return list;
}

function isTxReceipt(tx) {
  if (!tx) return 0;
  if (tx._isOpeningBalanceRow) return 1;
  // 1. Explicit Charity Subtype overrides everything else
  if (tx.type === 'Charity' && tx.subtype) {
    if (tx.subtype.toLowerCase().includes('received')) return 1;
    if (tx.subtype.toLowerCase().includes('paid')) return 0;
  }

  // 2. Contra entries handling depending on context (Cash Book vs Bank Book)
  const bsub = String(tx.bankSubtype || '').toLowerCase();
  const desc = String(tx.description || '').toLowerCase();
  const subtype = String(tx.subtype || '').toLowerCase();
  const isCashDeposit = bsub.includes('cash deposit') || desc.includes('cash deposit') || subtype.includes('cash deposit');
  const isCashWithdrawal = bsub.includes('cash withdrawal') || desc.includes('cash withdrawal') || subtype.includes('cash withdrawal');

  if (isCashDeposit) {
    // If it's a cash-side record in Cash Book: cash goes out -> Payment (0)
    if (tx._bankContra || tx.entryType === 'Cash' || (tx.inCashBook && !tx.account && tx.mode === 'Payment')) {
      return 0;
    }
    // In Bank Book: money comes into bank -> Credit/Receipt (1)
    return 1;
  }

  if (isCashWithdrawal) {
    // If it's a cash-side record in Cash Book: cash comes in -> Receipt (1)
    if (tx._bankContra || tx.entryType === 'Cash' || (tx.inCashBook && !tx.account && tx.mode === 'Receipt')) {
      return 1;
    }
    // In Bank Book: money goes out from bank -> Debit/Payment (0)
    return 0;
  }

  // 3. Mode explicitly set (supports Credit / Receipt / Deposit vs Debit / Payment / Withdrawal)
  if (tx.mode) {
    const m = String(tx.mode).toLowerCase();
    if (m.includes('receipt') || m.includes('credit') || m.includes('deposit')) return 1;
    if (m.includes('payment') || m.includes('debit') || m.includes('withdrawal')) return 0;
  }
  // 4. Fallbacks
  if (Number(tx.receipt || 0) > 0 || Number(tx.credit || 0) > 0) return 1;
  if (Number(tx.payment || tx.payments || 0) > 0 || Number(tx.debit || 0) > 0) return 0;
  if (tx.type && (tx.type.toLowerCase() === 'receipt' || tx.type.toLowerCase().includes('opening balance'))) return 1;
  return 0;
}

// Global sort function identically to Cash Book
function sortTxDescending(list) {
  if (!list || !Array.isArray(list)) return list;
  return list.sort(function (a, b) {
    var dateA = typeof parseTxDate === 'function' ? parseTxDate(a) : new Date(a.date);
    var dateB = typeof parseTxDate === 'function' ? parseTxDate(b) : new Date(b.date);
    var timeA = dateA ? dateA.getTime() : 0;
    var timeB = dateB ? dateB.getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;
    var isRcptA = isTxReceipt(a);
    var isRcptB = isTxReceipt(b);
    if (isRcptA !== isRcptB) return isRcptB - isRcptA; // For same date, Credit/Receipt (1) comes before Debit/Payment (0)
    var numA = parseVrNoForSort(a.vrNo);
    var numB = parseVrNoForSort(b.vrNo);
    if (numA.main !== numB.main) return numB.main - numA.main;
    return numB.sub - numA.sub;
  });
}

// Filter a list of transactions by the currently selected Financial Year
function filterListByFY(list) {
  if (!currentGlobalFY || currentGlobalFY === "All") return sortTxDescending(list);
  const parts = currentGlobalFY.split("-");
  if (parts.length !== 2) return sortTxDescending(list);

  const startYear = parseInt(parts[0], 10);
  const endYear = parseInt(parts[1], 10);

  const startDate = new Date(startYear, 3, 1); // April 1st
  const endDate = new Date(endYear, 2, 31, 23, 59, 59); // March 31st

  const filtered = list.filter(tx => {
    if (tx.financialYear && currentGlobalFY && tx.financialYear === currentGlobalFY) return true;
    if (tx.financial_year && currentGlobalFY && tx.financial_year === currentGlobalFY) return true;
    const d = parseTxDate(tx);
    if (!d) return true; // Keep transactions with invalid/missing dates so they are not lost
    return d >= startDate && d <= endDate;
  });

  return sortTxDescending(filtered);
}

function getEarliestOpeningBalances() {
  let cashAmt = 0;
  let sbiAmt = 0;
  let fdAmt = 0;

  const store = (window.openingBalancesStore && Object.keys(window.openingBalancesStore).length > 0)
    ? window.openingBalancesStore
    : (globalRawOpening && Object.keys(globalRawOpening).length > 0 ? globalRawOpening : {});

  const fyKey = (currentGlobalFY && currentGlobalFY !== "All") ? currentGlobalFY : "2026-2027";
  let balances = null;
  if (store) {
    if (store[fyKey]) balances = store[fyKey];
    else if (store["2026-2027"]) balances = store["2026-2027"];
    else if (store["default"]) balances = store["default"];
    else {
      const keys = Object.keys(store);
      if (keys.length > 0) balances = store[keys[0]];
    }
  }
  if (!balances) {
    balances = { cash: 127005, sbi: 143068.37, fd: 108022 };
  }

  cashAmt = Number(balances.cash ?? balances.cash_amount ?? 0);
  sbiAmt = Number(balances.sbi ?? balances.sbiCurrent ?? balances.sbi_current_amount ?? 0);
  fdAmt = Number(balances.fd ?? balances.sbiFd ?? balances.sbi_fd_amount ?? 0);

  return {
    cash: { amount: cashAmt, date: null, tx: null },
    sbi: { amount: sbiAmt, date: null, tx: null },
    fd: { amount: fdAmt, date: null, tx: null }
  };
}

function getActiveFyStartDate() {
  if (currentGlobalFY && currentGlobalFY !== "All") {
    const parts = currentGlobalFY.split("-");
    if (parts.length === 2) {
      const yr = parseInt(parts[0], 10);
      if (!isNaN(yr)) return new Date(yr, 3, 1);
    }
  }
  return new Date(2024, 3, 1);
}

function calculateCarryForward() {
  const earliest = getEarliestOpeningBalances();
  let cf = { cash: 0, sbi: 0, fd: 0 };

  if (!currentGlobalFY || currentGlobalFY === "All") {
    cf.cash = earliest.cash.amount;
    cf.sbi = earliest.sbi.amount;
    cf.fd = earliest.fd.amount;
    return cf;
  }

  const parts = currentGlobalFY.split("-");
  const startYear = parseInt(parts[0], 10);
  const startDate = new Date(startYear, 3, 1); // April 1st

  cf.cash = earliest.cash.amount;

  if (allTimeTxList) {
    allTimeTxList.forEach(tx => {
      const d = parseTxDate(tx);
      if (d && d < startDate) {
        if (earliest.cash.tx && tx === earliest.cash.tx) return;

        const typeStr = (tx.type || '').toLowerCase();
        const descStr = (tx.description || '').toLowerCase();
        const nameStr = (tx.name || tx.accountName || '').toLowerCase();
        const isOpening = typeStr.includes('opening balance') || descStr.includes('opening balance') || nameStr.includes('opening balance');
        if (isOpening) return;

        const rect = Number(tx.receipt || 0);
        const pay = Number(tx.payment || tx.payments || 0);

        cf.cash += (rect - pay);
      }
    });
  }

  cf.sbi = earliest.sbi.amount;
  cf.fd = earliest.fd.amount;

  if (allTimeBankBookList) {
    allTimeBankBookList.forEach(tx => {
      const d = parseTxDate(tx);
      if (d && d < startDate) {
        if (earliest.sbi.tx && tx === earliest.sbi.tx) return;
        if (earliest.fd.tx && tx === earliest.fd.tx) return;

        const type = (tx.type || '').toLowerCase();
        const desc = (tx.description || '').toLowerCase();
        const name = (tx.name || tx.accountName || '').toLowerCase();
        const isOpening = type === 'opening balance' || desc.includes('opening balance') || name.includes('opening balance');
        if (isOpening) return;

        const isReceipt = isTxReceipt(tx) === 1;
        const amt = Number(tx.amount || tx.receipt || tx.payment || tx.payments || 0);
        const accLower = (tx.account || tx.accountName || tx.account_name || tx.bankAccount || tx.bank_account || '').toLowerCase();
        let isFD = false;
        if (accLower.includes('fixed deposit') || accLower.includes('fd')) {
          isFD = true;
        } else if (accLower.includes('state bank') || accLower.includes('current') || accLower.includes('sbi')) {
          isFD = false;
        } else {
          const bSubLower = (tx.bankSubtype || tx.bank_subtype || '').toLowerCase();
          if (bSubLower.includes('fixed deposit') || bSubLower.includes('fd')) {
            isFD = true;
          }
        }

        if (isFD) {
          if (isReceipt) cf.fd += amt;
          else cf.fd -= amt;
        } else {
          if (isReceipt) cf.sbi += amt;
          else cf.sbi -= amt;
        }
      }
    });
  }
  return cf;
}

function toggleCalculationBreakdown() {
  const content = document.getElementById('calculationBreakdownContent');
  const arrow = document.getElementById('calcToggleArrow');
  if (content.style.display === 'none') {
    content.style.display = 'block';
    arrow.innerHTML = '➖ Hide Calculations';
  } else {
    content.style.display = 'none';
    arrow.innerHTML = '➕ Show Calculations';
  }
}

function getCalculationBreakdown() {
  const earliest = getEarliestOpeningBalances();

  if (!currentGlobalFY || currentGlobalFY === "All") {
    return {
      isAll: true,
      cash: { initial: earliest.cash.amount, priorReceipts: 0, priorPayments: 0, opening: earliest.cash.amount },
      sbi: { initial: earliest.sbi.amount, priorReceipts: 0, priorPayments: 0, opening: earliest.sbi.amount },
      fd: { initial: earliest.fd.amount, priorReceipts: 0, priorPayments: 0, opening: earliest.fd.amount }
    };
  }

  const parts = currentGlobalFY.split("-");
  const startYear = parseInt(parts[0], 10);
  const startDate = new Date(startYear, 3, 1); // April 1st

  let cash = { initial: earliest.cash.amount, priorReceipts: 0, priorPayments: 0, opening: earliest.cash.amount };
  let sbi = { initial: earliest.sbi.amount, priorReceipts: 0, priorPayments: 0, opening: earliest.sbi.amount };
  let fd = { initial: earliest.fd.amount, priorReceipts: 0, priorPayments: 0, opening: earliest.fd.amount };

  if (allTimeTxList) {
    allTimeTxList.forEach(tx => {
      const d = parseTxDate(tx);
      if (d && d < startDate) {
        if (earliest.cash.tx && tx === earliest.cash.tx) return;

        const typeStr = (tx.type || '').toLowerCase();
        const descStr = (tx.description || '').toLowerCase();
        const nameStr = (tx.name || tx.accountName || '').toLowerCase();
        const isOpening = typeStr.includes('opening balance') || descStr.includes('opening balance') || nameStr.includes('opening balance');
        if (isOpening) return;

        const rect = Number(tx.receipt || 0);
        const pay = Number(tx.payment || tx.payments || 0);

        cash.priorReceipts += rect;
        cash.priorPayments += pay;
      }
    });
  }

  if (allTimeBankBookList) {
    allTimeBankBookList.forEach(tx => {
      const d = parseTxDate(tx);
      if (d && d < startDate) {
        if (earliest.sbi.tx && tx === earliest.sbi.tx) return;
        if (earliest.fd.tx && tx === earliest.fd.tx) return;

        const type = (tx.type || '').toLowerCase();
        const desc = (tx.description || '').toLowerCase();
        const name = (tx.name || tx.accountName || '').toLowerCase();
        const isOpening = type === 'opening balance' || desc.includes('opening balance') || name.includes('opening balance');
        if (isOpening) return;

        const isReceipt = isTxReceipt(tx) === 1;
        const amt = Number(tx.amount || tx.receipt || tx.payment || tx.payments || 0);
        const accLower = (tx.account || tx.accountName || tx.account_name || tx.bankAccount || tx.bank_account || '').toLowerCase();
        let isFD = false;
        if (accLower.includes('fixed deposit') || accLower.includes('fd')) {
          isFD = true;
        } else if (accLower.includes('state bank') || accLower.includes('current') || accLower.includes('sbi')) {
          isFD = false;
        } else {
          const bSubLower = (tx.bankSubtype || tx.bank_subtype || '').toLowerCase();
          if (bSubLower.includes('fixed deposit') || bSubLower.includes('fd')) {
            isFD = true;
          }
        }

        if (isFD) {
          if (isReceipt) fd.priorReceipts += amt;
          else fd.priorPayments += amt;
        } else {
          if (isReceipt) sbi.priorReceipts += amt;
          else sbi.priorPayments += amt;
        }
      }
    });
  }

  cash.opening = cash.initial + cash.priorReceipts - cash.priorPayments;
  sbi.opening = sbi.initial + sbi.priorReceipts - sbi.priorPayments;
  fd.opening = fd.initial + fd.priorReceipts - fd.priorPayments;

  return {
    isAll: false,
    cash,
    sbi,
    fd
  };
}

// Get list of available financial years based on current date
function getAvailableFyList() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Jan, 3 = Apr
  const baseYear = currentMonth < 3 ? currentYear - 1 : currentYear;

  const minYear = Math.min(baseYear - 3, 2023);
  const maxYear = Math.max(baseYear + 2, 2027);

  const list = [];
  for (let i = minYear; i <= maxYear; i++) {
    const fyString = i + "-" + (i + 1);
    list.push({
      value: fyString,
      isCurrent: fyString === "2026-2027",
      startYear: i,
      endYear: i + 1,
      label: `FY ${fyString}`
    });
  }
  return list;
}

// Check if a transaction type / dynamic tab is applicable to currentGlobalFY
function isTabApplicableToCurrentFY(rules) {
  if (!rules) return true;
  const fyRule = rules.fy || 'All';
  if (fyRule === 'All' || rules.allFY === true) return true;
  if (!currentGlobalFY || currentGlobalFY === 'All') return true;
  return fyRule === currentGlobalFY;
}

// Update the visible FY indicator badge, subtitle, and date range across the dashboard and tabs
function updateActiveFyHeaderDisplay() {
  const select = document.getElementById('globalFySelect');
  if (select && currentGlobalFY && select.value !== currentGlobalFY) {
    select.value = currentGlobalFY;
  }

  const textEl = document.getElementById('activeFyHeaderText');
  const rangeEl = document.getElementById('activeFyHeaderDateRange');
  const subTitleEl = document.getElementById('dashboardFySubtitle');

  let label = "All Time Records";
  let range = "All financial years included";

  if (currentGlobalFY && currentGlobalFY !== "All") {
    const parts = currentGlobalFY.split("-");
    if (parts.length === 2) {
      label = `Financial Year ${currentGlobalFY}`;
      range = `01-Apr-${parts[0]} to 31-Mar-${parts[1]}`;
    } else {
      label = `Financial Year ${currentGlobalFY}`;
      range = "";
    }
  }

  if (textEl) textEl.innerText = label;
  if (rangeEl) rangeEl.innerText = range;
  if (subTitleEl) subTitleEl.innerText = `EXECUTIVE SUMMARY & STATEMENT • ${label.toUpperCase()}`;

  // Update all elements with class .active-fy-label-display across other tabs
  document.querySelectorAll('.active-fy-label-display').forEach(el => {
    el.innerText = label;
  });
}

// Update subscription months based on FY
function updateSubscriptionMonths() {
  const subMonthSelect = document.getElementById('subMonth');
  if (!subMonthSelect) return;

  if (currentGlobalFY && currentGlobalFY !== 'All') {
    const parts = currentGlobalFY.split('-');
    if (parts.length === 2) {
      const startYear = parseInt(parts[0], 10);
      const endYear = parseInt(parts[1], 10);

      const months = [
        `April ${startYear}`, `May ${startYear}`, `June ${startYear}`, `July ${startYear}`,
        `August ${startYear}`, `September ${startYear}`, `October ${startYear}`, `November ${startYear}`,
        `December ${startYear}`, `January ${endYear}`, `February ${endYear}`, `March ${endYear}`
      ];

      const currentValue = subMonthSelect.value;
      subMonthSelect.innerHTML = '';
      months.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.innerText = m;
        subMonthSelect.appendChild(opt);
      });
      if (months.includes(currentValue)) {
        subMonthSelect.value = currentValue;
      }
    }
  }
}

// Called when the dropdown is changed
function applyGlobalFyFilter() {
  if (typeof markAllTabsDirty === 'function') markAllTabsDirty();

  const select = document.getElementById('globalFySelect');
  if (select) {
    currentGlobalFY = select.value;
  }

  updateActiveFyHeaderDisplay();

  // Re-apply filters from the ALL-TIME lists
  currentLoadedTxList = filterListByFY(allTimeTxList);
  loadedBankBookTransactions = filterListByFY(allTimeBankBookList);
  currentGeneralTxList = filterListByFY(allTimeGeneralTxList);
  currentSuspenseTxList = filterListByFY(allTimeSuspenseTxList);

  updateSubscriptionMonths();

  // Re-render dynamic tabs and type options according to selected FY
  if (typeof renderDynamicTabs === 'function') renderDynamicTabs();
  if (typeof populateTypeDropdowns === 'function') populateTypeDropdowns();

  // Re-render everything
  renderDashboard();
  if (typeof renderSuspenseTable === 'function') renderSuspenseTable();

  // Refresh Members Tab logic
  if (typeof filterMembersTabList === 'function') {
    if (selectedMemberName) {
      const activeMembersSet = new Set();
      if (typeof currentGeneralTxList !== 'undefined') {
        currentGeneralTxList.forEach(tx => {
          let name = (tx.accountName && tx.accountName !== '-') ? tx.accountName : (tx.name && tx.name !== '-' ? tx.name : '');
          if (name) activeMembersSet.add(name.toLowerCase().trim());
        });
      }
      if (activeMembersSet.has(selectedMemberName.toLowerCase().trim())) {
        selectMemberLedger(selectedMemberName, selectedMemberAddress);
      } else {
        selectedMemberName = null;
        selectedMemberAddress = null;
        filterMembersTabList();
      }
    } else {
      filterMembersTabList();
    }
  }
}

// Generate FY options based on current year + a few years back/forward
function initFyDropdown() {
  const select = document.getElementById('globalFySelect');
  if (!select) return;

  const fyList = getAvailableFyList();
  select.innerHTML = '';

  const optAll = document.createElement('option');
  optAll.value = "All";
  optAll.innerText = "All Time";
  select.appendChild(optAll);

  let has2627 = false;
  fyList.forEach(fy => {
    if (fy.value === '2026-2027') has2627 = true;
    const opt = document.createElement('option');
    opt.value = fy.value;
    const isTarget = fy.value === '2026-2027';
    opt.innerText = isTarget ? `FY ${fy.value} (Current)` : `FY ${fy.value}`;
    select.appendChild(opt);
  });

  if (!has2627) {
    const opt2627 = document.createElement('option');
    opt2627.value = '2026-2027';
    opt2627.innerText = 'FY 2026-2027 (Current)';
    select.appendChild(opt2627);
  }

  const targetFy = (currentGlobalFY && currentGlobalFY !== "All") ? currentGlobalFY : "2026-2027";
  select.value = targetFy;
  currentGlobalFY = targetFy;

  updateActiveFyHeaderDisplay();
}

function renderRecentTransactions(list) {
  const txTbody = document.getElementById('recentTransactionsBody');
  if (!txTbody) return;

  if (list) currentLoadedTxList = list;
  const targetList = currentLoadedTxList || [];

  // Extract members dynamically from fetched live transactions if membersDataStore is empty
  if (targetList.length > 0 && (!membersDataStore || membersDataStore.length === 0)) {
    const mSet = {};
    targetList.forEach(tx => {
      if (tx.accountName && tx.accountName !== '-' && !tx.accountName.includes('Offering') && !tx.accountName.includes('Offertory')) {
        const nameClean = tx.accountName.trim();
        if (!mSet[nameClean.toLowerCase()]) {
          mSet[nameClean.toLowerCase()] = { name: nameClean, address: tx.address || 'Thadiyoor' };
        }
      }
    });
    const mList = Object.values(mSet);
    if (mList.length > 0) {
      mList.sort((a, b) => compareNamesIgnoringPrefix(a.name, b.name));
      membersDataStore = mList;
      if (document.getElementById('membersListSidebar')) filterMembersTabList();
    }
  }

  const searchVal = (document.getElementById('cashBookSearchInput') ? document.getElementById('cashBookSearchInput').value : '').toLowerCase().trim();

  let cf = calculateCarryForward();
  let openingBal = cf.cash;
  const fyStartDate = getActiveFyStartDate();

  const cashObTx = {
    _isOpeningBalanceRow: true,
    id: 'OB_CASH',
    date: fyStartDate,
    vrNo: 'OB',
    accountName: 'Opening Balance (Cash in Hand)',
    description: 'Opening Cash Balance',
    receipt: openingBal,
    payment: 0,
    type: 'Opening Balance',
    subtype: 'Opening Balance',
    addToCashBook: true,
    inCashBook: true
  };

  const filteredList = targetList.filter(tx => {
    const type = (tx.type || '').toLowerCase();
    const desc = (tx.description || tx.particulars || '').toLowerCase();
    const isOpeningBalance = type === 'opening balance' || desc.includes('opening balance');

    if (isOpeningBalance) {
      return false; // cf.cash already includes opening balance
    }

    // Filter out pure Bank transactions (they belong in the Bank Book, not Cash Book)
    // Only Contra entries or entries explicitly marked addToCashBook should appear here.
    const entryType = (tx.entryType || 'Cash').toLowerCase();
    const bSubtype = (tx.bankSubtype || '').toLowerCase();
    const isInterBank = bSubtype.includes('inter-bank') || bSubtype.includes('inter transfer') || desc.includes('inter-bank') || desc.includes('inter transfer') || type.includes('inter-bank');

    if (isInterBank) {
      return false; // Inter-Bank Transfers move money between banks; MUST NOT appear in Cash Book
    }

    const isContra = bSubtype.includes('cash deposit') || bSubtype.includes('cash withdrawal') || desc.includes('cash deposit') || desc.includes('cash withdrawal');
    const isBank = entryType === 'bank' || String(tx.vrNo || '').toLowerCase().endsWith('/b');

    if (isBank && !isContra && tx.addToCashBook !== true && tx.inCashBook !== true) {
      return false;
    }

    // Filter out corrupted/empty rows that have no financial impact (unless they are explicitly cancelled vouchers)
    const rcptVal = Number(tx.receipt || 0);
    const pmtVal = Number(tx.payment || tx.payments || 0);
    const isCancelled = desc.includes('cancelled') || type.includes('cancelled') || (tx.accountName || '').toLowerCase().includes('cancelled');

    if (rcptVal === 0 && pmtVal === 0 && !isCancelled) {
      return false;
    }

    if (!searchVal) return true;
    const accName = (tx.accountName || '').toLowerCase();
    const vrNo = String(tx.vrNo || '').toLowerCase();
    const subtype = (tx.subtype || '').toLowerCase();
    return accName.includes(searchVal) || desc.includes(searchVal) || vrNo.includes(searchVal) || type.includes(searchVal) || subtype.includes(searchVal);
  });

  if (!searchVal || 'opening balance'.includes(searchVal) || 'ob'.includes(searchVal) || 'cash in hand'.includes(searchVal)) {
    filteredList.push(cashObTx);
  }

  const groupedFiltered = [];
  const baseVrMap = {};

  filteredList.forEach(tx => {
    if (tx._isOpeningBalanceRow) {
      groupedFiltered.push(tx);
      return;
    }

    let rawVr = tx.vrNo || '';
    let cleanVr = normalizeVrLocally(rawVr);
    let isBlankVr = !cleanVr || cleanVr === '-' || cleanVr === '--' || cleanVr === 'ob';

    const descLower = (tx.description || tx.particulars || '').toLowerCase();
    const subLower = (tx.subtype || '').toLowerCase();
    const bSubLower = (tx.bankSubtype || '').toLowerCase();
    const typeLower = (tx.type || '').toLowerCase();
    const isContraEntry = tx._bankContra ||
      typeLower === 'contra' ||
      subLower.includes('contra') ||
      bSubLower.includes('contra') ||
      descLower.includes('cash deposit') ||
      descLower.includes('cash withdrawal') ||
      subLower.includes('cash deposit') ||
      subLower.includes('cash withdrawal');

    let groupingKey;
    if (tx.splitGroupId) {
      groupingKey = 'split_' + tx.splitGroupId;
    } else if (tx.transactionId && String(tx.transactionId).trim() !== '') {
      groupingKey = 'txid_' + tx.transactionId;
    } else if (isContraEntry) {
      groupingKey = 'contra_' + (tx.date || '') + '_' + tx.id;
    } else if (!isBlankVr) {
      groupingKey = cleanVr + '_' + (tx.date || '');
    } else if (tx.isSplitEntry) {
      groupingKey = 'split_legacy_' + (tx.date || '') + '_' + (tx.accountName || '') + '_' + (tx.mode || '') + '_' + (tx.splitTotalAmount || '');
    } else {
      groupingKey = 'unique_' + tx.id;
    }

    const rcpt = Number(tx.receipt || 0);
    const pmt = Number(tx.payment || tx.payments || 0);
    const dStr = (tx.description || tx.particulars || tx.subtype || tx.type || '').trim();
    const typeStr = (tx.type || '').trim();

    if (!baseVrMap[groupingKey]) {
      const newTx = Object.assign({}, tx);
      if (isContraEntry) newTx.isContra = true;
      newTx.receipt = rcpt;
      newTx.payment = pmt;
      newTx.allVrNos = rawVr ? [rawVr] : [];
      newTx.allTxIds = [tx.id];
      newTx._splitItems = [tx];
      newTx._descParts = dStr ? [dStr] : [];
      newTx._types = typeStr ? [typeStr] : [];
      baseVrMap[groupingKey] = newTx;
      groupedFiltered.push(newTx);
    } else {
      const target = baseVrMap[groupingKey];
      // Check if this is a duplicated contra entry for the same voucher/date
      const isTxContra = tx._bankContra || tx.type === 'Contra' || (tx.subtype || '').includes('Contra') || (tx.description || '').toLowerCase().includes('cash deposit') || (tx.description || '').toLowerCase().includes('cash withdrawal');
      const isTargetContra = target._bankContra || target.type === 'Contra' || (target.subtype || '').includes('Contra') || (target.description || '').toLowerCase().includes('cash deposit') || (target.description || '').toLowerCase().includes('cash withdrawal');
      if (isTxContra && isTargetContra) {
        // Prevent doubling of contra entries for same voucher
        return;
      }
      target.receipt += rcpt;
      target.payment += pmt;
      target.amount = (target.receipt || target.payment);
      if (rawVr && !target.allVrNos.includes(rawVr)) target.allVrNos.push(rawVr);
      if (!target.allTxIds.includes(tx.id)) target.allTxIds.push(tx.id);
      target._splitItems.push(tx);

      if (dStr && !target._descParts.some(dp => dp.toLowerCase() === dStr.toLowerCase())) {
        target._descParts.push(dStr);
      }
      if (typeStr && !target._types.includes(typeStr)) {
        target._types.push(typeStr);
      }

      target.description = target._descParts.join(' + ');
      target.type = target._types.length > 1 ? target._types.join(', ') : (target._types[0] || target.type);
    }
  });

  // Sort by date ascending first to calculate running balance correctly
  groupedFiltered.sort(function (a, b) {
    if (a._isOpeningBalanceRow) return -1;
    if (b._isOpeningBalanceRow) return 1;
    var dateA = typeof parseTxDate === 'function' ? parseTxDate(a) : new Date(a.date);
    var dateB = typeof parseTxDate === 'function' ? parseTxDate(b) : new Date(b.date);
    var timeA = dateA ? dateA.getTime() : 0;
    var timeB = dateB ? dateB.getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    var isRcptA = isTxReceipt(a);
    var isRcptB = isTxReceipt(b);
    if (isRcptA !== isRcptB) return isRcptB - isRcptA; // For ascending date, Receipt (1) comes before Payment (0)
    var numA = parseVrNoForSort(a.vrNo);
    var numB = parseVrNoForSort(b.vrNo);
    if (numA.main !== numB.main) return numA.main - numB.main;
    return numA.sub - numB.sub;
  });
  const elCashOb = document.getElementById('cashBookTabOpeningBalance');
  if (elCashOb) elCashOb.innerText = formatCurrency(openingBal);

  txTbody.innerHTML = '';
  if (groupedFiltered && groupedFiltered.length > 0) {
    // Calculate total balance for header display
    let cashHandVal = openingBal;
    let totalRcpts = 0;
    let totalPmts = 0;
    if (targetList && targetList.length > 0) {
      targetList.forEach(tx => {
        const typeStr = (tx.type || '').toLowerCase();
        const descStr = (tx.description || '').toLowerCase();
        const nameStr = (tx.name || tx.accountName || '').toLowerCase();
        const isOpening = typeStr.includes('opening balance') || descStr.includes('opening balance') || nameStr.includes('opening balance');
        if (isOpening) return;
        const r = Number(tx.receipt || 0);
        const p = Number(tx.payment || tx.payments || 0);
        totalRcpts += r;
        totalPmts += p;
        cashHandVal += r - p;
      });
    }
    if (document.getElementById('cashBookTabBalance')) document.getElementById('cashBookTabBalance').innerText = formatCurrency(cashHandVal);
    if (document.getElementById('entryTabBalance')) document.getElementById('entryTabBalance').innerText = formatCurrency(cashHandVal);
    if (document.getElementById('cashBookTotalReceipts')) document.getElementById('cashBookTotalReceipts').innerText = formatCurrency(totalRcpts);
    if (document.getElementById('cashBookTotalPayments')) document.getElementById('cashBookTotalPayments').innerText = formatCurrency(totalPmts);

    // Calculate running balance in chronological order and store on each tx
    let runningBalance = 0;
    groupedFiltered.forEach(tx => {
      if (tx._isOpeningBalanceRow) {
        runningBalance = Number(tx.receipt || 0);
        tx._runningBalance = runningBalance;
      } else {
        const rcptVal = Number(tx.receipt || 0);
        const pmtVal = Number(tx.payment || tx.payments || 0);
        runningBalance += rcptVal - pmtVal;
        tx._runningBalance = runningBalance;
      }
    });

    // Re-sort to show latest date first (exact reverse of chronological sequence, OB at bottom)
    groupedFiltered.reverse();

    let rowsHtml = '';
    groupedFiltered.forEach(tx => {
      if (tx._isOpeningBalanceRow) {
        rowsHtml += `
          <tr style="background: #f0f9ff; border-bottom: 2px solid #bae6fd; font-weight: 700;">
            <td style="text-align: center; color: #0284c7;">•</td>
            <td style="font-weight: 600; color: #0369a1; white-space: nowrap;">-</td>
            <td style="font-weight: 800; color: #0284c7; text-align: center;">OB</td>
            <td style="font-weight: 700; color: #0f172a;">Opening Balance (Cash in Hand)</td>
            <td style="color: #0369a1;">Opening Cash Balance</td>
            <td class="num-col rcpt-val" style="font-weight: 800; color: #047857; text-align: right;">${openingBal ? formatCurrency(openingBal) : '-'}</td>
            <td class="num-col pmt-val" style="font-weight: 700; color: #94a3b8; text-align: right;">-</td>
            <td class="num-col" style="font-weight: 800; color: #1e40af; text-align: right;">${formatCurrency(tx._runningBalance)}</td>
            <td><span class="cb-badge-pill badge-general" style="background: #e0f2fe; color: #0369a1;">Opening Balance</span></td>
            <td style="text-align: center; color: #94a3b8;">-</td>
          </tr>
        `;
        return;
      }

      const st = (tx.subtype || '').toLowerCase().trim();
      const tp = (tx.type || '').toLowerCase().trim();
      const ac = (tx.accountName || '').toLowerCase().trim();
      if (st.includes('suspense') || tp.includes('suspense') || ac === 'suspense' || ac === 'suspenses') return;

      const rcptVal = Number(tx.receipt || 0);
      const pmtVal = Number(tx.payment || tx.payments || 0);

      const cleanDate = formatDateClean(tx.date);
      const cleanVr = formatVrNoClean(tx.vrNo);
      const isPrinted = '';

      const dStrCheck = (tx.description || tx.particulars || '').toLowerCase();
      const sStrCheck = (tx.subtype || '').toLowerCase();
      const bStrCheck = (tx.bankSubtype || '').toLowerCase();
      const tStrCheck = (tx.type || '').toLowerCase();
      const isContra = tx.isContra || tx._bankContra ||
        tStrCheck === 'contra' ||
        sStrCheck.includes('contra') ||
        bStrCheck.includes('contra') ||
        dStrCheck.includes('cash deposit') ||
        dStrCheck.includes('cash withdrawal') ||
        sStrCheck.includes('cash deposit') ||
        sStrCheck.includes('cash withdrawal');

      const contraVr = tx.contra_vr_no || tx.contraVrNo || tx.bank_vr_no || tx.bankVrNo || '';
      let displayVr = cleanVr && cleanVr !== '-' && cleanVr !== '--' ? cleanVr : (isContra && contraVr ? contraVr : '--');
      if (isContra && contraVr && contraVr !== cleanVr && cleanVr && cleanVr !== '-' && cleanVr !== '--') {
        displayVr = `<div>${cleanVr}</div><span style="display:inline-block; font-size:10px; color:#4f46e5; font-weight:700; background:#eef2ff; border:1px solid #c7d2fe; border-radius:3px; padding:1px 4px; margin-top:2px;" title="Paired Contra Bank No.">Bk: ${contraVr}</span>`;
      }

      let hasRcpt = false;
      let hasPmt = false;
      if (isContra) {
        const isDeposit = sStrCheck.includes('deposit') || bStrCheck.includes('deposit') || dStrCheck.includes('deposit') || pmtVal > 0;
        if (isDeposit) hasPmt = true; // Cash leaves cash box -> Cash Payment Voucher
        else hasRcpt = true; // Cash enters cash box -> Cash Receipt
      } else {
        if (tx.type === 'Charity' && tx.subtype) {
          if (tx.subtype.toLowerCase().includes('received')) hasRcpt = true;
          else if (tx.subtype.toLowerCase().includes('paid')) hasPmt = true;
        } else {
          if (rcptVal > 0) hasRcpt = true;
          else if (pmtVal > 0) hasPmt = true;
          else if (tx.type && tx.type.toLowerCase() === 'receipt') hasRcpt = true;
          else if (tx.mode && tx.mode.toLowerCase().includes('receipt')) hasRcpt = true;
          else hasPmt = true; // Fallback to voucher
        }
      }

      let catClass = 'badge-general';
      const tLower = (tx.type || '').toLowerCase();
      if (tLower.includes('subscr')) catClass = 'badge-subscription';
      else if (tLower.includes('offer')) catClass = 'badge-offering';
      else if (tLower.includes('ledger')) catClass = 'badge-ledger';
      else if (tLower.includes('charity') || tLower.includes('project')) catClass = 'badge-project';

      let dispName = (tx.accountName && tx.accountName !== '-') ? tx.accountName : (tx.subtype || tx.type || '-');
      if (tx.type === 'Charity' || (tx.subtype && tx.subtype.toLowerCase().includes('charity'))) {
        if (!tx.accountName || tx.accountName === '-') {
          if (tx.subtype) {
            dispName = (tx.subtype.toLowerCase() === 'received' || tx.subtype.toLowerCase() === 'charity received') ? 'Charity Received' : 'Charity Paid';
          } else {
            dispName = (rcptVal > 0) ? 'Charity Received' : 'Charity Paid';
          }
        }
      }

      const formattedMemberName = (tx.accountName && tx.accountName !== '-') ? formatMemberDisplayName(dispName, tx.title || '') : dispName;
      const addr = resolveMemberAddress(tx);
      const memberCellHtml = addr
        ? `<div style="font-weight: 700; color: #1e293b; line-height: 1.25;">${formattedMemberName}</div><div style="font-size: 0.75rem; color: #64748b; font-weight: normal; margin-top: 3px; line-height: 1.2;">📍 ${addr}</div>`
        : `<div style="font-weight: 700; color: #1e293b; line-height: 1.25;">${formattedMemberName}</div>`;

      const txIdsAttr = (tx.allTxIds || [tx.id]).filter(Boolean).join(',');
      const splitGroupAttr = tx.splitGroupId || '';

      rowsHtml += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="text-align: center;">${!tx._suspenseTx ? `<input type="checkbox" class="cash-batch-checkbox" value="${cleanVr}" data-tx-ids="${txIdsAttr}" data-split-group="${splitGroupAttr}">` : ''}</td>
              <td style="font-weight: 500; color: #334155; white-space: nowrap;"><span style="color: #94a3b8; font-size: 0.85rem; margin-right: 4px;"></span>${formatDateHtml(tx.date)}</td>
              <td style="font-weight: 700; color: #64748b; text-align: center;">${displayVr}</td>
              <td style="font-weight: 600; color: #0f172a;">${memberCellHtml}</td>
              <td style="color: #475569;">${tx.description || tx.particulars || '-'}</td>
              <td class="num-col rcpt-val" style="font-weight: 700; color: #047857; text-align: right;">${rcptVal ? formatCurrency(rcptVal) : '-'}</td>
              <td class="num-col pmt-val" style="font-weight: 700; color: #b91c1c; text-align: right;">${pmtVal ? formatCurrency(pmtVal) : '-'}</td>
              <td class="num-col" style="font-weight: 700; color: #1e40af; text-align: right;">${formatCurrency(tx._runningBalance)}</td>
              <td><span class="cb-badge-pill ${catClass}">${tx.type || '--'}</span></td>
              <td style="text-align: center; white-space: nowrap;">
                ${!tx._suspenseTx ? `
                  <button class="btn-action btn-table-action" style="background: #0f172a; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="openTransactionDetailModal('${tx.vrNo || cleanVr}', '${tx.id}')" title="View Details">👁️</button>
                  <button class="btn-action btn-table-action" style="background: #2563eb; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="loadEntryForEdit('${tx.vrNo || cleanVr}', '${tx.id}', '${tx.entryType || (isContra ? 'Bank' : 'Cash')}')" title="Edit Entry">✏️</button>
                  ${hasRcpt ? `<button class="btn-action btn-table-action" style="background: #059669; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="openReceiptModalByVrNo('${(cleanVr && cleanVr !== '-' && cleanVr !== '--') ? cleanVr : (tx.voucher_no || tx.vr_no || contraVr || '')}')" title="Print Receipt">🧾${isPrinted}${tx.whatsappSent ? ' <span title="WhatsApp Sent" style="font-size: 0.8rem; margin-left: 2px;">💬</span>' : ''}</button>` : ''}
                  ${hasPmt ? `<button class="btn-action btn-table-action" style="background: #dc2626; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="openPaymentVoucherModalByVrNo('${(cleanVr && cleanVr !== '-' && cleanVr !== '--') ? cleanVr : (tx.voucher_no || tx.vr_no || contraVr || '')}')" title="Print Voucher">🧾${isPrinted}${tx.whatsappSent ? ' <span title="WhatsApp Sent" style="font-size: 0.8rem; margin-left: 2px;">💬</span>' : ''}</button>` : ''}
                ` : '<span style="color:#94a3b8; font-size: 0.8rem;">Suspense</span>'}
              </td>
            </tr>
          `;
    });
    txTbody.innerHTML = rowsHtml;
  } else {
    txTbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 20px;">No matching transactions found</td></tr>';
  }
}

function renderBankBookTransactionsOld(list) {
  if (list) loadedBankBookTransactions = list;
  renderBankBookTransactions();
}



function openTransactionDetailModal(vrNo, txId, entryType) {
  let foundTx = null;
  const isBank = entryType === 'Bank' || (vrNo && String(vrNo).trim().endsWith('/B'));
  const allTxs = (typeof allTimeGeneralTxList !== 'undefined' && allTimeGeneralTxList.length > 0) ? allTimeGeneralTxList : [];
  const bankTxs = (typeof loadedBankBookTransactions !== 'undefined' && loadedBankBookTransactions.length > 0) ? loadedBankBookTransactions : [];

  if (txId) {
    if (isBank) {
      foundTx = bankTxs.find(t => String(t.id) === String(txId)) || allTxs.find(t => String(t.id) === String(txId));
    } else {
      foundTx = allTxs.find(t => String(t.id) === String(txId)) || bankTxs.find(t => String(t.id) === String(txId));
    }
  }
  if (!foundTx && vrNo && vrNo !== '--' && vrNo !== '-') {
    const cleanVrSearch = normalizeVrLocally(vrNo);
    if (isBank) {
      foundTx = bankTxs.find(t => normalizeVrLocally(t.vrNo) === cleanVrSearch || normalizeVrLocally(t.rcptNo) === cleanVrSearch || normalizeVrLocally(t.payNo) === cleanVrSearch);
      if (!foundTx) foundTx = allTxs.find(t => normalizeVrLocally(t.vrNo) === cleanVrSearch || normalizeVrLocally(t.rcptNo) === cleanVrSearch || normalizeVrLocally(t.payNo) === cleanVrSearch);
    } else {
      foundTx = allTxs.find(t => normalizeVrLocally(t.vrNo) === cleanVrSearch || normalizeVrLocally(t.rcptNo) === cleanVrSearch || normalizeVrLocally(t.payNo) === cleanVrSearch);
      if (!foundTx) foundTx = bankTxs.find(t => normalizeVrLocally(t.vrNo) === cleanVrSearch || normalizeVrLocally(t.rcptNo) === cleanVrSearch || normalizeVrLocally(t.payNo) === cleanVrSearch);
    }
  }

  const modal = document.getElementById('viewTransactionModal');
  if (!modal) return;

  if (foundTx) {
    populateViewModalData(foundTx);
    modal.style.display = 'flex';
  } else {
    alert("Transaction #" + (vrNo || txId || '') + " details not found.");
  }
}

// --- RECEIPT GENERATOR HELPERS ---
function numberToWordsIndian(num) {
  if (num === null || num === undefined || isNaN(num) || num === 0) return "Zero Rupees";
  num = Math.floor(Math.abs(Number(num)));
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
  }
  return inWords(num) + " Rupees";
}

let currentReceiptTx = null;

function populateReceiptModalData(txData) {
  if (!txData) return;
  const rawArray = Array.isArray(txData) ? txData : [txData];
  if (rawArray.length === 0) return;

  const firstTx = rawArray[0];
  const allTxs = (typeof allTimeGeneralTxList !== 'undefined' && allTimeGeneralTxList.length > 0)
    ? allTimeGeneralTxList
    : (globalRawTransactions || []);

  let txArray = [];
  const sList = (firstTx && Array.isArray(firstTx.splitItems) && firstTx.splitItems.length > 0)
    ? firstTx.splitItems
    : ((firstTx && Array.isArray(firstTx._splitItems) && firstTx._splitItems.length > 0) ? firstTx._splitItems : null);

  if (sList && sList.length > 0) {
    txArray = sList.map(item => Object.assign({}, firstTx, item, {
      amount: Number(item.amount || item.amt || item.receipt || item.credit || 0),
      receipt: Number(item.amount || item.amt || item.receipt || item.credit || 0),
      type: item.type || item.category || 'Split Item',
      subtype: item.subtype || '',
      month: item.month || item.subMonth || '',
      description: item.description || item.desc || ''
    }));
  } else if (rawArray.length > 1) {
    txArray = rawArray;
  } else if (firstTx && firstTx.splitGroupId) {
    const sgMatches = allTxs.filter(t => t.splitGroupId === firstTx.splitGroupId);
    if (sgMatches.length > 1) {
      txArray = sgMatches;
    }
  } else if (firstTx) {
    const cleanVr = normalizeVrLocally(firstTx.vrNo);
    if (cleanVr && cleanVr !== '-') {
      const vrMatches = allTxs.filter(t => normalizeVrLocally(t.vrNo) === cleanVr);
      if (vrMatches.length > 1) {
        txArray = vrMatches;
      }
    }
  }

  // Text-based '+' split items fallback if still only 1 entry
  if (txArray.length <= 1 && firstTx) {
    const descText = (firstTx.description || firstTx.particulars || '').trim();
    if (descText.includes('+')) {
      const parts = descText.split(/\s*\+\s*/);
      const parsedItems = [];
      parts.forEach(part => {
        const pTrimmed = part.trim();
        if (!pTrimmed) return;
        let pAmt = 0;
        const parenMatch = pTrimmed.match(/\((?:[^0-9]*)([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\)/);
        if (parenMatch) pAmt = parseFloat(parenMatch[1].replace(/,/g, ''));
        if (!pAmt || isNaN(pAmt)) {
          const symMatch = pTrimmed.match(/(?:rs\.?|inr|₹)\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/i);
          if (symMatch) pAmt = parseFloat(symMatch[1].replace(/,/g, ''));
        }
        if (pAmt > 0) {
          const pLower = pTrimmed.toLowerCase();
          let pType = 'Other';
          let pSub = '';
          if (pLower.includes('subscr')) pType = 'Subscription';
          else if (pLower.includes('charity')) { pType = 'Charity'; pSub = 'Charity Received'; }
          else if (pLower.includes('offering') || pLower.includes('offertory')) pType = 'Offering';
          else if (pLower.includes('donation')) pType = 'Donation';
          parsedItems.push({
            ...firstTx,
            type: pType,
            subtype: pSub || pType,
            amount: pAmt,
            receipt: pAmt,
            description: pTrimmed
          });
        }
      });
      if (parsedItems.length > 1) {
        txArray = parsedItems;
      }
    }
  }

  if (txArray.length === 0) {
    txArray = rawArray;
  }

  const cleanVr = formatVrNoClean(firstTx.vrNo);
  const cleanDate = formatDateClean(firstTx.date);
  let rawAccName = (firstTx.accountName && firstTx.accountName !== '-') ? firstTx.accountName : ((firstTx.name && firstTx.name !== '-') ? firstTx.name : '');
  if (!rawAccName && firstTx.description && firstTx.description !== '-') {
    if (firstTx.description.includes(' - ')) {
      const candidate = firstTx.description.split(' - ')[0].trim();
      if (candidate && !candidate.toLowerCase().includes('bank') && !candidate.toLowerCase().includes('cash deposit')) {
        rawAccName = candidate;
      }
    }
    if (!rawAccName) rawAccName = firstTx.description;
  }
  const accName = formatMemberDisplayName(rawAccName || '-');

  document.getElementById('rRcptNo').innerText = cleanVr;
  document.getElementById('rDate').innerText = cleanDate;
  document.getElementById('rAccountName').innerText = accName;
  if (document.getElementById('rAddress')) {
    const resAddr = resolveMemberAddress(firstTx);
    document.getElementById('rAddress').innerText = (resAddr || firstTx.address || '-');
  }

  let don = 0, sub = 0, off = 0, oth = 0;
  let othDescArr = [];
  let subMonthTextArr = [];
  let isCancelled = false;
  let totalAmt = 0;

  txArray.forEach(tx => {
    const amt = Number(tx.receipt || tx.credit || tx.amount || tx.amt || 0);
    totalAmt += amt;
    const typeStr = (tx.type || '').toLowerCase();
    const subStr = (tx.subtype || '').toLowerCase();
    const bSubStr = (tx.bankSubtype || tx.bank_subtype || '').toLowerCase();
    const catStr = (tx.category || '').toLowerCase();
    const descStr = (tx.description || tx.particulars || tx.desc || '').toLowerCase();

    if (descStr.includes('cancelled') || typeStr.includes('cancelled') || (tx.accountName || '').toLowerCase().includes('cancelled')) {
      isCancelled = true;
    }

    if (typeStr.includes('subscription') || subStr.includes('subscription') || bSubStr.includes('subscription') || catStr.includes('subscription')) {
      sub += amt;
      const m = tx.month || tx.subMonth || tx.sub_month;
      if (m && !subMonthTextArr.includes(m)) subMonthTextArr.push(m);
    } else if (typeStr.includes('offering') || subStr.includes('offertory') || bSubStr.includes('offertory') || catStr.includes('offering')) {
      off += amt;
    } else if (typeStr.includes('donation') || subStr.includes('donation') || bSubStr.includes('donation') || catStr.includes('donation')) {
      don += amt;
    } else {
      oth += amt;
      let d = tx.subtype || tx.bankSubtype || tx.category || tx.description || tx.particulars || tx.type || 'Other Items';
      if (typeStr.includes('charity') || subStr.includes('charity') || bSubStr.includes('charity') || descStr.includes('charity')) {
        d = 'Charity';
      }
      if (d !== '-' && d !== 'Other Items' && !othDescArr.includes(d)) othDescArr.push(d);
    }
  });

  let othDesc = othDescArr.length > 0 ? othDescArr.join(', ') : '-';
  let subMonthText = subMonthTextArr.join(', ');

  if (document.getElementById('rSubMonth')) {
    document.getElementById('rSubMonth').innerText = subMonthText ? `(${subMonthText})` : '';
  }

  document.getElementById('rDonationRs').innerText = don > 0 ? Math.floor(don).toLocaleString('en-IN') : '-';
  document.getElementById('rDonationPs').innerText = don > 0 ? (don % 1 === 0 ? '00' : Math.round((don % 1) * 100).toString().padStart(2, '0')) : '-';

  document.getElementById('rSubRs').innerText = sub > 0 ? Math.floor(sub).toLocaleString('en-IN') : '-';
  document.getElementById('rSubPs').innerText = sub > 0 ? (sub % 1 === 0 ? '00' : Math.round((sub % 1) * 100).toString().padStart(2, '0')) : '-';

  document.getElementById('rOffRs').innerText = off > 0 ? Math.floor(off).toLocaleString('en-IN') : '-';
  document.getElementById('rOffPs').innerText = off > 0 ? (off % 1 === 0 ? '00' : Math.round((off % 1) * 100).toString().padStart(2, '0')) : '-';

  document.getElementById('rOthRs').innerText = oth > 0 ? Math.floor(oth).toLocaleString('en-IN') : '-';
  document.getElementById('rOthPs').innerText = oth > 0 ? (oth % 1 === 0 ? '00' : Math.round((oth % 1) * 100).toString().padStart(2, '0')) : '-';

  const rOtherLabel = document.getElementById('rOtherLabel');
  if (rOtherLabel) {
    rOtherLabel.innerText = 'Other Items';
  }
  const rOtherDescText = document.getElementById('rOtherDescText');
  if (rOtherDescText) {
    rOtherDescText.innerText = othDesc === '-' ? '' : othDesc;
  }
  const rTotFormatted = formatPaperCurrency(totalAmt).replace(/^₹/, '');
  if (document.getElementById('rTotRs')) document.getElementById('rTotRs').innerText = rTotFormatted;
  if (document.getElementById('rTotPs')) document.getElementById('rTotPs').innerText = '';

  document.getElementById('rWords').innerText = numberToWordsIndian(totalAmt) + " Only";

  const cancelledStamp = document.getElementById('rCancelledStamp');
  if (cancelledStamp) {
    if (isCancelled) {
      cancelledStamp.style.display = 'block';
    } else {
      cancelledStamp.style.display = 'none';
    }
  }
}

function openReceiptModal(tx) {
  if (!tx) return;
  currentReceiptTx = Array.isArray(tx) ? tx[0] : tx;

  if (Array.isArray(tx) && tx.length > 0) {
    populateReceiptModalData(tx);
    const modal = document.getElementById('generateReceiptModal');
    if (modal) {
      document.body.classList.remove('print-voucher-active');
      document.body.classList.add('print-receipt-active');
      modal.style.display = 'flex';
    }
    return;
  }

  const isBank = (tx.entryType && String(tx.entryType).toLowerCase() === 'bank') || (tx.bankAccount && !tx.inCashBook) || (tx.vrNo && String(tx.vrNo).endsWith('/B'));
  const cleanVr = normalizeVrLocally(tx.vrNo || tx.rcptNo || '');
  const allTxs = (typeof allTimeGeneralTxList !== 'undefined' && allTimeGeneralTxList.length > 0)
    ? allTimeGeneralTxList
    : (globalRawTransactions || []);
  const bankTxs = (typeof loadedBankBookTransactions !== 'undefined' && loadedBankBookTransactions.length > 0)
    ? loadedBankBookTransactions
    : (typeof allTimeBankBookList !== 'undefined' ? allTimeBankBookList : []);

  let matchingTxs = [];
  if (cleanVr && cleanVr !== '-') {
    if (isBank) {
      matchingTxs = bankTxs.filter(t => normalizeVrLocally(t.vrNo) === cleanVr || normalizeVrLocally(t.rcptNo) === cleanVr || normalizeVrLocally(t.payNo) === cleanVr);
    } else {
      matchingTxs = allTxs.filter(t => normalizeVrLocally(t.vrNo) === cleanVr || normalizeVrLocally(t.rcptNo) === cleanVr || normalizeVrLocally(t.payNo) === cleanVr);
    }
  }

  if ((!matchingTxs || matchingTxs.length <= 1) && tx.splitItems && tx.splitItems.length > 0) {
    matchingTxs = tx.splitItems.map(item => Object.assign({}, tx, item, {
      amount: item.amount || item.receipt || item.credit || item.payment,
      receipt: (tx.mode === 'Receipt' || tx.mode === 'Credit (Receipt)' || !tx.payment) ? (item.amount || item.receipt || item.credit) : ""
    }));
  }

  const txsToPass = (matchingTxs && matchingTxs.length > 0) ? matchingTxs : tx;
  populateReceiptModalData(txsToPass);

  const modal = document.getElementById('generateReceiptModal');
  if (modal) {
    document.body.classList.remove('print-voucher-active');
    document.body.classList.add('print-receipt-active');
    modal.style.display = 'flex';
  }
}

function openReceiptModalByVrNo(vrNo, txId, entryType) {
  const targetKey = String(txId || vrNo || '').trim();
  const cleanVrSearch = normalizeVrLocally(vrNo);
  const isExplicitBank = entryType === 'Bank' || (vrNo && String(vrNo).trim().endsWith('/B'));

  const allTxs = (typeof allTimeGeneralTxList !== 'undefined' && allTimeGeneralTxList.length > 0)
    ? allTimeGeneralTxList
    : (globalRawTransactions || []);
  const bankTxs = (typeof loadedBankBookTransactions !== 'undefined' && loadedBankBookTransactions.length > 0)
    ? loadedBankBookTransactions
    : (typeof allTimeBankBookList !== 'undefined' ? allTimeBankBookList : []);

  let matchingTxs = [];

  // If explicit Bank request, prioritize Bank transactions
  if (isExplicitBank) {
    if (txId) {
      const byId = bankTxs.find(t => String(t.id) === String(txId) || String(t._docId) === String(txId));
      if (byId) {
        if (byId.splitGroupId) {
          matchingTxs = bankTxs.filter(t => t.splitGroupId === byId.splitGroupId);
        } else if (cleanVrSearch && cleanVrSearch !== '-') {
          matchingTxs = bankTxs.filter(t => normalizeVrLocally(t.vrNo) === cleanVrSearch || normalizeVrLocally(t.rcptNo) === cleanVrSearch || normalizeVrLocally(t.payNo) === cleanVrSearch);
        }
        if (matchingTxs.length === 0) matchingTxs = [byId];
      }
    }
    if (matchingTxs.length === 0 && cleanVrSearch && cleanVrSearch !== '-') {
      matchingTxs = bankTxs.filter(t =>
        normalizeVrLocally(t.vrNo) === cleanVrSearch ||
        normalizeVrLocally(t.rcptNo) === cleanVrSearch ||
        normalizeVrLocally(t.payNo) === cleanVrSearch
      );
    }
    if (matchingTxs.length > 0) {
      openReceiptModal(matchingTxs);
      return;
    }
  }

  // Otherwise search cash transactions first
  if (cleanVrSearch && cleanVrSearch !== '-') {
    matchingTxs = allTxs.filter(t =>
      normalizeVrLocally(t.vrNo) === cleanVrSearch ||
      normalizeVrLocally(t.rcptNo) === cleanVrSearch ||
      normalizeVrLocally(t.payNo) === cleanVrSearch
    );
    if (matchingTxs.length === 0 && !isExplicitBank) {
      matchingTxs = bankTxs.filter(t =>
        normalizeVrLocally(t.vrNo) === cleanVrSearch ||
        normalizeVrLocally(t.rcptNo) === cleanVrSearch ||
        normalizeVrLocally(t.payNo) === cleanVrSearch
      );
    }
  }

  if (matchingTxs.length > 0) {
    openReceiptModal(matchingTxs);
    return;
  }

  let foundTx = null;
  if (targetKey) {
    if (isExplicitBank) {
      foundTx = bankTxs.find(t => String(t.id) === targetKey || String(t._docId) === targetKey || String(t.vrNo) === targetKey);
      if (!foundTx) foundTx = allTxs.find(t => String(t.id) === targetKey || String(t._docId) === targetKey || String(t.vrNo) === targetKey);
    } else {
      foundTx = allTxs.find(t => String(t.id) === targetKey || String(t._docId) === targetKey || String(t.vrNo) === targetKey);
      if (!foundTx) foundTx = bankTxs.find(t => String(t.id) === targetKey || String(t._docId) === targetKey || String(t.vrNo) === targetKey);
    }
  }

  if (foundTx) {
    openReceiptModal(foundTx);
  } else {
    fetchApiData("getEntry", { vrNo: cleanVrSearch || targetKey, entryType: isExplicitBank ? 'bank' : undefined })
      .then(res => {
        if (res && res.success && res.found) {
          openReceiptModal({
            date: res.date,
            vrNo: res.vrNo || targetKey,
            accountName: res.accountName,
            address: res.address,
            memberCode: res.memberCode,
            description: res.description,
            receipt: res.receipt || res.credit || res.amount,
            type: res.type,
            subtype: res.subtype,
            entryType: isExplicitBank ? 'Bank' : res.entryType
          });
        } else {
          alert("Receipt #" + (cleanVrSearch || targetKey) + " details not found.");
        }
      })
      .catch(() => alert("Unable to find Receipt #" + (cleanVrSearch || targetKey)));
  }
}

function closeReceiptModal() {
  const modal = document.getElementById('generateReceiptModal');
  if (modal) modal.style.display = 'none';
  document.body.classList.remove('print-receipt-active');
}

function scalePrintPopups() {
  const popups = [
    { modalId: 'generateReceiptModal', containerId: 'receiptPaperContainer', baseWidth: 800, padding: 32 },
    { modalId: 'generatePaymentVoucherModal', containerId: 'paymentVoucherPaperContainer', baseWidth: 800, padding: 32 },
    { modalId: 'generateMemberLedgerModal', containerId: 'memberLedgerPaperContainer', baseWidth: 780, padding: 40 }
  ];

  popups.forEach(popup => {
    const modal = document.getElementById(popup.modalId);
    if (!modal || modal.style.display === 'none') return;

    const container = document.getElementById(popup.containerId);
    if (!container) return;

    const card = modal.querySelector('.modal-card');
    if (!card) return;

    const availableWidth = card.clientWidth;
    if (!availableWidth) return;

    // Calculate scale factor based on the modal-card width to prevent self-referential expansion
    const targetWidth = availableWidth - popup.padding - 8; // width minus internal padding and a small safety margin
    let scale = targetWidth / popup.baseWidth;

    // Cap maximum scale at 0.72 for receipt/voucher and 0.75 for ledger to keep them "small" and neat on desktop
    const maxScale = popup.containerId === 'memberLedgerPaperContainer' ? 0.75 : 0.72;
    scale = Math.min(maxScale, scale);
    scale = Math.max(0.25, scale);
    if (isNaN(scale)) return;

    container.style.zoom = scale;
  });
}

function generateReceiptFromViewModal() {
  if (window.currentlyViewedTxData) {
    closeViewTransactionModal();
    openReceiptModal(window.currentlyViewedTxData);
  }
}

function getReceiptFilename() {
  const vr = document.getElementById('rRcptNo') ? document.getElementById('rRcptNo').innerText.trim() : '';
  let rawName = '';
  if (currentReceiptTx && currentReceiptTx.accountName && currentReceiptTx.accountName !== '-') {
    rawName = currentReceiptTx.accountName;
  } else {
    const modalName = document.getElementById('rAccountName') ? document.getElementById('rAccountName').innerText.trim() : '';
    if (modalName && modalName !== '-') rawName = modalName;
  }

  const safeName = rawName.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_').trim();
  return safeName ? `${safeName}_Receipt_${vr}` : `Receipt_${vr}`;
}

async function downloadReceiptImage() {
  const canvas = await generateImageFromContainerForPrint('receiptPaperContainer', '#cce3d0');
  const filename = getReceiptFilename() + '.png';
  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(blobUrl); }, 500);
  } catch (e) {
    // Fallback: open image in new tab so user can long-press to save
    const dataUrl = canvas.toDataURL('image/png');
    const w = window.open();
    if (w) { w.document.write('<img src="' + dataUrl + '" style="width:100%"/>'); w.document.title = filename; }
  }
  markTransactionAsPrinted('rRcptNo');
}

async function markTransactionAsWhatsappSent(vrNo) {
  if (!vrNo) return;
  const cleanVr = normalizeVrLocally(vrNo);
  let tx = allTimeGeneralTxList.find(t => normalizeVrLocally(t.vrNo) === cleanVr || normalizeVrLocally(t.rcptNo) === cleanVr || normalizeVrLocally(t.payNo) === cleanVr);
  try {
    if (tx && tx.id) {
      await db.collection("transactions").doc(String(tx.id)).update({ whatsappSent: true });
      tx.whatsappSent = true;
    } else {
      tx = loadedBankBookTransactions.find(t => normalizeVrLocally(t.vrNo) === cleanVr || normalizeVrLocally(t.rcptNo) === cleanVr || normalizeVrLocally(t.payNo) === cleanVr);
      if (tx && tx.id) {
        await db.collection("bank_transactions").doc(String(tx.id)).update({ whatsappSent: true });
        tx.whatsappSent = true;
      }
    }
    // Refresh tables in background if needed
    if (typeof processAndRenderAll === 'function') setTimeout(processAndRenderAll, 500);
  } catch (e) {
    console.error("Error marking WhatsApp sent status", e);
  }
}

async function shareReceiptWhatsApp() {
  const vrNo = document.getElementById('rRcptNo') ? document.getElementById('rRcptNo').innerText.trim() : '';
  const dateStr = document.getElementById('rDate') ? document.getElementById('rDate').innerText.trim() : '';
  const nameStr = document.getElementById('rAccountName') ? document.getElementById('rAccountName').innerText.trim() : '';

  let don = 0, sub = 0, off = 0, oth = 0, othDesc = 'Other Items';
  let isCancelled = false;
  let totalAmt = 0;
  if (currentReceiptTx) {
    const typeStr = (currentReceiptTx.type || '').toLowerCase();
    const subStr = (currentReceiptTx.subtype || '').toLowerCase();
    const amt = Number(currentReceiptTx.receipt || currentReceiptTx.amount || 0);
    totalAmt = amt;
    if (typeStr.includes('subscription') || subStr.includes('subscription')) sub = amt;
    else if (typeStr.includes('offering') || subStr.includes('offertory')) off = amt;
    else if (typeStr.includes('donation') || subStr.includes('donation')) don = amt;
    else {
      oth = amt;
      othDesc = currentReceiptTx.subtype || currentReceiptTx.type || 'Other Items';
      if (typeStr === 'charity' || subStr === 'charity') othDesc = 'Charity';
    }
    const descStr = (currentReceiptTx.description || '').toLowerCase();
    if (descStr.includes('cancelled') || typeStr.includes('cancelled') || (currentReceiptTx.accountName || '').toLowerCase().includes('cancelled')) {
      isCancelled = true;
    }
  }

  const fullAmt = totalAmt % 1 !== 0 ? totalAmt.toFixed(2) : totalAmt.toString();
  const textMsg = `🧾 *IPC HOREB CHURCH, THADIYOOR*\n*RECEIPT No:* ${vrNo}\n*Date:* ${dateStr}\n*Received From:* ${nameStr}\n*Total Amount:* ₹${Number(totalAmt).toLocaleString('en-IN')}\n\nThank you!\nTreasurer`;

  // Lookup member phone first
  const member = membersDataStore.find(m => m.name && m.name.toLowerCase() === nameStr.toLowerCase());
  const phoneNumber = member ? member.phone : null;
  let cleanedPhone = cleanPhoneForWhatsApp(phoneNumber);
  if (!cleanedPhone || cleanedPhone.length < 10) {
    showAlert("Member does not have a valid phone number saved. Cannot send via WhatsApp.", "error");
    return;
  }

  const payload = {
    t: 'r', v: vrNo, d: dateStr, n: nameStr,
    addr: currentReceiptTx ? (currentReceiptTx.address || '') : '',
    subMonth: currentReceiptTx ? (currentReceiptTx.subMonth || '') : '',
    don: don, sub: sub, off: off, oth: oth, othDesc: othDesc,
    tot: totalAmt,
    words: document.getElementById('rWords') ? document.getElementById('rWords').innerText : '',
    cancel: isCancelled
  };

  const waWin = window.open('about:blank', '_blank');
  const safeVr = vrNo.replace(/[^a-zA-Z0-9]/g, '');
  const safeName = nameStr.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
  const linkId = `R-${safeVr}-${safeName}`;
  let shortUrl = `${window.location.origin}/${linkId}`;

  try {
    await db.collection('shared_links').doc(linkId).set({
      payload: payload,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    markTransactionAsWhatsappSent(vrNo);
  } catch (e) {
    console.warn("Firestore shared_links write failed/blocked, using direct payload fallback:", e);
    try {
      const jsonStr = JSON.stringify(payload);
      const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
      shortUrl = `${window.location.origin}/view.html?d=${encodeURIComponent(base64)}`;
    } catch (err) {
      console.error(err);
    }
    markTransactionAsWhatsappSent(vrNo);
  }

  const finalMsg = textMsg + `\n\nClick here to view and download your official receipt:\n${shortUrl}`;
  const waLink = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(finalMsg)}`;

  if (waWin) waWin.location.href = waLink;
  else window.location.href = waLink;

  markTransactionAsPrinted('rRcptNo');
}

let currentPaymentTx = null;

function populatePaymentVoucherModalData(txInput) {
  if (!txInput) return;
  const rawArray = Array.isArray(txInput) ? txInput : [txInput];
  if (rawArray.length === 0) return;

  const firstTx = rawArray[0];
  const txArray = (firstTx && firstTx.splitItems && firstTx.splitItems.length > 0)
    ? firstTx.splitItems.map(item => Object.assign({}, firstTx, item, {
      amount: item.amount || item.payment || item.payments || item.debit || item.receipt,
      payment: (firstTx.mode === 'Payment' || firstTx.mode === 'Debit (Payment)' || !firstTx.receipt) ? (item.amount || item.payment || item.payments || item.debit) : ""
    }))
    : rawArray;

  const cleanVr = formatVrNoClean(firstTx.vrNo);
  const cleanDate = formatDateClean(firstTx.date);

  let rawAcc = (firstTx.accountName && firstTx.accountName !== '-') ? firstTx.accountName : ((firstTx.name && firstTx.name !== '-') ? firstTx.name : '');
  if (!rawAcc && firstTx.description && firstTx.description !== '-') {
    if (firstTx.description.includes(' - ')) {
      const candidate = firstTx.description.split(' - ')[0].trim();
      if (candidate && !candidate.toLowerCase().includes('bank') && !candidate.toLowerCase().includes('cash withdrawal')) {
        rawAcc = candidate;
      }
    }
  }
  let accName = rawAcc ? formatMemberDisplayName(rawAcc) : '';
  let headAccountsList = [];
  let descLines = [];
  let totalAmt = 0;
  let isCancelled = false;

  txArray.forEach(tx => {
    const amt = Number(tx.payment || tx.payments || tx.debit || tx.amount || 0);
    totalAmt += amt;

    let sub = tx.subtype || tx.bankSubtype || tx.category || tx.type || 'Expense';
    if (sub && sub !== '-' && !headAccountsList.includes(sub)) {
      headAccountsList.push(sub);
    }

    const typeStr = (tx.type || '').toLowerCase();
    const descStr = (tx.description || tx.particulars || '').toLowerCase();
    if (descStr.includes('cancelled') || typeStr.includes('cancelled') || (tx.accountName || '').toLowerCase().includes('cancelled')) {
      isCancelled = true;
    }

    if (tx.description || sub) {
      const lineD = tx.description ? tx.description : sub;
      descLines.push(`${lineD} (${formatPaperCurrency(amt)})`);
    }
  });

  let headAccount = headAccountsList.length > 1 ? headAccountsList.join(', ') : (headAccountsList[0] || 'Expense / Payment');
  let desc = '';
  if (txArray.length > 1) {
    desc = descLines.join(' + ');
  } else {
    let baseDesc = firstTx.description ? firstTx.description.trim() : '';
    if (baseDesc.toLowerCase() === 'paid') {
      if (headAccount && headAccount.toLowerCase() !== 'expense / payment' && headAccount.toLowerCase() !== 'paid') {
        baseDesc = headAccount + ' Paid';
      } else if (firstTx.type && firstTx.type.toLowerCase() === 'charity') {
        baseDesc = 'Charity Paid';
      }
    }
    if (accName && baseDesc) {
      if (baseDesc.toLowerCase().includes(accName.toLowerCase())) desc = baseDesc;
      else desc = accName + ' - ' + baseDesc;
    } else if (accName) {
      desc = accName;
      if (headAccount && headAccount.toLowerCase() !== 'expense / payment' && headAccount.toLowerCase() !== 'paid') desc += ' - ' + headAccount;
    } else if (baseDesc) {
      desc = baseDesc;
    } else {
      desc = 'Payment Entry';
    }
  }

  // If bank cheque or bank account is present, display details cleanly
  if (firstTx.chequeNo && !desc.toLowerCase().includes('chq') && !desc.toLowerCase().includes('cheque')) {
    desc += ` (Chq No: ${firstTx.chequeNo})`;
  }

  document.getElementById('pVoucherNo').innerText = cleanVr;
  document.getElementById('pDate').innerText = cleanDate;
  if (document.getElementById('pPaidTo')) document.getElementById('pPaidTo').innerText = accName || '-';
  if (document.getElementById('pAddress')) {
    const resAddr = resolveMemberAddress(firstTx);
    document.getElementById('pAddress').innerText = (resAddr || firstTx.address || '-');
  }
  document.getElementById('pHeadAccount').innerText = headAccount;
  document.getElementById('pDescription').innerText = desc;

  if (document.getElementById('pAmountRs')) document.getElementById('pAmountRs').innerText = Math.floor(totalAmt).toLocaleString('en-IN');
  if (document.getElementById('pAmountPs')) document.getElementById('pAmountPs').innerText = (totalAmt % 1 === 0 ? '00' : Math.round((totalAmt % 1) * 100).toString().padStart(2, '0'));

  const pTotFormatted = formatPaperCurrency(totalAmt).replace(/^₹/, '');
  if (document.getElementById('pTotalRs')) document.getElementById('pTotalRs').innerText = pTotFormatted;
  if (document.getElementById('pTotalPs')) document.getElementById('pTotalPs').innerText = '';

  document.getElementById('pWords').innerText = numberToWordsIndian(totalAmt) + " Only";

  const cancelledStamp = document.getElementById('pCancelledStamp');
  if (cancelledStamp) {
    if (isCancelled) {
      cancelledStamp.style.display = 'block';
    } else {
      cancelledStamp.style.display = 'none';
    }
  }
}

function openPaymentVoucherModal(tx) {
  if (!tx) return;
  currentPaymentTx = Array.isArray(tx) ? tx[0] : tx;

  if (Array.isArray(tx) && tx.length > 0) {
    populatePaymentVoucherModalData(tx);
    const modal = document.getElementById('generatePaymentVoucherModal');
    if (modal) {
      document.body.classList.remove('print-receipt-active', 'print-member-ledger-active');
      document.body.classList.add('print-voucher-active');
      modal.style.display = 'flex';
    }
    return;
  }

  const isBank = (tx.entryType && String(tx.entryType).toLowerCase() === 'bank') || (tx.bankAccount && !tx.inCashBook) || (tx.vrNo && String(tx.vrNo).endsWith('/B'));
  const cleanVr = normalizeVrLocally(tx.vrNo || tx.payNo || '');
  const allTxs = (typeof allTimeGeneralTxList !== 'undefined' && allTimeGeneralTxList.length > 0)
    ? allTimeGeneralTxList
    : (globalRawTransactions || []);
  const bankTxs = (typeof loadedBankBookTransactions !== 'undefined' && loadedBankBookTransactions.length > 0)
    ? loadedBankBookTransactions
    : (typeof allTimeBankBookList !== 'undefined' ? allTimeBankBookList : []);

  let matchingTxs = [];
  if (cleanVr && cleanVr !== '-') {
    if (isBank) {
      matchingTxs = bankTxs.filter(t => normalizeVrLocally(t.vrNo) === cleanVr || normalizeVrLocally(t.rcptNo) === cleanVr || normalizeVrLocally(t.payNo) === cleanVr);
    } else {
      matchingTxs = allTxs.filter(t => normalizeVrLocally(t.vrNo) === cleanVr || normalizeVrLocally(t.rcptNo) === cleanVr || normalizeVrLocally(t.payNo) === cleanVr);
    }
  }

  if ((!matchingTxs || matchingTxs.length <= 1) && tx.splitItems && tx.splitItems.length > 0) {
    matchingTxs = tx.splitItems.map(item => Object.assign({}, tx, item, {
      amount: item.amount || item.receipt || item.payment || item.debit,
      payment: (tx.mode === 'Payment' || tx.mode === 'Debit (Payment)' || !tx.receipt) ? (item.amount || item.payment || item.payments || item.debit) : ""
    }));
  }

  const txsToPass = (matchingTxs && matchingTxs.length > 0) ? matchingTxs : tx;
  populatePaymentVoucherModalData(txsToPass);

  const modal = document.getElementById('generatePaymentVoucherModal');
  if (modal) {
    document.body.classList.remove('print-receipt-active', 'print-member-ledger-active');
    document.body.classList.add('print-voucher-active');
    modal.style.display = 'flex';
  }
}

function openPaymentVoucherModalByVrNo(vrNo, txId, entryType) {
  const targetKey = String(txId || vrNo || '').trim();
  const cleanVrSearch = normalizeVrLocally(vrNo);
  const isExplicitBank = entryType === 'Bank' || (vrNo && String(vrNo).trim().endsWith('/B'));

  const allTxs = (typeof allTimeGeneralTxList !== 'undefined' && allTimeGeneralTxList.length > 0)
    ? allTimeGeneralTxList
    : (globalRawTransactions || []);
  const bankTxs = (typeof loadedBankBookTransactions !== 'undefined' && loadedBankBookTransactions.length > 0)
    ? loadedBankBookTransactions
    : (typeof allTimeBankBookList !== 'undefined' ? allTimeBankBookList : []);

  let matchingTxs = [];

  // If explicit Bank request, prioritize Bank transactions
  if (isExplicitBank) {
    if (txId) {
      const byId = bankTxs.find(t => String(t.id) === String(txId) || String(t._docId) === String(txId));
      if (byId) {
        if (byId.splitGroupId) {
          matchingTxs = bankTxs.filter(t => t.splitGroupId === byId.splitGroupId);
        } else if (cleanVrSearch && cleanVrSearch !== '-') {
          matchingTxs = bankTxs.filter(t => normalizeVrLocally(t.vrNo) === cleanVrSearch || normalizeVrLocally(t.rcptNo) === cleanVrSearch || normalizeVrLocally(t.payNo) === cleanVrSearch);
        }
        if (matchingTxs.length === 0) matchingTxs = [byId];
      }
    }
    if (matchingTxs.length === 0 && cleanVrSearch && cleanVrSearch !== '-') {
      matchingTxs = bankTxs.filter(t =>
        normalizeVrLocally(t.vrNo) === cleanVrSearch ||
        normalizeVrLocally(t.rcptNo) === cleanVrSearch ||
        normalizeVrLocally(t.payNo) === cleanVrSearch
      );
    }
    if (matchingTxs.length > 0) {
      openPaymentVoucherModal(matchingTxs);
      return;
    }
  }

  // Otherwise search cash transactions first
  if (cleanVrSearch && cleanVrSearch !== '-') {
    matchingTxs = allTxs.filter(t =>
      normalizeVrLocally(t.vrNo) === cleanVrSearch ||
      normalizeVrLocally(t.rcptNo) === cleanVrSearch ||
      normalizeVrLocally(t.payNo) === cleanVrSearch
    );
    if (matchingTxs.length === 0 && !isExplicitBank) {
      matchingTxs = bankTxs.filter(t =>
        normalizeVrLocally(t.vrNo) === cleanVrSearch ||
        normalizeVrLocally(t.rcptNo) === cleanVrSearch ||
        normalizeVrLocally(t.payNo) === cleanVrSearch
      );
    }
  }

  if (matchingTxs.length > 0) {
    openPaymentVoucherModal(matchingTxs);
    return;
  }

  let foundTx = null;
  if (targetKey) {
    if (isExplicitBank) {
      foundTx = bankTxs.find(t => String(t.id) === targetKey || String(t._docId) === targetKey || String(t.vrNo) === targetKey);
      if (!foundTx) foundTx = allTxs.find(t => String(t.id) === targetKey || String(t._docId) === targetKey || String(t.vrNo) === targetKey);
    } else {
      foundTx = allTxs.find(t => String(t.id) === targetKey || String(t._docId) === targetKey || String(t.vrNo) === targetKey);
      if (!foundTx) foundTx = bankTxs.find(t => String(t.id) === targetKey || String(t._docId) === targetKey || String(t.vrNo) === targetKey);
    }
  }

  if (foundTx) {
    openPaymentVoucherModal(foundTx);
  } else {
    fetchApiData("getEntry", { vrNo: cleanVrSearch || targetKey, entryType: isExplicitBank ? 'bank' : undefined })
      .then(res => {
        if (res && res.success && res.found) {
          openPaymentVoucherModal({
            date: res.date,
            vrNo: res.vrNo || targetKey,
            accountName: res.accountName,
            address: res.address,
            memberCode: res.memberCode,
            description: res.description,
            payment: res.payments || res.payment || res.debit || res.amount,
            type: res.type,
            subtype: res.subtype,
            entryType: isExplicitBank ? 'Bank' : res.entryType
          });
        } else {
          alert("Payment Voucher #" + (cleanVrSearch || targetKey) + " details not found.");
        }
      })
      .catch(() => alert("Unable to find Payment Voucher #" + (cleanVrSearch || targetKey)));
  }
}

function closePaymentVoucherModal() {
  const modal = document.getElementById('generatePaymentVoucherModal');
  if (modal) modal.style.display = 'none';
  document.body.classList.remove('print-voucher-active');
}

function generatePaymentVoucherFromViewModal() {
  if (window.currentlyViewedTxData) {
    closeViewTransactionModal();
    openPaymentVoucherModal(window.currentlyViewedTxData);
  }
}

function getPaymentVoucherFilename() {
  const vr = document.getElementById('pVoucherNo') ? document.getElementById('pVoucherNo').innerText.trim() : '';
  let rawName = '';
  if (currentPaymentTx && currentPaymentTx.accountName && currentPaymentTx.accountName !== '-') {
    rawName = currentPaymentTx.accountName;
  } else if (currentPaymentTx && currentPaymentTx.description && currentPaymentTx.description !== '-') {
    rawName = currentPaymentTx.description;
  } else {
    const modalDesc = document.getElementById('pDescription') ? document.getElementById('pDescription').innerText.trim() : '';
    if (modalDesc && modalDesc !== 'Payment Entry' && modalDesc !== '-') rawName = modalDesc;
  }

  const safeName = rawName.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_').trim();
  return safeName ? `${safeName}_Payment_Voucher_${vr}` : `Payment_Voucher_${vr}`;
}

async function printPaymentVoucherPaper() {
  const oldTitle = document.title;
  document.title = getPaymentVoucherFilename();

  let container = document.getElementById('batchPrintArea');
  if (!container) {
    container = document.createElement('div');
    container.id = 'batchPrintArea';
    document.body.appendChild(container);
  }
  container.innerHTML = '';

  showGlobalLoading("Preparing Print...");

  const canvas = await generateImageFromContainerForPrint('paymentVoucherPaperContainer', '#fffae6');

  appendPrintCopy(container, canvas, 'print-voucher-wrapper', 'Office Copy');
  appendPrintCopy(container, canvas, 'print-voucher-wrapper', 'Payee Copy');

  let style = document.getElementById('dynamicPrintStyle');
  if (!style) {
    style = document.createElement('style');
    style.id = 'dynamicPrintStyle';
    document.head.appendChild(style);
  }
  style.innerHTML = `
        @page { size: auto !important; margin: 0mm !important; }
        html, body { height: 100% !important; min-height: 100% !important; }
        body.print-batch-active #batchPrintArea { height: 100% !important; background: #fffae6 !important; }
        body.print-batch-active #batchPrintArea>div { 
          height: 50% !important; 
          display: flex !important; 
          justify-content: center !important; 
          align-items: center !important; 
        }
      `;

  document.documentElement.classList.add('print-batch-active-html');
  document.body.classList.remove('print-voucher-active');
  document.body.classList.add('print-batch-active');

  hideGlobalLoading();

  function cleanup() {
    document.documentElement.classList.remove('print-batch-active-html');
    document.title = oldTitle;
    style.innerHTML = '';
    container.innerHTML = '';
    document.body.classList.remove('print-batch-active');
    document.body.classList.add('print-voucher-active');
    markTransactionAsPrinted('pVoucherNo');
  }

  window.addEventListener('afterprint', cleanup, { once: true });

  setTimeout(function () {
    window.print();
  }, 500);
}

function renderPaymentVoucherToCanvas(canvas) {
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1920, 1080);


  // Outer Borders
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, 1840, 1000);
  ctx.lineWidth = 3;
  ctx.strokeRect(52, 52, 1816, 976);

  // Header Text
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 42px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('IPC HOREB CHURCH, THADIYOOR', 960, 115);

  // PAYMENT VOUCHER Badge
  ctx.fillStyle = '#000000';
  ctx.fillRect(780, 150, 360, 52);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
  ctx.fillText('PAYMENT VOUCHER', 960, 187);

  const vrNo = document.getElementById('pVoucherNo') ? document.getElementById('pVoucherNo').innerText.trim() : '';
  const dateStr = document.getElementById('pDate') ? document.getElementById('pDate').innerText.trim() : '';
  const headAccount = document.getElementById('pHeadAccount') ? document.getElementById('pHeadAccount').innerText.trim() : '';
  const description = document.getElementById('pDescription') ? document.getElementById('pDescription').innerText.trim() : '';
  const rawRs = document.getElementById('pAmountRs') ? document.getElementById('pAmountRs').innerText.trim() : '';
  const amountPs = document.getElementById('pAmountPs') ? document.getElementById('pAmountPs').innerText.trim() : '';
  const pWordsStr = document.getElementById('pWords') ? document.getElementById('pWords').innerText.trim() : '';

  const amountRs = (rawRs && rawRs !== '-') ? (rawendsWith('/-') ? rawRs : rawRs + '/-') : '-';
  const pWordsFormatted = pWordsStr ? (pWordsStr.toLowerCase().endsWith('only') ? pWordsStr : pWordsStr + ' only') : '-';

  // Number & Date Row
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.font = 'bold 28px "Noto Sans Malayalam", "Manjari", "Segoe UI", sans-serif';
  ctx.fillText('നമ്പർ: ', 90, 255);
  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 36px monospace';
  ctx.fillText(vrNo, 210, 257);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 28px "Noto Sans Malayalam", "Manjari", "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('തിയതി: ' + dateStr, 1830, 255);

  // Table Box
  ctx.lineWidth = 3.5;
  ctx.strokeRect(90, 280, 1740, 430);

  // Column Dividers
  ctx.beginPath();
  ctx.moveTo(230, 280); ctx.lineTo(230, 710);
  ctx.moveTo(1380, 280); ctx.lineTo(1380, 710);
  ctx.moveTo(1620, 280); ctx.lineTo(1620, 640); // Stops before Total Row

  // Row Dividers
  ctx.moveTo(90, 335); ctx.lineTo(1830, 335);
  ctx.moveTo(90, 640); ctx.lineTo(1830, 640);
  ctx.stroke();

  // Table Headers
  ctx.font = 'bold 25px "Noto Sans Malayalam", "Manjari", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ക്രമ നം.', 160, 320);
  ctx.textAlign = 'left';
  ctx.fillText('Head of Account / ഇനവിവരം', 260, 320);
  ctx.textAlign = 'right';
  ctx.fillText('രൂ.', 1580, 320);
  ctx.textAlign = 'center';
  ctx.fillText('പ.', 1725, 320);

  // Row Data
  ctx.textAlign = 'center';
  ctx.font = '26px "Segoe UI", Arial, sans-serif';
  ctx.fillText('1', 160, 410);

  ctx.textAlign = 'left';
  ctx.font = 'bold 28px "Noto Sans Malayalam", "Manjari", "Segoe UI", sans-serif';
  ctx.fillText(headAccount, 260, 410);
  ctx.font = '23px "Noto Sans Malayalam", "Manjari", "Segoe UI", sans-serif';
  ctx.fillText(description, 260, 460);

  ctx.textAlign = 'right';
  ctx.font = 'bold 28px "Noto Sans Malayalam", "Manjari", "Segoe UI", sans-serif';
  ctx.fillText(amountRs, 1580, 420);
  ctx.textAlign = 'center';
  ctx.fillText(amountPs, 1725, 420);

  // Total Row (Single Merged Column)
  ctx.textAlign = 'right';
  ctx.font = 'bold 28px "Noto Sans Malayalam", "Manjari", "Segoe UI", sans-serif';
  ctx.fillText('ആകെ', 1350, 680);
  const pTotDisplay = document.getElementById('pTotalRs') ? document.getElementById('pTotalRs').innerText : amountRs;
  ctx.fillText(pTotDisplay, 1800, 680);

  // Words & Certification
  ctx.textAlign = 'left';
  ctx.font = 'bold 26px "Noto Sans Malayalam", "Manjari", "Segoe UI", sans-serif';
  ctx.fillText('Cash / Cheque (തുക അക്ഷരത്തിൽ): ' + pWordsFormatted, 90, 730);

  ctx.textAlign = 'right';
  ctx.font = '23px "Noto Sans Malayalam", "Manjari", "Segoe UI", sans-serif';
  ctx.fillText('........................................................................... കൈപ്പറ്റിയതായി സമ്മതിക്കുന്നു', 1830, 825);

  // Signatures Area
  if (treasurerSigImage && (treasurerSigImage.complete || treasurerSigImage.naturalWidth > 0)) {
    try { ctx.drawImage(treasurerSigImage, 1550, 845, 180, 70); } catch (e) { }
  }
  ctx.beginPath();
  ctx.moveTo(110, 930); ctx.lineTo(450, 930); // Receiver signature line
  ctx.moveTo(1470, 930); ctx.lineTo(1810, 930); // Treasurer/Secretary signature line
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = 'bold 25px "Noto Sans Malayalam", "Manjari", "Segoe UI", sans-serif';
  ctx.fillText('പേരും ഒപ്പും', 280, 965);
  ctx.fillText('Treasurer', 1640, 965);

  // Draw watermark Seal
  if (sealImage && (sealImage.complete || sealImage.naturalWidth > 0)) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    const sealW = 600;
    const sealH = sealImage.naturalWidth > 0 ? (sealImage.naturalHeight / sealImage.naturalWidth) * sealW : 600;
    ctx.drawImage(sealImage, 960 - sealW / 2, 540 - sealH / 2, sealW, sealH);
    ctx.restore();
  }
}

async function downloadPaymentVoucherImage() {
  const canvas = await generateImageFromContainerForPrint('paymentVoucherPaperContainer', '#fffae6');
  const filename = getPaymentVoucherFilename() + '.png';
  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(blobUrl); }, 500);
  } catch (e) {
    const dataUrl = canvas.toDataURL('image/png');
    const w = window.open();
    if (w) { w.document.write('<img src="' + dataUrl + '" style="width:100%"/>'); w.document.title = filename; }
  }
  markTransactionAsPrinted('pVoucherNo');
}

async function sharePaymentVoucherWhatsApp() {
  const vrNo = document.getElementById('pVoucherNo') ? document.getElementById('pVoucherNo').innerText.trim() : '';
  const dateStr = document.getElementById('pDate') ? document.getElementById('pDate').innerText.trim() : '';
  const headAccount = document.getElementById('pHeadAccount') ? document.getElementById('pHeadAccount').innerText.trim() : '';
  const description = document.getElementById('pDescription') ? document.getElementById('pDescription').innerText.trim() : '';

  let totalAmt = 0;
  if (currentPaymentTx) {
    totalAmt = Number(currentPaymentTx.payment || currentPaymentTx.amount || 0);
  }
  const fullAmt = totalAmt % 1 !== 0 ? totalAmt.toFixed(2) : totalAmt.toString();

  const textMsg = `📜 *IPC HOREB CHURCH, THADIYOOR*\n*PAYMENT VOUCHER No:* ${vrNo}\n*Date:* ${dateStr}\n*Head of Account:* ${headAccount}\n*Particulars:* ${description}\n*Amount:* ₹${Number(totalAmt).toLocaleString('en-IN')}\n\nThank you!\nTreasurer`;

  let searchName = headAccount;
  if (currentPaymentTx && currentPaymentTx.accountName) searchName = currentPaymentTx.accountName;
  if (currentPaymentTx && currentPaymentTx.name && currentPaymentTx.name !== '-') searchName = currentPaymentTx.name;

  const member = membersDataStore.find(m => m.name && searchName && m.name.toLowerCase() === searchName.toLowerCase());
  const phoneNumber = member ? member.phone : null;
  let cleanedPhone = cleanPhoneForWhatsApp(phoneNumber);
  if (!cleanedPhone || cleanedPhone.length < 10) {
    showAlert("Member does not have a valid phone number saved. Cannot send via WhatsApp.", "error");
    return;
  }

  const payload = {
    t: 'p',
    v: vrNo,
    d: dateStr,
    n: document.getElementById('pPaidTo') ? document.getElementById('pPaidTo').innerText : searchName,
    addr: currentPaymentTx ? (currentPaymentTx.address || '') : '',
    h: headAccount,
    desc: description,
    tot: totalAmt,
    words: document.getElementById('pWords') ? document.getElementById('pWords').innerText : ''
  };

  const waWin = window.open('about:blank', '_blank');
  const safeVr = vrNo.replace(/[^a-zA-Z0-9]/g, '');
  let safeName = searchName ? searchName.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '') : 'voucher';
  const linkId = `P-${safeVr}-${safeName}`;
  let shortUrl = `${window.location.origin}/${linkId}`;

  try {
    await db.collection('shared_links').doc(linkId).set({
      payload: payload,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    markTransactionAsWhatsappSent(vrNo);
  } catch (e) {
    console.warn("Firestore shared_links write failed/blocked, using direct payload fallback:", e);
    try {
      const jsonStr = JSON.stringify(payload);
      const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
      shortUrl = `${window.location.origin}/view.html?d=${encodeURIComponent(base64)}`;
    } catch (err) {
      console.error(err);
    }
    markTransactionAsWhatsappSent(vrNo);
  }

  const finalMsg = textMsg + `\n\nClick here to view and download your official voucher:\n${shortUrl}`;

  const waLink = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(finalMsg)}`;
  if (waWin) waWin.location.href = waLink;
  else window.location.href = waLink;

  markTransactionAsPrinted('pVoucherNo');
}

// --- MEMBER LEDGER STATEMENT FUNCTIONS ---
function openMemberLedgerModal() {
  if (!selectedMemberName) {
    alert("Please select a member from the list first.");
    return;
  }
  const mName = selectedMemberName;
  const mAddrTarget = selectedMemberAddress || '';
  const mObj = getMemberObject(mName, mAddrTarget);
  const mAddr = (mObj.address || mAddrTarget || activeMembersMap[mName.toLowerCase()] || "Not specified");

  document.getElementById('mLedgerPrintName').innerText = formatMemberDisplayName(mObj.name || mName, mObj.title, true, mObj.nickname);
  document.getElementById('mLedgerPrintAddress').innerText = "📍 Address: " + mAddr;
  document.getElementById('mLedgerPrintDate').innerText = "Date: " + (new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }));

  const mTxList = getMemberGroupedTransactions(mName, mAddr);
  let totalContrib = 0;
  const tbody = document.getElementById('mLedgerPrintTbody');
  tbody.innerHTML = '';

  if (mTxList.length > 0) {
    mTxList.forEach(tx => {
      const amt = tx.receipt || tx.payment || 0;
      totalContrib += (tx.receipt || 0);
      const cleanDate = formatDateClean(tx.date);
      const cleanVr = formatVrNoClean(tx.vrNo);
      const isPayment = (tx.payment && tx.payment > 0);

      let categoryName = tx.categoryDisplay || tx.subtype || tx.type || (tx.description === '[CANCELLED]' ? 'Cancelled' : 'Subscription');

      tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="padding: 6px 8px; border-right: 1px solid #cbd5e1; white-space: nowrap;">${formatDateHtml(tx.date)}</td>
              <td style="padding: 6px 8px; border-right: 1px solid #cbd5e1; text-align: center; font-weight: 700;">${cleanVr}</td>
              <td style="padding: 6px 8px; border-right: 1px solid #cbd5e1;">
                <div>${tx.description || '-'}</div>
                ${(tx.address && tx.address !== '-' && tx.address.toLowerCase() !== 'not specified' && tx.address.toLowerCase() !== 'no address') ? `<div style="font-size: 0.68rem; color: #0284c7; margin-top: 2px;">📍 ${tx.address}</div>` : ''}
              </td>
              <td style="padding: 6px 8px; border-right: 1px solid #cbd5e1;">${categoryName}</td>
              <td style="padding: 6px 8px; text-align: right; font-weight: 700;">${formatPaperCurrency(amt)}</td>
            </tr>
          `;
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;">No ledger transactions recorded for this member</td></tr>';
  }

  document.getElementById('mLedgerPrintTotal').innerText = formatPaperCurrency(totalContrib);
  document.getElementById('mLedgerPrintFooterTotal').innerText = formatPaperCurrency(totalContrib);

  const modal = document.getElementById('generateMemberLedgerModal');
  if (modal) {
    document.body.classList.remove('print-receipt-active', 'print-voucher-active');
    document.body.classList.add('print-member-ledger-active');
    modal.style.display = 'flex';
  }
}

function closeMemberLedgerModal() {
  const modal = document.getElementById('generateMemberLedgerModal');
  if (modal) modal.style.display = 'none';
  document.body.classList.remove('print-member-ledger-active');
}

function getMemberLedgerFilename() {
  const name = selectedMemberName ? selectedMemberName.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_').trim() : 'Member';
  const addr = selectedMemberAddress ? '_' + selectedMemberAddress.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_').trim() : '';
  return `${name}${addr}_Statement_of_Account`;
}

function printMemberLedgerPaper() {
  const oldTitle = document.title;
  document.title = getMemberLedgerFilename();

  function cleanup() {
    document.title = oldTitle;
  }

  window.addEventListener('afterprint', cleanup, { once: true });

  setTimeout(function () {
    try {
      window.print();
    } catch (e) {
      console.error("Print error:", e);
    }
  }, 300);
}

function renderMemberLedgerToCanvas(canvas) {
  if (!selectedMemberName) return;
  const mName = selectedMemberName;
  const mAddrTarget = selectedMemberAddress || '';
  const mObj = getMemberObject(mName, mAddrTarget);
  const mAddr = (mObj.address || mAddrTarget || activeMembersMap[mName.toLowerCase()] || "Not specified");

  const mTxList = getMemberGroupedTransactions(mName, mAddr);

  const width = 1600;
  const headerHeight = 240;
  const memberInfoHeight = 140;
  const tableHeaderHeight = 60;
  const rowHeight = 55;
  const rowCount = Math.max(mTxList.length, 1);
  const footerHeight = 220;

  const height = Math.max(1000, headerHeight + memberInfoHeight + tableHeaderHeight + (rowCount * rowHeight) + footerHeight);

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);


  // Outer Border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 5;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  // Header Section
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 38px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE INDIAN PENTECOSTAL CHURCH OF GOD', width / 2, 95);

  ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('THADIYOOR P.O., PIN : 689 545    |    Tel: 7902914549', width / 2, 135);

  // STATEMENT BADGE
  ctx.fillStyle = '#0f172a';
  ctx.fillRect((width / 2) - 240, 155, 480, 48);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
  ctx.fillText('MEMBER STATEMENT OF ACCOUNT', width / 2, 187);

  // Divider line
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 225); ctx.lineTo(width - 60, 225);
  ctx.stroke();

  // Member Info Box
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(60, 245, width - 120, 110);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 245, width - 120, 110);

  // Member Name & Address
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(mObj.name, 90, 290);

  ctx.font = '22px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('Address: ' + mAddr, 90, 330);

  // Total Contribution & Date on Right
  let totalContrib = 0;
  mTxList.forEach(tx => { totalContrib += (tx.receipt || 0); });

  ctx.textAlign = 'right';
  ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('TOTAL CONTRIBUTION', width - 90, 275);

  ctx.font = 'bold 34px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#059669';
  ctx.fillText(formatCurrency(totalContrib), width - 90, 315);

  ctx.font = '18px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Date: ' + (new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })), width - 90, 342);

  // Table Headers
  const startY = 380;
  const tableWidth = width - 120;

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(60, startY, tableWidth, 50);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(60, startY, tableWidth, 50);

  // Column widths & positions
  const colDateX = 80;
  const colVrX = 260;
  const colDescX = 400;
  const colCatX = 1140;
  const colAmtX = width - 80;

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Date', colDateX, startY + 33);
  ctx.textAlign = 'center';
  ctx.fillText('Vr No', colVrX, startY + 33);
  ctx.textAlign = 'left';
  ctx.fillText('Particulars / Description', colDescX, startY + 33);
  ctx.fillText('Category', colCatX, startY + 33);
  ctx.textAlign = 'right';
  ctx.fillText('Amount (₹)', colAmtX, startY + 33);

  let currentY = startY + 50;

  // Table Rows
  if (mTxList.length > 0) {
    mTxList.forEach((tx, idx) => {
      const amt = tx.receipt || tx.payment || 0;
      const cleanDate = formatDateClean(tx.date);
      const cleanVr = formatVrNoClean(tx.vrNo);

      ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx.fillRect(60, currentY, tableWidth, rowHeight);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(60, currentY, tableWidth, rowHeight);

      ctx.fillStyle = '#000000';
      ctx.font = '20px "Segoe UI", Arial, sans-serif';

      ctx.textAlign = 'left';
      ctx.fillText(cleanDate, colDateX, currentY + 34);

      ctx.textAlign = 'center';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(cleanVr, colVrX, currentY + 34);

      ctx.font = '20px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'left';
      const descStr = (tx.description || '-');
      ctx.fillText(descStr.length > 55 ? descStr.substring(0, 52) + '...' : descStr, colDescX, currentY + 34);

      ctx.fillText(tx.categoryDisplay || tx.subtype || tx.type || 'Subscription', colCatX, currentY + 34);

      ctx.textAlign = 'right';
      ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
      ctx.fillText(formatPaperCurrency(amt), colAmtX, currentY + 34);

      currentY += rowHeight;
    });
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(60, currentY, tableWidth, rowHeight);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(60, currentY, tableWidth, rowHeight);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No ledger transactions recorded for this member', width / 2, currentY + 34);
    currentY += rowHeight;
  }

  // Total Row
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(60, currentY, tableWidth, 55);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(60, currentY, tableWidth, 55);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('TOTAL CONTRIBUTION:', colCatX + 180, currentY + 36);
  ctx.fillText(formatPaperCurrency(totalContrib), colAmtX, currentY + 36);

  // Statement Footer Signatures
  const footerY = currentY + 135;
  if (treasurerSigImage && (treasurerSigImage.complete || treasurerSigImage.naturalWidth > 0)) {
    try { ctx.drawImage(treasurerSigImage, width - 450, footerY - 75, 160, 55); } catch (e) { }
  }
  if (presidentSigImage && (presidentSigImage.complete || presidentSigImage.naturalWidth > 0)) {
    try { ctx.drawImage(presidentSigImage, width - 230, footerY - 75, 160, 55); } catch (e) { }
  }

  ctx.font = '18px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'left';
  ctx.fillText('Computer Generated Statement', 60, footerY);

  ctx.textAlign = 'center';
  ctx.beginPath();
  ctx.moveTo(width - 450, footerY - 20); ctx.lineTo(width - 290, footerY - 20);
  ctx.moveTo(width - 230, footerY - 20); ctx.lineTo(width - 70, footerY - 20);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Treasurer', width - 370, footerY + 10);
  ctx.fillText('President', width - 150, footerY + 10);

  // Draw watermark Seal
  if (sealImage && (sealImage.complete || sealImage.naturalWidth > 0)) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    const sealW = 750;
    const sealH = sealImage.naturalWidth > 0 ? (sealImage.naturalHeight / sealImage.naturalWidth) * sealW : 750;
    ctx.drawImage(sealImage, (width / 2) - (sealW / 2), (height / 2) - (sealH / 2), sealW, sealH);
    ctx.restore();
  }
}

async function downloadMemberLedgerImage() {
  if (!selectedMemberName) {
    alert("Please select a member first.");
    return;
  }
  const canvas = await generateImageFromContainerForPrint('memberLedgerPaperContainer', '#ffffff');
  const filename = getMemberLedgerFilename() + '.png';
  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(blobUrl); }, 500);
  } catch (e) {
    const dataUrl = canvas.toDataURL('image/png');
    const w = window.open();
    if (w) { w.document.write('<img src="' + dataUrl + '" style="width:100%"/>'); w.document.title = filename; }
  }
}

async function shareMemberLedgerWhatsApp() {
  if (!selectedMemberName) {
    alert("Please select a member first.");
    return;
  }

  const mName = selectedMemberName;
  const mAddrTarget = selectedMemberAddress || '';
  const mObj = getMemberObject(mName, mAddrTarget);
  const mAddr = (mObj.address || mAddrTarget || activeMembersMap[mName.toLowerCase()] || "Not specified");
  const mTxList = getMemberGroupedTransactions(mName, mAddr);
  let totalContrib = 0;

  let txsData = [];
  mTxList.forEach(tx => {
    totalContrib += (tx.receipt || 0);
    const isPayment = (tx.payment && tx.payment > 0);
    let cat = tx.categoryDisplay || tx.subtype || tx.type || 'Subscription';
    txsData.push([
      formatDateClean(tx.date),
      formatVrNoClean(tx.vrNo),
      tx.description || '-',
      cat,
      tx.receipt || tx.payment || 0
    ]);
  });

  const textMsg = `📊 *IPC HOREB CHURCH, THADIYOOR*\n*MEMBER STATEMENT OF ACCOUNT*\n*Member Name:* ${mObj.name}${mObj.address ? `\n*Address:* ${mObj.address}` : ''}\n*Total Contribution:* ${formatCurrency(totalContrib)}\n*Transactions:* ${mTxList.length} entry(s)\n\nThank you!\nTreasurer`;

  // Lookup member phone first
  const memberObj = membersDataStore.find(m => m.name && m.name.toLowerCase() === mName.toLowerCase() && (!mAddrTarget || (m.address || '').toLowerCase() === mAddrTarget.toLowerCase())) || membersDataStore.find(m => m.name && m.name.toLowerCase() === mName.toLowerCase());
  const phoneNumber = (memberObj && memberObj.phone) ? memberObj.phone : (mObj ? mObj.phone : null);
  let cleanedPhone = cleanPhoneForWhatsApp(phoneNumber);
  if (!cleanedPhone || cleanedPhone.length < 10) {
    showAlert("Member does not have a valid phone number saved. Cannot send via WhatsApp.", "error");
    return;
  }

  const payload = {
    t: 'l',
    n: mObj.name,
    addr: mAddr,
    tot: totalContrib,
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    txs: txsData
  };

  function getShareableUrl(linkId, payload) {
    return `${window.location.origin}/${linkId}`;
  }

  const waWin = window.open('about:blank', '_blank');
  const safeName = mObj.name.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
  const code = getMemberCode(mObj.name, mObj.address);
  const linkId = `L-${safeName}-${code}`;
  const shortUrl = getShareableUrl(linkId, payload);

  try {
    await db.collection('shared_links').doc(linkId).set({
      payload: payload,
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn("Firestore shared_links write skipped/failed (rendering live via docId):", e);
  }

  const finalMsg = textMsg + `\n\nClick here to view and download your full statement:\n${shortUrl}`;

  const waLink = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(finalMsg)}`;
  if (waWin) waWin.location.href = waLink;
  else window.location.href = waLink;
}

async function copyMemberLedgerLink() {
  if (!selectedMemberName) {
    showAlert("Please select a member first.", "error");
    return;
  }

  const mName = selectedMemberName;
  const mAddrTarget = selectedMemberAddress || '';
  const mObj = getMemberObject(mName, mAddrTarget);
  const mAddr = (mObj.address || mAddrTarget || activeMembersMap[mName.toLowerCase()] || "Not specified");
  const mTxList = getMemberGroupedTransactions(mName, mAddr);
  let totalContrib = 0;

  let txsData = [];
  mTxList.forEach(tx => {
    totalContrib += (tx.receipt || 0);
    const isPayment = (tx.payment && tx.payment > 0);
    let cat = tx.categoryDisplay || tx.subtype || tx.type || 'Subscription';
    txsData.push([
      formatDateClean(tx.date),
      formatVrNoClean(tx.vrNo),
      tx.description || '-',
      cat,
      tx.receipt || tx.payment || 0
    ]);
  });

  const payload = {
    t: 'l',
    n: mObj.name,
    addr: mObj.address || mAddrTarget || activeMembersMap[mName.toLowerCase()] || "Not specified",
    tot: totalContrib,
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    txs: txsData
  };

  const safeName = mObj.name.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
  const code = getMemberCode(mObj.name, mObj.address);
  const linkId = `L-${safeName}-${code}`;
  const shortUrl = getShareableUrl(linkId, payload);
  const cleanDisplayUrl = `${window.location.origin}/${linkId}`;

  try {
    await db.collection('shared_links').doc(linkId).set({
      payload: payload,
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn("Firestore shared_links write skipped/failed (rendering live via docId):", e);
  }

  navigator.clipboard.writeText(shortUrl).then(() => {
    showAlert("🔗 Member Statement link copied to clipboard:\n" + cleanDisplayUrl, "success");
  }).catch(() => {
    prompt("Copy this Member Statement link:", shortUrl);
  });
}

async function copyReceiptShareLink() {
  const vrNo = document.getElementById('rRcptNo') ? document.getElementById('rRcptNo').innerText.trim() : '';
  const dateStr = document.getElementById('rDate') ? document.getElementById('rDate').innerText.trim() : '';
  const nameStr = document.getElementById('rAccountName') ? document.getElementById('rAccountName').innerText.trim() : '';

  let don = 0, sub = 0, off = 0, oth = 0, othDesc = 'Other Items';
  let isCancelled = false;
  let totalAmt = 0;
  if (currentReceiptTx) {
    const typeStr = (currentReceiptTx.type || '').toLowerCase();
    const subStr = (currentReceiptTx.subtype || '').toLowerCase();
    const amt = Number(currentReceiptTx.receipt || currentReceiptTx.amount || 0);
    totalAmt = amt;
    if (typeStr.includes('subscription') || subStr.includes('subscription')) sub = amt;
    else if (typeStr.includes('offering') || subStr.includes('offertory')) off = amt;
    else if (typeStr.includes('donation') || subStr.includes('donation')) don = amt;
    else {
      oth = amt;
      othDesc = currentReceiptTx.subtype || currentReceiptTx.type || 'Other Items';
      if (typeStr === 'charity' || subStr === 'charity') othDesc = 'Charity';
    }
    const descStr = (currentReceiptTx.description || '').toLowerCase();
    if (descStr.includes('cancelled') || typeStr.includes('cancelled') || (currentReceiptTx.accountName || '').toLowerCase().includes('cancelled')) {
      isCancelled = true;
    }
  }

  const payload = {
    t: 'r', v: vrNo, d: dateStr, n: nameStr,
    addr: currentReceiptTx ? (currentReceiptTx.address || '') : '',
    subMonth: currentReceiptTx ? (currentReceiptTx.subMonth || '') : '',
    don: don, sub: sub, off: off, oth: oth, othDesc: othDesc,
    tot: totalAmt,
    words: document.getElementById('rWords') ? document.getElementById('rWords').innerText : '',
    cancel: isCancelled
  };

  const safeVr = vrNo.replace(/[^a-zA-Z0-9]/g, '');
  const safeName = nameStr.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
  const linkId = `R-${safeVr}-${safeName}`;
  const shortUrl = getShareableUrl(linkId, payload);
  const cleanDisplayUrl = `${window.location.origin}/${linkId}`;

  try {
    await db.collection('shared_links').doc(linkId).set({
      payload: payload,
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn("Firestore shared_links write skipped/failed (rendering live via docId):", e);
  }

  navigator.clipboard.writeText(shortUrl).then(() => {
    showAlert("🔗 Receipt link copied to clipboard:\n" + cleanDisplayUrl, "success");
  }).catch(() => {
    prompt("Copy this Receipt link:", shortUrl);
  });
}

async function copyPaymentVoucherShareLink() {
  const vrNo = document.getElementById('pVoucherNo') ? document.getElementById('pVoucherNo').innerText.trim() : '';
  const dateStr = document.getElementById('pDate') ? document.getElementById('pDate').innerText.trim() : '';
  const headAccount = document.getElementById('pHeadAccount') ? document.getElementById('pHeadAccount').innerText.trim() : '';
  const description = document.getElementById('pDescription') ? document.getElementById('pDescription').innerText.trim() : '';

  let totalAmt = 0;
  if (currentPaymentTx) {
    totalAmt = Number(currentPaymentTx.payment || currentPaymentTx.amount || 0);
  }

  let searchName = headAccount;
  if (currentPaymentTx && currentPaymentTx.accountName) searchName = currentPaymentTx.accountName;
  if (currentPaymentTx && currentPaymentTx.name && currentPaymentTx.name !== '-') searchName = currentPaymentTx.name;

  const payload = {
    t: 'p',
    v: vrNo,
    d: dateStr,
    n: document.getElementById('pPaidTo') ? document.getElementById('pPaidTo').innerText : searchName,
    addr: currentPaymentTx ? (currentPaymentTx.address || '') : '',
    h: headAccount,
    desc: description,
    tot: totalAmt,
    words: document.getElementById('pWords') ? document.getElementById('pWords').innerText : ''
  };

  const safeVr = vrNo.replace(/[^a-zA-Z0-9]/g, '');
  let safeName = searchName ? searchName.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '') : 'voucher';
  const linkId = `P-${safeVr}-${safeName}`;
  const shortUrl = getShareableUrl(linkId, payload);
  const cleanDisplayUrl = `${window.location.origin}/${linkId}`;

  try {
    await db.collection('shared_links').doc(linkId).set({
      payload: payload,
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn("Firestore shared_links write skipped/failed (rendering live via docId):", e);
  }

  navigator.clipboard.writeText(shortUrl).then(() => {
    showAlert("🔗 Payment Voucher link copied to clipboard:\n" + cleanDisplayUrl, "success");
  }).catch(() => {
    prompt("Copy this Payment Voucher link:", shortUrl);
  });
}

function openAddMemberModal() {
  try {
    const modal = document.getElementById('addMemberModal');
    if (modal) {
      if (document.getElementById('newMemberName')) document.getElementById('newMemberName').value = '';
      if (document.getElementById('newMemberAddress')) document.getElementById('newMemberAddress').value = '';
      if (document.getElementById('newMemberPhone')) {
        populatePhoneInput('newMemberPhone', '');
        syncPhonePrefixUI();
      }
      if (document.getElementById('newMemberStatus')) document.getElementById('newMemberStatus').value = 'Yes';
      if (document.getElementById('newMemberTitle')) document.getElementById('newMemberTitle').value = '';
      if (document.getElementById('newMemberNickname')) document.getElementById('newMemberNickname').value = '';
      modal.style.display = 'flex';
    }
  } catch (e) {
    console.error("Error opening add member modal:", e);
    alert("Failed to open Add Member modal: " + e.message);
  }
}

function closeAddMemberModal() {
  const modal = document.getElementById('addMemberModal');
  if (modal) modal.style.display = 'none';
}

function submitNewMember(event) {
  if (event) event.preventDefault();

  const rawName = document.getElementById('newMemberName') ? document.getElementById('newMemberName').value.trim() : '';
  const title = document.getElementById('newMemberTitle') ? document.getElementById('newMemberTitle').value : '';
  const normTitle = normalizeTitle(title);
  const cleanRawName = getRawName(rawName, normTitle);
  const name = cleanRawName;
  const nickname = document.getElementById('newMemberNickname') ? document.getElementById('newMemberNickname').value.trim() : '';
  const address = document.getElementById('newMemberAddress') ? document.getElementById('newMemberAddress').value.trim() : '';
  const phone = getFormattedPhoneToSave('newMemberPhone');
  const status = document.getElementById('newMemberStatus') ? document.getElementById('newMemberStatus').value : 'Yes';
  const btn = document.getElementById('btnSubmitMember');

  if (!rawName) {
    alert("Please enter member name.");
    return;
  }

  const existingDup = (membersDataStore || []).find(m => {
    if (!m || !m.name) return false;
    const mn = (m.name || '').toLowerCase().trim();
    const mr = getRawName(mn).toLowerCase().trim();
    const ma = (m.address || '').toLowerCase().trim();
    const cleanA = (address || '').toLowerCase().trim();
    const matchesName = (mn === name.toLowerCase().trim() || mr === cleanRawName.toLowerCase().trim());
    if (!matchesName) return false;
    if (!ma || !cleanA || ma === '-' || cleanA === '-') return true;
    return ma === cleanA || ma.includes(cleanA) || cleanA.includes(ma);
  });

  if (existingDup) {
    alert(`A member named "${formatMemberDisplayName(existingDup.name, existingDup.title)}" with address "${existingDup.address || 'No address'}" is already registered. ⚠️`);
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerText = "Saving... ⏳";
  }

  const newId = Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const newMember = {
    id: newId,
    _docId: String(newId),
    name: name,
    title: normTitle,
    nickname: nickname,
    address: address,
    phone: phone,
    status: status === 'No' ? 'No' : 'Yes'
  };

  const onSuccess = function (res) {
    if (btn) { btn.disabled = false; btn.innerText = "Save Member"; }

    let ok = false;
    if (typeof res === 'string') {
      ok = (res === 'Success');
    } else if (res && typeof res === 'object') {
      ok = res.success === true;
    }

    if (ok) {
      try {
        showAlert(`✅ Member "${name}" added successfully!`, "success");
        globalRawMembers = globalRawMembers || [];
        globalRawMembers.push(newMember);
        membersDataStore = deduplicateMembersList(globalRawMembers);
        membersDataStore.sort((a, b) => compareNamesIgnoringPrefix(a.name, b.name));
        _memberCodeCache = null;
        if (name) activeMembersMap[name.toLowerCase()] = address;

        if (typeof filterMembersTabList === 'function') filterMembersTabList();
        if (typeof renderMembersDirectoryTab === 'function') renderMembersDirectoryTab();
        if (typeof selectMemberLedger === 'function') selectMemberLedger(name, address);
        closeAddMemberModal();
        if (typeof updateEditMemberButtonsVisibility === 'function') updateEditMemberButtonsVisibility();
      } catch (e) {
        console.error("Error in submitNewMember onSuccess post-save logic:", e);
        alert("Error syncing client-side list: " + e.message);
        closeAddMemberModal();
      }
    } else {
      const msg = (res && res.message) ? res.message : (typeof res === 'string' ? res : "Could not save member.");
      alert("Error: " + msg);
    }
  };

  const onError = function (err) {
    if (btn) { btn.disabled = false; btn.innerText = "Save Member"; }
    alert("Failed to add member: " + (err.message || err));
  };

  db.collection("members").doc(String(newId)).set(newMember)
    .then(() => {
      onSuccess("Success");
    })
    .catch(onError);
}

function populateViewModalData(tx) {
  window.currentlyViewedTxData = tx;
  document.getElementById('vVrNo').innerText = tx.vrNo || '--';
  document.getElementById('vDate').innerText = formatDateClean(tx.date);
  document.getElementById('vAccount').innerText = tx.accountName || '--';
  document.getElementById('vCategory').innerText = tx.type || '--';
  let subDisp = tx.subtype || '--';
  if (tx.type === 'Charity' || (tx.subtype && tx.subtype.toLowerCase().includes('charity'))) {
    if (tx.subtype && (tx.subtype.toLowerCase() === 'received' || tx.subtype.toLowerCase() === 'charity received')) subDisp = 'Charity Received';
    else if (tx.subtype && (tx.subtype.toLowerCase() === 'paid' || tx.subtype.toLowerCase() === 'charity paid')) subDisp = 'Charity Paid';
    else if (tx.type === 'Charity') subDisp = ((tx.receipt && tx.receipt > 0) || tx.mode === 'Receipt') ? 'Charity Received' : 'Charity Paid';
  }
  document.getElementById('vSubtype').innerText = subDisp;
  document.getElementById('vDescription').innerText = tx.description || tx.particulars || 'No description entered.';

  const rawAccName = (tx.accountName && tx.accountName !== '-') ? tx.accountName : ((tx.name && tx.name !== '-') ? tx.name : '');
  const accName = rawAccName.trim();
  const memberAddr = resolveMemberAddress(tx) || tx.address || (accName && activeMembersMap[accName.toLowerCase()]) || '';

  const addrItem = document.getElementById('vAddressItem');
  if (accName && memberAddr && memberAddr !== '-') {
    document.getElementById('vAddress').innerText = memberAddr;
    if (addrItem) addrItem.style.display = 'flex';
  } else {
    if (addrItem) addrItem.style.display = 'none';
  }

  const isCredit = (tx.receipt && tx.receipt > 0) || (tx.credit && tx.credit > 0) || (tx.mode && (tx.mode.includes('Credit') || tx.mode === 'Receipt'));
  const isDebit = (tx.payment && tx.payment > 0) || (tx.payments && tx.payments > 0) || (tx.debit && tx.debit > 0) || (tx.mode && (tx.mode.includes('Debit') || tx.mode === 'Payment'));

  const rAmt = Number(tx.receipt || tx.credit || (isCredit ? tx.amount : 0) || 0);
  const pAmt = Number(tx.payment || tx.payments || tx.debit || (isDebit ? tx.amount : 0) || 0);

  const rcptVal = rAmt > 0 ? formatCurrency(rAmt) : '-';
  const pmtVal = pAmt > 0 ? formatCurrency(pAmt) : '-';

  let balVal = '-';
  if (tx.balance !== undefined && tx.balance !== null && tx.balance !== "" && tx.balance !== "-") {
    const numVal = (typeof tx.balance === 'number') ? tx.balance : parseFloat(String(tx.balance).replace(/[^0-9.-]/g, ''));
    balVal = !isNaN(numVal) && numVal !== 0 ? formatCurrency(numVal) : tx.balance;
  }

  document.getElementById('vReceipt').innerText = rcptVal;
  document.getElementById('vPayment').innerText = pmtVal;
  document.getElementById('vBalance').innerText = balVal;

  window.currentViewedVrNo = tx.vrNo;

  const hasRcpt = rAmt > 0 || (tx.type && tx.type.toLowerCase() === 'receipt') || (tx.mode && tx.mode.toLowerCase().includes('credit'));
  const hasPmt = pAmt > 0 || (tx.type && tx.type.toLowerCase() === 'payment') || (tx.type && tx.type.toLowerCase() === 'ledger') || (tx.mode && tx.mode.toLowerCase().includes('debit'));

  const genRcptBtn = document.getElementById('vGenReceiptBtn');
  if (genRcptBtn) {
    genRcptBtn.style.display = hasRcpt ? 'inline-block' : 'none';
  }
  const genPmtBtn = document.getElementById('vGenPaymentBtn');
  if (genPmtBtn) {
    genPmtBtn.style.display = hasPmt ? 'inline-block' : 'none';
  }
}

function closeViewTransactionModal() {
  const modal = document.getElementById('viewTransactionModal');
  if (modal) modal.style.display = 'none';
}

function editFromViewModal() {
  closeViewTransactionModal();
  if (window.currentViewedVrNo) {
    loadEntryForEdit(window.currentViewedVrNo);
  }
}

function loadFallbackInitialData() {
  onInitialDataFetched({
    success: true,
    nextReceipt: 1,
    nextPayment: 1,
    members: [],
    subtypes: subTypesConfig
  });
}

function onInitialDataFetched(data) {
  if (data && data.success !== false) {
    if (data.nextReceipt && data.nextReceipt > 0) nextReceiptVrNo = data.nextReceipt;
    if (data.nextPayment && data.nextPayment > 0) nextPaymentVrNo = data.nextPayment;
    if (data.subtypes) subTypesConfig = data.subtypes;
    if (data.subscriptionsPaid) subscriptionsPaidMap = data.subscriptionsPaid;
    if (data.currentBalance !== undefined && data.currentBalance !== null && document.getElementById('entryTabBalance')) {
      document.getElementById('entryTabBalance').innerText = formatCurrency(data.currentBalance);
    }

    activeMembersMap = {};
    if (data.members && data.members.length > 0) {
      membersDataStore = data.members;
      data.members.forEach(m => {
        activeMembersMap[m.name.toLowerCase()] = m.address;
      });
    }
    updateEditMemberButtonsVisibility();
  }

  const entryTab = document.getElementById('entryTab');
  if (entryTab && entryTab.classList.contains('active')) {
    const currentMode = document.getElementById('txType') ? document.getElementById('txType').value : 'Receipt';
    setMode(currentMode);
  }
}

function renderCustomMembersDropdown(filterText = "") {
  const dropdownMenu = document.getElementById('customMembersDropdown');
  if (!dropdownMenu) return;

  const searchLower = filterText.trim().toLowerCase();
  const matches = membersDataStore.filter(m => {
    const code = getMemberCode(m.name, m.address).toLowerCase();
    return !searchLower || m.name.toLowerCase().includes(searchLower) || (m.nickname && m.nickname.toLowerCase().includes(searchLower)) || (m.address && m.address.toLowerCase().includes(searchLower)) || (m.phone && m.phone.toLowerCase().includes(searchLower)) || code.includes(searchLower);
  });

  dropdownMenu.innerHTML = '';

  if (matches.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'custom-dropdown-item';
    emptyDiv.style.color = '#94a3b8';
    emptyDiv.style.cursor = 'default';
    emptyDiv.innerText = filterText ? 'No matching member found' : 'No members available';
    dropdownMenu.appendChild(emptyDiv);
  } else {
    matches.slice(0, 30).forEach(m => {
      const item = document.createElement('div');
      item.className = 'custom-dropdown-item';
      item.onclick = (e) => {
        e.stopPropagation();
        selectMemberItem(m.name, m.address);
      };

      const nameSpan = document.createElement('span');
      nameSpan.style.fontWeight = '700';
      const code = getMemberCode(m.name, m.address);
      const disp = formatMemberDisplayName(m.name, m.title, true, m.nickname);
      nameSpan.innerHTML = `<span style="color:#0f172a; font-family:monospace; margin-right:5px;">[${code}]</span>👤 ` + disp;
      item.appendChild(nameSpan);

      const subInfoSpan = document.createElement('div');
      subInfoSpan.style.fontSize = '0.75rem';
      subInfoSpan.style.color = '#64748b';
      subInfoSpan.style.marginTop = '2px';
      subInfoSpan.style.display = 'flex';
      subInfoSpan.style.gap = '8px';

      const addrTxt = m.address ? '📍 ' + m.address : '📍 No address';
      const phoneTxt = m.phone ? '📞 ' + m.phone : '<span style="color:#dc2626;">📞 (No phone)</span>';
      subInfoSpan.innerHTML = `<span>${addrTxt}</span><span>${phoneTxt}</span>`;
      item.appendChild(subInfoSpan);
      dropdownMenu.appendChild(item);
    });
  }

  dropdownMenu.style.display = 'block';
}

function updateMemberPhonePreview(name, address, isEditTab = false) {
  const phoneTextEl = document.getElementById(isEditTab ? 'edit_phoneText' : 'phoneText');
  const phoneRowEl = document.getElementById(isEditTab ? 'edit_phonePreviewRow' : 'phonePreviewRow');
  if (!phoneTextEl) return;

  if (!name || name.trim() === '') {
    phoneTextEl.innerText = '--';
    if (phoneRowEl) phoneRowEl.style.display = 'none';
    return;
  }

  const nameLower = name.toLowerCase().trim();
  const addrLower = (address || '').toLowerCase().trim();

  let member = membersDataStore.find(m => m.name && m.name.toLowerCase().trim() === nameLower && (!addrLower || (m.address || '').toLowerCase().trim() === addrLower));
  if (!member) {
    member = membersDataStore.find(m => m.name && m.name.toLowerCase().trim() === nameLower);
  }

  if (member && member.phone && member.phone.trim()) {
    phoneTextEl.innerText = member.phone.trim();
    phoneTextEl.style.color = '#059669';
    phoneTextEl.style.fontWeight = '700';
  } else {
    phoneTextEl.innerText = '(No phone number recorded ⚠️)';
    phoneTextEl.style.color = '#dc2626';
    phoneTextEl.style.fontWeight = '700';
  }
  if (phoneRowEl) phoneRowEl.style.display = 'block';
}

function selectMemberItem(name, address) {
  const accountInput = document.getElementById('accountName');
  const addressInput = document.getElementById('addressInput');
  const addressText = document.getElementById('addressText');
  const addressPreview = document.getElementById('addressPreview');
  const dropdownMenu = document.getElementById('customMembersDropdown');

  const formattedName = formatMemberDisplayName(name);
  accountInput.value = formattedName;
  if (addressInput) addressInput.value = address || '';
  if (addressText) addressText.innerText = address || '(No address recorded)';
  if (addressPreview) addressPreview.style.display = 'block';

  if (dropdownMenu) dropdownMenu.style.display = 'none';

  updateMemberPhonePreview(name, address, false);
  checkDuplicateSubscriptionWarning();
  updateEditMemberButtonsVisibility();
}

function onAccountNameInput() {
  const inputVal = document.getElementById('accountName').value;
  renderCustomMembersDropdown(inputVal);
  onAccountNameChanged();
}

function onAccountNameFocus() {
  renderCustomMembersDropdown(document.getElementById('accountName').value);
}

document.addEventListener('click', (e) => {
  const container = document.querySelector('.searchable-select-container');
  const dropdownMenu = document.getElementById('customMembersDropdown');
  if (dropdownMenu && container && !container.contains(e.target)) {
    dropdownMenu.style.display = 'none';
  }

  const editContainer = document.querySelector('#editTab .searchable-select-container');
  const editDropdownMenu = document.getElementById('edit_customMembersDropdown');
  if (editDropdownMenu && editContainer && !editContainer.contains(e.target)) {
    editDropdownMenu.style.display = 'none';
  }
});

function onAccountNameChanged() {
  const val = document.getElementById('accountName').value.trim();
  const addrPreview = document.getElementById('addressPreview');
  const addrText = document.getElementById('addressText');
  const addrInput = document.getElementById('addressInput');

  let foundAddr = null;
  let multipleMatches = false;

  if (val) {
    const matches = membersDataStore.filter(m => m.name && m.name.toLowerCase().trim() === val.toLowerCase());
    if (matches.length === 1) {
      foundAddr = matches[0].address || "";
    } else if (matches.length > 1) {
      multipleMatches = true;
      const curAddr = (addrInput.value || '').trim().toLowerCase();
      if (curAddr) {
        const exactMatch = matches.find(m => {
          const mA = (m.address || '').toLowerCase().trim();
          return mA === curAddr || mA.indexOf(curAddr) !== -1 || curAddr.indexOf(mA) !== -1;
        });
        if (exactMatch) {
          foundAddr = exactMatch.address || curAddr;
        }
      }
    }
  }

  if (multipleMatches && foundAddr === null) {
    addrText.innerText = "⚠️ Multiple members with this name. Please select from dropdown.";
    addrText.style.color = "#d97706";
    addrPreview.style.display = 'block';
  } else if (foundAddr !== null && foundAddr !== undefined) {
    addrText.innerText = foundAddr || "(No address recorded)";
    addrText.style.color = "#0f172a";
    addrInput.value = foundAddr || "";
    addrPreview.style.display = 'block';
  } else {
    addrText.innerText = "--";
    addrText.style.color = "#0f172a";
    addrPreview.style.display = addrInput.value ? 'block' : 'none';
  }
  updateMemberPhonePreview(val, foundAddr, false);
  checkDuplicateSubscriptionWarning();
  updateEditMemberButtonsVisibility();
}

function updateTypeOptions(mode, targetTypeValue, targetSubtypeValue) {
  const typeSelect = document.getElementById('type');
  if (!typeSelect) return;
  let currentVal = typeSelect.value;
  if (targetTypeValue !== undefined) {
    currentVal = targetSubtypeValue ? `${targetTypeValue}|${targetSubtypeValue}` : `${targetTypeValue}|`;
  }
  const entryType = document.getElementById('entryType') ? document.getElementById('entryType').value : 'Cash';
  populateCategorySelect(typeSelect, mode, entryType, currentVal);
}

// Toggle Voucher logic has been merged into toggleLedgerInput

// Toggle Ledger Type/Subtype for Bank Mode

function generateUpiQr() {
  const amountVal = String(document.getElementById('amount').value || '').replace(/,/g, '');
  if (!amountVal || isNaN(amountVal) || parseFloat(amountVal) <= 0) {
    alert("Please enter a valid amount first.");
    return;
  }
  if (!globalChurchUpiId || globalChurchUpiId.trim() === '') {
    alert("Church UPI ID is not configured. Please set it in Settings.");
    return;
  }

  const amount = parseFloat(amountVal).toFixed(2);
  const memberName = document.getElementById('accountName').value.trim() || 'Member';

  const upiUrl = `upi://pay?pa=${encodeURIComponent(globalChurchUpiId)}&pn=${encodeURIComponent('Church')}&am=${amount}&tn=${encodeURIComponent('Donation from ' + memberName)}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;

  document.getElementById('upiQrAmount').innerText = `₹${amount}`;
  document.getElementById('upiQrPayee').innerText = `Paying to: ${globalChurchUpiId}`;
  document.getElementById('upiQrImage').style.display = 'none';
  document.getElementById('upiQrLoading').style.display = 'flex';
  document.getElementById('upiQrModal').style.display = 'flex';

  const img = document.getElementById('upiQrImage');
  img.onload = () => {
    document.getElementById('upiQrLoading').style.display = 'none';
    img.style.display = 'block';
  };
  img.onerror = () => {
    document.getElementById('upiQrLoading').innerText = "Failed to generate QR Code. Please check internet connection.";
  };
  img.src = qrApiUrl;
}

function closeUpiQrModal() {
  document.getElementById('upiQrModal').style.display = 'none';
}

function toggleLedgerInput(isChecked) {
  const typeGroup = document.getElementById('typeGroup');
  const subTypeGroup = document.getElementById('subTypeGroup');
  const subMonthGroup = document.getElementById('subMonthGroup');
  const entryType = document.getElementById('entryType') ? document.getElementById('entryType').value : 'Cash';
  const vrContainer = document.getElementById('vrInputContainer');
  const vrInput = document.getElementById('vrNo');
  const vrReq = document.getElementById('vrReq');

  if (isChecked) {
    if (typeGroup) typeGroup.style.display = 'block';
  } else {
    if (typeGroup) typeGroup.style.display = 'none';
    if (subTypeGroup) subTypeGroup.style.display = 'none';
    if (subMonthGroup) subMonthGroup.style.display = 'none';
  }
  onTypeChanged(); // refresh visibility of subtype/month/account based on state
}

function toggleEditLedgerInput(isChecked) {
  const typeGroup = document.getElementById('edit_typeGroup');
  const subTypeGroup = document.getElementById('edit_subTypeGroup');
  const subMonthGroup = document.getElementById('edit_subMonthGroup');
  const entryType = document.getElementById('edit_entryType') ? document.getElementById('edit_entryType').value : 'Cash';
  const vrContainer = document.getElementById('edit_vrInputContainer');
  const vrInput = document.getElementById('edit_vrNo');
  const vrReq = document.getElementById('edit_vrReq');

  if (isChecked) {
    if (typeGroup) typeGroup.style.display = 'block';
  } else {
    if (typeGroup) typeGroup.style.display = 'none';
    if (subTypeGroup) subTypeGroup.style.display = 'none';
    if (subMonthGroup) subMonthGroup.style.display = 'none';
  }
  onEditTypeChanged();
}

function toggleChequeInput(isChecked) {
  const group = document.getElementById('chequeInputGroup');
  const input = document.getElementById('chequeNo');
  if (group && input) {
    if (isChecked) {
      group.style.display = 'block';
      input.setAttribute('required', 'true');
      if (!input.value) {
        input.value = '';
      }
    } else {
      group.style.display = 'none';
      input.removeAttribute('required');
      input.value = '';
    }
  }
}

function toggleEditChequeInput(isChecked) {
  const group = document.getElementById('edit_chequeInputGroup');
  const input = document.getElementById('edit_chequeNo');
  if (group && input) {
    if (isChecked) {
      group.style.display = 'block';
      input.setAttribute('required', 'true');
      if (!input.value) {
        input.value = '';
      }
    } else {
      group.style.display = 'none';
      input.removeAttribute('required');
      input.value = '';
    }
  }
}

function setMode(mode) {
  const isReceipt = (mode === 'Receipt' || mode === 'OpeningBalance');
  document.getElementById('txType').value = mode;

  const isEditMode = (document.getElementById('editFormCard') && document.getElementById('editFormCard').style.display === 'block');

  const formCard = document.querySelector('.form-page-card');
  const btnReceipt = document.getElementById('btnReceipt');
  const btnPayment = document.getElementById('btnPayment');
  const btnOpeningBalance = document.getElementById('btnOpeningBalance');
  const vrLabel = document.getElementById('vrLabel');
  const vrBadge = document.getElementById('vrBadge');
  const vrHint = document.getElementById('vrHint');
  const vrInput = document.getElementById('vrNo');
  const amountLabel = document.getElementById('amountLabel');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const accountGroup = document.getElementById('accountGroup');
  const vrLabelText = document.getElementById('vrLabelText');
  const amountLabelText = document.getElementById('amountLabelText');
  const chequeToggleGroup = document.getElementById('chequeToggleGroup');
  const isCheque = document.getElementById('isCheque');
  const chequeInputGroup = document.getElementById('chequeInputGroup');
  const chequeNo = document.getElementById('chequeNo');

  if (formCard) {
    if (isReceipt) formCard.classList.remove('payment-active');
    else formCard.classList.add('payment-active');
  }

  if (mode === 'Payment') {
    updateTypeOptions(mode, 'Ledger', 'General Expenses');
  } else {
    updateTypeOptions(mode);
  }
  const entryType = document.getElementById('entryType') ? document.getElementById('entryType').value : 'Cash';

  if (chequeToggleGroup) {
    if (entryType === 'Bank' && mode !== 'OpeningBalance') {
      chequeToggleGroup.style.display = 'block';
    } else {
      chequeToggleGroup.style.display = 'none';
    }
    // Reset state on mode switch unless in Edit mode
    if (!isEditMode) {
      if (isCheque) isCheque.checked = false;
      if (chequeInputGroup) chequeInputGroup.style.display = 'none';
      if (chequeNo) {
        chequeNo.value = "";
        chequeNo.removeAttribute('required');
      }
    }
  }

  if (entryType === 'Bank') {
    updateBankSubtypes(mode);
    if (accountGroup) {
      const bankSubtype = document.getElementById('bankSubtypeSelect') ? document.getElementById('bankSubtypeSelect').value : '';
      const isInternal = bankSubtype.includes('Contra') || bankSubtype.includes('Interest') || bankSubtype.includes('Charges');
      accountGroup.style.display = isInternal ? 'none' : 'block';
    }
  }

  const suffixSpan = document.getElementById('bankVrSuffix');
  if (entryType === 'Bank') {
    if (suffixSpan) suffixSpan.style.display = 'inline';
  } else {
    if (suffixSpan) suffixSpan.style.display = 'none';
  }

  if (isReceipt) {
    btnReceipt.classList.add('active');
    btnPayment.classList.remove('active');
    if (btnOpeningBalance) {
      btnOpeningBalance.classList.remove('active');
      btnOpeningBalance.style.background = 'transparent';
      btnOpeningBalance.style.color = 'inherit';
    }

    if (accountGroup) {
      if (entryType === 'Bank') {
        const bankSubtype = document.getElementById('bankSubtypeSelect') ? document.getElementById('bankSubtypeSelect').value : '';
        const isInternal = bankSubtype.includes('Contra') || bankSubtype.includes('Interest');
        accountGroup.style.display = isInternal ? 'none' : 'block';
      } else {
        accountGroup.style.display = 'block';
      }
    }
    if (vrLabelText) vrLabelText.textContent = "🔢 Receipt No ";
    vrBadge.className = "badge badge-receipt";
    vrBadge.innerText = (entryType === 'Bank') ? "Credit" : "Receipt";
    if (vrHint) vrHint.innerText = isEditMode ? "Editing Receipt No" : "Auto Receipt No";
    if (!isEditMode) {
      if (typeof calculateNextVoucherNumbers === 'function') calculateNextVoucherNumbers();
      vrInput.value = nextReceiptVrNo;
    }

    if (amountLabelText) {
      amountLabelText.textContent = (entryType === 'Bank') ? "💰 Amount (₹) " : "💰 Receipt Amount (₹) ";
    }
    if (!isEditMode) {
      submitBtn.className = "btn-submit receipt-mode";
      btnText.innerText = "Save Receipt Entry 🟢";
      if (document.getElementById('saveAndPrintBtnText')) {
        document.getElementById('saveAndPrintBtnText').innerText = (entryType === 'Bank') ? "Save & Print Credit 🖨️" : "Save & Print Receipt 🖨️";
      }
      if (document.getElementById('cancelVoucherBtn')) {
        document.getElementById('cancelVoucherBtn').innerHTML = "🚫 Cancel Receipt";
      }
    }
  } else {
    btnPayment.classList.add('active');
    btnReceipt.classList.remove('active');
    if (btnOpeningBalance) {
      btnOpeningBalance.classList.remove('active');
      btnOpeningBalance.style.background = 'transparent';
      btnOpeningBalance.style.color = 'inherit';
    }

    if (accountGroup) {
      if (entryType === 'Bank') {
        const bankSubtype = document.getElementById('bankSubtypeSelect') ? document.getElementById('bankSubtypeSelect').value : '';
        const isInternal = bankSubtype.includes('Contra') || bankSubtype.includes('Charges') || bankSubtype.includes('Interest');
        accountGroup.style.display = isInternal ? 'none' : 'block';
      } else {
        const fullTypeVal = document.getElementById('type') ? document.getElementById('type').value : '|';
        const isCashContra = fullTypeVal.startsWith('Contra');
        accountGroup.style.display = isCashContra ? 'none' : 'block';
      }
    }

    if (vrLabelText) vrLabelText.textContent = "🔢 Payment Vr. No ";
    vrBadge.className = "badge badge-payment";
    vrBadge.innerText = (entryType === 'Bank') ? "Debit" : "Payment";
    if (vrHint) vrHint.innerText = isEditMode ? "Editing Payment Vr. No" : "Auto Payment Vr. No";
    if (!isEditMode) {
      if (typeof calculateNextVoucherNumbers === 'function') calculateNextVoucherNumbers();
      vrInput.value = nextPaymentVrNo;
    }

    if (amountLabelText) {
      amountLabelText.textContent = (entryType === 'Bank') ? "💰 Amount (₹) " : "💰 Payment Amount (₹) ";
    }
    if (!isEditMode) {
      submitBtn.className = "btn-submit payment-mode";
      btnText.innerText = "Save Payment Entry 🔴";
      if (document.getElementById('saveAndPrintBtnText')) {
        document.getElementById('saveAndPrintBtnText').innerText = (entryType === 'Bank') ? "Save & Print Debit 🖨️" : "Save & Print Payment 🖨️";
      }
      if (document.getElementById('cancelVoucherBtn')) {
        document.getElementById('cancelVoucherBtn').innerHTML = "🚫 Cancel Voucher";
      }
    }
  }

  onTypeChanged();
  updateUpiQrButtonVisibility();
  if (typeof checkIfVrIsCancelled === 'function') checkIfVrIsCancelled();
}

function updateUpiQrButtonVisibility() {
  const mode = document.getElementById('txType').value;
  const entryType = document.getElementById('entryType').value;
  const btnContainer = document.getElementById('upiQrButtonContainer');
  if (!btnContainer) return;

  if (mode === 'Receipt' && entryType === 'Bank' && globalChurchUpiId && globalChurchUpiId.trim() !== '') {
    btnContainer.style.display = 'block';
  } else {
    btnContainer.style.display = 'none';
  }
}

function generateUpiQr() {
  const amountVal = String(document.getElementById('amount').value || '').replace(/,/g, '');
  if (!amountVal || isNaN(amountVal) || parseFloat(amountVal) <= 0) {
    alert("Please enter a valid amount first.");
    return;
  }
  if (!globalChurchUpiId || globalChurchUpiId.trim() === '') {
    alert("Church UPI ID is not configured. Please set it in Settings.");
    return;
  }

  const amount = parseFloat(amountVal).toFixed(2);
  const memberName = document.getElementById('accountName').value.trim() || 'Member';

  const upiUrl = `upi://pay?pa=${encodeURIComponent(globalChurchUpiId)}&pn=${encodeURIComponent('Church')}&am=${amount}&tn=${encodeURIComponent('Donation from ' + memberName)}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;

  document.getElementById('upiQrAmount').innerText = `₹${amount}`;
  document.getElementById('upiQrPayee').innerText = `Paying to: ${globalChurchUpiId}`;
  document.getElementById('upiQrImage').style.display = 'none';
  document.getElementById('upiQrLoading').style.display = 'flex';
  document.getElementById('upiQrModal').style.display = 'flex';

  const img = document.getElementById('upiQrImage');
  img.onload = () => {
    document.getElementById('upiQrLoading').style.display = 'none';
    img.style.display = 'block';
  };
  img.onerror = () => {
    document.getElementById('upiQrLoading').innerText = "Failed to generate QR Code. Please check internet connection.";
  };
  img.src = qrApiUrl;
}

function closeUpiQrModal() {
  document.getElementById('upiQrModal').style.display = 'none';
}

function updateBankSubtypes(mode) {
  const select = document.getElementById('bankSubtypeSelect');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '';

  if (mode === 'Receipt') {
    const options = [
      { val: 'Direct Transfer / General', text: 'Direct Transfer / General' },
      { val: 'Direct Deposit for Member', text: 'Direct Deposit for Member' },
      { val: 'Cheque Deposited', text: 'Cheque Deposited' },
      { val: 'Bank Interest (Income)', text: 'Bank Interest (Income)' },
      { val: 'Inter-Bank Transfer (Contra)', text: 'Inter-Bank Transfer (Contra)' }
    ];
    options.forEach(opt => {
      const el = document.createElement('option');
      el.value = opt.val;
      el.innerText = opt.text;
      select.appendChild(el);
    });
  } else {
    const options = [
      { val: 'Direct Transfer / General', text: 'Direct Transfer / General' },
      { val: 'Direct Withdrawal for Member', text: 'Direct Withdrawal for Member' },
      { val: 'Cheque Issued (To Cash)', text: 'Cheque Issued (To Cash)' },
      { val: 'Bank Charges (Expense)', text: 'Bank Charges (Expense)' },
      { val: 'Inter-Bank Transfer (Contra)', text: 'Inter-Bank Transfer (Contra)' }
    ];
    options.forEach(opt => {
      const el = document.createElement('option');
      el.value = opt.val;
      el.innerText = opt.text;
      select.appendChild(el);
    });
  }

  if ([...select.options].some(o => o.value === currentVal)) {
    select.value = currentVal;
  }
  onBankSubtypeChanged();
}

function onBankSubtypeChanged() {
  const subtype = document.getElementById('bankSubtypeSelect').value;
  const addToCashBookCheckbox = document.getElementById('addToCashBook');
  const descInput = document.getElementById('description');
  const entryType = document.getElementById('entryType') ? document.getElementById('entryType').value : 'Cash';
  const accountGroup = document.getElementById('accountGroup');

  if (addToCashBookCheckbox) {
    if (subtype === 'Cash Deposit (Contra)' || subtype === 'Cash Withdrawal (Contra)') {
      addToCashBookCheckbox.checked = true;
      addToCashBookCheckbox.disabled = true;
    } else if (subtype === 'Inter-Bank Transfer (Contra)') {
      addToCashBookCheckbox.checked = false;
      addToCashBookCheckbox.disabled = true;
    } else {
      addToCashBookCheckbox.disabled = false;
    }
  }

  if (entryType === 'Bank' && accountGroup) {
    const isInternal = subtype.includes('Contra') || subtype.includes('Interest') || subtype.includes('Charges');
    accountGroup.style.display = isInternal ? 'none' : 'block';
  }

  if (entryType === 'Bank' && descInput && !isEditMode) {
    const isSplit = document.getElementById('splitEntryToggle') && document.getElementById('splitEntryToggle').checked;
    if (!isSplit) {
      if (subtype === 'Cash Deposit (Contra)') {
        descInput.value = "Cash deposit to bank";
      } else if (subtype === 'Cash Withdrawal (Contra)') {
        descInput.value = "Cash withdrawal from bank";
      } else if (subtype === 'Direct Transfer / General' || subtype === 'Direct Withdrawal for Member' || subtype === 'Direct Deposit for Member') {
        descInput.value = "Bank Transfer";
      } else {
        descInput.value = "";
      }
    }
  }

  const vrContainer = document.getElementById('vrInputContainer');
  const vrInput = document.getElementById('vrNo');
  const vrReq = document.getElementById('vrReq');
  const vrLabelText = document.getElementById('vrLabelText');
  const vrBadge = document.getElementById('vrBadge');
  const contraContainer = document.getElementById('contraNumbersContainer');
  const contraBankVrInput = document.getElementById('contraBankVrNo');
  const contraBankVrLabelText = document.getElementById('contraBankVrLabelText');

  const isContraDeposit = (subtype === 'Cash Deposit (Contra)');
  const isContraWithdrawal = (subtype === 'Cash Withdrawal (Contra)');
  const isContra = isContraDeposit || isContraWithdrawal;

  if (entryType === 'Bank' && isContra) {
    if (vrContainer) vrContainer.style.display = 'block';
    if (vrInput) vrInput.required = true;
    if (vrReq) vrReq.style.display = 'inline';
    if (contraContainer) contraContainer.style.display = 'block';

    if (isContraDeposit) {
      if (vrLabelText) vrLabelText.textContent = "🔢 Cash Payment Vr. No ";
      if (vrBadge) { vrBadge.className = "badge badge-payment"; vrBadge.innerText = "Cash Payment"; }
      if (contraBankVrLabelText) contraBankVrLabelText.textContent = "🏦 Bank Receipt No";
      if (!isEditMode) {
        if (vrInput && (vrInput.value === "" || vrInput.value === "undefined" || vrInput.value.includes('/B'))) {
          vrInput.value = typeof nextPaymentVrNo !== 'undefined' ? nextPaymentVrNo : '';
        }
        if (contraBankVrInput && (contraBankVrInput.value === "" || contraBankVrInput.value === "undefined")) {
          contraBankVrInput.value = (typeof nextReceiptVrNo !== 'undefined' && nextReceiptVrNo) ? `${nextReceiptVrNo}/B` : '';
        }
      }
    } else {
      if (vrLabelText) vrLabelText.textContent = "🔢 Cash Receipt No ";
      if (vrBadge) { vrBadge.className = "badge badge-receipt"; vrBadge.innerText = "Cash Receipt"; }
      if (contraBankVrLabelText) contraBankVrLabelText.textContent = "🏦 Bank Payment Vr. No";
      if (!isEditMode) {
        if (vrInput && (vrInput.value === "" || vrInput.value === "undefined" || vrInput.value.includes('/B'))) {
          vrInput.value = typeof nextReceiptVrNo !== 'undefined' ? nextReceiptVrNo : '';
        }
        if (contraBankVrInput && (contraBankVrInput.value === "" || contraBankVrInput.value === "undefined")) {
          contraBankVrInput.value = (typeof nextPaymentVrNo !== 'undefined' && nextPaymentVrNo) ? `${nextPaymentVrNo}/B` : '';
        }
      }
    }
  } else if (entryType === 'Bank' && (subtype === 'Bank Interest (Income)' || subtype === 'Inter-Bank Transfer (Contra)' || subtype === 'Bank Charges (Expense)')) {
    if (contraContainer) contraContainer.style.display = 'none';
    if (vrContainer) vrContainer.style.display = 'none';
    if (vrInput) {
      vrInput.required = false;
      if (!isEditMode) vrInput.value = "";
    }
    if (vrReq) vrReq.style.display = 'none';
  } else if (entryType === 'Bank') {
    if (contraContainer) contraContainer.style.display = 'none';
    if (vrContainer) vrContainer.style.display = 'block';
    if (vrInput) {
      vrInput.required = true;
      if (!isEditMode && (vrInput.value === "" || vrInput.value === "undefined")) {
        const mode = document.getElementById('txType') ? document.getElementById('txType').value : 'Receipt';
        vrInput.value = (mode === 'Receipt') ? nextReceiptVrNo : nextPaymentVrNo;
      }
    }
    if (vrReq) vrReq.style.display = 'inline';
  }
}

function onTypeChanged() {
  const entryType = document.getElementById('entryType') ? document.getElementById('entryType').value : 'Cash';
  const mode = document.getElementById('txType') ? document.getElementById('txType').value : 'Receipt';
  const fullTypeVal = document.getElementById('type') ? document.getElementById('type').value : '|';
  const [typeVal, subtypeVal] = fullTypeVal.split('|');
  const subTypeGroup = document.getElementById('subTypeGroup');
  const subMonthGroup = document.getElementById('subMonthGroup');
  const accountGroup = document.getElementById('accountGroup');
  const typeGroup = document.getElementById('typeGroup');

  const vrContainer = document.getElementById('vrInputContainer');
  const bankSubtypeParent = document.getElementById('bankSubtypeSelect') ? document.getElementById('bankSubtypeSelect').parentElement : null;
  const addToCashBookParent = document.getElementById('addToCashBook') ? document.getElementById('addToCashBook').parentElement : null;
  const ledgerToggleGroup = document.getElementById('ledgerToggleGroup');

  const isBankAndCategorize = (entryType === 'Bank' && document.getElementById('isAddLedgerType') && document.getElementById('isAddLedgerType').checked);
  const bankSubtypeStr = entryType === 'Bank' && document.getElementById('bankSubtypeSelect') ? document.getElementById('bankSubtypeSelect').value : '';
  const isNoVrSubtype = (bankSubtypeStr === 'Bank Interest (Income)' || bankSubtypeStr === 'Inter-Bank Transfer (Contra)' || bankSubtypeStr === 'Bank Charges (Expense)');

  if (subTypeGroup) subTypeGroup.style.display = 'none';

  if (mode === 'OpeningBalance') {
    if (subMonthGroup) subMonthGroup.style.display = 'none';
    if (accountGroup) accountGroup.style.display = 'none';
    if (typeGroup) typeGroup.style.display = 'none';
    if (vrContainer) vrContainer.style.display = 'none';
    if (bankSubtypeParent) bankSubtypeParent.style.display = 'none';
    if (addToCashBookParent) addToCashBookParent.style.display = 'none';
    if (ledgerToggleGroup) ledgerToggleGroup.style.display = 'none';

    if (document.getElementById('vrNo')) document.getElementById('vrNo').removeAttribute('required');

    return;
  } else {
    if (vrContainer) {
      if (entryType === 'Bank' && isNoVrSubtype) {
        vrContainer.style.display = 'none';
        if (document.getElementById('vrNo')) {
          document.getElementById('vrNo').required = false;
          document.getElementById('vrNo').value = '';
        }
        const vrReq = document.getElementById('vrReq');
        if (vrReq) vrReq.style.display = 'none';
      } else {
        vrContainer.style.display = 'block';
      }
    }
    if (bankSubtypeParent) bankSubtypeParent.style.display = 'flex';
    if (addToCashBookParent) addToCashBookParent.style.display = 'flex';
    if (ledgerToggleGroup && entryType === 'Bank') ledgerToggleGroup.style.display = 'block';
    if (document.getElementById('vrNo')) {
      const isBank = (entryType === 'Bank');
      if (!isBank) document.getElementById('vrNo').setAttribute('required', 'true');
    }
  }

  if (typeGroup) typeGroup.style.display = (entryType === 'Bank' && !isBankAndCategorize) ? 'none' : 'block';

  if (entryType === 'Bank') {
    const vrLabelText = document.getElementById('vrLabelText');
    const vrBadge = document.getElementById('vrBadge');
    const vrInput = document.getElementById('vrNo');

    if (mode === 'Payment') {
      if (vrLabelText) vrLabelText.textContent = "🔢 Payment Vr. No ";
      if (vrBadge) {
        vrBadge.className = "badge badge-payment";
        vrBadge.innerText = "Payment";
      }
      if (vrInput && typeof isEditMode !== 'undefined' && !isEditMode) {
        vrInput.value = typeof nextPaymentVrNo !== 'undefined' ? nextPaymentVrNo : '';
      }
    } else {
      if (vrLabelText) vrLabelText.textContent = "🔢 Receipt No ";
      if (vrBadge) {
        vrBadge.className = "badge badge-receipt";
        vrBadge.innerText = "Receipt";
      }
      if (vrInput && typeof isEditMode !== 'undefined' && !isEditMode) {
        vrInput.value = typeof nextReceiptVrNo !== 'undefined' ? nextReceiptVrNo : '';
      }
    }
  }

  if (subMonthGroup) subMonthGroup.style.display = 'none';

  if (entryType === 'Bank' && !isBankAndCategorize) {
    onBankSubtypeChanged();
    return; // Stop here if Bank
  }

  // Apply Dynamic Field Visibility Rules
  let rules = globalFieldRules[typeVal] || { showAccount: true, showSubtype: false, showMonth: false };

  if (entryType === 'Cash') {
    const bankAccountWrapper = document.getElementById('bankAccountWrapper');
    const isCashContra = (typeVal === 'Contra' || (subtypeVal && subtypeVal.includes('(Contra)')));
    const contraContainer = document.getElementById('contraNumbersContainer');
    const contraBankVrInput = document.getElementById('contraBankVrNo');
    const contraBankVrLabelText = document.getElementById('contraBankVrLabelText');
    const vrLabelText = document.getElementById('vrLabelText');
    const vrBadge = document.getElementById('vrBadge');
    const vrInput = document.getElementById('vrNo');

    if (isCashContra) {
      rules = { showAccount: false, showSubtype: false, showMonth: false };
      if (bankAccountWrapper) {
        bankAccountWrapper.style.display = 'flex';
        if (bankAccountWrapper.children.length >= 2) {
          bankAccountWrapper.children[0].style.display = 'flex';
          bankAccountWrapper.children[1].style.display = 'none';
        }
      }
      if (contraContainer) contraContainer.style.display = 'block';

      if (mode === 'Payment') {
        if (vrLabelText) vrLabelText.textContent = "🔢 Cash Payment Vr. No ";
        if (vrBadge) { vrBadge.className = "badge badge-payment"; vrBadge.innerText = "Cash Payment"; }
        if (contraBankVrLabelText) contraBankVrLabelText.textContent = "🏦 Bank Receipt No";
        if (!isEditMode) {
          if (vrInput && (vrInput.value === "" || vrInput.value === "undefined" || vrInput.value.includes('/B'))) {
            vrInput.value = typeof nextPaymentVrNo !== 'undefined' ? nextPaymentVrNo : '';
          }
          if (contraBankVrInput && (contraBankVrInput.value === "" || contraBankVrInput.value === "undefined")) {
            contraBankVrInput.value = (typeof nextReceiptVrNo !== 'undefined' && nextReceiptVrNo) ? `${nextReceiptVrNo}/B` : '';
          }
        }
      } else {
        if (vrLabelText) vrLabelText.textContent = "🔢 Cash Receipt No ";
        if (vrBadge) { vrBadge.className = "badge badge-receipt"; vrBadge.innerText = "Cash Receipt"; }
        if (contraBankVrLabelText) contraBankVrLabelText.textContent = "🏦 Bank Payment Vr. No";
        if (!isEditMode) {
          if (vrInput && (vrInput.value === "" || vrInput.value === "undefined" || vrInput.value.includes('/B'))) {
            vrInput.value = typeof nextReceiptVrNo !== 'undefined' ? nextReceiptVrNo : '';
          }
          if (contraBankVrInput && (contraBankVrInput.value === "" || contraBankVrInput.value === "undefined")) {
            contraBankVrInput.value = (typeof nextPaymentVrNo !== 'undefined' && nextPaymentVrNo) ? `${nextPaymentVrNo}/B` : '';
          }
        }
      }
    } else {
      if (bankAccountWrapper) bankAccountWrapper.style.display = 'none';
      if (contraContainer) contraContainer.style.display = 'none';
      if (mode === 'Payment') {
        if (vrLabelText) vrLabelText.textContent = "🔢 Payment Vr. No ";
        if (vrBadge) { vrBadge.className = "badge badge-payment"; vrBadge.innerText = "Payment"; }
      } else {
        if (vrLabelText) vrLabelText.textContent = "🔢 Receipt No ";
        if (vrBadge) { vrBadge.className = "badge badge-receipt"; vrBadge.innerText = "Receipt"; }
      }
    }
  }

  if (accountGroup) {
    // Only hide member section for Cash Contra entries; show it for all other Cash types
    accountGroup.style.display = (entryType === 'Cash' && typeVal === 'Contra') ? 'none' : 'block';
  }

  if (rules.showMonth) {
    subMonthGroup.style.display = 'block';
    autoSelectMonthFromDate();
  }

  autoPopulateDescription();
  checkDuplicateSubscriptionWarning();
}

function checkDuplicateSubscriptionWarning() {
  const h = document.getElementById('subMonthHint'); if (h) h.style.display = 'none';
}

function getDefaultSubscriptionMonth(isEdit = false) {
  const dateId = isEdit ? 'edit_date' : 'date';
  const dateInput = document.getElementById(dateId);
  let d = (dateInput && dateInput.value) ? new Date(dateInput.value) : new Date();
  if (isNaN(d.getTime())) d = new Date();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return monthNames[d.getMonth()] + ' ' + d.getFullYear();
}

function autoSelectMonthFromDate(isEdit = false) {
  const dateId = isEdit ? 'edit_date' : 'date';
  const monthId = isEdit ? 'edit_subMonth' : 'subMonth';
  const typeId = isEdit ? 'edit_type' : 'type';

  const dateInput = document.getElementById(dateId);
  if (!dateInput || !dateInput.value) return;
  const d = new Date(dateInput.value);
  if (isNaN(d.getTime())) return;
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthYear = monthNames[d.getMonth()] + ' ' + d.getFullYear();

  // 1. Update main subMonth dropdown if present
  const subMonthSelect = document.getElementById(monthId);
  if (subMonthSelect) {
    const options = Array.from(subMonthSelect.options);
    let match = options.find(o => o.value === monthYear);
    if (!match) {
      const opt = document.createElement('option');
      opt.value = monthYear;
      opt.innerText = monthYear;
      subMonthSelect.appendChild(opt);
    }
    subMonthSelect.value = monthYear;
    const fullTypeVal = document.getElementById(typeId) ? document.getElementById(typeId).value : '|';
    const [typeVal, subtypeVal] = fullTypeVal.split('|');
    if (typeVal === 'Subscription') {
      if (isEdit) autoPopulateEditDescription();
      else autoPopulateDescription();
    }
  }

  // 2. Update all split row subMonth dropdowns
  const splitRows = isEdit ? document.querySelectorAll('.edit-split-row') : document.querySelectorAll('.split-row');
  splitRows.forEach(row => {
    const submonthSelect = row.querySelector(isEdit ? '.edit-split-submonth-select' : '.split-submonth-select');
    if (submonthSelect) {
      const options = Array.from(submonthSelect.options);
      let match = options.find(o => o.value === monthYear);
      if (!match) {
        const opt = document.createElement('option');
        opt.value = monthYear;
        opt.innerText = monthYear;
        submonthSelect.appendChild(opt);
      }
      submonthSelect.value = monthYear;
      autoPopulateSplitRowDescription(row.id, isEdit);
    }
  });
}

function autoPopulateDescription() {
  if (isEditMode) return;

  const entryType = document.getElementById('entryType') ? document.getElementById('entryType').value : 'Cash';
  const descInput = document.getElementById('description');
  if (!descInput) return;

  const isBankAndCategorize = (entryType === 'Bank' && document.getElementById('isAddLedgerType') && document.getElementById('isAddLedgerType').checked);
  if (entryType === 'Bank' && !isBankAndCategorize) return;

  const fullTypeVal = document.getElementById('type') ? document.getElementById('type').value : '|';
  const [typeVal, subtypeVal] = fullTypeVal.split('|');
  const subMonthVal = document.getElementById('subMonth') ? document.getElementById('subMonth').value : '';

  if (typeVal === 'Subscription') {
    const defaultM = subMonthVal || getDefaultSubscriptionMonth(false);
    descInput.value = "Subscription for " + defaultM;
  } else if (typeVal === 'Offering') {
    descInput.value = "Offertory";
  } else if (subtypeVal === 'Salary Pr. T.T.Simon') {
    descInput.value = "Salary for Pr. T.T.Simon";
  } else if (subtypeVal === 'Allowance Pr. T.T.Simon') {
    descInput.value = "Allowance for Pr. T.T.Simon";
  } else if (typeVal === 'Contra') {
    descInput.value = subtypeVal === 'Cash Deposit (Contra)' ? "Cash Deposit to Bank" : "Cash Withdrawal from Bank";
  } else {
    descInput.value = "";
  }
}

function loadEntryForEdit(vrNo, txId, entryType) {
  switchTab('editTab');
  const safeVr = (vrNo && vrNo !== '-' && vrNo !== '--') ? vrNo : '';
  document.getElementById('editSearchInput').value = safeVr;
  if (txId) {
    window._editTargetTxId = txId;
  }
  if (entryType) {
    window._editTargetEntryType = entryType;
  } else {
    window._editTargetEntryType = null;
  }
  fetchEntryToEdit();
}

async function fetchEntryToEdit() {
  const vrVal = document.getElementById('editSearchInput').value.trim();
  const targetId = window._editTargetTxId || null;
  const targetEntryType = window._editTargetEntryType || null;
  window._editTargetTxId = null; // consume it
  window._editTargetEntryType = null; // consume it

  if (!vrVal && !targetId) {
    alert("Please enter a Voucher Number to search. 🔍");
    return;
  }

  document.getElementById('editFormCard').style.display = 'none';
  const statusCard = document.getElementById('editActionStatusCard');
  if (statusCard) statusCard.style.display = 'none';

  const searchBtn = document.getElementById('searchVoucherBtn');
  const oldBtnText = searchBtn ? searchBtn.innerHTML : "Search Voucher 🔍";
  if (searchBtn) {
    searchBtn.innerHTML = '⏳ Searching...';
    searchBtn.disabled = true;
  }

  let foundTx = null;
  let matchingTxs = [];

  // 1. Direct fresh database query from PostgreSQL
  try {
    const lookupUrl = `/api/sync/transactions/lookup?vrNo=${encodeURIComponent(vrVal)}${targetId ? `&id=${encodeURIComponent(targetId)}` : ''}${targetEntryType ? `&entryType=${encodeURIComponent(targetEntryType)}` : ''}`;
    const fetchFn = typeof window !== 'undefined' && window.apiFetch ? window.apiFetch : fetch;
    const resp = await fetchFn(lookupUrl);
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.success && data.found && data.tx) {
        foundTx = data.tx;
        matchingTxs = data.splitItems && data.splitItems.length > 0 ? data.splitItems : [foundTx];
      }
    }
  } catch (err) {
    console.warn('Direct database lookup failed, falling back to local memory:', err);
  }

  // 2. Fallback to in-memory store if DB lookup returned nothing
  if (!foundTx) {
    const cleanVrSearch = normalizeVrLocally(vrVal);
    const allGen = (typeof allTimeGeneralTxList !== 'undefined' && allTimeGeneralTxList.length > 0) ? allTimeGeneralTxList : [];
    const allBank = (typeof loadedBankBookTransactions !== 'undefined' && loadedBankBookTransactions.length > 0) ? loadedBankBookTransactions : [];

    if (targetEntryType === 'Bank' || (vrVal && vrVal.toLowerCase().endsWith('/b'))) {
      if (targetId) foundTx = allBank.find(t => String(t.id) === String(targetId));
      if (!foundTx && cleanVrSearch) foundTx = allBank.find(t => normalizeVrLocally(t.vrNo) === cleanVrSearch || normalizeVrLocally(t.rcptNo) === cleanVrSearch || normalizeVrLocally(t.payNo) === cleanVrSearch);
    } else {
      if (targetId) foundTx = allGen.find(t => String(t.id) === String(targetId)) || allBank.find(t => String(t.id) === String(targetId));
      if (!foundTx && cleanVrSearch) {
        foundTx = allGen.find(t => normalizeVrLocally(t.vrNo) === cleanVrSearch || normalizeVrLocally(t.rcptNo) === cleanVrSearch || normalizeVrLocally(t.payNo) === cleanVrSearch)
          || allBank.find(t => normalizeVrLocally(t.vrNo) === cleanVrSearch || normalizeVrLocally(t.rcptNo) === cleanVrSearch || normalizeVrLocally(t.payNo) === cleanVrSearch);
      }
    }

    if (foundTx) {
      const cleanVr = normalizeVrLocally(foundTx.vrNo || foundTx.rcptNo || foundTx.payNo || vrVal);

      if (foundTx.splitGroupId) {
        matchingTxs = allGen.filter(t => t.splitGroupId === foundTx.splitGroupId);
        if (matchingTxs.length === 0) {
          matchingTxs = allBank.filter(t => t.splitGroupId === foundTx.splitGroupId);
        }
      }

      if (matchingTxs.length === 0) {
        matchingTxs = allGen.filter(t => normalizeVrLocally(t.vrNo) === cleanVr || normalizeVrLocally(t.rcptNo) === cleanVr || normalizeVrLocally(t.payNo) === cleanVr);
        if (matchingTxs.length === 0) {
          matchingTxs = allBank.filter(t => normalizeVrLocally(t.vrNo) === cleanVr || normalizeVrLocally(t.rcptNo) === cleanVr || normalizeVrLocally(t.payNo) === cleanVr);
        }
      }
      if (matchingTxs.length === 0) {
        matchingTxs = [foundTx];
      }
    }
  }

  if (searchBtn) {
    searchBtn.innerHTML = oldBtnText;
    searchBtn.disabled = false;
  }

  if (matchingTxs.length > 0 && foundTx) {
    const firstTx = matchingTxs[0];
    const isSplit = (matchingTxs.length > 1) || !!firstTx.isSplitEntry;
    const res = {
      success: true,
      found: true,
      id: firstTx.id,
      date: firstTx.date,
      vrNo: firstTx.rcptNo || firstTx.payNo || firstTx.vrNo,
      accountName: firstTx.accountName || firstTx.account_name || firstTx.name || '',
      address: firstTx.address || resolveMemberAddress(firstTx) || '',
      memberCode: firstTx.memberCode || firstTx.member_code || getMemberCode(firstTx.accountName || firstTx.name, firstTx.address),
      phone: firstTx.phone || '',
      memberId: firstTx.memberId || firstTx.member_id || null,
      description: firstTx.description || firstTx.particulars,
      amount: firstTx.receipt || firstTx.payment || firstTx.payments || firstTx.amount || "",
      payment: firstTx.payment || firstTx.payments || "",
      receipt: firstTx.receipt || "",
      type: firstTx.type || firstTx.category,
      subtype: firstTx.subtype || firstTx.category,
      subMonth: firstTx.subMonth,
      entryType: firstTx.entryType || (firstTx.bankAccount ? 'Bank' : 'Cash'),
      bankAccount: firstTx.bankAccount || firstTx.account,
      bankSubtype: firstTx.bankSubtype || firstTx.category,
      addToCashBook: firstTx.addToCashBook,
      isCheque: firstTx.isCheque,
      chequeNo: firstTx.chequeNo,
      mode: firstTx.mode,
      transactionId: firstTx.transactionId,
      splitGroupId: firstTx.splitGroupId,
      isSplitEntry: isSplit,
      splitItems: matchingTxs,
      fromGeneral: true
    };
    onEntryFetched(res, vrVal);
  } else {
    alert("Oops! We couldn't find Voucher #" + vrVal + ". Please check the number and try again. 😕");
  }
}

function onEntryFetched(res, vrVal) {
  if (res && res.success && res.found) {
    const isBank = (res.entryType && String(res.entryType).toLowerCase() === 'bank');
    const mStr = String(res.mode || '').toLowerCase();

    if (isBank) {
      if (mStr.includes('credit') || mStr.includes('receipt') || mStr.includes('deposit') || Number(res.credit || res.receipt || 0) > 0) {
        res.mode = 'Receipt';
      } else {
        res.mode = 'Payment';
      }
    } else {
      // Fix mode for Charity and legacy entries
      if (res.type === 'Charity' && res.subtype) {
        const subLower = res.subtype.toLowerCase();
        if (subLower.includes('paid')) res.mode = 'Payment';
        else if (subLower.includes('received')) res.mode = 'Receipt';
      }
      if (!res.mode) {
        if (res.payment && Number(res.payment) > 0) res.mode = 'Payment';
        else res.mode = 'Receipt';
      }
    }

    isEditMode = true;
    originalEditVrNo = res.vrNo || vrVal;
    window.originalEditId = res.id;
    window.originalEditEntryType = res.entryType || (isBank ? "Bank" : "Cash");
    window.originalEditAllTxIds = (res.splitItems || []).map(t => String(t.id));
    window.originalEditSplitGroupId = res.splitGroupId || (res.splitItems && res.splitItems.find(t => t.splitGroupId) ? res.splitItems.find(t => t.splitGroupId).splitGroupId : '');

    // Show Form Card
    document.getElementById('editFormCard').style.display = 'block';

    // Load values
    document.getElementById('edit_date').value = res.date || "";
    document.getElementById('edit_accountName').value = res.accountName || "";
    if (document.getElementById('edit_transactionId')) document.getElementById('edit_transactionId').value = res.transactionId || "";

    onEditAccountNameChanged();
    if (res.address) {
      document.getElementById('edit_addressInput').value = res.address;
      document.getElementById('edit_addressText').innerText = res.address;
      document.getElementById('edit_addressPreview').style.display = 'block';
    } else {
      document.getElementById('edit_addressInput').value = "";
      document.getElementById('edit_addressText').innerText = "--";
      document.getElementById('edit_addressPreview').style.display = 'none';
    }

    window.originalEditMode = res.mode;
    window.originalEditType = res.type || "";
    window.originalEditSubtype = res.subtype || "";
    window.originalEditBankSubtype = res.bankSubtype || "";

    setEditEntryType(res.entryType || (isBank ? "Bank" : "Cash"));
    setEditMode(res.mode || "Receipt");

    let displayVr = originalEditVrNo;
    if (isBank) {
      displayVr = displayVr.replace(/\/b$/i, '');
      if (displayVr === '-' || displayVr === '--') displayVr = '';
      if (document.getElementById('edit_bankAccountSelect')) {
        document.getElementById('edit_bankAccountSelect').value = res.bankAccount || "State Bank of India";
      }
      if (document.getElementById('edit_bankSubtypeSelect')) {
        document.getElementById('edit_bankSubtypeSelect').value = res.bankSubtype || "";
      }
      if (document.getElementById('edit_addToCashBook')) {
        document.getElementById('edit_addToCashBook').checked = !!res.addToCashBook;
      }
      onEditBankSubtypeChanged();

      // Restore Voucher and Ledger Toggles for Bank entries
      const hadLedgerType = res.isSplitEntry || (res.type && res.type !== 'Bank');
      const ledgerToggle = document.getElementById('edit_isAddLedgerType');
      if (ledgerToggle) {
        ledgerToggle.checked = hadLedgerType;
        toggleEditLedgerInput(hadLedgerType);
      }
      updateEditTypeOptions(res.mode || "Receipt", res.type, res.subtype);
      if (hadLedgerType && !res.isSplitEntry) {
        onEditTypeChanged();
      }

    } else {
      updateEditTypeOptions(res.mode || "Receipt", res.type || "", res.subtype || "");
      if (!res.isSplitEntry) {
        onEditTypeChanged();
      }
    }

    document.getElementById('edit_vrNo').value = displayVr;

    const isContraForEdit = (res.type === 'Contra' || res.bankSubtype === 'Cash Deposit (Contra)' || res.bankSubtype === 'Cash Withdrawal (Contra)' || (res.subtype && res.subtype.includes('(Contra)')));
    const editContraContainer = document.getElementById('edit_contraNumbersContainer');
    const editContraInput = document.getElementById('edit_contraBankVrNo');
    const editContraLabel = document.getElementById('edit_contraBankVrLabelText');
    if (isContraForEdit) {
      if (editContraContainer) editContraContainer.style.display = 'block';
      const isDeposit = (res.bankSubtype === 'Cash Deposit (Contra)' || (res.subtype && res.subtype.includes('Deposit')));
      if (editContraLabel) {
        editContraLabel.textContent = isDeposit ? "🏦 Bank Receipt No" : "🏦 Bank Payment Vr. No";
      }
      if (editContraInput) {
        editContraInput.value = res.contra_vr_no || res.contraVrNo || res.bank_vr_no || res.bankVrNo || res.cash_vr_no || res.cashVrNo || '';
      }
    } else {
      if (editContraContainer) editContraContainer.style.display = 'none';
      if (editContraInput) editContraInput.value = '';
    }

    // Restore Cheque Fields
    if (res.isCheque || (res.chequeNo && String(res.chequeNo).trim() !== '')) {
      if (document.getElementById('edit_isCheque')) document.getElementById('edit_isCheque').checked = true;
      if (document.getElementById('edit_chequeNo')) document.getElementById('edit_chequeNo').value = res.chequeNo || "";
      toggleEditChequeInput(true);
    } else {
      if (document.getElementById('edit_isCheque')) document.getElementById('edit_isCheque').checked = false;
      if (document.getElementById('edit_chequeNo')) document.getElementById('edit_chequeNo').value = "";
      toggleEditChequeInput(false);
    }

    if (typeof checkTypeChangeWarning === 'function') {
      checkTypeChangeWarning();
    }

    const isSplitCheckbox = document.getElementById('edit_isSplitEntry');
    if (isSplitCheckbox) {
      if (res.isSplitEntry && res.splitItems && res.splitItems.length > 0) {
        updateEditTypeOptions(res.mode || "Receipt");
        isSplitCheckbox.checked = true;
        toggleEditSplitEntryMode();

        const wrapper = document.getElementById('editSplitRowsWrapper');
        if (wrapper) wrapper.innerHTML = '';

        editSplitRowCount = 0;
        let totalAmt = 0;

        res.splitItems.forEach(item => {
          let itemAmt = parseFloat(item.receipt || item.payment || item.payments || item.amount || 0);
          totalAmt += itemAmt;

          let rowDesc = (item.description && item.description !== 'Bank Transfer') ? item.description : "";
          let rowType = item.type || "";
          let rowSubtype = item.subtype || "";
          let rowMonth = item.subMonth || item.month || "";

          // Smart recovery if entry was saved without category/type
          if (!rowType || rowType === 'Bank') {
            if (rowMonth || (rowDesc && rowDesc.toLowerCase().includes('subscription'))) {
              rowType = 'Subscription';
            } else if (rowDesc && rowDesc.toLowerCase().includes('offertory')) {
              rowType = 'Offering';
            } else if (rowSubtype) {
              rowType = rowSubtype.includes('Charity') ? 'Charity' : 'Ledger';
            } else {
              rowType = 'Subscription';
            }
          }

          addEditSplitRow({
            type: rowType,
            subtype: rowSubtype,
            month: rowMonth,
            description: rowDesc,
            amount: itemAmt
          });
        });

        const editAmtEl = document.getElementById('edit_amount');
        if (editAmtEl) {
          editAmtEl.value = totalAmt > 0 ? totalAmt : "";
        }
        calculateEditSplitTotal();

      } else {
        isSplitCheckbox.checked = false;
        toggleEditSplitEntryMode();

        document.getElementById('edit_description').value = res.description || "";
        const editAmtEl = document.getElementById('edit_amount');
        if (editAmtEl) {
          editAmtEl.value = (res.amount !== undefined && res.amount !== null && res.amount !== "") ? res.amount : "";
          editAmtEl.dispatchEvent(new Event('input'));
        }
      }
    } else {
      document.getElementById('edit_description').value = res.description || "";
      const editAmtEl = document.getElementById('edit_amount');
      if (editAmtEl) {
        editAmtEl.value = (res.amount !== undefined && res.amount !== null && res.amount !== "") ? res.amount : "";
        editAmtEl.dispatchEvent(new Event('input'));
      }
    }

    // Check subscription month
    if (res.type === 'Subscription' && document.getElementById('edit_subMonth')) {
      let m = res.subMonth || (res.description ? res.description.replace("Subscription for ", "").trim() : "");
      if (m) {
        const subMonthSelect = document.getElementById('edit_subMonth');
        let optionExists = Array.from(subMonthSelect.options).some(o => o.value === m);
        if (!optionExists) {
          const opt = document.createElement('option');
          opt.value = m;
          opt.innerText = m;
          subMonthSelect.appendChild(opt);
        }
        subMonthSelect.value = m;
      }
    }

    if (res.fromGeneral) {
      showEditAlert("✏️ Entry #" + originalEditVrNo + " loaded from General Tab!", "success");
    } else {
      showEditAlert("⚠️ Entry #" + originalEditVrNo + " loaded from old Cash Book. Bank & Cheque details are unavailable for old entries.", "warning");
    }
  } else {
    alert("Hmm, we couldn't find that voucher: " + (res.message || "Please check the number. 😕"));
  }
}

function cancelEditMode() {
  isEditMode = false;
}

function setEntryType(type) {
  isEditMode = false;
  document.getElementById('entryType').value = type;

  const btnCash = document.getElementById('btnEntryCash');
  const btnBank = document.getElementById('btnEntryBank');
  const bankAccountWrapper = document.getElementById('bankAccountWrapper');

  const btnReceipt = document.getElementById('btnReceipt');
  const btnPayment = document.getElementById('btnPayment');

  const typeGroup = document.getElementById('typeGroup');

  const ledgerToggleGroup = document.getElementById('ledgerToggleGroup');
  const bankVoucherToggleGroup = document.getElementById('bankVoucherToggleGroup');

  if (type === 'Cash') {
    btnCash.classList.add('active');
    btnBank.classList.remove('active');
    bankAccountWrapper.style.display = 'none';
    if (typeGroup) typeGroup.style.display = 'block';

    if (bankVoucherToggleGroup) bankVoucherToggleGroup.style.display = 'none';
    if (ledgerToggleGroup) ledgerToggleGroup.style.display = 'none';
    document.getElementById('vrInputContainer').style.display = 'block';
    document.getElementById('vrNo').required = true;
    document.getElementById('vrReq').style.display = 'inline';

    btnReceipt.innerHTML = '🟢 Receipt (Money In)';
    btnPayment.innerHTML = '🔴 Payment (Money Out)';
    const transactionIdContainer = document.getElementById('transactionIdContainer');
    if (transactionIdContainer) transactionIdContainer.style.display = 'none';
  } else {
    btnBank.classList.add('active');
    btnCash.classList.remove('active');
    bankAccountWrapper.style.display = 'flex';
    if (typeGroup) typeGroup.style.display = 'none';
    const subTypeGroup = document.getElementById('subTypeGroup');
    const subMonthGroup = document.getElementById('subMonthGroup');

    if (bankVoucherToggleGroup) bankVoucherToggleGroup.style.display = 'block';
    if (ledgerToggleGroup) ledgerToggleGroup.style.display = 'block';

    // Toggle vrInput/type visibility based on categorize checkbox
    toggleLedgerInput(document.getElementById('isAddLedgerType') ? document.getElementById('isAddLedgerType').checked : false);

    btnReceipt.innerHTML = '🟢 Credit (Money In)';
    btnPayment.innerHTML = '🔴 Debit (Money Out)';
    const transactionIdContainer = document.getElementById('transactionIdContainer');
    if (transactionIdContainer) transactionIdContainer.style.display = 'block';
  }

  const mode = document.getElementById('txType') ? document.getElementById('txType').value : 'Receipt';
  setMode(mode);

  if (type === 'Cash') {
    const typeSelect = document.getElementById('type');
    if (typeSelect) {
      if (mode === 'Receipt') {
        const subOpt = Array.from(typeSelect.options).find(o => o.value.startsWith('Subscription'));
        if (subOpt) typeSelect.value = subOpt.value;
      } else {
        const ledgOpt = Array.from(typeSelect.options).find(o => o.value.startsWith('Ledger'));
        if (ledgOpt) typeSelect.value = ledgOpt.value;
      }
    }
    onTypeChanged();

    const subMonthSelect = document.getElementById('subMonth');
    if (subMonthSelect && mode === 'Receipt') {
      const now = new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const currentMonth = monthNames[now.getMonth()];
      const currentYear = now.getFullYear();
      const monthYear = currentMonth + ' ' + currentYear;
      const options = Array.from(subMonthSelect.options);
      const matchingOption = options.find(o => o.value === monthYear);
      if (matchingOption) {
        subMonthSelect.value = monthYear;
      }
      autoPopulateDescription();
    }
  }

}

function handleSaveAsCancelled() {
  const mode = document.getElementById('txType').value;
  const typeStr = mode === 'Receipt' ? "Receipt" : "Voucher";
  if (!confirm(`Are you sure you want to save this ${typeStr} as CANCELLED?\n\nThis will auto-fill the amount to 0 and mark the description as cancelled.`)) return;

  document.getElementById('amount').value = 0;

  // Clear categorizations so it doesn't default to Subscription or pick up unrelated fields
  if (document.getElementById('type')) document.getElementById('type').value = "|";
  if (document.getElementById('subtype')) document.getElementById('subtype').value = "";
  if (document.getElementById('accountName')) document.getElementById('accountName').value = "";
  if (document.getElementById('addressInput')) document.getElementById('addressInput').value = "";
  if (document.getElementById('subMonth')) document.getElementById('subMonth').value = "";

  const descInput = document.getElementById('description');
  descInput.value = "[CANCELLED]";

  const form = document.getElementById('cashBookForm');
  if (form) {
    const amountInput = document.getElementById('amount');
    const oldMin = amountInput.getAttribute('min');
    if (oldMin) amountInput.removeAttribute('min');

    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else {
      handleFormSubmit(new Event('submit', { cancelable: true, bubbles: true }));
    }

    setTimeout(() => {
      if (oldMin) amountInput.setAttribute('min', oldMin);
    }, 500);
  }
}

function handleSaveAndPrint(e) {
  if (e) e.preventDefault();
  window._triggerPrintOnSave = true;
  const form = document.getElementById('cashBookForm');
  if (form) {
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else {
      handleFormSubmit(new Event('submit', { cancelable: true, bubbles: true }));
    }
  }
}

function checkIfVrIsCancelled() {
  if (isEditMode) return;
  const vrNoValue = document.getElementById('vrNo') ? document.getElementById('vrNo').value.trim() : '';
  const warningDiv = document.getElementById('cancelledVrWarning');
  if (!vrNoValue || !warningDiv) return;

  const cleanInput = formatVrNoClean(vrNoValue).toLowerCase();
  const existingTx = currentGeneralTxList.find(tx => formatVrNoClean(tx.vrNo).toLowerCase() === cleanInput);

  const descStr = existingTx ? String(existingTx.description).trim().toLowerCase() : '';
  if (existingTx && (descStr === '[cancelled]' || descStr === 'cancelled')) {
    window._cancelledTxToReuse = existingTx.vrNo;
    warningDiv.style.display = 'flex';
  } else {
    delete window._cancelledTxToReuse;
    warningDiv.style.display = 'none';
  }
}

function loadCancelledEntryForEdit() {
  const vrNo = window._cancelledTxToReuse;
  if (vrNo) {
    const warningDiv = document.getElementById('cancelledVrWarning');
    if (warningDiv) warningDiv.style.display = 'none';
    loadEntryForEdit(vrNo);
  }
}

function handleFormSubmit(e) {
  e.preventDefault();

  const isSplit = document.getElementById('splitEntryToggle') && document.getElementById('splitEntryToggle').checked;
  if (isSplit && !isEditMode) {
    handleSplitFormSubmit(e);
    return;
  }

  const mode = document.getElementById('txType').value;
  const amountVal = parseFloat(String(document.getElementById('amount').value || '').replace(/,/g, '')) || 0;

  if (amountVal < 0 && !isSplit) {
    showAlert("Please enter a valid amount (0 or greater). 💰", "error");
    return;
  }

  let vrNoValue = document.getElementById('vrNo').value.trim();
  const entryTypeVal = document.getElementById('entryType').value;
  const isCheque = document.getElementById('isCheque') ? document.getElementById('isCheque').checked : false;
  const chequeNo = document.getElementById('chequeNo') ? document.getElementById('chequeNo').value.trim() : "";

  if (vrNoValue === "" && isCheque && chequeNo) {
    vrNoValue = chequeNo;
  }

  if (entryTypeVal === 'Bank' && vrNoValue !== "") {
    if (!vrNoValue.endsWith('/B')) {
      vrNoValue = vrNoValue + '/B';
    }
  }

  let formReceipt = (mode === 'Receipt') ? amountVal : "";
  let formPayments = (mode === 'Payment') ? amountVal : "";

  const bankSubtypeStr = document.getElementById('bankSubtypeSelect') ? document.getElementById('bankSubtypeSelect').value : "";
  if (entryTypeVal === 'Bank') {
    if (bankSubtypeStr === 'Cash Deposit (Contra)') {
      // Cash leaves cash box (Payment) to enter Bank (Receipt)
      formReceipt = "";
      formPayments = amountVal;
    } else if (bankSubtypeStr === 'Cash Withdrawal (Contra)') {
      // Cash enters cash box (Receipt) from Bank (Payment)
      formReceipt = amountVal;
      formPayments = "";
    }
  }

  const fullTypeVal = document.getElementById('type') ? document.getElementById('type').value : '|';
  const [parsedType, parsedSubtype] = fullTypeVal.split('|');

  const contraBankVrInput = document.getElementById('contraBankVrNo');
  const contraBankVrVal = contraBankVrInput ? contraBankVrInput.value.trim() : '';

  const formPayload = {
    action: isEditMode ? "edit" : "add",
    originalVrNo: isEditMode ? originalEditVrNo : document.getElementById('vrNo').value,
    date: document.getElementById('date').value,
    vrNo: vrNoValue,
    contraVrNo: contraBankVrVal,
    contra_vr_no: contraBankVrVal,
    bankVrNo: contraBankVrVal,
    accountName: document.getElementById('accountName').value,
    address: document.getElementById('addressInput').value,
    description: document.getElementById('description').value,
    receipt: formReceipt,
    payment: formPayments,
    type: (entryTypeVal === 'Bank' && !(document.getElementById('isAddLedgerType') && document.getElementById('isAddLedgerType').checked)) 
      ? (bankSubtypeStr.includes('Interest') ? 'Bank Interest (Income)' : (bankSubtypeStr.includes('Contra') ? 'Contra' : (bankSubtypeStr || 'Bank'))) 
      : parsedType,
    subtype: (entryTypeVal === 'Bank' && !(document.getElementById('isAddLedgerType') && document.getElementById('isAddLedgerType').checked)) 
      ? (bankSubtypeStr || "") 
      : (parsedSubtype || ""),
    category: ((entryTypeVal === 'Bank' && !(document.getElementById('isAddLedgerType') && document.getElementById('isAddLedgerType').checked)) 
      ? (bankSubtypeStr || 'Bank') 
      : (parsedType === 'Ledger' && parsedSubtype ? parsedSubtype : (parsedSubtype || parsedType || 'General'))),
    subMonth: (entryTypeVal === 'Bank' && !(document.getElementById('isAddLedgerType') && document.getElementById('isAddLedgerType').checked)) ? "" : (document.getElementById('subMonth') ? document.getElementById('subMonth').value : ""),
    entryType: document.getElementById('entryType').value,
    bankAccount: document.getElementById('bankAccountSelect') ? document.getElementById('bankAccountSelect').value : "State Bank of India",
    bankSubtype: (entryTypeVal === 'Cash' && parsedType === 'Contra') ? parsedSubtype : (document.getElementById('bankSubtypeSelect') ? document.getElementById('bankSubtypeSelect').value : ""),
    addToCashBook: document.getElementById('addToCashBook') ? document.getElementById('addToCashBook').checked : false,
    isAddLedgerType: document.getElementById('isAddLedgerType') ? document.getElementById('isAddLedgerType').checked : false,
    isCheque: document.getElementById('isCheque') ? document.getElementById('isCheque').checked : false,
    chequeNo: document.getElementById('chequeNo') ? document.getElementById('chequeNo').value : "",
    mode: mode,
    transactionId: document.getElementById('transactionId') ? document.getElementById('transactionId').value.trim() : ""
  };

  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const saveAndPrintBtn = document.getElementById('saveAndPrintBtn');

  const savedTxObj = { ...formPayload };
  const newId = Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  formPayload.id = newId;
  savedTxObj.id = newId;

  // Optimistically update in-memory general transactions
  allTimeGeneralTxList.push(formPayload);
  allTimeTxList.push(formPayload);
  currentLoadedTxList = filterListByFY(allTimeTxList);
  currentGeneralTxList = filterListByFY(allTimeGeneralTxList);

  let mirrorPayload = null;
  if (entryTypeVal === 'Bank' && formPayload.bankSubtype === 'Inter-Bank Transfer (Contra)') {
    const otherBank = (formPayload.bankAccount === "SBI Fixed Deposit") ? "State Bank of India" : "SBI Fixed Deposit";
    const mirrorMode = (mode === 'Receipt') ? 'Payment' : 'Receipt';
    mirrorPayload = {
      id: newId + "_mirror",
      rcptNo: (mirrorMode === 'Receipt') ? vrNoValue : "",
      payNo: (mirrorMode === 'Payment') ? vrNoValue : "",
      chequeNo: isCheque ? chequeNo : "",
      date: formPayload.date,
      accountName: "Inter-Bank Transfer",
      address: "",
      description: `Transfer ${mirrorMode === 'Receipt' ? 'from' : 'to'} ${formPayload.bankAccount}` + (formPayload.description ? ` (${formPayload.description})` : ""),
      amount: amountVal,
      type: "",
      subtype: "",
      subMonth: "",
      entryType: "Bank",
      bankAccount: otherBank,
      bankSubtype: "Inter-Bank Transfer (Contra)",
      addToCashBook: false,
      isAddLedgerType: false,
      isCheque: isCheque,
      mode: mirrorMode
    };
  }

  const saves = [
    db.collection("transactions").doc(String(newId)).set(formPayload)
  ];
  const isContraCash = (entryTypeVal === 'Cash' && parsedType === 'Contra');
  if (formPayload.entryType === 'Bank' || isContraCash) {
    const isContraEntry = isContraCash || formPayload.bankSubtype === 'Cash Deposit (Contra)' || formPayload.bankSubtype === 'Cash Withdrawal (Contra)';
    const bSubtype = isContraCash ? parsedSubtype : (formPayload.bankSubtype || '');

    let bankMode;
    if (bSubtype === 'Cash Deposit (Contra)' || bSubtype.toLowerCase().includes('cash deposit')) {
      bankMode = "Credit (Receipt)";
    } else if (bSubtype === 'Cash Withdrawal (Contra)' || bSubtype.toLowerCase().includes('cash withdrawal')) {
      bankMode = "Debit (Payment)";
    } else if (isContraCash) {
      bankMode = (mode === 'Receipt' ? "Debit (Payment)" : "Credit (Receipt)");
    } else {
      bankMode = (formPayload.mode === 'Receipt' || formPayload.mode === 'Credit (Receipt)') ? "Credit (Receipt)" : "Debit (Payment)";
    }

    const isCredit = bankMode.includes('Credit') || bankMode.includes('Receipt');
    const accName = formPayload.accountName || '';
    const memAddr = formPayload.address || '';
    const memObj = getMemberObject(accName, memAddr);
    const resolvedCode = getMemberCode(accName, memAddr);
    const resolvedAddress = memAddr || memObj.address || '';
    const resolvedPhone = memObj.phone || '';
    const resolvedMemberId = memObj.id || null;

    const bankPayload = {
      id: newId,
      date: formPayload.date,
      vrNo: isContraEntry ? (contraBankVrVal || (formPayload.vrNo ? `${formPayload.vrNo}/B` : '-')) : (formPayload.vrNo || '-'),
      voucher_no: isContraEntry ? (contraBankVrVal || (formPayload.vrNo ? `${formPayload.vrNo}/B` : '-')) : (formPayload.vrNo || '-'),
      contraVrNo: formPayload.vrNo,
      contra_vr_no: formPayload.vrNo,
      cashVrNo: formPayload.vrNo,
      cash_vr_no: formPayload.vrNo,
      accountName: accName,
      account_name: accName,
      name: accName,
      memberCode: (resolvedCode && resolvedCode !== '-') ? resolvedCode : '',
      member_code: (resolvedCode && resolvedCode !== '-') ? resolvedCode : '',
      address: resolvedAddress,
      phone: resolvedPhone,
      memberId: resolvedMemberId,
      member_id: resolvedMemberId,
      description: formPayload.accountName && formPayload.description ? formPayload.accountName + " - " + formPayload.description : (formPayload.accountName || formPayload.description || '-'),
      particulars: formPayload.description || formPayload.accountName || '-',
      amount: amountVal,
      receipt: isCredit ? amountVal : "",
      payment: !isCredit ? amountVal : "",
      credit: isCredit ? amountVal : 0,
      debit: !isCredit ? amountVal : 0,
      account: formPayload.bankAccount,
      bankAccount: formPayload.bankAccount,
      mode: bankMode,
      bankSubtype: bSubtype,
      category: formPayload.category || bSubtype || (bSubtype.includes('Interest') ? 'Bank Interest (Income)' : 'Bank'),
      subtype: formPayload.subtype || bSubtype || '',
      type: formPayload.type || (bSubtype.includes('Interest') ? 'Bank Interest (Income)' : 'Bank'),
      subMonth: formPayload.subMonth || '',
      inCashBook: isContraEntry ? true : (formPayload.addToCashBook === true),
      addToCashBook: isContraEntry ? true : (formPayload.addToCashBook === true),
      entryType: "Bank",
      isCheque: formPayload.isCheque,
      chequeNo: formPayload.chequeNo || "",
      transactionId: formPayload.transactionId || ""
    };
    allTimeBankBookList.push(bankPayload);
    loadedBankBookTransactions = filterListByFY(allTimeBankBookList);
    saves.push(
      db.collection("bank_transactions").doc(String(newId)).set(bankPayload)
    );
  }
  if (mirrorPayload) {
    saves.push(
      db.collection("transactions").doc(String(newId + 1)).set(mirrorPayload)
    );
    const isContraEntry2 = (mirrorPayload.bankSubtype === 'Cash Deposit (Contra)' || mirrorPayload.bankSubtype === 'Cash Withdrawal (Contra)');
    const mirrorBankPayload = {
      id: newId + 1,
      date: mirrorPayload.date,
      vrNo: mirrorPayload.vrNo || '-',
      description: mirrorPayload.description || '-',
      amount: mirrorPayload.amount,
      account: mirrorPayload.bankAccount,
      mode: (mirrorPayload.mode === 'Receipt') ? "Credit (Receipt)" : "Debit (Payment)",
      bankSubtype: mirrorPayload.bankSubtype || '',
      inCashBook: isContraEntry2 ? true : mirrorPayload.addToCashBook,
      addToCashBook: isContraEntry2 ? true : mirrorPayload.addToCashBook,
      entryType: "Bank",
      isCheque: mirrorPayload.isCheque,
      chequeNo: mirrorPayload.chequeNo || "",
      transactionId: formPayload.transactionId || ""
    };
    saves.push(
      db.collection("bank_transactions").doc(String(newId + 1)).set(mirrorBankPayload)
    );
  }

  if (mode === 'OpeningBalance' || (formPayload.description && formPayload.description.toLowerCase().includes('opening balance'))) {
    const txD = parseTxDate(formPayload) || new Date();
    const txM = txD.getMonth();
    const txY = txD.getFullYear();
    const fyKey = (txM >= 3) ? (txY + "-" + (txY + 1)) : ((txY - 1) + "-" + txY);

    let field = "cash";
    if (formPayload.entryType === "Bank") {
      if (formPayload.bankAccount === "SBI Fixed Deposit") field = "fd";
      else field = "sbi";
    }

    if (!window.openingBalancesStore[fyKey]) {
      window.openingBalancesStore[fyKey] = { cash: 0, sbi: 0, fd: 0 };
    }
    window.openingBalancesStore[fyKey][field] = amountVal;

    saves.push(
      db.collection("opening_balances").doc(fyKey).set(window.openingBalancesStore[fyKey])
    );
    saves.push(
      db.collection("opening_balances").doc("default").set(window.openingBalancesStore[fyKey])
    );
  }

  if (window.pendingSuspenseConversionId) {
    saves.push(db.collection("suspense_transactions").doc(String(window.pendingSuspenseConversionId)).delete());
  }

  // INSTANT OPTIMISTIC RESET & FEEDBACK
  onSubmitSuccess("Success", mode, savedTxObj);

  // Background Cloud Sync
  Promise.all(saves)
    .then(() => {
      if (window.pendingSuspenseConversionId) {
        delete window.pendingSuspenseConversionId;
      }

      // Auto-add account name to members directory if not already present
      const newAccName = (formPayload.accountName || '').trim();
      const skipTypes = ['offering', 'offertory', ''];
      const typeStr = (formPayload.type || '').toLowerCase();
      if (newAccName && newAccName !== '-' && !skipTypes.some(s => s && typeStr.includes(s))) {
        const rawNew = getRawName(newAccName).toLowerCase().trim();
        const alreadyExists = (membersDataStore || []).some(m => {
          if (!m || !m.name) return false;
          const mn = (m.name || '').toLowerCase().trim();
          const mr = getRawName(mn).toLowerCase().trim();
          return mn === newAccName.toLowerCase().trim() || mr === rawNew || (m._aliases && m._aliases.includes(newAccName.toLowerCase().trim()));
        });
        if (!alreadyExists && rawNew) {
          const newMember = { name: newAccName, address: formPayload.address || 'Thadiyoor' };
          db.collection("members").add(newMember).then((docRef) => {
            newMember._docId = docRef.id;
            newMember.id = docRef.id;
            globalRawMembers.push(newMember);
            membersDataStore = deduplicateMembersList(globalRawMembers);
            membersDataStore.sort((a, b) => compareNamesIgnoringPrefix(a.name, b.name));
            _memberCodeCache = null;
            if (typeof filterMembersTabList === 'function') filterMembersTabList();
            if (typeof renderMembersDirectoryTab === 'function') renderMembersDirectoryTab();
          }).catch(err => console.warn("⚠️ Could not auto-add member:", err));
        }
      }
    })
    .catch(err => {
      console.error("Cloud sync error:", err);
      showAlert("⚠️ Cloud sync notice: " + (err.message || err), "error");
    });
}

function onSubmitSuccess(res, mode, savedTx) {
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const saveAndPrintBtn = document.getElementById('saveAndPrintBtn');

  if (submitBtn) submitBtn.disabled = false;
  if (saveAndPrintBtn) saveAndPrintBtn.disabled = false;
  hideGlobalLoading();

  const autoPrint = !!window._triggerPrintOnSave;
  window._triggerPrintOnSave = false;

  if (res === "Success" || (res && res.success !== false)) {
    if (isEditMode) {
      showAlert("Great job! Your entry is updated successfully! ✨", "success");
      if (typeof speakSuccessMessage === 'function') speakSuccessMessage(savedTx || { mode: mode }, "updated");
      cancelEditMode();
    } else {
      if ((mode === 'Receipt' || mode === 'OpeningBalance') && savedTx) {
        window.lastSavedReceiptTx = savedTx;
        if (savedTx.type === 'Subscription' && savedTx.accountName && savedTx.subMonth) {
          const accLower = savedTx.accountName.trim().toLowerCase();
          const addrLower = (savedTx.address || '').trim().toLowerCase();
          const mapKey = addrLower ? (accLower + '|' + addrLower) : accLower;
          if (!subscriptionsPaidMap[mapKey]) subscriptionsPaidMap[mapKey] = [];
          subscriptionsPaidMap[mapKey].push(savedTx.subMonth.toLowerCase());
        }
        showAlert(`Great job! Receipt #${savedTx.vrNo} is saved successfully! 🎉`, "success");
        if (typeof speakSuccessMessage === 'function') {
          speakSuccessMessage(savedTx, 'added');
        }
        if (autoPrint) {
          openReceiptModal(savedTx);
        }
      } else if (mode === 'Payment' && savedTx) {
        window.lastSavedPaymentTx = savedTx;
        showAlert(`Great job! Payment #${savedTx.vrNo} is saved successfully! ✨`, "success");
        if (typeof speakSuccessMessage === 'function') {
          speakSuccessMessage(savedTx, 'added');
        }
        if (autoPrint) {
          openPaymentVoucherModal(savedTx);
        }
      } else {
        showAlert("Great job! Your entry is submitted successfully! 🎉", "success");
        if (typeof speakSuccessMessage === 'function') speakSuccessMessage(savedTx || { mode: mode }, 'added');
      }

      const submittedVr = savedTx ? (extractBaseNum(savedTx.vrNo) || 0) : 0;
      if (submittedVr > 0 && submittedVr < 100000) {
        if (mode === 'Receipt') {
          if (submittedVr >= nextReceiptVrNo) nextReceiptVrNo = submittedVr + 1;
        } else {
          if (submittedVr >= nextPaymentVrNo) nextPaymentVrNo = submittedVr + 1;
        }
      }

      const submittedContraVr = savedTx ? (extractBaseNum(savedTx.contraVrNo || savedTx.contra_vr_no) || 0) : 0;
      if (submittedContraVr > 0 && submittedContraVr < 100000) {
        if (mode === 'Receipt') {
          if (submittedContraVr >= nextPaymentVrNo) nextPaymentVrNo = submittedContraVr + 1;
        } else {
          if (submittedContraVr >= nextReceiptVrNo) nextReceiptVrNo = submittedContraVr + 1;
        }
      }

      document.getElementById('accountName').value = "";
      document.getElementById('addressInput').value = "";
      document.getElementById('addressPreview').style.display = "none";
      document.getElementById('amount').value = "";
      document.getElementById('description').value = "";
      if (document.getElementById('contraBankVrNo')) document.getElementById('contraBankVrNo').value = "";
      if (document.getElementById('contraNumbersContainer')) document.getElementById('contraNumbersContainer').style.display = "none";

      // Reset toggles and dropdowns to default states
      if (document.getElementById('isCheque')) {
        document.getElementById('isCheque').checked = false;
        if (typeof toggleChequeInput === 'function') toggleChequeInput(false);
      }
      if (document.getElementById('chequeNo')) {
        document.getElementById('chequeNo').value = "";
      }
      if (document.getElementById('isAddLedgerType')) {
        document.getElementById('isAddLedgerType').checked = false;
        if (typeof toggleLedgerInput === 'function') toggleLedgerInput(false);
      }
      if (document.getElementById('bankSubtypeSelect')) {
        document.getElementById('bankSubtypeSelect').value = "Direct Transfer / General";
      }
      if (document.getElementById('type')) {
        document.getElementById('type').value = (mode === 'Receipt') ? 'Subscription' : 'Ledger';
      }

      // Clear split entry toggle and rows
      if (document.getElementById('splitEntryToggle')) {
        if (document.getElementById('splitEntryToggle').checked) {
          document.getElementById('splitEntryToggle').checked = false;
          if (typeof toggleSplitEntryMode === 'function') toggleSplitEntryMode();
        }
      }
      const splitRowsWrapper = document.getElementById('splitRowsWrapper');
      if (splitRowsWrapper) {
        splitRowsWrapper.innerHTML = '';
      }

      setMode(mode);
      autoPopulateDescription();
      // Realtime listener handles UI update
    }
  } else {
    btnText.innerText = isEditMode ? "Update & Sync Entry 🔄" : ((mode === 'Receipt') ? "Save Receipt Entry 🟢" : "Save Payment Entry 🔴");
    showAlert("Oops! Something went wrong: " + res + " 😕", "error");
  }
}

function onSubmitError(err) {
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const saveAndPrintBtn = document.getElementById('saveAndPrintBtn');

  if (submitBtn) submitBtn.disabled = false;
  if (saveAndPrintBtn) saveAndPrintBtn.disabled = false;
  hideGlobalLoading();
  btnText.innerText = "Save Entry";
  showAlert("Connection issue: " + (err.message || err) + " 🔌", "error");
}

function resetEntryFormToDefault() {
  document.getElementById('accountName').value = "";
  document.getElementById('addressInput').value = "";
  if (document.getElementById('addressPreview')) document.getElementById('addressPreview').style.display = "none";
  const amtEl = document.getElementById('amount');
  if (amtEl) {
    amtEl.value = "";
    amtEl.dispatchEvent(new Event('input'));
  }
  document.getElementById('description').value = "";

  const dateEl = document.getElementById('date');
  if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];

  if (window.pendingSuspenseConversionId) {
    delete window.pendingSuspenseConversionId;
  }

  setMode('Receipt');
  setEntryType('Cash');
  hideAlert();
  if (typeof checkIfVrIsCancelled === 'function') checkIfVrIsCancelled();
}

// ============================================================
// EDITING SCREEN JS HANDLERS
// ============================================================
let editTabSubTypesConfig = {
  "Ledger": [
    "General Expenses", "Printing and Stationery", "Electricity Expenses Church", "Electricity Expenses Parcenage",
    "Lords Supper Sunday School Expenses", "Salary Pr. T.T.Simon", "Allowance Pr. T.T.Simon", "Church Maintenance",
    "General Body Anniversary Meeting Expenses", "Fasting wednesday Prayer Expenses", "Drinking Water",
    "Church Cleaning Expenses", "Conveyance Expenses", "Suspenses", "Guest Visiting Pastors", "Generator Expenses",
    "Church Building Land Taxes", "IPC Church Registration Membership", "Kerala Water Authority for water Supply"
  ],
  "Charity": ["Charity Paid", "Charity Received"],
  "Other Income": ["Donations", "First fruits", "Anniversary Contributions Received", "Sodari Samajam"]
};

function setEditMode(mode) {
  const mLower = String(mode || '').toLowerCase();
  const isReceipt = (mLower === 'receipt' || mLower.includes('credit') || mLower.includes('deposit'));
  document.getElementById('edit_txType').value = isReceipt ? 'Receipt' : 'Payment';

  const formCard = document.getElementById('editFormCard');
  const btnReceipt = document.getElementById('edit_btnReceipt');
  const btnPayment = document.getElementById('edit_btnPayment');
  const vrBadge = document.getElementById('edit_vrBadge');
  const submitBtn = document.getElementById('edit_submitBtn');
  const accountGroup = document.getElementById('edit_accountGroup');
  const editVrLabelText = document.getElementById('edit_vrLabelText');
  const editAmountLabelText = document.getElementById('edit_amountLabelText');
  const editChequeToggleGroup = document.getElementById('edit_chequeToggleGroup');
  const editIsCheque = document.getElementById('edit_isCheque');
  const editChequeInputGroup = document.getElementById('edit_chequeInputGroup');

  if (formCard) {
    if (isReceipt) formCard.classList.remove('payment-active');
    else formCard.classList.add('payment-active');
  }

  const effectiveMode = isReceipt ? 'Receipt' : 'Payment';
  if (effectiveMode === 'Payment') {
    updateEditTypeOptions('Payment', 'Ledger', 'General Expenses');
  } else {
    updateEditTypeOptions('Receipt');
  }
  const entryType = document.getElementById('edit_entryType') ? document.getElementById('edit_entryType').value : 'Cash';

  if (editChequeToggleGroup) {
    if (entryType === 'Bank') {
      editChequeToggleGroup.style.display = 'block';
    } else {
      editChequeToggleGroup.style.display = 'none';
    }
  }

  if (entryType === 'Bank') {
    updateEditBankSubtypes(effectiveMode);
    const editAccountGroup = document.getElementById('edit_accountGroup');
    if (editAccountGroup) {
      const bankSubtype = document.getElementById('edit_bankSubtypeSelect') ? document.getElementById('edit_bankSubtypeSelect').value : '';
      const isInternal = bankSubtype.includes('Contra') || bankSubtype.includes('Interest') || bankSubtype.includes('Charges');
      editAccountGroup.style.display = isInternal ? 'none' : 'block';
    }
  }

  const suffixSpan = document.getElementById('edit_bankVrSuffix');
  if (entryType === 'Bank') {
    if (suffixSpan) suffixSpan.style.display = 'inline';
  } else {
    if (suffixSpan) suffixSpan.style.display = 'none';
  }

  if (accountGroup) {
    if (entryType === 'Bank') {
      const bankSubtype = document.getElementById('edit_bankSubtypeSelect') ? document.getElementById('edit_bankSubtypeSelect').value : '';
      const isInternal = bankSubtype.includes('Contra') || bankSubtype.includes('Interest') || bankSubtype.includes('Charges');
      accountGroup.style.display = isInternal ? 'none' : 'block';
    } else {
      const fullTypeVal = document.getElementById('edit_type') ? document.getElementById('edit_type').value : '|';
      const isCashContra = fullTypeVal.startsWith('Contra');
      accountGroup.style.display = isCashContra ? 'none' : 'block';
    }
  }

  if (isReceipt) {
    btnReceipt.classList.add('active');
    btnPayment.classList.remove('active');
    if (editVrLabelText) editVrLabelText.textContent = "🔢 Receipt No ";
    vrBadge.className = "badge badge-receipt";
    vrBadge.innerText = (entryType === 'Bank') ? "Credit" : "Receipt";
    if (editAmountLabelText) editAmountLabelText.textContent = "💰 Receipt Amount (₹) ";
    submitBtn.className = "edit-btn-update receipt-mode";
    if (document.getElementById('edit_cancelVoucherBtn')) {
      document.getElementById('edit_cancelVoucherBtn').innerHTML = "🚫 Cancel Receipt";
    }
  } else {
    btnPayment.classList.add('active');
    btnReceipt.classList.remove('active');
    if (editVrLabelText) editVrLabelText.textContent = "🔢 Payment Vr. No ";
    vrBadge.className = "badge badge-payment";
    vrBadge.innerText = (entryType === 'Bank') ? "Debit" : "Payment";
    if (editAmountLabelText) editAmountLabelText.textContent = "💰 Payment Amount (₹) ";
    submitBtn.className = "edit-btn-update payment-mode";
    if (document.getElementById('edit_cancelVoucherBtn')) {
      document.getElementById('edit_cancelVoucherBtn').innerHTML = "🚫 Cancel Voucher";
    }
  }

  onEditTypeChanged();
}

function setEditEntryType(type) {
  const isBank = (type && type.toLowerCase() === 'bank');
  document.getElementById('edit_entryType').value = isBank ? 'Bank' : 'Cash';

  const btnCash = document.getElementById('edit_btnEntryCash');
  const btnBank = document.getElementById('edit_btnEntryBank');
  const bankAccountWrapper = document.getElementById('edit_bankAccountWrapper');

  const btnReceipt = document.getElementById('edit_btnReceipt');
  const btnPayment = document.getElementById('edit_btnPayment');

  const typeGroup = document.getElementById('edit_typeGroup');

  const editLedgerToggleGroup = document.getElementById('edit_ledgerToggleGroup');
  const editBankVoucherToggleGroup = document.getElementById('edit_bankVoucherToggleGroup');

  if (!isBank) {
    btnCash.classList.add('active');
    btnBank.classList.remove('active');
    bankAccountWrapper.style.display = 'none';
    if (typeGroup) typeGroup.style.display = 'block';

    if (editBankVoucherToggleGroup) editBankVoucherToggleGroup.style.display = 'none';
    if (editLedgerToggleGroup) editLedgerToggleGroup.style.display = 'none';
    if (document.getElementById('edit_vrInputContainer')) document.getElementById('edit_vrInputContainer').style.display = 'block';
    if (document.getElementById('edit_vrNo')) document.getElementById('edit_vrNo').required = true;
    if (document.getElementById('edit_vrReq')) document.getElementById('edit_vrReq').style.display = 'inline';

    btnReceipt.innerHTML = '🟢 Receipt (Money In)';
    btnPayment.innerHTML = '🔴 Payment (Money Out)';
    const editTransactionIdContainer = document.getElementById('edit_transactionIdContainer');
    if (editTransactionIdContainer) editTransactionIdContainer.style.display = 'none';
  } else {
    btnBank.classList.add('active');
    btnCash.classList.remove('active');
    bankAccountWrapper.style.display = 'flex';
    if (typeGroup) typeGroup.style.display = 'none';
    const subTypeGroup = document.getElementById('edit_subTypeGroup');
    const subMonthGroup = document.getElementById('edit_subMonthGroup');

    if (editLedgerToggleGroup) editLedgerToggleGroup.style.display = 'block';

    toggleEditLedgerInput(document.getElementById('edit_isAddLedgerType') ? document.getElementById('edit_isAddLedgerType').checked : false);

    if (document.getElementById('edit_vrNo')) document.getElementById('edit_vrNo').required = false;
    if (document.getElementById('edit_vrReq')) document.getElementById('edit_vrReq').style.display = 'none';

    btnReceipt.innerHTML = '🟢 Credit (Money In)';
    btnPayment.innerHTML = '🔴 Debit (Money Out)';
    const editTransactionIdContainer = document.getElementById('edit_transactionIdContainer');
    if (editTransactionIdContainer) editTransactionIdContainer.style.display = 'block';
  }

  const mode = document.getElementById('edit_txType') ? document.getElementById('edit_txType').value : 'Receipt';
  setEditMode(mode);

  if (!isBank && !isEditMode) {
    const typeSelect = document.getElementById('edit_type');
    if (typeSelect) {
      if (mode.toLowerCase() === 'receipt') {
        typeSelect.value = 'Subscription';
      } else {
        typeSelect.value = 'Ledger';
      }
    }
    onEditTypeChanged();

    const subMonthSelect = document.getElementById('edit_subMonth');
    if (subMonthSelect && mode.toLowerCase() === 'receipt') {
      const now = new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const currentMonth = monthNames[now.getMonth()];
      const currentYear = now.getFullYear();
      const monthYear = currentMonth + ' ' + currentYear;
      const options = Array.from(subMonthSelect.options);
      const matchingOption = options.find(o => o.value === monthYear);
      if (matchingOption) {
        subMonthSelect.value = monthYear;
      }
      autoPopulateEditDescription();
    }
  }
}

function updateEditBankSubtypes(mode) {
  const select = document.getElementById('edit_bankSubtypeSelect');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '';

  if (mode === 'Receipt') {
    const options = [
      { val: 'Direct Transfer / General', text: 'Direct Transfer / General' },
      { val: 'Direct Deposit for Member', text: 'Direct Deposit for Member' },
      { val: 'Cheque Deposited', text: 'Cheque Deposited' },
      { val: 'Bank Interest (Income)', text: 'Bank Interest (Income)' },
      { val: 'Inter-Bank Transfer (Contra)', text: 'Inter-Bank Transfer (Contra)' }
    ];
    options.forEach(opt => {
      const el = document.createElement('option');
      el.value = opt.val;
      el.innerText = opt.text;
      select.appendChild(el);
    });
  } else {
    const options = [
      { val: 'Direct Transfer / General', text: 'Direct Transfer / General' },
      { val: 'Direct Withdrawal for Member', text: 'Direct Withdrawal for Member' },
      { val: 'Cheque Issued (To Cash)', text: 'Cheque Issued (To Cash)' },
      { val: 'Bank Charges (Expense)', text: 'Bank Charges (Expense)' },
      { val: 'Inter-Bank Transfer (Contra)', text: 'Inter-Bank Transfer (Contra)' }
    ];
    options.forEach(opt => {
      const el = document.createElement('option');
      el.value = opt.val;
      el.innerText = opt.text;
      select.appendChild(el);
    });
  }

  if ([...select.options].some(o => o.value === currentVal)) {
    select.value = currentVal;
  }
  onEditBankSubtypeChanged();
}

function onEditBankSubtypeChanged() {
  const subtype = document.getElementById('edit_bankSubtypeSelect').value;
  const addToCashBookCheckbox = document.getElementById('edit_addToCashBook');
  const entryType = document.getElementById('edit_entryType') ? document.getElementById('edit_entryType').value : 'Cash';
  const accountGroup = document.getElementById('edit_accountGroup');

  if (addToCashBookCheckbox) {
    if (subtype === 'Cash Deposit (Contra)' || subtype === 'Cash Withdrawal (Contra)') {
      addToCashBookCheckbox.checked = true;
      addToCashBookCheckbox.disabled = true;
    } else if (subtype === 'Inter-Bank Transfer (Contra)') {
      addToCashBookCheckbox.checked = false;
      addToCashBookCheckbox.disabled = true;
    } else {
      addToCashBookCheckbox.disabled = false;
    }
  }

  if (entryType === 'Bank' && accountGroup) {
    const isInternal = subtype.includes('Contra') || subtype.includes('Interest') || subtype.includes('Charges');
    accountGroup.style.display = isInternal ? 'none' : 'block';
  }

  const editVrContainer = document.getElementById('edit_vrInputContainer');
  const editVrInput = document.getElementById('edit_vrNo');
  const editVrReq = document.getElementById('edit_vrReq');
  const editVrLabelText = document.getElementById('edit_vrLabelText');
  const editVrBadge = document.getElementById('edit_vrBadge');
  const editContraContainer = document.getElementById('edit_contraNumbersContainer');
  const editContraInput = document.getElementById('edit_contraBankVrNo');
  const editContraLabel = document.getElementById('edit_contraBankVrLabelText');

  const isContraDeposit = (subtype === 'Cash Deposit (Contra)');
  const isContraWithdrawal = (subtype === 'Cash Withdrawal (Contra)');
  const isContra = isContraDeposit || isContraWithdrawal;

  if (entryType === 'Bank' && isContra) {
    if (editVrContainer) editVrContainer.style.display = 'block';
    if (editVrInput) editVrInput.required = true;
    if (editVrReq) editVrReq.style.display = 'inline';
    if (editContraContainer) editContraContainer.style.display = 'block';

    if (isContraDeposit) {
      if (editVrLabelText) editVrLabelText.textContent = "🔢 Cash Payment Vr. No ";
      if (editVrBadge) { editVrBadge.className = "badge badge-payment"; editVrBadge.innerText = "Cash Payment"; }
      if (editContraLabel) editContraLabel.textContent = "🏦 Bank Receipt No";
    } else {
      if (editVrLabelText) editVrLabelText.textContent = "🔢 Cash Receipt No ";
      if (editVrBadge) { editVrBadge.className = "badge badge-receipt"; editVrBadge.innerText = "Cash Receipt"; }
      if (editContraLabel) editContraLabel.textContent = "🏦 Bank Payment Vr. No";
    }
  } else if (entryType === 'Bank' && (subtype === 'Bank Interest (Income)' || subtype === 'Inter-Bank Transfer (Contra)' || subtype === 'Bank Charges (Expense)')) {
    if (editContraContainer) editContraContainer.style.display = 'none';
    if (editVrContainer) editVrContainer.style.display = 'none';
    if (editVrInput) {
      editVrInput.required = false;
    }
    if (editVrReq) editVrReq.style.display = 'none';
  } else if (entryType === 'Bank') {
    if (editContraContainer) editContraContainer.style.display = 'none';
    if (editVrContainer) editVrContainer.style.display = 'block';
    if (editVrInput) {
      editVrInput.required = true;
    }
    if (editVrReq) editVrReq.style.display = 'inline';
  }

  if (typeof checkTypeChangeWarning === 'function') {
    checkTypeChangeWarning();
  }
}

function updateEditTypeOptions(mode, targetTypeValue, targetSubtypeValue) {
  const typeSelect = document.getElementById('edit_type');
  if (!typeSelect) return;

  let currentVal = typeSelect.value;
  if (targetTypeValue !== undefined) {
    currentVal = targetSubtypeValue ? `${targetTypeValue}|${targetSubtypeValue}` : `${targetTypeValue}|`;
  }
  const entryType = document.getElementById('edit_entryType') ? document.getElementById('edit_entryType').value : 'Cash';
  populateCategorySelect(typeSelect, mode, entryType, currentVal);
}

function checkTypeChangeWarning() {
  if (!isEditMode) return;
  const currentMode = document.getElementById('edit_txType').value;
  const currentEntryType = document.getElementById('edit_entryType').value;

  let changed = false;
  let msg = "";
  if (currentMode !== window.originalEditMode) { changed = true; msg = "Transaction Mode (Receipt/Payment)"; }
  else if (currentEntryType !== window.originalEditEntryType) { changed = true; msg = "Entry Type (Cash/Bank)"; }
  else if (currentEntryType === 'Bank') {
    const currentBankSubtype = document.getElementById('edit_bankSubtypeSelect').value;
    if (currentBankSubtype !== window.originalEditBankSubtype) { changed = true; msg = "Bank Transaction Type"; }
  } else {
    const fullTypeVal = document.getElementById('edit_type').value || '|';
    const [currentType, currentSubtype] = fullTypeVal.split('|');
    if (currentType !== window.originalEditType) { changed = true; msg = "Main Category Type"; }
    else if (currentSubtype !== window.originalEditSubtype) { changed = true; msg = "Subtype"; }
  }

  const warningLabel = document.getElementById('edit_typeWarningLabel');
  if (warningLabel) {
    if (changed && msg) {
      warningLabel.innerText = "⚠️ Warning: You are changing the " + msg + " from its original value.";
      warningLabel.style.display = 'block';
    } else {
      warningLabel.style.display = 'none';
    }
  }
}

function onEditTypeChanged() {
  const entryType = document.getElementById('edit_entryType') ? document.getElementById('edit_entryType').value : 'Cash';
  const mode = document.getElementById('edit_txType') ? document.getElementById('edit_txType').value : 'Receipt';
  const fullTypeVal = document.getElementById('edit_type') ? document.getElementById('edit_type').value : '|';
  const [typeVal, subtypeVal] = fullTypeVal.split('|');
  const subTypeGroup = document.getElementById('edit_subTypeGroup');
  const subMonthGroup = document.getElementById('edit_subMonthGroup');
  const subtypeSelect = document.getElementById('edit_subtype');
  const accountGroup = document.getElementById('edit_accountGroup');
  const typeGroup = document.getElementById('edit_typeGroup');

  if (subTypeGroup) subTypeGroup.style.display = 'none';

  const isBankAndCategorize = (entryType === 'Bank' && document.getElementById('edit_isAddLedgerType') && document.getElementById('edit_isAddLedgerType').checked);

  if (typeGroup) typeGroup.style.display = (entryType === 'Bank' && !isBankAndCategorize) ? 'none' : 'block';

  if (entryType === 'Bank') {
    const vrLabelText = document.getElementById('edit_vrLabelText');
    const vrBadge = document.getElementById('edit_vrBadge');
    if (typeVal === 'Ledger' || (typeVal === 'Charity' && mode === 'Payment')) {
      if (vrLabelText) vrLabelText.textContent = "🔢 Payment Vr. No ";
      if (vrBadge) {
        vrBadge.className = "badge badge-payment";
        vrBadge.innerText = "Payment";
      }
    } else {
      if (vrLabelText) vrLabelText.textContent = "🔢 Receipt No ";
      if (vrBadge) {
        vrBadge.className = "badge badge-receipt";
        vrBadge.innerText = "Receipt";
      }
    }
  }

  if (subMonthGroup) subMonthGroup.style.display = 'none';

  if (entryType === 'Bank' && !isBankAndCategorize) {
    onEditBankSubtypeChanged();
    return;
  }

  // Apply Dynamic Field Visibility Rules
  let rules = globalFieldRules[typeVal] || { showAccount: true, showSubtype: false, showMonth: false };

  if (entryType === 'Cash') {
    const editBankAccountWrapper = document.getElementById('edit_bankAccountWrapper');
    const isEditContra = (typeVal === 'Contra' || (subtypeVal && subtypeVal.includes('(Contra)')));
    const editContraContainer = document.getElementById('edit_contraNumbersContainer');
    const editContraLabel = document.getElementById('edit_contraBankVrLabelText');
    const editVrLabelText = document.getElementById('edit_vrLabelText');
    const editVrBadge = document.getElementById('edit_vrBadge');

    if (isEditContra) {
      rules = { showAccount: false, showSubtype: false, showMonth: false };
      if (editBankAccountWrapper) {
        editBankAccountWrapper.style.display = 'flex';
        if (editBankAccountWrapper.children.length >= 2) {
          editBankAccountWrapper.children[0].style.display = 'flex';
          editBankAccountWrapper.children[1].style.display = 'none';
        }
      }
      if (editContraContainer) editContraContainer.style.display = 'block';

      if (mode === 'Payment') {
        if (editVrLabelText) editVrLabelText.textContent = "🔢 Cash Payment Vr. No ";
        if (editVrBadge) { editVrBadge.className = "badge badge-payment"; editVrBadge.innerText = "Cash Payment"; }
        if (editContraLabel) editContraLabel.textContent = "🏦 Bank Receipt No";
      } else {
        if (editVrLabelText) editVrLabelText.textContent = "🔢 Cash Receipt No ";
        if (editVrBadge) { editVrBadge.className = "badge badge-receipt"; editVrBadge.innerText = "Cash Receipt"; }
        if (editContraLabel) editContraLabel.textContent = "🏦 Bank Payment Vr. No";
      }
    } else {
      if (editBankAccountWrapper) editBankAccountWrapper.style.display = 'none';
      if (editContraContainer) editContraContainer.style.display = 'none';
      if (mode === 'Payment') {
        if (editVrLabelText) editVrLabelText.textContent = "🔢 Payment Vr. No ";
        if (editVrBadge) { editVrBadge.className = "badge badge-payment"; editVrBadge.innerText = "Payment"; }
      } else {
        if (editVrLabelText) editVrLabelText.textContent = "🔢 Receipt No ";
        if (editVrBadge) { editVrBadge.className = "badge badge-receipt"; editVrBadge.innerText = "Receipt"; }
      }
    }
  }

  if (accountGroup) {
    // Only hide member section for Cash Contra entries; show it for all other Cash types
    accountGroup.style.display = (entryType === 'Cash' && typeVal === 'Contra') ? 'none' : 'block';
  }



  if (rules.showMonth) {
    subMonthGroup.style.display = 'block';
  }

  autoPopulateEditDescription();
  checkTypeChangeWarning();
}

function autoPopulateEditDescription() {
  const entryType = document.getElementById('edit_entryType') ? document.getElementById('edit_entryType').value : 'Cash';
  const descInput = document.getElementById('edit_description');
  if (!descInput) return;

  const isBankAndCategorize = (entryType === 'Bank' && document.getElementById('edit_isAddLedgerType') && document.getElementById('edit_isAddLedgerType').checked);
  if (entryType === 'Bank' && !isBankAndCategorize) return;

  const fullTypeVal = document.getElementById('edit_type') ? document.getElementById('edit_type').value : '|';
  const [typeVal, subtypeVal] = fullTypeVal.split('|');
  const subMonthVal = document.getElementById('edit_subMonth') ? document.getElementById('edit_subMonth').value : '';

  if (typeVal === 'Subscription') {
    const defaultM = subMonthVal || getDefaultSubscriptionMonth(true);
    descInput.value = "Subscription for " + defaultM;
  } else if (typeVal === 'Offering') {
    descInput.value = "Offertory";
  } else if (subtypeVal === 'Salary Pr. T.T.Simon') {
    descInput.value = "Salary for Pr. T.T.Simon";
  } else if (subtypeVal === 'Allowance Pr. T.T.Simon') {
    descInput.value = "Allowance for Pr. T.T.Simon";
  } else if (typeVal === 'Contra') {
    descInput.value = subtypeVal === 'Cash Deposit (Contra)' ? "Cash Deposit to Bank" : "Cash Withdrawal from Bank";
  }
}

function autoPopulateSplitRowDescription(rowId, isEdit = false) {
  const row = document.getElementById(rowId);
  if (!row) return;
  const typeSelect = row.querySelector(isEdit ? '.edit-split-type-select' : '.split-type-select');
  const subtypeSelect = row.querySelector(isEdit ? '.edit-split-subtype-select' : '.split-subtype-select');
  const submonthSelect = row.querySelector(isEdit ? '.edit-split-submonth-select' : '.split-submonth-select');
  const descInput = row.querySelector(isEdit ? '.edit-split-desc-input' : '.split-desc-input');

  if (!descInput) return;

  const typeValFull = typeSelect ? typeSelect.value : '|';
  const parts = typeValFull.split('|');
  const mainType = parts[0];
  const typeSub = parts[1] || "";
  const actualSubtype = subtypeSelect && subtypeSelect.offsetParent !== null ? subtypeSelect.value : typeSub;
  const subMonthVal = submonthSelect ? submonthSelect.value : '';

  const currentDesc = descInput.value.trim();
  const isAutoOrEmpty = currentDesc === '' ||
    currentDesc === 'Bank Transfer' ||
    currentDesc.startsWith('Subscription for ') ||
    currentDesc === 'Offertory' ||
    currentDesc === 'Salary for Pr. T.T.Simon' ||
    currentDesc === 'Allowance for Pr. T.T.Simon' ||
    currentDesc === 'Cash Deposit to Bank' ||
    currentDesc === 'Cash Withdrawal from Bank';

  if (!isAutoOrEmpty) return;

  if (mainType === 'Subscription') {
    const defaultM = subMonthVal || getDefaultSubscriptionMonth(isEdit);
    descInput.value = "Subscription for " + defaultM;
  } else if (mainType === 'Offering') {
    descInput.value = "Offertory";
  } else if (actualSubtype === 'Salary Pr. T.T.Simon') {
    descInput.value = "Salary for Pr. T.T.Simon";
  } else if (actualSubtype === 'Allowance Pr. T.T.Simon') {
    descInput.value = "Allowance for Pr. T.T.Simon";
  } else if (mainType === 'Charity') {
    descInput.value = (actualSubtype && actualSubtype.toLowerCase().includes('paid')) ? "Charity Paid" : "Charity Received";
  } else if (mainType === 'Contra') {
    descInput.value = actualSubtype === 'Cash Deposit (Contra)' ? "Cash Deposit to Bank" : "Cash Withdrawal from Bank";
  } else {
    descInput.value = "";
  }
}

function checkEditDuplicateSubscriptionWarning() {
  const h = document.getElementById('edit_subMonthHint'); if (h) h.style.display = 'none';
}


// Autocomplete for Edit Tab Member
function onEditAccountNameInput() {
  const inputVal = document.getElementById('edit_accountName').value;
  renderEditCustomMembersDropdown(inputVal);
  onEditAccountNameChanged();
}
function onEditAccountNameFocus() {
  renderEditCustomMembersDropdown(document.getElementById('edit_accountName').value);
}
function renderEditCustomMembersDropdown(filterText = "") {
  const dropdownMenu = document.getElementById('edit_customMembersDropdown');
  if (!dropdownMenu) return;

  const searchLower = filterText.trim().toLowerCase();
  const matches = membersDataStore.filter(m => {
    const code = getMemberCode(m.name, m.address).toLowerCase();
    return !searchLower || m.name.toLowerCase().includes(searchLower) || (m.nickname && m.nickname.toLowerCase().includes(searchLower)) || (m.address && m.address.toLowerCase().includes(searchLower)) || (m.phone && m.phone.toLowerCase().includes(searchLower)) || code.includes(searchLower);
  });

  dropdownMenu.innerHTML = '';
  if (matches.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'custom-dropdown-item';
    emptyDiv.style.color = '#94a3b8';
    emptyDiv.innerText = 'No matching member found';
    dropdownMenu.appendChild(emptyDiv);
  } else {
    matches.slice(0, 30).forEach(m => {
      const item = document.createElement('div');
      item.className = 'custom-dropdown-item';
      item.onclick = (e) => {
        e.stopPropagation();
        selectEditMemberItem(m.name, m.address);
      };
      const nameSpan = document.createElement('span');
      nameSpan.style.fontWeight = '700';
      const code = getMemberCode(m.name, m.address);
      const disp = formatMemberDisplayName(m.name, m.title, true, m.nickname);
      nameSpan.innerHTML = `<span style="color:#0f172a; font-family:monospace; margin-right:5px;">[${code}]</span>👤 ` + disp;
      item.appendChild(nameSpan);

      const subInfoSpan = document.createElement('div');
      subInfoSpan.style.fontSize = '0.75rem';
      subInfoSpan.style.color = '#64748b';
      subInfoSpan.style.marginTop = '2px';
      subInfoSpan.style.display = 'flex';
      subInfoSpan.style.gap = '8px';

      const addrTxt = m.address ? '📍 ' + m.address : '📍 No address';
      const phoneTxt = m.phone ? '📞 ' + m.phone : '<span style="color:#dc2626;">📞 (No phone)</span>';
      subInfoSpan.innerHTML = `<span>${addrTxt}</span><span>${phoneTxt}</span>`;
      item.appendChild(subInfoSpan);
      dropdownMenu.appendChild(item);
    });
  }
  dropdownMenu.style.display = 'block';
}
function selectEditMemberItem(name, address) {
  document.getElementById('edit_accountName').value = formatMemberDisplayName(name);
  document.getElementById('edit_addressInput').value = address || '';
  document.getElementById('edit_addressText').innerText = address || '(No address recorded)';
  document.getElementById('edit_addressPreview').style.display = 'block';
  document.getElementById('edit_customMembersDropdown').style.display = 'none';
  updateMemberPhonePreview(name, address, true);
  checkEditDuplicateSubscriptionWarning();
  updateEditMemberButtonsVisibility();
}
function onEditAccountNameChanged() {
  const val = document.getElementById('edit_accountName').value.trim();
  const addrPreview = document.getElementById('edit_addressPreview');
  const addrText = document.getElementById('edit_addressText');
  const addrInput = document.getElementById('edit_addressInput');

  let foundAddr = null;
  let multipleMatches = false;

  if (val) {
    const matches = membersDataStore.filter(m => m.name && m.name.toLowerCase().trim() === val.toLowerCase());
    if (matches.length === 1) {
      foundAddr = matches[0].address || "";
    } else if (matches.length > 1) {
      multipleMatches = true;
      const curAddr = (addrInput.value || '').trim().toLowerCase();
      if (curAddr) {
        const exactMatch = matches.find(m => {
          const mA = (m.address || '').toLowerCase().trim();
          return mA === curAddr || mA.indexOf(curAddr) !== -1 || curAddr.indexOf(mA) !== -1;
        });
        if (exactMatch) foundAddr = exactMatch.address || curAddr;
      }
    }
  }

  if (multipleMatches && foundAddr === null) {
    addrText.innerText = "⚠️ Multiple members with this name. Please select from dropdown.";
    addrText.style.color = "#d97706";
    addrPreview.style.display = 'block';
  } else if (foundAddr !== null && foundAddr !== undefined) {
    addrText.innerText = foundAddr || "(No address recorded)";
    addrText.style.color = "#0f172a";
    addrInput.value = foundAddr || "";
    addrPreview.style.display = 'block';
  } else {
    addrText.innerText = "--";
    addrText.style.color = "#0f172a";
    addrPreview.style.display = addrInput.value ? 'block' : 'none';
  }
  updateMemberPhonePreview(val, foundAddr, true);
  checkEditDuplicateSubscriptionWarning();
  updateEditMemberButtonsVisibility();
}

// Submit Edit
async function syncSharedLinkForTransaction(vrNo, txObj, isDeletedOrCancelled = false) {
  if (!vrNo) return;
  const cleanVr = normalizeVrLocally(vrNo);
  if (!cleanVr || cleanVr === '-') return;

  try {
    const snap = await db.collection('shared_links').get();
    snap.forEach(async docSnap => {
      const docId = docSnap.id;
      const data = docSnap.data();
      if (!data || !data.payload) return;

      const p = data.payload;
      const pVrClean = normalizeVrLocally(p.v || '');

      if (pVrClean === cleanVr || docId.toLowerCase().includes(cleanVr)) {
        if (isDeletedOrCancelled || (txObj && (txObj.description || '').toLowerCase().includes('cancelled'))) {
          p.cancel = true;
        } else if (txObj) {
          const allTxs = (typeof allTimeGeneralTxList !== 'undefined' && allTimeGeneralTxList.length > 0) ? allTimeGeneralTxList : (globalRawTransactions || []);
          let matchingTxs = allTxs.filter(t => normalizeVrLocally(t.vrNo) === cleanVr || normalizeVrLocally(t.rcptNo) === cleanVr || normalizeVrLocally(t.payNo) === cleanVr);
          if ((!matchingTxs || matchingTxs.length <= 1) && txObj.splitItems && txObj.splitItems.length > 0) {
            matchingTxs = txObj.splitItems;
          }
          const txArray = (matchingTxs && matchingTxs.length > 0) ? matchingTxs : [txObj];
          const firstTx = txArray[0];

          let don = 0, sub = 0, off = 0, oth = 0, tot = 0;
          let othDescArr = [];
          let subMonthTextArr = [];

          txArray.forEach(t => {
            const amt = Number(t.receipt || t.payment || t.amount || 0);
            tot += amt;
            const typeStr = (t.type || '').toLowerCase();
            const subStr = (t.subtype || '').toLowerCase();
            if (typeStr.includes('subscription') || subStr.includes('subscription')) {
              sub += amt;
              const m = t.month || t.subMonth;
              if (m && !subMonthTextArr.includes(m)) subMonthTextArr.push(m);
            } else if (typeStr.includes('offering') || subStr.includes('offertory')) {
              off += amt;
            } else if (typeStr.includes('donation') || subStr.includes('donation')) {
              don += amt;
            } else {
              oth += amt;
              let d = t.description || t.subtype || t.type || 'Other Items';
              if (d !== '-' && d !== 'Other Items' && !othDescArr.includes(d)) othDescArr.push(d);
            }
          });

          p.tot = tot;
          if (firstTx.date) {
            p.d = new Date(firstTx.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
          }
          if (firstTx.accountName || firstTx.name || firstTx.paidTo) {
            p.n = firstTx.accountName || firstTx.name || firstTx.paidTo;
          }
          if (firstTx.address !== undefined) p.addr = firstTx.address;
          p.subMonth = subMonthTextArr.join(', ') || firstTx.subMonth || p.subMonth || '';

          if (p.t === 'r') {
            p.don = don; p.sub = sub; p.off = off; p.oth = oth;
            p.othDesc = othDescArr.join(', ') || 'Other Items';
          } else if (p.t === 'p') {
            p.h = firstTx.type || firstTx.subtype || p.h || 'Expense';
            p.desc = txArray.map(t => t.description || t.subtype || '').filter(Boolean).join(' + ') || p.desc || '';
          }
        }
        await db.collection('shared_links').doc(docId).update({ payload: p, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      }
    });
  } catch (e) {
    console.warn("Could not sync shared link for transaction:", e);
  }
}

function toggleEditSplitEntryMode() {
  const isSplit = document.getElementById('edit_isSplitEntry').checked;
  const splitContainer = document.getElementById('editSplitEntryContainer');
  const amountInput = document.getElementById('edit_amount');
  const editTypeGroup = document.getElementById('edit_typeGroup');
  const editSubTypeGroup = document.getElementById('edit_subTypeGroup');
  const editSubMonthGroup = document.getElementById('edit_subMonthGroup');
  const editDescGroup = document.getElementById('edit_descriptionGroup');

  if (isSplit) {
    if (splitContainer) splitContainer.style.display = 'block';
    if (editTypeGroup) editTypeGroup.style.display = 'none';
    if (editSubTypeGroup) editSubTypeGroup.style.display = 'none';
    if (editSubMonthGroup) editSubMonthGroup.style.display = 'none';
    if (editDescGroup) editDescGroup.style.display = 'none';

    if (amountInput) {
      amountInput.setAttribute('readonly', 'true');
      amountInput.style.backgroundColor = 'var(--bg-slate-100)';
      amountInput.style.cursor = 'not-allowed';
      amountInput.removeAttribute('required');
    }

    // Add first row if none exists
    const wrapper = document.getElementById('editSplitRowsWrapper');
    if (wrapper && wrapper.children.length === 0) {
      addEditSplitRow();
    }
  } else {
    if (splitContainer) splitContainer.style.display = 'none';
    if (editTypeGroup) editTypeGroup.style.display = 'block';
    if (editDescGroup) editDescGroup.style.display = 'block';
    onEditTypeChanged();

    if (amountInput) {
      amountInput.removeAttribute('readonly');
      amountInput.style.backgroundColor = '';
      amountInput.style.cursor = 'text';
      amountInput.setAttribute('required', 'true');
    }
  }
}

function getCategoryOptionsHTML(mode = 'Receipt') {
  const optionsList = buildCategoryOptionsFromDatabase(mode, 'Cash');
  const groups = {};
  optionsList.forEach(opt => {
    const grp = opt.group || 'Other';
    if (!groups[grp]) groups[grp] = [];
    groups[grp].push(opt);
  });

  const preferredGroupOrder = (mode === 'Payment')
    ? ['Ledger', 'Monthly Meeting', 'Charity', 'Contra', 'General']
    : ['Subscription', 'Offering', 'Other Income', 'Monthly Meeting', 'Charity', 'Contra', 'General'];

  const groupKeys = Object.keys(groups).sort((a, b) => {
    const idxA = preferredGroupOrder.indexOf(a);
    const idxB = preferredGroupOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  let html = '';
  groupKeys.forEach(grp => {
    const grpItems = groups[grp];
    grpItems.sort((a, b) => a.text.localeCompare(b.text));
    if (grpItems.length === 1 && (grp === 'General' || grp === 'Subscription' || grp === 'Offering')) {
      html += `<option value="${grpItems[0].val}">${grpItems[0].text}</option>\n`;
    } else {
      html += `<optgroup label="${grp}">\n`;
      grpItems.forEach(item => {
        html += `  <option value="${item.val}">${item.text}</option>\n`;
      });
      html += `</optgroup>\n`;
    }
  });
  return html;
}

let editSplitRowCount = 0;

function addEditSplitRow(rowData = null) {
  editSplitRowCount++;
  const rowId = 'edit-split-row-' + editSplitRowCount;
  const wrapper = document.getElementById('editSplitRowsWrapper');

  const mode = document.getElementById('edit_txType') ? document.getElementById('edit_txType').value : 'Receipt';
  const typeOptionsHTML = getCategoryOptionsHTML(mode);
  const defaultMonth = getDefaultSubscriptionMonth(true);

  const html = `
    <div id="${rowId}" class="edit-split-row" style="display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; padding: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="flex: 1; min-width: 120px;">
        <label style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 4px; display: block;">Category</label>
        <select class="edit-split-type-select" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem;" onchange="updateEditSplitRowSubtypes('${rowId}')">
          ${typeOptionsHTML}
        </select>
      </div>
      <div style="flex: 1; min-width: 120px; display: none;" class="edit-split-subtype-container">
        <label style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 4px; display: block;">Subtype</label>
        <select class="edit-split-subtype-select" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem;" onchange="autoPopulateSplitRowDescription('${rowId}', true)"></select>
      </div>
      <div style="flex: 1; min-width: 120px; display: none;" class="edit-split-submonth-container">
        <label style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 4px; display: block;">Month</label>
        <select class="edit-split-submonth-select" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem;" onchange="autoPopulateSplitRowDescription('${rowId}', true)">
          ${document.getElementById('edit_subMonth') ? document.getElementById('edit_subMonth').innerHTML : ''}
        </select>
      </div>
      <div style="flex: 2; min-width: 150px;">
        <label style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 4px; display: block;">Description / Particulars</label>
        <input type="text" class="edit-split-desc-input" placeholder="Row description..." style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem;">
      </div>
      <div style="flex: 1; min-width: 100px;">
        <label style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 4px; display: block;">Amount</label>
        <input type="text" inputmode="decimal" class="edit-split-amount-input" placeholder="0.00" oninput="calculateEditSplitTotal()" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem; font-weight: 700;">
      </div>
      <div style="display: flex; align-items: center; justify-content: center;">
        <button type="button" onclick="removeEditSplitRow('${rowId}')" style="background: #fee2e2; color: #ef4444; border: none; width: 34px; height: 34px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Remove Row">X</button>
      </div>
    </div>
  `;

  wrapper.insertAdjacentHTML('beforeend', html);

  const row = document.getElementById(rowId);

  if (rowData) {
    const typeSelect = row.querySelector('.edit-split-type-select');
    let matched = false;
    Array.from(typeSelect.options).forEach(opt => {
      const parts = opt.value.split('|');
      if (rowData.subtype && parts[1] === rowData.subtype) {
        typeSelect.value = opt.value;
        matched = true;
      } else if (!matched && (parts[0] === rowData.type || opt.value === rowData.type)) {
        typeSelect.value = opt.value;
        matched = true;
      }
    });

    updateEditSplitRowSubtypes(rowId, true);

    const subtypeSelect = row.querySelector('.edit-split-subtype-select');
    if (rowData.subtype && subtypeSelect) {
      subtypeSelect.value = rowData.subtype;
    }

    const submonthSelect = row.querySelector('.edit-split-submonth-select');
    if (submonthSelect) {
      const targetMonth = rowData.month || defaultMonth;
      if (targetMonth) {
        let match = Array.from(submonthSelect.options).find(o => o.value === targetMonth);
        if (!match) {
          const opt = document.createElement('option');
          opt.value = targetMonth;
          opt.innerText = targetMonth;
          submonthSelect.appendChild(opt);
        }
        submonthSelect.value = targetMonth;
      }
    }

    const descInput = row.querySelector('.edit-split-desc-input');
    if (descInput) {
      descInput.value = (rowData.description && rowData.description !== 'Bank Transfer') ? rowData.description : "";
    }

    const amountInput = row.querySelector('.edit-split-amount-input');
    if (rowData.amount && amountInput) {
      amountInput.value = rowData.amount;
    }
  } else {
    const submonthSelect = row.querySelector('.edit-split-submonth-select');
    if (submonthSelect && defaultMonth) {
      let match = Array.from(submonthSelect.options).find(o => o.value === defaultMonth);
      if (!match) {
        const opt = document.createElement('option');
        opt.value = defaultMonth;
        opt.innerText = defaultMonth;
        submonthSelect.appendChild(opt);
      }
      submonthSelect.value = defaultMonth;
    }
    updateEditSplitRowSubtypes(rowId);
  }

  calculateEditSplitTotal();
}

function removeEditSplitRow(rowId) {
  const row = document.getElementById(rowId);
  if (row) {
    row.remove();
    calculateEditSplitTotal();
  }
}

function calculateEditSplitTotal() {
  let total = 0;
  const amountInputs = document.querySelectorAll('.edit-split-amount-input');
  amountInputs.forEach(input => {
    const val = parseFloat(input.value.replace(/,/g, '')) || 0;
    total += val;
  });

  const displayEl = document.getElementById('editSplitTotalDisplay');
  if (displayEl) displayEl.innerText = formatCurrencyNoSymbol(total);

  const mainAmountInput = document.getElementById('edit_amount');
  if (mainAmountInput) mainAmountInput.value = total > 0 ? total : "";

  return total;
}

function updateEditSplitRowSubtypes(rowId, skipAutoPopulate = false) {
  const row = document.getElementById(rowId);
  if (!row) return;

  const typeSelect = row.querySelector('.edit-split-type-select');
  const subtypeContainer = row.querySelector('.edit-split-subtype-container');
  const subtypeSelect = row.querySelector('.edit-split-subtype-select');
  const submonthContainer = row.querySelector('.edit-split-submonth-container');

  const typeValFull = typeSelect.value || '|';
  const parts = typeValFull.split('|');
  const mainType = parts[0];

  subtypeContainer.style.display = 'none';
  submonthContainer.style.display = 'none';
  subtypeSelect.innerHTML = '';

  const mode = document.getElementById('edit_txType') ? document.getElementById('edit_txType').value : 'Receipt';

  if (mainType === 'Subscription') {
    submonthContainer.style.display = 'block';
    const submonthSelect = row.querySelector('.edit-split-submonth-select');
    if (submonthSelect && !submonthSelect.value) {
      const defaultMonth = getDefaultSubscriptionMonth(true);
      submonthSelect.value = defaultMonth;
    }
  } else if (mainType === 'Charity' || mainType === 'Ledger' || mainType === 'Other Income' || mainType === 'Contra') {
    const rules = globalFieldRules[mainType];
    if (rules && rules.subtypes) {
      let subtypeOptions = rules.subtypes[mode] || [];
      if (mainType === 'Contra' && subtypeOptions.length === 0) subtypeOptions = rules.subtypes['Both'] || [];

      if (subtypeOptions.length > 0) {
        subtypeOptions.forEach(opt => {
          const optEl = document.createElement('option');
          optEl.value = opt;
          optEl.innerText = opt;
          subtypeSelect.appendChild(optEl);
        });
        subtypeContainer.style.display = 'block';
      }
    }
  }
  if (!skipAutoPopulate) {
    autoPopulateSplitRowDescription(rowId, true);
  }
}

function handleEditFormSubmit(e) {
  e.preventDefault();

  const mode = document.getElementById('edit_txType').value;
  const amountVal = parseFloat(String(document.getElementById('edit_amount').value || '').replace(/,/g, '')) || 0;

  if (amountVal < 0) {
    alert("Please enter a valid amount (0 or greater). 💰");
    return;
  }

  let vrNoValue = document.getElementById('edit_vrNo').value.trim();
  const entryTypeVal = document.getElementById('edit_entryType').value;
  const isCheque = document.getElementById('edit_isCheque') ? document.getElementById('edit_isCheque').checked : false;
  const chequeNo = document.getElementById('edit_chequeNo') ? document.getElementById('edit_chequeNo').value.trim() : "";

  if (vrNoValue === "" && isCheque && chequeNo) {
    vrNoValue = chequeNo;
  }

  if (entryTypeVal === 'Bank' && vrNoValue !== "" && vrNoValue !== '-' && vrNoValue !== '--') {
    if (!vrNoValue.endsWith('/B')) {
      vrNoValue = vrNoValue + '/B';
    }
  } else if (entryTypeVal === 'Bank' && (vrNoValue === "" || vrNoValue === '-' || vrNoValue === '--')) {
    vrNoValue = '--';
  }

  let formReceipt = (mode === 'Receipt') ? amountVal : "";
  let formPayments = (mode === 'Payment') ? amountVal : "";

  const bankSubtypeStr = document.getElementById('edit_bankSubtypeSelect') ? document.getElementById('edit_bankSubtypeSelect').value : "";
  if (entryTypeVal === 'Bank') {
    if (bankSubtypeStr === 'Cash Deposit (Contra)') {
      formReceipt = amountVal;
      formPayments = "";
    } else if (bankSubtypeStr === 'Cash Withdrawal (Contra)') {
      formReceipt = "";
      formPayments = amountVal;
    }
  }

  const fullTypeVal = document.getElementById('edit_type') ? document.getElementById('edit_type').value : '|';
  const [parsedType, parsedSubtype] = fullTypeVal.split('|');

  let chosenSubtype = parsedSubtype || '';
  const editSubtypeEl = document.getElementById('edit_subtype');
  if (!chosenSubtype && editSubtypeEl && editSubtypeEl.offsetParent !== null && editSubtypeEl.value) {
    chosenSubtype = editSubtypeEl.value.trim();
  }

  const isAddLedgerEdit = (document.getElementById('edit_isAddLedgerType') && document.getElementById('edit_isAddLedgerType').checked);
  const effectiveType = (entryTypeVal === 'Bank' && !isAddLedgerEdit) 
    ? (bankSubtypeStr.includes('Interest') ? 'Bank Interest (Income)' : (bankSubtypeStr.includes('Contra') ? 'Contra' : (bankSubtypeStr || 'Bank'))) 
    : parsedType;
  const effectiveSubtype = (entryTypeVal === 'Bank' && !isAddLedgerEdit) 
    ? (bankSubtypeStr || "") 
    : chosenSubtype;
  const effectiveCategory = (entryTypeVal === 'Bank' && !isAddLedgerEdit)
    ? (bankSubtypeStr || 'Bank')
    : ((effectiveType === 'Ledger' && effectiveSubtype) ? effectiveSubtype : (effectiveSubtype || effectiveType || 'General'));

  const editContraBankVrInput = document.getElementById('edit_contraBankVrNo');
  const editContraBankVrVal = editContraBankVrInput ? editContraBankVrInput.value.trim() : '';

  const editAccVal = (document.getElementById('edit_accountName') ? document.getElementById('edit_accountName').value : '').trim();
  const editAddrVal = (document.getElementById('edit_addressInput') ? document.getElementById('edit_addressInput').value : '').trim();
  const editMemObj = getMemberObject(editAccVal, editAddrVal);
  const editResolvedCode = getMemberCode(editAccVal, editAddrVal);
  const editResolvedAddress = editAddrVal || editMemObj.address || '';
  const editResolvedPhone = editMemObj.phone || '';
  const editResolvedMemberId = editMemObj.id || null;

  const formPayload = {
    action: "edit",
    originalVrNo: originalEditVrNo,
    date: document.getElementById('edit_date').value,
    vrNo: vrNoValue,
    contraVrNo: editContraBankVrVal,
    contra_vr_no: editContraBankVrVal,
    bankVrNo: editContraBankVrVal,
    accountName: editAccVal,
    account_name: editAccVal,
    name: editAccVal,
    address: editResolvedAddress,
    phone: editResolvedPhone,
    memberCode: (editResolvedCode && editResolvedCode !== '-') ? editResolvedCode : '',
    member_code: (editResolvedCode && editResolvedCode !== '-') ? editResolvedCode : '',
    memberId: editResolvedMemberId,
    member_id: editResolvedMemberId,
    description: document.getElementById('edit_description').value,
    amount: amountVal,
    receipt: formReceipt,
    payment: formPayments,
    type: effectiveType,
    subtype: effectiveSubtype,
    subType: effectiveSubtype,
    category: effectiveCategory,
    subMonth: (entryTypeVal === 'Bank' && !(document.getElementById('edit_isAddLedgerType') && document.getElementById('edit_isAddLedgerType').checked)) ? "" : (document.getElementById('edit_subMonth') ? document.getElementById('edit_subMonth').value : ""),
    entryType: document.getElementById('edit_entryType').value,
    bankAccount: document.getElementById('edit_bankAccountSelect') ? document.getElementById('edit_bankAccountSelect').value : "State Bank of India",
    bankSubtype: (entryTypeVal === 'Cash' && parsedType === 'Contra') ? parsedSubtype : (document.getElementById('edit_bankSubtypeSelect') ? document.getElementById('edit_bankSubtypeSelect').value : ""),
    addToCashBook: document.getElementById('edit_addToCashBook') ? document.getElementById('edit_addToCashBook').checked : false,
    edit_isAddLedgerType: document.getElementById('edit_isAddLedgerType') ? document.getElementById('edit_isAddLedgerType').checked : false,
    isCheque: document.getElementById('edit_isCheque') ? document.getElementById('edit_isCheque').checked : false,
    chequeNo: document.getElementById('edit_chequeNo') ? document.getElementById('edit_chequeNo').value : "",
    transactionId: document.getElementById('edit_transactionId') ? document.getElementById('edit_transactionId').value.trim() : "",
    mode: mode
  };

  const submitBtn = document.getElementById('edit_submitBtn');
  const btnText = document.getElementById('edit_btnText');
  submitBtn.disabled = true;
  btnText.innerText = "Saving changes... ⏳";
  showGlobalLoading("Saving changes... ⏳");

  const onSuccess = function (res) {
    submitBtn.disabled = false;
    btnText.innerText = "Update & Sync Entry 🔄";
    hideGlobalLoading();
    if (res === "Success" || (res && res.success !== false)) {
      showEditAlert("Great job! Your entry is updated successfully! ✨", "success");
      if (typeof speakSuccessMessage === 'function') speakSuccessMessage(formPayload, "updated");
      syncSharedLinkForTransaction(formPayload.vrNo, formPayload);
      if (originalEditVrNo && originalEditVrNo !== formPayload.vrNo) {
        syncSharedLinkForTransaction(originalEditVrNo, formPayload);
      }
      if (typeof window.refreshDatabase === 'function') {
        window.refreshDatabase(true);
      }
      setTimeout(() => { cancelEditModeTab({ type: 'updated', vrNo: formPayload.vrNo }); }, 500);
    } else {
      alert("Oops! Something went wrong: " + res);
    }
  };

  const onError = function (err) {
    submitBtn.disabled = false;
    btnText.innerText = "Update & Sync Entry 🔄";
    hideGlobalLoading();
    alert("Connection issue: " + (err.message || err));
  };

  const editId = window.originalEditId;
  if (!editId) {
    alert("Hmm, we couldn't find that transaction. Please try again. 😕");
    return;
  }
  formPayload.id = editId;

  const saves = [];
  const isSplitEntry = document.getElementById('edit_isSplitEntry') ? document.getElementById('edit_isSplitEntry').checked : false;

  const oldEntryType = (window.originalEditEntryType || 'Cash').toLowerCase();
  const newEntryType = (formPayload.entryType || 'Cash').toLowerCase();

  if (isSplitEntry) {
    const rows = document.querySelectorAll('.edit-split-row');
    if (rows.length === 0) {
      alert("Please add at least one split row. ⚠️");
      submitBtn.disabled = false;
      btnText.innerText = "Update & Sync Entry 🔄";
      hideGlobalLoading();
      return;
    }

    let totalAmt = 0;
    let items = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const tSelect = row.querySelector('.edit-split-type-select');
      const sSelect = row.querySelector('.edit-split-subtype-select');
      const mSelect = row.querySelector('.edit-split-submonth-select');
      const dInput = row.querySelector('.edit-split-desc-input');
      const aInput = row.querySelector('.edit-split-amount-input');

      const rAmt = parseFloat((aInput.value || '').replace(/,/g, '')) || 0;
      if (rAmt <= 0) continue;

      totalAmt += rAmt;
      const typeVal = tSelect.value || '|';
      const [rType, rSubtypeFromType] = typeVal.split('|');
      let rSubtype = rSubtypeFromType || "";
      if (sSelect && sSelect.offsetParent !== null) {
        rSubtype = sSelect.value;
      }
      let rMonth = "";
      if (mSelect && mSelect.offsetParent !== null) {
        rMonth = mSelect.value;
      }
      const rDesc = dInput.value.trim();

      items.push({
        type: rType,
        subtype: rSubtype,
        month: rMonth,
        desc: rDesc,
        amt: rAmt,
        amount: rAmt,
        description: rDesc
      });
    }

    if (items.length === 0) {
      alert("Total split amount must be greater than 0. ⚠️");
      submitBtn.disabled = false;
      btnText.innerText = "Update & Sync Entry 🔄";
      hideGlobalLoading();
      return;
    }

    const splitGroupId = window.originalEditSplitGroupId || ('SPLIT_' + Date.now() + '_' + Math.floor(Math.random() * 100000));

    formPayload.isSplitEntry = true;
    formPayload.splitGroupId = splitGroupId;
    formPayload.splitItems = items;
    formPayload.splitTotalAmount = totalAmt;
    formPayload.amount = totalAmt;
    if (mode === 'Receipt') {
      formPayload.receipt = totalAmt;
      formPayload.payment = "";
    } else if (mode === 'Payment') {
      formPayload.payment = totalAmt;
      formPayload.receipt = "";
    }

    // Use existing IDs for split items where available, generate new ones for the rest
    const existingIds = (window.originalEditAllTxIds && Array.isArray(window.originalEditAllTxIds) && window.originalEditAllTxIds.length > 0)
      ? [...window.originalEditAllTxIds]
      : [String(editId)];
    if (!existingIds.includes(String(editId))) {
      existingIds.unshift(String(editId));
    }

    const usedIds = new Set();
    items.forEach((item, index) => {
      const targetId = existingIds[index] || String(Date.now() + index);
      usedIds.add(String(targetId));

      let itemReceipt = (mode === 'Receipt') ? item.amt : "";
      let itemPayment = (mode === 'Payment') ? item.amt : "";

      const itemPayload = { ...formPayload };
      itemPayload.id = targetId;
      itemPayload.amount = item.amt;
      itemPayload.receipt = itemReceipt;
      itemPayload.payment = itemPayment;
      itemPayload.type = item.type;
      itemPayload.subtype = item.subtype || "";
      itemPayload.subMonth = item.month || "";
      itemPayload.description = item.desc || "";
      itemPayload.isSplitEntry = true;
      itemPayload.splitGroupId = splitGroupId;
      itemPayload.splitItems = items;
      itemPayload.isAddLedgerType = true;
      itemPayload.splitTotalAmount = totalAmt;

      saves.push(db.collection("transactions").doc(String(targetId)).set(itemPayload));
    });

    // Delete any old sibling records that were removed from the split
    existingIds.forEach(oldId => {
      if (!usedIds.has(String(oldId))) {
        saves.push(db.collection("transactions").doc(String(oldId)).delete());
        saves.push(db.collection("bank_transactions").doc(String(oldId)).delete());
      }
    });

    const isContraCash = (entryTypeVal === 'Cash' && items.some(it => it.type === 'Contra'));
    if (formPayload.entryType === 'Bank' || isContraCash) {
      const contraItem = items.find(it => it.type === 'Contra');
      const bSubtype = isContraCash ? (contraItem ? contraItem.subtype : '') : (formPayload.bankSubtype || '');
      let bankMode;
      if (bSubtype === 'Cash Deposit (Contra)' || bSubtype.toLowerCase().includes('cash deposit')) {
        bankMode = "Credit (Receipt)";
      } else if (bSubtype === 'Cash Withdrawal (Contra)' || bSubtype.toLowerCase().includes('cash withdrawal')) {
        bankMode = "Debit (Payment)";
      } else if (isContraCash) {
        bankMode = (mode === 'Receipt' ? "Debit (Payment)" : "Credit (Receipt)");
      } else {
        bankMode = (formPayload.mode === 'Receipt' || formPayload.mode === 'Credit (Receipt)') ? "Credit (Receipt)" : "Debit (Payment)";
      }

      const combinedDesc = items.map(it => {
        const typeName = (it.type || it.category || '').trim();
        const subName = (it.subtype || '').trim();
        const descName = (it.desc || it.description || it.particulars || it.month || '').trim();
        const amt = Number(it.amt || it.amount || 0);
        let label = typeName || subName || 'Split Item';
        if (subName && subName !== typeName && !label.toLowerCase().includes(subName.toLowerCase())) {
          label += ' - ' + subName;
        }
        if (descName && descName !== typeName && descName !== subName && !label.toLowerCase().includes(descName.toLowerCase())) {
          label += ' (' + descName + ')';
        }
        return `${label} (₹${formatCurrencyNoSymbol(amt)})`;
      }).filter(Boolean).join(' + ');

      const mainAcc = formPayload.accountName ? formPayload.accountName.trim() : "";
      const bankDesc = mainAcc && combinedDesc ? `${mainAcc} - ${combinedDesc}` : (mainAcc || combinedDesc || '-');

      const bankId = String(window.originalEditId || Date.now());
      const bankPayload = {
        id: bankId,
        date: formPayload.date,
        vrNo: formPayload.vrNo || '-',
        voucher_no: formPayload.vrNo || '-',
        accountName: formPayload.accountName || '',
        account_name: formPayload.accountName || '',
        name: formPayload.accountName || '',
        memberCode: formPayload.memberCode || '',
        member_code: formPayload.memberCode || '',
        address: formPayload.address || '',
        phone: formPayload.phone || '',
        memberId: formPayload.memberId || null,
        member_id: formPayload.memberId || null,
        description: bankDesc,
        particulars: bankDesc,
        amount: totalAmt,
        receipt: isCredit ? totalAmt : "",
        payment: !isCredit ? totalAmt : "",
        credit: isCredit ? totalAmt : 0,
        debit: !isCredit ? totalAmt : 0,
        account: formPayload.bankAccount,
        bankAccount: formPayload.bankAccount,
        mode: bankMode,
        bankSubtype: bSubtype,
        inCashBook: isContraCash ? true : (formPayload.addToCashBook === true),
        addToCashBook: isContraCash ? true : (formPayload.addToCashBook === true),
        entryType: "Bank",
        isCheque: formPayload.isCheque,
        chequeNo: formPayload.chequeNo || "",
        transactionId: formPayload.transactionId || "",
        splitGroupId: splitGroupId,
        isSplitEntry: true,
        splitItems: items
      };
      saves.push(db.collection("bank_transactions").doc(String(bankId)).set(bankPayload));
    }

  } else {
    // Single entry logic: NEVER delete editId! Update the record in place.
    formPayload.isSplitEntry = false;

    if (newEntryType === 'bank') {
      const isCredit = (mode === 'Receipt' || mode === 'Credit' || (mode && mode.includes('Credit')) || (formReceipt && Number(formReceipt) > 0));
      const bSubtype = formPayload.bankSubtype || formPayload.subtype || "";
      const isContraBank = bSubtype === 'Cash Deposit (Contra)' || bSubtype === 'Cash Withdrawal (Contra)' || bSubtype.toLowerCase().includes('cash deposit') || bSubtype.toLowerCase().includes('cash withdrawal');
      const shouldAddToCash = formPayload.addToCashBook === true || isContraBank;

      const bankPayload = {
        id: editId,
        date: formPayload.date,
        vrNo: isContraBank ? (editContraBankVrVal || formPayload.vrNo || '--') : (formPayload.vrNo || '--'),
        voucher_no: isContraBank ? (editContraBankVrVal || formPayload.vrNo || '--') : (formPayload.vrNo || '--'),
        contraVrNo: formPayload.vrNo,
        contra_vr_no: formPayload.vrNo,
        cashVrNo: formPayload.vrNo,
        cash_vr_no: formPayload.vrNo,
        description: formPayload.accountName && formPayload.description ? formPayload.accountName + " - " + formPayload.description : (formPayload.accountName || formPayload.description || '-'),
        particulars: formPayload.accountName && formPayload.description ? formPayload.accountName + " - " + formPayload.description : (formPayload.accountName || formPayload.description || '-'),
        amount: amountVal,
        receipt: isCredit ? amountVal : "",
        payment: !isCredit ? amountVal : "",
        credit: isCredit ? amountVal : 0,
        debit: !isCredit ? amountVal : 0,
        account: formPayload.bankAccount,
        bankAccount: formPayload.bankAccount,
        mode: isCredit ? "Credit (Receipt)" : "Debit (Payment)",
        type: formPayload.type || (bSubtype.includes('Interest') ? 'Bank Interest (Income)' : "Bank"),
        subtype: formPayload.subtype || formPayload.bankSubtype || bSubtype || "",
        category: formPayload.category || bSubtype || (bSubtype.includes('Interest') ? 'Bank Interest (Income)' : 'Bank'),
        bankSubtype: bSubtype,
        entryType: "Bank",
        isCheque: formPayload.isCheque,
        chequeNo: formPayload.chequeNo || "",
        transactionId: formPayload.transactionId || "",
        financialYear: formPayload.financialYear || "2026-2027",
        memberCode: formPayload.memberCode || "",
        member_code: formPayload.memberCode || "",
        accountName: formPayload.accountName || "",
        account_name: formPayload.accountName || "",
        name: formPayload.accountName || "",
        address: formPayload.address || "",
        phone: formPayload.phone || "",
        memberId: formPayload.memberId || null,
        member_id: formPayload.memberId || null,
        inCashBook: shouldAddToCash,
        addToCashBook: shouldAddToCash
      };
      saves.push(db.collection("bank_transactions").doc(String(editId)).set(bankPayload));
      // If previously in cash_book and not marked for cash book, remove from cash_book
      if (oldEntryType === 'cash' && !shouldAddToCash) {
        saves.push(db.collection("transactions").doc(String(editId)).delete());
      } else if (shouldAddToCash) {
        // Save counterpart/contra row in cash transactions
        const cashRcpt = isContraBank ? (!isCredit ? amountVal : "") : (isCredit ? amountVal : "");
        const cashPmt = isContraBank ? (isCredit ? amountVal : "") : (!isCredit ? amountVal : "");
        const cashPayload = {
          id: editId,
          date: formPayload.date,
          vrNo: formPayload.vrNo && formPayload.vrNo !== '--' ? formPayload.vrNo : (editContraBankVrVal || '--'),
          voucher_no: formPayload.vrNo && formPayload.vrNo !== '--' ? formPayload.vrNo : (editContraBankVrVal || '--'),
          contraVrNo: editContraBankVrVal || bankPayload.vrNo,
          contra_vr_no: editContraBankVrVal || bankPayload.vrNo,
          bankVrNo: editContraBankVrVal || bankPayload.vrNo,
          accountName: formPayload.accountName || (isCredit ? "Cash Deposit to Bank" : "Cash Withdrawal from Bank"),
          description: bankPayload.description,
          amount: amountVal,
          receipt: cashRcpt,
          payment: cashPmt,
          type: "Contra",
          subtype: bSubtype || "Contra",
          category: "Contra",
          entryType: "Bank",
          bankAccount: formPayload.bankAccount,
          bankSubtype: bSubtype,
          addToCashBook: true,
          inCashBook: true
        };
        saves.push(db.collection("transactions").doc(String(editId)).set(cashPayload));
      }
    } else {
      // Cash entry: update transactions (cash_book)
      saves.push(db.collection("transactions").doc(String(editId)).set(formPayload));
      // If previously in bank_book, remove from bank_book
      if (oldEntryType === 'bank') {
        saves.push(db.collection("bank_transactions").doc(String(editId)).delete());
      }
      // If it is a Cash Contra entry, also save counterpart bank record
      const isContraCash = (entryTypeVal === 'Cash' && parsedType === 'Contra');
      if (isContraCash) {
        const bSubtype = parsedSubtype || formPayload.bankSubtype || '';
        const bankMode = (bSubtype === 'Cash Deposit (Contra)') ? "Credit (Receipt)" : "Debit (Payment)";
        const isCredit = bankMode.includes('Credit');
        const bankPayload = {
          id: editId,
          date: formPayload.date,
          vrNo: editContraBankVrVal || (formPayload.vrNo ? (formPayload.vrNo.endsWith('/B') ? formPayload.vrNo : `${formPayload.vrNo}/B`) : '-'),
          contraVrNo: formPayload.vrNo,
          contra_vr_no: formPayload.vrNo,
          cashVrNo: formPayload.vrNo,
          cash_vr_no: formPayload.vrNo,
          description: formPayload.accountName && formPayload.description ? formPayload.accountName + " - " + formPayload.description : (formPayload.accountName || formPayload.description || '-'),
          amount: amountVal,
          receipt: isCredit ? amountVal : "",
          payment: !isCredit ? amountVal : "",
          credit: isCredit ? amountVal : 0,
          debit: !isCredit ? amountVal : 0,
          account: formPayload.bankAccount,
          mode: bankMode,
          bankSubtype: bSubtype,
          entryType: "Bank",
          isCheque: formPayload.isCheque,
          chequeNo: formPayload.chequeNo || "",
          transactionId: formPayload.transactionId || ""
        };
        saves.push(db.collection("bank_transactions").doc(String(editId)).set(bankPayload));
      }
    }

    // Clean up any other sibling records if this was converted from a split entry
    if (window.originalEditAllTxIds && Array.isArray(window.originalEditAllTxIds)) {
      window.originalEditAllTxIds.forEach(id => {
        if (String(id) !== String(editId)) {
          saves.push(db.collection("transactions").doc(String(id)).delete());
          saves.push(db.collection("bank_transactions").doc(String(id)).delete());
        }
      });
    }
  }

  if (mode === 'OpeningBalance' || (formPayload.description && formPayload.description.toLowerCase().includes('opening balance'))) {
    const txD = parseTxDate(formPayload) || new Date();
    const txM = txD.getMonth();
    const txY = txD.getFullYear();
    const fyKey = (txM >= 3) ? (txY + "-" + (txY + 1)) : ((txY - 1) + "-" + txY);

    let field = "cash";
    if (formPayload.entryType === "Bank") {
      if (formPayload.bankAccount === "SBI Fixed Deposit") field = "fd";
      else field = "sbi";
    }

    if (!window.openingBalancesStore[fyKey]) {
      window.openingBalancesStore[fyKey] = { cash: 0, sbi: 0, fd: 0 };
    }
    window.openingBalancesStore[fyKey][field] = amountVal;

    saves.push(
      db.collection("opening_balances").doc(fyKey).set(window.openingBalancesStore[fyKey])
    );
    saves.push(
      db.collection("opening_balances").doc("default").set(window.openingBalancesStore[fyKey])
    );
  }

  Promise.all(saves)
    .then(() => {
      onSuccess("Success");
    })
    .catch(onError);
}

// Delete Entry
function deleteEntryFromEditTab() {
  const editId = window.originalEditId;
  if (!editId) return;

  showCustomConfirm(`Just checking - are you absolutely sure you want to delete Voucher #${originalEditVrNo}? This cannot be undone. 🗑️`, () => {
    showGlobalLoading("Deleting voucher...");

    const allGen = (typeof allTimeGeneralTxList !== 'undefined') ? allTimeGeneralTxList : [];
    const allBank = (typeof loadedBankBookTransactions !== 'undefined') ? loadedBankBookTransactions : [];
    const allRawGen = (typeof globalRawTransactions !== 'undefined') ? globalRawTransactions : [];
    const allRawBank = (typeof globalRawBankTransactions !== 'undefined') ? globalRawBankTransactions : [];

    const targetDocIds = new Set();
    if (editId) targetDocIds.add(String(editId));
    if (window.originalEditAllTxIds && Array.isArray(window.originalEditAllTxIds)) {
      window.originalEditAllTxIds.forEach(id => targetDocIds.add(String(id)));
    }
    if (window.originalEditSplitGroupId) {
      const sg = window.originalEditSplitGroupId;
      allGen.forEach(t => { if (t.splitGroupId === sg) targetDocIds.add(String(t.id)); });
      allBank.forEach(t => { if (t.splitGroupId === sg) targetDocIds.add(String(t.id)); });
      allRawGen.forEach(t => { if (t.splitGroupId === sg) targetDocIds.add(String(t.id || t._docId)); });
      allRawBank.forEach(t => { if (t.splitGroupId === sg) targetDocIds.add(String(t.id || t._docId)); });
    }

    const oldVrClean = normalizeVrLocally(originalEditVrNo);
    if (oldVrClean && oldVrClean !== '-' && oldVrClean !== '--' && oldVrClean !== 'ob') {
      allGen.forEach(t => {
        if (normalizeVrLocally(t.vrNo) === oldVrClean || normalizeVrLocally(t.rcptNo) === oldVrClean || normalizeVrLocally(t.payNo) === oldVrClean) {
          targetDocIds.add(String(t.id));
        }
      });
      allBank.forEach(t => {
        if (normalizeVrLocally(t.vrNo) === oldVrClean || normalizeVrLocally(t.rcptNo) === oldVrClean || normalizeVrLocally(t.payNo) === oldVrClean) {
          targetDocIds.add(String(t.id));
        }
      });
      allRawGen.forEach(t => {
        if (normalizeVrLocally(t.vrNo) === oldVrClean || normalizeVrLocally(t.rcptNo) === oldVrClean || normalizeVrLocally(t.payNo) === oldVrClean) {
          targetDocIds.add(String(t.id || t._docId));
        }
      });
      allRawBank.forEach(t => {
        if (normalizeVrLocally(t.vrNo) === oldVrClean || normalizeVrLocally(t.rcptNo) === oldVrClean || normalizeVrLocally(t.payNo) === oldVrClean) {
          targetDocIds.add(String(t.id || t._docId));
        }
      });
    }

    const deletes = [];
    targetDocIds.forEach(id => {
      if (!id) return;
      deletes.push(db.collection("transactions").doc(String(id)).delete());
      deletes.push(db.collection("bank_transactions").doc(String(id)).delete());
      let mirrorId = String(id).includes("_mirror") ? String(id).replace("_mirror", "") : String(id) + "_mirror";
      deletes.push(db.collection("transactions").doc(mirrorId).delete());
      deletes.push(db.collection("bank_transactions").doc(mirrorId).delete());
    });

    Promise.all(deletes)
      .then(() => {
        hideGlobalLoading();
        syncSharedLinkForTransaction(originalEditVrNo, null, true);
        showEditAlert("Your entry is deleted successfully! 🗑️", "success");
        showAlert("Your entry is deleted successfully! 🗑️", "success");
        const targetDeletedTx = allGen.find(t => String(t.id) === String(editId) || (oldVrClean && normalizeVrLocally(t.vrNo) === oldVrClean)) || allBank.find(t => String(t.id) === String(editId) || (oldVrClean && normalizeVrLocally(t.vrNo) === oldVrClean));
        if (typeof speakSuccessMessage === 'function') speakSuccessMessage(targetDeletedTx || { vrNo: originalEditVrNo }, "deleted");
        setTimeout(() => { cancelEditModeTab({ type: 'deleted', vrNo: originalEditVrNo }); }, 500);
      })
      .catch(err => {
        hideGlobalLoading();
        showAlert("Oops! We couldn't delete it: " + err.message, "error");
      });
  }, "Delete Voucher", "Delete", true);
}

function cancelVoucherFromEditTab() {
  const editId = window.originalEditId;
  if (!editId) return;

  showCustomConfirm(`Are you sure you want to CANCEL Voucher #${originalEditVrNo}?\n\nThis will keep the voucher number but set its amount to 0 and mark it as CANCELLED.`, () => {
    showGlobalLoading("Cancelling voucher... 🚫");

    const allGen = (typeof allTimeGeneralTxList !== 'undefined') ? allTimeGeneralTxList : [];
    const allBank = (typeof loadedBankBookTransactions !== 'undefined') ? loadedBankBookTransactions : [];

    const targetDocIds = new Set();
    if (editId) targetDocIds.add(String(editId));
    if (window.originalEditAllTxIds && Array.isArray(window.originalEditAllTxIds)) {
      window.originalEditAllTxIds.forEach(id => targetDocIds.add(String(id)));
    }
    if (window.originalEditSplitGroupId) {
      const sg = window.originalEditSplitGroupId;
      allGen.forEach(t => { if (t.splitGroupId === sg) targetDocIds.add(String(t.id)); });
      allBank.forEach(t => { if (t.splitGroupId === sg) targetDocIds.add(String(t.id)); });
    }

    const oldVrClean = normalizeVrLocally(originalEditVrNo);
    if (oldVrClean && oldVrClean !== '-' && oldVrClean !== '--' && oldVrClean !== 'ob') {
      allGen.forEach(t => {
        if (normalizeVrLocally(t.vrNo) === oldVrClean || normalizeVrLocally(t.rcptNo) === oldVrClean || normalizeVrLocally(t.payNo) === oldVrClean) {
          targetDocIds.add(String(t.id));
        }
      });
      allBank.forEach(t => {
        if (normalizeVrLocally(t.vrNo) === oldVrClean || normalizeVrLocally(t.rcptNo) === oldVrClean || normalizeVrLocally(t.payNo) === oldVrClean) {
          targetDocIds.add(String(t.id));
        }
      });
    }

    const cancelDesc = "[CANCELLED]";
    const updates = [];

    targetDocIds.forEach(id => {
      updates.push(
        db.collection("transactions").doc(String(id)).update({
          amount: 0,
          receipt: 0,
          payment: 0,
          description: cancelDesc,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => Promise.resolve())
      );
      updates.push(
        db.collection("bank_transactions").doc(String(id)).update({
          amount: 0,
          description: cancelDesc
        }).catch(() => Promise.resolve())
      );
    });

    Promise.all(updates)
      .then(() => {
        hideGlobalLoading();
        syncSharedLinkForTransaction(originalEditVrNo, { description: '[CANCELLED]', receipt: 0, payment: 0, amount: 0 }, true);
        showEditAlert("Your entry is cancelled successfully! 🚫", "success");
        showAlert("Your entry is cancelled successfully! 🚫", "success");
        const targetCancelledTx = allGen.find(t => String(t.id) === String(editId) || (oldVrClean && normalizeVrLocally(t.vrNo) === oldVrClean)) || allBank.find(t => String(t.id) === String(editId) || (oldVrClean && normalizeVrLocally(t.vrNo) === oldVrClean));
        if (typeof speakSuccessMessage === 'function') speakSuccessMessage(targetCancelledTx || { vrNo: originalEditVrNo }, "cancelled");
        setTimeout(() => { cancelEditModeTab({ type: 'cancelled', vrNo: originalEditVrNo }); }, 500);
      })
      .catch(err => {
        hideGlobalLoading();
        showAlert("Oops! We couldn't cancel it: " + err.message, "error");
      });
  }, "Cancel Voucher", "Confirm Cancel", true);
}

function cancelEditModeTab(actionInfo = null) {
  isEditMode = false;
  originalEditVrNo = "";
  document.getElementById('editSearchInput').value = "";
  document.getElementById('editFormCard').style.display = 'none';

  if (actionInfo) {
    showEditActionStatus(actionInfo.type, actionInfo.vrNo, actionInfo.message);
  } else {
    const statusCard = document.getElementById('editActionStatusCard');
    if (statusCard) statusCard.style.display = 'none';
  }
}

function showEditActionStatus(type, vrNo, message) {
  const statusCard = document.getElementById('editActionStatusCard');
  if (!statusCard) return;

  const iconEl = document.getElementById('editActionStatusIcon');
  const titleEl = document.getElementById('editActionStatusTitle');
  const msgEl = document.getElementById('editActionStatusMsg');

  let icon = '✅';
  let title = 'Entry Updated Successfully!';
  let defaultMsg = `Voucher #${vrNo || ''} has been updated and synced safely.`;

  if (type === 'deleted') {
    icon = '🗑️';
    title = 'Entry Deleted Successfully!';
    defaultMsg = `Voucher #${vrNo || ''} and all associated records have been removed.`;
  } else if (type === 'cancelled') {
    icon = '🚫';
    title = 'Voucher Cancelled Successfully!';
    defaultMsg = `Voucher #${vrNo || ''} has been marked as cancelled with ₹0 amount.`;
  }

  if (iconEl) iconEl.innerText = icon;
  if (titleEl) titleEl.innerText = title;
  if (msgEl) msgEl.innerText = message || defaultMsg;

  statusCard.style.display = 'block';
}

function focusEditSearch() {
  const searchInput = document.getElementById('editSearchInput');
  const statusCard = document.getElementById('editActionStatusCard');
  if (statusCard) statusCard.style.display = 'none';
  if (searchInput) {
    searchInput.value = "";
    searchInput.focus();
  }
}

function showEditAlert(msg, type) {
  const banner = document.getElementById('edit_alertBanner');
  if (!banner) return;
  banner.className = "alert-banner " + type;
  banner.innerHTML = msg;
  banner.style.display = 'block';
  setTimeout(() => { banner.style.display = 'none'; }, 4000);
}

// ============================================================
// BANK BOOK TAB JS HANDLERS
// ============================================================
let loadedBankBookTransactions = [];

function refreshBankBookData(forceReload = false) {
  const tbody = document.getElementById('bankBookTableBody');

  if (!forceReload && loadedBankBookTransactions && loadedBankBookTransactions.length > 0) {
    renderBankBookTransactions();
    return;
  }

  if (!loadedBankBookTransactions || loadedBankBookTransactions.length === 0) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 24px;">⏳ Loading Bank Book data...</td></tr>';
  }

  const onSuccess = function (res) {
    if (res && res.success && res.transactions) {
      allTimeBankBookList = res.transactions;
      loadedBankBookTransactions = filterListByFY(allTimeBankBookList);

      if (res.printStatusMap) {
        Object.assign(globalPrintStatusMap, res.printStatusMap);
      }
      renderBankBookTransactions();
    } else {
      if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #dc2626; padding: 24px;">❌ Error: ' + (res.message || "Could not load bank book data.") + '</td></tr>';
    }
  };

  onSuccess({
    success: true,
    transactions: allTimeBankBookList
  });
}

function formatSplitItemsDescription(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items.map(it => {
    let typeName = (it.type || it.category || '').trim();
    let subName = (it.subtype || '').trim();
    let descName = (it.desc || it.description || it.particulars || it.month || '').trim();
    let amt = Number(it.amt || it.amount || it.receipt || it.payment || 0);
    let amtStr = typeof formatCurrencyNoDecimals === 'function' ? formatCurrencyNoDecimals(amt) : ('₹' + amt);

    let label = typeName || subName || 'Split Item';
    if (subName && subName !== typeName && !label.toLowerCase().includes(subName.toLowerCase())) {
      label += ' - ' + subName;
    }
    if (descName && descName !== typeName && descName !== subName && !label.toLowerCase().includes(descName.toLowerCase())) {
      label += ' (' + descName + ')';
    }
    return `${label} (${amtStr})`;
  }).join(' + ');
}

function renderBankBookTransactions() {
  const tbody = document.getElementById('bankBookTableBody');
  if (!tbody) return;

  const searchVal = (document.getElementById('bankBookSearchInput') ? document.getElementById('bankBookSearchInput').value : '').toLowerCase().trim();
  const accountFilter = document.getElementById('bankBookAccountFilter') ? document.getElementById('bankBookAccountFilter').value : 'ALL';
  const modeFilter = document.getElementById('bankBookModeFilter') ? document.getElementById('bankBookModeFilter').value : 'ALL';

  let cf = calculateCarryForward();
  let openingBal = 0;
  if (accountFilter === 'State Bank of India') openingBal = cf.sbi;
  else if (accountFilter === 'SBI Fixed Deposit') openingBal = cf.fd;
  else openingBal = cf.sbi + cf.fd;

  let currentBal = openingBal;

  const filtered = loadedBankBookTransactions.filter(tx => {
    // Account Filter
    if (accountFilter !== 'ALL') {
      const filterLower = accountFilter.toLowerCase();
      const accLower = (tx.account || tx.accountName || tx.account_name || tx.bankAccount || tx.bank_account || '').toLowerCase();
      const isFD = filterLower.includes('fixed deposit') || filterLower.includes('fd');
      const txIsFD = accLower.includes('fixed deposit') || accLower.includes('fd');
      if (isFD !== txIsFD) return false;
    }

    const type = (tx.type || '').toLowerCase();
    const desc = (tx.description || '').toLowerCase();
    const name = (tx.name || tx.accountName || '').toLowerCase();
    const isOpeningBalance = type === 'opening balance' || desc.includes('opening balance') || name.includes('opening balance');

    const isCredit = isTxReceipt(tx) === 1;

    if (isOpeningBalance) {
      return false; // cf already includes opening balance
    } else {
      const amt = Number(tx.amount || tx.receipt || tx.payment || tx.payments || 0);
      if (isCredit) {
        currentBal += amt;
      } else {
        currentBal -= amt;
      }
    }

    // Mode Filter
    if (modeFilter !== 'ALL') {
      if (modeFilter === 'Credit' && !isCredit) return false;
      if (modeFilter === 'Debit' && isCredit) return false;
    }

    // Search Filter
    if (searchVal) {
      const desc = (tx.description || '').toLowerCase();
      const vrNo = (tx.vrNo || '').toLowerCase();
      const acc = (tx.account || '').toLowerCase();
      const chq = String(tx.chequeNo || tx.chqNo || '').toLowerCase();
      const accName = (tx.accountName || tx.name || '').toLowerCase();
      const mCode = (tx.memberCode || '').toLowerCase();
      const addr = (tx.address || '').toLowerCase();
      if (!desc.includes(searchVal) && !vrNo.includes(searchVal) && !acc.includes(searchVal) && !chq.includes(searchVal) && !accName.includes(searchVal) && !mCode.includes(searchVal) && !addr.includes(searchVal)) return false;
    }

    return true;
  });

  const _cf2 = calculateCarryForward();
  let sbiCurrentBal = _cf2.sbi;
  let sbiFdBal = _cf2.fd;

  if (loadedBankBookTransactions && loadedBankBookTransactions.length > 0) {
    loadedBankBookTransactions.forEach(tx => {
      const type = (tx.type || '').toLowerCase();
      const desc = (tx.description || '').toLowerCase();
      const name = (tx.name || tx.accountName || '').toLowerCase();
      const isOpening = type === 'opening balance' || desc.includes('opening balance') || name.includes('opening balance');
      if (isOpening) return;

      const isCredit = isTxReceipt(tx) === 1;
      const amt = Number(tx.amount || tx.receipt || tx.payment || tx.payments || 0);
      const accLower = (tx.account || '').toLowerCase();

      if (accLower.includes('fixed deposit') || accLower.includes('fd')) {
        if (isCredit) sbiFdBal += amt;
        else sbiFdBal -= amt;
      } else {
        if (isCredit) sbiCurrentBal += amt;
        else sbiCurrentBal -= amt;
      }
    });
  }

  const totalBankBal = sbiCurrentBal + sbiFdBal;

  if (document.getElementById('bankBookTabBalanceSBI')) document.getElementById('bankBookTabBalanceSBI').innerText = formatCurrency(sbiCurrentBal);
  if (document.getElementById('bankBookTabOpeningBalanceSBI')) document.getElementById('bankBookTabOpeningBalanceSBI').innerText = formatCurrency(sbiCurrentBal);

  if (document.getElementById('bankBookTabBalanceFD')) document.getElementById('bankBookTabBalanceFD').innerText = formatCurrency(sbiFdBal);
  if (document.getElementById('bankBookTabOpeningBalanceFD')) document.getElementById('bankBookTabOpeningBalanceFD').innerText = formatCurrency(sbiFdBal);

  if (document.getElementById('bankBookTabBalance')) document.getElementById('bankBookTabBalance').innerText = formatCurrency(accountFilter === 'ALL' ? totalBankBal : currentBal);
  if (document.getElementById('bankBookTabTotalBalance')) document.getElementById('bankBookTabTotalBalance').innerText = formatCurrency(totalBankBal);

  tbody.innerHTML = '';

  const groupedFiltered = [];
  const baseVrMap = {};
  filtered.forEach(tx => {
    let rawVr = tx.vrNo || '';
    let cleanVr = normalizeVrLocally(rawVr);
    let isBlankVr = !cleanVr || cleanVr === '-' || cleanVr === '--' || cleanVr === 'ob';

    const isCredit = isTxReceipt(tx) === 1;
    const modeStr = isCredit ? 'Credit' : 'Debit';

    let groupingKey;
    if (tx.splitGroupId) {
      groupingKey = 'split_' + tx.splitGroupId;
    } else if (tx.transactionId && String(tx.transactionId).trim() !== '') {
      groupingKey = 'txid_' + tx.transactionId;
    } else if (!isBlankVr) {
      groupingKey = cleanVr + '_' + (tx.date || '') + '_' + modeStr;
    } else if (tx.isSplitEntry) {
      groupingKey = 'split_legacy_' + (tx.date || '') + '_' + (tx.accountName || '') + '_' + modeStr + '_' + (tx.splitTotalAmount || '');
    } else {
      groupingKey = 'unique_' + tx.id;
    }
    let key = groupingKey + '_' + (tx.account || '');

    let typeStr = (tx.subtype || tx.type || '').trim();
    if (tx.type === 'Charity' && (tx.subtype === 'Paid' || tx.subtype === 'Received' || tx.subtype === 'paid' || tx.subtype === 'received')) {
      typeStr = 'Charity ' + tx.subtype.charAt(0).toUpperCase() + tx.subtype.slice(1);
    }
    let dStr = (tx.description || '').trim();
    let parts = [];
    if (typeStr && typeStr !== '-' && typeStr !== 'Bank' && typeStr !== 'Cash') parts.push(typeStr);
    if (dStr && dStr !== '-') parts.push(dStr);

    let finalParts = [];
    parts.forEach(p => {
      let isDuplicate = finalParts.some(fp => fp.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(fp.toLowerCase()));
      if (!isDuplicate) finalParts.push(p);
    });
    let txFullDesc = finalParts.join(' - ') || '-';

    const singleChq = (tx.chequeNo || tx.chqNo || '').trim();
    const txSplitList = (Array.isArray(tx.splitItems) && tx.splitItems.length > 0)
      ? tx.splitItems
      : ((Array.isArray(tx._splitItems) && tx._splitItems.length > 0) ? tx._splitItems : null);

    if (!baseVrMap[key] || isBlankVr) {
      const newTx = Object.assign({}, tx);
      newTx.originalVr = rawVr;
      newTx.displayVr = isBlankVr ? '-' : rawVr;
      newTx.amount = Number(tx.amount || tx.receipt || tx.payment || tx.payments || 0);
      newTx.allVrNos = rawVr ? [rawVr] : [];
      newTx.allTxIds = [tx.id];
      newTx.allChequeNos = singleChq ? [singleChq] : [];
      newTx.description = txFullDesc;
      newTx._splitItems = txSplitList ? [...txSplitList] : [tx];
      newTx._descParts = [{
        text: txFullDesc,
        type: typeStr,
        amount: newTx.amount,
        desc: dStr
      }];
      if (!isBlankVr) baseVrMap[key] = newTx;
      groupedFiltered.push(newTx);
    } else {
      const target = baseVrMap[key];
      const curAmt = Number(tx.amount || tx.receipt || tx.payment || tx.payments || 0);
      target.amount += curAmt;
      if (rawVr && !target.allVrNos.includes(rawVr)) {
        target.allVrNos.push(rawVr);
      }
      if (!target.allTxIds.includes(tx.id)) {
        target.allTxIds.push(tx.id);
      }
      if (singleChq && !target.allChequeNos.includes(singleChq)) {
        target.allChequeNos.push(singleChq);
      }
      if (!target.accountName && tx.accountName) {
        target.accountName = tx.accountName;
        target.memberCode = tx.memberCode || target.memberCode;
        target.address = tx.address || target.address;
      }
      if (txSplitList) {
        if (!target._splitItems) target._splitItems = [];
        target._splitItems.push(...txSplitList);
      } else {
        if (!target._splitItems) target._splitItems = [];
        target._splitItems.push(tx);
      }
      if (!target._descParts) target._descParts = [];
      target._descParts.push({
        text: txFullDesc,
        type: typeStr,
        amount: curAmt,
        desc: dStr
      });
      if (tx.inCashBook) {
        target.inCashBook = true;
      }
    }
  });

  // Define and format split descriptions for Bank Book (e.g. Subscription: ₹2,500 + Charity: ₹500)
  groupedFiltered.forEach(tx => {
    if (Array.isArray(tx._splitItems) && tx._splitItems.length > 1) {
      tx.description = formatSplitItemsDescription(tx._splitItems);
    } else if (Array.isArray(tx.splitItems) && tx.splitItems.length > 1) {
      tx.description = formatSplitItemsDescription(tx.splitItems);
    } else if (Array.isArray(tx._descParts) && tx._descParts.length > 1) {
      tx.description = tx._descParts.map(p => {
        const amtStr = typeof formatCurrencyNoDecimals === 'function' ? formatCurrencyNoDecimals(p.amount) : ('₹' + p.amount);
        const label = p.type ? (p.text && !p.text.startsWith(p.type) ? `${p.type}: ${p.text}` : p.text) : p.text;
        return `${label} (${amtStr})`;
      }).join(' + ');
    }
  });

  const fyStartDate = getActiveFyStartDate();
  const sbiObTx = {
    _isOpeningBalanceRow: true,
    id: 'OB_SBI',
    date: fyStartDate,
    vrNo: 'OB',
    chqNo: 'OB',
    originalVr: 'OB',
    displayVr: 'OB',
    account: 'State Bank of India',
    description: 'Opening Balance (State Bank of India Current A/c)',
    amount: cf.sbi || 0,
    mode: 'Receipt',
    inCashBook: false
  };

  const fdObTx = {
    _isOpeningBalanceRow: true,
    id: 'OB_FD',
    date: fyStartDate,
    vrNo: 'OB',
    chqNo: 'OB',
    originalVr: 'OB',
    displayVr: 'OB',
    account: 'SBI Fixed Deposit',
    description: 'Opening Balance (SBI Fixed Deposit)',
    amount: cf.fd || 0,
    mode: 'Receipt',
    inCashBook: false
  };

  const showOb = (!modeFilter || modeFilter === 'ALL' || modeFilter === 'Credit') &&
    (!searchVal || 'opening balance'.includes(searchVal) || 'ob'.includes(searchVal) || 'state bank'.includes(searchVal) || 'sbi'.includes(searchVal) || 'fixed deposit'.includes(searchVal));

  const groupedByAcc = {};

  groupedFiltered.forEach(tx => {
    const rawAcc = tx.account || tx.bank_account || tx.bankAccount || tx.accountName || tx.account_name || "State Bank of India";
    const acc = (rawAcc.toLowerCase().includes('fixed deposit') || rawAcc.toLowerCase().includes('fd'))
      ? 'SBI Fixed Deposit'
      : 'State Bank of India';
    if (!groupedByAcc[acc]) groupedByAcc[acc] = [];
    groupedByAcc[acc].push(tx);
  });

  if (showOb) {
    if (accountFilter === 'ALL' || accountFilter.toLowerCase().includes('state bank') || accountFilter.toLowerCase() === 'sbi') {
      if (!groupedByAcc['State Bank of India']) groupedByAcc['State Bank of India'] = [];
      groupedByAcc['State Bank of India'].push(sbiObTx);
    }
    if (accountFilter === 'ALL' || accountFilter.toLowerCase().includes('fixed deposit') || accountFilter.toLowerCase() === 'fd') {
      if (!groupedByAcc['SBI Fixed Deposit']) groupedByAcc['SBI Fixed Deposit'] = [];
      groupedByAcc['SBI Fixed Deposit'].push(fdObTx);
    }
  }

  const sortedKeys = Object.keys(groupedByAcc).sort((a, b) => {
    const isFdA = a.toLowerCase().includes("fixed");
    const isFdB = b.toLowerCase().includes("fixed");
    if (isFdA !== isFdB) return isFdA ? 1 : -1;
    return a.localeCompare(b);
  });

  if (sortedKeys.length > 0) {
    sortedKeys.forEach(acc => {
      const isFD = acc.toLowerCase().includes("fixed") || acc.toLowerCase().includes("fd");
      let accOpeningBal = isFD ? (cf.fd || 0) : (cf.sbi || 0);
      let accRunningBal = accOpeningBal;

      tbody.innerHTML += `<tr><td colspan="9" style="background: #e2e8f0; font-weight: 700; text-align: left; padding: 8px 12px; color: #0f172a; font-size: 0.95rem;">${acc}</td></tr>`;

      const listForAcc = groupedByAcc[acc] || [];

      // 1. Sort chronologically first (OB first, then date ascending, same date Credit before Debit, then Vr No ascending)
      listForAcc.sort((a, b) => {
        if (a._isOpeningBalanceRow && !b._isOpeningBalanceRow) return -1;
        if (!a._isOpeningBalanceRow && b._isOpeningBalanceRow) return 1;
        if (a._isOpeningBalanceRow && b._isOpeningBalanceRow) return 0;
        const dateA = typeof parseTxDate === 'function' ? parseTxDate(a) : new Date(a.date);
        const dateB = typeof parseTxDate === 'function' ? parseTxDate(b) : new Date(b.date);
        const timeA = dateA ? dateA.getTime() : 0;
        const timeB = dateB ? dateB.getTime() : 0;
        if (timeA !== timeB) return timeA - timeB;
        const isRcptA = isTxReceipt(a);
        const isRcptB = isTxReceipt(b);
        if (isRcptA !== isRcptB) return isRcptB - isRcptA; // Credit (1) before Debit (0)
        const numA = typeof parseVrNoForSort === 'function' ? parseVrNoForSort(a.vrNo) : { main: 0, sub: 0 };
        const numB = typeof parseVrNoForSort === 'function' ? parseVrNoForSort(b.vrNo) : { main: 0, sub: 0 };
        if (numA.main !== numB.main) return numA.main - numB.main;
        return (a.vrNo || '').localeCompare(b.vrNo || '', undefined, { numeric: true });
      });

      // Calculate running balance in chronological order (accumulating from Opening Balance forward)
      listForAcc.forEach(tx => {
        if (tx._isOpeningBalanceRow) {
          tx._runningBalance = accOpeningBal;
        } else {
          const isCredit = isTxReceipt(tx) === 1;
          const amt = Number(tx.amount || tx.receipt || tx.payment || tx.payments || 0);
          if (isCredit) {
            accRunningBal += amt;
          } else {
            accRunningBal -= amt;
          }
          tx._runningBalance = accRunningBal;
        }
      });

      // 2. Reverse to display latest date first (exact reverse of chronological sequence, OB at bottom)
      listForAcc.reverse();

      listForAcc.forEach(tx => {
        if (tx._isOpeningBalanceRow) {
          tbody.innerHTML += `
            <tr style="background: #f0f9ff; border-bottom: 2px solid #bae6fd; font-weight: 700;">
              <td style="text-align: center; color: #0284c7;">•</td>
              <td style="font-weight: 600; color: #0369a1; white-space: nowrap;">-</td>
              <td style="font-weight: 800; color: #0284c7; text-align: center;">OB</td>
              <td style="font-weight: 700; color: #1e293b;">${tx.account}</td>
              <td style="color: #0369a1;">${tx.description}</td>
              <td class="num-col rcpt-val" style="font-weight: 800; color: #047857; text-align: right;">${tx.amount ? formatCurrency(tx.amount) : '-'}</td>
              <td class="num-col exp-val" style="font-weight: 700; color: #94a3b8; text-align: right;">-</td>
              <td class="num-col" style="font-weight: 800; color: #0284c7; text-align: right;">${formatCurrency(tx._runningBalance)}</td>
              <td style="text-align: center; color: #94a3b8;">-</td>
            </tr>
          `;
          return;
        }

        const isCredit = isTxReceipt(tx) === 1;
        const amt = Number(tx.amount || tx.receipt || tx.payment || tx.payments || 0);
        const cleanDate = formatDateClean(tx.date);
        const cleanVr = formatVrNoClean(tx.originalVr);
        const isPrinted = '';
        let vrNosList = tx.allVrNos ? Array.from(new Set(tx.allVrNos.filter(v => v && v !== '-' && v !== '--'))) : [];
        let uniqueBaseVrs = new Set();
        vrNosList.forEach(v => {
          let b = v;
          if (v.includes('/')) b = v.split('/')[0];
          else if (v.includes('-') && !v.startsWith('-')) b = v.split('-')[0];
          uniqueBaseVrs.add(b);
        });
        let displayVr = uniqueBaseVrs.size > 1 ? vrNosList.join(', ') : (tx.displayVr || cleanVr);
        const contraCashVr = tx.contra_vr_no || tx.contraVrNo || tx.cash_vr_no || tx.cashVrNo || '';
        const isBankContra = (tx.bankSubtype && tx.bankSubtype.includes('Contra')) || (tx.category && tx.category.includes('Contra')) || (tx.particulars && tx.particulars.toLowerCase().includes('cash deposit')) || (tx.particulars && tx.particulars.toLowerCase().includes('cash withdrawal')) || (tx.description && tx.description.toLowerCase().includes('cash deposit')) || (tx.description && tx.description.toLowerCase().includes('cash withdrawal'));
        if (isBankContra && contraCashVr && contraCashVr !== displayVr && contraCashVr !== '-' && contraCashVr !== '--') {
          displayVr = `<div>${displayVr}</div><span style="display:inline-block; font-size:10px; color:#059669; font-weight:700; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:3px; padding:1px 4px; margin-top:2px;" title="Paired Cash Voucher No.">Cash: ${contraCashVr}</span>`;
        }

        let printBtnHtml = '';
        const printVrTarget = (cleanVr && cleanVr !== '-' && cleanVr !== '--') ? cleanVr : (contraCashVr || '');
        if (printVrTarget) {
          if (isCredit) {
            printBtnHtml = `<button class="btn-action btn-table-action" style="background: #059669; color: #ffffff; border: none; padding-right: 4px;" onclick="openReceiptModalByVrNo('${printVrTarget}', '${tx.id}', 'Bank')" title="Print Receipt">🧾${isPrinted}${tx.whatsappSent ? ' <span title="WhatsApp Sent" style="font-size: 0.8rem; margin-left: 2px;">💬</span>' : ''}</button>`;
          } else {
            printBtnHtml = `<button class="btn-action btn-table-action" style="background: #dc2626; color: #ffffff; border: none; padding-right: 4px;" onclick="openPaymentVoucherModalByVrNo('${printVrTarget}', '${tx.id}', 'Bank')" title="Print Voucher">🧾${isPrinted}${tx.whatsappSent ? ' <span title="WhatsApp Sent" style="font-size: 0.8rem; margin-left: 2px;">💬</span>' : ''}</button>`;
          }
        }

        const isCombined = tx.allVrNos && tx.allVrNos.length > 1;
        const combinedIconHtml = isCombined ? `<button class="btn-action btn-table-action" style="background: #0f172a; color: #ffffff; border: none; padding-right: 4px;" onclick="showCombinedDetails('${(tx.allTxIds || []).join(',')}')" title="View Combined Entries">👁️</button>` : '';

        let chequeNoList = tx.allChequeNos ? Array.from(new Set(tx.allChequeNos.map(v => String(v || '').trim()).filter(v => v && v !== '-' && v !== '--' && v.toLowerCase() !== 'null' && v.toLowerCase() !== 'undefined' && v.toLowerCase() !== 'none'))) : [];
        const singleChq = String(tx.chequeNo || tx.chqNo || '').trim();
        if (chequeNoList.length === 0 && singleChq && singleChq !== '-' && singleChq !== '--' && singleChq.toLowerCase() !== 'null' && singleChq.toLowerCase() !== 'undefined' && singleChq.toLowerCase() !== 'none') {
          chequeNoList = [singleChq];
        }
        let chqHtml = '';
        if (chequeNoList.length > 0) {
          chqHtml = `<div style="font-size: 0.75rem; color: #1d4ed8; font-weight: 700; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 1px 4px; margin-top: 3px; display: inline-block;">Chq: ${chequeNoList.join(', ')}</div>`;
        }

        const txIdsAttr = (tx.allTxIds || [tx.id]).filter(Boolean).join(',');
        const splitGroupAttr = tx.splitGroupId || '';

        const rawMemberName = (tx.accountName && tx.accountName !== '-') ? tx.accountName : ((tx.name && tx.name !== '-') ? tx.name : '');
        const addr = resolveMemberAddress(tx);
        const memCode = tx.memberCode || (rawMemberName ? getMemberCode(rawMemberName, addr) : '');
        let memberCellHtml = '';
        if (rawMemberName) {
          const formattedMemberName = formatMemberDisplayName(rawMemberName, tx.title || '');
          memberCellHtml = `
            <div style="font-weight: 700; color: #0f172a; line-height: 1.25;">
              ${formattedMemberName}
              ${(memCode && memCode !== '-') ? `<span style="font-size: 0.72rem; color: #4338ca; background: #e0e7ff; padding: 1px 5px; border-radius: 4px; font-weight: 700; margin-left: 4px;">${memCode}</span>` : ''}
            </div>
            ${addr ? `<div style="font-size: 0.75rem; color: #64748b; font-weight: normal; margin-top: 2px; line-height: 1.2;">📍 ${addr}</div>` : ''}
            <div style="color: #475569; font-size: 0.85rem; margin-top: 3px; line-height: 1.25;">${tx.description || '-'}</div>
          `;
        } else {
          memberCellHtml = `<div style="line-height: 1.3;">${tx.description || '-'}</div>`;
        }

        tbody.innerHTML += `
              <tr>
                <td style="text-align: center;"><input type="checkbox" class="bank-batch-checkbox" value="${cleanVr}" data-tx-ids="${txIdsAttr}" data-split-group="${splitGroupAttr}"></td>
                <td style="font-weight: 600; white-space: nowrap;">${formatDateHtml(tx.date)}</td>
                <td style="font-weight: 700; text-align: center;"><div>${displayVr}</div>${chqHtml}</td>
                <td style="font-weight: 600;">${tx.account || tx.bankAccount || 'State Bank of India'}</td>
                <td>${memberCellHtml}</td>
                <td class="num-col rcpt-val" style="font-weight: 700; color: #047857; text-align: right;">${isCredit ? formatCurrency(amt) : '-'}</td>
                <td class="num-col exp-val" style="font-weight: 700; color: #b91c1c; text-align: right;">${!isCredit ? formatCurrency(amt) : '-'}</td>
                <td class="num-col" style="font-weight: 700; color: #0369a1; text-align: right;">${formatCurrency(tx._runningBalance)}</td>
                <td style="text-align: center; white-space: nowrap;">
                  ${combinedIconHtml}
                  <button class="btn-action btn-table-action" style="background: #2563eb; color: #ffffff; border: none;" onclick="loadEntryForEdit('${cleanVr}', '${tx.id}', 'Bank')" title="Edit Entry">✏️</button>
                  ${printBtnHtml}
                </td>
              </tr>
            `;
      });
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #94a3b8; padding: 24px;">No bank book transactions found</td></tr>';
  }
}

window.closeCombinedEntriesModal = function () {
  const modal = document.getElementById('combinedEntriesModal');
  if (modal) modal.style.display = 'none';
};

window.showCombinedDetails = function (txIdsString) {
  const txIds = txIdsString.split(',');
  const container = document.getElementById('combinedEntriesContent');
  const modal = document.getElementById('combinedEntriesModal');
  if (!container || !modal) return;

  let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
  let total = 0;

  txIds.forEach(id => {
    let txId = String(id).trim();
    let tx = allTimeGeneralTxList.find(t => String(t.id) === txId);
    if (!tx && typeof loadedBankBookTransactions !== 'undefined') {
      tx = loadedBankBookTransactions.find(t => String(t.id) === txId);
    }

    if (tx) {
      let cleanVr = String(tx.vrNo || '').trim();
      const splitItems = (Array.isArray(tx.splitItems) && tx.splitItems.length > 0)
        ? tx.splitItems
        : ((Array.isArray(tx._splitItems) && tx._splitItems.length > 0) ? tx._splitItems : null);

      if (splitItems && splitItems.length > 1) {
        splitItems.forEach((it, sIdx) => {
          let sAmt = Number(it.amt || it.amount || it.receipt || it.payment || 0);
          let sType = (it.type || it.category || 'Split Item').trim();
          let sSub = (it.subtype || '').trim();
          let sDesc = (it.desc || it.description || it.particulars || it.month || '').trim();
          let label = sType;
          if (sSub && sSub !== sType) label += ' - ' + sSub;
          if (sDesc && sDesc !== sType && sDesc !== sSub) label += ` (${sDesc})`;

          let badgeColor = '#2563eb';
          let badgeBg = '#eff6ff';
          let badgeBorder = '#bfdbfe';
          const tLower = sType.toLowerCase();
          if (tLower.includes('subscr')) {
            badgeColor = '#4338ca'; badgeBg = '#e0e7ff'; badgeBorder = '#c7d2fe';
          } else if (tLower.includes('charity')) {
            badgeColor = '#059669'; badgeBg = '#ecfdf5'; badgeBorder = '#a7f3d0';
          } else if (tLower.includes('offer')) {
            badgeColor = '#d97706'; badgeBg = '#fef3c7'; badgeBorder = '#fde68a';
          }

          html += `
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); position: relative;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 0.75rem; font-weight: 700; color: ${badgeColor}; background: ${badgeBg}; border: 1px solid ${badgeBorder}; padding: 2px 8px; border-radius: 9999px;">🏷️ ${sType}</span>
                <span style="font-weight: 800; font-size: 1rem; color: #0f172a;">${formatCurrency(sAmt)}</span>
              </div>
              <div style="font-size: 0.88rem; color: #334155; font-weight: 600;">${label}</div>
            </div>
          `;
          total += sAmt;
        });
      } else {
        let amt = Number(tx.amount || tx.receipt || tx.payment || tx.payments || 0);
        let nameStr = (tx.accountName || tx.name || '').trim();
        let typeStr = (tx.subtype || tx.type || '').trim();
        if (tx.type === 'Charity' && (tx.subtype === 'Paid' || tx.subtype === 'Received' || tx.subtype === 'paid' || tx.subtype === 'received')) {
          typeStr = 'Charity ' + tx.subtype.charAt(0).toUpperCase() + tx.subtype.slice(1);
        }
        let descStr = (tx.description || '').trim();

        let parts = [];
        if (nameStr && nameStr !== '-') parts.push(nameStr);
        if (typeStr && typeStr !== '-' && typeStr !== 'Bank' && typeStr !== 'Cash') parts.push(typeStr);
        if (descStr && descStr !== '-') parts.push(descStr);

        let finalParts = [];
        parts.forEach(p => {
          let isDuplicate = finalParts.some(fp => fp.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(fp.toLowerCase()));
          if (!isDuplicate) finalParts.push(p);
        });

        let desc = finalParts.join(' - ') || '-';
        html += `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; position: relative;">
            <button class="btn-action btn-table-action" style="position: absolute; top: 10px; right: 10px; background: #2563eb; color: #ffffff; border: none; font-size: 0.8rem; padding: 4px 8px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px;" onclick="closeCombinedEntriesModal(); loadEntryForEdit('${cleanVr}', '${tx.id}', 'Bank')" title="Edit Entry">✏️ Edit</button>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; padding-right: 65px;">
              <span style="font-weight: 700; color: #2563eb;">#${cleanVr}</span>
              <span style="font-weight: 700; color: #0f172a;">${formatCurrency(amt)}</span>
            </div>
            <div style="font-size: 0.9rem; color: #475569; padding-right: 65px;">${desc}</div>
          </div>
        `;
        total += amt;
      }
    } else {
      html += `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 700; color: #2563eb;">ID #${txId}</span>
            <span style="font-weight: 600; color: #94a3b8;">Details not loaded</span>
          </div>
        </div>
      `;
    }
  });

  html += `</div>`;
  html += `
    <div style="margin-top: 20px; background: #0f172a; color: white; padding: 12px 16px; border-radius: 6px; display: flex; justify-content: space-between; font-weight: 700; font-size: 1.1rem;">
      <span>Total Combined:</span>
      <span>${formatCurrency(total)}</span>
    </div>
  `;

  container.innerHTML = html;
  modal.style.display = 'flex';
};

function getPrintHeaderHTML(title, subtitle, filterBadge) {
  return '<div class="print-header" style="margin-bottom: 15px;">' +
    '<h1>' + title + '</h1>' +
    '<h2>IPC HOREB CHURCH, THADIYOOR</h2>' +
    (subtitle ? '<p>' + subtitle + '</p>' : '') +
    (filterBadge ? '<span class="print-filter-badge">' + filterBadge + '</span>' : '') +
    '<p style="font-size:7.5pt;color:#94a3b8;margin-top:3px;margin-bottom:10px;">Printed on ' + new Date().toLocaleDateString('en-IN') + '</p>' +
    '</div>';
}

function getPrintSignaturesHTML(footerText) {
  const text = footerText || 'Computer Generated Report';
  return '<table style="width: 100%; margin-top: 30px; border-collapse: collapse; border: none !important; page-break-inside: avoid; background: transparent !important;">' +
    '<tr style="background: transparent !important;">' +
    '<td style="width: 33.33%; text-align: center; border: none !important; background: transparent !important; padding: 10px; vertical-align: bottom;">' +
    '<img src="Presidentsign.png" style="height: 46px; max-width: 140px; object-fit: contain; mix-blend-mode: multiply; filter: contrast(180%) brightness(1.05); margin-bottom: -10px; display: block; margin-left: auto; margin-right: auto;" onerror="this.onerror=null; this.src=\'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=\'">' +
    '<div style="height: 1px; border-bottom: 1px solid #000; margin-top: 2px; width: 140px; margin-left: auto; margin-right: auto;"></div>' +
    '<div style="font-weight: 800; font-size: 0.85rem; margin-top: 2px; color: #000; margin-left: auto; margin-right: auto; width: 140px;">President</div>' +
    '</td>' +
    '<td style="width: 33.33%; text-align: center; border: none !important; background: transparent !important; padding: 10px; vertical-align: bottom;">' +
    '<img src="Secretarysign.png" style="height: 46px; max-width: 140px; object-fit: contain; mix-blend-mode: multiply; filter: contrast(180%) brightness(1.05); margin-bottom: -10px; display: block; margin-left: auto; margin-right: auto;" onerror="this.onerror=null; this.src=\'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=\'">' +
    '<div style="height: 1px; border-bottom: 1px solid #000; margin-top: 2px; width: 140px; margin-left: auto; margin-right: auto;"></div>' +
    '<div style="font-weight: 800; font-size: 0.85rem; margin-top: 2px; color: #000; margin-left: auto; margin-right: auto; width: 140px;">Secretary</div>' +
    '</td>' +
    '<td style="width: 33.33%; text-align: center; border: none !important; background: transparent !important; padding: 10px; vertical-align: bottom;">' +
    '<img src="Treasurersign.png" style="height: 46px; max-width: 140px; object-fit: contain; mix-blend-mode: multiply; filter: contrast(180%) brightness(1.05); margin-bottom: -10px; display: block; margin-left: auto; margin-right: auto;" onerror="this.onerror=null; this.src=\'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=\'">' +
    '<div style="height: 1px; border-bottom: 1px solid #000; margin-top: 2px; width: 140px; margin-left: auto; margin-right: auto;"></div>' +
    '<div style="font-weight: 800; font-size: 0.85rem; margin-top: 2px; color: #000; margin-left: auto; margin-right: auto; width: 140px;">Treasurer</div>' +
    '</td>' +
    '</tr>' +
    '</table>' +
    '<div class="print-footer" style="margin-top: 15px;">IPC HOREB CHURCH, THADIYOOR | ' + text + '</div>';
}

function getBankBookHTML() {
  const searchVal = (document.getElementById('bankBookSearchInput') ? document.getElementById('bankBookSearchInput').value : '').toLowerCase().trim();
  const accountFilter = document.getElementById('bankBookAccountFilter') ? document.getElementById('bankBookAccountFilter').value : 'ALL';
  const modeFilter = document.getElementById('bankBookModeFilter') ? document.getElementById('bankBookModeFilter').value : 'ALL';

  const rawList = (loadedBankBookTransactions && loadedBankBookTransactions.length > 0) ? loadedBankBookTransactions : ((allTimeBankBookList && allTimeBankBookList.length > 0) ? allTimeBankBookList : (typeof globalRawBankTransactions !== 'undefined' ? globalRawBankTransactions : []));
  const list = (typeof filterListByFY === 'function' && rawList.length > 0) ? filterListByFY(rawList) : rawList;
  const filteredList = list.filter(tx => {
    if (searchVal) {
      const desc = (tx.description || '').toLowerCase();
      const vrNo = String(tx.vrNo || '').toLowerCase();
      const acc = (tx.account || '').toLowerCase();
      const name = (tx.name || tx.accountName || '').toLowerCase();
      if (!desc.includes(searchVal) && !vrNo.includes(searchVal) && !acc.includes(searchVal) && !name.includes(searchVal)) return false;
    }
    if (accountFilter !== 'ALL') {
      const filterLower = accountFilter.toLowerCase();
      const accLower = (tx.account || tx.accountName || tx.account_name || tx.bankAccount || tx.bank_account || '').toLowerCase();
      const isFD = filterLower.includes('fixed deposit') || filterLower.includes('fd');
      const txIsFD = accLower.includes('fixed deposit') || accLower.includes('fd');
      if (isFD !== txIsFD) return false;
    }
    if (modeFilter !== 'ALL') {
      const isReceipt = tx.mode && tx.mode.includes("Receipt");
      if (modeFilter === 'Credit' && !isReceipt) return false;
      if (modeFilter === 'Debit' && isReceipt) return false;
    }
    return true;
  });

  // Group by account
  let grouped = {};
  filteredList.forEach(tx => {
    const acc = tx.account || "State Bank of India (Current Account)";
    if (!grouped[acc]) grouped[acc] = [];
    grouped[acc].push(tx);
  });

  // Ensure both default accounts show if ALL selected
  if (accountFilter === 'ALL') {
    const defaultAccounts = ["State Bank of India (Current Account)", "State Bank of India (Fixed Deposit)"];
    defaultAccounts.forEach(acc => {
      if (!grouped[acc]) {
        const altName = acc.includes("Fixed") ? "SBI Fixed Deposit" : "State Bank of India";
        if (grouped[altName]) {
          grouped[acc] = grouped[altName];
          delete grouped[altName];
        } else {
          grouped[acc] = [];
        }
      }
    });
  }

  let cf = calculateCarryForward();

  let html = '<table style="width: 100%; border: none !important; margin: 0; padding: 0;">' +
    '<thead><tr><td style="border: none !important; padding: 0;">' +
    getPrintHeaderHTML('BANK BOOK STATEMENT', '') +
    '</td></tr></thead>' +
    '<tbody><tr><td style="border: none !important; padding: 0;">';

  const accountKeys = Object.keys(grouped).sort();
  accountKeys.forEach((accName, index) => {
    const rawList = sortTransactionsAscending(grouped[accName] || []);

    let debits = [];  // Money out / Payments / Withdrawals (Left Side)
    let credits = []; // Money in / Receipts / Deposits / Opening Balance (Right Side)

    let isFD = accName.toLowerCase().includes('fixed deposit') || accName.includes('FD');
    let opBal = isFD ? cf.fd : cf.sbi;

    let hasExplicitOp = false;

    const groupedRawList = [];
    const rawBaseVrMap = {};
    rawList.forEach(tx => {
      let rawVr = tx.vrNo || '';
      let cleanVr = normalizeVrLocally(rawVr);
      let isBlankVr = !cleanVr || cleanVr === '-' || cleanVr === '--' || cleanVr === 'ob';

      const isCredit = isTxReceipt(tx) === 1;
      const modeStr = isCredit ? 'Credit' : 'Debit';

      let groupingKey;
      if (tx.splitGroupId) {
        groupingKey = 'split_' + tx.splitGroupId;
      } else if (tx.transactionId && String(tx.transactionId).trim() !== '') {
        groupingKey = 'txid_' + tx.transactionId;
      } else if (!isBlankVr) {
        groupingKey = cleanVr + '_' + (tx.date || '') + '_' + modeStr;
      } else if (tx.isSplitEntry) {
        groupingKey = 'split_legacy_' + (tx.date || '') + '_' + (tx.accountName || '') + '_' + modeStr + '_' + (tx.splitTotalAmount || '');
      } else {
        groupingKey = 'unique_' + tx.id;
      }

      let typeStr = (tx.subtype || tx.type || '').trim();
      if (tx.type === 'Charity' && (tx.subtype === 'Paid' || tx.subtype === 'Received' || tx.subtype === 'paid' || tx.subtype === 'received')) {
        typeStr = 'Charity ' + tx.subtype.charAt(0).toUpperCase() + tx.subtype.slice(1);
      }
      let dStr = (tx.description || '').trim();
      let parts = [];
      if (typeStr && typeStr !== '-' && typeStr !== 'Bank' && typeStr !== 'Cash') parts.push(typeStr);
      if (dStr && dStr !== '-') parts.push(dStr);

      let finalParts = [];
      parts.forEach(p => {
        let isDuplicate = finalParts.some(fp => fp.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(fp.toLowerCase()));
        if (!isDuplicate) finalParts.push(p);
      });
      let txFullDesc = finalParts.join(' - ') || '-';

      const txSplitList = (Array.isArray(tx.splitItems) && tx.splitItems.length > 0)
        ? tx.splitItems
        : ((Array.isArray(tx._splitItems) && tx._splitItems.length > 0) ? tx._splitItems : null);

      if (!rawBaseVrMap[groupingKey] || isBlankVr) {
        const newTx = Object.assign({}, tx);
        newTx.displayVr = isBlankVr ? '-' : rawVr;
        newTx.allVrNos = rawVr ? [rawVr] : [];
        newTx.amount = Number(tx.amount || tx.receipt || tx.payment || tx.payments || 0);
        newTx.description = txFullDesc;
        newTx._splitItems = txSplitList ? [...txSplitList] : [tx];
        if (!isBlankVr) rawBaseVrMap[groupingKey] = newTx;
        groupedRawList.push(newTx);
      } else {
        const target = rawBaseVrMap[groupingKey];
        target.amount += Number(tx.amount || tx.receipt || tx.payment || tx.payments || 0);
        if (rawVr && !target.allVrNos.includes(rawVr)) {
          target.allVrNos.push(rawVr);
        }
        if (txSplitList) {
          if (!target._splitItems) target._splitItems = [];
          target._splitItems.push(...txSplitList);
        } else {
          if (!target._splitItems) target._splitItems = [];
          target._splitItems.push(tx);
        }
      }
    });

    groupedRawList.forEach(tx => {
      if (Array.isArray(tx._splitItems) && tx._splitItems.length > 1) {
        tx.description = formatSplitItemsDescription(tx._splitItems);
      } else if (Array.isArray(tx.splitItems) && tx.splitItems.length > 1) {
        tx.description = formatSplitItemsDescription(tx.splitItems);
      }
    });

    groupedRawList.forEach(tx => {
      const type = (tx.type || '').toLowerCase();
      const desc = (tx.description || '').toLowerCase();
      const name = (tx.name || tx.accountName || '').toLowerCase();
      const isOpening = type === 'opening balance' || desc.includes('opening balance') || name.includes('opening balance');

      if (isOpening) {
        hasExplicitOp = true;
        credits.push({
          date: formatDateClean(tx.date),
          vrNo: formatVrNoClean(tx.vrNo),
          description: 'Opening Balance',
          amount: Number(tx.amount || tx.receipt || 0)
        });
      } else {
        const isReceipt = tx.mode ? tx.mode.includes("Receipt") : (tx.receipt ? true : false);
        const amt = tx.amount;

        let descStr = tx.description || tx.particulars || '-';
        let nameStr = tx.name || tx.accountName || '';
        let fullDesc = (nameStr && nameStr !== '-' && !descStr.includes(nameStr)) ? `${nameStr} - ${descStr}` : descStr;

        let vrNosList = tx.allVrNos ? Array.from(new Set(tx.allVrNos.filter(v => v && v !== '-' && v !== '--'))) : [];
        let uniqueBaseVrs = new Set();
        vrNosList.forEach(v => {
          let b = v;
          if (v.includes('/')) b = v.split('/')[0];
          else if (v.includes('-') && !v.startsWith('-')) b = v.split('-')[0];
          uniqueBaseVrs.add(b);
        });
        let displayVr = uniqueBaseVrs.size > 1 ? vrNosList.join(', ') : formatVrNoClean(tx.displayVr);
        const singleChq = String(tx.chequeNo || tx.chqNo || '').trim();
        if (singleChq && singleChq !== '-' && singleChq !== '--' && singleChq.toLowerCase() !== 'null' && singleChq.toLowerCase() !== 'undefined' && singleChq.toLowerCase() !== 'none' && !displayVr.includes(singleChq)) {
          displayVr = displayVr ? `${displayVr} (Chq: ${singleChq})` : `Chq: ${singleChq}`;
        }

        const item = {
          date: formatDateClean(tx.date),
          vrNo: displayVr,
          description: fullDesc,
          amount: amt
        };

        if (isReceipt) {
          credits.push(item);
        } else {
          debits.push(item);
        }
      }
    });

    if (!hasExplicitOp && opBal > 0) {
      const fyDate = (typeof currentGlobalFY !== 'undefined' && currentGlobalFY && currentGlobalFY !== 'All') ? '01.04.' + currentGlobalFY.substring(2, 4) : '';
      credits.unshift({
        date: fyDate,
        vrNo: '',
        description: 'Opening Balance',
        amount: opBal
      });
    }

    let totalDebit = debits.reduce((sum, d) => sum + (d.amount || 0), 0);
    let totalCredit = credits.reduce((sum, c) => sum + (c.amount || 0), 0);
    let closingBalance = totalCredit - totalDebit;

    let pageBreakStyle = index > 0 ? 'margin-top: 30px; page-break-before: always;' : 'margin-top: 15px;';

    let displayName = accName;
    if (displayName === 'State Bank of India') displayName = 'State Bank of India (Current Account)';
    if (displayName === 'SBI Fixed Deposit') displayName = 'State Bank of India (Fixed Deposit)';

    html += '<div style="' + pageBreakStyle + 'font-weight: bold; font-size: 11pt; margin-bottom: 6px; color: #000;">' + displayName + '</div>' +
      '<table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 8pt; border: 1.5px solid #000; margin-bottom: 20px;">' +
      '<thead>' +
      '<tr>' +
      '<th colspan="4" style="border: 1px solid #000; text-align: center; font-weight: bold; padding: 5px; font-size: 9pt; background-color: #ffffff;">DEBIT</th>' +
      '<th colspan="4" style="border: 1px solid #000; text-align: center; font-weight: bold; padding: 5px; font-size: 9pt; background-color: #ffffff;">CREDIT</th>' +
      '</tr>' +
      '<tr style="background-color: #ffffff; border-bottom: 1.5px solid #000;">' +
      '<th style="border: 1px solid #000; padding: 4px; width: 9%; text-align: left;">Date</th>' +
      '<th style="border: 1px solid #000; padding: 4px; width: 7%; text-align: center;">Ch.No</th>' +
      '<th style="border: 1px solid #000; padding: 4px; width: 24%; text-align: left;">Description</th>' +
      '<th style="border: 1px solid #000; padding: 4px; width: 10%; text-align: right;">Amount</th>' +
      '<th style="border: 1px solid #000; padding: 4px; width: 9%; text-align: left;">Date</th>' +
      '<th style="border: 1px solid #000; padding: 4px; width: 7%; text-align: center;">Ch.No</th>' +
      '<th style="border: 1px solid #000; padding: 4px; width: 24%; text-align: left;">Description</th>' +
      '<th style="border: 1px solid #000; padding: 4px; width: 10%; text-align: right;">Amount</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>';

    const maxRows = Math.max(debits.length, credits.length, 1);
    for (let i = 0; i < maxRows; i++) {
      const d = debits[i];
      const c = credits[i];

      const dDate = d ? d.date : '';
      const dChNo = (d && d.vrNo && d.vrNo !== '-') ? d.vrNo : '';
      const dDesc = d ? d.description : '';
      const dAmt = (d && d.amount) ? formatCurrency(d.amount) : '';

      const cDate = c ? c.date : '';
      const cChNo = (c && c.vrNo && c.vrNo !== '-') ? c.vrNo : '';
      const cDesc = c ? c.description : '';
      const cAmt = (c && c.amount) ? formatCurrency(c.amount) : '';

      const isCOp = cDesc === 'Opening Balance';

      html += '<tr>' +
        '<td style="border: 1px solid #000; padding: 4px; text-align: left; vertical-align: top;">' + dDate + '</td>' +
        '<td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: top;">' + dChNo + '</td>' +
        '<td style="border: 1px solid #000; padding: 4px; text-align: left; vertical-align: top;">' + dDesc + '</td>' +
        '<td style="border: 1px solid #000; padding: 4px; text-align: right; vertical-align: top; font-weight: bold;">' + dAmt + '</td>' +
        '<td style="border: 1px solid #000; padding: 4px; text-align: left; vertical-align: top;">' + cDate + '</td>' +
        '<td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: top;">' + cChNo + '</td>' +
        '<td style="border: 1px solid #000; padding: 4px; text-align: left; vertical-align: top; ' + (isCOp ? 'font-weight: bold;' : '') + '">' + cDesc + '</td>' +
        '<td style="border: 1px solid #000; padding: 4px; text-align: right; vertical-align: top; font-weight: bold;">' + cAmt + '</td>' +
        '</tr>';
    }

    // Totals Row
    html += '</tbody>' +
      '<tfoot>' +
      '<tr style="border-top: 1.5px solid #000; font-weight: bold;">' +
      '<td colspan="3" style="border: 1px solid #000; padding: 5px; text-align: right;">Total</td>' +
      '<td style="border: 1px solid #000; padding: 5px; text-align: right;">' + (totalDebit > 0 ? formatCurrency(totalDebit) : '-') + '</td>' +
      '<td colspan="3" style="border: 1px solid #000; padding: 5px; text-align: right;">Total</td>' +
      '<td style="border: 1px solid #000; padding: 5px; text-align: right;">' + (totalCredit > 0 ? formatCurrency(totalCredit) : '-') + '</td>' +
      '</tr>';

    // Closing Balance Row
    if (closingBalance > 0) {
      html += '<tr style="border-top: 1px solid #000; font-weight: bold;">' +
        '<td colspan="3" style="border: 1px solid #000; padding: 5px; text-align: right;">Closing Balance</td>' +
        '<td style="border: 1px solid #000; padding: 5px; text-align: right;">' + formatCurrency(closingBalance) + '</td>' +
        '<td colspan="4" style="border: 1px solid #000; padding: 5px;"></td>' +
        '</tr>';
    } else if (closingBalance < 0) {
      html += '<tr style="border-top: 1px solid #000; font-weight: bold;">' +
        '<td colspan="4" style="border: 1px solid #000; padding: 5px;"></td>' +
        '<td colspan="3" style="border: 1px solid #000; padding: 5px; text-align: right;">Closing Balance</td>' +
        '<td style="border: 1px solid #000; padding: 5px; text-align: right;">' + formatCurrency(Math.abs(closingBalance)) + '</td>' +
        '</tr>';
    }

    html += '</tfoot>' +
      '</table>';
  });

  html += '</td></tr></tbody>' +
    '<tfoot><tr><td style="border: none !important; padding: 0;">' +
    getPrintSignaturesHTML('Computer Generated Bank Book Statement') +
    '</td></tr></tfoot></table>';

  return html;
}

function printBankBook() {
  const printArea = document.getElementById('printArea');
  if (!printArea) return;
  try {
    printArea.innerHTML = getBankBookHTML();
  } catch (err) {
    console.error("Error in getBankBookHTML:", err);
  }
  document.body.classList.add('print-bankbook-active');
  document.body.classList.add('print-cashbook-active');

  const style = document.createElement('style');
  style.id = 'bankbook-print-style';
  style.innerHTML = '@page { size: 297mm 210mm !important; margin: 8mm; }';
  document.head.appendChild(style);

  const oldTitle = document.title;
  document.title = 'Bank_Book_Statement_IPC_Horeb';

  function cleanup() {
    document.body.classList.remove('print-bankbook-active');
    document.body.classList.remove('print-cashbook-active');
    document.title = oldTitle;
    const addedStyle = document.getElementById('bankbook-print-style');
    if (addedStyle) addedStyle.remove();
    window.removeEventListener('afterprint', cleanup);
  }

  window.addEventListener('afterprint', cleanup);

  setTimeout(function () {
    try {
      window.print();
    } catch (e) {
      console.error("Print invocation error:", e);
    }
  }, 300);
}

function showAlert(msg, type) {
  const alertBanner = document.getElementById('alertBanner');
  if (!alertBanner) return;
  alertBanner.className = "alert-banner " + type;
  alertBanner.innerHTML = msg;
  alertBanner.style.display = "block";
  setTimeout(() => { alertBanner.style.display = "none"; }, 5000);
}

function hideAlert() {
  const alertBanner = document.getElementById('alertBanner');
  if (alertBanner) alertBanner.style.display = "none";
}

// ============================================================
// INDIAN AMOUNT FORMATTING & LIVE HINT HELPERS
// ============================================================

function amountInWordsIndian(num) {
  if (isNaN(num) || num <= 0) return '';
  let n = Math.floor(num);
  if (n === 0) return '';

  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(val) {
    if (val < 20) return a[val];
    let digit = val % 10;
    return b[Math.floor(val / 10)] + (digit ? ' ' + a[digit] : ' ');
  }

  let str = '';
  let crore = Math.floor(n / 10000000);
  n %= 10000000;
  let lakh = Math.floor(n / 100000);
  n %= 100000;
  let thousand = Math.floor(n / 1000);
  n %= 1000;
  let hundred = Math.floor(n / 100);
  n %= 100;

  if (crore > 0) str += inWords(crore) + 'Crore ';
  if (lakh > 0) str += inWords(lakh) + 'Lakh ';
  if (thousand > 0) str += inWords(thousand) + 'Thousand ';
  if (hundred > 0) str += inWords(hundred) + 'Hundred ';
  if (n > 0) str += inWords(n);

  return str.trim() + ' Rupees';
}

function attachAmountFormatter(inputId, hintId, textId) {
  const inputEl = document.getElementById(inputId);
  if (!inputEl) return;
  const hintEl = hintId ? document.getElementById(hintId) : null;
  const textEl = textId ? document.getElementById(textId) : null;

  function formatInput() {
    let cursorPos = inputEl.selectionStart || 0;
    let oldVal = inputEl.value;

    let clean = oldVal.replace(/[^0-9.]/g, '');
    let parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
      parts = clean.split('.');
    }

    let intPart = parts[0];
    let decPart = parts.length > 1 ? '.' + parts[1].slice(0, 2) : '';

    let formattedInt = '';
    if (intPart.length > 0) {
      let num = intPart.replace(/^0+(?=\d)/, '');
      if (num.length > 3) {
        let last3 = num.slice(-3);
        let rest = num.slice(0, -3);
        formattedInt = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
      } else {
        formattedInt = num;
      }
    }

    let newVal = formattedInt + decPart;

    if (oldVal !== newVal) {
      let oldCommasBefore = (oldVal.slice(0, cursorPos).match(/,/g) || []).length;
      let newCommasBefore = (newVal.slice(0, cursorPos).match(/,/g) || []).length;
      let added = newCommasBefore - oldCommasBefore;
      inputEl.value = newVal;
      let newCursor = Math.max(0, Math.min(newVal.length, cursorPos + added));
      try {
        inputEl.setSelectionRange(newCursor, newCursor);
      } catch (e) { }
    }

    const numericVal = parseFloat(clean) || 0;
    if (hintEl && textEl) {
      if (numericVal > 0) {
        const words = amountInWordsIndian(numericVal);
        const formattedDisplay = numericVal.toLocaleString('en-IN', { minimumFractionDigits: numericVal % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 });
        textEl.innerHTML = `<strong>${formattedDisplay}</strong>${words ? ` &nbsp;•&nbsp; <span style="font-weight: 600; color: #475569;">(${words})</span>` : ''}`;
        hintEl.style.display = 'flex';
      } else {
        hintEl.style.display = 'none';
      }
    }
  }

  inputEl.addEventListener('input', formatInput);
  inputEl.addEventListener('focus', formatInput);
  inputEl.addEventListener('blur', function () {
    const numericVal = parseFloat(inputEl.value.replace(/,/g, '')) || 0;
    if (numericVal <= 0 && hintEl) hintEl.style.display = 'none';
  });
}

function formatCurrency(num) {
  if (num === undefined || num === null || num === '' || isNaN(num)) return "0.00";
  let n = Number(num);
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrencyNoDecimals(num) {
  if (num === undefined || num === null || num === '' || isNaN(num)) return "0";
  let n = Number(num);
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatCurrencyWithDecimals(num) {
  if (num === undefined || num === null || num === '' || isNaN(num)) return "0.00";
  let n = Number(num);
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrencyNoSymbol(num) {
  if (num === undefined || num === null || num === '' || isNaN(num)) return "0";
  let n = Number(num);
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatCurrencyNoSymbolWithDecimals(num) {
  if (num === undefined || num === null || num === '' || isNaN(num)) return "0.00";
  let n = Number(num);
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPaperCurrency(num) {
  if (num === undefined || num === null || num === '' || isNaN(num)) return "0.00";
  let n = Number(num);
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Helper: Resolve canonical member from membersDataStore using raw name & optional address
function findCanonicalMember(rawName, directAddress = '') {
  if (!rawName) return null;
  const s = String(rawName).trim();
  if (!s || s === '-' || s === '--' || s.toLowerCase() === 'unknown' || s.toLowerCase().includes('opening balance') || s.toLowerCase().includes('inter-bank')) return null;

  if (typeof membersDataStore === 'undefined' || !Array.isArray(membersDataStore)) return null;

  const sLower = s.toLowerCase();
  const cleanRaw = (typeof getRawName === 'function' ? getRawName(s) : s.replace(/^(Brother|Sister|Pastor|Evangelist|Bro|Sis|Br|Sr|Pr|Evg)\.?\s+/i, '')).toLowerCase().trim();
  const dAddr = (directAddress || '').toLowerCase().trim();

  // If directAddress is provided, prioritize match on both name AND address!
  if (dAddr && dAddr !== '-' && dAddr !== 'not specified' && dAddr !== 'no address') {
    const bothMatch = membersDataStore.find(m => {
      if (!m || !m.name) return false;
      const mn = m.name.toLowerCase().trim();
      const mr = (typeof getRawName === 'function' ? getRawName(mn) : mn).toLowerCase().trim();
      const ma = (m.address || '').toLowerCase().trim();
      const nameMatch = (mn === sLower || mr === cleanRaw || (m._aliases && m._aliases.includes(sLower)));
      const addrMatch = (ma === dAddr || ma.includes(dAddr) || dAddr.includes(ma));
      return nameMatch && addrMatch;
    });
    if (bothMatch) return bothMatch;
  }

  // 1. Exact match on full name
  let exact = membersDataStore.find(m => m && m.name && m.name.toLowerCase().trim() === sLower);
  if (exact) return exact;

  // 2. Match ignoring title prefix (Brother, Sister, Pr., Br., Sr., etc.)
  if (!cleanRaw) return null;

  const titleMatches = membersDataStore.filter(m => {
    if (!m || !m.name) return false;
    const mRaw = (typeof getRawName === 'function' ? getRawName(m.name) : m.name.replace(/^(Brother|Sister|Pastor|Evangelist|Bro|Sis|Br|Sr|Pr|Evg)\.?\s+/i, '')).toLowerCase().trim();
    return mRaw === cleanRaw;
  });

  if (titleMatches.length === 1) return titleMatches[0];
  if (titleMatches.length > 1) {
    if (dAddr) {
      const addrMatch = titleMatches.find(m => m.address && (m.address.toLowerCase().trim() === dAddr || m.address.toLowerCase().includes(dAddr) || dAddr.includes(m.address.toLowerCase())));
      if (addrMatch) return addrMatch;
    }
    return titleMatches[0];
  }

  // 3. Match nickname or alias if available
  const nickMatch = membersDataStore.find(m => m && m.nickname && m.nickname.toLowerCase().trim() === cleanRaw);
  if (nickMatch) return nickMatch;

  return null;
}

function normalizeMemberName(name) {
  if (!name) return '';
  return (typeof getRawName === 'function' ? getRawName(name) : String(name).replace(/^(Brother|Sister|Pastor|Evangelist|Bro|Sis|Br|Sr|Pr|Evg)\.?\s+/i, '')).toLowerCase().trim();
}

function getMemberAddress(name) {
  const m = findCanonicalMember(name);
  return m && m.address ? m.address.trim() : '';
}

function formatSubMonthWithYear(subM, txDate) {
  if (!subM) return '';
  const trimmed = String(subM).trim();
  const match = trimmed.match(/(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s*(\d{4}))?/i);
  if (match) {
    const mName = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    let yVal = match[2];
    if (!yVal) {
      if (txDate) {
        const d = new Date(txDate);
        if (!isNaN(d.getTime())) yVal = d.getFullYear();
      }
      if (!yVal && typeof currentGlobalFY !== 'undefined' && currentGlobalFY && currentGlobalFY !== 'All') {
        const parts = currentGlobalFY.split('-');
        if (parts.length === 2) {
          const mIdx = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].indexOf(mName);
          yVal = (mIdx < 3) ? parts[1] : parts[0];
        }
      }
      if (!yVal) yVal = '2026';
    }
    return `${mName} ${yVal}`;
  }
  return trimmed;
}

// ============================================================
// --- SUBSCRIPTIONS REPORT ---
function getSubscriptionReceiptsPool() {
  const pool = [];
  const seenKeys = new Set();

  function resolveMemberInfo(rawName, directAddress = '') {
    let name = (rawName && rawName !== '-' && rawName !== '--') ? String(rawName).trim() : '';
    let addr = (directAddress && directAddress !== '-' && directAddress !== '--') ? String(directAddress).trim() : '';

    if (name) {
      const canonical = findCanonicalMember(name, addr);
      if (canonical) {
        name = canonical.name;
        if (!addr && canonical.address) addr = canonical.address.trim();
      }
    }
    if (!addr && name) {
      addr = getMemberAddress(name) || '';
    }
    return { name, addr };
  }

  // 1. Process General (Cash Book) Transactions
  (currentGeneralTxList || []).forEach(tx => {
    const amt = Number(tx.receipt || tx.amount || 0);
    const mode = (tx.mode || '').toLowerCase();
    const typeStr = (tx.type || tx.category || '').toLowerCase();
    const catStr = (tx.category || '').toLowerCase();
    const subStr = (tx.subtype || '').toLowerCase();
    const descStr = (tx.description || tx.particulars || '').toLowerCase();
    const nameStr = (tx.accountName || tx.account_name || tx.name || '').toLowerCase();

    const isContra = (descStr.includes('contra') || subStr.includes('contra') || descStr.includes('cash deposit') || descStr.includes('cash withdrawal'));
    if (isContra) return;

    const isPayment = (mode.includes('payment') || mode.includes('debit')) && !mode.includes('receipt') && !mode.includes('credit');
    const isReceipt = ((amt > 0) || (mode === 'receipt') || mode.includes('credit')) && !isPayment;
    if (!isReceipt) return;

    const fullText = (tx.particulars || tx.description || '').trim();
    let memberName = (tx.accountName && tx.accountName !== '-' && tx.accountName !== '--') ? tx.accountName.trim() : '';

    // If accountName is missing or dash, try extracting from fullText before " - "
    if (!memberName && fullText.includes(' - ')) {
      const dashIdx = fullText.indexOf(' - ');
      const cand = fullText.substring(0, dashIdx).trim();
      const candLower = cand.toLowerCase();
      if (!candLower.includes('contra') && !candLower.includes('transfer') && !candLower.includes('cash deposit') && !candLower.includes('opening balance')) {
        memberName = cand;
      }
    }

    // Resolve member name and address canonically
    const resolved = resolveMemberInfo(memberName, tx.address);
    if (resolved.name) memberName = resolved.name;
    const resolvedAddr = resolved.addr || tx.address || '';

    // Check if Cash Transaction has split items
    if (tx.splitGroupId && seenKeys.has(`c_splitgroup_${tx.splitGroupId}`)) return;

    const splitItems = (Array.isArray(tx.splitItems) && tx.splitItems.length > 0)
      ? tx.splitItems
      : ((Array.isArray(tx._splitItems) && tx._splitItems.length > 0) ? tx._splitItems : null);

    if (splitItems && splitItems.length > 0) {
      if (tx.splitGroupId) seenKeys.add(`c_splitgroup_${tx.splitGroupId}`);
      splitItems.forEach((item, pIdx) => {
        const itemType = (item.type || item.category || item.subtype || '').toLowerCase();
        const itemDesc = (item.description || item.particulars || item.desc || '').toLowerCase();
        const itemMonth = (item.month || item.subMonth || item.sub_month || '').trim();
        const isNotSub = itemType.includes('offering') || itemType.includes('offertory') || itemDesc.includes('offering') || itemDesc.includes('offertory') || itemType.includes('charity') || itemDesc.includes('charity') || itemType.includes('donation') || itemDesc.includes('donation');
        const isSubItem = !isNotSub && (itemType.includes('subscription') || (!itemType && itemDesc.includes('subscription')));

        if (isSubItem) {
          const itemAmt = Number(item.amount || item.receipt || item.amt || item.credit || 0);
          if (itemAmt > 0) {
            let subM = itemMonth ? formatSubMonthWithYear(itemMonth, tx.date) : '';
            if (!subM) subM = formatSubMonthWithYear(itemDesc, tx.date);
            if (!subM) subM = formatSubMonthWithYear(tx.subMonth, tx.date);
            if (!subM && tx.date) {
              const d = new Date(tx.date);
              if (!isNaN(d.getTime())) {
                const mNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                subM = `${mNames[d.getMonth()]} ${d.getFullYear()}`;
              }
            }

            let itemMemberName = memberName;
            let itemAddr = resolvedAddr;
            if (item.accountName || item.name) {
              const rItem = resolveMemberInfo(item.accountName || item.name, item.address || resolvedAddr);
              if (rItem.name) itemMemberName = rItem.name;
              if (rItem.addr) itemAddr = rItem.addr;
            }

            const itemKey = `c_${tx.id || tx.vrNo}_split_${pIdx}`;
            if (!seenKeys.has(itemKey)) {
              seenKeys.add(itemKey);
              pool.push({
                ...tx,
                id: tx.id ? `${tx.id}_sub_${pIdx}` : undefined,
                parentTxId: tx.id,
                accountName: itemMemberName || memberName || tx.accountName,
                address: itemAddr,
                amount: itemAmt,
                receipt: itemAmt,
                type: 'Subscription',
                category: 'Subscription',
                subtype: item.subtype || 'Subscription',
                subMonth: subM || 'Unknown Month',
                particulars: item.description || item.desc || tx.particulars || '',
                description: item.description || item.desc || tx.description || '',
                isSplitEntry: true
              });
            }
          }
        }
      });
      if (tx.id) seenKeys.add(`c_${tx.id}`);
      return;
    }

    // Check if Cash Transaction has text-based '+' split
    const descVal = (tx.description || tx.particulars || '').trim();
    if (descVal.includes('+')) {
      const parts = descVal.split(/\s*\+\s*/);
      parts.forEach((part, pIdx) => {
        const partTrimmed = part.trim();
        const partLower = partTrimmed.toLowerCase();
        if (!partLower.includes('subscription')) return;
        const isPartNotSub = partLower.includes('offering') || partLower.includes('offertory') || partLower.includes('charity') || partLower.includes('donation');
        if (isPartNotSub) return;

        let partMember = memberName;
        let partClean = partTrimmed;
        if (partTrimmed.includes(' - ')) {
          const pDash = partTrimmed.indexOf(' - ');
          const pCand = partTrimmed.substring(0, pDash).trim();
          if (pCand && !pCand.toLowerCase().includes('subscription')) {
            const rPart = resolveMemberInfo(pCand, resolvedAddr);
            if (rPart.name) partMember = rPart.name;
            partClean = partTrimmed.substring(pDash + 3).trim();
          }
        }

        let itemAmt = 0;
        const parenMatch = partTrimmed.match(/\((?:[^0-9]*)([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\)/);
        if (parenMatch) itemAmt = parseFloat(parenMatch[1].replace(/,/g, ''));
        if (!itemAmt || isNaN(itemAmt)) {
          const symMatch = partTrimmed.match(/(?:rs\.?|inr|₹)\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/i);
          if (symMatch) itemAmt = parseFloat(symMatch[1].replace(/,/g, ''));
        }
        if (!itemAmt || isNaN(itemAmt)) {
          const slashMatch = partTrimmed.match(/([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*(?:\/-|\/rs)/i);
          if (slashMatch) itemAmt = parseFloat(slashMatch[1].replace(/,/g, ''));
        }
        if (!itemAmt || isNaN(itemAmt)) {
          const numMatches = partTrimmed.match(/\b([0-9]{3,}(?:,[0-9]+)*(?:\.[0-9]+)?)\b/g);
          if (numMatches && numMatches.length === 1) {
            itemAmt = parseFloat(numMatches[0].replace(/,/g, ''));
          }
        }
        if (!itemAmt || isNaN(itemAmt) || itemAmt <= 0) {
          if (parts.length === 1) itemAmt = amt;
        }

        let itemMonth = formatSubMonthWithYear(partTrimmed, tx.date);
        if (!itemMonth && tx.subMonth) itemMonth = formatSubMonthWithYear(tx.subMonth, tx.date);
        if (!itemMonth && tx.date) {
          const d = new Date(tx.date);
          if (!isNaN(d.getTime())) {
            const mNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            itemMonth = `${mNames[d.getMonth()]} ${d.getFullYear()}`;
          }
        }

        const itemKey = `c_${tx.id || tx.vrNo}_textsplit_${pIdx}`;
        if (!seenKeys.has(itemKey)) {
          seenKeys.add(itemKey);
          pool.push({
            ...tx,
            id: tx.id ? `${tx.id}_sub_${pIdx}` : undefined,
            parentTxId: tx.id,
            accountName: partMember || memberName || tx.accountName,
            address: resolvedAddr,
            amount: itemAmt || amt,
            receipt: itemAmt || amt,
            type: 'Subscription',
            category: 'Subscription',
            subtype: 'Subscription',
            particulars: partClean,
            description: partClean,
            subMonth: itemMonth || 'Unknown Month',
            isSplitEntry: true
          });
        }
      });
      if (tx.id) seenKeys.add(`c_${tx.id}`);
      return;
    }

    // Strict exclusion of non-subscription cash categories
    const hasSubCash = typeStr.includes('subscription') || subStr.includes('subscription') || catStr.includes('subscription') || descStr.includes('subscription');
    const isExcludedCash = typeStr.includes('offering') || typeStr.includes('offertory') ||
                           subStr.includes('offering') || subStr.includes('offertory') ||
                           catStr.includes('offering') || catStr.includes('offertory') ||
                           nameStr === 'offertory' || nameStr === 'offering' ||
                           typeStr.includes('charity') || subStr.includes('charity') ||
                           typeStr.includes('donation') || subStr.includes('donation') ||
                           typeStr.includes('first fruit') || subStr.includes('first fruit');

    if (isExcludedCash && !hasSubCash) return;
    if (!hasSubCash) return;

    const key = tx.id ? `c_${tx.id}` : `vr_${tx.vrNo}_${tx.date}_${amt}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      pool.push({
        ...tx,
        accountName: memberName || tx.accountName,
        address: resolvedAddr || tx.address || ''
      });
    }
  });

  // 2. Process Bank Transactions (including split entries)
  let bankList = (typeof loadedBankBookTransactions !== 'undefined' && loadedBankBookTransactions && loadedBankBookTransactions.length > 0)
    ? loadedBankBookTransactions
    : (typeof allTimeBankBookList !== 'undefined' ? filterListByFY(allTimeBankBookList) : []);
  if ((!bankList || bankList.length === 0) && typeof globalRawBankTransactions !== 'undefined' && globalRawBankTransactions && globalRawBankTransactions.length > 0) {
    bankList = filterListByFY(globalRawBankTransactions);
  }

  (bankList || []).forEach(tx => {
    const amt = Number(tx.receipt || tx.amount || tx.credit || 0);
    const mode = (tx.mode || '').toLowerCase();
    const typeStr = (tx.type || tx.category || tx.bankSubtype || tx.bank_subtype || '').toLowerCase();
    const subStr = (tx.subtype || tx.subType || tx.bankSubtype || tx.bank_subtype || '').toLowerCase();
    const descStr = (tx.description || tx.particulars || '').toLowerCase();
    const nameStr = (tx.accountName || tx.account_name || tx.name || '').toLowerCase();

    const isContra = (descStr.includes('contra') || subStr.includes('contra') || descStr.includes('cash deposit') || descStr.includes('cash withdrawal'));
    if (isContra) return;

    const isPayment = (mode.includes('payment') || mode.includes('debit') || mode.includes('withdrawal')) && !mode.includes('receipt') && !mode.includes('credit') && !mode.includes('deposit');
    const isReceipt = ((amt > 0) || mode.includes('credit') || mode.includes('receipt') || mode.includes('deposit')) && !isPayment;
    if (!isReceipt) return;

    if (tx.id && seenKeys.has(`b_${tx.id}`)) return;
    const linkedCashId = tx.cashId || tx.cash_id;
    if (linkedCashId && seenKeys.has(`c_${linkedCashId}`)) return;

    const fullText = (tx.particulars || tx.description || '').trim();
    let memberName = (tx.accountName && tx.accountName !== '-' && tx.accountName !== '--') ? tx.accountName.trim() : '';
    let itemsText = fullText;

    // If accountName is missing or dash, try extracting from fullText before " - "
    if (!memberName && fullText.includes(' - ')) {
      const dashIdx = fullText.indexOf(' - ');
      const cand = fullText.substring(0, dashIdx).trim();
      const candLower = cand.toLowerCase();
      if (!candLower.includes('contra') && !candLower.includes('transfer') && !candLower.includes('cash deposit') && !candLower.includes('opening balance')) {
        memberName = cand;
        itemsText = fullText.substring(dashIdx + 3).trim();
      }
    }

    // Resolve member name and address canonically
    const resolved = resolveMemberInfo(memberName, tx.address);
    if (resolved.name) memberName = resolved.name;
    const resolvedAddr = resolved.addr || tx.address || '';

    // Case A: Array-based split items on Bank Transaction (tx.splitItems / tx._splitItems)
    const splitItems = (Array.isArray(tx.splitItems) && tx.splitItems.length > 0)
      ? tx.splitItems
      : ((Array.isArray(tx._splitItems) && tx._splitItems.length > 0) ? tx._splitItems : null);

    if (splitItems && splitItems.length > 0) {
      splitItems.forEach((item, pIdx) => {
        const itemType = (item.type || item.category || item.subtype || '').toLowerCase();
        const itemDesc = (item.description || item.particulars || item.desc || '').toLowerCase();
        const itemMonth = (item.month || item.subMonth || item.sub_month || '').trim();
        const isNotSub = itemType.includes('offering') || itemType.includes('offertory') || itemDesc.includes('offering') || itemDesc.includes('offertory') || itemType.includes('charity') || itemDesc.includes('charity') || itemType.includes('donation') || itemDesc.includes('donation');
        const isSubItem = !isNotSub && (itemType.includes('subscription') || (!itemType && itemDesc.includes('subscription')));

        if (isSubItem) {
          const itemAmt = Number(item.amount || item.receipt || item.credit || item.amt || 0);
          if (itemAmt > 0) {
            let finalMonth = itemMonth ? formatSubMonthWithYear(itemMonth, tx.date) : '';
            if (!finalMonth) finalMonth = formatSubMonthWithYear(itemDesc, tx.date);
            if (!finalMonth && tx.subMonth) finalMonth = formatSubMonthWithYear(tx.subMonth, tx.date);
            if (!finalMonth && tx.date) {
              const d = new Date(tx.date);
              if (!isNaN(d.getTime())) {
                const mNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                finalMonth = `${mNames[d.getMonth()]} ${d.getFullYear()}`;
              }
            }

            const itemKey = `b_${tx.id || tx.vrNo}_split_${pIdx}`;
            if (!seenKeys.has(itemKey)) {
              seenKeys.add(itemKey);
              pool.push({
                ...tx,
                id: tx.id ? `${tx.id}_sub_${pIdx}` : undefined,
                parentBankTxId: tx.id,
                vrNo: tx.vrNo,
                date: tx.date,
                accountName: memberName || tx.accountName,
                address: resolvedAddr,
                amount: itemAmt,
                receipt: itemAmt,
                credit: itemAmt,
                type: 'Subscription',
                category: 'Subscription',
                subtype: item.subtype || 'Subscription',
                subMonth: finalMonth || 'Unknown Month',
                particulars: item.description || item.desc || tx.particulars || '',
                description: item.description || item.desc || tx.description || '',
                isBankEntry: true,
                isSplitEntry: true
              });
            }
          }
        }
      });

      if (tx.id) seenKeys.add(`b_${tx.id}`);
      return;
    }

    // Case B: Text-based split entries with '+' in particulars / description
    if (itemsText.includes('+')) {
      const parts = itemsText.split(/\s*\+\s*/);

      parts.forEach((part, pIdx) => {
        const partTrimmed = part.trim();
        const partLower = partTrimmed.toLowerCase();
        if (!partLower.includes('subscription')) return;
        const isPartNotSub = partLower.includes('offering') || partLower.includes('offertory') || partLower.includes('charity') || partLower.includes('donation');
        if (isPartNotSub) return;

        let itemAmt = 0;
        // Match numbers in parentheses: (1000) or (1,000) or (Rs.1000)
        const parenMatch = partTrimmed.match(/\((?:[^0-9]*)([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\)/);
        if (parenMatch) {
          itemAmt = parseFloat(parenMatch[1].replace(/,/g, ''));
        }
        if (!itemAmt || isNaN(itemAmt)) {
          const symMatch = partTrimmed.match(/(?:rs\.?|inr|₹)\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/i);
          if (symMatch) itemAmt = parseFloat(symMatch[1].replace(/,/g, ''));
        }
        if (!itemAmt || isNaN(itemAmt)) {
          const slashMatch = partTrimmed.match(/([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*(?:\/-|\/rs)/i);
          if (slashMatch) itemAmt = parseFloat(slashMatch[1].replace(/,/g, ''));
        }
        if (!itemAmt || isNaN(itemAmt)) {
          const numMatches = partTrimmed.match(/\b([0-9]{3,}(?:,[0-9]+)*(?:\.[0-9]+)?)\b/g);
          if (numMatches && numMatches.length === 1) {
            itemAmt = parseFloat(numMatches[0].replace(/,/g, ''));
          }
        }
        if (!itemAmt || isNaN(itemAmt) || itemAmt <= 0) {
          if (parts.length === 1) itemAmt = amt;
        }

        let itemMonth = formatSubMonthWithYear(partTrimmed, tx.date);
        if (!itemMonth && tx.subMonth) itemMonth = formatSubMonthWithYear(tx.subMonth, tx.date);
        if (!itemMonth && tx.date) {
          const d = new Date(tx.date);
          if (!isNaN(d.getTime())) {
            const mNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            itemMonth = `${mNames[d.getMonth()]} ${d.getFullYear()}`;
          }
        }

        const itemKey = `b_${tx.id || tx.vrNo}_textsplit_${pIdx}`;
        if (!seenKeys.has(itemKey)) {
          seenKeys.add(itemKey);
          pool.push({
            ...tx,
            id: tx.id ? `${tx.id}_sub_${pIdx}` : undefined,
            parentBankTxId: tx.id,
            vrNo: tx.vrNo,
            date: tx.date,
            accountName: memberName || tx.accountName,
            address: resolvedAddr,
            amount: itemAmt || amt,
            receipt: itemAmt || amt,
            credit: itemAmt || amt,
            type: 'Subscription',
            category: 'Subscription',
            subtype: 'Subscription',
            particulars: partTrimmed,
            description: partTrimmed,
            subMonth: itemMonth || 'Unknown Month',
            isBankEntry: true,
            isSplitEntry: true
          });
        }
      });

      if (tx.id) seenKeys.add(`b_${tx.id}`);
      return;
    }

    // Case C: Standard single bank transaction
    const hasSubBank = typeStr.includes('subscription') || subStr.includes('subscription') || descStr.includes('subscription');
    const isExcludedBank = typeStr.includes('offering') || typeStr.includes('offertory') ||
                           subStr.includes('offering') || subStr.includes('offertory') ||
                           nameStr === 'offertory' || nameStr === 'offering' ||
                           typeStr.includes('charity') || subStr.includes('charity') ||
                           typeStr.includes('donation') || subStr.includes('donation') ||
                           typeStr.includes('first fruit') || subStr.includes('first fruit');

    if (isExcludedBank && !hasSubBank) return;
    if (!hasSubBank) return;

    if (hasSubBank) {
      let subMonth = formatSubMonthWithYear(tx.subMonth, tx.date);
      if (!subMonth && fullText) {
        subMonth = formatSubMonthWithYear(fullText, tx.date);
      }
      if (!subMonth && tx.date) {
        const d = new Date(tx.date);
        if (!isNaN(d.getTime())) {
          const mNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          subMonth = `${mNames[d.getMonth()]} ${d.getFullYear()}`;
        }
      }

      const key = tx.id ? `b_${tx.id}` : `bvr_${tx.vrNo}_${tx.date}_${amt}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        pool.push({
          ...tx,
          accountName: memberName || tx.accountName,
          address: resolvedAddr,
          amount: amt,
          receipt: amt,
          credit: amt,
          type: 'Subscription',
          category: 'Subscription',
          subMonth: subMonth || 'Unknown Month',
          isBankEntry: true
        });
      }
    }
  });

  return pool;
}

function renderSubscriptionsReport() {
  // Get predefined months from the dropdown to ensure FY months always show even if empty
  const predefinedMonths = [];
  const subMonthSelect = document.getElementById('subMonth');
  if (subMonthSelect) {
    Array.from(subMonthSelect.options).forEach(opt => {
      if (!predefinedMonths.includes(opt.value)) predefinedMonths.push(opt.value);
    });
  }

  const receipts = getSubscriptionReceiptsPool();

  const memberMap = {};
  const dbMonths = new Set(predefinedMonths);

  receipts.forEach(tx => {
    let memberName = (tx.accountName && tx.accountName !== '-') ? tx.accountName : (tx.name && tx.name !== '-' ? tx.name : 'Unknown');
    memberName = String(memberName).trim();
    if (memberName === 'Inter-Bank Transfer' || memberName.toLowerCase().includes('opening balance') || memberName === 'Unknown' || memberName.toLowerCase().includes('ipc horeb church')) return;

    let addr = (tx.address || '').trim();
    const canonical = findCanonicalMember(memberName, addr);
    if (canonical) {
      memberName = canonical.name;
      if (!addr && canonical.address) addr = canonical.address.trim();
    }
    if (!addr) {
      addr = getMemberAddress(memberName) || '';
    }
    if (!addr && typeof activeMembersMap !== 'undefined' && activeMembersMap[memberName.toLowerCase()]) {
      addr = activeMembersMap[memberName.toLowerCase()] || '';
    }

    let mapKey = memberName + '|||' + addr;

    let subM = (tx.subMonth || '').trim();
    if (!subM && (tx.particulars || tx.description)) {
      subM = formatSubMonthWithYear(tx.particulars || tx.description, tx.date);
    }
    if (!subM && tx.date) {
      const d = new Date(tx.date);
      if (!isNaN(d.getTime())) {
        const mNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        subM = `${mNames[d.getMonth()]} ${d.getFullYear()}`;
      }
    }
    if (!subM) subM = 'Unknown Month';
    dbMonths.add(subM);

    if (!memberMap[mapKey]) {
      memberMap[mapKey] = { Total: 0, memberName: memberName, address: addr };
    }
    if (!memberMap[mapKey][subM]) memberMap[mapKey][subM] = 0;

    const amt = Number(tx.receipt || tx.credit || tx.amount || 0);
    memberMap[mapKey][subM] += amt;
    memberMap[mapKey].Total += amt;
  });

  const typeCols = Array.from(dbMonths).sort((a, b) => {
    if (a === 'Unknown Month') return 1;
    if (b === 'Unknown Month') return -1;
    const dA = new Date(a);
    const dB = new Date(b);
    if (!isNaN(dA) && !isNaN(dB)) return dA - dB;
    return a.localeCompare(b);
  });

  const thead = document.getElementById('subscriptionsReportHead');
  let headHtml = `<tr>
        <th style="width: 50px; text-align: center; position: sticky; top: 0; background: #f8fafc; z-index: 10; border-bottom: 2px solid #e2e8f0;">Code</th>
        <th style="min-width: 120px; white-space: nowrap; position: sticky; top: 0; background: #f8fafc; z-index: 10; border-bottom: 2px solid #e2e8f0;">👤 Member Name</th>`;
  typeCols.forEach(t => {
    let shortName = t;
    if (t !== 'Unknown Month' && t.includes(' ')) {
      const parts = t.split(' ');
      shortName = parts[0].substring(0, 3).toUpperCase() + "&nbsp;'" + parts[1].slice(-2);
    }
    headHtml += `<th style="text-align: right; white-space: nowrap; padding: 4px 6px; font-size: 0.8rem; width: 65px; min-width: 65px; position: sticky; top: 0; background: #f8fafc; z-index: 10; border-bottom: 2px solid #e2e8f0;">${shortName}</th>`;
  });
  headHtml += `<th style="text-align: right; width: 75px; min-width: 75px; padding: 4px 6px; background: #e2e8f0; font-weight: 800; color: #0f172a; position: sticky; top: 0; z-index: 11; border-bottom: 2px solid #e2e8f0;">🟢 Total</th></tr>`;
  if (thead) thead.innerHTML = headHtml;

  const tbody = document.getElementById('subscriptionsReportBody');
  let bodyHtml = '';
  let slNo = 1;

  let sortedMembers = Object.keys(memberMap).sort((a, b) => {
    const res = compareNamesIgnoringPrefix(memberMap[a].memberName, memberMap[b].memberName);
    if (res !== 0) return res;
    return memberMap[a].address.localeCompare(memberMap[b].address);
  });

  const searchInput = document.getElementById('subSearchInput');
  if (searchInput && searchInput.value.trim() !== '') {
    const query = searchInput.value.trim().toLowerCase();
    sortedMembers = sortedMembers.filter(k => memberMap[k].memberName.toLowerCase().includes(query) || memberMap[k].address.toLowerCase().includes(query));
  }

  let grandTotals = { Total: 0 };
  typeCols.forEach(t => grandTotals[t] = 0);

  sortedMembers.forEach(mapKey => {
    const data = memberMap[mapKey];
    const mName = data.memberName;
    const mAddr = data.address;
    let displayName = `<span style="line-height: 1.2; word-break: break-word;">${mName}</span>`;
    if (mAddr) displayName += `<span class="print-hide-address"><br><span style="font-size:0.75rem; color:#64748b; font-weight:normal; white-space: normal;">${mAddr}</span></span>`;

    bodyHtml += `<tr>
          <td style="text-align: center; font-weight: 700;">${getMemberCode(mName, mAddr)}</td>
          <td style="font-weight: 600; min-width: 100px;">${displayName}</td>`;

    typeCols.forEach(t => {
      const val = data[t] || 0;
      grandTotals[t] += val;
      if (val > 0) {
        bodyHtml += `<td style="text-align: right; font-family: monospace; font-size: 0.85rem; padding: 4px 6px; width: 65px;">
              <span style="color: #2563eb; cursor: pointer; text-decoration: underline;" onclick="showSubscriptionDetails('${mName.replace(/'/g, "\\'")}', '${mAddr.replace(/'/g, "\\'")}', '${t.replace(/'/g, "\\'")}')" title="Click to view details">${formatCurrencyNoSymbol(val)}</span>
            </td>`;
      } else {
        bodyHtml += `<td style="text-align: right; font-family: monospace; font-size: 0.85rem; padding: 4px 6px; width: 65px;">-</td>`;
      }
    });

    grandTotals.Total += data.Total;
    bodyHtml += `<td style="text-align: right; width: 75px; padding: 4px 6px; font-weight: 700; background: #f8fafc; font-family: monospace; font-size: 0.9rem; color: #1e40af;">${formatCurrencyNoSymbol(data.Total)}</td></tr>`;
  });

  if (sortedMembers.length === 0) {
    bodyHtml = `<tr><td colspan="${typeCols.length + 3}" style="text-align:center; padding: 20px;">No members found.</td></tr>`;
  } else {
    bodyHtml += `<tr style="font-weight: 800; color: #0f172a;">
          <td colspan="2" style="text-align: right; padding: 10px; position: sticky; bottom: 0; background: #e2e8f0; border-top: 2px solid #cbd5e1; z-index: 10; box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.05);">Grand Total:</td>`;
    typeCols.forEach(t => {
      bodyHtml += `<td style="text-align: right; font-family: monospace; font-size: 0.9rem; padding: 4px 6px; position: sticky; bottom: 0; background: #e2e8f0; border-top: 2px solid #cbd5e1; z-index: 10; box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.05);">${formatCurrencyNoSymbol(grandTotals[t])}</td>`;
    });
    bodyHtml += `<td style="text-align: right; width: 75px; padding: 4px 6px; font-family: monospace; font-size: 1rem; color: #059669; position: sticky; bottom: 0; background: #cbd5e1; border-top: 2px solid #94a3b8; z-index: 11; box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.05);">${formatCurrencyNoSymbol(grandTotals.Total)}</td></tr>`;
  }

  if (tbody) tbody.innerHTML = bodyHtml;

  window.currentSubscriptionsReportData = {
    headHtml: headHtml,
    bodyHtml: bodyHtml
  };
}

function showSubscriptionDetails(memberName, address, subMonth) {
  const modal = document.getElementById('subscriptionDetailsModal');
  const tableBody = document.getElementById('subModalTableBody');
  const nameEl = document.getElementById('subModalMemberName');
  const monthEl = document.getElementById('subModalMonth');

  if (!modal || !tableBody || !nameEl || !monthEl) return;

  nameEl.innerHTML = memberName + (address ? ` <span style="font-size:0.85rem; color:#64748b; font-weight:normal;">(${address})</span>` : '');
  monthEl.innerText = subMonth;
  tableBody.innerHTML = '';

  const cleanTarget = normalizeMemberName(memberName);

  const receipts = getSubscriptionReceiptsPool().filter(tx => {
    let txMemberName = (tx.accountName && tx.accountName !== '-') ? tx.accountName : (tx.name && tx.name !== '-' ? tx.name : 'Unknown');
    txMemberName = String(txMemberName).trim();
    let txAddr = (tx.address || '').trim();

    const canonical = findCanonicalMember(txMemberName, txAddr);
    if (canonical) {
      txMemberName = canonical.name;
      if (!txAddr && canonical.address) txAddr = canonical.address.trim();
    }
    if (!txAddr) {
      txAddr = getMemberAddress(txMemberName) || '';
    }

    const cleanTx = normalizeMemberName(txMemberName);
    const memberMatches = (txMemberName === memberName) || (cleanTx === cleanTarget);
    const addrMatches = !address || !txAddr || (txAddr === address) || txAddr.includes(address) || address.includes(txAddr);

    let txSubM = (tx.subMonth || '').trim();
    if (!txSubM && (tx.particulars || tx.description)) {
      txSubM = formatSubMonthWithYear(tx.particulars || tx.description, tx.date);
    }
    if (!txSubM && tx.date) {
      const d = new Date(tx.date);
      if (!isNaN(d.getTime())) {
        const mNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        txSubM = `${mNames[d.getMonth()]} ${d.getFullYear()}`;
      }
    }
    if (!txSubM) txSubM = 'Unknown Month';

    return memberMatches && addrMatches && (txSubM === subMonth);
  });

  if (receipts.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 12px; color: #64748b;">No details found.</td></tr>';
  } else {
    receipts.forEach(tx => {
      let dateStr = tx.date || '-';
      if (typeof formatDateDisplay === 'function') {
        dateStr = formatDateDisplay(tx.date) || dateStr;
      }
      const vrNoStr = tx.vrNo || '-';
      const isBank = !!(tx.isBankEntry || (tx.vrNo && String(tx.vrNo).endsWith('/B')) || tx.entryType === 'Bank');
      const amt = Number(tx.receipt || tx.credit || tx.amount || 0);
      const splitNote = (tx.isSplitEntry && (tx.particulars || tx.description)) ? `<div style="font-size:0.75rem; color:#64748b; margin-top:2px;">${tx.particulars || tx.description}</div>` : '';

      tableBody.innerHTML += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px;">
                ${dateStr}
                ${splitNote}
              </td>
              <td style="padding: 8px; text-align: center; font-family: monospace;">
                ${vrNoStr}
                ${isBank ? '<span style="font-size: 0.65rem; background: #dbeafe; color: #1e40af; padding: 1px 4px; border-radius: 4px; margin-left: 4px; font-weight: 700;">BANK</span>' : ''}
              </td>
              <td style="padding: 8px; text-align: right; font-weight: 600; color: #059669;">${formatCurrencyNoSymbol(amt)}</td>
            </tr>
          `;
    });
  }

  modal.style.display = 'flex';
}

function getSubscriptionsReportHTML() {
  if (typeof renderSubscriptionsReport === 'function') {
    renderSubscriptionsReport();
  }
  if (!window.currentSubscriptionsReportData) return '';
  const data = window.currentSubscriptionsReportData;
  // Clean HTML to fix print overlap issues caused by sticky positioning and white-space nowrap
  const cleanHead = data.headHtml
    .replace(/position:\s*sticky;/gi, '')
    .replace(/top:\s*0;/gi, '')
    .replace(/bottom:\s*0;/gi, '')
    .replace(/z-index:\s*\d+;/gi, '')
    .replace(/box-shadow:[^;]+;/gi, '');
  const cleanBody = data.bodyHtml
    .replace(/position:\s*sticky;/gi, '')
    .replace(/top:\s*0;/gi, '')
    .replace(/bottom:\s*0;/gi, '')
    .replace(/z-index:\s*\d+;/gi, '')
    .replace(/box-shadow:[^;]+;/gi, '')
    .replace(/white-space:\s*nowrap;/gi, 'white-space: normal;');

  return '<style>' +
    '  .subs-table { width: 100% !important; border-collapse: collapse !important; font-size: 7.5pt !important; table-layout: fixed !important; box-sizing: border-box !important; }' +
    '  .subs-table th, .subs-table td { padding: 3px 2px !important; border: 1px solid #cbd5e1 !important; position: static !important; font-size: 7.5pt !important; box-sizing: border-box !important; overflow: hidden !important; }' +
    '  .subs-table th:nth-child(1), .subs-table td:nth-child(1) { width: 44px !important; text-align: center !important; white-space: nowrap !important; font-weight: 700 !important; word-break: normal !important; }' +
    '  .subs-table th:nth-child(2), .subs-table td:nth-child(2) { width: 130px !important; white-space: normal !important; word-break: break-word !important; line-height: 1.25 !important; font-weight: 600 !important; }' +
    '  .subs-table th:not(:nth-child(1)):not(:nth-child(2)), .subs-table td:not(:nth-child(1)):not(:nth-child(2)) { width: 44px !important; text-align: right !important; }' +
    '  .subs-table th:last-child, .subs-table td:last-child { width: 58px !important; text-align: right !important; background: #f1f5f9 !important; font-weight: 800 !important; color: #0f172a !important; white-space: nowrap !important; }' +
    '  .subs-table th { font-weight: bold; background: #f8fafc !important; color: #0f172a !important; }' +
    '  .subs-table span { color: #000 !important; text-decoration: none !important; font-size: 7.5pt !important; white-space: normal !important; word-break: break-word !important; }' +
    '  .subs-table .print-hide-address { display: none !important; }' +
    '</style>' +
    '<table style="width: 100%; border: none !important; margin: 0; padding: 0;">' +
    '<thead><tr><td style="border: none !important; padding: 0;">' + getPrintHeaderHTML('SUBSCRIPTION LEDGER', '') + '</td></tr></thead>' +
    '<tbody><tr><td style="border: none !important; padding: 0;">' +
    '<table class="subs-table">' +
    '<thead>' + cleanHead + '</thead>' +
    '<tbody>' + cleanBody + '</tbody>' +
    '</table>' +
    '</td></tr></tbody>' +
    '<tfoot><tr><td style="border: none !important; padding: 0;">' + getPrintSignaturesHTML('Subscription Ledger') + '</td></tr></tfoot>' +
    '</table>';
}

function printSubscriptionsReport() {
  if (!window.currentSubscriptionsReportData) {
    alert("Please generate the report first before printing.");
    return;
  }
  const printArea = document.getElementById('printArea');
  if (!printArea) return;

  printArea.innerHTML = getSubscriptionsReportHTML();
  document.body.classList.add('print-ledger-active');

  const style = document.createElement('style');
  style.id = 'subscriptions-print-style';
  style.innerHTML = '@page { size: 297mm 210mm !important; margin: 10mm; }';
  document.head.appendChild(style);

  function cleanup() {
    document.body.classList.remove('print-ledger-active');
    printArea.innerHTML = '';
    const addedStyle = document.getElementById('subscriptions-print-style');
    if (addedStyle) addedStyle.remove();
  }

  window.addEventListener('afterprint', cleanup, { once: true });

  setTimeout(function () {
    try {
      window.print();
    } catch (e) {
      console.error("Print error:", e);
    }
  }, 300);
}

// ============================================================
// --- MEMBER STATEMENT REPORT ---
function clearMemStmtFilter() {
  if (document.getElementById('memStmtFrom')) document.getElementById('memStmtFrom').value = '';
  if (document.getElementById('memStmtTo')) document.getElementById('memStmtTo').value = '';
  if (document.getElementById('memStmtSearchInput')) document.getElementById('memStmtSearchInput').value = '';
  renderMemberStatementReport();
}

function renderMemberStatementReport() {
  const fromEl = document.getElementById('memStmtFrom');
  const toEl = document.getElementById('memStmtTo');
  let fromDate = null; let toDate = null;
  if (fromEl && fromEl.value) fromDate = new Date(fromEl.value);
  if (toEl && toEl.value) toDate = new Date(toEl.value);
  if (fromDate) fromDate.setHours(0, 0, 0, 0);
  if (toDate) toDate.setHours(23, 59, 59, 999);

  const combinedTxs = [];
  const seenStmtKeys = new Set();
  (allTimeGeneralTxList || []).forEach(tx => {
    if (tx.id) seenStmtKeys.add(`c_${tx.id}`);
    combinedTxs.push(tx);
  });
  (allTimeBankBookList || []).forEach(tx => {
    if (tx.id && seenStmtKeys.has(`b_${tx.id}`)) return;
    const linkedCashId = tx.cashId || tx.cash_id;
    if (linkedCashId && seenStmtKeys.has(`c_${linkedCashId}`)) return;
    if (tx.id) seenStmtKeys.add(`b_${tx.id}`);
    combinedTxs.push({
      ...tx,
      receipt: Number(tx.receipt || tx.credit || 0),
      payment: Number(tx.payment || tx.debit || 0),
      amount: Number(tx.amount || tx.receipt || tx.credit || 0),
      isBankEntry: true
    });
  });

  const receipts = combinedTxs.filter(tx => {
    const amt = Number(tx.receipt || tx.credit || 0);
    const mode = String(tx.mode || '').toLowerCase();
    const typeStr = String(tx.type || '').toLowerCase();
    const subStr = String(tx.subtype || '').toLowerCase();
    const bSubStr = String(tx.bankSubtype || tx.bank_subtype || '').toLowerCase();
    const descStr = String(tx.description || tx.particulars || '').toLowerCase();
    const combinedStr = typeStr + ' ' + subStr + ' ' + bSubStr + ' ' + descStr;

    // Exclude offerings and internal bank transfers/contra/interest from Member Statement
    if (combinedStr.includes('offering') || combinedStr.includes('offertory') || combinedStr.includes('contra') ||
        combinedStr.includes('inter-bank transfer') || combinedStr.includes('bank interest') || combinedStr.includes('bank charges') ||
        descStr.includes('cash deposit') || descStr.includes('cash withdrawal')) {
      return false;
    }

    // Include if mode is Receipt OR if receipt amount > 0 OR if type is recognized as income
    const isReceipt = (amt > 0) || (mode.includes('receipt') || mode.includes('credit')) || combinedStr.includes('subscription') || combinedStr.includes('charity') || combinedStr.includes('donation') || combinedStr.includes('first fruit') || combinedStr.includes('anniversary') || combinedStr.includes('sodari');

    if (!isReceipt) return false;

    let txDate = typeof parseTxDate === 'function' ? parseTxDate(tx) : new Date(tx.date);
    if (!txDate || isNaN(txDate.getTime())) return false;

    if (fromDate && txDate < fromDate) return false;
    if (toDate && txDate > toDate) return false;

    return true;
  });

  const memberMap = {};
  const allTypes = new Set();

  receipts.forEach(tx => {
    let memberName = (tx.accountName && tx.accountName !== '-') ? tx.accountName : (tx.name && tx.name !== '-' ? tx.name : 'Unknown');
    memberName = String(memberName).trim();
    if (memberName === 'Inter-Bank Transfer' || memberName.toLowerCase().includes('opening balance') || memberName === 'Unknown' || memberName.toLowerCase().includes('ipc horeb church')) return;

    let rawType = String(tx.type || '').trim();
    let rawSub = String(tx.subtype || '').trim();
    let rawDesc = String(tx.description || '').trim();
    let typeStr = rawType;

    // If type is "Other Income", use subtype or description for separate tabs
    if (rawType.toLowerCase() === 'other income') {
      if (rawSub !== '') typeStr = rawSub;
      else if (rawDesc !== '') typeStr = rawDesc;
    }
    if (!typeStr) typeStr = rawSub || rawDesc || 'Other Income';

    const combinedType = (rawType + ' ' + rawSub + ' ' + rawDesc).toLowerCase();

    if (combinedType.includes('subscription')) typeStr = 'Subscription';
    else if (combinedType.includes('charity')) typeStr = 'Charity';
    else if (combinedType.includes('donation')) typeStr = 'Donation';
    else if (combinedType.includes('first fruit')) typeStr = 'First Fruits';
    else if (combinedType.includes('anniversary')) typeStr = 'Anniversary';
    else if (combinedType.includes('sodari') || combinedType.includes('samajam')) typeStr = 'Sodari Samajam';

    allTypes.add(typeStr);

    let addr = String(tx.address || '').trim();
    let mapKey = memberName + '|||' + addr;

    if (!memberMap[mapKey]) {
      memberMap[mapKey] = { Total: 0, memberName: memberName, address: addr };
    }
    if (!memberMap[mapKey][typeStr]) memberMap[mapKey][typeStr] = 0;

    const amt = Number(tx.receipt || tx.amount || 0);
    memberMap[mapKey][typeStr] += amt;
    memberMap[mapKey].Total += amt;
  });

  const fixedOrder = ['Subscription', 'Charity', 'Donation', 'First Fruits', 'Anniversary', 'Sodari Samajam'];
  const typeCols = Array.from(allTypes).sort((a, b) => {
    const indexA = fixedOrder.indexOf(a);
    const indexB = fixedOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  const thead = document.getElementById('memberStatementHead');
  let headHtml = `<tr>
        <th style="width: 50px; position: sticky; top: 0; background: #f8fafc; z-index: 10; border-bottom: 2px solid #e2e8f0;">Sl No</th>
        <th style="position: sticky; top: 0; background: #f8fafc; z-index: 10; border-bottom: 2px solid #e2e8f0;">👤 Member Name</th>`;
  typeCols.forEach(t => {
    headHtml += `<th style="text-align: right; position: sticky; top: 0; background: #f8fafc; z-index: 10; border-bottom: 2px solid #e2e8f0;">${t}</th>`;
  });
  headHtml += `<th style="text-align: right; background: #e2e8f0; font-weight: 800; color: #0f172a; position: sticky; top: 0; z-index: 11; border-bottom: 2px solid #e2e8f0;">🟢 Total</th></tr>`;
  if (thead) thead.innerHTML = headHtml;

  const tbody = document.getElementById('memberStatementBody');
  let bodyHtml = '';
  let slNo = 1;

  let sortedMembers = Object.keys(memberMap).sort((a, b) => {
    const res = compareNamesIgnoringPrefix(memberMap[a].memberName, memberMap[b].memberName);
    if (res !== 0) return res;
    return memberMap[a].address.localeCompare(memberMap[b].address);
  });

  const searchInput = document.getElementById('memStmtSearchInput');
  if (searchInput && searchInput.value.trim() !== '') {
    const query = searchInput.value.trim().toLowerCase();
    sortedMembers = sortedMembers.filter(k => memberMap[k].memberName.toLowerCase().includes(query) || memberMap[k].address.toLowerCase().includes(query));
  }

  let grandTotals = { Total: 0 };
  typeCols.forEach(t => grandTotals[t] = 0);

  sortedMembers.forEach(mapKey => {
    const data = memberMap[mapKey];
    if (data.Total <= 0) return;

    const mName = data.memberName;
    const mAddr = data.address;
    let displayName = mName;
    if (mAddr) displayName += `<br><span style="font-size:0.75rem; color:#64748b; font-weight:normal;">${mAddr}</span>`;

    bodyHtml += `<tr>
          <td style="text-align: center;">${slNo++}</td>
          <td style="font-weight: 600;">${displayName}</td>`;

    typeCols.forEach(t => {
      const val = data[t] || 0;
      grandTotals[t] += val;
      bodyHtml += `<td style="text-align: right; font-family: monospace; font-size: 0.95rem;">${val > 0 ? formatCurrencyNoDecimals(val) : '-'}</td>`;
    });

    grandTotals.Total += data.Total;
    bodyHtml += `<td style="text-align: right; font-weight: 700; background: #f8fafc; font-family: monospace; font-size: 0.95rem; color: #1e40af;">${formatCurrencyNoDecimals(data.Total)}</td></tr>`;
  });

  if (slNo === 1) {
    bodyHtml = `<tr><td colspan="${typeCols.length + 3}" style="text-align:center; padding: 20px;">No contributions found in this date range.</td></tr>`;
  } else {
    bodyHtml += `<tr style="font-weight: 800; color: #0f172a;">
          <td colspan="2" style="text-align: right; padding: 10px; position: sticky; bottom: 0; background: #e2e8f0; border-top: 2px solid #cbd5e1; z-index: 10; box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.05);">Grand Total:</td>`;
    typeCols.forEach(t => {
      bodyHtml += `<td style="text-align: right; font-family: monospace; font-size: 1rem; position: sticky; bottom: 0; background: #e2e8f0; border-top: 2px solid #cbd5e1; z-index: 10; box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.05);">${formatCurrencyNoDecimals(grandTotals[t])}</td>`;
    });
    bodyHtml += `<td style="text-align: right; font-family: monospace; font-size: 1.05rem; color: #059669; position: sticky; bottom: 0; background: #cbd5e1; border-top: 2px solid #94a3b8; z-index: 11; box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.05);">${formatCurrencyNoDecimals(grandTotals.Total)}</td></tr>`;
  }

  if (tbody) tbody.innerHTML = bodyHtml;

  window.currentMemberStatementData = {
    fromDate: fromEl && fromEl.value ? formatDateClean(fromEl.value) : 'Beginning',
    toDate: toEl && toEl.value ? formatDateClean(toEl.value) : 'Today',
    headHtml: headHtml,
    bodyHtml: bodyHtml
  };
}

function printMemberStatementReport() {
  if (!window.currentMemberStatementData) {
    alert("Please generate the report first before printing.");
    return;
  }
  const data = window.currentMemberStatementData;
  const printArea = document.getElementById('printArea');
  if (!printArea) return;

  // Clean HTML to fix print overlap issues caused by sticky positioning
  const cleanHead = data.headHtml.replace(/position:\s*sticky;/gi, '').replace(/top:\s*0;/gi, '').replace(/bottom:\s*0;/gi, '').replace(/z-index:\s*\d+;/gi, '').replace(/box-shadow:[^;]+;/gi, '');
  const cleanBody = data.bodyHtml.replace(/position:\s*sticky;/gi, '').replace(/top:\s*0;/gi, '').replace(/bottom:\s*0;/gi, '').replace(/z-index:\s*\d+;/gi, '').replace(/box-shadow:[^;]+;/gi, '');

  let html = `<style>
        @page { size: 297mm 210mm !important; margin: 10mm; }
        @media print {
          table { width: 100%; border-collapse: collapse; font-size: 9pt; table-layout: auto; }
          th, td { padding: 4px 6px !important; border: 1px solid #cbd5e1 !important; position: static !important; }
          th { font-weight: bold; background: #f8fafc !important; }
        }
        </style>
        <div class="print-header">
        <h1>MEMBER CONTRIBUTIONS STATEMENT</h1>
        <h2>IPC HOREB CHURCH, THADIYOOR</h2>
        <p>Period: ${data.fromDate} to ${data.toDate} &nbsp;|&nbsp; Printed on ${new Date().toLocaleDateString('en-IN')}</p>
        </div>
        <table>
          <thead>${cleanHead}</thead>
          <tbody>${cleanBody}</tbody>
        </table>
        ${getPrintSignaturesHTML()}
        <div class="print-footer">IPC HOREB CHURCH, THADIYOOR | Member Contributions Report</div>`;

  printArea.innerHTML = html;
  document.body.classList.add('print-ledger-active');

  function cleanup() {
    document.body.classList.remove('print-ledger-active');
    printArea.innerHTML = '';
  }

  window.addEventListener('afterprint', cleanup, { once: true });

  setTimeout(function () {
    try {
      window.print();
    } catch (e) {
      console.error("Print error:", e);
    }
  }, 300);
}

function exportMemberStatementToExcel() {
  // Re-run the data logic to get current filtered data
  const fromEl = document.getElementById('memStmtFrom');
  const toEl = document.getElementById('memStmtTo');
  let fromDate = null; let toDate = null;
  if (fromEl && fromEl.value) fromDate = new Date(fromEl.value);
  if (toEl && toEl.value) toDate = new Date(toEl.value);
  if (fromDate) fromDate.setHours(0, 0, 0, 0);
  if (toDate) toDate.setHours(23, 59, 59, 999);

  const receipts = allTimeGeneralTxList.filter(tx => {
    const amt = Number(tx.receipt || 0);
    const mode = String(tx.mode || '').toLowerCase();
    const typeStr = String(tx.type || '').toLowerCase();
    const subStr = String(tx.subtype || '').toLowerCase();
    const descStr = String(tx.description || '').toLowerCase();
    const combinedStr = typeStr + ' ' + subStr + ' ' + descStr;
    if (combinedStr.includes('offering') || combinedStr.includes('offertory') || combinedStr.includes('bank') || combinedStr.includes('contra') || combinedStr.includes('transfer')) return false;
    const isReceipt = (amt > 0) || (mode === 'receipt') || combinedStr.includes('subscription') || combinedStr.includes('charity') || combinedStr.includes('donation') || combinedStr.includes('first fruit') || combinedStr.includes('anniversary') || combinedStr.includes('sodari');
    if (!isReceipt) return false;
    let txDate = typeof parseTxDate === 'function' ? parseTxDate(tx) : new Date(tx.date);
    if (!txDate || isNaN(txDate.getTime())) return false;
    if (fromDate && txDate < fromDate) return false;
    if (toDate && txDate > toDate) return false;
    return true;
  });

  const memberMap = {};
  const allTypes = new Set();

  receipts.forEach(tx => {
    let memberName = (tx.accountName && tx.accountName !== '-') ? tx.accountName : (tx.name && tx.name !== '-' ? tx.name : 'Unknown');
    memberName = String(memberName).trim();
    if (memberName === 'Inter-Bank Transfer' || memberName.toLowerCase().includes('opening balance') || memberName === 'Unknown' || memberName.toLowerCase().includes('ipc horeb church')) return;
    let rawType = String(tx.type || '').trim();
    let rawSub = String(tx.subtype || '').trim();
    let rawDesc = String(tx.description || '').trim();
    let typeStr = rawType;
    if (rawType.toLowerCase() === 'other income') {
      if (rawSub !== '') typeStr = rawSub;
      else if (rawDesc !== '') typeStr = rawDesc;
    }
    if (!typeStr) typeStr = rawSub || rawDesc || 'Other Income';

    const combinedType = (rawType + ' ' + rawSub + ' ' + rawDesc).toLowerCase();
    if (combinedType.includes('subscription')) typeStr = 'Subscription';
    else if (combinedType.includes('charity')) typeStr = 'Charity';
    else if (combinedType.includes('donation')) typeStr = 'Donation';
    else if (combinedType.includes('first fruit')) typeStr = 'First Fruits';
    else if (combinedType.includes('anniversary')) typeStr = 'Anniversary';
    else if (combinedType.includes('sodari') || combinedType.includes('samajam')) typeStr = 'Sodari Samajam';
    allTypes.add(typeStr);

    let addr = String(tx.address || '').trim();
    let mapKey = memberName + '|||' + addr;

    if (!memberMap[mapKey]) memberMap[mapKey] = { Total: 0, memberName: memberName, address: addr };
    if (!memberMap[mapKey][typeStr]) memberMap[mapKey][typeStr] = 0;
    const amt = Number(tx.receipt || tx.amount || 0);
    memberMap[mapKey][typeStr] += amt;
    memberMap[mapKey].Total += amt;
  });

  const fixedOrder = ['Subscription', 'Charity', 'Donation', 'First Fruits', 'Anniversary', 'Sodari Samajam'];
  const typeCols = Array.from(allTypes).sort((a, b) => {
    const indexA = fixedOrder.indexOf(a);
    const indexB = fixedOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });
  const searchInput = document.getElementById('memStmtSearchInput');
  let sortedMembers = Object.keys(memberMap).sort((a, b) => {
    const res = compareNamesIgnoringPrefix(memberMap[a].memberName, memberMap[b].memberName);
    if (res !== 0) return res;
    return memberMap[a].address.localeCompare(memberMap[b].address);
  });
  if (searchInput && searchInput.value.trim() !== '') {
    const query = searchInput.value.trim().toLowerCase();
    sortedMembers = sortedMembers.filter(k => memberMap[k].memberName.toLowerCase().includes(query) || memberMap[k].address.toLowerCase().includes(query));
  }

  if (sortedMembers.length === 0) {
    alert('No data to export. Please generate the report first.');
    return;
  }

  if (typeof XLSX === 'undefined') {
    alert('Excel library not loaded. Please check your internet connection and try again.');
    return;
  }

  const fromLabel = fromEl && fromEl.value ? formatDateClean(fromEl.value) : 'Beginning';
  const toLabel = toEl && toEl.value ? formatDateClean(toEl.value) : 'Today';

  const wb = XLSX.utils.book_new();
  const wsData = [];

  // Title rows
  wsData.push(['IPC HOREB CHURCH, THADIYOOR']);
  wsData.push(['MEMBER CONTRIBUTIONS STATEMENT']);
  wsData.push([`Period: ${fromLabel} to ${toLabel}`]);
  wsData.push([`Generated on: ${new Date().toLocaleDateString('en-IN')}`]);
  wsData.push([]); // empty row

  // Header row
  const headerRow = ['Sl No', 'Member Name', ...typeCols.map(t => `${t} (₹)`), 'Total (₹)'];
  wsData.push(headerRow);

  // Data rows
  let slNo = 1;
  const grandTotals = { Total: 0 };
  typeCols.forEach(t => grandTotals[t] = 0);

  sortedMembers.forEach(mapKey => {
    const data = memberMap[mapKey];
    if (data.Total <= 0) return;
    const mName = data.memberName;
    const mAddr = data.address;
    const displayName = mAddr ? `${mName} (${mAddr})` : mName;
    const row = [slNo++, displayName];
    typeCols.forEach(t => {
      const val = data[t] || 0;
      grandTotals[t] += val;
      row.push(val > 0 ? val : '');
    });
    grandTotals.Total += data.Total;
    row.push(data.Total);
    wsData.push(row);
  });

  // Grand total row
  wsData.push([]); // spacer
  const totalRow = ['', 'GRAND TOTAL', ...typeCols.map(t => grandTotals[t]), grandTotals.Total];
  wsData.push(totalRow);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  const colWidths = [{ wch: 8 }, { wch: 35 }];
  typeCols.forEach(() => colWidths.push({ wch: 18 }));
  colWidths.push({ wch: 18 });
  ws['!cols'] = colWidths;

  // Style header row (row index 5 = 0-indexed)
  const headerRowIndex = 5;
  const numCols = headerRow.length;
  for (let c = 0; c < numCols; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1e3a5f' } },
        alignment: { horizontal: c >= 2 ? 'right' : 'left', vertical: 'center' },
        border: { bottom: { style: 'thin', color: { rgb: 'CBD5E1' } } }
      };
    }
  }

  // Style total row
  const totalRowIndex = wsData.length - 1;
  for (let c = 0; c < numCols; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: totalRowIndex, c });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: '065F46' } },
        fill: { fgColor: { rgb: 'D1FAE5' } },
        alignment: { horizontal: c >= 2 ? 'right' : 'left', vertical: 'center' }
      };
    }
  }

  // Style title rows
  for (let r = 0; r < 4; r++) {
    const cellRef = XLSX.utils.encode_cell({ r, c: 0 });
    if (ws[cellRef]) {
      ws[cellRef].s = { font: { bold: r < 2, sz: r === 0 ? 14 : (r === 1 ? 12 : 10), color: { rgb: r < 2 ? '1e3a5f' : '475569' } } };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Member Contributions');

  const fileName = `Member_Contributions_${fromLabel.replace(/ /g, '_')}_to_${toLabel.replace(/ /g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}



// PRINT / PDF EXPORT FUNCTIONS
// ============================================================

function getCashBookHTML() {
  const searchVal = (document.getElementById('cashBookSearchInput') ? document.getElementById('cashBookSearchInput').value : '').toLowerCase().trim();

  let totalReceipt = 0;
  let totalPayment = 0;
  const filteredList = currentLoadedTxList.filter(tx => {
    if (!searchVal) return true;
    const accName = (tx.accountName || '').toLowerCase();
    const desc = (tx.description || '').toLowerCase();
    const vrNo = String(tx.vrNo || '').toLowerCase();
    const type = (tx.type || '').toLowerCase();
    const subtype = (tx.subtype || '').toLowerCase();
    return accName.includes(searchVal) || desc.includes(searchVal) || vrNo.includes(searchVal) || type.includes(searchVal) || subtype.includes(searchVal);
  });

  let html = '<table style="width: 100%; border: none !important; margin: 0; padding: 0;">' +
    '<thead><tr><td style="border: none !important; padding: 0;">' +
    getPrintHeaderHTML('CASH BOOK', '', searchVal ? 'Filter: ' + searchVal : '') +
    '</td></tr></thead>' +
    '<tbody><tr><td style="border: none !important; padding: 0;">' +
    '<table>' +
    '<thead>' +
    '<tr><th>Date</th><th>Vr No</th><th>Account Name</th><th>Description</th><th style="text-align:right">Receipt (₹)</th><th style="text-align:right">Payment (₹)</th><th>Category</th></tr></thead>' +
    '<tbody>';

  sortTransactionsAscending(filteredList).forEach(tx => {
    const rcpt = tx.receipt || 0;
    const pmt = tx.payment || 0;
    totalReceipt += rcpt;
    totalPayment += pmt;

    const st = (tx.subtype || '').toLowerCase().trim();
    const tp = (tx.type || '').toLowerCase().trim();
    const ac = (tx.accountName || '').toLowerCase().trim();
    if (st.includes('suspense') || tp.includes('suspense') || ac === 'suspense' || ac === 'suspenses') return;

    const cleanDate = formatDateClean(tx.date);
    const cleanVr = formatVrNoClean(tx.vrNo);
    let dispName = (tx.accountName && tx.accountName !== '-') ? tx.accountName : (tx.subtype || tx.type || '-');
    if ((!tx.accountName || tx.accountName === '-') && tx.type === 'Charity' && (tx.subtype === 'Paid' || tx.subtype === 'Received')) {
      dispName = 'Charity ' + tx.subtype;
    }
    html += '<tr>' +
      '<td>' + formatDateHtml(tx.date) + '</td>' +
      '<td style="text-align:center">' + cleanVr + '</td>' +
      '<td>' + dispName + '</td>' +
      '<td>' + (tx.description || '-') + '</td>' +
      '<td class="print-rcpt-amt" style="text-align:right">' + (rcpt ? formatCurrency(rcpt) : '-') + '</td>' +
      '<td class="print-pmt-amt" style="text-align:right">' + (pmt ? formatCurrency(pmt) : '-') + '</td>' +
      '<td>' + (tx.type || '--') + '</td>' +
      '</tr>';
  });

  html += '</tbody>' +
    '<tfoot><tr class="print-totals-row"><td colspan="4" style="text-align:right">TOTAL</td>' +
    '<td style="text-align:right">' + formatCurrency(totalReceipt) + '</td>' +
    '<td style="text-align:right">' + formatCurrency(totalPayment) + '</td><td></td></tr>' +
    '</tfoot></table>' +
    '</td></tr></tbody>' +
    '<tfoot><tr><td style="border: none !important; padding: 0;">' +
    getPrintSignaturesHTML('Computer Generated Cash Book') +
    '</td></tr></tfoot></table>';

  return html;
}

function printCashBook() {
  const printArea = document.getElementById('printArea');
  if (!printArea) return;

  printArea.innerHTML = getCashBookHTML();
  document.body.classList.add('print-cashbook-active');

  const style = document.createElement('style');
  style.id = 'cashbook-print-style';
  style.innerHTML = '@page { size: 297mm 210mm !important; margin: 8mm; }';
  document.head.appendChild(style);

  function cleanup() {
    document.body.classList.remove('print-cashbook-active');
    printArea.innerHTML = '';
    const addedStyle = document.getElementById('cashbook-print-style');
    if (addedStyle) addedStyle.remove();
  }

  window.addEventListener('afterprint', cleanup, { once: true });

  setTimeout(function () {
    try {
      window.print();
    } catch (e) {
      console.error("Print error:", e);
    }
  }, 300);
}



function getLedgerPool() {
  let generalList = currentGeneralTxList;
  if (!generalList || generalList.length === 0) {
    if (typeof allTimeGeneralTxList !== 'undefined' && allTimeGeneralTxList.length > 0) {
      currentGeneralTxList = filterListByFY(allTimeGeneralTxList);
      generalList = currentGeneralTxList;
    }
  }

  let bankList = (typeof loadedBankBookTransactions !== 'undefined' && loadedBankBookTransactions.length > 0)
    ? loadedBankBookTransactions
    : (typeof allTimeBankBookList !== 'undefined' ? filterListByFY(allTimeBankBookList) : []);

  return getLedgerPoolForLists(generalList, bankList);
}

function getLedgerHTML() {
  const filterVal = document.getElementById('ledgerSubtypeFilter') ? document.getElementById('ledgerSubtypeFilter').value : 'ALL';
  const searchVal = (document.getElementById('ledgerSearchInput') ? document.getElementById('ledgerSearchInput').value : '').toLowerCase().trim();
  const filterNorm = (filterVal !== 'ALL') ? normalizeLedgerName(filterVal) : '';

  let totalAmt = 0;
  const pool = getLedgerPool();
  const ledgerList = pool.filter(tx => {
    const head = getCanonicalLedgerHead(tx);
    const headNorm = normalizeLedgerName(head);
    const catNorm = normalizeLedgerName(tx.category || '');
    const subNorm = normalizeLedgerName(tx.subtype || tx.subType || tx.bank_subtype || tx.bankSubtype || '');

    if (filterVal !== 'ALL') {
      const matches = (
        headNorm === filterNorm || headNorm.includes(filterNorm) || filterNorm.includes(headNorm) ||
        (catNorm && (catNorm === filterNorm || catNorm.includes(filterNorm) || filterNorm.includes(catNorm))) ||
        (subNorm && (subNorm === filterNorm || subNorm.includes(filterNorm) || filterNorm.includes(subNorm)))
      );
      if (!matches) return false;
    }

    if (searchVal) {
      const accName = (tx.accountName || '').toLowerCase();
      const desc = (tx.description || tx.particulars || '').toLowerCase();
      const vrNo = String(tx.vrNo || '').toLowerCase();
      const sub = (tx.subtype || tx.bank_subtype || '').toLowerCase();
      const cat = (tx.category || '').toLowerCase();
      const h = head.toLowerCase();
      if (!accName.includes(searchVal) && !desc.includes(searchVal) && !vrNo.includes(searchVal) && !sub.includes(searchVal) && !h.includes(searchVal) && !cat.includes(searchVal)) {
        return false;
      }
    }

    return true;
  });

  let html = '<table style="width: 100%; border: none !important; margin: 0; padding: 0;">' +
    '<thead><tr><td style="border: none !important; padding: 0;">' +
    getPrintHeaderHTML('LEDGER ACCOUNTS STATEMENT', '', (filterVal !== 'ALL' ? 'Filter: ' + filterVal : '') + (searchVal ? ' | Search: ' + searchVal : '')) +
    '</td></tr></thead>' +
    '<tbody><tr><td style="border: none !important; padding: 0;">' +
    '<table>' +
    '<thead>' +
    '<tr><th>Date</th><th>Vr No</th><th>Description</th><th>Category</th><th style="text-align:right">Amount (₹)</th></tr></thead>' +
    '<tbody>';

  sortTransactionsAscending(ledgerList).forEach(tx => {
    const cleanVr = formatVrNoClean(tx.vrNo);
    const amt = Number(tx.payment || tx.debit || tx.amount || tx.receipt || 0);
    const head = getCanonicalLedgerHead(tx);
    totalAmt += amt;
    html += '<tr>' +
      '<td>' + formatDateHtml(tx.date) + '</td>' +
      '<td style="text-align:center">' + cleanVr + '</td>' +
      '<td>' + (tx.description || tx.particulars || '-') + '</td>' +
      '<td>' + (tx.category || tx.subtype || head) + '</td>' +
      '<td class="print-pmt-amt" style="text-align:right">' + formatCurrency(amt) + '</td>' +
      '</tr>';
  });

  html += '</tbody>' +
    '<tfoot><tr class="print-totals-row"><td colspan="4" style="text-align:right">TOTAL</td><td style="text-align:right">' + formatCurrency(totalAmt) + '</td></tr>' +
    '</tfoot></table>' +
    '</td></tr></tbody>' +
    '<tfoot><tr><td style="border: none !important; padding: 0;">' +
    getPrintSignaturesHTML('Computer Generated Ledger Statement') +
    '</td></tr></tfoot></table>';

  return html;
}

function printLedger() {
  const printArea = document.getElementById('printArea');
  if (!printArea) return;
  printArea.innerHTML = getLedgerHTML();
  document.body.classList.add('print-ledger-active');

  function cleanup() {
    document.body.classList.remove('print-ledger-active');
    printArea.innerHTML = '';
  }

  window.addEventListener('afterprint', cleanup, { once: true });

  setTimeout(function () {
    try {
      window.print();
    } catch (e) {
      console.error("Print error:", e);
    }
  }, 300);
}

function getLedgerAllHTML() {
  const pool = getLedgerPool();
  var grouped = {};
  pool.forEach(function (tx) {
    var head = getCanonicalLedgerHead(tx);
    if (!grouped[head]) grouped[head] = [];
    grouped[head].push(tx);
  });

  var html = '<table style="width: 100%; border: none !important; margin: 0; padding: 0;">' +
    '<thead><tr><td style="border: none !important; padding: 0;">' +
    getPrintHeaderHTML('ALL LEDGER ACCOUNTS STATEMENT', '') +
    '</td></tr></thead>' +
    '<tbody><tr><td style="border: none !important; padding: 0;">';

  var grandTotal = 0;
  var sortedSubtypes = Object.keys(grouped).sort(function (a, b) {
    var weightA = getLedgerSortWeight(a);
    var weightB = getLedgerSortWeight(b);
    if (weightA !== weightB) return weightA - weightB;
    return a.localeCompare(b);
  });

  sortedSubtypes.forEach(function (subtype) {
    var list = grouped[subtype];
    var subTotal = list.reduce(function (sum, tx) { return sum + Number(tx.payment || tx.debit || tx.amount || tx.receipt || 0); }, 0);
    html += '<div class="print-section-head" style="background: #f1f5f9; color: #0f172a; padding: 6px 10px; font-weight: 800; font-size: 9pt; margin-top: 14px; border: 1px solid #cbd5e1; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">' +
      '<span>📌 ' + subtype + ' (' + list.length + ' Entries)</span>' +
      '<span>Total: ' + formatCurrency(subTotal) + '</span>' +
      '</div>' +
      '<table style="margin-top: 4px; margin-bottom: 12px;">' +
      '<thead><tr><th>Date</th><th>Vr No</th><th>Name / Description</th><th style="text-align:right">Amount</th></tr></thead>' +
      '<tbody>';
    sortTransactionsAscending(list).forEach(function (tx) {
      var cleanVr = formatVrNoClean(tx.vrNo);
      var amt = Number(tx.payment || tx.debit || tx.amount || tx.receipt || 0);
      var detail = tx.accountName && tx.accountName !== '-' ? tx.accountName + (tx.description ? ' &ndash; ' + tx.description : '') : (tx.description || tx.particulars || '-');
      html += '<tr>' +
        '<td>' + formatDateHtml(tx.date) + '</td>' +
        '<td style="text-align:center">' + cleanVr + '</td>' +
        '<td>' + detail + '</td>' +
        '<td class="print-pmt-amt" style="text-align:right">' + formatCurrency(amt) + '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    grandTotal += subTotal;
  });

  html += '<div style="margin-top:14px;padding:10px;font-weight:800;text-align:right;font-size:11pt;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;">Grand Total: ' + formatCurrency(grandTotal) + '</div>' +
    '</td></tr></tbody>' +
    '<tfoot><tr><td style="border: none !important; padding: 0;">' +
    getPrintSignaturesHTML('Computer Generated Ledger Statement - All Accounts') +
    '</td></tr></tfoot></table>';

  return html;
}

function printLedgerAll() {
  const printArea = document.getElementById('printArea');
  if (!printArea) return;
  printArea.innerHTML = getLedgerAllHTML();
  document.body.classList.add('print-ledger-active');

  function cleanup() {
    document.body.classList.remove('print-ledger-active');
    printArea.innerHTML = '';
  }

  window.addEventListener('afterprint', cleanup, { once: true });

  setTimeout(function () {
    try {
      window.print();
    } catch (e) {
      console.error("Print error:", e);
    }
  }, 300);
}

function getOfferingHTML() {
  const offeringList = currentGeneralTxList.filter(function (tx) { return tx.type === 'Offering'; });
  let totalAmt = 0;

  let html = '<table style="width: 100%; border: none !important; margin: 0; padding: 0;">' +
    '<thead><tr><td style="border: none !important; padding: 0;">' +
    getPrintHeaderHTML('CHURCH OFFERING & OFFERTORY LOG', '') +
    '</td></tr></thead>' +
    '<tbody><tr><td style="border: none !important; padding: 0;">' +
    '<table>' +
    '<thead>' +
    '<tr><th>Date</th><th>Vr No</th><th>Particulars</th><th style="text-align:right">Amount (₹)</th></tr></thead>' +
    '<tbody>';

  sortTransactionsAscending(offeringList).forEach(function (tx) {
    const cleanDate = formatDateClean(tx.date);
    const cleanVr = formatVrNoClean(tx.vrNo);
    const amt = Number(tx.payment || tx.receipt || 0);
    totalAmt += amt;
    html += '<tr>' +
      '<td>' + formatDateHtml(tx.date) + '</td>' +
      '<td style="text-align:center">' + cleanVr + '</td>' +
      '<td>' + (tx.description || 'Offertory / Offering') + '</td>' +
      '<td class="print-rcpt-amt" style="text-align:right">' + formatCurrency(amt) + '</td>' +
      '</tr>';
  });

  html += '</tbody>' +
    '<tfoot><tr class="print-totals-row"><td colspan="3" style="text-align:right">TOTAL OFFERING</td><td style="text-align:right">' + formatCurrency(totalAmt) + '</td></tr></tfoot>' +
    '</table>' +
    '</td></tr></tbody>' +
    '<tfoot><tr><td style="border: none !important; padding: 0;">' +
    getPrintSignaturesHTML('Computer Generated Offering Statement') +
    '</td></tr></tfoot></table>';

  return html;
}

function printOffering() {
  const printArea = document.getElementById('printArea');
  if (!printArea) return;
  printArea.innerHTML = getOfferingHTML();
  document.body.classList.add('print-offering-active');

  function cleanup() {
    document.body.classList.remove('print-offering-active');
    printArea.innerHTML = '';
  }

  window.addEventListener('afterprint', cleanup, { once: true });

  setTimeout(function () {
    try {
      window.print();
    } catch (e) {
      console.error("Print error:", e);
    }
  }, 300);
}

function getCharityHTML() {
  const searchVal = (document.getElementById('charitySearchInput') ? document.getElementById('charitySearchInput').value : '').toLowerCase().trim();

  const charityPool = getCharityTransactionsPool();
  const list = charityPool.filter(tx => {
    const sub = (tx.subtype || '').toLowerCase();
    const mode = selectedCharityMode.toLowerCase();
    const matchesMode = mode === 'all' ? true : sub.includes(mode);
    if (!matchesMode) return false;
    if (searchVal) {
      const accName = (tx.accountName || '').toLowerCase();
      const desc = (tx.description || '').toLowerCase();
      const addr = (tx.address || activeMembersMap[(tx.accountName || '').toLowerCase()] || '').toLowerCase();
      const vrNo = String(tx.vrNo || '').toLowerCase();
      if (!accName.includes(searchVal) && !desc.includes(searchVal) && !addr.includes(searchVal) && !vrNo.includes(searchVal)) return false;
    }
    return true;
  });

  const rcptList = [];
  const pmtList = [];

  list.forEach(function (tx) {
    var typeLower = (tx.type || '').toLowerCase();
    var isRcpt = typeLower.includes('received') || (tx.subtype && tx.subtype.toLowerCase().includes('received')) || (tx.receipt && Number(tx.receipt) > 0) || tx.mode === 'Receipt';
    if (isRcpt) {
      rcptList.push(tx);
    } else {
      pmtList.push(tx);
    }
  });

  var html = '<table style="width: 100%; border: none !important; margin: 0; padding: 0;">' +
    '<thead><tr><td style="border: none !important; padding: 0;">' +
    getPrintHeaderHTML('CHARITY & RELIEF STATEMENT', '', 'Filter: ' + selectedCharityMode + (searchVal ? ' | Search: ' + searchVal : '')) +
    '</td></tr></thead>' +
    '<tbody><tr><td style="border: none !important; padding: 0;">';

  var grandTotalRcpt = 0;
  var grandTotalPmt = 0;

  // TABLE 1: CHARITY RECEIVED
  if (selectedCharityMode === 'All' || selectedCharityMode === 'Received') {
    html += '<div style="margin-top: 10px; margin-bottom: 4px; font-weight: 800; font-size: 11pt; color: #047857;">🟢 CHARITY RECEIVED</div>';
    html += '<table style="margin-bottom: 16px;">' +
      '<thead>' +
      '<tr><th style="width: 14%;">Date</th><th style="width: 12%; text-align: center;">Vr No</th><th style="width: 30%;">Name</th><th style="width: 29%;">Address / Description</th><th style="width: 15%; text-align: right; color: #047857;">Amount</th></tr></thead>' +
      '<tbody>';

    if (rcptList.length === 0) {
      html += '<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 10px;">No Charity Received entries recorded</td></tr>';
    } else {
      sortTransactionsAscending(rcptList).forEach(function (tx) {
        var cleanVr = formatVrNoClean(tx.vrNo);
        var amt = Number(tx.receipt || tx.amount || 0);
        grandTotalRcpt += amt;

        var addr = (tx.address || activeMembersMap[(tx.accountName || '').toLowerCase()] || '').trim();
        var desc = (tx.description || '').trim();
        var full = addr && desc && addr.toLowerCase() !== desc.toLowerCase() ? addr + ', ' + desc : (addr || desc || '-');

        html += '<tr>' +
          '<td>' + formatDateHtml(tx.date) + '</td>' +
          '<td style="text-align:center">' + cleanVr + '</td>' +
          '<td>' + (tx.accountName || '-') + '</td>' +
          '<td>' + full + '</td>' +
          '<td class="print-rcpt-amt" style="text-align:right; font-weight: 700; color: #047857;">' + formatCurrency(amt) + '</td>' +
          '</tr>';
      });
    }

    html += '</tbody>' +
      '<tfoot><tr class="print-totals-row"><td colspan="4" style="text-align:right">TOTAL CHARITY RECEIVED</td><td style="text-align:right; font-weight: 800; color: #047857;">' + formatCurrency(grandTotalRcpt) + '</td></tr></tfoot>' +
      '</table>';
  }

  // TABLE 2: CHARITY PAID
  if (selectedCharityMode === 'All' || selectedCharityMode === 'Paid') {
    html += '<div style="margin-top: 14px; margin-bottom: 4px; font-weight: 800; font-size: 11pt; color: #b91c1c;">🔴 CHARITY PAID</div>';
    html += '<table style="margin-bottom: 16px;">' +
      '<thead>' +
      '<tr><th style="width: 14%;">Date</th><th style="width: 12%; text-align: center;">Vr No</th><th style="width: 30%;">Beneficiary Name</th><th style="width: 29%;">Address / Purpose</th><th style="width: 15%; text-align: right; color: #b91c1c;">Amount</th></tr></thead>' +
      '<tbody>';

    if (pmtList.length === 0) {
      html += '<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 10px;">No Charity Paid entries recorded</td></tr>';
    } else {
      sortTransactionsAscending(pmtList).forEach(function (tx) {
        var cleanVr = formatVrNoClean(tx.vrNo);
        var amt = Number(tx.payment || tx.amount || 0);
        grandTotalPmt += amt;

        var addr = (tx.address || activeMembersMap[(tx.accountName || '').toLowerCase()] || '').trim();
        var desc = (tx.description || '').trim();
        var full = addr && desc && addr.toLowerCase() !== desc.toLowerCase() ? addr + ', ' + desc : (addr || desc || '-');

        html += '<tr>' +
          '<td>' + formatDateHtml(tx.date) + '</td>' +
          '<td style="text-align:center">' + cleanVr + '</td>' +
          '<td>' + (tx.accountName || '-') + '</td>' +
          '<td>' + full + '</td>' +
          '<td class="print-pmt-amt" style="text-align:right; font-weight: 700; color: #b91c1c;">' + formatCurrency(amt) + '</td>' +
          '</tr>';
      });
    }

    html += '</tbody>' +
      '<tfoot><tr class="print-totals-row"><td colspan="4" style="text-align:right">TOTAL CHARITY PAID</td><td style="text-align:right; font-weight: 800; color: #b91c1c;">' + formatCurrency(grandTotalPmt) + '</td></tr></tfoot>' +
      '</table>';
  }

  // SUMMARY BOX
  html += '<div style="display:flex;justify-content:space-between;margin-top:14px;padding:10px 14px;font-weight:800;font-size:10pt;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;">' +
    '<span style="color:#059669;">Total Received: ' + formatCurrency(grandTotalRcpt) + '</span>' +
    '<span style="color:#dc2626;">Total Paid: ' + formatCurrency(grandTotalPmt) + '</span>' +
    '<span style="color:#0f172a;">Net Balance: ' + formatCurrency(grandTotalRcpt - grandTotalPmt) + '</span>' +
    '</div>' +
    '</td></tr></tbody>' +
    '<tfoot><tr><td style="border: none !important; padding: 0;">' +
    getPrintSignaturesHTML('Computer Generated Charity Statement') +
    '</td></tr></tfoot></table>';

  return html;
}

function printCharity() {
  const printArea = document.getElementById('printArea');
  if (!printArea) return;
  printArea.innerHTML = getCharityHTML();
  document.body.classList.add('print-charity-active');

  function cleanup() {
    document.body.classList.remove('print-charity-active');
    printArea.innerHTML = '';
  }

  window.addEventListener('afterprint', cleanup, { once: true });

  setTimeout(function () {
    try {
      window.print();
    } catch (e) {
      console.error("Print error:", e);
    }
  }, 300);
}

function getOtherIncomeHTML() {
  const searchVal = (document.getElementById('otherIncomeSearchInput') ? document.getElementById('otherIncomeSearchInput').value : '').toLowerCase().trim();

  const list = currentGeneralTxList.filter(tx => {
    if (tx.type !== 'Other Income') return false;
    const sub = (tx.subtype || tx.description || '').toLowerCase();
    const mode = selectedOtherIncomeMode.toLowerCase();
    const matchesMode = mode === 'all' ? true : sub.includes(mode);
    if (!matchesMode) return false;
    if (searchVal) {
      const accName = (tx.accountName || '').toLowerCase();
      const desc = (tx.description || '').toLowerCase();
      const vrNo = String(tx.vrNo || '').toLowerCase();
      if (!accName.includes(searchVal) && !desc.includes(searchVal) && !vrNo.includes(searchVal)) return false;
    }
    return true;
  });

  var grouped = {};
  list.forEach(function (tx) {
    var sub = (tx.subtype || '').trim() || 'General Other Income';
    if (!grouped[sub]) grouped[sub] = [];
    grouped[sub].push(tx);
  });

  var html = '<table style="width: 100%; border: none !important; margin: 0; padding: 0;">' +
    '<thead><tr><td style="border: none !important; padding: 0;">' +
    getPrintHeaderHTML('OTHER INCOME STATEMENT', '', 'Category: ' + selectedOtherIncomeMode + (searchVal ? ' | Search: ' + searchVal : '')) +
    '</td></tr></thead>' +
    '<tbody><tr><td style="border: none !important; padding: 0;">';

  var grandTotal = 0;

  function getOtherIncomeSortWeight(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('donation')) return 1;
    if (n.includes('first fruit')) return 2;
    if (n.includes('sodhari')) return 3;
    if (n.includes('anniversary')) return 4;
    return 99;
  }

  var sortedKeys = Object.keys(grouped).sort(function (a, b) {
    const weightA = getOtherIncomeSortWeight(a);
    const weightB = getOtherIncomeSortWeight(b);
    if (weightA !== weightB) return weightA - weightB;
    return a.localeCompare(b);
  });

  sortedKeys.forEach(function (groupName) {
    var items = grouped[groupName];
    var subTotal = items.reduce(function (sum, tx) { return sum + Number(tx.receipt || tx.payment || 0); }, 0);
    html += '<div class="print-section-head" style="background: #1e293b; color: #ffffff; padding: 6px 10px; font-weight: 800; font-size: 9.5pt; margin-top: 14px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">' +
      '<span>📂 ' + groupName + ' (' + items.length + ' Entries)</span>' +
      '<span>Total: ' + formatCurrency(subTotal) + '</span>' +
      '</div>' +
      '<table style="margin-top: 4px; margin-bottom: 12px;">' +
      '<thead>' +
      '<tr><th>Date</th><th>Vr No</th><th>Name</th><th>Description</th><th style="text-align:right">Amount (₹)</th></tr></thead>' +
      '<tbody>';
    sortTransactionsAscending(items).forEach(function (tx) {
      var cleanDate = formatDateClean(tx.date);
      var cleanVr = formatVrNoClean(tx.vrNo);
      var amt = tx.receipt || tx.payment || 0;
      html += '<tr>' +
        '<td>' + formatDateHtml(tx.date) + '</td>' +
        '<td style="text-align:center">' + cleanVr + '</td>' +
        '<td>' + (tx.accountName || '-') + '</td>' +
        '<td>' + (tx.description || '-') + '</td>' +
        '<td class="print-rcpt-amt" style="text-align:right">' + formatCurrency(amt) + '</td>' +
        '</tr>';
    });
    html += '</tbody>' +
      '<tfoot><tr class="print-totals-row"><td colspan="4" style="text-align:right">Subtotal (' + groupName + ')</td><td style="text-align:right">' + formatCurrency(subTotal) + '</td></tr></tfoot>' +
      '</table>';
    grandTotal += subTotal;
  });

  html += '<div style="margin-top:14px;padding:10px;font-weight:800;text-align:right;font-size:11pt;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;">Grand Total Other Income: ' + formatCurrency(grandTotal) + '</div>' +
    '</td></tr></tbody>' +
    '<tfoot><tr><td style="border: none !important; padding: 0;">' +
    getPrintSignaturesHTML('Computer Generated Other Income Statement') +
    '</td></tr></tfoot></table>';

  return html;
}

function printOtherIncome() {
  const printArea = document.getElementById('printArea');
  if (!printArea) return;
  printArea.innerHTML = getOtherIncomeHTML();
  document.body.classList.add('print-otherincome-active');

  function cleanup() {
    document.body.classList.remove('print-otherincome-active');
    printArea.innerHTML = '';
  }

  window.addEventListener('afterprint', cleanup, { once: true });

  setTimeout(function () {
    try {
      window.print();
    } catch (e) {
      console.error("Print error:", e);
    }
  }, 300);
}

function getIncomeExpenditureHTML() {
  const targetBankList = filterListByFY(allTimeBankBookList) || [];
  const targetGeneralList = filterListByFY(allTimeGeneralTxList) || [];
  const targetSuspenseList = filterListByFY(allTimeSuspenseTxList) || [];
  const dyn = buildDynamicStatementItems(targetGeneralList, targetBankList, targetSuspenseList);

  const incItems = dyn.incItems;
  const expItems = dyn.expItems;
  const incTotal = dyn.calcTotalIncome;
  const expTotal = dyn.calcTotalExpenditure;

  // 1. Read directly from the on-screen Dashboard DOM values to ensure 100% exact match
  const elCashInHand = document.getElementById('dashCashInHand');
  const elSbiCurrent = document.getElementById('dashSbiCurrent');
  const elSbiFd = document.getElementById('dashSbiFd');
  const elBankReserves = document.getElementById('dashBankReserves');

  const cashDom = elCashInHand ? elCashInHand.innerText.trim() : '';
  const sbiDom = elSbiCurrent ? elSbiCurrent.innerText.trim() : '';
  const fdDom = elSbiFd ? elSbiFd.innerText.trim() : '';
  const totalDom = elBankReserves ? elBankReserves.innerText.trim() : '';

  // 2. Fallback direct calculation if DOM is not present
  let cf = calculateCarryForward();
  let cashHand = cf.cash;
  targetGeneralList.forEach(tx => {
    const typeStr = (tx.type || '').toLowerCase();
    const descStr = (tx.description || '').toLowerCase();
    const nameStr = (tx.name || tx.accountName || '').toLowerCase();
    const isOpening = typeStr.includes('opening balance') || descStr.includes('opening balance') || nameStr.includes('opening balance');
    if (isOpening) return;
    cashHand += Number(tx.receipt || 0) - Number(tx.payment || tx.payments || 0);
  });

  let sbiCurrentBal = cf.sbi;
  let sbiFdBal = cf.fd;
  targetBankList.forEach(tx => {
    const type = (tx.type || '').toLowerCase();
    const desc = (tx.description || tx.particulars || '').toLowerCase();
    const name = (tx.name || tx.accountName || '').toLowerCase();
    const isOpening = type === 'opening balance' || desc.includes('opening balance') || name.includes('opening balance');
    if (isOpening) return;

    const isCredit = (typeof isTxReceipt === 'function')
      ? (isTxReceipt(tx) === 1)
      : ((Number(tx.credit || tx.receipt || 0) > 0) || (tx.mode && (tx.mode.includes("Receipt") || tx.mode.includes("Credit"))));
    const amt = Number(tx.amount || tx.credit || tx.receipt || tx.debit || tx.payment || tx.payments || 0);
    const accLower = (tx.account || tx.accountName || tx.account_name || tx.bankAccount || tx.bank_account || '').toLowerCase();
    let isFD = false;
    if (accLower.includes('fixed deposit') || accLower.includes('fd')) {
      isFD = true;
    } else if (accLower.includes('state bank') || accLower.includes('current') || accLower.includes('sbi')) {
      isFD = false;
    } else {
      const bSubLower = (tx.bankSubtype || tx.bank_subtype || '').toLowerCase();
      if (bSubLower.includes('fixed deposit') || bSubLower.includes('fd')) {
        isFD = true;
      }
    }
    if (isFD) {
      if (isCredit) sbiFdBal += amt;
      else sbiFdBal -= amt;
    } else {
      if (isCredit) sbiCurrentBal += amt;
      else sbiCurrentBal -= amt;
    }
  });

  const totalClosingBalance = (cashHand + sbiCurrentBal + sbiFdBal);

  const formatCardVal = (domVal, calcVal) => {
    if (domVal && domVal !== '' && domVal !== '--') {
      return domVal.startsWith('₹') ? domVal : '₹ ' + domVal;
    }
    return formatCurrency(calcVal);
  };

  const balance = formatCardVal(cashDom, cashHand);
  const sbiCurrent = formatCardVal(sbiDom, sbiCurrentBal);
  const sbiFd = formatCardVal(fdDom, sbiFdBal);
  const totalBankReserves = formatCardVal(totalDom, totalClosingBalance);

  let fyText = currentGlobalFY === 'All' ? 'All Time' : 'Financial Year ' + currentGlobalFY;

  let kpiHtml = '<div class="print-kpi-grid">' +
    '<div class="print-kpi-card"><div class="print-kpi-label">Cash Balance</div><div class="print-kpi-value" style="color:#2563eb">' + balance + '</div></div>' +
    '<div class="print-kpi-card"><div class="print-kpi-label">SBI Current Balance</div><div class="print-kpi-value" style="color:#059669">' + sbiCurrent + '</div></div>' +
    '<div class="print-kpi-card"><div class="print-kpi-label">FD Balance</div><div class="print-kpi-value" style="color:#8b5cf6">' + sbiFd + '</div></div>' +
    '<div class="print-kpi-card"><div class="print-kpi-label">Total Amount</div><div class="print-kpi-value" style="color:#d97706">' + totalBankReserves + '</div></div>' +
    '</div>';

  let incRows = '';
  incItems.forEach(function (item) {
    incRows += '<tr><td>' + item.name + '</td><td class="print-rcpt-amt" style="text-align:right;font-weight:700">' + formatCurrency(item.amount) + '</td></tr>';
  });

  let expRows = '';
  expItems.forEach(function (item) {
    expRows += '<tr><td>' + item.name + '</td><td class="print-pmt-amt" style="text-align:right;font-weight:700">' + formatCurrency(item.amount) + '</td></tr>';
  });

  let html = '<table style="width: 100%; border: none !important; margin: 0; padding: 0;">' +
    '<thead><tr><td style="border: none !important; padding: 0;">' + getPrintHeaderHTML('DASHBOARD FINANCIAL SUMMARY', fyText) + '</td></tr></thead>' +
    '<tbody><tr><td style="border: none !important; padding: 0;">' +
    kpiHtml +
    '<div class="print-dual-grid">' +
    '<div class="print-dual-col income">' +
    '<h3>Income Account</h3>' +
    '<table>' +
    '<thead><tr><th>Particulars</th><th style="text-align:right">Amount (₹)</th></tr></thead>' +
    '<tbody>' + incRows + '</tbody>' +
    '<tfoot><tr class="print-totals-row"><td style="text-align:right">Total Income (incl. OB)</td><td style="text-align:right">' + formatCurrency(incTotal) + '</td></tr></tfoot>' +
    '</table>' +
    '</div>' +
    '<div class="print-dual-col expense">' +
    '<h3>Expenditure Account</h3>' +
    '<table>' +
    '<thead><tr><th>Particulars</th><th style="text-align:right">Amount (₹)</th></tr></thead>' +
    '<tbody>' + expRows + '</tbody>' +
    '<tfoot><tr class="print-totals-row"><td style="text-align:right">Total Expenditure</td><td style="text-align:right">' + formatCurrency(expTotal) + '</td></tr></tfoot>' +
    '</table>' +
    '</div>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding:12px 18px;background:#f0fdf4;border:1.5px solid #86efac;border-radius:8px;font-weight:800;font-size:0.95rem;color:#166534;">' +
    '<span>Total Closing Balance:</span>' +
    '<span style="font-size:1.1rem;color:#047857;">' + totalBankReserves + '</span>' +
    '</div>' +
    '</td></tr></tbody>' +
    '<tfoot><tr><td style="border: none !important; padding: 0;">' + getPrintSignaturesHTML('Computer Generated Dashboard Summary') + '</td></tr></tfoot>' +
    '</table>';

  return html;
}

function printIncomeExpenditure() {
  const printArea = document.getElementById('printArea');
  if (!printArea) return;
  printArea.innerHTML = getIncomeExpenditureHTML();
  document.body.classList.add('print-incexp-active');

  function cleanup() {
    document.body.classList.remove('print-incexp-active');
    printArea.innerHTML = '';
  }

  window.addEventListener('afterprint', cleanup, { once: true });

  setTimeout(function () {
    try {
      window.print();
    } catch (e) {
      console.error("Print error:", e);
    }
  }, 300);
}

function getMembersSummaryHTML() {
  const activeMembers = membersDataStore.filter(m => m.status === 'Active');
  let html = '<div class="print-header">' +
    '<h1>MEMBERS CONTRIBUTION SUMMARY</h1>' +
    '<h2>IPC HOREB CHURCH, THADIYOOR</h2>' +
    '<p>Printed on ' + new Date().toLocaleDateString('en-IN') + '</p>' +
    '</div>' +
    '<table>' +
    '<thead><tr><th>Name</th><th>Address</th><th style="text-align:right">Total Contribution (₹)</th></tr></thead>' +
    '<tbody>';

  let grandTotal = 0;
  activeMembers.forEach(m => {
    const mTxList = currentGeneralTxList.filter(tx => isTxMatchingMember(tx, m.name, m.address));
    let mTotal = 0;
    mTxList.forEach(tx => { mTotal += (tx.receipt || 0); });

    if (mTotal > 0) {
      html += '<tr>' +
        '<td>' + (m.name || '-') + '</td>' +
        '<td>' + (m.address || '-') + '</td>' +
        '<td class="print-rcpt-amt" style="text-align:right">' + formatCurrency(mTotal) + '</td>' +
        '</tr>';
      grandTotal += mTotal;
    }
  });

  html += '</tbody>' +
    '<tfoot><tr class="print-totals-row"><td colspan="2" style="text-align:right">Grand Total Contribution</td><td style="text-align:right">' + formatCurrency(grandTotal) + '</td></tr></tfoot>' +
    '</table>' +
    getPrintSignaturesHTML() +
    '<div class="print-footer">IPC HOREB CHURCH, THADIYOOR | Computer Generated Members Summary</div>';
  return html;
}

function printAllPDF() {
  const printArea = document.getElementById('printArea');
  if (!printArea) return;

  if (typeof renderSubscriptionsReport === 'function') {
    renderSubscriptionsReport();
  }

  let fullHtml = "";
  try { fullHtml += '<div class="print-page print-page-portrait">' + getIncomeExpenditureHTML() + '</div>'; } catch (e) { console.error("Error in getIncomeExpenditureHTML:", e); }
  try { fullHtml += '<div class="print-page print-page-landscape">' + getCashBookHTML() + '</div>'; } catch (e) { console.error("Error in getCashBookHTML:", e); }
  try { fullHtml += '<div class="print-page print-page-landscape">' + getBankBookHTML() + '</div>'; } catch (e) { console.error("Error in getBankBookHTML:", e); }
  try { fullHtml += '<div class="print-page print-page-landscape">' + getSubscriptionsReportHTML() + '</div>'; } catch (e) { console.error("Error in getSubscriptionsReportHTML:", e); }
  try { fullHtml += '<div class="print-page print-page-portrait">' + getLedgerAllHTML() + '</div>'; } catch (e) { console.error("Error in getLedgerAllHTML:", e); }
  try { fullHtml += '<div class="print-page print-page-portrait">' + getOfferingHTML() + '</div>'; } catch (e) { console.error("Error in getOfferingHTML:", e); }
  try { fullHtml += '<div class="print-page print-page-portrait">' + getCharityHTML() + '</div>'; } catch (e) { console.error("Error in getCharityHTML:", e); }
  try { fullHtml += '<div class="print-page print-page-portrait">' + getOtherIncomeHTML() + '</div>'; } catch (e) { console.error("Error in getOtherIncomeHTML:", e); }

  // Include all dynamically created custom tabs (such as Monthly Meeting and user-defined types)
  const builtInTypes = ['Subscription', 'Charity', 'Ledger', 'Offering', 'Other Income'];
  Object.keys(globalFieldRules).forEach(type => {
    if (!builtInTypes.includes(type)) {
      try { fullHtml += '<div class="print-page print-page-portrait">' + getDynamicTabHTML(type) + '</div>'; } catch (e) { console.error("Error in getDynamicTabHTML:", e); }
    }
  });

  let existingStyle = document.getElementById('allpdf-print-style');
  if (existingStyle) existingStyle.remove();

  const style = document.createElement('style');
  style.id = 'allpdf-print-style';
  style.innerHTML = `
        @page { size: 210mm 297mm; margin: 8mm; }
        @page landscape-section { size: 297mm 210mm; margin: 8mm; }
        @page portrait-section { size: 210mm 297mm; margin: 8mm; }
        .print-page-landscape { page: landscape-section !important; page-break-after: always !important; break-after: page !important; }
        .print-page-portrait { page: portrait-section !important; page-break-after: always !important; break-after: page !important; }
      `;
  document.head.appendChild(style);

  printArea.innerHTML = fullHtml;
  document.body.classList.add('print-all-active');
  function cleanup() {
    document.body.classList.remove('print-all-active');
    printArea.innerHTML = '';
    const addedStyle = document.getElementById('allpdf-print-style');
    if (addedStyle) addedStyle.remove();
    window.removeEventListener('focus', cleanup);
  }

  window.addEventListener('afterprint', cleanup, { once: true });
  setTimeout(function () {
    window.addEventListener('focus', cleanup, { once: true });
  }, 1000);

  setTimeout(function () {
    try {
      window.print();
    } catch (err) {
      console.error("Print window error:", err);
    } finally {
      cleanup();
    }
  }, 150);
}

function getDynamicTabHTML(typeName) {
  const rules = (globalFieldRules && globalFieldRules[typeName]) || { mode: 'Both' };
  const isBoth = (rules.mode === 'Both' || !rules.mode);

  const allCandidates = [
    ...(currentGeneralTxList || []),
    ...((typeof allTimeBankBookList !== 'undefined') ? filterListByFY(allTimeBankBookList) : [])
  ];

  const seenIds = new Set();
  const dedupedCandidates = [];
  allCandidates.forEach(tx => {
    const key = String(tx.vrNo || tx.id || Math.random());
    if (!seenIds.has(key)) {
      seenIds.add(key);
      dedupedCandidates.push(tx);
    }
  });

  const list = dedupedCandidates.filter(tx => isTxForDynamicType(tx, typeName));
  const sortedList = sortTransactionsAscending(list);

  if (isBoth) {
    const rcptList = sortedList.filter(tx => Number(tx.receipt || 0) > 0 || tx.mode === 'Receipt');
    const pmtList = sortedList.filter(tx => Number(tx.payment || tx.payments || 0) > 0 || tx.mode === 'Payment');

    const totalRcpt = rcptList.reduce((s, tx) => s + (parseFloat(tx.receipt) || 0), 0);
    const totalPmt = pmtList.reduce((s, tx) => s + (parseFloat(tx.payments || tx.payment) || 0), 0);
    const netBal = totalRcpt - totalPmt;

    const headers = [
      { label: 'Date', w: '14%', align: 'left' },
      { label: 'Vr No', w: '12%', align: 'center' },
      { label: 'Name / Account', w: '26%', align: 'left' },
      { label: 'Description / Subtype', w: '30%', align: 'left' },
      { label: 'Amount (₹)', w: '18%', align: 'right' }
    ];

    const mapRows = (items, isRcpt) => items.map(tx => {
      const sub = (tx.subtype || '').trim();
      const desc = (tx.description || tx.particulars || '').trim();
      const subDesc = (!sub) ? (desc || '-') : (sub.toLowerCase() === desc.toLowerCase() ? sub : `${sub} – ${desc}`);
      const amt = isRcpt ? (parseFloat(tx.receipt) || 0) : (parseFloat(tx.payments || tx.payment) || 0);
      return [
        formatDateClean(tx.date),
        formatVrNoClean(tx.vrNo),
        tx.accountName || tx.particulars || '-',
        subDesc,
        `<span class="${isRcpt ? 'print-rcpt-amt' : 'print-pmt-amt'}">${formatCurrency(amt)}</span>`
      ];
    });

    const rcptRows = mapRows(rcptList, true);
    const pmtRows = mapRows(pmtList, false);

    const titleHtml = getPrintHeaderHTML('📁 ' + typeName.toUpperCase() + ' STATEMENT', currentGlobalFY || '', '');
    const footHtml = getPrintSignaturesHTML('Computer Generated ' + typeName + ' Statement');

    const renderSectionTable = (title, count, rows, subtotal, color) => `
      <div style="background: #1e293b; color: #ffffff; padding: 6px 12px; font-weight: 800; font-size: 10pt; margin-top: 14px; margin-bottom: 4px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
        <span>${title} (${count} ${count === 1 ? 'Entry' : 'Entries'})</span>
        <span style="color: ${color}; font-weight: 800;">Subtotal: ₹ ${formatCurrency(subtotal)}</span>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
        <thead>
          <tr>${headers.map(h => `<th style="width:${h.w};text-align:${h.align};">${h.label}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.length > 0 ? rows.map(r => `<tr>${r.map((c, i) => `<td style="text-align:${headers[i].align}">${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:12px;">No entries</td></tr>`}
        </tbody>
        <tfoot>
          <tr class="print-totals-row">
            <td colspan="4" style="text-align:right;">Subtotal:</td>
            <td style="text-align:right;">₹ ${formatCurrency(subtotal)}</td>
          </tr>
        </tfoot>
      </table>
    `;

    return `
      <table style="width: 100%; border: none !important; margin: 0; padding: 0;">
        <thead><tr><td style="border: none !important; padding: 0;">${titleHtml}</td></tr></thead>
        <tbody>
          <tr>
            <td style="border: none !important; padding: 0;">
              ${renderSectionTable('📥 RECEIVED / COLLECTIONS', rcptList.length, rcptRows, totalRcpt, '#34d399')}
              ${renderSectionTable('📤 PAID / EXPENSES', pmtList.length, pmtRows, totalPmt, '#f87171')}
              <div style="margin-top: 16px; padding: 12px; background: #0f172a; color: #ffffff; border-radius: 6px; display: flex; justify-content: space-between; font-weight: 800; font-size: 11pt;">
                <span>NET BALANCE (Collections - Expenses):</span>
                <span style="color: ${netBal >= 0 ? '#34d399' : '#f87171'};">₹ ${formatCurrency(netBal)}</span>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot><tr><td style="border: none !important; padding: 0;">${footHtml}</td></tr></tfoot>
      </table>
    `;
  }

  // Single mode
  let totalRcpt = 0, totalPmt = 0;
  const rows = sortedList.map(tx => {
    const rcpt = parseFloat(tx.receipt) || 0;
    const pmt = parseFloat(tx.payments) || parseFloat(tx.payment) || 0;
    totalRcpt += rcpt;
    totalPmt += pmt;
    const amt = rcpt > 0 ? rcpt : pmt;

    const sub = (tx.subtype || '').trim();
    const desc = (tx.description || tx.particulars || '').trim();
    const subDesc = (!sub) ? (desc || '-') : (sub.toLowerCase() === desc.toLowerCase() ? sub : `${sub} – ${desc}`);

    return [
      formatDateClean(tx.date),
      formatVrNoClean(tx.vrNo),
      tx.accountName || tx.particulars || '-',
      subDesc,
      '<span class="' + (rules.mode === 'Payment' ? 'print-pmt-amt' : 'print-rcpt-amt') + '">' + formatCurrency(amt) + '</span>'
    ];
  });

  const headers = [
    { label: 'Date', w: '14%', align: 'left' },
    { label: 'Vr No', w: '12%', align: 'center' },
    { label: 'Name / Account', w: '26%', align: 'left' },
    { label: 'Description / Subtype', w: '30%', align: 'left' },
    { label: 'Amount (₹)', w: '18%', align: 'right' }
  ];
  const totalsRow = ['', '', '', 'TOTAL',
    formatCurrency(rules.mode === 'Payment' ? totalPmt : totalRcpt)
  ];

  const titleHtml = getPrintHeaderHTML('📁 ' + typeName + ' STATEMENT', currentGlobalFY || '', '');
  const footHtml = getPrintSignaturesHTML('Computer Generated ' + typeName + ' Statement');

  return buildPrintTable(headers, rows, totalsRow, titleHtml, footHtml);
}

function printDynamicTab(typeName) {
  showPrintArea(
    '<div class="print-page">' + getDynamicTabHTML(typeName) + '</div>',
    'print-all-active',
    typeName + ' – IPC Horeb Church'
  );
}

// buildPrintHeader removed in favor of getPrintHeaderHTML

function buildPrintTable(headers, rows, totalsRow, titleHtml, footHtml) {
  var ths = headers.map(function (h) {
    return '<th style="width:' + (h.w || 'auto') + ';text-align:' + (h.align || 'left') + '">' + h.label + '</th>';
  }).join('');

  var trs = rows.map(function (r) {
    return '<tr>' + r.map(function (c, i) {
      return '<td style="text-align:' + (headers[i] && headers[i].align || 'left') + '">' + c + '</td>';
    }).join('') + '</tr>';
  }).join('');

  var foot = totalsRow ? '<tr class="print-totals-row">' + totalsRow.map(function (c, i) {
    return '<td style="text-align:' + (headers[i] && headers[i].align || 'left') + '">' + c + '</td>';
  }).join('') + '</tr>' : '';

  return '<table style="width: 100%; border: none !important; margin: 0; padding: 0;">' +
    '<thead><tr><td style="border: none !important; padding: 0;">' + (titleHtml || '') + '</td></tr></thead>' +
    '<tbody><tr><td style="border: none !important; padding: 0;">' +
    '<table><thead><tr>' + ths + '</tr></thead><tbody>' + trs + '</tbody>' + (foot ? '<tfoot>' + foot + '</tfoot>' : '') + '</table>' +
    '</td></tr></tbody>' +
    '<tfoot><tr><td style="border: none !important; padding: 0;">' + (footHtml || '') + '</td></tr></tfoot>' +
    '</table>';
}

function showPrintArea(html, bodyClass, title) {
  var area = document.getElementById('printArea');
  if (!area) return;
  area.innerHTML = html;
  document.body.classList.add(bodyClass || 'print-active');
  var old = document.title;
  if (title) document.title = title;

  function cleanup() {
    document.title = old;
    document.body.classList.remove(bodyClass || 'print-active');
    area.innerHTML = '';
  }

  window.addEventListener('afterprint', cleanup, { once: true });

  setTimeout(function () {
    try {
      window.print();
    } catch (err) {
      console.error("Print invocation error:", err);
    }
  }, 300);
}

function printDashboard() {
  printAllPDF();
}

function renderDynamicTabs() {
  const sidebarMarker = document.getElementById('dynamicSidebarTabsMarker');
  const navMenu = sidebarMarker ? sidebarMarker.parentElement : null;
  const dynamicPageContainer = document.getElementById('dynamicPageTabs');
  if (!navMenu || !dynamicPageContainer) return;

  navMenu.querySelectorAll('.nav-item.dynamic-nav-item').forEach(el => el.remove());

  const builtInTypes = ['Subscription', 'Charity', 'Ledger', 'Offering', 'Other Income'];
  const allTypes = Object.keys(globalFieldRules || {});

  dynamicPageContainer.innerHTML = '';

  const activeTabEl = document.querySelector('.page-tab.active');
  const activeTabId = activeTabEl ? activeTabEl.id : null;
  let activeTabStillExists = false;

  allTypes.forEach(type => {
    if (builtInTypes.includes(type)) return; // Skip built-ins

    const rules = globalFieldRules[type] || { mode: 'Both' };
    if (rules.hasDynamicTab === false) return; // Dedicated tab disabled in settings
    if (!isTabApplicableToCurrentFY(rules)) {
      return; // Skip tabs not applicable to currently active FY
    }

    const typeIdStr = type.replace(/[^a-zA-Z0-9]/g, '');
    const tabId = 'dynamicTab_' + typeIdStr;
    if (activeTabId === tabId) {
      activeTabStillExists = true;
    }

    const isBoth = (rules.mode === 'Both' || !rules.mode);
    const isPmt = (rules.mode === 'Payment');

    // Sidebar item
    const sidebarItem = document.createElement('div');
    sidebarItem.className = 'nav-item dynamic-nav-item';
    sidebarItem.id = 'nav_' + tabId;
    sidebarItem.setAttribute('onclick', `switchTab('${tabId}')`);
    sidebarItem.innerHTML = `<span class="nav-icon">📁</span><span>${type}</span>`;
    navMenu.insertBefore(sidebarItem, sidebarMarker);

    // Subtype options for filter (if enabled)
    let filterHtml = '';
    if (rules.showSubtype && subTypesConfig[type] && subTypesConfig[type].length > 0) {
      const subtypeOpts = subTypesConfig[type].map(st => {
        const name = typeof st === 'string' ? st : (st.name || '');
        return `<option value="${name.replace(/"/g, '&quot;')}">${name}</option>`;
      }).join('');
      filterHtml = `
            <select id="filter_${typeIdStr}" onchange="renderDynamicTabTable('${type.replace(/'/g, "\\'")}')" style="padding: 7px 10px; font-size: 0.82rem; border: 1px solid var(--border-slate-300); border-radius: 8px; outline: none; font-weight: 600; background: var(--bg-white); color: var(--text-slate-900);">
              <option value="All">-- All Subtypes --</option>
              ${subtypeOpts}
            </select>
          `;
    }

    // KPI Cards HTML
    let kpiHtml = '';
    if (isBoth) {
      kpiHtml = `
        <div class="cb-kpi-grid" style="grid-template-columns: repeat(3, 1fr) !important; margin-bottom: 12px;">
          <div class="cb-kpi-card receipts-card">
            <div class="cb-kpi-title">TOTAL COLLECTIONS (IN)</div>
            <div class="cb-kpi-value-row">
              <span id="rcpt_${typeIdStr}" class="cb-kpi-value receipt-text">₹ 0.00</span>
              <span style="font-size: 0.75rem; color: #047857; font-weight: 600;">Receipts</span>
            </div>
          </div>
          <div class="cb-kpi-card payments-card">
            <div class="cb-kpi-title">TOTAL EXPENSES (OUT)</div>
            <div class="cb-kpi-value-row">
              <span id="pmt_${typeIdStr}" class="cb-kpi-value payment-text">₹ 0.00</span>
              <span style="font-size: 0.75rem; color: #b91c1c; font-weight: 600;">Expenses</span>
            </div>
          </div>
          <div class="cb-kpi-card balance-card">
            <div class="cb-kpi-title">NET BALANCE</div>
            <div class="cb-kpi-value-row" style="justify-content: space-between; align-items: center;">
              <span id="total_${typeIdStr}" class="cb-kpi-value balance-text">₹ 0.00</span>
              <span style="background: #dbeafe; color: #1e40af; font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 12px; text-transform: uppercase;">Active</span>
            </div>
          </div>
        </div>
      `;
    } else {
      kpiHtml = `
        <div class="cb-kpi-grid" style="margin-bottom: 12px;">
          <div class="cb-kpi-card ${isPmt ? 'payments-card' : 'receipts-card'}">
            <div class="cb-kpi-title">${isPmt ? 'TOTAL EXPENSES' : 'TOTAL AMOUNT'}</div>
            <div class="cb-kpi-value-row" style="justify-content: space-between; align-items: center;">
              <span id="total_${typeIdStr}" class="cb-kpi-value ${isPmt ? 'payment-text' : 'receipt-text'}">₹ 0.00</span>
              <span style="background: ${isPmt ? '#fee2e2; color: #991b1b;' : '#dcfce7; color: #166534;'} font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 12px; text-transform: uppercase;">Active</span>
            </div>
          </div>
        </div>
      `;
    }

    const fyDisplayTitle = (currentGlobalFY && currentGlobalFY !== 'All') ? 'Financial Year ' + currentGlobalFY : 'All Time Records';

    // Dynamic Page Tab
    dynamicPageContainer.innerHTML += `
          <div id="${tabId}" class="page-tab flex-tab" data-type="${type.replace(/'/g, "\\'")}">
            <div class="cashbook-container" style="width: 100%;">
              <div class="cb-sticky-header-group">
                <div class="cb-top-header-row" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 8px;">
                  <div>
                    <div class="cb-header-subtitle">PARISH TRANSACTION STATEMENT • <span class="active-fy-label-display">${fyDisplayTitle}</span></div>
                    <h1 class="cb-header-title" style="margin: 0; line-height: 1.2;">📁 ${type.toUpperCase()}</h1>
                  </div>
                  <div class="cb-top-actions-wrapper" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    ${filterHtml}
                    <div class="input-with-icon" style="position: relative;">
                      <span class="icon" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 0.85rem;">🔍</span>
                      <input type="text" id="search_${typeIdStr}" placeholder="Search name, desc, vr no..." oninput="renderDynamicTabTable('${type.replace(/'/g, "\\'")}')" style="padding: 7px 12px 7px 30px !important; border-radius: 8px; border: 1px solid var(--border-slate-300); font-size: 0.82rem; width: 170px; outline: none; background: var(--bg-white);">
                    </div>
                    <button class="btn-action cb-top-btn" onclick="processAndRenderAll()" style="background: var(--bg-white); color: var(--text-slate-700); border: 1px solid var(--border-slate-300); border-radius: 8px; padding: 7px 10px; font-weight: 600; font-size: 0.82rem;" title="Refresh Log">🔄</button>
                    <button class="btn-print-pdf cb-top-btn" onclick="printDynamicTab('${type.replace(/'/g, "\\'")}')" title="Print ${type} as PDF"
                      style="background: #7c3aed; color: #ffffff; border: none; border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 0.82rem; white-space: nowrap;">
                      🖨️ Print PDF
                    </button>
                    <button class="btn-action editor-only cb-top-btn" onclick="switchTab('entryTab')"
                      style="background: #0f172a; color: var(--text-white); border: none; border-radius: 8px; padding: 7px 14px; font-weight: 700; font-size: 0.82rem; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(15, 23, 42, 0.15); white-space: nowrap;">
                      ⊕ Add Entry
                    </button>
                  </div>
                </div>
                ${kpiHtml}
              </div>
              
              <div class="cb-table-card" style="flex: 1; min-height: 0; display: flex; flex-direction: column;">
                <div class="sheet-table-wrapper" style="flex: 1; min-height: 0; overflow-y: auto;">
                  <table class="cashbook-sheet-table">
                    <thead>
                      <tr style="background: var(--bg-slate-50); border-bottom: 1px solid var(--border-slate-200);">
                        <th style="width: 11%; padding: 10px 6px;">Date</th>
                        <th style="width: 8%; text-align: center; padding: 10px 2px;">Vr No</th>
                        <th style="width: 20%; padding: 10px 6px;">Name / Particulars</th>
                        <th style="width: 18%; padding: 10px 6px;">Subtype / Category</th>
                        <th style="width: 19%; padding: 10px 6px;">Description</th>
                        ${isBoth ? `
                          <th style="width: 12%; text-align: right; padding: 10px 4px; color: #047857;">Received</th>
                          <th style="width: 12%; text-align: right; padding: 10px 4px; color: #b91c1c;">Paid</th>
                        ` : `
                          <th style="width: 12%; text-align: right; padding: 10px 4px; color: ${isPmt ? '#b91c1c' : '#047857'};">Amount</th>
                        `}
                        <th style="width: 14%; text-align: center; padding: 10px 2px;" class="editor-only">Actions</th>
                      </tr>
                    </thead>
                    <tbody id="tbody_${typeIdStr}">
                      <tr>
                        <td colspan="${isBoth ? 8 : 7}" style="text-align: center; color: #94a3b8; padding: 24px;">⏳ Loading entries...</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        `;
  });

  // If currently active tab was a dynamic tab that disappeared in this FY, switch back to statementTab
  if (activeTabId && activeTabId.startsWith('dynamicTab_') && !activeTabStillExists) {
    if (typeof switchTab === 'function') {
      switchTab('statementTab');
    }
  }

  if (typeof applySidebarOrder === 'function') {
    applySidebarOrder();
  }
}

function renderDynamicRow(tx, isBoth, isTxRcpt) {
  const cd = formatDateHtml(tx.date);
  const cv = formatVrNoClean(tx.vrNo);
  const rcpt = parseFloat(tx.receipt) || 0;
  const pmt = parseFloat(tx.payments) || parseFloat(tx.payment) || 0;
  const amt = rcpt > 0 ? rcpt : pmt;

  const subText = (tx.subtype && tx.subtype !== '-' && tx.subtype !== 'General') ? tx.subtype : (tx.category || '-');
  const descText = tx.description || tx.particulars || '-';
  const nameText = tx.accountName || tx.particulars || '-';

  return `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="font-weight: 500; color: #334155; white-space: nowrap;">${cd}</td>
      <td style="font-weight: 700; color: #64748b; text-align: center;">${cv}</td>
      <td style="font-weight: 600; line-height: 1.3; color: #0f172a;">${nameText}</td>
      <td style="line-height: 1.3;">${subText}</td>
      <td style="line-height: 1.3;">${descText}</td>
      ${isBoth ? `
        <td class="num-col rcpt-val" style="font-weight: 700; color: #047857; text-align: right;">${rcpt > 0 ? formatCurrency(rcpt) : '-'}</td>
        <td class="num-col pmt-val" style="font-weight: 700; color: #b91c1c; text-align: right;">${pmt > 0 ? formatCurrency(pmt) : '-'}</td>
      ` : `
        <td class="num-col ${isTxRcpt ? 'rcpt-val' : 'pmt-val'}" style="font-weight: 700; color: ${isTxRcpt ? '#047857' : '#b91c1c'}; text-align: right;">${formatCurrency(amt)}</td>
      `}
      <td style="text-align: center; white-space: nowrap;" class="editor-only">
        <button class="btn-action btn-table-action" style="background: #0f172a; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="openTransactionDetailModal('${cv.replace(/'/g, "\\'")}')" title="View Details">👁️</button>
        <button class="btn-action btn-table-action" style="background: #2563eb; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px;" onclick="loadEntryForEdit('${cv.replace(/'/g, "\\'")}')" title="Edit Entry">✏️</button>
        <button class="btn-action btn-table-action" style="background:${isTxRcpt ? '#059669' : '#dc2626'};color:#fff;border:none;border-radius:6px;padding:4px 8px;" onclick="${isTxRcpt ? 'openReceiptModalByVrNo' : 'openPaymentVoucherModalByVrNo'}('${cv.replace(/'/g, "\\'")}')" title="${isTxRcpt ? 'Print Receipt' : 'Print Voucher'}">&#x1F9FE;</button>
      </td>
    </tr>
  `;
}

function renderDynamicTabTable(typeName) {
  if (!typeName) return;
  const typeIdStr = typeName.replace(/[^a-zA-Z0-9]/g, '');
  const tbody = document.getElementById('tbody_' + typeIdStr);
  if (!tbody) return;

  const rules = (globalFieldRules && globalFieldRules[typeName]) || { mode: 'Both' };
  const isBoth = (rules.mode === 'Both' || !rules.mode);
  const isPmt = (rules.mode === 'Payment');

  const searchVal = ((document.getElementById('search_' + typeIdStr) || { value: '' }).value || '').toLowerCase().trim();
  const filterSelect = document.getElementById('filter_' + typeIdStr);
  const selectedSubtype = filterSelect ? filterSelect.value : 'All';

  let totalRcpt = 0;
  let totalPmt = 0;

  const allCandidates = [
    ...(currentGeneralTxList || []),
    ...((typeof allTimeBankBookList !== 'undefined') ? filterListByFY(allTimeBankBookList) : [])
  ];

  const seenIds = new Set();
  const dedupedCandidates = [];
  allCandidates.forEach(tx => {
    const key = String(tx.vrNo || tx.id || Math.random());
    if (!seenIds.has(key)) {
      seenIds.add(key);
      dedupedCandidates.push(tx);
    }
  });

  const list = dedupedCandidates.filter(tx => {
    if (!isTxForDynamicType(tx, typeName)) return false;

    if (selectedSubtype !== 'All') {
      const txSub = (tx.subtype || tx.category || '').toLowerCase();
      if (txSub !== selectedSubtype.toLowerCase()) return false;
    }

    if (searchVal) {
      const a = (tx.accountName || '').toLowerCase();
      const d = (tx.description || tx.particulars || '').toLowerCase();
      const v = String(tx.vrNo || '').toLowerCase();
      const s = (tx.subtype || tx.category || '').toLowerCase();
      if (!a.includes(searchVal) && !d.includes(searchVal) && !v.includes(searchVal) && !s.includes(searchVal)) return false;
    }
    return true;
  });

  tbody.innerHTML = '';

  if (isBoth) {
    const rcptList = sortTxDescending(list.filter(tx => Number(tx.receipt || 0) > 0 || tx.mode === 'Receipt'));
    const pmtList = sortTxDescending(list.filter(tx => Number(tx.payment || tx.payments || 0) > 0 || tx.mode === 'Payment'));

    rcptList.forEach(tx => { totalRcpt += parseFloat(tx.receipt) || 0; });
    pmtList.forEach(tx => { totalPmt += parseFloat(tx.payments || tx.payment) || 0; });

    let tableHtml = '';

    // 1. RECEIVED / COLLECTIONS SECTION
    tableHtml += `
      <tr style="background: linear-gradient(90deg, #ecfdf5 0%, #f0fdf4 100%); border-top: 2px solid #059669; border-bottom: 2px solid #a7f3d0;">
        <td colspan="8" style="padding: 10px 14px; font-weight: 800; color: #065f46; font-size: 0.92rem; letter-spacing: 0.02em;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>📥 RECEIVED / COLLECTIONS (${rcptList.length} ${rcptList.length === 1 ? 'Entry' : 'Entries'})</span>
            <span style="font-size: 0.95rem; font-weight: 800; color: #047857;">Subtotal: ₹ ${formatCurrency(totalRcpt)}</span>
          </div>
        </td>
      </tr>
    `;

    if (rcptList.length > 0) {
      rcptList.forEach(tx => {
        tableHtml += renderDynamicRow(tx, true, true);
      });
      tableHtml += `
        <tr style="background: #f8fafc; font-weight: 700; border-bottom: 2px solid #cbd5e1;">
          <td colspan="5" style="text-align: right; padding: 8px 12px; color: #475569; text-transform: uppercase; font-size: 0.78rem;">Total Collections Received:</td>
          <td class="num-col" style="font-weight: 800; color: #047857; text-align: right; padding: 8px 6px;">₹ ${formatCurrency(totalRcpt)}</td>
          <td style="text-align: right; color: #cbd5e1;">-</td>
          <td class="editor-only"></td>
        </tr>
      `;
    } else {
      tableHtml += `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 14px; font-style: italic;">No received / collection entries found</td></tr>`;
    }

    // 2. PAID / EXPENSES SECTION
    tableHtml += `
      <tr style="background: linear-gradient(90deg, #fef2f2 0%, #fff1f2 100%); border-top: 2px solid #dc2626; border-bottom: 2px solid #fecaca;">
        <td colspan="8" style="padding: 10px 14px; font-weight: 800; color: #991b1b; font-size: 0.92rem; letter-spacing: 0.02em;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>📤 PAID / EXPENSES (${pmtList.length} ${pmtList.length === 1 ? 'Entry' : 'Entries'})</span>
            <span style="font-size: 0.95rem; font-weight: 800; color: #b91c1c;">Subtotal: ₹ ${formatCurrency(totalPmt)}</span>
          </div>
        </td>
      </tr>
    `;

    if (pmtList.length > 0) {
      pmtList.forEach(tx => {
        tableHtml += renderDynamicRow(tx, true, false);
      });
      tableHtml += `
        <tr style="background: #f8fafc; font-weight: 700; border-bottom: 2px solid #cbd5e1;">
          <td colspan="5" style="text-align: right; padding: 8px 12px; color: #475569; text-transform: uppercase; font-size: 0.78rem;">Total Expenses Paid:</td>
          <td style="text-align: right; color: #cbd5e1;">-</td>
          <td class="num-col" style="font-weight: 800; color: #b91c1c; text-align: right; padding: 8px 6px;">₹ ${formatCurrency(totalPmt)}</td>
          <td class="editor-only"></td>
        </tr>
      `;
    } else {
      tableHtml += `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 14px; font-style: italic;">No paid / expense entries found</td></tr>`;
    }

    // 3. NET BALANCE SUMMARY ROW
    tableHtml += `
      <tr style="background: #0f172a; color: #ffffff; font-weight: 800;">
        <td colspan="5" style="text-align: right; padding: 10px 14px; text-transform: uppercase; font-size: 0.82rem; letter-spacing: 0.05em;">Net Balance (Collections - Expenses):</td>
        <td colspan="2" style="text-align: right; padding: 10px 12px; font-size: 0.95rem; color: ${(totalRcpt - totalPmt) >= 0 ? '#34d399' : '#f87171'};">
          ₹ ${formatCurrency(totalRcpt - totalPmt)}
        </td>
        <td class="editor-only"></td>
      </tr>
    `;

    tbody.innerHTML = tableHtml;
  } else {
    // Single mode (Payment only or Receipt only)
    if (list.length > 0) {
      const sortedList = sortTxDescending(list);
      let tableHtml = '';
      sortedList.forEach(tx => {
        const rcpt = parseFloat(tx.receipt) || 0;
        const pmt = parseFloat(tx.payments) || parseFloat(tx.payment) || 0;
        totalRcpt += rcpt;
        totalPmt += pmt;
        tableHtml += renderDynamicRow(tx, false, rcpt > 0);
      });
      tbody.innerHTML = tableHtml;
    } else {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:24px;">No records found for ${typeName}</td></tr>`;
    }
  }

  if (isBoth) {
    const rcptEl = document.getElementById('rcpt_' + typeIdStr);
    if (rcptEl) rcptEl.innerText = formatCurrency(totalRcpt);
    const pmtEl = document.getElementById('pmt_' + typeIdStr);
    if (pmtEl) pmtEl.innerText = formatCurrency(totalPmt);
    const totalEl = document.getElementById('total_' + typeIdStr);
    if (totalEl) totalEl.innerText = formatCurrency(totalRcpt - totalPmt);
  } else {
    const totalEl = document.getElementById('total_' + typeIdStr);
    if (totalEl) totalEl.innerText = formatCurrency(isPmt ? totalPmt : totalRcpt);
  }
}

// --- PRESENTATION MODE LOGIC ---
let presentationTabs = [];
let currentPresentationIndex = 0;

function buildPresentationTabs() {
  presentationTabs = [];
  const navItems = document.querySelectorAll('.sidebar .nav-menu .nav-item');
  const excludedTabs = ['settingsTab', 'entryTab', 'editTab', 'membersDirectoryTab', 'membersTab', 'memberStatementTab', 'suspenseTab'];

  navItems.forEach(item => {
    const text = item.innerText.trim();
    const onclick = item.getAttribute('onclick') || '';

    if (onclick.includes("switchTab('")) {
      const match = onclick.match(/switchTab\('([^']+)'\)/);
      if (match) {
        const tabId = match[1];
        if (!excludedTabs.includes(tabId)) {
          presentationTabs.push({ id: tabId, name: text.replace(/[^a-zA-Z0-9\s]/g, '').trim() });
        }
      }
    }
  });
}

async function togglePresentationMode() {
  const isPresenting = document.body.classList.contains('presentation-active');

  if (!isPresenting) {
    buildPresentationTabs();

    let targetScreen = null;
    if ('getScreenDetails' in window) {
      try {
        const screenDetails = await window.getScreenDetails();
        if (screenDetails.screens.length > 1) {
          showScreenSelectionModal(screenDetails.screens);
          return;
        }
      } catch (err) {
        console.warn('Window Management API permission denied or failed:', err);
      }
    }
    executePresentationMode(null);
  } else {
    document.body.classList.remove('presentation-active');
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen();
    }
  }
}

function executePresentationMode(targetScreen) {
  document.body.classList.add('presentation-active');

  try {
    if (targetScreen && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen({ screen: targetScreen }).catch(e => {
        document.documentElement.requestFullscreen();
      });
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  } catch (e) {
    console.error(e);
  }

  currentPresentationIndex = 0;
  updatePresentationView();
}

function showScreenSelectionModal(screens) {
  let modal = document.getElementById('screenSelectionModal');
  if (!modal) return executePresentationMode(null);

  const list = document.getElementById('screenSelectionList');
  list.innerHTML = '';

  screens.forEach(s => {
    const btn = document.createElement('button');
    btn.style = 'display: block; width: 100%; padding: 15px; margin-bottom: 10px; background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 8px; text-align: left; cursor: pointer; font-size: 1.1rem; font-weight: 700; color: #0f172a; transition: all 0.2s;';
    btn.onmouseover = () => btn.style.borderColor = '#3b82f6';
    btn.onmouseout = () => btn.style.borderColor = '#cbd5e1';
    btn.innerHTML = `📺 ${s.label || (s.isInternal ? 'Internal Display' : 'External Display')} <br><small style="font-weight:normal; color:#64748b;">${s.width}x${s.height}</small>`;
    btn.onclick = () => {
      modal.style.display = 'none';
      executePresentationMode(s);
    };
    list.appendChild(btn);
  });

  modal.style.display = 'flex';
}

function navigatePresentation(direction) {
  if (presentationTabs.length === 0) return;
  currentPresentationIndex += direction;
  if (currentPresentationIndex < 0) currentPresentationIndex = presentationTabs.length - 1;
  if (currentPresentationIndex >= presentationTabs.length) currentPresentationIndex = 0;
  updatePresentationView();
}

function updatePresentationView() {
  if (presentationTabs.length === 0) return;
  const tabInfo = presentationTabs[currentPresentationIndex];
  if (typeof switchTab === 'function') {
    switchTab(tabInfo.id);
  }
  const indicator = document.getElementById('presentationTabIndicator');
  if (indicator) {
    indicator.innerText = tabInfo.name;
  }
}

document.addEventListener('keydown', (e) => {
  if (document.body.classList.contains('presentation-active')) {
    if (e.key === 'ArrowRight') {
      navigatePresentation(1);
    } else if (e.key === 'ArrowLeft') {
      navigatePresentation(-1);
    } else if (e.key === 'Escape') {
      if (document.body.classList.contains('presentation-active')) {
        togglePresentationMode();
      }
    }
  }
});

// --- CUSTOM ALERT UI ---
function showAlert(message, type = 'info') {
  // Play subtle positive chime only on success actions
  if (typeof playChurchAudio === 'function' && type === 'success') {
    playChurchAudio('success');
  }

  let container = document.getElementById('customAlertContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'customAlertContainer';
    container.style.position = 'fixed';
    container.style.top = '24px';
    container.style.right = '24px';
    container.style.zIndex = '999999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '12px';
    document.body.appendChild(container);
  }

  // Prevent duplicate alerts from stacking up (spam click protection)
  const existingAlerts = Array.from(container.children);
  for (let existing of existingAlerts) {
    if (existing.innerText.includes(message)) {
      // Draw attention to existing alert instead of creating a new one
      existing.style.transform = 'translateX(-10px)';
      setTimeout(() => {
        existing.style.transform = 'translateX(0)';
      }, 150);
      return;
    }
  }

  const alertEl = document.createElement('div');
  const isError = type === 'error';
  const isSuccess = type === 'success';

  let bgColor, textColor, borderColor, iconHtml;
  if (isError) {
    bgColor = 'rgba(254, 226, 226, 0.95)';
    textColor = '#991b1b';
    borderColor = '#ef4444';
    iconHtml = '⚠️';
  } else if (isSuccess) {
    bgColor = 'rgba(209, 250, 229, 0.95)';
    textColor = '#065f46';
    borderColor = '#10b981';
    iconHtml = '✅';
  } else {
    bgColor = 'rgba(219, 234, 254, 0.95)';
    textColor = '#1e40af';
    borderColor = '#3b82f6';
    iconHtml = 'ℹ️';
  }

  alertEl.style.minWidth = '280px';
  alertEl.style.maxWidth = '380px';
  alertEl.style.padding = '16px 20px';
  alertEl.style.borderRadius = '12px';
  alertEl.style.background = bgColor;
  alertEl.style.color = textColor;
  alertEl.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
  alertEl.style.borderLeft = `6px solid ${borderColor}`;
  alertEl.style.backdropFilter = 'blur(8px)';
  alertEl.style.display = 'flex';
  alertEl.style.alignItems = 'flex-start';
  alertEl.style.gap = '12px';
  alertEl.style.fontSize = '0.95rem';
  alertEl.style.fontWeight = '600';
  alertEl.style.opacity = '0';
  alertEl.style.transform = 'translateX(100%)';
  alertEl.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  alertEl.style.fontFamily = '"Segoe UI", Arial, sans-serif';

  const icon = document.createElement('span');
  icon.innerHTML = iconHtml;
  icon.style.fontSize = '1.25rem';
  icon.style.lineHeight = '1.2';

  const text = document.createElement('span');
  text.innerText = message;
  text.style.lineHeight = '1.4';
  text.style.flex = '1';

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.background = 'transparent';
  closeBtn.style.border = 'none';
  closeBtn.style.color = textColor;
  closeBtn.style.opacity = '0.5';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '1.1rem';
  closeBtn.style.padding = '0';
  closeBtn.style.marginLeft = '8px';
  closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
  closeBtn.onmouseout = () => closeBtn.style.opacity = '0.5';

  alertEl.appendChild(icon);
  alertEl.appendChild(text);
  alertEl.appendChild(closeBtn);
  container.appendChild(alertEl);

  let removeTimeout;
  const removeAlert = () => {
    alertEl.style.opacity = '0';
    alertEl.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (alertEl.parentNode) alertEl.parentNode.removeChild(alertEl);
    }, 400);
  };

  closeBtn.onclick = () => {
    clearTimeout(removeTimeout);
    removeAlert();
  };

  requestAnimationFrame(() => {
    alertEl.style.opacity = '1';
    alertEl.style.transform = 'translateX(0)';
  });

  removeTimeout = setTimeout(removeAlert, 4000);
}

/* --- SPLIT ENTRY LOGIC --- */
function toggleSplitEntryMode() {
  const isSplit = document.getElementById('splitEntryToggle').checked;
  const singleContainer = document.getElementById('singleEntryContainer');
  const splitContainer = document.getElementById('splitEntryContainer');
  const amountInput = document.getElementById('amount');
  const notesTitle = document.getElementById('notesSectionTitle');
  const notesGroup = document.getElementById('notesGroup');

  if (isSplit) {
    if (singleContainer) singleContainer.style.display = 'none';
    if (splitContainer) splitContainer.style.display = 'block';
    if (notesTitle) notesTitle.style.display = 'none';
    if (notesGroup) notesGroup.style.display = 'none';

    // Clear out single amount to avoid confusion and remove required validation
    if (amountInput) {
      amountInput.value = '';
      amountInput.removeAttribute('required');
    }

    // Add first row if empty
    const wrapper = document.getElementById('splitRowsWrapper');
    if (wrapper && wrapper.children.length === 0) {
      addSplitRow();
    }
  } else {
    if (singleContainer) singleContainer.style.display = 'block';
    if (splitContainer) splitContainer.style.display = 'none';
    if (notesTitle) notesTitle.style.display = 'block';
    if (notesGroup) notesGroup.style.display = 'block';

    // Restore required validation for single entry mode
    if (amountInput) amountInput.setAttribute('required', 'true');
  }
}

let splitRowCount = 0;

function addSplitRow() {
  splitRowCount++;
  const rowId = 'split-row-' + splitRowCount;
  const wrapper = document.getElementById('splitRowsWrapper');

  const mode = document.getElementById('txType') ? document.getElementById('txType').value : 'Receipt';
  const typeOptionsHTML = getCategoryOptionsHTML(mode);
  const defaultMonth = getDefaultSubscriptionMonth(false);

  const html = `
    <div id="${rowId}" class="split-row" style="display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; padding: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="flex: 1; min-width: 120px;">
        <label style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 4px; display: block;">Category</label>
        <select class="split-type-select" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem;" onchange="updateSplitRowSubtypes('${rowId}')">
          ${typeOptionsHTML}
        </select>
      </div>
      <div style="flex: 1; min-width: 120px; display: none;" class="split-subtype-container">
        <label style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 4px; display: block;">Subtype</label>
        <select class="split-subtype-select" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem;" onchange="autoPopulateSplitRowDescription('${rowId}', false)"></select>
      </div>
      <div style="flex: 1; min-width: 120px; display: none;" class="split-submonth-container">
        <label style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 4px; display: block;">Month</label>
        <select class="split-submonth-select" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem;" onchange="autoPopulateSplitRowDescription('${rowId}', false)">
          ${document.getElementById('subMonth') ? document.getElementById('subMonth').innerHTML : ''}
        </select>
      </div>
      <div style="flex: 2; min-width: 150px;">
        <label style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 4px; display: block;">Description / Particulars</label>
        <input type="text" class="split-desc-input" placeholder="Row description..." style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem;">
      </div>
      <div style="flex: 1; min-width: 100px;">
        <label style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 4px; display: block;">Amount</label>
        <input type="text" inputmode="decimal" class="split-amount-input" placeholder="0.00" oninput="calculateSplitTotal()" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem; font-weight: 700;">
      </div>
      <div style="display: flex; align-items: center; justify-content: center;">
        <button type="button" onclick="removeSplitRow('${rowId}')" style="background: #fee2e2; color: #ef4444; border: none; width: 34px; height: 34px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Remove Row">X</button>
      </div>
    </div>
  `;

  wrapper.insertAdjacentHTML('beforeend', html);
  const row = document.getElementById(rowId);
  const submonthSelect = row ? row.querySelector('.split-submonth-select') : null;
  if (submonthSelect && defaultMonth) {
    let match = Array.from(submonthSelect.options).find(o => o.value === defaultMonth);
    if (!match) {
      const opt = document.createElement('option');
      opt.value = defaultMonth;
      opt.innerText = defaultMonth;
      submonthSelect.appendChild(opt);
    }
    submonthSelect.value = defaultMonth;
  }
  updateSplitRowSubtypes(rowId);
  calculateSplitTotal();
}

function removeSplitRow(rowId) {
  const row = document.getElementById(rowId);
  if (row) {
    row.remove();
    calculateSplitTotal();
  }
}

function calculateSplitTotal() {
  let total = 0;
  const amountInputs = document.querySelectorAll('.split-amount-input');
  amountInputs.forEach(input => {
    const val = parseFloat(input.value.replace(/,/g, '')) || 0;
    total += val;
  });
  const displayEl = document.getElementById('splitTotalAmountDisplay');
  if (displayEl) displayEl.innerText = formatCurrencyNoSymbol(total);
  return total;
}

function updateSplitRowSubtypes(rowId, skipAutoPopulate = false) {
  const row = document.getElementById(rowId);
  if (!row) return;

  const typeSelect = row.querySelector('.split-type-select');
  const subtypeContainer = row.querySelector('.split-subtype-container');
  const subtypeSelect = row.querySelector('.split-subtype-select');
  const submonthContainer = row.querySelector('.split-submonth-container');

  const typeValFull = typeSelect.value || '|';
  const parts = typeValFull.split('|');
  const mainType = parts[0];

  subtypeContainer.style.display = 'none';
  submonthContainer.style.display = 'none';
  subtypeSelect.innerHTML = '';

  const mode = document.getElementById('txType') ? document.getElementById('txType').value : 'Receipt';

  if (mainType === 'Subscription') {
    submonthContainer.style.display = 'block';
    const submonthSelect = row.querySelector('.split-submonth-select');
    if (submonthSelect && !submonthSelect.value) {
      const defaultMonth = getDefaultSubscriptionMonth(false);
      submonthSelect.value = defaultMonth;
    }
  } else if (mainType === 'Charity' || mainType === 'Ledger' || mainType === 'Other Income' || mainType === 'Contra') {
    const rules = globalFieldRules[mainType];
    if (rules && rules.subtypes) {
      let subtypeOptions = rules.subtypes[mode] || [];
      if (mainType === 'Contra' && subtypeOptions.length === 0) subtypeOptions = rules.subtypes['Both'] || [];

      if (subtypeOptions.length > 0) {
        subtypeOptions.forEach(opt => {
          const optEl = document.createElement('option');
          optEl.value = opt;
          optEl.innerText = opt;
          subtypeSelect.appendChild(optEl);
        });
        subtypeContainer.style.display = 'block';
      }
    }
  }
  if (!skipAutoPopulate) {
    autoPopulateSplitRowDescription(rowId, false);
  }
}
function handleSplitFormSubmit(e) {
  e.preventDefault();

  try {
    const rows = document.querySelectorAll('.split-row');
    let items = [];
    let totalAmt = 0;

    rows.forEach((row, idx) => {
      const amtInput = row.querySelector('.split-amount-input');
      const typeSelect = row.querySelector('.split-type-select');
      const subtypeSelect = row.querySelector('.split-subtype-select');
      const subMonthSelect = row.querySelector('.split-submonth-select');
      const descInput = row.querySelector('.split-desc-input');

      const amt = parseFloat(String(amtInput.value || '').replace(/,/g, '')) || 0;
      const typeValFull = typeSelect ? (typeSelect.value || '|') : '|';
      const [pType, pSub] = typeValFull.split('|');

      let finalSub = pSub;
      if (row.querySelector('.split-subtype-container') && row.querySelector('.split-subtype-container').style.display !== 'none') {
        finalSub = subtypeSelect ? subtypeSelect.value : "";
      }
      let finalMon = "";
      if (row.querySelector('.split-submonth-container') && row.querySelector('.split-submonth-container').style.display !== 'none') {
        finalMon = subMonthSelect ? subMonthSelect.value : "";
      }
      const rowDesc = descInput ? descInput.value.trim() : "";

      if (amt > 0) {
        items.push({ amount: amt, type: pType, subtype: finalSub || "", month: finalMon || "", description: rowDesc });
        totalAmt += amt;
      }
    });

    if (items.length === 0 || totalAmt <= 0) {
      showAlert("Please enter valid amounts for split entries. 💰", "error");
      return;
    }

    const mode = document.getElementById('txType') ? document.getElementById('txType').value : 'Receipt';
    const vrNoEl = document.getElementById('vrNo');
    let vrNoValue = vrNoEl ? vrNoEl.value.trim() : "";

    const entryTypeEl = document.getElementById('entryType');
    const entryTypeVal = entryTypeEl ? entryTypeEl.value : "Cash";

    const isChequeEl = document.getElementById('isCheque');
    const isCheque = isChequeEl ? isChequeEl.checked : false;

    const chequeNoEl = document.getElementById('chequeNo');
    const chequeNo = chequeNoEl ? chequeNoEl.value.trim() : "";

    const bankAccountEl = document.getElementById('bankAccountSelect');
    const bankAccount = bankAccountEl ? bankAccountEl.value : "State Bank of India";

    const bankSubtypeEl = document.getElementById('bankSubtypeSelect');
    const bankSubtypeStr = bankSubtypeEl ? bankSubtypeEl.value : "";

    if (vrNoValue === "" && isCheque && chequeNo) {
      vrNoValue = chequeNo;
    }
    if (entryTypeVal === 'Bank' && vrNoValue !== "") {
      if (!vrNoValue.endsWith('/B')) vrNoValue = vrNoValue + '/B';
    }

    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const saveAndPrintBtn = document.getElementById('saveAndPrintBtn');

    let saves = [];
    let firstSavedTx = null;
    const splitGroupId = 'SPLIT_' + Date.now() + '_' + Math.floor(Math.random() * 100000);

    items.forEach((item, index) => {
      let formReceipt = (mode === 'Receipt') ? item.amount : "";
      let formPayments = (mode === 'Payment') ? item.amount : "";

      if (entryTypeVal === 'Bank') {
        if (bankSubtypeStr === 'Cash Deposit (Contra)') {
          formReceipt = ""; formPayments = item.amount;
        } else if (bankSubtypeStr === 'Cash Withdrawal (Contra)') {
          formReceipt = item.amount; formPayments = "";
        }
      }

      const dateEl = document.getElementById('date');
      const accountNameEl = document.getElementById('accountName');
      const addressInputEl = document.getElementById('addressInput');
      const addToCashBookEl = document.getElementById('addToCashBook');
      const transactionIdEl = document.getElementById('transactionId');

      const formPayload = {
        action: "add",
        originalVrNo: vrNoValue,
        date: dateEl ? dateEl.value : "",
        vrNo: vrNoValue,
        accountName: accountNameEl ? accountNameEl.value : "",
        address: addressInputEl ? addressInputEl.value : "",
        description: item.description || "",
        amount: item.amount,
        receipt: formReceipt,
        payment: formPayments,
        type: item.type,
        subtype: item.subtype || "",
        subMonth: item.month || "",
        entryType: entryTypeVal,
        bankAccount: bankAccount,
        bankSubtype: (entryTypeVal === 'Cash' && item.type === 'Contra') ? item.subtype : bankSubtypeStr,
        addToCashBook: addToCashBookEl ? addToCashBookEl.checked : false,
        isAddLedgerType: true,
        isCheque: isCheque,
        chequeNo: chequeNo,
        mode: mode,
        transactionId: transactionIdEl ? transactionIdEl.value.trim() : "",
        splitGroupId: splitGroupId,
        isSplitEntry: true,
        splitTotalAmount: totalAmt,
        splitItems: items
      };

      if (index === 0) {
        firstSavedTx = Object.assign({}, formPayload, {
          isSplitEntry: true,
          splitGroupId: splitGroupId,
          splitItems: items,
          amount: totalAmt,
          receipt: (mode === 'Receipt' ? totalAmt : ""),
          payment: (mode === 'Payment' ? totalAmt : "")
        });
      }

      const newId = Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0') + index;
      formPayload.id = newId;

      // Optimistically push to local general transactions
      allTimeGeneralTxList.push(formPayload);
      allTimeTxList.push(formPayload);

      saves.push(db.collection("transactions").doc(String(newId)).set(formPayload));
    });

    currentLoadedTxList = filterListByFY(allTimeTxList);
    currentGeneralTxList = filterListByFY(allTimeGeneralTxList);

    const isContraCash = (entryTypeVal === 'Cash' && items.some(it => it.type === 'Contra'));
    if (entryTypeVal === 'Bank' || isContraCash) {
      const contraItem = items.find(it => it.type === 'Contra');
      const bSubtype = (entryTypeVal === 'Cash' && contraItem) ? contraItem.subtype : bankSubtypeStr;
      const isContraEntry = isContraCash || bSubtype === 'Cash Deposit (Contra)' || bSubtype === 'Cash Withdrawal (Contra)';

      let bankMode;
      if (bSubtype === 'Cash Deposit (Contra)' || bSubtype.toLowerCase().includes('cash deposit')) {
        bankMode = "Credit (Receipt)";
      } else if (bSubtype === 'Cash Withdrawal (Contra)' || bSubtype.toLowerCase().includes('cash withdrawal')) {
        bankMode = "Debit (Payment)";
      } else if (isContraCash) {
        bankMode = (mode === 'Receipt' ? "Debit (Payment)" : "Credit (Receipt)");
      } else {
        bankMode = (mode === 'Receipt') ? "Credit (Receipt)" : "Debit (Payment)";
      }

      const isCredit = bankMode.includes('Credit') || bankMode.includes('Receipt');
      const dateEl = document.getElementById('date');
      const accountNameEl = document.getElementById('accountName');
      const addToCashBookEl = document.getElementById('addToCashBook');
      const transactionIdEl = document.getElementById('transactionId');

      const combinedDesc = items.map(it => {
        const typeName = (it.type || it.category || '').trim();
        const subName = (it.subtype || '').trim();
        const descName = (it.description || it.desc || it.particulars || it.month || '').trim();
        const amt = Number(it.amount || it.amt || 0);
        let label = typeName || subName || 'Split Item';
        if (subName && subName !== typeName && !label.toLowerCase().includes(subName.toLowerCase())) {
          label += ' - ' + subName;
        }
        if (descName && descName !== typeName && descName !== subName && !label.toLowerCase().includes(descName.toLowerCase())) {
          label += ' (' + descName + ')';
        }
        return `${label} (₹${formatCurrencyNoSymbol(amt)})`;
      }).filter(Boolean).join(' + ');

      const mainAcc = accountNameEl ? accountNameEl.value.trim() : "";
      const bankDesc = mainAcc && combinedDesc ? `${mainAcc} - ${combinedDesc}` : (mainAcc || combinedDesc || '-');

      const bankId = firstSavedTx ? String(firstSavedTx.id) : (Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0'));
      const bankPayload = {
        id: bankId,
        date: dateEl ? dateEl.value : "",
        vrNo: vrNoValue || '-',
        description: bankDesc,
        amount: totalAmt,
        receipt: isCredit ? totalAmt : "",
        payment: !isCredit ? totalAmt : "",
        credit: isCredit ? totalAmt : 0,
        debit: !isCredit ? totalAmt : 0,
        account: bankAccount,
        mode: bankMode,
        bankSubtype: bSubtype,
        inCashBook: isContraEntry ? true : (addToCashBookEl ? addToCashBookEl.checked : false),
        addToCashBook: isContraEntry ? true : (addToCashBookEl ? addToCashBookEl.checked : false),
        entryType: "Bank",
        isCheque: isCheque,
        chequeNo: chequeNo,
        transactionId: transactionIdEl ? transactionIdEl.value.trim() : "",
        splitGroupId: splitGroupId,
        isSplitEntry: true,
        splitItems: items
      };
      allTimeBankBookList.push(bankPayload);
      loadedBankBookTransactions = filterListByFY(allTimeBankBookList);
      saves.push(db.collection("bank_transactions").doc(String(bankId)).set(bankPayload));
    }

    // INSTANT OPTIMISTIC RESET & FEEDBACK
    if (typeof onSubmitSuccess === 'function') {
      onSubmitSuccess("Success", mode, firstSavedTx);
    }

    // Background Cloud Sync
    Promise.all(saves)
      .catch((err) => {
        console.error("Cloud sync error for split entry:", err);
        showAlert("⚠️ Cloud sync notice: " + (err.message || err), "error");
      });
  } catch (err) {
    console.error(err);
    if (typeof showAlert === 'function') {
      showAlert("An error occurred while saving: " + err.message, "error");
    } else {
      alert("Error: " + err.message);
    }
    const submitBtn = document.getElementById('submitBtn');
    const saveAndPrintBtn = document.getElementById('saveAndPrintBtn');
    if (submitBtn) submitBtn.disabled = false;
    if (saveAndPrintBtn) saveAndPrintBtn.disabled = false;
    if (typeof hideGlobalLoading === 'function') hideGlobalLoading();
  }
}
