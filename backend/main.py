"""
VDL — FastAPI backend
Порт: 8765
Все взаимодействия UI → Python идут через этот сервер.
"""
import sys
import os
import asyncio
import json
import uuid
from contextlib import asynccontextmanager
from datetime import datetime

# Абсолютные пути — не зависят от рабочей папки, из которой запущен backend.
# Без этого settings.json и база читались/писались в разных местах.
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SETTINGS_PATH = os.path.join(PROJECT_ROOT, 'settings.json')

sys.path.insert(0, PROJECT_ROOT)

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from database.db import init_db, SessionLocal, Download, SavedLink
from backend.downloader import get_video_info, download_video, DEFAULT_DOWNLOAD_DIR
from backend.converter import convert_file
from backend.updater import check_for_updates, update_ytdlp

# ─── Хранилище прогресса активных задач ─────────────────────────────────────
active_tasks: dict[str, dict] = {}   # task_id → {percent, speed, eta, status, ...}


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title='VDL API', version='1.0.0', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    # Разрешаем любой источник: фронтенд может приходить с localhost:5173,
    # 127.0.0.1:5173 (под VPN) или file:// (в собранном приложении).
    # Это локальное десктоп-приложение, внешних клиентов нет — безопасно.
    allow_origins=['*'],
    allow_origin_regex='.*',
    allow_methods=['*'],
    allow_headers=['*'],
)


# ══════════════════════════════════════════════════════════════════════════════
#  АНАЛИЗ URL
# ══════════════════════════════════════════════════════════════════════════════

class AnalyzeRequest(BaseModel):
    url: str

@app.post('/api/analyze')
async def analyze_url(req: AnalyzeRequest):
    """Анализирует URL и возвращает метаданные видео"""
    try:
        info = await asyncio.to_thread(get_video_info, req.url)
        return {'success': True, 'data': info}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ══════════════════════════════════════════════════════════════════════════════
#  СКАЧИВАНИЕ
# ══════════════════════════════════════════════════════════════════════════════

class DownloadRequest(BaseModel):
    url:          str
    quality:      str = '1080p'
    format:       str = 'mp4'
    download_dir: str = DEFAULT_DOWNLOAD_DIR

@app.get('/api/check-folder')
def check_folder():
    """
    Проверяет, существует ли папка загрузок из настроек.
    Возвращает {exists: bool, path: str}.
    """
    try:
        path = get_settings().get('download_dir', DEFAULT_DOWNLOAD_DIR)
    except Exception:
        path = DEFAULT_DOWNLOAD_DIR
    return {'exists': bool(path) and os.path.isdir(path), 'path': path}

@app.post('/api/download/start')
async def start_download(req: DownloadRequest, background_tasks: BackgroundTasks):
    """Запускает скачивание в фоне, возвращает task_id"""
    task_id = str(uuid.uuid4())
    active_tasks[task_id] = {
        'status': 'pending', 'percent': 0,
        'speed': '', 'eta': '', 'error': ''
    }
    background_tasks.add_task(_run_download, task_id, req)
    return {'task_id': task_id}

async def _run_download(task_id: str, req: DownloadRequest):
    active_tasks[task_id]['status'] = 'downloading'

    def on_progress(percent, speed, eta):
        active_tasks[task_id].update(
            {'percent': round(percent, 1), 'speed': speed, 'eta': eta}
        )

    # Если папка не задана фронтендом — берём из настроек, иначе по умолчанию
    download_dir = (req.download_dir or '').strip()
    if not download_dir:
        try:
            download_dir = get_settings().get('download_dir', DEFAULT_DOWNLOAD_DIR)
        except Exception:
            download_dir = DEFAULT_DOWNLOAD_DIR
    if not download_dir:
        download_dir = DEFAULT_DOWNLOAD_DIR

    try:
        result = await asyncio.to_thread(
            download_video, req.url, req.quality, req.format,
            download_dir, on_progress
        )
        active_tasks[task_id].update({'status': 'done', 'percent': 100, **result})

        # Сохраняем в историю
        db = SessionLocal()
        try:
            dl = Download(
                url=req.url, title=result.get('title',''),
                platform=result.get('platform',''), thumbnail=result.get('thumbnail',''),
                quality=req.quality, format=req.format,
                file_path=result.get('file_path',''), file_size=result.get('file_size',0),
                duration=result.get('duration',0), status='done',
            )
            db.add(dl); db.commit()
            active_tasks[task_id]['db_id'] = dl.id
            print(f'[DB] Сохранено в историю: {dl.title} (id={dl.id})')
        except Exception as db_err:
            print(f'[DB ERROR] Не удалось сохранить в историю: {db_err}')
        finally:
            db.close()

    except Exception as e:
        active_tasks[task_id].update({'status': 'error', 'error': str(e)})

