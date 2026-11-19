// SanctuaryScene.js - Dark Sanctuary Meta-Progression & Permanent Altar of Power
import Phaser from 'phaser';
import { metaProgression, SANCTUARY_UPGRADES } from '../systems/MetaProgression.js';
import { SoundSynth } from '../core/SoundSynth.js';

export class SanctuaryScene extends Phaser.Scene {
  constructor() {
    super('sanctuary');
  }

  create() {
    const { width, height } = this.scale;

    // 1. Dark Crypt Backdrop
    this.add.rectangle(0, 0, width, height, 0x05070a).setOrigin(0, 0);

    if (this.textures.exists('bg-gothic')) {
      this.add.image(width / 2, height / 2, 'bg-gothic')
        .setDisplaySize(width, height)
        .setAlpha(0.25);
    }

    // 2. Header
    this.add.text(width / 2, 40, '❖ THE DARK SANCTUARY ❖', {
      fontFamily: 'Cinzel, monospace',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#c084fc',
      stroke: '#05070a',
      strokeThickness: 5
    }).setOrigin(0.5);

    this.add.text(width / 2, 68, 'Offer Blood Quartz to permanently augment your dark vessel', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#94a3b8'
    }).setOrigin(0.5);

    // 3. Blood Quartz Counter (Top Right)
    this.quartzContainer = this.add.container(width - 160, 42);
    const qPlate = this.add.rectangle(0, 0, 160, 32, 0x0f172a).setStrokeStyle(2, 0xdc2626);
    this.quartzText = this.add.text(0, 0, `🩸 QUARTZ: ${metaProgression.getBloodQuartz()}`, {
      fontFamily: 'monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#f87171'
    }).setOrigin(0.5);
    this.quartzContainer.add([qPlate, this.quartzText]);

    // 4. Upgrades Grid (2 Columns x 3 Rows)
    this.cards = [];
    this.renderUpgradeCards();

    // 5. Back Button (Bottom Center)
    const backBtn = this.add.text(width / 2, height - 38, '◀ RETURN TO MAIN EXPEDITION', {
      fontFamily: 'monospace',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#fde047',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      padding: { x: 18, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setColor('#fde047'));
    backBtn.on('pointerdown', () => {
      try { SoundSynth.playHit(); } catch (e) {}
      this.scene.start('main-menu');
    });

    this.input.keyboard.on('keydown-ESC', () => this.scene.start('main-menu'));
  }

  renderUpgradeCards() {
    this.cards.forEach(c => c.destroy());
    this.cards = [];

    const startX = 260;
    const startY = 125;
    const cardW = 420;
    const cardH = 68;
    const spacingY = 76;

    SANCTUARY_UPGRADES.forEach((upgrade, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const cx = col === 0 ? 250 : 710;
      const cy = startY + row * spacingY;

      const card = this.add.container(cx, cy);
      const level = metaProgression.getUpgradeLevel(upgrade.id);
      const isMax = level >= upgrade.maxLevel;
      const cost = isMax ? 0 : upgrade.costs[level];
      const canAfford = !isMax && metaProgression.getBloodQuartz() >= cost;

      // Card Background
      const bg = this.add.rectangle(0, 0, cardW, cardH, 0x0a0e17)
        .setStrokeStyle(2, isMax ? 0x10b981 : (canAfford ? 0x9333ea : 0x334155));

      // Icon & Name
      const nameText = this.add.text(-cardW / 2 + 18, -18, `${upgrade.icon} ${upgrade.name}`, {
        fontFamily: 'Cinzel, monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: isMax ? '#10b981' : '#f8fafc'
      });

      // Description
      const descText = this.add.text(-cardW / 2 + 18, 5, upgrade.desc, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#94a3b8'
      });

      // Level Pips
      for (let p = 0; p < upgrade.maxLevel; p++) {
        const pipX = -cardW / 2 + 18 + p * 16;
        const pipY = 22;
        this.add.rectangle(pipX, pipY, 11, 4, p < level ? (isMax ? 0x10b981 : 0xa855f7) : 0x1e293b)
          .setOrigin(0, 0);
      }

      // Upgrade Action Button on Right
      let btnText = isMax ? 'MAX RANK' : `🩸 ${cost} UPGRADE`;
      let btnColor = isMax ? '#10b981' : (canAfford ? '#fde047' : '#64748b');
      let btnBg = isMax ? 'rgba(6, 78, 59, 0.4)' : (canAfford ? 'rgba(88, 28, 135, 0.7)' : 'rgba(15, 23, 42, 0.6)');

      const upBtn = this.add.text(cardW / 2 - 18, 0, btnText, {
        fontFamily: 'monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: btnColor,
        backgroundColor: btnBg,
        padding: { x: 10, y: 7 }
      }).setOrigin(1, 0.5);

      if (canAfford && !isMax) {
        upBtn.setInteractive({ useHandCursor: true });
        upBtn.on('pointerover', () => upBtn.setColor('#ffffff'));
        upBtn.on('pointerout', () => upBtn.setColor(btnColor));
        upBtn.on('pointerdown', () => {
          if (metaProgression.purchaseUpgrade(upgrade.id)) {
            try { SoundSynth.playHolySmite(); } catch (e) {}
            this.quartzText.setText(`🩸 QUARTZ: ${metaProgression.getBloodQuartz()}`);
            this.renderUpgradeCards();
          }
        });
      }

      card.add([bg, nameText, descText, upBtn]);
      this.cards.push(card);
    });
  }
}

export default SanctuaryScene;
