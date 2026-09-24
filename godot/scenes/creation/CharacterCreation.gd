extends Control
## Character creation: name, gender, class, skin, hair and a live animated preview.

const CLASS_ORDER := ["knight", "mage", "rogue", "ranger", "brute", "inquisitor"]
const HAIR_COLORS := [Color("2a1a12"), Color("6a3a1a"), Color("b8742a"), Color("e8d08a"), Color("b83a2a"), Color("e8e0f0"), Color("3a3a48"), Color("5a2a8a"), Color("2a6a9a"), Color("3f8f5a")]
const ANIM_CYCLE := ["idle", "attack_swing", "cast", "hurt", "guard", "victory", "run"]

var gender := "male"
var class_id := "knight"
var skin_i := 0
var hair_i := 0
var hair_color_i := 0
var _name_edit: LineEdit
var _doll: PaperDoll
var _class_buttons: Dictionary = {}
var _stats_label: RichTextLabel
var _class_desc: RichTextLabel
var _skills_label: RichTextLabel
var _skin_label: Label
var _hair_label: Label
var _gender_btn: Button
var _anim_i := 0
var _preview_hero: Hero
var _anim_label: Label


func _skins() -> Array:
	return Assets.hero_index.get("skin_tones", ["fair"])


func _hairs() -> Array:
	return Assets.hero_index.get("hair_styles", ["short"])


func _ready() -> void:
	set_anchors_preset(PRESET_FULL_RECT)
	var bg := ColorRect.new()
	bg.color = Color(0.07, 0.05, 0.12)
	bg.set_anchors_preset(PRESET_FULL_RECT)
	add_child(bg)

	var header := Label.new()
	header.text = "CREATE YOUR HERO"
	header.add_theme_font_override("font", get_theme_font("font", "TitleFont"))
	header.add_theme_font_size_override("font_size", 12)
	header.add_theme_color_override("font_color", Color("ffe27a"))
	header.position = Vector2(16, 10)
	add_child(header)

	# --- preview panel ---------------------------------------------------
	var preview := PanelContainer.new()
	preview.position = Vector2(16, 32)
	preview.custom_minimum_size = Vector2(196, 250)
	add_child(preview)
	var stage := Control.new()
	stage.custom_minimum_size = Vector2(180, 236)
	preview.add_child(stage)
	var floor_rect := ColorRect.new()
	floor_rect.color = Color(0.12, 0.09, 0.2)
	floor_rect.position = Vector2(0, 0)
	floor_rect.size = Vector2(180, 196)
	stage.add_child(floor_rect)
	_doll = PaperDoll.new()
	_doll.position = Vector2(84, 186)
	_doll.scale = Vector2(2.4, 2.4)
	stage.add_child(_doll)
	_anim_label = Label.new()
	_anim_label.position = Vector2(4, 197)
	_anim_label.add_theme_color_override("font_color", Color(0.7, 0.66, 0.8))
	stage.add_child(_anim_label)
	var anim_btn := Button.new()
	anim_btn.text = "Cycle animation"
	anim_btn.position = Vector2(4, 213)
	anim_btn.pressed.connect(func():
		_anim_i = (_anim_i + 1) % ANIM_CYCLE.size()
		Sfx.play("select")
		_play_preview())
	stage.add_child(anim_btn)

	# --- options ----------------------------------------------------------
	var opts := VBoxContainer.new()
	opts.position = Vector2(224, 32)
	opts.custom_minimum_size = Vector2(190, 0)
	opts.add_theme_constant_override("separation", 4)
	add_child(opts)

	var name_row := HBoxContainer.new()
	opts.add_child(name_row)
	var nl := Label.new()
	nl.text = "Name"
	nl.custom_minimum_size.x = 48
	name_row.add_child(nl)
	_name_edit = LineEdit.new()
	_name_edit.text = "Aeryn"
	_name_edit.max_length = 12
	_name_edit.custom_minimum_size.x = 130
	name_row.add_child(_name_edit)

	_gender_btn = Button.new()
	_gender_btn.pressed.connect(func():
		gender = "female" if gender == "male" else "male"
		hair_i = _hairs().find("long" if gender == "female" else "short")
		if _name_edit.text in ["Aeryn", "Aerin"]:
			_name_edit.text = "Aerin" if gender == "female" else "Aeryn"
		Sfx.play("select")
		_refresh())
	opts.add_child(_gender_btn)

	var cl := Label.new()
	cl.text = "Class"
	cl.add_theme_color_override("font_color", Color("ffe27a"))
	opts.add_child(cl)
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 4)
	grid.add_theme_constant_override("v_separation", 4)
	opts.add_child(grid)
	for cid in CLASS_ORDER:
		var b := Button.new()
		b.custom_minimum_size = Vector2(92, 22)
		b.toggle_mode = true
		b.pressed.connect(func():
			class_id = cid
			Sfx.play("select")
			_refresh())
		grid.add_child(b)
		_class_buttons[cid] = b

	var row_skin := HBoxContainer.new()
	opts.add_child(row_skin)
	_skin_label = _cycle_row(row_skin, "Skin", func(d):
		skin_i = posmod(skin_i + d, _skins().size())
		_refresh())
	var row_hair := HBoxContainer.new()
	opts.add_child(row_hair)
	_hair_label = _cycle_row(row_hair, "Hair", func(d):
		hair_i = posmod(hair_i + d, _hairs().size())
		_refresh())
	var row_col := HBoxContainer.new()
	opts.add_child(row_col)
	var cl2 := Label.new()
	cl2.text = "Hair colour"
	cl2.custom_minimum_size.x = 60
	row_col.add_theme_constant_override("separation", 1)
	row_col.add_child(cl2)
	for i in HAIR_COLORS.size():
		var cb := Button.new()
		cb.custom_minimum_size = Vector2(12, 14)
		cb.add_theme_stylebox_override("normal", _swatch(HAIR_COLORS[i]))
		cb.add_theme_stylebox_override("hover", _swatch(HAIR_COLORS[i].lightened(0.3)))
		cb.add_theme_stylebox_override("pressed", _swatch(HAIR_COLORS[i]))
		cb.add_theme_stylebox_override("focus", _swatch(HAIR_COLORS[i].lightened(0.2)))
		cb.pressed.connect(func():
			hair_color_i = i
			_refresh())
		row_col.add_child(cb)

	var begin := Button.new()
	begin.text = "Begin the journey"
	begin.custom_minimum_size = Vector2(190, 28)
	begin.pressed.connect(_begin)
	opts.add_child(begin)
	var back := Button.new()
	back.text = "Back"
	back.pressed.connect(func(): Router.goto("title"))
	opts.add_child(back)

	# --- info column --------------------------------------------------------
	var info := PanelContainer.new()
	info.position = Vector2(428, 32)
	info.custom_minimum_size = Vector2(196, 316)
	add_child(info)
	var iv := VBoxContainer.new()
	info.add_child(iv)
	_class_desc = RichTextLabel.new()
	_class_desc.bbcode_enabled = true
	_class_desc.fit_content = true
	_class_desc.custom_minimum_size = Vector2(184, 70)
	_class_desc.scroll_active = false
	iv.add_child(_class_desc)
	_stats_label = RichTextLabel.new()
	_stats_label.bbcode_enabled = true
	_stats_label.fit_content = true
	_stats_label.custom_minimum_size = Vector2(184, 90)
	_stats_label.scroll_active = false
	iv.add_child(_stats_label)
	_skills_label = RichTextLabel.new()
	_skills_label.bbcode_enabled = true
	_skills_label.fit_content = true
	_skills_label.custom_minimum_size = Vector2(184, 120)
	_skills_label.scroll_active = false
	iv.add_child(_skills_label)

	hair_i = maxi(0, _hairs().find("short"))
	_refresh()
	_name_edit.grab_focus()


