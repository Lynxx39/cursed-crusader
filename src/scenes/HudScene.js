// HudScene.js - Event-Driven Parallel HUD Overlay with Skul-Style Relic Choice Modal & Boss Bar
import Phaser from 'phaser';
import { EventBus } from '../core/EventBus.js';
import { MetaProgression } from '../systems/MetaProgression.js';

export class HudScene extends Phaser.Scene {
  constructor() {
    super('hud');
  }

  create() {
    const meta = MetaProgression.getInstance();

    this.createHealthAndCorruptionBars();
    this.createExpeditionProgressBar();
    this.createRunStats(meta.bloodQuartz);
    this.createRelicsDisplay();
    this.createNotificationBanner();
    this.createBossBar();
    this.createRelicChoiceModal();
    this.createGameOverScreen();
    this.createVictoryScreen();

    // Wire EventBus listeners
    this.unsubs = [
      EventBus.on('player:hp_changed', ({ current, max }) => this.updateHp(current, max)),
      EventBus.on('player:corruption_changed', (data) => this.updateCorruption(data)),
      EventBus.on('player:progress', (data) => this.updateProgress(data.currentX, data.maxX, data.zone)),
      EventBus.on('zone:entered', (name) => this.showZoneBanner(name)),
      EventBus.on('beast:transformed', (data) => this.showBeastBanner(data)),
      EventBus.on('beast:reverted', () => this.hideBeastBanner()),
      EventBus.on('relic:acquired', (data) => this.updateRelics(data)),
      EventBus.on('relic:choose_options', (options) => this.showRelicChoiceModal(options)),
      EventBus.on('room:cleared', () => this.showRoomCleared()),
      EventBus.on('room:entered', (num) => this.updateRoomNumber(num)),
      EventBus.on('gold:changed', (amt) => this.updateGold(amt)),
      EventBus.on('quartz:changed', (amt) => this.updateQuartz(amt)),
      EventBus.on('potion:changed', (data) => this.updatePotion(data.current, data.max)),
      EventBus.on('form:swapped', (data) => this.updateForm(data.form, data.rank)),
      EventBus.on('swap:cooldown', (data) => this.updateSwapCooldown(data.current)),
      EventBus.on('skill:cooldown', (data) => this.updateSkillCooldown(data.current, data.max)),
      EventBus.on('quintessence:equipped', (data) => this.updateQuintessence(data.quintessence)),
      EventBus.on('quintessence:cooldown', (data) => this.updateQuintCooldown(data.current)),
      EventBus.on('skull:rank_changed', (data) => this.updateSkullRank(data.rank)),
      EventBus.on('enemies:count', (cnt) => this.updateEnemyCount(cnt)),
      EventBus.on('boss:spawned', (bossData) => this.showBossBar(bossData)),
      EventBus.on('boss:hp_changed', (data) => this.updateBossHp(data)),
      EventBus.on('boss:defeated', () => this.hideBossBar()),
      EventBus.on('player:died', () => this.showGameOver()),
      EventBus.on('game:victory', (data) => this.showVictoryScreen(data)),
      EventBus.on('notification:show', (data) => this.showBanner(data.text, data.color || '#ef4444'))
    ];

    this.events.on('shutdown', () => {
      this.unsubs.forEach(unsub => unsub && unsub());
    });
  }

