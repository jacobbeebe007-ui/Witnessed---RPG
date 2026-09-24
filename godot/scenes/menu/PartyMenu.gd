extends CanvasLayer
## In-game menu overlay: party line-up, equipment (with live model preview), skills, items, save.

signal closed

const TABS := ["Party", "Equip", "Skills", "Items", "System"]

var _tab := 0
var _selected: Hero = null
var _tab_buttons: Array[Button] = []
var _roster_box: VBoxContainer
var _content: VBoxContainer
var _preview: PaperDoll
var _preview_holder: Control
var _preview_label: Label
var _status: Label
var _anim_timer := 0.0


func _ready() -> void:
	layer = 40
	var dim := ColorRect.new()
	dim.color = Color(0.02, 0.01, 0.04, 0.72)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(dim)

	var root := PanelContainer.new()
	root.position = Vector2(16, 12)
	root.size = Vector2(608, 336)
	add_child(root)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	root.add_child(v)

	var tabs := HBoxContainer.new()
	tabs.add_theme_constant_override("separation", 4)
	v.add_child(tabs)
	for i in TABS.size():
		var b := Button.new()
		b.text = TABS[i]
		b.toggle_mode = true
		b.custom_minimum_size = Vector2(76, 20)
		b.pressed.connect(_set_tab.bind(i))
		tabs.add_child(b)
		_tab_buttons.append(b)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tabs.add_child(spacer)
	var gold := Label.new()
	gold.text = "Gold: %d" % GameState.gold
	gold.add_theme_color_override("font_color", Color("ffe27a"))
	tabs.add_child(gold)
	var close := Button.new()
	close.text = "Close [Esc]"
	close.pressed.connect(_close)
	tabs.add_child(close)

	var body := HBoxContainer.new()
	body.add_theme_constant_override("separation", 8)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(body)

	var left := VBoxContainer.new()
	left.custom_minimum_size = Vector2(150, 0)
	body.add_child(left)
	var lt := Label.new()
	lt.text = "Roster  (%d/%d in party)" % [GameState.party.size(), GameData.PARTY_SIZE]
	lt.add_theme_color_override("font_color", Color(0.7, 0.65, 0.85))
	left.add_child(lt)
	_roster_box = VBoxContainer.new()
	_roster_box.add_theme_constant_override("separation", 2)
	left.add_child(_roster_box)

	var mid := VBoxContainer.new()
	mid.custom_minimum_size = Vector2(130, 0)
	body.add_child(mid)
	_preview_holder = Control.new()
	_preview_holder.custom_minimum_size = Vector2(130, 190)
	mid.add_child(_preview_holder)
	_preview = PaperDoll.new()
	_preview.position = Vector2(65, 178)
	_preview.scale = Vector2(2.2, 2.2)
	_preview_holder.add_child(_preview)
	_preview_label = Label.new()
	_preview_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_preview_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_preview_label.custom_minimum_size = Vector2(130, 0)
	_preview_label.add_theme_font_size_override("font_size", 13)
	mid.add_child(_preview_label)

	var scroll := ScrollContainer.new()
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.follow_focus = true
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	body.add_child(scroll)
	_content = VBoxContainer.new()
	_content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_content.add_theme_constant_override("separation", 2)
	scroll.add_child(_content)

	_status = Label.new()
	_status.add_theme_color_override("font_color", Color("a8f0c8"))
	_status.add_theme_font_size_override("font_size", 13)
	v.add_child(_status)

	_selected = GameState.leader()
	_refresh_roster()
	_set_tab(0)
	Sfx.play("select")


func _process(delta: float) -> void:
	_anim_timer += delta
	if _preview != null and _preview.anim == "idle" and _anim_timer > 4.0:
		_anim_timer = 0.0
		_preview.play("victory")
	elif _preview != null and _preview.anim == "victory" and _anim_timer > 1.6:
		_anim_timer = 0.0
		_preview.play("idle")


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("menu") or event.is_action_pressed("back") or event.is_action_pressed("ui_cancel"):
		get_viewport().set_input_as_handled()
		_close()


func _close() -> void:
	Sfx.play("cancel")
	emit_signal("closed")
	queue_free()


func _set_tab(i: int) -> void:
	_tab = i
	for j in _tab_buttons.size():
		_tab_buttons[j].button_pressed = j == i
	_refresh_content()


func _select_hero(h: Hero) -> void:
	_selected = h
	_refresh_roster()
	_refresh_content()


