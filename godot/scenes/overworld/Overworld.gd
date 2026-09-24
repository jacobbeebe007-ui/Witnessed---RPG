extends Node2D
## Overworld exploration: tile map, party trail, encounters, NPCs, towns, bosses.

const SPEED := 84.0
const TILE := WorldGen.TILE
const PartyMenuScene := preload("res://scenes/menu/PartyMenu.gd")
const ShopScene := preload("res://scenes/shop/Shop.gd")

var world := WorldGen.new()
var ground: TileMapLayer
var world_node: Node2D
var camera: Camera2D
var player: OverworldDoll
var followers: Array[OverworldDoll] = []
var poi_nodes: Dictionary = {}
var dialogue: DialogueBox
var hud: CanvasLayer
var prompt: Label
var region_label: Label
var banner: Label
var gold_label: Label
var party_box: VBoxContainer
var toast: Label

var _dir := "down"
var _trail: PackedVector2Array = PackedVector2Array()
var _step_accum := 0.0
var _current_region := ""
var _locked := false
var _menu_open := false
var _near_poi: Dictionary = {}
var _toast_tw: Tween


func _ready() -> void:
	world.generate()
	_build_map()
	_build_objects()
	_build_pois()
	_build_player()
	_build_hud()
	dialogue = DialogueBox.new()
	add_child(dialogue)
	GameState.party_changed.connect(_refresh_party)
	GameState.gold_changed.connect(func(_g): _refresh_party())
	_refresh_party()
	_check_region(true)
	call_deferred("_after_ready")


func _after_ready() -> void:
	if GameState.flags.get("intro_pending", false):
		GameState.flags.erase("intro_pending")
		_locked = true
		await dialogue.say(GameData.STORY["intro"])
		await dialogue.say(GameData.STORY["hollowmere"])
		_locked = false
	var res: Dictionary = GameState.last_battle_result
	if not res.is_empty():
		GameState.last_battle_result = {}
		if res.get("boss_flag", "") == "boss_lich" and res.get("won", false):
			_locked = true
			await dialogue.say(GameData.STORY["ending"])
			Router.goto("ending")
			return
		_refresh_pois()


# ---------------------------------------------------------------------------
# construction
# ---------------------------------------------------------------------------
func _build_map() -> void:
	var ts := TileSet.new()
	ts.tile_size = Vector2i(TILE, TILE)
	var src := TileSetAtlasSource.new()
	src.texture = Assets.tex("overworld/tileset.png")
	src.texture_region_size = Vector2i(TILE, TILE)
	var count := WorldGen.T.size()
	var animated := {8: 9, 22: 23}
	for i in count:
		if i in animated.values():
			continue
		var coords := Vector2i(i % 8, i / 8)
		src.create_tile(coords)
		if animated.has(i):
			src.set_tile_animation_columns(coords, 2)
			src.set_tile_animation_frames_count(coords, 2)
			src.set_tile_animation_frame_duration(coords, 0, 0.7)
			src.set_tile_animation_frame_duration(coords, 1, 0.7)
	ts.add_source(src, 0)
	ground = TileMapLayer.new()
	ground.tile_set = ts
	ground.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	add_child(ground)
	for y in WorldGen.H:
		for x in WorldGen.W:
			var t := world.tile_at(x, y)
			if t == 9:
				t = 8
			elif t == 23:
				t = 22
			ground.set_cell(Vector2i(x, y), 0, Vector2i(t % 8, t / 8))
	world_node = Node2D.new()
	world_node.y_sort_enabled = true
	add_child(world_node)


func _build_objects() -> void:
	for o in world.objects:
		var s := Sprite2D.new()
		s.texture = Assets.tex("overworld/objects/%s.png" % o["kind"])
		if s.texture == null:
			continue
		var t: Vector2i = o["tile"]
		var sz: Vector2i = o["size"]
		s.centered = false
		var w := s.texture.get_width()
		var h := s.texture.get_height()
		var foot := Vector2((t.x + sz.x * 0.5) * TILE, (t.y + sz.y) * TILE)
		s.position = Vector2(foot.x - w / 2.0, foot.y - h)
		s.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		s.z_index = 0
		# y-sort by the bottom of the sprite
		s.offset = Vector2.ZERO
		var holder := Node2D.new()
		holder.position = foot
		s.position = Vector2(-w / 2.0, -h)
		holder.add_child(s)
		world_node.add_child(holder)


func _poi_pos(p: Dictionary) -> Vector2:
	var t: Vector2i = p["tile"]
	return Vector2((t.x + 0.5) * TILE, (t.y + 1) * TILE)


