extends Node
## Headless test suite. Run with:
##   godot --headless --path godot res://tests/TestRunner.tscn
## Exits with code 0 when every check passes, 1 otherwise.

var _passed := 0
var _failed := 0
var _failures: Array[String] = []


func _ready() -> void:
	await get_tree().process_frame
	await _run()
	print("\n==== %d passed, %d failed ====" % [_passed, _failed])
	for f in _failures:
		print("  FAIL: " + f)
	get_tree().quit(0 if _failed == 0 else 1)


func check(cond: bool, what: String) -> void:
	if cond:
		_passed += 1
	else:
		_failed += 1
		_failures.append(what)
		push_error("FAIL: " + what)


func section(name: String) -> void:
	print("\n-- " + name)


# ---------------------------------------------------------------------------
func _run() -> void:
	_test_scripts_compile()
	_test_data_integrity()
	_test_assets_exist()
	_test_hero_progression()
	_test_game_state()
	_test_combatant()
	_test_world_gen()
	await _test_scenes_instantiate()
	await _test_battle_simulation()


func _all_scripts(dir: String, out: Array) -> void:
	var d := DirAccess.open(dir)
	if d == null:
		return
	d.list_dir_begin()
	var f := d.get_next()
	while f != "":
		var p := dir.path_join(f)
		if d.current_is_dir():
			if not f.begins_with("."):
				_all_scripts(p, out)
		elif f.ends_with(".gd"):
			out.append(p)
		f = d.get_next()


func _test_scripts_compile() -> void:
	section("scripts compile")
	var scripts: Array = []
	for root in ["res://autoload", "res://scripts", "res://scenes", "res://tests"]:
		_all_scripts(root, scripts)
	check(scripts.size() >= 15, "found scripts (%d)" % scripts.size())
	for p in scripts:
		var s = load(p)
		check(s != null and s is GDScript and (s as GDScript).can_instantiate(), "script loads: " + p)
	for key in Router.SCENES:
		var ps = load(Router.SCENES[key])
		check(ps != null and ps is PackedScene, "scene loads: " + str(Router.SCENES[key]))


func _test_data_integrity() -> void:
	section("data integrity")
	for cid in GameData.CLASSES:
		var c: Dictionary = GameData.CLASSES[cid]
		check(GameData.WEAPONS.has(c["start_weapon"]), "%s start weapon exists" % cid)
		check(GameData.ARMORS.has(c["start_armor"]), "%s start armor exists" % cid)
		check(GameData.WEAPONS[c["start_weapon"]]["type"] in c["weapons"], "%s can use its start weapon" % cid)
		check(GameData.ARMORS[c["start_armor"]]["family"] in c["armors"], "%s can use its start armor" % cid)
		var lv1 := 0
		for entry in c["skills"]:
			check(GameData.SKILLS.has(entry[1]), "%s skill exists: %s" % [cid, entry[1]])
			if int(entry[0]) == 1:
				lv1 += 1
		check(lv1 >= 2, "%s has 2 skills at level 1" % cid)
		check(c["skills"].size() == 8, "%s has 8 abilities" % cid)
	for sid in GameData.SKILLS:
		var sk: Dictionary = GameData.SKILLS[sid]
		check(Assets.effect_index.has(sk.get("fx", "hit")), "skill fx exists: %s" % sid)
		check(sk["target"] in ["enemy", "enemies", "ally", "allies", "self"], "skill target valid: %s" % sid)
		if sk.has("status"):
			check(GameData.STATUS_INFO.has(sk["status"]["id"]), "skill status known: %s" % sid)
	for eid in GameData.ENEMIES:
		var e: Dictionary = GameData.ENEMIES[eid]
		check(Assets.enemy_index.has(e["sprite"]), "enemy sprite indexed: %s" % eid)
		check(Assets.has_tex("enemies/%s.png" % e["sprite"]), "enemy sheet exists: %s" % eid)
		for sid in e["skills"]:
			check(GameData.SKILLS.has(sid), "enemy skill exists: %s/%s" % [eid, sid])
		for iid in e["drops"]:
			check(GameData.item(iid)["slot"] != "unknown", "drop is an item: %s/%s" % [eid, iid])
	for rid in GameData.REGIONS:
		for eid in GameData.REGIONS[rid]["table"]:
			check(GameData.ENEMIES.has(eid), "region enemy exists: %s/%s" % [rid, eid])
		check(Assets.has_tex("backdrops/%s.png" % GameData.REGIONS[rid]["backdrop"]), "region backdrop exists: " + rid)
	for cid in GameData.COMPANIONS:
		var c: Dictionary = GameData.COMPANIONS[cid]
		check(GameData.CLASSES.has(c["class"]), "companion class: " + cid)
		check(c["hair"] in Assets.hero_index["hair_styles"], "companion hair: " + cid)
		check(c["skin"] in Assets.hero_index["skin_tones"], "companion skin: " + cid)
	check(GameData.xp_for_level(2) > 0 and GameData.xp_for_level(10) > GameData.xp_for_level(9), "xp curve increases")


