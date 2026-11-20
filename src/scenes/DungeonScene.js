// DungeonScene.js - Expansive Side-Scrolling Levels (2400px), Skul-Style Gate Choices, and Boss Encounters
import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { BreakableProp } from '../entities/BreakableProp.js';
import { JuiceEngine } from '../systems/JuiceEngine.js';
import { RelicSystem } from '../systems/RelicSystem.js';
import { SpriteFactory } from '../core/SpriteFactory.js';
import { SoundSynth } from '../core/SoundSynth.js';
import { EventBus } from '../core/EventBus.js';
import { MetaProgression } from '../systems/MetaProgression.js';

export class DungeonScene extends Phaser.Scene {
  constructor() {
    super('dungeon');
  }

  init(data) {
    this.currentRoom = data.room || 1;
    let localGold = 0;
    let localRelics = [];
    let localCorr = 0;
    try {
      localGold = Number(localStorage.getItem('cursed_crusader_gold')) || 0;
      localCorr = Number(localStorage.getItem('cursed_crusader_corruption')) || 0;
      const stored = localStorage.getItem('cursed_crusader_relics');
      if (stored) {
        localRelics = JSON.parse(stored);
      }
    } catch (e) {}

    this.gold = data.gold !== undefined ? Number(data.gold) : localGold;
    this.savedRelics = (data.relics && data.relics.length > 0) ? data.relics : localRelics;
    this.savedHp = (data.hp !== undefined && !isNaN(data.hp) && Number(data.hp) > 0) ? Number(data.hp) : 150;
    this.savedCorruption = data.corruption !== undefined ? Number(data.corruption) : localCorr;
    this.savedPotions = data.potions;
    this.isTransitioning = false;
  }

