import { Router, Request, Response } from 'express';
import { dbService } from '../services/db.service.js';
import { config } from '../config/config.js';

const router = Router();

// Configuration
const FASTAPI_URL = process.env.FASTAPI_AI_URL || 'http://localhost:8000/api/chat';
const GROQ_API_KEY = config.groq.apiKey;
const GROQ_MODEL = config.groq.model;

router.post('/ai/chat', async (req: Request, res: Response) => {
  try {
    const prompt = (req.body.prompt || '').trim();
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // 1. Try FastAPI LangChain microservice first if active
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s fast check
      
      const fastApiResponse = await fetch(FASTAPI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (fastApiResponse.ok) {
        const data = await fastApiResponse.json();
        return res.json({
          response: data.response || data.text || data.answer,
          source: 'fastapi-langchain-8b',
          suggestions: data.suggestions || ['Ver estadísticas de Málaga', 'Tiempos de respuesta (SLA)']
        });
      }
    } catch {
      // FastAPI server not running on port 8000 -> proceed to direct lightweight Groq inference
    }

    // 2. Fetch live database context to enrich LLM prompt with real municipal data
    const reports = await dbService.getAllReports();
    const totalReports = reports.length;
    const resolvedReports = reports.filter(r => r.status === 'Resolved').length;
    const inProgressReports = reports.filter(r => r.status === 'InProgress' || r.status === 'UnderReview').length;
    const potholesCount = reports.filter(r => r.category === 'pothole').length;

    // 3. Direct Groq Cloud API with ultra-lightweight Llama 3.1 8B (minimum token burn)
    if (GROQ_API_KEY) {
      try {
        const systemPrompt = `Eres "CalleFix AI", el asistente municipal de Málaga (España).
Misión: Indicar al ciudadano cómo reportar desperfectos viales y a quién llamar.
Teléfonos de Málaga:
- 010 (Línea Málaga / Atención Ciudadana)
- 092 (Policía Local para peligros y cortes urgentes)
- 112 (Emergencias)

REGLAS ESTRICTAS:
1. Responde SIEMPRE en español.
2. Respuesta MUY CORTA: MÁXIMO 35 PALABRAS. Directo y sin explicaciones largas.
3. Informa de los teléfonos 010 o 092 según la urgencia.`;

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Groq-Node/1.0'
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            max_tokens: 120, // Strict token limit for short answers (<= 35 words)
            temperature: 0.2
          })
        });

        if (groqRes.ok) {
          const groqData: any = await groqRes.json();
          const reply = groqData.choices?.[0]?.message?.content;
          if (reply) {
            return res.json({
              response: reply.trim(),
              source: `groq-${GROQ_MODEL}`,
              suggestions: [
                '📞 Teléfonos de contacto en Málaga',
                '📍 ¿Cómo reportar un bache?',
                '⏱️ Tiempo de reparación (SLA)'
              ]
            });
          }
        } else {
          const errText = await groqRes.text();
          console.warn('⚠️ Groq API returned error status:', groqRes.status, errText);
        }
      } catch (groqErr) {
        console.warn('⚠️ Groq API call warning:', groqErr);
      }
    }

    // 4. Spanish Error notice when AI connection fails
    return res.json({
      response: `⚠️ Error de conexión: No se pudo conectar con el servicio de IA municipal. Por favor, intente de nuevo o llame al 010 (Línea Málaga) o al 092 (Policía Local).`,
      source: 'error-conexion',
      isError: true,
      suggestions: [
        '📞 Teléfonos de contacto',
        '📍 Ubicación en Málaga'
      ]
    });

  } catch (error: any) {
    console.error('❌ AI Chat error:', error);
    return res.status(500).json({ error: error.message || 'Error processing AI chat' });
  }
});

export default router;
