import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
import urllib.request

app = FastAPI(
    title="CalleFix AI — Asistente Municipal de Málaga",
    description="Microservicio de Inteligencia Artificial para el Ayuntamiento de Málaga (010 / 092 / 112)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "allam-2-7b")

class ChatRequest(BaseModel):
    prompt: str
    context: Optional[dict] = None

class ChatResponse(BaseModel):
    response: str
    source: str
    suggestions: List[str]
    is_error: bool = False
    intent: Optional[str] = "municipal_assistance"

SYSTEM_PROMPT = """Eres el asistente municipal oficial de CalleFix para la ciudad de Málaga (España).
Tu única función es orientar al ciudadano sobre cómo reportar desperfectos viales en Málaga y a quién llamar.

Teléfonos oficiales de Málaga:
- 010: Línea Málaga (atención ciudadana municipal ordinaria).
- 092: Policía Local de Málaga (peligro inminente, vías cortadas o accidentes).
- 112: Emergencias generales.

REGLAS OBLIGATORIAS:
1. Responde SIEMPRE en español.
2. Respuesta MUY CORTA: MÁXIMO 35 PALABRAS. Sin introducciones innecesarias.
3. Menciona siempre el teléfono correspondiente (010 o 092) o el botón de reportar en la web.
"""

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "CalleFix AI FastAPI",
        "model": GROQ_MODEL,
        "language": "es"
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    query = req.prompt.strip()
    if not query:
        raise HTTPException(status_code=400, detail="El texto de la consulta es obligatorio")

    try:
        groq_req_data = {
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": query}
            ],
            "max_tokens": 100,
            "temperature": 0.2
        }

        request = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps(groq_req_data).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
                "User-Agent": "FastAPI-CalleFix/1.0"
            }
        )

        with urllib.request.urlopen(request, timeout=6) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            content = res_json["choices"][0]["message"]["content"].strip()

            return ChatResponse(
                response=content,
                source=f"fastapi-groq-{GROQ_MODEL}",
                suggestions=[
                    "📞 Teléfonos de Málaga (010 / 092)",
                    "📍 ¿Cómo reportar un bache en la web?",
                    "🚨 Reportar peligro urgente"
                ],
                is_error=False,
                intent="municipal_assistance"
            )

    except Exception as e:
        # Respuesta clara en español si falla la conexión
        return ChatResponse(
            response="⚠️ Error de conexión con el servicio de IA municipal. Por favor, llame directamente al 010 (Línea Málaga) o al 092 (Policía Local) para asistencia inmediata.",
            source="fastapi-error-conexion",
            suggestions=[
                "📞 Llamar al 010 (Línea Málaga)",
                "🚨 Llamar al 092 (Policía Local)"
            ],
            is_error=True,
            intent="connection_error"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
