extends Node
## Static game data: classes, skills, items, enemies, companions, regions and story text.

const MAX_LEVEL := 30
const PARTY_SIZE := 4
const MAX_AP := 9

const ELEMENTS := ["physical", "fire", "ice", "earth", "wind", "light", "dark"]
const ELEMENT_COLORS := {
	"physical": Color("dfe6f4"), "fire": Color("ff7a2a"), "ice": Color("9ae8ff"), "earth": Color("c8a070"),
	"wind": Color("a8f0c8"), "light": Color("ffe27a"), "dark": Color("b07aff"), "heal": Color("7af0a0"),
}

# ---------------------------------------------------------------------------
# CLASSES
# stats: hp, mp, str, mag, def, res, spd, luck  (base at level 1, growth per level)
# ---------------------------------------------------------------------------
const CLASSES := {
	"knight": {
		"name_m": "Knight", "name_f": "Valkyrie", "role": "Sworn Defender",
		"desc": "Steel-clad guardian. Absorbs punishment, shields allies and answers every blow with a holy counter.",
		"base": {"hp": 46, "mp": 14, "str": 11, "mag": 5, "def": 10, "res": 7, "spd": 7, "luck": 5},
		"growth": {"hp": 9.0, "mp": 1.6, "str": 2.1, "mag": 0.8, "def": 2.0, "res": 1.3, "spd": 0.9, "luck": 0.6},
		"weapons": ["sword", "mace", "axe"], "armors": ["tunic", "chain", "plate", "vestment"],
		"start_weapon": "sword_iron", "start_armor": "chain_mail",
		"skills": [[1, "shield_bash"], [1, "bulwark"], [3, "holy_strike"], [5, "taunt"], [8, "rally"], [12, "judgement"], [16, "aegis"], [20, "radiant_blade"]],
		"tint": Color("c8ccd8"),
	},
	"mage": {
		"name_m": "Mage", "name_f": "Siren", "role": "Arcane Weaver",
		"desc": "A conduit of raw elemental power. Fragile, but no creature of the Veil can withstand a fully charged storm.",
		"base": {"hp": 30, "mp": 34, "str": 4, "mag": 13, "def": 4, "res": 10, "spd": 8, "luck": 6},
		"growth": {"hp": 5.0, "mp": 4.2, "str": 0.6, "mag": 2.6, "def": 0.9, "res": 2.0, "spd": 1.0, "luck": 0.7},
		"weapons": ["staff", "dagger"], "armors": ["tunic", "robe"],
		"start_weapon": "staff_oak", "start_armor": "robe_apprentice",
		"skills": [[1, "firebolt"], [1, "frost_shard"], [3, "gale"], [5, "mana_shield"], [8, "inferno"], [12, "blizzard"], [16, "arcane_surge"], [20, "cataclysm"]],
		"tint": Color("b07aff"),
	},
	"rogue": {
		"name_m": "Rogue", "name_f": "Shadow", "role": "Blade Dancer",
		"desc": "Fast, precise, merciless. Strikes first, exploits every opening and vanishes before the counter lands.",
		"base": {"hp": 36, "mp": 18, "str": 9, "mag": 6, "def": 6, "res": 6, "spd": 12, "luck": 10},
		"growth": {"hp": 6.5, "mp": 2.0, "str": 1.9, "mag": 0.9, "def": 1.2, "res": 1.1, "spd": 1.8, "luck": 1.4},
		"weapons": ["dagger", "sword", "bow"], "armors": ["tunic", "leather"],
		"start_weapon": "dagger_iron", "start_armor": "leather_scout",
		"skills": [[1, "backstab"], [1, "venom_edge"], [3, "flurry"], [5, "smoke_step"], [8, "mark_prey"], [12, "shadow_dance"], [16, "assassinate"], [20, "thousand_cuts"]],
		"tint": Color("6a4a8a"),
	},
	"ranger": {
		"name_m": "Ranger", "name_f": "Huntress", "role": "Wilds Hunter",
		"desc": "Master of the bow and the wild wind. Reliable ranged damage that punishes flying beasts and broken foes.",
		"base": {"hp": 38, "mp": 20, "str": 10, "mag": 7, "def": 6, "res": 7, "spd": 10, "luck": 8},
		"growth": {"hp": 7.0, "mp": 2.2, "str": 2.0, "mag": 1.1, "def": 1.2, "res": 1.3, "spd": 1.5, "luck": 1.0},
		"weapons": ["bow", "dagger"], "armors": ["tunic", "leather", "ranger"],
		"start_weapon": "bow_hunting", "start_armor": "ranger_jerkin",
		"skills": [[1, "aimed_shot"], [1, "piercing_arrow"], [3, "volley"], [5, "hunters_focus"], [8, "gale_arrow"], [12, "pin_down"], [16, "storm_of_arrows"], [20, "eagle_eye"]],
		"tint": Color("3f8f3a"),
	},
	"brute": {
		"name_m": "Berserker", "name_f": "Valkyr Fury", "role": "Unbound Wrath",
		"desc": "Raw muscle and rage. Enormous health, crushing blows, and attacks that grow stronger the more they bleed.",
		"base": {"hp": 56, "mp": 10, "str": 13, "mag": 3, "def": 7, "res": 4, "spd": 6, "luck": 5},
		"growth": {"hp": 11.0, "mp": 1.2, "str": 2.6, "mag": 0.5, "def": 1.5, "res": 0.8, "spd": 0.8, "luck": 0.6},
		"weapons": ["axe", "mace", "sword"], "armors": ["tunic", "hide", "chain"],
		"start_weapon": "axe_iron", "start_armor": "hide_barbarian",
		"skills": [[1, "crush"], [1, "war_cry"], [3, "cleave"], [5, "reckless_swing"], [8, "earthshaker"], [12, "blood_rage"], [16, "titan_slam"], [20, "ragnarok"]],
		"tint": Color("c7563a"),
	},
	"inquisitor": {
		"name_m": "Inquisitor", "name_f": "Oracle", "role": "Radiant Judge",
		"desc": "A martial caster of the old faith. Mends wounds, smites the profane, and bends light to shield the party.",
		"base": {"hp": 40, "mp": 26, "str": 8, "mag": 10, "def": 7, "res": 9, "spd": 8, "luck": 7},
		"growth": {"hp": 7.5, "mp": 3.2, "str": 1.5, "mag": 2.0, "def": 1.4, "res": 1.8, "spd": 1.0, "luck": 0.8},
		"weapons": ["mace", "staff", "sword"], "armors": ["tunic", "chain", "vestment"],
		"start_weapon": "mace_iron", "start_armor": "vestment_acolyte",
		"skills": [[1, "mend"], [1, "smite"], [3, "purify"], [5, "ward"], [8, "holy_nova"], [12, "greater_mend"], [16, "resurrect"], [20, "divine_wrath"]],
		"tint": Color("ffd86a"),
	},
}