func _test_assets_exist() -> void:
	section("generated assets")
	for g in ["male", "female"]:
		for tone in Assets.hero_index["skin_tones"]:
			check(Assets.has_tex("heroes/body_%s_%s.png" % [g, tone]), "body sheet %s/%s" % [g, tone])
			check(Assets.has_tex("overworld/ow_body_%s_%s.png" % [g, tone]), "overworld body %s/%s" % [g, tone])
		for aid in GameData.ARMORS:
			check(Assets.has_tex("armor/%s_%s.png" % [GameData.ARMORS[aid]["sprite"], g]), "armor sheet %s/%s" % [aid, g])
			check(Assets.has_tex("overworld/ow_outfit_%s_%s.png" % [GameData.ARMORS[aid]["sprite"], g]), "overworld outfit %s/%s" % [aid, g])
		for wid in GameData.WEAPONS:
			check(Assets.has_tex("weapons/%s_%s.png" % [GameData.WEAPONS[wid]["sprite"], g]), "weapon sheet %s/%s" % [wid, g])
		for hs in Assets.hero_index["hair_styles"]:
			check(Assets.has_tex("hair/hair_%s_%s.png" % [hs, g]), "hair sheet %s/%s" % [hs, g])
	var anims: Dictionary = Assets.hero_index["anims"]
	for a in ["idle", "run", "attack_swing", "attack_bow", "attack_staff", "cast", "hurt", "guard", "parry", "dodge", "ko", "victory"]:
		check(anims.has(a), "hero animation present: " + a)
	var tex := Assets.tex("heroes/body_female_fair.png")
	check(tex != null and tex.get_width() == Assets.hero_frame_count() * 80 and tex.get_height() == 240, "hero sheet dimensions match index")
	for name in ["sword", "potion", "fire", "ap", "break"]:
		check(Assets.icon(name) != null, "icon exists: " + name)
	check(Assets.has_tex("overworld/tileset.png") and Assets.has_tex("ui/target.png"), "tileset + target arrow")


func _test_hero_progression() -> void:
	section("hero progression")
	var h := Hero.create("t", "Test", "female", "mage", 1)
	check(h.max_hp() > 0 and h.max_mp() > 0 and h.attack() > 0, "stats positive")
	check(h.weapon_type() == "staff" and h.attack_anim() == "attack_staff", "mage animates with staff")
	check(h.skills().size() == 2, "two skills at level 1")
	var events := h.add_xp(GameData.xp_for_level(3))
	check(h.level == 3, "reached level 3 (got %d)" % h.level)
	check(events.size() == 2 and "gale" in events[1]["skills"], "level 3 unlocks Gale")
	check(h.skills().size() == 3, "three skills at level 3")
	var before_atk := h.magic()
	h.add_xp(GameData.xp_for_level(20) - h.xp)
	check(h.level == 20 and h.magic() > before_atk and h.skills().size() == 8, "level 20 has all 8 skills and higher magic")
	check(h.can_equip("staff_arcane") and not h.can_equip("plate_steel") and h.can_equip("robe_arch"), "class equip restrictions")
	var d := h.to_dict()
	var h2 := Hero.from_dict(d)
	check(h2.level == h.level and h2.xp == h.xp and h2.class_id == "mage" and h2.hair_color.is_equal_approx(h.hair_color), "hero dict round-trip")
	var k := Hero.create("k", "K", "male", "knight", 1)
	var w_before := k.attack()
	k.weapon = "sword_steel"
	check(k.attack() > w_before, "better weapon raises attack")
	check(k.weapon_sprite() == "sword_steel" and k.armor_sprite() == "chain_mail", "model sprites follow equipment")


