"""
CrisperWhisper API - Modal Deployment
Verbatim transcription with filler word detection using CrisperWhisper
Based on: https://github.com/nyrahealth/CrisperWhisper

Deploy: modal deploy modal/crisper_whisper.py
"""

import modal

# Define the image with all dependencies
# CrisperWhisper requires a custom transformers fork
image = modal.Image.debian_slim(python_version="3.10").run_commands(
    "apt-get update && apt-get install -y libsndfile1 git ffmpeg"
).pip_install(
    "numpy<2",  # Install numpy first with version constraint for compatibility
    "torch==2.0.1",
    "torchaudio==2.0.2",
    "accelerate",
    "librosa",
    "soundfile",
    "fastapi",
    # CrisperWhisper's custom transformers fork
    "git+https://github.com/nyrahealth/transformers.git@crisper_whisper",
).env({
    "HF_HOME": "/cache/huggingface",
    "TORCH_HOME": "/cache/torch",
    # HF_TOKEN is set via Modal secrets - run: modal secret create hf-secret HF_TOKEN=your_token
})

app = modal.App("aeropod-crisper-whisper")

# Cache the model to avoid redownloading
volume = modal.Volume.from_name("crisper-whisper-cache", create_if_missing=True)

# Model ID on HuggingFace
MODEL_ID = "nyrahealth/CrisperWhisper"


def do_transcription(audio_bytes: bytes, language: str = "pt") -> dict:
    """
    Perform verbatim transcription with filler detection using CrisperWhisper
    """
    import io
    import os
    import torch
    import soundfile as sf
    import numpy as np

    os.environ["HF_HOME"] = "/cache/huggingface"
    os.environ["TORCH_HOME"] = "/cache/torch"

    try:
        from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline

        print(f"[CrisperWhisper] Starting transcription...")

        # Load audio from bytes
        audio_buffer = io.BytesIO(audio_bytes)
        audio_data, sr = sf.read(audio_buffer)
        print(f"[CrisperWhisper] Loaded audio: shape={audio_data.shape}, sr={sr}")

        # Convert to mono if stereo
        if len(audio_data.shape) > 1:
            audio_data = audio_data.mean(axis=1)

        # Resample to 16kHz if needed
        if sr != 16000:
            import librosa
            audio_data = librosa.resample(audio_data, orig_sr=sr, target_sr=16000)
            sr = 16000

        # Setup device
        device = "cuda" if torch.cuda.is_available() else "cpu"
        torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

        print(f"[CrisperWhisper] Using device: {device}")

        # Load model and processor with HuggingFace token
        hf_token = os.environ.get("HF_TOKEN")

        model = AutoModelForSpeechSeq2Seq.from_pretrained(
            MODEL_ID,
            torch_dtype=torch_dtype,
            low_cpu_mem_usage=True,
            use_safetensors=True,
            cache_dir="/cache/huggingface",
            token=hf_token,
        )
        model.to(device)

        processor = AutoProcessor.from_pretrained(
            MODEL_ID,
            cache_dir="/cache/huggingface",
            token=hf_token,
        )

        print("[CrisperWhisper] Model loaded")

        # Create pipeline
        pipe = pipeline(
            "automatic-speech-recognition",
            model=model,
            tokenizer=processor.tokenizer,
            feature_extractor=processor.feature_extractor,
            torch_dtype=torch_dtype,
            device=device,
        )

        # Ensure audio is numpy array with correct type and is 1D
        audio_data = np.asarray(audio_data, dtype=np.float32)
        if len(audio_data.shape) > 1:
            audio_data = audio_data.flatten()

        # Ensure audio is contiguous in memory
        audio_data = np.ascontiguousarray(audio_data)

        print(f"[CrisperWhisper] Processed audio: shape={audio_data.shape}, dtype={audio_data.dtype}, duration={len(audio_data)/16000:.2f}s")

        # Transcribe with word-level timestamps
        # Note: CrisperWhisper official code does NOT pass language parameter
        # The model uses automatic language detection from Whisper
        # See: https://github.com/nyrahealth/CrisperWhisper/blob/main/transcribe.py
        result = pipe(
            {"raw": audio_data, "sampling_rate": 16000},
            return_timestamps="word",
        )

        print(f"[CrisperWhisper] Transcription complete: {len(result.get('chunks', []))} chunks")

        # Format output
        segments = []
        word_timestamps = []
        fillers_detected = []

        # Define filler patterns
        filler_patterns = {
            "pt": ["hum", "eh", "ah", "uhm", "uh", "tipo", "ne", "entao", "assim", "quer dizer", "basicamente", "na verdade", "enfim", "aham", "hmm", "eee"],
            "en": ["um", "uh", "uhm", "like", "you know", "basically", "actually", "so", "literally", "right", "i mean", "hmm", "ah"],
        }
        fillers = filler_patterns.get(language, filler_patterns["pt"])

        # Process chunks (word-level)
        if "chunks" in result:
            for chunk in result["chunks"]:
                word = chunk.get("text", "").strip()
                timestamp = chunk.get("timestamp", (0, 0))

                if not word:
                    continue

                start = timestamp[0] if timestamp[0] is not None else 0
                end = timestamp[1] if timestamp[1] is not None else start + 0.1

                word_data = {
                    "word": word,
                    "start": round(start, 3),
                    "end": round(end, 3),
                }

                # Check if it's a filler
                word_lower = word.lower().strip()
                if word_lower in fillers:
                    word_data["is_filler"] = True
                    fillers_detected.append({
                        "word": word,
                        "start": round(start, 3),
                        "end": round(end, 3),
                        "confidence": 0.9,  # CrisperWhisper is good at detecting fillers
                    })

                word_timestamps.append(word_data)

        # Build segments from word timestamps (group by ~30 second chunks)
        current_segment = {"text": "", "start": 0, "end": 0, "words": []}
        segment_duration = 30  # seconds

        for wt in word_timestamps:
            if current_segment["text"] == "":
                current_segment["start"] = wt["start"]

            current_segment["text"] += " " + wt["word"]
            current_segment["end"] = wt["end"]
            current_segment["words"].append(wt)

            # Start new segment after threshold
            if wt["end"] - current_segment["start"] >= segment_duration:
                current_segment["text"] = current_segment["text"].strip()
                segments.append(current_segment)
                current_segment = {"text": "", "start": 0, "end": 0, "words": []}

        # Add last segment
        if current_segment["text"]:
            current_segment["text"] = current_segment["text"].strip()
            segments.append(current_segment)

        return {
            "success": True,
            "text": result.get("text", ""),
            "segments": segments,
            "word_timestamps": word_timestamps,
            "fillers": fillers_detected,
            "filler_count": len(fillers_detected),
            "language": language,
            "duration": float(len(audio_data)) / sr,
        }

    except Exception as e:
        import traceback
        print(f"[CrisperWhisper] Error: {e}")
        print(traceback.format_exc())
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
        }