func _build_pois() -> void:
	for p in world.pois:
		var holder := Node2D.new()
		holder.position = _poi_pos(p)
		world_node.add_child(holder)
		poi_nodes[p["id"]] = holder
		match p["kind"]:
			"companion":
				var c: Dictionary = GameData.COMPANIONS[p["id"]]
				var doll := OverworldDoll.new()
				var tmp := Hero.create(p["id"], c["name"], c["gender"], c["class"], 1)
				doll.configure(c["gender"], c["skin"], c["hair"], c["hair_color"], tmp.armor_sprite())
				doll.direction = "down"
				holder.add_child(doll)
			"boss":
				var s := SheetSprite.new()
				s.setup_enemy(GameData.ENEMIES[p["data"]["enemy"]]["sprite"])
				s.scale = Vector2(0.5, 0.5)
				s.flip_h = true
				holder.add_child(s)
			"chest":
				var s := Sprite2D.new()
				s.texture = Assets.tex("overworld/objects/chest.png")
				s.centered = false
				s.position = Vector2(-10, -14)
				holder.add_child(s)
			"sign":
				var s := Sprite2D.new()
				s.texture = Assets.tex("overworld/objects/sign.png")
				s.centered = false
				s.position = Vector2(-8, -22)
				holder.add_child(s)
			_:
				pass
	_refresh_pois()


func _refresh_pois() -> void:
	for p in world.pois:
		var node: Node2D = poi_nodes.get(p["id"])
		if node == null:
			continue
		match p["kind"]:
			"companion":
				node.visible = not GameState.flags.get("recruited_" + p["id"], false) and _poi_available(p)
			"boss":
				node.visible = not GameState.flags.get(p["data"]["flag"] + "_defeated", false)
			"chest":
				var opened: bool = GameState.flags.get("chest_" + p["id"], false)
				var s: Sprite2D = node.get_child(0)
				s.texture = Assets.tex("overworld/objects/%s.png" % ("chest_open" if opened else "chest"))


func _poi_available(p: Dictionary) -> bool:
	var req = p["data"].get("requires", null)
	if req == null:
		return true
	if req is String:
		return GameState.flags.get(req + "_defeated", false)
	for r in req:
		if not GameState.flags.get(str(r) + "_defeated", false):
			return false
	return true


func _build_player() -> void:
	player = OverworldDoll.new()
	world_node.add_child(player)
	var start := Vector2((world.start_tile.x + 0.5) * TILE, (world.start_tile.y + 1) * TILE)
	if GameState.world_pos != Vector2.ZERO:
		start = GameState.world_pos
	player.position = start
	_trail.clear()
	for i in 64:
		_trail.append(start)
	camera = Camera2D.new()
	camera.limit_left = 0
	camera.limit_top = 0
	camera.limit_right = WorldGen.W * TILE
	camera.limit_bottom = WorldGen.H * TILE
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 8.0
	player.add_child(camera)
	camera.make_current()
	_refresh_party()


func _build_hud() -> void:
	hud = CanvasLayer.new()
	hud.layer = 10
	add_child(hud)
	var panel := PanelContainer.new()
	panel.position = Vector2(6, 6)
	hud.add_child(panel)
	party_box = VBoxContainer.new()
	party_box.add_theme_constant_override("separation", 2)
	panel.add_child(party_box)

	var right := PanelContainer.new()
	right.position = Vector2(640 - 204, 6)
	right.custom_minimum_size = Vector2(198, 0)
	hud.add_child(right)
	var rv := VBoxContainer.new()
	right.add_child(rv)
	region_label = Label.new()
	region_label.add_theme_color_override("font_color", Color("ffe27a"))
	rv.add_child(region_label)
	gold_label = Label.new()
	rv.add_child(gold_label)
	var hint := Label.new()
	hint.text = "WASD move  E talk  Tab menu"
	hint.add_theme_font_size_override("font_size", 13)
	hint.add_theme_color_override("font_color", Color(0.6, 0.55, 0.75))
	rv.add_child(hint)

	prompt = Label.new()
	prompt.position = Vector2(0, 232)
	prompt.size = Vector2(640, 20)
	prompt.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	prompt.add_theme_color_override("font_color", Color("ffe27a"))
	prompt.add_theme_color_override("font_shadow_color", Color(0, 0, 0))
	prompt.add_theme_constant_override("shadow_offset_y", 1)
	hud.add_child(prompt)

	banner = Label.new()
	banner.position = Vector2(0, 60)
	banner.size = Vector2(640, 40)
	banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	banner.add_theme_font_override("font", ThemeDB.get_project_theme().get_font("font", "TitleFont"))
	banner.add_theme_font_size_override("font_size", 14)
	banner.add_theme_color_override("font_color", Color("ffe27a"))
	banner.add_theme_color_override("font_shadow_color", Color(0, 0, 0))
	banner.add_theme_constant_override("shadow_offset_x", 2)
	banner.add_theme_constant_override("shadow_offset_y", 2)
	banner.modulate.a = 0.0
	hud.add_child(banner)

	toast = Label.new()
	toast.position = Vector2(0, 100)
	toast.size = Vector2(640, 24)
	toast.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast.add_theme_color_override("font_color", Color("a8f0c8"))
	toast.add_theme_color_override("font_shadow_color", Color(0, 0, 0))
	toast.add_theme_constant_override("shadow_offset_y", 1)
	toast.modulate.a = 0.0
	hud.add_child(toast)