# ---------------------------------------------------------------------------
# SKILLS
# kind: attack (uses str/def) | spell (mag/res) | heal | buff | debuff
# target: enemy | enemies | ally | allies | self
# anim: swing | staff | bow | cast     fx: effect sheet name
# ---------------------------------------------------------------------------
const SKILLS := {
	# knight
	"shield_bash": {"name": "Shield Bash", "ap": 1, "mp": 0, "kind": "attack", "element": "physical", "power": 1.1, "hits": 1, "target": "enemy", "break": 2, "status": {"id": "stun", "chance": 0.35, "turns": 1}, "anim": "swing", "fx": "hit", "desc": "A stunning slam. Heavy break damage, may stun."},
	"bulwark": {"name": "Bulwark", "ap": 1, "mp": 3, "kind": "buff", "target": "self", "status": {"id": "shield", "chance": 1.0, "turns": 3}, "anim": "cast", "fx": "shield", "desc": "Halve incoming damage for 3 turns and widen your parry window."},
	"holy_strike": {"name": "Holy Strike", "ap": 2, "mp": 4, "kind": "attack", "element": "light", "power": 1.6, "hits": 1, "target": "enemy", "break": 1, "anim": "swing", "fx": "light", "desc": "A blade wreathed in light. Devastating to the undead."},
	"taunt": {"name": "Taunt", "ap": 1, "mp": 2, "kind": "buff", "target": "self", "status": {"id": "taunt", "chance": 1.0, "turns": 2}, "anim": "cast", "fx": "buff", "desc": "Draw all enemy attacks to yourself for 2 turns."},
	"rally": {"name": "Rally", "ap": 2, "mp": 6, "kind": "buff", "target": "allies", "status": {"id": "might", "chance": 1.0, "turns": 3}, "anim": "cast", "fx": "buff", "desc": "Raise the whole party's attack for 3 turns."},
	"judgement": {"name": "Judgement", "ap": 3, "mp": 8, "kind": "attack", "element": "light", "power": 2.4, "hits": 1, "target": "enemy", "break": 3, "anim": "swing", "fx": "light", "desc": "A sky-splitting blow that ignores half of the target's defense."},
	"aegis": {"name": "Aegis", "ap": 3, "mp": 10, "kind": "buff", "target": "allies", "status": {"id": "shield", "chance": 1.0, "turns": 2}, "anim": "cast", "fx": "shield", "desc": "Shield the entire party for 2 turns."},
	"radiant_blade": {"name": "Radiant Blade", "ap": 5, "mp": 14, "kind": "attack", "element": "light", "power": 1.4, "hits": 3, "target": "enemy", "break": 2, "anim": "swing", "fx": "light", "desc": "Three blinding strikes."},
	# mage
	"firebolt": {"name": "Firebolt", "ap": 1, "mp": 3, "kind": "spell", "element": "fire", "power": 1.5, "hits": 1, "target": "enemy", "break": 1, "status": {"id": "burn", "chance": 0.3, "turns": 3}, "anim": "cast", "fx": "fire", "desc": "Hurl a bolt of flame. May burn."},
	"frost_shard": {"name": "Frost Shard", "ap": 1, "mp": 3, "kind": "spell", "element": "ice", "power": 1.4, "hits": 1, "target": "enemy", "break": 1, "status": {"id": "freeze", "chance": 0.2, "turns": 1}, "anim": "cast", "fx": "ice", "desc": "A piercing shard of ice. May freeze."},
	"gale": {"name": "Gale", "ap": 2, "mp": 5, "kind": "spell", "element": "wind", "power": 1.1, "hits": 1, "target": "enemies", "break": 1, "anim": "cast", "fx": "wind", "desc": "A cutting wind that strikes every enemy."},
	"mana_shield": {"name": "Mana Shield", "ap": 1, "mp": 4, "kind": "buff", "target": "self", "status": {"id": "shield", "chance": 1.0, "turns": 3}, "anim": "cast", "fx": "shield", "desc": "Weave a barrier of mana around yourself."},
	"inferno": {"name": "Inferno", "ap": 3, "mp": 9, "kind": "spell", "element": "fire", "power": 1.7, "hits": 1, "target": "enemies", "break": 2, "status": {"id": "burn", "chance": 0.5, "turns": 3}, "anim": "staff", "fx": "fire", "desc": "Engulf all enemies in flame."},
	"blizzard": {"name": "Blizzard", "ap": 3, "mp": 9, "kind": "spell", "element": "ice", "power": 1.6, "hits": 1, "target": "enemies", "break": 2, "status": {"id": "freeze", "chance": 0.3, "turns": 1}, "anim": "staff", "fx": "ice", "desc": "A killing frost over the whole field."},
	"arcane_surge": {"name": "Arcane Surge", "ap": 2, "mp": 6, "kind": "buff", "target": "self", "status": {"id": "focus", "chance": 1.0, "turns": 3}, "anim": "cast", "fx": "buff", "desc": "Greatly raise magic power for 3 turns."},
	"cataclysm": {"name": "Cataclysm", "ap": 5, "mp": 18, "kind": "spell", "element": "dark", "power": 3.2, "hits": 1, "target": "enemies", "break": 4, "anim": "staff", "fx": "dark", "desc": "Tear the Veil open above the battlefield."},
	# rogue
	"backstab": {"name": "Backstab", "ap": 1, "mp": 0, "kind": "attack", "element": "physical", "power": 1.5, "hits": 1, "target": "enemy", "break": 1, "crit": 0.35, "anim": "swing", "fx": "slash", "desc": "A vicious strike with a high critical chance."},
	"venom_edge": {"name": "Venom Edge", "ap": 1, "mp": 2, "kind": "attack", "element": "physical", "power": 1.0, "hits": 1, "target": "enemy", "break": 1, "status": {"id": "poison", "chance": 0.8, "turns": 4}, "anim": "swing", "fx": "poison", "desc": "Coated blades that poison the target."},
	"flurry": {"name": "Flurry", "ap": 2, "mp": 3, "kind": "attack", "element": "physical", "power": 0.7, "hits": 3, "target": "enemy", "break": 1, "anim": "swing", "fx": "slash", "desc": "Three rapid cuts."},
	"smoke_step": {"name": "Smoke Step", "ap": 1, "mp": 3, "kind": "buff", "target": "self", "status": {"id": "evade", "chance": 1.0, "turns": 2}, "anim": "cast", "fx": "wind", "desc": "Vanish into smoke: auto-dodge the next attacks and gain haste."},
	"mark_prey": {"name": "Mark Prey", "ap": 1, "mp": 3, "kind": "debuff", "target": "enemy", "status": {"id": "marked", "chance": 1.0, "turns": 3}, "anim": "cast", "fx": "dark", "desc": "Mark a target: it takes 30% more damage from everyone."},
	"shadow_dance": {"name": "Shadow Dance", "ap": 3, "mp": 6, "kind": "attack", "element": "dark", "power": 0.9, "hits": 4, "target": "enemy", "break": 1, "anim": "swing", "fx": "dark", "desc": "Four shadow-laced strikes."},
	"assassinate": {"name": "Assassinate", "ap": 4, "mp": 8, "kind": "attack", "element": "physical", "power": 3.4, "hits": 1, "target": "enemy", "break": 2, "crit": 0.5, "anim": "swing", "fx": "slash", "desc": "A single lethal thrust. Massive damage to broken foes."},
	"thousand_cuts": {"name": "Thousand Cuts", "ap": 5, "mp": 12, "kind": "attack", "element": "physical", "power": 0.6, "hits": 6, "target": "enemies", "break": 1, "anim": "swing", "fx": "slash", "desc": "Cut down everything that moves."},
	# ranger
	"aimed_shot": {"name": "Aimed Shot", "ap": 1, "mp": 0, "kind": "attack", "element": "physical", "power": 1.4, "hits": 1, "target": "enemy", "break": 1, "crit": 0.2, "anim": "bow", "fx": "hit", "desc": "A carefully placed arrow."},
	"piercing_arrow": {"name": "Piercing Arrow", "ap": 1, "mp": 2, "kind": "attack", "element": "physical", "power": 1.2, "hits": 1, "target": "enemy", "break": 2, "pierce": true, "anim": "bow", "fx": "hit", "desc": "Ignores armor. Extra break damage."},
	"volley": {"name": "Volley", "ap": 2, "mp": 4, "kind": "attack", "element": "physical", "power": 0.9, "hits": 1, "target": "enemies", "break": 1, "anim": "bow", "fx": "hit", "desc": "A rain of arrows over every enemy."},
	"hunters_focus": {"name": "Hunter's Focus", "ap": 1, "mp": 3, "kind": "buff", "target": "self", "status": {"id": "might", "chance": 1.0, "turns": 3}, "anim": "cast", "fx": "buff", "desc": "Steady your aim: raise attack and crit chance."},
	"gale_arrow": {"name": "Gale Arrow", "ap": 2, "mp": 5, "kind": "attack", "element": "wind", "power": 1.7, "hits": 1, "target": "enemy", "break": 1, "anim": "bow", "fx": "wind", "desc": "An arrow wrapped in wind. Strong against flyers."},
	"pin_down": {"name": "Pin Down", "ap": 2, "mp": 5, "kind": "attack", "element": "physical", "power": 1.2, "hits": 1, "target": "enemy", "break": 3, "status": {"id": "stun", "chance": 0.5, "turns": 1}, "anim": "bow", "fx": "hit", "desc": "Pin the target's limb. Heavy break damage."},
	"storm_of_arrows": {"name": "Storm of Arrows", "ap": 4, "mp": 9, "kind": "attack", "element": "wind", "power": 0.8, "hits": 3, "target": "enemies", "break": 1, "anim": "bow", "fx": "wind", "desc": "Three volleys in a heartbeat."},
	"eagle_eye": {"name": "Eagle Eye", "ap": 5, "mp": 12, "kind": "attack", "element": "physical", "power": 3.8, "hits": 1, "target": "enemy", "break": 3, "crit": 0.6, "pierce": true, "anim": "bow", "fx": "light", "desc": "The perfect shot."},
	# brute
	"crush": {"name": "Crush", "ap": 1, "mp": 0, "kind": "attack", "element": "physical", "power": 1.4, "hits": 1, "target": "enemy", "break": 2, "anim": "swing", "fx": "hit", "desc": "A staggering overhead slam."},
	"war_cry": {"name": "War Cry", "ap": 1, "mp": 2, "kind": "buff", "target": "self", "status": {"id": "might", "chance": 1.0, "turns": 3}, "anim": "cast", "fx": "buff", "desc": "Roar. Attack up for 3 turns."},
	"cleave": {"name": "Cleave", "ap": 2, "mp": 3, "kind": "attack", "element": "physical", "power": 1.1, "hits": 1, "target": "enemies", "break": 1, "anim": "swing", "fx": "slash", "desc": "One wide arc through every enemy."},
	"reckless_swing": {"name": "Reckless Swing", "ap": 2, "mp": 0, "kind": "attack", "element": "physical", "power": 2.2, "hits": 1, "target": "enemy", "break": 2, "self_damage": 0.08, "anim": "swing", "fx": "slash", "desc": "Everything into one blow. Costs 8% of your HP."},
	"earthshaker": {"name": "Earthshaker", "ap": 3, "mp": 6, "kind": "attack", "element": "earth", "power": 1.6, "hits": 1, "target": "enemies", "break": 2, "status": {"id": "stun", "chance": 0.25, "turns": 1}, "anim": "swing", "fx": "earth", "desc": "Slam the ground and shatter the field."},
	"blood_rage": {"name": "Blood Rage", "ap": 2, "mp": 4, "kind": "buff", "target": "self", "status": {"id": "rage", "chance": 1.0, "turns": 3}, "anim": "cast", "fx": "buff", "desc": "Attack rises the lower your HP. Defense drops."},
	"titan_slam": {"name": "Titan Slam", "ap": 4, "mp": 8, "kind": "attack", "element": "earth", "power": 3.0, "hits": 1, "target": "enemy", "break": 4, "anim": "swing", "fx": "earth", "desc": "Break anything."},
	"ragnarok": {"name": "Ragnarok", "ap": 5, "mp": 12, "kind": "attack", "element": "fire", "power": 1.5, "hits": 3, "target": "enemies", "break": 2, "anim": "swing", "fx": "fire", "desc": "Burn the world down."},
	# inquisitor
	"mend": {"name": "Mend", "ap": 1, "mp": 4, "kind": "heal", "power": 1.6, "target": "ally", "anim": "cast", "fx": "heal", "desc": "Restore an ally's vitality."},
	"smite": {"name": "Smite", "ap": 1, "mp": 2, "kind": "attack", "element": "light", "power": 1.3, "hits": 1, "target": "enemy", "break": 1, "anim": "swing", "fx": "light", "desc": "A righteous blow."},
	"purify": {"name": "Purify", "ap": 1, "mp": 3, "kind": "heal", "power": 0.6, "target": "ally", "cleanse": true, "anim": "cast", "fx": "heal", "desc": "Cure ailments and heal a little."},
	"ward": {"name": "Ward", "ap": 1, "mp": 4, "kind": "buff", "target": "ally", "status": {"id": "shield", "chance": 1.0, "turns": 3}, "anim": "cast", "fx": "shield", "desc": "Shield an ally."},
	"holy_nova": {"name": "Holy Nova", "ap": 3, "mp": 8, "kind": "spell", "element": "light", "power": 1.5, "hits": 1, "target": "enemies", "break": 1, "anim": "cast", "fx": "light", "desc": "A burst of radiance over every enemy."},
	"greater_mend": {"name": "Greater Mend", "ap": 2, "mp": 9, "kind": "heal", "power": 1.4, "target": "allies", "anim": "cast", "fx": "heal", "desc": "Heal the whole party."},
	"resurrect": {"name": "Resurrect", "ap": 3, "mp": 12, "kind": "heal", "power": 1.0, "target": "ally", "revive": true, "anim": "cast", "fx": "light", "desc": "Return a fallen ally to the fight."},
	"divine_wrath": {"name": "Divine Wrath", "ap": 5, "mp": 16, "kind": "spell", "element": "light", "power": 3.0, "hits": 1, "target": "enemies", "break": 3, "anim": "staff", "fx": "light", "desc": "Heaven's verdict."},
	# enemy-only skills
	"e_bite": {"name": "Bite", "ap": 0, "mp": 0, "kind": "attack", "element": "physical", "power": 1.2, "hits": 1, "target": "enemy", "anim": "attack", "fx": "hit", "desc": ""},
	"e_double": {"name": "Double Strike", "ap": 0, "mp": 0, "kind": "attack", "element": "physical", "power": 0.8, "hits": 2, "target": "enemy", "anim": "attack", "fx": "slash", "desc": ""},
	"e_triple": {"name": "Frenzy", "ap": 0, "mp": 0, "kind": "attack", "element": "physical", "power": 0.7, "hits": 3, "target": "enemy", "anim": "attack", "fx": "slash", "desc": ""},
	"e_fire": {"name": "Ember", "ap": 0, "mp": 0, "kind": "spell", "element": "fire", "power": 1.3, "hits": 1, "target": "enemy", "anim": "attack", "fx": "fire", "status": {"id": "burn", "chance": 0.3, "turns": 2}, "desc": ""},
	"e_dark": {"name": "Soul Drain", "ap": 0, "mp": 0, "kind": "spell", "element": "dark", "power": 1.4, "hits": 1, "target": "enemy", "anim": "attack", "fx": "dark", "desc": ""},
	"e_poison": {"name": "Sting", "ap": 0, "mp": 0, "kind": "attack", "element": "physical", "power": 1.0, "hits": 1, "target": "enemy", "anim": "attack", "fx": "poison", "status": {"id": "poison", "chance": 0.6, "turns": 3}, "desc": ""},
	"e_spores": {"name": "Spore Cloud", "ap": 0, "mp": 0, "kind": "spell", "element": "earth", "power": 0.8, "hits": 1, "target": "enemies", "anim": "attack", "fx": "poison", "status": {"id": "poison", "chance": 0.4, "turns": 3}, "desc": ""},
	"e_slam": {"name": "Slam", "ap": 0, "mp": 0, "kind": "attack", "element": "earth", "power": 1.6, "hits": 1, "target": "enemy", "anim": "attack", "fx": "earth", "status": {"id": "stun", "chance": 0.25, "turns": 1}, "desc": ""},
	"e_quake": {"name": "Quake", "ap": 0, "mp": 0, "kind": "attack", "element": "earth", "power": 1.1, "hits": 1, "target": "enemies", "anim": "attack", "fx": "earth", "desc": ""},
	"e_breath": {"name": "Ember Breath", "ap": 0, "mp": 0, "kind": "spell", "element": "fire", "power": 1.5, "hits": 1, "target": "enemies", "anim": "attack", "fx": "fire", "status": {"id": "burn", "chance": 0.5, "turns": 3}, "desc": ""},
	"e_gale": {"name": "Talon Gale", "ap": 0, "mp": 0, "kind": "attack", "element": "wind", "power": 1.2, "hits": 2, "target": "enemy", "anim": "attack", "fx": "wind", "desc": ""},
	"e_frost": {"name": "Grave Frost", "ap": 0, "mp": 0, "kind": "spell", "element": "ice", "power": 1.3, "hits": 1, "target": "enemies", "anim": "attack", "fx": "ice", "status": {"id": "freeze", "chance": 0.25, "turns": 1}, "desc": ""},
	"e_curse": {"name": "Curse", "ap": 0, "mp": 0, "kind": "debuff", "target": "enemy", "anim": "attack", "fx": "dark", "status": {"id": "weak", "chance": 1.0, "turns": 3}, "desc": ""},
	"e_heal": {"name": "Dark Mending", "ap": 0, "mp": 0, "kind": "heal", "power": 1.2, "target": "self", "anim": "attack", "fx": "heal", "desc": ""},
	"e_void": {"name": "Void Lance", "ap": 0, "mp": 0, "kind": "spell", "element": "dark", "power": 2.2, "hits": 1, "target": "enemy", "anim": "attack", "fx": "dark", "desc": ""},
	"e_oblivion": {"name": "Oblivion", "ap": 0, "mp": 0, "kind": "spell", "element": "dark", "power": 1.6, "hits": 1, "target": "enemies", "anim": "attack", "fx": "dark", "desc": ""},
}

