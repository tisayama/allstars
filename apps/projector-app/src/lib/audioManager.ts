/**
 * Audio Manager using Web Audio API
 * Handles pre-loading, playback, and crossfading of BGM and sound effects
 */

import type { AudioAsset } from '@/types';

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private assets: Map<string, AudioAsset> = new Map();
  private currentBgmSource: AudioBufferSourceNode | null = null;
  private currentBgmGain: GainNode | null = null;

  /**
   * Initialize the audio context
   * Must be called after user interaction due to browser autoplay policies
   */
  initialize(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      console.log('AudioContext initialized');
    }
  }

  /**
   * Pre-load an audio asset from URL
   * @param id Unique asset identifier
   * @param url Audio file URL
   * @param type Asset type (bgm or sfx)
   */
  async loadAsset(id: string, url: string, type: 'bgm' | 'sfx'): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized. Call initialize() first.');
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      const asset: AudioAsset = {
        id,
        url,
        type,
        buffer: audioBuffer,
        loaded: true,
      };

      this.assets.set(id, asset);
      console.log(`Audio asset loaded: ${id} (${type})`);
    } catch (error) {
      console.error(`Failed to load audio asset: ${id}`, error);
      throw error;
    }
  }

  /**
   * Play a background music track (loops continuously)
   * @param id Asset ID to play
   * @param fadeInDuration Fade in duration in seconds
   */
  playBGM(id: string, fadeInDuration: number = 1): void {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const asset = this.assets.get(id);
    if (!asset || !asset.buffer) {
      throw new Error(`Audio asset not loaded: ${id}`);
    }

    // Create source and gain nodes
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = asset.buffer;
    source.loop = true;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Fade in
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + fadeInDuration);

    // Stop current BGM if playing
    if (this.currentBgmSource) {
      this.stopBGM(fadeInDuration);
    }

    // Start new BGM
    source.start(0);
    this.currentBgmSource = source;
    this.currentBgmGain = gainNode;

    console.log(`Playing BGM: ${id}`);
  }

  /**
   * Stop the currently playing background music
   * @param fadeOutDuration Fade out duration in seconds
   */
  stopBGM(fadeOutDuration: number = 1): void {
    if (!this.audioContext || !this.currentBgmSource || !this.currentBgmGain) {
      return;
    }

    const currentTime = this.audioContext.currentTime;

    // Fade out
    this.currentBgmGain.gain.setValueAtTime(this.currentBgmGain.gain.value, currentTime);
    this.currentBgmGain.gain.linearRampToValueAtTime(0, currentTime + fadeOutDuration);

    // Stop after fade out
    this.currentBgmSource.stop(currentTime + fadeOutDuration);
    this.currentBgmSource = null;
    this.currentBgmGain = null;

    console.log('Stopping BGM');
  }

  /**
   * Play a sound effect (one-shot, non-looping)
   * @param id Asset ID to play
   * @param volume Volume level (0-1)
   */
  playSoundEffect(id: string, volume: number = 1): void {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const asset = this.assets.get(id);
    if (!asset || !asset.buffer) {
      throw new Error(`Audio asset not loaded: ${id}`);
    }

    // Create source and gain nodes
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = asset.buffer;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

    // Play once
    source.start(0);

    console.log(`Playing sound effect: ${id}`);
  }

  /**
   * Get loading status of all assets
   */
  getLoadingStatus(): { loaded: number; total: number } {
    const total = this.assets.size;
    const loaded = Array.from(this.assets.values()).filter((asset) => asset.loaded).length;
    return { loaded, total };
  }

  /**
   * Check if a specific asset is loaded
   */
  isAssetLoaded(id: string): boolean {
    const asset = this.assets.get(id);
    return asset ? asset.loaded : false;
  }

  /**
   * Stop all audio and cleanup
   */
  cleanup(): void {
    if (this.currentBgmSource) {
      this.currentBgmSource.stop();
      this.currentBgmSource = null;
      this.currentBgmGain = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.assets.clear();
    console.log('AudioManager cleaned up');
  }
}

// Singleton instance
export const audioManager = new AudioManager();
