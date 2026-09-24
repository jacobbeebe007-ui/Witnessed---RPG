class_name SheetSprite
extends Sprite2D
## Animated sprite-sheet driven by the generated JSON index (enemies + effects).

signal anim_finished(anim: String)
signal hit_frame(anim: String)

var anims: Dictionary = {}
var anim := "idle"
var frame_size := 64
var speed := 1.0
var one_shot_free := false
var hit_at := 2
var _t := 0.0
var _idx := -1
var _hit_emitted := false
var _finished := false


func setup_enemy(sprite_id: String) -> void:
	var info := Assets.enemy_info(sprite_id)
	frame_size = int(info.get("frame", 64))
	anims = info.get("anims", {})
	texture = Assets.tex("enemies/%s.png" % sprite_id)
	centered = false
	hframes = _total_frames()
	vframes = 1
	offset = Vector2(-frame_size / 2.0, -frame_size * 0.9)
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	play("idle")


func setup_effect(fx_id: String, fps: float = 14.0) -> void:
	var info: Dictionary = Assets.effect_index.get(fx_id, {"frames": 6, "size": 64})
	frame_size = int(info["size"])
	var n := int(info["frames"])
	anims = {"play": {"start": 0, "count": n, "fps": fps, "loop": false}}
	texture = Assets.tex("effects/%s.png" % fx_id)
	centered = true
	hframes = n
	vframes = 1
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	one_shot_free = true
	play("play")


func _total_frames() -> int:
	var total := 1
	for a in anims.values():
		total = maxi(total, int(a["start"]) + int(a["count"]))
	return total


func has_anim(name: String) -> bool:
	return anims.has(name)


func resolve(generic: String) -> String:
	## Map generic battle verbs to whatever this sheet provides.
	if anims.has(generic):
		return generic
	match generic:
		"attack":
			for cand in ["attack_swing", "attack_staff", "cast"]:
				if anims.has(cand):
					return cand
		"death":
			if anims.has("ko"):
				return "ko"
		"cast":
			for cand in ["attack_staff", "attack", "attack_swing"]:
				if anims.has(cand):
					return cand
		"victory":
			return "idle"
	return "idle"


func play(name: String, p_speed: float = 1.0) -> void:
	anim = resolve(name)
	speed = p_speed
	_t = 0.0
	_idx = -1
	_hit_emitted = false
	_finished = false
	var count := int(anims.get(anim, {"count": 1})["count"])
	hit_at = maxi(0, int(round(count * 0.5)))
	_process(0.0)


func anim_duration(name: String, p_speed: float = 1.0) -> float:
	var a: Dictionary = anims.get(resolve(name), {"count": 1, "fps": 6})
	return float(a["count"]) / (float(a["fps"]) * maxf(0.05, p_speed))


func _process(delta: float) -> void:
	if anims.is_empty():
		return
	var a: Dictionary = anims.get(anim, {"start": 0, "count": 1, "fps": 6, "loop": true})
	var count := int(a["count"])
	_t += delta
	var idx := int(floor(_t * float(a["fps"]) * speed))
	if bool(a["loop"]):
		idx = idx % count
	elif idx >= count:
		idx = count - 1
		if not _finished:
			_finished = true
			emit_signal("anim_finished", anim)
			if one_shot_free:
				queue_free()
	if idx != _idx:
		_idx = idx
		frame = int(a["start"]) + idx
		if idx >= hit_at and not _hit_emitted:
			_hit_emitted = true
			emit_signal("hit_frame", anim)


func flash(color: Color = Color(1, 0.5, 0.5), duration: float = 0.25) -> void:
	modulate = color
	var tw := create_tween()
	tw.tween_property(self, "modulate", Color.WHITE, duration)
