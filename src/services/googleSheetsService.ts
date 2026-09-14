import * as XLSX from 'xlsx';
import { Recipe, Ingredient, Step, Category, Difficulty, WeatherCondition } from '../data/recipes';
import { JourneyStep } from '../data/journey';

export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return input.trim();
}

export interface GoogleSheetsData {
  receitas_cafe: Recipe[];
  jornada_do_cafe: JourneyStep[];
  logotipo_de_cafe: string;
  configuracoes_do_aplicativo: Record<string, any>;
}

/**
 * Robust ingredient parser for JSON arrays, text lines, separated lists
 */
export function parseIngredients(rawInput: any): {
  detailedIngredients: Ingredient[];
  ingredients: string[];
} {
  if (!rawInput) return { detailedIngredients: [], ingredients: [] };

  if (Array.isArray(rawInput)) {
    const detailed = rawInput.map(item => {
      if (typeof item === 'object' && item !== null) {
        const name = String(item.name || item.nome || item.ingrediente || item.item || '').trim();
        const amount = String(item.amount || item.quantidade || item.qtd || item.medida || '').trim();
        return { name, amount };
      }
      return parseSingleIngredientString(String(item));
    }).filter(i => i.name.length > 0);

    return {
      detailedIngredients: detailed,
      ingredients: detailed.map(i => i.amount ? `${i.name} (${i.amount})` : i.name)
    };
  }

  const str = String(rawInput).trim();
  if (!str) return { detailedIngredients: [], ingredients: [] };

  if (str.startsWith('[') || str.startsWith('{')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parseIngredients(parsed);
      } else if (typeof parsed === 'object' && parsed !== null) {
        const possibleArray = parsed.ingredients || parsed.ingredientes || parsed.items || parsed.itens || Object.values(parsed);
        if (Array.isArray(possibleArray)) {
          return parseIngredients(possibleArray);
        }
      }
    } catch (e) {}
  }

  let items: string[] = [];
  if (str.includes('\n')) {
    items = str.split('\n');
  } else if (str.includes(';')) {
    items = str.split(';');
  } else if (str.includes('|')) {
    items = str.split('|');
  } else {
    items = str.split(',');
  }

  const detailed = items
    .map(s => s.trim())
    .filter(Boolean)
    .map(parseSingleIngredientString)
    .filter(i => i.name.length > 0);

  return {
    detailedIngredients: detailed,
    ingredients: detailed.map(i => i.amount ? `${i.name} (${i.amount})` : i.name)
  };
}

function parseSingleIngredientString(s: string): Ingredient {
  let clean = s.replace(/^[•\-\*\d+\.]\s*/, '').trim();
  if (!clean) return { name: '', amount: '' };

  const parenMatch = clean.match(/^(.*?)\s*\((.*?)\)$/);
  if (parenMatch) {
    return { name: parenMatch[1].trim(), amount: parenMatch[2].trim() };
  }

  const colonMatch = clean.match(/^(.*?)\s*[:\-]\s*(\d+.*)$/);
  if (colonMatch) {
    return { name: colonMatch[1].trim(), amount: colonMatch[2].trim() };
  }

  const deMatch = clean.match(/^(\d+[\w\s\/]*)\s+de\s+(.*)$/i);
  if (deMatch) {
    return { name: deMatch[2].trim(), amount: deMatch[1].trim() };
  }

  return { name: clean, amount: '' };
}

/**
 * Robust equipment parser
 */
export function parseEquipment(rawInput: any): string[] {
  if (!rawInput) return [];

  if (Array.isArray(rawInput)) {
    return rawInput.map(i => {
      if (typeof i === 'object' && i !== null) {
        return String(i.name || i.nome || i.equipamento || i.item || '').trim();
      }
      return String(i).trim();
    }).filter(Boolean);
  }

  const str = String(rawInput).trim();
  if (!str) return [];

  if (str.startsWith('[') || str.startsWith('{')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parseEquipment(parsed);
      } else if (typeof parsed === 'object' && parsed !== null) {
        const possibleArray = parsed.equipment || parsed.equipamentos || parsed.items || parsed.itens || Object.values(parsed);
        if (Array.isArray(possibleArray)) {
          return parseEquipment(possibleArray);
        }
      }
    } catch (e) {}
  }

  let items: string[] = [];
  if (str.includes('\n')) {
    items = str.split('\n');
  } else if (str.includes(';')) {
    items = str.split(';');
  } else if (str.includes('|')) {
    items = str.split('|');
  } else {
    items = str.split(',');
  }

  return items
    .map(s => s.replace(/^[•\-\*\d+\.]\s*/, '').trim())
    .filter(Boolean);
}

