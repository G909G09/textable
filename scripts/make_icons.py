#!/usr/bin/env python3
"""Generates simple PNG icons for the extension (green rounded square with 3 white dots)."""
import struct
import zlib
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "icons")

BG = (63, 163, 77)  # accent green, matches popup light-mode accent
FG = (255, 255, 255)


def make_icon(size):
    radius = size * 0.22
    dot_r = max(1.0, size * 0.075)
    cy = size * 0.5
    spacing = size * 0.24
    centers = [(size * 0.5 - spacing, cy), (size * 0.5, cy), (size * 0.5 + spacing, cy)]

    pixels = []
    for y in range(size):
        row = []
        for x in range(size):
            # rounded-rect mask
            in_shape = True
            cx = x + 0.5
            cyp = y + 0.5
            nx = min(cx, size - cx)
            ny = min(cyp, size - cyp)
            if nx < radius and ny < radius:
                dx = radius - nx
                dy = radius - ny
                if dx * dx + dy * dy > radius * radius:
                    in_shape = False
            if not in_shape:
                row.append((0, 0, 0, 0))
                continue
            # dots
            is_dot = False
            for (dcx, dcy) in centers:
                ddx = cx - dcx
                ddy = cyp - dcy
                if ddx * ddx + ddy * ddy <= dot_r * dot_r:
                    is_dot = True
                    break
            if is_dot:
                row.append((*FG, 255))
            else:
                row.append((*BG, 255))
        pixels.append(row)
    return pixels


def write_png(path, pixels):
    size = len(pixels)
    raw = bytearray()
    for row in pixels:
        raw.append(0)  # filter type 0
        for (r, g, b, a) in row:
            raw.extend([r, g, b, a])

    def chunk(tag, data):
        c = tag + data
        return struct.pack("!I", len(data)) + c + struct.pack("!I", zlib.crc32(c) & 0xffffffff)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack("!IIBBBBB", size, size, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    for size in (16, 32, 48, 128):
        pixels = make_icon(size)
        out_path = os.path.join(OUT_DIR, f"icon{size}.png")
        write_png(out_path, pixels)
        print(f"wrote {out_path}")
