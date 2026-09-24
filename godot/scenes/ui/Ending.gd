extends Control
## Credits roll after Morvane falls: the party walks off into the meadow.

var _dolls: Array[PaperDoll] = []
var _t := 0.0


func _ready() -> void:
	set_anchors_preset(PRESET_FULL_RECT)
	var bg := TextureRect.new()
	bg.texture = Assets.tex("backdrops/meadow.png")
	bg.set_anchors_preset(PRESET_FULL_RECT)
	bg.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	bg.modulate = Color(0.9, 0.75, 0.8)
	add_child(bg)

	var stage := Node2D.new()
	add_child(stage)
	var members := GameState.active_party()
	for i in members.size():
		var d := PaperDoll.new()
		d.configure_from_hero(members[i])
		d.position = Vector2(-60 - i * 46, 262)
		d.play("run")
		stage.add_child(d)
		_dolls.append(d)

	var title := Label.new()
	title.text = "THE VEIL IS SEALED"
	title.add_theme_font_override("font", get_theme_font("font", "TitleFont"))
	title.add_theme_font_size_override("font_size", 18)
	title.add_theme_color_override("font_color", Color("ffe27a"))
	title.add_theme_color_override("font_shadow_color", Color(0.2, 0.05, 0.3))
	title.add_theme_constant_override("shadow_offset_x", 2)
	title.add_theme_constant_override("shadow_offset_y", 2)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.position = Vector2(0, 40)
	title.size = Vector2(640, 32)
	add_child(title)

	var lines := VBoxContainer.new()
	lines.position = Vector2(120, 80)
	lines.custom_minimum_size = Vector2(400, 0)
	add_child(lines)
	var mins := int(GameState.play_time / 60.0)
	var facts := ["Heroes of the Veil:"]
	for h in GameState.roster:
		facts.append("   %s, Lv %d %s" % [h.display_name, h.level, h.class_title()])
	facts.append("Play time %d:%02d   Gold %d" % [mins / 60, mins % 60, GameState.gold])
	facts.append("")
	facts.append("Thank you for playing.")
	for f in facts:
		var l := Label.new()
		l.text = f
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		l.add_theme_color_override("font_shadow_color", Color(0, 0, 0))
		l.add_theme_constant_override("shadow_offset_y", 1)
		lines.add_child(l)

	var btn := Button.new()
	btn.text = "Return to title"
	btn.position = Vector2(260, 300)
	btn.pressed.connect(func(): Router.goto("title"))
	add_child(btn)
	btn.call_deferred("grab_focus")
	Sfx.play("victory")


func _process(delta: float) -> void:
	_t += delta
	for i in _dolls.size():
		var d := _dolls[i]
		if d.position.x < 320 + i * 4:
			d.position.x += 42.0 * delta
		elif d.anim != "victory":
			d.play("victory")
