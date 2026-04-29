/* ============================================================
   upgrade.js — Upgrade / leveling system and card generation
   ============================================================ */

'use strict';

const Upgrade = (() => {

  // ---- Card definitions ----

  /** Player stat upgrade cards */
  const STAT_UPGRADES = [
    {
      id: 'hp_up',
      name: '+30 Max HP',
      description: 'Reinforce your boiler suit. Maximum HP +30.',
      icon: '❤',
      apply(player) { player.upgradeMaxHp(30); }
    },
    {
      id: 'speed_up',
      name: 'Boots of Haste',
      description: 'Steam-powered boots. Movement speed +20.',
      icon: '👟',
      apply(player) { player.upgradeSpeed(20); }
    },
    {
      id: 'armor_up',
      name: 'Copper Plating',
      description: 'Thick copper plates. Armor +3.',
      icon: '🛡',
      apply(player) { player.upgradeArmor(3); }
    },
    {
      id: 'xp_up',
      name: 'Aether Resonator',
      description: 'Harness ambient aether. XP gain ×1.25.',
      icon: '✨',
      apply(player) { player.upgradeXpMult(0.25); }
    },
    {
      id: 'pickup_up',
      name: 'Magnetic Coil',
      description: 'XP orbs are attracted from farther away. Pickup radius +40.',
      icon: '🧲',
      apply(player) { player.upgradePickupRadius(40); }
    },
    {
      id: 'heal',
      name: 'Field Repair',
      description: 'Emergency steam patch. Restore 40 HP.',
      icon: '🔧',
      apply(player) { player.heal(40); }
    }
  ];

  /**
   * Generate 3 upgrade cards for the level-up screen.
   * Prefers offering new weapons, then weapon upgrades, then stat upgrades.
   * Never shows an already-evolved weapon.
   */
  function generateCards(player) {
    const cards = [];
    const ownedIds = new Set(player.weapons.map(w => w.id));

    // Option 1: Offer a weapon the player doesn't have
    const unowned = BASE_WEAPON_IDS.filter(id => !ownedIds.has(id));
    const shuffledUnowned = Utils.shuffle([...unowned]);

    // Option 2: Offer an upgrade to an existing weapon
    const upgradeable = player.weapons.filter(w =>
      w.level < w.maxLevel &&
      BASE_WEAPON_IDS.includes(w.id)
    );
    const shuffledUpgradeable = Utils.shuffle([...upgradeable]);

    // Option 3: Stat upgrades
    const shuffledStats = Utils.shuffle([...STAT_UPGRADES]);

    let pool = [];

    // Fill up to 2 weapon-related cards (new or upgrade)
    for (const id of shuffledUnowned.slice(0, 2)) {
      if (pool.length >= 2) break;
      const w = WeaponDefs[id]();
      pool.push({
        type: 'new_weapon',
        weaponId: id,
        name: w.name,
        description: `NEW: ${w.description}`,
        icon: w.icon
      });
    }
    for (const w of shuffledUpgradeable.slice(0, 2)) {
      if (pool.length >= 2) break;
      pool.push({
        type: 'upgrade_weapon',
        weaponId: w.id,
        name: `${w.name} Lv.${w.level + 1}`,
        description: `Upgrade: ${w.description}`,
        icon: w.icon
      });
    }

    // Fill remaining with stats
    const needed = 3 - pool.length;
    for (const stat of shuffledStats.slice(0, needed)) {
      pool.push({
        type: 'stat',
        statId: stat.id,
        name: stat.name,
        description: stat.description,
        icon: stat.icon
      });
    }

    // Ensure exactly 3 cards
    pool = pool.slice(0, 3);
    while (pool.length < 3) {
      pool.push(Utils.randChoice(shuffledStats));
    }

    return pool;
  }

  /**
   * Apply a chosen card to the player.
   */
  function applyCard(card, player) {
    if (card.type === 'new_weapon') {
      const newWeapon = WeaponDefs[card.weaponId]();
      player.weapons.push(newWeapon);
    } else if (card.type === 'upgrade_weapon') {
      const w = player.weapons.find(pw => pw.id === card.weaponId);
      if (w) w.upgrade();
    } else if (card.type === 'stat') {
      const def = STAT_UPGRADES.find(s => s.id === card.statId);
      if (def) def.apply(player);
    }

    // Check for weapon evolution
    const evoId = checkEvolution(player.weapons);
    if (evoId) {
      return evoId; // signal to caller to add evolution
    }
    return null;
  }

  return { generateCards, applyCard };

})();
