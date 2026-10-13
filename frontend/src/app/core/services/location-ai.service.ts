import { Injectable } from '@angular/core';

export interface LocationEvaluation {
  score: number; // 0 - 100
  zoneType: string;
  pedestrianTraffic: 'Extremo' | 'Alto' | 'Medio' | 'Bajo';
  slaResponseTime: string;
  tags: string[];
  explanation: string;
  isHighPriorityZone: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LocationAIService {

  evaluateLocation(address: string, city: string, province: string): LocationEvaluation {
    const text = (address + ' ' + city + ' ' + province).toLowerCase();

    // 1. Critical Historic & Pedestrian Centers (Calle Larios, Alameda, Plaza Mayor, Gran Vía, etc.)
    if (text.includes('larios') || text.includes('alameda') || text.includes('merced') || text.includes('gran via') || text.includes('sol') || text.includes('centro historico') || text.includes('centro histórico')) {
      return {
        score: 96,
        zoneType: 'Eje Peatonal y Turístico de Máxima Afluencia',
        pedestrianTraffic: 'Extremo',
        slaResponseTime: '< 4 Horas (Intervención Inmediata)',
        tags: ['Paso Masivo de Viandantes', 'Zona Monumental Protegida', 'Riesgo Elevado de Caídas'],
        explanation: 'Ubicación neurálgica de la ciudad con densidad peatonal superior a 40.000 viandantes diarios. Cualquier desperfecto en la vía supone un riesgo civil inminente.',
        isHighPriorityZone: true,
      };
    }

    // 2. Hospital and Healthcare Zones (Hospital Civil, Clínico, Carlos Haya, Materno, etc.)
    if (text.includes('hospital') || text.includes('clinico') || text.includes('clínico') || text.includes('salud') || text.includes('urgencias') || text.includes('carlos haya')) {
      return {
        score: 94,
        zoneType: 'Entorno Hospitalario y Sanitario Crítico',
        pedestrianTraffic: 'Alto',
        slaResponseTime: '< 3 Horas (Paso de Ambulancias)',
        tags: ['Acceso a Urgencias', 'Paso de Ambulancias', 'Personas de Movilidad Reducida'],
        explanation: 'Vía crítica de evacuación sanitaria y transporte de urgencias. Los baches o bloqueos en esta calzada comprometen el acceso de ambulancias.',
        isHighPriorityZone: true,
      };
    }

    // 3. Main Arterial Corridors & Bus Lanes (Av. Velázquez, Paseo del Parque, Louis Pasteur, etc.)
    if (text.includes('velazquez') || text.includes('velázquez') || text.includes('pasteur') || text.includes('parque') || text.includes('andalucia') || text.includes('andalucía') || text.includes('avenida') || text.includes('bulevar')) {
      return {
        score: 88,
        zoneType: 'Corredor Arterial de Transporte Público (EMT/Metro)',
        pedestrianTraffic: 'Alto',
        slaResponseTime: '< 8 Horas (Prioridad Alta)',
        tags: ['Carril Bus Exclusivo', 'Flujo Vehicular Intenso', 'Tráfico de Autobuses'],
        explanation: 'Eje vertebrador de la movilidad urbana. Un daño en calzada ralentiza el transporte público y puede provocar retenciones en cadena.',
        isHighPriorityZone: true,
      };
    }

    // 4. Coastal & Promenades (Malagueta, Paseo Marítimo, Melilla, etc.)
    if (text.includes('maritimo') || text.includes('marítimo') || text.includes('malagueta') || text.includes('playa') || text.includes('puerto') || text.includes('soho')) {
      return {
        score: 82,
        zoneType: 'Paseo Marítimo y Ribera Turística',
        pedestrianTraffic: 'Alto',
        slaResponseTime: '< 12 Horas',
        tags: ['Paseo Litoral', 'Carril Bici Adyacente', 'Afluencia Recreativa'],
        explanation: 'Sector de alta concurrencia de deportistas, ciclistas y turistas costeros. Requiere reparación rápida de pavimento.',
        isHighPriorityZone: false,
      };
    }

    // 5. University & Campus Zones (Teatinos, Universidad, Campus)
    if (text.includes('teatinos') || text.includes('universidad') || text.includes('campus') || text.includes('facultad') || text.includes('colegio') || text.includes('escuela')) {
      return {
        score: 84,
        zoneType: 'Entorno Educativo y Campus Universitario',
        pedestrianTraffic: 'Alto',
        slaResponseTime: '< 12 Horas (Horario Lectivo)',
        tags: ['Comunidad Escolar/Universitaria', 'Paso de Líneas Universitarias', 'Cruce de Estudiantes'],
        explanation: 'Área escolar y universitaria con alto tránsito de jóvenes y transporte colectivo matinal.',
        isHighPriorityZone: true,
      };
    }

    // General Standard Urban Street
    return {
      score: 65,
      zoneType: 'Vía Residencial Urbana Estándar',
      pedestrianTraffic: 'Medio',
      slaResponseTime: '< 24-48 Horas',
      tags: ['Tráfico Vecinal Local', 'Aparcamiento en Superficie', 'Zona 30'],
      explanation: 'Calle de distribución residencial con velocidad regulada a 30 km/h y tránsito vecinal habitual.',
      isHighPriorityZone: false,
    };
  }
}
