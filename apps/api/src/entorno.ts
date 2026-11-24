/** Variables, secretos y bindings del Worker. Todo lo opcional degrada con gracia. */
export interface Entorno {
  /** Secreto: clave de SerpApi (Google Flights, Google Hotels, Booking y Airbnb). */
  SERPAPI_KEY?: string;
  /** Secreto: token de la Data API de Travelpayouts (Aviasales). */
  TRAVELPAYOUTS_TOKEN?: string;
  /** Opcional: secreto para firmar tokens; si falta se usa SERPAPI_KEY. */
  FIRMA_SECRETO?: string;
  /** Opcional: marcador de afiliado para los enlaces de Aviasales. */
  TRAVELPAYOUTS_MARKER?: string;
  ORIGENES_PERMITIDOS?: string;
  SERPAPI_LIMITE_DIARIO?: string;
  SERPAPI_MOTORES_HOTELES?: string;
  IA_MODELO?: string;
  /** Workers AI (gratis hasta 10.000 neuronas al día). */
  AI?: Ai;
  /** KV opcional para compartir la caché y el contador de cuota entre instancias. */
  CACHE?: KVNamespace;
  /** Rate Limiting de Workers (opcional). */
  LIMITADOR?: { limit(opciones: { key: string }): Promise<{ success: boolean }> };
}

export interface Fuentes {
  serpapi: boolean;
  travelpayouts: boolean;
  ia: boolean;
}

export function fuentesDisponibles(env: Entorno): Fuentes {
  return {
    serpapi: Boolean(env.SERPAPI_KEY?.trim()),
    travelpayouts: Boolean(env.TRAVELPAYOUTS_TOKEN?.trim()),
    ia: Boolean(env.AI),
  };
}
