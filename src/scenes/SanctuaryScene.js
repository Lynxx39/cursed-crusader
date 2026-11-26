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

    // 1. Astral Sacred Grounds Crypt Backdrop
    this.add.rectangle(0, 0, width, height, 0x05070c).setOrigin(0, 0);

    if (this.textures.exists('bg-sacred-grounds')) {
      this.add.image(width / 2, height / 2, 'bg-sacred-grounds')
        .setDisplaySize(width, height)
        .setAlpha(0.48);
    } else if (this.textures.exists('bg-gothic')) {
      this.add.image(width / 2, height / 2, 'bg-gothic')
        .setDisplaySize(width, height)
        .setAlpha(0.28);
    }
    this.add.rectangle(width / 2, height / 2, width, height, 0x05070c, 0.42);

    // 2. Header + Divider
    this.add.text(width / 2, 36, 'THE DARK SANCTUARY', {
      fontFamily: 'Cinzel, monospace',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#e879f9',
      stroke: '#05070a',
      strokeThickness: 6,
      letterSpacing: 2
    }).setOrigin(0.5);
    this.add.rectangle(width / 2, 56, 260, 1.5, 0x7e22ce, 0.9);

    this.add.text(width / 2, 70, 'Offer Blood Quartz to permanently augment your cursed vessel', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#cbd5e1'
    }).setOrigin(0.5);

    // 2b. Lifetime Crusade Ledger (Centered below subtitle — zero overlap)
    const d = metaProgression.data;
    this.add.text(width / 2, 88, `RUNS: ${d.totalRuns || 0}  •  BEST CHAMBER: ${d.highestChamber || 1}/12  •  BOSSES SLAIN: ${d.bossesSlain || 0}`, {
      fontFamily: 'monospace',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#fbbf24',
      stroke: '#05070a',
      strokeThickness: 3
    }).setOrigin(0.5);

    // 3. Blood Quartz Counter (Top Right with animated pixel gem)
    this.quartzContainer = this.add.container(width - 108, 40);
    const qPlate = this.add.rectangle(0, 0, 174, 34, 0x090d16, 0.94).setStrokeStyle(1.5, 0x7c3aed);
    const qChildren = [qPlate];
    if (this.textures.exists('blood_quartz')) {
      const qGem = this.add.sprite(-64, 0, 'blood_quartz').setScale(1.1);
      if (this.anims.exists('blood-quartz-spin')) qGem.anims.play('blood-quartz-spin');
      qChildren.push(qGem);
    }
    this.quartzText = this.add.text(8, 0, `QUARTZ: ${metaProgression.getBloodQuartz()}`, {
      fontFamily: 'monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#f43f5e',
      stroke: '#05070a',
      strokeThickness: 3
    }).setOrigin(0.5);
    qChildren.push(this.quartzText);
    this.quartzContainer.add(qChildren);

    // 4. Upgrades Grid (2 Columns x 3 Rows)
    this.cards = [];
    this.renderUpgradeCards();

    // 5. Back Button (Positioned well clear of bottom controls pill)
    const backBg = this.add.rectangle(width / 2, height - 66, 280, 34, 0x0b101d, 0.94)
      .setStrokeStyle(1.5, 0xd97706)
      .setInteractive({ useHandCursor: true });
    const backBtn = this.add.text(width / 2, height - 66, '◀ RETURN TO MAIN EXPEDITION', {
      fontFamily: 'monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#fde047',
      stroke: '#05070a',
      strokeThickness: 3
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const onHover = () => { backBg.setFillStyle(0x162036, 0.98); backBtn.setColor('#ffffff'); };
    const onOut = () => { backBg.setFillStyle(0x0b101d, 0.94); backBtn.setColor('#fde047'); };
    const goBack = () => {
      try { SoundSynth.playHit(); } catch (e) { }
      this.scene.start('main-menu');
    };
    backBg.on('pointerover', onHover);
    backBtn.on('pointerover', onHover);
    backBg.on('pointerout', onOut);
    backBtn.on('pointerout', onOut);
    backBg.on('pointerdown', goBack);
    backBtn.on('pointerdown', goBack);

    this.input.keyboard.on('keydown-ESC', () => this.scene.start('main-menu'));
  }

  renderUpgradeCards() {
    this.cards.forEach(c => c.destroy());
    this.cards = [];

    const startX = 260;
    const startY = 138;
    const cardW = 420;
    const cardH = 68;
    const spacingY = 78;

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

      // Icon & Name (Use crisp 16x16 pixel-art icon when available)
      const iconMap = {
        unholy_vigor: 4,
        abyssal_blade: 343,
        shadow_dash: 66,
        grave_bounty: 117,
        alchemist_pouch: 245,
        corrupted_blood: 129
      };
      const hasIcons = this.textures.exists('icons_16x16');
      let iconObj = null;
      if (hasIcons && iconMap[upgrade.id] !== undefined) {
        iconObj = this.add.image(-cardW / 2 + 26, -12, 'icons_16x16', iconMap[upgrade.id]).setScale(1.6);
      }

      const nameX = hasIcons ? (-cardW / 2 + 44) : (-cardW / 2 + 18);
      const nameText = this.add.text(nameX, -23, `${upgrade.name}`, {
        fontFamily: 'Cinzel, monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: isMax ? '#10b981' : '#f8fafc'
      });

      // Description
      const descText = this.add.text(nameX, -6, upgrade.desc, {
        fontFamily: 'monospace',
        fontSize: '9.5px',
        color: '#94a3b8',
        wordWrap: { width: 220 }
      });

      // Level Pips (Luminous framed slots)
      const pips = [];
      for (let p = 0; p < upgrade.maxLevel; p++) {
        const pipX = -cardW / 2 + 18 + p * 18;
        const pipY = 22;
        const isFilled = p < level;
        const fillCol = isFilled ? (isMax ? 0x10b981 : 0xa855f7) : 0x0f172a;
        const strokeCol = isFilled ? (isMax ? 0x34d399 : 0xc084fc) : 0x334155;
        const pip = this.add.rectangle(pipX, pipY, 13, 6, fillCol)
          .setStrokeStyle(1, strokeCol)
          .setOrigin(0, 0);
        pips.push(pip);
      }

      // Upgrade Action Button on Right (clean pixel text, zero broken emoji)
      let btnText = isMax ? 'MAX RANK' : (canAfford ? `${cost} QTZ • UPGRADE` : `${cost} QTZ`);
      let btnColor = isMax ? '#10b981' : (canAfford ? '#fde047' : '#64748b');
      let btnBg = isMax ? 'rgba(6, 78, 59, 0.45)' : (canAfford ? 'rgba(88, 28, 135, 0.78)' : 'rgba(15, 23, 42, 0.85)');

      const upBtn = this.add.text(cardW / 2 - 16, 0, btnText, {
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
            try { SoundSynth.playHolySmite(); } catch (e) { }
            this.quartzText.setText(`QUARTZ: ${metaProgression.getBloodQuartz()}`);
            this.renderUpgradeCards();
          }
        });
      }

      const children = [bg, nameText, descText, upBtn, ...pips];
      if (iconObj) children.push(iconObj);
      card.add(children);
      this.cards.push(card);
    });
  }
}

export default SanctuaryScene;
