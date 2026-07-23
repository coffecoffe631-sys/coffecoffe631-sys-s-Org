import { supabase } from '../lib/supabase';
import { Recipe, Ingredient, Step } from '../data/recipes';
import { JourneyStep } from '../data/journey';

// Helper to check if an error is due to a missing table/relation
const isTableMissingError = (error: any): boolean => {
  if (!error) return false;
  const message = error.message?.toLowerCase() || '';
  const code = error.code;
  return code === '42P01' || code === 'PGRST205' || message.includes('does not exist') || message.includes('not found') || message.includes('relation') || message.includes('could not find');
};

let resolvedRecipesTable: string | null = null;
export const getRecipesTableName = async (): Promise<string> => {
  if (resolvedRecipesTable) return resolvedRecipesTable;
  try {
    const { error } = await supabase.from('receitas_café').select('id').limit(1);
    if (isTableMissingError(error)) {
      resolvedRecipesTable = 'receitas_cafe';
    } else {
      resolvedRecipesTable = 'receitas_café';
    }
  } catch {
    resolvedRecipesTable = 'receitas_cafe';
  }
  return resolvedRecipesTable;
};

let resolvedJourneyTable: string | null = null;
export const getJourneyTableName = async (): Promise<string> => {
  if (resolvedJourneyTable) return resolvedJourneyTable;
  try {
    const { error } = await supabase.from('jornada_do_café').select('id').limit(1);
    if (isTableMissingError(error)) {
      const { error: err2 } = await supabase.from('coffee_journey').select('id').limit(1);
      if (isTableMissingError(err2)) {
        resolvedJourneyTable = 'jornada_cafe';
      } else {
        resolvedJourneyTable = 'coffee_journey';
      }
    } else {
      resolvedJourneyTable = 'jornada_do_café';
    }
  } catch {
    resolvedJourneyTable = 'coffee_journey';
  }
  return resolvedJourneyTable;
};

let resolvedLogoTable: string | null = null;
export const getLogoTableName = async (): Promise<string> => {
  if (resolvedLogoTable) return resolvedLogoTable;
  try {
    const { error } = await supabase.from('logotipo_do_café').select('id').limit(1);
    if (isTableMissingError(error)) {
      const { error: err2 } = await supabase.from('configurações_do_aplicativo').select('id').limit(1);
      if (isTableMissingError(err2)) {
        resolvedLogoTable = 'app_settings';
      } else {
        resolvedLogoTable = 'configurações_do_aplicativo';
      }
    } else {
      resolvedLogoTable = 'logotipo_do_café';
    }
  } catch {
    resolvedLogoTable = 'app_settings';
  }
  return resolvedLogoTable;
};

export const fetchRecipesFromSupabase = async (): Promise<Recipe[]> => {
  const tableName = await getRecipesTableName();
  const { data, error } = await supabase
    .from(tableName)
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
      ? item.ingredientes.map((i: any) => typeof i === 'string' ? i : (i.name || i.nome || i.ingrediente || '')).filter(Boolean) 
      : [],
    equipment: Array.isArray(item.equipamentos) ? item.equipamentos.filter(Boolean) : [],
    detailedIngredients: Array.isArray(item.ingredientes) ? item.ingredientes.map((i: any) => ({
      name: typeof i === 'string' ? i : (i.name || i.nome || i.ingrediente || i.item || ''),
      amount: typeof i === 'string' ? '' : (i.amount || i.quantidade || i.qtd || i.porcao || ''),
      icon: typeof i === 'string' ? undefined : (i.icon || i.icone)
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
  const tableName = await getRecipesTableName();
  const { data, error } = await supabase
    .from(tableName)
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
  const tableName = await getRecipesTableName();
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const updateRecipeInSupabase = async (id: string, recipe: Partial<Recipe>) => {
  const tableName = await getRecipesTableName();
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
    .from(tableName)
    .update(updateData)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data;
};

export const seedRecipes = async (recipes: Recipe[]) => {
  const tableName = await getRecipesTableName();
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
    .from(tableName)
    .insert(formattedRecipes)
    .select();

  if (error) throw error;
  return data;
};

export const fetchAppLogo = async (): Promise<string | null> => {
  return fetchSettingsKey('app_logo');
};

export const updateAppLogo = async (logoBase64: string) => {
  return updateSettingsKey('app_logo', logoBase64);
};

export const fetchSettingsKey = async (key: string): Promise<string | null> => {
  try {
    const tableName = await getLogoTableName();

    // Try 1: 'id' column
    const { data: d1, error: e1 } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', key)
      .maybeSingle();

    if (!e1 && d1) {
      return d1.value || d1.valor || d1.dados || null;
    }

    // Try 2: 'key' column
    const { data: d2, error: e2 } = await supabase
      .from(tableName)
      .select('*')
      .eq('key', key)
      .maybeSingle();

    if (!e2 && d2) {
      return d2.value || d2.valor || d2.dados || null;
    }

    // Try 3: 'chave' column
    const { data: d3, error: e3 } = await supabase
      .from(tableName)
      .select('*')
      .eq('chave', key)
      .maybeSingle();

    if (!e3 && d3) {
      return d3.value || d3.valor || d3.dados || null;
    }

    return null;
  } catch (err) {
    console.error(`Error in fetchSettingsKey (${key}):`, err);
    return null;
  }
};

export const updateSettingsKey = async (key: string, value: string) => {
  try {
    const tableName = await getLogoTableName();

    // Try 1: upsert with 'id' column
    const { error: e1 } = await supabase
      .from(tableName)
      .upsert({ id: key, value }, { onConflict: 'id' });

    if (!e1) return;

    // Try 2: upsert with 'key' column
    const { error: e2 } = await supabase
      .from(tableName)
      .upsert({ key, value }, { onConflict: 'key' });

    if (!e2) return;

    // Try 3: upsert with 'chave' column
    const { error: e3 } = await supabase
      .from(tableName)
      .upsert({ chave: key, valor: value }, { onConflict: 'chave' });

    if (!e3) return;

    // Try 4: direct update
    const { error: e4 } = await supabase
      .from(tableName)
      .update({ value })
      .eq('id', key);

    if (e4) {
      console.warn(`Could not update settings key '${key}' in Supabase:`, e1?.message || e2?.message || e3?.message || e4?.message);
    }
  } catch (err) {
    console.error(`Error in updateSettingsKey (${key}):`, err);
  }
};

// Journey Services
export const fetchJourneyFromSupabase = async (): Promise<JourneyStep[]> => {
  try {
    const tableName = await getJourneyTableName();
    const { data, error } = await supabase
      .from(tableName)
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

  const tableName = await getJourneyTableName();
  const { error } = await supabase
    .from(tableName)
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

  const tableName = await getJourneyTableName();
  const { data, error } = await supabase
    .from(tableName)
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
    console.error('Error inserting journey step:', error.message);
    throw error;
  }
  return data;
};

export const deleteJourneyStepFromSupabase = async (id: string) => {
  const tableName = await getJourneyTableName();
  const { error } = await supabase
    .from(tableName)
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

  const tableName = await getJourneyTableName();
  const { error } = await supabase
    .from(tableName)
    .upsert(formattedJourney);

  if (error) {
    console.error('Error seeding journey:', error.message);
    throw error;
  }
};
