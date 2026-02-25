import { GoogleGenAI } from "@google/genai";
import { Recipe, WeatherCondition } from "../data/recipes";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function getCoffeeRecommendation(weather: { temp: number, condition: string }, recipes: Recipe[]) {
  const prompt = `
    Você é um especialista em café brasileiro (barista). 
    O clima atual é: ${weather.temp}°C e ${weather.condition}.
    
    Com base nisso, escolha a melhor receita de café da lista abaixo para o usuário hoje.
    Explique brevemente por que essa é a escolha perfeita para este clima em português brasileiro.
    
    Lista de receitas:
    ${recipes.map(r => `- ${r.name} (Categoria: ${r.category}, Clima: ${r.weatherSuitability.join(', ')})`).join('\n')}
    
    Retorne apenas um JSON no formato:
    {
      "recipeId": "id_da_receita",
      "reason": "sua explicação curta e charmosa"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error getting recommendation:", error);
    // Fallback logic
    const isHot = weather.temp > 25;
    const fallback = recipes.find(r => isHot ? r.weatherSuitability.includes('hot') : r.weatherSuitability.includes('cold')) || recipes[0];
    return {
      recipeId: fallback.id,
      reason: isHot ? "Um café gelado para refrescar esse calorão!" : "Nada como um café quentinho para esse clima."
    };
  }
}
