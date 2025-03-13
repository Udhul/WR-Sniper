# -*- mode: python ; coding: utf-8 -*-

# pyinstaller --clean pdf_converter.spec


block_cipher = None

a = Analysis(
    ['pdf_converter.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=['fitz'],  # Only include PyMuPDF/fitz
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['PIL', 'numpy', 'pandas', 'matplotlib', 'scipy', 'tkinter', 'PySide2', 'PyQt5'],  # Exclude unnecessary large packages
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='pdf_converter',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
