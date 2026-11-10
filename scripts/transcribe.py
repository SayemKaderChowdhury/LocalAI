import sys
import os
import json
import argparse

def transcribe(audio_path: str, model_size: str = "base"):
    try:
        from faster_whisper import WhisperModel
    except ImportError as e:
        print(json.dumps({"success": False, "error": f"faster-whisper not installed: {str(e)}"}))
        sys.exit(1)

    if not os.path.exists(audio_path):
        print(json.dumps({"success": False, "error": f"Audio file not found: {audio_path}"}))
        sys.exit(1)

    try:
        # Cache models locally in user directory or app data
        cache_dir = os.path.join(os.path.expanduser("~"), ".cache", "localai-whisper")
        os.makedirs(cache_dir, exist_ok=True)

        model = WhisperModel(model_size, device="cpu", compute_type="int8", download_root=cache_dir)
        segments, info = model.transcribe(audio_path, beam_size=5)

        full_text = " ".join([segment.text.strip() for segment in segments]).strip()

        print(json.dumps({
            "success": True,
            "text": full_text,
            "duration": round(info.duration, 2),
            "language": info.language,
            "language_probability": round(info.language_probability, 2)
        }))
    except Exception as ex:
        print(json.dumps({"success": False, "error": str(ex)}))
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LocalAI offline Whisper transcription")
    parser.add_argument("audio_path", help="Path to input audio wav/webm/mp3")
    parser.add_argument("--model", default="base", choices=["tiny", "small", "base"], help="Model size")
    args = parser.parse_args()

    transcribe(args.audio_path, args.model)

