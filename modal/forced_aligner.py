"""
Forced Aligner API - Modal Deployment
Uses CTC-Forced-Aligner with MMS model for precise word-level timestamps
Optimized for Portuguese Brazilian

Deploy: modal deploy modal/forced_aligner.py
"""

import modal

# Define the image with all dependencies
image = modal.Image.debian_slim(python_version="3.11").run_commands(
    "apt-get update && apt-get install -y libsndfile1 git ffmpeg"
).pip_install(
    "torch",
    "torchaudio",
    "transformers",
    "librosa",
    "soundfile",
    "fastapi",
    "numpy",
    "git+https://github.com/MahmoudAshraf97/ctc-forced-aligner.git",
)

app = modal.App("aeropod-forced-aligner")

# Cache the model to avoid redownloading
volume = modal.Volume.from_name("aligner-model-cache", create_if_missing=True)


def do_alignment(audio_bytes: bytes, transcript: str, language: str = "por") -> dict:
    """
    Perform forced alignment using CTC aligner
    Based on: https://github.com/MahmoudAshraf97/ctc-forced-aligner
    """
    import io
    import os
    import torch
    import torchaudio
    from ctc_forced_aligner import (
        load_alignment_model,
        generate_emissions,
        get_alignments,
        get_spans,
        preprocess_text,
    )

    os.environ["HF_HOME"] = "/cache/huggingface"
    os.environ["TORCH_HOME"] = "/cache/torch"

    try:
        print(f"[Aligner] Starting alignment for text: {transcript[:50]}...")

        # Load audio from bytes using soundfile (more reliable than torchaudio)
        import soundfile as sf
        audio_buffer = io.BytesIO(audio_bytes)
        audio_data, sr = sf.read(audio_buffer)
        print(f"[Aligner] Loaded audio: shape={audio_data.shape}, sr={sr}")

        # Convert to torch tensor
        waveform = torch.from_numpy(audio_data).float()
        # If stereo, convert to mono by averaging channels
        if len(waveform.shape) > 1:
            waveform = waveform.mean(dim=1)
        # Ensure 2D tensor [channels, samples]
        if len(waveform.shape) == 1:
            waveform = waveform.unsqueeze(0)

        # Resample to 16kHz if needed
        if sr != 16000:
            resampler = torchaudio.transforms.Resample(sr, 16000)
            waveform = resampler(waveform)
            sr = 16000

        # Convert to mono if stereo
        if waveform.shape[0] > 1:
            waveform = torch.mean(waveform, dim=0, keepdim=True)

        # Flatten to 1D tensor as expected by the model
        audio_waveform = waveform.squeeze()
        print(f"[Aligner] Preprocessed audio: shape={audio_waveform.shape}")

        # Load alignment model
        device = "cpu"
        alignment_model, alignment_tokenizer = load_alignment_model(
            device,
            dtype=torch.float32,
        )
        print("[Aligner] Model loaded")

        # Generate emissions - audio must be 1D
        emissions, stride = generate_emissions(
            alignment_model,
            audio_waveform,
            batch_size=1,
        )
        print(f"[Aligner] Emissions generated: shape={emissions.shape}, stride={stride}")

        # Get word-level tokens
        tokens_starred, text_starred = preprocess_text(
            transcript,
            romanize=True,
            language=language,
        )
        print(f"[Aligner] Tokens: {tokens_starred[:10]}...")

        # Get alignments - returns 3 values now
        segments, scores, blank_token = get_alignments(
            emissions,
            tokens_starred,
            alignment_tokenizer,
        )
        print(f"[Aligner] Alignments: {len(segments)} segments")

        # Get word spans - returns list of lists of Segment objects
        # Each span is a list of Segment objects representing a word
        spans = get_spans(tokens_starred, segments, blank_token)
        print(f"[Aligner] Spans: {len(spans)}")

        # Format results - calculate actual timestamps using stride
        word_timestamps = []
        words = transcript.split()
        time_offset = stride / sr  # Time per frame

        for i, span in enumerate(spans):
            if i < len(words) and len(span) > 0:
                # span is a list of Segment objects
                # Get the first segment's start and last segment's end
                first_segment = span[0]
                last_segment = span[-1]

                # Access .start and .end attributes from Segment dataclass
                start_frame = first_segment.start
                end_frame = last_segment.end

                # Convert frame indices to seconds
                start_time = float(start_frame) * time_offset
                end_time = float(end_frame) * time_offset

                word_timestamps.append({
                    "word": words[i],
                    "start": round(start_time, 3),
                    "end": round(end_time, 3),
                    "score": 1.0,  # CTC doesn't provide per-word scores
                })

        print(f"[Aligner] Result: {len(word_timestamps)} word timestamps")
        return {
            "success": True,
            "word_timestamps": word_timestamps,
            "language": language,
            "duration": float(audio_waveform.shape[0]) / sr,
        }

    except Exception as e:
        import traceback
        print(f"[Aligner] Error: {e}")
        print(traceback.format_exc())
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
            "word_timestamps": [],
        }


