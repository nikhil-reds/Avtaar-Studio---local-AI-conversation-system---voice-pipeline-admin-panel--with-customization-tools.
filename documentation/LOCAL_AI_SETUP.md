# Local AI setup

## Start PostgreSQL and Qwen3 14B

From PowerShell:

```powershell
./scripts/setup-local-ai.ps1
npx prisma migrate deploy
npm run local-ai:health
```

The setup starts:

- PostgreSQL on `127.0.0.1:5432`.
- Ollama on `127.0.0.1:11434`.
- Qwen3 14B in the persistent Ollama volume.

## Speech services

The browser conversation path currently supports local text through Qwen3. Speech-to-text and text-to-speech are optional local executables and are intentionally exposed through configuration:

```env
LOCAL_STT_PROVIDER=faster-whisper
LOCAL_STT_MODEL=base.en
LOCAL_STT_COMMAND=
LOCAL_TTS_PROVIDER=piper
LOCAL_TTS_VOICE=en_US-lessac-medium
LOCAL_TTS_COMMAND=
```

Until those commands are configured, the UI reports STT/TTS as unavailable and text conversation remains usable.

## Windows build fallback

If Turbopack reports a Windows `jsc.baseUrl` permission error, use:

```powershell
npm run build:webpack
```

This uses the standard webpack production builder instead of Turbopack.
