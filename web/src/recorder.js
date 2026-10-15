// Performance Recorder (MediaRecorder API):
// Captures 60fps WebGL stage video and mixed audio (Gamelan music + live Dalang SFX percussion)
// allowing the dalang to record, preview, and download their performances offline.

export class PerformanceRecorder {
  constructor(canvas, sfx, music) {
    this.canvas = canvas;
    this.sfx = sfx;
    this.music = music;

    this.mediaRecorder = null;
    this.chunks = [];
    this.recording = false;
    this.startTime = 0;
    this.timerId = null;
    this.elapsedSeconds = 0;
    this.lastResult = null; // { blob, url, duration, size, mimeType }

    this.onStart = () => {};
    this.onTick = () => {};
    this.onStop = () => {};
    this.onError = () => {};
  }

  static getSupportedMimeType() {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4',
    ];
    for (const type of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }

  static formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  static formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  get isRecording() {
    return this.recording;
  }

  async start() {
    if (this.recording) return;

    if (typeof MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder API tidak didukung di browser ini.');
    }

    // Ensure audio context is alive and music is routed
    this.sfx.initContext();
    if (this.music?.el) {
      this.sfx.connectMusic(this.music.el);
    }

    // 1. Capture 60fps video stream from WebGL canvas
    const videoStream = this.canvas.captureStream(60);
    const videoTracks = videoStream.getVideoTracks();
    if (videoTracks.length === 0) {
      throw new Error('Gagal merekam video dari canvas panggung.');
    }

    // 2. Capture mixed audio stream (SFX + Music)
    const audioDest = this.sfx.getDestinationStream();
    const audioTracks = audioDest ? audioDest.stream.getAudioTracks() : [];

    // Combine tracks into single stream
    const combinedStream = new MediaStream([...videoTracks, ...audioTracks]);

    const mimeType = PerformanceRecorder.getSupportedMimeType();
    const options = {
      videoBitsPerSecond: 4500000, // 4.5 Mbps for crisp HD visuals
      audioBitsPerSecond: 160000,  // 160 kbps for high fidelity gamelan & sfx
    };
    if (mimeType) options.mimeType = mimeType;

    try {
      this.mediaRecorder = new MediaRecorder(combinedStream, options);
    } catch {
      // Fallback without bitrate hints
      this.mediaRecorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : undefined);
    }

    this.chunks = [];
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.stopTimer();
      const duration = this.elapsedSeconds;
      const actualType = this.mediaRecorder.mimeType || mimeType || 'video/webm';
      const blob = new Blob(this.chunks, { type: actualType });
      if (this.lastResult?.url) {
        URL.revokeObjectURL(this.lastResult.url);
      }
      const url = URL.createObjectURL(blob);

      // Clean up recording tracks
      combinedStream.getTracks().forEach((track) => track.stop());

      this.lastResult = {
        blob,
        url,
        duration,
        size: blob.size,
        mimeType: actualType,
      };

      this.recording = false;
      this.onStop(this.lastResult);
    };

    this.mediaRecorder.onerror = (e) => {
      this.recording = false;
      this.stopTimer();
      this.onError(e);
    };

    // Request data every 250ms to ensure buffer safety
    this.mediaRecorder.start(250);
    this.recording = true;
    this.startTime = performance.now();
    this.elapsedSeconds = 0;
    this.startTimer();
    this.onStart();
  }

  stop() {
    if (!this.recording || !this.mediaRecorder) return;
    if (this.mediaRecorder.state !== 'inactive') {
      try {
        if (this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.requestData();
        }
      } catch {}
      this.mediaRecorder.stop();
    }
  }

  startTimer() {
    this.stopTimer();
    this.timerId = setInterval(() => {
      this.elapsedSeconds = (performance.now() - this.startTime) / 1000;
      this.onTick(PerformanceRecorder.formatTime(this.elapsedSeconds), this.elapsedSeconds);
    }, 200);
  }

  stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  download(filename) {
    if (!this.lastResult?.url) return;
    const ext = this.lastResult.mimeType.includes('mp4') ? 'mp4' : 'webm';
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const name = filename || `wayang-digital-pertunjukan_${ts}.${ext}`;

    const a = document.createElement('a');
    a.href = this.lastResult.url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 100);
  }
}
