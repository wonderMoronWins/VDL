"""
VDL — Updater модуль
Проверяет актуальность yt-dlp через GitHub Releases API.
Обновляет через pip если доступна новая версия.
"""
import subprocess
import sys
import json
import urllib.request
from datetime import datetime

GITHUB_API = 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest'


def get_installed_version() -> str:
    """Возвращает установленную версию yt-dlp"""
    try:
        result = subprocess.run(
            [sys.executable, '-m', 'yt_dlp', '--version'],
            capture_output=True, text=True, timeout=10
        )
        return result.stdout.strip()
    except Exception:
        return 'не установлен'


def get_latest_version() -> dict:
    """
    Запрашивает последнюю версию yt-dlp с GitHub.
    Возвращает {'version': str, 'published_at': str, 'release_notes': str}
    """
    try:
        req = urllib.request.Request(
            GITHUB_API,
            headers={'User-Agent': 'VDL-App/1.0'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())

        published = data.get('published_at', '')
        if published:
            dt = datetime.fromisoformat(published.replace('Z', '+00:00'))
            published = dt.strftime('%d.%m.%Y')

        return {
            'version':       data.get('tag_name', '').lstrip('v'),
            'published_at':  published,
            'release_notes': data.get('body', '')[:300],  # первые 300 символов
            'html_url':      data.get('html_url', ''),
        }
    except Exception as e:
        return {'version': '', 'error': str(e)}


def check_for_updates() -> dict:
    """
    Сравнивает установленную и последнюю версию.
    Возвращает:
      installed_version, latest_version, update_available, published_at
    """
    installed = get_installed_version()
    latest    = get_latest_version()

    if 'error' in latest:
        return {
            'installed_version': installed,
            'latest_version':    '',
            'update_available':  False,
            'error':             latest['error'],
        }

    update_available = (
        installed != 'не установлен'
        and latest['version'] != ''
        and installed != latest['version']
    )

    return {
        'installed_version': installed,
        'latest_version':    latest['version'],
        'update_available':  update_available,
        'published_at':      latest.get('published_at', ''),
        'release_notes':     latest.get('release_notes', ''),
        'html_url':          latest.get('html_url', ''),
    }


def update_ytdlp() -> dict:
    """
    Обновляет yt-dlp через pip.
    Возвращает {'success': bool, 'new_version': str, 'error': str}
    """
    try:
        result = subprocess.run(
            [sys.executable, '-m', 'pip', 'install', '--upgrade', 'yt-dlp'],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            new_version = get_installed_version()
            return {'success': True, 'new_version': new_version, 'error': ''}
        else:
            return {'success': False, 'new_version': '', 'error': result.stderr}
    except subprocess.TimeoutExpired:
        return {'success': False, 'new_version': '', 'error': 'Превышено время ожидания'}
    except Exception as e:
        return {'success': False, 'new_version': '', 'error': str(e)}
