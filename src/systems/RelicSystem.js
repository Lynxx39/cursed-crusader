// RelicSystem.js - Inscription Synergies & Passive Artefacts
import { EventBus } from '../core/EventBus.js';
import { MetaProgression } from './MetaProgression.js';

export const RELIC_DATABASE = [
  {
    id: 'sacred_relic_chasm',
    name: 'Blade of the Martyr',
    description: '+25% Sword Damage. Fills Corruption 30% faster.',
    inscriptions: ['Holy Smite', 'Iron Bastion'],
    iconFrame: 343,
    stats: { damageMult: 1.25, corruptionGainMult: 1.3 }
  },
  {
    id: 'frenzied_fang',
    name: 'Frenzied Wolf Fang',
    description: '+20% Attack Speed. Claws apply Bleed damage.',
    inscriptions: ['Blood Frenzy'],
    iconFrame: 20,
    stats: { attackSpeedMult: 1.2, bleedChance: 0.3 }
  },
  {
    id: 'void_sigil_eye',
    name: 'Eye of the Void',
    description: 'Void Waves travel faster and pierce through all foes.',
    inscriptions: ['Abyssal Void'],
    iconFrame: 135,
    stats: { voidPierce: true, critChance: 0.2 }
  },
  {
    id: 'iron_parry_aegis',
    name: 'Aegis of the Fallen',
    description: 'Parry window +0.06s. Parrying reflects 250% damage.',
    inscriptions: ['Iron Bastion'],
    iconFrame: 295,
    stats: { parryWindowBonus: 0.06, parryReflect: 2.5 }
  },
  {
    id: 'blood_chalice_chalice',
    name: 'Chalice of Crimson Vows',
    description: '+15% Lifesteal during Beast Mode. Blood Orbs heal +6 HP.',
    inscriptions: ['Blood Frenzy', 'Holy Smite'],
    iconFrame: 139,
    stats: { lifestealBonus: 0.15, orbHeal: 6 }
  },
  {
    id: 'gargoyle_heart_stone',
    name: 'Obsidian Heart',
    description: '+60 Max HP. Ground slams cause giant seismic shockwaves.',
    inscriptions: ['Iron Bastion', 'Abyssal Void'],
    iconFrame: 134,
    stats: { maxHpBonus: 60, slamShockwave: true }
  },
  {
    id: 'crown_of_thorns',
    name: 'Crown of the Defiled',
    description: '+30% Critical Strike Damage. Enemies explode into blood on death.',
    inscriptions: ['Blood Frenzy', 'Abyssal Void'],
    iconFrame: 302,
    stats: { critDamageBonus: 0.3, bloodExplosion: true }
  },
  {
    id: 'reliquary_of_dawn',
    name: 'Sunfire Reliquary',
    description: 'Attacks unleash holy light arcs dealing bonus radiant damage.',
    inscriptions: ['Holy Smite'],
    iconFrame: 37,
    stats: { holyArcDamage: 20 }
  }
];

export const QUINTESSENCE_DATABASE = [
  {
    id: 'infernal_eye',
    name: 'Infernal Eye',
    description: '[G] Summon 5 Abyssal Meteor Bolts upon nearby foes (12s CD).',
    inscriptions: ['Abyssal Void', 'Holy Smite'],
    iconFrame: 241,
    cooldown: 12.0
  },
  {
    id: 'blood_titan',
    name: "Titan's Heart",
    description: '[G] Seismic AoE Slam, +20 HP & 3s Iron Armor (14s CD).',
    inscriptions: ['Iron Bastion', 'Blood Frenzy'],
    iconFrame: 129,
    cooldown: 14.0
  },
  {
    id: 'raven_feather',
    name: 'Raven Tempest',
    description: '[G] Unleash a piercing 4-wave Crescent Volley (10s CD).',
    inscriptions: ['Blood Frenzy', 'Abyssal Void'],
    iconFrame: 17,
    cooldown: 10.0
  }
];

export class RelicSystem {
  constructor(player) {
    this.player = player;
    this.equippedRelics = [];
    this.equippedQuintessence = null;
    this.inscriptionCounts = {};
  }

  equipQuintessence(quintOrId) {
    const id = (typeof quintOrId === 'string') ? quintOrId : quintOrId?.id;
    const q = QUINTESSENCE_DATABASE.find(item => item.id === id) || (typeof quintOrId === 'object' ? quintOrId : null);
    if (!q || !q.id) return false;
    this.equippedQuintessence = q;
    if (this.player) {
      this.player.quintessence = q;
      this.player.quintessenceCooldown = 0;
    }
    this.recalculateSynergies();
    try {
      localStorage.setItem('cursed_crusader_quintessence', q.id);
    } catch (e) {}
    EventBus.emit('quintessence:equipped', { quintessence: q, synergies: this.inscriptionCounts });
    return true;
  }

  addRelic(relicOrId) {
    const id = (typeof relicOrId === 'string') ? relicOrId : (relicOrId?.id);
    const relic = RELIC_DATABASE.find(r => r.id === id) || (typeof relicOrId === 'object' ? relicOrId : null);
    if (!relic || !relic.id) return false;

    // Check if already equipped
    if (!this.equippedRelics.some(r => r.id === relic.id)) {
      this.equippedRelics.push(relic);
    }

    this.recalculateSynergies();
    try {
      localStorage.setItem('cursed_crusader_relics', JSON.stringify(this.equippedRelics.map(r => r.id)));
    } catch (e) {}

    EventBus.emit('relic:acquired', { relic, all: this.equippedRelics, synergies: this.inscriptionCounts });
    return true;
  }