const STATUS_INFO := {
	"burn": {"name": "Burn", "color": Color("ff7a2a"), "good": false},
	"poison": {"name": "Poison", "color": Color("9a5ad0"), "good": false},
	"freeze": {"name": "Frozen", "color": Color("9ae8ff"), "good": false},
	"stun": {"name": "Stunned", "color": Color("ffe27a"), "good": false},
	"weak": {"name": "Weakened", "color": Color("8a8a9a"), "good": false},
	"marked": {"name": "Marked", "color": Color("ff5c5c"), "good": false},
	"shield": {"name": "Shielded", "color": Color("7ac8ff"), "good": true},
	"might": {"name": "Might", "color": Color("ffb03a"), "good": true},
	"focus": {"name": "Focus", "color": Color("b07aff"), "good": true},
	"evade": {"name": "Evasive", "color": Color("a8f0c8"), "good": true},
	"taunt": {"name": "Taunting", "color": Color("ffd86a"), "good": true},
	"rage": {"name": "Blood Rage", "color": Color("c7563a"), "good": true},
	"regen": {"name": "Regen", "color": Color("7af0a0"), "good": true},
}

# ---------------------------------------------------------------------------
# ITEMS
# ---------------------------------------------------------------------------
const WEAPONS := {
	"sword_iron":    {"name": "Iron Sword", "type": "sword", "atk": 6, "mag": 0, "price": 60, "sprite": "sword_iron", "icon": "sword", "desc": "A dependable soldier's blade."},
	"sword_steel":   {"name": "Steel Longsword", "type": "sword", "atk": 12, "mag": 0, "price": 320, "sprite": "sword_steel", "icon": "sword", "desc": "Tempered steel with a golden guard."},
	"sword_flame":   {"name": "Emberfang", "type": "sword", "atk": 19, "mag": 4, "price": 1100, "sprite": "sword_flame", "icon": "sword", "element": "fire", "desc": "The blade smoulders. Attacks deal fire damage."},
	"sword_mythril": {"name": "Mythril Edge", "type": "sword", "atk": 27, "mag": 6, "price": 2800, "sprite": "sword_mythril", "icon": "sword", "desc": "Weightless, impossibly sharp."},
	"dagger_iron":   {"name": "Iron Dirk", "type": "dagger", "atk": 5, "mag": 0, "spd": 2, "price": 45, "sprite": "dagger_iron", "icon": "dagger", "desc": "Quick and quiet."},
	"dagger_shadow": {"name": "Nightshade Fang", "type": "dagger", "atk": 15, "mag": 5, "spd": 4, "price": 900, "sprite": "dagger_shadow", "icon": "dagger", "element": "dark", "desc": "Forged from Veil-glass. Strikes with shadow."},
	"bow_hunting":   {"name": "Hunting Bow", "type": "bow", "atk": 6, "mag": 0, "price": 55, "sprite": "bow_hunting", "icon": "bow", "desc": "Yew and sinew."},
	"bow_elven":     {"name": "Sylvan Longbow", "type": "bow", "atk": 16, "mag": 4, "spd": 2, "price": 950, "sprite": "bow_elven", "icon": "bow", "element": "wind", "desc": "Sings with the wind."},
	"staff_oak":     {"name": "Oak Staff", "type": "staff", "atk": 3, "mag": 7, "price": 50, "sprite": "staff_oak", "icon": "staff", "desc": "A focus of living oak."},
	"staff_arcane":  {"name": "Arcane Scepter", "type": "staff", "atk": 5, "mag": 18, "price": 1000, "sprite": "staff_arcane", "icon": "staff", "desc": "Crowned with a captured star."},
	"axe_iron":      {"name": "Iron Axe", "type": "axe", "atk": 8, "mag": 0, "spd": -1, "price": 65, "sprite": "axe_iron", "icon": "axe", "desc": "Heavy, brutal, honest."},
	"axe_war":       {"name": "Gilded Waraxe", "type": "axe", "atk": 21, "mag": 0, "spd": -1, "price": 1200, "sprite": "axe_war", "icon": "axe", "desc": "Taken from a warlord's tomb."},
	"mace_iron":     {"name": "Iron Mace", "type": "mace", "atk": 7, "mag": 2, "price": 60, "sprite": "mace_iron", "icon": "mace", "desc": "Blessed at the chapel of Hollowmere."},
	"mace_holy":     {"name": "Dawnbringer", "type": "mace", "atk": 17, "mag": 10, "price": 1150, "sprite": "mace_holy", "icon": "mace", "element": "light", "desc": "It glows in the presence of evil."},
}

