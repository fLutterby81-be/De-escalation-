const NOISE_SECONDS = 8;
const FADE_OUT_MS = 3000;

/** Soft brown noise with a slow 8-second "breathing" swell. */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private masterGain: GainNode | null = null;
  private lfo: OscillatorNode | null = null;

  public isPlaying = false;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
    }
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;

    const length = ctx.sampleRate * NOISE_SECONDS;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      output[i] = lastOut * 3.5;
    }

    // Remove the drift between the first and last sample so the loop point
    // does not produce a soft click every few seconds.
    const drift = output[length - 1] - output[0];
    for (let i = 0; i < length; i++) {
      output[i] -= drift * (i / (length - 1));
    }

    this.noiseBuffer = buffer;
    return buffer;
  }

  play() {
    if (this.isPlaying) return;
    const ctx = this.getContext();
    this.isPlaying = true;

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(ctx.destination);

    this.noiseSource = ctx.createBufferSource();
    this.noiseSource.buffer = this.getNoiseBuffer(ctx);
    this.noiseSource.loop = true;

    // Lowpass filter to make it warmer.
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 250;

    // Gain node whose level is swept by the LFO (breathing modulation).
    const modGain = ctx.createGain();
    modGain.gain.value = 0.5;

    this.lfo = ctx.createOscillator();
    this.lfo.type = "sine";
    this.lfo.frequency.value = 1 / 8;

    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.3;
    this.lfo.connect(lfoDepth);
    lfoDepth.connect(modGain.gain);

    this.noiseSource.connect(filter);
    filter.connect(modGain);
    modGain.connect(this.masterGain);

    this.noiseSource.start();
    this.lfo.start();

    // Fade in gracefully.
    this.masterGain.gain.setTargetAtTime(1, ctx.currentTime, 2);
  }

  stop() {
    if (!this.ctx || !this.isPlaying || !this.masterGain) return;
    this.isPlaying = false;

    // Capture the current nodes: play() may create new ones during the fade.
    const source = this.noiseSource;
    const lfo = this.lfo;
    const gain = this.masterGain;
    this.noiseSource = null;
    this.lfo = null;
    this.masterGain = null;

    gain.gain.setTargetAtTime(0, this.ctx.currentTime, 1);

    setTimeout(() => {
      try {
        source?.stop();
        lfo?.stop();
        gain.disconnect();
      } catch {
        // Already stopped or disconnected.
      }
    }, FADE_OUT_MS);
  }
}

export const audioEngine = new AudioEngine();
