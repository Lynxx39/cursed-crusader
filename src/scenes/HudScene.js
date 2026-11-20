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
      EventBus.on('form:swapped', (data) => this.updateForm(data.form)),
      EventBus.on('swap:cooldown', (data) => this.updateSwapCooldown(data.current)),
      EventBus.on('enemies:count', (cnt) => this.updateEnemyCount(cnt)),
      EventBus.on('boss:spawned', (bossData) => this.showBossBar(bossData)),
      EventBus.on('boss:hp_changed', (data) => this.updateBossHp(data)),
      EventBus.on('boss:defeated', () => this.hideBossBar()),
      EventBus.on('player:died', () => this.showGameOver()),
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

    // Awaken Beast Prompt (Flashing when ready)
    this.awakenPrompt = this.add.text(barX, corrY + 20, '>> [U] AWAKEN BEAST READY <<', {
      fontFamily: 'Cinzel, monospace', fontSize: '11px', fontStyle: 'bold', color: '#f87171',
      stroke: '#05070a', strokeThickness: 4
    }).setOrigin(0, 0.5).setVisible(false).setDepth(25);

    this.tweens.add({
      targets: this.awakenPrompt,
      alpha: 0.2,
      duration: 350,
      yoyo: true,
      repeat: -1
    });

    // Beast Active Header
    this.beastStatusText = this.add.text(barX, corrY + 34, '', {
      fontFamily: 'Cinzel, monospace', fontSize: '11px', fontStyle: 'bold', color: '#ef4444',
      stroke: '#05070a', strokeThickness: 4
    }).setOrigin(0, 0.5).setVisible(false).setDepth(25);

    // Consumable Potion & Form Swap Tracker
    this.potionText = this.add.text(barX, corrY + 18, '🧪 [F] POTION: 2/2', {
      fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#4ade80',
      stroke: '#05070a', strokeThickness: 3
    }).setOrigin(0, 0.5).setDepth(24);

    this.swapFormText = this.add.text(barX + 115, corrY + 18, '🛡️ [TAB] CRUSADER', {
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
    this.progressLabel.setText(`${displayZone}: ${currentX}m / ${maxX}m`);
  }

  showZoneBanner(zoneName) {
    if (!this.zoneBannerText) {
      this.zoneBannerText = this.add.text(480, 120, '', {
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
      y: 110,
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

    this.quartzText = this.add.text(rightX, 80, `🩸 QUARTZ: ${initialQuartz}`, {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#f43f5e',
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
      this.quartzText.setText(`🩸 QUARTZ: ${amt}`);
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
    this.relicSlotContainer = this.add.container(20, 468).setDepth(20);
    // Dark gothic belt plate
    const beltPlate = this.add.rectangle(140, 10, 280, 24, 0x070a12, 0.85)
      .setStrokeStyle(1, 0x334155);
    const label = this.add.text(8, 10, 'RELICS:', {
      fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#94a3b8'
    }).setOrigin(0, 0.5);

    this.relicsText = this.add.text(62, 10, 'None acquired', {
      fontFamily: 'monospace', fontSize: '10px', color: '#64748b'
    }).setOrigin(0, 0.5);

    this.relicSlotContainer.add([beltPlate, label, this.relicsText]);
  }

  createNotificationBanner() {
    this.banner = this.add.text(480, 100, '', {
      fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', color: '#fbbf24',
      stroke: '#000000', strokeThickness: 5, align: 'center'
    }).setOrigin(0.5).setAlpha(0).setDepth(25);
  }

  showBanner(msg, col = '#fbbf24') {
    this.banner.setText(msg).setColor(col).setAlpha(1).setScale(1.2);
    this.tweens.add({
      targets: this.banner,
      scale: 1.0,
      alpha: 0,
      duration: 2500,
      ease: 'Quad.easeIn'
    });
  }

  // Boss HP Bar at Top Center (Dark Souls / Metroidvania Style)
  createBossBar() {
    this.bossBarContainer = this.add.container(480, 80).setVisible(false).setDepth(25);

    const bg = this.add.rectangle(0, 0, 440, 20, 0x05070a).setStrokeStyle(2, 0xdc2626);
    this.bossHpFill = this.add.rectangle(-218, -8, 436, 16, 0xb91c1c).setOrigin(0, 0);
    this.bossNameText = this.add.text(0, -18, '⚔ HIGH INQUISITOR MALAKOR ⚔', {
      fontFamily: 'Cinzel, monospace', fontSize: '13px', fontStyle: 'bold', color: '#f87171',
      stroke: '#05070a', strokeThickness: 4
    }).setOrigin(0.5);

    this.bossBarContainer.add([bg, this.bossHpFill, this.bossNameText]);
  }

  showBossBar({ name, maxHp }) {
    this.bossNameText.setText(`⚔ ${name.toUpperCase()} ⚔`);
    this.bossHpFill.width = 436;
    this.bossBarContainer.setVisible(true);
  }

  updateBossHp({ current, max }) {
    const ratio = Math.max(0, current / max);
    this.tweens.add({
      targets: this.bossHpFill,
      width: ratio * 436,
      duration: 150
    });
  }

  hideBossBar() {
    this.bossBarContainer.setVisible(false);
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

      // Title
      const title = this.add.text(0, -100, relic.name, {
        fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#fbbf24',
        align: 'center', wordWrap: { width: 220 }
      }).setOrigin(0.5);

      // Inscription Tags
      const synText = relic.inscriptions.map(i => `[${i}]`).join(' ');
      const inscriptions = this.add.text(0, -65, synText, {
        fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#c084fc'
      }).setOrigin(0.5);

      // Description
      const desc = this.add.text(0, 5, relic.description, {
        fontFamily: 'monospace', fontSize: '12px', color: '#e2e8f0',
        align: 'center', wordWrap: { width: 210 }
      }).setOrigin(0.5);

      // Select Button
      const btnBg = this.add.rectangle(0, 95, 160, 32, 0x581c87)
        .setStrokeStyle(1, 0xa855f7)
        .setInteractive({ useHandCursor: true });
      const btnText = this.add.text(0, 95, 'CLAIM RELIC', {
        fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#ffffff'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      card.add([cardBg, title, inscriptions, desc, btnBg, btnText]);

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
    this.hpText.setText(`HP ${safeCur} / ${safeMax}`);

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
    this.corruptionText.setText(`CORRUPTION ${safeCur}%`);

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
    let synStr = Object.entries(synergies || {}).map(([k, v]) => `${k} [${v}]`).join(' | ');
    if (!synStr) synStr = 'None';
    const names = (all || []).map(r => r.name).join(', ');
    this.relicsText.setText(`RELICS (${all ? all.length : 0}): ${names || 'None'} | SYNERGIES: ${synStr}`);
  }

  showRoomCleared() {
    this.showBanner('CHAMBER PURIFIED!\nPROCEED RIGHT TO THE GATES >>>', '#10b981');
  }

  updateRoomNumber(num) {
    this.roomText.setText(`CHAMBER: ${num} / 12`);
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
}

export default HudScene;
