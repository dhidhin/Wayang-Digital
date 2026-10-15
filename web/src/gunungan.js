// Gunungan / Kayon: The sacred cosmic mountain & tree-of-life puppet.
// In Wayang Kulit, the Gunungan opens the performance (Bedhol Kayon), marks stage transitions,
// symbolizes cosmic wind/fire, and closes the play (Tancep Kayon).

import { Affine, Spring, Spring2, clamp, lerp } from './math.js';

export const GUNUNGAN_SIZE = [768, 1376];
const ANCHOR = [384, 800];
const STICK_TOP = [384, 280];
const STICK_FOOT = [384, 1350];
const TIES = [420, 780, 1100, 1300];

export class Gunungan {
  constructor({ x = 960, y = 620 } = {}) {
    this.baseScale = 0.54;
    this.scale = this.baseScale;
    this.pos = new Spring2(x, y, 180, 0.65);
    this.tilt = new Spring(0, 80, 0.55);
    this.depth = new Spring(0.02, 35, 0.9);
    this.target = [x, y];
    this.targetTilt = 0;
    this.targetDepth = 0.02;

    // States: 'center' (tancep tengah) | 'opening' (bedhol kayon anim) | 'side' (tancep kiwa/tengen) | 'closing' | 'hidden'
    this.state = 'center';
    this.animTime = 0;
    this.sideSide = 'right'; // which side to park at ('right' or 'left')
    this.surfaceTilt = [0, 0];
    this.lastSfxStep = -1;
  }

  // Toggle between Center (Tancep Tengah) and Side (Bedhol Kayon)
  toggle(sfx) {
    if (this.state === 'center') {
      this.startBedhol(sfx);
    } else {
      this.startTancep(sfx);
    }
  }

  startBedhol(sfx) {
    this.state = 'opening';
    this.animTime = 0;
    this.lastSfxStep = -1;
    if (sfx) {
      sfx.playCempala({ velocity: 0.9, isTancep: true });
      sfx.playKecrek({ velocity: 0.7, rattleCount: 2 });
    }
  }

  startTancep(sfx) {
    this.state = 'closing';
    this.animTime = 0;
    this.lastSfxStep = -1;
    if (sfx) {
      sfx.playKecrek({ velocity: 0.6, rattleCount: 2 });
    }
  }