func _test_game_state() -> void:
	section("game state")
	var h := Hero.create("player", "Aeryn", "female", "ranger", 1)
	GameState.new_game(h)
	check(GameState.party == ["player"] and GameState.gold == 120 and GameState.item_count("potion") == 3, "new game defaults")
	for cid in ["kaelen", "sera", "lyra", "dorn"]:
		GameState.recruit(cid)
	check(GameState.roster.size() == 5 and GameState.party.size() == 4, "party capped at 4 with 5 in roster")
	check(not GameState.toggle_party_member("dorn"), "cannot add a 5th member")
	check(GameState.toggle_party_member("sera") and GameState.toggle_party_member("dorn"), "swap members")
	check(GameState.flags.get("recruited_lyra", false), "recruit flag set")
	GameState.add_item("bow_elven")
	var lyra := GameState.hero_by_id("lyra")
	check(GameState.equip(lyra, "bow_elven") and lyra.weapon == "bow_elven" and GameState.item_count("bow_hunting") == 1, "equip swaps old gear into bag")
	check(not GameState.equip(lyra, "plate_steel"), "cannot equip unusable gear")
	lyra.hp = 5
	var msg := GameState.use_consumable("potion", lyra)
	check(msg != "" and lyra.hp > 5 and GameState.item_count("potion") == 2, "potion heals and is consumed")
	GameState.flags["boss_ogre_defeated"] = true
	GameState.world_pos = Vector2(333, 444)
	check(GameState.save_game() and GameState.has_save(), "save written")
	var snapshot := GameState.to_dict()
	GameState.new_game(Hero.create("x", "X", "male", "brute", 1))
	check(GameState.load_game(), "save loaded")
	check(GameState.roster.size() == 5 and GameState.gold == snapshot["gold"] and GameState.flags.get("boss_ogre_defeated", false) and GameState.world_pos == Vector2(333, 444), "loaded state matches")
	check(GameState.hero_by_id("lyra").weapon == "bow_elven", "loaded equipment matches")


func _test_combatant() -> void:
	section("combatant")
	var e := Combatant.from_enemy("slime", 0, 1, 1.0)
	check(e.max_hp == 34 and e.display_name == "Veil Slime", "enemy base stats")
	var e2 := Combatant.from_enemy("slime", 0, 11, 1.0)
	check(e2.max_hp > e.max_hp and e2.atk > e.atk, "enemies scale with party level")
	var e3 := Combatant.from_enemy("slime", 0, 1, 1.35)
	check(e3.max_hp > e.max_hp, "hard difficulty raises hp")
	check(not e.add_break(2) and e.add_break(2) and e.broken, "break gauge fills at threshold")
	e.recover_from_break()
	check(not e.broken and e.break_gauge == 0, "break recovery")
	e.add_status("burn", 2)
	var ev := e.tick_statuses()
	check(ev.size() == 1 and int(ev[0]["damage"]) >= 1, "burn ticks")
	e.expire_statuses()
	e.expire_statuses()
	check(not e.has_status("burn"), "status expires")
	e.add_status("stun", 1)
	check(not e.can_act(), "stun prevents acting")
	var h := Hero.create("p", "P", "male", "brute", 5)
	var c := Combatant.from_hero(h, 0)
	c.hp = int(c.max_hp * 0.2)
	c.add_status("rage", 3)
	check(c.eff_attack() > float(c.atk) * 1.3 and c.eff_defense() < float(c.def), "blood rage scales with missing hp")
	c.apply_damage(9999)
	check(not c.is_alive() and c.statuses.is_empty(), "death clears statuses")


func _test_world_gen() -> void:
	section("world generation")
	var w := WorldGen.new()
	w.generate()
	check(not w.is_blocked(w.start_tile.x, w.start_tile.y), "start tile walkable")
	check(w.pois.size() >= 20, "world has POIs (%d)" % w.pois.size())
	# BFS reachability from the start tile to a tile adjacent to every POI
	var visited := {}
	var queue: Array[Vector2i] = [w.start_tile]
	visited[w.start_tile] = true
	while not queue.is_empty():
		var t: Vector2i = queue.pop_front()
		for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
			var n: Vector2i = t + d
			if n.x < 0 or n.y < 0 or n.x >= WorldGen.W or n.y >= WorldGen.H:
				continue
			if visited.has(n) or w.is_blocked(n.x, n.y):
				continue
			visited[n] = true
			queue.append(n)
	check(visited.size() > 2000, "walkable area is large (%d tiles)" % visited.size())
	var ids := {}
	for p in w.pois:
		ids[p["id"]] = true
		var t: Vector2i = p["tile"]
		var reachable := false
		for d in [Vector2i(0, 0), Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1), Vector2i(0, 2), Vector2i(1, 1), Vector2i(-1, 1)]:
			if visited.has(t + d):
				reachable = true
		check(reachable, "POI reachable: %s at %s" % [p["id"], str(t)])
		if p["kind"] == "boss":
			check(GameData.ENEMIES.has(p["data"]["enemy"]), "boss enemy exists: " + str(p["id"]))
		if p["kind"] == "companion":
			check(GameData.COMPANIONS.has(p["id"]), "companion exists: " + str(p["id"]))
	for cid in GameData.COMPANIONS:
		check(ids.has(cid), "companion placed in world: " + cid)
	for b in ["boss_ogre", "boss_golem", "boss_drake", "boss_lich"]:
		check(ids.has(b), "boss placed in world: " + b)