const ARMORS := {
	"cloth_tunic":        {"name": "Traveler's Tunic", "family": "tunic", "def": 2, "res": 2, "hp": 0, "price": 30, "sprite": "cloth_tunic", "icon": "armor_light", "desc": "Simple linen and a leather belt."},
	"cloth_traveler":     {"name": "Wayfarer's Garb", "family": "tunic", "def": 5, "res": 5, "hp": 10, "price": 240, "sprite": "cloth_traveler", "icon": "armor_light", "desc": "Sturdy dyed wool for long roads."},
	"robe_apprentice":    {"name": "Apprentice Robe", "family": "robe", "def": 2, "res": 6, "hp": 0, "mp": 6, "price": 50, "sprite": "robe_apprentice", "icon": "robe", "desc": "Violet silk stitched with wards."},
	"robe_arch":          {"name": "Archmage Vestments", "family": "robe", "def": 6, "res": 16, "hp": 10, "mp": 20, "price": 1300, "sprite": "robe_arch", "icon": "robe", "desc": "Midnight blue and starlight gold."},
	"leather_scout":      {"name": "Scout Leathers", "family": "leather", "def": 4, "res": 3, "hp": 5, "spd": 1, "price": 70, "sprite": "leather_scout", "icon": "armor_light", "desc": "Supple and silent."},
	"leather_shadow":     {"name": "Shadowstitch Armor", "family": "leather", "def": 11, "res": 8, "hp": 15, "spd": 3, "price": 1000, "sprite": "leather_shadow", "icon": "armor_light", "desc": "Black leather that drinks the light."},
	"chain_mail":         {"name": "Chain Hauberk", "family": "chain", "def": 7, "res": 4, "hp": 10, "price": 120, "sprite": "chain_mail", "icon": "armor_medium", "desc": "Riveted rings under a red tabard."},
	"chain_knight":       {"name": "Knight's Mail", "family": "chain", "def": 13, "res": 8, "hp": 20, "price": 800, "sprite": "chain_knight", "icon": "armor_medium", "desc": "Polished mail beneath royal blue."},
	"plate_steel":        {"name": "Steel Plate", "family": "plate", "def": 16, "res": 8, "hp": 25, "spd": -2, "price": 900, "sprite": "plate_steel", "icon": "armor_heavy", "desc": "Full plate with amethyst trim."},
	"plate_royal":        {"name": "Royal Guard Plate", "family": "plate", "def": 22, "res": 12, "hp": 35, "spd": -2, "price": 2200, "sprite": "plate_royal", "icon": "armor_heavy", "desc": "Gold and ivory. Worn by the king's own."},
	"plate_mythril":      {"name": "Mythril Aegis", "family": "plate", "def": 30, "res": 18, "hp": 50, "price": 4500, "sprite": "plate_mythril", "icon": "armor_heavy", "desc": "Light as cloth, hard as the mountain."},
	"hide_barbarian":     {"name": "Wolfhide Harness", "family": "hide", "def": 4, "res": 2, "hp": 15, "price": 60, "sprite": "hide_barbarian", "icon": "armor_light", "desc": "Fur, leather and a lot of confidence."},
	"hide_warlord":       {"name": "Warlord's Pelts", "family": "hide", "def": 12, "res": 6, "hp": 40, "price": 950, "sprite": "hide_warlord", "icon": "armor_medium", "desc": "Black fur and bronze rings."},
	"ranger_jerkin":      {"name": "Ranger Jerkin", "family": "ranger", "def": 4, "res": 4, "hp": 5, "spd": 1, "price": 80, "sprite": "ranger_jerkin", "icon": "armor_light", "desc": "Forest green with a deep hood."},
	"ranger_elder":       {"name": "Elderwood Mantle", "family": "ranger", "def": 12, "res": 10, "hp": 20, "spd": 2, "price": 1050, "sprite": "ranger_elder", "icon": "armor_medium", "desc": "Woven by the sylvan wardens."},
	"vestment_acolyte":   {"name": "Acolyte Vestments", "family": "vestment", "def": 4, "res": 6, "hp": 5, "mp": 4, "price": 75, "sprite": "vestment_acolyte", "icon": "robe", "desc": "White and gold of the old faith."},
	"vestment_inquisitor": {"name": "Inquisitor's Regalia", "family": "vestment", "def": 13, "res": 14, "hp": 20, "mp": 12, "price": 1200, "sprite": "vestment_inquisitor", "icon": "robe", "desc": "Black, crimson and merciless."},
}

