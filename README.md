# Cursed Crusader: The Beast Within ⚔️🩸

> A fast-paced, high-craft 16-bit Gothicvania Rogue-lite inspired by *Skul: The Hero Slayer* and *Castlevania*.

[![Deploy to GitHub Pages](https://github.com/Lynxx39/cursed-crusader/actions/workflows/deploy.yml/badge.svg)](https://github.com/Lynxx39/cursed-crusader/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/Play-Live%20Demo-red.svg)](https://lynxx39.github.io/cursed-crusader/)

---

## 🎮 Play Online Now!
👉 **[Play Cursed Crusader on GitHub Pages](https://lynxx39.github.io/cursed-crusader/)** 👈

---

## 🕹️ Controls

| Action | Primary Key | Secondary Key | Description |
| :--- | :--- | :--- | :--- |
| **Move** | `A` / `D` | `←` / `→` | Run left and right |
| **Jump** | `W` | `Space` | Variable-height jump with Coyote Time & Buffer |
| **Double Jump**| `W` / `Space` (in air) | — | Vault higher across deep chasms |
| **Attack (Slash)** | `LMB` (Left Click) | — | 3-Hit directional sword combo |
| **Dash** | `RMB` (Right Click) | `Shift` | High-speed invulnerable directional dodge |
| **Holy Parry** | `K` | `X` | Deflect projectiles and stagger enemies with cyan freeze |
| **Awaken Beast**| `U` | — | Transform at 100% Corruption into Blood Fiend / Void Reaper |
| **Beast Finisher**| `I` | — | Devastating screen-clearing finisher unleashing shockwaves |
| **Interact / Enter**| `E` / `W` | Click Portal | Enter chamber portals & pray at the Blood Shrine |
| **Toggle Hint** | `H` | — | Hide or show the bottom controls hint bar |

---

## 🗡️ Key Gameplay Features

- **Skul-Inspired Progression & Choice Portals**:
  - Purify chambers across 5 sprawling zones (Cathedral Courtyard, Catacombs, Forgotten Spire, Armory, Boss Arena).
  - Select between **Portals of Destiny** at the end of each chamber:
    - 🟡 **Portal of Greed**: +150 Gold & Bounty
    - 🟣 **Portal of Relics**: Select 1 of 3 ancient relics with unique synergies
    - 🔴 **Portal of the Beast**: +30% Corruption & Blood Frenzy
- **Directional Mouse Combat & Responsive Movement**:
  - Attacks follow the exact mouse cursor aim with fluid 3-hit combo animation and directional slashes.
  - Right-click directional dashing cancels attack recovery and grants i-frames through enemy attacks.
- **The Beast Within (Corruption Mechanic)**:
  - Slaying ghouls, snipers, and elites fills your Corruption gauge.
  - At 100% Corruption, unleash the **Beast Form** (`U`) with increased speed, fiery claws, and a screen-clearing finisher (`I`).
- **Altar of Sacrifice (Blood Shrine)**:
  - Trade 15 HP for 100 Gold and temporary Blood Frenzy buff.
- **Epic Boss Encounter**:
  - Challenge **High Inquisitor Malakor** with a multi-phase boss fight, teleportation, fireball salvos, and desperate rage phases.

---

## 🛠️ Built With

- **Phaser 4 / 3.80+** (WebGL, Arcade Physics)
- **Vite 8** (High-speed module bundling)
- **Web Audio API Sound Synthesizer** (Zero external audio asset dependency)
- **Procedural Canvas 16-Bit Pixel Art Pipeline**

---

## 🚀 Local Development

```bash
# Clone the repository
git clone https://github.com/Lynxx39/cursed-crusader.git

# Enter the project directory
cd cursed-crusader

# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://127.0.0.1:5173` in your browser.
