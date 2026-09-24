class_name Hero
extends RefCounted
## A playable character (the protagonist or a recruited companion).

var id: String = ""
var display_name: String = ""
var gender: String = "male"
var class_id: String = "knight"
var level: int = 1
var xp: int = 0
var skin: String = "fair"
var hair: String = "short"
var hair_color: Color = Color("3a2a1a")
var weapon: String = ""
var armor: String = ""
var hp: int = 1
var mp: int = 1


static func create(p_id: String, p_name: String, p_gender: String, p_class: String, p_level: int = 1) -> Hero:
	var h := Hero.new()
	h.id = p_id
	h.display_name = p_name
	h.gender = p_gender
	h.class_id = p_class
	h.level = max(1, p_level)
	h.xp = GameData.xp_for_level(h.level)
	var c: Dictionary = GameData.CLASSES[p_class]
	h.weapon = c["start_weapon"]
	h.armor = c["start_armor"]
	h.full_heal()
	return h


func class_title() -> String:
	return GameData.class_name_for(class_id, gender)


# ---------------------------------------------------------------------------
# stats
# ---------------------------------------------------------------------------
func base_stat(key: String) -> int:
	var c: Dictionary = GameData.CLASSES[class_id]
	return int(round(float(c["base"][key]) + float(c["growth"][key]) * (level - 1)))


func _equip_bonus(key: String) -> int:
	var total := 0
	if weapon != "" and GameData.WEAPONS.has(weapon):
		total += int(GameData.WEAPONS[weapon].get(key, 0))
	if armor != "" and GameData.ARMORS.has(armor):
		total += int(GameData.ARMORS[armor].get(key, 0))
	return total


func max_hp() -> int:
	return base_stat("hp") + _equip_bonus("hp")


func max_mp() -> int:
	return base_stat("mp") + _equip_bonus("mp")


func attack() -> int:
	return base_stat("str") + _equip_bonus("atk")


func magic() -> int:
	return base_stat("mag") + _equip_bonus("mag")


func defense() -> int:
	return base_stat("def") + _equip_bonus("def")


func resistance() -> int:
	return base_stat("res") + _equip_bonus("res")


func speed() -> int:
	return max(1, base_stat("spd") + _equip_bonus("spd"))


func luck() -> int:
	return base_stat("luck")


func weapon_type() -> String:
	if weapon != "" and GameData.WEAPONS.has(weapon):
		return GameData.WEAPONS[weapon]["type"]
	return "sword"


func weapon_element() -> String:
	if weapon != "" and GameData.WEAPONS.has(weapon):
		return GameData.WEAPONS[weapon].get("element", "physical")
	return "physical"


func attack_anim() -> String:
	match weapon_type():
		"bow":
			return "attack_bow"
		"staff":
			return "attack_staff"
		_:
			return "attack_swing"


func armor_sprite() -> String:
	if armor != "" and GameData.ARMORS.has(armor):
		return GameData.ARMORS[armor]["sprite"]
	return "cloth_tunic"


func weapon_sprite() -> String:
	if weapon != "" and GameData.WEAPONS.has(weapon):
		return GameData.WEAPONS[weapon]["sprite"]
	return ""


func skills() -> Array:
	return GameData.skills_for(class_id, level)


func can_equip(item_id: String) -> bool:
	var c: Dictionary = GameData.CLASSES[class_id]
	if GameData.WEAPONS.has(item_id):
		return GameData.WEAPONS[item_id]["type"] in c["weapons"]
	if GameData.ARMORS.has(item_id):
		return GameData.ARMORS[item_id]["family"] in c["armors"]
	return false


func is_alive() -> bool:
	return hp > 0


func full_heal() -> void:
	hp = max_hp()
	mp = max_mp()


func clamp_vitals() -> void:
	hp = clampi(hp, 0, max_hp())
	mp = clampi(mp, 0, max_mp())


# ---------------------------------------------------------------------------
# progression
# ---------------------------------------------------------------------------
func xp_to_next() -> int:
	if level >= GameData.MAX_LEVEL:
		return 0
	return GameData.xp_for_level(level + 1) - xp


func add_xp(amount: int) -> Array:
	## Adds XP. Returns a list of {level, skills:[...], gains:{...}} for each level gained.
	var events: Array = []
	xp += amount
	while level < GameData.MAX_LEVEL and xp >= GameData.xp_for_level(level + 1):
		var before := {"hp": max_hp(), "mp": max_mp(), "str": attack(), "mag": magic(), "def": defense(), "res": resistance(), "spd": speed()}
		level += 1
		var gains := {}
		var after := {"hp": max_hp(), "mp": max_mp(), "str": attack(), "mag": magic(), "def": defense(), "res": resistance(), "spd": speed()}
		for k in after:
			gains[k] = int(after[k]) - int(before[k])
		hp = min(max_hp(), hp + int(gains["hp"]) + int(max_hp() * 0.25))
		mp = min(max_mp(), mp + int(gains["mp"]) + int(max_mp() * 0.25))
		events.append({"level": level, "skills": GameData.skills_unlocked_at(class_id, level), "gains": gains})
	return events


# ---------------------------------------------------------------------------
# serialisation
# ---------------------------------------------------------------------------
func to_dict() -> Dictionary:
	return {
		"id": id, "name": display_name, "gender": gender, "class": class_id, "level": level, "xp": xp,
		"skin": skin, "hair": hair, "hair_color": hair_color.to_html(false), "weapon": weapon, "armor": armor,
		"hp": hp, "mp": mp,
	}


static func from_dict(d: Dictionary) -> Hero:
	var h := Hero.new()
	h.id = str(d.get("id", "hero"))
	h.display_name = str(d.get("name", "Hero"))
	h.gender = str(d.get("gender", "male"))
	h.class_id = str(d.get("class", "knight"))
	h.level = int(d.get("level", 1))
	h.xp = int(d.get("xp", 0))
	h.skin = str(d.get("skin", "fair"))
	h.hair = str(d.get("hair", "short"))
	h.hair_color = Color.html(str(d.get("hair_color", "3a2a1a")))
	h.weapon = str(d.get("weapon", ""))
	h.armor = str(d.get("armor", ""))
	h.hp = int(d.get("hp", h.max_hp()))
	h.mp = int(d.get("mp", h.max_mp()))
	h.clamp_vitals()
	return h
