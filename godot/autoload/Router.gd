extends CanvasLayer
## Scene transitions with a fade, plus a tiny scene registry.

const SCENES := {
	"title": "res://scenes/title/Title.tscn",
	"creation": "res://scenes/creation/CharacterCreation.tscn",
	"overworld": "res://scenes/overworld/Overworld.tscn",
	"battle": "res://scenes/battle/Battle.tscn",
	"gameover": "res://scenes/ui/GameOver.tscn",
	"ending": "res://scenes/ui/Ending.tscn",
}

var _fade: ColorRect
var _busy := false


func _ready() -> void:
	layer = 100
	_fade = ColorRect.new()
	_fade.color = Color(0.04, 0.02, 0.06, 0.0)
	_fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fade.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_fade)


func goto(key: String, duration: float = 0.35) -> void:
	if _busy:
		return
	_busy = true
	var path: String = SCENES.get(key, key)
	var tw := create_tween()
	tw.tween_property(_fade, "color:a", 1.0, duration)
	await tw.finished
	get_tree().change_scene_to_file(path)
	await get_tree().process_frame
	await get_tree().process_frame
	var tw2 := create_tween()
	tw2.tween_property(_fade, "color:a", 0.0, duration)
	await tw2.finished
	_busy = false


func flash(color: Color = Color.WHITE, duration: float = 0.15) -> void:
	var prev := _fade.color
	_fade.color = color
	var tw := create_tween()
	tw.tween_property(_fade, "color", Color(prev.r, prev.g, prev.b, 0.0), duration)