/**
 * Extracts embedded image URLs from step text
 */
function extractImageUrlFromText(text: string): { cleanText: string; imageUrl?: string } {
  const urlRegex = /(https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif|svg)(\?[^\s"'<>]*)?|https?:\/\/images\.unsplash\.com\/[^\s"'<>]+)/i;
  const match = text.match(urlRegex);

  if (match) {
    const imageUrl = match[0];
    let cleanText = text
      .replace(/\[?(?:Imagem|Image|Foto):\s*https?:\/\/[^\s"'<>]+\]?/gi, '')
      .replace(urlRegex, '')
      .trim();

    return { cleanText, imageUrl };
  }

  return { cleanText: text };
}

/**
 * Robust step parser separating title, description, image, and barista tip
 */
export function parseSteps(rawInput: any): Step[] {
  if (!rawInput) return [];

  if (Array.isArray(rawInput)) {
    return rawInput.map((s, idx) => {
      if (typeof s === 'object' && s !== null) {
        let title = s.title || s.titulo || s.passo || s.nome || `Passo ${idx + 1}`;
        let description = s.description || s.descricao || s.instrucoes || s.text || s.texto || '';
        let image = s.image || s.imageUrl || s.imagem || s.imagem_url || s.foto || '';
        let tip = s.baristaTip || s.barista_tip || s.dica || s.truque || s.dica_barista || '';

        const extracted = extractImageUrlFromText(description);
        if (extracted.imageUrl && !image) {
          image = extracted.imageUrl;
          description = extracted.cleanText;
        }

        if (tip && !description.toLowerCase().includes('dica') && !description.toLowerCase().includes('truque')) {
          description += `\n\n💡 Truque do Barista: ${tip}`;
        }

        return { title, description, image: image || undefined };
      }
      return parseSingleStepString(String(s), idx);
    });
  }

  const str = String(rawInput).trim();
  if (!str) return [];

  if (str.startsWith('[') || str.startsWith('{')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parseSteps(parsed);
      } else if (typeof parsed === 'object' && parsed !== null) {
        const possibleArray = parsed.steps || parsed.modo_preparo || parsed.modo_de_preparo || parsed.passos || Object.values(parsed);
        if (Array.isArray(possibleArray)) {
          return parseSteps(possibleArray);
        }
      }
    } catch (e) {}
  }

  let stepBlocks: string[] = [];
  if (str.includes('\n\n')) {
    stepBlocks = str.split(/\n\s*\n/);
  } else if (str.includes('\n')) {
    stepBlocks = str.split('\n');
  } else if (str.includes(';')) {
    stepBlocks = str.split(';');
  } else if (str.includes('|')) {
    stepBlocks = str.split('|');
  } else {
    stepBlocks = [str];
  }

  return stepBlocks
    .map((block, idx) => parseSingleStepString(block, idx))
    .filter(s => s.description.length > 0 || s.title.length > 0);
}

function parseSingleStepString(raw: string, index: number): Step {
  let clean = raw.trim();
  if (!clean) return { title: `Passo ${index + 1}`, description: '' };

  const { cleanText, imageUrl } = extractImageUrlFromText(clean);
  clean = cleanText;

  let title = `Passo ${index + 1}`;
  let description = clean;

  const prefixMatch = clean.match(/^(?:Passo\s*\d+|Step\s*\d+|\d+)[\.\-\:]\s*/i);
  if (prefixMatch) {
    clean = clean.substring(prefixMatch[0].length).trim();
  }

  const colonIndex = clean.indexOf(':');
  const dashIndex = clean.indexOf(' - ');

  if (colonIndex > 0 && colonIndex < 40) {
    title = clean.substring(0, colonIndex).trim();
    description = clean.substring(colonIndex + 1).trim();
  } else if (dashIndex > 0 && dashIndex < 40) {
    title = clean.substring(0, dashIndex).trim();
    description = clean.substring(dashIndex + 3).trim();
  } else {
    description = clean;
  }

  return {
    title: title || `Passo ${index + 1}`,
    description,
    image: imageUrl
  };
}

export function parseWeatherSuitability(rawInput: any): WeatherCondition[] {
  if (!rawInput) return ['hot', 'cold', 'neutral'];
  let list: string[] = [];
  if (Array.isArray(rawInput)) {
    list = rawInput.map(String);
  } else {
    const str = String(rawInput).trim();
    if (str.startsWith('[')) {
      try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) list = parsed.map(String);
      } catch (e) {}
    } else {
      list = str.split(/[,;|\n]/).map(s => s.trim()).filter(Boolean);
    }
  }

  if (list.length === 0) return ['hot', 'cold', 'neutral'];

  const mapped: WeatherCondition[] = [];
  list.forEach(item => {
    const lower = item.toLowerCase();
    if (lower.includes('quente') || lower.includes('hot')) mapped.push('hot');
    else if (lower.includes('frio') || lower.includes('cold') || lower.includes('gelado')) mapped.push('cold');
    else if (lower.includes('neutro') || lower.includes('neutral') || lower.includes('ameno')) mapped.push('neutral');
  });

  return mapped.length > 0 ? Array.from(new Set(mapped)) : ['hot', 'cold', 'neutral'];
}

/**
 * Normalizes category from Portuguese/English variations to Category union
 */
export function parseCategory(raw: string): Category {
  const s = String(raw || '').toLowerCase().trim();
  if (s.includes('especial') || s.includes('specialty')) return 'Specialty';
  if (s.includes('clássic') || s.includes('classic') || s.includes('tradicional')) return 'Classics';
  if (s.includes('frio') || s.includes('gelad') || s.includes('cold') || s.includes('iced') || s.includes('refresc')) return 'Cold';
  if (s.includes('doce') || s.includes('sobremesa') || s.includes('dessert') || s.includes('sweet')) return 'Dessert';
  if (s.includes('quente') || s.includes('hot')) return 'Hot';
  return 'Specialty';
}

/**
 * Normalizes difficulty from Portuguese/English variations to Difficulty union
 */
export function parseDifficulty(raw: string): Difficulty {
  const s = String(raw || '').toLowerCase().trim();
  if (s.includes('difícil') || s.includes('dificil') || s.includes('hard') || s.includes('avançad') || s.includes('complex')) return 'Hard';
  if (s.includes('médio') || s.includes('medio') || s.includes('medium') || s.includes('moderado') || s.includes('intermediári')) return 'Medium';
  return 'Easy';
}

/**
 * Normalizes header keys by stripping accents, symbols, spaces, and punctuation
 */
function normalizeHeaderKey(key: string): string {
  return String(key || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9]/g, ''); // remove underscores, hífens, espaços, etc.
}