  create() {
    // 1. Camera Fade In & FX Reset (Prevents black screen after restart!)
    this.cameras.main.resetFX();
    this.cameras.main.fadeIn(400, 10, 12, 16);

    // Ensure physics world is completely active & debug overlay is strictly disabled by default
    if (this.physics && this.physics.world) {
      this.physics.world.resume();
      this.physics.world.drawDebug = false;
      if (this.physics.world.debugGraphic) {
        this.physics.world.debugGraphic.clear();
        this.physics.world.debugGraphic.setVisible(false);
      }
    }

    // F1 toggle key for optional hitbox inspection (defaults to OFF)
    this.input.keyboard.on('keydown-F1', () => {
      if (this.physics && this.physics.world) {
        const next = !this.physics.world.drawDebug;
        this.physics.world.drawDebug = next;
        if (!next && this.physics.world.debugGraphic) {
          this.physics.world.debugGraphic.clear();
          this.physics.world.debugGraphic.setVisible(false);
        } else if (next) {
          if (!this.physics.world.debugGraphic) {
            this.physics.world.createDebugGraphic();
          } else {
            this.physics.world.debugGraphic.setVisible(true);
          }
        }
      }
    });

    // 2. Initialize Juice
    this.juice = new JuiceEngine(this);

    // 3. Multi-Chapter Level Bounds (Boss Arenas: 2400px, Shop: 1400px, Standard: 5600px)
    this.isBossChamber = this.currentRoom === 3 || this.currentRoom === 6 || this.currentRoom === 9 || this.currentRoom === 12;
    this.isShopChamber = this.currentRoom === 5 || this.currentRoom === 10;
    const WORLD_W = this.isShopChamber ? 1400 : (this.isBossChamber ? 2400 : 5600);
    const WORLD_H = this.isBossChamber ? 600 : 680;
    this.worldWidth = WORLD_W;
    this.worldHeight = WORLD_H;
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    // 4. Ultra-Fast Viewport-Clipped Parallax Backgrounds (Eliminates GPU fill-rate lag)
    if (this.textures.exists('bg-gothic')) {
      this.bgBack = this.add.tileSprite(0, 0, 960, 540, 'bg-gothic').setOrigin(0, 0).setScrollFactor(0);
      this.bgBack.setScale(1.8, 1.8);
    }
    if (this.textures.exists('bg-columns')) {
      this.bgColumns = this.add.tileSprite(0, 0, 960, 540, 'bg-columns').setOrigin(0, 0).setScrollFactor(0).setAlpha(0.75);
      this.bgColumns.setScale(1.5, 1.5);
    }

    // 4b. Atmospheric Cathedral Dust Motes (Adds gothic depth to upper ceiling)
    this.createAtmosphericDustMotes(WORLD_W, WORLD_H);
    this.createGothicVignette();

    // 5. Build Expansive Multi-Tier Level Geometry
    this.platforms = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();
    this.props = this.physics.add.staticGroup();
    this.enemies = [];
    this.enemyGroup = this.physics.add.group();
    this.playerProjectiles = this.physics.add.group();
    this.enemyProjectiles = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.gates = this.physics.add.staticGroup();
    this.gateLabels = [];
    this.torches = [];
    this.shrine = null;
    this.shrineUsed = false;
    this.buildExpansiveLevel(WORLD_W, WORLD_H);

    // 6. Spawn Player at Level Entrance (Far Left with persistent HP and Corruption)
    this.player = new Player(this, 120, 480, this.savedHp, this.savedCorruption);
    this.physics.add.collider(this.player, this.platforms);

    // Hazard spikes collision
    this.physics.add.overlap(this.player, this.hazards, (player, hazard) => this.onPlayerHitHazard(hazard));
    this.physics.add.overlap(this.enemyGroup, this.hazards, (objA, objB) => {
      const enemy = (objA && objA.enemyType) ? objA : ((objB && objB.enemyType) ? objB : null);
      if (!enemy || !enemy.active || enemy.isDead) return;
      this.juice.emitBlood(enemy.x, enemy.y, 24);
      this.juice.addTrauma(0.25);
      try { SoundSynth.playHit(); } catch (e) {}
      enemy.die();
    });

    // 7. Setup Slash & Projectile Textures
    SpriteFactory.createSlashTextures(this);

    // 8. Setup Relics & Synergies
    this.relicSystem = new RelicSystem(this.player);
    this.savedRelics.forEach(r => this.relicSystem.addRelic(r));

    // Listen for Relic selection from Skul choice modal (clean up old listener first)
    if (this.onRelicSelectedHandler) {
      EventBus.off('relic:selected', this.onRelicSelectedHandler);
    }
    this.onRelicSelectedHandler = (chosenRelic) => {
      if (chosenRelic && chosenRelic.id) {
        this.relicSystem.addRelic(chosenRelic);
      }
      this.proceedToNextRoom();
    };
    EventBus.on('relic:selected', this.onRelicSelectedHandler);

    // 9. Projectile Collisions (Disambiguated to ensure robust argument ordering)
    this.physics.add.overlap(this.enemyProjectiles, this.player, (objA, objB) => {
      const player = (objA === this.player) ? objA : (objB === this.player ? objB : null);
      const proj = (objA === this.player) ? objB : objA;
      if (!player || !proj || !player.active || !proj.active || player.isDead) return;

      if (player.isParrying) {
        if (proj.active) proj.destroy();
        player.onSuccessfulParry(null);
      } else if (!player.isDashing) {
        player.takeDamage(proj.damage || 15, proj.x);
        if (proj.active) proj.destroy();
      }
    });

    this.physics.add.overlap(this.playerProjectiles, this.enemyGroup, (objA, objB) => {
      const enemy = (objA && objA.enemyType) ? objA : ((objB && objB.enemyType) ? objB : null);
      const proj = (objA === enemy) ? objB : objA;
      if (!enemy || !proj || !enemy.active || !proj.active || enemy.isDead) return;

      enemy.takeDamage(proj.damage || 35, proj.x, false, true);

      const isHolyArc = proj.texture && proj.texture.key === 'holy_arc';
      if (isHolyArc) {
        this.juice.emitHolySparks(enemy.x, enemy.y, 10);
      } else {
        this.juice.emitVoidEmbers(enemy.x, enemy.y, 8);
      }

      // Relic effect: Eye of the Void (Void Pierce)
      const canPierce = Boolean(this.player && this.player.statMods && this.player.statMods.voidPierce);
      if (!canPierce && proj.active) {
        proj.destroy();
      }
    });

    // Projectile collisions with breakable props (urns)
    this.physics.add.overlap(this.playerProjectiles, this.props, (proj, prop) => {
      if (prop && prop.active && !prop.isBroken) {
        prop.shatter(proj.x, false);
        const canPierce = Boolean(this.player && this.player.statMods && this.player.statMods.voidPierce);
        if (!canPierce && proj.active) proj.destroy();
      }
    });

    // Destroy projectiles when hitting solid terrain platforms
    this.physics.add.collider(this.enemyProjectiles, this.platforms, (proj) => {
      if (proj && proj.active) {
        this.juice.emitSparks(proj.x, proj.y, 6);
        proj.destroy();
      }
    });

    this.physics.add.collider(this.playerProjectiles, this.platforms, (proj) => {
      if (proj && proj.active) {
        if (proj.texture && proj.texture.key === 'holy_arc') {
          this.juice.emitHolySparks(proj.x, proj.y, 8);
        } else {
          this.juice.emitSparks(proj.x, proj.y, 6);
        }
        proj.destroy();
      }
    });

    // 10. Camera Follow Player
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // 11. Spawn Wave / Boss Encounter / Shop
    this.roomCleared = false;

    if (this.isShopChamber) {
      this.roomCleared = true;
      EventBus.emit('room:cleared');
      EventBus.emit('enemies:count', 0);
      this.spawnGateways();
    } else if (this.isBossChamber) {
      this.spawnBossEncounter();
    } else {
      this.spawnExpansiveEnemyWave(WORLD_W);
    }

    // 12. Floating Prompts (Gate & Shrine)
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.gatePrompt = this.add.text(0, 0, '✦ [PRESS W / E OR CLICK TO ENTER] ✦', {
      fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#fde047',
      stroke: '#05070a', strokeThickness: 4, backgroundColor: 'rgba(15, 23, 42, 0.95)',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setVisible(false).setDepth(35);

    this.shrinePrompt = this.add.text(0, 0, '✦ [PRESS E TO SACRIFICE 15 HP FOR 100 GOLD & FRENZY] ✦', {
      fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#f87171',
      stroke: '#05070a', strokeThickness: 4, backgroundColor: 'rgba(69, 10, 10, 0.95)',
      padding: { x: 9, y: 5 }
    }).setOrigin(0.5).setVisible(false).setDepth(35);

    const exitSignX = this.isShopChamber ? 1180 : (this.isBossChamber ? 1200 : 4490);
    const exitSignY = this.isShopChamber ? 200 : (this.isBossChamber ? 140 : 250);
    this.exitSign = this.add.text(exitSignX, exitSignY, '✦ GATES OF DESTINY: CHOOSE THY PATH ✦', {
      fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color: '#34d399',
      stroke: '#05070a', strokeThickness: 4, backgroundColor: 'rgba(5, 7, 10, 0.9)',
      padding: { x: 12, y: 5 }
    }).setOrigin(0.5).setVisible(false).setDepth(25);

    this.tweens.add({
      targets: this.exitSign,
      y: '-=4',
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 13. Event wiring
    this.onEnemyKilledHandler = ({ enemy }) => {
      this.enemies = this.enemies.filter(e => e !== enemy && e.active && !e.isDead);
      EventBus.emit('enemies:count', this.enemies.length);
      if (this.isBossChamber) {
        EventBus.emit('boss:hp_changed', { current: Math.max(0, enemy.hp), max: enemy.maxHp });
      }

      if (this.enemies.length === 0 && !this.roomCleared) {
        this.onRoomCleared();
      }
    };
    EventBus.on('enemy:killed', this.onEnemyKilledHandler);

    this.onPlayerDiedHandler = () => {
      const meta = MetaProgression.getInstance();
      meta.recordRunEnd({ chamber: this.currentRoom, bossKilled: false });
    };
    EventBus.on('player:died', this.onPlayerDiedHandler);

    this.events.on('shutdown', () => {
      if (this.reinforcementTimer) {
        this.reinforcementTimer.remove();
        this.reinforcementTimer = null;
      }
      if (this.torches) {
        this.torches.forEach(t => {
          if (t.timer) t.timer.remove();
        });
        this.torches = [];
      }
      EventBus.off('enemy:killed', this.onEnemyKilledHandler);
      EventBus.off('relic:selected', this.onRelicSelectedHandler);
      EventBus.off('player:died', this.onPlayerDiedHandler);
    });

    // Notify HUD
    EventBus.emit('room:entered', this.currentRoom);
    EventBus.emit('gold:changed', this.gold);
    EventBus.emit('enemies:count', this.enemies.length);
    EventBus.emit('player:hp_changed', { current: this.player.hp, max: this.player.maxHp });
    EventBus.emit('player:corruption_changed', { current: this.player.corruption, max: 100, isMax: this.player.corruption >= 100 });
  }

  buildExpansiveLevel(worldW, worldH) {
    if (this.isShopChamber) {
      this.buildShopChamber(worldW, worldH);
    } else if (this.isBossChamber) {
      this.buildBossArena(worldW, worldH);
    } else {
      this.buildExpansiveLevelGeometry(worldW, worldH);
    }
  }

  buildBossArena(worldW, worldH) {
    // 1. Visual tiles (no physics bodies on individual tiles)
    for (let x = 0; x < worldW; x += 32) {
      this.add.image(x + 16, 560, 'tile_floor').setDepth(2);
      this.add.image(x + 16, 592, 'tile_foundation').setDepth(2);
    }
    // Single unified continuous floor collider
    const floorCollider = this.platforms.create(worldW / 2, 560, 'tile_floor');
    floorCollider.setVisible(false);
    floorCollider.setDisplaySize(worldW, 32);
    floorCollider.refreshBody();
    floorCollider.body.checkCollision.left = false;
    floorCollider.body.checkCollision.right = false;

    // Outer Boundaries (2 colliders instead of 80!)
    const leftBound = this.platforms.create(-16, worldH / 2, 'tile_floor');
    leftBound.setVisible(false);
    leftBound.setDisplaySize(32, worldH);
    leftBound.refreshBody();

    const rightBound = this.platforms.create(worldW + 16, worldH / 2, 'tile_floor');
    rightBound.setVisible(false);
    rightBound.setDisplaySize(32, worldH);
    rightBound.refreshBody();

    // Boss Arena Tactical Platforms
    this.createPlatformSlab(420, 440, 5);
    this.createPlatformSlab(780, 360, 6);
    this.createPlatformSlab(1120, 270, 6); // High Throne dais
    this.createPlatformSlab(1460, 360, 6);
    this.createPlatformSlab(1820, 440, 5);

    // Flanking Torches
    this.createTorch(380, 410);
    this.createTorch(1100, 230);
    this.createTorch(1300, 230);
    this.createTorch(1900, 410);

    // Decorative Dragon Bones for Chapter 2 Boss Arena (General Vane)
    if (this.currentRoom === 8) {
      if (this.textures.exists('dragon_bones_head')) {
        this.add.image(1120, 510, 'dragon_bones_head').setScale(1.2).setDepth(2).setAlpha(0.85);
      }
      if (this.textures.exists('dragon_bones_ribs')) {
        this.add.image(580, 510, 'dragon_bones_ribs').setScale(1.1).setDepth(2).setAlpha(0.8);
        this.add.image(1660, 510, 'dragon_bones_ribs').setScale(1.1).setDepth(2).setAlpha(0.8).setFlipX(true);
      }
    }

    // Breakable Urns in arena corners
    this.createUrn(450, 414);
    this.createUrn(1850, 414);
  }

  buildShopChamber(worldW, worldH) {
    // 1. Visual tiles
    for (let x = 0; x < worldW; x += 32) {
      this.add.image(x + 16, 560, 'tile_floor').setDepth(2);
      this.add.image(x + 16, 592, 'tile_foundation').setDepth(2);
    }
    // Single unified continuous floor collider
    const floorCollider = this.platforms.create(worldW / 2, 560, 'tile_floor');
    floorCollider.setVisible(false);
    floorCollider.setDisplaySize(worldW, 32);
    floorCollider.refreshBody();
    floorCollider.body.checkCollision.left = false;
    floorCollider.body.checkCollision.right = false;

    // Outer Boundaries (2 colliders)
    const leftBound = this.platforms.create(-16, worldH / 2, 'tile_floor');
    leftBound.setVisible(false);
    leftBound.setDisplaySize(32, worldH);
    leftBound.refreshBody();

    const rightBound = this.platforms.create(worldW + 16, worldH / 2, 'tile_floor');
    rightBound.setVisible(false);
    rightBound.setDisplaySize(32, worldH);
    rightBound.refreshBody();

    // The Hooded Collector Market Stall
    if (this.textures.exists('prop_market_stall')) {
      this.add.image(520, 480, 'prop_market_stall').setScale(1.6).setDepth(3);
    }
    if (this.textures.exists('prop_soul_lantern')) {
      this.add.image(380, 510, 'prop_soul_lantern').setDepth(3);
      this.add.image(660, 510, 'prop_soul_lantern').setDepth(3);
    }
    if (this.textures.exists('prop_chest')) {
      this.add.image(860, 535, 'prop_chest').setScale(1.1).setDepth(3);
    }
    if (this.textures.exists('prop_coffin')) {
      this.add.image(200, 530, 'prop_coffin').setScale(1.1).setDepth(3);
    }

    // Atmospheric Lantern Glows
    this.createTorch(380, 480);
    this.createTorch(660, 480);

    // Shopkeeper Title Banner
    this.add.text(520, 395, '✦ THE HOODED COLLECTOR\'S BAZAAR ✦', {
      fontFamily: 'Cinzel, monospace', fontSize: '13px', fontStyle: 'bold', color: '#facc15',
      stroke: '#05070a', strokeThickness: 4, backgroundColor: 'rgba(5, 7, 10, 0.9)',
      padding: { x: 12, y: 5 }
    }).setOrigin(0.5).setDepth(20);

    // Item 1: Restorative Health Potion
    const item1 = this.add.sprite(360, 520, 'potion-red').setScale(1.8).setDepth(5).setInteractive({ useHandCursor: true });
    if (this.anims.exists('potion-red-glow')) item1.anims.play('potion-red-glow');
    this.add.text(360, 480, '[CLICK / E]\nHEALTH POTION\n50 GOLD', {
      fontFamily: 'monospace', fontSize: '9px', fontStyle: 'bold', color: '#4ade80',
      align: 'center', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(20);

    const buyHealthPotion = () => {
      if (this.player.potions >= this.player.maxPotions && this.player.hp >= this.player.maxHp) {
        EventBus.emit('notification:show', { text: 'HEALTH & POTIONS ALREADY FULL!', color: '#38bdf8' });
        return;
      }
      if (this.gold >= 50) {
        this.gold -= 50;
        EventBus.emit('gold:changed', this.gold);
        this.player.potions = Math.min(this.player.maxPotions, this.player.potions + 1);
        this.player.heal(50);
        EventBus.emit('potion:changed', { current: this.player.potions, max: this.player.maxPotions });
        try { SoundSynth.playBloodOrb(); } catch (e) {}
        this.juice.emitHolySparks(360, 520, 16);
        EventBus.emit('notification:show', { text: 'BOUGHT: HEALTH POTION (+1 POTION & +50 HP)', color: '#4ade80' });
      } else {
        EventBus.emit('notification:show', { text: 'NOT ENOUGH GOLD! (NEED 50)', color: '#ef4444' });
      }
    };

    item1.on('pointerdown', () => {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 360, 520) < 220) buyHealthPotion();
    });

    // Item 2: Purple Abyssal Elixir
    const item2 = this.add.sprite(680, 520, 'potion-purple').setScale(1.8).setDepth(5).setInteractive({ useHandCursor: true });
    if (this.anims.exists('potion-purple-glow')) item2.anims.play('potion-purple-glow');
    this.add.text(680, 480, '[CLICK / E]\nABYSSAL ELIXIR\n40 GOLD', {
      fontFamily: 'monospace', fontSize: '9px', fontStyle: 'bold', color: '#c084fc',
      align: 'center', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(20);

    const buyAbyssalElixir = () => {
      if (this.gold >= 40) {
        this.gold -= 40;
        EventBus.emit('gold:changed', this.gold);
        this.player.addCorruption(35);
        this.player.frenzyTimer = 20;
        try { SoundSynth.playRoar(); } catch (e) {}
        this.juice.emitVoidEmbers(680, 520, 20);
        EventBus.emit('notification:show', { text: 'BOUGHT: ABYSSAL ELIXIR (+35% CORRUPT & 20s FRENZY)', color: '#c084fc' });
      } else {
        EventBus.emit('notification:show', { text: 'NOT ENOUGH GOLD! (NEED 40)', color: '#ef4444' });
      }
    };

    item2.on('pointerdown', () => {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 680, 520) < 220) buyAbyssalElixir();
    });

    // Item 3: Mystery Relic Casket
    const item3 = this.add.sprite(860, 520, 'prop_chest').setScale(1.2).setDepth(5).setInteractive({ useHandCursor: true });
    this.add.text(860, 480, '[CLICK / E]\nRELIC CASKET\n110 GOLD', {
      fontFamily: 'monospace', fontSize: '9px', fontStyle: 'bold', color: '#facc15',
      align: 'center', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(20);

    let casketOpened = false;
    const buyRelicCasket = () => {
      if (casketOpened) return;
      if (this.gold >= 110) {
        this.gold -= 110;
        casketOpened = true;
        EventBus.emit('gold:changed', this.gold);
        item3.setTint(0x475569);
        try { SoundSynth.playSlash(3); } catch (e) {}
        this.juice.emitSparks(860, 520, 25);
        const choices = this.relicSystem.getThreeRandomChoices();
        EventBus.emit('relic:choose_options', choices);
      } else {
        EventBus.emit('notification:show', { text: 'NOT ENOUGH GOLD! (NEED 110)', color: '#ef4444' });
      }
    };

    item3.on('pointerdown', () => {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 860, 520) < 220) buyRelicCasket();
    });

    this.shopItems = [
      { x: 360, buy: buyHealthPotion },
      { x: 680, buy: buyAbyssalElixir },
      { x: 860, buy: buyRelicCasket }
    ];
  }

  buildExpansiveLevelGeometry(worldW, worldH) {
    // 1. Continuous Seam-Free Floor Segments (Unified Colliders: 100% fixes horizontal snagging/stuck bugs!)
    const buildFloorSegment = (startX, endX) => {
      // Visual masonry tiles (Pure visual images, ZERO physics overhead!)
      for (let x = startX; x < endX; x += 32) {
        this.add.image(x + 16, 560, 'tile_floor').setDepth(2);
        this.add.image(x + 16, 592, 'tile_foundation').setDepth(2);
        this.add.image(x + 16, 624, 'tile_foundation').setDepth(2);
      }
      // Single continuous physics collider for the entire floor segment
      const segW = endX - startX;
      if (segW > 0) {
        const floorCollider = this.platforms.create(startX + segW / 2, 560, 'tile_floor');
        floorCollider.setVisible(false);
        floorCollider.setDisplaySize(segW, 32);
        floorCollider.refreshBody();
        floorCollider.body.checkCollision.left = false;
        floorCollider.body.checkCollision.right = false;
      }
    };

    // Helper to build a proper deep chasm with vertical stone walls, visual pit floor, and lethal spikes
    const buildDeepChasm = (startX, endX) => {
      // Visual cliff corners and walls
      this.add.image(startX - 16, 560, 'tile_cliff_corner_left').setDepth(2);
      this.add.image(startX - 16, 592, 'tile_cliff_left').setDepth(2);
      this.add.image(startX - 16, 624, 'tile_cliff_left').setDepth(2);

      this.add.image(endX + 16, 560, 'tile_cliff_corner_right').setDepth(2);
      this.add.image(endX + 16, 592, 'tile_cliff_right').setDepth(2);
      this.add.image(endX + 16, 624, 'tile_cliff_right').setDepth(2);

      // Single vertical left wall collider
      const leftWall = this.platforms.create(startX - 16, 592, 'tile_cliff_left');
      leftWall.setVisible(false);
      leftWall.setDisplaySize(32, 96);
      leftWall.refreshBody();

      // Single vertical right wall collider
      const rightWall = this.platforms.create(endX + 16, 592, 'tile_cliff_right');
      rightWall.setVisible(false);
      rightWall.setDisplaySize(32, 96);
      rightWall.refreshBody();

      // Visual stone plinth and spikes
      for (let px = startX + 16; px <= endX - 16; px += 32) {
        this.add.image(px, 624, 'tile_foundation').setDepth(1);
        this.add.image(px, 608, 'hazard_spikes').setDepth(2);
      }

      // Single continuous hazard spike collider across the entire pit floor
      const pitW = (endX - 16) - (startX + 16) + 32;
      const pitMidX = (startX + endX) / 2;
      const pitSpike = this.hazards.create(pitMidX, 612, 'hazard_spikes');
      pitSpike.setVisible(false);
      pitSpike.setDisplaySize(pitW, 24);
      pitSpike.refreshBody();
    };

    // =========================================================================
    // 5-ZONE EXPANSIVE DUNGEON ARCHITECTURE (5600px Side-Scrolling Odyssey)
    // =========================================================================

    // Floor 1 (Zone 1: The Forsaken Cathedral Nave): x: 0 - 1056
    buildFloorSegment(0, 1056);
    // Chasm 1 (x: 1088 - 1280) -> Deep abyss with stepping stone platform
    buildDeepChasm(1088, 1280);
    this.createPlatformSlab(1140, 470, 3); // Stepping Stone Island

    // Floor 2 (Zone 2: Sunken Crypts & Mausoleums): x: 1312 - 2240
    buildFloorSegment(1312, 2240);
    // Chasm 2 (x: 2272 - 2464) -> Ancient Crypt Chasm
    buildDeepChasm(2272, 2464);
    this.createPlatformSlab(2320, 460, 2); // Bridge pillar 1
    this.createPlatformSlab(2400, 420, 2); // Bridge pillar 2

    // Floor 3 (Zone 3: Clocktower of Ashes & Blood Altar): x: 2496 - 3488
    buildFloorSegment(2496, 3488);
    // Chasm 3 (x: 3520 - 3712) -> Gear Moat
    buildDeepChasm(3520, 3712);
    this.createPlatformSlab(3580, 460, 3); // Stepping Stone Island

    // Floor 4 (Zone 4: Inquisitor's Fortified Bastion): x: 3744 - 4736
    buildFloorSegment(3744, 4736);
    // Chasm 4 (x: 4768 - 4960) -> Fortress Outer Trench
    buildDeepChasm(4768, 4960);
    this.createPlatformSlab(4820, 460, 3); // Castle Drawbridge Remnant

    // Floor 5 (Zone 5: The Gates of Destiny Grand Terrace): x: 4992 - worldW
    buildFloorSegment(4992, worldW);

    // Outer Boundaries (2 unified colliders instead of 90 separate bodies!)
    const leftBound = this.platforms.create(-16, worldH / 2, 'tile_floor');
    leftBound.setVisible(false);
    leftBound.setDisplaySize(32, worldH);
    leftBound.refreshBody();

    const rightBound = this.platforms.create(worldW + 16, worldH / 2, 'tile_floor');
    rightBound.setVisible(false);
    rightBound.setDisplaySize(32, worldH);
    rightBound.refreshBody();

    // Safety Floor at very bottom (1 unified collider instead of 88!)
    const safetyFloor = this.platforms.create(worldW / 2, 650, 'tile_foundation');
    safetyFloor.setVisible(false);
    safetyFloor.setDisplaySize(worldW, 40);
    safetyFloor.refreshBody();

    // -------------------------------------------------------------------------
    // ZONE 1: THE FORSAKEN CATHEDRAL NAVE (x: 0 - 1088)
    // -------------------------------------------------------------------------
    // High Choir Balconies & Catwalks (Verticality!)
    this.createPlatformSlab(240, 440, 5);
    this.createPlatformSlab(480, 340, 6); // High Organ Gallery
    this.createPlatformSlab(760, 430, 5);
    this.createPlatformSlab(940, 360, 3); // Lookout Catwalk

    this.createTorch(200, 400);
    this.createTorch(520, 300);
    this.createTorch(780, 390);
    this.createTorch(960, 320);

    this.createUrn(490, 314);
    this.createUrn(550, 314);
    this.createUrn(780, 404);
    this.createUrn(950, 334);

    // -------------------------------------------------------------------------
    // ZONE 2: SUNKEN CRYPTS & MAUSOLEUMS (x: 1312 - 2272)
    // -------------------------------------------------------------------------
    this.createPlatformSlab(1360, 440, 5);
    this.createPlatformSlab(1580, 350, 6); // Royal Mausoleum Arch
    this.createPlatformSlab(1860, 270, 5); // Crypt Vault Peak
    this.createPlatformSlab(2060, 400, 5);

    // Ancient Stone Coffins on ground level (breakable for gold!)
    if (this.textures.exists('prop_coffin')) {
      this.add.image(1480, 536, 'prop_coffin').setDepth(3);
      this.add.image(1920, 536, 'prop_coffin').setDepth(3);
    }
    if (this.textures.exists('prop_soul_lantern')) {
      this.add.image(1400, 530, 'prop_soul_lantern').setDepth(3);
      this.add.image(2140, 530, 'prop_soul_lantern').setDepth(3);
    }

    this.createTorch(1400, 400);
    this.createTorch(1650, 310);
    this.createTorch(1900, 230);
    this.createTorch(2120, 360);

    this.createUrn(1600, 324);
    this.createUrn(1660, 324);
    this.createUrn(1880, 244);
    this.createUrn(2080, 374);

    // -------------------------------------------------------------------------
    // ZONE 3: CLOCKTOWER OF ASHES & BLOOD ALTAR (x: 2496 - 3520)
    // -------------------------------------------------------------------------
    // Raised Dais for Altar of Sacrifice
    this.createPlatformSlab(2780, 520, 6);
    this.shrineGlow = this.add.image(2876, 478, 'shrine_glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(3).setAlpha(0.65);
    this.tweens.add({
      targets: this.shrineGlow,
      alpha: { from: 0.45, to: 0.8 },
      scale: { from: 0.95, to: 1.1 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.shrine = this.add.sprite(2876, 496, 'shrine_blood').setDepth(5);
    this.shrineUsed = false;

    // Ascending Clockwork Platforms
    this.createPlatformSlab(2560, 430, 4);
    this.createPlatformSlab(2820, 340, 6);
    this.createPlatformSlab(3080, 250, 5); // Clockwork Tower Summit
    this.createPlatformSlab(3320, 380, 4);

    // Treasure Chest at Tower Summit!
    if (this.textures.exists('prop_chest')) {
      this.add.image(3140, 226, 'prop_chest').setScale(1.1).setDepth(4);
    }

    this.createTorch(2580, 390);
    this.createTorch(2860, 300);
    this.createTorch(3120, 210);
    this.createTorch(3340, 340);
    this.createTorch(2790, 478);
    this.createTorch(2960, 478);

    this.createUrn(2580, 404);
    this.createUrn(2840, 314);
    this.createUrn(2900, 314);
    this.createUrn(3340, 354);

    // -------------------------------------------------------------------------
    // ZONE 4: INQUISITOR'S FORTIFIED BASTION (x: 3744 - 4768)
    // -------------------------------------------------------------------------
    this.createPlatformSlab(3820, 440, 5);
    this.createPlatformSlab(4080, 340, 6); // Fortress Battlement
    this.createPlatformSlab(4360, 260, 5); // High Watchtower
    this.createPlatformSlab(4580, 400, 4);

    this.createTorch(3860, 400);
    this.createTorch(4140, 300);
    this.createTorch(4400, 220);
    this.createTorch(4620, 360);

    this.createUrn(4100, 314);
    this.createUrn(4160, 314);
    this.createUrn(4380, 234);
    this.createUrn(4600, 374);

    // -------------------------------------------------------------------------
    // ZONE 5: THE GATES OF DESTINY GRAND TERRACE (x: 4992 - 5600)
    // -------------------------------------------------------------------------
    this.createPlatformSlab(5060, 510, 3);
    this.createPlatformSlab(5180, 460, 3);
    this.createPlatformSlab(5300, 410, 8); // Grand Portal Dais (Hosts the 2 Living Archway Gates)

    this.createTorch(5320, 370);
    this.createTorch(5520, 370);
    this.createUrn(5510, 384);
  }

  createPlatformSlab(startX, y, count) {
    const slabW = count * 32;
    for (let i = 0; i < count; i++) {
      this.add.image(startX + i * 32, y, 'tile_platform').setDepth(2);
    }

    // Carved stone corbel brackets underneath both ends for authentic gothic structural support
    this.add.image(startX + 6, y + 15, 'platform_corbel').setDepth(3);
    this.add.image(startX + (count - 1) * 32 + 10, y + 15, 'platform_corbel').setFlipX(true).setDepth(3);

    // High platforms get cathedral iron chains hanging from the ceiling rafters
    if (y <= 380) {
      const chainX1 = startX + 16;
      const chainX2 = startX + (count - 1) * 32;
      for (let cy = 40; cy < y - 8; cy += 30) {
        this.add.image(chainX1, cy, 'chain_link').setDepth(2).setAlpha(0.75);
        if (count >= 4) {
          this.add.image(chainX2, cy, 'chain_link').setDepth(2).setAlpha(0.75);
        }
      }
    }

    // Single unified platform collider with smooth one-way top collision (Zero seam catching!)
    const midX = startX + (count - 1) * 16;
    const slab = this.platforms.create(midX, y, 'tile_platform');
    slab.setVisible(false);
    slab.setDisplaySize(slabW, 20);
    slab.refreshBody();
    slab.body.checkCollision.down = false;
    slab.body.checkCollision.left = false;
    slab.body.checkCollision.right = false;
  }

  createHazardSpikes(startX, y, count) {
    const totalW = count * 32;
    for (let i = 0; i < count; i++) {
      this.add.image(startX + i * 32, y, 'hazard_spikes').setDepth(2);
    }
    const midX = startX + (count - 1) * 16;
    const spike = this.hazards.create(midX, y, 'hazard_spikes');
    spike.setVisible(false);
    spike.setDisplaySize(totalW, 20);
    spike.refreshBody();
  }

  createTorch(x, y) {
    // Volumetric warm light halo with additive blend mode
    const glow = this.add.image(x, y - 6, 'torch_glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(2).setAlpha(0.5);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.38, to: 0.58 },
      scale: { from: 0.95, to: 1.08 },
      duration: 220 + Math.random() * 120,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const torch = this.add.sprite(x, y, 'torch_sconce').setDepth(4);
    const timer = this.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => {
        if (!torch.active) {
          timer.remove();
          return;
        }
        if (Math.random() > 0.45 && this.juice) {
          const flameX = x + (Math.random() * 4 - 2);
          const flameY = y - 10 + (Math.random() * 3 - 1);
          const part = this.add.image(flameX, flameY, 'part_sunfire').setDepth(5);
          this.tweens.add({
            targets: part,
            y: flameY - 12,
            alpha: 0,
            scale: 0.2,
            duration: 350,
            onComplete: () => part.destroy()
          });
        }
      }
    });
    this.torches.push({ sprite: torch, timer, glow });
    return torch;
  }

  createUrn(x, y) {
    const urn = new BreakableProp(this, x, y, 'urn_clay');
    this.props.add(urn);
    return urn;
  }

  onPlayerHitHazard(hazard) {
    if (!this.player || !this.player.active || this.player.isDead) return;
    if (this.hazardHitCooldown && this.time.now < this.hazardHitCooldown) return;
    this.hazardHitCooldown = this.time.now + 850; // 0.85s i-frames

    this.player.takeDamage(12, (hazard && hazard.x) ? hazard.x : this.player.x);
    this.player.setVelocityY(-360);
    this.player.setVelocityX(this.player.facing * -140);
    this.juice.addTrauma(0.35);
    this.juice.emitBlood(this.player.x, this.player.y, 10);
    try { SoundSynth.playHit(); } catch (e) {}
  }

  interactWithShrine() {
    if (this.shrineUsed || !this.player || this.player.isDead) return;
    if (this.player.hp <= 20) {
      this.juice.popDamageNumber(this.player.x, this.player.y - 20, 'INSUFFICIENT BLOOD!', 'normal');
      return;
    }

    this.shrineUsed = true;
    this.shrinePrompt.setVisible(false);
    if (this.shrine) {
      this.shrine.setTint(0x475569); // Dimmed inert stone
    }

    // Sacrificial cost & rewards
    this.player.hp -= 15;
    EventBus.emit('player:hp_changed', { current: this.player.hp, max: this.player.maxHp });
    this.player.addCorruption(15);
    this.player.frenzyTimer = 15; // 15 seconds Blood Frenzy (+25% move speed, +30% attack speed)

    // Gold cascade
    this.gold += 100;
    EventBus.emit('gold:changed', this.gold);
    for (let i = 0; i < 5; i++) {
      this.spawnGoldCoin(this.shrine.x + (Math.random() * 40 - 20), this.shrine.y - 20);
    }

    this.juice.addTrauma(0.45);
    this.juice.emitBlood(this.shrine.x, this.shrine.y, 24);
    this.juice.emitVoidEmbers(this.shrine.x, this.shrine.y, 16);
    this.cameras.main.flash(250, 180, 20, 20);
    SoundSynth.playRoar();

    EventBus.emit('notification:show', {
      text: '✦ PACT SEALED: 100 GOLD & BLOOD FRENZY UNLEASHED! ✦',
      color: '#ef4444'
    });
  }

  spawnExpansiveEnemyWave(worldW) {
    const room = this.currentRoom || 1;

    // Helper to spawn and track an enemy
    const spawnEnemy = (x, y, type) => {
      const enemy = new Enemy(this, x, y, type);
      this.physics.add.collider(enemy, this.platforms);
      // Instant hazard kill overlap
      this.physics.add.overlap(enemy, this.hazards, () => {
        if (enemy && enemy.active && !enemy.isDead) {
          this.juice.emitBlood(enemy.x, enemy.y, 24);
          enemy.die();
        }
      });
      this.enemies.push(enemy);
      this.enemyGroup.add(enemy);
      return enemy;
    };

    // 1. Zone 1: Cathedral Antechamber (x: 200 - 950)
    const z1Ghouls = Math.min(3, 2 + Math.floor(room * 0.4));
    for (let i = 0; i < z1Ghouls; i++) {
      spawnEnemy(360 + i * 160, 510, 'ghoul');
    }
    spawnEnemy(480, 290, 'cultist');
    spawnEnemy(820, 380, 'bat');

    // 2. Zone 2: Sunken Crypts & Mausoleums (x: 1312 - 2240)
    const z2Ghouls = Math.min(3, 2 + Math.floor(room * 0.4));
    for (let i = 0; i < z2Ghouls; i++) {
      spawnEnemy(1450 + i * 150, 510, 'ghoul');
    }
    spawnEnemy(1800, 510, 'skeleton');
    spawnEnemy(2050, 510, 'skeleton');
    spawnEnemy(1580, 300, 'cultist');
    spawnEnemy(1860, 220, 'bat');
    if (room >= 2) {
      spawnEnemy(1950, 500, 'elite');
    }

    // 3. Zone 3: Clocktower of Ashes & Blood Altar (x: 2496 - 3488)
    spawnEnemy(2720, 500, 'elite');
    spawnEnemy(2950, 510, 'skeleton');
    spawnEnemy(3150, 510, 'skeleton');
    spawnEnemy(3080, 200, 'sorcerer');
    if (room >= 3) {
      spawnEnemy(3280, 330, 'bat');
    }

    // 4. Zone 4: Inquisitor's Fortified Bastion (x: 3744 - 4736)
    const z4Ghouls = Math.min(3, 2 + Math.floor(room * 0.5));
    for (let i = 0; i < z4Ghouls; i++) {
      spawnEnemy(3880 + i * 140, 510, 'ghoul');
    }
    spawnEnemy(4080, 290, 'sorcerer');
    spawnEnemy(4360, 510, 'skeleton');
    if (room >= 2) {
      spawnEnemy(4480, 500, 'elite');
    }
    if (room >= 3) {
      spawnEnemy(4620, 350, 'bat');
    }

    // 5. Zone 5: Grand Terrace Guardians (x: 4992 - 5400)
    spawnEnemy(5120, 510, 'skeleton');
    if (room >= 2) {
      spawnEnemy(5260, 360, 'cultist');
    }
    if (room >= 3) {
      spawnEnemy(5380, 360, 'elite');
    }

    // 6. Time-based Escalation: Blood Horde Reinforcements if taking too long
    this.startReinforcementTimer();
  }

  startReinforcementTimer() {
    if (this.reinforcementTimer) {
      this.reinforcementTimer.remove();
    }
    this.reinforcementCount = 0;

    // Every 25 seconds in normal chambers, if room is not cleared, spawn reinforcements!
    this.reinforcementTimer = this.time.addEvent({
      delay: 25000,
      loop: true,
      callback: () => {
        if (this.roomCleared || this.isBossChamber || !this.player || this.player.isDead) return;
        this.reinforcementCount++;

        EventBus.emit('notification:show', {
          text: '✦ BLOOD HORDE REINFORCEMENTS SUMMONED! ✦',
          color: '#ef4444'
        });
        this.juice.addTrauma(0.5);
        try { SoundSynth.playRoar(); } catch (e) {}

        const spawnOffset = (Math.random() > 0.5 ? 260 : -260);
        const spawnX = Phaser.Math.Clamp(this.player.x + spawnOffset, 120, this.worldWidth - 120);
        const ghoul = new Enemy(this, spawnX, 510, 'ghoul');
        this.physics.add.collider(ghoul, this.platforms);
        this.enemies.push(ghoul);
        this.enemyGroup.add(ghoul);
        this.juice.emitVoidEmbers(spawnX, 510, 16);

        if (this.currentRoom >= 2) {
          const cultistX = Phaser.Math.Clamp(this.player.x - spawnOffset, 120, this.worldWidth - 120);
          const cultist = new Enemy(this, cultistX, 510, 'cultist');
          this.physics.add.collider(cultist, this.platforms);
          this.enemies.push(cultist);
          this.enemyGroup.add(cultist);
          this.juice.emitVoidEmbers(cultistX, 510, 16);
        }

        EventBus.emit('enemies:count', this.enemies.length);
      }
    });
  }

  spawnBossEncounter() {
    this.enemies = [];
    this.enemyGroup.clear(true, true);

    if (this.currentRoom === 3) {
      // ACT 1 BOSS: General Vane the Iron Executioner
      this.boss = new Enemy(this, 1400, 480, 'general_vane');
      this.physics.add.collider(this.boss, this.platforms);
      this.enemies.push(this.boss);
      this.enemyGroup.add(this.boss);

      const minion1 = new Enemy(this, 700, 480, 'skeleton');
      const minion2 = new Enemy(this, 1800, 480, 'skeleton');
      this.physics.add.collider([minion1, minion2], this.platforms);
      this.enemies.push(minion1, minion2);
      this.enemyGroup.add(minion1);
      this.enemyGroup.add(minion2);

      EventBus.emit('boss:spawned', { name: 'GENERAL VANE THE IRON EXECUTIONER', maxHp: this.boss.maxHp });
    } else if (this.currentRoom === 6) {
      // ACT 2 BOSS: High Inquisitor Malakor
      this.boss = new Enemy(this, 1300, 260, 'malakor');
      this.physics.add.collider(this.boss, this.platforms);
      this.enemies.push(this.boss);
      this.enemyGroup.add(this.boss);

      const bat1 = new Enemy(this, 600, 280, 'bat');
      const bat2 = new Enemy(this, 1900, 280, 'bat');
      this.enemies.push(bat1, bat2);
      this.enemyGroup.add(bat1);
      this.enemyGroup.add(bat2);

      EventBus.emit('boss:spawned', { name: 'HIGH INQUISITOR MALAKOR', maxHp: this.boss.maxHp });
    } else if (this.currentRoom === 9) {
      // ACT 3 BOSS: Void Arch-Seraph Belial
      this.boss = new Enemy(this, 1200, 240, 'belial');
      this.physics.add.collider(this.boss, this.platforms);
      this.enemies.push(this.boss);
      this.enemyGroup.add(this.boss);

      const sorcerer1 = new Enemy(this, 500, 320, 'sorcerer');
      const sorcerer2 = new Enemy(this, 1900, 320, 'sorcerer');
      this.physics.add.collider([sorcerer1, sorcerer2], this.platforms);
      this.enemies.push(sorcerer1, sorcerer2);
      this.enemyGroup.add(sorcerer1);
      this.enemyGroup.add(sorcerer2);

      EventBus.emit('boss:spawned', { name: 'VOID ARCH-SERAPH BELIAL', maxHp: this.boss.maxHp });
    } else if (this.currentRoom === 12) {
      // ACT 4 FINAL CLIMAX BOSS: The Cursed King Aldous & Primordial Void Heart
      this.boss = new Enemy(this, 1300, 480, 'cursed_king');
      this.physics.add.collider(this.boss, this.platforms);
      this.enemies.push(this.boss);
      this.enemyGroup.add(this.boss);

      const guard1 = new Enemy(this, 750, 480, 'elite');
      const guard2 = new Enemy(this, 1750, 480, 'elite');
      this.physics.add.collider([guard1, guard2], this.platforms);
      this.enemies.push(guard1, guard2);
      this.enemyGroup.add(guard1);
      this.enemyGroup.add(guard2);

      EventBus.emit('boss:spawned', { name: 'THE CURSED KING ALDOUS', maxHp: this.boss.maxHp });
    }

    this.juice.addTrauma(0.85);
    SoundSynth.playRoar();
  }

  update(time, delta) {
    const dt = delta / 1000;
    this.juice.update(dt);

    // Fast Parallax Scroll (Fixed viewport quads, zero fill-rate overhead)
    if (this.bgBack && this.cameras && this.cameras.main) {
      this.bgBack.tilePositionX = this.cameras.main.scrollX * 0.08;
    }
    if (this.bgColumns && this.cameras && this.cameras.main) {
      this.bgColumns.tilePositionX = this.cameras.main.scrollX * 0.28;
    }

    // Update Player & fail-safe pit rescue bounds
    if (this.player && this.player.active && !this.player.isDead) {
      this.player.update(time, delta);
      if (this.player.y > 615) {
        this.onPlayerHitHazard({ x: this.player.x });
        this.player.setPosition(Math.max(120, this.player.x - 80), 490);
        this.player.setVelocity(0, -120);
      }

      // Real-time Expedition Distance & Zone Tracking (Throttled to prevent canvas font re-rasterization)
      const playerX = Math.round(this.player.x);
      let currentZone = 'Cathedral Nave';
      if (playerX >= 4900) currentZone = 'Gates of Destiny';
      else if (playerX >= 3700) currentZone = 'Inquisitor\'s Bastion';
      else if (playerX >= 2460) currentZone = 'Clocktower & Blood Altar';
      else if (playerX >= 1250) currentZone = 'Sunken Crypts';

      if (this.lastZone !== currentZone) {
        this.lastZone = currentZone;
        EventBus.emit('zone:entered', currentZone);
      }

      if (this.lastReportedProgressX === undefined || Math.abs(playerX - this.lastReportedProgressX) >= 15) {
        this.lastReportedProgressX = playerX;
        EventBus.emit('player:progress', {
          currentX: playerX,
          maxX: this.worldWidth,
          zone: currentZone
        });
      }
    }

    // Prune dead/inactive enemies to guarantee room clearance never deadlocks
    this.enemies = this.enemies.filter(e => e && e.active && !e.isDead);
    if (this.enemies.length === 0 && !this.roomCleared) {
      this.onRoomCleared();
    }

    // Update Enemies with Viewport Distance Culling (Far-away enemies sleep to save CPU & physics cycles)
    const pX = (this.player && this.player.active) ? this.player.x : 0;
    for (const enemy of this.enemies) {
      if (enemy && enemy.active && enemy.body && !enemy.isDead) {
        if (Math.abs(enemy.x - pX) < 960) {
          enemy.update(time, delta, this.player);
        } else {
          if (enemy.body.velocity.x !== 0) enemy.setVelocityX(0);
        }
      }
    }

    // Pickups
    this.physics.overlap(this.player, this.pickups, (player, pickup) => {
      this.collectPickup(pickup);
    });

    // Check Blood Shrine (Altar of Sacrifice) in Zone 3
    if (this.shrine && this.shrine.active && !this.shrineUsed && this.player && !this.player.isDead) {
      const distToShrine = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.shrine.x, this.shrine.y);
      if (distToShrine < 75) {
        this.shrinePrompt.setPosition(this.shrine.x, this.shrine.y - 42).setVisible(true);
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
          this.interactWithShrine();
        }
      } else {
        this.shrinePrompt.setVisible(false);
      }
    } else if (this.shrinePrompt) {
      this.shrinePrompt.setVisible(false);
    }

    // Check Shop Items interaction in Chamber 5
    if (this.isShopChamber && this.shopItems && this.player && !this.player.isDead) {
      if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
        for (const item of this.shopItems) {
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, 520) < 100) {
            item.buy();
            break;
          }
        }
      }
    }

    // Check Gate interactions at the far right
    if (this.roomCleared && !this.isTransitioning) {
      let touchingGate = null;
      this.physics.overlap(this.player, this.gates, (player, gate) => {
        touchingGate = gate;
      });

      if (touchingGate) {
        this.gatePrompt.setPosition(touchingGate.x, touchingGate.y - 88).setVisible(true);

        const interactPressed = Phaser.Input.Keyboard.JustDown(this.player.keys.up) ||
                                Phaser.Input.Keyboard.JustDown(this.player.keys.altUp) ||
                                Phaser.Input.Keyboard.JustDown(this.player.keys.space) ||
                                Phaser.Input.Keyboard.JustDown(this.eKey);
        if (interactPressed) {
          this.interactWithGate(touchingGate);
        }
      } else {
        this.gatePrompt.setVisible(false);
      }
    } else {
      this.gatePrompt.setVisible(false);
    }
  }

  checkAttackHit(x, y, width, height, damage, isBeast) {
    const rect = new Phaser.Geom.Rectangle(x - width / 2, y - height / 2, width, height);
    let hitAnyEnemy = false;

    // Check hit on enemies
    for (const enemy of this.enemies) {
      if (!enemy.active || enemy.isDead) continue;
      const enemyBounds = enemy.getBounds();
      if (Phaser.Geom.Intersects.RectangleToRectangle(rect, enemyBounds)) {
        hitAnyEnemy = true;
        const critChance = (this.player && this.player.statMods && this.player.statMods.critChance) || 0.10;
        const isCrit = Math.random() < critChance;
        const critMult = 1.5 + ((this.player && this.player.statMods && this.player.statMods.critDamageBonus) || 0);
        const totalDmg = isCrit ? Math.round(damage * critMult) : damage;
        enemy.takeDamage(totalDmg, x, isCrit, isBeast);
        this.juice.hitStop(step === 2 ? 40 : 20);

        // Relic effect: Frenzied Wolf Fang (Bleed application)
        if (enemy.active && !enemy.isDead && this.player && this.player.statMods && Math.random() < (this.player.statMods.bleedChance || 0)) {
          enemy.applyBleed(3, Math.round(8 * (this.player.statMods.damageMult || 1)));
        }

        this.juice.emitVoidEmbers(enemy.x, enemy.y, 4);

        if (this.isBossChamber) {
          EventBus.emit('boss:hp_changed', { current: Math.max(0, enemy.hp), max: enemy.maxHp });
        }
      }
    }

    // Check hit on breakable props (urns, crates)
    if (this.props) {
      for (const prop of this.props.getChildren()) {
        if (!prop.active || prop.isBroken) continue;
        const propBounds = prop.getBounds();
        if (Phaser.Geom.Intersects.RectangleToRectangle(rect, propBounds)) {
          prop.shatter(x, isBeast);
        }
      }
    }

    // Tactile micro hit-stop & impact feedback (Dead Cells feel)
    if (hitAnyEnemy) {
      const step = (this.player && this.player.comboStep) || 1;
      this.juice.hitStop(step === 3 ? 35 : 18);
      this.juice.addTrauma(step === 3 ? 0.20 : 0.08);
    }

    // Harvest Corruption energy strictly ONCE per attack swing (capped, never multiplied by cleave)
    if (hitAnyEnemy && !isBeast && this.player && !this.player.isBeast) {
      const baseGain = (this.player.comboStep === 3) ? 3.5 : 2.0;
      const mult = (this.player.statMods && this.player.statMods.corruptionGainMult) || 1.0;
      const corruptionGain = Math.round(baseGain * mult * 10) / 10;
      this.player.addCorruption(corruptionGain);
    }
  }

  roarShockwave(x, y, radius) {
    for (const enemy of this.enemies) {
      if (!enemy.active || enemy.isDead) continue;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist <= radius) {
        enemy.takeDamage(40, x, false, true);
        enemy.state = 'STAGGERED';
        enemy.staggerTimer = 1.4;
      }
    }
  }

  executeScreenFinisher(x, y, beastType) {
    for (const enemy of this.enemies) {
      if (!enemy.active || enemy.isDead) continue;
      const dmg = beastType === 'gargoyle' ? 220 : 160;
      enemy.takeDamage(dmg, x, true, true);
    }
  }

  spawnEnemyProjectile(x, y, dir, damage, vy = 0, speed = 250, tint = null) {
    if (!this.enemyProjectiles || !this.enemyProjectiles.scene) return;
    try {
      const proj = this.enemyProjectiles.create(x, y, 'fireball');
      if (!proj) return;
      proj.body.setAllowGravity(false);
      proj.setVelocity(dir * speed, vy);
      proj.damage = damage || 16;
      proj.setFlipX(dir > 0);
      if (tint) proj.setTint(tint);

      if (this.anims.exists('fireball-fly')) {
        proj.anims.play('fireball-fly');
      }

      this.time.delayedCall(2800, () => {
        if (proj && proj.active && proj.scene) proj.destroy();
      });
    } catch (e) {
      console.warn('Error spawning fireball:', e);
    }
  }

  triggerEnemySlamShockwave(sourceX, sourceY, radius = 130, damage = 22) {
    this.juice.addTrauma(0.35);
    this.juice.emitSparks(sourceX, sourceY, 16);
    try {
      SoundSynth.playRoar();
    } catch (e) {}

    // Check player collision with ground shockwave
    if (this.player && this.player.active && !this.player.isDead) {
      const dist = Math.abs(this.player.x - sourceX);
      const onFloor = this.player.body.blocked.down || this.player.body.touching.down;
      // Shockwave travels along floor! If player jumps, they dodge it cleanly!
      if (dist <= radius && onFloor && !this.player.isDashing) {
        if (this.player.isParrying) {
          this.player.onSuccessfulParry(null);
        } else {
          this.player.takeDamage(damage, sourceX);
          this.player.setVelocityY(-140);
        }
      }
    }
  }

  spawnVoidWave(x, y, dir, damage) {
    if (!this.playerProjectiles || !this.playerProjectiles.scene) return;
    try {
      // 16-bit animated Cleave Crescent - balanced short-range shockwave (~160px reach)
      const wave = this.playerProjectiles.create(x, y, 'void_crescent');
      if (!wave) return;
      wave.body.setAllowGravity(false);
      wave.body.setSize(32, 54).setOffset(8, 8);
      wave.setVelocityX(dir * 330);
      wave.setFlipX(dir < 0);
      wave.damage = damage;
      wave.setDepth(20);

      if (this.anims.exists('void-crescent-fly')) {
        wave.anims.play('void-crescent-fly');
      }

      // Trailing demonic flame particles
      const particleTimer = this.time.addEvent({
        delay: 50,
        loop: true,
        callback: () => {
          if (wave && wave.active) {
            this.juice.emitVoidEmbers(wave.x - dir * 16, wave.y, 2);
          } else {
            particleTimer.remove();
          }
        }
      });

      // Dissipates after 460ms (~150px) preventing infinite screen-clearing cheese
      this.time.delayedCall(320, () => {
        if (wave && wave.active) {
          this.tweens.add({
            targets: wave,
            alpha: 0,
            scaleY: 0.7,
            duration: 140,
            onComplete: () => {
              particleTimer.remove();
              if (wave && wave.active) wave.destroy();
            }
          });
        }
      });
    } catch (e) {
      console.warn('Error spawning void wave:', e);
    }
  }

  spawnHolyArc(x, y, dir, damage) {
    if (!this.playerProjectiles || !this.playerProjectiles.scene) return;
    try {
      // 16-bit animated Holy Radiant Arc - balanced short-range crescent wave (~160px reach)
      const arc = this.playerProjectiles.create(x, y, 'holy_arc');
      if (!arc) return;
      arc.body.setAllowGravity(false);
      arc.body.setSize(32, 54).setOffset(8, 8);
      arc.setVelocityX(dir * 340);
      arc.setFlipX(dir < 0);
      arc.damage = damage || 20;
      arc.setDepth(20);

      if (this.anims.exists('holy-arc-fly')) {
        arc.anims.play('holy-arc-fly');
      }

      // Trailing sacred solar sparks & embers
      const particleTimer = this.time.addEvent({
        delay: 45,
        loop: true,
        callback: () => {
          if (arc && arc.active) {
            this.juice.emitHolySparks(arc.x - dir * 16, arc.y, 2);
          } else {
            particleTimer.remove();
          }
        }
      });

      this.juice.emitHolySparks(x, y, 6);

      // Dissipates after 460ms (~155px) with graceful fade into sparks
      this.time.delayedCall(320, () => {
        if (arc && arc.active) {
          this.tweens.add({
            targets: arc,
            alpha: 0,
            scaleY: 0.7,
            duration: 140,
            onComplete: () => {
              particleTimer.remove();
              if (arc && arc.active) arc.destroy();
            }
          });
        }
      });
    } catch (e) {
      console.warn('Error spawning holy arc:', e);
    }
  }

  triggerSlamShockwave(x, y) {
    this.juice.addTrauma(0.35);
    this.juice.emitSparks(x, y, 14);
    for (const enemy of this.enemies) {
      if (!enemy.active || enemy.isDead) continue;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist <= 110) {
        enemy.takeDamage(30, x, false, false);
      }
    }
  }

