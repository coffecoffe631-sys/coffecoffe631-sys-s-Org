import { Recipe } from "../data/recipes";

export function getLocalCoffeeRecommendation(weather: { temp: number, condition: string }, recipes: Recipe[]) {
  const isVeryHot = weather.temp >= 32;
  const isHot = weather.temp >= 26;
  const isRainy = weather.condition.toLowerCase().includes('chuva') || weather.condition.toLowerCase().includes('rain') || weather.condition.toLowerCase().includes('tempestade');
  const isCold = weather.temp < 18;
  const isFresh = weather.temp >= 18 && weather.temp < 26;

  let filtered = recipes;

  if (isVeryHot || isHot) {
    filtered = recipes.filter(r => r.weatherSuitability.includes('hot'));
  } else if (isCold) {
    filtered = recipes.filter(r => r.weatherSuitability.includes('cold'));
  } else if (isRainy) {
    filtered = recipes.filter(r => r.weatherSuitability.includes('rainy'));
  }

  // If no specific match, use neutral or any
  if (filtered.length === 0) {
    filtered = recipes.filter(r => r.weatherSuitability.includes('neutral'));
  }

  if (filtered.length === 0) {
    filtered = recipes;
  }

  // Pick a random one from the filtered list
  if (filtered.length === 0) return null;
  
  const recommendation = filtered[Math.floor(Math.random() * filtered.length)];

  let reason = "";
  
  if (isVeryHot) {
    reason = `Está fazendo ${weather.temp}ºC! Com esse calor intenso, nada melhor que um café gelado ou uma receita refrescante para te hidratar.`;
  } else if (isHot) {
    reason = `O dia está quente (${weather.temp}ºC). Uma ótima oportunidade para experimentar um preparo mais leve e vibrante.`;
  } else if (isCold) {
    reason = `Com ${weather.temp}ºC, o frio chegou. Um café encorpado e bem quente é o abraço que você precisa agora.`;
  } else if (isRainy) {
    reason = `Dia de chuva pede aconchego. Que tal um café especial para acompanhar o som da água caindo?`;
  } else {
    reason = `O clima está agradável (${weather.temp}ºC). O momento perfeito para apreciar a complexidade de um café equilibrado.`;
  }

  return {
    recipeId: recommendation.id,
    reason: reason
  };
}
