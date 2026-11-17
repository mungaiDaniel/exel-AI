FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run as an unprivileged user
RUN useradd --create-home appuser && mkdir -p /app/uploads && chown -R appuser /app
USER appuser

EXPOSE 8000

# docker-compose overrides this with --reload for development
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
