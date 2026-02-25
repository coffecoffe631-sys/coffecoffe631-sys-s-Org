import { supabase } from '../lib/supabase';
import { Recipe, Ingredient, Step } from '../data/recipes';

export const fetchRecipesFromSupabase = async (): Promise<Recipe[]> => {
  const { data, error } = await supabase
    .from('receitas_cafe')
    .select('*');

  if (error) {
    throw error;
  }

  // Map Supabase data to our Recipe interface
  return data.map((item: any) => ({
    id: item.id.toString(),
    name: item.nome,
    country: item.pais || 'Brasil', // Default to Brasil if not present
    description: item.descricao || '',
    image: item.imagem || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=1000&auto=format&fit=crop',
    ingredients: Array.isArray(item.ingredientes) ? item.ingredientes.map((i: any) => typeof i === 'string' ? i : i.name) : [],
    equipment: item.equipamentos || [],
    detailedIngredients: Array.isArray(item.ingredientes) ? item.ingredientes.map((i: any) => ({
      name: typeof i === 'string' ? i : i.name,
      amount: typeof i === 'string' ? '' : i.amount
    })) : [],
    steps: Array.isArray(item.modo_preparo) ? item.modo_preparo.map((s: any) => ({
      title: s.title || s.titulo || '',
      description: s.description || s.descricao || ''
    })) : [],
    weatherSuitability: item.clima_adequado || ['neutral'],
    category: item.categoria || 'Specialty',
    difficulty: item.dificuldade || 'Medium',
    prepTime: item.tempo_preparo || '5 min'
  }));
};

export const insertRecipeToSupabase = async (recipe: Omit<Recipe, 'id'>) => {
  const { data, error } = await supabase
    .from('receitas_cafe')
    .insert([{
      nome: recipe.name,
      pais: recipe.country,
      descricao: recipe.description,
      imagem: recipe.image,
      categoria: recipe.category,
      tempo_preparo: recipe.prepTime,
      dificuldade: recipe.difficulty,
      ingredientes: recipe.detailedIngredients,
      modo_preparo: recipe.steps,
      equipamentos: recipe.equipment,
      clima_adequado: recipe.weatherSuitability
    }])
    .select();

  if (error) throw error;
  return data;
};

export const deleteRecipeFromSupabase = async (id: string) => {
  const { error } = await supabase
    .from('receitas_cafe')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
