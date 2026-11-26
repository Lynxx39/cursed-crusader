// MetaProgression.js - Permanent Rogue-lite Progression & Dark Sanctuary Upgrades (Saved to localStorage)
import { EventBus } from '../core/EventBus.js';

const STORAGE_KEY = 'cursed_crusader_save_v1';
const DIFFICULTY_KEY = 'cursed_crusader_difficulty';

export const DIFFICULTY_MODES = {
  rookie: {
    id: 'rookie',
    label: 'ROOKIE',
    shortDesc: '200 HP • -55% DMG TAKEN • 3 POTIONS',
    color: '#4ade80',
    hex: 0x4ade80,
    hpBonus: 50,
    potionBonus: 1,
    enemyDamageMult: 0.45,
    enemyHpMult: 0.75,
    invulnSeconds: 0.85,
    orbHealBonus: 4,
    quartzMult: 1.0
  },
  normal: {
    id: 'normal',
    label: 'NORMAL',
    shortDesc: '175 HP • BALANCED DMG (-25%) • 2 POTIONS',
    color: '#fbbf24',
    hex: 0xfbbf24,
    hpBonus: 25,
    potionBonus: 0,
    enemyDamageMult: 0.75,
    enemyHpMult: 0.90,
    invulnSeconds: 0.70,
    orbHealBonus: 2,
    quartzMult: 1.0
  },
  cursed: {
    id: 'cursed',
    label: 'CURSED',
    shortDesc: '150 HP • FULL BRUTAL DMG • +25% QUARTZ',
    color: '#ef4444',
    hex: 0xef4444,
    hpBonus: 0,
    potionBonus: 0,
    enemyDamageMult: 1.05,
    enemyHpMult: 1.15,
    invulnSeconds: 0.55,
    orbHealBonus: 0,
    quartzMult: 1.25
  }
};

export const SANCTUARY_UPGRADES = [
  {
    id: 'unholy_vigor',
    name: 'Unholy Vigor',
    desc: '+25 Max HP per rank',
    icon: '❤️',
    maxLevel: 5,
    costs: [15, 30, 60, 120, 250],
    effect: (level) => ({ maxHp: level * 25 })
  },
  {
    id: 'abyssal_blade',
    name: 'Abyssal Edge',
    desc: '+10% Attack Damage per rank',
    icon: '⚔️',
    maxLevel: 5,
    costs: [20, 45, 90, 180, 350],
    effect: (level) => ({ damageMult: 1.0 + level * 0.10 })
  },
  {
    id: 'shadow_dash',
    name: 'Wraith Agility',
    desc: '-15% Dash Cooldown & Faster Movement',
    icon: '⚡',
    maxLevel: 3,
    costs: [25, 60, 150],
    effect: (level) => ({ dashCooldownMult: Math.max(0.55, 1.0 - level * 0.15), speedBonus: level * 12 })
  },
  {
    id: 'grave_bounty',
    name: 'Grave Robber',
    desc: 'Start each expedition with +60 Gold',
    icon: '🪙',
    maxLevel: 4,
    costs: [15, 35, 75, 150],
    effect: (level) => ({ startingGold: level * 60 })
  },
  {
    id: 'alchemist_pouch',
    name: 'Alchemist Belt',
    desc: 'Carry +1 Healing Draught into battle (Press F)',
    icon: '🧪',
    maxLevel: 3,
    costs: [30, 80, 200],
    effect: (level) => ({ maxPotions: 2 + level })
  },
  {
    id: 'corrupted_blood',
    name: 'Corrupted Essence',
    desc: '+15% faster Corruption accumulation for Beast Awakening',
    icon: '🩸',
    maxLevel: 3,
    costs: [25, 70, 160],
    effect: (level) => ({ corruptionMult: 1.0 + level * 0.15 })
  }
];

export class MetaProgression {
  static getInstance() {
    if (!MetaProgression._instance) {
      MetaProgression._instance = new MetaProgression();
    }
    return MetaProgression._instance;
  }

  constructor() {
    this.data = this.load();
  }

