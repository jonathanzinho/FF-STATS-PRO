import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { FFMatchStats } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeFFScreenshot(base64Image: string): Promise<FFMatchStats> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analise este print de tela de resultados do Free Fire com MÁXIMA PRECISÃO.
  FOCO: Extraia TODOS os dados da tabela de estatísticas dos jogadores sem omitir nada.
  
  REGRAS DE OURO PARA PRECISÃO:
  1. NICKNAMES: Extraia o NICKNAME exato. 
     - IMPORTANTE: Ignore o texto menor que aparece logo abaixo do nick (guilda).
     - VERIFIQUE: Certifique-se de não pular nenhum jogador da lista.
  2. DADOS NUMÉRICOS: Verifique duas vezes os valores de Kills, Dano e Assistências.
  3. MAPA: Identifique o mapa corretamente (Bermuda, Purgatório, Kalahari, Alpine, Nova Terra).
  4. COLOCAÇÃO: Identifique a posição exata do squad.
  5. MÉTRICAS ADICIONAIS: Se disponíveis, extraia também:
     - Derrubados (knockdowns)
     - Cura (healing)
     - Levantados (revives)
     - Ressurgimento (respawns)
     - % de Headshots (headshotPercentage)
  
  Retorne um JSON rigoroso:
  {
    "map": "Nome do Mapa",
    "placement": 1, 
    "players": [
      {
        "playerName": "NICKNAME",
        "kills": 0,
        "assists": 0,
        "damage": 0,
        "survivalTime": "00:00",
        "knockdowns": 0,
        "healing": 0,
        "revives": 0,
        "respawns": 0,
        "headshotPercentage": "0%"
      }
    ]
  }
  
  Se uma métrica não estiver visível no print, omita-a ou retorne null/0.`;

  const maxRetries = 3;
  let retryCount = 0;
  let lastError: any = null;

  while (retryCount <= maxRetries) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Image?.includes(",") ? base64Image.split(",")[1] : (base64Image || ""),
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              map: { type: Type.STRING },
              placement: { type: Type.NUMBER, description: "Colocação final do squad (1-12)" },
              players: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    playerName: { type: Type.STRING },
                    kills: { type: Type.NUMBER },
                    assists: { type: Type.NUMBER },
                    damage: { type: Type.NUMBER },
                    survivalTime: { type: Type.STRING },
                    knockdowns: { type: Type.NUMBER },
                    healing: { type: Type.NUMBER },
                    revives: { type: Type.NUMBER },
                    respawns: { type: Type.NUMBER },
                    headshotPercentage: { type: Type.STRING },
                  },
                  required: ["playerName", "kills", "damage"],
                },
              },
            },
            required: ["map", "placement", "players"],
          },
        },
      });

      const result = JSON.parse(response.text || "{}");
      
      // Normalize map name: 'Nexterra' or 'next terra' -> 'NOVA TERRA'
      if (result.map && (result.map.toLowerCase().includes('nexterra') || result.map.toLowerCase().includes('next terra'))) {
        result.map = 'NOVA TERRA';
      }

      return {
        ...result,
        date: new Date().toISOString(),
      };
    } catch (err: any) {
      lastError = err;
      // Check if it's a 429 error
      if (err.message?.includes("429") || err.status === 429 || err.code === 429) {
        retryCount++;
        if (retryCount <= maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
          console.warn(`Gemini API rate limited (429). Retrying in ${Math.round(delay)}ms... (Attempt ${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      throw err;
    }
  }

  throw lastError;
}