# HTTP endpoint for forced alignment
@app.function(
    image=image,
    volumes={"/cache": volume},
    cpu=1,
    memory=4096,  # Increased for model loading
    scaledown_window=2,
    timeout=300,
)
@modal.fastapi_endpoint(method="POST")
def align(request: dict) -> dict:
    """
    HTTP endpoint for forced alignment

    POST body:
    {
        "audio_url": "https://...",  // URL to audio file
        "transcript": "text to align",
        "language": "por"  // optional, defaults to Portuguese
    }

    OR

    {
        "audio_base64": "...",  // Base64 encoded audio
        "transcript": "text to align",
        "language": "por"
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
            with urllib.request.urlopen(req, timeout=30) as response:
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

    transcript = request.get("transcript", "")
    language = request.get("language", "por")

    if not transcript.strip():
        return {"success": False, "error": "Transcript is empty"}

    return do_alignment(audio_bytes, transcript, language)


# Endpoint for aligning Whisper segments
@app.function(
    image=image,
    volumes={"/cache": volume},
    cpu=1,
    memory=4096,
    scaledown_window=2,
    timeout=600,
)
@modal.fastapi_endpoint(method="POST")
def align_segments(request: dict) -> dict:
    """
    Align Whisper segments with precise word timestamps

    POST body:
    {
        "audio_url": "https://...",
        "segments": [
            {"start": 0.0, "end": 5.0, "text": "Hello world"},
            ...
        ],
        "language": "por"
    }
    """
    import base64
    import io
    import urllib.request

    # Get audio bytes
    if "audio_url" in request:
        try:
            req = urllib.request.Request(
                request["audio_url"],
                headers={"User-Agent": "Mozilla/5.0"}
            )
            with urllib.request.urlopen(req, timeout=60) as response:
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

    segments = request.get("segments", [])
    language = request.get("language", "por")

    if not segments:
        return {"success": False, "error": "No segments provided"}

    try:
        import soundfile as sf
        import numpy as np

        # Load full audio using soundfile (more reliable)
        audio_buffer = io.BytesIO(audio_bytes)
        audio_data, sr = sf.read(audio_buffer)
        print(f"[Aligner] Loaded full audio: shape={audio_data.shape}, sr={sr}")

        # Convert to mono if stereo
        if len(audio_data.shape) > 1:
            audio_data = audio_data.mean(axis=1)

        # Resample to 16kHz if needed
        if sr != 16000:
            import torchaudio
            import torch
            waveform = torch.from_numpy(audio_data).float().unsqueeze(0)
            resampler = torchaudio.transforms.Resample(sr, 16000)
            waveform = resampler(waveform)
            audio_data = waveform.squeeze().numpy()
            sr = 16000

        results = []

        for segment in segments:
            # Extract segment audio
            start_sample = int(segment["start"] * sr)
            end_sample = int(segment["end"] * sr)
            segment_audio = audio_data[start_sample:end_sample]

            # Save segment to buffer using soundfile
            segment_buffer = io.BytesIO()
            sf.write(segment_buffer, segment_audio, sr, format='WAV')
            segment_buffer.seek(0)
            segment_bytes = segment_buffer.read()

            # Align segment
            alignment = do_alignment(
                audio_bytes=segment_bytes,
                transcript=segment.get("text", ""),
                language=language,
            )

            if alignment["success"]:
                # Adjust timestamps to absolute position
                word_timestamps = []
                for wt in alignment["word_timestamps"]:
                    word_timestamps.append({
                        "word": wt["word"],
                        "start": round(segment["start"] + wt["start"], 3),
                        "end": round(segment["start"] + wt["end"], 3),
                        "score": wt.get("score", 1.0),
                    })

                results.append({
                    **segment,
                    "word_timestamps": word_timestamps,
                })
            else:
                results.append({
                    **segment,
                    "word_timestamps": [],
                    "alignment_error": alignment.get("error"),
                })

        return {"success": True, "segments": results}

    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
        }


# Health check endpoint
@app.function(image=image, scaledown_window=2)
@modal.fastapi_endpoint(method="GET")
def health() -> dict:
    """Health check"""
    return {"status": "ok", "service": "aeropod-forced-aligner"}