/**
 * Dictionary of field aliases mapping to canonical fields
 */
const RECIPE_FIELD_ALIASES: Record<string, string[]> = {
  name: [
    'nome', 'name', 'receita', 'nomereceita', 'titulo', 'titulodareceita', 'bebidanome', 'nomedabebida', 'item', 'cafe', 'nomecafe'
  ],
  country: [
    'pais', 'country', 'origem', 'nacao', 'regiao', 'procedencia', 'ondeveio'
  ],
  description: [
    'descricao', 'description', 'sobre', 'detalhes', 'resumo', 'apresentacao', 'textodescritivo', 'info'
  ],
  image: [
    'imagemurl', 'imagem', 'imageurl', 'image', 'foto', 'fotourl', 'linkimagem', 'urlimagem', 'fotodareceita', 'capa'
  ],
  category: [
    'categoria', 'category', 'tipo', 'tipodecafe', 'estilo', 'classificacao', 'grupo'
  ],
  prepTime: [
    'tempopreparo', 'tempodepreparo', 'preptime', 'tempo', 'duracao', 'minutos', 'tempototal'
  ],
  difficulty: [
    'dificuldade', 'difficulty', 'nivel', 'niveldificuldade', 'graudificuldade', 'grau'
  ],
  ingredients: [
    'ingredientes', 'ingredients', 'ingrediente', 'listadeingredientes', 'composicao', 'oquevai'
  ],
  equipment: [
    'equipamentos', 'equipment', 'equipamento', 'utensilios', 'utensilio', 'materiais', 'ferramentas', 'acessorios'
  ],
  steps: [
    'modopreparo', 'mododepreparo', 'steps', 'preparo', 'comofazer', 'passos', 'instrucoes', 'passoapasso', 'metodo', 'procedimento'
  ],
  weather: [
    'climaadequado', 'clima', 'tempoadequado', 'estacao', 'weather', 'temperaturaideal', 'ocasioes'
  ],
  yield: [
    'rendimento', 'rendimentoporcoes', 'porcoes', 'porcao', 'serve', 'yield', 'quantidadexicaras', 'xicaras', 'doses'
  ],
  history: [
    'historia', 'historiadareceita', 'origemhistorica', 'contexto', 'contextohistorico', 'history'
  ],
  baristaTip: [
    'dicabarista', 'dicadobarista', 'dica', 'truque', 'segredo', 'baristatip', 'tip', 'conselhodobarista'
  ],
  commonErrors: [
    'erroscomuns', 'errosafazer', 'cuidados', 'oquenaofazer', 'atencao', 'errosfrequentes', 'falhascomuns'
  ],
  howToServe: [
    'comoservir', 'sugestaodeservir', 'acompanhamentos', 'harmonizacao', 'servircom', 'apresentacaoideal'
  ],
  curiosity: [
    'curiosidade', 'curiosidades', 'sabiamais', 'fatocurioso', 'curiosity'
  ]
};

