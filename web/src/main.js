import { Renderer, STAGE_W, STAGE_H } from './renderer.js?v=24';
import { Puppet, PARTS, CHARACTER_BODY } from './rig.js?v=24';
import { Gunungan } from './gunungan.js?v=24';
import { HandTracker } from './tracking.js?v=24';
import { Controller } from './controller.js?v=24';
import { BackgroundMusic, BeatClock } from './audio.js?v=24';
import { DalangSfx } from './sfx.js?v=24';
import { PerformanceRecorder } from './recorder.js?v=24';
import { ParticleSystem } from './particles.js?v=24';
import { clamp, noise1 } from './math.js?v=24';

const $ = (id) => document.getElementById(id);
const canvas = $('stage');
const video = $('video');
const preview = $('preview');
const previewBox = $('preview-box');
const pctx = preview.getContext('2d');

const HAND_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

function fail(message) {
  const el = $('error');
  el.textContent = message;
  el.hidden = false;
}

let renderer;
try {
  renderer = new Renderer(canvas);
  await Promise.all([
    renderer.loadTexture('background', 'assets/background.png'),
    renderer.loadTexture('gunungan', 'assets/gunungan.png'),
    ...Object.entries(PARTS).map(([key, part]) => renderer.loadTexture(key, part.src)),
  ]);
} catch (err) {
  console.error(err);
  fail(`Panggung tidak dapat dimuat: ${err.message}`);
  throw err;
}

// Two characters facing each other: left is Raden Bima (looking right), right is Prabu Rahwana (looking left).
const puppets = [new Puppet({ x: 640, facing: -1, character: 'bima' }), new Puppet({ x: 1280, facing: 1, character: 'rahwana' })];
const gunungan = new Gunungan();
const tracker = new HandTracker(video);
const controller = new Controller(tracker);
let facingMode = 'target';

// ----------------------------------------------------
// Fase 5: Kasekten Particles & Atmosphere Presets
// ----------------------------------------------------
const particles = new ParticleSystem(800);

const ATMOSPHERE_PRESETS = {
  classic: {
    name: 'Blencong Klasik',
    desc: 'Minyak Kelapa Hangat',
    lampColor: [1.0, 0.78, 0.45],
    ambient: [0.34, 0.27, 0.22],
    bgTint: [1.0, 1.0, 1.0],
    glowTint: [1.0, 0.62, 0.28],
    smokeTint: [1.0, 0.8, 0.55],
  },
  war: {
    name: 'Perang Baratayuda',
    desc: 'Senja Merah Membara',
    lampColor: [1.38, 0.42, 0.12],
    ambient: [0.55, 0.16, 0.11],
    bgTint: [1.32, 0.52, 0.36],
    glowTint: [1.65, 0.22, 0.04],
    smokeTint: [1.35, 0.32, 0.12],
  },
  mystic: {
    name: 'Wengi Tirakat',
    desc: 'Malam Mistik Purnama',
    lampColor: [0.42, 0.78, 1.45],
    ambient: [0.12, 0.20, 0.44],
    bgTint: [0.52, 0.70, 1.25],
    glowTint: [0.25, 0.75, 1.55],
    smokeTint: [0.55, 0.85, 1.35],
  },
};

let currentAtmosphere = 'classic';
try {
  const savedAtm = localStorage.getItem('wayang.atmosphere');
  if (ATMOSPHERE_PRESETS[savedAtm]) currentAtmosphere = savedAtm;
} catch {}

const curLampColor = [...ATMOSPHERE_PRESETS[currentAtmosphere].lampColor];
const curAmbient = [...ATMOSPHERE_PRESETS[currentAtmosphere].ambient];
const curBgTint = [...ATMOSPHERE_PRESETS[currentAtmosphere].bgTint];
const curGlowTint = [...ATMOSPHERE_PRESETS[currentAtmosphere].glowTint];
const curSmokeTint = [...ATMOSPHERE_PRESETS[currentAtmosphere].smokeTint];

let lampFlash = 1.0;

window.wayang = {
  puppets,
  gunungan,
  controller,
  tracker,
  renderer,
  particles,
  setAtmosphere,
  cycleAtmosphere,
  triggerKasekten,
};

function applyFacing() {
  const two = controller.puppetCount === 2;
  for (const p of puppets) p.facingMode = facingMode === 'target' && !two ? 'manual' : facingMode;
}
applyFacing();

