"""
VDL — определение папки для данных (база, настройки).
Работает одинаково и при обычном запуске (python main.py),
и в собранном PyInstaller exe.
"""
import os
import sys


def get_app_dir() -> str:
    """
    Возвращает папку, где хранить данные приложения (vdl.db, settings.json).

    - В собранном exe (PyInstaller): папка рядом с самим .exe,
      НЕ временная _MEIxxxx (она удаляется при закрытии).
    - При обычном запуске: корень проекта (на уровень выше backend/).
    """
    if getattr(sys, 'frozen', False):
        # Запущено как PyInstaller exe — берём папку, где лежит exe
        return os.path.dirname(sys.executable)
    else:
        # Обычный запуск — корень проекта
        return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _find_binary(name: str) -> str:
    """
    Ищет бинарник (ffmpeg/ffprobe) в папке bin рядом с приложением.
    Если не найден — возвращает просто имя (системный из PATH).
    name: 'ffmpeg' или 'ffprobe' (без .exe)
    """
    exe_name = name + ('.exe' if sys.platform == 'win32' else '')

    # Кандидаты: bin рядом с exe/проектом, и bin внутри распакованного PyInstaller
    candidates = [
        os.path.join(get_app_dir(), 'bin', exe_name),
        os.path.join(get_app_dir(), exe_name),
    ]
    # В onefile-сборке данные распаковываются в sys._MEIPASS
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        candidates.insert(0, os.path.join(sys._MEIPASS, 'bin', exe_name))

    for path in candidates:
        if os.path.isfile(path):
            return path

    # Не нашли вложенный — пробуем системный из PATH
    return exe_name


def get_ffmpeg() -> str:
    """Путь к ffmpeg (вложенный или системный)."""
    return _find_binary('ffmpeg')


def get_ffprobe() -> str:
    """Путь к ffprobe (вложенный или системный)."""
    return _find_binary('ffprobe')
