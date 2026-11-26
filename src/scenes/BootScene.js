// BootScene.js - Asset Preloading, Gothicvania SpriteSheets, and Animation Generation
import Phaser from 'phaser';
import { SpriteFactory } from '../core/SpriteFactory.js';
import { SoundSynth } from '../core/SoundSynth.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    const { width, height } = this.scale;

    // 1. Loading Text & Progress Bar
    const loadingText = this.add.text(width / 2, height / 2 - 12, 'SUMMONING GOTHIC FORCES... 0%', {
      fontFamily: 'Cinzel, monospace', fontSize: '15px', fontStyle: 'bold', color: '#f87171'
    }).setOrigin(0.5);

    const progressBox = this.add.graphics();
    const progressBar = this.add.graphics();
    progressBox.fillStyle(0x0f172a, 0.85);
    progressBox.fillRect(width / 2 - 160, height / 2 + 16, 320, 14);
    progressBox.lineStyle(1, 0x7c3aed, 1);
    progressBox.strokeRect(width / 2 - 160, height / 2 + 16, 320, 14);

    this.load.on('progress', (val) => {
      progressBar.clear();
      progressBar.fillStyle(0xdc2626, 1);
      progressBar.fillRect(width / 2 - 158, height / 2 + 18, 316 * val, 10);
      loadingText.setText(`SUMMONING GOTHIC FORCES... ${Math.round(val * 100)}%`);
      scheduleFallback();
    });

    this.bootCompleted = false;
    this.load.on('complete', () => {
      if (this.bootTimeout) {
        clearTimeout(this.bootTimeout);
        this.bootTimeout = null;
      }
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Inactivity safety fallback: only fires if loading genuinely stalls for 18s without progress
    const scheduleFallback = () => {
      if (this.bootTimeout) clearTimeout(this.bootTimeout);
      this.bootTimeout = setTimeout(() => {
        if (this.bootCompleted) return;
        console.warn('BootScene stall timeout reached, forcing transition to main menu');
        try {
          const initialLoading = document.getElementById('initial-loading');
          if (initialLoading) initialLoading.remove();
        } catch (e) {}
        if (this.scene) {
          try {
            SpriteFactory.generateAll(this);
            SoundSynth.init();
            this.buildGothicvaniaAnimations();
          } catch (e) {}
          this.scene.start('main-menu');
        }
      }, 18000);
    };
    scheduleFallback();

    // 2. Preload Gothicvania Spritesheets (Ansimuz itch.io collection)
    this.load.spritesheet('player', 'assets/spritesheets/player.png', {
      frameWidth: 82, frameHeight: 60
    });
    this.load.spritesheet('player-awakened', 'assets/spritesheets/player-awakened.png', {
      frameWidth: 82, frameHeight: 60
    });
    this.load.spritesheet('wizard', 'assets/spritesheets/wizard.png', {
      frameWidth: 81, frameHeight: 66
    });
    this.load.spritesheet('burning-ghoul', 'assets/spritesheets/burning-ghoul.png', {
      frameWidth: 57, frameHeight: 60
    });
    this.load.spritesheet('fireball', 'assets/spritesheets/fireball.png', {
      frameWidth: 26, frameHeight: 26
    });
    this.load.spritesheet('void_crescent', 'assets/spritesheets/void_crescent.png', {
      frameWidth: 48, frameHeight: 72
    });
    this.load.spritesheet('holy_arc', 'assets/spritesheets/holy_arc.png', {
      frameWidth: 48, frameHeight: 72
    });
    this.load.spritesheet('enemy-death', 'assets/spritesheets/enemy-death.png', {
      frameWidth: 81, frameHeight: 66
    });

    // 2b. Additional Gothicvania Enemies, Bosses & Consumables
    this.load.spritesheet('bat-fly', 'assets/spritesheets/bat-fly.png', {
      frameWidth: 32, frameHeight: 51
    });
    this.load.spritesheet('skeleton', 'assets/spritesheets/skeleton.png', {
      frameWidth: 48, frameHeight: 64
    });
    this.load.spritesheet('sorcerer', 'assets/spritesheets/sorcerer.png', {
      frameWidth: 40, frameHeight: 48
    });
    this.load.spritesheet('potion-red', 'assets/spritesheets/potion-red.png', {
      frameWidth: 16, frameHeight: 16
    });
    this.load.spritesheet('potion-purple', 'assets/spritesheets/potion-purple.png', {
      frameWidth: 16, frameHeight: 16
    });
    this.load.spritesheet('potion-green', 'assets/spritesheets/potion-green.png', {
      frameWidth: 16, frameHeight: 16
    });
    this.load.spritesheet('icons_16x16', 'assets/spritesheets/icons_16x16.png', {
      frameWidth: 16, frameHeight: 16
    });
    this.load.spritesheet('blood_quartz', 'assets/spritesheets/blood_quartz.png', {
      frameWidth: 16, frameHeight: 20
    });
    this.load.spritesheet('plague_hound', 'assets/spritesheets/plague_hound.png', {
      frameWidth: 64, frameHeight: 48
    });
    this.load.spritesheet('void_seraph', 'assets/spritesheets/void_seraph.png', {
      frameWidth: 96, frameHeight: 96
    });
    this.load.spritesheet('cursed_king', 'assets/spritesheets/cursed_king.png', {
      frameWidth: 96, frameHeight: 96
    });
    this.load.spritesheet('collector_npc', 'assets/spritesheets/collector_npc.png', {
      frameWidth: 64, frameHeight: 64
    });

    // 2c. Props & Environment Assets
    this.load.image('prop_chest', 'assets/props/chest.png');
    this.load.image('prop_market_stall', 'assets/props/market_stall.png');
    this.load.image('prop_coffin', 'assets/props/coffin.png');
    this.load.image('prop_soul_lantern', 'assets/props/soul_lantern.png');
    this.load.image('dragon_bones_head', 'assets/props/dragon-bones-head.png');
    this.load.image('dragon_bones_ribs', 'assets/props/dragon-bones-ribs.png');
    this.load.image('prop_gothic_banner', 'assets/props/gothic_banner.png');
    this.load.image('prop_hanging_cage', 'assets/props/hanging_cage.png');
    this.load.image('prop_candelabra', 'assets/props/iron_candelabra.png');

    // 3. Frame JSON Maps
    this.load.json('player-frames', 'assets/spritesheets/player.json');
    this.load.json('wizard-frames', 'assets/spritesheets/wizard.json');
    this.load.json('burning-ghoul-frames', 'assets/spritesheets/burning-ghoul.json');
    this.load.json('fireball-frames', 'assets/spritesheets/fireball.json');
    this.load.json('enemy-death-frames', 'assets/spritesheets/enemy-death.json');

    // 4. Backgrounds & Authentic Pixel Art Tiles
    this.load.image('bg-gothic', 'assets/backgrounds/background.png');
    this.load.image('bg-columns', 'assets/backgrounds/columns.png');
    this.load.image('bg-graveyard', 'assets/graveyard.png');
    this.load.image('bg-throne', 'assets/backgrounds/bg_throne.png');
    this.load.image('bg-forest', 'assets/backgrounds/bg_forest.png');
    this.load.image('bg-black-lab', 'assets/backgrounds/bg_black_lab.png');
    this.load.image('bg-fortress', 'assets/backgrounds/bg_fortress.png');
    this.load.image('bg-sacred-grounds', 'assets/backgrounds/bg_sacred_grounds.png');
    this.load.image('tile_floor', 'assets/tile_floor.png');
    this.load.image('tile_platform', 'assets/tile_platform.png');

    // 5. Authentic Animated Pixel Art Gates (Skul: The Hero Slayer grade)
    this.load.spritesheet('gate_beast', 'assets/spritesheets/gate_beast.png', {
      frameWidth: 64, frameHeight: 96
    });
    this.load.spritesheet('gate_relic', 'assets/spritesheets/gate_relic.png', {
      frameWidth: 64, frameHeight: 96
    });
    this.load.spritesheet('gate_gold', 'assets/spritesheets/gate_gold.png', {
      frameWidth: 64, frameHeight: 96
    });
    this.load.spritesheet('gate_boss', 'assets/spritesheets/gate_boss.png', {
      frameWidth: 64, frameHeight: 96
    });

    // 6. Sound Effects (Lightweight 6KB micro-files, non-blocking)
    this.load.audio('sfx-jump', 'assets/audio/sfx/jump.ogg');
    this.load.audio('sfx-attack', 'assets/audio/sfx/attack.ogg');
    this.load.audio('sfx-hurt', 'assets/audio/sfx/hurt.ogg');
    this.load.audio('sfx-kill', 'assets/audio/sfx/kill.ogg');
  }

  create() {
    this.bootCompleted = true;
    if (this.bootTimeout) {
      clearTimeout(this.bootTimeout);
      this.bootTimeout = null;
    }

    // Smoothly fade out HTML initial loading screen now that canvas textures are ready
    try {
      const initialLoading = document.getElementById('initial-loading');
      if (initialLoading) {
        initialLoading.style.opacity = '0';
        initialLoading.style.transition = 'opacity 0.25s ease';
        setTimeout(() => initialLoading.remove(), 250);
      }
    } catch (e) {}

    // 1. Generate complementary procedural canvas textures (gates, relics, pickups, slashes)
    SpriteFactory.generateAll(this);

    // 2. Initialize WebAudio procedural SoundSynth
    SoundSynth.init();

    // 3. Build Phaser Animations from Gothicvania frame mappings
    this.buildGothicvaniaAnimations();

    // 4. Launch Skul-Inspired Main Menu
    this.scene.start('main-menu');
  }

  buildGothicvaniaAnimations() {
    const parseFrameIndexMap = (frameConfig, frameWidth, frameHeight, columns) => {
      const mapping = {};
      if (!frameConfig) return mapping;
      Object.entries(frameConfig).forEach(([name, frame]) => {
        const frameX = Math.floor(frame.x / frameWidth);
        const frameY = Math.floor(frame.y / frameHeight);
        mapping[name] = frameY * columns + frameX;
      });
      return mapping;
    };

    const getFrames = (frameIndexMap, prefix, textureKey) => {
      return Object.keys(frameIndexMap)
        .filter(name => name.startsWith(prefix))
        .sort((a, b) => {
          const numA = Number(a.split('-').pop()) || 0;
          const numB = Number(b.split('-').pop()) || 0;
          return numA - numB;
        })
        .map(name => ({ key: textureKey, frame: frameIndexMap[name] }));
    };

    // Frame Maps
    const playerMap = parseFrameIndexMap(this.cache.json.get('player-frames'), 82, 60, 13);
    const wizardMap = parseFrameIndexMap(this.cache.json.get('wizard-frames'), 81, 66, 15);
    const ghoulMap = parseFrameIndexMap(this.cache.json.get('burning-ghoul-frames'), 57, 60, 16);
    const fireballMap = parseFrameIndexMap(this.cache.json.get('fireball-frames'), 26, 26, 3);
    const deathMap = parseFrameIndexMap(this.cache.json.get('enemy-death-frames'), 81, 66, 9);

    // Player Animations
    const animDefs = [
      { key: 'player-idle', frames: getFrames(playerMap, 'player-idle-', 'player'), frameRate: 8, repeat: -1 },
      { key: 'player-walk', frames: getFrames(playerMap, 'player-walk-', 'player'), frameRate: 12, repeat: -1 },
      { key: 'player-jump', frames: getFrames(playerMap, 'player-jump-', 'player'), frameRate: 8, repeat: 0 },
      { key: 'player-fall', frames: getFrames(playerMap, 'player-fall-', 'player'), frameRate: 8, repeat: 0 },
      { key: 'player-punch', frames: getFrames(playerMap, 'player-punch-', 'player'), frameRate: 16, repeat: 0 },
      { key: 'player-kick', frames: getFrames(playerMap, 'player-kick-', 'player'), frameRate: 14, repeat: 0 },
      { key: 'player-flying-kick', frames: getFrames(playerMap, 'player-flying-kick-', 'player'), frameRate: 10, repeat: 0 },
      { key: 'player-hurt', frames: getFrames(playerMap, 'player-hurt-', 'player'), frameRate: 10, repeat: 0 },

      // Awakened Dread Berserker Animations (Authentic 16-Bit Pixel Art Skul Transformation)
      { key: 'awakened-idle', frames: getFrames(playerMap, 'player-idle-', 'player-awakened'), frameRate: 8, repeat: -1 },
      { key: 'awakened-walk', frames: getFrames(playerMap, 'player-walk-', 'player-awakened'), frameRate: 14, repeat: -1 },
      { key: 'awakened-jump', frames: getFrames(playerMap, 'player-jump-', 'player-awakened'), frameRate: 8, repeat: 0 },
      { key: 'awakened-fall', frames: getFrames(playerMap, 'player-fall-', 'player-awakened'), frameRate: 8, repeat: 0 },
      { key: 'awakened-punch', frames: getFrames(playerMap, 'player-punch-', 'player-awakened'), frameRate: 18, repeat: 0 },
      { key: 'awakened-kick', frames: getFrames(playerMap, 'player-kick-', 'player-awakened'), frameRate: 16, repeat: 0 },
      { key: 'awakened-flying-kick', frames: getFrames(playerMap, 'player-flying-kick-', 'player-awakened'), frameRate: 12, repeat: 0 },
      { key: 'awakened-hurt', frames: getFrames(playerMap, 'player-hurt-', 'player-awakened'), frameRate: 10, repeat: 0 },

      // Monster Animations
      { key: 'ghoul-run', frames: getFrames(ghoulMap, 'burning-ghoul-run1-', 'burning-ghoul'), frameRate: 12, repeat: -1 },
      { key: 'wizard-idle', frames: getFrames(wizardMap, 'wizard-idle-', 'wizard'), frameRate: 6, repeat: -1 },
      { key: 'wizard-fire', frames: getFrames(wizardMap, 'wizard-fire-', 'wizard'), frameRate: 10, repeat: 0 },
      { key: 'fireball-fly', frames: getFrames(fireballMap, 'fireball-', 'fireball'), frameRate: 12, repeat: -1 },
      { key: 'void-crescent-fly', frames: this.anims.generateFrameNumbers('void_crescent', { start: 0, end: 3 }), frameRate: 14, repeat: -1 },
      { key: 'holy-arc-fly', frames: this.anims.generateFrameNumbers('holy_arc', { start: 0, end: 4 }), frameRate: 14, repeat: -1 },
      { key: 'enemy-death-fx', frames: getFrames(deathMap, 'enemy-death-', 'enemy-death'), frameRate: 14, repeat: 0 },

      // Animated Living Archway Gates (Swirling Ethereal Void Energy)
      { key: 'anim-gate-beast', frames: this.anims.generateFrameNumbers('gate_beast', { start: 0, end: 3 }), frameRate: 6, repeat: -1 },
      { key: 'anim-gate-relic', frames: this.anims.generateFrameNumbers('gate_relic', { start: 0, end: 3 }), frameRate: 6, repeat: -1 },
      { key: 'anim-gate-gold', frames: this.anims.generateFrameNumbers('gate_gold', { start: 0, end: 3 }), frameRate: 6, repeat: -1 },
      { key: 'anim-gate-boss', frames: this.anims.generateFrameNumbers('gate_boss', { start: 0, end: 3 }), frameRate: 6, repeat: -1 },

      // Additional Gothic Monsters & Consumables
      { key: 'bat-fly-anim', frames: this.anims.generateFrameNumbers('bat-fly', { start: 0, end: 3 }), frameRate: 10, repeat: -1 },
      { key: 'skeleton-walk', frames: this.anims.generateFrameNumbers('skeleton', { start: 0, end: 5 }), frameRate: 8, repeat: -1 },
      { key: 'skeleton-attack', frames: this.anims.generateFrameNumbers('skeleton', { start: 2, end: 5 }), frameRate: 12, repeat: 0 },
      { key: 'sorcerer-idle', frames: this.anims.generateFrameNumbers('sorcerer', { start: 0, end: 3 }), frameRate: 6, repeat: -1 },
      { key: 'sorcerer-cast', frames: this.anims.generateFrameNumbers('sorcerer', { start: 0, end: 3 }), frameRate: 10, repeat: 0 },
      { key: 'potion-red-glow', frames: this.anims.generateFrameNumbers('potion-red', { start: 0, end: 3 }), frameRate: 8, repeat: -1 },
      { key: 'potion-purple-glow', frames: this.anims.generateFrameNumbers('potion-purple', { start: 0, end: 3 }), frameRate: 8, repeat: -1 },
      { key: 'potion-green-glow', frames: this.anims.generateFrameNumbers('potion-green', { start: 0, end: 3 }), frameRate: 8, repeat: -1 },
      { key: 'blood-quartz-spin', frames: this.anims.generateFrameNumbers('blood_quartz', { start: 0, end: 3 }), frameRate: 7, repeat: -1 },
      { key: 'plague-hound-run', frames: this.anims.generateFrameNumbers('plague_hound', { start: 0, end: 3 }), frameRate: 10, repeat: -1 },
      { key: 'void-seraph-hover', frames: this.anims.generateFrameNumbers('void_seraph', { start: 0, end: 3 }), frameRate: 6, repeat: -1 },
      { key: 'cursed-king-idle', frames: this.anims.generateFrameNumbers('cursed_king', { start: 0, end: 3 }), frameRate: 6, repeat: -1 },
      { key: 'collector-idle', frames: this.anims.generateFrameNumbers('collector_npc', { start: 0, end: 3 }), frameRate: 4, repeat: -1 }
    ];

    animDefs.forEach(def => {
      if (def.frames && def.frames.length > 0) {
        this.anims.create(def);
      }
    });
  }
}

export default BootScene;