// Visible part of the 1920×1080 stage ("cover" fit).
let view = { x: 0, y: 0, w: STAGE_W, h: STAGE_H };
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(innerWidth * dpr));
  const h = Math.max(1, Math.round(innerHeight * dpr));
  renderer.resize(w, h);
  const aspect = w / h;
  if (aspect > STAGE_W / STAGE_H) {
    const vh = STAGE_W / aspect;
    view = { x: 0, y: (STAGE_H - vh) * 0.5, w: STAGE_W, h: vh };
  } else {
    const vw = STAGE_H * aspect;
    view = { x: (STAGE_W - vw) * 0.5, y: 0, w: vw, h: STAGE_H };
  }
}
addEventListener('resize', resize);
resize();

// ---------- UI ----------
const intro = $('intro');
const introStatus = $('intro-status');
const startBtn = $('start-camera');
const statusPill = $('status');
const statusText = $('status-text');
let showPreview = true;

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  introStatus.classList.remove('err');
  try {
    await tracker.start((msg) => (introStatus.textContent = msg));
    controller.source = 'camera';
    controller.recalibrate();
    introStatus.textContent = '';
    intro.classList.add('gone');
    preview.height = Math.round(preview.width / tracker.aspect);
    preview.style.aspectRatio = `${preview.width} / ${preview.height}`;
    syncPreview();
  } catch (err) {
    console.error(err);
    video.srcObject?.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    introStatus.classList.add('err');
    if (err?.name === 'NotAllowedError') {
      introStatus.innerHTML = `
        <strong>Izin kamera belum aktif:</strong><br />
        1. Klik ikon pengaturan situs / gembok di sebelah kiri bilah URL (address bar).<br />
        2. Ubah <em>Kamera</em> menjadi <em>Izinkan (Allow)</em> lalu refresh halaman.<br />
        3. Atau klik tombol <strong>Gunakan mouse</strong> di atas untuk langsung bermain.
      `;
    } else {
      introStatus.textContent = `Kamera tidak tersedia (${err?.message || err}). Kamu tetap bisa bermain menggunakan tombol "Gunakan mouse".`;
    }
    startBtn.disabled = false;
  }
});

$('use-mouse').addEventListener('click', () => {
  controller.source = 'mouse';
  intro.classList.add('gone');
});

canvas.addEventListener('pointermove', (e) => {
  controller.mouse.x = view.x + (e.clientX / innerWidth) * view.w;
  controller.mouse.y = view.y + (e.clientY / innerHeight) * view.h;
  controller.mouse.seen = true;
});
canvas.addEventListener(
  'wheel',
  (e) => {
    controller.mouse.depth = clamp(controller.mouse.depth - e.deltaY * 0.0015, -0.3, 1);
    e.preventDefault();
  },
  { passive: false },
);

// Right-click or double-click to flip / turn wayang around
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const puppetIndex = controller.puppetCount === 1 ? 0 : (controller.mouse.x < view.x + view.w / 2 ? 0 : 1);
  turnPuppet(puppetIndex);
});
canvas.addEventListener('dblclick', () => {
  const puppetIndex = controller.puppetCount === 1 ? 0 : (controller.mouse.x < view.x + view.w / 2 ? 0 : 1);
  turnPuppet(puppetIndex);
});

const settings = $('settings');
const settingsToggle = $('settings-toggle');
settingsToggle.addEventListener('click', () => {
  settings.hidden = !settings.hidden;
  settingsToggle.setAttribute('aria-expanded', String(!settings.hidden));
});
const fingersSelect = $('opt-fingers');
if (fingersSelect) {
  fingersSelect.value = controller.settings.fingers;
  fingersSelect.addEventListener('change', (e) => (controller.settings.fingers = e.target.value));
}
$('opt-bodyhand').addEventListener('change', (e) => (controller.settings.bodyHand = e.target.value));

const charLeftSelect = $('opt-char-left');
const charRightSelect = $('opt-char-right');
const charRightRow = $('char-right-row');

const characterLabel = (val) => {
  if (val === 'bima') return 'Raden Bima';
  if (val === 'rahwana') return 'Prabu Rahwana';
  return 'Raden Arjuna';
};

if (charLeftSelect) {
  charLeftSelect.value = puppets[0].character;
  charLeftSelect.addEventListener('change', (e) => {
    puppets[0].setCharacter(e.target.value);
    showToast(`Wayang Kiri · ${characterLabel(e.target.value)}`);
  });
}

if (charRightSelect) {
  charRightSelect.value = puppets[1].character;
  charRightSelect.addEventListener('change', (e) => {
    puppets[1].setCharacter(e.target.value);
    showToast(`Wayang Kanan · ${characterLabel(e.target.value)}`);
  });
}

$('opt-characters').addEventListener('change', (e) => {
  controller.settings.characters = e.target.value;
  $('bodyhand-row').hidden = e.target.value === 'two';
  if (charRightRow) charRightRow.hidden = e.target.value !== 'two';
  applyFacing();
});
$('opt-facing').addEventListener('change', (e) => {
  facingMode = e.target.value;
  applyFacing();
});
$('opt-camera').addEventListener('change', (e) => {
  showPreview = e.target.checked;
  syncPreview();
});