@app.get('/api/download/progress/{task_id}')
async def download_progress(task_id: str):
    """SSE-стрим прогресса скачивания"""
    async def event_stream():
        while True:
            task = active_tasks.get(task_id)
            if not task:
                yield f'data: {json.dumps({"error":"task not found"})}\n\n'
                break
            yield f'data: {json.dumps(task)}\n\n'
            if task['status'] in ('done', 'error'):
                break
            await asyncio.sleep(0.5)

    return StreamingResponse(event_stream(), media_type='text/event-stream')


# ══════════════════════════════════════════════════════════════════════════════
#  ИСТОРИЯ
# ══════════════════════════════════════════════════════════════════════════════

@app.get('/api/history')
def get_history(limit: int = 50, offset: int = 0):
    db = SessionLocal()
    try:
        items = db.query(Download).order_by(Download.created_at.desc()).offset(offset).limit(limit).all()
        return {'items': [_dl_to_dict(i) for i in items]}
    finally:
        db.close()

@app.delete('/api/history/{item_id}')
def delete_history_item(item_id: int):
    db = SessionLocal()
    try:
        item = db.query(Download).filter(Download.id == item_id).first()
        if not item: raise HTTPException(404, 'Не найдено')
        db.delete(item); db.commit()
        return {'success': True}
    finally:
        db.close()

@app.delete('/api/history')
def clear_history():
    db = SessionLocal()
    try:
        db.query(Download).delete(); db.commit()
        return {'success': True}
    finally:
        db.close()


# ══════════════════════════════════════════════════════════════════════════════
#  СОХРАНЁННЫЕ ССЫЛКИ
# ══════════════════════════════════════════════════════════════════════════════

class SaveLinkRequest(BaseModel):
    url: str

@app.post('/api/saved')
async def save_link(req: SaveLinkRequest):
    """Сохраняет ссылку, параллельно анализирует метаданные"""
    try:
        info = await asyncio.to_thread(get_video_info, req.url)
    except Exception:
        info = {}

    db = SessionLocal()
    try:
        link = SavedLink(
            url=req.url, title=info.get('title',''),
            platform=info.get('platform',''), thumbnail=info.get('thumbnail',''),
            available_qualities=','.join(info.get('qualities',[])),
        )
        db.add(link); db.commit(); db.refresh(link)
        return {'success': True, 'item': _saved_to_dict(link)}
    finally:
        db.close()

@app.get('/api/saved')
def get_saved():
    db = SessionLocal()
    try:
        items = db.query(SavedLink).order_by(SavedLink.created_at.desc()).all()
        return {'items': [_saved_to_dict(i) for i in items]}
    finally:
        db.close()

@app.delete('/api/saved/{item_id}')
def delete_saved(item_id: int):
    db = SessionLocal()
    try:
        item = db.query(SavedLink).filter(SavedLink.id == item_id).first()
        if not item: raise HTTPException(404, 'Не найдено')
        db.delete(item); db.commit()
        return {'success': True}
    finally:
        db.close()


# ══════════════════════════════════════════════════════════════════════════════
#  КОНВЕРТЕР
# ══════════════════════════════════════════════════════════════════════════════

class ConvertRequest(BaseModel):
    input_path:    str
    output_format: str
    mode:          str = 'video'   # 'video' | 'audio'
    output_dir:    str = ''