func _refresh_party() -> void:
	if party_box == null:
		return
	for c in party_box.get_children():
		c.queue_free()
	var members := GameState.active_party()
	for h in members:
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 6)
		var nm := Label.new()
		nm.text = "%s  Lv%d" % [h.display_name, h.level]
		nm.custom_minimum_size.x = 96
		nm.add_theme_color_override("font_color", Color.WHITE if h.is_alive() else Color(0.7, 0.4, 0.4))
		row.add_child(nm)
		var bars := VBoxContainer.new()
		bars.add_theme_constant_override("separation", 1)
		var hp := ProgressBar.new()
		hp.custom_minimum_size = Vector2(70, 6)
		hp.max_value = h.max_hp()
		hp.value = h.hp
		hp.show_percentage = false
		bars.add_child(hp)
		var mp := ProgressBar.new()
		mp.custom_minimum_size = Vector2(70, 4)
		mp.max_value = maxi(1, h.max_mp())
		mp.value = h.mp
		mp.show_percentage = false
		var fill := StyleBoxFlat.new()
		fill.bg_color = Color("4a7aff")
		mp.add_theme_stylebox_override("fill", fill)
		bars.add_child(mp)
		row.add_child(bars)
		var vals := Label.new()
		vals.text = "%d/%d" % [h.hp, h.max_hp()]
		vals.add_theme_color_override("font_color", Color(0.85, 0.8, 0.95))
		row.add_child(vals)
		party_box.add_child(row)
	gold_label.text = "Gold: %d" % GameState.gold
	# party dolls
	if player != null:
		var leader := GameState.leader()
		if leader != null:
			player.configure_from_hero(leader)
		for f in followers:
			f.queue_free()
		followers.clear()
		for i in range(1, members.size()):
			var d := OverworldDoll.new()
			d.configure_from_hero(members[i])
			d.position = player.position
			d.modulate = Color(0.92, 0.92, 0.92)
			world_node.add_child(d)
			followers.append(d)
		_update_followers()


# ---------------------------------------------------------------------------
# movement
# ---------------------------------------------------------------------------
func _physics_process(delta: float) -> void:
	if _locked or _menu_open or (dialogue != null and dialogue.active):
		player.walking = false
		for f in followers:
			f.walking = false
		return
	var v := Vector2.ZERO
	if Input.is_action_pressed("move_left"):
		v.x -= 1
	if Input.is_action_pressed("move_right"):
		v.x += 1
	if Input.is_action_pressed("move_up"):
		v.y -= 1
	if Input.is_action_pressed("move_down"):
		v.y += 1
	if v != Vector2.ZERO:
		v = v.normalized()
		if absf(v.x) >= absf(v.y):
			_dir = "right" if v.x > 0 else "left"
		else:
			_dir = "down" if v.y > 0 else "up"
		var before := player.position
		var moved := _move(v * SPEED * delta)
		player.walking = moved
		player.direction = _dir
		if moved:
			var dist := player.position.distance_to(before)
			_trail.insert(0, player.position)
			if _trail.size() > 96:
				_trail.resize(96)
			_update_followers()
			_step_accum += dist
			if _step_accum >= TILE:
				_step_accum -= TILE
				_on_step()
	else:
		player.walking = false
		for f in followers:
			f.walking = false
	_update_prompt()


func _move(delta_v: Vector2) -> bool:
	var moved := false
	var p := player.position
	var nx := Vector2(p.x + delta_v.x, p.y)
	if _free(nx):
		player.position = nx
		moved = moved or delta_v.x != 0.0
	var ny := Vector2(player.position.x, player.position.y + delta_v.y)
	if _free(ny):
		player.position = ny
		moved = moved or delta_v.y != 0.0
	return moved


