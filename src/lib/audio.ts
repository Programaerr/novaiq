// Web Audio API Cosmic Sound Synthesizer - ALL SOUNDS DISABLED PER USER REQUEST
class CosmicAudioEngine {
  public playWarp() {
    // Disabled all sounds
  }

  public playPing() {
    // Disabled all sounds
  }

  public playTick() {
    // Disabled all sounds
  }

  public toggleAmbient(): boolean {
    return false;
  }

  public isAmbientOn(): boolean {
    return false;
  }
}

export const cosmicAudio = new CosmicAudioEngine();

