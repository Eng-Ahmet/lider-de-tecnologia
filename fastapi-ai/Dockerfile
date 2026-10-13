FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV GROQ_API_KEY=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
ENV GROQ_MODEL=allam-2-7b

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
