// JuiceEngine.js - Screen Shake (Offset-based), Hit-Stop, Damage Numbers, and Particles
import { SoundSynth } from '../core/SoundSynth.js';

export class JuiceEngine {
  constructor(scene) {
    this.scene = scene;
    this.trauma = 0;
    this.decay = 1.6; // trauma lost per second
    this.maxOffset = 14;
    this.maxRoll = 0.04; // radians
    this.isFrozen = false;
    this.freezeTimer = 0;
    this.freezeEvent = null;

    // Clean up timers on scene shutdown & ensure physics is never left paused
    scene.events.on('shutdown', () => {
      if (this.freezeEvent) this.freezeEvent.remove();
      if (this.scene.physics && this.scene.physics.world) {
        this.scene.physics.world.resume();
      }
      this.isFrozen = false;
      if (this.scene.cameras && this.scene.cameras.main) {
        this.scene.cameras.main.setFollowOffset(0, 0);
        this.scene.cameras.main.setRotation(0);
      }
    });
  }

  addTrauma(amount) {
    this.trauma = Math.min(this.trauma + amount, 1.0);
  }

  update(deltaSeconds) {
    // Safety guard: if frozen for any reason, auto-recover physics after 0.25s
    if (this.isFrozen) {
      this.freezeTimer += deltaSeconds;
      if (this.freezeTimer > 0.25) {
        if (this.scene.physics && this.scene.physics.world) {
          this.scene.physics.world.resume();
        }
        this.isFrozen = false;
        this.freezeTimer = 0;
      }
    }

    if (!this.scene.cameras || !this.scene.cameras.main) return;

    if (this.trauma > 0) {
      this.trauma = Math.max(this.trauma - this.decay * deltaSeconds, 0);
      const shake = this.trauma * this.trauma; // trauma^2 for non-linear punch
      const offsetX = (Math.random() * 2 - 1) * this.maxOffset * shake;
      const offsetY = (Math.random() * 2 - 1) * this.maxOffset * shake;
      const roll = (Math.random() * 2 - 1) * this.maxRoll * shake;

      // Use setFollowOffset to prevent camera scroll drift when following player
      this.scene.cameras.main.setFollowOffset(offsetX, offsetY);
      this.scene.cameras.main.setRotation(roll);
    } else {
      this.scene.cameras.main.setFollowOffset(0, 0);
      this.scene.cameras.main.setRotation(0);
    }
  }

  // Hit-stop / frame freeze tied safely to Phaser scene clock
  hitStop(durationMs = 60) {
    if (this.isFrozen || !this.scene.physics || !this.scene.physics.world) return;
    this.isFrozen = true;
    this.freezeTimer = 0;
    this.scene.physics.world.pause();

    if (this.freezeEvent) this.freezeEvent.remove();
    this.freezeEvent = this.scene.time.delayedCall(durationMs, () => {
      if (this.scene.physics && this.scene.physics.world) {
        this.scene.physics.world.resume();
      }
      this.isFrozen = false;
      this.freezeTimer = 0;
    });
  }

  // Floating Damage Number
  popDamageNumber(x, y, amount, type = 'normal') {
    let color = '#f8fafc';
    let size = '15px';
    let prefix = '';

    if (type === 'crit') {
      color = '#fde047';
      size = '20px';
      prefix = 'CRIT ';
    } else if (type === 'parry') {
      color = '#38bdf8';
      size = '18px';
      prefix = 'PARRY ';
    } else if (type === 'heal') {
      color = '#4ade80';
      size = '16px';
      prefix = '+';
    } else if (type === 'beast') {
      color = '#f87171';
      size = '22px';
      prefix = 'BRUTAL ';
    }

    const text = this.scene.add.text(x, y - 10, `${prefix}${amount}`, {
      fontFamily: 'Cinzel, monospace',
      fontSize: size,
      fontStyle: 'bold',
      color: color,
      stroke: '#05070a',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: y - 45,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 600,
      ease: 'Back.easeOut',
      onComplete: () => text.destroy()
    });
  }

  // Burst Particles
  emitBlood(x, y, count = 12) {
    for (let i = 0; i < count; i++) {
      const part = this.scene.add.image(x, y, 'part_blood');
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 30;

      this.scene.tweens.add({
        targets: part,
        x: x + vx * 0.4,
        y: y + vy * 0.4 + 20,
        alpha: 0,
        scale: 0.2,
        duration: 350 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => part.destroy()
      });
    }
  }

  emitSparks(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
      const part = this.scene.add.image(x, y, 'part_spark');
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 150;

      this.scene.tweens.add({
        targets: part,
        x: x + Math.cos(angle) * speed * 0.3,
        y: y + Math.sin(angle) * speed * 0.3,
        alpha: 0,
        duration: 250 + Math.random() * 150,
        ease: 'Quad.easeOut',
        onComplete: () => part.destroy()
      });
    }
  }

  emitVoidEmbers(x, y, count = 14) {
    for (let i = 0; i < count; i++) {
      const part = this.scene.add.image(x, y, 'part_void');
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 140;

      this.scene.tweens.add({
        targets: part,
        x: x + Math.cos(angle) * speed * 0.35,
        y: y + Math.sin(angle) * speed * 0.35,
        alpha: 0,
        scale: 0.1,
        duration: 400 + Math.random() * 200,
        ease: 'Sine.easeOut',
        onComplete: () => part.destroy()
      });
    }
  }

  emitHolySparks(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
      const key = (i % 2 === 0) ? 'part_sunfire' : 'part_spark';
      const part = this.scene.add.image(x, y, key);
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 130;

      this.scene.tweens.add({
        targets: part,
        x: x + Math.cos(angle) * speed * 0.35,
        y: y + Math.sin(angle) * speed * 0.35,
        alpha: 0,
        scale: 0.15,
        duration: 300 + Math.random() * 220,
        ease: 'Quad.easeOut',
        onComplete: () => part.destroy()
      });
    }
  }

  emitUrnShards(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
      const key = (i % 3 === 0) ? 'part_spark' : 'part_urn_shard';
      const part = this.scene.add.image(x, y, key);
      const angle = Math.PI * (1.1 + Math.random() * 0.8); // Burst upward
      const speed = 70 + Math.random() * 140;

      this.scene.tweens.add({
        targets: part,
        x: x + Math.cos(angle) * speed * 0.35,
        y: y + Math.sin(angle) * speed * 0.35 + 24, // gravity arc down
        alpha: 0,
        angle: Math.random() * 180,
        duration: 380 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => part.destroy()
      });
    }
  }
}

export default JuiceEngine;
