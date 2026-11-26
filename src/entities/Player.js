// Player.js - Holy Knight with Mouse Combat (LMB: Attack, RMB: Dash), Parry, Form Swap & Potions
import Phaser from 'phaser';
import { SoundSynth } from '../core/SoundSynth.js';
import { EventBus } from '../core/EventBus.js';
import { MetaProgression } from '../systems/MetaProgression.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, initialHp = 150, initialCorruption = 0) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Meta-Progression & Difficulty Mode Modifiers
    const meta = MetaProgression.getInstance();
    const metaBonuses = meta.getCombinedStatBonuses();
    const diff = meta.getDifficultyConfig();
    this.incomingDamageMult = diff.enemyDamageMult !== undefined ? diff.enemyDamageMult : 0.75;
    this.hitInvulnDuration = diff.invulnSeconds || 0.70;
    this.orbHealBonus = diff.orbHealBonus || 0;

    // HP & Vitality (Safely guarded against undefined/NaN)
    this.maxHp = 150 + (metaBonuses.maxHp || 0) + (diff.hpBonus || 0);
    this.hp = (initialHp !== undefined && !isNaN(initialHp) && Number(initialHp) > 0)
      ? Math.min(this.maxHp, Number(initialHp))
      : this.maxHp;

    // Hitbox sizing matching Gothicvania player dimensions (82x60)
    this.body.setSize(26, 50).setOffset(28, 10);
    this.setCollideWorldBounds(true);

    // Movement & Facing (Tuned for responsive, snappy, agile feel)
    this.speed = 240 + (metaBonuses.speedBonus || 0);
    this.facing = 1; // 1: facing right, -1: facing left
    this.jumpVelocity = -445; // Tuned for fluid platform clearance
    this.isDead = false;

    // Consumable Potions ([F] Key)
    this.maxPotions = (metaBonuses.maxPotions || 2) + (diff.potionBonus || 0);
    this.potions = (scene && scene.savedPotions !== undefined) ? Math.min(this.maxPotions, scene.savedPotions) : this.maxPotions;
    this.potionCooldown = 0;

    // Form / Skull Swap (Skul: The Hero Slayer mechanic)
    this.activeForm = 'crusader'; // 'crusader' | 'berserker'
    this.skullRank = (scene && scene.savedSkullRank) ? scene.savedSkullRank : 1; // 1: Initiated, 2: Awakened, 3: Legendary
    this.swapCooldown = 0;
    this.skillCooldown = 0;
    this.baseSkillCooldown = 4.5;
    this.quintessence = null;
    this.quintessenceCooldown = 0;
    this.shieldTimer = 0; // Brief Holy Aegis / Titan Armor reduction

    // Grounded Drop-Shadow for 16-bit depth
    if (scene.textures.exists('shadow_ellipse')) {
      this.shadow = scene.add.image(x, y + 26, 'shadow_ellipse').setDepth(this.depth - 1).setAlpha(0.55);
    }

    // Platformer Feel
    this.coyoteCounter = 0;
    this.jumpBufferCounter = 0;
    this.jumpCount = 0;
    this.maxJumps = 2; // Double jump enabled

    // Combat & Dash
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.baseDashCooldown = Math.max(0.32, 0.48 * (metaBonuses.dashCooldownMult || 1.0));
    this.isParrying = false;
    this.parryTimer = 0;
    this.parryCooldown = 0;
    this.comboStep = 0;
    this.comboTimer = 0;
    this.attackCooldown = 0;
    this.attackAnimTimer = 0;
    this.invulnTimer = 0; // Post-hit i-frames preventing multi-hit burst deaths
    this.frenzyTimer = 0; // Blood Frenzy buff from Altar of Sacrifice

    // Corruption & Beast Form (Persisted across rooms and runs)
    this.corruption = (initialCorruption !== undefined && !isNaN(initialCorruption))
      ? Math.min(100, Math.max(0, Number(initialCorruption)))
      : 0;
    this.isBeast = false;
    this.isAwakened = false;
    this.wasOnFloor = false;
    this.beastType = null;
    this.beastTimer = 0;
    this.maxBeastDuration = 20; // 20 seconds
    this.beastDecayRate = 5; // 5% per second

    // Stat Modifiers from Relics & Gate Blessings
    this.statMods = {
      damageMult: (metaBonuses.damageMult || 1.0),
      maxHpBonus: 0,
      lifesteal: 0.15,
      parryWindowBonus: 0,
      attackSpeedMult: 1.0,
      corruptionGainMult: (metaBonuses.corruptionMult || 1.0),
      critChance: 0.10,
      critDamageBonus: 0.0,
      parryReflect: 1.0,
      orbHeal: 0,
      bleedChance: 0,
      voidPierce: false,
      slamShockwave: false,
      bloodExplosion: false,
      holyArcDamage: 0
    };

    // Slash FX sprite container
    this.slashSprite = scene.add.sprite(0, 0, 'slash_knight').setVisible(false);

    // Controls mapping (supports keyboard + mouse)
    this.keys = scene.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      attack: Phaser.Input.Keyboard.KeyCodes.J,
      parry: Phaser.Input.Keyboard.KeyCodes.K,
      dash: Phaser.Input.Keyboard.KeyCodes.L,
      potion: Phaser.Input.Keyboard.KeyCodes.F,
      swapTab: Phaser.Input.Keyboard.KeyCodes.TAB,
      swapKey: Phaser.Input.Keyboard.KeyCodes.C,
      skill: Phaser.Input.Keyboard.KeyCodes.Q,
      quint: Phaser.Input.Keyboard.KeyCodes.G,
      awaken: Phaser.Input.Keyboard.KeyCodes.U,
      finisher: Phaser.Input.Keyboard.KeyCodes.I,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      // Alternative keys
      altLeft: Phaser.Input.Keyboard.KeyCodes.LEFT,
      altRight: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      altUp: Phaser.Input.Keyboard.KeyCodes.UP,
      altAttack: Phaser.Input.Keyboard.KeyCodes.Z,
      altParry: Phaser.Input.Keyboard.KeyCodes.X,
      altDash: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      altAwaken: Phaser.Input.Keyboard.KeyCodes.V
    });

    // MOUSE INPUTS: Left Click = Attack, Right Click = Dash
    this.pointerDownHandler = (pointer) => {
      if (this.isDead) return;

      // Do not trigger attack/dash if clicking an interactive game object (e.g. gates, modal)
      if (this.scene && this.scene.input) {
        const hitObjects = this.scene.input.hitTestPointer(pointer);
        if (hitObjects && hitObjects.some(obj => obj.gateType !== undefined || obj.input?.enabled)) {
          if (hitObjects.some(obj => obj.gateType !== undefined)) {
            return;
          }
        }
      }

      // Attacks strictly follow character movement/facing direction (A/D or last faced), NEVER cursor position!
      if (pointer.rightButtonDown() || pointer.button === 2) {
        this.tryDash();
      } else if (pointer.leftButtonDown() || pointer.button === 0) {
        this.tryAttack();
      }
    };
    scene.input.on('pointerdown', this.pointerDownHandler);

    // Start in idle anim
    if (this.anims && this.scene.anims.exists('player-idle')) {
      this.anims.play('player-idle');
    }

    // Clean up
    this.on('destroy', () => {
      scene.input.off('pointerdown', this.pointerDownHandler);
      if (this.slashSprite) {
        this.slashSprite.destroy();
      }
      if (this.shadow) {
        this.shadow.destroy();
        this.shadow = null;
      }
    });
  }

  setFacingDirection(dir) {
    this.facing = dir;
    // Player source sprites face RIGHT by default.
    // Moving/aiming RIGHT (dir > 0): flipX = false
    // Moving/aiming LEFT (dir < 0): flipX = true
    this.setFlipX(dir < 0);
  }

  update(time, delta) {
    if (!this.active || !this.body || this.isDead) return;
    const dt = delta / 1000;

    // Keep grounded drop shadow aligned with player feet
    if (this.shadow) {
      this.shadow.setPosition(this.x, this.y + 26);
      this.shadow.setVisible(!this.isDead && this.visible);
    }

    // Timers update
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.parryCooldown > 0) this.parryCooldown -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.attackAnimTimer > 0) this.attackAnimTimer -= dt;
    if (this.potionCooldown > 0) this.potionCooldown -= dt;
    if (this.shieldTimer > 0) this.shieldTimer -= dt;
    if (this.skillCooldown > 0) {
      this.skillCooldown -= dt;
      if (!this._lastSkillEmit || (this._lastSkillEmit - this.skillCooldown) > 0.1 || this.skillCooldown <= 0) {
        this._lastSkillEmit = this.skillCooldown;
        EventBus.emit('skill:cooldown', { current: Math.max(0, this.skillCooldown), max: this.getSkillCooldownMax() });
      }
    }
    if (this.quintessenceCooldown > 0) {
      this.quintessenceCooldown -= dt;
      if (!this._lastQuintEmit || (this._lastQuintEmit - this.quintessenceCooldown) > 0.15 || this.quintessenceCooldown <= 0) {
        this._lastQuintEmit = this.quintessenceCooldown;
        EventBus.emit('quintessence:cooldown', {
          current: Math.max(0, this.quintessenceCooldown),
          max: this.quintessence ? this.quintessence.cooldown : 12
        });
      }
    }
    if (this.invulnTimer > 0) {
      this.invulnTimer -= dt;
      this.setAlpha(Math.floor(this.invulnTimer * 20) % 2 === 0 ? 0.55 : 1);
      if (this.invulnTimer <= 0) this.setAlpha(1);
    }
    if (this.swapCooldown > 0) {
      this.swapCooldown -= dt;
      if (!this._lastSwapEmit || (this._lastSwapEmit - this.swapCooldown) > 0.1 || this.swapCooldown <= 0) {
        this._lastSwapEmit = this.swapCooldown;
        EventBus.emit('swap:cooldown', { current: Math.max(0, this.swapCooldown), max: 6.0 });
      }
    }
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboStep = 0;
    }

    // Ground check & Coyote Time + Landing Dust Juice
    const onFloor = this.body.blocked.down || this.body.touching.down;
    if (onFloor && !this.wasOnFloor && this.body.velocity.y >= 0) {
      if (this.scene && this.scene.juice) {
        this.scene.juice.emitSparks(this.x, this.y + 24, 4);
      }
    }
    this.wasOnFloor = onFloor;

    if (onFloor) {
      this.coyoteCounter = 0.1; // 100ms coyote grace
      this.jumpCount = 0;
    } else {
      if (this.coyoteCounter > 0) {
        this.coyoteCounter -= dt;
        if (this.coyoteCounter <= 0 && this.jumpCount === 0) {
          this.jumpCount = 1; // Consume ground jump when falling off ledge without jumping
        }
      }
    }

    // Jump Buffering
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.keys.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.altUp);
    if (jumpPressed) {
      this.jumpBufferCounter = 0.1;
    } else if (this.jumpBufferCounter > 0) {
      this.jumpBufferCounter -= dt;
    }

    // Handle Blood Frenzy buff
    if (this.frenzyTimer > 0) {
      this.frenzyTimer -= dt;
    }

    // Handle Active Dash
    if (this.isDashing) {
      this.dashTimer -= dt;
      const dashAnim = this.isBeast ? 'awakened-flying-kick' : 'player-flying-kick';
      if (this.anims && this.scene.anims.exists(dashAnim)) {
        this.anims.play(dashAnim, true);
      }
      if (Math.random() > 0.4) {
        this.scene.juice.emitSparks(this.x, this.y, 1);
      }
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        if (this.body) this.body.setAllowGravity(true);
      }
      return;
    }

    // Handle Active Parry
    if (this.isParrying) {
      this.parryTimer -= dt;
      this.setVelocityX(0);
      if (this.anims && this.scene.anims.exists('player-kick')) {
        this.anims.play('player-kick', true);
      }
      if (this.parryTimer <= 0) {
        this.isParrying = false;
        this.clearTint();
      }
      return;
    }

    // Handle Awakened Beast Mode Decay & Aura (active via [U])
    if (this.isAwakened && this.beastTimer > 0) {
      this.beastTimer -= dt;
      this.corruption = Math.max(0, (this.beastTimer / this.maxBeastDuration) * 100);
      EventBus.emit('player:corruption_changed', { current: this.corruption, max: 100, isMax: false });

      if (Math.random() > 0.65 && this.scene && this.scene.juice) {
        this.scene.juice.emitVoidEmbers(this.x, this.y, 1);
      }

      if (this.beastTimer <= 0) {
        this.revertToKnight();
      }
    }

    // Movement Inputs
    const leftDown = this.keys.left.isDown || this.keys.altLeft.isDown;
    const rightDown = this.keys.right.isDown || this.keys.altRight.isDown;

    let moveSpeed = this.speed;
    if (this.isAwakened) moveSpeed *= 1.2;
    else if (this.isBeast) moveSpeed *= 1.12;
    if (this.isBeast && this.beastType === 'feral') moveSpeed *= 1.6;
    if (this.isBeast && this.beastType === 'gargoyle') moveSpeed *= 0.85;
    if (this.frenzyTimer > 0) {
      moveSpeed *= 1.25;
      if (Math.random() > 0.65 && this.scene && this.scene.juice) {
        this.scene.juice.emitBlood(this.x, this.y + 12, 1);
      }
    }

    if (leftDown) {
      this.setVelocityX(-moveSpeed);
      this.setFacingDirection(-1);
    } else if (rightDown) {
      this.setVelocityX(moveSpeed);
      this.setFacingDirection(1);
    } else {
      this.setVelocityX(0);
    }

    // Jump Execution (Ground or Double Jump)
    if (this.jumpBufferCounter > 0) {
      if (this.coyoteCounter > 0 || this.jumpCount < this.maxJumps) {
        this.jump();
        this.jumpBufferCounter = 0;
        this.coyoteCounter = 0;
      }
    }

    // Variable Jump Height
    const jumpHeld = this.keys.up.isDown || this.keys.space.isDown || this.keys.altUp.isDown;
    if (!jumpHeld && this.body.velocity.y < -100) {
      this.body.setVelocityY(this.body.velocity.y * 0.5);
    }

    // Animation Controller
    this.updateAnimation(onFloor);

    // Keyboard action triggers (in addition to Mouse LMB/RMB)
    if (Phaser.Input.Keyboard.JustDown(this.keys.dash) ||
      Phaser.Input.Keyboard.JustDown(this.keys.altDash) ||
      Phaser.Input.Keyboard.JustDown(this.keys.shift)) {
      this.tryDash();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.parry) || Phaser.Input.Keyboard.JustDown(this.keys.altParry)) {
      this.tryParry();
    }
    // Fluid attack chaining via Mouse LMB (click or hold) or Attack keys
    const pointer = this.scene.input.activePointer;
    if ((pointer && pointer.leftButtonDown() && this.attackCooldown <= 0) ||
      Phaser.Input.Keyboard.JustDown(this.keys.attack) ||
      Phaser.Input.Keyboard.JustDown(this.keys.altAttack)) {
      if (pointer && pointer.leftButtonDown()) {
        const hitObjects = this.scene.input.hitTestPointer(pointer);
        if (hitObjects && hitObjects.some(obj => obj.gateType !== undefined)) {
          // Skip attack if mouse is interacting with a gate
          return;
        }
      }
      this.tryAttack();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.awaken) || Phaser.Input.Keyboard.JustDown(this.keys.altAwaken)) {
      this.tryTransform();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.finisher)) {
      this.tryFinisher();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.potion)) {
      this.tryDrinkPotion();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.swapTab) || Phaser.Input.Keyboard.JustDown(this.keys.swapKey)) {
      this.trySwapForm();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.skill)) {
      this.trySkullSkill();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.quint)) {
      this.tryQuintessence();
    }
  }

  tryDrinkPotion() {
    if (this.isDead || !this.active) return;
    if (this.potionCooldown > 0) return; // Prevent accidental double-drinking
    if (this.potions <= 0) {
      EventBus.emit('notification:show', { text: 'NO POTIONS REMAINING!', color: '#ef4444' });
      try { SoundSynth.playHit(); } catch (e) { }
      return;
    }
    if (this.hp >= this.maxHp) {
      EventBus.emit('notification:show', { text: 'HEALTH ALREADY FULL!', color: '#38bdf8' });
      return;
    }

    this.potionCooldown = 1.0;
    this.potions--;
    const healAmount = Math.round(this.maxHp * 0.45);
    this.hp = Math.min(this.maxHp, this.hp + healAmount);
    EventBus.emit('player:hp_changed', { current: this.hp, max: this.maxHp });
    EventBus.emit('potion:changed', { current: this.potions, max: this.maxPotions });

    this.scene.juice.popDamageNumber(this.x, this.y - 20, healAmount, 'crit');
    this.scene.juice.emitHolySparks(this.x, this.y, 22);
    try { SoundSynth.playHeal(); } catch (e) { }

    EventBus.emit('notification:show', {
      text: `HEALED +${healAmount} HP! (${this.potions} POTIONS REMAINING)`,
      color: '#22c55e'
    });
  }

  trySwapForm() {
    if (this.isDead || !this.active) return;
    if (this.isAwakened) {
      EventBus.emit('notification:show', {
        text: 'CORRUPT OVERDRIVE ACTIVE — PRESS [I] FOR APOCALYPSE FINISHER!',
        color: '#ef4444'
      });
      return;
    }
    if (this.swapCooldown > 0) {
      EventBus.emit('notification:show', {
        text: `FORM SWAP RECHARGING (${this.swapCooldown.toFixed(1)}s)`,
        color: '#facc15'
      });
      return;
    }

    this.swapCooldown = 6.0;
    this.activeForm = (this.activeForm === 'crusader') ? 'berserker' : 'crusader';
    this.isBeast = (this.activeForm === 'berserker');
    this.beastType = this.isBeast ? 'abyssal' : null;
    this.setTexture(this.isBeast ? 'player-awakened' : 'player');
    if (this.isBeast) this.setTint(0xd8b4fe);
    else this.clearTint();
    if (this.anims) {
      const targetAnim = this.isBeast ? 'awakened-idle' : 'player-idle';
      if (this.scene.anims.exists(targetAnim)) this.anims.play(targetAnim, true);
    }

    // Swap Shockwave (Skul Style): Unique Swap-In Skill per Skull Form!
    const rankMult = 1.0 + (this.skullRank - 1) * 0.25;
    this.scene.juice.addTrauma(0.45);
    this.scene.cameras.main.flash(200, this.isBeast ? 180 : 50, this.isBeast ? 20 : 180, this.isBeast ? 50 : 255);
    if (this.isBeast) {
      // Berserker Swap-In: Blood Void Eruption + 3s Frenzy
      this.scene.juice.emitVoidEmbers(this.x, this.y, 26);
      this.frenzyTimer = Math.max(this.frenzyTimer, 3.0);
      try { SoundSynth.playRoar(); } catch (e) { }
    } else {
      // Crusader Swap-In: Aegis Sanctum (Staggers nearby foes + Holy Heal)
      this.scene.juice.emitHolySparks(this.x, this.y, 24);
      this.shieldTimer = Math.max(this.shieldTimer, 1.5);
      if (this.hp < this.maxHp) this.heal(6);
      try { SoundSynth.playHolySmite(); } catch (e) { }
    }

    if (this.scene.enemies) {
      this.scene.enemies.forEach(enemy => {
        if (enemy && enemy.active && !enemy.isDead) {
          const d = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
          if (d < 175) {
            const knockDir = enemy.x > this.x ? 1 : -1;
            enemy.takeDamage(Math.round(35 * rankMult * (this.statMods.damageMult || 1)), this.x, true, this.isBeast);
            if (enemy && enemy.active && enemy.body && !enemy.isDead) {
              enemy.setVelocity(knockDir * 320, -160);
              if (!this.isBeast) {
                enemy.state = 'STAGGERED';
                enemy.staggerTimer = 1.2;
              }
            }
          }
        }
      });
    }

    const formTitle = this.isBeast ? '⚔️ DREAD BERSERKER (VOID ERUPTION)' : '🛡️ HOLY CRUSADER (AEGIS SANCTUM)';
    EventBus.emit('notification:show', {
      text: `SWAP SKILL: ${formTitle}`,
      color: this.isBeast ? '#ef4444' : '#38bdf8'
    });
    EventBus.emit('form:swapped', { form: this.activeForm, cooldown: 6.0, rank: this.skullRank });
  }

  getSkillCooldownMax() {
    const rankReduction = 1.0 - (this.skullRank - 1) * 0.15;
    const modMult = (this.statMods && this.statMods.skillCooldownMult) || 1.0;
    const awakenMult = this.isAwakened ? 0.65 : 1.0;
    return Math.max(1.8, this.baseSkillCooldown * rankReduction * modMult * awakenMult);
  }

  evolveSkullRank() {
    if (this.skullRank >= 3) return false;
    this.skullRank++;
    EventBus.emit('skull:rank_changed', { rank: this.skullRank });
    return true;
  }

  trySkullSkill() {
    if (this.isDead || !this.active || this.isDashing) return;
    if (this.skillCooldown > 0) {
      EventBus.emit('notification:show', {
        text: `SKILL RECHARGING (${this.skillCooldown.toFixed(1)}s)`,
        color: '#facc15'
      });
      return;
    }

    const cdMax = this.getSkillCooldownMax();
    this.skillCooldown = cdMax;
    const rankMult = 1.0 + (this.skullRank - 1) * 0.25;
    const dmgMult = (this.statMods.damageMult || 1.0) * rankMult * (this.isAwakened ? 1.45 : 1.0);
    const dir = this.facing || 1;
    EventBus.emit('skill:cooldown', { current: cdMax, max: cdMax });

    if (this.isBeast) {
      // Dread Berserker [Q]: Abyssal Rend — Lunge forward + cleave + Void Crescent
      this.setVelocityX(dir * 380);
      this.invulnTimer = Math.max(this.invulnTimer, 0.22);
      if (this.scene.anims.exists('awakened-kick')) this.anims.play('awakened-kick', true);
      this.attackAnimTimer = 0.25;
      try { SoundSynth.playRoar(); } catch (e) { }
      this.scene.juice.addTrauma(0.45);
      this.scene.juice.emitBlood(this.x + dir * 24, this.y, 16);
      this.scene.juice.emitVoidEmbers(this.x + dir * 24, this.y, 18);

      const bounds = new Phaser.Geom.Rectangle(dir > 0 ? this.x - 10 : this.x - 100, this.y - 36, 110, 72);
      if (typeof this.scene.breakPropsInRect === 'function') {
        this.scene.breakPropsInRect(bounds, this.x, true);
      }
      for (const enemy of (this.scene.enemies || [])) {
        if (!enemy.active || enemy.isDead) continue;
        if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, enemy.getBounds())) {
          const dmg = Math.round(62 * dmgMult);
          enemy.takeDamage(dmg, this.x, true, true);
          this.applyLifesteal(dmg);
        }
      }
      if (typeof this.scene.spawnVoidWave === 'function') {
        this.scene.spawnVoidWave(this.x + dir * 32, this.y, dir, Math.round(45 * dmgMult));
      }
    } else {
      // Holy Crusader [Q]: Sanctified Judgement — Twin Holy Arcs + 1.5s Holy Shield
      this.shieldTimer = Math.max(this.shieldTimer, 1.5);
      if (this.scene.anims.exists('player-punch')) this.anims.play('player-punch', true);
      this.attackAnimTimer = 0.25;
      try { SoundSynth.playHolySmite(); } catch (e) { }
      this.scene.juice.addTrauma(0.35);
      this.scene.juice.emitHolySparks(this.x + dir * 20, this.y, 20);
      if (typeof this.scene.spawnHolyArc === 'function') {
        this.scene.spawnHolyArc(this.x + dir * 26, this.y - 6, dir, Math.round(42 * dmgMult));
        this.scene.time.delayedCall(120, () => {
          if (this.active && !this.isDead && this.scene && typeof this.scene.spawnHolyArc === 'function') {
            this.scene.spawnHolyArc(this.x + dir * 30, this.y + 4, dir, Math.round(42 * dmgMult));
          }
        });
      }
    }
  }

  tryQuintessence() {
    if (this.isDead || !this.active) return;
    if (!this.quintessence) {
      EventBus.emit('notification:show', { text: 'NO QUINTESSENCE EQUIPPED! (DEFEAT BOSSES OR VISIT BAZAAR)', color: '#94a3b8' });
      return;
    }
    if (this.quintessenceCooldown > 0) {
      EventBus.emit('notification:show', {
        text: `QUINTESSENCE RECHARGING (${this.quintessenceCooldown.toFixed(1)}s)`,
        color: '#facc15'
      });
      return;
    }

    const modMult = (this.statMods && this.statMods.skillCooldownMult) || 1.0;
    const maxCd = Math.round(this.quintessence.cooldown * modMult * 10) / 10;
    this.quintessenceCooldown = maxCd;
    EventBus.emit('quintessence:cooldown', { current: maxCd, max: maxCd });
    const dmgMult = this.statMods.damageMult || 1.0;

    if (this.quintessence.id === 'infernal_eye') {
      try { SoundSynth.playRoar(); } catch (e) { }
      this.scene.juice.addTrauma(0.55);
      const targets = (this.scene.enemies || []).filter(e => e.active && !e.isDead && Math.abs(e.x - this.x) < 420);
      for (let i = 0; i < 5; i++) {
        this.scene.time.delayedCall(i * 110, () => {
          if (!this.scene || !this.active || this.isDead) return;
          const target = targets[i % Math.max(1, targets.length)];
          const tx = target ? target.x : (this.x + this.facing * (90 + i * 45));
          const ty = target ? target.y : this.y;
          this.scene.juice.emitVoidEmbers(tx, ty, 16);
          this.scene.juice.emitHolySparks(tx, ty, 10);
          if (target && target.active && !target.isDead) {
            target.takeDamage(Math.round(55 * dmgMult), this.x, true, true);
          }
        });
      }
      EventBus.emit('notification:show', { text: '👁 INFERNAL EYE: ABYSSAL METEOR BARRAGE!', color: '#e879f9' });
    } else if (this.quintessence.id === 'blood_titan') {
      try { SoundSynth.playFinisher(); } catch (e) { }
      this.shieldTimer = Math.max(this.shieldTimer, 3.0);
      this.heal(20);
      this.scene.juice.addTrauma(0.65);
      this.scene.juice.emitSparks(this.x, this.y + 18, 24);
      for (const enemy of (this.scene.enemies || [])) {
        if (enemy && enemy.active && !enemy.isDead && Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y) < 220) {
          enemy.takeDamage(Math.round(75 * dmgMult), this.x, true, true);
          enemy.state = 'STAGGERED';
          enemy.staggerTimer = 1.4;
        }
      }
      EventBus.emit('notification:show', { text: '❤ TITAN HEART: SEISMIC AEGIS & +20 HP!', color: '#f87171' });
    } else if (this.quintessence.id === 'raven_feather') {
      try { SoundSynth.playSlash(3); } catch (e) { }
      this.scene.juice.addTrauma(0.45);
      const dir = this.facing || 1;
      for (let i = 0; i < 4; i++) {
        this.scene.time.delayedCall(i * 90, () => {
          if (!this.scene || !this.active || this.isDead) return;
          if (i % 2 === 0 && typeof this.scene.spawnVoidWave === 'function') {
            this.scene.spawnVoidWave(this.x + dir * 24, this.y - 12 + i * 6, dir, Math.round(45 * dmgMult));
          } else if (typeof this.scene.spawnHolyArc === 'function') {
            this.scene.spawnHolyArc(this.x + dir * 24, this.y - 12 + i * 6, dir, Math.round(45 * dmgMult));
          }
        });
      }
      EventBus.emit('notification:show', { text: '🪶 RAVEN TEMPEST: CRESCENT STORM!', color: '#c084fc' });
    }
  }

  updateAnimation(onFloor) {
    if (this.attackAnimTimer > 0) return;

    const prefix = this.isBeast ? 'awakened-' : 'player-';

    if (!onFloor) {
      if (this.body.velocity.y < 0 && this.scene.anims.exists(prefix + 'jump')) {
        this.anims.play(prefix + 'jump', true);
      } else if (this.body.velocity.y >= 0 && this.scene.anims.exists(prefix + 'fall')) {
        this.anims.play(prefix + 'fall', true);
      }
    } else {
      if (Math.abs(this.body.velocity.x) > 10) {
        if (this.scene.anims.exists(prefix + 'walk')) {
          this.anims.play(prefix + 'walk', true);
        }
      } else {
        if (this.scene.anims.exists(prefix + 'idle')) {
          this.anims.play(prefix + 'idle', true);
        }
      }
    }
  }

  jump() {
    this.jumpCount++;
    const jumpVel = this.isBeast ? -420 : this.jumpVelocity;
    this.setVelocityY(jumpVel);

    try {
      this.scene.sound.play('sfx-jump', { volume: 0.4 });
    } catch (e) {
      SoundSynth.playJump();
    }
    this.scene.juice.emitSparks(this.x, this.y + 20, 4);
  }

  tryDash() {
    if (this.dashCooldown > 0 || this.isDashing || !this.body) return;
    this.isDashing = true;
    this.dashTimer = 0.22;
    this.dashCooldown = this.isBeast ? 0.28 : this.baseDashCooldown;

    // Movement direction takes priority, otherwise facing direction
    let dir = this.facing || 1;
    if (this.keys.left.isDown || this.keys.altLeft.isDown) {
      dir = -1;
      this.setFacingDirection(-1);
    } else if (this.keys.right.isDown || this.keys.altRight.isDown) {
      dir = 1;
      this.setFacingDirection(1);
    }

    this.body.setAllowGravity(false);
    this.setVelocityX(dir * (this.isBeast ? 480 : 360));
    this.setVelocityY(0);

    SoundSynth.playDash();

    // Spawn Shadow Clone / Ghost Afterimage during dash
    const ghostKey = this.isBeast ? 'player-awakened' : 'player';
    const ghost = this.scene.add.sprite(this.x, this.y, ghostKey);
    ghost.setFlipX(this.flipX);
    if (this.frame && this.frame.name !== undefined) {
      ghost.setFrame(this.frame.name);
    }
    ghost.setTint(this.isBeast ? 0xa855f7 : 0x38bdf8);
    ghost.setAlpha(0.65);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: 250,
      onComplete: () => ghost.destroy()
    });

    this.scene.juice.emitSparks(this.x, this.y, 6);
  }

  tryParry() {
    if (this.isBeast) return;
    if (this.parryCooldown > 0 || this.isParrying || this.isDashing) return;

    this.isParrying = true;
    const windowBonus = this.statMods.parryWindowBonus || 0;
    this.parryTimer = 0.16 + windowBonus;
    this.parryCooldown = 0.55;

    this.setTint(0x38bdf8);
    SoundSynth.playSlash(1);
    this.scene.juice.emitSparks(this.x + (this.flipX ? -10 : 10), this.y, 4);
  }

  onSuccessfulParry(enemy) {
    this.isParrying = false;
    this.clearTint();

    SoundSynth.playParry();
    this.scene.juice.addTrauma(0.4);
    this.scene.juice.hitStop(120);
    this.scene.juice.emitSparks(this.x, this.y, 16);
    this.scene.juice.popDamageNumber(this.x, this.y - 20, 'STAGGER', 'parry');

    const corrGain = Math.round(25 * (this.statMods.corruptionGainMult || 1.0));
    this.addCorruption(corrGain);

    if (enemy && enemy.takeDamage) {
      const reflectMult = this.statMods.parryReflect || 1.0;
      const riposteDamage = Math.round(30 * reflectMult * this.statMods.damageMult);
      enemy.takeDamage(riposteDamage, this.x, true);
    }
  }

  tryAttack() {
    if (this.attackCooldown > 0 || this.isDashing || this.isParrying) return;

    if (this.isBeast) {
      this.executeBeastAttack();
    } else {
      this.executeKnightAttack();
    }
  }

  executeKnightAttack() {
    this.comboStep = (this.comboStep % 3) + 1;
    this.comboTimer = 0.8;
    const speedMult = (this.statMods.attackSpeedMult || 1.0) * (this.frenzyTimer > 0 ? 1.3 : 1.0);
    this.attackCooldown = 0.20 / speedMult;
    this.attackAnimTimer = 0.25 / speedMult;

    const onFloor = this.body.blocked.down || this.body.touching.down;
    const animKey = !onFloor
      ? 'player-flying-kick'
      : (this.comboStep === 2 ? 'player-kick' : 'player-punch');
    if (this.scene.anims.exists(animKey)) {
      this.anims.play(animKey, true);
    }

    // Movement direction takes strict priority (never mouse)
    if (this.keys.left.isDown || this.keys.altLeft.isDown) {
      this.setFacingDirection(-1);
    } else if (this.keys.right.isDown || this.keys.altRight.isDown) {
      this.setFacingDirection(1);
    }

    const dir = this.facing;
    const hitboxX = this.x + dir * 28;
    const hitboxY = this.y - 2;

    try {
      this.scene.sound.play('sfx-attack', { volume: 0.5 });
    } catch (e) {
      SoundSynth.playSlash(this.comboStep);
    }

    this.scene.tweens.killTweensOf(this.slashSprite);
    this.slashSprite.setTexture('slash_knight')
      .clearTint()
      .setPosition(hitboxX, hitboxY)
      .setFlipX(dir < 0)
      .setScale(1)
      .setVisible(true)
      .setAlpha(1);

    this.scene.tweens.add({
      targets: this.slashSprite,
      alpha: 0,
      scaleX: 1.25,
      duration: 150,
      onComplete: () => {
        if (this.slashSprite && this.slashSprite.scene) {
          this.slashSprite.setVisible(false);
        }
      }
    });

    let baseDmg = this.comboStep === 3 ? 35 : 20;
    const finalDmg = Math.round(baseDmg * this.statMods.damageMult);
    this.scene.checkAttackHit(hitboxX, hitboxY, 42, 34, finalDmg, false);

    // Relic effect: Sunfire Reliquary (Holy Radiant Arc - strictly on 3rd combo step finisher)
    if (this.comboStep === 3 && this.statMods.holyArcDamage > 0 && typeof this.scene.spawnHolyArc === 'function') {
      this.scene.spawnHolyArc(hitboxX, hitboxY, dir, this.statMods.holyArcDamage);
    }

    // Relic effect: Obsidian Heart (Ground Slam Shockwave on 3rd combo)
    if (this.comboStep === 3 && this.statMods.slamShockwave && typeof this.scene.triggerSlamShockwave === 'function') {
      this.scene.triggerSlamShockwave(hitboxX, hitboxY);
    }
  }

  executeBeastAttack() {
    this.comboStep = (this.comboStep % 3) + 1;
    this.comboTimer = 0.8;
    const speedMult = (this.statMods.attackSpeedMult || 1.0) * (this.frenzyTimer > 0 ? 1.3 : 1.0) * (this.isAwakened ? 1.22 : 1.0);
    this.attackCooldown = 0.16 / speedMult;
    this.attackAnimTimer = 0.22 / speedMult;

    const animKey = this.comboStep === 3 ? 'awakened-kick' : (this.comboStep === 2 ? 'awakened-flying-kick' : 'awakened-punch');
    if (this.scene.anims.exists(animKey)) {
      this.anims.play(animKey, true);
    }

    // Movement direction takes strict priority (never mouse)
    if (this.keys.left.isDown || this.keys.altLeft.isDown) {
      this.setFacingDirection(-1);
    } else if (this.keys.right.isDown || this.keys.altRight.isDown) {
      this.setFacingDirection(1);
    }

    const dir = this.facing;
    const hitboxX = this.x + dir * 36;
    const hitboxY = this.y - 2;

    SoundSynth.playRoar();
    SoundSynth.playSlash(this.comboStep);

    // Wide crimson/abyssal slash crescent visually distinct from Knight's steel arc
    this.scene.tweens.killTweensOf(this.slashSprite);
    this.slashSprite.setTexture('slash_knight')
      .setTint(this.isAwakened ? 0xef4444 : 0xc084fc)
      .setPosition(hitboxX, hitboxY)
      .setFlipX(dir < 0)
      .setScale(this.isAwakened ? 1.55 : 1.3)
      .setVisible(true)
      .setAlpha(1);
    this.scene.tweens.add({
      targets: this.slashSprite,
      alpha: 0,
      scaleX: this.isAwakened ? 1.8 : 1.5,
      duration: 150,
      onComplete: () => {
        if (this.slashSprite && this.slashSprite.scene) {
          this.slashSprite.setVisible(false);
        }
      }
    });

    const awakenDmgMult = this.isAwakened ? 1.45 : 1.0;

    // Void Crescent: 3rd combo hit normally, or combo step 2 & 3 while 100% Corrupt Awakened!
    if ((this.comboStep === 3 || (this.isAwakened && this.comboStep >= 2)) && typeof this.scene.spawnVoidWave === 'function') {
      this.scene.spawnVoidWave(hitboxX, hitboxY, dir, Math.round(35 * this.statMods.damageMult * awakenDmgMult));
    }

    this.scene.juice.emitBlood(hitboxX, hitboxY, 14);
    this.scene.juice.emitVoidEmbers(hitboxX, hitboxY, 10);

    if (this.statMods.slamShockwave && typeof this.scene.triggerSlamShockwave === 'function') {
      this.scene.triggerSlamShockwave(hitboxX, hitboxY);
    }

    const bounds = new Phaser.Geom.Rectangle(
      dir > 0 ? this.x - 10 : this.x - 74,
      this.y - 30,
      84,
      62
    );

    if (typeof this.scene.breakPropsInRect === 'function') {
      this.scene.breakPropsInRect(bounds, this.x, true);
    }

    for (const enemy of this.scene.enemies) {
      if (!enemy.active || enemy.isDead) continue;
      if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, enemy.getBounds())) {
        const critChance = (this.statMods.critChance || 0.10) + 0.20;
        const isCrit = Math.random() < critChance;
        const critMult = 1.6 + (this.statMods.critDamageBonus || 0);
        const damage = Math.round(55 * this.statMods.damageMult * awakenDmgMult * (isCrit ? critMult : 1.0));
        enemy.takeDamage(damage, this.x, isCrit, true);
        this.applyLifesteal(damage);

        if (enemy.active && !enemy.isDead && Math.random() < (this.statMods.bleedChance || 0)) {
          enemy.applyBleed(3, Math.round(10 * this.statMods.damageMult));
        }
      }
    }
  }

  applyLifesteal(damageDealt) {
    const awakenHealMult = this.isAwakened ? 1.5 : 1.0;
    const heal = Math.round(damageDealt * (this.statMods.lifesteal || 0.18) * awakenHealMult);
    if (heal > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + heal);
      this.scene.juice.popDamageNumber(this.x, this.y - 30, heal, 'heal');
      EventBus.emit('player:hp_changed', { current: this.hp, max: this.maxHp });
    }
  }

  addCorruption(amount) {
    if (this.isAwakened) {
      this.beastTimer = Math.min(this.maxBeastDuration, this.beastTimer + (amount * 0.15));
      return;
    }
    const prevRounded = Math.round(this.corruption);
    this.corruption = Math.min(100, Math.round((this.corruption + amount) * 10) / 10);
    const nextRounded = Math.round(this.corruption);
    if (nextRounded >= 100 && prevRounded < 100) {
      try {
        localStorage.setItem('cursed_crusader_corruption', '100');
      } catch (e) { }
    }
    if (nextRounded !== prevRounded || this.corruption >= 100) {
      EventBus.emit('player:corruption_changed', {
        current: this.corruption,
        max: 100,
        isMax: this.corruption >= 100
      });
    }
  }

  tryTransform() {
    if (this.isAwakened || this.corruption < 100 || !this.body) return;

    this.isAwakened = true;
    this.isBeast = true;
    this.corruption = 100;
    this.beastTimer = this.maxBeastDuration;
    this.beastType = 'dread_berserker';

    if (this.anims) {
      this.anims.stop();
    }

    // Switch to authentic Gothicvania Awakened Dread Berserker spritesheet
    this.setTexture('player-awakened');
    this.setScale(1.15);
    this.setTint(0xfca5a5);
    this.body.setSize(26, 50).setOffset(28, 10);
    if (this.scene.anims.exists('awakened-idle')) {
      this.anims.play('awakened-idle');
    }

    SoundSynth.playRoar();
    this.scene.juice.addTrauma(0.85);
    this.scene.juice.hitStop(180);
    this.scene.juice.emitBlood(this.x, this.y, 35);
    this.scene.juice.emitVoidEmbers(this.x, this.y, 30);
    this.scene.roarShockwave(this.x, this.y, 160);

    // Stagger all nearby enemies upon transformation roar!
    for (const enemy of this.scene.enemies) {
      if (!enemy.active || enemy.isDead) continue;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (dist < 180) {
        enemy.takeDamage(45, this.x, true, true);
        enemy.state = 'STAGGERED';
        enemy.staggerTimer = 1.6;
      }
    }

    EventBus.emit('player:corruption_changed', { current: 100, max: 100, isMax: true });
    EventBus.emit('beast:transformed', { formType: 'DREAD BERSERKER', duration: this.maxBeastDuration });
  }

  tryFinisher() {
    if (!this.isAwakened || this.beastTimer < 2.0) return;

    SoundSynth.playFinisher();
    this.scene.juice.addTrauma(1.0);
    this.scene.juice.hitStop(220);

    this.scene.cameras.main.flash(450, 239, 68, 68);
    this.scene.executeScreenFinisher(this.x, this.y, this.beastType);

    this.scene.juice.popDamageNumber(this.x, this.y - 40, 'APOCALYPSE EARTHQUAKE', 'beast');

    this.revertToKnight();
  }

  revertToKnight() {
    this.isAwakened = false;
    this.isBeast = (this.activeForm === 'berserker');
    this.beastType = this.isBeast ? 'abyssal' : null;
    this.beastTimer = 0;
    this.corruption = 0;
    this.setScale(1.0);
    this.clearTint();
    try {
      localStorage.setItem('cursed_crusader_corruption', '0');
    } catch (e) { }

    if (this.anims) {
      this.anims.stop();
    }
    this.setTexture(this.isBeast ? 'player-awakened' : 'player');
    if (this.isBeast) this.setTint(0xd8b4fe);
    else this.clearTint();
    const idleKey = this.isBeast ? 'awakened-idle' : 'player-idle';
    if (this.scene.anims.exists(idleKey)) {
      this.anims.play(idleKey);
    }
    if (this.body) {
      this.body.setSize(26, 50).setOffset(28, 10);
    }

    EventBus.emit('player:corruption_changed', { current: 0, max: 100, isMax: false });
    EventBus.emit('beast:reverted', {});
  }

  takeDamage(amount, sourceX) {
    if (this.isDead || this.isDashing || this.invulnTimer > 0 || !this.body) return;
    this.invulnTimer = this.hitInvulnDuration || 0.70;
    amount = Math.max(1, Math.round(amount * (this.incomingDamageMult !== undefined ? this.incomingDamageMult : 0.75)));

    if (this.isBeast) {
      amount = Math.round(amount * (this.isAwakened ? 0.55 : 0.7)); // 45% DR in Corrupt Awakened Overdrive, 30% in Berserker
    }
    if (this.shieldTimer > 0) {
      amount = Math.round(amount * 0.5); // 50% shield reduction from Aegis / Titan Heart
    }
    if (this.statMods && this.statMods.damageReduction) {
      amount = Math.max(1, Math.round(amount * (1 - this.statMods.damageReduction)));
    }

    this.hp -= amount;
    this.scene.juice.addTrauma(0.3);
    this.scene.juice.emitBlood(this.x, this.y, 10);
    this.scene.juice.popDamageNumber(this.x, this.y - 15, amount, 'normal');

    try {
      this.scene.sound.play('sfx-hurt', { volume: 0.5 });
    } catch (e) {
      SoundSynth.playHit();
    }

    const knockDir = this.x >= sourceX ? 1 : -1;
    this.setVelocityX(knockDir * 160);
    this.setVelocityY(-90);

    const prefix = this.isBeast ? 'awakened-' : 'player-';
    if (this.scene.anims.exists(prefix + 'hurt')) {
      this.anims.play(prefix + 'hurt', true);
    }

    this.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      if (this.active && !this.isDead) {
        if (this.isAwakened) this.setTint(0xfca5a5);
        else if (this.isBeast) this.setTint(0xd8b4fe);
        else this.clearTint();
      }
    });

    EventBus.emit('player:hp_changed', { current: this.hp, max: this.maxHp });

    if (this.hp <= 0) {
      this.die();
    }
  }

  heal(amount) {
    if (this.isDead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.scene.juice.popDamageNumber(this.x, this.y - 20, amount, 'heal');
    EventBus.emit('player:hp_changed', { current: this.hp, max: this.maxHp });
  }

  die() {
    this.isDead = true;
    if (this.body) this.setVelocity(0, 0);
    this.scene.juice.addTrauma(0.8);
    this.scene.juice.emitBlood(this.x, this.y, 35);
    try {
      localStorage.setItem('cursed_crusader_corruption', '0');
    } catch (e) { }
    EventBus.emit('player:died', {});
  }
}

export default Player;