@app.post('/api/convert/start')
async def start_convert(req: ConvertRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    active_tasks[task_id] = {'status': 'converting', 'percent': 0, 'error': ''}
    background_tasks.add_task(_run_convert, task_id, req)
    return {'task_id': task_id}

async def _run_convert(task_id: str, req: ConvertRequest):
    def on_progress(pct):
        active_tasks[task_id]['percent'] = round(pct, 1)

    # Папка вывода: явная → из настроек → рядом с исходником (запасной вариант)
    out_dir = (req.output_dir or '').strip()
    if not out_dir:
        try:
            out_dir = get_settings().get('download_dir', '')
        except Exception:
            out_dir = ''
    if not out_dir:
        out_dir = os.path.dirname(req.input_path)

    result = await asyncio.to_thread(
        convert_file, req.input_path, req.output_format, req.mode, out_dir, on_progress
    )
    active_tasks[task_id].update({
        'status':      'done' if result['success'] else 'error',
        'percent':     100 if result['success'] else active_tasks[task_id]['percent'],
        'output_path': result.get('output_path',''),
        'error':       result.get('error',''),
    })

@app.get('/api/convert/progress/{task_id}')
async def convert_progress(task_id: str):
    async def event_stream():
        while True:
            task = active_tasks.get(task_id)
            if not task:
                yield f'data: {json.dumps({"error":"task not found"})}\n\n'; break
            yield f'data: {json.dumps(task)}\n\n'
            if task['status'] in ('done','error'): break
            await asyncio.sleep(0.3)
    return StreamingResponse(event_stream(), media_type='text/event-stream')


# ══════════════════════════════════════════════════════════════════════════════
#  НАСТРОЙКИ / ОБНОВЛЕНИЯ
# ══════════════════════════════════════════════════════════════════════════════

@app.get('/api/settings/update-check')
async def check_updates():
    """Проверяет наличие обновлений yt-dlp"""
    result = await asyncio.to_thread(check_for_updates)
    return result

@app.post('/api/settings/update-ytdlp')
async def do_update():
    """Обновляет yt-dlp через pip"""
    result = await asyncio.to_thread(update_ytdlp)
    return result

@app.get('/api/settings')
def get_settings():
    """Возвращает текущие настройки (из файла или defaults)"""
    settings_path = SETTINGS_PATH
    defaults = {
        'download_dir':       DEFAULT_DOWNLOAD_DIR,
        'default_quality':    '1080p',
        'default_format':     'mp4',
        'dark_theme':         True,
        'notifications':      True,
        'auto_check_updates': True,
    }
    if os.path.exists(settings_path):
        with open(settings_path, 'r') as f:
            saved = json.load(f)
        defaults.update(saved)
    return defaults

@app.post('/api/settings')
def save_settings(settings: dict):
    with open(SETTINGS_PATH, 'w', encoding='utf-8') as f:
        json.dump(settings, f, ensure_ascii=False, indent=2)
    print(f'[SETTINGS] Сохранено в {SETTINGS_PATH}, папка загрузок: {settings.get("download_dir")}')
    return {'success': True}


# ══════════════════════════════════════════════════════════════════════════════
#  Helpers
# ══════════════════════════════════════════════════════════════════════════════

def _dl_to_dict(d: Download) -> dict:
    return {
        'id': d.id, 'url': d.url, 'title': d.title,
        'platform': d.platform, 'thumbnail': d.thumbnail,
        'quality': d.quality, 'format': d.format,
        'file_path': d.file_path, 'file_size': d.file_size,
        'duration': d.duration, 'status': d.status,
        'created_at': d.created_at.isoformat() if d.created_at else '',
    }

def _saved_to_dict(s: SavedLink) -> dict:
    return {
        'id': s.id, 'url': s.url, 'title': s.title,
        'platform': s.platform, 'thumbnail': s.thumbnail,
        'available_qualities': s.available_qualities.split(',') if s.available_qualities else [],
        'created_at': s.created_at.isoformat() if s.created_at else '',
    }


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8765, log_level='warning')