func _free(pos: Vector2) -> bool:
	## The character's feet occupy a small box around `pos` (its bottom-centre).
	for off in [Vector2(-5, -6), Vector2(5, -6), Vector2(-5, -1), Vector2(5, -1)]:
		var q: Vector2 = pos + off
		var tx := int(floor(q.x / TILE))
		var ty := int(floor(q.y / TILE))
		if world.is_blocked(tx, ty):
			return false
	return true


func _update_followers() -> void:
	for i in followers.size():
		var idx := mini(_trail.size() - 1, (i + 1) * 9)
		var f := followers[i]
		var target := _trail[idx]
		var d := target - f.position
		f.walking = d.length() > 0.5
		if d.length() > 0.5:
			if absf(d.x) >= absf(d.y):
				f.direction = "right" if d.x > 0 else "left"
			else:
				f.direction = "down" if d.y > 0 else "up"
		f.position = target


func _player_tile() -> Vector2i:
	return Vector2i(int(floor(player.position.x / TILE)), int(floor((player.position.y - 2) / TILE)))


func _on_step() -> void:
	GameState.world_pos = player.position
	_check_region(false)
	var t := _player_tile()
	var reg := world.region_at(t.x, t.y)
	var tile := world.tile_at(t.x, t.y)
	if reg == "town" or tile in WorldGen.ROAD:
		return
	var info: Dictionary = GameData.REGIONS.get(reg, GameData.REGIONS["meadow"])
	var rate: float = float(info["rate"])
	if tile == WorldGen.T["tall_grass"]:
		rate *= 1.6
	if randf() < rate:
		_start_random_battle(reg)


func _check_region(silent: bool) -> void:
	var t := _player_tile()
	var reg := world.region_at(t.x, t.y)
	if reg == _current_region:
		return
	_current_region = reg
	var info: Dictionary = GameData.REGIONS.get(reg, GameData.REGIONS["meadow"])
	region_label.text = str(info["name"]) if reg != "town" else _town_name()
	if silent:
		return
	_show_banner(region_label.text)
	var story_key: String = {"meadow": "", "forest": "thornwood", "wastes": "wastes", "ruins": "ruins", "cave": ""}.get(reg, "")
	if story_key != "" and not GameState.flags.get("visited_" + story_key, false):
		GameState.flags["visited_" + story_key] = true
		_locked = true
		await dialogue.say(GameData.STORY[story_key])
		_locked = false


func _town_name() -> String:
	return "Hollowmere" if player.position.x < 600 else "Dustwatch"


func _show_banner(text: String) -> void:
	banner.text = text
	banner.modulate.a = 1.0
	var tw := create_tween()
	tw.tween_interval(1.4)
	tw.tween_property(banner, "modulate:a", 0.0, 0.8)


func show_toast(text: String) -> void:
	toast.text = text
	toast.modulate.a = 1.0
	if _toast_tw != null:
		_toast_tw.kill()
	_toast_tw = create_tween()
	_toast_tw.tween_interval(1.8)
	_toast_tw.tween_property(toast, "modulate:a", 0.0, 0.6)


# ---------------------------------------------------------------------------
# interaction
# ---------------------------------------------------------------------------
func _update_prompt() -> void:
	prompt.visible = not (_locked or _menu_open or (dialogue != null and dialogue.active))
	_near_poi = {}
	var best := 26.0
	for p in world.pois:
		var node: Node2D = poi_nodes.get(p["id"])
		if node == null or not node.visible:
			continue
		var d := player.position.distance_to(_poi_pos(p))
		if d < best:
			best = d
			_near_poi = p
	if _near_poi.is_empty():
		prompt.text = ""
		return
	match _near_poi["kind"]:
		"companion":
			prompt.text = "[E] Talk to %s" % _near_poi["label"]
		"boss":
			prompt.text = "[E] Challenge %s" % _near_poi["label"]
		"chest":
			prompt.text = "" if GameState.flags.get("chest_" + _near_poi["id"], false) else "[E] Open chest"
		"inn":
			prompt.text = "[E] Rest at the %s (%d gold)" % [_near_poi["label"], int(_near_poi["data"]["price"])]
		"shop":
			prompt.text = "[E] Browse the %s" % _near_poi["label"]
		"sign":
			prompt.text = "[E] Read sign"


func _unhandled_input(event: InputEvent) -> void:
	if _locked or (dialogue != null and dialogue.active):
		return
	if event.is_action_pressed("menu") and not _menu_open:
		get_viewport().set_input_as_handled()
		_open_menu()
		return
	if _menu_open:
		return
	if event.is_action_pressed("interact") and not _near_poi.is_empty():
		get_viewport().set_input_as_handled()
		_interact(_near_poi)


