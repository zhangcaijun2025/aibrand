"""Download Realistic Vision V6.0 B1 (no VAE) checkpoint from HuggingFace."""
import urllib.request
import ssl
import os
import sys

URL = "https://huggingface.co/SG161222/Realistic_Vision_V6.0_B1_noVAE/resolve/main/Realistic_Vision_V6.0_NV_B1_fp16.safetensors"
DEST = r"D:\king2046\tools\comfyui\models\checkpoints\Realistic_Vision_V6.0_NV_B1_fp16.safetensors"


def main():
    os.makedirs(os.path.dirname(DEST), exist_ok=True)
    ctx = ssl.create_default_context()
    existing = os.path.getsize(DEST) if os.path.exists(DEST) else 0
    headers = {"User-Agent": "Mozilla/5.0"}
    if existing:
        headers["Range"] = f"bytes={existing}-"
    req = urllib.request.Request(URL, headers=headers)
    mode = "ab" if existing else "wb"
    print(f"downloading Realistic Vision V6.0 ... resume from {existing / 1e6:.0f} MB")
    total = 0
    with urllib.request.urlopen(req, timeout=300, context=ctx) as resp, open(DEST, mode) as f:
        while True:
            chunk = resp.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
            total += len(chunk)
            print(f"\r{existing / 1e6 + total / 1e6:.0f} MB", end="", flush=True)
    print("\ndone:", round(os.path.getsize(DEST) / 1e6, 1), "MB")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("\nERROR:", e)
        sys.exit(1)
