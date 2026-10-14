#!/usr/bin/env python3
"""Write stable Unity .meta files and pack a UPM tarball (package/ at its root)."""
import argparse
import json
import tarfile
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "unity/Packages/com.cimavilla.costa-verde"


def metadata(path):
    relative = path.relative_to(PACKAGE).as_posix()
    guid = uuid.uuid5(uuid.NAMESPACE_URL, "cimavilla/costa-verde/" + relative).hex
    head = f"fileFormatVersion: 2\nguid: {guid}\n"
    if path.is_dir():
        return head + "folderAsset: yes\nDefaultImporter:\n  externalObjects: {}\n  userData:\n  assetBundleName:\n  assetBundleVariant:\n"
    suffix = path.suffix.lower()
    if suffix in [".png", ".jpg"]:
        return head + """TextureImporter:
  internalIDToNameTable: []
  externalObjects: {}
  serializedVersion: 12
  mipmaps:
    mipMapMode: 0
    enableMipMap: 0
    sRGBTexture: 1
  isReadable: 0
  maxTextureSize: 2048
  textureSettings:
    serializedVersion: 2
    filterMode: 1
    aniso: 1
    mipBias: 0
    wrapU: 1
    wrapV: 1
    wrapW: 1
  nPOTScale: 0
  textureType: 0
  textureShape: 1
  alphaSource: 1
  alphaIsTransparency: 1
  platformSettings:
  - serializedVersion: 3
    buildTarget: DefaultTexturePlatform
    maxTextureSize: 2048
    textureFormat: -1
    textureCompression: 0
    compressionQuality: 100
    crunchedCompression: 0
    allowsAlphaSplitting: 0
    overridden: 0
  userData:
  assetBundleName:
  assetBundleVariant:
"""
    if suffix == ".wav":
        return head + """AudioImporter:
  externalObjects: {}
  serializedVersion: 7
  defaultSettings:
    serializedVersion: 2
    loadType: 0
    sampleRateSetting: 0
    sampleRateOverride: 44100
    compressionFormat: 0
    quality: 1
    conversionMode: 0
  platformSettingOverrides: {}
  forceToMono: 1
  normalize: 0
  preloadAudioData: 1
  loadInBackground: 0
  ambisonic: 0
  userData:
  assetBundleName:
  assetBundleVariant:
"""
    if suffix == ".cs":
        return head + """MonoImporter:
  externalObjects: {}
  serializedVersion: 2
  defaultReferences: []
  executionOrder: 0
  icon: {instanceID: 0}
  userData:
  assetBundleName:
  assetBundleVariant:
"""
    if suffix == ".ttf":
        return head + """TrueTypeFontImporter:
  externalObjects: {}
  serializedVersion: 4
  fontSize: 16
  forceTextureCase: -2
  characterSpacing: 0
  characterPadding: 1
  includeFontData: 1
  use2xBehaviour: 0
  fontNames: []
  fallbackFontReferences: []
  customCharacters:
  fontRenderingMode: 0
  ascentCalculationMode: 1
  userData:
  assetBundleName:
  assetBundleVariant:
"""
    importer = {".asmdef": "AssemblyDefinitionImporter", ".shader": "ShaderImporter",
                ".json": "TextScriptImporter", ".md": "TextScriptImporter", ".txt": "TextScriptImporter"}.get(suffix, "DefaultImporter")
    return head + f"{importer}:\n  externalObjects: {{}}\n  userData:\n  assetBundleName:\n  assetBundleVariant:\n"


def run(output):
    paths = sorted(p for p in PACKAGE.rglob("*") if p.suffix != ".meta")
    for path in paths:
        if path.is_dir() and not any(p.is_file() and p.suffix != ".meta" for p in path.rglob("*")):
            Path(str(path)+".meta").unlink(missing_ok=True)
            continue
        Path(str(path) + ".meta").write_text(metadata(path))
    if output:
        out = Path(output); out.parent.mkdir(parents=True, exist_ok=True)
        with tarfile.open(out, "w:gz") as tar:
            for path in sorted(PACKAGE.rglob("*")):
                if path.is_file():
                    tar.add(path, "package/" + path.relative_to(PACKAGE).as_posix(), recursive=False)
        with tarfile.open(out) as tar:
            manifest = json.load(tar.extractfile("package/package.json"))
            assert manifest["name"] == "com.cimavilla.costa-verde"
        print(f"UPM {manifest['version']}: {out} ({out.stat().st_size:,} bytes)")
    print(f"Stable metadata for {len(list(PACKAGE.rglob('*.meta')))} files/folders.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", help="Optional .tgz path")
    run(parser.parse_args().output)
