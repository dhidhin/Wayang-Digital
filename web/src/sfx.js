// Web Audio API procedural synthesis for Wayang Dalang percussion:
// 1. Cempala: hard wooden mallet struck against the wooden chest (kothak) — deep woody "thok!" with transient click.
// 2. Kecrek / Kepyak: stacked bronze/iron plates rattle — metallic inharmonic clatter with micro-rebounds.
// 3. Clash: heavy impact combining both instruments with visual screen shake.

import { clamp } from './math.js';

const STORE_KEY = 'wayang.sfx';

export class DalangSfx {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.noiseBuffer = null;

    const saved = this.load();
    this.volume = saved.volume ?? 0.75;
    this.auto = saved.auto ?? true;
    this.muted = false;

    // Cooldown timers to prevent rapid machine-gunning
    this.lastKecrek = 0;
    this.lastCempala = 0;
    this.lastClash = 0;
  }

  load() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch {
      return {};
    }
  }

  save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ volume: this.volume, auto: this.auto }));
    } catch {
      /* private mode */
    }
  }

  initContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Pre-create 1 second of white noise for fast percussion transients
    const bufferSize = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.streamDest = null;
    this.musicSource = null;
  }

  getDestinationStream() {
    this.initContext();
    if (!this.streamDest && this.ctx) {
      this.streamDest = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.streamDest);
      if (this.musicSource) {
        this.musicSource.connect(this.streamDest);
      }
    }
    return this.streamDest;
  }

  connectMusic(musicEl) {
    this.initContext();
    if (!this.musicSource && musicEl && this.ctx) {
      try {
        this.musicSource = this.ctx.createMediaElementSource(musicEl);
        this.musicSource.connect(this.ctx.destination);
        if (this.streamDest) {
          this.musicSource.connect(this.streamDest);
        }
      } catch (err) {
        console.warn('Could not connect music element to AudioContext:', err);
      }
    }
  }

  setVolume(v) {
    this.volume = clamp(v, 0, 1);
    this.save();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  // ----------------------------------------------------
  // CEMAPALA (Wooden knock / kothak percussion)
  // ----------------------------------------------------
  playCempala({ velocity = 0.8, pitch = 1.0, isTancep = false } = {}) {
    this.initContext();
    if (!this.ctx || this.volume <= 0.01 || this.muted) return;

    const t = this.ctx.currentTime;
    const v = clamp(velocity, 0.1, 1.2);

    // Jitter pitch subtly for natural variety (±4%)
    const p = pitch * (0.96 + Math.random() * 0.08);

    // 1. High transient click (wood surface snap)
    const clickSource = this.ctx.createBufferSource();
    clickSource.buffer = this.noiseBuffer;
    const clickFilter = this.ctx.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.setValueAtTime(isTancep ? 1400 : 2200, t);
    clickFilter.Q.setValueAtTime(3.0, t);

    const clickGain = this.ctx.createGain();
    clickGain.gain.setValueAtTime(0.7 * v, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.016);

    clickSource.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(this.masterGain);
    clickSource.start(t);
    clickSource.stop(t + 0.02);

    // 2. Resonant wooden body tone with pitch-drop envelope (dalang's "thok!")
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    const startFreq = (isTancep ? 360 : 440) * p;
    const endFreq = (isTancep ? 180 : 250) * p;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.038);

    const oscFilter = this.ctx.createBiquadFilter();
    oscFilter.type = 'lowpass';
    oscFilter.frequency.setValueAtTime(800 * p, t);

    const oscGain = this.ctx.createGain();
    const oscDur = isTancep ? 0.16 : 0.11;
    oscGain.gain.setValueAtTime(0.9 * v, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + oscDur);

    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + oscDur + 0.01);

    // 3. Hollow box (kothak) cavity resonance
    const cavity = this.ctx.createOscillator();
    cavity.type = 'sine';
    const cavityFreq = (isTancep ? 130 : 165) * p;
    cavity.frequency.setValueAtTime(cavityFreq, t);

    const cavityGain = this.ctx.createGain();
    const cavityDur = isTancep ? 0.22 : 0.15;
    cavityGain.gain.setValueAtTime(0.55 * v, t);
    cavityGain.gain.exponentialRampToValueAtTime(0.001, t + cavityDur);

    cavity.connect(cavityGain);
    cavityGain.connect(this.masterGain);
    cavity.start(t);
    cavity.stop(t + cavityDur + 0.01);
  }

  // ----------------------------------------------------
  // KECREK / KEPYAK (Stacked metallic plates rattle)
  // ----------------------------------------------------
  playKecrek({ velocity = 0.7, crash = false, rattleCount = 3 } = {}) {
    this.initContext();
    if (!this.ctx || this.volume <= 0.01 || this.muted) return;

    const t = this.ctx.currentTime;
    const v = clamp(velocity, 0.1, 1.2);
    const count = crash ? 4 : Math.min(rattleCount, 4);

    // Multiple metallic plate resonant frequencies
    const centerFreqs = [1350, 2600, 4200, 6800, 9200];

    // Trigger cluster of micro-rebounds spaced 12-24ms apart ("ch-ch-chak!")
    for (let i = 0; i < count; i++) {
      const delay = i === 0 ? 0 : 0.014 * i + (Math.random() - 0.5) * 0.004;
      const strikeTime = t + delay;
      const decay = crash ? 0.18 - i * 0.025 : 0.09 - i * 0.015;
      const strikeAmp = (1 - i * 0.22) * v * (crash ? 1.0 : 0.75);

      // Noise through parallel bandpass filters for authentic metallic timbre
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      const f = centerFreqs[i % centerFreqs.length] * (0.94 + Math.random() * 0.12);
      filter.frequency.setValueAtTime(f, strikeTime);
      filter.Q.setValueAtTime(crash ? 6.5 : 4.5, strikeTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(strikeAmp, strikeTime);
      gain.gain.exponentialRampToValueAtTime(0.001, strikeTime + Math.max(0.02, decay));

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(strikeTime);
      noise.stop(strikeTime + decay + 0.01);

      // High sizzling overtone (plate edges brushing)
      if (i === 0) {
        const sizzle = this.ctx.createBufferSource();
        sizzle.buffer = this.noiseBuffer;
        const sFilter = this.ctx.createBiquadFilter();
        sFilter.type = 'highpass';
        sFilter.frequency.setValueAtTime(6500, strikeTime);

        const sGain = this.ctx.createGain();
        const sDur = crash ? 0.22 : 0.12;
        sGain.gain.setValueAtTime(0.45 * v, strikeTime);
        sGain.gain.exponentialRampToValueAtTime(0.001, strikeTime + sDur);

        sizzle.connect(sFilter);
        sFilter.connect(sGain);
        sGain.connect(this.masterGain);
        sizzle.start(strikeTime);
        sizzle.stop(strikeTime + sDur + 0.01);
      }
    }
  }

  // ----------------------------------------------------
  // CLASH (Benturan tanding dua wayang)
  // ----------------------------------------------------
  playClash({ velocity = 1.0, hasRahwana = false } = {}) {
    const v = clamp(velocity, 0.4, 1.2);
    this.playCempala({ velocity: v * 1.1, isTancep: true });
    this.playKecrek({ velocity: v * 1.15, crash: true, rattleCount: 4 });
    if (hasRahwana && v > 0.75) {
      this.playRahwanaRoar({ intensity: v * 0.75, isLaugh: false });
    }
  }

  // ----------------------------------------------------
  // RAHWANA ROAR / DEMONIC LAUGH ("Wahahaha!")
  // ----------------------------------------------------
  playRahwanaRoar({ intensity = 1.0, isLaugh = true } = {}) {
    this.initContext();
    if (!this.ctx || this.volume <= 0.01 || this.muted) return;

    const t = this.ctx.currentTime;
    const v = clamp(intensity, 0.3, 1.2);
    const pulses = isLaugh ? 4 : 1;

    for (let i = 0; i < pulses; i++) {
      const strikeTime = t + (isLaugh ? i * 0.16 : 0);
      const dur = isLaugh ? 0.14 : 0.24;
      const decayK = isLaugh ? (1.0 - i * 0.14) : 1.0;

      // 1. Sawtooth vocal cord oscillator
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      const startF = (isLaugh ? 116 - i * 7 : 95) * (0.95 + Math.random() * 0.08);
      osc.frequency.setValueAtTime(startF, strikeTime);
      osc.frequency.exponentialRampToValueAtTime(startF * 0.78, strikeTime + dur);

      // 2. Sub-bass chest resonance
      const sub = this.ctx.createOscillator();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(startF * 0.5, strikeTime);

      // 3. Formant filter for guttural "AARGH / HAH" vowel
      const formant = this.ctx.createBiquadFilter();
      formant.type = 'bandpass';
      formant.frequency.setValueAtTime(680, strikeTime);
      formant.Q.setValueAtTime(3.8, strikeTime);

      // 4. Tremolo / Guttural throat flutter
      const tremolo = this.ctx.createOscillator();
      tremolo.type = 'sine';
      tremolo.frequency.setValueAtTime(32, strikeTime); // 32 Hz flutter

      const tremGain = this.ctx.createGain();
      tremGain.gain.setValueAtTime(0.35, strikeTime);

      const voiceGain = this.ctx.createGain();
      voiceGain.gain.setValueAtTime(0.001, strikeTime);
      voiceGain.gain.linearRampToValueAtTime(0.85 * v * decayK, strikeTime + 0.03);
      voiceGain.gain.exponentialRampToValueAtTime(0.001, strikeTime + dur);

      osc.connect(formant);
      sub.connect(formant);
      formant.connect(voiceGain);
      voiceGain.connect(this.masterGain);

      osc.start(strikeTime);
      sub.start(strikeTime);
      osc.stop(strikeTime + dur + 0.02);
      sub.stop(strikeTime + dur + 0.02);
    }
  }

  // ----------------------------------------------------
  // KASEKTEN / AJI-AJI PUSAKA SAKTI
  // ----------------------------------------------------
  playKasekten(character = 'arjuna') {
    this.initContext();
    if (!this.ctx || this.volume <= 0.01 || this.muted) return;

    const t = this.ctx.currentTime;

    if (character === 'arjuna') {
      // Pusaka Panah Pasopati: Sacred upward pitch sweep + shimmering chime
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(1650, t + 0.22);
      osc.frequency.exponentialRampToValueAtTime(1100, t + 0.85);

      const chime = this.ctx.createOscillator();
      chime.type = 'triangle';
      chime.frequency.setValueAtTime(760, t);
      chime.frequency.exponentialRampToValueAtTime(3300, t + 0.22);
      chime.frequency.exponentialRampToValueAtTime(2200, t + 0.85);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.7, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);

      osc.connect(gain);
      chime.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      chime.start(t);
      osc.stop(t + 1.0);
      chime.stop(t + 1.0);

      // Wind whoosh transient
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(800, t);
      f.frequency.exponentialRampToValueAtTime(4500, t + 0.35);
      f.Q.setValueAtTime(4.0, t);

      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.55, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      noise.connect(f);
      f.connect(ng);
      ng.connect(this.masterGain);
      noise.start(t);
      noise.stop(t + 0.5);

    } else if (character === 'bima') {
      // Kuku Pancanaka & Gada Rujakpala: Heavy thunderclap + deep earth-shaking sub drop
      const sub = this.ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(180, t);
      sub.frequency.exponentialRampToValueAtTime(38, t + 0.65);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(1.1, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

      sub.connect(subGain);
      subGain.connect(this.masterGain);
      sub.start(t);
      sub.stop(t + 0.75);

      // Lightning crackle transient
      this.playKecrek({ velocity: 1.2, crash: true, rattleCount: 4 });
      this.playCempala({ velocity: 1.25, isTancep: true });

    } else if (character === 'rahwana') {
      // Aji Pancasona: Infernal flame explosion + menacing demonic roar laugh
      const roar = this.ctx.createOscillator();
      roar.type = 'sawtooth';
      roar.frequency.setValueAtTime(85, t);
      roar.frequency.linearRampToValueAtTime(130, t + 0.25);
      roar.frequency.exponentialRampToValueAtTime(60, t + 0.85);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.85, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

      roar.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      roar.start(t);
      roar.stop(t + 0.9);

      // Demonic laugh trailing right behind the fire explosion
      setTimeout(() => {
        this.playRahwanaRoar({ intensity: 1.15, isLaugh: true });
      }, 180);
    }
  }
}

