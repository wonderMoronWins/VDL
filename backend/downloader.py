"""
VDL — Downloader модуль
Использует yt-dlp для анализа и скачивания видео.
Прогресс передаётся через callback → SSE в main.py
"""
import os
import sys
import certifi
import yt_dlp

# Указываем Python/yt-dlp путь к корневым сертификатам из certifi.
# Без этого на Windows скачивание с VK, Dzen и др. падает с ошибкой
# [SSL: CERTIFICATE_VERIFY_FAILED] — у системного Python нет CA bundle.
os.environ.setdefault('SSL_CERT_FILE', certifi.where())
os.environ.setdefault('REQUESTS_CA_BUNDLE', certifi.where())

# Папка загрузок по умолчанию
DEFAULT_DOWNLOAD_DIR = os.path.join(os.path.expanduser('~'), 'Downloads', 'VDL')


def get_video_info(url: str) -> dict:
    """
    Анализирует URL и возвращает метаданные без скачивания.
    Возвращает: title, thumbnail, platform, duration, formats
    """
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'skip_download': True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    # Определяем доступные качества
    formats = info.get('formats', [])
    qualities = set()
    for f in formats:
        h = f.get('height')
        if h:
            if h >= 2160: qualities.add('4K')
            elif h >= 1080: qualities.add('1080p')
            elif h >= 720:  qualities.add('720p')
            elif h >= 480:  qualities.add('480p')
            elif h >= 360:  qualities.add('360p')

    return {
        'title':      info.get('title', 'Без названия'),
        'thumbnail':  info.get('thumbnail', ''),
        'platform':   info.get('extractor_key', 'Unknown'),
        'duration':   info.get('duration', 0),
        'uploader':   info.get('uploader', ''),
        'qualities':  sorted(qualities, reverse=True),
        'has_audio':  True,  # yt-dlp всегда умеет извлечь аудио
    }


def download_video(
    url: str,
    quality: str,
    fmt: str,
    download_dir: str,
    progress_callback=None,
) -> dict:
    """
    Скачивает видео с указанным качеством и форматом.
    progress_callback(percent: float, speed: str, eta: str) вызывается в процессе.
    Возвращает dict с путём к файлу и метаданными.
    """
    # Защита от пустого пути — подставляем папку по умолчанию
    if not download_dir or not str(download_dir).strip():
        download_dir = DEFAULT_DOWNLOAD_DIR
    os.makedirs(download_dir, exist_ok=True)

    # Формируем строку формата для yt-dlp
    if fmt.lower() in ('mp3', 'aac', 'flac', 'wav', 'ogg'):
        # Только аудио
        ydl_format = 'bestaudio/best'
        postprocessors = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': fmt.lower(),
            'preferredquality': '192',
        }]
    else:
        # Видео — выбираем нужное разрешение
        height_map = {'4K': 2160, '1080p': 1080, '720p': 720, '480p': 480, '360p': 360}
        height = height_map.get(quality, 1080)
        ydl_format = (
            f'bestvideo[height<={height}][ext=mp4]+bestaudio[ext=m4a]/'
            f'bestvideo[height<={height}]+bestaudio/'
            f'best[height<={height}]/best'
        )
        postprocessors = [{
            'key': 'FFmpegVideoConvertor',
            'preferedformat': fmt.lower(),
        }]

    result = {}

    def progress_hook(d):
        if d['status'] == 'downloading' and progress_callback:
            total   = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
            downloaded = d.get('downloaded_bytes', 0)
            percent = (downloaded / total * 100) if total else 0
            speed   = d.get('_speed_str', '').strip()
            eta     = d.get('_eta_str', '').strip()
            progress_callback(percent, speed, eta)
        elif d['status'] == 'finished':
            result['file_path'] = d.get('filename', '')

    ydl_opts = {
        'format':           ydl_format,
        'outtmpl':          os.path.join(download_dir, '%(title)s.%(ext)s'),
        'postprocessors':   postprocessors,
        'progress_hooks':   [progress_hook],
        'quiet':            True,
        'no_warnings':      True,
        'nocheckcertificate': True,
        'merge_output_format': fmt.lower() if fmt.lower() not in ('mp3','aac','flac','wav','ogg') else None,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        result['title']     = info.get('title', '')
        result['thumbnail'] = info.get('thumbnail', '')
        result['platform']  = info.get('extractor_key', '')
        result['duration']  = info.get('duration', 0)

        # Финальный путь после всех postprocessor'ов (склейка, конвертация).
        # requested_downloads содержит итоговый файл, а не промежуточные дорожки.
        final_path = ''
        reqd = info.get('requested_downloads')
        if reqd and len(reqd) > 0:
            final_path = reqd[0].get('filepath') or reqd[0].get('_filename', '')
        if not final_path:
            # Запасной вариант: строим имя из шаблона и нужного расширения
            base_name = ydl.prepare_filename(info)
            base_name = os.path.splitext(base_name)[0]
            final_path = f"{base_name}.{fmt.lower()}"

    # Корректируем расширение: для видео должен быть нужный формат,
    # отбрасываем промежуточные .m4a / .fdash и т.п.
    if final_path:
        base = os.path.splitext(final_path)[0]
        # Убираем служебные суффиксы yt-dlp вида ".fdash_sep-13"
        base = base.split('.fdash')[0].split('.f')[0] if '.fdash' in base else base
        candidate = f"{base}.{fmt.lower()}"
        if os.path.exists(candidate):
            final_path = candidate
        elif not os.path.exists(final_path):
            # Ищем реальный файл с тем же базовым именем в папке загрузок
            folder = os.path.dirname(final_path)
            stem = os.path.basename(base)
            if os.path.isdir(folder):
                for f in os.listdir(folder):
                    if f.startswith(stem) and f.lower().endswith(f".{fmt.lower()}"):
                        final_path = os.path.join(folder, f)
                        break

    result['file_path'] = final_path
    result['file_size'] = os.path.getsize(final_path) if final_path and os.path.exists(final_path) else 0

    return result