  createHealthAndCorruptionBars() {
    const bgX = 16;
    const bgY = 16;

    // 1. Ornate Gothic Crest Badge on the left
    if (this.textures.exists('hud_skull_crest')) {
      this.add.image(bgX + 16, bgY + 20, 'hud_skull_crest').setDepth(22);
    }

    const barX = bgX + 38;
    const barW = 210;

    // 2. Health Bar Frame (Gothic slate with gold rivets)
    this.add.rectangle(barX + barW / 2, bgY + 10, barW + 8, 20, 0x070a12)
      .setStrokeStyle(2, 0x334155).setDepth(20);
    // Gold rivet accents at corners
    this.add.rectangle(barX - 2, bgY + 2, 3, 3, 0xf59e0b).setDepth(21);
    this.add.rectangle(barX + barW + 2, bgY + 2, 3, 3, 0xf59e0b).setDepth(21);
    this.add.rectangle(barX - 2, bgY + 18, 3, 3, 0xf59e0b).setDepth(21);
    this.add.rectangle(barX + barW + 2, bgY + 18, 3, 3, 0xf59e0b).setDepth(21);

    // Deep crimson trough background
    this.add.rectangle(barX, bgY + 2, barW, 16, 0x1a0505).setOrigin(0, 0).setDepth(20);
    this.hpGhostBar = this.add.rectangle(barX, bgY + 2, barW, 16, 0xfca5a5).setOrigin(0, 0).setDepth(21);
    this.hpFillBar = this.add.rectangle(barX, bgY + 2, barW, 16, 0xdc2626).setOrigin(0, 0).setDepth(21);
    // Subtle top glint on HP bar
    this.hpGlint = this.add.rectangle(barX, bgY + 2, barW, 3, 0xf87171, 0.6).setOrigin(0, 0).setDepth(22);

    this.hpText = this.add.text(barX + barW / 2, bgY + 10, 'HP 150 / 150', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#05070a', strokeThickness: 3
    }).setOrigin(0.5).setDepth(23);

    // 3. Corruption Gauge (Amethyst Crystal Vial aesthetic)
    const corrY = bgY + 26;
    const corrH = 12;
    this.add.rectangle(barX + barW / 2, corrY + corrH / 2, barW + 6, corrH + 4, 0x05070a)
      .setStrokeStyle(2, 0x581c87).setDepth(20);
    this.add.rectangle(barX, corrY, barW, corrH, 0x120422).setOrigin(0, 0).setDepth(20);
    this.corruptionBar = this.add.rectangle(barX, corrY, 0, corrH, 0xa855f7).setOrigin(0, 0).setDepth(21);
    this.corruptionGlint = this.add.rectangle(barX, corrY, 0, 2, 0xe9d5ff, 0.7).setOrigin(0, 0).setDepth(22);

    this.corruptionText = this.add.text(barX + barW / 2, corrY + corrH / 2, 'CORRUPTION 0%', {
      fontFamily: 'monospace', fontSize: '9px', color: '#e9d5ff', fontStyle: 'bold',
      stroke: '#05070a', strokeThickness: 3
    }).setOrigin(0.5).setDepth(23);

    // Awaken Beast Prompt (Positioned cleanly below Potion/Form row — zero overlap!)
    this.awakenPrompt = this.add.text(barX, corrY + 35, '>> [U] AWAKEN BEAST READY <<', {
      fontFamily: 'Cinzel, monospace', fontSize: '11px', fontStyle: 'bold', color: '#f87171',
      stroke: '#05070a', strokeThickness: 4
    }).setOrigin(0, 0.5).setVisible(false).setDepth(25);

    this.tweens.add({
      targets: this.awakenPrompt,
      alpha: 0.25,
      duration: 350,
      yoyo: true,
      repeat: -1
    });

    // Beast Active Header
    this.beastStatusText = this.add.text(barX, corrY + 35, '', {
      fontFamily: 'Cinzel, monospace', fontSize: '11px', fontStyle: 'bold', color: '#ef4444',
      stroke: '#05070a', strokeThickness: 4
    }).setOrigin(0, 0.5).setVisible(false).setDepth(25);

    // Consumable Potion & Form Swap Tracker
    this.potionText = this.add.text(barX, corrY + 18, '🧪 [F] POTION: 2/2', {
      fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#4ade80',
      stroke: '#05070a', strokeThickness: 3
    }).setOrigin(0, 0.5).setDepth(24);