func _open_menu() -> void:
	_menu_open = true
	var menu = PartyMenuScene.new()
	add_child(menu)
	menu.closed.connect(func():
		_menu_open = false
		_refresh_party())


func _interact(p: Dictionary) -> void:
	_locked = true
	match p["kind"]:
		"sign":
			await dialogue.say([p["data"]["text"]])
		"chest":
			if not GameState.flags.get("chest_" + p["id"], false):
				GameState.flags["chest_" + p["id"]] = true
				var d: Dictionary = p["data"]
				var got: Array = []
				if d.has("gold"):
					GameState.add_gold(int(d["gold"]))
					got.append("%d gold" % int(d["gold"]))
				if d.has("item"):
					GameState.add_item(d["item"], int(d.get("count", 1)))
					got.append("%s x%d" % [GameData.item(d["item"])["name"], int(d.get("count", 1))])
				Sfx.play("coin")
				_refresh_pois()
				await dialogue.say(["Found " + ", ".join(got) + "!"])
		"inn":
			var price := int(p["data"]["price"])
			var choice := await dialogue.ask("Rest for the night? (%d gold) Restores the whole party and saves the game." % price, ["Rest", "Not now"], p["label"])
			if choice == 0:
				if GameState.gold >= price:
					GameState.add_gold(-price)
					GameState.rest()
					GameState.world_pos = player.position
					GameState.save_game()
					Sfx.play("heal")
					await dialogue.say(["You sleep soundly. The party is fully restored and your progress is saved."])
				else:
					await dialogue.say(["\"No coin, no bed,\" the innkeeper says, not unkindly."])
		"shop":
			var shop = ShopScene.new()
			shop.tier = int(p["data"]["tier"])
			shop.shop_name = p["label"]
			add_child(shop)
			await shop.closed
			_refresh_party()
		"companion":
			await _talk_companion(p)
		"boss":
			await _challenge_boss(p)
	_locked = false


func _talk_companion(p: Dictionary) -> void:
	var c: Dictionary = GameData.COMPANIONS[p["id"]]
	var node: Node2D = poi_nodes[p["id"]]
	var doll: OverworldDoll = node.get_child(0)
	var d := player.position - node.position
	doll.direction = ("right" if d.x > 0 else "left") if absf(d.x) > absf(d.y) else ("down" if d.y > 0 else "up")
	await dialogue.say(c["greet"], c["name"])
	var choice := await dialogue.ask("Invite %s to join the party?" % c["name"], ["Yes", "Later"], c["name"])
	if choice == 0:
		var h := GameState.recruit(p["id"])
		Sfx.play("levelup")
		_refresh_pois()
		var msg: String = c["join"]
		if not (h.id in GameState.party):
			msg += " (Party full - swap members in the menu.)"
		await dialogue.say([msg, "%s is a level %d %s." % [h.display_name, h.level, h.class_title()]])


func _challenge_boss(p: Dictionary) -> void:
	var d: Dictionary = p["data"]
	if d.has("requires"):
		var missing: Array = []
		for r in d["requires"]:
			if not GameState.flags.get(str(r) + "_defeated", false):
				missing.append(GameData.ENEMIES[r]["name"])
		if not missing.is_empty():
			await dialogue.say(["A ward of violet light hurls you back. The tower will not open while the Veil's seals still stand:", ", ".join(missing) + "."])
			return
	await dialogue.say(GameData.STORY[d["intro"]])
	var choice := await dialogue.ask("Fight %s?" % GameData.ENEMIES[d["enemy"]]["name"], ["Fight!", "Retreat"])
	if choice != 0:
		return
	GameState.world_pos = player.position - Vector2(0, 18)
	GameState.pending_battle = {"enemies": [d["enemy"]], "backdrop": GameData.REGIONS.get(d["region"], {}).get("backdrop", d["region"]), "boss_flag": d["flag"], "boss": true, "region": d["region"]}
	Sfx.play("encounter")
	Router.goto("battle", 0.5)


func _start_random_battle(reg: String) -> void:
	_locked = true
	var info: Dictionary = GameData.REGIONS[reg]
	var n := randi_range(int(info["min_group"]), int(info["max_group"]))
	var enemies: Array = []
	var table: Array = info["table"]
	for i in n:
		enemies.append(table[randi() % table.size()])
	GameState.world_pos = player.position
	GameState.pending_battle = {"enemies": enemies, "backdrop": info["backdrop"], "boss_flag": "", "boss": false, "region": reg}
	Sfx.play("encounter")
	Router.flash(Color(1, 1, 1, 0.8), 0.3)
	await get_tree().create_timer(0.25).timeout
	Router.goto("battle", 0.4)
