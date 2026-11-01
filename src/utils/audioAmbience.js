// Web Audio API ambient Egyptian sound synthesizer
class MysticSoundscape {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.gainNode = null;
    this.intervalId = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.12, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  start() {
    this.init();
    if (this.isPlaying) return;
    this.isPlaying = true;

    // Create warm ambient drone (Pharaonic golden chord D - A - D - F#)
    const freqs = [146.83, 220.0, 293.66, 370.0];
    this.oscillators = freqs.map((freq) => {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      // subtle detune for warmth
      osc.detune.setValueAtTime((Math.random() - 0.5) * 8, this.ctx.currentTime);
      
      oscGain.gain.setValueAtTime(0.025, this.ctx.currentTime);
      osc.connect(oscGain);
      oscGain.connect(this.gainNode);
      osc.start();
      return { osc, oscGain };
    });

    // Periodic gentle golden chime (harp-like pentatonic notes)
    const scale = [293.66, 329.63, 370.0, 440.0, 554.37, 587.33];
    this.intervalId = setInterval(() => {
      if (!this.isPlaying || !this.ctx) return;
      const noteFreq = scale[Math.floor(Math.random() * scale.length)];
      
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      
      chimeOsc.type = 'triangle';
      chimeOsc.frequency.setValueAtTime(noteFreq, this.ctx.currentTime);
      
      const now = this.ctx.currentTime;
      chimeGain.gain.setValueAtTime(0, now);
      chimeGain.gain.linearRampToValueAtTime(0.04, now + 0.1);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
      
      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.gainNode);
      
      chimeOsc.start(now);
      chimeOsc.stop(now + 3);
    }, 3200);
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.oscillators) {
      this.oscillators.forEach(({ osc, oscGain }) => {
        try {
          oscGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
          setTimeout(() => osc.stop(), 500);
        } catch (e) {
          // ignore
        }
      });
      this.oscillators = [];
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }
}

export const soundscape = new MysticSoundscape();
