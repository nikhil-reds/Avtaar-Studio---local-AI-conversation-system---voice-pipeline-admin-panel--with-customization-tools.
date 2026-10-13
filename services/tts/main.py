import os
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from piper.download import ensure_voice_exists, find_voice, get_voices

app = FastAPI(title="Avatar Studio local TTS")
voice_ready = False


class SpeechRequest(BaseModel):
    text: str


@app.get("/health")
def health():
    return {"available": voice_ready, "provider": "piper", "voice": os.getenv("TTS_VOICE", "en_US-lessac-medium")}


@app.on_event("startup")
def load_voice():
    global voice_ready
    voice = os.getenv("TTS_VOICE", "en_US-lessac-medium")
    try:
        data_dir = Path("/models")
        ensure_voice_exists(voice, [data_dir], data_dir, get_voices(data_dir))
        find_voice(voice, [data_dir])
        voice_ready = True
    except Exception:
        voice_ready = False


@app.post("/synthesize")
def synthesize(request: SpeechRequest):
    text = request.text.strip()
    if not text or len(text) > 4000:
        raise HTTPException(400, "text must contain 1-4000 characters")
    if not voice_ready:
        raise HTTPException(503, "Piper voice model is still downloading or unavailable")
    output = Path(tempfile.mkstemp(suffix=".wav")[1])
    try:
        result = subprocess.run(
            ["python", "-m", "piper", "--model", str(Path("/models") / f"{os.getenv('TTS_VOICE', 'en_US-lessac-medium')}.onnx"), "--output_file", str(output)],
            input=text.encode(), capture_output=True, check=False,
        )
        if result.returncode != 0 or not output.exists():
            raise HTTPException(503, "Piper voice model is not available yet")
        return Response(output.read_bytes(), media_type="audio/wav", headers={"content-disposition": "inline; filename=avatar-response.wav"})
    finally:
        if output.exists():
            output.unlink(missing_ok=True)
