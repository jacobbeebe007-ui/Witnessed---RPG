extends Node2D
## Turn-based battle: speed timeline, AP economy, timed attacks, parry/dodge windows,
## break gauges, elements and statuses. Heroes stand on the right, enemies on the left.

signal _action_chosen(action: Dictionary)
signal _target_chosen(targets: Array)
signal _confirmed

const HERO_SLOTS := [Vector2(486, 150), Vector2(530, 186), Vector2(486, 222), Vector2(530, 254)]
const ENEMY_LAYOUTS := {
	1: [Vector2(180, 242)],
	2: [Vector2(135, 244), Vector2(220, 196)],
	3: [Vector2(120, 248), Vector2(222, 218), Vector2(148, 178)],
	4: [Vector2(112, 250), Vector2(206, 232), Vector2(126, 192), Vector2(222, 170)],
}
const QTE_PERFECT := 0.085
const QTE_GOOD := 0.18
const PARRY_WINDOW := 0.11
const DODGE_WINDOW := 0.22

var heroes: Array[Combatant] = []
var enemies: Array[Combatant] = []
var boss_flag := ""
var is_boss := false
var region := "meadow"

var field: Node2D
var fx_layer: Node2D
var ui: CanvasLayer
var log_label: Label
var timeline_box: HBoxContainer
var party_panel: VBoxContainer
var command_root: Control
var main_menu: VBoxContainer
var sub_panel: VBoxContainer
var sub_scroll: ScrollContainer
var sub_list: VBoxContainer
var desc_label: Label
var hint_label: Label
var results_panel: PanelContainer
var results_box: VBoxContainer
var target_arrows: Array[Sprite2D] = []

var _current: Combatant = null
var _finished := false
var _targeting := false
var _target_candidates: Array[Combatant] = []
var _target_idx := 0
var _target_all := false
var _menu_state := "none"
var _waiting_confirm := false

# QTE state
var _qte_active := false
var _qte_mode := ""           # "attack" (hero timing) | "defend" (parry/dodge)
var _qte_t := 0.0
var _qte_press_t := -1.0
var _qte_press_kind := ""
var _qte_ring: QteRing = null


# ---------------------------------------------------------------------------
class QteRing extends Node2D:
	var t := 0.0
	var duration := 0.8
	var color := Color(1, 1, 1)
	var done := false
	var label := ""
	var label_color := Color.WHITE

	func _process(delta: float) -> void:
		t += delta
		queue_redraw()
		if done and t > duration + 0.45:
			queue_free()

	func _draw() -> void:
		draw_arc(Vector2.ZERO, 10.0, 0.0, TAU, 28, Color(1, 1, 1, 0.85), 1.5)
		if not done:
			var p := clampf(t / duration, 0.0, 1.0)
			var r := lerpf(32.0, 10.0, p)
			var c := color
			c.a = 0.55 + 0.45 * p
			draw_arc(Vector2.ZERO, r, 0.0, TAU, 40, c, 2.0)
			if t > duration:
				draw_circle(Vector2.ZERO, 6.0, Color(1, 1, 1, 0.5))


# ---------------------------------------------------------------------------
func _ready() -> void:
	var pb: Dictionary = GameState.pending_battle
	if pb.is_empty():
		pb = {"enemies": ["slime", "slime"], "backdrop": "meadow", "boss_flag": "", "boss": false, "region": "meadow"}
	if GameState.roster.is_empty():
		var h := Hero.create("player", "Aeryn", "female", "knight", 1)
		GameState.new_game(h)
	boss_flag = str(pb.get("boss_flag", ""))
	is_boss = bool(pb.get("boss", false))
	region = str(pb.get("region", "meadow"))
	_build_scene(str(pb.get("backdrop", "meadow")))
	_spawn_heroes()
	_spawn_enemies(pb.get("enemies", ["slime"]))
	_build_ui()
	_refresh_party_ui()
	_refresh_enemy_ui()
	call_deferred("_run_battle")


func _build_scene(backdrop: String) -> void:
	var bg := Sprite2D.new()
	bg.centered = false
	bg.texture = Assets.tex("backdrops/%s.png" % backdrop)
	if bg.texture == null:
		bg.texture = Assets.tex("backdrops/meadow.png")
	bg.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	add_child(bg)
	field = Node2D.new()
	field.y_sort_enabled = true
	add_child(field)
	fx_layer = Node2D.new()
	fx_layer.z_index = 5
	add_child(fx_layer)


func _spawn_heroes() -> void:
	var members := GameState.active_party()
	for i in members.size():
		var c := Combatant.from_hero(members[i], i)
		var doll := PaperDoll.new()
		doll.configure_from_hero(members[i])
		doll.position = HERO_SLOTS[i]
		doll.set_facing_left(true)
		field.add_child(doll)
		c.node = doll
		c.home = doll.position
		c.tick = 100.0 / c.eff_speed() * randf_range(0.55, 0.95)
		if not c.is_alive():
			doll.play("ko")
		heroes.append(c)


func _spawn_enemies(ids: Array) -> void:
	var n := clampi(ids.size(), 1, 4)
	var layout: Array = ENEMY_LAYOUTS[n]
	var counts := {}
	var party_level := GameState.average_level()
	var diff := GameState.difficulty_mult()
	for i in n:
		var eid := str(ids[i])
		counts[eid] = int(counts.get(eid, 0)) + 1
	var seen := {}
	for i in n:
		var eid := str(ids[i])
		var suffix := ""
		if int(counts[eid]) > 1:
			seen[eid] = int(seen.get(eid, 0)) + 1
			suffix = " " + ["A", "B", "C", "D"][int(seen[eid]) - 1]
		var c := Combatant.from_enemy(eid, i, party_level, diff, suffix)
		var s := SheetSprite.new()
		s.setup_enemy(c.sprite_id)
		s.position = layout[i]
		s.modulate.a = 0.0
		field.add_child(s)
		c.node = s
		c.home = s.position
		c.tick = 100.0 / c.eff_speed() * randf_range(0.7, 1.1)
		enemies.append(c)


