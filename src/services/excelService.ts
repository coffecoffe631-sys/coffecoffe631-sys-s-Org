import * as XLSX from 'xlsx';
import { Recipe, Ingredient, Step, WeatherCondition, Category, Difficulty } from '../data/recipes';
import { parseIngredients, parseEquipment, parseSteps, parseWeatherSuitability } from './googleSheetsService';

export interface ExcelRecipeRow {
  nome: string;
  pais?: string;
  descricao?: string;
  imagem_url?: string;
  categoria?: string;
  tempo_preparo?: string;
  dificuldade?: string;
  ingredientes?: string;
  equipamentos?: string;
  modo_preparo?: string;
  clima_adequado?: string;
}

export function exportRecipesToExcel(recipes: Recipe[], filename: string = 'receitas_do_cafe.xlsx') {
  const data = recipes.map(r => ({
    'Nome': r.name || '',
    'País': r.country || 'Brasil',
    'Descrição': r.description || '',
    'Imagem URL': r.image || '',
    'Categoria': r.category || 'Specialty',
    'Tempo de Preparo': r.prepTime || '5 min',
    'Dificuldade': r.difficulty || 'Easy',
    'Ingredientes': (r.detailedIngredients || []).map(i => `${i.name}${i.amount ? ` (${i.amount})` : ''}`).join('; '),
    'Equipamentos': (r.equipment || []).join('; '),
    'Modo de Preparo': (r.steps || []).map((s, idx) => `${idx + 1}. ${s.title ? s.title + ': ' : ''}${s.description}`).join('\n'),
    'Clima Adequado': (r.weatherSuitability || []).join(', ')
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Receitas');

  // Generate binary and download
  XLSX.writeFile(workbook, filename);
}

export function downloadExcelTemplate() {
  const recipesTemplate = [
    {
      'nome': 'Café Coado Especial',
      'pais': 'Brasil',
      'descricao': 'Um café suave e aromático preparado no filtro V60.',
      'imagem_url': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1000',
      'categoria': 'Specialty',
      'tempo_preparo': '5 min',
      'dificuldade': 'Easy',
      'ingredientes': 'Café especial moído médio (20g); Água filtrada aquecida (300ml)',
      'equipamentos': 'Filtro V60; Chaleira com bico de ganso; Balança',
      'modo_preparo': '1. Escalfe o filtro com água quente.\n2. Adicione 20g de café e faça pré-infusão de 40s com 50ml de água.\n3. Despeje o restante da água em círculos até atingir 300ml.',
      'clima_adequado': 'hot, cold, neutral'
    },
    {
      'nome': 'Pão de Queijo Mineiro',
      'pais': 'Brasil',
      'descricao': 'Pão de queijo quentinho e crocante por fora e macio por dentro.',
      'imagem_url': 'https://images.unsplash.com/photo-1598142773945-f4820898516c?q=80&w=1000',
      'categoria': 'Pães & Salgados',
      'tempo_preparo': '30 min',
      'dificuldade': 'Easy',
      'ingredientes': 'Polvilho azedo (500g); Queijo canastra ralado (300g); Leite (200ml); Óleo (100ml); Ovos (2 unidades); Sal (1 colher de chá)',
      'equipamentos': 'Forno; Bacia; Assadeira',
      'modo_preparo': '1. Ferva o leite com o óleo e o sal e escalde o polvilho.\n2. Espere esfriar, adicione os ovos e o queijo e sove bem.\n3. Faça bolinhas e asse a 200°C por 25 minutos.',
      'clima_adequado': 'hot, cold, neutral'
    }
  ];

  const journeyTemplate = [
    {
      'step': 1,
      'titulo': 'O Despertar do Grão',
      'subtitulo': 'Sua jornada começa aqui',
      'descricao': 'Aprenda sobre a origem dos grãos e como escolher o café perfeito para seu paladar.',
      'imagem_url': 'https://images.unsplash.com/photo-1495474472251-094c1f60f64c?w=1200&auto=format&fit=crop&q=80',
      'dica_barista': 'Grãos 100% Arábica de altitude costumam ser mais suaves e aromáticos.',
      'tempo_leitura': '3 min',
      'icone': 'Leaf',
      'status': 'completed'
    },
    {
      'step': 2,
      'titulo': 'Mestre da Extração',
      'subtitulo': 'Domine a arte do equilíbrio',
      'descricao': 'Aprenda como a temperatura da água e o tempo de infusão mudam o sabor da xícara.',
      'imagem_url': 'https://images.unsplash.com/photo-1459756263433-2c026e4a5541?w=1200&auto=format&fit=crop&q=80',
      'dica_barista': 'Água ideal fica entre 92°C e 96°C. Não use água fervendo para não queimar o café.',
      'tempo_leitura': '4 min',
      'icone': 'Droplets',
      'status': 'current'
    }
  ];

  const workbook = XLSX.utils.book_new();
  const wsRecipes = XLSX.utils.json_to_sheet(recipesTemplate);
  const wsJourney = XLSX.utils.json_to_sheet(journeyTemplate);

  XLSX.utils.book_append_sheet(workbook, wsRecipes, 'receitas_cafe');
  XLSX.utils.book_append_sheet(workbook, wsJourney, 'jornada_do_cafe');

  XLSX.writeFile(workbook, 'modelo_importacao_planilha_cafe.xlsx');
}

export async function parseExcelOrCsvFile(file: File): Promise<Omit<Recipe, 'id'>[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const parsedRecipes: Omit<Recipe, 'id'>[] = [];

  for (const row of jsonRows) {
    // Standardize column keys (lowercase and stripped accents or trimmed)
    const normalizedRow: Record<string, any> = {};
    Object.keys(row).forEach(key => {
      const cleanKey = key.trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_");
      normalizedRow[cleanKey] = row[key];
    });

    const name = normalizedRow['nome'] || normalizedRow['nome_da_receita'] || normalizedRow['name'] || normalizedRow['receita'] || '';
    if (!name || typeof name !== 'string' || name.trim() === '') continue;

    const country = normalizedRow['pais'] || normalizedRow['country'] || 'Brasil';
    const description = normalizedRow['descricao'] || normalizedRow['description'] || '';
    const image = normalizedRow['imagem_url'] || normalizedRow['imagem'] || normalizedRow['image_url'] || normalizedRow['image'] || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=1000&auto=format&fit=crop';
    
    // Category mapping
    let categoryRaw = normalizedRow['categoria'] || normalizedRow['category'] || 'Specialty';
    let category: Category = 'Specialty';
    const catLower = String(categoryRaw).toLowerCase();
    if (catLower.includes('paes') || catLower.includes('salgado') || catLower.includes('bread')) category = 'Pães & Salgados';
    else if (catLower.includes('bolo') || catLower.includes('cake')) category = 'Bolos';
    else if (catLower.includes('biscoito') || catLower.includes('doce') || catLower.includes('cookie')) category = 'Biscoitos & Doces';
    else if (catLower.includes('espresso')) category = 'Espresso';
    else if (catLower.includes('latte')) category = 'Latte';
    else if (catLower.includes('cappuccino')) category = 'Cappuccino';
    else if (catLower.includes('cold brew')) category = 'Cold Brew';
    else category = 'Specialty';

    const prepTime = String(normalizedRow['tempo_de_preparo'] || normalizedRow['tempo_preparo'] || normalizedRow['prep_time'] || '5 min');
    
    // Difficulty
    let diffRaw = String(normalizedRow['dificuldade'] || normalizedRow['difficulty'] || 'Easy').toLowerCase();
    let difficulty: Difficulty = 'Easy';
    if (diffRaw.includes('méd') || diffRaw.includes('med')) difficulty = 'Medium';
    else if (diffRaw.includes('dif') || diffRaw.includes('hard') || diffRaw.includes('difícil')) difficulty = 'Hard';

    // Ingredients parsing
    const rawIngsStr = normalizedRow['ingredientes'] || normalizedRow['ingredients'] || '';
    const { detailedIngredients, ingredients: summaryIngredients } = parseIngredients(rawIngsStr);

    // Equipment
    const rawEqStr = normalizedRow['equipamentos'] || normalizedRow['equipment'] || '';
    const equipment = parseEquipment(rawEqStr);

    // Steps
    const rawStepsStr = normalizedRow['modo_de_preparo'] || normalizedRow['modo_preparo'] || normalizedRow['steps'] || '';
    const steps = parseSteps(rawStepsStr);

    // Weather
    const rawWeather = normalizedRow['clima_adequado'] || normalizedRow['clima'] || normalizedRow['weather_suitability'];
    const weatherSuitability = parseWeatherSuitability(rawWeather);

    parsedRecipes.push({
      name: name.trim(),
      country: country.trim(),
      description: description.trim(),
      image: image.trim(),
      category,
      prepTime,
      difficulty,
      ingredients: summaryIngredients,
      detailedIngredients,
      equipment,
      steps,
      weatherSuitability
    });
  }

  return parsedRecipes;
}
