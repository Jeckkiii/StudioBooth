/**
 * StudioBooth Pro
 * Pure JavaScript - HD Camera, Natural Optical Bokeh Depth-of-Field,
 * Clean Studio Filters, 3D Tactile Card & High-Resolution Canvas Export
 */

// App State
const state = {
  stream: null,
  facingMode: 'user', // 'user' or 'environment'
  isMirrored: true,
  showGrid: true,
  currentLayout: '4cuts', // '4cuts', '2x2', '3cuts', 'polaroid'
  countdownSeconds: 5,
  soundEnabled: true,
  activeFilter: 'natural',
  frameColor: '#ffffff',
  frameTheme: 'solid',
  footerText: 'MEMORIES ♡',
  showDate: true,
  capturedPhotos: [],
  isCapturing: false,

  // Bokeh & Lens State
  enableBokeh: true,
  bokehLevel: 'medium', // 'subtle' (f/2.8), 'medium' (f/2.0), 'deep' (f/1.4)
  enableClarity: true,
  enable3dTilt: true
};

// DOM Elements
const videoEl = document.getElementById('cameraVideo');
const naturalBokehLayer = document.getElementById('naturalBokehLayer');
const camQualityTag = document.getElementById('camQualityTag');
const startCamBtn = document.getElementById('startCamBtn');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');
const captureBtn = document.getElementById('captureBtn');
const switchCameraBtn = document.getElementById('switchCameraBtn');
const mirrorCameraBtn = document.getElementById('mirrorCameraBtn');
const gridToggleBtn = document.getElementById('gridToggleBtn');
const cameraGuides = document.getElementById('cameraGuides');
const resetBoothBtn = document.getElementById('resetBoothBtn');
const flashOverlay = document.getElementById('flashOverlay');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownNumber = document.getElementById('countdownNumber');
const shotProgress = document.getElementById('shotProgress');
const currentShotNumEl = document.getElementById('currentShotNum');
const totalShotsNumEl = document.getElementById('totalShotsNum');
const shotsPreviewBar = document.getElementById('shotsPreviewBar');
const statusTag = document.getElementById('statusTag');

// 3D Card Elements
const card3dPerspectiveWrapper = document.getElementById('card3dPerspectiveWrapper');
const strip3dCard = document.getElementById('strip3dCard');
const cardGlare = document.getElementById('cardGlare');
const resultCanvas = document.getElementById('resultCanvas');
const downloadBtn = document.getElementById('downloadBtn');
const printBtn = document.getElementById('printBtn');
const retakeBtn = document.getElementById('retakeBtn');

// Controls
const bokehToggle = document.getElementById('bokehToggle');
const bokehSliderGroup = document.getElementById('bokehSliderGroup');
const bokehLevelVal = document.getElementById('bokehLevelVal');
const clarityToggle = document.getElementById('clarityToggle');
const tilt3dToggle = document.getElementById('tilt3dToggle');
const footerTextInput = document.getElementById('footerTextInput');
const dateToggle = document.getElementById('dateToggle');
const soundToggle = document.getElementById('soundToggle');
const themeToggleBtn = document.getElementById('themeToggleBtn');

// Layout Configuration
const LAYOUT_CONFIG = {
  '4cuts': { total: 4, label: '4-Cuts Strip', width: 600, height: 1800 },
  '2x2': { total: 4, label: '2x2 Grid', width: 1200, height: 1200 },
  '3cuts': { total: 3, label: '3-Cuts Strip', width: 600, height: 1400 },
  'polaroid': { total: 1, label: 'Single Polaroid', width: 800, height: 1000 }
};

// Filter CSS Mapping
const FILTER_MAP = {
  'natural': 'contrast(1.05) saturate(1.08) brightness(1.02)',
  'korean-clean': 'brightness(1.09) contrast(0.98) saturate(1.12)',
  'kodak-film': 'sepia(0.2) contrast(1.15) brightness(0.98) saturate(1.22)',
  'warm-glow': 'sepia(0.28) saturate(1.3) hue-rotate(-12deg) brightness(1.04)',
  'classic-noir': 'grayscale(1) contrast(1.28) brightness(0.96)',
  'fuji-velvia': 'contrast(1.18) saturate(1.35) brightness(1.02) hue-rotate(8deg)',
  'pastel-soft': 'brightness(1.06) contrast(0.94) saturate(1.2) hue-rotate(345deg)',
  'cyber-mood': 'contrast(1.22) saturate(1.25) hue-rotate(170deg)'
};

