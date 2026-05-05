# =============================================================
# RepoTalk AI Service — Dockerfile
# Week 11 hardening: multi-stage + non-root + minimal runtime.
# =============================================================

# ---- Stage 1: Build wheelhouse and venv ----
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /build

# Build-time dependencies (kept out of runtime image).
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install deps into a self-contained virtualenv for clean copy into runtime.
RUN python -m venv /opt/venv
ENV PATH=/opt/venv/bin:$PATH
RUN pip install --upgrade pip setuptools wheel
RUN pip install -r requirements.txt

# ---- Stage 2: Runtime ----
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/opt/venv/bin:$PATH

WORKDIR /app

# Runtime-only system deps. git is needed for repository cloning.
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Security: run as non-root user.
RUN useradd --create-home --shell /usr/sbin/nologin appuser

COPY --from=builder /opt/venv /opt/venv
COPY --chown=appuser:appuser . .

RUN mkdir -p /app/tmp/cloned_repos /app/.model_cache /app/logs \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Keep healthcheck self-contained without curl/wget dependency.
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=5)"

# Keep existing entrypoint behavior.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--loop", "asyncio"]
