extends Control
## Title screen: New Game / Continue / Settings.

var _menu: VBoxContainer
var _settings: PanelContainer
var _continue_btn: Button
var _diff_btn: Button
var _assist_btn: Button
var _vol_slider: HSlider


func _ready() -> void:
	set_anchors_preset(PRESET_FULL_RECT)
	var bg := TextureRect.new()
	bg.texture = Assets.tex("backdrops/meadow.png")
	bg.set_anchors_preset(PRESET_FULL_RECT)
	bg.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	bg.modulate = Color(0.55, 0.5, 0.7)
	add_child(bg)

	var vignette := ColorRect.new()
	vignette.color = Color(0.03, 0.02, 0.06, 0.45)
	vignette.set_anchors_preset(PRESET_FULL_RECT)
	add_child(vignette)

	var logo := TextureRect.new()
	logo.texture = Assets.tex("ui/logo.png")
	logo.position = Vector2(160, 12)
	logo.stretch_mode = TextureRect.STRETCH_KEEP
	add_child(logo)

	var title := Label.new()
	title.text = "WITNESSED"
	title.add_theme_font_override("font", get_theme_font("font", "TitleFont"))
	title.add_theme_font_size_override("font_size", 28)
	title.add_theme_color_override("font_color", Color("ffe27a"))
	title.add_theme_color_override("font_shadow_color", Color(0.2, 0.05, 0.3))
	title.add_theme_constant_override("shadow_offset_x", 3)
	title.add_theme_constant_override("shadow_offset_y", 3)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.position = Vector2(0, 112)
	title.size = Vector2(640, 32)
	add_child(title)

	var sub := Label.new()
	sub.text = "Chronicles of the Veil"
	sub.add_theme_font_size_override("font_size", 22)
	sub.add_theme_color_override("font_color", Color("d8c8ff"))
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.position = Vector2(0, 146)
	sub.size = Vector2(640, 32)
	add_child(sub)

	_menu = VBoxContainer.new()
	_menu.set_anchors_preset(PRESET_CENTER_TOP)
	_menu.position = Vector2(250, 190)
	_menu.custom_minimum_size = Vector2(140, 0)
	_menu.add_theme_constant_override("separation", 6)
	add_child(_menu)

	var new_btn := _button("New Game", func(): Router.goto("creation"))
	_continue_btn = _button("Continue", _on_continue)
	_continue_btn.disabled = not GameState.has_save()
	_button("Settings", func(): _settings.visible = not _settings.visible)
	_button("Quit", func(): get_tree().quit())
	new_btn.grab_focus()

	_build_settings()

	var hint := Label.new()
	hint.text = "Arrow keys / mouse to navigate  -  Enter to confirm"
	hint.add_theme_color_override("font_color", Color(0.6, 0.55, 0.75))
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.set_anchors_and_offsets_preset(PRESET_BOTTOM_WIDE)
	hint.offset_top = -24
	add_child(hint)


func _button(text: String, cb: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(140, 24)
	b.pressed.connect(func():
		Sfx.play("select")
		cb.call())
	b.focus_entered.connect(func(): Sfx.play("move", -8))
	_menu.add_child(b)
	return b


func _on_continue() -> void:
	if GameState.load_game():
		Router.goto("overworld")


func _build_settings() -> void:
	_settings = PanelContainer.new()
	_settings.position = Vector2(420, 190)
	_settings.custom_minimum_size = Vector2(190, 0)
	_settings.visible = false
	add_child(_settings)
	var v := VBoxContainer.new()
	_settings.add_child(v)
	var l := Label.new()
	l.text = "SETTINGS"
	l.add_theme_color_override("font_color", Color("ffe27a"))
	v.add_child(l)

	_diff_btn = Button.new()
	_diff_btn.pressed.connect(func():
		var order := ["story", "normal", "hard"]
		var i := order.find(str(GameState.settings["difficulty"]))
		GameState.settings["difficulty"] = order[(i + 1) % 3]
		Sfx.play("select")
		_refresh_settings())
	v.add_child(_diff_btn)

	_assist_btn = Button.new()
	_assist_btn.pressed.connect(func():
		GameState.settings["qte_assist"] = not bool(GameState.settings["qte_assist"])
		Sfx.play("select")
		_refresh_settings())
	v.add_child(_assist_btn)

	var vl := Label.new()
	vl.text = "Volume"
	v.add_child(vl)
	_vol_slider = HSlider.new()
	_vol_slider.min_value = 0
	_vol_slider.max_value = 1
	_vol_slider.step = 0.05
	_vol_slider.value = float(GameState.settings["volume"])
	_vol_slider.value_changed.connect(func(val): GameState.settings["volume"] = val)
	v.add_child(_vol_slider)

	var info := Label.new()
	info.text = "Story: gentle enemies, wide\nparry windows.\nHard: brutal enemies,\ntight windows."
	info.add_theme_color_override("font_color", Color(0.7, 0.66, 0.8))
	v.add_child(info)
	_refresh_settings()


func _refresh_settings() -> void:
	_diff_btn.text = "Difficulty: %s" % str(GameState.settings["difficulty"]).capitalize()
	_assist_btn.text = "Parry assist: %s" % ("On" if bool(GameState.settings["qte_assist"]) else "Off")
