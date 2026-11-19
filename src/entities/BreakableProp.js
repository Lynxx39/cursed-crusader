// BreakableProp.js - Destructible Ancient Ceramic Urns & Crates with Juicy Particle Shards & Drops
import Phaser from 'phaser';
import { SoundSynth } from '../core/SoundSynth.js';

export class BreakableProp extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = 'urn_clay') {
    super(scene, x, y, type);
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Static arcade body

    this.propType = type;
    this.isBroken = false;
    this.body.setSize(22, 26).setOffset(1, 2);
  }

  shatter(sourceX = 0, isBeast = false) {
    if (this.isBroken || !this.active) return;
    this.isBroken = true;

    // Juice feedback
    if (this.scene && this.scene.juice) {
      this.scene.juice.emitUrnShards(this.x, this.y, 12);
      this.scene.juice.addTrauma(0.12);
    }

    try {
      this.scene.sound.play('sfx-hurt', { volume: 0.35, rate: 1.5 });
    } catch (e) {
      SoundSynth.playHit();
    }

    // Spawn rewards (80% gold coin, 20% blood orb)
    if (this.scene) {
      const dropRoll = Math.random();
      if (dropRoll < 0.75) {
        if (typeof this.scene.spawnGoldCoin === 'function') {
          this.scene.spawnGoldCoin(this.x, this.y - 12);
        }
      } else {
        if (typeof this.scene.spawnBloodOrb === 'function') {
          this.scene.spawnBloodOrb(this.x, this.y - 12);
        }
      }
    }

    this.destroy();
  }
}

export default BreakableProp;
