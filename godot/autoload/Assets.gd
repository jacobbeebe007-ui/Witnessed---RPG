extends Node
## Texture / index cache for the generated sprite sheets.

const SPRITES := "res://assets/sprites/"

var hero_index: Dictionary = {}
var enemy_index: Dictionary = {}
var effect_index: Dictionary = {}
var icon_index: Dictionary = {}
var _tex_cache: Dictionary = {}
var _icons_tex: Texture2D


func _ready() -> void:
	hero_index = _load_json(SPRITES + "heroes/anim_index.json")
	enemy_index = _load_json(SPRITES + "enemies/index.json")
	effect_index = _load_json(SPRITES + "effects/index.json")
	icon_index = _load_json(SPRITES + "ui/icons.json")
	_icons_tex = tex("ui/icons.png")


func _load_json(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		push_warning("Missing index: " + path)
		return {}
	var f := FileAccess.open(path, FileAccess.READ)
	var data = JSON.parse_string(f.get_as_text())
	return data if data is Dictionary else {}


func tex(rel: String) -> Texture2D:
	## Loads `res://assets/sprites/<rel>` (cached). Returns null when missing.
	if _tex_cache.has(rel):
		return _tex_cache[rel]
	var path := SPRITES + rel
	var t: Texture2D = null
	if ResourceLoader.exists(path):
		t = load(path)
	else:
		push_warning("Missing texture: " + path)
	_tex_cache[rel] = t
	return t


func has_tex(rel: String) -> bool:
	return ResourceLoader.exists(SPRITES + rel)


func icon(name: String) -> Texture2D:
	if not icon_index.has(name) or _icons_tex == null:
		return null
	var at := AtlasTexture.new()
	at.atlas = _icons_tex
	at.region = Rect2(int(icon_index[name]) * 16, 0, 16, 16)
	return at


func hero_anim(name: String) -> Dictionary:
	var anims: Dictionary = hero_index.get("anims", {})
	return anims.get(name, {"start": 0, "count": 1, "fps": 6, "loop": true})


func hero_frame_count() -> int:
	var total := 0
	for a in hero_index.get("anims", {}).values():
		total = max(total, int(a["start"]) + int(a["count"]))
	return max(1, total)


func enemy_info(sprite: String) -> Dictionary:
	return enemy_index.get(sprite, {"kind": "creature", "frame": 64, "anims": {}})


func font(name: String) -> Font:
	return load("res://assets/fonts/%s" % name)