# ---------------------------------------------------------------------------
# UI construction
# ---------------------------------------------------------------------------
func _build_ui() -> void:
	ui = CanvasLayer.new()
	ui.layer = 10
	add_child(ui)

	timeline_box = HBoxContainer.new()
	timeline_box.position = Vector2(8, 6)
	timeline_box.add_theme_constant_override("separation", 3)
	ui.add_child(timeline_box)

	log_label = Label.new()
	log_label.position = Vector2(0, 34)
	log_label.size = Vector2(640, 22)
	log_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	log_label.add_theme_font_size_override("font_size", 18)
	log_label.add_theme_color_override("font_color", Color("ffe9a8"))
	log_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0))
	log_label.add_theme_constant_override("shadow_offset_x", 1)
	log_label.add_theme_constant_override("shadow_offset_y", 1)
	ui.add_child(log_label)

	var panel := PanelContainer.new()
	panel.position = Vector2(0, 268)
	panel.size = Vector2(640, 92)
	ui.add_child(panel)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	panel.add_child(row)

	party_panel = VBoxContainer.new()
	party_panel.custom_minimum_size = Vector2(360, 0)
	party_panel.add_theme_constant_override("separation", 1)
	row.add_child(party_panel)
	for c in heroes:
		_build_party_row(c)

	command_root = Control.new()
	command_root.custom_minimum_size = Vector2(250, 84)
	command_root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(command_root)

	main_menu = VBoxContainer.new()
	main_menu.position = Vector2(0, 0)
	main_menu.add_theme_constant_override("separation", 1)
	main_menu.visible = false
	command_root.add_child(main_menu)

	sub_panel = VBoxContainer.new()
	sub_panel.position = Vector2(0, 0)
	sub_panel.size = Vector2(250, 84)
	sub_panel.visible = false
	command_root.add_child(sub_panel)
	sub_scroll = ScrollContainer.new()
	sub_scroll.custom_minimum_size = Vector2(250, 58)
	sub_scroll.follow_focus = true
	sub_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	sub_panel.add_child(sub_scroll)
	sub_list = VBoxContainer.new()
	sub_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sub_list.add_theme_constant_override("separation", 0)
	sub_scroll.add_child(sub_list)
	desc_label = Label.new()
	desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc_label.custom_minimum_size = Vector2(250, 24)
	desc_label.add_theme_font_size_override("font_size", 13)
	desc_label.add_theme_color_override("font_color", Color(0.85, 0.8, 0.95))
	sub_panel.add_child(desc_label)

	hint_label = Label.new()
	hint_label.position = Vector2(0, 252)
	hint_label.size = Vector2(632, 16)
	hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	hint_label.add_theme_font_size_override("font_size", 13)
	hint_label.add_theme_color_override("font_color", Color(0.7, 0.65, 0.85))
	hint_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0))
	hint_label.add_theme_constant_override("shadow_offset_y", 1)
	ui.add_child(hint_label)

	results_panel = PanelContainer.new()
	results_panel.position = Vector2(150, 56)
	results_panel.size = Vector2(340, 180)
	results_panel.visible = false
	ui.add_child(results_panel)
	results_box = VBoxContainer.new()
	results_box.add_theme_constant_override("separation", 2)
	results_panel.add_child(results_box)

	for e in enemies:
		var plate := VBoxContainer.new()
		plate.add_theme_constant_override("separation", 1)
		var nm := Label.new()
		nm.text = e.display_name
		nm.add_theme_font_size_override("font_size", 13)
		nm.add_theme_color_override("font_color", Color("ffd0d0") if not e.boss else Color("ffe27a"))
		nm.add_theme_color_override("font_shadow_color", Color(0, 0, 0))
		nm.add_theme_constant_override("shadow_offset_y", 1)
		plate.add_child(nm)
		var hpb := ProgressBar.new()
		hpb.custom_minimum_size = Vector2(64, 5)
		hpb.show_percentage = false
		hpb.max_value = e.max_hp
		var fill := StyleBoxFlat.new()
		fill.bg_color = Color("e04848")
		hpb.add_theme_stylebox_override("fill", fill)
		plate.add_child(hpb)
		var brk := ProgressBar.new()
		brk.custom_minimum_size = Vector2(64, 3)
		brk.show_percentage = false
		brk.max_value = maxi(1, e.break_max)
		var bfill := StyleBoxFlat.new()
		bfill.bg_color = Color("ffe27a")
		brk.add_theme_stylebox_override("fill", bfill)
		plate.add_child(brk)
		var fs: int = (e.node as SheetSprite).frame_size
		plate.position = e.home + Vector2(-32, -fs * 0.9 - 30)
		ui.add_child(plate)
		e.ui = {"plate": plate, "hp": hpb, "break": brk}

	for i in 4:
		var arrow := Sprite2D.new()
		arrow.texture = Assets.tex("ui/target.png")
		arrow.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		arrow.visible = false
		arrow.z_index = 8
		fx_layer.add_child(arrow)
		target_arrows.append(arrow)


func _build_party_row(c: Combatant) -> void:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 6)
	party_panel.add_child(row)
	var nm := Label.new()
	nm.custom_minimum_size = Vector2(88, 0)
	nm.text = c.display_name
	row.add_child(nm)
	var bars := VBoxContainer.new()
	bars.add_theme_constant_override("separation", 1)
	bars.custom_minimum_size = Vector2(70, 0)
	row.add_child(bars)
	var hpb := ProgressBar.new()
	hpb.custom_minimum_size = Vector2(70, 7)
	hpb.show_percentage = false
	hpb.max_value = c.max_hp
	bars.add_child(hpb)
	var mpb := ProgressBar.new()
	mpb.custom_minimum_size = Vector2(70, 4)
	mpb.show_percentage = false
	mpb.max_value = maxi(1, c.max_mp)
	var fill := StyleBoxFlat.new()
	fill.bg_color = Color("4a7aff")
	mpb.add_theme_stylebox_override("fill", fill)
	bars.add_child(mpb)
	var vals := Label.new()
	vals.custom_minimum_size = Vector2(52, 0)
	vals.add_theme_font_size_override("font_size", 13)
	row.add_child(vals)
	var pips := HBoxContainer.new()
	pips.add_theme_constant_override("separation", 1)
	row.add_child(pips)
	var pip_rects: Array = []
	for i in GameData.MAX_AP:
		var r := ColorRect.new()
		r.custom_minimum_size = Vector2(5, 9)
		pips.add_child(r)
		pip_rects.append(r)
	var st := Label.new()
	st.add_theme_font_size_override("font_size", 12)
	st.add_theme_color_override("font_color", Color("ffb87a"))
	row.add_child(st)
	c.ui = {"row": row, "name": nm, "hp": hpb, "mp": mpb, "vals": vals, "pips": pip_rects, "status": st}


func _refresh_party_ui() -> void:
	for c in heroes:
		if c.ui.is_empty():
			continue
		c.ui["hp"].max_value = c.max_hp
		c.ui["hp"].value = c.hp
		c.ui["mp"].max_value = maxi(1, c.max_mp)
		c.ui["mp"].value = c.mp
		c.ui["vals"].text = "%d/%d" % [c.hp, c.max_hp]
		c.ui["name"].add_theme_color_override("font_color", (Color("ffe27a") if c == _current else Color.WHITE) if c.is_alive() else Color(0.75, 0.4, 0.4))
		for i in c.ui["pips"].size():
			var r: ColorRect = c.ui["pips"][i]
			r.color = Color("ffd54a") if i < c.ap else Color(0.2, 0.15, 0.3)
		c.ui["status"].text = c.status_summary()


func _refresh_enemy_ui() -> void:
	for e in enemies:
		if e.ui.is_empty():
			continue
		e.ui["plate"].visible = e.is_alive()
		e.ui["hp"].value = e.hp
		e.ui["break"].value = e.break_gauge
		var bfill: StyleBoxFlat = e.ui["break"].get_theme_stylebox("fill")
		if bfill != null:
			bfill.bg_color = Color("ff4a4a") if e.broken else Color("ffe27a")


func _refresh_timeline() -> void:
	for ch in timeline_box.get_children():
		ch.queue_free()
	var tag := Label.new()
	tag.text = "NEXT"
	tag.add_theme_font_size_override("font_size", 12)
	tag.add_theme_color_override("font_color", Color(0.7, 0.65, 0.85))
	timeline_box.add_child(tag)
	var order := _timeline_preview(8)
	for i in order.size():
		var c: Combatant = order[i]
		var p := PanelContainer.new()
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color("2a4a8a") if c.is_hero else Color("7a2a3a")
		sb.border_color = Color("ffe27a") if i == 0 else Color(0, 0, 0, 0.6)
		sb.set_border_width_all(1)
		sb.content_margin_left = 3
		sb.content_margin_right = 3
		sb.content_margin_top = 1
		sb.content_margin_bottom = 1
		p.add_theme_stylebox_override("panel", sb)
		var l := Label.new()
		l.text = c.display_name.substr(0, 3).to_upper()
		l.add_theme_font_size_override("font_size", 13 if i == 0 else 12)
		p.add_child(l)
		timeline_box.add_child(p)


