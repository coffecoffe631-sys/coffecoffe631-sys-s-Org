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
}

/**
 * Reads public Google Sheets tabs via published CSV endpoint (works without Google authentication)
 */
export async function readPublicGoogleSheetData(
  spreadsheetId: string
): Promise<Partial<GoogleSheetsData>> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) return {};

  const tabGroups = [
    {
      key: 'receitas_cafe',
      candidates: ['receitas_cafe', 'receitas_café', 'receitas', 'Receitas', 'Receitas do Café', 'receitas_do_cafe']
    },
    {
      key: 'jornada_do_cafe',
      candidates: ['jornada_do_cafe', 'jornada_do_café', 'jornada', 'Jornada', 'Jornada do Café', 'jornada_cafe', 'Jornada do Cafe']
    },
    {
      key: 'logotipo_de_cafe',
      candidates: ['logotipo_de_cafe', 'logotipo_de_café', 'logotipo', 'Logo', 'Logotipo do Café', 'app_logo']
    },
    {
      key: 'configuracoes_do_aplicativo',
      candidates: ['configuracoes_do_aplicativo', 'configurações_do_aplicativo', 'configuracoes', 'Configurações', 'settings']
    }
  ];

  const result: Partial<GoogleSheetsData> = {};

  for (const group of tabGroups) {
    let fetchedRows: any[] | null = null;

    for (const cand of group.candidates) {
      try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(cand)}`;
        const response = await fetch(csvUrl);
        if (!response.ok) continue;

        const csvText = await response.text();
        if (!csvText || csvText.includes('<!DOCTYPE html>')) continue;

        const workbook = XLSX.read(csvText, { type: 'string' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) continue;
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rows && rows.length > 0) {
          fetchedRows = rows;
          break; // successfully found tab
        }
      } catch (e) {
        // continue trying next candidate
      }
    }

    if (!fetchedRows || fetchedRows.length === 0) continue;

    if (group.key === 'receitas_cafe') {
      const recipes: Recipe[] = [];
      fetchedRows.forEach((row, idx) => {
        const getVal = (keys: string[]) => {
          for (const k of keys) {
            const match = Object.keys(row).find(rk => rk.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === k.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
            if (match && row[match] !== undefined && String(row[match]).trim() !== '') return String(row[match]);
          }
          return '';
        };

        const name = getVal(['nome', 'name', 'receita']);
        if (!name) return;

        const rawIng = getVal(['ingredientes', 'ingredients']);
        const { detailedIngredients, ingredients } = parseIngredients(rawIng);

        const rawEq = getVal(['equipamentos', 'equipment']);
        const equipment = parseEquipment(rawEq);

        const rawSteps = getVal(['modo_preparo', 'modo_de_preparo', 'steps', 'preparo']);
        const steps = parseSteps(rawSteps);

        const weatherSuitability = parseWeatherSuitability(getVal(['clima_adequado', 'clima', 'weather']));

        recipes.push({
          id: getVal(['id']) || `sheet-pub-${idx}`,
          name,
          country: getVal(['pais', 'country']) || 'Brasil',
          description: getVal(['descricao', 'description']) || '',
          image: getVal(['imagem_url', 'imagem', 'image_url', 'image', 'foto']) || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=1000',
          category: (getVal(['categoria', 'category']) || 'Specialty') as any,
          prepTime: getVal(['tempo_preparo', 'tempo_de_preparo', 'prep_time', 'tempo']) || '5 min',
          difficulty: (getVal(['dificuldade', 'difficulty']) || 'Easy') as any,
          ingredients,
          detailedIngredients,
          equipment,
          steps,
          weatherSuitability: weatherSuitability as any
        });
      });

      if (recipes.length > 0) {
        result.receitas_cafe = recipes;
      }
    } else if (group.key === 'jornada_do_cafe') {
      const journey: JourneyStep[] = [];
      fetchedRows.forEach((row, idx) => {
        const getVal = (keys: string[]) => {
          for (const k of keys) {
            const match = Object.keys(row).find(rk => rk.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === k.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
            if (match && row[match] !== undefined && String(row[match]).trim() !== '') return String(row[match]);
          }
          return '';
        };

        const title = getVal(['titulo', 'title', 'nome', 'etapa']);
        if (!title && !row['step'] && !row['etapa']) return;

        const rawStep = getVal(['step', 'etapa', 'passo', 'numero']);
        const stepNum = rawStep ? parseInt(rawStep, 10) : idx + 1;

        const statusRaw = getVal(['status', 'estado']);
        const status = (statusRaw === 'completed' || statusRaw === 'current' || statusRaw === 'locked')
          ? statusRaw
          : (idx === 0 ? 'completed' : idx === 1 ? 'current' : 'locked');

        journey.push({
          id: getVal(['id']) || `journey-pub-${idx}`,
          step: isNaN(stepNum) ? idx + 1 : stepNum,
          title: title || `Etapa ${idx + 1}`,
          subtitle: getVal(['subtitulo', 'subtitle']),
          description: getVal(['descricao', 'description', 'conteudo']),
          imageUrl: getVal(['imagem_url', 'imagem', 'image_url', 'image', 'foto']),
          baristaTip: getVal(['dica_barista', 'dica', 'barista_tip', 'tip']),
          readTime: getVal(['tempo_leitura', 'read_time', 'tempo']) || '3 min',
          iconName: getVal(['icone', 'icon', 'icon_name']) || 'Coffee',
          icon: getVal(['icone', 'icon', 'icon_name']) || 'Coffee',
          status,
          audioUrl: getVal(['audio_url', 'audio', 'som']),
          reward: getVal(['reward', 'recompensa', 'premio'])
        });
      });

      if (journey.length > 0) {
        result.jornada_do_cafe = journey;
      }
    } else if (group.key === 'logotipo_de_cafe') {
      const row = fetchedRows[0];
      if (row) {
        const logoVal = row['valor'] || row['valor_url'] || row['app_logo'] || Object.values(row)[1] || Object.values(row)[0] || '';
        if (logoVal) result.logotipo_de_cafe = String(logoVal);
      }
    } else if (group.key === 'configuracoes_do_aplicativo') {
      const settings: Record<string, any> = {};
      fetchedRows.forEach(row => {
        const key = row['chave'] || row['key'];
        const rawVal = row['valor_json'] || row['value'] || row['valor'] || '';
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
  }

  return result;
}

/**
 * Reads all 4 tabs from a Google Sheet and returns formatted data
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
    const ranges = [
      'receitas_cafe!A1:Z500',
      'jornada_do_cafe!A1:Z100',
      'logotipo_de_cafe!A1:Z10',
      'configuracoes_do_aplicativo!A1:Z100'
    ];

    const response = await sheetsApiFetch(`/${cleanId}/values:batchGet?ranges=${ranges.map(encodeURIComponent).join('&ranges=')}`, accessToken);
    const valueRanges = response.valueRanges || [];

    const result: Partial<GoogleSheetsData> = {};

  // 1. Receitas
  const recipesRange = valueRanges[0]?.values || [];
  if (recipesRange.length > 1) {
    const headers = recipesRange[0].map((h: string) => h.toLowerCase().trim());
    const recipes: Recipe[] = [];

    for (let i = 1; i < recipesRange.length; i++) {
      const row = recipesRange[i];
      if (!row || row.length === 0) continue;

      const getVal = (key: string) => {
        const idx = headers.indexOf(key);
        return idx !== -1 ? row[idx] || '' : '';
      };

      const name = getVal('nome') || getVal('name');
      if (!name) continue;

      const rawIng = getVal('ingredientes') || getVal('ingredients');
      const { detailedIngredients, ingredients } = parseIngredients(rawIng);

      const rawEq = getVal('equipamentos') || getVal('equipment');
      const equipment = parseEquipment(rawEq);

      const rawSteps = getVal('modo_preparo') || getVal('modo_de_preparo') || getVal('steps');
      const steps = parseSteps(rawSteps);

      let weatherSuitability = parseWeatherSuitability(getVal('clima_adequado') || getVal('clima'));

      recipes.push({
        id: getVal('id') || `sheet-${i}`,
        name,
        country: getVal('pais') || getVal('country') || 'Brasil',
        description: getVal('descricao') || getVal('description') || '',
        image: getVal('imagem_url') || getVal('imagem') || getVal('image_url') || getVal('image') || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=1000',
        category: (getVal('categoria') || getVal('category') || 'Specialty') as any,
        prepTime: getVal('tempo_preparo') || getVal('tempo_de_preparo') || getVal('prep_time') || '5 min',
        difficulty: (getVal('dificuldade') || getVal('difficulty') || 'Easy') as any,
        ingredients,
        detailedIngredients,
        equipment,
        steps,
        weatherSuitability: weatherSuitability as any
      });
    }

    result.receitas_cafe = recipes;
  }

  // 2. Jornada do Café
  const journeyRange = valueRanges[1]?.values || [];
  if (journeyRange.length > 1) {
    const rawHeaders = journeyRange[0].map((h: string) => String(h || '').toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    const journey: JourneyStep[] = [];

    for (let i = 1; i < journeyRange.length; i++) {
      const row = journeyRange[i];
      if (!row || row.length === 0) continue;

      const getVal = (keys: string[]) => {
        for (const k of keys) {
          const normK = k.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const idx = rawHeaders.indexOf(normK);
          if (idx !== -1 && row[idx] !== undefined && String(row[idx]).trim() !== '') return String(row[idx]);
        }
        return '';
      };

      const rawStep = getVal(['step', 'etapa', 'passo', 'numero']);
      const stepNum = rawStep ? parseInt(rawStep, 10) : i;
      const title = getVal(['titulo', 'title', 'nome', 'etapa']);
      const statusRaw = getVal(['status', 'estado']);
      const status = (statusRaw === 'completed' || statusRaw === 'current' || statusRaw === 'locked')
        ? statusRaw
        : (i === 1 ? 'completed' : i === 2 ? 'current' : 'locked');

      journey.push({
        id: getVal(['id']) || `journey-${i}`,
        step: isNaN(stepNum) ? i : stepNum,
        title: title || `Etapa ${i}`,
        subtitle: getVal(['subtitulo', 'subtitle']),
        description: getVal(['descricao', 'description', 'conteudo']),
        imageUrl: getVal(['imagem_url', 'imagem', 'image_url', 'image', 'foto']),
        baristaTip: getVal(['dica_barista', 'dica', 'barista_tip', 'tip']),
        readTime: getVal(['tempo_leitura', 'read_time', 'tempo']) || '3 min',
        iconName: getVal(['icone', 'icon', 'icon_name']) || 'Coffee',
        icon: getVal(['icone', 'icon', 'icon_name']) || 'Coffee',
        status,
        audioUrl: getVal(['audio_url', 'audio', 'som']),
        reward: getVal(['reward', 'recompensa', 'premio'])
      });
    }

    if (journey.length > 0) {
      result.jornada_do_cafe = journey;
    }
  }

  // 3. Logotipo de Café
  const logoRange = valueRanges[2]?.values || [];
  if (logoRange.length > 1) {
    const row = logoRange[1];
    if (row && row[1]) {
      result.logotipo_de_cafe = row[1];
    }
  }

  // 4. Configurações
  const settingsRange = valueRanges[3]?.values || [];
  if (settingsRange.length > 1) {
    const settings: Record<string, any> = {};
    for (let i = 1; i < settingsRange.length; i++) {
      const row = settingsRange[i];
      if (!row || !row[0]) continue;
      const key = row[0];
      const rawVal = row[1] || '';
      try {
        settings[key] = JSON.parse(rawVal);
      } catch (e) {
        settings[key] = rawVal;
      }
    }
    result.configuracoes_do_aplicativo = settings;
  }

  return result;
  } catch (err) {
    console.warn('Google Sheets API error, falling back to public CSV endpoint:', err);
    return readPublicGoogleSheetData(cleanId);
  }
}
