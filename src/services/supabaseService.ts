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
    ingredients: Array.isArray(item.ingredientes) 
      ? item.ingredientes.map((i: any) => typeof i === 'string' ? i : i.name).filter(Boolean) 
      : [],
    equipment: Array.isArray(item.equipamentos) ? item.equipamentos.filter(Boolean) : [],
    detailedIngredients: Array.isArray(item.ingredientes) ? item.ingredientes.map((i: any) => ({
      name: typeof i === 'string' ? i : i.name,
      amount: typeof i === 'string' ? '' : i.amount
    })) : [],
    steps: Array.isArray(item.modo_preparo) ? item.modo_preparo.map((s: any) => ({
      title: s.title || s.titulo || '',
      description: s.description || s.descricao || '',
      image: s.image || ''
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

export const updateRecipeInSupabase = async (id: string, recipe: Partial<Recipe>) => {
  const updateData: any = {};
  
  if (recipe.name !== undefined) updateData.nome = recipe.name;
  if (recipe.country !== undefined) updateData.pais = recipe.country;
  if (recipe.description !== undefined) updateData.descricao = recipe.description;
  if (recipe.image !== undefined) updateData.imagem = recipe.image;
  if (recipe.category !== undefined) updateData.categoria = recipe.category;
  if (recipe.prepTime !== undefined) updateData.tempo_preparo = recipe.prepTime;
  if (recipe.difficulty !== undefined) updateData.dificuldade = recipe.difficulty;
  if (recipe.detailedIngredients !== undefined) updateData.ingredientes = recipe.detailedIngredients;
  if (recipe.steps !== undefined) updateData.modo_preparo = recipe.steps;
  if (recipe.equipment !== undefined) updateData.equipamentos = recipe.equipment;
  if (recipe.weatherSuitability !== undefined) updateData.clima_adequado = recipe.weatherSuitability;

  const { data, error } = await supabase
    .from('receitas_cafe')
    .update(updateData)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data;
};
