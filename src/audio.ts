export class AudioEngine {
  private ctx: AudioContext | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private masterGain: GainNode | null = null;
  private lfo: OscillatorNode | null = null;

  public isPlaying = false;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  play() {
    this.init();
    if (!this.ctx || this.isPlaying) return;
    this.isPlaying = true;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.ctx.destination);

    // Generate Brown Noise (soothing, deep rumble)
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; 
    }

    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = buffer;
    this.noiseSource.loop = true;

    // Lowpass filter to make it warmer
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 250; // Very soft, low frequency

    // Gain node for breathing amplitude modulation
    const modGain = this.ctx.createGain();
    modGain.gain.value = 0.5;

    // LFO for slow breathing cycle (approx. 8 seconds)
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 1 / 8; 

    // Connect LFO to modulate the gain
    const lfoScale = this.ctx.createGain();
    lfoScale.gain.value = 0.3; // Depth of the breathing modulation
    this.lfo.connect(lfoScale);
    lfoScale.connect(modGain.gain);

    // Routing
    this.noiseSource.connect(filter);
    filter.connect(modGain);
    modGain.connect(this.masterGain);

    this.noiseSource.start();
    this.lfo.start();

    // Fade in gracefully
    this.masterGain.gain.setTargetAtTime(1, this.ctx.currentTime, 2);
  }

  stop() {
    if (!this.ctx || !this.isPlaying || !this.masterGain) return;
    this.isPlaying = false;

    // Fade out gracefully
    this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 1);
    
    setTimeout(() => {
      try {
        if (this.noiseSource) this.noiseSource.stop();
        if (this.lfo) this.lfo.stop();
        if (this.masterGain) this.masterGain.disconnect();
      } catch (e) {
        // Ignore if already stopped or disconnected
      }
    }, 3000);
  }
}

export const audioEngine = new AudioEngine();
