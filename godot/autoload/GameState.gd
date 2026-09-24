extends Node
## Mutable run state: roster, active party, inventory, world flags, settings, save/load.

signal party_changed
signal inventory_changed
signal gold_changed(amount: int)

const SAVE_PATH := "user://witnessed_save.json"

var roster: Array[Hero] = []
var party: Array[String] = []          # ids of active party members (max 4)
var inventory: Dictionary = {}          # item id -> count
var gold: int = 0
var flags: Dictionary = {}              # story flags: recruited_x, boss_x_defeated, chest_x, visited_region
var world_pos: Vector2 = Vector2.ZERO
var play_time: float = 0.0
var settings: Dictionary = {"difficulty": "normal", "qte_assist": false, "volume": 0.8, "battle_speed": 1.0}

# transient (not saved)
var pending_battle: Dictionary = {}
var last_battle_result: Dictionary = {}


func _process(delta: float) -> void:
	if roster.size() > 0:
		play_time += delta


# ---------------------------------------------------------------------------
func new_game(hero: Hero) -> void:
	roster = [hero]
	party = [hero.id]
	inventory = {"potion": 3, "ether": 1, "antidote": 1}
	gold = 120
	flags = {}
	world_pos = Vector2.ZERO
	play_time = 0.0
	pending_battle = {}
	last_battle_result = {}
	emit_signal("party_changed")
	emit_signal("inventory_changed")
	emit_signal("gold_changed", gold)


func hero_by_id(id: String) -> Hero:
	for h in roster:
		if h.id == id:
			return h
	return null


func leader() -> Hero:
	if party.size() > 0:
		return hero_by_id(party[0])
	return roster[0] if roster.size() > 0 else null


func active_party() -> Array[Hero]:
	var out: Array[Hero] = []
	for id in party:
		var h := hero_by_id(id)
		if h != null:
			out.append(h)
	return out


func average_level() -> int:
	var members := active_party()
	if members.is_empty():
		return 1
	var total := 0
	for h in members:
		total += h.level
	return int(round(float(total) / members.size()))


func recruit(companion_id: String) -> Hero:
	var c: Dictionary = GameData.COMPANIONS[companion_id]
	var lvl: int = max(1, average_level() + int(c["level_offset"]))
	var h := Hero.create(companion_id, c["name"], c["gender"], c["class"], lvl)
	h.skin = c["skin"]
	h.hair = c["hair"]
	h.hair_color = c["hair_color"]
	roster.append(h)
	if party.size() < GameData.PARTY_SIZE:
		party.append(h.id)
	flags["recruited_" + companion_id] = true
	emit_signal("party_changed")
	return h


func set_party(ids: Array) -> void:
	party.clear()
	for id in ids:
		if party.size() < GameData.PARTY_SIZE and hero_by_id(id) != null:
			party.append(id)
	if party.is_empty() and roster.size() > 0:
		party.append(roster[0].id)
	emit_signal("party_changed")


func toggle_party_member(id: String) -> bool:
	## Returns true if the change was applied.
	if id in party:
		if party.size() <= 1:
			return false
		party.erase(id)
	else:
		if party.size() >= GameData.PARTY_SIZE:
			return false
		party.append(id)
	emit_signal("party_changed")
	return true


# ---------------------------------------------------------------------------
func add_item(id: String, count: int = 1) -> void:
	inventory[id] = int(inventory.get(id, 0)) + count
	if inventory[id] <= 0:
		inventory.erase(id)
	emit_signal("inventory_changed")


func remove_item(id: String, count: int = 1) -> bool:
	if int(inventory.get(id, 0)) < count:
		return false
	add_item(id, -count)
	return true


func item_count(id: String) -> int:
	return int(inventory.get(id, 0))


func add_gold(amount: int) -> void:
	gold = max(0, gold + amount)
	emit_signal("gold_changed", gold)


func equip(hero: Hero, item_id: String) -> bool:
	## Swap the hero's current gear with `item_id` from the inventory.
	if not hero.can_equip(item_id) or item_count(item_id) <= 0:
		return false
	var old := ""
	if GameData.WEAPONS.has(item_id):
		old = hero.weapon
		hero.weapon = item_id
	else:
		old = hero.armor
		hero.armor = item_id
	remove_item(item_id)
	if old != "":
		add_item(old)
	hero.clamp_vitals()
	emit_signal("party_changed")
	return true


func use_consumable(item_id: String, hero: Hero) -> String:
	## Applies a consumable out of battle. Returns a message ("" when not usable).
	var it: Dictionary = GameData.CONSUMABLES.get(item_id, {})
	if it.is_empty() or item_count(item_id) <= 0:
		return ""
	var msg := ""
	match it["effect"]:
		"heal":
			if not hero.is_alive():
				return ""
			var before := hero.hp
			hero.hp = min(hero.max_hp(), hero.hp + int(it["power"]))
			msg = "%s recovers %d HP." % [hero.display_name, hero.hp - before]
		"mana":
			var before := hero.mp
			hero.mp = min(hero.max_mp(), hero.mp + int(it["power"]))
			msg = "%s recovers %d MP." % [hero.display_name, hero.mp - before]
		"cleanse":
			msg = "%s feels cleansed." % hero.display_name
		"revive":
			if hero.is_alive():
				return ""
			hero.hp = max(1, int(hero.max_hp() * float(it["power"])))
			msg = "%s rises again!" % hero.display_name
		"full":
			hero.full_heal()
			msg = "%s is fully restored." % hero.display_name
	remove_item(item_id)
	emit_signal("party_changed")
	return msg


func rest() -> void:
	for h in roster:
		h.full_heal()
	emit_signal("party_changed")


# ---------------------------------------------------------------------------
func has_save() -> bool:
	return FileAccess.file_exists(SAVE_PATH)


func to_dict() -> Dictionary:
	var heroes: Array = []
	for h in roster:
		heroes.append(h.to_dict())
	return {
		"version": 1, "roster": heroes, "party": party.duplicate(), "inventory": inventory.duplicate(), "gold": gold,
		"flags": flags.duplicate(), "world_pos": [world_pos.x, world_pos.y], "play_time": play_time, "settings": settings.duplicate(),
	}


func from_dict(d: Dictionary) -> void:
	roster.clear()
	for hd in d.get("roster", []):
		roster.append(Hero.from_dict(hd))
	party.clear()
	for id in d.get("party", []):
		party.append(str(id))
	inventory = {}
	for k in d.get("inventory", {}):
		inventory[str(k)] = int(d["inventory"][k])
	gold = int(d.get("gold", 0))
	flags = d.get("flags", {}).duplicate()
	var wp = d.get("world_pos", [0, 0])
	world_pos = Vector2(float(wp[0]), float(wp[1]))
	play_time = float(d.get("play_time", 0.0))
	for k in d.get("settings", {}):
		settings[k] = d["settings"][k]
	if party.is_empty() and roster.size() > 0:
		party.append(roster[0].id)
	emit_signal("party_changed")
	emit_signal("inventory_changed")
	emit_signal("gold_changed", gold)


func save_game() -> bool:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(to_dict(), "\t"))
	return true


func load_game() -> bool:
	if not has_save():
		return false
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	var data = JSON.parse_string(f.get_as_text())
	if not (data is Dictionary):
		return false
	from_dict(data)
	return true


func difficulty_mult() -> float:
	match settings.get("difficulty", "normal"):
		"story":
			return 0.65
		"hard":
			return 1.35
		_:
			return 1.0
