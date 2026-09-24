class_name WorldGen
extends RefCounted
## Deterministic overworld layout: terrain, regions, roads, points of interest.

const W := 120
const H := 80
const TILE := 16

# atlas indices (must match tools/spritegen/tiles.py TILES order)
const T := {
	"grass": 0, "grass2": 1, "grass3": 2, "tall_grass": 3, "flowers": 4, "path": 5, "path_edge": 6, "sand": 7,
	"water": 8, "water2": 9, "deep_water": 10, "mountain": 11, "mountain_snow": 12, "forest_floor": 13, "dirt": 14, "cobble": 15,
	"rock": 16, "bush": 17, "stump": 18, "shore": 19, "swamp": 20, "ash": 21, "lava": 22, "lava2": 23,
}
const BLOCKED := [8, 9, 10, 11, 12, 16, 17, 22, 23]
const ROAD := [5, 15, 14]

var tiles: PackedInt32Array = PackedInt32Array()
var region: PackedStringArray = PackedStringArray()
var blocked: PackedByteArray = PackedByteArray()
var objects: Array = []          # {kind, tile:Vector2i, size:Vector2i}
var pois: Array = []             # {id, kind, tile, label, data}
var start_tile := Vector2i(13, 41)
var rng := RandomNumberGenerator.new()


func generate(seed_value: int = 1337) -> void:
	rng.seed = seed_value
	tiles.resize(W * H)
	blocked.resize(W * H)
	region.resize(W * H)
	_terrain()
	_features()
	_roads()
	_places()
	_finalize_blocking()


func idx(x: int, y: int) -> int:
	return y * W + x


func in_bounds(x: int, y: int) -> bool:
	return x >= 0 and y >= 0 and x < W and y < H


func tile_at(x: int, y: int) -> int:
	if not in_bounds(x, y):
		return T["mountain"]
	return tiles[idx(x, y)]


func region_at(x: int, y: int) -> String:
	if not in_bounds(x, y):
		return "meadow"
	return region[idx(x, y)]


func is_blocked(x: int, y: int) -> bool:
	if not in_bounds(x, y):
		return true
	return blocked[idx(x, y)] != 0


func set_tile(x: int, y: int, t: int) -> void:
	if in_bounds(x, y):
		tiles[idx(x, y)] = t


func fill_rect(x0: int, y0: int, x1: int, y1: int, t: int) -> void:
	for y in range(y0, y1 + 1):
		for x in range(x0, x1 + 1):
			set_tile(x, y, t)


# ---------------------------------------------------------------------------
func _noise(x: float, y: float, s: float) -> float:
	## Cheap smooth value noise in [0, 1].
	var v := sin(x * 0.173 * s + 1.3) * cos(y * 0.151 * s + 0.7) + sin((x + y) * 0.091 * s) * 0.6 + cos((x - 2.0 * y) * 0.063 * s + 2.1) * 0.4
	return clampf(v * 0.25 + 0.5, 0.0, 1.0)


func _terrain() -> void:
	for y in H:
		for x in W:
			var i := idx(x, y)
			var n := _noise(x, y, 1.0)
			var reg := "meadow"
			if x >= 44 and x < 82:
				reg = "forest"
			elif x >= 82:
				reg = "wastes"
			if x >= 86 and y >= 56:
				reg = "ruins"
			if x >= 58 and x <= 78 and y <= 17:
				reg = "cave"
			region[i] = reg
			var t: int = T["grass"]
			match reg:
				"meadow":
					t = T["grass"] if n < 0.55 else (T["grass2"] if n < 0.75 else T["grass3"])
					if n > 0.86:
						t = T["flowers"]
					elif n < 0.18:
						t = T["tall_grass"]
				"forest":
					t = T["forest_floor"] if n < 0.7 else T["grass3"]
				"wastes":
					t = T["sand"] if n < 0.7 else T["ash"]
				"ruins":
					t = T["cobble"] if n < 0.45 else (T["swamp"] if n < 0.6 else T["dirt"])
				"cave":
					t = T["dirt"] if n < 0.7 else T["cobble"]
			tiles[i] = t
	# mountain border
	for y in H:
		for x in W:
			var edge := 2 + int(_noise(x * 3.0, y * 3.0, 2.0) * 2.5)
			if x < edge or y < edge or x >= W - edge or y >= H - edge:
				set_tile(x, y, T["mountain_snow"] if _noise(x * 5.0, y * 5.0, 3.0) > 0.7 else T["mountain"])
	# lake in the meadow, river between forest and wastes
	_blob(30, 60, 9, 6, T["water"], T["deep_water"])
	_blob(28, 16, 7, 5, T["water"], T["deep_water"])
	for y in range(3, H - 3):
		var rx := 81 + int(round(sin(y * 0.25) * 2.0))
		for dx in range(-1, 2):
			set_tile(rx + dx, y, T["water"])
	# mountain ranges: cave pocket walls + a ridge around the wastes lair
	for x in range(56, 82):
		for y in range(0, 21):
			if y == 18 or y == 19 or x == 56 or x == 57 or (x >= 79 and y < 20):
				set_tile(x, y, T["mountain"])
	# opening into the cave pocket
	for x in range(66, 70):
		set_tile(x, 18, T["dirt"])
		set_tile(x, 19, T["dirt"])
	# volcanic lair in the north-east
	for y in range(3, 30):
		for x in range(98, W - 2):
			var n2 := _noise(x * 1.7, y * 1.7, 1.4)
			if n2 > 0.62:
				set_tile(x, y, T["mountain"])
			elif n2 < 0.28:
				set_tile(x, y, T["lava"])
			else:
				set_tile(x, y, T["ash"])
	_blob(108, 20, 6, 4, T["ash"], T["ash"])
	# entrance corridor to the lair
	for y in range(28, 34):
		for x in range(101, 106):
			set_tile(x, y, T["ash"])
	# bridges across the river for the main road (added in _roads)


