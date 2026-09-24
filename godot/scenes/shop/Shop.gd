extends CanvasLayer
## Buy / sell overlay for town shops. `tier` controls the stock.

signal closed

const STOCK := {
	1: ["potion", "ether", "antidote", "phoenix", "sword_iron", "dagger_iron", "bow_hunting", "staff_oak", "axe_iron", "mace_iron",
		"cloth_traveler", "leather_scout", "chain_mail", "ranger_jerkin", "vestment_acolyte", "robe_apprentice", "hide_barbarian"],
	2: ["potion", "hi_potion", "ether", "antidote", "phoenix", "elixir", "sword_steel", "dagger_shadow", "bow_elven", "staff_arcane", "axe_war", "mace_holy",
		"chain_knight", "plate_steel", "leather_shadow", "hide_warlord", "ranger_elder", "vestment_inquisitor", "robe_arch"],
	3: ["hi_potion", "elixir", "phoenix", "sword_mythril", "plate_royal", "plate_mythril"],
}

var tier := 1
var shop_name := "Shop"

var _mode := "buy"
var _list: VBoxContainer
var _gold: Label
var _status: Label
var _desc: Label
var _buy_btn: Button
var _sell_btn: Button


func _ready() -> void:
	layer = 40
	var dim := ColorRect.new()
	dim.color = Color(0.02, 0.01, 0.04, 0.72)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(dim)
	var root := PanelContainer.new()
	root.position = Vector2(60, 20)
	root.size = Vector2(520, 320)
	add_child(root)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	root.add_child(v)

	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 6)
	v.add_child(top)
	var title := Label.new()
	title.text = shop_name
	title.add_theme_color_override("font_color", Color("ffe27a"))
	title.add_theme_font_size_override("font_size", 20)
	top.add_child(title)
	_buy_btn = Button.new()
	_buy_btn.text = "Buy"
	_buy_btn.toggle_mode = true
	_buy_btn.pressed.connect(func(): _set_mode("buy"))
	top.add_child(_buy_btn)
	_sell_btn = Button.new()
	_sell_btn.text = "Sell"
	_sell_btn.toggle_mode = true
	_sell_btn.pressed.connect(func(): _set_mode("sell"))
	top.add_child(_sell_btn)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(spacer)
	_gold = Label.new()
	_gold.add_theme_color_override("font_color", Color("ffe27a"))
	top.add_child(_gold)
	var close := Button.new()
	close.text = "Leave [Esc]"
	close.pressed.connect(_close)
	top.add_child(close)

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.follow_focus = true
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	v.add_child(scroll)
	_list = VBoxContainer.new()
	_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_list.add_theme_constant_override("separation", 1)
	scroll.add_child(_list)

	_desc = Label.new()
	_desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_desc.custom_minimum_size = Vector2(0, 30)
	_desc.add_theme_font_size_override("font_size", 13)
	_desc.add_theme_color_override("font_color", Color(0.85, 0.8, 0.95))
	v.add_child(_desc)
	_status = Label.new()
	_status.add_theme_color_override("font_color", Color("a8f0c8"))
	_status.add_theme_font_size_override("font_size", 13)
	v.add_child(_status)
	_set_mode("buy")


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("back") or event.is_action_pressed("ui_cancel") or event.is_action_pressed("menu"):
		get_viewport().set_input_as_handled()
		_close()


func _close() -> void:
	Sfx.play("cancel")
	emit_signal("closed")
	queue_free()


func _set_mode(m: String) -> void:
	_mode = m
	_buy_btn.button_pressed = m == "buy"
	_sell_btn.button_pressed = m == "sell"
	_refresh()


func _who_can_use(iid: String) -> String:
	var names: PackedStringArray = []
	for h in GameState.roster:
		if h.can_equip(iid):
			names.append(h.display_name)
	return ("for " + ", ".join(names)) if not names.is_empty() else "nobody in the roster can use this"


func _refresh() -> void:
	_gold.text = "Gold: %d" % GameState.gold
	for c in _list.get_children():
		c.queue_free()
	var first: Button = null
	if _mode == "buy":
		var stock: Array = []
		for t in range(1, tier + 1):
			for iid in STOCK.get(t, []):
				if not (iid in stock):
					stock.append(iid)
		for iid in stock:
			var it := GameData.item(iid)
			var b := Button.new()
			var owned := GameState.item_count(iid)
			b.text = "%-22s %5d g   (have %d)" % [it["name"], int(it["price"]), owned]
			b.icon = Assets.icon(it["icon"])
			b.alignment = HORIZONTAL_ALIGNMENT_LEFT
			b.disabled = GameState.gold < int(it["price"])
			var info := str(it["desc"])
			if it["slot"] in ["weapon", "armor"]:
				info += "  [" + _who_can_use(iid) + "]"
			b.focus_entered.connect(func(): _desc.text = info)
			b.mouse_entered.connect(func(): _desc.text = info)
			b.pressed.connect(func():
				if GameState.gold >= int(it["price"]):
					GameState.add_gold(-int(it["price"]))
					GameState.add_item(iid)
					Sfx.play("coin")
					_status.text = "Bought %s." % it["name"]
					_refresh())
			_list.add_child(b)
			if first == null and not b.disabled:
				first = b
	else:
		for iid in GameState.inventory.keys():
			var it := GameData.item(iid)
			var price := maxi(1, int(int(it["price"]) / 2))
			var b := Button.new()
			b.text = "%-22s x%-3d sells for %d g" % [it["name"], GameState.item_count(iid), price]
			b.icon = Assets.icon(it["icon"])
			b.alignment = HORIZONTAL_ALIGNMENT_LEFT
			var info := str(it["desc"])
			b.focus_entered.connect(func(): _desc.text = info)
			b.mouse_entered.connect(func(): _desc.text = info)
			b.pressed.connect(func():
				if GameState.remove_item(iid):
					GameState.add_gold(price)
					Sfx.play("coin")
					_status.text = "Sold %s for %d gold." % [it["name"], price]
					_refresh())
			_list.add_child(b)
			if first == null:
				first = b
		if GameState.inventory.is_empty():
			var l := Label.new()
			l.text = "Nothing to sell."
			_list.add_child(l)
	if first != null:
		first.call_deferred("grab_focus")
