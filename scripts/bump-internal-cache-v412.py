# -*- coding: utf-8 -*-
"""将内部静态资源缓存升级到 v412，不改固定公开学习链接 v410。"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INTERNAL_VER = "412"


def patch_html(rel: str) -> None:
    path = ROOT / rel
    text = path.read_text(encoding="utf-8")
    text = re.sub(
        r'((?:src|href)="[^"]+)\?v=\d+(\b[^\"]*")',
        rf"\g<1>?v={INTERNAL_VER}\g<2>",
        text,
    )
    path.write_text(text, encoding="utf-8", newline="\n")


def patch_text(rel: str, pattern: str, replacement: str) -> None:
    path = ROOT / rel
    text = path.read_text(encoding="utf-8")
    updated, count = re.subn(pattern, replacement, text, count=1)
    if count != 1:
        raise SystemExit(f"[FAIL] {rel} 未匹配到内部缓存版本")
    path.write_text(updated, encoding="utf-8", newline="\n")


for html in ("index.html", "intro.html", "share.html"):
    patch_html(html)

patch_text(
    "js/share-wechat.js",
    r'const CACHE_VER\s*=\s*"\d+";',
    f'const CACHE_VER = "{INTERNAL_VER}";',
)
patch_text(
    "js/public-url.config.js",
    r'window\.HYOUGA_TTS_CACHE_VER\s*=\s*"\d+";',
    f'window.HYOUGA_TTS_CACHE_VER = "{INTERNAL_VER}";',
)
patch_text(
    "japanese_learning_miniapp/config/h5-url.js",
    r'const CACHE_VER\s*=\s*"\d+";',
    f'const CACHE_VER = "{INTERNAL_VER}";',
)

manifest_path = ROOT / "tts-cache" / "sw-manifest.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
manifest["cacheVer"] = INTERNAL_VER
manifest_path.write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
    newline="\n",
)

print(f"[OK] 内部缓存已升级到 v{INTERNAL_VER}；固定公开链接仍为 v410")
