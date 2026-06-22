"""
VDL — Converter модуль
Использует FFmpeg для конвертации видео/аудио файлов.
Прогресс парсится из stderr FFmpeg.
"""
import os
import re
import subprocess


def get_duration_seconds(file_path: str) -> float:
    """Получаем длительность файла через ffprobe"""
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'default=noprint_wrappers=1:nokey=1', file_path],
            capture_output=True, text=True, timeout=15
        )
        return float(result.stdout.strip())
    except Exception:
        return 0.0


def convert_file(
    input_path: str,
    output_format: str,
    mode: str = 'video',          # 'video' | 'audio'
    output_dir: str | None = None,
    progress_callback=None,
) -> dict:
    """
    Конвертирует файл через FFmpeg.
    mode='audio' — извлечь аудио дорожку.
    mode='video' — перекодировать в другой видео формат.
    progress_callback(percent: float) вызывается в процессе.
    Возвращает {'output_path': str, 'success': bool, 'error': str}
    """
    if not os.path.exists(input_path):
        return {'success': False, 'error': f'Файл не найден: {input_path}'}

    base   = os.path.splitext(os.path.basename(input_path))[0]
    out_dir = output_dir or os.path.dirname(input_path)
    os.makedirs(out_dir, exist_ok=True)
    output_path = os.path.join(out_dir, f'{base}_converted.{output_format.lower()}')

    duration = get_duration_seconds(input_path)

    # Строим команду FFmpeg
    cmd = ['ffmpeg', '-y', '-i', input_path]

    if mode == 'audio':
        fmt = output_format.lower()
        if fmt == 'mp3':
            cmd += ['-vn', '-ar', '44100', '-ac', '2', '-b:a', '192k']
        elif fmt == 'aac':
            cmd += ['-vn', '-c:a', 'aac', '-b:a', '192k']
        elif fmt == 'flac':
            cmd += ['-vn', '-c:a', 'flac']
        elif fmt == 'wav':
            cmd += ['-vn', '-c:a', 'pcm_s16le']
        elif fmt == 'ogg':
            cmd += ['-vn', '-c:a', 'libvorbis', '-q:a', '4']
        else:
            cmd += ['-vn']
    else:
        # Видео — копируем потоки если возможно, иначе перекодируем
        fmt = output_format.lower()
        if fmt == 'mp4':
            cmd += ['-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac']
        elif fmt == 'webm':
            cmd += ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '30', '-c:a', 'libopus']
        elif fmt == 'mkv':
            cmd += ['-c:v', 'copy', '-c:a', 'copy']   # просто перепаковываем
        elif fmt == 'avi':
            cmd += ['-c:v', 'libxvid', '-c:a', 'libmp3lame']
        elif fmt == 'mov':
            cmd += ['-c:v', 'libx264', '-c:a', 'aac']
        else:
            cmd += ['-c', 'copy']

    cmd += ['-progress', 'pipe:1', '-nostats', output_path]

    try:
        proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, bufsize=1
        )
        # Парсим прогресс из stdout (формат ffmpeg -progress)
        for line in proc.stdout:
            line = line.strip()
            if line.startswith('out_time_ms=') and duration > 0 and progress_callback:
                try:
                    ms      = int(line.split('=')[1])
                    elapsed = ms / 1_000_000
                    pct     = min(elapsed / duration * 100, 99.0)
                    progress_callback(pct)
                except ValueError:
                    pass
            elif line == 'progress=end' and progress_callback:
                progress_callback(100.0)

        proc.wait()

        if proc.returncode != 0:
            err = proc.stderr.read()
            return {'success': False, 'error': err, 'output_path': ''}

        return {
            'success':     True,
            'output_path': output_path,
            'file_size':   os.path.getsize(output_path),
            'error':       '',
        }
    except FileNotFoundError:
        return {'success': False, 'error': 'FFmpeg не найден. Установите FFmpeg.', 'output_path': ''}
    except Exception as e:
        return {'success': False, 'error': str(e), 'output_path': ''}