func _timeline_preview(n: int) -> Array:
	var sim := {}
	var all := _all_alive()
	for c in all:
		sim[c] = c.tick
	var out: Array = []
	for i in n:
		var best: Combatant = null
		for c in all:
			if best == null or sim[c] < sim[best] or (sim[c] == sim[best] and c.is_hero and not best.is_hero):
				best = c
		if best == null:
			break
		out.append(best)
		sim[best] = float(sim[best]) + 100.0 / best.eff_speed()
	return out


func _all_alive() -> Array:
	var out: Array = []
	for c in heroes:
		if c.is_alive():
			out.append(c)
	for c in enemies:
		if c.is_alive():
			out.append(c)
	return out


func _alive(list: Array) -> Array:
	var out: Array = []
	for c in list:
		if c.is_alive():
			out.append(c)
	return out


# ---------------------------------------------------------------------------
# helpers: log / popups / effects
# ---------------------------------------------------------------------------
func _log(text: String) -> void:
	log_label.text = text


func _wait(seconds: float) -> void:
	await get_tree().create_timer(seconds).timeout


func _center(c: Combatant) -> Vector2:
	if c.is_hero:
		return c.home + Vector2(0, -32)
	return c.home + Vector2(0, -(c.node as SheetSprite).frame_size * 0.45)


func _half_width(c: Combatant) -> float:
	if c.is_hero:
		return 14.0
	return (c.node as SheetSprite).frame_size * 0.3


func _popup(pos: Vector2, text: String, color: Color = Color.WHITE, size: int = 18, rise: float = 26.0) -> void:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0))
	l.add_theme_constant_override("shadow_offset_x", 1)
	l.add_theme_constant_override("shadow_offset_y", 1)
	l.position = pos + Vector2(-40 + randf_range(-6, 6), -10)
	l.size = Vector2(80, 20)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.z_index = 20
	fx_layer.add_child(l)
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(l, "position:y", l.position.y - rise, 0.7).set_ease(Tween.EASE_OUT)
	tw.tween_property(l, "modulate:a", 0.0, 0.5).set_delay(0.45)
	tw.chain().tween_callback(l.queue_free)


func _spawn_fx(fx_id: String, pos: Vector2, fps: float = 14.0, p_scale: float = 1.0) -> void:
	if fx_id == "" or not Assets.effect_index.has(fx_id):
		return
	var s := SheetSprite.new()
	s.setup_effect(fx_id, fps)
	s.position = pos
	s.scale = Vector2(p_scale, p_scale)
	fx_layer.add_child(s)


func _shake(strength: float = 3.0, duration: float = 0.25) -> void:
	var tw := create_tween()
	var steps := int(duration / 0.04)
	for i in steps:
		var off := Vector2(randf_range(-strength, strength), randf_range(-strength, strength)) * (1.0 - float(i) / steps)
		tw.tween_property(field, "position", off, 0.04)
	tw.tween_property(field, "position", Vector2.ZERO, 0.04)


func _dash(c: Combatant, to: Vector2, duration: float = 0.18) -> void:
	if c.is_hero:
		(c.node as PaperDoll).play("run")
	var tw := create_tween()
	tw.tween_property(c.node, "position", to, duration).set_ease(Tween.EASE_OUT)
	await tw.finished


func _play_hero(c: Combatant, anim: String, speed: float = 1.0) -> void:
	(c.node as PaperDoll).play(anim, speed)


func _anim_for(c: Combatant, skill_anim: String) -> String:
	if not c.is_hero:
		return "attack"
	var wt := c.hero.weapon_type()
	match skill_anim:
		"bow":
			return "attack_bow" if wt == "bow" else c.hero.attack_anim()
		"staff":
			return "attack_staff" if wt == "staff" else "cast"
		"cast":
			return "cast"
		_:
			return c.hero.attack_anim()


func _hero_hit_time(anim: String, speed: float) -> float:
	var info := Assets.hero_anim(anim)
	var hf: int = int(PaperDoll.HIT_FRAME.get(anim, 2))
	return float(hf) / (float(info["fps"]) * speed)


func _enemy_hit_time(c: Combatant) -> float:
	var s := c.node as SheetSprite
	var a: Dictionary = s.anims.get(s.resolve("attack"), {"count": 4, "fps": 10})
	var hit_at := maxi(0, int(round(int(a["count"]) * 0.5)))
	return float(hit_at) / float(a["fps"])


# ---------------------------------------------------------------------------
# main loop
# ---------------------------------------------------------------------------
func _run_battle() -> void:
	hint_label.text = "Space: parry   Shift: dodge   Enter: confirm   Esc: back"
	Sfx.play("encounter")
	for e in enemies:
		var tw := create_tween()
		tw.tween_property(e.node, "modulate:a", 1.0, 0.35)
	if is_boss and enemies.size() > 0:
		_log("%s blocks your path!" % enemies[0].display_name)
	else:
		_log("Enemies appear!")
	await _wait(0.9)
	while not _finished:
		var actor := _next_actor()
		if actor == null:
			break
		_current = actor
		_refresh_timeline()
		_refresh_party_ui()
		if actor.is_hero:
			await _hero_turn(actor)
		else:
			await _enemy_turn(actor)
		actor.tick += 100.0 / actor.eff_speed()
		if _check_end():
			break
		await _wait(0.15)
	_current = null


func _next_actor() -> Combatant:
	var best: Combatant = null
	for c in _all_alive():
		if best == null or c.tick < best.tick or (c.tick == best.tick and c.is_hero and not best.is_hero):
			best = c
	return best


func _check_end() -> bool:
	if _finished:
		return true
	if _alive(enemies).is_empty():
		_finished = true
		_victory()
		return true
	if _alive(heroes).is_empty():
		_finished = true
		_defeat()
		return true
	return false


func _start_of_turn(c: Combatant) -> bool:
	## Applies damage-over-time and stun/freeze/break skips. Returns true when `c` may act.
	for ev in c.tick_statuses():
		var dmg := int(ev["damage"])
		var info: Dictionary = GameData.STATUS_INFO.get(ev["id"], {})
		if dmg > 0:
			c.apply_damage(dmg)
			_popup(_center(c), str(dmg), info.get("color", Color.WHITE))
			_log("%s suffers from %s." % [c.display_name, info.get("name", ev["id"])])
			c.node.flash(info.get("color", Color(1, 0.6, 0.6)))
			Sfx.play("hurt", -6)
		else:
			c.heal(-dmg)
			_popup(_center(c), "+%d" % -dmg, GameData.ELEMENT_COLORS["heal"])
		_refresh_party_ui()
		_refresh_enemy_ui()
		await _wait(0.45)
		if not c.is_alive():
			await _on_death(c)
			return false
	var skip := not c.can_act()
	if skip:
		if c.broken:
			_log("%s is broken and cannot move!" % c.display_name)
		elif c.has_status("freeze"):
			_log("%s is frozen solid!" % c.display_name)
		else:
			_log("%s is stunned!" % c.display_name)
		_spawn_fx("stun", _center(c) + Vector2(0, -14), 10.0)
		await _wait(0.8)
	c.expire_statuses()
	if c.broken:
		c.recover_from_break()
		_refresh_enemy_ui()
	_refresh_party_ui()
	return not skip


