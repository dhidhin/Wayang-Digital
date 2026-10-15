// Interactive Particle System for Wayang Digital (Fase 5: Kasekten & Sabetan Sparks)
// Produces high-performance GPU-friendly particles for:
// 1. Clash sparks & shockwaves (benturan senjata/tangan saat sabetan)
// 2. Kasekten / Aji-Aji (Pasopati Arjuna, Pancanaka Bima, Pancasona Rahwana)
// 3. Atmospheric embers (bara api perang Baratayuda) & moonlight dust (wengi tirakat)

import { clamp } from './math.js';

export const PARTICLE_TYPE = {
  SPARK: 0.0,     // Bright glowing radial spark
  RING: 1.0,      // Expanding shockwave ring
  FLAME: 2.0,     // Soft swirling flame / ember / smoke puff
};

export class ParticleSystem {
  constructor(maxParticles = 600) {
    this.maxParticles = maxParticles;
    this.particles = [];
    // Float buffer: 8 floats per particle: [x, y, r, g, b, a, size, type]
    this.buffer = new Float32Array(maxParticles * 8);
    this.count = 0;
    this.ambientTimer = 0;
  }

  add(p) {
    if (this.particles.length >= this.maxParticles) {
      // Overwrite oldest non-essential particle
      this.particles.shift();
    }
    this.particles.push(p);
  }

  // ----------------------------------------------------
  // CLASH SPARKS (Benturan dua wayang saat sabetan)
  // ----------------------------------------------------
  emitClash(x, y, char0 = 'arjuna', char1 = 'bima', strength = 1.0) {
    const s = clamp(strength, 0.4, 2.0);
    const numSparks = Math.floor((28 + Math.random() * 20) * s);

    // Color palette based on clashing characters
    const getColor = (c) => {
      if (c === 'rahwana') return [2.2, 0.5, 0.15]; // Demonic crimson
      if (c === 'bima') return [0.5, 1.6, 2.4];    // Electric plasma cyan
      return [2.2, 1.8, 0.4];                       // Holy gold / amber
    };
    const col0 = getColor(char0);
    const col1 = getColor(char1);

    for (let i = 0; i < numSparks; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (240 + Math.random() * 850) * s;
      const baseCol = Math.random() < 0.5 ? col0 : col1;
      const jitter = (Math.random() - 0.5) * 0.2;

      this.add({
        type: PARTICLE_TYPE.SPARK,
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80, // Upward blast
        drag: 0.965,
        gravity: 340,
        r: Math.max(0.2, baseCol[0] + jitter),
        g: Math.max(0.2, baseCol[1] + jitter),
        b: Math.max(0.1, baseCol[2] + jitter),
        a: 1.0,
        size: 9 + Math.random() * 10 * s,
        life: 0,
        maxLife: 0.65 + Math.random() * 0.7,
      });
    }

    // Expanding shockwave ring at contact point
    this.add({
      type: PARTICLE_TYPE.RING,
      x,
      y,
      vx: 0,
      vy: 0,
      drag: 1.0,
      gravity: 0,
      r: (col0[0] + col1[0]) * 0.6,
      g: (col0[1] + col1[1]) * 0.6,
      b: (col0[2] + col1[2]) * 0.6,
      a: 1.0,
      size: 16,
      endSize: 220 * s,
      life: 0,
      maxLife: 0.65,
    });
  }

