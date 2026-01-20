// Programmatic sound effects using Web Audio API
// No external files needed - generates sounds on the fly

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

// Helper to create oscillator-based sounds
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3,
  fadeOut: boolean = true
) {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  if (fadeOut) {
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
  }

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

// Play a sequence of tones
function playSequence(
  notes: { freq: number; duration: number; delay: number }[],
  type: OscillatorType = 'sine',
  volume: number = 0.2
) {
  notes.forEach(({ freq, duration, delay }) => {
    setTimeout(() => playTone(freq, duration, type, volume), delay * 1000);
  });
}

export const sounds = {
  // Workspace created - quick pop
  create: () => {
    playTone(880, 0.08, 'sine', 0.2);
    setTimeout(() => playTone(1100, 0.06, 'sine', 0.15), 50);
  },

  // Task started - whoosh/sweep up
  start: () => {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  },

  // Task complete - satisfying success chime
  success: () => {
    playSequence([
      { freq: 523, duration: 0.1, delay: 0 },      // C5
      { freq: 659, duration: 0.1, delay: 0.08 },   // E5
      { freq: 784, duration: 0.15, delay: 0.16 },  // G5
      { freq: 1047, duration: 0.25, delay: 0.24 }, // C6
    ], 'sine', 0.2);
  },

  // Error - low thud
  error: () => {
    playTone(150, 0.2, 'triangle', 0.3);
    setTimeout(() => playTone(100, 0.3, 'triangle', 0.2), 100);
  },

  // Connection made - click
  connect: () => {
    playTone(1200, 0.05, 'square', 0.1);
    setTimeout(() => playTone(1500, 0.04, 'sine', 0.15), 30);
  },

  // Disconnect - reverse click
  disconnect: () => {
    playTone(1500, 0.04, 'sine', 0.1);
    setTimeout(() => playTone(1000, 0.05, 'square', 0.08), 30);
  },

  // Select workspace - subtle tick
  select: () => {
    playTone(800, 0.03, 'sine', 0.1);
  },

  // Delete workspace - descending
  delete: () => {
    playSequence([
      { freq: 400, duration: 0.08, delay: 0 },
      { freq: 300, duration: 0.08, delay: 0.05 },
      { freq: 200, duration: 0.12, delay: 0.1 },
    ], 'triangle', 0.15);
  },

  // Keyboard shortcut acknowledged - tiny blip
  shortcut: () => {
    playTone(1000, 0.02, 'sine', 0.08);
  },

  // Typing/input - very subtle
  type: () => {
    playTone(600 + Math.random() * 200, 0.02, 'sine', 0.03);
  },

  // Hover - extremely subtle
  hover: () => {
    playTone(1200, 0.015, 'sine', 0.02);
  },

  // Tool use during task - activity indicator
  toolUse: () => {
    playTone(440 + Math.random() * 100, 0.04, 'sine', 0.08);
  },
};

// Mute control
let muted = false;

export function setMuted(value: boolean) {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

// Wrapper that respects mute
export function playSound(sound: keyof typeof sounds) {
  if (!muted) {
    sounds[sound]();
  }
}
