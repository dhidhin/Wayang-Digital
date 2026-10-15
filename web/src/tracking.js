const MP_VERSION = '1.0.1';
const MP_BASE = new URL('../vendor/mediapipe/', import.meta.url).href.replace(/\/$/, '');
const MODEL_URL = new URL('../hand_landmarker.task', import.meta.url).href;

export class HandTracker {
  constructor(video) {
    this.video = video;
    this.landmarker = null;
    this.ready = false;
    this.lastVideoTime = -1;
    this.lastTs = 0;
    this.delegate = null;
  }

  async start(onStatus = () => {}) {
    onStatus('Meminta izin kamera…');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } },
      audio: false,
    });
    this.video.srcObject = stream;
    await this.video.play();

    onStatus('Memuat pelacak gerakan tangan…');
    const { FilesetResolver, HandLandmarker } = await import(/* @vite-ignore */ `${MP_BASE}/vision_bundle.mjs`);
    const fileset = await FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
    const options = (delegate) => ({
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.55,
      minTrackingConfidence: 0.5,
    });
    try {
      this.landmarker = await HandLandmarker.createFromOptions(fileset, options('GPU'));
      this.delegate = 'GPU';
    } catch (err) {
      console.warn('GPU delegate unavailable, falling back to CPU', err);
      this.landmarker = await HandLandmarker.createFromOptions(fileset, options('CPU'));
      this.delegate = 'CPU';
    }
    this.ready = true;
  }

  get aspect() {
    return this.video.videoWidth / Math.max(1, this.video.videoHeight) || 16 / 9;
  }

  // Returns a fresh result only when the camera produced a new frame.
  detect() {
    if (!this.ready || this.video.readyState < 2) return null;
    if (this.video.currentTime === this.lastVideoTime) return null;
    this.lastVideoTime = this.video.currentTime;
    const ts = Math.max(performance.now(), this.lastTs + 1);
    this.lastTs = ts;
    const result = this.landmarker.detectForVideo(this.video, ts);
    return { result, ts };
  }
}
