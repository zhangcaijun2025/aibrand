"""
轻量记忆层服务
TF-IDF + 本地 JSON 存储，中文单字分词
"""
import os, json, time, re, math
from flask import Flask, request, jsonify
from collections import defaultdict

app = Flask(__name__)
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "memories.json")

class SimpleMemory:
    def __init__(self):
        self.memories = defaultdict(list)
        self._load()

    def _load(self):
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    for k, v in json.load(f).items():
                        self.memories[k] = v
            except: pass

    def _save(self):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(dict(self.memories), f, ensure_ascii=False, indent=2)

    def _tokenize(self, text):
        """中文单字分词 + 英文数字保留"""
        text = text.lower()
        tokens = set()
        for part in re.findall(r"[\w\u4e00-\u9fff.@#$%&]+", text):
            if re.match(r"^[\u4e00-\u9fff]+$", part):
                for ch in part:
                    tokens.add(ch)
            else:
                tokens.add(part)
                # 混合词中提取中文单字
                for ch in part:
                    if '\u4e00' <= ch <= '\u9fff':
                        tokens.add(ch)
        return tokens

    def _tfidf_score(self, query_tokens, doc_tokens, total_docs, doc_freq):
        score = 0.0
        for qt in query_tokens:
            if qt in doc_tokens:
                idf = math.log((total_docs + 1) / (doc_freq.get(qt, 1) + 1)) + 1
                score += idf
        return score

    def add(self, text, user_id="default"):
        tokens = self._tokenize(text)
        entry = {"text": text, "time": time.time(), "tokens": list(tokens)}
        self.memories[user_id].append(entry)
        if len(self.memories[user_id]) > 100:
            self.memories[user_id] = self.memories[user_id][-100:]
        self._save()
        return True

    def search(self, query, user_id="default", top_k=5):
        query_tokens = self._tokenize(query)
        user_memories = self.memories.get(user_id, [])
        if not user_memories or not query_tokens:
            return []

        doc_freq = defaultdict(int)
        for m in user_memories:
            for t in set(m["tokens"]):
                doc_freq[t] += 1

        total = len(user_memories)
        scored = []
        for m in user_memories:
            doc_set = set(m["tokens"])
            score = self._tfidf_score(query_tokens, doc_set, total, doc_freq)
            if score > 0:
                scored.append((score, m["text"]))

        scored.sort(reverse=True)
        return [{"memory": s[1], "score": round(s[0], 2)} for s in scored[:top_k]]

    def get_all(self, user_id="default"):
        return [m["text"] for m in self.memories.get(user_id, [])]

_memory = None

def _init():
    global _memory
    if _memory is None:
        _memory = SimpleMemory()
    return _memory

_init()

@app.route("/health")
def health():
    mem = _memory or _init()
    return jsonify({"status": "ok", "mode": "tfidf", "total_users": len(mem.memories)})

@app.route("/add", methods=["POST"])
def add():
    mem = _memory or _init()
    data = request.get_json(force=True)
    text = data.get("text", "")
    user_id = data.get("user_id", "default")
    if not text:
        return jsonify({"error": "text required"}), 400
    mem.add(text, user_id)
    return jsonify({"status": "ok", "total": len(mem.memories.get(user_id, []))})

@app.route("/search", methods=["POST"])
def search():
    mem = _memory or _init()
    data = request.get_json(force=True)
    query = data.get("query", "")
    user_id = data.get("user_id", "default")
    if not query:
        return jsonify({"error": "query required"}), 400
    results = mem.search(query, user_id)
    return jsonify({"memories": [r["memory"] for r in results], "results": results})

@app.route("/get_all", methods=["GET"])
def get_all():
    mem = _memory or _init()
    user_id = request.args.get("user_id", "default")
    return jsonify({"memories": mem.get_all(user_id)})

if __name__ == "__main__":
    print("Memory Service running on http://localhost:8099")
    app.run(host="0.0.0.0", port=8099, debug=False)