// ---------- pop-out camera window ----------
// camera.html draws itself from this window (see src/camera-window.js), so it can sit on another
// screen. While it's open, the corner preview hides.
let cameraWin = null;
const popoutBtn = $('opt-popout');
const cameraPoppedOut = () => !!cameraWin && !cameraWin.closed;

function syncPreview() {
  const out = cameraPoppedOut();
  previewBox.hidden = !showPreview || controller.source !== 'camera' || out;
  popoutBtn.textContent = out ? 'Kembalikan kamera' : 'Buka kamera di jendela baru';
}

function toggleCameraWindow() {
  if (cameraPoppedOut()) {
    cameraWin.close();
  } else {
    const w = Math.round(Math.min(960, screen.availWidth * 0.6));
    cameraWin = window.open('camera.html', 'wayang-camera', `popup,width=${w},height=${Math.round(w / tracker.aspect)}`);
    if (!cameraWin) showToast('Jendela diblokir. Izinkan pop-up untuk membuka jendela kamera.');
  }
  syncPreview();
}
popoutBtn.addEventListener('click', toggleCameraWindow);
$('preview-popout').addEventListener('click', toggleCameraWindow);
$('opt-size').addEventListener('input', (e) => {
  for (const p of puppets) p.baseScale = parseFloat(e.target.value);
});

// ---------- backsound & dalang sfx ----------
const music = new BackgroundMusic('assets/backsound.mp3');
const beatClock = new BeatClock(music.el);
beatClock.load('assets/backsound-beats.json');
const sfx = new DalangSfx();

window.wayang.music = music;
window.wayang.beatClock = beatClock;
window.wayang.sfx = sfx;

const soundBtn = $('sound-toggle');
const volumeInput = $('opt-volume');
const sfxVolumeInput = $('opt-sfx-volume');
const sfxAutoInput = $('opt-sfx-auto');

volumeInput.value = String(music.volume);
if (sfxVolumeInput) sfxVolumeInput.value = String(sfx.volume);
if (sfxAutoInput) sfxAutoInput.checked = sfx.auto;

function syncSoundUi() {
  soundBtn.setAttribute('aria-pressed', String(music.muted));
  soundBtn.setAttribute('aria-label', music.muted ? 'Aktifkan musik' : 'Bisukan musik');
}
syncSoundUi();

// autoplay with sound needs a user gesture: begin on the first click / tap / key
const startAudio = (e) => {
  sfx.initContext();
  if (e.target?.closest?.('#sound-toggle') || e.key?.toLowerCase() === 'm') return;
  music.start().then(() => {
    if (music.started) {
      removeEventListener('pointerdown', startAudio, true);
      removeEventListener('keydown', startAudio, true);
    }
  });
};
addEventListener('pointerdown', startAudio, true);
addEventListener('keydown', startAudio, true);

function toggleMusic() {
  music.setMuted(!music.muted);
  sfx.setMuted(music.muted);
  if (!music.muted) music.start();
  syncSoundUi();
}
soundBtn.addEventListener('click', toggleMusic);
volumeInput.addEventListener('input', (e) => {
  music.setVolume(parseFloat(e.target.value));
  if (music.muted && music.volume > 0) toggleMusic();
});
if (sfxVolumeInput) {
  sfxVolumeInput.addEventListener('input', (e) => {
    sfx.setVolume(parseFloat(e.target.value));
  });
}
if (sfxAutoInput) {
  sfxAutoInput.addEventListener('change', (e) => {
    sfx.auto = e.target.checked;
    sfx.save();
  });
}

// ---------- performance recorder (video & mixed audio) ----------
const recorder = new PerformanceRecorder(canvas, sfx, music);
window.wayang.recorder = recorder;

const recordToggleBtn = $('record-toggle');
const optRecordBtn = $('opt-record');
const recordBadge = $('record-badge');
const recordTime = $('record-time');
const recordModal = $('record-modal');
const recordPreview = $('record-preview');
const recordMetaDuration = $('record-meta-duration');
const recordMetaSize = $('record-meta-size');
const btnDownloadRecord = $('btn-download-record');
const btnCloseRecord = $('btn-close-record');
const modalCloseBtn = $('modal-close-btn');

recorder.onStart = () => {
  if (recordBadge) recordBadge.hidden = false;
  if (recordTime) recordTime.textContent = '00:00';
  if (recordToggleBtn) {
    recordToggleBtn.classList.add('recording');
    recordToggleBtn.setAttribute('title', 'Hentikan Rekaman (R)');
    recordToggleBtn.setAttribute('aria-label', 'Hentikan rekaman pertunjukan (R)');
  }
  if (optRecordBtn) optRecordBtn.textContent = 'Hentikan Rekam (R)';
  showToast('Merekam pertunjukan dalang... (R)');
};

