import os
import tempfile
import wave
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from faster_whisper import WhisperModel

app = FastAPI(title="Avatar Studio local STT")
model = None


def get_model():
    global model
    if model is None:
        model = WhisperModel(
            os.getenv("STT_MODEL", "base.en"),
            device=os.getenv("STT_DEVICE", "cpu"),
            compute_type=os.getenv("STT_COMPUTE_TYPE", "int8"),
            download_root="/models",
        )
    return model


@app.get("/health")
def health():
    return {"available": True, "provider": "faster-whisper", "model": os.getenv("STT_MODEL", "base.en")}


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...), sample_rate: int = 16000):
    if sample_rate < 8000 or sample_rate > 48000:
        raise HTTPException(400, "sample_rate must be between 8000 and 48000")
    raw = await audio.read()
    if not raw or len(raw) % 2:
        raise HTTPException(400, "audio must contain 16-bit PCM samples")
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as handle:
        path = Path(handle.name)
    try:
        with wave.open(str(path), "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(sample_rate)
            wav.writeframes(raw)
        segments, _ = get_model().transcribe(str(path), beam_size=5, vad_filter=True)
        text = " ".join(segment.text.strip() for segment in segments).strip()
        return {"text": text, "sample_rate": sample_rate}
    finally:
        path.unlink(missing_ok=True)
