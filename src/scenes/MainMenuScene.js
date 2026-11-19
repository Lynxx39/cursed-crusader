// MainMenuScene.js - Skul: The Hero Slayer-inspired Gothic Title & Expedition Menu
import Phaser from 'phaser';
import { SoundSynth } from '../core/SoundSynth.js';
import { RELIC_DATABASE } from '../systems/RelicSystem.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('main-menu');
  }

  create() {
    const { width, height } = this.scale;

    // 1. Background Visuals & Parallax Ruins
    this.add.rectangle(0, 0, width, height, 0x05070a).setOrigin(0, 0);

    if (this.textures.exists('bg-gothic')) {
      const bg = this.add.image(width / 2, height / 2, 'bg-gothic')
        .setDisplaySize(width, height)
        .setAlpha(0.35);
    }

    if (this.textures.exists('bg-columns')) {
      const columns = this.add.image(width / 2, height / 2 + 40, 'bg-columns')
        .setDisplaySize(width, height)
        .setAlpha(0.45);
    }

    // Atmospheric Stone Pedestal
    if (this.textures.exists('tile_floor')) {
      for (let x = 200; x < width - 200; x += 32) {
        this.add.image(x + 16, 440, 'tile_floor').setAlpha(0.7);
      }
    }

    // 2. Animated Crusader Knight Silhouette on Pedestal
    if (this.anims.exists('player-idle')) {
      const knight = this.add.sprite(width / 2 - 200, 394, 'player');
      knight.setScale(1.4);
      knight.anims.play('player-idle');
      knight.setTint(0xcfd8dc);

      this.tweens.add({
        targets: knight,
        y: 391,
        duration: 1800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // 3. Floating Atmospheric Embers & Dust Motes
    this.createFloatingEmbers(width, height);

    // 4. Game Title & Subtitle (Cinzel Dark Fantasy Typography)
    const title = this.add.text(width / 2 + 100, 110, 'CURSED CRUSADER', {
      fontFamily: 'Cinzel, MedievalSharp, serif',
      fontSize: '44px',
      fontStyle: 'bold',
      color: '#fbbf24',
      stroke: '#05070a',
      strokeThickness: 8,
      letterSpacing: 2
    }).setOrigin(0.5);

    // Sinister Blood-Red Underglow
    this.tweens.add({
      targets: title,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.add.text(width / 2 + 100, 155, '❖ A SKUL-INSPIRED GOTHICVANIA ROGUE-LITE ❖', {
      fontFamily: 'monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#f87171',
      stroke: '#000000',
      strokeThickness: 4,
      letterSpacing: 1
    }).setOrigin(0.5);

    // 5. Interactive Skul-Style Menu Options
    const startY = 225;
    const menuItems = [
      {
        text: '▶ START EXPEDITION',
        color: '#fde047',
        action: () => this.startExpedition()
      },
      {
        text: '⚔ CONTROLS & COMBAT GUIDE',
        color: '#e2e8f0',
        action: () => this.showControlsModal()
      },
      {
        text: '❖ RELIC COMPENDIUM',
        color: '#c084fc',
        action: () => this.showRelicsModal()
      }
    ];

    menuItems.forEach((item, index) => {
      this.createMenuButton(width / 2 + 100, startY + index * 52, item.text, item.color, item.action);
    });

    // Support keyboard shortcuts (SPACE / ENTER) to quickly launch expedition
    this.input.keyboard.on('keydown-SPACE', () => this.startExpedition());
    this.input.keyboard.on('keydown-ENTER', () => this.startExpedition());

    // 6. Footer & Controls Briefing
    this.add.text(width / 2, height - 25, '[CLICK TO SELECT]  •  [W / SPACE]: JUMP  •  [SHIFT]: DASH  •  [RMB]: PARRY  •  [LMB]: ATTACK', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#64748b',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    // 7. Ambient BGM (Ockaie Temple)
    try {
      if (this.cache.audio.exists('bgm-temple') && (!this.sound.get('bgm-temple') || !this.sound.get('bgm-temple').isPlaying)) {
        this.sound.play('bgm-temple', { loop: true, volume: 0.35 });
      }
    } catch (e) {}

    // Modals Container
    this.modalContainer = this.add.container(0, 0).setVisible(false).setDepth(100);
  }

  createMenuButton(x, y, label, textColor, onClick) {
    const btnBg = this.add.rectangle(x, y, 320, 38, 0x0f172a, 0.85)
      .setStrokeStyle(1.5, 0x334155)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add.text(x, y, label, {
      fontFamily: 'monospace',
      fontSize: '14px',
      fontStyle: 'bold',
      color: textColor,
      stroke: '#05070a',
      strokeThickness: 3
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const onHover = () => {
      btnBg.setFillStyle(0x1e293b, 0.95);
      btnBg.setStrokeStyle(2, 0xf59e0b);
      btnText.setColor('#ffffff');
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 1.05, scaleY: 1.05, duration: 120 });
      try { SoundSynth.playHit(); } catch (e) {}
    };

    const onOut = () => {
      btnBg.setFillStyle(0x0f172a, 0.85);
      btnBg.setStrokeStyle(1.5, 0x334155);
      btnText.setColor(textColor);
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 1.0, scaleY: 1.0, duration: 120 });
    };

    btnBg.on('pointerover', onHover);
    btnText.on('pointerover', onHover);
    btnBg.on('pointerout', onOut);
    btnText.on('pointerout', onOut);

    btnBg.on('pointerdown', () => {
      try { SoundSynth.playSlash(3); } catch (e) {}
      onClick();
    });
    btnText.on('pointerdown', () => {
      try { SoundSynth.playSlash(3); } catch (e) {}
      onClick();
    });
  }

  startExpedition() {
    this.cameras.main.fade(450, 5, 7, 10);
    this.time.delayedCall(450, () => {
      try {
        localStorage.setItem('cursed_crusader_corruption', '0');
        localStorage.setItem('cursed_crusader_gold', '0');
        localStorage.setItem('cursed_crusader_relics', '[]');
      } catch (e) {}
      this.scene.start('dungeon', { room: 1, gold: 0, relics: [], hp: 150, corruption: 0 });
      this.scene.launch('hud');
    });
  }

  showControlsModal() {
    this.modalContainer.removeAll(true);
    this.modalContainer.setVisible(true);

    const { width, height } = this.scale;
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0, 0).setInteractive();
    const box = this.add.rectangle(width / 2, height / 2, 600, 400, 0x090d16)
      .setStrokeStyle(2, 0xd97706);

    const title = this.add.text(width / 2, height / 2 - 160, '⚔ COMBAT CONTROLS & ROGUELITE GUIDE ⚔', {
      fontFamily: 'Cinzel, monospace', fontSize: '18px', fontStyle: 'bold', color: '#fbbf24',
      stroke: '#05070a', strokeThickness: 4
    }).setOrigin(0.5);

    const guideContent = [
      '• MOVEMENT: [A / D] or [ARROW KEYS]',
      '• JUMP / DOUBLE JUMP: [W] or [SPACEBAR] (Air jump restores on ground)',
      '• DASH (I-FRAMES): [LEFT SHIFT] or [L] or [C] (Invulnerable through attacks)',
      '• SWORD CLEAVE: [LEFT MOUSE BUTTON] or [J] (3-hit combo sequence)',
      '• PARRY (COUNTER-STRIKE): [RIGHT MOUSE BUTTON] or [K]',
      '  -> Parrying melee or projectiles freezes enemies & grants +25 Corruption!',
      '• BEAST AWAKENING: [U] (When Corruption meter reaches 100%)',
      '  -> Grants +60% movement speed, ferocious claws, & screen-clearing finisher [I]',
      '• GATES OF DESTINY: [W] or [E] or [CLICK] on Gates when chamber is purified'
    ].join('\n\n');

    const bodyText = this.add.text(width / 2, height / 2 + 5, guideContent, {
      fontFamily: 'monospace', fontSize: '12px', color: '#cbd5e1', lineHeight: 20
    }).setOrigin(0.5);

    const closeBtn = this.add.text(width / 2, height / 2 + 160, '[CLOSE GUIDE]', {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#ef4444'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this.modalContainer.setVisible(false));
    this.modalContainer.add([overlay, box, title, bodyText, closeBtn]);
  }

  showRelicsModal() {
    this.modalContainer.removeAll(true);
    this.modalContainer.setVisible(true);

    const { width, height } = this.scale;
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0, 0).setInteractive();
    const box = this.add.rectangle(width / 2, height / 2, 700, 440, 0x090d16)
      .setStrokeStyle(2, 0x9333ea);

    const title = this.add.text(width / 2, height / 2 - 180, '❖ RELIC COMPENDIUM & INSCRIPTION SYNERGIES ❖', {
      fontFamily: 'Cinzel, monospace', fontSize: '18px', fontStyle: 'bold', color: '#e879f9',
      stroke: '#05070a', strokeThickness: 4
    }).setOrigin(0.5);

    const relicLines = RELIC_DATABASE.map(r => {
      const ins = r.inscriptions.map(i => `[${i}]`).join(' ');
      return `• ${r.name.toUpperCase()} ${ins}\n   ${r.description}`;
    }).slice(0, 6).join('\n\n');

    const bodyText = this.add.text(width / 2, height / 2 + 5, relicLines, {
      fontFamily: 'monospace', fontSize: '11px', color: '#e2e8f0', lineHeight: 18
    }).setOrigin(0.5);

    const closeBtn = this.add.text(width / 2, height / 2 + 185, '[RETURN TO MENU]', {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#f87171'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this.modalContainer.setVisible(false));
    this.modalContainer.add([overlay, box, title, bodyText, closeBtn]);
  }

  createFloatingEmbers(width, height) {
    for (let i = 0; i < 28; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const ember = this.add.rectangle(x, y, 2.5, 2.5, Math.random() > 0.4 ? 0xf59e0b : 0xef4444, 0.6)
        .setDepth(5);

      this.tweens.add({
        targets: ember,
        y: y - (60 + Math.random() * 90),
        x: x + (Math.random() * 40 - 20),
        alpha: { from: 0.6, to: 0 },
        duration: 2200 + Math.random() * 2000,
        repeat: -1,
        delay: Math.random() * 2000,
        ease: 'Quad.easeOut'
      });
    }
  }
}

export default MainMenuScene;