  update(dt, view, sfx) {
    const bottom = view.y + view.h;

    // Handle automated sacred choreographies
    if (this.state === 'opening') {
      this.animTime += dt;
      const t = this.animTime;

      if (t < 0.6) {
        // Step 1: Bedhol — lifted from the ground, tilted slightly
        const u = t / 0.6;
        this.target = [960, 520];
        this.targetTilt = -0.12 * Math.sin(u * Math.PI);
        this.targetDepth = 0.15 * u;
      } else if (t < 2.6) {
        // Step 2: Melambai / Ngrayang — swaying across the screen (wind/cosmic flutter)
        const u = (t - 0.6) / 2.0;
        const waveX = 960 + 480 * Math.sin(u * Math.PI * 2.5);
        const waveY = 510 + 40 * Math.cos(u * Math.PI * 2.5);
        this.target = [waveX, waveY];
        this.targetTilt = 0.28 * Math.cos(u * Math.PI * 2.5);
        this.targetDepth = 0.18;

        // Periodic kecrek flutter as the Gunungan ripples through the air
        const step = Math.floor(u * 5);
        if (step !== this.lastSfxStep && sfx) {
          this.lastSfxStep = step;
          sfx.playKecrek({ velocity: 0.55, rattleCount: 2 });
        }
      } else if (t < 3.8) {
        // Step 3: Moving to side (tancep kiwa / tengen)
        const u = (t - 2.6) / 1.2;
        const sideX = view.x + view.w - 180;
        this.target = [lerp(960, sideX, u), lerp(510, 640, u)];
        this.targetTilt = lerp(0.2, 0.08, u);
        this.targetDepth = lerp(0.18, 0.02, u);
      } else {
        // Step 4: Slam down into gedebog at stage border
        this.state = 'side';
        this.target = [view.x + view.w - 180, 640];
        this.targetTilt = 0.06;
        this.targetDepth = 0.02;
        if (sfx) {
          sfx.playCempala({ velocity: 1.0, isTancep: true });
        }
      }
    } else if (this.state === 'closing') {
      this.animTime += dt;
      const t = this.animTime;

      if (t < 0.6) {
        // Lift from side
        const u = t / 0.6;
        const sideX = view.x + view.w - 180;
        this.target = [sideX, 530];
        this.targetTilt = -0.15 * u;
        this.targetDepth = 0.12 * u;
      } else if (t < 2.0) {
        // Sweep toward center
        const u = (t - 0.6) / 1.4;
        const sideX = view.x + view.w - 180;
        this.target = [lerp(sideX, 960, u), 520 - 30 * Math.sin(u * Math.PI)];
        this.targetTilt = lerp(-0.15, 0.0, u);
        this.targetDepth = 0.15;
      } else if (t < 2.8) {
        // Settle down to center
        const u = (t - 2.0) / 0.8;
        this.target = [960, lerp(520, 630, u)];
        this.targetTilt = 0;
        this.targetDepth = lerp(0.15, 0.02, u);
      } else {
        // Final Tancep Kayon in dead center
        this.state = 'center';
        this.target = [960, 630];
        this.targetTilt = 0;
        this.targetDepth = 0.02;
        if (sfx) {
          sfx.playCempala({ velocity: 1.15, isTancep: true });
        }
      }
    } else if (this.state === 'center') {
      this.target = [960, 630];
      this.targetTilt = 0;
      this.targetDepth = 0.02;
    } else if (this.state === 'side') {
      this.target = [view.x + view.w - 180, 640];
      this.targetTilt = 0.06;
      this.targetDepth = 0.02;
    } else if (this.state === 'hidden') {
      this.target = [960, view.y + view.h + 800];
      this.targetDepth = 0;
    }

    // Step physics
    this.pos.step(this.target[0], this.target[1], dt);
    this.tilt.step(this.targetTilt, dt);
    this.depth.step(this.targetDepth, dt);
    this.scale = this.baseScale * (1 + 0.12 * this.depth.x);

    // Surface tilt for normal-map relief
    this.surfaceTilt = [this.tilt.x * 0.4, 0];
  }

  frame(view) {
    if (this.state === 'hidden' && this.pos.y > view.y + view.h + 600) {
      return [];
    }

    const bottom = view.y + view.h;
    const s = this.scale;
    const B = Affine.chain(
      Affine.translate(this.pos.x, this.pos.y),
      Affine.rotate(this.tilt.x),
      Affine.scale(s, s),
      Affine.translate(-ANCHOR[0], -ANCHOR[1]),
    );

    // Horn stick (gapit) extending below the stage frame
    const top = Affine.apply(B, ...STICK_TOP);
    const foot = Affine.apply(B, ...STICK_FOOT);
    const axis = [foot[0] - top[0], foot[1] - top[1]];
    const axisLen = Math.hypot(axis[0], axis[1]) || 1;
    const dir = [axis[0] / axisLen, axis[1] / axisLen];

    const cap = [top[0] - dir[0] * 12 * s, top[1] - dir[1] * 12 * s];
    const handleStart = [foot[0] + dir[0] * 120 * s, foot[1] + dir[1] * 120 * s];
    const tEnd = dir[1] > 0.15 ? Math.max(0, (bottom - handleStart[1]) / dir[1]) : 1500;
    const end = [handleStart[0] + dir[0] * tEnd, handleStart[1] + dir[1] * tEnd];

    const gapit = {
      kind: 'stick',
      id: 'gunungan-gapit',
      style: 'gapit',
      pts: [
        { p: cap, w: 3 * s },
        { p: top, w: 8 * s },
        { p: foot, w: 14 * s },
        { p: handleStart, w: 26 * s },
        { p: end, w: 32 * s },
      ],
      ties: TIES.map((y) => [(y - STICK_TOP[1] + 10) * s, 10 * s]),
    };

    return [
      { kind: 'part', id: 'gunungan-body', key: 'gunungan', m: B, tilt: this.surfaceTilt },
      gapit,
    ];
  }
}