# ---------------------------------------------------------------------------
# hero turn
# ---------------------------------------------------------------------------
func _hero_turn(c: Combatant) -> void:
	c.guarding = false
	if (c.node as PaperDoll).anim == "guard":
		_play_hero(c, "idle")
	var may_act := await _start_of_turn(c)
	if not may_act or not c.is_alive():
		return
	_log("%s's turn." % c.display_name)
	_refresh_party_ui()
	while true:
		_show_main_menu(c)
		var action: Dictionary = await _action_chosen
		_hide_menus()
		match action["type"]:
			"guard":
				c.guarding = true
				c.ap = mini(GameData.MAX_AP, c.ap + 1)
				_play_hero(c, "guard")
				_log("%s braces for impact. +1 AP" % c.display_name)
				Sfx.play("equip")
				_refresh_party_ui()
				await _wait(0.6)
				return
			"attack":
				var basic := {"name": "Attack", "kind": "attack", "element": c.hero.weapon_element(), "power": 1.0, "hits": 1, "target": "enemy", "break": 1, "anim": "swing", "fx": "slash" if c.hero.weapon_type() in ["sword", "axe", "dagger"] else "hit"}
				await _perform(c, basic, action["targets"])
				if c.is_alive():
					c.ap = mini(GameData.MAX_AP, c.ap + 1)
					_popup(_center(c) + Vector2(0, -16), "+1 AP", Color("ffd54a"), 14)
					_refresh_party_ui()
				return
			"skill":
				var sk: Dictionary = GameData.SKILLS[action["skill"]]
				c.ap -= int(sk.get("ap", 0))
				c.mp -= int(sk.get("mp", 0))
				_refresh_party_ui()
				await _perform(c, sk, action["targets"], action["skill"])
				return
			"item":
				await _use_item(c, action["item"], action["targets"][0])
				return
			"flee":
				var fled := await _try_flee(c)
				if fled:
					return
				if is_boss:
					continue
				return


func _show_main_menu(c: Combatant) -> void:
	_menu_state = "main"
	for ch in main_menu.get_children():
		ch.queue_free()
	main_menu.visible = true
	sub_panel.visible = false
	var first: Button = null
	var entries := [["Attack", "attack"], ["Skills  (%d AP)" % c.ap, "skills"], ["Items", "items"], ["Guard  +1 AP", "guard"], ["Flee", "flee"]]
	for e in entries:
		var b := Button.new()
		b.text = e[0]
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.custom_minimum_size = Vector2(150, 16)
		if e[1] == "flee" and is_boss:
			b.disabled = true
		b.pressed.connect(_on_menu.bind(e[1], c))
		main_menu.add_child(b)
		if first == null:
			first = b
	call_deferred("_focus", first)


func _focus(ctrl: Control) -> void:
	if ctrl != null and is_instance_valid(ctrl) and ctrl.is_visible_in_tree():
		ctrl.grab_focus()


func _hide_menus() -> void:
	_menu_state = "none"
	main_menu.visible = false
	sub_panel.visible = false


func _on_menu(kind: String, c: Combatant) -> void:
	Sfx.play("select")
	match kind:
		"attack":
			main_menu.visible = false
			var t := await _pick_targets("enemy")
			if t.is_empty():
				_show_main_menu(c)
				return
			emit_signal("_action_chosen", {"type": "attack", "targets": t})
		"skills":
			_show_skills(c)
		"items":
			_show_items(c)
		"guard":
			emit_signal("_action_chosen", {"type": "guard"})
		"flee":
			emit_signal("_action_chosen", {"type": "flee"})


func _show_skills(c: Combatant) -> void:
	_menu_state = "skills"
	main_menu.visible = false
	sub_panel.visible = true
	for ch in sub_list.get_children():
		ch.queue_free()
	desc_label.text = ""
	var first: Button = null
	for sid in c.skill_ids:
		var sk: Dictionary = GameData.SKILLS[sid]
		var b := Button.new()
		b.text = "%-16s AP%d MP%d" % [sk["name"], int(sk.get("ap", 0)), int(sk.get("mp", 0))]
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.custom_minimum_size = Vector2(236, 15)
		b.disabled = c.ap < int(sk.get("ap", 0)) or c.mp < int(sk.get("mp", 0))
		b.focus_entered.connect(func(): desc_label.text = _skill_desc(sk))
		b.mouse_entered.connect(func(): desc_label.text = _skill_desc(sk))
		b.pressed.connect(_on_skill_pressed.bind(sid, c))
		sub_list.add_child(b)
		if first == null or (first.disabled and not b.disabled):
			first = b
	call_deferred("_focus", first)


func _skill_desc(sk: Dictionary) -> String:
	var bits: PackedStringArray = []
	if sk.has("element") and sk["kind"] in ["attack", "spell"]:
		bits.append(str(sk["element"]).capitalize())
	if int(sk.get("hits", 1)) > 1:
		bits.append("%d hits" % int(sk["hits"]))
	if int(sk.get("break", 0)) >= 2:
		bits.append("Break %d" % int(sk["break"]))
	var head := ("[" + ", ".join(bits) + "] ") if not bits.is_empty() else ""
	return head + str(sk.get("desc", ""))


func _on_skill_pressed(sid: String, c: Combatant) -> void:
	Sfx.play("select")
	var sk: Dictionary = GameData.SKILLS[sid]
	sub_panel.visible = false
	var t := await _pick_targets(str(sk["target"]), bool(sk.get("revive", false)))
	if t.is_empty():
		_show_skills(c)
		return
	emit_signal("_action_chosen", {"type": "skill", "skill": sid, "targets": t})


func _show_items(c: Combatant) -> void:
	_menu_state = "items"
	main_menu.visible = false
	sub_panel.visible = true
	for ch in sub_list.get_children():
		ch.queue_free()
	desc_label.text = ""
	var first: Button = null
	var any := false
	for iid in GameData.CONSUMABLES:
		var n := GameState.item_count(iid)
		if n <= 0:
			continue
		any = true
		var it: Dictionary = GameData.CONSUMABLES[iid]
		var b := Button.new()
		b.text = "%-16s x%d" % [it["name"], n]
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.custom_minimum_size = Vector2(236, 15)
		b.icon = Assets.icon(it["icon"])
		b.focus_entered.connect(func(): desc_label.text = str(it["desc"]))
		b.mouse_entered.connect(func(): desc_label.text = str(it["desc"]))
		b.pressed.connect(_on_item_pressed.bind(iid, c))
		sub_list.add_child(b)
		if first == null:
			first = b
	if not any:
		desc_label.text = "No usable items."
		var b := Button.new()
		b.text = "Back"
		b.pressed.connect(func(): _show_main_menu(c))
		sub_list.add_child(b)
		first = b
	call_deferred("_focus", first)


func _on_item_pressed(iid: String, c: Combatant) -> void:
	Sfx.play("select")
	var it: Dictionary = GameData.CONSUMABLES[iid]
	sub_panel.visible = false
	var t := await _pick_targets("ally", it["effect"] == "revive")
	if t.is_empty():
		_show_items(c)
		return
	emit_signal("_action_chosen", {"type": "item", "item": iid, "targets": t})


# ---------------------------------------------------------------------------
# targeting
# ---------------------------------------------------------------------------
func _pick_targets(mode: String, dead_only: bool = false) -> Array:
	_target_candidates.clear()
	_target_all = mode in ["enemies", "allies"]
	match mode:
		"enemy", "enemies":
			for e in enemies:
				if e.is_alive():
					_target_candidates.append(e)
		"ally", "allies":
			for h in heroes:
				if (dead_only and not h.is_alive()) or (not dead_only and h.is_alive()):
					_target_candidates.append(h)
		"self":
			return [_current]
	if _target_candidates.is_empty():
		_log("No valid target.")
		return []
	if mode == "enemies":
		_target_all = true
	_target_idx = 0
	_targeting = true
	_log("Choose a target." if not _target_all else "Targets all.")
	_update_arrows()
	var result: Array = await _target_chosen
	_targeting = false
	for a in target_arrows:
		a.visible = false
	return result