/* ==========================================================================
   Web Audio Synthesizer (Realistic Shutter & Countdown Beeps)
   ========================================================================== */
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
}

function playBeep(freq = 600, duration = 0.12) {
  if (!state.soundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn(e);
  }
}

function playShutterSound() {
  if (!state.soundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.08);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1100, now + 0.02);
    osc2.frequency.exponentialRampToValueAtTime(150, now + 0.09);
    gain2.gain.setValueAtTime(0.25, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.02);
    osc2.stop(now + 0.09);
  } catch (e) {
    console.warn(e);
  }
}

/* ==========================================================================
   HD Camera Management (Optimized for High Quality)
   ========================================================================== */
async function startCamera() {
  stopCamera();

  // Request maximum possible sensor resolution & framerate
  const constraints = {
    video: {
      facingMode: state.facingMode,
      width: { ideal: 3840, min: 1280 },
      height: { ideal: 2160, min: 720 },
      frameRate: { ideal: 60, min: 30 }
    },
    audio: false
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    state.stream = stream;
    videoEl.srcObject = stream;
    await videoEl.play();

    cameraPlaceholder.style.display = 'none';
    updateMirrorState();
    updateClarity();

    // Check actual stream resolution
    const track = stream.getVideoTracks()[0];
    if (track) {
      const settings = track.getSettings();
      if (settings.width && settings.height) {
        camQualityTag.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${settings.width}x${settings.height} HD`;
      }
    }
  } catch (err) {
    console.error('Error accessing camera:', err);
    alert('Tidak dapat mengakses kamera. Pastikan Anda telah memberikan izin kamera pada browser.');
  }
}

function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach(track => track.stop());
    state.stream = null;
  }
  videoEl.srcObject = null;
}

function switchCamera() {
  state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
  state.isMirrored = (state.facingMode === 'user');
  startCamera();
}

function updateMirrorState() {
  if (state.isMirrored) {
    videoEl.classList.add('mirrored');
    mirrorCameraBtn.classList.add('active');
  } else {
    videoEl.classList.remove('mirrored');
    mirrorCameraBtn.classList.remove('active');
  }
}

function updateClarity() {
  if (state.enableClarity) {
    videoEl.classList.add('hd-clarity');
  } else {
    videoEl.classList.remove('hd-clarity');
  }
}

function updateBokehLayer() {
  naturalBokehLayer.className = 'natural-bokeh-layer';
  if (state.enableBokeh) {
    naturalBokehLayer.classList.add('active', `bokeh-${state.bokehLevel}`);
  }
}

/* ==========================================================================
   Capture Sequence & Multi-Shot Flow
   ========================================================================== */
function getTotalRequiredShots() {
  return LAYOUT_CONFIG[state.currentLayout].total;
}

function updateThumbnailsUI() {
  const total = getTotalRequiredShots();
  shotsPreviewBar.innerHTML = '';
  
  for (let i = 0; i < total; i++) {
    const slot = document.createElement('div');
    slot.className = 'thumb-slot';
    slot.dataset.index = i;

    if (state.capturedPhotos[i]) {
      slot.classList.add('captured');
      const img = document.createElement('img');
      img.src = state.capturedPhotos[i];
      slot.appendChild(img);
    } else {
      slot.innerHTML = `<span>${i + 1}</span>`;
    }
    shotsPreviewBar.appendChild(slot);
  }
}

async function startPhotoSession() {
  if (state.isCapturing) return;
  if (!state.stream) {
    await startCamera();
    if (!state.stream) return;
  }

  initAudio();
  state.isCapturing = true;
  state.capturedPhotos = [];
  captureBtn.disabled = true;
  downloadBtn.disabled = true;
  printBtn.disabled = true;
  retakeBtn.disabled = true;
  updateThumbnailsUI();

  const totalShots = getTotalRequiredShots();
  totalShotsNumEl.textContent = totalShots;
  shotProgress.style.display = 'block';

  for (let shotIndex = 0; shotIndex < totalShots; shotIndex++) {
    currentShotNumEl.textContent = shotIndex + 1;
    statusTag.textContent = `Mengambil foto ${shotIndex + 1}/${totalShots}...`;
    statusTag.className = 'status-tag';

    await runCountdown(state.countdownSeconds);

    playShutterSound();
    triggerFlash();
    const photoDataUrl = captureHighResFrame();
    state.capturedPhotos.push(photoDataUrl);
    updateThumbnailsUI();

    if (shotIndex < totalShots - 1) {
      await wait(1000);
    }
  }

  shotProgress.style.display = 'none';
  state.isCapturing = false;
  captureBtn.disabled = false;
  statusTag.textContent = 'Selesai! Strip dibuat ✨';
  statusTag.className = 'status-tag success';

  downloadBtn.disabled = false;
  printBtn.disabled = false;
  retakeBtn.disabled = false;

  renderFinalStrip();
}

function runCountdown(seconds) {
  return new Promise(resolve => {
    countdownOverlay.style.display = 'flex';
    let current = seconds;

    const tick = () => {
      countdownNumber.textContent = current;
      playBeep(current === 1 ? 920 : 580, 0.12);

      if (current <= 1) {
        setTimeout(() => {
          countdownOverlay.style.display = 'none';
          resolve();
        }, 900);
      } else {
        current--;
        setTimeout(tick, 1000);
      }
    };

    tick();
  });
}

function triggerFlash() {
  flashOverlay.classList.add('flash-active');
  setTimeout(() => {
    flashOverlay.classList.remove('flash-active');
  }, 220);
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// High-Resolution Frame Capture with Natural Optical Bokeh
function captureHighResFrame() {
  const tempCanvas = document.createElement('canvas');
  const vWidth = videoEl.videoWidth || 1280;
  const vHeight = videoEl.videoHeight || 720;

  const targetAspect = 4 / 3;
  let sWidth = vWidth;
  let sHeight = vHeight;
  let sx = 0;
  let sy = 0;

  if (vWidth / vHeight > targetAspect) {
    sWidth = vHeight * targetAspect;
    sx = (vWidth - sWidth) / 2;
  } else {
    sHeight = vWidth / targetAspect;
    sy = (vHeight - sHeight) / 2;
  }

  // Razor-sharp 1600x1200 canvas
  tempCanvas.width = 1600;
  tempCanvas.height = 1200;
  const ctx = tempCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (state.isMirrored) {
    ctx.translate(tempCanvas.width, 0);
    ctx.scale(-1, 1);
  }

  // Draw main video frame
  ctx.drawImage(videoEl, sx, sy, sWidth, sHeight, 0, 0, tempCanvas.width, tempCanvas.height);

  // Apply Natural Optical Bokeh & Aperture Fall-off
  if (state.enableBokeh) {
    applyNaturalOpticalBokeh(ctx, tempCanvas, sx, sy, sWidth, sHeight);
  }

  return tempCanvas.toDataURL('image/jpeg', 0.98);
}

// Authentic Optical Bokeh: keeps center subject sharp while softly blurring peripheral background
function applyNaturalOpticalBokeh(ctx, canvas, sx, sy, sWidth, sHeight) {
  const w = canvas.width;
  const h = canvas.height;

  // Blur strengths based on aperture setting
  const blurAmounts = {
    'subtle': 8,
    'medium': 14,
    'deep': 22
  };
  const blurRadius = blurAmounts[state.bokehLevel] || 14;

  // Create blurred copy
  const blurCanvas = document.createElement('canvas');
  blurCanvas.width = w;
  blurCanvas.height = h;
  const bCtx = blurCanvas.getContext('2d');
  bCtx.imageSmoothingEnabled = true;
  bCtx.imageSmoothingQuality = 'high';

  if (state.isMirrored) {
    bCtx.translate(w, 0);
    bCtx.scale(-1, 1);
  }
  bCtx.filter = `blur(${blurRadius}px)`;
  bCtx.drawImage(videoEl, sx, sy, sWidth, sHeight, 0, 0, w, h);

  // Mask: smooth radial optical aperture fall-off
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = w;
  maskCanvas.height = h;
  const mCtx = maskCanvas.getContext('2d');

  const grad = mCtx.createRadialGradient(w / 2, h * 0.48, w * 0.22, w / 2, h * 0.48, w * 0.62);
  grad.addColorStop(0, 'rgba(0,0,0,0)');      // center 100% sharp
  grad.addColorStop(0.5, 'rgba(0,0,0,0.15)');
  grad.addColorStop(0.85, 'rgba(0,0,0,0.75)');
  grad.addColorStop(1, 'rgba(0,0,0,0.95)');   // periphery softly blurred

  mCtx.fillStyle = grad;
  mCtx.fillRect(0, 0, w, h);

  // Blend blurred background using destination-in
  bCtx.globalCompositeOperation = 'destination-in';
  bCtx.drawImage(maskCanvas, 0, 0);

  // Overlay blurred layer onto main sharp image
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(blurCanvas, 0, 0);

  // Subtle natural optical vignette
  const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/* ==========================================================================
   Strip Generation & Canvas Drawing
   ========================================================================== */
function renderFinalStrip() {
  const layout = LAYOUT_CONFIG[state.currentLayout];
  const photos = state.capturedPhotos;
  if (!photos || photos.length === 0) return;

  const width = layout.width;
  const height = layout.height;
  resultCanvas.width = width;
  resultCanvas.height = height;

  const ctx = resultCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Draw Background Frame
  ctx.fillStyle = state.frameColor;
  ctx.fillRect(0, 0, width, height);

  // 2. Draw Frame Motif
  drawFramePattern(ctx, width, height, state.frameTheme, state.frameColor);

  // 3. Load all images & draw
  const loadedImages = [];
  let loadedCount = 0;

  photos.forEach((src, idx) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      loadedImages[idx] = img;
      loadedCount++;
      if (loadedCount === photos.length) {
        drawLayoutPhotos(ctx, width, height, loadedImages);
        drawFooterDetails(ctx, width, height);
      }
    };
  });
}

function drawFramePattern(ctx, w, h, theme, baseColor) {
  if (theme === 'solid') return;

  ctx.save();
  const isDarkBase = isColorDark(baseColor);
  const strokeColor = isDarkBase ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.12)';

  if (theme === 'border-line') {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.strokeRect(24, 24, w - 48, h - 48);
  } else if (theme === 'dots') {
    ctx.fillStyle = strokeColor;
    const spacing = 32;
    for (let x = 16; x < w; x += spacing) {
      for (let y = 16; y < h; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

function isColorDark(hex) {
  if (!hex || hex.length < 6) return false;
  const c = hex.substring(1);
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >>  8) & 0xff;
  const b = (rgb >>  0) & 0xff;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma < 128;
}

function drawLayoutPhotos(ctx, totalW, totalH, images) {
  const layout = state.currentLayout;
  const filterStr = FILTER_MAP[state.activeFilter] || 'none';

  ctx.save();
  ctx.filter = filterStr;

  if (layout === '4cuts') {
    const marginX = 40;
    const marginTop = 50;
    const gap = 30;
    const photoW = totalW - (marginX * 2);
    const photoH = (photoW * 3) / 4;

    images.slice(0, 4).forEach((img, i) => {
      const y = marginTop + i * (photoH + gap);
      drawRoundedImage(ctx, img, marginX, y, photoW, photoH, 10);
    });
  } else if (layout === '3cuts') {
    const marginX = 40;
    const marginTop = 60;
    const gap = 35;
    const photoW = totalW - (marginX * 2);
    const photoH = (photoW * 3) / 4;

    images.slice(0, 3).forEach((img, i) => {
      const y = marginTop + i * (photoH + gap);
      drawRoundedImage(ctx, img, marginX, y, photoW, photoH, 10);
    });
  } else if (layout === '2x2') {
    const margin = 50;
    const gap = 30;
    const photoW = (totalW - (margin * 2) - gap) / 2;
    const photoH = (photoW * 3) / 4;
    const startY = 80;

    images.slice(0, 4).forEach((img, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + col * (photoW + gap);
      const y = startY + row * (photoH + gap);
      drawRoundedImage(ctx, img, x, y, photoW, photoH, 10);
    });
  } else if (layout === 'polaroid') {
    const marginX = 60;
    const marginTop = 70;
    const photoW = totalW - (marginX * 2);
    const photoH = (photoW * 3) / 4;

    if (images[0]) {
      drawRoundedImage(ctx, images[0], marginX, marginTop, photoW, photoH, 8);
    }
  }

  ctx.restore();
}

function drawRoundedImage(ctx, img, x, y, width, height, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(img, x, y, width, height);
  ctx.restore();
}

function drawFooterDetails(ctx, totalW, totalH) {
  const isDark = isColorDark(state.frameColor);
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const subTextColor = isDark ? '#94a3b8' : '#64748b';

  ctx.save();
  ctx.textAlign = 'center';

  let footerBaseY = totalH - 60;
  if (state.currentLayout === 'polaroid') {
    footerBaseY = totalH - 120;
  }

  // Draw Title Text
  if (state.footerText && state.footerText.trim() !== '') {
    ctx.fillStyle = textColor;
    ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(state.footerText.trim(), totalW / 2, footerBaseY);
  }

  // Draw Date Stamp
  if (state.showDate) {
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    ctx.fillStyle = subTextColor;
    ctx.font = '500 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(dateStr, totalW / 2, footerBaseY + 28);
  }

  // Clean studio footer label
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';
  ctx.font = '11px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('STUDIOBOOTH • HD MEMORIES', totalW / 2, footerBaseY + 50);

  ctx.restore();
}

/* ==========================================================================
   3D Parallax Tilt (Natural & Subtle)
   ========================================================================== */
function init3dParallaxTilt() {
  if (!card3dPerspectiveWrapper || !strip3dCard) return;

  const handleMove = (clientX, clientY) => {
    if (!state.enable3dTilt) return;
    const rect = card3dPerspectiveWrapper.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = clientX - centerX;
    const mouseY = clientY - centerY;

    const rotateX = -(mouseY / (rect.height / 2)) * 12;
    const rotateY = (mouseX / (rect.width / 2)) * 12;

    strip3dCard.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;

    const glareX = ((clientX - rect.left) / rect.width) * 100;
    const glareY = ((clientY - rect.top) / rect.height) * 100;
    cardGlare.style.opacity = '0.6';
    cardGlare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 60%)`;
  };

  card3dPerspectiveWrapper.addEventListener('mousemove', (e) => {
    handleMove(e.clientX, e.clientY);
  });

  card3dPerspectiveWrapper.addEventListener('mouseleave', () => {
    strip3dCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    cardGlare.style.opacity = '0';
  });

  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (e) => {
      if (!state.enable3dTilt || !e.gamma || !e.beta) return;
      const rotY = Math.max(-15, Math.min(15, e.gamma * 0.5));
      const rotX = Math.max(-15, Math.min(15, (e.beta - 45) * 0.5));
      strip3dCard.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
    });
  }
}

