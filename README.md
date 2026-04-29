# 🎩⚙️ Aether Runner — Steampunk Roguelike

> *A steampunk engineer survives endless waves of rebel automatons in a Victorian dystopian world.*

Aether Runner is a **Vampire Survivors-style roguelike** built with pure **JavaScript + HTML5 Canvas** — no external libraries, no installation required. Open `index.html` in any modern browser and start playing.

---

## 🎮 How to Play

1. **Download or clone** this repository.
2. Open `index.html` in a modern browser (Chrome, Firefox, Edge, Safari).
3. Press **Enter** or **click** to start.
4. Survive as long as possible!

---

## 🕹 Controls

| Action | Keys |
|--------|------|
| Move | **WASD** or **Arrow Keys** |
| Weapons | Fire **automatically** |
| Choose upgrade | **1 / 2 / 3** or **click** the card |
| Restart | **Enter** or click **RESTART** |

---

## 🤖 Enemies — Automaton Types

| # | Name | HP | Speed | XP | Notes |
|---|------|----|-------|----|-------|
| 1 | **Clockwork Drone** | 20 | Fast | 5 | Basic melee chaser |
| 2 | **Steam Golem** | 80 | Slow | 20 | Tanky, heavy melee damage |
| 3 | **Aether Turret** | 40 | Static | 15 | Charges and fires energy bolts |
| 4 | **Gear Spider** | 30 | Very fast | 10 | Zigzag movement |
| 5 | **Brass Titan** | 500 | Slow | 100 | BOSS — enrages below 50% HP |

Enemies spawn from the edges of the map and walk toward the player. Killing them drops **XP orbs** (auto-collected when within pickup radius).

---

## ⚔️ Weapons

| ID | Name | Description |
|----|------|-------------|
| `gear_shot` | **Gear Shot** | Spinning gear projectiles toward nearest enemy |
| `steam_burst` | **Steam Burst** | AoE steam cloud around the player |
| `tesla_coil` | **Tesla Coil** | Chain lightning between nearby enemies |
| `aether_cannon` | **Aether Cannon** | Slow but powerful piercing cannon ball |
| `clockwork_blades` | **Clockwork Blades** | Orbiting diamond blades around the player |
| `pipe_bomb` | **Pipe Bomb** | Arc-thrown explosive bomb with blast radius |

All weapons fire **automatically**. The player starts with **Gear Shot** and acquires more through level-up cards.

### Weapon Evolution
Two specific weapons, both at **max level (5)**, fuse into a more powerful evolved form:

| Combination | Result |
|-------------|--------|
| Gear Shot (Lv5) + Steam Burst (Lv5) | **Aether Engine** — 8-way gear shrapnel |
| Tesla Coil (Lv5) + Aether Cannon (Lv5) | **Galvanic Destroyer** — chain-lightning cannon |

---

## 📈 Upgrade System

Each time you level up, the game **pauses** and shows **3 upgrade cards**. Choose one:

- **Add a new weapon** (if you don't have it yet)
- **Upgrade an existing weapon** (increases damage, reduces cooldown, adds projectiles)
- **Upgrade player stats**: Max HP, Speed, Armor, XP Gain, Pickup Radius

---

## ⏱ Wave Progression

| Time | Event |
|------|-------|
| 0:00 | Clockwork Drones only |
| 1:00 | Gear Spiders added |
| 2:00 | Steam Golems added |
| 3:00 | First Brass Titan Boss |
| 4:00 | Aether Turrets added |
| 6:00 | Second Boss |
| 10:00 | Third Boss |

Spawn rate and batch size increase every 60 seconds.

---

## 🎨 Visual Style

- Dark steampunk palette: amber, copper, gold, electric blue
- All visuals drawn with Canvas 2D API (geometric shapes + steampunk details)
- Scrolling parallax factory/city silhouette background
- Screen vignette, particle effects (steam, sparks, gear fragments, XP orbs)
- Retro Courier New monospace font throughout

---

## 🗂 File Structure

```
AetherRunner/
├── index.html          <- Entry point
├── css/
│   └── style.css       <- Retro/steampunk UI styling
└── js/
    ├── utils.js        <- Helper functions, collision, math
    ├── particles.js    <- Particle effects (steam, sparks, gears)
    ├── player.js       <- Player class, movement, stats
    ├── projectile.js   <- Projectile logic
    ├── enemy.js        <- Enemy classes (5 automaton types)
    ├── weapon.js       <- Weapon classes (6 weapons + 2 evolutions)
    ├── upgrade.js      <- Upgrade/leveling system
    ├── wave.js         <- Wave/spawner system
    ├── ui.js           <- HUD, menus, level-up screen, game over
    └── main.js         <- Game loop, init, state management
```

---

## 🔧 Tech Stack

- Language: Vanilla JavaScript (ES6+)
- Renderer: HTML5 Canvas 2D API
- Dependencies: None — pure browser, zero build step
- Canvas size: 800 x 600 px, centred and responsive
- Frame rate: 60 FPS via requestAnimationFrame + delta time

---

## 🗺 Roadmap

- Mobile / touch controls
- Persistent leaderboard (localStorage or online)
- More enemy types (Cogsworth Sentinel, Aether Wraith)
- More weapons (Smoke Grenade, Gatling Gear)
- More weapon evolutions
- Unlockable characters (Clockwork Alchemist, Brass Gunslinger)
- Procedural map tiles instead of flat background
- Sound effects and music (Web Audio API)
- Achievements system
- Online multiplayer co-op

---

*Made with love — no frameworks, just Canvas.*