func _update_arrows() -> void:
	for i in target_arrows.size():
		var a := target_arrows[i]
		if not _targeting:
			a.visible = false
			continue
		var show := false
		var c: Combatant = null
		if _target_all:
			show = i < _target_candidates.size()
			if show:
				c = _target_candidates[i]
		else:
			show = i == 0
			c = _target_candidates[_target_idx]
		a.visible = show
		if show and c != null:
			var top := _center(c) + Vector2(0, -(_half_width(c) * 1.4 + 14))
			a.position = top
			if not c.is_hero:
				a.position.y = c.home.y - (c.node as SheetSprite).frame_size * 0.92 - 4
			else:
				a.position.y = c.home.y - 74
			_log(("Targets all." if _target_all else c.display_name) + (("  (%s)" % _weakness_text(c)) if not c.is_hero else ""))


func _weakness_text(c: Combatant) -> String:
	var bits: PackedStringArray = []
	if not c.weak.is_empty():
		bits.append("weak: " + ", ".join(PackedStringArray(c.weak)))
	if not c.resist.is_empty():
		bits.append("resists: " + ", ".join(PackedStringArray(c.resist)))
	return "; ".join(bits) if not bits.is_empty() else "no weakness"


func _unhandled_input(event: InputEvent) -> void:
	if _qte_active:
		if _qte_mode == "attack" and (event.is_action_pressed("confirm") or event.is_action_pressed("parry")):
			if _qte_press_t < 0.0:
				_qte_press_t = _qte_t
				_qte_press_kind = "attack"
			get_viewport().set_input_as_handled()
		elif _qte_mode == "defend":
			if event.is_action_pressed("dodge"):
				if _qte_press_t < 0.0:
					_qte_press_t = _qte_t
					_qte_press_kind = "dodge"
				get_viewport().set_input_as_handled()
			elif event.is_action_pressed("parry"):
				if _qte_press_t < 0.0:
					_qte_press_t = _qte_t
					_qte_press_kind = "parry"
				get_viewport().set_input_as_handled()
		return
	if _waiting_confirm:
		if event.is_action_pressed("confirm") or event.is_action_pressed("ui_accept"):
			get_viewport().set_input_as_handled()
			emit_signal("_confirmed")
		return
	if _targeting:
		var n := _target_candidates.size()
		if event.is_action_pressed("move_left") or event.is_action_pressed("move_up") or event.is_action_pressed("ui_left") or event.is_action_pressed("ui_up"):
			_target_idx = (_target_idx - 1 + n) % n
			Sfx.play("move", -8)
			_update_arrows()
		elif event.is_action_pressed("move_right") or event.is_action_pressed("move_down") or event.is_action_pressed("ui_right") or event.is_action_pressed("ui_down"):
			_target_idx = (_target_idx + 1) % n
			Sfx.play("move", -8)
			_update_arrows()
		elif event.is_action_pressed("confirm") or event.is_action_pressed("ui_accept"):
			get_viewport().set_input_as_handled()
			_confirm_target()
		elif event.is_action_pressed("back") or event.is_action_pressed("ui_cancel"):
			get_viewport().set_input_as_handled()
			Sfx.play("cancel")
			emit_signal("_target_chosen", [])
		elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
			var best := -1
			var best_d := 48.0
			for i in n:
				var d: float = _center(_target_candidates[i]).distance_to(event.position)
				if d < best_d:
					best_d = d
					best = i
			if best >= 0:
				_target_idx = best
				_update_arrows()
				_confirm_target()
		elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_RIGHT:
			emit_signal("_target_chosen", [])
		return
	if _menu_state in ["skills", "items"] and (event.is_action_pressed("back") or event.is_action_pressed("ui_cancel")):
		get_viewport().set_input_as_handled()
		Sfx.play("cancel")
		if _current != null:
			_show_main_menu(_current)


func _confirm_target() -> void:
	Sfx.play("select")
	if _target_all:
		emit_signal("_target_chosen", _target_candidates.duplicate())
	else:
		emit_signal("_target_chosen", [_target_candidates[_target_idx]])


# ---------------------------------------------------------------------------
# QTE: timed hits (heroes) and parry/dodge (enemies)
# ---------------------------------------------------------------------------
func _window_scale() -> float:
	var s := 1.0
	if bool(GameState.settings.get("qte_assist", false)):
		s *= 1.7
	match GameState.settings.get("difficulty", "normal"):
		"story":
			s *= 1.4
		"hard":
			s *= 0.75
	return s


func _qte_begin(mode: String, pos: Vector2, duration: float, color: Color) -> void:
	_qte_mode = mode
	_qte_t = 0.0
	_qte_press_t = -1.0
	_qte_press_kind = ""
	_qte_active = true
	_qte_ring = QteRing.new()
	_qte_ring.position = pos
	_qte_ring.duration = duration
	_qte_ring.color = color
	fx_layer.add_child(_qte_ring)


func _qte_end() -> void:
	_qte_active = false
	if _qte_ring != null and is_instance_valid(_qte_ring):
		_qte_ring.done = true
	_qte_ring = null


func _process(delta: float) -> void:
	if _qte_active:
		_qte_t += delta


func _hero_qte(hit_time: float) -> String:
	## Waits until `hit_time` (seconds from now) and grades the player's single press.
	var scale := _window_scale()
	while _qte_t < hit_time:
		await get_tree().process_frame
	var res := "miss"
	if _qte_press_t >= 0.0:
		var dt := absf(_qte_press_t - hit_time)
		if dt <= QTE_PERFECT * scale:
			res = "perfect"
		elif dt <= QTE_GOOD * scale:
			res = "good"
	return res


func _defend_qte(hit_time: float, defenders: Array) -> Dictionary:
	## Returns {combatant: "parry" | "dodge" | ""} for each defender.
	var scale := _window_scale()
	while _qte_t < hit_time:
		await get_tree().process_frame
	var out := {}
	for d in defenders:
		var r := ""
		if d.has_status("evade"):
			r = "dodge"
		elif _qte_press_t >= 0.0:
			var dt: float = _qte_press_t - hit_time
			var pw := PARRY_WINDOW * scale * (1.5 if d.has_status("shield") else 1.0)
			var dw := DODGE_WINDOW * scale
			if _qte_press_kind == "parry" and dt >= -pw and dt <= pw * 0.6:
				r = "parry"
			elif _qte_press_kind == "dodge" and dt >= -dw and dt <= dw * 0.6:
				r = "dodge"
			elif _qte_press_kind == "parry" and dt >= -dw and dt <= dw * 0.6:
				r = "dodge"   # a late/early parry still counts as a sloppy dodge
		out[d] = r
	return out


