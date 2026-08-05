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
  const candidates = ['receitas_cafe', 'receitas_café', 'receitas', 'recipes'];
  for (const table of candidates) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (!isTableMissingError(error)) {
        resolvedRecipesTable = table;
        return table;
      }
    } catch {
      // ignore and try next candidate
    }
  }
  resolvedRecipesTable = 'receitas_cafe';
  return resolvedRecipesTable;
};

let resolvedJourneyTable: string | null = null;
export const getJourneyTableName = async (): Promise<string> => {
  if (resolvedJourneyTable) return resolvedJourneyTable;
  const candidates = ['jornada_do_cafelo', 'jornada_do_cafe', 'jornada_do_café', 'jornada_cafe', 'coffee_journey'];
  for (const table of candidates) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (!isTableMissingError(error)) {
        resolvedJourneyTable = table;
        return table;
      }
    } catch {
      // ignore and try next candidate
    }
  }
  resolvedJourneyTable = 'jornada_do_cafelo';
  return resolvedJourneyTable;
};

let resolvedLogoTable: string | null = null;
export const getLogoTableName = async (): Promise<string> => {
  if (resolvedLogoTable) return resolvedLogoTable;
  const candidates = ['configuracoes_do_aplicativo', 'logotipo_de_cafe', 'logotipo_do_café', 'configurações_do_aplicativo', 'app_settings'];
  for (const table of candidates) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (!isTableMissingError(error)) {
        resolvedLogoTable = table;
        return table;
      }
    } catch {
      // ignore and try next candidate
    }
  }
  resolvedLogoTable = 'configuracoes_do_aplicativo';
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

  if (!data || !Array.isArray(data)) return [];

  // Map Supabase data to our Recipe interface flexibly across schema languages
  return data.map((item: any) => {
    const rawIngredients = item.ingredientes || item.ingredients || item.ingrediente || [];
    const rawEquipment = item.equipamentos || item.equipment || item.equipamento || [];
    const rawSteps = item.modo_preparo || item.modo_de_preparo || item.steps || item.preparo || item.instrucoes || [];

    const parsedIngredients = Array.isArray(rawIngredients) 
      ? rawIngredients.map((i: any) => typeof i === 'string' ? i : (i.name || i.nome || i.ingrediente || i.item || '')).filter(Boolean) 
      : [];

    const parsedDetailedIngredients = Array.isArray(rawIngredients) 
      ? rawIngredients.map((i: any) => ({
          name: typeof i === 'string' ? i : (i.name || i.nome || i.ingrediente || i.item || ''),
          amount: typeof i === 'string' ? '' : (i.amount || i.quantidade || i.qtd || i.porcao || ''),
          icon: typeof i === 'string' ? undefined : (i.icon || i.icone)
        })).filter(i => i.name) 
      : [];

    const parsedEquipment = Array.isArray(rawEquipment) 
      ? rawEquipment.map((eq: any) => typeof eq === 'string' ? eq : (eq.name || eq.nome || '')).filter(Boolean) 
      : [];

    const parsedSteps = Array.isArray(rawSteps) 
      ? rawSteps.map((s: any) => ({
          title: s.title || s.titulo || s.step || '',
          description: s.description || s.descricao || s.instrucao || (typeof s === 'string' ? s : ''),
          image: s.image || s.imagem || s.foto || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1000&auto=format&fit=crop'
        })) 
      : [];

    return {
      id: (item.id !== undefined && item.id !== null) ? item.id.toString() : (item.id_receita || Math.random().toString()),
      name: item.nome || item.name || item.title || item.nome_receita || 'Receita sem nome',
      country: item.pais || item.country || 'Brasil',
      description: item.descricao || item.description || item.desc || '',
      image: item.imagem_url || item.image_url || item.image || item.foto_url || item.foto || item.imagem || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=1000&auto=format&fit=crop',
      ingredients: parsedIngredients,
      equipment: parsedEquipment,
      detailedIngredients: parsedDetailedIngredients,
      steps: parsedSteps,
      weatherSuitability: item.clima_adequado || item.weather_suitability || item.clima || ['neutral'],
      category: item.categoria || item.category || 'Specialty',
      difficulty: item.dificuldade || item.difficulty || 'Medium',
      prepTime: item.tempo_preparo || item.prep_time || item.time || '5 min'
    };
  });
};