/* ==========================================================================
   Export & Download Actions
   ========================================================================== */
function downloadStrip() {
  if (state.capturedPhotos.length === 0) return;

  const link = document.createElement('a');
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${now.getHours()}${now.getMinutes()}`;
  
  link.download = `photobooth_${state.currentLayout}_${timestamp}.png`;
  link.href = resultCanvas.toDataURL('image/png', 1.0);
  link.click();
}

function printStrip() {
  if (state.capturedPhotos.length === 0) return;

  const dataUrl = resultCanvas.toDataURL('image/png');
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Photobooth Strip</title>
        <style>
          body {
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #fff;
          }
          img {
            max-width: 90vw;
            max-height: 95vh;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          }
          @media print {
            body { margin: 0; }
            img { max-width: 100%; height: auto; }
          }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" onload="window.print(); window.close();" />
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}

function resetBooth() {
  state.capturedPhotos = [];
  updateThumbnailsUI();
  
  const ctx = resultCanvas.getContext('2d');
  ctx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
  
  statusTag.textContent = 'Siap Ambil Foto';
  statusTag.className = 'status-tag';
  downloadBtn.disabled = true;
  printBtn.disabled = true;
  retakeBtn.disabled = true;
}

/* ==========================================================================
   UI Event Listeners & Binding
   ========================================================================== */
function initEventListeners() {
  startCamBtn.addEventListener('click', startCamera);
  switchCameraBtn.addEventListener('click', switchCamera);

  mirrorCameraBtn.addEventListener('click', () => {
    state.isMirrored = !state.isMirrored;
    updateMirrorState();
  });

  gridToggleBtn.addEventListener('click', () => {
    state.showGrid = !state.showGrid;
    if (state.showGrid) {
      cameraGuides.classList.remove('hidden');
      gridToggleBtn.classList.add('active');
    } else {
      cameraGuides.classList.add('hidden');
      gridToggleBtn.classList.remove('active');
    }
  });

  captureBtn.addEventListener('click', startPhotoSession);
  resetBoothBtn.addEventListener('click', resetBooth);
  retakeBtn.addEventListener('click', resetBooth);

  downloadBtn.addEventListener('click', downloadStrip);
  printBtn.addEventListener('click', printStrip);

  soundToggle.addEventListener('change', (e) => {
    state.soundEnabled = e.target.checked;
  });

  // Customizer Tabs Switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(`pane-${btn.dataset.tab}`);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Natural Bokeh Toggle
  bokehToggle.addEventListener('change', (e) => {
    state.enableBokeh = e.target.checked;
    bokehSliderGroup.style.display = state.enableBokeh ? 'block' : 'none';
    updateBokehLayer();
  });

  // Bokeh Level Chips
  document.querySelectorAll('#bokehLevelChips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#bokehLevelChips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.bokehLevel = chip.dataset.level;

      const labels = {
        'subtle': 'Halus (f/2.8)',
        'medium': 'Lembut (f/2.0)',
        'deep': 'Mendalam (f/1.4)'
      };
      bokehLevelVal.textContent = labels[state.bokehLevel] || 'Lembut (f/2.0)';
      updateBokehLayer();
    });
  });

  // Clarity Toggle
  clarityToggle.addEventListener('change', (e) => {
    state.enableClarity = e.target.checked;
    updateClarity();
  });

  // 3D Parallax Tilt Toggle
  tilt3dToggle.addEventListener('change', (e) => {
    state.enable3dTilt = e.target.checked;
    if (!state.enable3dTilt) {
      strip3dCard.style.transform = 'none';
      cardGlare.style.opacity = '0';
    }
  });

  // Layout Chip Selection
  document.querySelectorAll('#layoutOptions .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#layoutOptions .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.currentLayout = chip.dataset.layout;
      updateThumbnailsUI();
      if (state.capturedPhotos.length > 0) {
        renderFinalStrip();
      }
    });
  });

  // Timer Chip Selection
  document.querySelectorAll('#timerOptions .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#timerOptions .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.countdownSeconds = parseInt(chip.dataset.seconds, 10);
    });
  });

  // Filters Selection
  document.querySelectorAll('#filtersGrid .filter-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#filtersGrid .filter-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.activeFilter = card.dataset.filter;

      videoEl.className = `${state.isMirrored ? 'mirrored' : ''} ${state.enableClarity ? 'hd-clarity' : ''} filter-${state.activeFilter}`;

      if (state.capturedPhotos.length > 0) {
        renderFinalStrip();
      }
    });
  });

  // Frame Color Palette
  document.querySelectorAll('#frameColorPalette .color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('#frameColorPalette .color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      state.frameColor = dot.dataset.color;
      if (state.capturedPhotos.length > 0) {
        renderFinalStrip();
      }
    });
  });

  // Frame Theme Options
  document.querySelectorAll('#frameThemeOptions .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#frameThemeOptions .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.frameTheme = chip.dataset.theme;
      if (state.capturedPhotos.length > 0) {
        renderFinalStrip();
      }
    });
  });

  // Footer Text Input
  footerTextInput.addEventListener('input', (e) => {
    state.footerText = e.target.value;
    if (state.capturedPhotos.length > 0) {
      renderFinalStrip();
    }
  });

  // Date Toggle
  dateToggle.addEventListener('change', (e) => {
    state.showDate = e.target.checked;
    if (state.capturedPhotos.length > 0) {
      renderFinalStrip();
    }
  });

  // Dark / Light Theme Toggle
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    themeToggleBtn.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  });
}

// Initialization on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  updateThumbnailsUI();
  init3dParallaxTilt();
  updateBokehLayer();

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    startCamera();
  }
});
