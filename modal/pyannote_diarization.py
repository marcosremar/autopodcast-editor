"""
Pyannote Speaker Diarization API - Modal Deployment
State-of-the-art speaker diarization using pyannote.audio
Based on: https://github.com/pyannote/pyannote-audio

Deploy: modal deploy modal/pyannote_diarization.py

Requires HuggingFace token with access to:
- pyannote/speaker-diarization-3.1
- pyannote/segmentation-3.0

Accept the user agreements at:
- https://huggingface.co/pyannote/speaker-diarization-3.1
- https://huggingface.co/pyannote/segmentation-3.0
"""

import modal

# Define the image with all dependencies
image = modal.Image.debian_slim(python_version="3.10").run_commands(
    "apt-get update && apt-get install -y libsndfile1 ffmpeg"
).pip_install(
    "torch==2.1.0",
    "torchaudio==2.1.0",
    "pyannote.audio==3.1.1",
    "librosa",
    "soundfile",
    "fastapi",
    "numpy<2",
    # Pin huggingface_hub to version compatible with pyannote
    "huggingface_hub==0.23.4",
).env({
    "HF_HOME": "/cache/huggingface",
    "TORCH_HOME": "/cache/torch",
    # HF_TOKEN is set via Modal secrets - run: modal secret create hf-secret HF_TOKEN=your_token
})

app = modal.App("aeropod-pyannote-diarization")

# Cache the model to avoid redownloading
volume = modal.Volume.from_name("pyannote-cache", create_if_missing=True)

# Model ID on HuggingFace
MODEL_ID = "pyannote/speaker-diarization-3.1"


def do_diarization(audio_bytes: bytes, num_speakers: int = None, min_speakers: int = None, max_speakers: int = None) -> dict:
    """
    Perform speaker diarization using pyannote.audio

    Args:
        audio_bytes: Audio file bytes
        num_speakers: Exact number of speakers (if known)
        min_speakers: Minimum number of speakers
        max_speakers: Maximum number of speakers

    Returns:
        Dictionary with speaker segments and timeline
    """
    import io
    import os
    import torch
    import soundfile as sf
    import numpy as np

    os.environ["HF_HOME"] = "/cache/huggingface"
    os.environ["TORCH_HOME"] = "/cache/torch"

    try:
        from pyannote.audio import Pipeline
        import tempfile

        print(f"[Pyannote] Starting diarization...")

        # Save audio to temp file (pyannote needs a file path)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            temp_path = f.name

            # Load and convert audio to WAV
            audio_buffer = io.BytesIO(audio_bytes)
            audio_data, sr = sf.read(audio_buffer)

            # Convert to mono if stereo
            if len(audio_data.shape) > 1:
                audio_data = audio_data.mean(axis=1)

            # Resample to 16kHz if needed
            if sr != 16000:
                import librosa
                audio_data = librosa.resample(audio_data, orig_sr=sr, target_sr=16000)
                sr = 16000

            # Write to temp file
            sf.write(temp_path, audio_data, sr)

        duration = len(audio_data) / sr
        print(f"[Pyannote] Audio duration: {duration:.2f}s")

        # Setup device
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[Pyannote] Using device: {device}")

        # Load pipeline
        hf_token = os.environ.get("HF_TOKEN")
        pipeline = Pipeline.from_pretrained(
            MODEL_ID,
            use_auth_token=hf_token,
            cache_dir="/cache/huggingface",
        )
        pipeline.to(device)

        print("[Pyannote] Model loaded, running diarization...")

        # Run diarization with optional speaker hints
        diarization_params = {}
        if num_speakers is not None:
            diarization_params["num_speakers"] = num_speakers
        if min_speakers is not None:
            diarization_params["min_speakers"] = min_speakers
        if max_speakers is not None:
            diarization_params["max_speakers"] = max_speakers

        diarization = pipeline(temp_path, **diarization_params)

        # Clean up temp file
        os.unlink(temp_path)

        # Parse diarization output
        segments = []
        speakers = set()

        for turn, _, speaker in diarization.itertracks(yield_label=True):
            speakers.add(speaker)
            segments.append({
                "speaker": speaker,
                "start": round(turn.start, 3),
                "end": round(turn.end, 3),
                "duration": round(turn.end - turn.start, 3),
            })

        # Sort segments by start time
        segments.sort(key=lambda x: x["start"])

        # Create speaker timeline (merge consecutive segments from same speaker)
        timeline = []
        current = None

        for seg in segments:
            if current is None:
                current = seg.copy()
            elif current["speaker"] == seg["speaker"] and seg["start"] - current["end"] < 0.5:
                # Merge if same speaker and gap < 0.5s
                current["end"] = seg["end"]
                current["duration"] = round(current["end"] - current["start"], 3)
            else:
                timeline.append(current)
                current = seg.copy()

        if current:
            timeline.append(current)

        # Calculate speaker statistics
        speaker_stats = {}
        for speaker in speakers:
            speaker_segments = [s for s in segments if s["speaker"] == speaker]
            total_time = sum(s["duration"] for s in speaker_segments)
            speaker_stats[speaker] = {
                "total_time": round(total_time, 2),
                "percentage": round(total_time / duration * 100, 1),
                "segments_count": len(speaker_segments),
            }

        print(f"[Pyannote] Diarization complete: {len(speakers)} speakers, {len(segments)} segments")

        return {
            "success": True,
            "speakers": list(speakers),
            "num_speakers": len(speakers),
            "segments": segments,
            "timeline": timeline,
            "speaker_stats": speaker_stats,
            "duration": round(duration, 2),
        }

    except Exception as e:
        import traceback
        print(f"[Pyannote] Error: {e}")
        print(traceback.format_exc())
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
        }


# HTTP endpoint for diarization
@app.function(
    image=image,
    volumes={"/cache": volume},
    gpu="T4",  # T4 is cost-effective
    memory=8192,
    timeout=900,  # 15 minutes for long podcasts
    scaledown_window=120,  # Keep warm for 2 minutes
)
@modal.fastapi_endpoint(method="POST")
def diarize(request: dict) -> dict:
    """
    HTTP endpoint for speaker diarization

    POST body:
    {
        "audio_url": "https://...",  // URL to audio file
        "num_speakers": 2,  // optional: exact number of speakers
        "min_speakers": 1,  // optional: minimum speakers
        "max_speakers": 5   // optional: maximum speakers
    }

    OR

    {
        "audio_base64": "...",  // Base64 encoded audio
        "num_speakers": 2
    }

    Returns:
    {
        "success": true,
        "speakers": ["SPEAKER_00", "SPEAKER_01"],
        "num_speakers": 2,
        "segments": [
            {"speaker": "SPEAKER_00", "start": 0.5, "end": 2.3, "duration": 1.8},
            {"speaker": "SPEAKER_01", "start": 2.5, "end": 5.1, "duration": 2.6},
            ...
        ],
        "timeline": [...],  // Merged consecutive segments
        "speaker_stats": {
            "SPEAKER_00": {"total_time": 45.2, "percentage": 60.3, "segments_count": 15},
            "SPEAKER_01": {"total_time": 29.8, "percentage": 39.7, "segments_count": 12}
        },
        "duration": 75.0
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

    # Get optional parameters
    num_speakers = request.get("num_speakers")
    min_speakers = request.get("min_speakers")
    max_speakers = request.get("max_speakers")

    return do_diarization(
        audio_bytes,
        num_speakers=num_speakers,
        min_speakers=min_speakers,
        max_speakers=max_speakers,
    )


# Note: align_with_transcript and health endpoints removed to save Modal endpoint quota
# Alignment can be done client-side using the diarization segments