func _blob(cx: int, cy: int, rx: int, ry: int, edge: int, core: int) -> void:
	for y in range(cy - ry - 1, cy + ry + 2):
		for x in range(cx - rx - 1, cx + rx + 2):
			var d := pow(float(x - cx) / rx, 2) + pow(float(y - cy) / ry, 2)
			if d < 0.45:
				set_tile(x, y, core)
			elif d < 1.0 + _noise(x * 4.0, y * 4.0, 2.0) * 0.3:
				set_tile(x, y, edge)


func _features() -> void:
	for y in range(3, H - 3):
		for x in range(3, W - 3):
			var t := tile_at(x, y)
			if t in BLOCKED or t in ROAD:
				continue
			var reg := region_at(x, y)
			var n := _noise(x * 2.3, y * 2.3, 1.7)
			var r := rng.randf()
			match reg:
				"meadow":
					if n > 0.78 and r < 0.35:
						_place_object("tree", x, y, Vector2i(2, 2))
					elif r < 0.02:
						set_tile(x, y, T["rock"])
					elif r < 0.04:
						set_tile(x, y, T["bush"])
				"forest":
					if n > 0.42 and r < 0.55:
						_place_object("pine" if n > 0.7 else "tree", x, y, Vector2i(2, 2))
					elif r < 0.03:
						set_tile(x, y, T["stump"])
					elif r < 0.06:
						set_tile(x, y, T["bush"])
				"wastes":
					if r < 0.03:
						set_tile(x, y, T["rock"])
					elif n > 0.8 and r < 0.12:
						_place_object("dead_tree", x, y, Vector2i(2, 2))
				"ruins":
					if r < 0.05:
						set_tile(x, y, T["rock"])
					elif n > 0.7 and r < 0.2:
						_place_object("dead_tree", x, y, Vector2i(2, 2))
				"cave":
					if r < 0.08:
						set_tile(x, y, T["rock"])


func _place_object(kind: String, x: int, y: int, size: Vector2i) -> bool:
	for oy in size.y:
		for ox in size.x:
			if not in_bounds(x + ox, y + oy):
				return false
			var t := tile_at(x + ox, y + oy)
			if t in BLOCKED or t in ROAD or blocked[idx(x + ox, y + oy)] != 0:
				return false
	objects.append({"kind": kind, "tile": Vector2i(x, y), "size": size})
	for oy in size.y:
		for ox in size.x:
			blocked[idx(x + ox, y + oy)] = 1
	return true


func _clear_area(x0: int, y0: int, x1: int, y1: int, t: int = -1) -> void:
	## Remove objects/blocking in a rect (and optionally paint a floor tile).
	var keep: Array = []
	for o in objects:
		var ot: Vector2i = o["tile"]
		var os: Vector2i = o["size"]
		if ot.x + os.x - 1 < x0 or ot.x > x1 or ot.y + os.y - 1 < y0 or ot.y > y1:
			keep.append(o)
		else:
			for oy in os.y:
				for ox in os.x:
					if in_bounds(ot.x + ox, ot.y + oy):
						blocked[idx(ot.x + ox, ot.y + oy)] = 0
	objects = keep
	for y in range(y0, y1 + 1):
		for x in range(x0, x1 + 1):
			if in_bounds(x, y):
				blocked[idx(x, y)] = 0
				if t >= 0:
					set_tile(x, y, t)
				elif tile_at(x, y) in BLOCKED:
					set_tile(x, y, T["grass"] if region_at(x, y) == "meadow" else T["dirt"])