const CONSUMABLES := {
	"potion":     {"name": "Potion", "price": 25, "icon": "potion", "effect": "heal", "power": 60, "desc": "Restores 60 HP."},
	"hi_potion":  {"name": "Hi-Potion", "price": 90, "icon": "hi_potion", "effect": "heal", "power": 200, "desc": "Restores 200 HP."},
	"ether":      {"name": "Ether", "price": 60, "icon": "ether", "effect": "mana", "power": 40, "desc": "Restores 40 MP."},
	"antidote":   {"name": "Antidote", "price": 20, "icon": "antidote", "effect": "cleanse", "power": 0, "desc": "Cures poison, burn and freeze."},
	"phoenix":    {"name": "Phoenix Plume", "price": 150, "icon": "phoenix", "effect": "revive", "power": 0.5, "desc": "Revives a fallen ally with half HP."},
	"elixir":     {"name": "Elixir", "price": 400, "icon": "elixir", "effect": "full", "power": 0, "desc": "Fully restores HP and MP."},
}

# ---------------------------------------------------------------------------
# ENEMIES
# ---------------------------------------------------------------------------
const ENEMIES := {
	"slime":    {"name": "Veil Slime", "sprite": "slime", "level": 1, "hp": 34, "str": 6, "mag": 4, "def": 3, "res": 6, "spd": 5, "xp": 14, "gold": 8, "break": 4, "weak": ["fire"], "resist": ["ice"], "skills": ["e_bite"], "drops": {"potion": 0.25}},
	"goblin":   {"name": "Goblin Cutter", "sprite": "goblin", "level": 2, "hp": 44, "str": 9, "mag": 3, "def": 5, "res": 3, "spd": 9, "xp": 20, "gold": 14, "break": 5, "weak": ["light"], "resist": [], "skills": ["e_double"], "drops": {"potion": 0.2, "dagger_iron": 0.05}},
	"wolf":     {"name": "Dire Wolf", "sprite": "wolf", "level": 3, "hp": 58, "str": 12, "mag": 3, "def": 5, "res": 4, "spd": 12, "xp": 28, "gold": 10, "break": 5, "weak": ["fire"], "resist": [], "skills": ["e_bite", "e_triple"], "drops": {"potion": 0.2}},
	"myconid":  {"name": "Myconid", "sprite": "myconid", "level": 3, "hp": 62, "str": 8, "mag": 9, "def": 6, "res": 7, "spd": 5, "xp": 30, "gold": 12, "break": 6, "weak": ["fire", "wind"], "resist": ["earth"], "skills": ["e_bite", "e_spores"], "drops": {"antidote": 0.4}},
	"bandit":   {"name": "Highway Bandit", "sprite": "bandit", "level": 4, "hp": 76, "str": 13, "mag": 4, "def": 8, "res": 5, "spd": 10, "xp": 40, "gold": 35, "break": 6, "weak": [], "resist": [], "skills": ["e_double", "e_poison"], "drops": {"potion": 0.3, "leather_scout": 0.05}},
	"scorpion": {"name": "Dune Scorpion", "sprite": "scorpion", "level": 5, "hp": 84, "str": 14, "mag": 4, "def": 12, "res": 6, "spd": 8, "xp": 48, "gold": 18, "break": 7, "weak": ["ice"], "resist": ["earth", "fire"], "skills": ["e_poison", "e_double"], "drops": {"antidote": 0.3}},
	"skeleton": {"name": "Risen Skeleton", "sprite": "skeleton", "level": 5, "hp": 80, "str": 14, "mag": 5, "def": 9, "res": 8, "spd": 7, "xp": 50, "gold": 22, "break": 6, "weak": ["light", "fire"], "resist": ["ice", "dark"], "skills": ["e_double"], "drops": {"potion": 0.2, "sword_iron": 0.05}},
	"harpy":    {"name": "Storm Harpy", "sprite": "harpy", "level": 6, "hp": 90, "str": 15, "mag": 10, "def": 7, "res": 9, "spd": 15, "xp": 62, "gold": 30, "break": 6, "weak": ["wind"], "resist": ["earth"], "flying": true, "skills": ["e_gale", "e_bite"], "drops": {"ether": 0.25}},
	"cultist":  {"name": "Veil Cultist", "sprite": "cultist", "level": 7, "hp": 96, "str": 8, "mag": 17, "def": 7, "res": 12, "spd": 9, "xp": 75, "gold": 45, "break": 6, "weak": ["light"], "resist": ["dark"], "skills": ["e_dark", "e_fire", "e_curse"], "drops": {"ether": 0.3, "robe_apprentice": 0.05}},
	"treant":   {"name": "Elder Treant", "sprite": "treant", "level": 8, "hp": 180, "str": 18, "mag": 8, "def": 14, "res": 10, "spd": 4, "xp": 110, "gold": 40, "break": 10, "weak": ["fire"], "resist": ["earth", "wind"], "skills": ["e_slam", "e_quake"], "drops": {"hi_potion": 0.3}},
	"wraith":   {"name": "Grave Wraith", "sprite": "wraith", "level": 9, "hp": 130, "str": 12, "mag": 20, "def": 8, "res": 16, "spd": 12, "xp": 120, "gold": 55, "break": 7, "weak": ["light"], "resist": ["physical", "dark", "ice"], "flying": true, "skills": ["e_dark", "e_frost", "e_curse"], "drops": {"ether": 0.3, "phoenix": 0.1}},
	"golem":    {"name": "Runic Golem", "sprite": "golem", "level": 10, "hp": 240, "str": 22, "mag": 10, "def": 20, "res": 12, "spd": 4, "xp": 160, "gold": 70, "break": 12, "weak": ["wind", "ice"], "resist": ["physical", "fire", "earth"], "skills": ["e_slam", "e_quake"], "drops": {"hi_potion": 0.4, "gem": 0.2}},
	# bosses
	"boss_ogre":  {"name": "Grommash the Bonebreaker", "sprite": "ogre", "level": 6, "hp": 420, "str": 20, "mag": 6, "def": 12, "res": 8, "spd": 7, "xp": 400, "gold": 250, "break": 14, "weak": ["ice", "wind"], "resist": ["earth"], "boss": true, "skills": ["e_slam", "e_double", "e_quake"], "drops": {"axe_war": 1.0}},
	"boss_golem": {"name": "The Sleepless Warden", "sprite": "golem", "level": 11, "hp": 700, "str": 26, "mag": 14, "def": 24, "res": 16, "spd": 5, "xp": 900, "gold": 500, "break": 16, "weak": ["wind", "ice"], "resist": ["physical", "fire", "earth"], "boss": true, "skills": ["e_slam", "e_quake", "e_heal"], "drops": {"plate_steel": 1.0}},
	"boss_drake": {"name": "Vaelysra, the Ember Wyrm", "sprite": "drake", "level": 14, "hp": 1100, "str": 30, "mag": 26, "def": 20, "res": 18, "spd": 12, "xp": 1600, "gold": 900, "break": 18, "weak": ["ice"], "resist": ["fire", "physical"], "boss": true, "flying": true, "skills": ["e_breath", "e_bite", "e_triple", "e_fire"], "drops": {"sword_flame": 1.0}},
	"boss_lich":  {"name": "Morvane, Witness of the Veil", "sprite": "lich", "level": 18, "hp": 1600, "str": 22, "mag": 40, "def": 22, "res": 28, "spd": 11, "xp": 3000, "gold": 2000, "break": 20, "weak": ["light"], "resist": ["dark", "ice", "physical"], "boss": true, "skills": ["e_void", "e_oblivion", "e_frost", "e_curse", "e_heal"], "drops": {"staff_arcane": 1.0}},
}

