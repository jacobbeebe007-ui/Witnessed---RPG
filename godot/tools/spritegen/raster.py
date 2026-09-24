"""Supersampled vector-to-pixel-art rasterizer.

Shapes are drawn at `SCALE`x resolution with smooth polygons, then downsampled,
snapped to the exact palette that was used, thresholded to a hard alpha edge and
finally given a 1px dark outline.  The result is crisp, multi-tone pixel art with
consistent shading - the same pipeline is used for every layer so all layers of a
paper-doll line up perfectly.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable, Sequence

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SCALE = 4
LIGHT_DIR = (-0.62, -0.78)  # light from the upper-left


def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def mix(a, b, t: float) -> tuple[int, int, int]:
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def darken(c, t: float):
    return mix(c, (0, 0, 0), t)


def lighten(c, t: float):
    return mix(c, (255, 255, 255), t)


def shift_hue(c, dh: float, ds: float = 0.0, dv: float = 0.0):
    import colorsys

    r, g, b = [v / 255 for v in c]
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    h = (h + dh) % 1.0
    s = min(1, max(0, s + ds))
    v = min(1, max(0, v + dv))
    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    return (int(r * 255), int(g * 255), int(b * 255))


@dataclass(frozen=True)
class Ramp:
    """A 4 tone shading ramp: dark, mid, light, highlight."""

    dark: tuple
    mid: tuple
    light: tuple
    hi: tuple

    @staticmethod
    def from_color(c, contrast: float = 1.0) -> "Ramp":
        c = hex_to_rgb(c) if isinstance(c, str) else tuple(c)
        # pixel-art style hue shifting: shadows go cooler/purple, lights go warmer/yellow
        dark = shift_hue(darken(c, 0.42 * contrast), 0.04, 0.10, 0)
        light = shift_hue(lighten(c, 0.22 * contrast), -0.03, -0.08, 0)
        hi = shift_hue(lighten(c, 0.48 * contrast), -0.05, -0.18, 0)
        return Ramp(dark, c, light, hi)

    def colors(self):
        return (self.dark, self.mid, self.light, self.hi)


class Canvas:
    """A high-resolution drawing surface measured in *pixel-art pixels*."""

    def __init__(self, w: int, h: int, scale: int = SCALE):
        self.w, self.h, self.s = w, h, scale
        self.img = Image.new("RGBA", (w * scale, h * scale), (0, 0, 0, 0))
        self.palette: set[tuple] = set()
        # per-pixel "outline" mask - pixels that must keep an outline even when covered
        self._outline_ramp_of: list = []

    # -- helpers -------------------------------------------------------
    def _pt(self, p):
        return (p[0] * self.s, p[1] * self.s)

    def _use(self, color):
        self.palette.add(tuple(color[:3]))

    def _draw(self):
        return ImageDraw.Draw(self.img)

    # -- flat shapes ---------------------------------------------------
    def poly(self, pts: Sequence, color):
        self._use(color)
        self._draw().polygon([self._pt(p) for p in pts], fill=tuple(color) + (255,))

    def ellipse(self, cx, cy, rx, ry, color):
        self._use(color)
        s = self.s
        self._draw().ellipse([(cx - rx) * s, (cy - ry) * s, (cx + rx) * s, (cy + ry) * s], fill=tuple(color) + (255,))

    def circle(self, cx, cy, r, color):
        self.ellipse(cx, cy, r, r, color)

    def rect(self, x0, y0, x1, y1, color):
        self._use(color)
        s = self.s
        x1, y1 = max(x1, x0 + 1.0 / s), max(y1, y0 + 1.0 / s)
        self._draw().rectangle([x0 * s, y0 * s, x1 * s - 1, y1 * s - 1], fill=tuple(color) + (255,))

    def line(self, p0, p1, width, color):
        self._use(color)
        s = self.s
        self._draw().line([self._pt(p0), self._pt(p1)], fill=tuple(color) + (255,), width=max(1, int(width * s)))

    def capsule(self, p0, p1, r, color):
        """A thick rounded line (limb segment)."""
        self._use(color)
        s = self.s
        d = self._draw()
        d.line([self._pt(p0), self._pt(p1)], fill=tuple(color) + (255,), width=max(1, int(2 * r * s)))
        for p in (p0, p1):
            d.ellipse([(p[0] - r) * s, (p[1] - r) * s, (p[0] + r) * s, (p[1] + r) * s], fill=tuple(color) + (255,))

    def pixel(self, x, y, color):
        self.rect(int(x), int(y), int(x) + 1, int(y) + 1, color)

    # -- shaded shapes -------------------------------------------------
    def shaded(self, draw_fn, ramp: Ramp, light=LIGHT_DIR, hi_w=1.0, sh_w=1.4, core=False, hi=True):
        """Draw a shape via `draw_fn(mask_draw, scale)` with automatic rim shading.

        `draw_fn` receives an ImageDraw on an "L" mask image and must draw the
        shape in white using high-res coordinates (multiply by scale).
        """
        s = self.s
        mask = Image.new("L", self.img.size, 0)
        draw_fn(ImageDraw.Draw(mask), s)
        m = np.array(mask) > 127
        if not m.any():
            return
        lx, ly = light

        def shifted(arr, dx, dy):
            out = np.zeros_like(arr)
            H, W = arr.shape
            dx, dy = int(round(dx)), int(round(dy))
            xs0, xs1 = max(0, dx), min(W, W + dx)
            ys0, ys1 = max(0, dy), min(H, H + dy)
            out[ys0:ys1, xs0:xs1] = arr[ys0 - dy : ys1 - dy, xs0 - dx : xs1 - dx]
            return out

        # highlight: near the edge facing the light, shadow: near the edge away from it
        hi_band = m & ~shifted(m, -lx * hi_w * s, -ly * hi_w * s)
        sh_band = m & ~shifted(m, lx * sh_w * s, ly * sh_w * s)
        sh_band2 = m & ~shifted(m, lx * sh_w * 0.5 * s, ly * sh_w * 0.5 * s)
        arr = np.array(self.img)
        for color in (ramp.dark, ramp.mid, ramp.light, ramp.hi):
            self._use(color)
        arr[m] = (*ramp.mid, 255)
        if core:
            arr[sh_band] = (*ramp.dark, 255)
        arr[sh_band] = (*ramp.dark, 255)
        if hi:
            arr[hi_band & ~sh_band2] = (*ramp.light, 255)
        self.img = Image.fromarray(arr, "RGBA")

    def capsule_s(self, p0, p1, r, ramp: Ramp, **kw):
        s = self.s

        def fn(d, sc):
            d.line([self._pt(p0), self._pt(p1)], fill=255, width=max(1, int(2 * r * sc)))
            for p in (p0, p1):
                d.ellipse([(p[0] - r) * sc, (p[1] - r) * sc, (p[0] + r) * sc, (p[1] + r) * sc], fill=255)

        self.shaded(fn, ramp, **kw)

    def ellipse_s(self, cx, cy, rx, ry, ramp: Ramp, **kw):
        def fn(d, sc):
            d.ellipse([(cx - rx) * sc, (cy - ry) * sc, (cx + rx) * sc, (cy + ry) * sc], fill=255)

        self.shaded(fn, ramp, **kw)

    def poly_s(self, pts, ramp: Ramp, **kw):
        def fn(d, sc):
            d.polygon([self._pt(p) for p in pts], fill=255)

        self.shaded(fn, ramp, **kw)

    def rect_s(self, x0, y0, x1, y1, ramp: Ramp, **kw):
        self.poly_s([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], ramp, **kw)

    def rotated_rect_s(self, cx, cy, w, h, ang, ramp: Ramp, **kw):
        self.poly_s(rot_rect(cx, cy, w, h, ang), ramp, **kw)

    def rotated_rect(self, cx, cy, w, h, ang, color):
        self.poly(rot_rect(cx, cy, w, h, ang), color)

    def glow(self, cx, cy, r, color, alpha=120):
        """Soft additive-ish glow (used for magic effects)."""
        s = self.s
        layer = Image.new("RGBA", self.img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        steps = 4
        for i in range(steps, 0, -1):
            rr = r * i / steps
            a = int(alpha * (1 - (i - 1) / steps))
            d.ellipse([(cx - rr) * s, (cy - rr) * s, (cx + rr) * s, (cy + rr) * s], fill=tuple(color) + (a,))
        self._use(color)
        for i in range(1, 4):
            self._use(mix(color, (0, 0, 0), 0.25 * i))
        self.img = Image.alpha_composite(self.img, layer)

    # -- composition ---------------------------------------------------
    def paste(self, other: "Canvas", dx=0, dy=0):
        layer = Image.new("RGBA", self.img.size, (0, 0, 0, 0))
        layer.paste(other.img, (int(dx * self.s), int(dy * self.s)))
        self.img = Image.alpha_composite(self.img, layer)
        self.palette |= other.palette

    def erase(self, draw_fn):
        """Erase a region (mask drawn in white) - used for cut-outs."""
        mask = Image.new("L", self.img.size, 0)
        draw_fn(ImageDraw.Draw(mask), self.s)
        arr = np.array(self.img)
        arr[np.array(mask) > 127] = (0, 0, 0, 0)
        self.img = Image.fromarray(arr, "RGBA")

    # -- finalize ------------------------------------------------------
    def render(self, outline=True, outline_color=None, alpha_threshold=0.42, outline_strength=0.62) -> Image.Image:
        small = self.img.resize((self.w, self.h), Image.Resampling.BOX)
        arr = np.array(small).astype(np.float32)
        alpha = arr[..., 3] / 255.0
        solid = alpha >= alpha_threshold
        rgb = arr[..., :3]
        # un-premultiply the color from partially covered pixels
        a = np.clip(alpha, 1e-3, 1)[..., None]
        rgb = np.clip(rgb / a * a, 0, 255)  # BOX already averages un-premultiplied; keep as is
        out = np.zeros((self.h, self.w, 4), dtype=np.uint8)
        if self.palette and solid.any():
            pal = np.array(sorted(self.palette), dtype=np.float32)
            px = rgb[solid]
            # nearest palette color (weighted a bit toward luminance accuracy)
            wts = np.array([0.30, 0.59, 0.11], dtype=np.float32) * 1.5 + 0.5
            d = ((px[:, None, :] - pal[None, :, :]) ** 2 * wts).sum(-1)
            idx = d.argmin(1)
            out[solid, :3] = pal[idx].astype(np.uint8)
            out[solid, 3] = 255
        if outline:
            out = add_outline(out, outline_color, outline_strength)
        return Image.fromarray(out, "RGBA")


def add_outline(out: np.ndarray, outline_color=None, strength=0.62) -> np.ndarray:
    """Dilate the silhouette by 1px with a dark outline (selective outline colour)."""
    solid = out[..., 3] > 0
    H, W = solid.shape
    res = out.copy()
    # for each empty pixel touching a solid pixel, colour it with darkened neighbour colour
    neigh = np.zeros((H, W), dtype=bool)
    src = np.zeros((H, W, 3), dtype=np.float32)
    cnt = np.zeros((H, W), dtype=np.float32)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        sh = np.zeros_like(solid)
        shc = np.zeros_like(src)
        ys0, ys1 = max(0, dy), min(H, H + dy)
        xs0, xs1 = max(0, dx), min(W, W + dx)
        sh[ys0:ys1, xs0:xs1] = solid[ys0 - dy : ys1 - dy, xs0 - dx : xs1 - dx]
        shc[ys0:ys1, xs0:xs1] = out[ys0 - dy : ys1 - dy, xs0 - dx : xs1 - dx, :3]
        neigh |= sh
        src += shc * sh[..., None]
        cnt += sh
    edge = neigh & ~solid
    if outline_color is not None:
        col = np.array(outline_color, dtype=np.float32)
        res[edge, :3] = col.astype(np.uint8)
    else:
        avg = src[edge] / np.maximum(cnt[edge], 1)[:, None]
        dark = avg * (1 - strength)
        # push toward a deep purple-black like classic pixel art
        dark = dark * 0.85 + np.array([14, 8, 20], dtype=np.float32) * 0.15
        res[edge, :3] = np.clip(dark, 0, 255).astype(np.uint8)
    res[edge, 3] = 255
    return res


def rot_rect(cx, cy, w, h, ang):
    """Corner points of a rectangle rotated by `ang` radians around (cx, cy)."""
    c, s = math.cos(ang), math.sin(ang)
    hw, hh = w / 2, h / 2
    pts = []
    for x, y in ((-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)):
        pts.append((cx + x * c - y * s, cy + x * s + y * c))
    return pts


def rot_pt(cx, cy, x, y, ang):
    c, s = math.cos(ang), math.sin(ang)
    return (cx + x * c - y * s, cy + x * s + y * c)


def lerp(a, b, t):
    return a + (b - a) * t


def lerp_pt(a, b, t):
    return (lerp(a[0], b[0], t), lerp(a[1], b[1], t))


def sheet(frames: Iterable[Image.Image], fw: int, fh: int, rows: int = 1) -> Image.Image:
    frames = list(frames)
    per_row = math.ceil(len(frames) / rows)
    img = Image.new("RGBA", (per_row * fw, rows * fh), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        img.paste(f, ((i % per_row) * fw, (i // per_row) * fh))
    return img


def sheet_rows(rows_of_frames: list[list[Image.Image]], fw: int, fh: int) -> Image.Image:
    cols = max(len(r) for r in rows_of_frames)
    img = Image.new("RGBA", (cols * fw, len(rows_of_frames) * fh), (0, 0, 0, 0))
    for r, frames in enumerate(rows_of_frames):
        for c, f in enumerate(frames):
            img.paste(f, (c * fw, r * fh))
    return img
