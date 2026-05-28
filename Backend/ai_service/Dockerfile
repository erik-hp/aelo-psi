FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app
COPY requirements/ai.txt requirements/ai.txt
RUN pip install --no-cache-dir -r requirements/ai.txt

COPY ai_service /app/ai_service
EXPOSE 8001
CMD ["uvicorn", "ai_service.main:app", "--host", "0.0.0.0", "--port", "8001"]
