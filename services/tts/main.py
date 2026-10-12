import os
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

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
    result = subprocess.run(["python", "-m", "piper.download_voices", voice, "--data-dir", "/models"], capture_output=True, check=False)
    voice_ready = result.returncode == 0


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
            ["python", "-m", "piper", "--data-dir", "/models", "--model", os.getenv("TTS_VOICE", "en_US-lessac-medium"), "--output_file", str(output)],
            input=text.encode(), capture_output=True, check=False,
        )
        if result.returncode != 0 or not output.exists():
            raise HTTPException(503, "Piper voice model is not available yet")
        return Response(output.read_bytes(), media_type="audio/wav", headers={"content-disposition": "inline; filename=avatar-response.wav"})
    finally:
        if output.exists():
            output.unlink(missing_ok=True)