    this.swapFormText = this.add.text(barX + 120, corrY + 18, '🛡️ [TAB] CRUSADER', {
      fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#38bdf8',
      stroke: '#05070a', strokeThickness: 3
    }).setOrigin(0, 0.5).setDepth(24);
  }

  createExpeditionProgressBar() {
    const cx = 480;
    const cy = 18;
    const barW = 280;

    this.progressContainer = this.add.container(0, 0).setDepth(20);
    const bg = this.add.rectangle(cx, cy, barW + 8, 12, 0x070a12, 0.85)
      .setStrokeStyle(1, 0x334155);
    const fill = this.add.rectangle(cx - barW / 2, cy - 3, 0, 6, 0x9333ea).setOrigin(0, 0);

    const cursor = this.add.circle(cx - barW / 2, cy, 4, 0xf59e0b).setStrokeStyle(1, 0xffffff);

    const label = this.add.text(cx, cy + 14, 'EXPEDITION: 0m / 5600m', {
      fontFamily: 'monospace', fontSize: '9px', fontStyle: 'bold', color: '#cbd5e1',
      stroke: '#05070a', strokeThickness: 2
    }).setOrigin(0.5);

    this.progressContainer.add([bg, fill, cursor, label]);
    this.progressFill = fill;
    this.progressCursor = cursor;
    this.progressLabel = label;
    this.progressTrackW = barW;
    this.progressTrackX = cx - barW / 2;
  }

  updateProgress(currentX, maxX, zoneName) {
    if (!this.progressFill || !this.progressTrackW) return;
    const ratio = Phaser.Math.Clamp(currentX / maxX, 0, 1);
    this.progressFill.width = this.progressTrackW * ratio;
    this.progressCursor.x = this.progressTrackX + this.progressTrackW * ratio;
    const displayZone = zoneName ? zoneName.toUpperCase() : 'EXPEDITION';
    const newText = `${displayZone}: ${currentX}m / ${maxX}m`;
    if (this._lastProgressText !== newText) {
      this._lastProgressText = newText;
      this.progressLabel.setText(newText);
    }
  }

  showZoneBanner(zoneName) {
    if (!this.zoneBannerText) {
      this.zoneBannerText = this.add.text(480, 148, '', {
        fontFamily: 'Cinzel, serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#fbbf24',
        stroke: '#05070a',
        strokeThickness: 6,
        letterSpacing: 2
      }).setOrigin(0.5).setDepth(40).setAlpha(0);
    }
    this.zoneBannerText.setText(`❖ ${zoneName.toUpperCase()} ❖`);
    this.tweens.killTweensOf(this.zoneBannerText);
    this.tweens.add({
      targets: this.zoneBannerText,
      alpha: 1,
      y: 138,
      duration: 400,
      hold: 1800,
      yoyo: true,
      ease: 'Cubic.easeOut'
    });
  }

  createRunStats(initialQuartz = 0) {
    const rightX = 940;
    // Gilded Coin Icon next to gold
    if (this.textures.exists('icon_gold_coin')) {
      this.add.image(rightX - 86, 28, 'icon_gold_coin').setDepth(21);
    }
    this.goldText = this.add.text(rightX, 20, 'GOLD: 0', {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#f59e0b',
      stroke: '#05070a', strokeThickness: 3
    }).setOrigin(1, 0).setDepth(21);

    this.roomText = this.add.text(rightX, 40, 'CHAMBER: 1 / 12', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#cbd5e1',
      stroke: '#05070a', strokeThickness: 3
    }).setOrigin(1, 0).setDepth(21);

    this.enemyCountText = this.add.text(rightX, 60, 'ENEMIES: SCANNING...', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#f87171',
      stroke: '#05070a', strokeThickness: 3
    }).setOrigin(1, 0).setDepth(21);

    if (this.textures.exists('blood_quartz')) {
      const qIcon = this.add.sprite(rightX - 88, 86, 'blood_quartz').setDepth(21).setScale(0.95);
      if (this.anims.exists('blood-quartz-spin')) qIcon.anims.play('blood-quartz-spin');
    }
    this.quartzText = this.add.text(rightX, 80, `QUARTZ: ${initialQuartz}`, {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#f43f5e',
      stroke: '#05070a', strokeThickness: 3
    }).setOrigin(1, 0).setDepth(21);

    const diff = MetaProgression.getInstance().getDifficultyConfig();
    this.diffModeText = this.add.text(rightX, 99, `MODE: ${diff.label}`, {
      fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: diff.color,
      stroke: '#05070a', strokeThickness: 3
    }).setOrigin(1, 0).setDepth(21);
  }

  updatePotion(current, max) {
    if (this.potionText) {
      this.potionText.setText(`🧪 [F] POTION: ${current}/${max}`);
      this.potionText.setColor(current > 0 ? '#4ade80' : '#94a3b8');
    }
  }

  updateQuartz(amt) {
    if (this.quartzText) {
      this.quartzText.setText(`QUARTZ: ${amt}`);
    }
  }

  updateForm(form) {
    if (this.swapFormText) {
      const isBerserker = form === 'berserker';
      this.swapFormText.setText(isBerserker ? '⚔️ [TAB] BERSERKER' : '🛡️ [TAB] CRUSADER');
      this.swapFormText.setColor(isBerserker ? '#ef4444' : '#38bdf8');
    }
  }

  updateSwapCooldown(cd) {
    if (this.swapFormText && cd > 0) {
      this.swapFormText.setText(`⏳ SWAP (${cd.toFixed(1)}s)`);
      this.swapFormText.setColor('#facc15');
    }
  }

  updateEnemyCount(cnt) {
    if (cnt <= 0) {
      this.enemyCountText.setText('>>> CHAMBER PURIFIED! <<<').setColor('#10b981');
    } else {
      this.enemyCountText.setText(`ENEMIES: ${cnt} REMAINING`).setColor('#f87171');
    }
  }

  createRelicsDisplay() {
    this.relicSlotContainer = this.add.container(16, 466).setDepth(20);
    // Dark gothic belt plate (expanded to fit up to 8 relic icons + Tier 4 synergies cleanly)
    const beltPlate = this.add.rectangle(309, 12, 618, 26, 0x070a12, 0.88)
      .setStrokeStyle(1, 0x334155);
    const label = this.add.text(8, 12, 'RELICS:', {
      fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#94a3b8'
    }).setOrigin(0, 0.5);

    this.relicsText = this.add.text(60, 12, 'None acquired', {
      fontFamily: 'monospace', fontSize: '10px', color: '#64748b'
    }).setOrigin(0, 0.5);

    this.relicIconsGroup = [];
    this.relicSlotContainer.add([beltPlate, label, this.relicsText]);

    // Skul-Style Active Skill [Q], Quintessence [G], & Skull Rank Plate (bottom-right, clear of Relic Belt)
    this.skillSlotContainer = this.add.container(644, 466).setDepth(20);
    const skillPlate = this.add.rectangle(150, 12, 300, 26, 0x070a12, 0.88)
      .setStrokeStyle(1, 0x334155);
    this.skillText = this.add.text(10, 12, '[Q] SKILL: READY', {
      fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#38bdf8'
    }).setOrigin(0, 0.5);
    this.quintText = this.add.text(140, 12, '[G] QUINT: —', {
      fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#64748b'
    }).setOrigin(0, 0.5);
    this.skullRankText = this.add.text(290, 12, '★I', {
      fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#fbbf24'
    }).setOrigin(1, 0.5);
    this.skillSlotContainer.add([skillPlate, this.skillText, this.quintText, this.skullRankText]);
  }

  updateSkillCooldown(cd) {
    if (!this.skillText) return;
    if (cd > 0) {
      this.skillText.setText(`[Q] SKILL: ${cd.toFixed(1)}s`).setColor('#facc15');
    } else {
      this.skillText.setText('[Q] SKILL: READY').setColor('#38bdf8');
    }
  }

  updateQuintessence(q) {
    this.equippedQuintName = q ? q.name.split(' ')[0].toUpperCase() : null;
    if (this.quintText) {
      if (this.equippedQuintName) {
        this.quintText.setText(`[G] ${this.equippedQuintName}`).setColor('#e879f9');
      } else {
        this.quintText.setText('[G] QUINT: —').setColor('#64748b');
      }
    }
  }

  updateQuintCooldown(cd) {
    if (!this.quintText || !this.equippedQuintName) return;
    if (cd > 0) {
      this.quintText.setText(`[G] ${cd.toFixed(0)}s`).setColor('#facc15');
    } else {
      this.quintText.setText(`[G] ${this.equippedQuintName}`).setColor('#e879f9');
    }
  }

  updateSkullRank(rank = 1) {
    if (!this.skullRankText) return;
    const roman = rank >= 3 ? '★III' : (rank === 2 ? '★II' : '★I');
    const col = rank >= 3 ? '#f43f5e' : (rank === 2 ? '#c084fc' : '#fbbf24');
    this.skullRankText.setText(roman).setColor(col);
  }

  createNotificationBanner() {
    this.banner = this.add.text(480, 100, '', {
      fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', color: '#fbbf24',
      stroke: '#000000', strokeThickness: 5, align: 'center'
    }).setOrigin(0.5).setAlpha(0).setDepth(25);
  }

  showBanner(msg, col = '#fbbf24') {
    this.tweens.killTweensOf(this.banner);
    this.banner.setText(msg).setColor(col).setAlpha(1).setScale(1.2);
    this.tweens.add({
      targets: this.banner,
      scale: 1.0,
      alpha: 0,
      duration: 2500,
      ease: 'Quad.easeIn'
    });
  }

  // Boss HP Bar at Bottom Center (Soulsborne Style — Zero overlap with Player/Top HUD)
  createBossBar() {
    this.bossBarContainer = this.add.container(480, 442).setVisible(false).setDepth(25);

    const bg = this.add.rectangle(0, 0, 460, 18, 0x05070a, 0.92).setStrokeStyle(2, 0xdc2626);
    this.bossHpFill = this.add.rectangle(-226, -6, 452, 12, 0xb91c1c).setOrigin(0, 0);
    const phaseTick = this.add.rectangle(0, 0, 2, 18, 0xfbbf24, 0.85);
    this.bossNameText = this.add.text(0, -18, '⚔ HIGH INQUISITOR MALAKOR ⚔', {
      fontFamily: 'Cinzel, monospace', fontSize: '13px', fontStyle: 'bold', color: '#f87171',
      stroke: '#05070a', strokeThickness: 4
    }).setOrigin(0.5);

    this.bossBarContainer.add([bg, this.bossHpFill, phaseTick, this.bossNameText]);
  }

  showBossBar({ name, maxHp }) {
    this.bossNameText.setText(`⚔ ${name.toUpperCase()} ⚔`);
    this.bossHpFill.width = 452;
    this.bossBarContainer.setVisible(true);
    if (this.progressContainer) this.progressContainer.setVisible(false);
  }

  updateBossHp({ current, max }) {
    const ratio = Math.max(0, Math.min(1, current / (max || 1)));
    this.tweens.killTweensOf(this.bossHpFill);
    this.tweens.add({
      targets: this.bossHpFill,
      width: ratio * 452,
      duration: 150
    });
  }

  hideBossBar() {
    this.bossBarContainer.setVisible(false);
    if (this.progressContainer) this.progressContainer.setVisible(true);
  }

  // Interactive Skul-Style Relic Selection Modal
  createRelicChoiceModal() {
    this.relicModal = this.add.container(480, 270).setVisible(false).setDepth(40);

    // Dark backdrop overlay
    const backdrop = this.add.rectangle(0, 0, 960, 540, 0x05070a, 0.88);
    backdrop.setInteractive(); // block game clicks behind modal

    const header = this.add.text(0, -170, 'SANCTUARY OF RELICS', {
      fontFamily: 'monospace', fontSize: '26px', fontStyle: 'bold', color: '#a855f7',
      stroke: '#000', strokeThickness: 5
    }).setOrigin(0.5);

    const subheader = this.add.text(0, -135, 'Choose 1 Ancient Relic to augment your dark crusade', {
      fontFamily: 'monospace', fontSize: '13px', color: '#cbd5e1'
    }).setOrigin(0.5);

    const skipBtn = this.add.text(0, 205, '[ SKIP / CONTINUE >>> ]', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#94a3b8',
      backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    skipBtn.on('pointerover', () => skipBtn.setColor('#facc15'));
    skipBtn.on('pointerout', () => skipBtn.setColor('#94a3b8'));
    skipBtn.on('pointerdown', () => {
      this.relicModal.setVisible(false);
      EventBus.emit('relic:selected', { id: null, inscriptions: [] });
    });

    this.cardContainers = [];
    this.relicModal.add([backdrop, header, subheader, skipBtn]);
  }

  showRelicChoiceModal(options) {
    this.relicModal.setVisible(true);

    // Clean old cards
    this.cardContainers.forEach(c => c.destroy());
    this.cardContainers = [];

    // Render 3 Choice Cards side by side
    const cardWidth = 240;
    const cardHeight = 260;
    const spacing = 260;
    const startX = -spacing;

    options.forEach((relic, idx) => {
      const cx = startX + idx * spacing;
      const card = this.add.container(cx, 30);

      // Card Background
      const cardBg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x0f172a)
        .setStrokeStyle(2, 0x7e22ce)
        .setInteractive({ useHandCursor: true });

      const children = [cardBg];
      if (this.textures.exists('icons_16x16') && relic.iconFrame !== undefined) {
        const iconBg = this.add.rectangle(0, -96, 36, 36, 0x1e1b4b).setStrokeStyle(1, 0xa855f7);
        const icon = this.add.image(0, -96, 'icons_16x16', relic.iconFrame).setScale(2);
        children.push(iconBg, icon);
      }

      // Title
      const title = this.add.text(0, -56, relic.name, {
        fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color: '#fbbf24',
        align: 'center', wordWrap: { width: 220 }
      }).setOrigin(0.5);

      // Inscription Tags
      const synText = relic.inscriptions.map(i => `[${i}]`).join(' ');
      const inscriptions = this.add.text(0, -30, synText, {
        fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#c084fc'
      }).setOrigin(0.5);

      // Description
      const desc = this.add.text(0, 22, relic.description, {
        fontFamily: 'monospace', fontSize: '11px', color: '#e2e8f0',
        align: 'center', wordWrap: { width: 210 }
      }).setOrigin(0.5);

      // Select Button
      const btnBg = this.add.rectangle(0, 95, 160, 32, 0x581c87)
        .setStrokeStyle(1, 0xa855f7)
        .setInteractive({ useHandCursor: true });
      const btnText = this.add.text(0, 95, 'CLAIM RELIC', {
        fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#ffffff'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      children.push(title, inscriptions, desc, btnBg, btnText);
      card.add(children);

      const selectThisRelic = () => {
        this.relicModal.setVisible(false);
        EventBus.emit('relic:selected', relic);
      };

      // Hover effect
      cardBg.on('pointerover', () => {
        cardBg.setStrokeStyle(3, 0xfacc15);
        btnBg.setFillStyle(0x7e22ce);
        this.tweens.add({ targets: card, y: 22, duration: 150 });
      });
      cardBg.on('pointerout', () => {
        cardBg.setStrokeStyle(2, 0x7e22ce);
        btnBg.setFillStyle(0x581c87);
        this.tweens.add({ targets: card, y: 30, duration: 150 });
      });

      // Click anywhere on card, button, or text to claim!
      cardBg.on('pointerdown', selectThisRelic);
      btnBg.on('pointerdown', selectThisRelic);
      btnText.on('pointerdown', selectThisRelic);

      this.cardContainers.push(card);
      this.relicModal.add(card);
    });
  }

  createGameOverScreen() {
    this.gameOverContainer = this.add.container(480, 270).setVisible(false).setDepth(50);

    const bg = this.add.rectangle(0, 0, 960, 540, 0x05070a, 0.9);
    const title = this.add.text(0, -60, 'FALLEN TO THE CURSE', {
      fontFamily: 'monospace', fontSize: '36px', fontStyle: 'bold', color: '#ef4444', stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5);

    const desc = this.add.text(0, 10, 'Your crusade has ended. Rise again and conquer the chapters.', {
      fontFamily: 'monospace', fontSize: '14px', color: '#94a3b8'
    }).setOrigin(0.5);

    const prompt = this.add.text(0, 70, '[ PRESS R OR CLICK TO RETURN TO MENU ]', {
      fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#f59e0b'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: prompt,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    const restartRun = () => {
      if (this.gameOverContainer.visible) {
        this.scene.stop('hud');
        this.scene.stop('dungeon');
        this.scene.start('main-menu');
      }
    };

    prompt.on('pointerdown', restartRun);
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', restartRun);

    this.gameOverContainer.add([bg, title, desc, prompt]);

    this.input.keyboard.on('keydown-R', () => {
      restartRun();
    });
  }

  updateHp(current, max) {
    const safeMax = (max !== undefined && !isNaN(max) && max > 0) ? max : 150;
    const safeCur = (current !== undefined && !isNaN(current)) ? Math.max(0, Math.round(current)) : safeMax;
    const ratio = Math.max(0, Math.min(1, safeCur / safeMax));
    const barW = 210;
    this.hpFillBar.width = ratio * barW;
    if (this.hpGlint) this.hpGlint.width = ratio * barW;
    const hpStr = `HP ${safeCur} / ${safeMax}`;
    if (this._lastHpStr !== hpStr) {
      this._lastHpStr = hpStr;
      this.hpText.setText(hpStr);
    }

    this.tweens.killTweensOf(this.hpGhostBar);
    this.tweens.add({
      targets: this.hpGhostBar,
      width: ratio * barW,
      duration: 400,
      ease: 'Cubic.easeOut'
    });
  }

  updateCorruption({ current, max, isMax }) {
    const safeMax = (max !== undefined && !isNaN(max) && max > 0) ? max : 100;
    const safeCur = (current !== undefined && !isNaN(current)) ? Math.max(0, Math.min(safeMax, Math.round(current))) : 0;
    const ratio = safeCur / safeMax;
    const barW = 210;
    this.corruptionBar.width = ratio * barW;
    if (this.corruptionGlint) this.corruptionGlint.width = ratio * barW;
    if (this._lastCorrPct !== safeCur) {
      this._lastCorrPct = safeCur;
      this.corruptionText.setText(`CORRUPTION ${safeCur}%`);
    }

    if (isMax || safeCur >= safeMax) {
      this.awakenPrompt.setVisible(true);
      this.corruptionBar.setFillStyle(0xef4444);
    } else {
      this.awakenPrompt.setVisible(false);
      this.corruptionBar.setFillStyle(0xa855f7);
    }
  }

  showBeastBanner({ formType, duration }) {
    this.awakenPrompt.setVisible(false);
    this.beastStatusText.setVisible(true);
    this.beastStatusText.setText(`[AWAKENED: ${formType.toUpperCase()}] - [I]: FINISHER`);
    this.showBanner(`⚔ AWAKENED: ${formType.toUpperCase()}! ⚔`, '#ef4444');
  }

  hideBeastBanner() {
    this.beastStatusText.setVisible(false);
    this.showBanner('REVERTED TO HOLY KNIGHT', '#38bdf8');
  }

  updateRelics({ all, synergies }) {
    if (this.relicIconsGroup) {
      this.relicIconsGroup.forEach(obj => obj.destroy());
    }
    this.relicIconsGroup = [];

    const list = all || [];
    if (list.length === 0) {
      this.relicsText.setText('None acquired').setVisible(true);
      return;
    }

    const hasIcons = this.textures.exists('icons_16x16');
    const synStr = Object.entries(synergies || {})
      .filter(([, v]) => v >= 2)
      .map(([k, v]) => `${v >= 4 ? '★' : ''}${k.split(' ')[0]}[${v}]`)
      .join(' ');

    if (hasIcons) {
      this.relicsText.setVisible(true);
      const maxShown = Math.min(list.length, 7);
      for (let i = 0; i < maxShown; i++) {
        const r = list[i];
        const ix = 68 + i * 22;
        const slot = this.add.rectangle(ix, 12, 18, 18, 0x0f172a).setStrokeStyle(1, 0x7e22ce);
        const icon = this.add.image(ix, 12, 'icons_16x16', r.iconFrame || 127);
        this.relicSlotContainer.add([slot, icon]);
        this.relicIconsGroup.push(slot, icon);
      }
      const textX = 68 + maxShown * 22 + 4;
      this.relicsText.setPosition(textX, 12);
      const extra = list.length > maxShown ? `+${list.length - maxShown} ` : '';
      this.relicsText.setText(`${extra}${synStr || `${list.length} active`}`).setColor('#c084fc');
    } else {
      const names = list.map(r => r.name).slice(0, 2).join(', ');
      this.relicsText.setPosition(60, 12).setText(`${names}${list.length > 2 ? ` +${list.length - 2}` : ''}`);
    }
  }

  showRoomCleared() {
    this.showBanner('CHAMBER PURIFIED!\nPROCEED RIGHT TO THE GATES >>>', '#10b981');
  }

  updateRoomNumber(num) {
    this.roomText.setText(`CHAMBER: ${num} / 12`);
    if (this.gameOverContainer) this.gameOverContainer.setVisible(false);
    if (this.victoryContainer) this.victoryContainer.setVisible(false);
    if (this.relicModal) this.relicModal.setVisible(false);
    if (this.beastStatusText) this.beastStatusText.setVisible(false);
    const isBoss = (num === 3 || num === 6 || num === 9 || num === 12);
    if (!isBoss) {
      this.hideBossBar();
    }
  }

  updateGold(amt) {
    this.goldText.setText(`GOLD: ${amt}`);
  }

  showGameOver() {
    if (this.relicModal) {
      this.relicModal.setVisible(false);
    }
    this.gameOverContainer.setVisible(true);
  }

  createVictoryScreen() {
    this.victoryContainer = this.add.container(480, 270).setVisible(false).setDepth(55);

    const bg = this.add.rectangle(0, 0, 960, 540, 0x05070a, 0.92).setInteractive();
    const frame = this.add.rectangle(0, 0, 620, 320, 0x0b0f19, 0.96).setStrokeStyle(2, 0xfbbf24);

    const title = this.add.text(0, -100, '👑 ETERNAL ASCENSION 👑', {
      fontFamily: 'Cinzel, monospace', fontSize: '30px', fontStyle: 'bold', color: '#fde047',
      stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, -52, 'THE CURSED KING ALDOUS HAS FALLEN. THE CRUSADE IS COMPLETE!', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#34d399'
    }).setOrigin(0.5);

    this.victoryStatsText = this.add.text(0, 10, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#e2e8f0', align: 'center', lineHeight: 22
    }).setOrigin(0.5);

    const goSanctuaryBtn = this.add.text(-130, 105, '[ ENTER DARK SANCTUARY ]', {
      fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color: '#c084fc',
      backgroundColor: 'rgba(88, 28, 135, 0.5)', padding: { x: 12, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const goMenuBtn = this.add.text(145, 105, '[ MAIN MENU ]', {
      fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color: '#fde047',
      backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: { x: 12, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    goSanctuaryBtn.on('pointerdown', () => {
      this.scene.stop('hud');
      this.scene.stop('dungeon');
      this.scene.start('sanctuary');
    });
    goMenuBtn.on('pointerdown', () => {
      this.scene.stop('hud');
      this.scene.stop('dungeon');
      this.scene.start('main-menu');
    });

    this.victoryContainer.add([bg, frame, title, subtitle, this.victoryStatsText, goSanctuaryBtn, goMenuBtn]);
  }

  showVictoryScreen({ gold = 0, relics = 0, bonusQuartz = 100, totalQuartz = 0 }) {
    if (this.relicModal) this.relicModal.setVisible(false);
    this.victoryStatsText.setText([
      `🪙 GOLD AMASSED: ${gold}`,
      `❖ RELICS HARNESSED: ${relics}`,
      `🩸 VICTORY BOUNTY: +${bonusQuartz} BLOOD QUARTZ (TOTAL: ${totalQuartz})`
    ].join('\n'));
    this.victoryContainer.setVisible(true);
  }
}

export default HudScene;
