// Enemy.js - AI Enemies with Telegraphs, Parry Vulnerability, Multi-Enemy Types, Bosses, and Drops
import Phaser from 'phaser';
import { SoundSynth } from '../core/SoundSynth.js';
import { EventBus } from '../core/EventBus.js';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = 'ghoul') {
    let texture = 'burning-ghoul';
    if (type === 'cultist') texture = 'wizard';
    if (type === 'elite') texture = 'burning-ghoul';
    if (type === 'bat') texture = 'bat-fly';
    if (type === 'skeleton') texture = 'skeleton';
    if (type === 'sorcerer') texture = 'sorcerer';
    if (type === 'general_vane') texture = 'skeleton';
    if (type === 'belial') texture = 'sorcerer';

    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.enemyType = type;
    this.setCollideWorldBounds(true);

    // Grounded Drop-Shadow for 16-bit depth (except flying bat)
    if (type !== 'bat' && scene.textures.exists('shadow_ellipse')) {
      const shadowY = (type === 'elite' || type === 'general_vane' || type === 'belial') ? y + 36 : y + 24;
      this.shadow = scene.add.image(x, shadowY, 'shadow_ellipse').setDepth(this.depth - 1).setAlpha(0.45);
      if (type === 'elite' || type === 'general_vane' || type === 'belial') {
        this.shadow.setScale(1.5, 1.3);
      }
    }

    // Chamber Progression Scaling
    const currentRoom = (scene && scene.currentRoom) || 1;
    const roomScale = 1.0 + Math.max(0, currentRoom - 1) * 0.16;
    const dmgScale = 1.0 + Math.max(0, currentRoom - 1) * 0.14;
    const speedScale = 1.0 + Math.min(0.45, (currentRoom - 1) * 0.06);

    // Initial stats and hitbox by type
    this.isFlying = false;
    this.isBoss = false;
    this.bossPhase = 1;

    if (type === 'ghoul') {
      this.maxHp = Math.round(54 * roomScale);
      this.hp = this.maxHp;
      this.speed = Math.round(92 * speedScale);
      this.damage = Math.round(14 * dmgScale);
      this.attackRange = 46;
      this.body.setSize(30, 48).setOffset(14, 10);
      if (scene.anims.exists('ghoul-run')) this.anims.play('ghoul-run', true);
    } else if (type === 'cultist') {
      this.maxHp = Math.round(44 * roomScale);
      this.hp = this.maxHp;
      this.speed = Math.round(55 * speedScale);
      this.damage = Math.round(16 * dmgScale);
      this.isSniper = y < 460;
      this.attackRange = this.isSniper ? 450 : 290;
      this.body.setSize(32, 52).setOffset(24, 12);
      if (scene.anims.exists('wizard-idle')) this.anims.play('wizard-idle', true);
    } else if (type === 'bat') {
      this.maxHp = Math.round(32 * roomScale);
      this.hp = this.maxHp;
      this.speed = Math.round(115 * speedScale);
      this.damage = Math.round(12 * dmgScale);
      this.attackRange = 40;
      this.isFlying = true;
      this.body.setAllowGravity(false);
      this.body.setSize(24, 30).setOffset(4, 10);
      if (scene.anims.exists('bat-fly-anim')) this.anims.play('bat-fly-anim', true);
      this.homeY = y;
      this.swoopPhase = 'HOVER';
      this.hoverTimer = 0;
    } else if (type === 'skeleton') {
      this.maxHp = Math.round(75 * roomScale);
      this.hp = this.maxHp;
      this.speed = Math.round(70 * speedScale);
      this.damage = Math.round(18 * dmgScale);
      this.attackRange = 52;
      this.body.setSize(32, 54).setOffset(8, 10);
      if (scene.anims.exists('skeleton-walk')) this.anims.play('skeleton-walk', true);
      this.isShieldGuarding = false;
      this.shieldCooldown = 3.5;
    } else if (type === 'sorcerer') {
      this.maxHp = Math.round(58 * roomScale);
      this.hp = this.maxHp;
      this.speed = Math.round(50 * speedScale);
      this.damage = Math.round(20 * dmgScale);
      this.attackRange = 360;
      this.body.setSize(30, 44).setOffset(5, 4);
      if (scene.anims.exists('sorcerer-idle')) this.anims.play('sorcerer-idle', true);
      this.castCooldown = 2.8;
    } else if (type === 'elite') {
      this.maxHp = Math.round(250 * roomScale);
      this.hp = this.maxHp;
      this.speed = Math.round(65 * speedScale);
      this.damage = Math.round(26 * dmgScale);
      this.attackRange = 70;
      this.setScale(1.35);
      this.body.setSize(36, 50).setOffset(10, 8);
      this.setTint(0x991b1b);
      if (scene.anims.exists('ghoul-run')) this.anims.play('ghoul-run', true);
    } else if (type === 'general_vane') {
      // CHAPTER 2 BOSS: General Vane the Decapitator (Tuned base HP 1150)
      this.isBoss = true;
      this.maxHp = Math.round(1150 * roomScale);
      this.hp = this.maxHp;
      this.speed = Math.round(82 * speedScale);
      this.damage = Math.round(30 * dmgScale);
      this.attackRange = 85;
      this.setScale(1.85);
      this.body.setSize(38, 56).setOffset(5, 8);
      this.setTint(0x334155); // Dark gothic steel
      if (scene.anims.exists('skeleton-walk')) this.anims.play('skeleton-walk', true);
      this.slamCooldown = 4.0;
      this.cleaveCooldown = 2.2;
    } else if (type === 'belial') {
      // CHAPTER 3 FINAL BOSS: Void Arch-Seraph Belial (Tuned base HP 1650)
      this.isBoss = true;
      this.isFlying = true;
      this.body.setAllowGravity(false);
      this.maxHp = Math.round(1650 * roomScale);
      this.hp = this.maxHp;
      this.speed = Math.round(95 * speedScale);
      this.damage = Math.round(36 * dmgScale);
      this.attackRange = 400;
      this.setScale(1.9);
      this.body.setSize(36, 46).setOffset(2, 2);
      this.setTint(0x7c3aed); // Royal Void Purple
      if (scene.anims.exists('sorcerer-idle')) this.anims.play('sorcerer-idle', true);
      this.starfallCooldown = 5.0;
      this.beamCooldown = 6.5;
      this.homeY = y;
    }

    // State & Timers
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
    this.bossTeleportCooldown = 5.0;
  }

  restoreTint() {
    if (this.enemyType === 'general_vane') {
      this.setTint(this.bossPhase === 2 ? 0xdc2626 : 0x334155);
    } else if (this.enemyType === 'belial') {
      this.setTint(this.bossPhase === 2 ? 0xef4444 : 0x7c3aed);
    } else if (this.isBoss) {
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

    // Direct Spike Hazard Overlap Protection: enemies in spikes take fatal damage immediately
    if (this.y > 575 && this.scene && this.scene.hazards) {
      if (this.scene.physics.overlap(this, this.scene.hazards)) {
        this.scene.juice.emitBlood(this.x, this.y, 24);
        this.die();
        return;
      }
    }

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
    if (this.shieldCooldown > 0) this.shieldCooldown -= dt;
    if (this.castCooldown > 0) this.castCooldown -= dt;
    if (this.slamCooldown > 0) this.slamCooldown -= dt;
    if (this.cleaveCooldown > 0) this.cleaveCooldown -= dt;
    if (this.starfallCooldown > 0) this.starfallCooldown -= dt;
    if (this.beamCooldown > 0) this.beamCooldown -= dt;

    // Handle Staggered state (from Player Parry)
    if (this.state === 'STAGGERED') {
      this.setVelocityX(0);
      if (this.isFlying) this.setVelocityY(0);
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
    if (this.enemyType === 'cultist' || this.enemyType === 'bat' || this.enemyType === 'sorcerer' || this.enemyType === 'belial') {
      this.setFlipX(dir < 0);
    } else {
      this.setFlipX(dir > 0);
    }

    // ==========================================
    // BOSS 1: HIGH INQUISITOR MALAKOR (Cultist Boss)
    // ==========================================
    if (this.isBoss && this.enemyType === 'cultist') {
      if (this.bossPhase === 1 && this.hp <= this.maxHp * 0.5) {
        this.bossPhase = 2;
        this.speed = Math.round(this.speed * 1.35);
        this.damage = Math.round(this.damage * 1.25);
        this.setTint(0xff0044);
        this.scene.juice.addTrauma(0.7);
        if (this.scene.cameras && this.scene.cameras.main) {
          this.scene.cameras.main.flash(350, 200, 20, 20);
        }
        try { SoundSynth.playRoar(); } catch (e) {}
      }

      if (this.bossTeleportCooldown <= 0 && this.state !== 'STAGGERED') {
        this.bossTeleportCooldown = this.bossPhase === 2 ? 3.8 : 5.5;
        this.executeBossTeleport(player);
        return;
      }
    }

    // ==========================================
    // BOSS 2: GENERAL VANE THE DECAPITATOR (Chapter 2)
    // ==========================================
    if (this.enemyType === 'general_vane') {
      if (this.bossPhase === 1 && this.hp <= this.maxHp * 0.5) {
        this.bossPhase = 2;
        this.speed = Math.round(this.speed * 1.4);
        this.damage = Math.round(this.damage * 1.3);
        this.setTint(0xdc2626); // Crimson Blood Berserk
        this.scene.juice.addTrauma(0.85);
        if (this.scene.cameras && this.scene.cameras.main) {
          this.scene.cameras.main.flash(400, 220, 20, 20);
        }
        EventBus.emit('notification:show', {
          text: '⚡ GENERAL VANE UNLEASHES BLOOD RAGE! ⚡',
          color: '#ef4444'
        });
        try { SoundSynth.playRoar(); } catch (e) {}
      }

      // Seismic Jump Slam Attack
      if (this.slamCooldown <= 0 && this.state === 'CHASE' && onFloor && dist > 100) {
        this.slamCooldown = this.bossPhase === 2 ? 3.5 : 5.5;
        this.state = 'SLAM_WINDUP';
        this.telegraphTimer = 0.5;
        this.setVelocityX(0);
        this.setTint(0xfacc15);
        this.showTelegraphWarning();
        return;
      }

      if (this.state === 'SLAM_WINDUP') {
        this.telegraphTimer -= dt;
        if (this.telegraphTimer <= 0) {
          this.state = 'SLAM_AIR';
          this.restoreTint();
          this.setVelocity(dir * 240, -420);
        }
        return;
      }

      if (this.state === 'SLAM_AIR') {
        if (this.body.velocity.y > 0) {
          this.setVelocityY(580); // Heavy downward smash
        }
        if (onFloor) {
          this.state = 'CHASE';
          this.scene.juice.addTrauma(0.8);
          this.scene.cameras.main.shake(250, 0.015);
          try { SoundSynth.playRoar(); } catch (e) {}
          if (typeof this.scene.triggerEnemySlamShockwave === 'function') {
            this.scene.triggerEnemySlamShockwave(this.x, this.y + 20, 160, Math.round(this.damage * 0.8));
          }
          this.scene.juice.emitSparks(this.x, this.y + 24, 20);
        }
        return;
      }
    }

    // ==========================================
    // BOSS 3: VOID ARCH-SERAPH BELIAL (Chapter 3)
    // ==========================================
    if (this.enemyType === 'belial') {
      if (this.bossPhase === 1 && this.hp <= this.maxHp * 0.5) {
        this.bossPhase = 2;
        this.damage = Math.round(this.damage * 1.35);
        this.setTint(0xef4444);
        this.scene.juice.addTrauma(0.9);
        if (this.scene.cameras && this.scene.cameras.main) {
          this.scene.cameras.main.flash(500, 140, 20, 180);
        }
        EventBus.emit('notification:show', {
          text: '✦ BELIAL AWAKENS: VOID CATACLYSM ✦',
          color: '#c084fc'
        });
        try { SoundSynth.playRoar(); } catch (e) {}
      }

      // Smooth floating flight towards player altitude
      const targetHoverY = player.y - 70;
      this.y += (targetHoverY - this.y) * 0.04;
      this.setVelocityX(dir * (dist > 180 ? this.speed : 30));

      // Void Starfall Rain
      if (this.starfallCooldown <= 0 && this.state === 'CHASE') {
        this.starfallCooldown = this.bossPhase === 2 ? 4.0 : 6.0;
        this.state = 'STARFALL_CAST';
        this.telegraphTimer = 0.6;
        this.setTint(0xc084fc);
        this.showTelegraphWarning();
        return;
      }

      if (this.state === 'STARFALL_CAST') {
        this.telegraphTimer -= dt;
        if (this.telegraphTimer <= 0) {
          this.restoreTint();
          this.state = 'CHASE';
          const cometCount = this.bossPhase === 2 ? 6 : 4;
          for (let i = 0; i < cometCount; i++) {
            this.scene.time.delayedCall(i * 180, () => {
              if (this.active && !this.isDead && player.active) {
                const targetX = player.x + (Math.random() * 160 - 80);
                this.scene.spawnEnemyProjectile(targetX, 100, 0, this.damage * 0.7, 320, 0, 0x9333ea);
              }
            });
          }
        }
        return;
      }
    }

    // ==========================================
    // BAT AI (Airborne Predator)
    // ==========================================
    if (this.enemyType === 'bat') {
      this.hoverTimer += dt;
      if (this.swoopPhase === 'HOVER') {
        this.y = this.homeY + Math.sin(this.hoverTimer * 3.5) * 20;
        this.setVelocityX(dir * 45);
        if (dist < 220 && this.attackCooldown <= 0) {
          this.swoopPhase = 'SWOOP';
          this.attackCooldown = 2.4;
          const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
          this.scene.physics.velocityFromRotation(angle, 260, this.body.velocity);
        }
      } else if (this.swoopPhase === 'SWOOP') {
        if (dist < 38) {
          if (player.isParrying) {
            player.onSuccessfulParry(this);
            this.state = 'STAGGERED';
            this.staggerTimer = 1.6;
            this.swoopPhase = 'HOVER';
            return;
          } else if (!player.isDashing) {
            player.takeDamage(this.damage, this.x);
          }
          this.swoopPhase = 'RETREAT';
        } else if (this.y >= player.y + 30) {
          this.swoopPhase = 'RETREAT';
        }
      } else if (this.swoopPhase === 'RETREAT') {
        this.y += (this.homeY - this.y) * 0.08;
        this.setVelocityX(-dir * 120);
        if (Math.abs(this.y - this.homeY) < 15) {
          this.swoopPhase = 'HOVER';
        }
      }
      return;
    }

    // ==========================================
    // SKELETON AI (Shield Stance & Parryable Slash)
    // ==========================================
    if (this.enemyType === 'skeleton' && !this.isBoss) {
      if (this.shieldCooldown <= 0 && dist < 120 && Math.random() < 0.4) {
        this.isShieldGuarding = true;
        this.shieldCooldown = 4.5;
        this.setTint(0x94a3b8);
        this.scene.time.delayedCall(1200, () => {
          this.isShieldGuarding = false;
          this.restoreTint();
        });
      }
    }

    // ==========================================
    // SORCERER AI (Ranged Dark Projectiles & Teleport)
    // ==========================================
    if (this.enemyType === 'sorcerer' && !this.isBoss) {
      if (dist < 90 && this.teleportCooldown <= 0 && this.state !== 'STAGGERED') {
        this.executeCultistTeleport(player);
        return;
      }
      if (dist <= this.attackRange && this.castCooldown <= 0 && this.state === 'CHASE') {
        this.castCooldown = 3.0;
        this.state = 'CASTING';
        this.setVelocityX(0);
        this.setTint(0xa855f7);
        if (this.scene.anims.exists('sorcerer-cast')) {
          this.anims.play('sorcerer-cast', true);
        }
        this.showTelegraphWarning();
        this.scene.time.delayedCall(450, () => {
          if (this.active && !this.isDead && this.state !== 'STAGGERED') {
            this.restoreTint();
            this.scene.spawnEnemyProjectile(this.x, this.y, dir, this.damage, 0, 260, 0x7c3aed);
            this.state = 'CHASE';
            if (this.scene.anims.exists('sorcerer-idle')) {
              this.anims.play('sorcerer-idle', true);
            }
          }
        });
        return;
      }
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
      try { SoundSynth.playRoar(); } catch (e) {}
      return;
    }

    // Ghoul Pounce Leap Check
    if (this.enemyType === 'ghoul' && this.state === 'CHASE' && dist >= 85 && dist <= 220 && this.pounceCooldown <= 0 && onFloor) {
      this.state = 'POUNCE_TELEGRAPH';
      this.telegraphTimer = 0.35;
      this.setVelocityX(0);
      this.setTint(0xf97316);
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
        }
      }
      if (onFloor && this.body.velocity.y >= 0) {
        this.state = 'CHASE';
        this.attackCooldown = 0.8;
      }
      return;
    }

    if (this.state === 'CHARGE_TELEGRAPH') {
      this.setVelocityX(0);
      this.telegraphTimer -= dt;
      if (this.telegraphTimer <= 0) {
        this.restoreTint();
        this.state = 'CHARGING';
        this.chargeDir = dir;
        this.chargeTimer = 0.85;
        this.chargeCooldown = 4.8;
      }
      return;
    }

    if (this.state === 'CHARGING') {
      this.chargeTimer -= dt;
      this.setVelocityX(this.chargeDir * 230);
      this.scene.juice.emitSparks(this.x, this.y + 20, 2);

      if (dist < 60) {
        if (player.isParrying) {
          player.onSuccessfulParry(this);
          this.state = 'STAGGERED';
          this.staggerTimer = 2.0;
          this.chargeTimer = 0;
          return;
        } else if (!player.isDashing) {
          player.takeDamage(this.damage + 8, this.x);
          player.setVelocityX(this.chargeDir * 280);
          player.setVelocityY(-140);
        }
      }

      if (this.chargeTimer <= 0 || this.body.blocked.left || this.body.blocked.right) {
        this.state = 'CHASE';
        this.attackCooldown = 1.2;
      }
      return;
    }

    // Default Chase & Melee/Ranged Attack
    if (this.state === 'CHASE') {
      if (dist <= this.attackRange && this.attackCooldown <= 0) {
        this.performAttack(player);
      } else if (dist <= this.attackRange && this.attackCooldown > 0) {
        this.setVelocityX(0);
        this.setTint(0xef4444);
        if (this.enemyType === 'cultist' && this.scene.anims.exists('wizard-fire')) {
          this.anims.play('wizard-fire', true);
        }
      } else {
        this.restoreTint();
        if (this.isSniper) {
          this.setVelocityX(0);
          if (this.scene.anims.exists('wizard-idle')) {
            this.anims.play('wizard-idle', true);
          }
        } else {
          this.setVelocityX(dir * this.speed);
          if (this.enemyType === 'ghoul' || this.enemyType === 'elite') {
            if (this.scene.anims.exists('ghoul-run')) this.anims.play('ghoul-run', true);
          } else if (this.enemyType === 'skeleton' || this.enemyType === 'general_vane') {
            if (this.scene.anims.exists('skeleton-walk')) this.anims.play('skeleton-walk', true);
          } else if (this.enemyType === 'cultist') {
            if (this.scene.anims.exists('wizard-idle')) this.anims.play('wizard-idle', true);
          }
        }
      }
    }
  }

  showTelegraphWarning() {
    if (!this.scene || !this.active) return;
    const warn = this.scene.add.text(this.x, this.y - 36, '!', {
      fontFamily: 'monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ef4444',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(20);

    this.scene.tweens.add({
      targets: warn,
      y: this.y - 48,
      alpha: 0,
      scale: 1.5,
      duration: 400,
      onComplete: () => warn.destroy()
    });
  }

  executeCultistTeleport(player) {
    if (!this.scene || !this.active || this.isDead) return;
    this.teleportCooldown = 3.5;
    this.scene.juice.emitVoidEmbers(this.x, this.y, 16);
    try { SoundSynth.playDash(); } catch (e) {}

    const fleeDir = player.x > this.x ? -1 : 1;
    let targetX = this.x + fleeDir * 140;
    targetX = Phaser.Math.Clamp(targetX, 80, this.scene.physics.world.bounds.width - 80);

    this.setPosition(targetX, this.y);
    this.scene.juice.emitVoidEmbers(targetX, this.y, 16);
  }

  executeBossTeleport(player) {
    if (!this.scene || !this.active || this.isDead) return;
    this.scene.juice.emitVoidEmbers(this.x, this.y, 30);
    this.scene.juice.emitSparks(this.x, this.y, 18);
    this.scene.juice.addTrauma(0.4);
    try { SoundSynth.playDash(); } catch (e) {}

    const platforms = [
      { x: 420, y: 400 },
      { x: 780, y: 320 },
      { x: 1120, y: 230 },
      { x: 1460, y: 320 },
      { x: 1820, y: 400 },
      { x: 600, y: 520 },
      { x: 1300, y: 520 }
    ];

    const sortedByDist = platforms
      .map(p => ({ ...p, dist: Phaser.Math.Distance.Between(player.x, player.y, p.x, p.y) }))
      .filter(p => p.dist > 180)
      .sort((a, b) => b.dist - a.dist);

    const chosen = sortedByDist[Math.floor(Math.random() * Math.min(3, sortedByDist.length))] || platforms[0];

    this.setPosition(chosen.x, chosen.y);
    this.setVelocity(0, 0);
    this.scene.juice.emitVoidEmbers(chosen.x, chosen.y, 30);
    this.scene.juice.emitHolySparks(chosen.x, chosen.y, 15);

    this.attackCooldown = 0.4;
    this.performAttack(player);
  }

  performAttack(player) {
    if (!this.active || !this.body || this.isDead) return;
    this.state = 'ATTACK';
    const dir = player.x > this.x ? 1 : -1;
    if (this.enemyType === 'cultist' || this.enemyType === 'bat' || this.enemyType === 'sorcerer' || this.enemyType === 'belial') {
      this.setFlipX(dir < 0);
    } else {
      this.setFlipX(dir > 0);
    }

    // Check if player parries this strike!
    if (this.enemyType !== 'cultist' && this.enemyType !== 'sorcerer' && player.isParrying && Math.abs(player.x - this.x) < 85) {
      player.onSuccessfulParry(this);
      this.state = 'STAGGERED';
      this.staggerTimer = 1.6;
      this.attackCooldown = 1.8;
      return;
    }

    if (this.enemyType === 'cultist') {
      if (this.scene && typeof this.scene.spawnEnemyProjectile === 'function') {
        if (this.isBoss) {
          const volleyCount = this.bossPhase === 2 ? 5 : 3;
          const spreadAngles = this.bossPhase === 2 ? [-0.35, -0.18, 0, 0.18, 0.35] : [-0.22, 0, 0.22];
          spreadAngles.forEach((angle, idx) => {
            this.scene.time.delayedCall(idx * 80, () => {
              if (this.active && !this.isDead) {
                const baseSpeed = 240;
                const vx = Math.cos(angle) * (dir > 0 ? baseSpeed : -baseSpeed);
                const vy = Math.sin(angle) * baseSpeed;
                this.scene.spawnEnemyProjectile(this.x, this.y, dir, this.damage, vy, Math.abs(vx), this.bossPhase === 2 ? 0xff0044 : null);
              }
            });
          });
        } else {
          this.scene.spawnEnemyProjectile(this.x, this.y, dir, this.damage);
        }
      }
      this.attackCooldown = this.isBoss ? (this.bossPhase === 2 ? 1.4 : 2.0) : 2.2;
    } else {
      // Melee Slash Hitbox
      if (!player.isDashing) {
        player.takeDamage(this.damage, this.x);
      }
      this.attackCooldown = 1.4;

      if (this.enemyType === 'elite' && this.scene && typeof this.scene.triggerEnemySlamShockwave === 'function') {
        this.scene.triggerEnemySlamShockwave(this.x, this.y + 24, 110, Math.round(this.damage * 0.75));
      }
      if (this.enemyType === 'general_vane' && this.scene && typeof this.scene.triggerEnemySlamShockwave === 'function') {
        this.scene.triggerEnemySlamShockwave(this.x, this.y + 28, 140, Math.round(this.damage * 0.85));
      }
    }

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
    if (this.isDead || !this.active) return;

    // Skeleton Shield Block check: frontal attacks blocked if guarding
    if (this.isShieldGuarding && !isCrit) {
      const isFacingAttacker = (sourceX > this.x && this.flipX) || (sourceX < this.x && !this.flipX);
      if (isFacingAttacker) {
        this.scene.juice.emitSparks(this.x, this.y, 10);
        this.scene.juice.popDamageNumber(this.x, this.y, 0, 'normal');
        try { SoundSynth.playParry(); } catch (e) {}
        return;
      }
    }

    this.hp -= amount;
    this.scene.juice.emitBlood(this.x, this.y, isCrit ? 18 : 8);
    this.scene.juice.popDamageNumber(this.x, this.y, amount, isCrit ? 'crit' : (isBeast ? 'beast' : 'normal'));

    try {
      this.scene.sound.play('sfx-hurt', { volume: 0.4 });
    } catch (e) {
      SoundSynth.playHit();
    }

    const knockDir = this.x >= sourceX ? 1 : -1;
    this.setVelocityX(knockDir * (isBeast ? 220 : 120));
    if (!this.isFlying) {
      this.setVelocityY(-80);
    }

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

  die() {
    if (this.isDead) return;
    this.isDead = true;
    if (this.body) this.setVelocity(0, 0);

    if (this.shadow) {
      this.shadow.destroy();
      this.shadow = null;
    }

    if (this.scene && typeof this.scene.triggerBloodExplosion === 'function') {
      if (this.scene.player && this.scene.player.statMods && this.scene.player.statMods.bloodExplosion) {
        this.scene.triggerBloodExplosion(this.x, this.y, 45);
      }
    }

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

    // Blood Orb drop pacing: 35% chance on regular foes, 100% on Elites/Bosses
    const isSpecial = Boolean(this.isBoss || this.enemyType === 'elite' || this.isElite);
    const bloodDropChance = isSpecial ? 1.0 : 0.35;
    if (Math.random() < bloodDropChance) {
      this.scene.spawnBloodOrb(this.x, this.y);
    }
    if (Math.random() > 0.4) {
      this.scene.spawnGoldCoin(this.x + (Math.random() * 20 - 10), this.y);
    }

    // Blood Quartz drop for MetaProgression
    let quartzDrop = 0;
    if (this.enemyType === 'belial') {
      quartzDrop = 60;
    } else if (this.enemyType === 'general_vane') {
      quartzDrop = 40;
    } else if (this.isBoss) {
      quartzDrop = 25;
    } else if (this.enemyType === 'elite') {
      quartzDrop = Phaser.Math.Between(4, 7);
    } else if (Math.random() < 0.30) {
      quartzDrop = 1;
    }

    if (quartzDrop > 0 && this.scene && typeof this.scene.spawnBloodQuartz === 'function') {
      this.scene.spawnBloodQuartz(this.x, this.y, quartzDrop);
    }

    EventBus.emit('enemy:killed', { enemy: this, type: this.enemyType });

    this.destroy();
  }
}

export default Enemy;