  get bloodQuartz() {
    return this.data.bloodQuartz;
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          bloodQuartz: Number(parsed.bloodQuartz) || 0,
          totalRuns: Number(parsed.totalRuns) || 0,
          bossesSlain: Number(parsed.bossesSlain) || 0,
          highestChamber: Number(parsed.highestChamber) || 1,
          upgrades: parsed.upgrades || {}
        };
      }
    } catch (e) {
      console.warn('Could not read save from localStorage, creating fresh save:', e);
    }
    return {
      bloodQuartz: 0,
      totalRuns: 0,
      bossesSlain: 0,
      highestChamber: 1,
      upgrades: {}
    };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  getBloodQuartz() {
    return this.data.bloodQuartz;
  }

  addBloodQuartz(amount) {
    if (amount <= 0) return this.data.bloodQuartz;
    this.data.bloodQuartz += Math.round(amount);
    this.save();
    EventBus.emit('meta:quartz_changed', this.data.bloodQuartz);
    return this.data.bloodQuartz;
  }

  getUpgradeLevel(id) {
    return this.data.upgrades[id] || 0;
  }

  canUpgrade(id) {
    const upgrade = SANCTUARY_UPGRADES.find(u => u.id === id);
    if (!upgrade) return false;
    const currentLvl = this.getUpgradeLevel(id);
    if (currentLvl >= upgrade.maxLevel) return false;
    const cost = upgrade.costs[currentLvl];
    return this.data.bloodQuartz >= cost;
  }

  purchaseUpgrade(id) {
    const upgrade = SANCTUARY_UPGRADES.find(u => u.id === id);
    if (!upgrade) return false;
    const currentLvl = this.getUpgradeLevel(id);
    if (currentLvl >= upgrade.maxLevel) return false;
    const cost = upgrade.costs[currentLvl];
    if (this.data.bloodQuartz < cost) return false;

    this.data.bloodQuartz -= cost;
    this.data.upgrades[id] = currentLvl + 1;
    this.save();
    EventBus.emit('meta:quartz_changed', this.data.bloodQuartz);
    EventBus.emit('meta:upgrade_purchased', { id, level: this.data.upgrades[id] });
    return true;
  }

  getCombinedStatBonuses() {
    let bonus = {
      maxHp: 0,
      damageMult: 1.0,
      dashCooldownMult: 1.0,
      speedBonus: 0,
      startingGold: 0,
      maxPotions: 2,
      corruptionMult: 1.0
    };

    SANCTUARY_UPGRADES.forEach(u => {
      const lvl = this.getUpgradeLevel(u.id);
      if (lvl > 0 && typeof u.effect === 'function') {
        const eff = u.effect(lvl);
        if (eff.maxHp) bonus.maxHp += eff.maxHp;
        if (eff.damageMult) bonus.damageMult *= eff.damageMult;
        if (eff.dashCooldownMult) bonus.dashCooldownMult *= eff.dashCooldownMult;
        if (eff.speedBonus) bonus.speedBonus += eff.speedBonus;
        if (eff.startingGold) bonus.startingGold += eff.startingGold;
        if (eff.maxPotions) bonus.maxPotions = Math.max(bonus.maxPotions, eff.maxPotions);
        if (eff.corruptionMult) bonus.corruptionMult *= eff.corruptionMult;
      }
    });

    return bonus;
  }

  getDifficultyMode() {
    try {
      const saved = localStorage.getItem(DIFFICULTY_KEY);
      if (saved && DIFFICULTY_MODES[saved]) return saved;
    } catch (e) { }
    return 'normal';
  }

  setDifficultyMode(modeId) {
    const valid = DIFFICULTY_MODES[modeId] ? modeId : 'normal';
    try {
      localStorage.setItem(DIFFICULTY_KEY, valid);
    } catch (e) { }
    return DIFFICULTY_MODES[valid];
  }

  getDifficultyConfig() {
    return DIFFICULTY_MODES[this.getDifficultyMode()] || DIFFICULTY_MODES.normal;
  }

  recordRunEnd({ chamber, bossKilled }) {
    this.data.totalRuns = (this.data.totalRuns || 0) + 1;
    if (chamber && chamber > this.data.highestChamber) {
      this.data.highestChamber = chamber;
    }
    if (bossKilled) {
      this.data.bossesSlain = (this.data.bossesSlain || 0) + 1;
    }
    this.save();
  }
}

export const metaProgression = MetaProgression.getInstance();