  recalculateSynergies() {
    this.inscriptionCounts = {};
    for (const r of this.equippedRelics) {
      if (r.inscriptions) {
        for (const ins of r.inscriptions) {
          this.inscriptionCounts[ins] = (this.inscriptionCounts[ins] || 0) + 1;
        }
      }
    }
    if (this.equippedQuintessence && this.equippedQuintessence.inscriptions) {
      for (const ins of this.equippedQuintessence.inscriptions) {
        this.inscriptionCounts[ins] = (this.inscriptionCounts[ins] || 0) + 1;
      }
    }

    // Apply stat modifiers to player (preserving MetaProgression bonuses!)
    if (this.player) {
      const metaBonuses = MetaProgression.getInstance().getCombinedStatBonuses();
      let dmg = metaBonuses.damageMult || 1.0;
      let hpBonus = 0;
      let lifesteal = 0.15; // base 15%
      let parryBonus = 0;
      let attackSpeed = 1.0;
      let corruptionMult = metaBonuses.corruptionMult || 1.0;
      let critChance = 0.10;
      let critDmgBonus = 0.0;
      let parryReflect = 1.0;
      let orbHeal = 0;
      let bleedChance = 0;
      let voidPierce = false;
      let slamShockwave = false;
      let bloodExplosion = false;
      let holyArcDamage = 0;
      let skillCooldownMult = 1.0;
      let damageReduction = 0.0;
      let holySmiteLightning = false;
      let crimsonCarnage = false;

      for (const r of this.equippedRelics) {
        if (!r.stats) continue;
        if (r.stats.damageMult) dmg *= r.stats.damageMult;
        if (r.stats.maxHpBonus) hpBonus += r.stats.maxHpBonus;
        if (r.stats.lifestealBonus) lifesteal += r.stats.lifestealBonus;
        if (r.stats.parryWindowBonus) parryBonus += r.stats.parryWindowBonus;
        if (r.stats.attackSpeedMult) attackSpeed *= r.stats.attackSpeedMult;
        if (r.stats.corruptionGainMult) corruptionMult *= r.stats.corruptionGainMult;
        if (r.stats.critChance) critChance += r.stats.critChance;
        if (r.stats.critDamageBonus) critDmgBonus += r.stats.critDamageBonus;
        if (r.stats.parryReflect) parryReflect = Math.max(parryReflect, r.stats.parryReflect);
        if (r.stats.orbHeal) orbHeal += r.stats.orbHeal;
        if (r.stats.bleedChance) bleedChance += r.stats.bleedChance;
        if (r.stats.voidPierce) voidPierce = true;
        if (r.stats.slamShockwave) slamShockwave = true;
        if (r.stats.bloodExplosion) bloodExplosion = true;
        if (r.stats.holyArcDamage) holyArcDamage += r.stats.holyArcDamage;
      }

      // Check Inscription thresholds (2-piece and 4-piece Skul set bonuses!)
      const holyCnt = this.inscriptionCounts['Holy Smite'] || 0;
      if (holyCnt >= 2) {
        dmg *= 1.25;
        holyArcDamage += 20;
      }
      if (holyCnt >= 4) {
        holySmiteLightning = true;
        dmg *= 1.15;
      }

      const frenzyCnt = this.inscriptionCounts['Blood Frenzy'] || 0;
      if (frenzyCnt >= 2) {
        lifesteal += 0.12;
        attackSpeed *= 1.25;
      }
      if (frenzyCnt >= 4) {
        crimsonCarnage = true;
        attackSpeed *= 1.15;
      }

      const bastionCnt = this.inscriptionCounts['Iron Bastion'] || 0;
      if (bastionCnt >= 2) {
        parryBonus += 0.06;
        parryReflect += 1.2;
      }
      if (bastionCnt >= 4) {
        damageReduction = Math.min(0.4, damageReduction + 0.20);
        slamShockwave = true;
      }

      const voidCnt = this.inscriptionCounts['Abyssal Void'] || 0;
      if (voidCnt >= 2) {
        critChance += 0.15;
        voidPierce = true;
      }
      if (voidCnt >= 4) {
        critDmgBonus += 0.45;
        skillCooldownMult *= 0.75;
      }

      this.player.statMods = {
        damageMult: dmg,
        maxHpBonus: hpBonus,
        lifesteal: lifesteal,
        parryWindowBonus: parryBonus,
        attackSpeedMult: attackSpeed,
        corruptionGainMult: corruptionMult,
        critChance: critChance,
        critDamageBonus: critDmgBonus,
        parryReflect: parryReflect,
        orbHeal: orbHeal,
        bleedChance: bleedChance,
        voidPierce: voidPierce,
        slamShockwave: slamShockwave,
        bloodExplosion: bloodExplosion,
        holyArcDamage: holyArcDamage,
        skillCooldownMult: skillCooldownMult,
        damageReduction: damageReduction,
        holySmiteLightning: holySmiteLightning,
        crimsonCarnage: crimsonCarnage
      };

      const targetMaxHp = 150 + (metaBonuses.maxHp || 0) + hpBonus;
      if (this.player.maxHp !== targetMaxHp) {
        const diff = targetMaxHp - this.player.maxHp;
        this.player.maxHp = targetMaxHp;
        if (diff > 0) this.player.hp += diff;
        this.player.hp = Math.min(this.player.hp, this.player.maxHp);
        EventBus.emit('player:hp_changed', { current: this.player.hp, max: this.player.maxHp });
      }
    }
  }

  getThreeRandomChoices() {
    const unequipped = RELIC_DATABASE.filter(r => !this.equippedRelics.some(eq => eq.id === r.id));
    const pool = unequipped.length >= 3 ? unequipped : RELIC_DATABASE;
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }
}

export default RelicSystem;