func _refresh_roster() -> void:
	for c in _roster_box.get_children():
		c.queue_free()
	for h in GameState.roster:
		var b := Button.new()
		var in_party := h.id in GameState.party
		b.text = "%s%s\nLv%d %s" % ["* " if in_party else "  ", h.display_name, h.level, h.class_title()]
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.custom_minimum_size = Vector2(150, 34)
		b.toggle_mode = true
		b.button_pressed = h == _selected
		if not in_party:
			b.modulate = Color(0.75, 0.75, 0.8)
		b.pressed.connect(_select_hero.bind(h))
		_roster_box.add_child(b)
	if _selected != null:
		_preview.configure_from_hero(_selected)
		_preview.play("idle")
		_anim_timer = 0.0
		_preview_label.text = "%s\n%s  Lv %d\n%s / %s" % [_selected.display_name, _selected.class_title(), _selected.level,
			GameData.item(_selected.weapon)["name"], GameData.item(_selected.armor)["name"]]


func _clear_content() -> void:
	for c in _content.get_children():
		c.queue_free()


func _label(text: String, color: Color = Color.WHITE, size: int = 16) -> Label:
	var l := Label.new()
	l.text = text
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.add_theme_color_override("font_color", color)
	l.add_theme_font_size_override("font_size", size)
	_content.add_child(l)
	return l


func _refresh_content() -> void:
	_clear_content()
	if _selected == null:
		return
	match _tab:
		0:
			_tab_party()
		1:
			_tab_equip()
		2:
			_tab_skills()
		3:
			_tab_items()
		4:
			_tab_system()


# ---------------------------------------------------------------------------
func _tab_party() -> void:
	var h := _selected
	_label("%s the %s" % [h.display_name, h.class_title()], Color("ffe27a"), 20)
	_label(GameData.CLASSES[h.class_id]["role"], Color(0.7, 0.65, 0.85), 13)
	_label("HP %d/%d    MP %d/%d" % [h.hp, h.max_hp(), h.mp, h.max_mp()])
	_label("ATK %d   MAG %d   DEF %d" % [h.attack(), h.magic(), h.defense()])
	_label("RES %d   SPD %d   LCK %d" % [h.resistance(), h.speed(), h.luck()])
	_label("XP %d   (next level in %d)" % [h.xp, h.xp_to_next()] if h.level < GameData.MAX_LEVEL else "XP %d   (max level)" % h.xp)
	var in_party := h.id in GameState.party
	var b := Button.new()
	b.text = "Remove from party" if in_party else "Add to party"
	b.disabled = (in_party and GameState.party.size() <= 1) or (not in_party and GameState.party.size() >= GameData.PARTY_SIZE)
	b.pressed.connect(func():
		if GameState.toggle_party_member(h.id):
			Sfx.play("equip")
			_status.text = "%s %s the active party." % [h.display_name, "leaves" if in_party else "joins"]
		_refresh_roster()
		_refresh_content())
	_content.add_child(b)
	if in_party and GameState.party.size() > 1 and GameState.party[0] != h.id:
		var lead := Button.new()
		lead.text = "Make party leader"
		lead.pressed.connect(func():
			var ids := GameState.party.duplicate()
			ids.erase(h.id)
			ids.insert(0, h.id)
			GameState.set_party(ids)
			Sfx.play("equip")
			_status.text = "%s now leads the party." % h.display_name
			_refresh_roster()
			_refresh_content())
		_content.add_child(lead)
	_label("Active party members fight in battle (up to %d). Reserves still gain no XP, so rotate them at inns." % GameData.PARTY_SIZE, Color(0.7, 0.65, 0.85), 13)


func _tab_equip() -> void:
	var h := _selected
	_label("Weapon: " + GameData.item(h.weapon)["name"], Color("ffe27a"))
	var any_w := false
	for iid in GameState.inventory:
		if GameData.WEAPONS.has(iid) and h.can_equip(iid):
			any_w = true
			_content.add_child(_equip_button(h, iid))
	if not any_w:
		_label("  (no other usable weapons in the bag)", Color(0.6, 0.55, 0.75), 13)
	_label("Armour: " + GameData.item(h.armor)["name"], Color("ffe27a"))
	var any_a := false
	for iid in GameState.inventory:
		if GameData.ARMORS.has(iid) and h.can_equip(iid):
			any_a = true
			_content.add_child(_equip_button(h, iid))
	if not any_a:
		_label("  (no other usable armour in the bag)", Color(0.6, 0.55, 0.75), 13)
	var c: Dictionary = GameData.CLASSES[h.class_id]
	_label("Can use: %s / %s" % [", ".join(PackedStringArray(c["weapons"])), ", ".join(PackedStringArray(c["armors"]))], Color(0.7, 0.65, 0.85), 13)