# ---------------------------------------------------------------------------
# performing skills
# ---------------------------------------------------------------------------
func _perform(user: Combatant, sk: Dictionary, targets: Array, sid: String = "") -> void:
	var kind := str(sk.get("kind", "attack"))
	var hits := int(sk.get("hits", 1))
	var anim := _anim_for(user, str(sk.get("anim", "swing")))
	var single := targets.size() == 1 and str(sk.get("target", "enemy")) in ["enemy", "ally"]
	var melee: bool = user.is_hero and anim == "attack_swing" and kind == "attack" and single and not (targets[0] as Combatant).is_hero
	_log("%s uses %s!" % [user.display_name, sk["name"]] if sk["name"] != "Attack" else "%s attacks!" % user.display_name)
	if user.is_hero:
		_refresh_party_ui()
	if sk.has("self_damage"):
		var sd := maxi(1, int(user.max_hp * float(sk["self_damage"])))
		user.apply_damage(sd)
		_popup(_center(user), str(sd), Color(1, 0.5, 0.5), 14)
	if melee:
		var t: Combatant = targets[0]
		await _dash(user, t.home + Vector2(_half_width(t) + 22, 0))
	var offensive := kind in ["attack", "spell", "debuff"]
	var speed := 1.0 if hits == 1 else 1.35
	for h in hits:
		var live: Array = _alive(targets) if offensive else targets
		if live.is_empty():
			break
		if single and offensive and not targets[0].is_alive():
			break
		var pre := (0.55 if h == 0 else 0.3) if user.is_hero else 0.0
		var hit_t := pre + _hero_hit_time(anim, speed)
		var grade := ""
		if user.is_hero and offensive:
			_qte_begin("attack", _center(user) + Vector2(0, -6), hit_t, Color("ffe27a"))
		if pre > 0.0:
			if user.is_hero and kind in ["spell", "heal", "buff", "debuff"]:
				_spawn_fx("buff", _center(user), 12.0, 0.6)
			await _wait(pre)
		_play_hero(user, anim, speed)
		if user.is_hero and offensive:
			grade = await _hero_qte(hit_t)
			_qte_end()
		else:
			await _wait(_hero_hit_time(anim, speed))
		if grade == "perfect":
			_popup(_center(user) + Vector2(0, -30), "PERFECT!", Color("ffe27a"), 16, 18)
			Sfx.play("parry", -4, 1.3)
		elif grade == "good":
			_popup(_center(user) + Vector2(0, -30), "Good", Color("d8e8ff"), 14, 18)
		for t in live:
			_resolve_hit(user, t, sk, grade, sid)
		_refresh_party_ui()
		_refresh_enemy_ui()
		var rest := (user.node as PaperDoll).anim_duration(anim, speed) - _hero_hit_time(anim, speed)
		await _wait(maxf(0.12, rest))
	for t in targets:
		if not t.is_alive() and t.node.modulate.a > 0.0 and not t.is_hero:
			await _on_death(t)
	for t in heroes:
		if not t.is_alive() and (t.node as PaperDoll).anim != "ko":
			await _on_death(t)
	if melee:
		await _dash(user, user.home, 0.16)
	if user.is_alive():
		_play_hero(user, "idle")
	_refresh_party_ui()
	_refresh_enemy_ui()
	await _wait(0.25)


func _resolve_hit(user: Combatant, target: Combatant, sk: Dictionary, grade: String, sid: String = "") -> void:
	var kind := str(sk.get("kind", "attack"))
	var fx := str(sk.get("fx", "hit"))
	match kind:
		"attack", "spell":
			var r := _calc_damage(user, target, sk, grade, sid)
			var dmg: int = r["dmg"]
			target.apply_damage(dmg)
			var col: Color = GameData.ELEMENT_COLORS.get(str(sk.get("element", "physical")), Color.WHITE)
			var size := 18
			var text := str(dmg)
			if r["crit"]:
				size = 22
				text += "!"
			_popup(_center(target), text, Color("ffd54a") if r["crit"] else col, size)
			if r["weak"]:
				_popup(_center(target) + Vector2(0, 14), "WEAK", Color("ff7a2a"), 12, 12)
			elif r["resist"]:
				_popup(_center(target) + Vector2(0, 14), "resist", Color(0.7, 0.7, 0.8), 12, 12)
			_spawn_fx(fx, _center(target), 14.0, 1.0 if not target.is_hero else 0.8)
			target.node.flash()
			_shake(2.0 if not r["crit"] else 4.0, 0.18)
			Sfx.play(_sfx_for(sk), -2, randf_range(0.95, 1.05))
			if target.is_alive() and target.is_hero and (target.node as PaperDoll).anim != "guard":
				_play_hero(target, "hurt")
			elif target.is_alive() and not target.is_hero and (target.node as SheetSprite).has_anim("hurt"):
				(target.node as SheetSprite).play("hurt")
				_restore_enemy_idle(target)
			# break
			var brk := int(sk.get("break", 1)) + (1 if r["weak"] else 0) + (1 if grade == "perfect" else 0)
			if target.add_break(brk):
				_popup(_center(target) + Vector2(0, -28), "BREAK!", Color("ff4a4a"), 20, 20)
				_spawn_fx("stun", _center(target) + Vector2(0, -18), 8.0, 1.4)
				Sfx.play("break")
				_shake(5.0, 0.35)
			# freeze shatters when struck
			if target.has_status("freeze") and randf() < 0.5:
				target.remove_status("freeze")
			_try_status(user, target, sk)
		"heal":
			if bool(sk.get("revive", false)):
				if not target.is_alive():
					target.hp = maxi(1, int(target.max_hp * 0.5 * float(sk.get("power", 1.0))))
					_popup(_center(target), "REVIVE", GameData.ELEMENT_COLORS["light"], 16)
					if target.is_hero:
						_play_hero(target, "idle")
			elif target.is_alive():
				var amount := int(float(sk.get("power", 1.0)) * (user.eff_magic() * 2.0 + 10.0))
				var healed := target.heal(amount)
				_popup(_center(target), "+%d" % healed, GameData.ELEMENT_COLORS["heal"])
			if bool(sk.get("cleanse", false)):
				target.cleanse()
			_spawn_fx(fx, _center(target), 12.0)
			Sfx.play("heal")
		"buff":
			_try_status(user, target, sk, true)
			_spawn_fx(fx, _center(target), 12.0)
			Sfx.play("magic", -4)
		"debuff":
			_try_status(user, target, sk)
			_spawn_fx(fx, _center(target), 12.0)
			Sfx.play("magic", -4, 0.8)


func _sfx_for(sk: Dictionary) -> String:
	match str(sk.get("element", "physical")):
		"fire":
			return "fire"
		"ice":
			return "ice"
		"light", "dark", "wind", "earth":
			return "magic"
	return "slash" if str(sk.get("fx", "")) == "slash" else "hit"


func _restore_enemy_idle(t: Combatant) -> void:
	var s := t.node as SheetSprite
	await _wait(s.anim_duration("hurt"))
	if t.is_alive() and s.anim == "hurt":
		s.play("idle")


func _try_status(user: Combatant, target: Combatant, sk: Dictionary, force: bool = false) -> void:
	if not sk.has("status") or not target.is_alive():
		return
	var st: Dictionary = sk["status"]
	var chance := float(st.get("chance", 1.0))
	var sid := str(st["id"])
	if target.boss and sid in ["stun", "freeze"]:
		chance *= 0.4
	if force or randf() < chance:
		var turns := int(st.get("turns", 2))
		target.add_status(sid, turns)
		var info: Dictionary = GameData.STATUS_INFO.get(sid, {"name": sid, "color": Color.WHITE})
		_popup(_center(target) + Vector2(0, -22), str(info["name"]), info["color"], 13, 16)