func _test_scenes_instantiate() -> void:
	section("scenes instantiate")
	GameState.new_game(Hero.create("player", "Aeryn", "female", "knight", 3))
	GameState.recruit("kaelen")
	for key in ["title", "creation", "gameover", "ending", "overworld"]:
		var ps: PackedScene = load(Router.SCENES[key])
		var inst = ps.instantiate()
		add_child(inst)
		await get_tree().process_frame
		await get_tree().process_frame
		check(is_instance_valid(inst), "scene runs: " + key)
		if key == "overworld":
			check(inst.player != null and inst.followers.size() == 1, "overworld spawns leader + follower")
			var menu = load("res://scenes/menu/PartyMenu.gd").new()
			inst.add_child(menu)
			await get_tree().process_frame
			check(is_instance_valid(menu), "party menu opens")
			menu._set_tab(1)
			menu._set_tab(2)
			menu._set_tab(3)
			menu._set_tab(4)
			await get_tree().process_frame
			menu._close()
			var shop = load("res://scenes/shop/Shop.gd").new()
			shop.tier = 2
			shop.shop_name = "Test Shop"
			inst.add_child(shop)
			await get_tree().process_frame
			shop._set_mode("sell")
			await get_tree().process_frame
			check(is_instance_valid(shop), "shop opens")
			shop._close()
			await get_tree().process_frame
		inst.queue_free()
		await get_tree().process_frame