func _equip_button(h: Hero, iid: String) -> Button:
	var it := GameData.item(iid)
	var b := Button.new()
	var delta := _stat_delta(h, iid)
	b.text = "%s x%d   %s" % [it["name"], GameState.item_count(iid), delta]
	b.icon = Assets.icon(it["icon"])
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	b.tooltip_text = it["desc"]
	b.pressed.connect(func():
		if GameState.equip(h, iid):
			Sfx.play("equip")
			_status.text = "%s equips %s." % [h.display_name, it["name"]]
			_refresh_roster()
			_refresh_content())
	return b


func _stat_delta(h: Hero, iid: String) -> String:
	var before := {"atk": h.attack(), "mag": h.magic(), "def": h.defense(), "res": h.resistance(), "hp": h.max_hp(), "spd": h.speed()}
	var saved_w := h.weapon
	var saved_a := h.armor
	if GameData.WEAPONS.has(iid):
		h.weapon = iid
	else:
		h.armor = iid
	var after := {"atk": h.attack(), "mag": h.magic(), "def": h.defense(), "res": h.resistance(), "hp": h.max_hp(), "spd": h.speed()}
	h.weapon = saved_w
	h.armor = saved_a
	var bits: PackedStringArray = []
	for k in after:
		var d: int = int(after[k]) - int(before[k])
		if d != 0:
			bits.append("%s%+d" % [k.to_upper(), d])
	return " ".join(bits)


func _tab_skills() -> void:
	var h := _selected
	_label("%s's abilities" % h.display_name, Color("ffe27a"))
	for sid in h.skills():
		var sk: Dictionary = GameData.SKILLS[sid]
		_label("%s   AP %d  MP %d" % [sk["name"], int(sk.get("ap", 0)), int(sk.get("mp", 0))], Color("d8c8ff"))
		_label("   " + str(sk["desc"]), Color(0.8, 0.78, 0.9), 13)
	var upcoming: Array = []
	for entry in GameData.CLASSES[h.class_id]["skills"]:
		if int(entry[0]) > h.level:
			upcoming.append("Lv%d %s" % [int(entry[0]), GameData.SKILLS[entry[1]]["name"]])
	if not upcoming.is_empty():
		_label("Next: " + ", ".join(PackedStringArray(upcoming)), Color(0.6, 0.55, 0.75), 13)


func _tab_items() -> void:
	var h := _selected
	_label("Use on %s" % h.display_name, Color("ffe27a"))
	var any := false
	for iid in GameState.inventory:
		var it := GameData.item(iid)
		var b := Button.new()
		b.text = "%s x%d" % [it["name"], GameState.item_count(iid)]
		b.icon = Assets.icon(it["icon"])
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.tooltip_text = it["desc"]
		if it["slot"] == "consumable":
			any = true
			b.pressed.connect(func():
				var msg := GameState.use_consumable(iid, h)
				if msg == "":
					Sfx.play("cancel")
					_status.text = "That would have no effect."
				else:
					Sfx.play("heal")
					_status.text = msg
				_refresh_roster()
				_refresh_content())
		else:
			b.disabled = true
		_content.add_child(b)
	if not any:
		_label("No consumables. Shops in Hollowmere and Dustwatch sell potions.", Color(0.6, 0.55, 0.75), 13)


func _tab_system() -> void:
	var mins := int(GameState.play_time / 60.0)
	_label("Play time %d:%02d    Difficulty: %s" % [mins / 60, mins % 60, str(GameState.settings.get("difficulty", "normal")).capitalize()])
	var save := Button.new()
	save.text = "Save game"
	save.pressed.connect(func():
		if GameState.save_game():
			Sfx.play("coin")
			_status.text = "Game saved."
		else:
			_status.text = "Could not write the save file.")
	_content.add_child(save)
	var assist := Button.new()
	assist.text = "Parry assist: %s" % ("ON" if bool(GameState.settings.get("qte_assist", false)) else "OFF")
	assist.pressed.connect(func():
		GameState.settings["qte_assist"] = not bool(GameState.settings.get("qte_assist", false))
		Sfx.play("select")
		_refresh_content())
	_content.add_child(assist)
	var diff := Button.new()
	diff.text = "Difficulty: %s" % str(GameState.settings.get("difficulty", "normal")).capitalize()
	diff.pressed.connect(func():
		var order := ["story", "normal", "hard"]
		var i := order.find(str(GameState.settings.get("difficulty", "normal")))
		GameState.settings["difficulty"] = order[(i + 1) % order.size()]
		Sfx.play("select")
		_refresh_content())
	_content.add_child(diff)
	var title := Button.new()
	title.text = "Return to title"
	title.pressed.connect(func():
		emit_signal("closed")
		queue_free()
		Router.goto("title"))
	_content.add_child(title)
	_label("Controls: WASD/arrows move, E talk, Tab menu. Battle: Enter confirm, Esc back, Space parry, Shift dodge.", Color(0.7, 0.65, 0.85), 13)
