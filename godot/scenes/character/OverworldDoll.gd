class_name OverworldDoll
extends Node2D
## Top-down walking paper-doll: body + outfit + hair, 4 directions x 4 frames.

const DIR_ROW := {"down": 0, "left": 1, "right": 2, "up": 3}

var direction := "down"
var walking := false
var _t := 0.0
var _layers: Dictionary = {}
var _hero: Hero


func _ready() -> void:
	if _layers.is_empty():
		_build()


func _build() -> void:
	for n in ["body", "outfit", "hair"]:
		var s := Sprite2D.new()
		s.name = n
		s.centered = false
		s.offset = Vector2(-12, -30)
		s.hframes = 4
		s.vframes = 4
		s.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		add_child(s)
		_layers[n] = s


func configure_from_hero(h: Hero) -> void:
	_hero = h
	configure(h.gender, h.skin, h.hair, h.hair_color, h.armor_sprite())


func configure(gender: String, skin: String, hair: String, hair_color: Color, outfit: String) -> void:
	if _layers.is_empty():
		_build()
	_layers["body"].texture = Assets.tex("overworld/ow_body_%s_%s.png" % [gender, skin])
	_layers["outfit"].texture = Assets.tex("overworld/ow_outfit_%s_%s.png" % [outfit, gender]) if outfit != "" else null
	_layers["hair"].texture = Assets.tex("overworld/ow_hair_%s_%s.png" % [hair, gender]) if hair != "" else null
	_layers["hair"].self_modulate = hair_color
	_apply(0)


func refresh() -> void:
	if _hero != null:
		configure_from_hero(_hero)


func _process(delta: float) -> void:
	if _layers.is_empty():
		return
	if walking:
		_t += delta * 8.0
	else:
		_t = 0.0
	_apply(int(_t) % 4)


func _apply(frame_col: int) -> void:
	var row: int = DIR_ROW.get(direction, 0)
	for s in _layers.values():
		s.frame = row * 4 + frame_col