func _test_battle_simulation() -> void:
	section("battle simulation")
	GameState.new_game(Hero.create("player", "Aeryn", "female", "knight", 8))
	GameState.recruit("sera")
	GameState.recruit("lyra")
	GameState.recruit("amos")
	GameState.pending_battle = {"enemies": ["slime", "goblin", "wolf"], "backdrop": "meadow", "boss_flag": "", "boss": false, "region": "meadow"}
	var ps: PackedScene = load(Router.SCENES["battle"])
	var b = ps.instantiate()
	add_child(b)
	await get_tree().process_frame
	check(b.heroes.size() == 4 and b.enemies.size() == 3, "battle spawns 4 heroes and 3 enemies")
	check(b.enemies[0].display_name == "Veil Slime" and b.heroes[0].node is PaperDoll and b.enemies[0].node is SheetSprite, "combatants have nodes")
	var xp_before: int = GameState.hero_by_id("player").xp
	var actions := 0
	var used_skill := false
	var deadline := Time.get_ticks_msec() + 90000
	var perfect_seen := false
	while not b._finished and Time.get_ticks_msec() < deadline:
		await get_tree().process_frame
		if b._qte_active and b._qte_press_t < 0.0:
			# press exactly on time: heroes land perfects, enemies get parried
			var ring = b._qte_ring
			if ring != null and b._qte_t >= ring.duration - 0.03:
				b._qte_press_t = b._qte_t
				b._qte_press_kind = "attack" if b._qte_mode == "attack" else "parry"
		if b.main_menu.visible and b._current != null and b._current.is_hero:
			var targets: Array = []
			for e in b.enemies:
				if e.is_alive():
					targets.append(e)
			if targets.is_empty():
				continue
			b.main_menu.visible = false
			actions += 1
			var c = b._current
			var sid := ""
			for s in c.skill_ids:
				var sk: Dictionary = GameData.SKILLS[s]
				if sk["kind"] in ["attack", "spell"] and c.ap >= int(sk.get("ap", 0)) and c.mp >= int(sk.get("mp", 0)):
					sid = s
					break
			if sid != "" and not used_skill:
				used_skill = true
				var sk: Dictionary = GameData.SKILLS[sid]
				var tg: Array = targets if sk["target"] == "enemies" else [targets[0]]
				b.emit_signal("_action_chosen", {"type": "skill", "skill": sid, "targets": tg})
			else:
				b.emit_signal("_action_chosen", {"type": "attack", "targets": [targets[0]]})
	for n in b.fx_layer.get_children():
		if n is Label and str(n.text).begins_with("PERFECT"):
			perfect_seen = true
	check(b._finished, "battle finished within time limit (%d actions)" % actions)
	check(actions >= 2 and used_skill, "heroes took actions incl. a skill")
	var all_dead := true
	for e in b.enemies:
		if e.is_alive():
			all_dead = false
	check(all_dead, "all enemies defeated")
	await get_tree().create_timer(1.2).timeout
	check(b.results_panel.visible, "results panel shown")
	check(GameState.hero_by_id("player").xp > xp_before, "xp awarded")
	check(GameState.gold > 120, "gold awarded")
	print("  timed-hit feedback seen: %s" % str(perfect_seen))
	# QTE grading windows
	b._qte_begin("attack", Vector2.ZERO, 0.05, Color.WHITE)
	b._qte_press_t = 0.05
	var g: String = await b._hero_qte(0.05)
	b._qte_end()
	check(g == "perfect", "on-time press grades perfect (got %s)" % g)
	b._qte_begin("attack", Vector2.ZERO, 0.05, Color.WHITE)
	b._qte_press_t = 0.05 + 0.14
	g = await b._hero_qte(0.05)
	b._qte_end()
	check(g == "good", "slightly late press grades good (got %s)" % g)
	b._qte_begin("attack", Vector2.ZERO, 0.05, Color.WHITE)
	b._qte_press_t = 0.05 + 0.5
	g = await b._hero_qte(0.05)
	b._qte_end()
	check(g == "miss", "very late press is a miss (got %s)" % g)
	b._qte_begin("defend", Vector2.ZERO, 0.05, Color.WHITE)
	b._qte_press_t = 0.05 - 0.05
	b._qte_press_kind = "parry"
	var r: Dictionary = await b._defend_qte(0.05, [b.heroes[0]])
	b._qte_end()
	check(r[b.heroes[0]] == "parry", "parry inside window (got %s)" % str(r[b.heroes[0]]))
	b._qte_begin("defend", Vector2.ZERO, 0.3, Color.WHITE)
	b._qte_press_t = 0.3 - 0.18
	b._qte_press_kind = "parry"
	r = await b._defend_qte(0.3, [b.heroes[0]])
	b._qte_end()
	check(r[b.heroes[0]] == "dodge", "early parry degrades to dodge (got %s)" % str(r[b.heroes[0]]))
	b._qte_begin("defend", Vector2.ZERO, 0.05, Color.WHITE)
	b._qte_press_t = -1.0
	r = await b._defend_qte(0.05, [b.heroes[0]])
	b._qte_end()
	check(r[b.heroes[0]] == "", "no press means a hit (got %s)" % str(r[b.heroes[0]]))
	b.queue_free()
	await get_tree().process_frame
	# boss battle: flee must be impossible and flag set on victory
	GameState.pending_battle = {"enemies": ["boss_ogre"], "backdrop": "forest", "boss_flag": "boss_ogre", "boss": true, "region": "forest"}
	for h in GameState.roster:
		h.add_xp(GameData.xp_for_level(20) - h.xp)
		h.full_heal()
	var bb = ps.instantiate()
	add_child(bb)
	await get_tree().process_frame
	check(bb.is_boss and bb.enemies[0].boss, "boss battle flags")
	var fled: bool = await bb._try_flee(bb.heroes[0])
	check(not fled, "cannot flee from a boss")
	deadline = Time.get_ticks_msec() + 120000
	while not bb._finished and Time.get_ticks_msec() < deadline:
		await get_tree().process_frame
		if bb._qte_active and bb._qte_press_t < 0.0 and bb._qte_ring != null and bb._qte_t >= bb._qte_ring.duration - 0.03:
			bb._qte_press_t = bb._qte_t
			bb._qte_press_kind = "attack" if bb._qte_mode == "attack" else "dodge"
		if bb.main_menu.visible and bb._current != null and bb._current.is_hero:
			bb.main_menu.visible = false
			bb.emit_signal("_action_chosen", {"type": "attack", "targets": [bb.enemies[0]]})
	check(bb._finished and not bb.enemies[0].is_alive(), "boss defeated")
	await get_tree().create_timer(1.0).timeout
	check(GameState.flags.get("boss_ogre_defeated", false), "boss flag set")
	check(GameState.item_count("axe_war") == 1, "boss drop awarded")
	bb.queue_free()
	await get_tree().process_frame
