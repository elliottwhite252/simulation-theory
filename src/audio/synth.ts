// Procedural 80s synthpop / thriller-in-major soundtrack.
// Major chord progression with a borrowed bVI (Ab) for that anxious-but-bright feel.
// All synthesis via Web Audio API — no external samples.

const NOTE_FREQ: Record<string, number> = {
  C: 261.626, 'C#': 277.183, Db: 277.183, D: 293.665,
  'D#': 311.127, Eb: 311.127, E: 329.628, F: 349.228,
  'F#': 369.994, Gb: 369.994, G: 391.995, 'G#': 415.305,
  Ab: 415.305, A: 440.0, 'A#': 466.164, Bb: 466.164, B: 493.883,
};

function noteToFreq(note: string): number {
  // Parse "C4", "Ab3", "F#5", etc.
  const m = note.match(/^([A-G][b#]?)(-?\d+)$/);
  if (!m) throw new Error(`bad note: ${note}`);
  const name = m[1];
  const oct = parseInt(m[2], 10);
  const base = NOTE_FREQ[name];
  if (base === undefined) throw new Error(`bad pitch: ${name}`);
  return base * Math.pow(2, oct - 4);
}

// 8-bar progression in C major.
// C (I) → Ab (bVI, borrowed from minor — the "thriller" color) → F (IV) → G (V).
// Each chord held two bars so the arp can breathe.
interface Bar {
  bass: string;       // bass octave 1–2
  arpHigh: string;    // bass note one octave up (for the up-pulse in the arp)
  fifth: string;      // perfect fifth of the chord
  pad: string[];      // pad voices (octaves 3–4)
}

// 16 bars — chord progression repeats twice. Build energy layers on top across the loop.
const PROG: Bar[] = [
  // bars 1–8
  { bass: 'C2',  arpHigh: 'C3',  fifth: 'G2',  pad: ['C4', 'E4', 'G4'] },
  { bass: 'C2',  arpHigh: 'C3',  fifth: 'G2',  pad: ['C4', 'E4', 'G4'] },
  { bass: 'Ab1', arpHigh: 'Ab2', fifth: 'Eb2', pad: ['Ab3', 'C4', 'Eb4'] },
  { bass: 'Ab1', arpHigh: 'Ab2', fifth: 'Eb2', pad: ['Ab3', 'C4', 'Eb4'] },
  { bass: 'F1',  arpHigh: 'F2',  fifth: 'C2',  pad: ['F3', 'A3', 'C4'] },
  { bass: 'F1',  arpHigh: 'F2',  fifth: 'C2',  pad: ['F3', 'A3', 'C4'] },
  { bass: 'G1',  arpHigh: 'G2',  fifth: 'D2',  pad: ['G3', 'B3', 'D4'] },
  { bass: 'G1',  arpHigh: 'G2',  fifth: 'D2',  pad: ['G3', 'B3', 'D4'] },
  // bars 9–14 — second time through, building drum layers
  { bass: 'C2',  arpHigh: 'C3',  fifth: 'G2',  pad: ['C4', 'E4', 'G4'] },
  { bass: 'C2',  arpHigh: 'C3',  fifth: 'G2',  pad: ['C4', 'E4', 'G4'] },
  { bass: 'Ab1', arpHigh: 'Ab2', fifth: 'Eb2', pad: ['Ab3', 'C4', 'Eb4'] },
  { bass: 'Ab1', arpHigh: 'Ab2', fifth: 'Eb2', pad: ['Ab3', 'C4', 'Eb4'] },
  { bass: 'F1',  arpHigh: 'F2',  fifth: 'C2',  pad: ['F3', 'A3', 'C4'] },
  { bass: 'F1',  arpHigh: 'F2',  fifth: 'C2',  pad: ['F3', 'A3', 'C4'] },
  // bars 15–18 — full kit climax: chord progression at double speed (1 bar per chord)
  { bass: 'C2',  arpHigh: 'C3',  fifth: 'G2',  pad: ['C4', 'E4', 'G4'] },
  { bass: 'Ab1', arpHigh: 'Ab2', fifth: 'Eb2', pad: ['Ab3', 'C4', 'Eb4'] },
  { bass: 'F1',  arpHigh: 'F2',  fifth: 'C2',  pad: ['F3', 'A3', 'C4'] },
  { bass: 'G1',  arpHigh: 'G2',  fifth: 'D2',  pad: ['G3', 'B3', 'D4'] },
];

// 8 eighth notes per bar. Pattern: root, 5, root↑oct, 5, root, 5, root↑oct, 5.
// Classic Stranger Things-style up-and-down pulse.
type ArpRole = 'bass' | 'fifth' | 'arpHigh';
const ARP_PATTERN: ArpRole[] = ['bass', 'fifth', 'arpHigh', 'fifth', 'bass', 'fifth', 'arpHigh', 'fifth'];

export class Synth {
  private ctx: AudioContext;
  private master: GainNode;
  private wet: GainNode;
  private dry: GainNode;
  private reverb: ConvolverNode;

  private bpm = 95;
  private playing = false;
  private muted = false;
  private volume = 0.32;
  private timerId: number | null = null;

  private step = 0;
  private nextStepTime = 0;
  private readonly stepsPerBar = ARP_PATTERN.length;
  private readonly totalSteps = ARP_PATTERN.length * PROG.length;

  constructor() {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioCtx();

    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);

    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this.makeReverbIR(2.6);
    this.wet = this.ctx.createGain();
    this.wet.gain.value = 0.55;
    this.reverb.connect(this.wet);
    this.wet.connect(this.master);

    this.dry = this.ctx.createGain();
    this.dry.gain.value = 1;
    this.dry.connect(this.master);
  }

  async start() {
    if (this.playing) return;
    try { await this.ctx.resume(); } catch { /* ignore */ }
    this.playing = true;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.08;
    this.scheduler();
  }

  stop() {
    this.playing = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(this.muted ? 0 : this.volume, now + 0.08);
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  // ----- scheduling -----
  private scheduler = () => {
    if (!this.playing) return;
    const lookahead = 0.12;
    const eighth = 60 / this.bpm / 2;
    while (this.nextStepTime < this.ctx.currentTime + lookahead) {
      this.scheduleStep(this.step, this.nextStepTime);
      this.step = (this.step + 1) % this.totalSteps;
      this.nextStepTime += eighth;
    }
    this.timerId = window.setTimeout(this.scheduler, 25);
  };

  private scheduleStep(step: number, when: number) {
    const barIdx = Math.floor(step / this.stepsPerBar);
    const beatInBar = step % this.stepsPerBar;
    const bar = PROG[barIdx];

    // Pad at the start of each bar — hold for the whole bar.
    if (beatInBar === 0) {
      const barDur = 60 / this.bpm * 4;
      this.playPad(bar.pad, when, barDur);

      // Hint of a melodic pluck at the top of bars 1 and 5 (start of each 4-bar half).
      if (barIdx % 4 === 0) {
        const lead = bar.pad[2]; // highest voice (e.g. G4)
        const leadNote = lead.replace(/(\d)/, (_d) => String(parseInt(_d, 10) + 1));
        this.playPluck(leadNote, when + barDur * 0.5);
      }
    }

    // Bass arpeggio every eighth.
    const role = ARP_PATTERN[beatInBar];
    const noteName = bar[role];
    this.playBass(noteName, when);

    // 16-bar layered build. Phase = 2-bar block (0–7). Each phase adds one element.
    //   0  (1–2):  arp + pad only
    //   1  (3–4):  + hi-hat on offbeats
    //   2  (5–6):  + kick on beat 1
    //   3  (7–8):  + kick on 1 & 3 (half-time)
    //   4  (9–10): + kick four-on-the-floor
    //   5  (11–12): + clap on 2 & 4
    //   6  (13–14): + open hi-hat splash on each downbeat
    //   7  (15–16): + 16th-note hats (full kit)
    // Phase clamped to 7 so bars 17–18 stay at peak-kit instead of "phase 9".
    const phase = Math.min(7, Math.floor(barIdx / 2));
    const isQuarter = beatInBar % 2 === 0;
    const isOffbeat = beatInBar % 2 === 1;
    const isBeat1 = beatInBar === 0;
    const isBeat1or3 = beatInBar === 0 || beatInBar === 4;
    const isBeat2or4 = beatInBar === 2 || beatInBar === 6;

    // Closed hi-hat — phase 1+
    if (phase >= 1 && isOffbeat) {
      this.playHiHat(when);
    }

    // Kick — pattern intensifies over phases 2 → 4
    if (phase >= 4 && isQuarter) {
      this.playKick(when);
    } else if (phase === 3 && isBeat1or3) {
      this.playKick(when);
    } else if (phase === 2 && isBeat1) {
      this.playKick(when);
    }

    // Clap — phase 5+
    if (phase >= 5 && isBeat2or4) {
      this.playClap(when);
    }

    // Open hi-hat splash — phase 6+ on the downbeat of each bar
    if (phase >= 6 && isBeat1) {
      this.playOpenHat(when);
    }

    // 16th-note hats — phase 7 only (extra hat between each 8th)
    if (phase === 7) {
      const sixteenth = 60 / this.bpm / 4;
      this.playHiHat(when + sixteenth);
    }
  }

  // ----- voices -----
  private playBass(noteName: string, when: number) {
    const freq = noteToFreq(noteName);
    const eighth = 60 / this.bpm / 2;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = freq * 0.5; // sub octave for warmth

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, when);
    filter.frequency.exponentialRampToValueAtTime(450, when + eighth * 0.9);
    filter.Q.value = 6;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(0.45, when + 0.004);
    env.gain.exponentialRampToValueAtTime(0.001, when + eighth * 0.92);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(env);
    env.connect(this.dry);

    osc.start(when);
    sub.start(when);
    osc.stop(when + eighth + 0.05);
    sub.stop(when + eighth + 0.05);
  }

  private playPad(notes: string[], when: number, duration: number) {
    for (const noteName of notes) {
      const freq = noteToFreq(noteName);

      // Two detuned sawtooth voices per note for that wide 80s pad.
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = freq;
      osc1.detune.value = -7;

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.value = freq;
      osc2.detune.value = +9;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1700;
      filter.Q.value = 0.6;

      const env = this.ctx.createGain();
      const attack = 0.55;
      const release = 0.7;
      const sustain = 0.05;
      env.gain.setValueAtTime(0, when);
      env.gain.linearRampToValueAtTime(sustain, when + attack);
      env.gain.setValueAtTime(sustain, when + Math.max(attack + 0.01, duration - release));
      env.gain.linearRampToValueAtTime(0, when + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(env);
      env.connect(this.reverb);
      env.connect(this.dry);

      osc1.start(when);
      osc2.start(when);
      osc1.stop(when + duration + 0.3);
      osc2.stop(when + duration + 0.3);
    }
  }

  private playKick(when: number) {
    // Pitched-down sine thump — fast pitch sweep from 130 Hz to 45 Hz.
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, when);
    osc.frequency.exponentialRampToValueAtTime(45, when + 0.09);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(0.85, when + 0.003);
    env.gain.exponentialRampToValueAtTime(0.001, when + 0.28);

    osc.connect(env);
    env.connect(this.dry);

    osc.start(when);
    osc.stop(when + 0.32);

    // Click transient — short high-passed noise burst for the attack snap.
    const sr = this.ctx.sampleRate;
    const clickLen = Math.floor(sr * 0.015);
    const clickBuf = this.ctx.createBuffer(1, clickLen, sr);
    const cd = clickBuf.getChannelData(0);
    for (let i = 0; i < clickLen; i++) cd[i] = (Math.random() * 2 - 1) * (1 - i / clickLen);
    const click = this.ctx.createBufferSource();
    click.buffer = clickBuf;
    const clickFilter = this.ctx.createBiquadFilter();
    clickFilter.type = 'highpass';
    clickFilter.frequency.value = 1800;
    const clickEnv = this.ctx.createGain();
    clickEnv.gain.value = 0.28;
    click.connect(clickFilter);
    clickFilter.connect(clickEnv);
    clickEnv.connect(this.dry);
    click.start(when);
    click.stop(when + 0.03);
  }

  private playOpenHat(when: number) {
    // Like closed hat but longer decay — sustained sizzle.
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * 0.35);
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 5500;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 8500;
    bp.Q.value = 0.6;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(0.13, when + 0.002);
    env.gain.exponentialRampToValueAtTime(0.001, when + 0.32);

    src.connect(hp);
    hp.connect(bp);
    bp.connect(env);
    env.connect(this.dry);

    src.start(when);
    src.stop(when + 0.4);
  }

  private playClap(when: number) {
    // Three quick noise bursts in rapid succession = classic 808-ish clap "thunder".
    const sr = this.ctx.sampleRate;
    const offsets = [0, 0.011, 0.022];
    for (const offset of offsets) {
      const len = Math.floor(sr * 0.035);
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1400;
      bp.Q.value = 1.2;
      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0.16, when + offset);
      env.gain.exponentialRampToValueAtTime(0.001, when + offset + 0.05);
      src.connect(bp);
      bp.connect(env);
      env.connect(this.dry);
      src.start(when + offset);
      src.stop(when + offset + 0.06);
    }
    // Short noise tail, reverb-sent for the "open" body of the clap.
    const tailLen = Math.floor(sr * 0.16);
    const tailBuf = this.ctx.createBuffer(1, tailLen, sr);
    const td = tailBuf.getChannelData(0);
    for (let i = 0; i < tailLen; i++) td[i] = (Math.random() * 2 - 1) * (1 - i / tailLen);
    const tail = this.ctx.createBufferSource();
    tail.buffer = tailBuf;
    const tailBp = this.ctx.createBiquadFilter();
    tailBp.type = 'bandpass';
    tailBp.frequency.value = 1100;
    tailBp.Q.value = 1.5;
    const tailEnv = this.ctx.createGain();
    tailEnv.gain.setValueAtTime(0, when + 0.022);
    tailEnv.gain.linearRampToValueAtTime(0.07, when + 0.025);
    tailEnv.gain.exponentialRampToValueAtTime(0.001, when + 0.2);
    tail.connect(tailBp);
    tailBp.connect(tailEnv);
    tailEnv.connect(this.reverb);
    tailEnv.connect(this.dry);
    tail.start(when + 0.022);
    tail.stop(when + 0.2);
  }

  private playHiHat(when: number) {
    // Short burst of white noise, bandpass + highpass to keep only the metallic sizzle.
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * 0.06);
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 10000;
    bp.Q.value = 0.8;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(0.18, when + 0.001);
    env.gain.exponentialRampToValueAtTime(0.001, when + 0.045);

    src.connect(hp);
    hp.connect(bp);
    bp.connect(env);
    env.connect(this.dry);

    src.start(when);
    src.stop(when + 0.08);
  }

  private playPluck(noteName: string, when: number) {
    const freq = noteToFreq(noteName);

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3500, when);
    filter.frequency.exponentialRampToValueAtTime(800, when + 1.2);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(0.12, when + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, when + 1.4);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.reverb);
    env.connect(this.dry);

    osc.start(when);
    osc.stop(when + 1.5);
  }

  private makeReverbIR(duration: number): AudioBuffer {
    const sr = this.ctx.sampleRate;
    const length = Math.floor(sr * duration);
    const buffer = this.ctx.createBuffer(2, length, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        // Exponentially decaying noise — synthetic plate-ish reverb.
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.4);
      }
    }
    return buffer;
  }
}

// Singleton so the music persists across scene transitions.
let _synth: Synth | null = null;
export function getSynth(): Synth {
  if (!_synth) _synth = new Synth();
  return _synth;
}