func _road(points: Array, t: int = -1) -> void:
	for i in range(points.size() - 1):
		var a: Vector2i = points[i]
		var b: Vector2i = points[i + 1]
		var p := a
		while p != b:
			if p.x != b.x and (p.y == b.y or rng.randf() < 0.6):
				p.x += signi(b.x - p.x)
			else:
				p.y += signi(b.y - p.y)
			for d in [Vector2i.ZERO, Vector2i(1, 0), Vector2i(0, 1), Vector2i(1, 1)]:
				var q: Vector2i = p + d
				if not in_bounds(q.x, q.y):
					continue
				var cur := tile_at(q.x, q.y)
				var rt := t
				if rt < 0:
					rt = T["path"] if region_at(q.x, q.y) in ["meadow", "forest"] else T["dirt"]
				if cur in [T["water"], T["deep_water"]]:
					rt = T["cobble"]   # bridge
				set_tile(q.x, q.y, rt)
				blocked[idx(q.x, q.y)] = 0
			_clear_area(p.x - 1, p.y - 1, p.x + 2, p.y + 2)


func _roads() -> void:
	# main road: Hollowmere -> Thornwood -> river crossing -> Dustwatch -> ruins / lair
	_road([Vector2i(16, 41), Vector2i(30, 41), Vector2i(40, 44), Vector2i(52, 38), Vector2i(64, 42), Vector2i(76, 40), Vector2i(84, 44), Vector2i(92, 44)])
	_road([Vector2i(52, 38), Vector2i(55, 26)])                                  # shrine
	_road([Vector2i(48, 44), Vector2i(48, 56)])                                  # hunter's camp
	_road([Vector2i(64, 42), Vector2i(67, 24), Vector2i(67, 20)])                # mountain pass
	_road([Vector2i(92, 44), Vector2i(92, 32), Vector2i(87, 30)])                # bandit camp
	_road([Vector2i(92, 44), Vector2i(96, 62)])                                  # ruins
	_road([Vector2i(92, 44), Vector2i(103, 40), Vector2i(103, 30)])              # lair
	_road([Vector2i(103, 40), Vector2i(111, 46)])                                # tower


