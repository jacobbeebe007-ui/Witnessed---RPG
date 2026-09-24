class_name DialogueBox
extends CanvasLayer
## Bottom-of-screen dialogue box with typewriter text and optional choices.

signal _advanced
signal _chosen(index: int)

var active := false
var _panel: PanelContainer
var _name_label: Label
var _text: RichTextLabel
var _choices: HBoxContainer
var _hint: Label
var _typing := false
var _tw: Tween


func _ready() -> void:
	layer = 50
	_panel = PanelContainer.new()
	_panel.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	_panel.offset_left = 24
	_panel.offset_right = -24
	_panel.offset_top = -92
	_panel.offset_bottom = -10
	_panel.visible = false
	add_child(_panel)
	var v := VBoxContainer.new()
	_panel.add_child(v)
	_name_label = Label.new()
	_name_label.add_theme_color_override("font_color", Color("ffe27a"))
	v.add_child(_name_label)
	_text = RichTextLabel.new()
	_text.bbcode_enabled = true
	_text.fit_content = false
	_text.scroll_active = false
	_text.custom_minimum_size = Vector2(0, 44)
	_text.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(_text)
	_choices = HBoxContainer.new()
	_choices.alignment = BoxContainer.ALIGNMENT_END
	_choices.add_theme_constant_override("separation", 8)
	v.add_child(_choices)
	_hint = Label.new()
	_hint.text = "[Enter]"
	_hint.add_theme_color_override("font_color", Color(0.6, 0.55, 0.75))
	_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	v.add_child(_hint)


func say(lines: Array, speaker: String = "") -> void:
	active = true
	_panel.visible = true
	_choices.visible = false
	_hint.visible = true
	_name_label.text = speaker
	_name_label.visible = speaker != ""
	for line in lines:
		_text.text = str(line)
		_text.visible_ratio = 0.0
		_typing = true
		if _tw != null:
			_tw.kill()
		_tw = create_tween()
		_tw.tween_property(_text, "visible_ratio", 1.0, maxf(0.2, str(line).length() * 0.018))
		_tw.finished.connect(func(): _typing = false)
		await _advanced
	_panel.visible = false
	active = false


func ask(question: String, options: Array, speaker: String = "") -> int:
	active = true
	_panel.visible = true
	_hint.visible = false
	_name_label.text = speaker
	_name_label.visible = speaker != ""
	_text.text = question
	_text.visible_ratio = 1.0
	for c in _choices.get_children():
		c.queue_free()
	_choices.visible = true
	var first: Button = null
	for i in options.size():
		var b := Button.new()
		b.text = str(options[i])
		b.custom_minimum_size = Vector2(80, 22)
		b.pressed.connect(func():
			Sfx.play("select")
			emit_signal("_chosen", i))
		_choices.add_child(b)
		if first == null:
			first = b
	await get_tree().process_frame
	if first != null:
		first.grab_focus()
	var result: int = await _chosen
	for c in _choices.get_children():
		c.queue_free()
	_panel.visible = false
	active = false
	return result


func _unhandled_input(event: InputEvent) -> void:
	if not active or _choices.visible:
		return
	if event.is_action_pressed("confirm") or event.is_action_pressed("interact") or event.is_action_pressed("ui_accept"):
		get_viewport().set_input_as_handled()
		if _typing:
			if _tw != null:
				_tw.kill()
			_text.visible_ratio = 1.0
			_typing = false
		else:
			Sfx.play("move", -6)
			emit_signal("_advanced")
