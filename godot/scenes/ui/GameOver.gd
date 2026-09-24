extends Control
## Shown when the whole party falls.


func _ready() -> void:
	set_anchors_preset(PRESET_FULL_RECT)
	var bg := ColorRect.new()
	bg.color = Color(0.05, 0.02, 0.06)
	bg.set_anchors_preset(PRESET_FULL_RECT)
	add_child(bg)

	var title := Label.new()
	title.text = "THE VEIL CLOSES"
	title.add_theme_font_override("font", get_theme_font("font", "TitleFont"))
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", Color("c04a5a"))
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.set_anchors_and_offsets_preset(PRESET_TOP_WIDE)
	title.offset_top = 90
	add_child(title)

	var sub := Label.new()
	sub.text = "Your party has fallen. The Witness laughs somewhere beyond the dunes."
	sub.add_theme_color_override("font_color", Color(0.75, 0.7, 0.85))
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.set_anchors_and_offsets_preset(PRESET_TOP_WIDE)
	sub.offset_top = 130
	add_child(sub)

	var menu := VBoxContainer.new()
	menu.position = Vector2(240, 190)
	menu.custom_minimum_size = Vector2(160, 0)
	menu.add_theme_constant_override("separation", 6)
	add_child(menu)

	var load_btn := Button.new()
	load_btn.text = "Load last save"
	load_btn.disabled = not GameState.has_save()
	load_btn.pressed.connect(func():
		if GameState.load_game():
			Sfx.play("select")
			Router.goto("overworld"))
	menu.add_child(load_btn)

	var retry := Button.new()
	retry.text = "Rise again (half HP, lose 20% gold)"
	retry.pressed.connect(func():
		for h in GameState.roster:
			h.hp = maxi(1, int(h.max_hp() * 0.5))
			h.mp = maxi(0, int(h.max_mp() * 0.5))
		GameState.add_gold(-int(GameState.gold * 0.2))
		GameState.last_battle_result = {}
		Sfx.play("levelup")
		Router.goto("overworld"))
	retry.disabled = GameState.roster.is_empty()
	menu.add_child(retry)

	var title_btn := Button.new()
	title_btn.text = "Return to title"
	title_btn.pressed.connect(func(): Router.goto("title"))
	menu.add_child(title_btn)
	if not load_btn.disabled:
		load_btn.call_deferred("grab_focus")
	else:
		retry.call_deferred("grab_focus")