func _calc_damage(user: Combatant, target: Combatant, sk: Dictionary, grade: String, sid: String = "") -> Dictionary:
	var is_spell := str(sk.get("kind", "attack")) == "spell"
	var element := str(sk.get("element", "physical"))
	var a := user.eff_magic() if is_spell else user.eff_attack()
	var d := target.eff_resistance() if is_spell else target.eff_defense()
	if bool(sk.get("pierce", false)):
		d = 0.0
	elif sid == "judgement":
		d *= 0.5
	var power := float(sk.get("power", 1.0))
	var base: float
	if user.is_hero:
		base = power * a * (1.1 if is_spell else 1.0) * 100.0 / (100.0 + d * 4.0)
	else:
		base = power * a * 1.6 * 100.0 / (100.0 + d * 3.0) * GameState.difficulty_mult()
	var mult := 1.0
	var weak := element in target.weak
	var resist := element in target.resist
	if weak:
		mult *= 1.5
	if resist:
		mult *= 0.5
	if element == "wind" and target.flying:
		mult *= 1.25
	if target.broken:
		mult *= 1.5
	if target.has_status("marked"):
		mult *= 1.3
	if target.guarding:
		mult *= 0.5
	if target.has_status("shield"):
		mult *= 0.5
	if grade == "perfect":
		mult *= 1.3
	elif grade == "good":
		mult *= 1.1
	var crit := randf() < user.crit_chance() + float(sk.get("crit", 0.0))
	if crit:
		mult *= 1.6
	mult *= randf_range(0.92, 1.08)
	return {"dmg": maxi(1, int(round(base * mult))), "crit": crit, "weak": weak, "resist": resist}


func _on_death(c: Combatant) -> void:
	if c.is_hero:
		_play_hero(c, "ko")
		_log("%s falls!" % c.display_name)
		Sfx.play("death")
		await _wait(0.4)
	else:
		var s := c.node as SheetSprite
		s.play("death")
		Sfx.play("death", -3, randf_range(0.9, 1.1))
		_log("%s is defeated!" % c.display_name)
		var tw := create_tween()
		tw.tween_property(s, "modulate:a", 0.0, maxf(0.3, s.anim_duration("death"))).set_delay(0.1)
		_refresh_enemy_ui()
		await _wait(0.35)


# ---------------------------------------------------------------------------
# items / flee
# ---------------------------------------------------------------------------
func _use_item(user: Combatant, iid: String, target: Combatant) -> void:
	var it: Dictionary = GameData.CONSUMABLES[iid]
	if not GameState.remove_item(iid):
		return
	_log("%s uses %s on %s." % [user.display_name, it["name"], target.display_name])
	_play_hero(user, "cast")
	await _wait(0.35)
	match it["effect"]:
		"heal":
			var healed := target.heal(int(it["power"]))
			_popup(_center(target), "+%d" % healed, GameData.ELEMENT_COLORS["heal"])
			_spawn_fx("heal", _center(target), 12.0)
			Sfx.play("heal")
		"mana":
			var before := target.mp
			target.mp = mini(target.max_mp, target.mp + int(it["power"]))
			_popup(_center(target), "+%d MP" % (target.mp - before), Color("6a9aff"))
			_spawn_fx("buff", _center(target), 12.0)
			Sfx.play("magic")
		"cleanse":
			target.cleanse()
			_popup(_center(target), "Cleansed", Color("a8f0c8"), 14)
			_spawn_fx("heal", _center(target), 12.0)
			Sfx.play("heal")
		"revive":
			target.hp = maxi(1, int(target.max_hp * float(it["power"])))
			_popup(_center(target), "REVIVE", GameData.ELEMENT_COLORS["light"], 16)
			_spawn_fx("light", _center(target), 12.0)
			_play_hero(target, "idle")
			Sfx.play("levelup")
		"full":
			target.hp = target.max_hp
			target.mp = target.max_mp
			target.cleanse()
			_popup(_center(target), "MAX", GameData.ELEMENT_COLORS["light"], 18)
			_spawn_fx("light", _center(target), 12.0)
			Sfx.play("levelup")
	await _wait(0.5)
	_play_hero(user, "idle")
	_refresh_party_ui()


func _try_flee(c: Combatant) -> bool:
	if is_boss:
		_log("There is no escape from this fight!")
		await _wait(0.8)
		return false
	var hs := 0.0
	var es := 0.0
	for h in _alive(heroes):
		hs += h.eff_speed()
	for e in _alive(enemies):
		es += e.eff_speed()
	hs /= maxi(1, _alive(heroes).size())
	es /= maxi(1, _alive(enemies).size())
	var chance := clampf(0.55 + 0.04 * (hs - es), 0.3, 0.9)
	if randf() < chance:
		_log("The party escapes!")
		Sfx.play("dodge")
		for h in _alive(heroes):
			_play_hero(h, "run")
			h.node.scale.x = absf(h.node.scale.x)
			var tw := create_tween()
			tw.tween_property(h.node, "position:x", 700.0, 0.6)
		_finished = true
		await _wait(0.7)
		_leave({"won": false, "fled": true, "boss_flag": boss_flag})
		return true
	_log("%s couldn't get away!" % c.display_name)
	Sfx.play("cancel")
	await _wait(0.8)
	return false


# ---------------------------------------------------------------------------
# enemy turn
# ---------------------------------------------------------------------------
func _enemy_turn(c: Combatant) -> void:
	var may_act := await _start_of_turn(c)
	if not may_act or not c.is_alive():
		return
	var choice := _enemy_choose(c)
	var sk: Dictionary = GameData.SKILLS[choice["skill"]]
	var targets: Array = choice["targets"]
	if targets.is_empty():
		return
	_log("%s uses %s!" % [c.display_name, sk["name"]])
	var kind := str(sk.get("kind", "attack"))
	if kind in ["heal", "buff"]:
		_spawn_fx("buff", _center(c), 12.0, 1.2)
		(c.node as SheetSprite).play("cast")
		await _wait(0.6)
		for t in targets:
			_resolve_hit(c, t, sk, "")
		_refresh_enemy_ui()
		await _wait(0.6)
		(c.node as SheetSprite).play("idle")
		return
	if kind == "debuff":
		(c.node as SheetSprite).play("cast")
		await _wait(0.5)
		for t in targets:
			_resolve_hit(c, t, sk, "")
		_refresh_party_ui()
		await _wait(0.6)
		(c.node as SheetSprite).play("idle")
		return
	var hits := int(sk.get("hits", 1))
	var single := targets.size() == 1
	var melee := kind == "attack" and single and str(sk.get("fx", "")) in ["hit", "slash", "poison"]
	if melee:
		var t: Combatant = targets[0]
		var to := t.home + Vector2(-(_half_width(c) + 20), 0)
		var tw := create_tween()
		tw.tween_property(c.node, "position", to, 0.22).set_ease(Tween.EASE_OUT)
		await tw.finished
	var parried := {}
	for h in hits:
		var live: Array = _alive(targets)
		if live.is_empty():
			break
		# telegraph: bosses vary their wind-up so the ring must actually be watched
		var windup := randf_range(0.55, 0.95) if c.boss else randf_range(0.6, 0.75)
		if h > 0:
			windup = randf_range(0.35, 0.5)
		var hit_t := windup + _enemy_hit_time(c)
		var ring_pos := _center(live[0]) + Vector2(0, -6) if single else Vector2(508, 150)
		_qte_begin("defend", ring_pos, hit_t, Color("ff8a5a"))
		var tw := create_tween()
		tw.tween_property(c.node, "modulate", Color(1.3, 0.9, 0.9), windup * 0.5)
		tw.tween_property(c.node, "modulate", Color.WHITE, windup * 0.5)
		if not melee:
			var lunge := create_tween()
			lunge.tween_property(c.node, "position:x", c.node.position.x + 10.0, windup * 0.6)
			lunge.tween_property(c.node, "position:x", c.node.position.x, windup * 0.4)
		await _wait(windup)
		(c.node as SheetSprite).play("attack")
		var results := await _defend_qte(hit_t, live)
		_qte_end()
		for t in live:
			var r: String = results.get(t, "")
			match r:
				"parry":
					_popup(_center(t) + Vector2(0, -26), "PARRY!", Color("ffe27a"), 20, 20)
					_spawn_fx("parry", _center(t) + Vector2(-8, 0), 16.0)
					_play_hero(t, "parry")
					Sfx.play("parry")
					t.ap = mini(GameData.MAX_AP, t.ap + 1)
					parried[t] = int(parried.get(t, 0)) + 1
				"dodge":
					_popup(_center(t) + Vector2(0, -26), "DODGE", Color("a8f0c8"), 16, 20)
					_play_hero(t, "dodge")
					Sfx.play("dodge")
					var dtw := create_tween()
					dtw.tween_property(t.node, "position:x", t.home.x + 16.0, 0.12)
					dtw.tween_property(t.node, "position:x", t.home.x, 0.18)
				_:
					_resolve_hit(c, t, sk, "")
					if t.guarding:
						_popup(_center(t) + Vector2(0, 16), "guard", Color(0.7, 0.8, 1.0), 12, 10)
		_refresh_party_ui()
		var rest := (c.node as SheetSprite).anim_duration("attack") - _enemy_hit_time(c)
		await _wait(maxf(0.15, rest))
		for t in live:
			if t.is_alive() and (t.node as PaperDoll).anim in ["hurt", "parry", "dodge"]:
				_play_hero(t, "guard" if t.guarding else "idle")
	(c.node as SheetSprite).play("idle")
	for t in heroes:
		if not t.is_alive() and (t.node as PaperDoll).anim != "ko":
			await _on_death(t)
	if melee:
		var tw2 := create_tween()
		tw2.tween_property(c.node, "position", c.home, 0.2)
		await tw2.finished
	# counter-attacks for every perfect parry
	for t in parried.keys():
		if t.is_alive() and c.is_alive():
			await _counter(t, c)
	if not c.is_alive():
		await _on_death(c)
	await _wait(0.2)


