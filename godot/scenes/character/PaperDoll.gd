class_name PaperDoll
extends Node2D
## Layered battle sprite for heroes (and humanoid NPCs): body + armour + hair + weapon
## all share one frame index so armour and weapons visibly change the model.

signal anim_finished(anim: String)
signal hit_frame(anim: String)

const HIT_FRAME := {"attack_swing": 3, "attack_bow": 3, "attack_staff": 3, "cast": 3, "parry": 1}
const LAYER_NAMES := ["body_back", "armor_back", "body_core", "armor_core", "hair", "body_front", "armor_front", "weapon"]

var gender := "male"
var skin := "fair"
var hair_style := "short"
var hair_color := Color("3a2a1a")
var armor_sprite := "cloth_tunic"
var weapon_sprite := ""

var anim := "idle"
var anim_speed := 1.0
var _t := 0.0
var _frame_in_anim := -1
var _hit_emitted := false
var _finished_emitted := false
var _layers: Dictionary = {}
var _frame_count := 1
var _shadow: Sprite2D


func _ready() -> void:
	if _layers.is_empty():
		_build()


func _build() -> void:
	_frame_count = Assets.hero_frame_count()
	var fw: int = int(Assets.hero_index.get("frame", [80, 80])[0])
	var fh: int = int(Assets.hero_index.get("frame", [80, 80])[1])
	for n in LAYER_NAMES:
		var s := Sprite2D.new()
		s.name = n
		s.centered = false
		s.offset = Vector2(-fw / 2.0, -(fh - 9))
		s.hframes = _frame_count
		s.vframes = 3 if (n.begins_with("body") or n.begins_with("armor")) else 1
		s.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		add_child(s)
		_layers[n] = s
	_refresh_textures()
	_apply_frame(0)


func configure_from_hero(h: Hero) -> void:
	configure(h.gender, h.skin, h.hair, h.hair_color, h.armor_sprite(), h.weapon_sprite())


func configure(p_gender: String, p_skin: String, p_hair: String, p_hair_color: Color, p_armor: String, p_weapon: String) -> void:
	gender = p_gender
	skin = p_skin
	hair_style = p_hair
	hair_color = p_hair_color
	armor_sprite = p_armor
	weapon_sprite = p_weapon
	if _layers.is_empty():
		_build()
	else:
		_refresh_textures()
		_apply_frame(_current_sheet_frame())


func _refresh_textures() -> void:
	var body := Assets.tex("heroes/body_%s_%s.png" % [gender, skin])
	for n in ["body_back", "body_core", "body_front"]:
		_layers[n].texture = body
	var armor_tex: Texture2D = null
	if armor_sprite != "":
		armor_tex = Assets.tex("armor/%s_%s.png" % [armor_sprite, gender])
	for n in ["armor_back", "armor_core", "armor_front"]:
		_layers[n].texture = armor_tex
	var hair_tex: Texture2D = null
	if hair_style != "" and hair_style != "none":
		hair_tex = Assets.tex("hair/hair_%s_%s.png" % [hair_style, gender])
	_layers["hair"].texture = hair_tex
	_layers["hair"].self_modulate = hair_color
	var wep_tex: Texture2D = null
	if weapon_sprite != "":
		wep_tex = Assets.tex("weapons/%s_%s.png" % [weapon_sprite, gender])
	_layers["weapon"].texture = wep_tex


func set_facing_left(left: bool) -> void:
	scale.x = -absf(scale.x) if left else absf(scale.x)


func play(p_anim: String, speed: float = 1.0) -> void:
	if not Assets.hero_index.get("anims", {}).has(p_anim):
		p_anim = "idle"
	anim = p_anim
	anim_speed = speed
	_t = 0.0
	_frame_in_anim = -1
	_hit_emitted = false
	_finished_emitted = false
	_process(0.0)


func play_and_wait(p_anim: String, speed: float = 1.0) -> void:
	play(p_anim, speed)
	var info := Assets.hero_anim(anim)
	var dur: float = float(info["count"]) / (float(info["fps"]) * maxf(0.05, speed))
	await get_tree().create_timer(dur).timeout


func anim_duration(p_anim: String, speed: float = 1.0) -> float:
	var info := Assets.hero_anim(p_anim)
	return float(info["count"]) / (float(info["fps"]) * maxf(0.05, speed))


func _current_sheet_frame() -> int:
	var info := Assets.hero_anim(anim)
	return int(info["start"]) + maxi(0, _frame_in_anim)


func _process(delta: float) -> void:
	if _layers.is_empty():
		return
	var info := Assets.hero_anim(anim)
	var count: int = int(info["count"])
	var fps: float = float(info["fps"]) * anim_speed
	_t += delta
	var idx := int(floor(_t * fps))
	if bool(info["loop"]):
		idx = idx % count
	else:
		if idx >= count:
			idx = count - 1
			if not _finished_emitted:
				_finished_emitted = true
				emit_signal("anim_finished", anim)
	if idx != _frame_in_anim:
		_frame_in_anim = idx
		_apply_frame(int(info["start"]) + idx)
		if HIT_FRAME.has(anim) and idx >= int(HIT_FRAME[anim]) and not _hit_emitted:
			_hit_emitted = true
			emit_signal("hit_frame", anim)


func _apply_frame(sheet_frame: int) -> void:
	for n in LAYER_NAMES:
		var s: Sprite2D = _layers[n]
		var row := 0
		if n.ends_with("_core"):
			row = 1
		elif n.ends_with("_front"):
			row = 2
		s.frame = row * _frame_count + sheet_frame


func flash(color: Color = Color(1, 0.6, 0.6), duration: float = 0.25) -> void:
	modulate = color
	var tw := create_tween()
	tw.tween_property(self, "modulate", Color.WHITE, duration)