# region -> encounter table [enemy ids], backdrop, base level, encounter rate per step
const REGIONS := {
	"meadow":  {"name": "Hollowmere Meadows", "table": ["slime", "slime", "slime", "goblin", "goblin", "wolf"], "backdrop": "meadow", "rate": 0.06, "min_group": 1, "max_group": 2},
	"forest":  {"name": "Thornwood", "table": ["wolf", "myconid", "goblin", "bandit", "treant"], "backdrop": "forest", "rate": 0.07, "min_group": 1, "max_group": 3},
	"wastes":  {"name": "Ashen Wastes", "table": ["scorpion", "skeleton", "harpy", "cultist"], "backdrop": "wastes", "rate": 0.07, "min_group": 2, "max_group": 3},
	"ruins":   {"name": "Sunken Ruins", "table": ["skeleton", "wraith", "cultist", "golem"], "backdrop": "ruins", "rate": 0.08, "min_group": 2, "max_group": 4},
	"cave":    {"name": "Warden's Deep", "table": ["golem", "wraith", "scorpion"], "backdrop": "cave", "rate": 0.08, "min_group": 1, "max_group": 3},
	"town":    {"name": "Town", "table": [], "backdrop": "meadow", "rate": 0.0, "min_group": 1, "max_group": 1},
}