  // ----------------------------------------------------
  // KASEKTEN / AJI-AJI PUSAKA SAKTI
  // ----------------------------------------------------
  emitKasekten(character, originX, originY, facing = 1) {
    const dir = facing >= 0 ? -1 : 1; // Facing 1 looks left (-X), -1 looks right (+X)

    if (character === 'arjuna') {
      // 1. Raden Arjuna: Pusaka Panah Pasopati (Sinar Keemasan & Bintang Pusaka)
      // High-speed golden beam / arrow stream
      const streamCount = 75;
      for (let i = 0; i < streamCount; i++) {
        const spreadY = (Math.random() - 0.5) * 45;
        const forwardSpeed = (650 + Math.random() * 950) * dir;
        this.add({
          type: PARTICLE_TYPE.SPARK,
          x: originX + (Math.random() - 0.5) * 25,
          y: originY + spreadY,
          vx: forwardSpeed,
          vy: (Math.random() - 0.5) * 80,
          drag: 0.988,
          gravity: 30,
          r: 2.5, // Radiant gold (HDR bloom)
          g: 1.95,
          b: 0.45,
          a: 1.0,
          size: 8 + Math.random() * 11,
          life: 0,
          maxLife: 0.85 + Math.random() * 0.6,
        });
      }

      // Divine golden aura ring burst
      for (let r = 0; r < 2; r++) {
        this.add({
          type: PARTICLE_TYPE.RING,
          x: originX,
          y: originY,
          vx: dir * 80 * (r + 1),
          vy: 0,
          drag: 0.97,
          gravity: 0,
          r: 2.3,
          g: 1.75,
          b: 0.35,
          a: 1.0,
          size: 14,
          endSize: 260 + r * 70,
          life: 0,
          maxLife: 0.75 + r * 0.2,
        });
      }
    } else if (character === 'bima') {
      // 2. Raden Bima: Kuku Pancanaka & Gada Rujakpala (Kilatan Petir Biru & Gempa)
      // Forked plasma lightning sparks bursting radially
      const boltCount = 85;
      for (let i = 0; i < boltCount; i++) {
        const angle = (Math.random() * Math.PI) - (Math.PI * 0.5) + (dir < 0 ? Math.PI : 0);
        const speed = 350 + Math.random() * 950;
        this.add({
          type: PARTICLE_TYPE.SPARK,
          x: originX + (Math.random() - 0.5) * 45,
          y: originY + (Math.random() - 0.5) * 45,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 100,
          drag: 0.96,
          gravity: 240,
          r: 0.45, // Brilliant plasma electric cyan-white
          g: 1.85,
          b: 2.85,
          a: 1.0,
          size: 10 + Math.random() * 12,
          life: 0,
          maxLife: 0.75 + Math.random() * 0.55,
        });
      }

      // Earth-shattering heavy shockwave
      this.add({
        type: PARTICLE_TYPE.RING,
        x: originX,
        y: originY + 40,
        vx: 0,
        vy: 0,
        drag: 1.0,
        gravity: 0,
        r: 0.55,
        g: 1.75,
        b: 2.7,
        a: 1.0,
        size: 24,
        endSize: 360,
        life: 0,
        maxLife: 0.8,
      });
    } else if (character === 'rahwana') {
      // 3. Prabu Rahwana: Aji Pancasona & Kobaran Api Alengka (Lidah Api Merah Membara)
      // Swirling inferno embers with upward thermal buoyancy
      const flameCount = 90;
      for (let i = 0; i < flameCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 140 + Math.random() * 650;
        this.add({
          type: PARTICLE_TYPE.FLAME,
          x: originX + (Math.random() - 0.5) * 60,
          y: originY + (Math.random() - 0.5) * 60,
          vx: Math.cos(angle) * speed + dir * 160,
          vy: Math.sin(angle) * speed - 320, // Strong upward thermal rise
          drag: 0.97,
          gravity: -200, // Buoyancy pulls UP
          r: 2.6 + Math.random() * 0.4, // Crimson-orange inferno
          g: 0.45 + Math.random() * 0.5,
          b: 0.1,
          a: 1.0,
          size: 16 + Math.random() * 20,
          life: 0,
          maxLife: 1.1 + Math.random() * 0.75,
        });
      }

      // Demonic blood-red shockwave
      this.add({
        type: PARTICLE_TYPE.RING,
        x: originX,
        y: originY,
        vx: 0,
        vy: 0,
        drag: 1.0,
        gravity: 0,
        r: 2.6,
        g: 0.35,
        b: 0.1,
        a: 1.0,
        size: 22,
        endSize: 320,
        life: 0,
        maxLife: 0.85,
      });
    }
  }

  // ----------------------------------------------------
  // AMBIENT ATMOSPHERIC DRIFT
  // ----------------------------------------------------
  emitAmbient(atmosphere, view, dt) {
    this.ambientTimer += dt;
    if (this.ambientTimer < 0.08) return;
    this.ambientTimer = 0;

    if (atmosphere === 'war') {
      // Floating fiery embers drifting across the kelir
      if (Math.random() < 0.65) {
        this.add({
          type: PARTICLE_TYPE.FLAME,
          x: view.x + Math.random() * view.w,
          y: view.y + view.h + 20,
          vx: (Math.random() - 0.5) * 90 - 40,
          vy: -(80 + Math.random() * 140),
          drag: 0.99,
          gravity: -40,
          r: 2.2,
          g: 0.6 + Math.random() * 0.4,
          b: 0.1,
          a: 0.85,
          size: 5 + Math.random() * 7,
          life: 0,
          maxLife: 3.5 + Math.random() * 2.0,
        });
      }
    } else if (atmosphere === 'mystic') {
      // Ethereal glowing moonlight dust / mist
      if (Math.random() < 0.4) {
        this.add({
          type: PARTICLE_TYPE.SPARK,
          x: view.x + Math.random() * view.w,
          y: view.y + Math.random() * view.h * 0.8,
          vx: (Math.random() - 0.5) * 35,
          vy: (Math.random() - 0.5) * 25,
          drag: 0.98,
          gravity: 0,
          r: 0.6,
          g: 0.9,
          b: 1.6,
          a: 0.7,
          size: 4 + Math.random() * 5,
          life: 0,
          maxLife: 2.5 + Math.random() * 2.0,
        });
      }
    }
  }

  // ----------------------------------------------------
  // UPDATE PHYSICS
  // ----------------------------------------------------
  update(dt, view, atmosphere = 'classic') {
    this.emitAmbient(atmosphere, view, dt);

    const alive = [];
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) continue;

      const progress = p.life / p.maxLife;

      // Physics integration
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Fade-out towards end of life
      p.a = 1.0 - progress;

      // Ring size expansion
      if (p.type === PARTICLE_TYPE.RING && p.endSize) {
        p.currentSize = p.size + (p.endSize - p.size) * progress;
      } else {
        p.currentSize = p.size * (1.0 - progress * 0.4);
      }

      alive.push(p);
    }
    this.particles = alive;
  }

  // Packs active particles into a contiguous Float32Array for WebGL
  fillBuffer(view) {
    const n = Math.min(this.particles.length, this.maxParticles);
    this.count = n;
    let offset = 0;

    for (let i = 0; i < n; i++) {
      const p = this.particles[i];
      const sz = p.currentSize ?? p.size;
      this.buffer[offset]     = p.x;
      this.buffer[offset + 1] = p.y;
      this.buffer[offset + 2] = p.r;
      this.buffer[offset + 3] = p.g;
      this.buffer[offset + 4] = p.b;
      this.buffer[offset + 5] = p.a;
      this.buffer[offset + 6] = sz;
      this.buffer[offset + 7] = p.type;
      offset += 8;
    }
    return this.buffer;
  }
}
