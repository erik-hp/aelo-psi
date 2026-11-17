FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements/base.linux-py312.lock requirements/base.linux-py312.lock
RUN pip install --no-cache-dir --require-hashes -r requirements/base.linux-py312.lock

COPY . .

RUN useradd --system --uid 10001 --home-dir /nonexistent --shell /usr/sbin/nologin aelo
USER 10001:10001

EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