func _places() -> void:
	# --- Hollowmere -----------------------------------------------------
	_clear_area(6, 34, 20, 47, T["grass"])
	fill_rect(8, 40, 18, 42, T["path"])
	region_fill(6, 34, 20, 47, "town")
	_place_object("inn", 7, 35, Vector2i(4, 4))
	_place_object("shop", 13, 35, Vector2i(4, 4))
	_place_object("house", 7, 44, Vector2i(3, 3))
	_place_object("house", 15, 44, Vector2i(3, 3))
	_poi("inn_hollowmere", "inn", Vector2i(9, 39), "Hollowmere Inn", {"price": 20})
	_poi("shop_hollowmere", "shop", Vector2i(15, 39), "Hollowmere Market", {"tier": 1})
	_poi("sign_hollowmere", "sign", Vector2i(18, 39), "Sign", {"text": "Hollowmere. East: Thornwood. Beware the Veil-touched."})
	_poi("kaelen", "companion", Vector2i(20, 41), "Kaelen", {})
	start_tile = Vector2i(11, 41)
	# --- Thornwood shrine ----------------------------------------------
	_clear_area(52, 20, 58, 26, T["grass3"])
	_place_object("shrine", 54, 20, Vector2i(3, 3))
	_poi("sera", "companion", Vector2i(57, 24), "Sera", {})
	_poi("chest_1", "chest", Vector2i(52, 22), "Chest", {"gold": 60, "item": "potion", "count": 2})
	# --- Hunter's camp ---------------------------------------------------
	_clear_area(45, 56, 52, 60, T["grass3"])
	_place_object("camp", 46, 56, Vector2i(3, 3))
	_poi("lyra", "companion", Vector2i(50, 58), "Lyra", {})
	_poi("chest_2", "chest", Vector2i(51, 57), "Chest", {"item": "bow_hunting", "count": 1, "gold": 30})
	# --- Mountain pass + cave ------------------------------------------
	_clear_area(63, 21, 71, 26, T["dirt"])
	_poi("dorn", "companion", Vector2i(70, 23), "Dorn", {})
	_place_object("cave", 66, 20, Vector2i(3, 2))
	_clear_area(60, 4, 76, 17, T["dirt"])
	_poi("chest_3", "chest", Vector2i(61, 6), "Chest", {"item": "hi_potion", "count": 2})
	_poi("boss_golem", "boss", Vector2i(68, 8), "The Sleepless Warden", {"enemy": "boss_golem", "flag": "boss_golem", "intro": "golem_intro", "region": "cave"})
	# --- Bandit camp -----------------------------------------------------
	_clear_area(84, 27, 91, 33, T["sand"])
	_place_object("camp", 85, 27, Vector2i(3, 3))
	_place_object("camp", 89, 27, Vector2i(3, 3))
	_poi("boss_ogre", "boss", Vector2i(88, 31), "Grommash", {"enemy": "boss_ogre", "flag": "boss_ogre", "intro": "ogre_intro", "region": "wastes"})
	_poi("vex", "companion", Vector2i(86, 31), "Vex", {"requires": "boss_ogre"})
	_poi("chest_4", "chest", Vector2i(90, 32), "Chest", {"gold": 200, "item": "ether", "count": 2})
	# --- Dustwatch outpost ----------------------------------------------
	_clear_area(82, 45, 92, 52, T["sand"])
	fill_rect(84, 47, 90, 48, T["cobble"])
	region_fill(82, 45, 92, 52, "town")
	_place_object("inn", 83, 45, Vector2i(4, 4))
	_place_object("shop", 88, 45, Vector2i(4, 4))
	_poi("inn_dustwatch", "inn", Vector2i(85, 49), "Dustwatch Inn", {"price": 60})
	_poi("shop_dustwatch", "shop", Vector2i(90, 49), "Dustwatch Armory", {"tier": 2})
	_poi("sign_dustwatch", "sign", Vector2i(83, 50), "Sign", {"text": "Dustwatch. North: bandits. South: the Sunken Ruins. Far east: do not go."})
	# --- Ruins -----------------------------------------------------------
	_clear_area(93, 60, 100, 66, T["cobble"])
	_place_object("tower", 96, 58, Vector2i(3, 5))
	_poi("amos", "companion", Vector2i(99, 64), "Brother Amos", {})
	_poi("chest_5", "chest", Vector2i(94, 65), "Chest", {"item": "phoenix", "count": 1, "gold": 120})
	_poi("chest_6", "chest", Vector2i(110, 70), "Chest", {"item": "mace_holy", "count": 1})
	# --- Lair ------------------------------------------------------------
	_clear_area(104, 16, 112, 24, T["ash"])
	_poi("boss_drake", "boss", Vector2i(108, 20), "Vaelysra", {"enemy": "boss_drake", "flag": "boss_drake", "intro": "drake_intro", "region": "lair"})
	_poi("chest_7", "chest", Vector2i(105, 23), "Chest", {"item": "elixir", "count": 1})
	# --- Veil tower ------------------------------------------------------
	_clear_area(108, 42, 116, 50, T["cobble"])
	_place_object("tower", 110, 40, Vector2i(3, 5))
	_poi("boss_lich", "boss", Vector2i(111, 47), "The Witness", {"enemy": "boss_lich", "flag": "boss_lich", "intro": "lich_intro", "region": "tower", "requires": ["boss_golem", "boss_drake"]})
	_poi("chest_8", "chest", Vector2i(115, 44), "Chest", {"item": "hi_potion", "count": 3})
	# scattered chests
	_poi("chest_9", "chest", Vector2i(36, 22), "Chest", {"gold": 45, "item": "antidote", "count": 2})
	_poi("chest_10", "chest", Vector2i(72, 56), "Chest", {"item": "chain_knight", "count": 1})


func region_fill(x0: int, y0: int, x1: int, y1: int, reg: String) -> void:
	for y in range(y0, y1 + 1):
		for x in range(x0, x1 + 1):
			if in_bounds(x, y):
				region[idx(x, y)] = reg


func _poi(id: String, kind: String, tile: Vector2i, label: String, data: Dictionary) -> void:
	_clear_area(tile.x - 1, tile.y - 1, tile.x + 1, tile.y + 1)
	pois.append({"id": id, "kind": kind, "tile": tile, "label": label, "data": data})


func _finalize_blocking() -> void:
	for y in H:
		for x in W:
			if tiles[idx(x, y)] in BLOCKED:
				blocked[idx(x, y)] = 1
	# make sure POIs and the start tile are reachable pockets
	for p in pois:
		var t: Vector2i = p["tile"]
		for oy in range(-1, 2):
			for ox in range(-1, 2):
				if in_bounds(t.x + ox, t.y + oy) and tiles[idx(t.x + ox, t.y + oy)] in BLOCKED:
					var reg := region_at(t.x + ox, t.y + oy)
					set_tile(t.x + ox, t.y + oy, T["dirt"] if reg != "meadow" else T["grass"])
					blocked[idx(t.x + ox, t.y + oy)] = 0
	blocked[idx(start_tile.x, start_tile.y)] = 0