recorder.onTick = (timeStr) => {
  if (recordTime) recordTime.textContent = timeStr;
};

recorder.onStop = (result) => {
  if (recordBadge) recordBadge.hidden = true;
  if (recordToggleBtn) {
    recordToggleBtn.classList.remove('recording');
    recordToggleBtn.setAttribute('title', 'Rekam Pertunjukan (R)');
    recordToggleBtn.setAttribute('aria-label', 'Mulai rekam pertunjukan (R)');
  }
  if (optRecordBtn) optRecordBtn.textContent = 'Mulai Rekam Pertunjukan (R)';

  if (recordModal && recordPreview) {
    recordPreview.pause();
    recordPreview.src = result.url;
    recordPreview.currentTime = 0;
    if (recordMetaDuration) recordMetaDuration.textContent = `Durasi: ${PerformanceRecorder.formatTime(result.duration)}`;
    if (recordMetaSize) recordMetaSize.textContent = `Ukuran: ${PerformanceRecorder.formatBytes(result.size)}`;
    if (btnDownloadRecord) {
      const ext = result.mimeType.includes('mp4') ? 'mp4' : 'webm';
      btnDownloadRecord.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style="vertical-align: -2px; margin-right: 6px;"><path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7ZM5 18v2h14v-2H5Z"/></svg> Unduh Video (.${ext})`;
    }
    recordModal.hidden = false;
  }
  showToast('Rekaman pertunjukan selesai!');
};

recorder.onError = (err) => {
  if (recordBadge) recordBadge.hidden = true;
  if (recordToggleBtn) recordToggleBtn.classList.remove('recording');
  if (optRecordBtn) optRecordBtn.textContent = 'Mulai Rekam Pertunjukan (R)';
  console.error('Recording error:', err);
  showToast(`Gagal merekam: ${err.message || 'Kesalahan'}`);
};

async function toggleRecording() {
  if (recorder.isRecording) {
    recorder.stop();
  } else {
    try {
      await recorder.start();
    } catch (err) {
      console.error(err);
      showToast(`Gagal mulai rekam: ${err.message}`);
    }
  }
}

if (recordToggleBtn) recordToggleBtn.addEventListener('click', toggleRecording);
if (optRecordBtn) optRecordBtn.addEventListener('click', toggleRecording);

function closeRecordModal() {
  if (recordModal) recordModal.hidden = true;
  if (recordPreview) {
    recordPreview.pause();
    recordPreview.removeAttribute('src');
  }
}
if (btnCloseRecord) btnCloseRecord.addEventListener('click', closeRecordModal);
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeRecordModal);
if (recordModal) {
  recordModal.addEventListener('click', (e) => {
    if (e.target === recordModal) closeRecordModal();
  });
}
if (btnDownloadRecord) {
  btnDownloadRecord.addEventListener('click', () => {
    recorder.download();
    showToast('Mengunduh rekaman pertunjukan...');
  });
}

// ---------- gunungan (kayon) ui ----------
const gununganSelect = $('opt-gunungan');
const bedholBtn = $('opt-bedhol');

function syncGununganUi() {
  if (gununganSelect) {
    if (gunungan.state === 'opening') gununganSelect.value = 'side';
    else if (gunungan.state === 'closing') gununganSelect.value = 'center';
    else gununganSelect.value = gunungan.state;
  }
}

if (gununganSelect) {
  gununganSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'center') {
      if (gunungan.state !== 'center') gunungan.startTancep(sfx);
    } else if (val === 'side') {
      if (gunungan.state !== 'side') gunungan.startBedhol(sfx);
    } else if (val === 'hidden') {
      gunungan.state = 'hidden';
    }
  });
}

function toggleGunungan() {
  gunungan.toggle(sfx);
  const isOpening = gunungan.state === 'opening' || gunungan.state === 'side';
  showToast(isOpening ? 'Bedhol Kayon · Panggung Terbuka' : 'Tancep Kayon · Panggung Tertutup');
  syncGununganUi();
}

if (bedholBtn) bedholBtn.addEventListener('click', toggleGunungan);

function setAtmosphere(mode, toast = true) {
  if (!ATMOSPHERE_PRESETS[mode]) return;
  currentAtmosphere = mode;
  try { localStorage.setItem('wayang.atmosphere', mode); } catch {}
  const sel = $('opt-atmosphere');
  if (sel && sel.value !== mode) sel.value = mode;
  if (toast) {
    showToast(`Suasana Kelir · ${ATMOSPHERE_PRESETS[mode].name} (${ATMOSPHERE_PRESETS[mode].desc})`);
  }
}