func _swatch(c: Color) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = c
	s.border_color = Color(0.9, 0.85, 0.6)
	s.set_border_width_all(1)
	return s


func _cycle_row(row: HBoxContainer, label: String, cb: Callable) -> Label:
	var l := Label.new()
	l.text = label
	l.custom_minimum_size.x = 48
	row.add_child(l)
	var prev := Button.new()
	prev.text = "<"
	prev.pressed.connect(func():
		Sfx.play("move")
		cb.call(-1))
	row.add_child(prev)
	var val := Label.new()
	val.custom_minimum_size.x = 90
	val.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	row.add_child(val)
	var next := Button.new()
	next.text = ">"
	next.pressed.connect(func():
		Sfx.play("move")
		cb.call(1))
	row.add_child(next)
	return val


func _make_hero() -> Hero:
	var h := Hero.create("player", _name_edit.text.strip_edges(), gender, class_id, 1)
	h.skin = _skins()[skin_i]
	h.hair = _hairs()[hair_i]
	h.hair_color = HAIR_COLORS[hair_color_i]
	return h


func _refresh() -> void:
	_gender_btn.text = "Body: %s" % ("Female" if gender == "female" else "Male")
	for cid in _class_buttons:
		_class_buttons[cid].text = GameData.class_name_for(cid, gender)
		_class_buttons[cid].button_pressed = (cid == class_id)
	_skin_label.text = str(_skins()[skin_i]).capitalize()
	_hair_label.text = str(_hairs()[hair_i]).capitalize()
	_preview_hero = _make_hero()
	_doll.configure_from_hero(_preview_hero)
	_play_preview()
	var c: Dictionary = GameData.CLASSES[class_id]
	_class_desc.text = "[color=#ffe27a]%s[/color] - [i]%s[/i]\n%s" % [GameData.class_name_for(class_id, gender), c["role"], c["desc"]]
	var h := _preview_hero
	_stats_label.text = "[color=#b0a0d0]Level 1 stats[/color]\nHP %d   MP %d\nATK %d   MAG %d\nDEF %d   RES %d\nSPD %d   LUCK %d\nWeapons: %s" % [
		h.max_hp(), h.max_mp(), h.attack(), h.magic(), h.defense(), h.resistance(), h.speed(), h.luck(), ", ".join(c["weapons"])]
	var lines := "[color=#b0a0d0]Abilities by level[/color]\n"
	for entry in c["skills"]:
		var s: Dictionary = GameData.SKILLS[entry[1]]
		lines += "[color=#ffe27a]Lv%d[/color] %s\n" % [int(entry[0]), s["name"]]
	_skills_label.text = lines


func _play_preview() -> void:
	var a: String = ANIM_CYCLE[_anim_i]
	if a == "attack_swing":
		a = _preview_hero.attack_anim()
	_doll.play(a)
	_anim_label.text = "Animation: " + a.replace("attack_", "attack: ")


func _process(_delta: float) -> void:
	# loop the non-looping preview animations
	var a: String = ANIM_CYCLE[_anim_i]
	if a == "attack_swing":
		a = _preview_hero.attack_anim()
	if not bool(Assets.hero_anim(a)["loop"]) and _doll._finished_emitted:
		_doll.play(a)


func _begin() -> void:
	if _name_edit.text.strip_edges() == "":
		_name_edit.text = "Aeryn"
	Sfx.play("levelup")
	GameState.new_game(_make_hero())
	GameState.flags["intro_pending"] = true
	Router.goto("overworld")