/**
 * Flexible extractor for any recipe row (supports object from XLSX, key-value maps, etc.)
 */
function extractValueFromRow(row: Record<string, any>, aliases: string[]): string {
  const rowKeys = Object.keys(row);
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeaderKey(alias);
    const matchedKey = rowKeys.find(rk => normalizeHeaderKey(rk) === normalizedAlias);
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
      const val = String(row[matchedKey]).trim();
      if (val) return val;
    }
  }
  return '';
}

/**
 * Converts a raw table row from any user spreadsheet into a standardized Recipe object
 */
export function mapRowToRecipe(row: Record<string, any>, index: number, prefix: string = 'sheet'): Recipe | null {
  const name = extractValueFromRow(row, RECIPE_FIELD_ALIASES.name);
  if (!name) return null;

  const rawIng = extractValueFromRow(row, RECIPE_FIELD_ALIASES.ingredients);
  const { detailedIngredients, ingredients } = parseIngredients(rawIng);

  const rawEq = extractValueFromRow(row, RECIPE_FIELD_ALIASES.equipment);
  const equipment = parseEquipment(rawEq);

  const rawSteps = extractValueFromRow(row, RECIPE_FIELD_ALIASES.steps);
  const steps = parseSteps(rawSteps);

  const rawWeather = extractValueFromRow(row, RECIPE_FIELD_ALIASES.weather);
  const weatherSuitability = parseWeatherSuitability(rawWeather);

  const category = parseCategory(extractValueFromRow(row, RECIPE_FIELD_ALIASES.category));
  const difficulty = parseDifficulty(extractValueFromRow(row, RECIPE_FIELD_ALIASES.difficulty));

  const prepTime = extractValueFromRow(row, RECIPE_FIELD_ALIASES.prepTime) || '5 min';
  const country = extractValueFromRow(row, RECIPE_FIELD_ALIASES.country) || 'Brasil';
  const description = extractValueFromRow(row, RECIPE_FIELD_ALIASES.description);
  const image = extractValueFromRow(row, RECIPE_FIELD_ALIASES.image) || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=1000';

  const recipeYield = extractValueFromRow(row, RECIPE_FIELD_ALIASES.yield);
  const history = extractValueFromRow(row, RECIPE_FIELD_ALIASES.history);
  const baristaTip = extractValueFromRow(row, RECIPE_FIELD_ALIASES.baristaTip);
  const commonErrors = extractValueFromRow(row, RECIPE_FIELD_ALIASES.commonErrors);
  const howToServe = extractValueFromRow(row, RECIPE_FIELD_ALIASES.howToServe);
  const curiosity = extractValueFromRow(row, RECIPE_FIELD_ALIASES.curiosity);

  const idVal = row['id'] || row['ID'] || `${prefix}-${index}`;

  return {
    id: String(idVal),
    name,
    country,
    description,
    image,
    category,
    prepTime,
    difficulty,
    ingredients,
    detailedIngredients,
    equipment,
    steps,
    weatherSuitability,
    yield: recipeYield || undefined,
    history: history || undefined,
    baristaTip: baristaTip || undefined,
    commonErrors: commonErrors || undefined,
    howToServe: howToServe || undefined,
    curiosity: curiosity || undefined
  };
}

