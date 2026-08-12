"""Download ControlNet Canny fp16 safetensors from hf-mirror (OpenSSL, no Schannel)."""
import urllib.request
import ssl
import os
import sys

URL = "https://huggingface.co/comfyanonymous/ControlNet-v1-1_fp16_safetensors/resolve/main/control_v11p_sd15_canny_fp16.safetensors"
DEST = r"D:\king2046\tools\comfyui\models\controlnet\control_v11p_sd15_canny_fp16.safetensors"


def main():
    os.makedirs(os.path.dirname(DEST), exist_ok=True)
    ctx = ssl.create_default_context()
    req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"})
    print("downloading controlnet canny fp16 ...")
    total = 0
    with urllib.request.urlopen(req, timeout=300, context=ctx) as resp, open(DEST, "wb") as f:
        while True:
            chunk = resp.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
            total += len(chunk)
            print(f"\r{total / 1e6:.0f} MB", end="", flush=True)
    print("\ndone:", round(os.path.getsize(DEST) / 1e6, 1), "MB")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("\nERROR:", e)
        sys.exit(1)