func _counter(h: Combatant, e: Combatant) -> void:
	_log("%s counters!" % h.display_name)
	var anim := h.hero.attack_anim()
	var melee := anim == "attack_swing"
	if melee:
		await _dash(h, e.home + Vector2(_half_width(e) + 22, 0), 0.14)
	_play_hero(h, anim, 1.3)
	await _wait(_hero_hit_time(anim, 1.3))
	var sk := {"name": "Counter", "kind": "attack", "element": h.hero.weapon_element(), "power": 0.8, "break": 1, "fx": "slash" if h.hero.weapon_type() in ["sword", "axe", "dagger"] else "hit"}
	_resolve_hit(h, e, sk, "good")
	_refresh_enemy_ui()
	await _wait(0.25)
	if melee:
		await _dash(h, h.home, 0.14)
	_play_hero(h, "guard" if h.guarding else "idle")


func _enemy_choose(c: Combatant) -> Dictionary:
	var options: Array = []
	for sid in c.skill_ids:
		var sk: Dictionary = GameData.SKILLS.get(sid, {})
		if sk.is_empty():
			continue
		if str(sk.get("kind", "")) == "heal" and c.hp > c.max_hp * 0.5:
			continue
		if str(sk.get("kind", "")) == "debuff":
			var useful := false
			for h in _alive(heroes):
				if not h.has_status(str(sk["status"]["id"])):
					useful = true
			if not useful:
				continue
		options.append(sid)
	if options.is_empty():
		options = ["e_bite"]
	var sid: String = options[randi() % options.size()]
	var sk: Dictionary = GameData.SKILLS[sid]
	var targets: Array = []
	match str(sk.get("target", "enemy")):
		"self":
			targets = [c]
		"enemies":
			targets = _alive(heroes)
		_:
			var live := _alive(heroes)
			var taunters: Array = []
			for h in live:
				if h.has_status("taunt"):
					taunters.append(h)
			if not taunters.is_empty():
				targets = [taunters[randi() % taunters.size()]]
			elif not live.is_empty():
				var total := 0.0
				var weights: Array = []
				for h in live:
					var w := 1.0 + 0.8 * (1.0 - float(h.hp) / float(h.max_hp))
					weights.append(w)
					total += w
				var roll := randf() * total
				var pick: Combatant = live[0]
				for i in live.size():
					roll -= weights[i]
					if roll <= 0.0:
						pick = live[i]
						break
				targets = [pick]
	return {"skill": sid, "targets": targets}


# ---------------------------------------------------------------------------
# end of battle
# ---------------------------------------------------------------------------
func _victory() -> void:
	_hide_menus()
	_log("Victory!")
	Sfx.play("victory")
	var xp := 0
	var gold := 0
	var drops: Array = []
	for e in enemies:
		xp += e.xp_reward
		gold += e.gold_reward
		for iid in e.drops:
			if randf() < float(e.drops[iid]):
				GameState.add_item(iid)
				drops.append(GameData.item(iid)["name"])
	GameState.add_gold(gold)
	var lines: Array = []
	for c in heroes:
		var gain := xp if c.is_alive() else int(xp / 2)
		if c.is_alive():
			_play_hero(c, "victory")
		else:
			c.hp = 1
		c.write_back()
		var events: Array = c.hero.add_xp(gain)
		for ev in events:
			var s := "%s reached Lv %d!" % [c.display_name, int(ev["level"])]
			var learned: Array = ev["skills"]
			if not learned.is_empty():
				var names: PackedStringArray = []
				for sid in learned:
					names.append(str(GameData.SKILLS[sid]["name"]))
				s += "  Learned: " + ", ".join(names)
			lines.append(s)
	if boss_flag != "":
		GameState.flags[boss_flag + "_defeated"] = true
	await _wait(0.8)
	if not lines.is_empty():
		Sfx.play("levelup")
	_show_results("VICTORY", ["+%d XP   +%d gold" % [xp, gold]] + (["Found: " + ", ".join(PackedStringArray(drops))] if not drops.is_empty() else []) + lines)
	await _await_confirm()
	_leave({"won": true, "boss_flag": boss_flag})


func _defeat() -> void:
	_hide_menus()
	_log("The party has fallen...")
	Sfx.play("death", 0, 0.6)
	for c in heroes:
		c.write_back()
	await _wait(1.6)
	GameState.last_battle_result = {"won": false, "boss_flag": boss_flag}
	GameState.pending_battle = {}
	Router.goto("gameover", 0.8)


func _show_results(title: String, lines: Array) -> void:
	for ch in results_box.get_children():
		ch.queue_free()
	var t := Label.new()
	t.text = title
	t.add_theme_font_override("font", ThemeDB.get_project_theme().get_font("font", "TitleFont"))
	t.add_theme_font_size_override("font_size", 16)
	t.add_theme_color_override("font_color", Color("ffe27a"))
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	results_box.add_child(t)
	for line in lines:
		var l := Label.new()
		l.text = str(line)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.custom_minimum_size = Vector2(320, 0)
		results_box.add_child(l)
	var hint := Label.new()
	hint.text = "[Enter] continue"
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	hint.add_theme_color_override("font_color", Color(0.7, 0.65, 0.85))
	results_box.add_child(hint)
	results_panel.visible = true


func _await_confirm() -> void:
	_waiting_confirm = true
	await _confirmed
	_waiting_confirm = false


func _leave(result: Dictionary) -> void:
	for c in heroes:
		c.write_back()
	GameState.last_battle_result = result
	GameState.pending_battle = {}
	GameState.emit_signal("party_changed")
	Router.goto("overworld", 0.5)