function cycleAtmosphere() {
  const order = ['classic', 'war', 'mystic'];
  const idx = order.indexOf(currentAtmosphere);
  const next = order[(idx + 1) % order.length];
  setAtmosphere(next, true);
}

function triggerKasekten(side = 'left') {
  const p = side === 'right' ? puppets[1] : puppets[0];
  if (!p) return;
  const originX = p.pos.x + (p.facing > 0 ? -120 : 120);
  const originY = p.pos.y - 140;
  sfx.playKasekten(p.character);
  particles.emitKasekten(p.character, originX, originY, p.facing);
  screenShake = Math.max(screenShake, 14);
  lampFlash = 1.45;

  const names = {
    arjuna: 'Aji-Aji · Pasopati Murca (Panah Sakti)!',
    bima: 'Aji-Aji · Kuku Pancanaka & Gada Rujakpala!',
    rahwana: 'Aji-Aji · Pancasona Angkara Murka!',
  };
  showToast(names[p.character] || 'Aji-Aji Kasekten!');
}

const atmosphereToggleBtn = $('atmosphere-toggle');
if (atmosphereToggleBtn) atmosphereToggleBtn.addEventListener('click', cycleAtmosphere);

const optAtmosphereSelect = $('opt-atmosphere');
if (optAtmosphereSelect) {
  optAtmosphereSelect.value = currentAtmosphere;
  optAtmosphereSelect.addEventListener('change', (e) => setAtmosphere(e.target.value));
}

const kasektenToggleBtn = $('kasekten-toggle');
if (kasektenToggleBtn) kasektenToggleBtn.addEventListener('click', () => triggerKasekten('left'));

const optKasektenBtn = $('opt-kasekten');
if (optKasektenBtn) optKasektenBtn.addEventListener('click', () => triggerKasekten('left'));

// F / G turn the left / right character around (switches facing to manual so it sticks)
function turnPuppet(i) {
  if (i >= controller.puppetCount) return;
  if (facingMode !== 'manual') {
    facingMode = 'manual';
    $('opt-facing').value = 'manual';
    applyFacing();
  }
  puppets[i].turn();
}

addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  const k = (e.key || '').toLowerCase();
  const c = (e.code || '').toLowerCase();
  const isKey = (char) => k === char || c === 'key' + char;

  if (isKey('f')) turnPuppet(0);
  else if (isKey('g')) turnPuppet(1);
  else if (isKey('j')) triggerKasekten('left');
  else if (isKey('l')) triggerKasekten('right');
  else if (isKey('b')) cycleAtmosphere();
  else if (isKey('q')) {
    controller.manualTilt = clamp((controller.manualTilt || 0) - 0.15, -0.75, 0.75);
    showToast(`Kemiringan Badan: ${Math.round((controller.manualTilt || 0) * 180 / Math.PI)}°`);
  } else if (isKey('e')) {
    controller.manualTilt = clamp((controller.manualTilt || 0) + 0.15, -0.75, 0.75);
    showToast(`Kemiringan Badan: ${Math.round((controller.manualTilt || 0) * 180 / Math.PI)}°`);
  } else if (isKey('w')) {
    controller.manualTilt = 0;
    showToast('Kemiringan Badan: Tegak (0°)');
  } else if (isKey('h')) document.body.classList.toggle('ui-hidden');
  else if (isKey('m')) toggleMusic();
  else if (isKey('d')) controller.requestDance();
  else if (isKey('c')) controller.recalibrate();
  else if (isKey('p')) toggleCameraWindow();
  else if (isKey('v')) {
    $('opt-camera').checked = !$('opt-camera').checked;
    $('opt-camera').dispatchEvent(new Event('change'));
  } else if (isKey('k')) {
    toggleGunungan();
  } else if (isKey('r')) {
    toggleRecording();
  } else if (isKey('z')) {
    sfx.playCempala({ velocity: 0.95 });
    showToast('Cempala · Thok!');
  } else if (isKey('x')) {
    sfx.playKecrek({ velocity: 0.95, crash: true });
    showToast('Kecrek · Crek!');
  }
});