# HTTP endpoint for transcription
@app.function(
    image=image,
    volumes={"/cache": volume},
    gpu="T4",  # T4 is cost-effective for Whisper
    memory=8192,
    timeout=600,
    scaledown_window=60,  # Keep warm for 1 minute
)
@modal.fastapi_endpoint(method="POST")
def transcribe(request: dict) -> dict:
    """
    HTTP endpoint for verbatim transcription with filler detection

    POST body:
    {
        "audio_url": "https://...",  // URL to audio file
        "language": "pt"  // optional, defaults to Portuguese
    }

    OR

    {
        "audio_base64": "...",  // Base64 encoded audio
        "language": "pt"
    }

    Returns:
    {
        "success": true,
        "text": "full transcription...",
        "segments": [...],
        "word_timestamps": [...],
        "fillers": [
            {"word": "uhm", "start": 1.2, "end": 1.5, "confidence": 0.9},
            ...
        ],
        "filler_count": 15
    }
    """
    import base64
    import urllib.request

    # Get audio bytes
    if "audio_url" in request:
        try:
            req = urllib.request.Request(
                request["audio_url"],
                headers={"User-Agent": "Mozilla/5.0"}
            )
            with urllib.request.urlopen(req, timeout=120) as response:
                audio_bytes = response.read()
        except Exception as e:
            return {"success": False, "error": f"Failed to fetch audio: {str(e)}"}
    elif "audio_base64" in request:
        try:
            audio_bytes = base64.b64decode(request["audio_base64"])
        except Exception as e:
            return {"success": False, "error": f"Failed to decode base64: {str(e)}"}
    else:
        return {"success": False, "error": "Must provide audio_url or audio_base64"}

    language = request.get("language", "pt")

    return do_transcription(audio_bytes, language)


# Health check endpoint
@app.function(image=image, scaledown_window=2)
@modal.fastapi_endpoint(method="GET")
def health() -> dict:
    """Health check"""
    return {"status": "ok", "service": "aeropod-crisper-whisper", "model": MODEL_ID}