export const insertRecipeToSupabase = async (recipe: Omit<Recipe, 'id'>) => {
  const tableName = await getRecipesTableName();
  const ptPayload = {
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
  };

  const { data, error } = await supabase
    .from(tableName)
    .insert([ptPayload])
    .select();

  if (!error) return data;

  if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
    const enPayload = {
      name: recipe.name,
      country: recipe.country,
      description: recipe.description,
      image_url: recipe.image,
      category: recipe.category,
      prep_time: recipe.prepTime,
      difficulty: recipe.difficulty,
      ingredients: recipe.detailedIngredients,
      steps: recipe.steps,
      equipment: recipe.equipment,
      weather_suitability: recipe.weatherSuitability
    };
    const { data: enData, error: enError } = await supabase
      .from(tableName)
      .insert([enPayload])
      .select();

    if (!enError) return enData;
    throw enError;
  }

  throw error;
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
  const updatePt: any = {};
  
  if (recipe.name !== undefined) updatePt.nome = recipe.name;
  if (recipe.country !== undefined) updatePt.pais = recipe.country;
  if (recipe.description !== undefined) updatePt.descricao = recipe.description;
  if (recipe.image !== undefined) updatePt.imagem_url = recipe.image;
  if (recipe.category !== undefined) updatePt.categoria = recipe.category;
  if (recipe.prepTime !== undefined) updatePt.tempo_preparo = recipe.prepTime;
  if (recipe.difficulty !== undefined) updatePt.dificuldade = recipe.difficulty;
  if (recipe.detailedIngredients !== undefined) updatePt.ingredientes = recipe.detailedIngredients;
  if (recipe.steps !== undefined) updatePt.modo_preparo = recipe.steps;
  if (recipe.equipment !== undefined) updatePt.equipamentos = recipe.equipment;
  if (recipe.weatherSuitability !== undefined) updatePt.clima_adequado = recipe.weatherSuitability;

  const { data, error } = await supabase
    .from(tableName)
    .update(updatePt)
    .eq('id', id)
    .select();

  if (!error) return data;

  if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
    const updateEn: any = {};
    if (recipe.name !== undefined) updateEn.name = recipe.name;
    if (recipe.country !== undefined) updateEn.country = recipe.country;
    if (recipe.description !== undefined) updateEn.description = recipe.description;
    if (recipe.image !== undefined) updateEn.image_url = recipe.image;
    if (recipe.category !== undefined) updateEn.category = recipe.category;
    if (recipe.prepTime !== undefined) updateEn.prep_time = recipe.prepTime;
    if (recipe.difficulty !== undefined) updateEn.difficulty = recipe.difficulty;
    if (recipe.detailedIngredients !== undefined) updateEn.ingredients = recipe.detailedIngredients;
    if (recipe.steps !== undefined) updateEn.steps = recipe.steps;
    if (recipe.equipment !== undefined) updateEn.equipment = recipe.equipment;
    if (recipe.weatherSuitability !== undefined) updateEn.weather_suitability = recipe.weatherSuitability;

    const { data: enData, error: enError } = await supabase
      .from(tableName)
      .update(updateEn)
      .eq('id', id)
      .select();

    if (!enError) return enData;
    throw enError;
  }

  throw error;
};

export const seedRecipes = async (recipes: Recipe[]) => {
  const tableName = await getRecipesTableName();
  const formattedRecipesPt = recipes.map(recipe => ({
    nome: recipe.name,
    pais: recipe.country || 'Brasil',
    descricao: recipe.description || '',
    imagem_url: recipe.image || '',
    categoria: recipe.category || 'Specialty',
    tempo_preparo: recipe.prepTime || '5 min',
    dificuldade: recipe.difficulty || 'Medium',
    ingredientes: recipe.detailedIngredients || [],
    modo_preparo: recipe.steps || [],
    equipamentos: recipe.equipment || [],
    clima_adequado: recipe.weatherSuitability || ['hot', 'cold', 'neutral']
  }));

  // Try upserting on conflict 'nome' or 'id'
  const { data: upsertData, error: upsertError } = await supabase
    .from(tableName)
    .upsert(formattedRecipesPt, { onConflict: 'nome' })
    .select();

  if (!upsertError) return upsertData;

  // Fallback to simple insert
  const { data, error } = await supabase
    .from(tableName)
    .insert(formattedRecipesPt)
    .select();

  if (!error) return data;

  if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
    const formattedRecipesEn = recipes.map(recipe => ({
      name: recipe.name,
      country: recipe.country,
      description: recipe.description,
      image_url: recipe.image,
      category: recipe.category,
      prep_time: recipe.prepTime,
      difficulty: recipe.difficulty,
      ingredients: recipe.detailedIngredients,
      steps: recipe.steps,
      equipment: recipe.equipment,
      weather_suitability: recipe.weatherSuitability
    }));
    const { data: enData, error: enError } = await supabase
      .from(tableName)
      .insert(formattedRecipesEn)
      .select();

    if (!enError) return enData;
    throw enError;
  }

  throw error;
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