const toast = $('toast');
let toastTimer = 0;
function showToast(text) {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function updateHud() {
  const { source, status } = controller;
  let text, cls = '';
  if (source === 'camera') {
    if (status.hands === 0) {
      text = controller.isAutoMoving
        ? 'Wayang menari mengikuti gamelan · Angkat tangan untuk mendalang'
        : (controller.puppetCount === 2 ? 'Kamera aktif · angkat kedua tangan' : 'Kamera aktif · tunjukkan tangan');
      cls = controller.isAutoMoving ? 'live' : 'warn';
    } else {
      text = {
        'two puppets': status.hands === 2 ? 'Dua wayang · satu per tangan' : 'Dua wayang · 1 tangan terdeteksi',
        'two hands': 'Satu wayang · gapit + tuding',
        'one hand': 'Satu wayang · telapak + jari',
      }[status.mode] ?? status.mode;
      if (controller.isAutoMoving) text += ' · gerak gamelan aktif';
      if (status.calibrating) text += ' · mengkalibrasi jarak';
      cls = 'live';
    }
  } else if (source === 'mouse') {
    text = controller.isAutoMoving
      ? 'Wayang menari mengikuti gamelan · Gerakkan mouse untuk mendalang'
      : 'Mouse · gulir untuk mengatur jarak';
  } else {
    text = 'Demo';
  }
  if (statusText.textContent !== text) statusText.textContent = text;
  statusPill.className = `pill ${cls}`;
}

// Mirrored camera frame plus the hand-tracking overlay, into any 2D context (the corner preview or
// the pop-out window's canvas). Strokes grow with the canvas so they stay legible when large.
function drawCamera(ctx, W, H) {
  const s = Math.max(1, W / 480);
  ctx.save();
  ctx.translate(W, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, W, H);
  ctx.restore();
  ctx.fillStyle = 'rgba(20,10,4,0.35)';
  ctx.fillRect(0, 0, W, H);
  controller.slots.forEach((slot, i) => {
    if (!slot.active || !slot.landmarks) return;
    const P = slot.landmarks.map((l) => [(1 - l.x) * W, l.y * H]);
    // two puppets: gold = left character, blue = right; one puppet: gold = body hand
    const isBody = controller.puppetCount === 2 ? true : i === controller.bodySlot;
    const gold = controller.puppetCount === 2 ? slot.role !== 1 : isBody;
    ctx.strokeStyle = gold ? 'rgba(242,199,107,0.9)' : 'rgba(150,210,255,0.9)';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    for (const [a, b] of HAND_EDGES) {
      ctx.moveTo(...P[a]);
      ctx.lineTo(...P[b]);
    }
    ctx.stroke();
    const pair = ({
      'thumb-index': [4, 8],
      'index-middle': [8, 12],
      'thumb-pinky': [4, 20],
      'index-pinky': [8, 20],
    })[controller.settings.fingers] || [4, 8];
    ctx.fillStyle = '#ff6b4a';
    for (const t of pair) {
      ctx.beginPath();
      ctx.arc(...P[t], 4 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    if (slot.pinky) {
      // little-finger sign recognised
      ctx.strokeStyle = '#ffe28a';
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath();
      ctx.arc(...P[20], 8 * s, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (isBody) {
      const c = [0, 5, 9, 13, 17].reduce((acc, j) => [acc[0] + P[j][0] / 5, acc[1] + P[j][1] / 5], [0, 0]);
      ctx.strokeStyle = gold ? '#f2c76b' : '#96d2ff';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.arc(...c, 9 * s, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

// used by the pop-out window (camera.html)
const cameraReady = () => controller.source === 'camera' && video.readyState >= 2;
Object.assign(window.wayang, {
  drawCamera,
  cameraReady,
  // the pop-out re-attaches itself if this page reloads while it stays open
  attachCameraWindow(win) {
    cameraWin = win;
    syncPreview();
  },
  cameraWindow: () => cameraWin,
});

let wasPoppedOut = false;
function drawPreview() {
  const out = cameraPoppedOut();
  if (out !== wasPoppedOut) {
    wasPoppedOut = out;
    syncPreview();
  }
  if (!previewBox.hidden && cameraReady()) drawCamera(pctx, preview.width, preview.height);
}

// ---------- loop ----------
let last = performance.now() / 1000;
const PHYS_DT = 1 / 120;
let screenShake = 0;
let lastSpeedSfxTime = 0;
let lastTancepSfxTime = 0;
let lastClashTime = 0;
const lastDanceBeat = [0, 0];

function tick(nowMs) {
  const t = nowMs / 1000;
  const dt = clamp(t - last, 0, 1 / 15);
  last = t;

  // Advance gamelan beat clock first so controller can synchronize auto-rhythm to the music
  const beat = beatClock.tick(dt);
  const inputs = controller.update(t, view, beat, puppets);
  const active = puppets.slice(0, controller.puppetCount);
  // in "face each other" mode each character keeps its eyes on the other
  if (active.length === 2) {
    active[0].faceTargetX = active[1].pos.x;
    active[1].faceTargetX = active[0].pos.x;
  }
  // the dance follows the gamelan's beat (wirama)
  const steps = Math.max(1, Math.ceil(dt / PHYS_DT));
  const rhythm = { db: beat.db / steps, pos: beat.pos, period: beat.period };
  for (let i = 0; i < steps; i++) {
    active.forEach((p, j) => p.update(dt / steps, i === 0 ? inputs[j] ?? { active: false } : { ...(inputs[j] ?? { active: false }), danceTrigger: false }, view, rhythm));
  }
  active.forEach((p, j) => {
    if (p.danceStarted) {
      p.danceStarted = false;
      const charName = p.character === 'bima' ? 'Bima' : 'Arjuna';
      showToast(active.length === 2 ? `${j === 0 ? 'Kiri' : 'Kanan'} (${charName}) · Kiprahan` : `${charName} · Kiprahan`);
    }
    if (p.turnStarted) {
      p.turnStarted = false;
      if (sfx.auto) sfx.playKecrek({ velocity: 0.8, rattleCount: 2 });
      if (facingMode !== 'manual') {
        facingMode = 'manual';
        if ($('opt-facing')) $('opt-facing').value = 'manual';
      }
      const charName = p.character === 'bima' ? 'Raden Bima' : 'Raden Arjuna';
      const dirText = p.facing === 1 ? 'Hadap Kiri' : 'Hadap Kanan';
      showToast(active.length === 2 ? `${j === 0 ? 'Kiri' : 'Kanan'} (${charName}) · Balik Arah (${dirText})` : `${charName} · Balik Arah (${dirText})`);
    }
  });

  if (sfx.auto) {
    active.forEach((p, j) => {
      // 1. Sabetan / Fast whipping movements trigger kecrek
      const speed = Math.hypot(p.pos.vx, p.pos.vy);
      const armWhipL = Math.abs(p.arms.L.rotF.v) + Math.abs(p.arms.L.rotH.v);
      const armWhipR = Math.abs(p.arms.R.rotF.v) + Math.abs(p.arms.R.rotH.v);
      const armWhip = Math.max(armWhipL, armWhipR);

      if ((speed > 580 || armWhip > 36) && nowMs - lastSpeedSfxTime > 220) {
        const vel = clamp(Math.max(speed / 850, armWhip / 55), 0.35, 0.85);
        sfx.playKecrek({ velocity: vel, rattleCount: 2 });
        lastSpeedSfxTime = nowMs;
      }

      // 2. Tancep / Heavy downward drop to the ground triggers cempala
      if (p.pos.vy > 420 && p.pos.y > view.y + view.h * 0.68 && nowMs - lastTancepSfxTime > 340) {
        sfx.playCempala({ velocity: 0.85, isTancep: true });
        lastTancepSfxTime = nowMs;
      }

      // 3. Kiprahan choreography accents
      if (p.dance) {
        const db = p.dance.b;
        const prevB = lastDanceBeat[j] ?? db;
        const crossed = (beatTarget) => prevB < beatTarget && db >= beatTarget;
        if (crossed(0)) {
          sfx.playCempala({ velocity: 0.6 });
        } else if (crossed(4) || crossed(5) || crossed(6) || crossed(7)) {
          sfx.playKecrek({ velocity: 0.7, rattleCount: 2 });
        } else if (crossed(14)) {
          sfx.playKecrek({ velocity: 0.85, crash: true });
        } else if (crossed(17.33)) {
          sfx.playKecrek({ velocity: 1.0, crash: true });
          sfx.playCempala({ velocity: 0.85 });
          screenShake = 7;
        } else if (crossed(18.33)) {
          sfx.playCempala({ velocity: 1.1, isTancep: true });
          screenShake = 9;
        }
        lastDanceBeat[j] = db;
      } else {
        lastDanceBeat[j] = 0;
      }
    });

    // 4. Two-puppet clash / collision with sparks & shockwaves
    if (active.length === 2) {
      const dx = active[1].pos.x - active[0].pos.x;
      const dy = Math.abs(active[1].pos.y - active[0].pos.y);
      if (Math.abs(dx) < 220 && dy < 240) {
        const relVx = active[0].pos.vx - active[1].pos.vx;
        if (relVx > 180 && nowMs - lastClashTime > 320) {
          const clashVel = clamp(relVx / 600, 0.5, 1.2);
          const hasRahwana = active[0].character === 'rahwana' || active[1].character === 'rahwana';
          sfx.playClash({ velocity: clashVel, hasRahwana });

          // Clash sparks & shockwave particles
          const clashX = (active[0].pos.x + active[1].pos.x) * 0.5;
          const clashY = (active[0].pos.y + active[1].pos.y) * 0.5 - 120;
          particles.emitClash(clashX, clashY, active[0].character, active[1].character, clashVel);

          // Physics pushback
          if (active[0].pos.impulse) {
            active[0].pos.impulse(-160 * clashVel, 0);
            active[1].pos.impulse(160 * clashVel, 0);
          } else if (active[0].pos.sx) {
            active[0].pos.sx.v -= 160 * clashVel;
            active[1].pos.sx.v += 160 * clashVel;
          }
          screenShake = Math.min(14, 5 + relVx * 0.015);
          lampFlash = 1.25;
          lastClashTime = nowMs;
          const name0 = active[0].character === 'bima' ? 'Bima' : active[0].character === 'rahwana' ? 'Rahwana' : 'Arjuna';
          const name1 = active[1].character === 'bima' ? 'Bima' : active[1].character === 'rahwana' ? 'Rahwana' : 'Arjuna';
          showToast(`Sabetan · ${name0} vs ${name1}!`);
        }
      }
    }
  }

  // Update particles (sparks, auras, atmospheric embers)
  particles.update(dt, view, currentAtmosphere);

  // Smoothly blend atmosphere lighting parameters
  const targetAtm = ATMOSPHERE_PRESETS[currentAtmosphere] || ATMOSPHERE_PRESETS.classic;
  const blendK = 1 - Math.pow(0.01, dt);
  for (let i = 0; i < 3; i++) {
    curLampColor[i] += (targetAtm.lampColor[i] - curLampColor[i]) * blendK;
    curAmbient[i] += (targetAtm.ambient[i] - curAmbient[i]) * blendK;
    curBgTint[i] += (targetAtm.bgTint[i] - curBgTint[i]) * blendK;
    curGlowTint[i] += (targetAtm.glowTint[i] - curGlowTint[i]) * blendK;
    curSmokeTint[i] += (targetAtm.smokeTint[i] - curSmokeTint[i]) * blendK;
  }
  lampFlash = 1 + (lampFlash - 1) * Math.pow(0.001, dt);

  // Visual screen shake from clashes or tancep impacts
  let shakeX = 0, shakeY = 0;
  if (screenShake > 0.05) {
    shakeX = (Math.random() - 0.5) * screenShake * 2;
    shakeY = (Math.random() - 0.5) * screenShake * 1.4;
    screenShake *= Math.pow(0.005, dt);
  }
  const renderView = {
    x: view.x + shakeX,
    y: view.y + shakeY,
    w: view.w,
    h: view.h,
  };

  // update gunungan (sacred cosmic mountain)
  gunungan.update(dt, view, sfx);

  // back-to-front: the puppet held nearer the lamp is in front and casts the softer shadow
  const puppetLayers = active
    .map((p) => {
      const depth = Math.max(0, p.depth.x);
      return {
        depth: p.depth.x,
        items: p.frame(view),
        shadow: {
          scale: 1.03 + 0.2 * depth,
          dy: 8 + 34 * depth,
          blur: 3 + 30 * clamp(p.depth.x + 0.08, 0, 1.2),
          strength: 0.8 - 0.22 * clamp(depth, 0, 1),
        },
      };
    });

  const gununganItems = gunungan.frame(view);
  const gununganLayer = gununganItems.length > 0 ? [{
    depth: gunungan.depth.x - 0.02,
    items: gununganItems,
    shadow: {
      scale: 1.02 + 0.18 * gunungan.depth.x,
      dy: 6 + 28 * gunungan.depth.x,
      blur: 2 + 25 * clamp(gunungan.depth.x + 0.05, 0, 1.2),
      strength: 0.82,
    },
  }] : [];

  const layers = [...puppetLayers, ...gununganLayer].sort((a, b) => a.depth - b.depth);

  // blencong: an oil flame — flicker, and a slow sway that nudges every shadow
  const flicker = 1 + 0.03 * Math.sin(t * 7.3) + 0.02 * Math.sin(t * 13.7 + 1.1) + (noise1(t * 6.5) - 0.5) * 0.07;
  const sway = (noise1(t * 1.2 + 10) - 0.5) * 26;

  const pBuf = particles.fillBuffer(renderView);

  const frame = {
    view: renderView,
    layers,
    time: t,
    lamp: [STAGE_W / 2 + sway, -560, 1300],
    eye: [STAGE_W / 2, STAGE_H * 0.55, 2300],
    lampColor: curLampColor,
    ambient: curAmbient,
    moodBgTint: curBgTint,
    moodGlowTint: curGlowTint,
    moodSmokeTint: curSmokeTint,
    intensity: 1.08 * flicker * lampFlash,
    flicker,
    hot: [STAGE_W / 2 + sway * 0.7, 440],
    particles: pBuf,
    particleCount: particles.count,
  };
  renderer.render(frame);
  window.wayang.lastFrame = frame;

  drawPreview();
  updateHud();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
