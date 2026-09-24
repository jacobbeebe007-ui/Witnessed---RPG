extends Node
## Tiny procedural sound bank - every effect is synthesised at start-up so the
## project needs no audio files.

const RATE := 22050
var _bank: Dictionary = {}
var _players: Array[AudioStreamPlayer] = []
var _next := 0


func _ready() -> void:
	for i in 8:
		var p := AudioStreamPlayer.new()
		p.bus = "Master"
		add_child(p)
		_players.append(p)
	_bank["select"] = _make(0.08, func(t, d): return _sq(t, 880.0 + 400.0 * t / d) * _env(t, d, 0.005, 0.5))
	_bank["cancel"] = _make(0.10, func(t, d): return _sq(t, 520.0 - 200.0 * t / d) * _env(t, d, 0.005, 0.6))
	_bank["move"] = _make(0.04, func(t, d): return _sq(t, 1200.0) * _env(t, d, 0.002, 0.8))
	_bank["hit"] = _make(0.16, func(t, d): return (_noise() * 0.7 + _sq(t, 140.0 - 80.0 * t / d) * 0.5) * _env(t, d, 0.002, 0.25))
	_bank["slash"] = _make(0.20, func(t, d): return (_noise() * (1.0 - t / d) + _saw(t, 900.0 - 700.0 * t / d) * 0.3) * _env(t, d, 0.003, 0.3))
	_bank["magic"] = _make(0.45, func(t, d): return (_sin(t, 440.0 + 660.0 * t / d) + _sin(t, 660.0 + 440.0 * sin(t * 30.0)) * 0.5) * _env(t, d, 0.02, 0.6))
	_bank["fire"] = _make(0.40, func(t, d): return (_noise() * 0.8 + _saw(t, 120.0) * 0.3) * _env(t, d, 0.02, 0.7))
	_bank["ice"] = _make(0.35, func(t, d): return (_sin(t, 1800.0 - 900.0 * t / d) + _sq(t, 2400.0) * 0.2) * _env(t, d, 0.005, 0.5))
	_bank["heal"] = _make(0.55, func(t, d): return (_sin(t, 523.0) + _sin(t, 659.0) * float(t > 0.12) + _sin(t, 784.0) * float(t > 0.24)) * 0.5 * _env(t, d, 0.02, 0.8))
	_bank["parry"] = _make(0.22, func(t, d): return (_sq(t, 1600.0) * 0.4 + _sin(t, 2200.0 + 1200.0 * t / d) * 0.6 + _noise() * 0.2) * _env(t, d, 0.002, 0.4))
	_bank["dodge"] = _make(0.18, func(t, d): return _noise() * (1.0 - t / d) * _env(t, d, 0.01, 0.9))
	_bank["hurt"] = _make(0.22, func(t, d): return (_saw(t, 220.0 - 120.0 * t / d) + _noise() * 0.4) * _env(t, d, 0.003, 0.4))
	_bank["break"] = _make(0.5, func(t, d): return (_noise() * 0.6 + _sq(t, 90.0 - 40.0 * t / d)) * _env(t, d, 0.002, 0.6))
	_bank["levelup"] = _make(0.9, func(t, d): return _sq(t, [523.0, 659.0, 784.0, 1046.0][mini(3, int(t / 0.18))]) * 0.5 * _env(t, d, 0.01, 0.9))
	_bank["victory"] = _make(1.2, func(t, d): return (_sq(t, [392.0, 523.0, 659.0, 784.0, 659.0, 784.0][mini(5, int(t / 0.2))]) * 0.4 + _sin(t, 196.0) * 0.3) * _env(t, d, 0.01, 0.95))
	_bank["encounter"] = _make(0.5, func(t, d): return (_saw(t, 110.0 + 30.0 * sin(t * 40.0)) + _noise() * 0.3) * _env(t, d, 0.01, 0.8))
	_bank["coin"] = _make(0.14, func(t, d): return (_sin(t, 1760.0) + _sin(t, 2637.0) * float(t > 0.05)) * 0.5 * _env(t, d, 0.002, 0.5))
	_bank["equip"] = _make(0.18, func(t, d): return (_noise() * 0.3 + _sq(t, 700.0) * 0.5 + _sq(t, 1050.0) * 0.4 * float(t > 0.07)) * _env(t, d, 0.003, 0.5))
	_bank["step"] = _make(0.05, func(t, d): return _noise() * 0.25 * _env(t, d, 0.002, 0.3))
	_bank["death"] = _make(0.6, func(t, d): return (_saw(t, 200.0 - 150.0 * t / d) * 0.6 + _noise() * 0.3) * _env(t, d, 0.01, 0.7))


func play(name: String, volume_db: float = 0.0, pitch: float = 1.0) -> void:
	if not _bank.has(name):
		return
	var p := _players[_next]
	_next = (_next + 1) % _players.size()
	p.stream = _bank[name]
	p.volume_db = volume_db + linear_to_db(clampf(float(GameState.settings.get("volume", 0.8)), 0.001, 1.0))
	p.pitch_scale = pitch
	p.play()


# ---------------------------------------------------------------------------
func _make(duration: float, fn: Callable) -> AudioStreamWAV:
	var n := int(duration * RATE)
	var data := PackedByteArray()
	data.resize(n * 2)
	for i in n:
		var t := float(i) / RATE
		var v: float = clampf(fn.call(t, duration), -1.0, 1.0)
		var s := int(v * 32000.0)
		data.encode_s16(i * 2, s)
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = RATE
	wav.stereo = false
	wav.data = data
	return wav


static func _env(t: float, d: float, attack: float, release_start: float) -> float:
	if t < attack:
		return t / attack
	var rel := d * release_start
	if t > rel:
		return maxf(0.0, 1.0 - (t - rel) / (d - rel))
	return 1.0


static func _sin(t: float, f: float) -> float:
	return sin(t * f * TAU)


static func _sq(t: float, f: float) -> float:
	return 1.0 if fmod(t * f, 1.0) < 0.5 else -1.0


static func _saw(t: float, f: float) -> float:
	return fmod(t * f, 1.0) * 2.0 - 1.0


static func _noise() -> float:
	return randf() * 2.0 - 1.0
