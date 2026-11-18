FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir fastapi==0.115.0 uvicorn==0.30.6

COPY main.py /app/main.py

ENV PORT=8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
