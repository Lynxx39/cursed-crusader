// MainMenuScene.js - Skul: The Hero Slayer-inspired Gothic Title & Expedition Menu
import Phaser from 'phaser';
import { SoundSynth } from '../core/SoundSynth.js';
import { RELIC_DATABASE } from '../systems/RelicSystem.js';
import { metaProgression, DIFFICULTY_MODES } from '../systems/MetaProgression.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('main-menu');
  }

  create() {
    const { width, height } = this.scale;

    // 1. Atmospheric Layered Cathedral Backdrop (Full-bleed art, zero cutoff seams)
    this.add.rectangle(0, 0, width, height, 0x05070c).setOrigin(0, 0);

    if (this.textures.exists('bg-throne')) {
      this.add.image(width / 2, height / 2, 'bg-throne')
        .setDisplaySize(width, height)
        .setTint(0xc4b5fd)
        .setAlpha(0.68);
    } else if (this.textures.exists('bg-gothic')) {
      this.add.tileSprite(0, 0, 400, 224, 'bg-gothic')
        .setOrigin(0, 0)
        .setScale(2.42)
        .setAlpha(0.55);
    }

    if (this.textures.exists('bg-columns')) {
      this.add.tileSprite(0, 0, 400, 224, 'bg-columns')
        .setOrigin(0, 0)
        .setScale(2.42)
        .setTint(0x94a3b8)
        .setAlpha(0.55);
    }

    // Subtle dark gradient scrim over the right menu column for high legibility
    const rightScrim = this.add.rectangle(625, height / 2, 470, height, 0x04060b, 0.58);
    rightScrim.setDepth(1);

    // 2. Full-Width Grounded Gothic Stone Terrace & Diorama Stage (y = 438..540)
    if (this.textures.exists('tile_floor')) {
      this.add.tileSprite(width / 2, 446, width, 32, 'tile_floor').setDepth(4);
    }
    if (this.textures.exists('tile_foundation')) {
      this.add.tileSprite(width / 2, 478, width, 32, 'tile_foundation').setDepth(4);
      this.add.tileSprite(width / 2, 510, width, 32, 'tile_foundation').setDepth(4);
      this.add.tileSprite(width / 2, 542, width, 32, 'tile_foundation').setDepth(4);
    }

    // Diorama Props on Left Stage (x = 40..360)
    if (this.textures.exists('prop_gothic_banner')) {
      this.add.image(76, 376, 'prop_gothic_banner').setDepth(3).setAlpha(0.92);
      this.add.image(330, 376, 'prop_gothic_banner').setDepth(3).setAlpha(0.92);
    }
    if (this.textures.exists('shrine_glow')) {
      const shrineAura = this.add.image(132, 392, 'shrine_glow')
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(3).setScale(1.3).setAlpha(0.65);
      this.tweens.add({
        targets: shrineAura, alpha: { from: 0.4, to: 0.78 }, scale: { from: 1.2, to: 1.38 },
        duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }
    if (this.textures.exists('gate_boss')) {
      const portal = this.add.sprite(132, 384, 'gate_boss').setDepth(4).setScale(1.0);
      if (this.anims.exists('anim-gate-boss')) portal.anims.play('anim-gate-boss');
    } else if (this.textures.exists('shrine_blood')) {
      this.add.image(132, 404, 'shrine_blood').setDepth(4);
    }
    if (this.textures.exists('prop_candelabra')) {
      this.add.image(298, 412, 'prop_candelabra').setDepth(5);
    }
    if (this.textures.exists('prop_soul_lantern')) {
      this.add.image(52, 402, 'prop_soul_lantern').setDepth(5);
    }
    if (this.textures.exists('torch_sconce')) {
      [76, 330].forEach((tx) => {
        if (this.textures.exists('torch_glow')) {
          const g = this.add.image(tx, 314, 'torch_glow')
            .setBlendMode(Phaser.BlendModes.ADD).setDepth(3).setAlpha(0.55);
          this.tweens.add({
            targets: g, alpha: { from: 0.38, to: 0.68 }, duration: 400 + Math.random() * 200,
            yoyo: true, repeat: -1
          });
        }
        this.add.sprite(tx, 320, 'torch_sconce').setDepth(4);
      });
    }

    // Hero Crusader Standing on Terrace Diorama (grounded cleanly on tile_floor y=430)
    if (this.textures.exists('shadow_ellipse')) {
      this.add.image(222, 431, 'shadow_ellipse').setScale(1.6, 1.05).setDepth(5).setAlpha(0.7);
    }
    if (this.anims.exists('player-idle')) {
      const knight = this.add.sprite(222, 395, 'player').setDepth(6);
      knight.setScale(1.65);
      knight.anims.play('player-idle');
      knight.setTint(0xe2e8f0);
    }

    // Blood Quartz & Crusade Summary Badge (Top Right)
    const quartzVal = metaProgression.getBloodQuartz();
    const bestChamber = metaProgression.data.highestChamber || 1;
    const badgeW = 198;
    const badgeX = width - 16 - badgeW / 2;
    this.add.rectangle(badgeX, 30, badgeW, 34, 0x090d16, 0.92)
      .setStrokeStyle(1.5, 0x7c3aed).setDepth(15);
    if (this.textures.exists('blood_quartz')) {
      const qIcon = this.add.sprite(badgeX - 74, 30, 'blood_quartz').setDepth(16).setScale(1.1);
      if (this.anims.exists('blood-quartz-spin')) qIcon.anims.play('blood-quartz-spin');
    }
    this.add.text(badgeX - 56, 23, `QUARTZ: ${quartzVal}`, {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#f43f5e',
      stroke: '#05070a', strokeThickness: 3
    }).setOrigin(0, 0.5).setDepth(16);
    this.add.text(badgeX - 56, 38, `BEST: CH ${bestChamber}/12`, {
      fontFamily: 'monospace', fontSize: '9px', fontStyle: 'bold', color: '#94a3b8'
    }).setOrigin(0, 0.5).setDepth(16);

    // 3. Floating Atmospheric Embers
    this.createFloatingEmbers(width, height);

    // 4. Right-Side Title Header + Ornate Gothic Crest & Divider
    const menuX = 625;
    if (this.textures.exists('hud_skull_crest')) {
      this.add.image(menuX, 46, 'hud_skull_crest').setScale(1.1).setDepth(10);
    }

    const title = this.add.text(menuX, 86, 'CURSED CRUSADER', {
      fontFamily: 'Cinzel, MedievalSharp, serif',
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#fbbf24',
      stroke: '#05070a',
      strokeThickness: 8,
      letterSpacing: 3
    }).setOrigin(0.5).setDepth(10);

    this.tweens.add({
      targets: title,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Decorative gold divider under title
    this.add.rectangle(menuX, 116, 340, 1.5, 0xb45309, 0.85).setDepth(10);
    this.add.rectangle(menuX, 116, 8, 8, 0xfbbf24).setRotation(Math.PI / 4).setDepth(11);

    this.add.text(menuX, 134, 'A SKUL-INSPIRED GOTHICVANIA ROGUELITE', {
      fontFamily: 'monospace',
      fontSize: '10.5px',
      fontStyle: 'bold',
      color: '#fda4af',
      stroke: '#05070a',
      strokeThickness: 4,
      letterSpacing: 1.5
    }).setOrigin(0.5).setDepth(10);

    // 4b. Difficulty Mode Selector Pills (ROOKIE / NORMAL / CURSED)
    this.createDifficultySelector(menuX, 166);

    // 5. Interactive Gothic Menu Buttons (Pixel-art icons + Primary CTA highlight)
    const startY = 228;
    const menuItems = [
      {
        text: 'START EXPEDITION',
        color: '#fde047',
        iconFrame: 343,
        isPrimary: true,
        action: () => this.startExpedition()
      },
      {
        text: 'THE DARK SANCTUARY',
        sub: 'UPGRADES',
        color: '#d8b4fe',
        iconFrame: 129,
        action: () => this.scene.start('sanctuary')
      },
      {
        text: 'CONTROLS & COMBAT',
        color: '#e2e8f0',
        iconFrame: 37,
        action: () => this.showControlsModal()
      },
      {
        text: 'RELIC COMPENDIUM',
        color: '#c084fc',
        iconFrame: 302,
        action: () => this.showRelicsModal()
      }
    ];

    menuItems.forEach((item, index) => {
      this.createMenuButton(menuX, startY + index * 46, item);
    });

    // Support keyboard shortcuts (SPACE / ENTER) when no modal is open
    this.isStarting = false;
    this.input.keyboard.on('keydown-SPACE', () => {
      if (!this.modalContainer.visible) this.startExpedition();
    });
    this.input.keyboard.on('keydown-ENTER', () => {
      if (!this.modalContainer.visible) this.startExpedition();
    });
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.modalContainer.visible) this.modalContainer.setVisible(false);
    });

    // 7. Ambient BGM & Later-Chapter Biomes (Lazy background loading so boot finishes fast)
    try {
      this.load.maxParallelDownloads = 2;
      let needsLoad = false;
      const lazyBiomes = [
        ['bg-sacred-grounds', 'assets/backgrounds/bg_sacred_grounds.png'],
        ['bg-black-lab', 'assets/backgrounds/bg_black_lab.png'],
        ['bg-fortress', 'assets/backgrounds/bg_fortress.png']
      ];
      lazyBiomes.forEach(([key, path]) => {
        if (!this.textures.exists(key)) {
          this.load.image(key, path);
          needsLoad = true;
        }
      });
      if (this.cache.audio.exists('bgm-temple')) {
        if (!this.sound.get('bgm-temple') || !this.sound.get('bgm-temple').isPlaying) {
          this.sound.play('bgm-temple', { loop: true, volume: 0.35 });
        }
      } else {
        this.load.audio('bgm-temple', 'assets/audio/music/ockaie_temple.ogg');
        this.load.once('filecomplete-audio-bgm-temple', () => {
          try {
            if (this.scene.isActive('main-menu') && (!this.sound.get('bgm-temple') || !this.sound.get('bgm-temple').isPlaying)) {
              this.sound.play('bgm-temple', { loop: true, volume: 0.35 });
            }
          } catch (e) {}
        });
        needsLoad = true;
      }
      if (needsLoad) this.load.start();
    } catch (e) {}

    // Modals Container
    this.modalContainer = this.add.container(0, 0).setVisible(false).setDepth(100);
  }

  createDifficultySelector(centerX, y) {
    const modes = ['rookie', 'normal', 'cursed'];
    const pillW = 108;
    const gap = 8;
    const pills = [];

    this.diffSummaryText = this.add.text(centerX, y + 23, '', {
      fontFamily: 'monospace',
      fontSize: '9.5px',
      fontStyle: 'bold',
      color: '#cbd5e1',
      stroke: '#05070a',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(11);

    const refresh = () => {
      const activeId = metaProgression.getDifficultyMode();
      const activeCfg = DIFFICULTY_MODES[activeId] || DIFFICULTY_MODES.normal;
      this.diffSummaryText.setText(`${activeCfg.label}: ${activeCfg.shortDesc}`).setColor(activeCfg.color);
      pills.forEach(({ mode, bg, label }) => {
        const selected = mode.id === activeId;
        bg.setFillStyle(selected ? 0x161f33 : 0x090d16, selected ? 0.96 : 0.78);
        bg.setStrokeStyle(selected ? 2 : 1, selected ? mode.hex : 0x334155);
        label.setColor(selected ? mode.color : '#64748b');
      });
    };

    modes.forEach((id, idx) => {
      const mode = DIFFICULTY_MODES[id];
      const px = centerX + (idx - 1) * (pillW + gap);
      const bg = this.add.rectangle(px, y, pillW, 24, 0x090d16, 0.85)
        .setStrokeStyle(1, 0x334155)
        .setDepth(10)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(px, y, mode.label, {
        fontFamily: 'monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: mode.color,
        stroke: '#05070a',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(11).setInteractive({ useHandCursor: true });

      const pick = () => {
        metaProgression.setDifficultyMode(mode.id);
        try { SoundSynth.playHit(); } catch (e) {}
        refresh();
      };
      bg.on('pointerdown', pick);
      label.on('pointerdown', pick);
      pills.push({ mode, bg, label });
    });

    refresh();
  }

  createMenuButton(x, y, item) {
    const w = 340;
    const h = 40;
    const isPrimary = Boolean(item.isPrimary);
    const baseFill = isPrimary ? 0x280d17 : 0x0b101d;
    const hoverFill = isPrimary ? 0x3b1322 : 0x162036;
    const baseStroke = isPrimary ? 0xd97706 : 0x334155;

    const btnBg = this.add.rectangle(x, y, w, h, baseFill, 0.92)
      .setStrokeStyle(isPrimary ? 2 : 1.5, baseStroke)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });

    // Corner gold rivets for authentic gothic frame craftsmanship
    const r1 = this.add.rectangle(x - w / 2 + 5, y - h / 2 + 5, 3, 3, isPrimary ? 0xfbbf24 : 0x64748b).setDepth(11);
    const r2 = this.add.rectangle(x + w / 2 - 5, y - h / 2 + 5, 3, 3, isPrimary ? 0xfbbf24 : 0x64748b).setDepth(11);
    const r3 = this.add.rectangle(x - w / 2 + 5, y + h / 2 - 5, 3, 3, isPrimary ? 0xfbbf24 : 0x64748b).setDepth(11);
    const r4 = this.add.rectangle(x + w / 2 - 5, y + h / 2 - 5, 3, 3, isPrimary ? 0xfbbf24 : 0x64748b).setDepth(11);

    let icon = null;
    if (this.textures.exists('icons_16x16') && item.iconFrame !== undefined) {
      icon = this.add.image(x - w / 2 + 26, y, 'icons_16x16', item.iconFrame).setScale(1.5).setDepth(12);
    }

    const labelStr = item.sub ? `${item.text}  (${item.sub})` : item.text;
    const btnText = this.add.text(x + 8, y, labelStr, {
      fontFamily: isPrimary ? 'Cinzel, monospace' : 'monospace',
      fontSize: isPrimary ? '15px' : '13px',
      fontStyle: 'bold',
      color: item.color,
      stroke: '#05070a',
      strokeThickness: 4,
      letterSpacing: isPrimary ? 1 : 0.4
    }).setOrigin(0.5).setDepth(12).setInteractive({ useHandCursor: true });

    const targets = icon ? [btnBg, btnText, icon, r1, r2, r3, r4] : [btnBg, btnText, r1, r2, r3, r4];

    const onHover = () => {
      btnBg.setFillStyle(hoverFill, 0.98);
      btnBg.setStrokeStyle(2, 0xfbbf24);
      btnText.setColor('#ffffff');
      this.tweens.killTweensOf(targets);
      this.tweens.add({ targets, scaleX: 1.03, scaleY: 1.03, duration: 110 });
      try { SoundSynth.playHit(); } catch (e) {}
    };

    const onOut = () => {
      btnBg.setFillStyle(baseFill, 0.92);
      btnBg.setStrokeStyle(isPrimary ? 2 : 1.5, baseStroke);
      btnText.setColor(item.color);
      this.tweens.killTweensOf(targets);
      this.tweens.add({ targets, scaleX: 1.0, scaleY: 1.0, duration: 110 });
    };

    btnBg.on('pointerover', onHover);
    btnText.on('pointerover', onHover);
    btnBg.on('pointerout', onOut);
    btnText.on('pointerout', onOut);

    const trigger = () => {
      try { SoundSynth.playSlash(3); } catch (e) {}
      item.action();
    };
    btnBg.on('pointerdown', trigger);
    btnText.on('pointerdown', trigger);
  }

  startExpedition() {
    if (this.isStarting) return;
    this.isStarting = true;
    const bonuses = metaProgression.getCombinedStatBonuses();
    const diff = metaProgression.getDifficultyConfig();
    const startHp = 150 + (bonuses.maxHp || 0) + (diff.hpBonus || 0);
    const startPotions = (bonuses.maxPotions || 2) + (diff.potionBonus || 0);
    const startGold = bonuses.startingGold || 0;

    this.cameras.main.fade(450, 5, 7, 10);
    this.time.delayedCall(450, () => {
      try {
        localStorage.setItem('cursed_crusader_corruption', '0');
        localStorage.setItem('cursed_crusader_gold', String(startGold));
        localStorage.setItem('cursed_crusader_relics', '[]');
        localStorage.removeItem('cursed_crusader_quintessence');
        localStorage.setItem('cursed_crusader_skull_rank', '1');
      } catch (e) {}
      this.scene.start('dungeon', { room: 1, gold: startGold, relics: [], hp: startHp, potions: startPotions, corruption: 0, skullRank: 1, quintessence: null });
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
      '• MOVEMENT: [A / D] | JUMP: [W / SPACE] (Double Jump) | DASH: [RMB / SHIFT]',
      '• COMBAT: [LMB / J] 3-Hit Combo | [K / X] Holy Parry (Deflects & Staggers)',
      '• SKUL SKILLS: [Q] Skull Active Skill | [TAB / C] Skull Swap Skill Shockwave',
      '• QUINTESSENCE: [G] Summon Equipped Quintessence Power (Bosses / Bazaar)',
      '• CONSUMABLES & AWAKEN: [F] Healing Potion | [U] Beast Awaken | [I] Finisher',
      '• INSCRIPTIONS: Stack matching Relic & Quintessence tags (2 / 4) for Set Bonuses!'
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
    const box = this.add.rectangle(width / 2, height / 2 - 10, 820, 440, 0x090d16)
      .setStrokeStyle(2, 0x9333ea);

    const title = this.add.text(width / 2, height / 2 - 200, '❖ RELIC COMPENDIUM & INSCRIPTION SYNERGIES ❖', {
      fontFamily: 'Cinzel, monospace', fontSize: '18px', fontStyle: 'bold', color: '#e879f9',
      stroke: '#05070a', strokeThickness: 4
    }).setOrigin(0.5);

    const elements = [overlay, box, title];
    const hasIcons = this.textures.exists('icons_16x16');

    // Render all relics cleanly in a 2-column grid with pixel-art icons
    RELIC_DATABASE.forEach((r, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const rx = width / 2 + (col === 0 ? -195 : 195);
      const ry = height / 2 - 128 + row * 80;

      const card = this.add.rectangle(rx, ry, 370, 74, 0x0f172a, 0.9)
        .setStrokeStyle(1, 0x4c1d95);
      elements.push(card);

      if (hasIcons && r.iconFrame !== undefined) {
        const icon = this.add.image(rx - 156, ry, 'icons_16x16', r.iconFrame).setScale(2);
        elements.push(icon);
      }

      const ins = r.inscriptions.map(i => `[${i}]`).join(' ');
      const nameTxt = this.add.text(rx - 130, ry - 21, r.name.toUpperCase(), {
        fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#fbbf24'
      }).setOrigin(0, 0.5);
      const synTxt = this.add.text(rx - 130, ry - 5, ins, {
        fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#c084fc'
      }).setOrigin(0, 0.5);
      const descTxt = this.add.text(rx - 130, ry + 15, r.description, {
        fontFamily: 'monospace', fontSize: '9.5px', color: '#cbd5e1', wordWrap: { width: 295 }
      }).setOrigin(0, 0.5);

      elements.push(nameTxt, synTxt, descTxt);
    });

    const closeBtn = this.add.text(width / 2, height / 2 + 184, '[RETURN TO MENU]', {
      fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color: '#f87171',
      backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: { x: 14, y: 5 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this.modalContainer.setVisible(false));
    elements.push(closeBtn);
    this.modalContainer.add(elements);
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
