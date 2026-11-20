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

    // Meta-Progression Permanent Upgrades
    const meta = MetaProgression.getInstance();
    const metaBonuses = meta.getCombinedStatBonuses();

    // HP & Vitality (Safely guarded against undefined/NaN)
    this.maxHp = 150 + (metaBonuses.maxHp || 0);
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
    this.maxPotions = metaBonuses.maxPotions || 2;
    this.potions = (scene && scene.savedPotions !== undefined) ? scene.savedPotions : this.maxPotions;
    this.potionCooldown = 0;

    // Form / Skull Swap (Skul: The Hero Slayer mechanic)
    this.activeForm = 'crusader'; // 'crusader' | 'berserker'
    this.swapCooldown = 0;

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
    this.frenzyTimer = 0; // Blood Frenzy buff from Altar of Sacrifice

    // Corruption & Beast Form (Persisted across rooms and runs)
    this.corruption = (initialCorruption !== undefined && !isNaN(initialCorruption))
      ? Math.min(100, Math.max(0, Number(initialCorruption)))
      : 0;
    this.isBeast = false;
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
        this.tryParry();
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

    // Ground check & Coyote Time
    const onFloor = this.body.blocked.down || this.body.touching.down;
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
      if (this.anims && this.scene.anims.exists('player-flying-kick')) {
        this.anims.play('player-flying-kick', true);
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

    // Handle Beast Mode Decay & Loop (only decays when awakened via [U], not skull form swap)
    if (this.isBeast && this.beastTimer > 0) {
      this.beastTimer -= dt;
      this.corruption = Math.max(0, (this.beastTimer / this.maxBeastDuration) * 100);
      EventBus.emit('player:corruption_changed', { current: this.corruption, max: 100, isMax: false });

      if (this.beastTimer <= 0) {
        this.revertToKnight();
      }
    }

    // Movement Inputs
    const leftDown = this.keys.left.isDown || this.keys.altLeft.isDown;
    const rightDown = this.keys.right.isDown || this.keys.altRight.isDown;

    let moveSpeed = this.speed;
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
  }

  tryDrinkPotion() {
    if (this.isDead || !this.active) return;
    if (this.potionCooldown > 0) return; // Prevent accidental double-drinking
    if (this.potions <= 0) {
      EventBus.emit('notification:show', { text: 'NO POTIONS REMAINING!', color: '#ef4444' });
      try { SoundSynth.playHit(); } catch (e) {}
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
    try { SoundSynth.playHeal(); } catch (e) {}

    EventBus.emit('notification:show', {
      text: `HEALED +${healAmount} HP! (${this.potions} POTIONS REMAINING)`,
      color: '#22c55e'
    });
  }

  trySwapForm() {
    if (this.isDead || !this.active) return;
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
    if (this.anims) {
      const targetAnim = this.isBeast ? 'awakened-idle' : 'player-idle';
      if (this.scene.anims.exists(targetAnim)) this.anims.play(targetAnim, true);
    }

    // Swap Shockwave (Skul Style): Deals burst tactical damage and repels all nearby foes
    this.scene.juice.addTrauma(0.45);
    this.scene.cameras.main.flash(200, this.isBeast ? 180 : 50, this.isBeast ? 20 : 180, this.isBeast ? 50 : 255);
    this.scene.juice.emitHolySparks(this.x, this.y, 20);
    this.scene.juice.emitVoidEmbers(this.x, this.y, 24);
    try { SoundSynth.playRoar(); } catch (e) {}

    if (this.scene.enemies) {
      this.scene.enemies.forEach(enemy => {
        if (enemy && enemy.active && !enemy.isDead) {
          const d = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
          if (d < 160) {
            const knockDir = enemy.x > this.x ? 1 : -1;
            enemy.takeDamage(35, this.x, true, true);
            if (enemy && enemy.active && enemy.body && !enemy.isDead) {
              enemy.setVelocity(knockDir * 320, -160);
            }
          }
        }
      });
    }

    const formTitle = this.isBeast ? '⚔️ DREAD BERSERKER (VOID FRENZY)' : '🛡️ HOLY CRUSADER (BLESSED AEGIS)';
    EventBus.emit('notification:show', {
      text: `SWAP: ${formTitle}`,
      color: this.isBeast ? '#ef4444' : '#38bdf8'
    });
    EventBus.emit('form:swapped', { form: this.activeForm, cooldown: 6.0 });
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

    if (this.scene.anims.exists('player-punch')) {
      this.anims.play('player-punch', true);
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

    this.slashSprite.setTexture('slash_knight')
      .setPosition(hitboxX, hitboxY)
      .setFlipX(dir < 0)
      .setVisible(true)
      .setAlpha(1);

    this.scene.tweens.add({
      targets: this.slashSprite,
      alpha: 0,
      scaleX: 1.2,
      duration: 150,
      onComplete: () => this.slashSprite.setVisible(false)
    });

    let baseDmg = this.comboStep === 3 ? 35 : 20;
    const finalDmg = Math.round(baseDmg * this.statMods.damageMult);
    this.scene.checkAttackHit(hitboxX, hitboxY, 34, 28, finalDmg, false);

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
    const speedMult = (this.statMods.attackSpeedMult || 1.0) * (this.frenzyTimer > 0 ? 1.3 : 1.0);
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

    // Spawn short-range void crescent ONLY on 3rd combo step finisher
    if (this.comboStep === 3 && typeof this.scene.spawnVoidWave === 'function') {
      this.scene.spawnVoidWave(hitboxX, hitboxY, dir, Math.round(35 * this.statMods.damageMult));
    }

    this.scene.juice.emitBlood(hitboxX, hitboxY, 14);
    this.scene.juice.emitVoidEmbers(hitboxX, hitboxY, 10);

    if (this.statMods.slamShockwave && typeof this.scene.triggerSlamShockwave === 'function') {
      this.scene.triggerSlamShockwave(hitboxX, hitboxY);
    }

    const bounds = new Phaser.Geom.Rectangle(
      dir > 0 ? this.x : this.x - 70,
      this.y - 30,
      70,
      60
    );

    for (const enemy of this.scene.enemies) {
      if (!enemy.active || enemy.isDead) continue;
      if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, enemy.getBounds())) {
        const critChance = (this.statMods.critChance || 0.10) + 0.20;
        const isCrit = Math.random() < critChance;
        const critMult = 1.6 + (this.statMods.critDamageBonus || 0);
        const damage = Math.round(55 * this.statMods.damageMult * (isCrit ? critMult : 1.0));
        enemy.takeDamage(damage, this.x, isCrit, true);
        this.applyLifesteal(damage);

        if (enemy.active && !enemy.isDead && Math.random() < (this.statMods.bleedChance || 0)) {
          enemy.applyBleed(3, Math.round(10 * this.statMods.damageMult));
        }
      }
    }
  }

  applyLifesteal(damageDealt) {
    const heal = Math.round(damageDealt * (this.statMods.lifesteal || 0.18));
    if (heal > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + heal);
      this.scene.juice.popDamageNumber(this.x, this.y - 30, heal, 'heal');
      EventBus.emit('player:hp_changed', { current: this.hp, max: this.maxHp });
    }
  }

  addCorruption(amount) {
    if (this.isBeast) {
      this.beastTimer = Math.min(this.maxBeastDuration, this.beastTimer + (amount * 0.15));
      return;
    }
    this.corruption = Math.min(100, Math.round((this.corruption + amount) * 10) / 10);
    try {
      localStorage.setItem('cursed_crusader_corruption', this.corruption.toString());
    } catch (e) {}

    EventBus.emit('player:corruption_changed', {
      current: this.corruption,
      max: 100,
      isMax: this.corruption >= 100
    });
  }

  tryTransform() {
    if (this.isBeast || this.corruption < 100 || !this.body) return;

    this.isBeast = true;
    this.corruption = 100;
    this.beastTimer = this.maxBeastDuration;
    this.beastType = 'dread_berserker';

    if (this.anims) {
      this.anims.stop();
    }

    // Switch to authentic Gothicvania Awakened Dread Berserker spritesheet
    this.setTexture('player-awakened');
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
    if (!this.isBeast || this.beastTimer < 2.0) return;

    SoundSynth.playFinisher();
    this.scene.juice.addTrauma(1.0);
    this.scene.juice.hitStop(220);

    this.scene.cameras.main.flash(450, 239, 68, 68);
    this.scene.executeScreenFinisher(this.x, this.y, this.beastType);

    this.scene.juice.popDamageNumber(this.x, this.y - 40, 'APOCALYPSE EARTHQUAKE', 'beast');

    this.revertToKnight();
  }

  revertToKnight() {
    this.isBeast = (this.activeForm === 'berserker');
    this.beastType = this.isBeast ? 'abyssal' : null;
    this.beastTimer = 0;
    this.corruption = 0;
    try {
      localStorage.setItem('cursed_crusader_corruption', '0');
    } catch (e) {}

    if (this.anims) {
      this.anims.stop();
    }
    this.setTexture(this.isBeast ? 'player-awakened' : 'player');
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
    if (this.isDead || this.isDashing || !this.body) return;

    if (this.isBeast) {
      amount = Math.round(amount * 0.7); // 30% damage reduction in Awakened form!
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
      if (this.active && !this.isDead) this.clearTint();
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
    } catch (e) {}
    EventBus.emit('player:died', {});
  }
}

export default Player;
