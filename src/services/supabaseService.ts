import { supabase } from '../lib/supabase';
import { Recipe, Ingredient, Step } from '../data/recipes';
import { JourneyStep } from '../data/journey';

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
    image: item.imagem_url || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=1000&auto=format&fit=crop',
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
      image: s.image || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1000&auto=format&fit=crop'
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
      imagem_url: recipe.image,
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
  if (recipe.image !== undefined) updateData.imagem_url = recipe.image;
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

export const seedRecipes = async (recipes: Recipe[]) => {
  const formattedRecipes = recipes.map(recipe => ({
    nome: recipe.name,
    pais: recipe.country,
    descricao: recipe.description,
    imagem_url: recipe.image,
    categoria: recipe.category,
    tempo_preparo: recipe.prepTime,
    dificuldade: recipe.difficulty,
    ingredientes: recipe.detailedIngredients,
    modo_preparo: recipe.steps,
    equipamentos: recipe.equipment,
    clima_adequado: recipe.weatherSuitability
  }));

  const { data, error } = await supabase
    .from('receitas_cafe')
    .insert(formattedRecipes)
    .select();

  if (error) throw error;
  return data;
};

export const fetchAppLogo = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'app_logo')
      .maybeSingle();

    if (error) {
      console.warn('Could not fetch app logo from Supabase (table might not exist):', error.message);
      return null;
    }

    return data?.value || null;
  } catch (err) {
    console.error('Error in fetchAppLogo:', err);
    return null;
  }
};

export const updateAppLogo = async (logoBase64: string) => {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: 'app_logo', value: logoBase64 }, { onConflict: 'key' });

  if (error) {
    console.error('Error updating app logo in Supabase:', error.message);
    throw error;
  }
};

// Journey Services
export const fetchJourneyFromSupabase = async (): Promise<JourneyStep[]> => {
  try {
    const { data, error } = await supabase
      .from('coffee_journey')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.warn('Error fetching journey:', error.message);
      return [];
    }
    
    return data.map((item: any) => {
      const parsedContent = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
      return {
        id: item.id.toString(),
        title: item.title,
        description: item.description,
        status: item.status,
        icon: item.icon,
        image: item.imagem_url || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1000&auto=format&fit=crop',
        requirements: item.requirements,
        reward: item.reward,
        audioUrl: item.audio_url || parsedContent?.audioUrl || parsedContent?.audio_url || '',
        content: parsedContent
      };
    });
  } catch (err) {
    console.error('Error in fetchJourneyFromSupabase:', err);
    return [];
  }
};

export const updateJourneyStepInSupabase = async (step: JourneyStep) => {
  const finalContent = {
    ...step.content,
    audioUrl: step.audioUrl
  };

  const { error } = await supabase
    .from('coffee_journey')
    .update({
      title: step.title,
      description: step.description,
      status: step.status,
      icon: step.icon,
      imagem_url: step.image,
      requirements: step.requirements,
      reward: step.reward,
      content: finalContent
    })
    .eq('id', step.id);

  if (error) {
    console.error('Error updating journey step:', error.message);
    throw error;
  }
};

export const insertJourneyStepToSupabase = async (step: Omit<JourneyStep, 'id'>) => {
  const finalContent = {
    ...(typeof step.content === 'object' ? step.content : JSON.parse(step.content as any || '{}')),
    audioUrl: step.audioUrl
  };

  const { data, error } = await supabase
    .from('coffee_journey')
    .insert([{
      title: step.title,
      description: step.description,
      status: step.status,
      icon: step.icon,
      imagem_url: step.image,
      requirements: step.requirements,
      reward: step.reward,
      content: finalContent
    }])
    .select();

  if (error) {
    if (error.code === 'PGRST205') {
      console.error('Tabela "coffee_journey" não encontrada. Por favor, crie-a no SQL Editor do Supabase.');
      throw new Error('Tabela não encontrada no banco de dados. Execute o script SQL fornecido.');
    }
    console.error('Error inserting journey step:', error.message);
    throw error;
  }
  return data;
};

export const deleteJourneyStepFromSupabase = async (id: string) => {
  const { error } = await supabase
    .from('coffee_journey')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting journey step:', error.message);
    throw error;
  }
};

export const seedJourney = async (journey: JourneyStep[]) => {
  const formattedJourney = journey.map(step => ({
    id: step.id,
    title: step.title,
    description: step.description,
    status: step.status,
    icon: step.icon,
    imagem_url: step.image,
    requirements: step.requirements,
    reward: step.reward,
    content: step.content
  }));

  const { error } = await supabase
    .from('coffee_journey')
    .upsert(formattedJourney);

  if (error) {
    console.error('Error seeding journey:', error.message);
    throw error;
  }
};