  triggerBloodExplosion(x, y, damage) {
    this.juice.emitBlood(x, y, 22);
    this.juice.addTrauma(0.2);
    for (const enemy of this.enemies) {
      if (!enemy.active || enemy.isDead) continue;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist <= 100) {
        enemy.takeDamage(damage || 40, x, true, true);
      }
    }
  }

  createAtmosphericDustMotes(width, height) {
    for (let i = 0; i < 35; i++) {
      const x = Math.random() * width;
      const y = 30 + Math.random() * 260; // Upper cathedral vault
      const mote = this.add.rectangle(x, y, 2, 2, 0xe2e8f0, 0.45).setScrollFactor(0.25).setDepth(2);
      this.tweens.add({
        targets: mote,
        x: x + (Math.random() * 60 - 30),
        y: y + (Math.random() * 40 - 20),
        alpha: { from: 0.1, to: 0.65 },
        duration: 2800 + Math.random() * 3500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  createGothicVignette() {
    if (!this.textures.exists('vignette_dark')) {
      const c = document.createElement('canvas');
      c.width = 960; c.height = 540;
      const ctx = c.getContext('2d');
      const grad = ctx.createRadialGradient(480, 270, 260, 480, 270, 520);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.5, 'rgba(5, 7, 10, 0.22)');
      grad.addColorStop(1, 'rgba(5, 7, 10, 0.70)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 960, 540);
      this.textures.addCanvas('vignette_dark', c);
    }
    this.vignette = this.add.image(0, 0, 'vignette_dark')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(28)
      .setAlpha(0.60);
  }

  spawnBloodOrb(x, y) {
    const orb = this.pickups.create(x, y - 10, 'blood_orb');
    if (!orb) return;
    orb.pickupType = 'blood';
    orb.setBounce(0.4);
    orb.setCollideWorldBounds(true);
    this.physics.add.collider(orb, this.platforms);
  }

  spawnBloodQuartz(x, y, count = 1) {
    const quartz = this.pickups.create(x, y - 10, 'blood_orb');
    if (!quartz) return;
    quartz.pickupType = 'quartz';
    quartz.quartzAmount = count;
    quartz.setTint(0xf43f5e);
    quartz.setScale(1.4);
    quartz.setBounce(0.4);
    quartz.setCollideWorldBounds(true);
    this.physics.add.collider(quartz, this.platforms);
  }

  spawnGoldCoin(x, y) {
    const coin = this.pickups.create(x, y - 10, 'gold_coin');
    if (!coin) return;
    coin.pickupType = 'gold';
    coin.setBounce(0.3);
    coin.setCollideWorldBounds(true);
    this.physics.add.collider(coin, this.platforms);
  }

  collectPickup(pickup) {
    if (!pickup.active) return;

    if (pickup.pickupType === 'blood') {
      SoundSynth.playBloodOrb();
      const mult = (this.player && this.player.statMods && this.player.statMods.corruptionGainMult) || 1.0;
      this.player.addCorruption(Math.round(3 * mult * 10) / 10);
      const bonusHeal = (this.player && this.player.statMods && this.player.statMods.orbHeal) || 0;
      const healAmt = 4 + bonusHeal;
      this.player.heal(healAmt);
      this.juice.emitBlood(pickup.x, pickup.y, 4);
    } else if (pickup.pickupType === 'gold') {
      SoundSynth.playBloodOrb();
      this.gold += 15;
      EventBus.emit('gold:changed', this.gold);
      this.juice.emitSparks(pickup.x, pickup.y, 4);
    } else if (pickup.pickupType === 'quartz') {
      try { SoundSynth.playHit(); } catch (e) {}
      const amt = pickup.quartzAmount || 1;
      const meta = MetaProgression.getInstance();
      const total = meta.addBloodQuartz(amt);
      EventBus.emit('quartz:changed', total);
      this.juice.emitHolySparks(pickup.x, pickup.y, 8);
      EventBus.emit('notification:show', {
        text: `+${amt} BLOOD QUARTZ COLLECTED! (TOTAL: ${total})`,
        color: '#f43f5e'
      });
    }

    pickup.destroy();
  }

  onRoomCleared() {
    this.roomCleared = true;
    if (this.reinforcementTimer) {
      this.reinforcementTimer.remove();
      this.reinforcementTimer = null;
    }
    SoundSynth.playRoar();
    this.juice.addTrauma(0.5);

    if (this.isBossChamber) {
      EventBus.emit('boss:defeated');
    }

    EventBus.emit('enemies:count', 0);
    EventBus.emit('room:cleared');

    // Show exit guidance arrow towards the right!
    const exitX = this.isBossChamber ? 1200 : 4490;
    const exitY = this.isBossChamber ? 140 : 250;
    this.exitSign.setPosition(exitX, exitY).setVisible(true);

    // Spawn Skul Choice Gateways on the Far Right Terrace
    this.spawnGateways();
  }

  spawnGateways() {
    this.gates.clear(true, true);
    this.gateLabels.forEach(label => label.destroy());
    this.gateLabels = [];

    // Grand Portal Dais sits at y = 410.
    // 96px gate at spawnY = 354 sits flush on top of the dais!
    // In Boss Arena, central throne is at y = 270, so spawnY = 214!
    const spawnY = this.isBossChamber ? 214 : 354;

    const createGateWithLabel = (x, key, animKey, type, title, colorHex) => {
      const gate = this.gates.create(x, spawnY, key);
      gate.gateType = type;
      gate.body.setSize(48, 86).setOffset(8, 10);
      gate.refreshBody();

      // Play living swirling pixel art animation
      if (this.anims.exists(animKey)) {
        gate.anims.play(animKey);
      }

      // Allow clicking directly on the gate to enter
      gate.setInteractive({ useHandCursor: true });
      gate.on('pointerdown', () => {
        if (this.roomCleared && !this.isTransitioning) {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, gate.x, gate.y);
          if (dist < 220) {
            this.interactWithGate(gate);
          }
        }
      });

      const label = this.add.text(x, spawnY - 60, title, {
        fontFamily: 'monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: colorHex,
        stroke: '#05070a',
        strokeThickness: 3,
        backgroundColor: 'rgba(10, 14, 23, 0.9)',
        padding: { x: 8, y: 3 }
      }).setOrigin(0.5).setDepth(15);

      this.gateLabels.push(label);

      // Luminous colored aura behind each portal
      const glowTint = (type === 'gold') ? 0xfacc15 : (type === 'relic' ? 0xc084fc : (type === 'altar' ? 0xef4444 : 0xff0044));
      const gateGlow = this.add.image(x, spawnY, 'torch_glow').setScale(1.8, 2.2).setTint(glowTint).setBlendMode(Phaser.BlendModes.ADD).setDepth(8).setAlpha(0.5);
      this.tweens.add({
        targets: gateGlow,
        alpha: { from: 0.35, to: 0.65 },
        scaleX: { from: 1.6, to: 1.9 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      this.gateLabels.push(gateGlow);

      this.tweens.add({
        targets: [gate, label],
        y: '-=3',
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    };

    // Skul-Style Gate Pairings based on 12-Chamber Campaign Progression:
    if (this.currentRoom === 2) {
      // Preceding Act 1 Boss: General Vane
      createGateWithLabel(5400, 'gate_boss', 'anim-gate-boss', 'boss', '⚔ ACT 1 BOSS: GENERAL VANE', '#f87171');
    } else if (this.currentRoom === 3) {
      // After beating General Vane
      createGateWithLabel(1200, 'gate_relic', 'anim-gate-relic', 'relic', '◆ ENTER ACT 2: SUNKEN CRYPTS', '#c084fc');
    } else if (this.currentRoom === 4) {
      // Before Act 2 Merchant Shop
      createGateWithLabel(5400, 'gate_gold', 'anim-gate-gold', 'gold', '❖ THE COLLECTOR\'S BAZAAR (SHOP)', '#fde047');
    } else if (this.currentRoom === 5) {
      // Exit from Shop into Act 2 Boss Malakor
      createGateWithLabel(1180, 'gate_boss', 'anim-gate-boss', 'boss', '⚔ ACT 2 BOSS: INQUISITOR MALAKOR', '#34d399');
    } else if (this.currentRoom === 6) {
      // After beating Malakor: Enter Act 3 Clocktower
      createGateWithLabel(1200, 'gate_relic', 'anim-gate-relic', 'relic', '◆ ENTER ACT 3: CLOCKTOWER OF ASHES', '#c084fc');
    } else if (this.currentRoom === 8) {
      // Preceding Act 3 Boss: Belial
      createGateWithLabel(5400, 'gate_boss', 'anim-gate-boss', 'boss', '⚔ ACT 3 BOSS: ARCH-SERAPH BELIAL', '#c084fc');
    } else if (this.currentRoom === 9) {
      // After beating Belial: Royal Sanctuary
      createGateWithLabel(1200, 'gate_gold', 'anim-gate-gold', 'gold', '❖ ROYAL SANCTUARY BAZAAR', '#fde047');
    } else if (this.currentRoom === 10) {
      // Exit from Royal Sanctuary
      createGateWithLabel(1180, 'gate_relic', 'anim-gate-relic', 'relic', '◆ THRONE ANTECHAMBER (CHAMBER 11)', '#e879f9');
    } else if (this.currentRoom === 11) {
      // Preceding Final Boss
      createGateWithLabel(5400, 'gate_boss', 'anim-gate-boss', 'boss', '👑 FINAL CLIMAX: THE CURSED KING ALDOUS', '#ef4444');
    } else if (this.currentRoom === 12) {
      // After beating Final Boss: True Victory!
      createGateWithLabel(1200, 'gate_gold', 'anim-gate-gold', 'victory', '👑 ETERNAL ASCENSION (TRUE VICTORY)', '#34d399');
    } else if (this.currentRoom % 2 === 1) {
      createGateWithLabel(5340, 'gate_gold', 'anim-gate-gold', 'gold', '❖ GOLD VAULT', '#fde047');
      createGateWithLabel(5480, 'gate_relic', 'anim-gate-relic', 'relic', '◆ RELIC ALTAR', '#e879f9');
    } else {
      createGateWithLabel(5340, 'gate_relic', 'anim-gate-relic', 'relic', '◆ RELIC ALTAR', '#e879f9');
      createGateWithLabel(5480, 'gate_beast', 'anim-gate-beast', 'altar', '☠ BEAST ALTAR', '#34d399');
    }
  }

  interactWithGate(gate) {
    if (!this.roomCleared || this.isTransitioning) return;
    this.gatePrompt.setVisible(false);

    if (gate.gateType === 'gold') {
      this.isTransitioning = true;
      this.gold += 150;
      this.player.heal(50);
      EventBus.emit('gold:changed', this.gold);
      SoundSynth.playBloodOrb();
      this.juice.emitSparks(gate.x, gate.y, 25);
      this.juice.popDamageNumber(this.player.x, this.player.y - 20, '❖ GOLD VAULT: +150 GOLD & HEAL', 'crit');
      this.proceedToNextRoom();
    } else if (gate.gateType === 'relic') {
      SoundSynth.playSlash(3);
      this.juice.emitVoidEmbers(gate.x, gate.y, 25);
      const choices = this.relicSystem.getThreeRandomChoices();
      EventBus.emit('relic:choose_options', choices);
    } else if (gate.gateType === 'altar') {
      this.isTransitioning = true;
      this.player.addCorruption(60);
      this.player.heal(60);

      // Grant Primal Beast Blessing buff from Beast Altar!
      this.relicSystem.addRelic({
        id: 'beast_blessing_room_' + this.currentRoom,
        name: 'Primal Beast Fury',
        description: '+20% Damage & +25% Corruption Gain.',
        inscriptions: ['Blood Frenzy', 'Abyssal Void'],
        stats: { damageMult: 1.20, corruptionGainMult: 1.25 }
      });

      SoundSynth.playRoar();
      this.juice.emitBlood(gate.x, gate.y, 25);
      this.juice.popDamageNumber(this.player.x, this.player.y - 20, '☠ BUFF: PRIMAL FURY (+20% DMG, +60% CORRUPT)', 'crit');
      this.proceedToNextRoom();
    } else if (gate.gateType === 'boss') {
      this.isTransitioning = true;
      SoundSynth.playRoar();
      this.juice.addTrauma(0.7);
      this.proceedToNextRoom();
    } else if (gate.gateType === 'victory') {
      this.isTransitioning = true;
      const meta = MetaProgression.getInstance();
      meta.addBloodQuartz(100);
      meta.recordRunEnd({ chamber: 10, bossKilled: true });
      SoundSynth.playRoar();
      this.juice.addTrauma(1.0);
      this.cameras.main.flash(600, 255, 255, 255);
      EventBus.emit('notification:show', {
        text: '👑 EXPEDITION CONQUERED! +100 BONUS BLOOD QUARTZ 👑',
        color: '#facc15'
      });
      this.time.delayedCall(2500, () => {
        this.scene.stop('hud');
        this.scene.start('sanctuary');
      });
    }
  }

  proceedToNextRoom() {
    this.isTransitioning = true;

    // Persist corruption, relics, and gold across rooms and page reloads
    try {
      localStorage.setItem('cursed_crusader_corruption', this.player.corruption.toString());
      localStorage.setItem('cursed_crusader_gold', this.gold.toString());
      localStorage.setItem('cursed_crusader_relics', JSON.stringify(this.relicSystem.equippedRelics.map(r => r.id)));
    } catch (e) {}

    // Smooth camera fade out
    this.cameras.main.fadeOut(300, 10, 12, 16);

    this.time.delayedCall(320, () => {
      this.scene.restart({
        room: this.currentRoom + 1,
        gold: this.gold,
        hp: this.player.hp,
        corruption: this.player.corruption,
        relics: this.relicSystem.equippedRelics,
        potions: this.player ? this.player.potions : undefined
      });
    });
  }
}

export default DungeonScene;
