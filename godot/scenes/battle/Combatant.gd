class_name Combatant
extends RefCounted
## Battle-time wrapper around a Hero or an enemy definition: live stats, AP, statuses, break gauge.

var id := ""
var display_name := ""
var is_hero := false
var hero: Hero = null
var enemy_id := ""
var sprite_id := ""
var level := 1

var max_hp := 1
var hp := 1
var max_mp := 0
var mp := 0
var atk := 1
var mag := 1
var def := 1
var res := 1
var spd := 1
var luck := 1

var ap := 3
var guarding := false
var statuses: Dictionary = {}       # status id -> turns remaining
var break_max := 0
var break_gauge := 0
var broken := false
var weak: Array = []
var resist: Array = []
var flying := false
var boss := false
var skill_ids: Array = []
var xp_reward := 0
var gold_reward := 0
var drops: Dictionary = {}
var tick := 0.0
var slot := 0

var node: Node2D = null              # PaperDoll for heroes, SheetSprite for enemies
var home := Vector2.ZERO
var ui: Dictionary = {}              # per-combatant UI handles owned by Battle


static func from_hero(h: Hero, p_slot: int) -> Combatant:
	var c := Combatant.new()
	c.is_hero = true
	c.hero = h
	c.id = h.id
	c.display_name = h.display_name
	c.level = h.level
	c.max_hp = h.max_hp()
	c.hp = h.hp
	c.max_mp = h.max_mp()
	c.mp = h.mp
	c.atk = h.attack()
	c.mag = h.magic()
	c.def = h.defense()
	c.res = h.resistance()
	c.spd = h.speed()
	c.luck = h.luck()
	c.ap = 3
	c.skill_ids = h.skills()
	c.slot = p_slot
	return c


static func from_enemy(p_enemy_id: String, p_slot: int, party_level: int, difficulty: float, suffix: String = "") -> Combatant:
	var e: Dictionary = GameData.ENEMIES[p_enemy_id]
	var c := Combatant.new()
	c.is_hero = false
	c.enemy_id = p_enemy_id
	c.id = p_enemy_id + suffix
	c.display_name = str(e["name"]) + suffix
	c.sprite_id = e["sprite"]
	c.level = int(e["level"])
	# enemies grow a little when the party out-levels them so regions stay relevant
	var gap := maxi(0, party_level - c.level)
	var scale := 1.0 + 0.05 * gap
	c.max_hp = int(round(float(e["hp"]) * scale * lerpf(1.0, difficulty, 0.6)))
	c.hp = c.max_hp
	c.atk = int(round(float(e["str"]) * scale))
	c.mag = int(round(float(e["mag"]) * scale))
	c.def = int(round(float(e["def"]) * scale))
	c.res = int(round(float(e["res"]) * scale))
	c.spd = int(e["spd"])
	c.luck = 4
	c.break_max = int(e["break"])
	c.weak = e.get("weak", [])
	c.resist = e.get("resist", [])
	c.flying = bool(e.get("flying", false))
	c.boss = bool(e.get("boss", false))
	c.skill_ids = e.get("skills", ["e_bite"])
	c.xp_reward = int(round(float(e["xp"]) * (1.0 + 0.03 * gap)))
	c.gold_reward = int(e["gold"])
	c.drops = e.get("drops", {})
	c.slot = p_slot
	return c


func is_alive() -> bool:
	return hp > 0


func has_status(sid: String) -> bool:
	return statuses.has(sid)


func add_status(sid: String, turns: int) -> void:
	statuses[sid] = maxi(int(statuses.get(sid, 0)), turns)


func remove_status(sid: String) -> void:
	statuses.erase(sid)


func cleanse() -> void:
	for sid in statuses.keys():
		if not bool(GameData.STATUS_INFO.get(sid, {}).get("good", false)):
			statuses.erase(sid)


func eff_attack() -> float:
	var v := float(atk)
	if has_status("might"):
		v *= 1.3
	if has_status("weak"):
		v *= 0.7
	if has_status("rage"):
		v *= 1.0 + 0.6 * (1.0 - float(hp) / float(max_hp))
	return v


func eff_magic() -> float:
	var v := float(mag)
	if has_status("focus"):
		v *= 1.4
	if has_status("weak"):
		v *= 0.7
	return v


func eff_defense() -> float:
	var v := float(def)
	if has_status("rage"):
		v *= 0.75
	return v


func eff_resistance() -> float:
	return float(res)


func eff_speed() -> float:
	var v := float(spd)
	if has_status("evade"):
		v *= 1.3
	if has_status("freeze"):
		v *= 0.6
	return v


func crit_chance() -> float:
	var c := 0.03 + float(luck) * 0.006
	if has_status("might"):
		c += 0.1
	return c


func can_act() -> bool:
	return is_alive() and not has_status("stun") and not has_status("freeze") and not broken


func apply_damage(amount: int) -> int:
	var dealt := mini(hp, maxi(0, amount))
	hp -= dealt
	if hp <= 0:
		hp = 0
		statuses.clear()
		guarding = false
	return dealt


func heal(amount: int) -> int:
	var before := hp
	hp = mini(max_hp, hp + maxi(0, amount))
	return hp - before


func add_break(amount: int) -> bool:
	## Returns true when the gauge fills this call.
	if is_hero or broken or break_max <= 0:
		return false
	break_gauge += amount
	if break_gauge >= break_max:
		break_gauge = break_max
		broken = true
		return true
	return false


func recover_from_break() -> void:
	broken = false
	break_gauge = 0


func tick_statuses() -> Array:
	## Called at the start of this combatant's turn. Returns a list of {id, damage} events.
	var events: Array = []
	for sid in statuses.keys():
		match sid:
			"burn":
				events.append({"id": sid, "damage": maxi(1, int(max_hp * 0.05))})
			"poison":
				events.append({"id": sid, "damage": maxi(1, int(max_hp * 0.06))})
			"regen":
				events.append({"id": sid, "damage": -maxi(1, int(max_hp * 0.08))})
	return events


func expire_statuses() -> void:
	## Called at the end of this combatant's turn.
	for sid in statuses.keys():
		statuses[sid] = int(statuses[sid]) - 1
		if int(statuses[sid]) <= 0:
			statuses.erase(sid)


func status_summary() -> String:
	var parts: PackedStringArray = []
	for sid in statuses:
		parts.append(str(GameData.STATUS_INFO.get(sid, {}).get("name", sid)))
	if broken:
		parts.append("BROKEN")
	if guarding:
		parts.append("Guard")
	return ", ".join(parts)


func write_back() -> void:
	if hero != null:
		hero.hp = hp
		hero.mp = mp
		hero.clamp_vitals()