// Helper to call Google Sheets API
async function sheetsApiFetch(endpoint: string, accessToken: string, options: RequestInit = {}) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Sheets API Error (${response.status}): ${errText}`);
  }

  return response.json();
}

export async function makeSpreadsheetPublic(
  spreadsheetId: string,
  accessToken: string
): Promise<boolean> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) return false;
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${cleanId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not set spreadsheet permissions to public automatically:', err);
    return false;
  }
}

/**
 * Creates a brand new Google Spreadsheet in Google Drive with the 4 requested tabs.
 */
export async function createCoffeeGoogleSheet(
  accessToken: string,
  initialData: {
    recipes: Recipe[];
    journey: JourneyStep[];
    logoUrl?: string;
    settings?: Record<string, any>;
  }
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // 1. Create spreadsheet structure
  const createRequestBody = {
    properties: {
      title: 'Cheirinho Mineiro - Base de Dados'
    },
    sheets: [
      { properties: { title: 'receitas_cafe' } },
      { properties: { title: 'jornada_do_cafe' } },
      { properties: { title: 'logotipo_de_cafe' } },
      { properties: { title: 'configuracoes_do_aplicativo' } }
    ]
  };

  const createdSheet = await sheetsApiFetch('', accessToken, {
    method: 'POST',
    body: JSON.stringify(createRequestBody)
  });

  const spreadsheetId = createdSheet.spreadsheetId;
  const spreadsheetUrl = createdSheet.spreadsheetUrl;

  // 2. Populate initial rows for each tab
  await syncDataToGoogleSheet(spreadsheetId, accessToken, initialData);

  // 3. Make the spreadsheet public so anyone without token can read it
  await makeSpreadsheetPublic(spreadsheetId, accessToken);

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Syncs current app data into a Google Sheet
 */
export async function syncDataToGoogleSheet(
  spreadsheetId: string,
  accessToken: string,
  data: {
    recipes: Recipe[];
    journey: JourneyStep[];
    logoUrl?: string;
    settings?: Record<string, any>;
  }
) {
  // --- Tab 1: receitas_cafe ---
  const recipeHeaders = ['id', 'nome', 'pais', 'descricao', 'imagem_url', 'categoria', 'tempo_preparo', 'dificuldade', 'ingredientes', 'equipamentos', 'modo_preparo', 'clima_adequado'];
  const recipeRows = data.recipes.map(r => [
    r.id || '',
    r.name || '',
    r.country || 'Brasil',
    r.description || '',
    r.image || '',
    r.category || '',
    r.prepTime || '5 min',
    r.difficulty || 'Easy',
    JSON.stringify(r.detailedIngredients || []),
    JSON.stringify(r.equipment || []),
    JSON.stringify(r.steps || []),
    JSON.stringify(r.weatherSuitability || ['hot', 'cold', 'neutral'])
  ]);

  // --- Tab 2: jornada_do_cafe ---
  const journeyHeaders = ['step', 'titulo', 'subtitulo', 'descricao', 'imagem_url', 'dica_barista', 'tempo_leitura', 'icone'];
  const journeyRows = data.journey.map(j => [
    j.step || 1,
    j.title || '',
    j.subtitle || '',
    j.description || '',
    j.imageUrl || '',
    j.baristaTip || '',
    j.readTime || '3 min',
    j.iconName || 'Coffee'
  ]);

  // --- Tab 3: logotipo_de_cafe ---
  const logoHeaders = ['chave', 'valor', 'atualizado_em'];
  const logoRows = [
    ['app_logo', data.logoUrl || '', new Date().toISOString()]
  ];

  // --- Tab 4: configuracoes_do_aplicativo ---
  const settingsHeaders = ['chave', 'valor_json'];
  const settingsRows = Object.entries(data.settings || {}).map(([key, val]) => [
    key,
    typeof val === 'string' ? val : JSON.stringify(val)
  ]);

  const valueRanges = [
    { range: 'receitas_cafe!A1', values: [recipeHeaders, ...recipeRows] },
    { range: 'jornada_do_cafe!A1', values: [journeyHeaders, ...journeyRows] },
    { range: 'logotipo_de_cafe!A1', values: [logoHeaders, ...logoRows] },
    { range: 'configuracoes_do_aplicativo!A1', values: [settingsHeaders, ...settingsRows] }
  ];

  await sheetsApiFetch(`/${spreadsheetId}/values:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: valueRanges
    })
  });

  // Ensure public access permission
  await makeSpreadsheetPublic(spreadsheetId, accessToken);
}

