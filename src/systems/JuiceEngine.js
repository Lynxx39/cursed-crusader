// JuiceEngine.js - Zero-Allocation Pooled Particles, Glyph Damage Numbers & Non-Blocking Screen Shake
export class JuiceEngine {
  constructor(scene) {
    this.scene = scene;
    this.trauma = 0;
    this.decay = 1.8; // trauma lost per second
    this.maxOffset = 14;
    this.maxRoll = 0.04; // radians
    this.isFrozen = false;

    // Pooled lightweight particles (ZERO scene.tweens.add & ZERO GC per hit!)
    this.activeParticles = [];
    this.freeParticles = [];
    this.maxParticles = 140;

    // Pooled floating damage glyph slots (ZERO <canvas> text rasterization on hits!)
    this.activePopups = [];
    this.freeGlyphSprites = [];

    scene.events.on('shutdown', () => {
      this.activeParticles.length = 0;
      this.freeParticles.length = 0;
      this.activePopups.length = 0;
      this.freeGlyphSprites.length = 0;
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
    const dt = Math.min(deltaSeconds || 0.016, 0.05);

    // 1. Update pooled particles in a single tight pass (no per-particle Tween overhead)
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.life += dt;
      if (p.life >= p.maxLife || !p.sprite || !p.sprite.scene) {
        if (p.sprite) {
          p.sprite.setVisible(false);
          this.freeParticles.push(p.sprite);
        }
        this.activeParticles.splice(i, 1);
        continue;
      }
      const progress = p.life / p.maxLife;
      p.vy += p.gravity * dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.sprite.alpha = 1 - progress;
      p.sprite.scale = p.startScale + (p.endScale - p.startScale) * progress;
      if (p.spin) p.sprite.angle += p.spin * dt;
    }

    // 2. Update pooled damage numbers / glyph popups
    for (let i = this.activePopups.length - 1; i >= 0; i--) {
      const pop = this.activePopups[i];
      pop.life += dt;
      if (pop.life >= pop.maxLife) {
        for (let g = 0; g < pop.sprites.length; g++) {
          const sp = pop.sprites[g];
          sp.setVisible(false);
          if (pop.isGlyph) this.freeGlyphSprites.push(sp);
          else sp.destroy();
        }
        this.activePopups.splice(i, 1);
        continue;
      }
      const progress = pop.life / pop.maxLife;
      const dy = pop.riseY * dt;
      const alpha = progress < 0.6 ? 1 : 1 - (progress - 0.6) / 0.4;
      for (let g = 0; g < pop.sprites.length; g++) {
        const sp = pop.sprites[g];
        sp.y += dy;
        sp.alpha = alpha;
      }
    }

    // 3. Camera Shake
    if (!this.scene.cameras || !this.scene.cameras.main) return;
    if (this.trauma > 0) {
      this.trauma = Math.max(this.trauma - this.decay * dt, 0);
      const shake = this.trauma * this.trauma;
      const offsetX = (Math.random() * 2 - 1) * this.maxOffset * shake;
      const offsetY = (Math.random() * 2 - 1) * this.maxOffset * shake;
      const roll = (Math.random() * 2 - 1) * this.maxRoll * shake;
      this.scene.cameras.main.setFollowOffset(offsetX, offsetY);
      this.scene.cameras.main.setRotation(roll);
    } else {
      this.scene.cameras.main.setFollowOffset(0, 0);
      this.scene.cameras.main.setRotation(0);
    }
  }

  // Non-blocking impact punch (never calls physics.world.pause() so player movement never stutters/sticks)
  hitStop(durationMs = 40) {
    this.addTrauma(Math.min(0.28, durationMs / 350));
  }

  _spawnParticle(key, x, y, vx, vy, maxLife, startScale = 1, endScale = 0.2, gravity = 0, spin = 0) {
    if (!this.scene || !this.scene.add) return;
    if (this.activeParticles.length >= this.maxParticles) {
      const oldest = this.activeParticles.shift();
      if (oldest && oldest.sprite) {
        oldest.sprite.setVisible(false);
        this.freeParticles.push(oldest.sprite);
      }
    }
    let sprite = this.freeParticles.pop();
    if (!sprite) {
      sprite = this.scene.add.image(x, y, key).setDepth(24);
    } else {
      sprite.setTexture(key).setPosition(x, y).setVisible(true);
    }
    sprite.setAlpha(1).setScale(startScale).setAngle(0);
    this.activeParticles.push({ sprite, vx, vy, gravity, spin, startScale, endScale, life: 0, maxLife });
  }

  // Floating Damage Number (uses zero-allocation pre-baked sprite glyphs for numbers!)
  popDamageNumber(x, y, amount, type = 'normal') {
    if (!this.scene || !this.scene.add) return;
    let tint = 0xf8fafc;
    let hexColor = '#f8fafc';
    let scale = 1.0;
    let prefix = '';

    if (type === 'crit') {
      tint = 0xfde047; hexColor = '#fde047'; scale = 1.25;
    } else if (type === 'parry') {
      tint = 0x38bdf8; hexColor = '#38bdf8'; scale = 1.15;
    } else if (type === 'heal') {
      tint = 0x4ade80; hexColor = '#4ade80'; scale = 1.05; prefix = '+';
    } else if (type === 'beast') {
      tint = 0xf87171; hexColor = '#f87171'; scale = 1.2;
    }

    const str = `${prefix}${amount}`;
    const hasGlyphAtlas = this.scene.textures && this.scene.textures.exists('dmg_glyphs');
    const isNumericOnly = /^[0-9+\-!]+$/.test(str);

    if (hasGlyphAtlas && isNumericOnly) {
      const stepX = Math.round(10 * scale);
      const totalW = str.length * stepX;
      const startX = x - totalW / 2 + stepX / 2;
      const sprites = [];
      for (let i = 0; i < str.length; i++) {
        let sp = this.freeGlyphSprites.pop();
        if (!sp) {
          sp = this.scene.add.image(startX + i * stepX, y - 10, 'dmg_glyphs', str[i]).setDepth(32);
        } else {
          sp.setTexture('dmg_glyphs', str[i]).setPosition(startX + i * stepX, y - 10).setVisible(true);
        }
        sp.setTint(tint).setAlpha(1).setScale(scale);
        sprites.push(sp);
      }
      this.activePopups.push({ sprites, isGlyph: true, life: 0, maxLife: 0.55, riseY: -55 });
      return;
    }

    // Rare non-numeric label fallback (PARRY STAGGER, APOCALYPSE, GOLD VAULT)
    const text = this.scene.add.text(x, y - 10, str, {
      fontFamily: 'monospace',
      fontSize: type === 'crit' ? '16px' : '14px',
      fontStyle: 'bold',
      color: hexColor,
      stroke: '#05070a',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(32);
    this.activePopups.push({ sprites: [text], isGlyph: false, life: 0, maxLife: 0.75, riseY: -45 });
  }

  emitTelegraph(x, y) {
    if (this.scene && this.scene.textures && this.scene.textures.exists('icon_telegraph')) {
      this._spawnParticle('icon_telegraph', x, y - 36, 0, -28, 0.4, 1.0, 1.35, 0, 0);
    }
  }

  emitBlood(x, y, count = 6) {
    count = Math.min(count, 8);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * 125;
      this._spawnParticle('part_blood', x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 40, 0.36 + Math.random() * 0.18, 1.0, 0.2, 160, 0);
    }
  }

  emitSparks(x, y, count = 5) {
    count = Math.min(count, 7);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 150;
      this._spawnParticle('part_spark', x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.25 + Math.random() * 0.15, 1.0, 0.2, 0, 0);
    }
  }

  emitVoidEmbers(x, y, count = 6) {
    count = Math.min(count, 8);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * 130;
      this._spawnParticle('part_void', x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.38 + Math.random() * 0.18, 1.0, 0.15, -35, 0);
    }
  }

  emitHolySparks(x, y, count = 5) {
    count = Math.min(count, 7);
    for (let i = 0; i < count; i++) {
      const key = (i % 2 === 0) ? 'part_sunfire' : 'part_spark';
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 125;
      this._spawnParticle(key, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.30 + Math.random() * 0.20, 1.0, 0.15, -25, 0);
    }
  }

  emitUrnShards(x, y, count = 8) {
    count = Math.min(count, 10);
    for (let i = 0; i < count; i++) {
      const key = (i % 3 === 0) ? 'part_spark' : 'part_urn_shard';
      const angle = Math.PI * (1.1 + Math.random() * 0.8);
      const speed = 70 + Math.random() * 140;
      this._spawnParticle(key, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.38 + Math.random() * 0.18, 1.0, 0.6, 220, 320);
    }
  }
}

export default JuiceEngine;
