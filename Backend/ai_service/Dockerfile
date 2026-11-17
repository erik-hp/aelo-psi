FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app
COPY requirements/ai.linux-py312.lock requirements/ai.linux-py312.lock
RUN pip install --no-cache-dir --require-hashes -r requirements/ai.linux-py312.lock

COPY ai_service /app/ai_service
RUN useradd --system --uid 10001 --home-dir /nonexistent --shell /usr/sbin/nologin aelo
USER 10001:10001
EXPOSE 8001
CMD ["uvicorn", "ai_service.main:app", "--host", "0.0.0.0", "--port", "8001"]
