FROM python:3.12-slim
WORKDIR /app
RUN pip install flask requests
COPY app.py /app/
EXPOSE 4000
CMD ["python", "app.py"]