# ---------------------------------------------------------------------------
# COMPANIONS  (found across the world, join the roster)
# ---------------------------------------------------------------------------
const COMPANIONS := {
	"kaelen": {"name": "Kaelen", "gender": "male", "class": "knight", "skin": "olive", "hair": "swept", "hair_color": Color("3a2a1a"), "level_offset": 0,
		"where": "Hollowmere gate", "greet": ["Another sword for the road? The Veil has been swallowing whole villages east of here.", "My oath is to protect. If you march toward Thornwood, I march with you."], "join": "Kaelen the Knight joins your party!"},
	"sera": {"name": "Sera", "gender": "female", "class": "mage", "skin": "fair", "hair": "long", "hair_color": Color("e8e0f0"), "level_offset": 0,
		"where": "Thornwood shrine", "greet": ["The shrine's ward is failing. I can feel the Veil pressing on it like a tide.", "You fight it too? Then let a Siren sing beside your blades."], "join": "Sera the Siren joins your party!"},
	"lyra": {"name": "Lyra", "gender": "female", "class": "ranger", "skin": "tan", "hair": "ponytail", "hair_color": Color("b83a2a"), "level_offset": 1,
		"where": "Hunter's camp", "greet": ["Wolves, harpies, and now walking corpses. My arrows can't keep up alone.", "You look like you can hold a line. I'll cover it from the back."], "join": "Lyra the Huntress joins your party!"},
	"dorn": {"name": "Dorn", "gender": "male", "class": "brute", "skin": "deep", "hair": "spiky", "hair_color": Color("1a1a22"), "level_offset": 1,
		"where": "Mountain pass", "greet": ["HA! The pass is closed, friend. The stone giants down in the Deep don't take bribes.", "Bring me somewhere worth swinging an axe and I'm yours."], "join": "Dorn the Berserker joins your party!"},
	"vex": {"name": "Vex", "gender": "female", "class": "rogue", "skin": "fair", "hair": "bob", "hair_color": Color("5a2a8a"), "level_offset": 2,
		"where": "Bandit camp", "greet": ["Grommash kept me in a cage for singing about him. You took his head? Adorable.", "I know every road to the Ashen Wastes. Take me along and I'll make it worth your while."], "join": "Vex the Shadow joins your party!"},
	"amos": {"name": "Brother Amos", "gender": "male", "class": "inquisitor", "skin": "tan", "hair": "short", "hair_color": Color("8a8a9a"), "level_offset": 2,
		"where": "Sunken Ruins", "greet": ["The dead here do not rest. The Witness in the tower calls them back, night after night.", "The old faith taught me to mend and to judge. Let me do both at your side."], "join": "Brother Amos the Inquisitor joins your party!"},
}

