import { Recipe } from "../data/recipes";

export function getLocalCoffeeRecommendation(weather: { temp: number, condition: string }, recipes: Recipe[]) {
  const isHot = weather.temp > 25;
  const isRainy = weather.condition.toLowerCase().includes('chuva') || weather.condition.toLowerCase().includes('rain');
  const isCold = weather.temp < 18;

  let filtered = recipes;

  if (isHot) {
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
  const recommendation = filtered[Math.floor(Math.random() * filtered.length)];

  let reason = "Uma escolha equilibrada para o seu dia!";
  
  if (isHot) {
    reason = "O tempo está quente! Que tal algo refrescante para equilibrar o calor?";
  } else if (isCold) {
    reason = "O tempo está frio. Nada como um café encorpado e bem quente para te abraçar.";
  } else if (isRainy) {
    reason = "Dia de chuva pede um café aconchegante e um momento de pausa.";
  } else {
    reason = "O tempo está fresco, pede um café especial para acompanhar o ritmo do dia.";
  }

  return {
    recipeId: recommendation.id,
    reason: reason
  };
}
