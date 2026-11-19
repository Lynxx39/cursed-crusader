// Enemy.js - AI Enemies with Telegraphs, Parry Vulnerability, Chamber Scaling, and Drops
import Phaser from 'phaser';
import { SoundSynth } from '../core/SoundSynth.js';
import { EventBus } from '../core/EventBus.js';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = 'ghoul') {
    let texture = 'burning-ghoul';
    if (type === 'cultist') texture = 'wizard';
    if (type === 'elite') texture = 'burning-ghoul';

    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.enemyType = type;
    this.setCollideWorldBounds(true);

    // Grounded Drop-Shadow for 16-bit depth
    if (scene.textures.exists('shadow_ellipse')) {
      const shadowY = type === 'elite' ? y + 36 : y + 24;
      this.shadow = scene.add.image(x, shadowY, 'shadow_ellipse').setDepth(this.depth - 1).setAlpha(0.45);
      if (type === 'elite') this.shadow.setScale(1.4, 1.2);
    }

    // Chamber Progression Scaling
    const currentRoom = (scene && scene.currentRoom) || 1;
    const roomScale = 1.0 + Math.max(0, currentRoom - 1) * 0.16;
    const dmgScale = 1.0 + Math.max(0, currentRoom - 1) * 0.14;
    const speedScale = 1.0 + Math.min(0.45, (currentRoom - 1) * 0.06);

    // Stats and hitbox by type
    if (type === 'ghoul') {
      this.maxHp = Math.round(54 * roomScale);
      this.hp = this.maxHp;
      this.speed = Math.round(92 * speedScale);
      this.damage = Math.round(14 * dmgScale);
      this.attackRange = 46;
      this.body.setSize(30, 48).setOffset(14, 10);
      if (scene.anims.exists('ghoul-run')) {
        this.anims.play('ghoul-run', true);
      }
    } else if (type === 'cultist') {
      this.maxHp = Math.round(44 * roomScale);
      this.hp = this.maxHp;
      this.speed = Math.round(55 * speedScale);
      this.damage = Math.round(16 * dmgScale);
      this.isSniper = y < 460 && !this.isBoss;
      this.attackRange = this.isSniper ? 450 : 290;
      this.body.setSize(32, 52).setOffset(24, 12);
      if (scene.anims.exists('wizard-idle')) {
        this.anims.play('wizard-idle', true);
      }
    } else if (type === 'elite') {
      this.maxHp = Math.round(250 * roomScale);
      this.hp = this.maxHp;
      this.speed = Math.round(62 * speedScale);
      this.damage = Math.round(26 * dmgScale);
      this.attackRange = 70;
      this.setScale(1.35); // Enormous Elite Minotaur / Ghoul
      this.body.setSize(36, 50).setOffset(10, 8);
      this.setTint(0x991b1b); // Blood-infused deep red
      if (scene.anims.exists('ghoul-run')) {
        this.anims.play('ghoul-run', true);
      }
    }

    // State & Abilities
    this.state = 'CHASE';
    this.attackCooldown = 0.5;
    this.telegraphTimer = 0;
    this.staggerTimer = 0;
    this.pounceCooldown = 2.0;
    this.teleportCooldown = 2.5;
    this.chargeCooldown = 3.5;
    this.chargeTimer = 0;
    this.chargeDir = 1;
    this.isDead = false;
    this.isBoss = false;
    this.bossPhase = 1;
    this.bossTeleportCooldown = 5.0;
  }

  restoreTint() {
    if (this.isBoss) {
      this.setTint(this.bossPhase === 2 ? 0xff0044 : 0xef4444);
    } else if (this.enemyType === 'elite') {
      this.setTint(0x991b1b);
    } else {
      this.clearTint();
    }
  }

  update(time, delta, player) {
    if (!this.active || !this.body || this.isDead || !player || player.isDead) {
      if (this.shadow && this.isDead) {
        this.shadow.destroy();
        this.shadow = null;
      }
      return;
    }
    const dt = delta / 1000;

    // Keep grounded drop shadow aligned with enemy feet
    if (this.shadow) {
      const shadowY = (this.isElite || this.enemyType === 'elite' || this.isBoss) ? this.y + 36 : this.y + 24;
      this.shadow.setPosition(this.x, shadowY);
      this.shadow.setVisible(!this.isDead && this.visible);
    }

    // Cooldown management
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.pounceCooldown > 0) this.pounceCooldown -= dt;
    if (this.teleportCooldown > 0) this.teleportCooldown -= dt;
    if (this.chargeCooldown > 0) this.chargeCooldown -= dt;
    if (this.bossTeleportCooldown > 0) this.bossTeleportCooldown -= dt;

    // Handle Staggered state (from Player Parry)
    if (this.state === 'STAGGERED') {
      this.setVelocityX(0);
      this.staggerTimer -= dt;
      this.setTint(0x38bdf8); // Cyan frozen tint
      if (this.staggerTimer <= 0) {
        this.restoreTint();
        this.state = 'CHASE';
      }
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const dir = player.x > this.x ? 1 : -1;
    const onFloor = this.body.blocked.down || this.body.touching.down;

    // Face player
    // Cultist (wizard) sprite faces RIGHT by default.
    // Ghoul and Elite sprites face LEFT by default in source sheets.
    if (this.enemyType === 'cultist') {
      this.setFlipX(dir < 0);
    } else {
      this.setFlipX(dir > 0);
    }

    // Boss Phase 2 Transition Check (Blood Frenzy below 50% HP)
    if (this.isBoss && this.bossPhase === 1 && this.hp <= this.maxHp * 0.5) {
      this.bossPhase = 2;
      this.speed = Math.round(this.speed * 1.35);
      this.damage = Math.round(this.damage * 1.25);
      this.setTint(0xff0044);
      this.scene.juice.addTrauma(0.7);
      if (this.scene.cameras && this.scene.cameras.main) {
        this.scene.cameras.main.flash(350, 200, 20, 20);
      }
      try {
        SoundSynth.playRoar();
      } catch (e) {}
    }

    // Boss Periodic Tactical Platform Teleport
    if (this.isBoss && this.bossTeleportCooldown <= 0 && this.state !== 'STAGGERED') {
      this.bossTeleportCooldown = this.bossPhase === 2 ? 3.8 : 5.5;
      this.executeBossTeleport(player);
      return;
    }

    // Cultist Evasive Shadow Step (steps backwards if player gets too close < 80px)
    if (this.enemyType === 'cultist' && !this.isBoss && dist < 80 && this.teleportCooldown <= 0 && this.state !== 'STAGGERED') {
      this.executeCultistTeleport(player);
      return;
    }

    // Elite Hyper-Armor Charge Check
    if (this.enemyType === 'elite' && this.state === 'CHASE' && dist >= 110 && dist <= 280 && this.chargeCooldown <= 0 && onFloor) {
      this.state = 'CHARGE_TELEGRAPH';
      this.telegraphTimer = 0.45;
      this.setVelocityX(0);
      this.setTint(0xff1111);
      this.showTelegraphWarning();
      try {
        SoundSynth.playRoar();
      } catch (e) {}
      return;
    }

    // Ghoul Pounce Leap Check
    if (this.enemyType === 'ghoul' && this.state === 'CHASE' && dist >= 85 && dist <= 220 && this.pounceCooldown <= 0 && onFloor) {
      this.state = 'POUNCE_TELEGRAPH';
      this.telegraphTimer = 0.35;
      this.setVelocityX(0);
      this.setTint(0xf97316); // Orange-red crouch telegraph
      this.showTelegraphWarning();
      return;
    }

    // State Machine execution
    if (this.state === 'POUNCE_TELEGRAPH') {
      this.setVelocityX(0);
      this.telegraphTimer -= dt;
      if (this.telegraphTimer <= 0) {
        this.restoreTint();
        this.state = 'POUNCING';
        this.pounceCooldown = 4.2;
        this.setVelocity(dir * 290, -210);
        this.scene.juice.emitSparks(this.x, this.y, 4);
      }
      return;
    }

    if (this.state === 'POUNCING') {
      // Check mid-air impact with player
      if (dist < 55) {
        if (player.isParrying) {
          player.onSuccessfulParry(this);
          this.state = 'STAGGERED';
          this.staggerTimer = 1.8;
          this.attackCooldown = 2.0;
          return;
        } else if (!player.isDashing) {
          player.takeDamage(this.damage + 4, this.x);
          this.state = 'CHASE';
          this.attackCooldown = 1.4;
          return;
        }
      }

      // Landed on floor or hit obstacle
      if (onFloor || (this.body && (this.body.blocked.left || this.body.blocked.right))) {
        this.state = 'CHASE';
        this.attackCooldown = 1.2;
      }
      return;
    }

    if (this.state === 'CHARGE_TELEGRAPH') {
      this.setVelocityX(0);
      this.telegraphTimer -= dt;
      if (this.telegraphTimer <= 0) {
        this.restoreTint();
        this.state = 'CHARGING';
        this.chargeTimer = 0.9;
        this.chargeCooldown = 5.2;
        this.chargeDir = dir;
        this.setVelocityX(dir * 260);
      }
      return;
    }

    if (this.state === 'CHARGING') {
      this.chargeTimer -= dt;
      this.setVelocityX(this.chargeDir * 260);
      if (Math.random() > 0.4) {
        this.scene.juice.emitSparks(this.x, this.y + 20, 2);
      }

      // Impact with player during charge
      if (dist < 65) {
        if (player.isParrying) {
          player.onSuccessfulParry(this);
          this.state = 'STAGGERED';
          this.staggerTimer = 2.0;
          return;
        } else if (!player.isDashing) {
          player.takeDamage(this.damage + 8, this.x);
          player.setVelocityX(this.chargeDir * 240);
          player.setVelocityY(-140);
        }
      }

      // End of charge or wall impact
      if (this.chargeTimer <= 0 || (this.body && (this.body.blocked.left || this.body.blocked.right))) {
        this.setVelocityX(0);
        if (this.scene && typeof this.scene.triggerEnemySlamShockwave === 'function') {
          this.scene.triggerEnemySlamShockwave(this.x, this.y + 24, 130, this.damage);
        }
        this.state = 'CHASE';
        this.attackCooldown = 1.8;
      }
      return;
    }

    if (this.state === 'CHASE') {
      if (dist <= this.attackRange && this.attackCooldown <= 0) {
        this.state = 'TELEGRAPH';
        this.telegraphTimer = 0.36;
        this.setVelocityX(0);
        this.setTint(0xef4444); // Flash red warning

        if (this.enemyType === 'cultist' && this.scene.anims.exists('wizard-fire')) {
          this.anims.play('wizard-fire', true);
        }
      } else {
        if (this.isSniper) {
          // Elevated sniper holds high ground to rain spells from above
          this.setVelocityX(0);
          if (this.scene.anims.exists('wizard-idle')) {
            this.anims.play('wizard-idle', true);
          }
        } else {
          this.setVelocityX(dir * this.speed);
          if (this.enemyType === 'ghoul' || this.enemyType === 'elite') {
            if (this.scene.anims.exists('ghoul-run')) {
              this.anims.play('ghoul-run', true);
            }
          } else if (this.enemyType === 'cultist') {
            if (this.scene.anims.exists('wizard-idle')) {
              this.anims.play('wizard-idle', true);
            }
          }
        }
      }
    } else if (this.state === 'TELEGRAPH') {
      this.setVelocityX(0);
      this.telegraphTimer -= dt;
      if (this.telegraphTimer <= 0) {
        this.restoreTint();
        this.executeAttack(player);
      }
    }
  }

  showTelegraphWarning() {
    if (!this.scene) return;
    const marker = this.scene.add.text(this.x, this.y - 32, '!', {
      fontFamily: 'monospace', fontSize: '18px', fontStyle: 'bold', color: '#f87171',
      stroke: '#05070a', strokeThickness: 4
    }).setOrigin(0.5).setDepth(30);

    this.scene.tweens.add({
      targets: marker,
      y: marker.y - 14,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 380,
      onComplete: () => marker.destroy()
    });
  }

  executeCultistTeleport(player) {
    if (!this.scene) return;
    this.scene.juice.emitVoidEmbers(this.x, this.y, 10);
    const stepDir = this.x > player.x ? 1 : -1;
    const destX = Phaser.Math.Clamp(this.x + stepDir * 170, 80, 2320);
    this.setPosition(destX, this.y);
    this.scene.juice.emitVoidEmbers(this.x, this.y, 10);
    this.teleportCooldown = 4.5;
    this.attackCooldown = 0.5;
    try {
      SoundSynth.playHit();
    } catch (e) {}
  }

  executeBossTeleport(player) {
    if (!this.scene) return;
    this.scene.juice.emitVoidEmbers(this.x, this.y, 18);

    // Strategic teleport positions across the boss arena
    const positions = [
      { x: 1400, y: 480 },
      { x: 1040, y: 340 },
      { x: 1300, y: 260 },
      { x: 1650, y: 480 }
    ];
    // Filter to positions not immediately at current location
    const candidates = positions.filter(p => Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) > 150);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)] || positions[0];

    this.setPosition(chosen.x, chosen.y);
    this.scene.juice.emitVoidEmbers(this.x, this.y, 18);
    this.scene.juice.addTrauma(0.3);
    this.attackCooldown = 0.6;
  }

  executeAttack(player) {
    if (!this.active || !this.body || this.isDead) return;
    this.state = 'ATTACK';
    const dir = player.x > this.x ? 1 : -1;
    if (this.enemyType === 'cultist') {
      this.setFlipX(dir < 0);
    } else {
      this.setFlipX(dir > 0);
    }

    // Check if player parries this strike (melee range strikes only)!
    if (this.enemyType !== 'cultist' && player.isParrying && Math.abs(player.x - this.x) < 85) {
      player.onSuccessfulParry(this);
      this.state = 'STAGGERED';
      this.staggerTimer = 1.6;
      this.attackCooldown = 2.0;
      return;
    }

    if (this.enemyType === 'cultist') {
      if (this.scene && typeof this.scene.spawnEnemyProjectile === 'function') {
        if (this.isBoss) {
          // Boss Multi-Angle Volley (Triple spread or Quintuple in Phase 2)
          this.scene.spawnEnemyProjectile(this.x + dir * 20, this.y - 4, dir, this.damage, -70);
          this.scene.spawnEnemyProjectile(this.x + dir * 20, this.y - 4, dir, this.damage, 0);
          this.scene.spawnEnemyProjectile(this.x + dir * 20, this.y - 4, dir, this.damage, 70);

          if (this.bossPhase === 2) {
            this.scene.time.delayedCall(220, () => {
              if (this.active && !this.isDead && this.scene) {
                this.scene.spawnEnemyProjectile(this.x + dir * 20, this.y - 4, dir, this.damage, -110);
                this.scene.spawnEnemyProjectile(this.x + dir * 20, this.y - 4, dir, this.damage, 110);
              }
            });
          }
        } else {
          // Regular Cultist 2-round burst
          this.scene.spawnEnemyProjectile(this.x + dir * 18, this.y - 4, dir, this.damage, 0);
          if (this.scene.currentRoom >= 2) {
            this.scene.time.delayedCall(220, () => {
              if (this.active && !this.isDead && this.scene) {
                this.scene.spawnEnemyProjectile(this.x + dir * 18, this.y - 4, dir, this.damage, -35);
              }
            });
          }
        }
      }
    } else {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (dist < this.attackRange + 15) {
        player.takeDamage(this.damage, this.x);
      }

      // Elite ground slam secondary shockwave
      if (this.enemyType === 'elite' && this.scene && typeof this.scene.triggerEnemySlamShockwave === 'function') {
        this.scene.triggerEnemySlamShockwave(this.x, this.y + 24, 110, Math.round(this.damage * 0.75));
      }
    }

    this.attackCooldown = this.isBoss && this.bossPhase === 2 ? 0.9 : 1.4;
    this.scene.time.delayedCall(300, () => {
      if (this.active && this.state !== 'STAGGERED' && !this.isDead) {
        this.state = 'CHASE';
        if (this.enemyType === 'cultist' && this.scene.anims.exists('wizard-idle')) {
          this.anims.play('wizard-idle', true);
        }
      }
    });
  }

  takeDamage(amount, sourceX = 0, isCrit = false, isBeast = false) {
    if (!this.active || !this.body || this.isDead) return;
    this.hp -= amount;

    this.scene.juice.addTrauma(isBeast ? 0.35 : 0.15);
    this.scene.juice.hitStop(isBeast ? 80 : 45);
    this.scene.juice.emitBlood(this.x, this.y, isBeast ? 16 : 8);
    this.scene.juice.popDamageNumber(this.x, this.y, amount, isCrit ? 'crit' : (isBeast ? 'beast' : 'normal'));

    try {
      this.scene.sound.play('sfx-hurt', { volume: 0.4 });
    } catch (e) {
      SoundSynth.playHit();
    }

    const knockDir = this.x >= sourceX ? 1 : -1;
    this.setVelocityX(knockDir * (isBeast ? 220 : 120));
    this.setVelocityY(-80);

    this.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (this.active && !this.isDead) {
        this.restoreTint();
      }
    });

    if (this.hp <= 0) {
      this.die();
    }
  }

  applyBleed(ticks = 3, damagePerTick = 8) {
    if (this.isDead || !this.active) return;
    let count = 0;
    const bleedTimer = this.scene.time.addEvent({
      delay: 450,
      repeat: ticks - 1,
      callback: () => {
        if (this.active && !this.isDead) {
          this.hp -= damagePerTick;
          this.setTint(0x991b1b);
          this.scene.juice.popDamageNumber(this.x, this.y - 15, damagePerTick, 'crit');
          this.scene.juice.emitBlood(this.x, this.y, 4);
          this.scene.time.delayedCall(120, () => {
            if (this.active && !this.isDead) this.restoreTint();
          });
          if (this.hp <= 0) {
            bleedTimer.remove();
            this.die();
          }
        } else {
          bleedTimer.remove();
        }
      }
    });
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    if (this.body) this.setVelocity(0, 0);

    // Clean up shadow
    if (this.shadow) {
      this.shadow.destroy();
      this.shadow = null;
    }

    // Relic effect: Crown of the Defiled (Blood explosion damaging nearby foes)
    if (this.scene && typeof this.scene.triggerBloodExplosion === 'function') {
      if (this.scene.player && this.scene.player.statMods && this.scene.player.statMods.bloodExplosion) {
        this.scene.triggerBloodExplosion(this.x, this.y, 45);
      }
    }

    // Spawn animated Gothicvania death explosion!
    if (this.scene.anims.exists('enemy-death-fx')) {
      const deathFx = this.scene.add.sprite(this.x, this.y, 'enemy-death');
      deathFx.anims.play('enemy-death-fx');
      deathFx.on('animationcomplete', () => deathFx.destroy());
    }

    try {
      this.scene.sound.play('sfx-kill', { volume: 0.6 });
    } catch (e) {
      SoundSynth.playRoar();
    }

    this.scene.juice.emitBlood(this.x, this.y, 24);
    this.scene.juice.addTrauma(0.25);

    // Blood Orb drop pacing: 35% chance on regular foes, guaranteed 100% on Elites and Bosses
    const isSpecial = Boolean(this.isBoss || this.enemyType === 'elite' || this.isElite);
    const bloodDropChance = isSpecial ? 1.0 : 0.35;
    if (Math.random() < bloodDropChance) {
      this.scene.spawnBloodOrb(this.x, this.y);
    }
    if (Math.random() > 0.4) {
      this.scene.spawnGoldCoin(this.x + (Math.random() * 20 - 10), this.y);
    }

    EventBus.emit('enemy:killed', { enemy: this, type: this.enemyType });

    this.destroy();
  }
}

export default Enemy;
