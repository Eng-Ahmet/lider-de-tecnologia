import { IncidentCategory, IncidentPriority } from '../types/report.js';

export interface AIAnalysisResult {
  detectedCategory: IncidentCategory;
  confidence: number;
  label: string;
  description: string;
  suggestedPriority: IncidentPriority;
  simulated: boolean;
  keyFeatures: string[];
  duplicateWarning?: {
    id: string;
    distance: number;
    duplicateCount: number;
  } | null;
}

export class DetectionService {
  async analyzeImage(
    fileName?: string,
    mimeType?: string,
    presetHint?: string
  ): Promise<AIAnalysisResult> {
    const hint = (presetHint || fileName || '').toLowerCase();

    // 1. Pothole / Bache
    if (hint.includes('pothole') || hint.includes('bache') || hint.includes('asfalto') || hint.includes('calzada')) {
      return {
        detectedCategory: 'pothole',
        confidence: 0.96,
        label: 'Bache o socavón en pavimento',
        description: 'Cavidad pronunciada con bordes irregulares y desprendimiento de grava en la calzada.',
        suggestedPriority: 'High',
        simulated: true,
        keyFeatures: [
          'Deformación de la capa de rodadura',
          'Profundidad estimada > 8 cm',
          'Riesgo directo para neumáticos y ciclistas',
        ],
      };
    }

    // 2. Damaged Road / Calzada dañada
    if (hint.includes('road') || hint.includes('danada') || hint.includes('dañada') || hint.includes('pavimento') || hint.includes('grieta')) {
      return {
        detectedCategory: 'damaged_road',
        confidence: 0.93,
        label: 'Calzada o asfalto deteriorado',
        description: 'Agrietamiento superficial con fisuras longitudinales extensas.',
        suggestedPriority: 'Medium',
        simulated: true,
        keyFeatures: ['Fisuras transversales', 'Hundimiento parcial de firme', 'Desgaste por tráfico pesado'],
      };
    }

    // 3. Damaged Sign / Señal vial
    if (hint.includes('sign') || hint.includes('senal') || hint.includes('señal') || hint.includes('disco') || hint.includes('stop')) {
      return {
        detectedCategory: 'damaged_sign',
        confidence: 0.95,
        label: 'Señal de tráfico derribada o deteriorada',
        description: 'Poste vertical vencido o lámina reflectante vandalizada.',
        suggestedPriority: 'High',
        simulated: true,
        keyFeatures: ['Inclinación de poste > 30°', 'Falta de visibilidad de cruce', 'Peligro de colisión'],
      };
    }

    // 4. Blocked Road / Vía bloqueada
    if (hint.includes('blocked') || hint.includes('cortada') || hint.includes('arbol') || hint.includes('rama') || hint.includes('obstaculo')) {
      return {
        detectedCategory: 'blocked_road',
        confidence: 0.94,
        label: 'Vía cortada u obstáculo en la vía',
        description: 'Elemento caído que obstruye parcialmente uno o más carriles de circulación.',
        suggestedPriority: 'Critical',
        simulated: true,
        keyFeatures: ['Bloqueo de carril de rodadura', 'Interrupción del tráfico urbano', 'Intervención de emergencia'],
      };
    }

    // 5. Traffic accident / Accidente o semáforo caído
    if (hint.includes('accident') || hint.includes('semaforo') || hint.includes('choque') || hint.includes('golpe')) {
      return {
        detectedCategory: 'traffic_accident',
        confidence: 0.97,
        label: 'Incidente de tráfico / Mobiliario de seguridad derribado',
        description: 'Bordillo o báculo semafórico colisionado con afectación al flujo vehicular.',
        suggestedPriority: 'Critical',
        simulated: true,
        keyFeatures: ['Daño estructural severo', 'Cables o elementos sueltos', 'Requiere señalización provisional'],
      };
    }

    // Default
    return {
      detectedCategory: 'pothole',
      confidence: 0.92,
      label: 'Incidencia detectada en infraestructura vial',
      description: 'Análisis de textura y relieve confirma anomalía visible sobre la superficie.',
      suggestedPriority: 'Medium',
      simulated: true,
      keyFeatures: ['Análisis morfológico de asfalto', 'Contraste térmico y visual', 'Clasificación automática'],
    };
  }
}

export const detectionService = new DetectionService();