const STORY := {
	"intro": [
		"Three hundred years ago the Veil was sealed - a wound between our world and whatever hungers beyond it.",
		"Now the seal is fraying. Creatures pour from the cracks. Villages fall silent. And in the far east, a tower that no map remembers has begun to glow.",
		"You wake in the meadow town of Hollowmere with a weapon, a name, and a stubborn refusal to let the world end quietly.",
	],
	"hollowmere": ["Hollowmere. A quiet town of thatched roofs and nervous farmers. The road east leads into Thornwood."],
	"thornwood": ["Thornwood. The canopy swallows the light. Something in here is hunting the hunters."],
	"wastes": ["The Ashen Wastes. Bandits, bones and the shrieks of harpies. The Veil Tower rises somewhere beyond the dunes."],
	"ruins": ["The Sunken Ruins of an empire that fell the last time the Veil opened. The dead remember."],
	"tower": ["The Veil Tower. The air tastes of copper and starlight. The Witness is waiting."],
	"ogre_intro": ["GROMMASH: Little heroes! I break bones like yours for breakfast!"],
	"golem_intro": ["The Warden's eyes flare blue. Ancient runes crawl across its chest. It does not remember why it guards this place. It only remembers HOW."],
	"drake_intro": ["VAELYSRA: You reek of the sealed world. Come then. Let me taste it burning."],
	"lich_intro": ["MORVANE: I witnessed the first sealing. I witnessed the cowards who did it. Now witness ME.", "The Veil tears open behind him. This is the end - one way or the other."],
	"ending": [
		"Morvane's crown shatters and the Veil folds shut like an eye closing.",
		"The tower crumbles into the dunes. Across the world, the cracks fade to scars.",
		"You and your companions walk west, toward Hollowmere and a very long night at the inn.",
		"Thank you for playing Witnessed: Chronicles of the Veil.",
	],
}


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
static func xp_for_level(level: int) -> int:
	## Total XP needed to *reach* `level`.
	if level <= 1:
		return 0
	return int(round(30.0 * pow(level - 1, 1.9) + 40.0 * (level - 1)))


static func class_name_for(class_id: String, gender: String) -> String:
	var c: Dictionary = CLASSES[class_id]
	return c["name_f"] if gender == "female" else c["name_m"]


static func item(id: String) -> Dictionary:
	if WEAPONS.has(id):
		var d: Dictionary = WEAPONS[id].duplicate()
		d["slot"] = "weapon"
		d["id"] = id
		return d
	if ARMORS.has(id):
		var d: Dictionary = ARMORS[id].duplicate()
		d["slot"] = "armor"
		d["id"] = id
		return d
	if CONSUMABLES.has(id):
		var d: Dictionary = CONSUMABLES[id].duplicate()
		d["slot"] = "consumable"
		d["id"] = id
		return d
	if id == "gem":
		return {"id": "gem", "name": "Veil Shard", "slot": "material", "price": 150, "icon": "gem", "desc": "A crystallised fragment of the Veil. Sells well."}
	return {"id": id, "name": id, "slot": "unknown", "price": 0, "icon": "key", "desc": ""}


static func skills_for(class_id: String, level: int) -> Array:
	var out: Array = []
	for entry in CLASSES[class_id]["skills"]:
		if int(entry[0]) <= level:
			out.append(entry[1])
	return out


static func skills_unlocked_at(class_id: String, level: int) -> Array:
	var out: Array = []
	for entry in CLASSES[class_id]["skills"]:
		if int(entry[0]) == level:
			out.append(entry[1])
	return out