/**
 * Reads public Google Sheets tabs via published CSV endpoint (works without Google authentication)
 */
export async function readPublicGoogleSheetData(
  spreadsheetId: string
): Promise<Partial<GoogleSheetsData>> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) return {};

  const tabs = ['receitas_cafe', 'jornada_do_cafe', 'logotipo_de_cafe', 'configuracoes_do_aplicativo'];
  const result: Partial<GoogleSheetsData> = {};

  for (const tab of tabs) {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
      const response = await fetch(csvUrl);
      if (!response.ok) continue;

      const csvText = await response.text();
      if (!csvText || csvText.includes('<!DOCTYPE html>')) continue;

      const workbook = XLSX.read(csvText, { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) continue;
      const worksheet = workbook.Sheets[firstSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rows || rows.length === 0) continue;

      if (tab === 'receitas_cafe') {
        const recipes: Recipe[] = [];
        rows.forEach((row, idx) => {
          const mapped = mapRowToRecipe(row, idx, 'sheet-pub');
          if (mapped) recipes.push(mapped);
        });

        if (recipes.length > 0) {
          result.receitas_cafe = recipes;
        }
      } else if (tab === 'jornada_do_cafe') {
        const journey: JourneyStep[] = [];
        rows.forEach((row, idx) => {
          const getVal = (aliases: string[]) => extractValueFromRow(row, aliases);

          journey.push({
            id: `journey-pub-${idx}`,
            status: idx === 0 ? 'completed' : idx === 1 ? 'current' : 'locked',
            icon: getVal(['icone', 'icon', 'simbolo']) || 'Coffee',
            step: parseInt(getVal(['step', 'passo', 'etapa', 'ordem']) || String(idx + 1), 10),
            title: getVal(['titulo', 'title', 'nome', 'etapa']) || 'Etapa do Café',
            subtitle: getVal(['subtitulo', 'subtitle', 'fase']) || '',
            description: getVal(['descricao', 'description', 'sobre', 'texto', 'detalhes']) || '',
            imageUrl: getVal(['imagem_url', 'imagem', 'image_url', 'image', 'foto', 'link_imagem']) || '',
            baristaTip: getVal(['dica_barista', 'dicabarista', 'dica', 'truque', 'barista_tip']) || '',
            readTime: getVal(['tempo_leitura', 'tempo', 'tempodeleitura', 'duracao', 'read_time']) || '3 min',
            iconName: getVal(['icone', 'icon', 'simbolo']) || 'Coffee'
          });
        });

        if (journey.length > 0) {
          result.jornada_do_cafe = journey;
        }
      } else if (tab === 'logotipo_de_cafe') {
        const row = rows[0];
        if (row) {
          const logoVal = extractValueFromRow(row, ['valor', 'valor_url', 'app_logo', 'logo', 'logotipo', 'link', 'imagem', 'url']) || Object.values(row)[1] || Object.values(row)[0] || '';
          if (logoVal && String(logoVal).startsWith('http')) result.logotipo_de_cafe = String(logoVal);
        }
      } else if (tab === 'configuracoes_do_aplicativo') {
        const settings: Record<string, any> = {};
        rows.forEach(row => {
          const key = extractValueFromRow(row, ['chave', 'key', 'configuracao', 'nome', 'parametro']);
          const rawVal = extractValueFromRow(row, ['valor_json', 'value', 'valor', 'conteudo']) || '';
          if (key) {
            try {
              settings[key] = JSON.parse(rawVal);
            } catch (e) {
              settings[key] = rawVal;
            }
          }
        });
        result.configuracoes_do_aplicativo = settings;
      }
    } catch (e) {
      console.warn(`Error reading public tab ${tab}:`, e);
    }
  }

  // Fallback: If no recipes found under "receitas_cafe", try fetching default first sheet (no sheet parameter)
  if (!result.receitas_cafe || result.receitas_cafe.length === 0) {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv`;
      const response = await fetch(csvUrl);
      if (response.ok) {
        const csvText = await response.text();
        if (csvText && !csvText.includes('<!DOCTYPE html>')) {
          const workbook = XLSX.read(csvText, { type: 'string' });
          const firstSheetName = workbook.SheetNames[0];
          if (firstSheetName) {
            const worksheet = workbook.Sheets[firstSheetName];
            const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            const recipes: Recipe[] = [];

            rows.forEach((row, idx) => {
              const mapped = mapRowToRecipe(row, idx, 'sheet-fallback');
              if (mapped) recipes.push(mapped);
            });

            if (recipes.length > 0) {
              result.receitas_cafe = recipes;
            }
          }
        }
      }
    } catch (fallbackErr) {
      console.warn('Fallback sheet reading failed:', fallbackErr);
    }
  }

  return result;
}

/**
 * Reads all tabs from a Google Sheet and returns formatted data.
 * First queries spreadsheet metadata to get all actual sheet titles dynamically.
 */
export async function readDataFromGoogleSheet(
  spreadsheetId: string,
  accessToken?: string
): Promise<Partial<GoogleSheetsData>> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) return {};

  if (!accessToken) {
    return readPublicGoogleSheetData(cleanId);
  }

  try {
    // 1. First inspect the spreadsheet metadata to get real sheet titles
    let sheetNames: string[] = [];
    try {
      const meta = await sheetsApiFetch(`/${cleanId}?fields=sheets.properties.title`, accessToken);
      if (meta?.sheets && Array.isArray(meta.sheets)) {
        sheetNames = meta.sheets.map((s: any) => s?.properties?.title).filter(Boolean);
      }
    } catch (metaErr) {
      console.warn('Failed to fetch sheet metadata, falling back to standard names:', metaErr);
    }

    // Identify matching tabs
    const findTab = (candidates: string[]) => {
      const normalizedCandidates = candidates.map(normalizeHeaderKey);
      return sheetNames.find(sn => normalizedCandidates.includes(normalizeHeaderKey(sn)));
    };

    const recipesTab = findTab(['receitas_cafe', 'receitas', 'cafes', 'coffee_recipes', 'cardapio', 'menu']) || sheetNames[0] || 'receitas_cafe';
    const journeyTab = findTab(['jornada_do_cafe', 'jornada', 'etapas', 'journey', 'passos_cafe']);
    const logoTab = findTab(['logotipo_de_cafe', 'logotipo', 'logo', 'app_logo']);
    const settingsTab = findTab(['configuracoes_do_aplicativo', 'configuracoes', 'settings', 'config']);

    const rangesToFetch = [
      `${recipesTab}!A1:Z500`,
      journeyTab ? `${journeyTab}!A1:Z100` : null,
      logoTab ? `${logoTab}!A1:Z10` : null,
      settingsTab ? `${settingsTab}!A1:Z100` : null
    ].filter(Boolean) as string[];

    const response = await sheetsApiFetch(`/${cleanId}/values:batchGet?ranges=${rangesToFetch.map(encodeURIComponent).join('&ranges=')}`, accessToken);
    const valueRanges = response.valueRanges || [];

    const result: Partial<GoogleSheetsData> = {};

    // 1. Receitas
    const recipesRange = valueRanges[0]?.values || [];
    if (recipesRange.length > 1) {
      const headers = recipesRange[0].map((h: any) => String(h || '').trim());
      const recipes: Recipe[] = [];

      for (let i = 1; i < recipesRange.length; i++) {
        const rowArr = recipesRange[i];
        if (!rowArr || rowArr.length === 0) continue;

        // Build object from headers and row values
        const rowObj: Record<string, any> = {};
        headers.forEach((h: string, colIdx: number) => {
          if (h) rowObj[h] = rowArr[colIdx] !== undefined ? rowArr[colIdx] : '';
        });

        const mapped = mapRowToRecipe(rowObj, i, 'sheet');
        if (mapped) recipes.push(mapped);
      }

      if (recipes.length > 0) {
        result.receitas_cafe = recipes;
      }
    }

    // 2. Jornada do Café (if tab exists)
    let rangeIdx = 1;
    if (journeyTab && valueRanges[rangeIdx]) {
      const journeyRange = valueRanges[rangeIdx]?.values || [];
      if (journeyRange.length > 1) {
        const headers = journeyRange[0].map((h: any) => String(h || '').trim());
        const journey: JourneyStep[] = [];

        for (let i = 1; i < journeyRange.length; i++) {
          const rowArr = journeyRange[i];
          if (!rowArr || rowArr.length === 0) continue;

          const rowObj: Record<string, any> = {};
          headers.forEach((h: string, colIdx: number) => {
            if (h) rowObj[h] = rowArr[colIdx] !== undefined ? rowArr[colIdx] : '';
          });

          const getVal = (aliases: string[]) => extractValueFromRow(rowObj, aliases);

          journey.push({
            id: `journey-${i}`,
            status: i === 1 ? 'completed' : i === 2 ? 'current' : 'locked',
            icon: getVal(['icone', 'icon', 'simbolo']) || 'Coffee',
            step: parseInt(getVal(['step', 'passo', 'etapa', 'ordem']) || String(i), 10),
            title: getVal(['titulo', 'title', 'nome', 'etapa']) || 'Etapa do Café',
            subtitle: getVal(['subtitulo', 'subtitle', 'fase']) || '',
            description: getVal(['descricao', 'description', 'sobre', 'texto', 'detalhes']) || '',
            imageUrl: getVal(['imagem_url', 'imagem', 'image_url', 'image', 'foto', 'link_imagem']) || '',
            baristaTip: getVal(['dica_barista', 'dicabarista', 'dica', 'truque', 'barista_tip']) || '',
            readTime: getVal(['tempo_leitura', 'tempo', 'tempodeleitura', 'duracao', 'read_time']) || '3 min',
            iconName: getVal(['icone', 'icon', 'simbolo']) || 'Coffee'
          });
        }

        if (journey.length > 0) result.jornada_do_cafe = journey;
      }
      rangeIdx++;
    }

    // 3. Logotipo de Café
    if (logoTab && valueRanges[rangeIdx]) {
      const logoRange = valueRanges[rangeIdx]?.values || [];
      if (logoRange.length > 1) {
        const row = logoRange[1];
        if (row && row[1]) {
          result.logotipo_de_cafe = String(row[1]);
        }
      }
      rangeIdx++;
    }

    // 4. Configurações
    if (settingsTab && valueRanges[rangeIdx]) {
      const settingsRange = valueRanges[rangeIdx]?.values || [];
      if (settingsRange.length > 1) {
        const settings: Record<string, any> = {};
        for (let i = 1; i < settingsRange.length; i++) {
          const row = settingsRange[i];
          if (!row || !row[0]) continue;
          const key = String(row[0]);
          const rawVal = row[1] || '';
          try {
            settings[key] = JSON.parse(rawVal);
          } catch (e) {
            settings[key] = rawVal;
          }
        }
        result.configuracoes_do_aplicativo = settings;
      }
    }

    // If no recipes were loaded via standard tabs, fallback to public CSV reader
    if (!result.receitas_cafe || result.receitas_cafe.length === 0) {
      const fallbackResult = await readPublicGoogleSheetData(cleanId);
      if (fallbackResult.receitas_cafe && fallbackResult.receitas_cafe.length > 0) {
        result.receitas_cafe = fallbackResult.receitas_cafe;
      }
    }

    return result;
  } catch (err) {
    console.warn('Google Sheets API error, falling back to public CSV endpoint:', err);
    return readPublicGoogleSheetData(cleanId);
  }
}
