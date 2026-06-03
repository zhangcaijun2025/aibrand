FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir fastapi uvicorn httpx pydantic requests

# Mount host Claude Code and project files at runtime
# The container needs:
#   -v C:\Users\XIAOMI\AppData\Roaming\npm\claude:/usr/local/bin/claude
#   -v D:\king2046:/project
#   -v /var/run/docker.sock:/var/run/docker.sock (for docker commands)
#   --network host (to access host's Node.js)

COPY app.py /app/

ENV PROJECT_ROOT=/project
ENV CLAUDE_CLI=claude
ENV CLAUDE_BRIDGE_PORT=4020

EXPOSE 4020

CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "4020"]
