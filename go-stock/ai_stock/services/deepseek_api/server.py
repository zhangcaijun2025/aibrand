"""
DeepSeek API 代理服务
直接调用 DeepSeek API，绕过 PraisonAI 框架。
支持流式和非流式响应，兼容 OpenAI API 格式。
端口：8010
"""

import os
import json
import time
from flask import Flask, request, jsonify, Response, stream_with_context
from openai import OpenAI

app = Flask(__name__)

# 配置
DEEPSEEK_API_KEY = os.environ.get("OPENAI_API_KEY", "sk-ed55ee5109dd44e6940c3a4b63c527d7")
DEEPSEEK_BASE_URL = os.environ.get("OPENAI_API_BASE", "https://api.deepseek.com/v1")
DEFAULT_MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-pro")
client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)


# ========== 路由 ==========

@app.route("/", methods=["GET"])
def index():
    """入口页"""
    return jsonify({
        "service": "DeepSeek API Proxy",
        "status": "running",
        "model": DEFAULT_MODEL,
        "provider": "DeepSeek",
        "endpoints": [
            "GET  /health",
            "GET  /v1/models",
            "POST /chat",
            "POST /v1/chat/completions",
            "POST /agents/assistant/invoke",
        ],
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "provider": "DeepSeek", "model": DEFAULT_MODEL, "base_url": DEEPSEEK_BASE_URL, "timestamp": time.time()})


@app.route("/v1/models", methods=["GET"])
def list_models():
    return jsonify({"object": "list", "data": [{"id": "deepseek-v4-pro", "object": "model"}, {"id": "deepseek-v4-flash", "object": "model"}]})


@app.route("/v1/chat/completions", methods=["POST"])
def chat_completions():
    """OpenAI 兼容的 Chat Completions API"""
    data = request.get_json(force=True)
    model = data.get("model", DEFAULT_MODEL)
    messages = data.get("messages", [])
    stream = data.get("stream", False)
    temperature = data.get("temperature", 0.7)
    max_tokens = data.get("max_tokens", 2000)
    top_p = data.get("top_p", 1.0)
    presence_penalty = data.get("presence_penalty", 0.0)
    frequency_penalty = data.get("frequency_penalty", 0.0)
    if not messages:
        return jsonify({"error": "messages is required"}), 400

    kwargs = {"model": model, "messages": messages, "temperature": temperature,
              "max_tokens": max_tokens, "top_p": top_p,
              "presence_penalty": presence_penalty, "frequency_penalty": frequency_penalty}

    if stream:
        kwargs["stream"] = True
        def generate():
            try:
                for chunk in client.chat.completions.create(**kwargs):
                    if chunk.choices:
                        delta = chunk.choices[0].delta
                        content = getattr(delta, "content", None)
                        if content:
                            yield f"data: {json.dumps({'choices': [{'delta': {'content': content}}]})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        return Response(stream_with_context(generate()), mimetype="text/event-stream",
                        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
    else:
        try:
            resp = client.chat.completions.create(**kwargs)
            return jsonify({
                "id": resp.id, "object": "chat.completion", "created": int(time.time()),
                "model": resp.model,
                "choices": [{"index": 0, "message": {"role": "assistant", "content": resp.choices[0].message.content},
                             "finish_reason": resp.choices[0].finish_reason}],
                "usage": {"prompt_tokens": resp.usage.prompt_tokens if resp.usage else 0,
                          "completion_tokens": resp.usage.completion_tokens if resp.usage else 0,
                          "total_tokens": resp.usage.total_tokens if resp.usage else 0} if resp.usage else None,
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500


@app.route("/chat", methods=["POST"])
def simple_chat():
    """简化聊天接口"""
    data = request.get_json(force=True)
    message = data.get("message", "")
    system_prompt = data.get("system", "你是一个智能助手，用中文回答")
    model = data.get("model", DEFAULT_MODEL)
    messages = [{"role": "system", "content": system_prompt}]
    history = data.get("history", [])
    messages.extend(history)
    messages.append({"role": "user", "content": message})
    try:
        resp = client.chat.completions.create(model=model, messages=messages, temperature=0.7, max_tokens=2000)
        return jsonify({
            "reply": resp.choices[0].message.content, "model": resp.model,
            "usage": {"prompt_tokens": resp.usage.prompt_tokens if resp.usage else 0,
                      "completion_tokens": resp.usage.completion_tokens if resp.usage else 0,
                      "total_tokens": resp.usage.total_tokens if resp.usage else 0},
        })
    except Exception as e:
        return jsonify({"error": str(e), "reply": None}), 500


@app.route("/agents/assistant/invoke", methods=["POST"])
def agent_compat():
    """PraisonAI 兼容接口（供 N8N 调用）"""
    data = request.get_json(force=True)
    message = data.get("message", "")
    messages = [{"role": "user", "content": message}]
    try:
        resp = client.chat.completions.create(model=DEFAULT_MODEL, messages=messages, temperature=0.7, max_tokens=2000)
        result = resp.choices[0].message.content
        return jsonify({
            "result": result, "session_id": data.get("session_id", "default"), "status": "success",
            "metadata": {"agent_id": "assistant", "message_length": len(message),
                         "response_length": len(result) if result else 0, "model": resp.model},
        })
    except Exception as e:
        return jsonify({"result": None, "session_id": data.get("session_id", "default"),
                        "status": "error", "metadata": {"error": str(e)}}), 500


if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8010
    print(f"DeepSeek API Proxy running on http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
