"""
Runtime-хук для PyInstaller.
Выполняется ДО основного кода при запуске exe.
Форсирует UTF-8, чтобы кириллические пути к папкам не ломались на Windows.
"""
import sys
import os

os.environ['PYTHONUTF8'] = '1'
os.environ['PYTHONIOENCODING'] = 'utf-8'

try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass
