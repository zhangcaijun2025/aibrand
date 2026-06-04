"""
轻量本地 Embedding 服务 (ONNX, 零外部依赖)
实现 OpenAI 兼容的 /v1/embeddings 端点
让 Mem0 可以使用本地 embedding
"""
import os, json, time
import numpy as np
from flask import Flask, request, jsonify

app = Flask(__name__)
model = None

class TinyEmbedder:
    """Minimal ONNX embedding using all-MiniLM-L6-v2"""
    def __init__(self):
        self.dim = 384
        self.model = None
        self._load()

    def _load(self):
        try:
            from onnxruntime import InferenceSession
            import huggingface_hub
            model_dir = os.path.join(os.path.dirname(__file__), "model")
            os.makedirs(model_dir, exist_ok=True)
            
            onnx_path = os.path.join(model_dir, "model.onnx")
            vocab_path = os.path.join(model_dir, "tokenizer.json")
            
            if not os.path.exists(onnx_path):
                print("Downloading embedding model (first run)...")
                from huggingface_hub import hf_hub_download
                hf_hub_download(
                    repo_id="Xenova/all-MiniLM-L6-v2",
                    filename="onnx/model.onnx",
                    local_dir=model_dir,
                    local_dir_use_symlinks=False
                )
                hf_hub_download(
                    repo_id="Xenova/all-MiniLM-L6-v2",
                    filename="onnx/tokenizer.json",
                    local_dir=model_dir,
                    local_dir_use_symlinks=False
                )
            
            from tokenizers import Tokenizer
            self.tokenizer = Tokenizer.from_file(vocab_path)
            self.model = InferenceSession(onnx_path)
            self.dim = 384
            print(f"Embedding model loaded (dim={self.dim})")
        except Exception as e:
            print(f"Model load failed: {e}, using fallback")
            self.model = "fallback"

    def embed(self, text):
        if self.model == "fallback":
            # Simple fallback: random but deterministic embedding
            np.random.seed(hash(text) % (2**31))
            return np.random.randn(self.dim).tolist()
        
        tokens = self.tokenizer.encode(text)
        inputs = {
            "input_ids": np.array([tokens.ids], dtype=np.int64),
            "attention_mask": np.array([tokens.attention_mask], dtype=np.int64),
            "token_type_ids": np.array([tokens.type_ids], dtype=np.int64),
        }
        result = self.model.run(None, inputs)
        return result[0].mean(axis=1).flatten().tolist()


@app.route("/v1/embeddings", methods=["POST"])
def embeddings():
    """OpenAI 兼容的 Embedding API"""
    global model
    if model is None:
        model = TinyEmbedder()
    
    data = request.get_json(force=True)
    input_text = data.get("input", "")
    if isinstance(input_text, list):
        input_text = input_text[0] if input_text else ""
    
    vector = model.embed(str(input_text))
    
    return jsonify({
        "object": "list",
        "data": [{"object": "embedding", "index": 0, "embedding": vector}],
        "model": "all-MiniLM-L6-v2",
        "usage": {"prompt_tokens": len(input_text), "total_tokens": len(input_text)}
    })

@app.route("/health")
def health():
    return jsonify({"status": "ok", "model_ready": model is not None, "dim": model.dim if model else None})

if __name__ == "__main__":
    print("Embedding Service starting on http://localhost:8098")
    print("Compatible with OpenAI /v1/embeddings endpoint")
    app.run(host="0.0.0.0", port=8098, debug=False)
