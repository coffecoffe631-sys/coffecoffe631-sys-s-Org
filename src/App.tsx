import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, MapPin, Cloud, CloudRain, Sun, Clock, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Heart, Share2, Coffee, Droplets, Zap, Loader2, Settings, Plus, Trash2, Lock, Sparkles, Edit, RotateCcw, Upload, Image as ImageIcon, User as UserIcon, LogOut, Mail, Maximize2, Check, Menu, MessageCircle, Eye, EyeOff, Trophy, Map, Compass, Cookie, BookOpen, Milk, Bean, GlassWater, Flame, ChefHat, Utensils, Scale, Blend, Citrus, IceCream, Candy, Timer, Soup, Thermometer, CupSoda, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Recipe, Ingredient, Step, WeatherCondition, recipes, defaultAccompaniments } from './data/recipes';
import { coffeeJourney, JourneyStep } from './data/journey';
import { useWeather } from './hooks/useWeather';
import JourneyView from './components/JourneyView';
import GoogleSheetsManager from './components/GoogleSheetsManager';
import { readDataFromGoogleSheet } from './services/googleSheetsService';
import { getLocalCoffeeRecommendation } from './services/recommendationService';
import { fetchRecipesFromSupabase, insertRecipeToSupabase, deleteRecipeFromSupabase, updateRecipeInSupabase, seedRecipes, fetchAppLogo, updateAppLogo, fetchSettingsKey, updateSettingsKey, fetchJourneyFromSupabase, updateJourneyStepInSupabase, seedJourney, insertJourneyStepToSupabase, deleteJourneyStepFromSupabase, getRecipesTableName } from './services/supabaseService';
import { cn } from './lib/utils';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';

const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/924/924514.png";

function parseInlineFormatting(text: string): React.ReactNode {
  if (!text) return "";
  const regex = /(\*\*.*?\*\*|__.*?__|\*.*?\*|_.*?_)/g;
  const splitParts = text.split(regex);
  return splitParts.map((part, i) => {
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      const inner = part.startsWith('**') ? part.slice(2, -2) : part.slice(2, -2);
      return <strong key={i} className="font-extrabold text-coffee-950 font-sans">{inner}</strong>;
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      const inner = part.startsWith('*') ? part.slice(1, -1) : part.slice(1, -1);
      return <em key={i} className="italic font-sans">{inner}</em>;
    }
    return part;
  });
}

function renderFormattedContent(text: string) {
  if (!text) return null;

  const lines = text.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let currentGroup: React.ReactNode[] = [];
  let keyIdx = 0;

  const flushGroup = () => {
    if (currentGroup.length > 0) {
      elements.push(
        <div key={`group-${keyIdx++}`} className="space-y-4">
          {...currentGroup}
        </div>
      );
      currentGroup = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (line === '---' || line.startsWith('---')) {
      flushGroup();
      elements.push(
        <div key={`divider-${keyIdx++}`} className="h-px bg-coffee-100/60 my-6" />
      );
    } else if (line.startsWith('#')) {
      flushGroup();
      const match = line.match(/^(#{1,6})\s*(.*)$/);
      if (match) {
        const level = match[1].length;
        const headerText = match[2].trim();
        const parsedText = parseInlineFormatting(headerText);
        
        if (level === 1) {
          elements.push(
            <h2 key={`header-${keyIdx++}`} className="text-2xl sm:text-3xl font-sans font-black text-coffee-950 mt-8 first:mt-2 mb-4 leading-tight">
              {parsedText}
            </h2>
          );
        } else if (level === 2) {
          elements.push(
            <h3 key={`header-${keyIdx++}`} className="text-xl sm:text-2xl font-sans font-extrabold text-coffee-900 mt-6 first:mt-2 mb-3 leading-snug">
              {parsedText}
            </h3>
          );
        } else {
          elements.push(
            <h4 key={`header-${keyIdx++}`} className="text-base sm:text-lg font-black text-coffee-800 uppercase tracking-[0.12em] mt-5 first:mt-2 mb-2 leading-normal">
              {parsedText}
            </h4>
          );
        }
      } else {
        elements.push(
          <p key={`para-${keyIdx++}`} className="text-coffee-850 text-sm sm:text-base leading-relaxed font-sans font-medium text-justify">
            {parseInlineFormatting(line)}
          </p>
        );
      }
    } else {
      const isQuoted = (line.startsWith('"') && line.endsWith('"')) || (line.startsWith('“') && line.endsWith('”'));
      const textContent = isQuoted ? line.slice(1, -1) : line;

      // Handle custom Barista advice
      const hasDica = line.includes('Dica do Barista') || line.includes('Truque do Barista') || line.includes('💡') || line.toLowerCase().includes('dica:') || line.toLowerCase().includes('truque:');

      if (hasDica) {
        flushGroup();
        const cleanLine = line.replace(/^(💡\s*)?(Dica do Barista:?|Truque do Barista:?|Dica:?|Truque:?)\s*/i, '').trim();
        elements.push(
          <div key={`dica-${keyIdx++}`} className="p-5 sm:p-6 bg-amber-50/90 border border-amber-200/60 rounded-2xl text-left shadow-sm w-full my-3">
            <span className="font-sans font-black text-amber-900 text-xs uppercase tracking-widest block mb-1.5 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500 animate-pulse" />
              💡 Truque do Barista
            </span>
            <p className="text-sm sm:text-base font-sans font-semibold text-amber-950 leading-relaxed">
              {parseInlineFormatting(cleanLine)}
            </p>
          </div>
        );
      } else if (isQuoted) {
        currentGroup.push(
          <p key={`para-${keyIdx++}`} className="text-coffee-600 text-sm sm:text-base leading-relaxed font-sans italic border-l-4 border-amber-500 pl-4 py-1 bg-amber-50/30 rounded-r-2xl my-2">
            “{parseInlineFormatting(textContent)}”
          </p>
        );
      } else {
        currentGroup.push(
          <p key={`para-${keyIdx++}`} className="text-coffee-800 text-sm sm:text-base leading-relaxed font-sans font-medium text-justify">
            {parseInlineFormatting(line)}
          </p>
        );
      }
    }
  }

  flushGroup();

  return <div className="space-y-4">{elements}</div>;
}

function renderStepContent(text: string) {
  if (!text) return null;

  const lines = text.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let currentGroup: React.ReactNode[] = [];
  let keyIdx = 0;

  const flushGroup = () => {
    if (currentGroup.length > 0) {
      elements.push(
        <div key={`group-${keyIdx++}`} className="space-y-6 w-full">
          {...currentGroup}
        </div>
      );
      currentGroup = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (line === '---' || line.startsWith('---')) {
      flushGroup();
      elements.push(
        <div key={`divider-${keyIdx++}`} className="h-px bg-coffee-200/60 my-8 w-full max-w-xl mx-auto" />
      );
    } else if (line.startsWith('#')) {
      flushGroup();
      const match = line.match(/^(#{1,6})\s*(.*)$/);
      if (match) {
        const level = match[1].length;
        const headerText = match[2].trim();
        const parsedText = parseInlineFormatting(headerText);
        
        if (level === 1) {
          elements.push(
            <h2 key={`header-${keyIdx++}`} className="text-xl sm:text-2xl font-sans font-black text-coffee-950 mt-8 first:mt-2 mb-4 text-center">
              {parsedText}
            </h2>
          );
        } else if (level === 2) {
          elements.push(
            <h3 key={`header-${keyIdx++}`} className="text-lg sm:text-xl font-sans font-extrabold text-coffee-900 mt-6 first:mt-2 mb-3 text-center">
              {parsedText}
            </h3>
          );
        } else {
          elements.push(
            <h4 key={`header-${keyIdx++}`} className="text-base sm:text-lg font-sans font-black text-coffee-800 uppercase tracking-[0.15em] mt-5 first:mt-2 mb-2 text-center">
              {parsedText}
            </h4>
          );
        }
      } else {
        elements.push(
          <p key={`para-${keyIdx++}`} className="text-coffee-800 text-base sm:text-xl leading-relaxed font-sans font-semibold text-center sm:text-justify max-w-xl mx-auto">
            {parseInlineFormatting(line)}
          </p>
        );
      }
    } else {
      const isQuoted = (line.startsWith('"') && line.endsWith('"')) || (line.startsWith('“') && line.endsWith('”'));
      const textContent = isQuoted ? line.slice(1, -1) : line;

      // Handle custom Barista advice
      const hasDica = line.includes('Dica do Barista') || line.includes('Truque do Barista') || line.includes('💡') || line.toLowerCase().includes('dica:') || line.toLowerCase().includes('truque:');

      if (hasDica) {
        flushGroup();
        const cleanLine = line.replace(/^(💡\s*)?(Dica do Barista:?|Truque do Barista:?|Dica:?|Truque:?)\s*/i, '').trim();
        elements.push(
          <div key={`dica-${keyIdx++}`} className="p-6 sm:p-8 bg-amber-50/80 border border-amber-200/50 rounded-[2rem] text-left shadow-sm w-full max-w-xl mx-auto my-4">
            <span className="font-sans font-black text-amber-900 text-xs sm:text-sm uppercase tracking-widest block mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500 animate-pulse" />
              💡 Truque do Barista
            </span>
            <p className="text-sm sm:text-base md:text-lg font-sans font-semibold text-amber-950 leading-relaxed">
              {parseInlineFormatting(cleanLine)}
            </p>
          </div>
        );
      } else if (isQuoted) {
        currentGroup.push(
          <p key={`para-${keyIdx++}`} className="text-coffee-600 text-base sm:text-xl leading-relaxed font-sans italic border-l-4 border-amber-500 pl-4 py-1 bg-amber-50/30 rounded-r-2xl my-2 max-w-xl mx-auto">
            “{parseInlineFormatting(textContent)}”
          </p>
        );
      } else {
        currentGroup.push(
          <p key={`para-${keyIdx++}`} className="text-coffee-800 text-base sm:text-xl leading-relaxed font-sans font-semibold text-center sm:text-justify max-w-xl mx-auto">
            {parseInlineFormatting(line)}
          </p>
        );
      }
    }
  }

  flushGroup();

  return <div className="space-y-6 w-full select-text">{elements}</div>;
}

const INGREDIENT_ICONS = {
  Bean: { component: Bean, label: 'Grão/Café' },
  Milk: { component: Milk, label: 'Leite/Creme' },
  IceCream: { component: IceCream, label: 'Sorvete/Creme' },
  Citrus: { component: Citrus, label: 'Fruta/Cítrico' },
  Candy: { component: Candy, label: 'Doce/Açúcar/Mel' },
  Cookie: { component: Cookie, label: 'Chocolate/Biscoito' },
  Droplets: { component: Droplets, label: 'Água/Gelo' },
  Flame: { component: Flame, label: 'Quente/Fogo' },
  Sparkles: { component: Sparkles, label: 'Especiaria/Brilho' },
  Utensils: { component: Utensils, label: 'Geral' }
};

const EQUIPMENT_ICONS = {
  Filter: { component: Filter, label: 'Filtro/Coador' },
  Coffee: { component: Coffee, label: 'Máquina/Moka' },
  GlassWater: { component: GlassWater, label: 'Chaleira/Pitcher' },
  CupSoda: { component: CupSoda, label: 'Copo/Xícara' },
  Timer: { component: Timer, label: 'Timer/Tempo' },
  Scale: { component: Scale, label: 'Balança/Medidor' },
  Blend: { component: Blend, label: 'Moedor/Mixer' },
  Soup: { component: Soup, label: 'Panela/Pote' },
  Thermometer: { component: Thermometer, label: 'Termômetro' },
  Flame: { component: Flame, label: 'Aquecedor/Fogo' },
  ChefHat: { component: ChefHat, label: 'Chef/Outros' }
};

const ILLUSTRATED_EQUIPMENT_PRESETS = [
  {
    name: 'Moedor Elétrico',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784337734/WhatsApp_Image_2026-07-17_at_22.19.52_ebrqcp.jpg'
  },
  {
    name: 'Chaleira Pescoço de Ganso',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784337813/WhatsApp_Image_2026-07-17_at_22.20.42_xtg5iz.jpg'
  },
  {
    name: 'Filtro de Papel V60',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784337863/WhatsApp_Image_2026-07-17_at_22.22.02_jjd8zt.jpg'
  },
  {
    name: 'Balança de Precisão',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784337913/WhatsApp_Image_2026-07-17_at_22.24.29_rknubl.jpg'
  },
  {
    name: 'Prensa Francesa',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784337972/WhatsApp_Image_2026-07-17_at_22.25.23_nvigmz.jpg'
  },
  {
    name: 'Porta-Filtro Pró',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338023/WhatsApp_Image_2026-07-17_at_22.26.15_efxzjt.jpg'
  },
  {
    name: 'Aeropress',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338081/WhatsApp_Image_2026-07-17_at_22.27.01_f4vu7s.jpg'
  },
  {
    name: 'Moka Italiana',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338134/WhatsApp_Image_2026-07-17_at_22.27.53_gyzt5d.jpg'
  },
  {
    name: 'Globinho / Sifão',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338181/WhatsApp_Image_2026-07-17_at_22.28.32_ip6rq2.jpg'
  },
  {
    name: 'Moedor de Café Manual',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338369/WhatsApp_Image_2026-07-17_at_22.30.08_duur9u.jpg'
  },
  {
    name: 'Coador Hario V60',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338430/WhatsApp_Image_2026-07-17_at_22.32.01_pcfgtb.jpg'
  },
  {
    name: 'Passador Chemex',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338606/WhatsApp_Image_2026-07-17_at_22.36.03_ofng6d.jpg'
  },
  {
    name: 'Pitcher de Inox',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338655/WhatsApp_Image_2026-07-17_at_22.36.50_dwmrkr.jpg'
  },
  {
    name: 'Termômetro Espeto',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338699/WhatsApp_Image_2026-07-17_at_22.37.29_wy2oa3.jpg'
  },
  {
    name: 'Copo de Vidro Duplo',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338770/WhatsApp_Image_2026-07-17_at_22.38.08_jvvstk.jpg'
  },
  {
    name: 'Tamper Compactador',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338831/WhatsApp_Image_2026-07-17_at_22.38.49_cmlbld.jpg'
  },
  {
    name: 'Espumador Manual',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338962/WhatsApp_Image_2026-07-17_at_22.39.44_ga7l2o.jpg'
  },
  {
    name: 'Xícara de Cerâmica',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784339083/WhatsApp_Image_2026-07-17_at_22.41.31_mbkdsx.jpg'
  },
  {
    name: 'Filtro de Pano Clássico',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784339119/WhatsApp_Image_2026-07-17_at_22.42.27_jyoam9.jpg'
  },
  {
    name: 'Server de Vidro (Decantador)',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784339246/WhatsApp_Image_2026-07-17_at_22.45.28_zwn9f1.jpg'
  },
  {
    name: 'Coador Clever',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784339297/WhatsApp_Image_2026-07-17_at_22.47.20_rnslrs.jpg'
  },
  {
    name: 'Máquina de Espresso',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784339382/WhatsApp_Image_2026-07-17_at_22.47.57_m9zwow.jpg'
  },
  {
    name: 'Moedor de Café Industrial',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784339432/WhatsApp_Image_2026-07-17_at_22.48.58_eq9fdf.jpg'
  },
  {
    name: 'Chaleira Elétrica Clássica',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784340722/WhatsApp_Image_2026-07-17_at_22.52.10_1_rf6hk9.jpg'
  },
  {
    name: 'Copo de Dose (Shot)',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784340765/WhatsApp_Image_2026-07-17_at_22.52.16_thongk.jpg'
  },
  {
    name: 'Porta-Filtro Naked',
    image: 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784340839/WhatsApp_Image_2026-07-17_at_22.58.18_byal5u.jpg'
  }
];

const getIngredientIcon = (name: string, customIcon?: string) => {
  if (customIcon) {
    if (customIcon.startsWith('http') || customIcon.startsWith('data:image')) {
      return <img src={customIcon} alt="" className="w-5 h-5 object-contain rounded-full" referrerPolicy="no-referrer" />;
    }
    if (INGREDIENT_ICONS[customIcon as keyof typeof INGREDIENT_ICONS]) {
      const IconComponent = INGREDIENT_ICONS[customIcon as keyof typeof INGREDIENT_ICONS].component;
      return <IconComponent size={20} className="text-neutral-900" />;
    }
  }

  const lower = name.toLowerCase();
  
  if (lower.includes('chantilly') || lower.includes('sorvete') || lower.includes('cream') || lower.includes('gelato') || lower.includes('espuma de')) {
    return <IceCream size={20} className="text-neutral-900" />;
  }
  if (lower.includes('leite') || lower.includes('creme') || lower.includes('milk') || lower.includes('aveia') || lower.includes('iogurte')) {
    return <Milk size={20} className="text-neutral-900" />;
  }
  if (lower.includes('café') || lower.includes('coffee') || lower.includes('espresso') || lower.includes('grão') || lower.includes('pó') || lower.includes('blend')) {
    return <Bean size={20} className="text-neutral-900" />;
  }
  if (lower.includes('limão') || lower.includes('laranja') || lower.includes('siciliano') || lower.includes('cítrico') || lower.includes('casca') || lower.includes('fruta') || lower.includes('maracujá')) {
    return <Citrus size={20} className="text-neutral-900" />;
  }
  if (lower.includes('caramelo') || lower.includes('rapadura') || lower.includes('melaço') || lower.includes('mel') || lower.includes('xarope') || lower.includes('syrup') || lower.includes('açúcar') || lower.includes('adoçante') || lower.includes('calda')) {
    return <Candy size={20} className="text-neutral-900" />;
  }
  if (lower.includes('chocolate') || lower.includes('cacau') || lower.includes('cookie') || lower.includes('biscoito') || lower.includes('avelã') || lower.includes('amendoim') || lower.includes('nozes') || lower.includes('doce')) {
    return <Cookie size={20} className="text-neutral-900" />;
  }
  if (lower.includes('água') || lower.includes('water') || lower.includes('gelo') || lower.includes('ice') || lower.includes('líquido') || lower.includes('infusão')) {
    return <Droplets size={20} className="text-neutral-900" />;
  }
  if (lower.includes('fogo') || lower.includes('quente') || lower.includes('vapor') || lower.includes('fervente')) {
    return <Flame size={20} className="text-neutral-900" />;
  }
  if (lower.includes('sal') || lower.includes('flor de sal') || lower.includes('noz-moscada') || lower.includes('canela') || lower.includes('cravo') || lower.includes('especiaria') || lower.includes('hortelã') || lower.includes('alecrim') || lower.includes('baunilha') || lower.includes('pitada')) {
    return <Sparkles size={20} className="text-neutral-900" />;
  }
  return <Utensils size={20} className="text-neutral-900" />;
};

const getEquipmentIcon = (name: string) => {
  let cleanName = name;
  let customIcon: string | undefined = undefined;
  
  if (name.includes('::')) {
    const parts = name.split('::');
    cleanName = parts[0];
    customIcon = parts.slice(1).join('::');
  }

  if (customIcon) {
    if (customIcon.startsWith('http') || customIcon.startsWith('data:image')) {
      return <img src={customIcon} alt="" className="w-full h-full object-contain p-0.5 bg-white" referrerPolicy="no-referrer" />;
    }
    if (EQUIPMENT_ICONS[customIcon as keyof typeof EQUIPMENT_ICONS]) {
      const IconComponent = EQUIPMENT_ICONS[customIcon as keyof typeof EQUIPMENT_ICONS].component;
      return <IconComponent size={24} className="text-neutral-900" />;
    }
  }

  const lower = cleanName.toLowerCase();
  
  if (lower.includes('v60') || lower.includes('coador') || lower.includes('filtro') || lower.includes('passador') || lower.includes('papel') || lower.includes('pano')) {
    return <Filter size={24} className="text-neutral-900" />;
  }
  if (lower.includes('moka') || lower.includes('italiana') || lower.includes('cafeteira') || lower.includes('máquina') || lower.includes('espresso') || lower.includes('porta-filtro')) {
    return <Coffee size={24} className="text-neutral-900" />;
  }
  if (lower.includes('chaleira') || lower.includes('bule') || lower.includes('pitcher') || lower.includes('leiteira') || lower.includes('jarra')) {
    return <GlassWater size={24} className="text-neutral-900" />;
  }
  if (lower.includes('copo') || lower.includes('xícara') || lower.includes('caneca') || lower.includes('taça') || lower.includes('copinho') || lower.includes('vidro')) {
    return <CupSoda size={24} className="text-neutral-900" />;
  }
  if (lower.includes('timer') || lower.includes('cronômetro') || lower.includes('tempo') || lower.includes('relógio')) {
    return <Timer size={24} className="text-neutral-900" />;
  }
  if (lower.includes('balança') || lower.includes('peso') || lower.includes('medidor') || lower.includes('escala') || lower.includes('colher')) {
    return <Scale size={24} className="text-neutral-900" />;
  }
  if (lower.includes('mixer') || lower.includes('moedor') || lower.includes('espumador') || lower.includes('batedor') || lower.includes('liquidificador') || lower.includes('blend')) {
    return <Blend size={24} className="text-neutral-900" />;
  }
  if (lower.includes('panela') || lower.includes('forma') || lower.includes('assadeira') || lower.includes('recipiente') || lower.includes('pote') || lower.includes('bacia')) {
    return <Soup size={24} className="text-neutral-900" />;
  }
  if (lower.includes('ralo') || lower.includes('faca') || lower.includes('corte') || lower.includes('descascador') || lower.includes('microplane') || lower.includes('peneira')) {
    return <Utensils size={24} className="text-neutral-900" />;
  }
  if (lower.includes('termômetro') || lower.includes('temperatura')) {
    return <Thermometer size={24} className="text-neutral-900" />;
  }
  if (lower.includes('fogo') || lower.includes('aquecedor') || lower.includes('fogão') || lower.includes('microondas') || lower.includes('vapor') || lower.includes('forno')) {
    return <Flame size={24} className="text-neutral-900" />;
  }
  return <ChefHat size={24} className="text-neutral-900disabled:" />;
};

const getEquipmentImage = (eqString: string, customPresets: { name: string; image: string }[] = []): string => {
  let cleanName = eqString;
  let customIcon: string | undefined = undefined;
  
  if (eqString.includes('::')) {
    const parts = eqString.split('::');
    cleanName = parts[0];
    customIcon = parts.slice(1).join('::');
  }

  if (customIcon && (customIcon.startsWith('http') || customIcon.startsWith('data:image'))) {
    return customIcon;
  }

  const lower = cleanName.toLowerCase();

  // First check custom history presets
  for (const preset of customPresets) {
    const presetLower = preset.name.toLowerCase();
    if (lower === presetLower || lower.includes(presetLower) || presetLower.includes(lower)) {
      if (preset.image) return preset.image;
    }
  }

  // Then check built-in presets
  for (const preset of ILLUSTRATED_EQUIPMENT_PRESETS) {
    const presetLower = preset.name.toLowerCase();
    if (lower.includes(presetLower) || presetLower.includes(lower)) {
      return preset.image;
    }
  }

  // Fallbacks for specific words to maximize illustration matching
  if (lower.includes('moedor')) {
    if (lower.includes('manual') || lower.includes('mão')) {
      return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338369/WhatsApp_Image_2026-07-17_at_22.30.08_duur9u.jpg';
    }
    if (lower.includes('industrial') || lower.includes('comercial')) {
      return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784339432/WhatsApp_Image_2026-07-17_at_22.48.58_eq9fdf.jpg';
    }
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784337734/WhatsApp_Image_2026-07-17_at_22.19.52_ebrqcp.jpg';
  }
  if (lower.includes('chaleira') || lower.includes('bule')) {
    if (lower.includes('elétrica') || lower.includes('eletrica')) {
      return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784340722/WhatsApp_Image_2026-07-17_at_22.52.10_1_rf6hk9.jpg';
    }
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784337813/WhatsApp_Image_2026-07-17_at_22.20.42_xtg5iz.jpg';
  }
  if (lower.includes('filtro') || lower.includes('papel')) {
    if (lower.includes('pano')) {
      return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784339119/WhatsApp_Image_2026-07-17_at_22.42.27_jyoam9.jpg';
    }
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784337863/WhatsApp_Image_2026-07-17_at_22.22.02_jjd8zt.jpg';
  }
  if (lower.includes('balança') || lower.includes('escala') || lower.includes('peso')) {
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784337913/WhatsApp_Image_2026-07-17_at_22.24.29_rknubl.jpg';
  }
  if (lower.includes('prensa') || lower.includes('francesa') || lower.includes('french')) {
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784337972/WhatsApp_Image_2026-07-17_at_22.25.23_nvigmz.jpg';
  }
  if (lower.includes('porta-filtro') || lower.includes('portafiltro')) {
    if (lower.includes('naked') || lower.includes('sem fundo')) {
      return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784340839/WhatsApp_Image_2026-07-17_at_22.58.18_byal5u.jpg';
    }
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338023/WhatsApp_Image_2026-07-17_at_22.26.15_efxzjt.jpg';
  }
  if (lower.includes('aeropress')) {
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338081/WhatsApp_Image_2026-07-17_at_22.27.01_f4vu7s.jpg';
  }
  if (lower.includes('moka') || lower.includes('italiana')) {
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338134/WhatsApp_Image_2026-07-17_at_22.27.53_gyzt5d.jpg';
  }
  if (lower.includes('sifão') || lower.includes('sifao') || lower.includes('globinho')) {
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338181/WhatsApp_Image_2026-07-17_at_22.28.32_ip6rq2.jpg';
  }
  if (lower.includes('hario') || lower.includes('v60') || lower.includes('coador')) {
    if (lower.includes('clever')) {
      return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784339297/WhatsApp_Image_2026-07-17_at_22.47.20_rnslrs.jpg';
    }
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338430/WhatsApp_Image_2026-07-17_at_22.32.01_pcfgtb.jpg';
  }
  if (lower.includes('chemex')) {
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338606/WhatsApp_Image_2026-07-17_at_22.36.03_ofng6d.jpg';
  }
  if (lower.includes('pitcher') || lower.includes('leiteira') || lower.includes('inox')) {
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338655/WhatsApp_Image_2026-07-17_at_22.36.50_dwmrkr.jpg';
  }
  if (lower.includes('termômetro') || lower.includes('termometro')) {
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338699/WhatsApp_Image_2026-07-17_at_22.37.29_wy2oa3.jpg';
  }
  if (lower.includes('copo') || lower.includes('vidro')) {
    if (lower.includes('dose') || lower.includes('shot')) {
      return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784340765/WhatsApp_Image_2026-07-17_at_22.52.16_thongk.jpg';
    }
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338770/WhatsApp_Image_2026-07-17_at_22.38.08_jvvstk.jpg';
  }
  if (lower.includes('tamper') || lower.includes('compactador')) {
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338831/WhatsApp_Image_2026-07-17_at_22.38.49_cmlbld.jpg';
  }
  if (lower.includes('espumador') || lower.includes('batedor')) {
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338962/WhatsApp_Image_2026-07-17_at_22.39.44_ga7l2o.jpg';
  }
  if (lower.includes('xícara') || lower.includes('xicara') || lower.includes('caneca')) {
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784339083/WhatsApp_Image_2026-07-17_at_22.41.31_mbkdsx.jpg';
  }
  if (lower.includes('server') || lower.includes('decantador') || lower.includes('jarra')) {
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784339246/WhatsApp_Image_2026-07-17_at_22.45.28_zwn9f1.jpg';
  }
  if (lower.includes('clever')) {
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784339297/WhatsApp_Image_2026-07-17_at_22.47.20_rnslrs.jpg';
  }
  if (lower.includes('máquina') || lower.includes('maquina') || lower.includes('espresso') || lower.includes('expresso')) {
    return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784339382/WhatsApp_Image_2026-07-17_at_22.47.57_m9zwow.jpg';
  }

  // Generic fallback if we can't find anything
  return 'https://res.cloudinary.com/dyfeeocgb/image/upload/v1784338023/WhatsApp_Image_2026-07-17_at_22.26.15_efxzjt.jpg';
};

const pluralizeUnits = (str: string, multiplier: number): string => {
  if (multiplier <= 1) return str;
  return str
    .replace(/\bcolher\b/gi, 'colheres')
    .replace(/\bxícara\b/gi, 'xícaras')
    .replace(/\bxicara\b/gi, 'xícaras')
    .replace(/\bbola\b/gi, 'bolas')
    .replace(/\bfatia\b/gi, 'fatias')
    .replace(/\bpitada\b/gi, 'pitadas')
    .replace(/\blitro\b/gi, 'litros')
    .replace(/\bporção\b/gi, 'porções')
    .replace(/\bporcao\b/gi, 'porções')
    .replace(/\bunidade\b/gi, 'unidades');
};

const scaleNumericAmount = (text: string, multiplier: number): string => {
  if (!text || text.trim() === '') return text;

  const formatValue = (num: number): string => {
    if (isNaN(num)) return '';
    if (Math.abs(num - Math.round(num)) < 0.05) {
      return Math.round(num).toString();
    }
    const dec = num - Math.floor(num);
    const whole = Math.floor(num);
    if (Math.abs(dec - 0.5) < 0.05) return whole > 0 ? `${whole} ½` : '½';
    if (Math.abs(dec - 0.25) < 0.05) return whole > 0 ? `${whole} ¼` : '¼';
    if (Math.abs(dec - 0.75) < 0.05) return whole > 0 ? `${whole} ¾` : '¾';
    if (Math.abs(dec - 0.33) < 0.05 || Math.abs(dec - 0.333) < 0.05) return whole > 0 ? `${whole} ⅓` : '⅓';
    if (Math.abs(dec - 0.66) < 0.05 || Math.abs(dec - 0.666) < 0.05) return whole > 0 ? `${whole} ⅔` : '⅔';

    const rounded = Math.round(num * 10) / 10;
    return rounded.toString().replace('.', ',');
  };

  if (multiplier === 1) return text;

  let temp = text
    .replace(/½/g, '0.5')
    .replace(/¼/g, '0.25')
    .replace(/¾/g, '0.75')
    .replace(/⅓/g, '0.33')
    .replace(/⅔/g, '0.67');

  temp = temp.replace(/(\d+)\/(\d+)/g, (_, n, d) => {
    return (parseFloat(n) / parseFloat(d)).toString();
  });

  let hasNumber = false;
  const scaled = temp.replace(/(\d+(?:[\.,]\d+)?)/g, (match) => {
    hasNumber = true;
    const val = parseFloat(match.replace(',', '.'));
    if (isNaN(val)) return match;
    return formatValue(val * multiplier);
  });

  if (hasNumber) {
    return pluralizeUnits(scaled, multiplier);
  }

  return text;
};

const formatIngredientText = (name: string, amount?: string, multiplier: number = 1) => {
  let cleanName = name ? name.trim() : '';
  let cleanAmount = amount ? amount.trim() : '';

  // Clean out empty punctuation amounts (e.g. ".", "-", ":", ",")
  if (/^[\.\s\:\-\,]+$/.test(cleanAmount)) {
    cleanAmount = '';
  }

  // Clean leading dots or dashes from cleanName, and extra "de/do/da" if duplicated
  cleanName = cleanName.replace(/^[\.\s\:\-]+/, '').trim();
  if (cleanName.toLowerCase().startsWith('de ')) {
    cleanName = cleanName.slice(3).trim();
  } else if (cleanName.toLowerCase().startsWith('do ') || cleanName.toLowerCase().startsWith('da ')) {
    cleanName = cleanName.slice(3).trim();
  }

  if (!cleanAmount) {
    if (multiplier > 1) {
      const scaled = scaleNumericAmount(cleanName, multiplier);
      if (scaled !== cleanName) {
        return scaled;
      }
      return `${cleanName} (${multiplier}x)`;
    }
    return cleanName;
  }

  const lowerAmount = cleanAmount.toLowerCase();
  const lowerName = cleanName.toLowerCase();

  if (lowerAmount === 'a gosto' || lowerAmount === 'à vontade' || lowerAmount === 'opcional') {
    if (multiplier > 1) {
      return `${cleanName} (${cleanAmount} - ${multiplier}x)`;
    }
    return `${cleanName} (${cleanAmount})`;
  }

  if (lowerName.includes(lowerAmount) || lowerName.startsWith(cleanAmount)) {
    return scaleNumericAmount(cleanName, multiplier);
  }

  const scaledAmount = scaleNumericAmount(cleanAmount, multiplier);

  return `${scaledAmount} de ${cleanName}`;
};

export default function App() {
  const weather = useWeather();
  const [allRecipes, setAllRecipes] = useState<Recipe[]>(() => {
    try {
      const savedCustom = localStorage.getItem('coffee_user_custom_recipes');
      const customList: Recipe[] = savedCustom ? JSON.parse(savedCustom) : [];
      const base = [...recipes, ...defaultAccompaniments];
      const missingCustom = customList.filter(c => !base.some(b => b.id === c.id || b.name === c.name));
      return [...base, ...missingCustom];
    } catch {
      return [...recipes, ...defaultAccompaniments];
    }
  });
  const [currentJourney, setCurrentJourney] = useState<JourneyStep[]>(coffeeJourney);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(true);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'accompaniments' | 'favorites' | 'journey'>('home');
  
  // Weather Config State
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [editTemp, setEditTemp] = useState(20);
  const [editLocation, setEditLocation] = useState('Belo Horizonte');
  const [editCondition, setEditCondition] = useState('Ensolarado');
  
  // Admin State
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [editingEquipmentIndex, setEditingEquipmentIndex] = useState<number | null>(null);
  const [editingEquipmentValue, setEditingEquipmentValue] = useState<string>('');
  const [editingRecipeNameId, setEditingRecipeNameId] = useState<string | null>(null);
  const [editingRecipeNameValue, setEditingRecipeNameValue] = useState<string>('');
  
  // Temp states for dynamic fields
  const [tempIngredient, setTempIngredient] = useState({ name: '', amount: '' });
  const [tempEquipment, setTempEquipment] = useState('');
  const [selectedTempIngredientIcon, setSelectedTempIngredientIcon] = useState<string>('');
  const [selectedTempEquipmentIcon, setSelectedTempEquipmentIcon] = useState<string>('');
  const [tempStep, setTempStep] = useState({ title: '', description: '', image: '' });
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

  // Custom Equipment & Ingredient Icon History saved in localStorage
  const [customEquipmentHistory, setCustomEquipmentHistory] = useState<{ name: string; image: string }[]>(() => {
    try {
      const saved = localStorage.getItem('coffee_custom_equipment_presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customIngredientIconHistory, setCustomIngredientIconHistory] = useState<{ label: string; iconUrl: string }[]>(() => {
    try {
      const saved = localStorage.getItem('coffee_custom_ingredient_icons');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveEquipmentToHistory = (name: string, image: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const cleanImage = image.trim();
    setCustomEquipmentHistory(prev => {
      const exists = prev.some(item => item.name.toLowerCase() === cleanName.toLowerCase() && item.image === cleanImage);
      if (exists) return prev;
      const updated = [{ name: cleanName, image: cleanImage }, ...prev];
      localStorage.setItem('coffee_custom_equipment_presets', JSON.stringify(updated));
      updateSettingsKey('custom_equipment_presets', JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  };

  const removeEquipmentFromHistory = (index: number) => {
    setCustomEquipmentHistory(prev => {
      const updated = prev.filter((_, i) => i !== index);
      localStorage.setItem('coffee_custom_equipment_presets', JSON.stringify(updated));
      updateSettingsKey('custom_equipment_presets', JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  };

  const saveIngredientIconToHistory = (label: string, iconUrl: string) => {
    const cleanUrl = iconUrl.trim();
    if (!cleanUrl) return;
    const cleanLabel = label.trim() || 'Ícone';
    setCustomIngredientIconHistory(prev => {
      const exists = prev.some(item => item.iconUrl === cleanUrl);
      if (exists) return prev;
      const updated = [{ label: cleanLabel, iconUrl: cleanUrl }, ...prev];
      localStorage.setItem('coffee_custom_ingredient_icons', JSON.stringify(updated));
      updateSettingsKey('custom_ingredient_icons', JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  };

  const removeIngredientIconFromHistory = (index: number) => {
    setCustomIngredientIconHistory(prev => {
      const updated = prev.filter((_, i) => i !== index);
      localStorage.setItem('coffee_custom_ingredient_icons', JSON.stringify(updated));
      updateSettingsKey('custom_ingredient_icons', JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  };

  const combinedEquipmentCatalog = useMemo(() => {
    const list: { name: string; image: string; isCustom?: boolean; customIndex?: number }[] = [];
    const seenNames = new Set<string>();

    customEquipmentHistory.forEach((item, idx) => {
      list.push({ ...item, isCustom: true, customIndex: idx });
      seenNames.add(item.name.toLowerCase());
    });

    ILLUSTRATED_EQUIPMENT_PRESETS.forEach(preset => {
      if (!seenNames.has(preset.name.toLowerCase())) {
        list.push(preset);
        seenNames.add(preset.name.toLowerCase());
      }
    });

    return list;
  }, [customEquipmentHistory]);
  
  const [newRecipe, setNewRecipe] = useState<Partial<Recipe>>({
    name: '',
    country: 'Brasil',
    category: 'Espresso',
    difficulty: 'Easy',
    prepTime: '',
    description: '',
    image: '',
    ingredients: [],
    equipment: [],
    detailedIngredients: [],
    steps: [],
    weatherSuitability: ['neutral']
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('coffee_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipePortions, setRecipePortions] = useState<number>(1);

  useEffect(() => {
    setRecipePortions(1);
  }, [selectedRecipe]);
  const [activeModalTab, setActiveModalTab] = useState<'sobre' | 'ingredientes' | 'preparo'>('sobre');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFullScreenSteps, setIsFullScreenSteps] = useState(false);
  const [isExplainingRecommendation, setIsExplainingRecommendation] = useState(false);
  const [recommendation, setRecommendation] = useState<{ recipeId: string, reason: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [welcomePhrase, setWelcomePhrase] = useState('');
  const [appLogo, setAppLogo] = useState<string | null>(() => localStorage.getItem('coffee_app_logo'));
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isInitialAuthCheck, setIsInitialAuthCheck] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(true);
  const [subscriptionDetails, setSubscriptionDetails] = useState<{
    status?: string,
    currentPeriodEnd?: number,
    cancelAtPeriodEnd?: boolean
  } | null>(null);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [view, setView] = useState<'landing' | 'auth'>('landing');
  const [isGuestAccess, setIsGuestAccess] = useState<boolean>(() => {
    return localStorage.getItem('coffee_guest_access') === 'true';
  });
  const [guestName, setGuestName] = useState<string>(() => {
    return localStorage.getItem('coffee_guest_name') || '';
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeIngredients, setActiveIngredients] = useState<string[]>([]);
  const [activeEquipment, setActiveEquipment] = useState<string[]>([]);
  const [pendingIngredients, setPendingIngredients] = useState<string[]>([]);
  const [pendingEquipment, setPendingEquipment] = useState<string[]>([]);

  // Sync pending with active when opening
  useEffect(() => {
    if (showFilters) {
      setPendingIngredients(activeIngredients);
      setPendingEquipment(activeEquipment);
    }
  }, [showFilters, activeIngredients, activeEquipment]);

  useEffect(() => {
    if (selectedRecipe) {
      setActiveModalTab('sobre');
      setCurrentStepIndex(0);
    }
  }, [selectedRecipe]);

  useEffect(() => {
    const loadLogo = async () => {
      const logo = await fetchAppLogo();
      if (logo) {
        setAppLogo(logo);
        localStorage.setItem('coffee_app_logo', logo);
      }
    };
    loadLogo();
  }, []);

  useEffect(() => {
    const phrases = [
      "Seu cantinho do café já está pronto para mais uma receita especial.",
      "Que tal descobrir um novo café para preparar hoje?",
      "O aroma de uma nova receita de café já está esperando por você.",
      "Hoje é um ótimo dia para experimentar um café diferente.",
      "Seu próximo café favorito pode estar aqui. Vamos descobrir?",
      "Seu cantinho do café está pronto para mais um momento especial.",
      "Hora de preparar um café e aproveitar o momento.",
      "Que tal transformar hoje em um dia com mais café?",
      "Vamos preparar algo delicioso hoje?",
      "Uma nova receita de café está esperando por você.",
      "Descubra um novo sabor de café para hoje.",
      "O momento perfeito para um bom café começa agora."
    ];
    setWelcomePhrase(phrases[Math.floor(Math.random() * phrases.length)]);
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || guestName || 'Barista';
  const capitalizedName = userName.charAt(0).toUpperCase() + userName.slice(1);
  
  const coffeeCategories = useMemo(() => ['Espresso', 'Latte', 'Cappuccino', 'Cold Brew', 'Specialty'], []);
  const foodCategories = useMemo(() => ['Pães & Salgados', 'Bolos', 'Biscoitos & Doces'], []);

  const categories = useMemo(() => {
    if (activeTab === 'accompaniments') {
      return foodCategories;
    }
    return coffeeCategories;
  }, [activeTab, coffeeCategories, foodCategories]);

  const allIngredients = useMemo(() => 
    Array.from(new Set(allRecipes.flatMap(r => r.ingredients || [])))
      .filter(ing => typeof ing === 'string' && ing.trim() !== '')
      .sort(), 
  [allRecipes]);
  
  const allEquipment = useMemo(() => 
    Array.from(new Set(allRecipes.flatMap(r => r.equipment || [])))
      .filter(eq => typeof eq === 'string' && eq.trim() !== '')
      .sort(), 
  [allRecipes]);

  useEffect(() => {
    const loadAppData = async () => {
      try {
        let finalRecipes: Recipe[] = [];

        // Try fetching remote settings key for spreadsheet ID safely without blocking
        let remoteSpreadsheetId: string | null = null;
        try {
          remoteSpreadsheetId = await fetchSettingsKey('google_spreadsheet_id');
        } catch (e) {
          console.warn("Supabase settings fetch skipped:", e);
        }

        const sheetId = remoteSpreadsheetId || localStorage.getItem('coffee_google_spreadsheet_id');

        // 1. Primary Sync: Load data from Google Sheets if a sheet ID exists
        if (sheetId) {
          try {
            const sheetData = await readDataFromGoogleSheet(sheetId);
            if (sheetData.receitas_cafe && sheetData.receitas_cafe.length > 0) {
              finalRecipes = sheetData.receitas_cafe;
              localStorage.setItem('coffee_google_spreadsheet_id', sheetId);
            }
            if (sheetData.jornada_do_cafe && sheetData.jornada_do_cafe.length > 0) {
              setCurrentJourney(sheetData.jornada_do_cafe);
            }
            if (sheetData.logotipo_de_cafe) {
              setAppLogo(sheetData.logotipo_de_cafe);
              localStorage.setItem('coffee_app_logo', sheetData.logotipo_de_cafe);
            }
          } catch (sheetErr) {
            console.warn("Could not auto-sync Google Sheet on startup:", sheetErr);
          }
        }

        // 2. Fallback: If no recipes loaded from Google Sheets, check Supabase or defaults
        if (!finalRecipes || finalRecipes.length === 0) {
          try {
            const dbRecipes = await fetchRecipesFromSupabase();
            if (dbRecipes && dbRecipes.length > 0) {
              finalRecipes = dbRecipes;
            }
          } catch (e) {
            console.warn("Supabase recipe fetch skipped:", e);
          }
        }

        if (!finalRecipes || finalRecipes.length === 0) {
          finalRecipes = [...recipes, ...defaultAccompaniments];
        }

        // 3. Merge local custom recipes if any exist
        let customList: Recipe[] = [];
        try {
          const savedCustom = localStorage.getItem('coffee_user_custom_recipes');
          if (savedCustom) customList = JSON.parse(savedCustom);
        } catch (e) {
          console.warn("Could not parse coffee_user_custom_recipes:", e);
        }

        if (customList.length > 0) {
          const mergedMap = new globalThis.Map<string, Recipe>();
          finalRecipes.forEach(r => mergedMap.set(r.name || r.id, r));
          customList.forEach(c => mergedMap.set(c.name || c.id, c));
          finalRecipes = Array.from(mergedMap.values());
        }

        // 4. Apply local overrides
        try {
          const savedOverrides = localStorage.getItem('coffee_recipe_overrides');
          if (savedOverrides) {
            const overrides = JSON.parse(savedOverrides);
            finalRecipes = finalRecipes.map(r => {
              const o = overrides[r.id];
              if (o) {
                return {
                  ...r,
                  name: o.name !== undefined ? o.name : r.name,
                  equipment: o.equipment !== undefined ? o.equipment : r.equipment,
                };
              }
              return r;
            });
          }
        } catch (overrideErr) {
          console.error("Error applying recipe overrides on mount:", overrideErr);
        }

        setAllRecipes(finalRecipes);

        // Synchronize custom equipment history & ingredient icons with Supabase settings & recipe extraction
        let remoteEquipment: { name: string; image: string }[] = [];
        let remoteIngredientIcons: { label: string; iconUrl: string }[] = [];
        try {
          const [eqJson, ingJson] = await Promise.all([
            fetchSettingsKey('custom_equipment_presets'),
            fetchSettingsKey('custom_ingredient_icons')
          ]);
          if (eqJson) remoteEquipment = JSON.parse(eqJson);
          if (ingJson) remoteIngredientIcons = JSON.parse(ingJson);
        } catch (e) {
          console.warn('Could not fetch custom presets from Supabase:', e);
        }

        // Extract equipment & custom ingredient icons from all recipes in database
        const recipeEquipment: { name: string; image: string }[] = [];
        const recipeIngredientIcons: { label: string; iconUrl: string }[] = [];

        finalRecipes.forEach(r => {
          (r.equipment || []).forEach(eq => {
            if (typeof eq === 'string' && eq.includes('::')) {
              const parts = eq.split('::');
              const eqName = parts[0].trim();
              const eqImg = parts.slice(1).join('::').trim();
              if (eqName && (eqImg.startsWith('http') || eqImg.startsWith('data:image'))) {
                recipeEquipment.push({ name: eqName, image: eqImg });
              }
            }
          });

          (r.detailedIngredients || []).forEach(ing => {
            if (ing && ing.icon && (ing.icon.startsWith('http') || ing.icon.startsWith('data:image'))) {
              recipeIngredientIcons.push({ label: ing.name || 'Ícone', iconUrl: ing.icon });
            }
          });
        });

        // Merge local, remote, and recipe extracted custom equipment
        setCustomEquipmentHistory(prev => {
          const merged: { name: string; image: string }[] = [];
          const seen = new Set<string>();

          [...prev, ...remoteEquipment, ...recipeEquipment].forEach(item => {
            if (!item || !item.name) return;
            const key = `${item.name.toLowerCase()}||${item.image || ''}`;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(item);
            }
          });

          localStorage.setItem('coffee_custom_equipment_presets', JSON.stringify(merged));
          updateSettingsKey('custom_equipment_presets', JSON.stringify(merged)).catch(console.error);
          return merged;
        });

        // Merge local, remote, and recipe extracted custom ingredient icons
        setCustomIngredientIconHistory(prev => {
          const merged: { label: string; iconUrl: string }[] = [];
          const seen = new Set<string>();

          [...prev, ...remoteIngredientIcons, ...recipeIngredientIcons].forEach(item => {
            if (!item || !item.iconUrl) return;
            const key = item.iconUrl;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(item);
            }
          });

          localStorage.setItem('coffee_custom_ingredient_icons', JSON.stringify(merged));
          updateSettingsKey('custom_ingredient_icons', JSON.stringify(merged)).catch(console.error);
          return merged;
        });

        try {
          const dbJourney = await fetchJourneyFromSupabase();
          if (dbJourney && dbJourney.length > 0) {
            setCurrentJourney(dbJourney);
          }
        } catch (jErr) {
          console.warn("Journey fetch from Supabase skipped:", jErr);
        }

        setSupabaseError(null);
      } catch (err: any) {
        console.error("Failed to load app data:", err);
      } finally {
        setIsLoadingSupabase(false);
      }
    };
    loadAppData();
  }, []);

  useEffect(() => {
    setSelectedCategory(null);
    setSearchQuery('');
    setActiveIngredients([]);
    setActiveEquipment([]);
    setPendingIngredients([]);
    setPendingEquipment([]);
  }, [activeTab]);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsInitialAuthCheck(false);
    }).catch(() => {
      setIsInitialAuthCheck(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsInitialAuthCheck(false);
    });

    // Safety timeout for preview
    const timeout = setTimeout(() => setIsInitialAuthCheck(false), 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    setIsPremium(true);
    setSubscriptionChecked(true);
  }, [user]);

  useEffect(() => {
    localStorage.setItem('coffee_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const [configError, setConfigError] = useState<string | null>(null);

  const handleUpdateName = async () => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    // Validate length and sanitize HTML tags to prevent XSS
    if (trimmedName.length > 50) {
      alert('O nome deve ter no máximo 50 caracteres.');
      return;
    }
    const sanitizedName = trimmedName.replace(/<[^>]*>/g, '');
    if (!sanitizedName) {
      alert('Por favor, insira um nome válido.');
      return;
    }

    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: sanitizedName }
      });
      if (error) throw error;
      setIsEditingName(false);
      setSuccessMessage('Nome atualizado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao atualizar nome:', err);
      alert('Erro ao atualizar nome: ' + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    const emailTrimmed = authEmail.trim();
    const passwordTrimmed = authPassword;

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailTrimmed) {
      setAuthError('O e-mail é obrigatório.');
      setAuthLoading(false);
      return;
    }
    if (emailTrimmed.length > 100 || !emailRegex.test(emailTrimmed)) {
      setAuthError('Por favor, insira um e-mail válido (máximo 100 caracteres).');
      setAuthLoading(false);
      return;
    }

    // Validate password format
    if (!passwordTrimmed || passwordTrimmed.length < 6) {
      setAuthError('A senha deve ter pelo menos 6 caracteres.');
      setAuthLoading(false);
      return;
    }
    if (passwordTrimmed.length > 100) {
      setAuthError('A senha deve ter no máximo 100 caracteres.');
      setAuthLoading(false);
      return;
    }

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailTrimmed,
          password: passwordTrimmed,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: emailTrimmed,
          password: passwordTrimmed,
        });
        if (error) throw error;
        
        // Se o usuário foi criado com sucesso e a confirmação está desativada,
        // o Supabase pode ou não logar automaticamente. 
        // Para garantir, tentamos o login logo após o cadastro.
        if (data.user) {
          await supabase.auth.signInWithPassword({
            email: emailTrimmed,
            password: passwordTrimmed,
          });
        }
      }
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      let message = err.message;
      if (message === 'Invalid login credentials') {
        message = 'E-mail ou senha incorretos.';
      } else if (message === 'User already registered') {
        message = 'Este e-mail já está cadastrado.';
      } else if (message.includes('at least 6 characters')) {
        message = 'A senha deve ter pelo menos 6 caracteres.';
      }
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setShowUserMenu(false);
    await supabase.auth.signOut();
    setUser(null);
    setIsPremium(true);
    setIsGuestAccess(false);
    localStorage.removeItem('coffee_guest_access');
    setView('landing');
  };

  useEffect(() => {
    if (!weather.loading && allRecipes.length > 0) {
      const coffeeRecipesOnly = allRecipes.filter(r => !foodCategories.includes(r.category));
      const rec = getLocalCoffeeRecommendation({ temp: weather.temp, condition: weather.condition }, coffeeRecipesOnly);
      setRecommendation(rec);
    }
  }, [weather.loading, weather.temp, weather.condition, allRecipes, foodCategories]);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(favId => favId !== id) : [...prev, id]
    );
  };

  const recommendedRecipe = useMemo(() => 
    allRecipes.find(r => r.id === recommendation?.recipeId), 
  [recommendation, allRecipes]);

  const filteredRecipes = useMemo(() => {
    let baseList = allRecipes;
    if (activeTab === 'favorites') {
      baseList = allRecipes.filter(r => favorites.includes(r.id));
    } else if (activeTab === 'accompaniments') {
      baseList = allRecipes.filter(r => foodCategories.includes(r.category));
    } else {
      // home tab (coffees)
      baseList = allRecipes.filter(r => !foodCategories.includes(r.category));
    }

    return baseList.filter(recipe => {
      if (!recipe || !recipe.name) return false;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
                          (recipe.name && recipe.name.toLowerCase().includes(q)) ||
                          (recipe.description && recipe.description.toLowerCase().includes(q)) ||
                          (recipe.country && recipe.country.toLowerCase().includes(q));
      const matchesCategory = !selectedCategory || recipe.category === selectedCategory;
      const matchesIngredients = activeIngredients.length === 0 || 
                                (recipe.ingredients && activeIngredients.every(ing => recipe.ingredients.includes(ing)));
      const matchesEquipment = activeEquipment.length === 0 || 
                             (recipe.equipment && activeEquipment.every(eq => recipe.equipment.includes(eq)));
      
      return matchesSearch && matchesCategory && matchesIngredients && matchesEquipment;
    });
  }, [searchQuery, selectedCategory, activeIngredients, activeEquipment, activeTab, favorites, allRecipes, foodCategories]);

  const toggleIngredient = (ing: string) => {
    setPendingIngredients(prev => 
      prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]
    );
  };

  const toggleEquipment = (eq: string) => {
    setPendingEquipment(prev => 
      prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]
    );
  };

  const applyFilters = () => {
    setActiveIngredients(pendingIngredients);
    setActiveEquipment(pendingEquipment);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setPendingIngredients([]);
    setPendingEquipment([]);
    setActiveIngredients([]);
    setActiveEquipment([]);
    setShowFilters(false);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'replanificando.1234') {
      setIsAdminAuthenticated(true);
      setShowAdminLogin(false);
      setShowAdminPanel(true);
      setAdminPassword('');
    } else {
      alert('Senha incorreta!');
    }
  };

  const handleAddRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdminAuthenticated) {
      alert('Acesso negado. Apenas administradores autenticados podem adicionar ou editar receitas.');
      return;
    }
    
    // Validate inputs
    if (!newRecipe.name || !newRecipe.name.trim()) {
      alert('O nome da receita é obrigatório.');
      return;
    }

    // Sanitization function to strip HTML/JS tags and prevent XSS
    const sanitize = (text: string) => text.replace(/<[^>]*>/g, '').trim();

    newRecipe.name = sanitize(newRecipe.name).substring(0, 100);
    newRecipe.country = sanitize(newRecipe.country || 'Brasil').substring(0, 50);
    newRecipe.prepTime = sanitize(newRecipe.prepTime || '').substring(0, 30);
    newRecipe.description = sanitize(newRecipe.description || '').substring(0, 1000);
    newRecipe.image = sanitize(newRecipe.image || '');

    // Auto-add pending step if it has content
    if (tempStep.title && tempStep.description) {
      const sanitizedStepTitle = sanitize(tempStep.title).substring(0, 100);
      const sanitizedStepDesc = sanitize(tempStep.description).substring(0, 1000);
      const sanitizedStepImg = sanitize(tempStep.image || '');

      const steps = [...(newRecipe.steps || [])];
      if (editingStepIndex !== null) {
        steps[editingStepIndex] = { 
          title: sanitizedStepTitle, 
          description: sanitizedStepDesc, 
          image: sanitizedStepImg 
        };
      } else {
        steps.push({ 
          title: sanitizedStepTitle, 
          description: sanitizedStepDesc, 
          image: sanitizedStepImg 
        });
      }
      newRecipe.steps = steps;
      setTempStep({ title: '', description: '', image: '' });
      setEditingStepIndex(null);
    }

    setIsSubmitting(true);
    console.log("Submitting recipe image URL:", newRecipe.image);
    console.log("Full recipe object:", newRecipe);
    try {
      let updatedRecipe: Recipe | null = null;
      if (editingRecipeId) {
        const result = await updateRecipeInSupabase(editingRecipeId, newRecipe);
        console.log("Update result:", result);
        
        if (result && result.length > 0) {
          const item = result[0];
          updatedRecipe = {
            id: item.id.toString(),
            name: item.nome,
            country: item.pais || 'Brasil',
            description: item.descricao || '',
            image: item.imagem_url || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=1000&auto=format&fit=crop',
            ingredients: Array.isArray(item.ingredientes) ? item.ingredientes.map((i: any) => typeof i === 'string' ? i : i.name) : [],
            equipment: Array.isArray(item.equipamentos) ? item.equipamentos : [],
            detailedIngredients: Array.isArray(item.ingredientes) ? item.ingredientes : [],
            steps: Array.isArray(item.modo_preparo) ? item.modo_preparo : [],
            weatherSuitability: item.clima_adequado || ['neutral'],
            category: item.categoria || 'Specialty',
            difficulty: item.dificuldade || 'Medium',
            prepTime: item.tempo_preparo || '5 min'
          };
        } else {
          // If update didn't find the record, it might be a local mock recipe.
          // Let's try to insert it as a new record.
          console.log("Record not found in Supabase, inserting as new...");
          await insertRecipeToSupabase(newRecipe as Omit<Recipe, 'id'>);
        }
      } else {
        await insertRecipeToSupabase(newRecipe as Omit<Recipe, 'id'>);
      }
      
      // Save to local custom list as fallback
      const savedCustom = localStorage.getItem('coffee_user_custom_recipes');
      let customList: Recipe[] = savedCustom ? JSON.parse(savedCustom) : [];
      const recipeToSave: Recipe = {
        id: editingRecipeId || `custom-${Date.now()}`,
        name: newRecipe.name || 'Nova Receita',
        country: newRecipe.country || 'Brasil',
        description: newRecipe.description || '',
        image: newRecipe.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=1000&auto=format&fit=crop',
        ingredients: newRecipe.ingredients || [],
        equipment: newRecipe.equipment || [],
        detailedIngredients: newRecipe.detailedIngredients || [],
        steps: newRecipe.steps || [],
        weatherSuitability: newRecipe.weatherSuitability || ['neutral'],
        category: (newRecipe.category as any) || 'Specialty',
        difficulty: (newRecipe.difficulty as any) || 'Medium',
        prepTime: newRecipe.prepTime || '5 min'
      };

      if (editingRecipeId) {
        customList = customList.map(r => r.id === editingRecipeId ? recipeToSave : r);
      } else {
        customList.push(recipeToSave);
      }
      localStorage.setItem('coffee_user_custom_recipes', JSON.stringify(customList));

      let dbRecipes: Recipe[] = [];
      try {
        dbRecipes = await fetchRecipesFromSupabase();
      } catch (e) {
        console.warn("Could not fetch fresh recipes from Supabase after save:", e);
      }

      // Merge all recipe sources (defaults, local custom, current state, database)
      const baseDefaults = [...recipes, ...defaultAccompaniments];
      const mergedMap = new globalThis.Map<string, Recipe>();

      baseDefaults.forEach(r => mergedMap.set(r.id, r));
      customList.forEach(c => mergedMap.set(c.id, c));
      allRecipes.forEach(r => mergedMap.set(r.id, r));
      if (dbRecipes && dbRecipes.length > 0) {
        dbRecipes.forEach((dbR: Recipe) => {
          if (dbR.name && dbR.name !== 'Receita sem nome') {
            const existing = mergedMap.get(dbR.id);
            mergedMap.set(dbR.id, { ...existing, ...dbR } as Recipe);
          }
        });
      }
      
      const finalMergedList: Recipe[] = Array.from(mergedMap.values());
      setAllRecipes(finalMergedList);

      // Reset category and search filters so all recipes are immediately visible
      setSelectedCategory(null);
      setSearchQuery('');
      if ((foodCategories as string[]).includes(recipeToSave.category)) {
        setActiveTab('accompaniments');
      } else {
        setActiveTab('home');
      }
      
      // Update selectedRecipe if it was the one being edited
      if (editingRecipeId && selectedRecipe?.id === editingRecipeId && updatedRecipe) {
        setSelectedRecipe(updatedRecipe);
      } else if (editingRecipeId && selectedRecipe?.id === editingRecipeId) {
        // Fallback if result mapping failed
        const refreshed = finalMergedList.find((r: Recipe) => r.id === editingRecipeId);
        if (refreshed) setSelectedRecipe(refreshed);
      }

      setEditingRecipeId(null);
      setNewRecipe({
        name: '',
        country: 'Brasil',
        category: 'Espresso',
        difficulty: 'Easy',
        prepTime: '',
        description: '',
        image: '',
        ingredients: [],
        equipment: [],
        detailedIngredients: [],
        steps: [],
        weatherSuitability: ['neutral']
      });
      alert(editingRecipeId ? 'Receita atualizada com sucesso!' : 'Receita adicionada com sucesso!');
    } catch (err: any) {
      alert('Erro: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeedRecipes = async () => {
    if (!isAdminAuthenticated) {
      alert('Acesso negado. Apenas administradores autenticados podem inicializar dados (seed).');
      return;
    }
    if (!confirm('Deseja carregar as receitas iniciais no banco de dados?')) return;
    setIsSubmitting(true);
    try {
      await seedRecipes(recipes);
      const dbRecipes = await fetchRecipesFromSupabase();
      setAllRecipes(dbRecipes || []);
      alert('Receitas sincronizadas com sucesso!');
    } catch (err: any) {
      alert('Erro ao sincronizar: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSheetsImported = async (data: {
    recipes?: Recipe[];
    journey?: JourneyStep[];
    logoUrl?: string;
    settings?: Record<string, any>;
  }) => {
    if (data.recipes && data.recipes.length > 0) {
      setAllRecipes(data.recipes);
      // reset filters
      setSelectedCategory(null);
      setSearchQuery('');

      try {
        await seedRecipes(data.recipes);
      } catch (err) {
        console.warn("Could not sync imported recipes to Supabase:", err);
      }
    }
    if (data.journey && data.journey.length > 0) {
      setCurrentJourney(data.journey);
      try {
        await seedJourney(data.journey);
      } catch (err) {
        console.warn("Could not sync imported journey to Supabase:", err);
      }
    }
    if (data.logoUrl) {
      setAppLogo(data.logoUrl);
      localStorage.setItem('coffee_app_logo', data.logoUrl);
      try {
        await updateAppLogo(data.logoUrl);
      } catch (err) {
        console.warn("Could not sync imported app logo to Supabase:", err);
      }
    }
  };

  const handleEditClick = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setNewRecipe({
      name: recipe.name,
      country: recipe.country,
      category: recipe.category,
      difficulty: recipe.difficulty,
      prepTime: recipe.prepTime,
      description: recipe.description,
      image: recipe.image,
      ingredients: recipe.ingredients,
      equipment: recipe.equipment,
      detailedIngredients: recipe.detailedIngredients,
      steps: recipe.steps,
      weatherSuitability: recipe.weatherSuitability
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingRecipeId(null);
    setNewRecipe({
      name: '',
      country: 'Brasil',
      category: 'Espresso',
      difficulty: 'Easy',
      prepTime: '',
      description: '',
      image: '',
      ingredients: [],
      equipment: [],
      detailedIngredients: [],
      steps: [],
      weatherSuitability: ['neutral']
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewRecipe(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStepImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempStep(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdminAuthenticated) {
      alert('Acesso negado. Apenas administradores autenticados podem alterar o logo.');
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert('O logo deve ter no máximo 1MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setAppLogo(base64);
        localStorage.setItem('coffee_app_logo', base64);
        try {
          await updateAppLogo(base64);
        } catch (err) {
          console.error('Erro ao salvar logo no Supabase:', err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const resetLogo = async () => {
    if (!isAdminAuthenticated) {
      alert('Acesso negado. Apenas administradores autenticados podem resetar o logo.');
      return;
    }
    setAppLogo(null);
    localStorage.removeItem('coffee_app_logo');
    try {
      await updateAppLogo('');
    } catch (err) {
      console.error('Erro ao resetar logo no Supabase:', err);
    }
  };

  const addIngredient = () => {
    if (!tempIngredient.name || !tempIngredient.amount) return;
    const ingredientWithIcon = {
      ...tempIngredient,
      icon: selectedTempIngredientIcon || undefined
    };

    // Auto-save custom icon to history if it's a URL
    if (selectedTempIngredientIcon && (selectedTempIngredientIcon.startsWith('http') || selectedTempIngredientIcon.startsWith('data:image'))) {
      saveIngredientIconToHistory(tempIngredient.name, selectedTempIngredientIcon);
    }

    setNewRecipe(prev => ({
      ...prev,
      detailedIngredients: [...(prev.detailedIngredients || []), ingredientWithIcon],
      ingredients: [...(prev.ingredients || []), tempIngredient.name]
    }));
    setTempIngredient({ name: '', amount: '' });
    setSelectedTempIngredientIcon('');
  };

  const removeIngredient = (index: number) => {
    setNewRecipe(prev => ({
      ...prev,
      detailedIngredients: prev.detailedIngredients?.filter((_, i) => i !== index),
      ingredients: prev.ingredients?.filter((_, i) => i !== index)
    }));
  };

  const addEquipment = () => {
    if (!tempEquipment) return;
    const finalEquipment = selectedTempEquipmentIcon 
      ? `${tempEquipment}::${selectedTempEquipmentIcon}` 
      : tempEquipment;

    // Auto-save equipment & custom icon image to history
    saveEquipmentToHistory(tempEquipment, selectedTempEquipmentIcon || '');

    setNewRecipe(prev => ({
      ...prev,
      equipment: [...(prev.equipment || []), finalEquipment]
    }));
    setTempEquipment('');
    setSelectedTempEquipmentIcon('');
  };

  const removeEquipment = (index: number) => {
    setNewRecipe(prev => ({
      ...prev,
      equipment: prev.equipment?.filter((_, i) => i !== index)
    }));
  };

  const addStep = () => {
    if (!tempStep.title || !tempStep.description) return;
    
    setNewRecipe(prev => {
      const steps = [...(prev.steps || [])];
      if (editingStepIndex !== null) {
        steps[editingStepIndex] = { ...tempStep };
      } else {
        steps.push({ ...tempStep });
      }
      return { ...prev, steps };
    });
    
    setTempStep({ title: '', description: '', image: '' });
    setEditingStepIndex(null);
  };

  const editStep = (index: number) => {
    const step = newRecipe.steps?.[index];
    if (step) {
      setTempStep({ 
        title: step.title, 
        description: step.description, 
        image: step.image || '' 
      });
      setEditingStepIndex(index);
    }
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    setNewRecipe(prev => {
      const steps = [...(prev.steps || [])];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= steps.length) return prev;
      
      const temp = steps[index];
      steps[index] = steps[newIndex];
      steps[newIndex] = temp;
      
      return { ...prev, steps };
    });
  };

  const removeStep = (index: number) => {
    setNewRecipe(prev => ({
      ...prev,
      steps: prev.steps?.filter((_, i) => i !== index)
    }));
    if (editingStepIndex === index) {
      setEditingStepIndex(null);
      setTempStep({ title: '', description: '', image: '' });
    }
  };

  const saveRecipeOverride = async (recipeId: string, fields: { name?: string; equipment?: string[] }) => {
    // 1. Update localStorage
    try {
      const savedOverrides = localStorage.getItem('coffee_recipe_overrides');
      const overrides = savedOverrides ? JSON.parse(savedOverrides) : {};
      overrides[recipeId] = {
        ...overrides[recipeId],
        ...fields
      };
      localStorage.setItem('coffee_recipe_overrides', JSON.stringify(overrides));
    } catch (err) {
      console.error("Failed to save override to localStorage:", err);
    }

    // 2. Update state of allRecipes
    setAllRecipes(prev => prev.map(r => {
      if (r.id === recipeId) {
        return {
          ...r,
          ...fields
        };
      }
      return r;
    }));

    // 3. Update selectedRecipe if it is the current one
    if (selectedRecipe && selectedRecipe.id === recipeId) {
      setSelectedRecipe(prev => prev ? {
        ...prev,
        ...fields
      } : null);
    }

    // 4. Try to sync to Supabase (if we have permissions/are admin, otherwise ignore gracefully)
    try {
      await updateRecipeInSupabase(recipeId, fields);
    } catch (err) {
      console.log("Supabase save skipped (local override saved successfully):", err);
    }
  };

  const resetRecipeNameToDefault = async (recipeId: string) => {
    try {
      const original = [...recipes, ...defaultAccompaniments].find(r => r.id === recipeId);
      const defaultName = original ? original.name : '';
      if (!defaultName) return;

      // 1. Update localStorage by removing the name override
      const savedOverrides = localStorage.getItem('coffee_recipe_overrides');
      if (savedOverrides) {
        const overrides = JSON.parse(savedOverrides);
        if (overrides[recipeId]) {
          delete overrides[recipeId].name;
          if (Object.keys(overrides[recipeId]).length === 0) {
            delete overrides[recipeId];
          }
          localStorage.setItem('coffee_recipe_overrides', JSON.stringify(overrides));
        }
      }

      // 2. Update state of allRecipes
      setAllRecipes(prev => prev.map(r => {
        if (r.id === recipeId) {
          return {
            ...r,
            name: defaultName
          };
        }
        return r;
      }));

      // 3. Update selectedRecipe if it is the current one
      if (selectedRecipe && selectedRecipe.id === recipeId) {
        setSelectedRecipe(prev => prev ? {
          ...prev,
          name: defaultName
        } : null);
      }

      // 4. Try to sync to Supabase (if we have permissions/are admin, otherwise ignore gracefully)
      try {
        await updateRecipeInSupabase(recipeId, { name: defaultName });
      } catch (err) {
        console.log("Supabase reset skipped:", err);
      }
    } catch (err) {
      console.error("Failed to reset recipe name:", err);
    }
  };

  const resetEquipmentToDefault = async (recipeId: string, equipmentIndex: number) => {
    try {
      const originalRecipe = [...recipes, ...defaultAccompaniments].find(r => r.id === recipeId);
      if (!originalRecipe || !originalRecipe.equipment || !originalRecipe.equipment[equipmentIndex]) return;

      const defaultEq = originalRecipe.equipment[equipmentIndex];
      const defaultParts = defaultEq.split('::');
      const defaultName = defaultParts[0];

      // Temporary update to state
      const recipe = allRecipes.find(r => r.id === recipeId);
      if (!recipe) return;

      const updatedEquipment = [...recipe.equipment];
      updatedEquipment[equipmentIndex] = defaultEq; // restore the full original string including ::icon if any

      await saveRecipeOverride(recipeId, { equipment: updatedEquipment });

      // Clean up localStorage override if no equipment is customized anymore
      const hasDifferences = updatedEquipment.some((eq, idx) => {
        const origEq = originalRecipe.equipment[idx];
        return eq !== origEq;
      });

      if (!hasDifferences) {
        const savedOverrides = localStorage.getItem('coffee_recipe_overrides');
        if (savedOverrides) {
          const overrides = JSON.parse(savedOverrides);
          if (overrides[recipeId]) {
            delete overrides[recipeId].equipment;
            if (Object.keys(overrides[recipeId]).length === 0) {
              delete overrides[recipeId];
            }
            localStorage.setItem('coffee_recipe_overrides', JSON.stringify(overrides));
          }
        }
      }
    } catch (err) {
      console.error("Failed to reset equipment to default:", err);
    }
  };

  const handleRenameEquipment = async (recipeId: string, equipmentIndex: number, newName: string) => {
    if (!newName.trim()) return;
    try {
      const recipe = allRecipes.find(r => r.id === recipeId);
      if (!recipe) return;

      const originalEq = recipe.equipment[equipmentIndex];
      const parts = originalEq.split('::');
      parts[0] = newName.trim();
      const newEq = parts.join('::');

      const updatedEquipment = [...recipe.equipment];
      updatedEquipment[equipmentIndex] = newEq;

      await saveRecipeOverride(recipeId, { equipment: updatedEquipment });
    } catch (err) {
      console.error("Failed to rename equipment:", err);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!isAdminAuthenticated) {
      alert('Acesso negado. Apenas administradores autenticados podem excluir receitas.');
      return;
    }
    if (!confirm('Tem certeza que deseja excluir esta receita?')) return;
    try {
      try {
        await deleteRecipeFromSupabase(id);
      } catch (err) {
        console.warn("Could not delete recipe from Supabase:", err);
      }

      // Also remove from local custom storage
      let customList: Recipe[] = [];
      const savedCustom = localStorage.getItem('coffee_user_custom_recipes');
      if (savedCustom) {
        customList = JSON.parse(savedCustom);
        customList = customList.filter(r => r.id !== id);
        localStorage.setItem('coffee_user_custom_recipes', JSON.stringify(customList));
      }

      let dbRecipes: Recipe[] = [];
      try {
        dbRecipes = await fetchRecipesFromSupabase();
      } catch (e) {
        console.warn("Could not fetch fresh recipes from Supabase after delete:", e);
      }

      let merged = dbRecipes && dbRecipes.length > 0 ? dbRecipes : [];
      const base = [...recipes, ...defaultAccompaniments].filter(r => r.id !== id);
      const missingDefaults = base.filter(dr => !merged.some(r => r.name === dr.name || r.id === dr.id));
      const missingCustom = customList.filter(c => !merged.some(r => r.name === c.name || r.id === c.id));
      merged = [...merged, ...missingDefaults, ...missingCustom];

      setAllRecipes(merged);
      alert('Receita excluída!');
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  if (isInitialAuthCheck || (user && isCheckingSubscription) || (user && !subscriptionChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-coffee-100 flex items-center justify-center border-4 border-coffee-200 p-3">
            <img src={appLogo || DEFAULT_LOGO} alt="Loading Logo" className="w-full h-full object-contain animate-pulse" referrerPolicy="no-referrer" />
          </div>
          <Loader2 className="animate-spin text-coffee-400" size={24} />
          <span className="text-xs font-bold text-coffee-400 uppercase tracking-widest">
            {isCheckingSubscription || (user && !subscriptionChecked) ? 'Verificando assinatura...' : 'Carregando...'}
          </span>
        </div>
      </div>
    );
  }

  // Se não tem usuário e não possui acesso de convidado, mostra Landing ou Auth
  if (!user && !isGuestAccess) {
    if (view === 'landing') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
          {/* Background Decorations */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-coffee-100 rounded-full blur-3xl opacity-60" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-coffee-200 rounded-full blur-3xl opacity-40" />
          </div>

          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] sm:rounded-[3rem] p-4 sm:p-6 w-full max-w-2xl shadow-2xl border border-coffee-100 relative z-10 text-center"
          >
            {/* Banner Image inside the Landing/Gate Card */}
            <div className="w-full overflow-hidden rounded-3xl border border-coffee-200/30 shadow-sm bg-white p-1 mb-2">
              <img 
                src="https://res.cloudinary.com/dvbifkpwd/image/upload/v1784087468/Group_73_1_igeu4v.png" 
                alt="Cheirinho Mineiro Especial" 
                className="w-full h-auto object-cover rounded-[1.3rem]"
                referrerPolicy="no-referrer"
              />
            </div>

            <motion.div 
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [-2, 2, -2]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="absolute -top-3 right-6 sm:right-10 bg-amber-600 text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-600/30"
            >
              Acesso Liberado
            </motion.div>

            {/* Removed redundant welcome text block in favor of the custom image banner */}

            {/* Floating Square Benefits */}
            <div className="block">
              {[
                { icon: Check, title: "Passo a passo", color: "text-emerald-500", pos: "-left-8 sm:-left-20 top-[5%] sm:top-[20%] -rotate-6" },
                { icon: Zap, title: "Personalizado", color: "text-amber-500", pos: "-right-8 sm:-right-20 top-[25%] sm:top-[35%] rotate-12" }
              ].map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8, x: i % 2 === 0 ? -20 : 20 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    x: 0,
                    y: [0, -10, 0]
                  }}
                  transition={{ 
                    opacity: { delay: 0.5 + (i * 0.2) },
                    scale: { delay: 0.5 + (i * 0.2) },
                    y: { duration: 3 + i, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className={cn(
                    "absolute p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-white shadow-2xl border border-coffee-100 flex flex-col items-center justify-center gap-1 sm:gap-2 z-20 w-20 h-20 sm:w-28 sm:h-28",
                    card.pos
                  )}
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-coffee-50 flex items-center justify-center">
                    <card.icon className={cn(card.color, "w-3.5 h-3.5 sm:w-5 sm:h-5")} />
                  </div>
                  <span className="text-[8px] sm:text-[10px] font-bold text-coffee-900 uppercase tracking-tight leading-none text-center">{card.title}</span>
                </motion.div>
              ))}
            </div>



            <div className="space-y-4">
              <div className="space-y-4 max-w-md mx-auto">
                <div className="text-left">
                  <label htmlFor="guest-name-input" className="block text-[10px] sm:text-xs font-bold text-coffee-500 uppercase tracking-widest mb-1 px-1">
                    Como deseja ser chamado? (Opcional)
                  </label>
                  <input
                    id="guest-name-input"
                    type="text"
                    value={guestName}
                    onChange={(e) => {
                      const value = e.target.value;
                      setGuestName(value);
                      localStorage.setItem('coffee_guest_name', value);
                    }}
                    placeholder="Ex: Barista Amador, Café Lover, João..."
                    className="w-full px-4 py-3 bg-white border border-coffee-200/80 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold text-coffee-900 placeholder:text-coffee-300 focus:outline-none focus:border-coffee-500 focus:ring-1 focus:ring-coffee-500/30 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="max-w-md mx-auto">
                  <button 
                    onClick={() => {
                      setIsGuestAccess(true);
                      localStorage.setItem('coffee_guest_access', 'true');
                    }}
                    className="block w-full bg-[#b88c42] text-white py-4 sm:py-5 rounded-xl sm:rounded-2xl font-bold hover:bg-[#a07430] border border-[#d4a359]/30 transition-all shadow-xl shadow-coffee-900/10 text-base sm:text-lg group relative overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      ☕ LIBERAR MEU ACESSO <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                  </button>
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-coffee-400 uppercase tracking-widest">
                  Acesso liberado imediatamente.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-coffee-100 rounded-full blur-3xl opacity-60" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-coffee-200 rounded-full blur-3xl opacity-40" />
        </div>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl border border-coffee-100 relative z-10"
        >
          <div className="flex flex-col items-center text-center mb-10">
            <button 
              onClick={() => setView('landing')}
              className="absolute top-8 left-8 text-coffee-400 hover:text-coffee-900 transition-colors"
            >
              <RotateCcw size={20} />
            </button>
            <button 
              onClick={() => setView('landing')}
              className="absolute top-8 right-8 text-coffee-400 hover:text-coffee-900 transition-colors"
              title="Fechar login"
              id="close-login-btn"
            >
              <X size={20} />
            </button>
            <div className="w-20 h-20 rounded-[2rem] bg-coffee-900 flex items-center justify-center mb-6 shadow-xl shadow-coffee-900/20 rotate-3 overflow-hidden p-4">
              <img src={appLogo || DEFAULT_LOGO} alt="Logo" className="w-full h-full object-contain brightness-0 invert" referrerPolicy="no-referrer" />
            </div>
            <h1 className="text-3xl font-sans font-bold text-coffee-900 mb-2">Cheirinho Mineiro</h1>
            <p className="text-sm text-coffee-500 font-medium">Sua jornada pelo café artesanal começa aqui.</p>
          </div>

          <div className="flex bg-coffee-50 p-1.5 rounded-2xl mb-8">
            <button 
              onClick={() => setAuthMode('login')}
              className={cn(
                "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                authMode === 'login' ? "bg-white text-coffee-900 shadow-sm" : "text-coffee-400 hover:text-coffee-600"
              )}
            >
              Entrar
            </button>
            <button 
              onClick={() => setAuthMode('signup')}
              className={cn(
                "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                authMode === 'signup' ? "bg-white text-coffee-900 shadow-sm" : "text-coffee-400 hover:text-coffee-600"
              )}
            >
              Cadastrar
            </button>
          </div>

          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-2xl text-xs font-bold mb-6 flex items-start gap-3"
            >
              <Sparkles size={18} className="shrink-0 mt-0.5" />
              {successMessage}
            </motion.div>
          )}

          {authError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-xs font-medium mb-6 flex items-center gap-2"
            >
              <Zap size={14} className="shrink-0" />
              {authError}
            </motion.div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-coffee-400 uppercase tracking-widest ml-1">E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-coffee-300">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-coffee-50 border border-coffee-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-coffee-200 transition-all text-sm"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-coffee-400 uppercase tracking-widest ml-1">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-coffee-300">
                  <Lock size={18} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-coffee-50 border border-coffee-100 rounded-2xl py-4 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-coffee-200 transition-all text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 flex items-center text-coffee-300 hover:text-coffee-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={authLoading}
              className="w-full bg-coffee-900 text-white py-5 rounded-2xl font-bold hover:bg-coffee-800 transition-all shadow-lg shadow-coffee-900/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {authLoading ? <Loader2 className="animate-spin" size={20} /> : (authMode === 'login' ? 'Entrar agora' : 'Criar minha conta')}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-coffee-50 z-30 border-b border-coffee-100/50 shadow-sm shadow-coffee-950/[0.01]">
        <div className="max-w-5xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full bg-coffee-100 flex items-center justify-center border-2 border-coffee-200 cursor-pointer text-coffee-700 overflow-hidden p-2"
            onClick={() => isAdminAuthenticated ? setShowAdminPanel(true) : setShowAdminLogin(true)}
          >
            <img src={appLogo || DEFAULT_LOGO} alt="App Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h1 className="text-xl font-sans font-bold text-coffee-900 leading-none">Cheirinho Mineiro</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isLoadingSupabase && (
            <div className="hidden sm:flex items-center gap-1.5 text-coffee-400 mr-2">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Sincronizando</span>
            </div>
          )}
          
          <div className="flex items-center gap-3 relative">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-bold text-coffee-900 uppercase tracking-widest truncate max-w-[120px]">
                {userName}
              </span>
              <button
                onClick={() => {
                  if (user) {
                    setNewName(userName);
                    setIsEditingName(true);
                  } else {
                    const newName = prompt("Como deseja ser chamado?", guestName || "Barista");
                    if (newName !== null) {
                      const trimmed = newName.trim();
                      setGuestName(trimmed);
                      localStorage.setItem('coffee_guest_name', trimmed);
                    }
                  }
                }}
                className="text-[8px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                title="Clique para alterar seu nome"
              >
                Alterar Nome ☕
              </button>
            </div>
            
            {/* Hamburger Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={cn(
                  "p-2.5 rounded-full transition-all border",
                  showUserMenu 
                    ? "bg-coffee-900 text-white border-coffee-900 shadow-lg" 
                    : "bg-coffee-100 text-coffee-600 hover:bg-coffee-200 border-coffee-200"
                )}
                title="Menu"
              >
                {showUserMenu ? <X size={20} /> : <Menu size={20} />}
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <>
                    {/* Backdrop for closing menu */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowUserMenu(false)}
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-2xl border border-coffee-100 overflow-hidden z-50"
                    >
                      <div className="p-2 space-y-1">
                        <button 
                          onClick={() => {
                            setShowUserMenu(false);
                            if (isAdminAuthenticated) {
                              setShowAdminPanel(true);
                            } else {
                              setShowAdminLogin(true);
                            }
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                            <FileSpreadsheet size={16} />
                          </div>
                          Importar Planilha (CSV)
                        </button>
                        <button 
                          onClick={() => {
                            setNewName(userName);
                            setIsEditingName(true);
                            setShowUserMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-coffee-700 hover:bg-coffee-50 rounded-xl transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-coffee-100 flex items-center justify-center text-coffee-600">
                            <UserIcon size={16} />
                          </div>
                          Editar Nome
                        </button>
                        <a 
                          href="https://wa.me/5531999999999" // Link para o WhatsApp
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-coffee-700 hover:bg-coffee-50 rounded-xl transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <MessageCircle size={16} />
                          </div>
                          Suporte
                        </a>
                        <button 
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                            <LogOut size={16} />
                          </div>
                          Sair
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        </div>
      </header>

      <main className="px-6 py-8 space-y-8 max-w-5xl mx-auto">
        {activeTab === 'journey' ? (
          <JourneyView 
            journey={currentJourney} 
            isAdmin={isAdminAuthenticated} 
            onUpdateStep={async (updatedStep) => {
              if (!isAdminAuthenticated) {
                alert("Acesso negado. Apenas administradores autenticados podem atualizar etapas da jornada.");
                return;
              }
              await updateJourneyStepInSupabase(updatedStep);
              setCurrentJourney(prev => prev.map(s => s.id === updatedStep.id ? updatedStep : s));
            }}
            onAddStep={async (newStep) => {
              if (!isAdminAuthenticated) {
                alert("Acesso negado. Apenas administradores autenticados podem adicionar etapas da jornada.");
                return;
              }
              const res = await insertJourneyStepToSupabase(newStep);
              if (res && res[0]) {
                const added = {
                  ...newStep,
                  id: res[0].id.toString(),
                  content: typeof res[0].content === 'string' ? JSON.parse(res[0].content) : res[0].content
                } as JourneyStep;
                setCurrentJourney(prev => [...prev, added]);
              } else {
                const refreshed = await fetchJourneyFromSupabase();
                setCurrentJourney(refreshed);
              }
            }}
            onDeleteStep={async (id) => {
              if (!isAdminAuthenticated) {
                alert("Acesso negado. Apenas administradores autenticados podem remover etapas da jornada.");
                return;
              }
              await deleteJourneyStepFromSupabase(id);
              setCurrentJourney(prev => prev.filter(s => s.id !== id));
            }}
          />
        ) : (
          <>
            {/* Welcome Message */}
            {(user || isGuestAccess) && (
              <div className="flex flex-col items-center gap-2 py-2">
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <p className="text-2xl font-serif font-bold text-coffee-900 leading-relaxed">
                    Olá, {capitalizedName}! {getGreeting()} {welcomePhrase}
                  </p>
                </motion.div>
              </div>
            )}

            {/* Ambient Weather Indicator Banner */}
            {!weather.loading && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => {
                  setEditTemp(weather.temp);
                  setEditLocation(weather.location);
                  setEditCondition(weather.condition);
                  setShowWeatherModal(true);
                }}
                className="mx-auto flex items-center justify-center gap-3 px-4 py-2 bg-coffee-100/50 hover:bg-coffee-100 border border-coffee-200/40 rounded-full cursor-pointer transition-all shadow-sm max-w-fit mb-4"
                title="Clique para ajustar o clima ou simulador"
              >
                <div className="flex items-center gap-1.5 text-coffee-800">
                  {weather.condition.includes('Ensolarado') ? <Sun size={14} className="text-amber-500 fill-amber-100" /> : 
                   weather.condition.includes('Chuvoso') ? <CloudRain size={14} className="text-blue-500" /> : 
                   <Cloud size={14} className="text-coffee-600" />}
                  <span className="text-xs font-bold font-mono">{weather.temp}ºC</span>
                </div>
                <div className="w-px h-3 bg-coffee-200" />
                <span className="text-[10px] font-black uppercase text-coffee-600 tracking-wider font-sans">{weather.condition}</span>
                <div className="w-px h-3 bg-coffee-200" />
                <div className="flex items-center gap-1 text-[10px] font-black uppercase text-coffee-600 tracking-wider">
                  <MapPin size={10} className="text-coffee-500" />
                  <span className="truncate max-w-[120px]">{weather.location}</span>
                </div>
                {weather.isCustom && (
                  <>
                    <div className="w-px h-3 bg-coffee-200" />
                    <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-md font-extrabold uppercase">Manual</span>
                  </>
                )}
                <Edit size={10} className="text-coffee-400 ml-1" />
              </motion.div>
            )}

            {/* Search & Filters */}
            <section className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400 group-focus-within:text-coffee-600 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder={
                    activeTab === 'home' 
                      ? "Buscar por nome ou país..." 
                      : activeTab === 'accompaniments' 
                        ? "Buscar bolos, cookies e acompanhamentos..." 
                        : "Buscar nos favoritos..."
                  }
                  className="w-full bg-coffee-card border border-coffee-100/70 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-coffee-200 transition-all shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors",
                    showFilters ? "bg-coffee-900 text-white" : "bg-coffee-100 text-coffee-700"
                  )}
                >
                  <Filter size={18} />
                </button>
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-coffee-card rounded-2xl p-4 border border-coffee-100/70 shadow-sm space-y-4">
                      <div>
                        <h3 className="text-xs font-bold uppercase text-coffee-400 mb-2 tracking-widest">Ingredientes</h3>
                        <div className="flex flex-wrap gap-2">
                          {allIngredients.length > 0 ? (
                            allIngredients.map(ing => (
                              <button
                                key={ing}
                                onClick={() => toggleIngredient(ing)}
                                className={cn(
                                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                  pendingIngredients.includes(ing) 
                                    ? "bg-coffee-800 text-white" 
                                    : "bg-coffee-50 text-coffee-600 hover:bg-coffee-100"
                                )}
                              >
                                {ing}
                              </button>
                            ))
                          ) : (
                            <p className="text-[10px] text-coffee-300 italic">Nenhum ingrediente encontrado nas receitas atuais.</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase text-coffee-400 mb-2 tracking-widest">Equipamentos</h3>
                        <div className="flex flex-wrap gap-2">
                          {allEquipment.length > 0 ? (
                            allEquipment.map(eq => (
                              <button
                                key={eq}
                                onClick={() => toggleEquipment(eq)}
                                className={cn(
                                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                  pendingEquipment.includes(eq) 
                                    ? "bg-coffee-800 text-white" 
                                    : "bg-coffee-50 text-coffee-600 hover:bg-coffee-100"
                                )}
                              >
                                {eq}
                              </button>
                            ))
                          ) : (
                            <p className="text-[10px] text-coffee-300 italic">Nenhum equipamento encontrado nas receitas atuais.</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-2 border-t border-coffee-50">
                        <button
                          onClick={applyFilters}
                          className="flex-1 bg-coffee-900 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-coffee-800 transition-all flex items-center justify-center gap-2"
                        >
                          Aplicar Filtros
                        </button>
                        <button
                          onClick={clearFilters}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-coffee-400 hover:text-coffee-600 transition-all"
                        >
                          Limpar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div 
                className="overflow-x-auto no-scrollbar -mx-6 px-6 scroll-smooth touch-pan-x" 
                style={{ 
                  scrollbarWidth: 'none', 
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                <style>{`
                  .no-scrollbar::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                <div className="flex gap-3 w-max py-1 min-w-full">
                  <button 
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      "px-6 py-3 rounded-2xl whitespace-nowrap text-sm font-medium transition-all shrink-0",
                      !selectedCategory ? "bg-coffee-900 text-white shadow-lg shadow-coffee-900/20" : "bg-coffee-card text-coffee-600 border border-coffee-100"
                    )}
                  >
                    Todos
                  </button>
                  {categories.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "px-6 py-3 rounded-2xl whitespace-nowrap text-sm font-medium transition-all shrink-0",
                        selectedCategory === cat ? "bg-coffee-900 text-white shadow-lg shadow-coffee-900/20" : "bg-coffee-card text-coffee-600 border border-coffee-100"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Recipe Grid */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-xl sm:text-2xl font-sans font-bold text-coffee-950 break-words">
                  {activeTab === 'favorites' 
                    ? 'Meus Favoritos' 
                    : activeTab === 'accompaniments'
                      ? (searchQuery || selectedCategory ? 'Resultados' : 'Acompanhamentos Perfeitos')
                      : (searchQuery || selectedCategory ? 'Resultados' : 'Explorar Sabores')
                  }
                </h2>
                <span className="text-[10px] sm:text-xs font-bold text-coffee-400 uppercase tracking-widest shrink-0">{filteredRecipes.length} Receitas</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRecipes.map((recipe, idx) => (
                  <motion.div 
                    key={recipe.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.15) }}
                    onClick={() => {
                      setSelectedRecipe(recipe);
                      setCurrentStepIndex(0);
                    }}
                    className="group bg-coffee-card rounded-[2.5rem] p-4 border border-coffee-100/70 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden relative"
                  >
                    <div className="relative aspect-square rounded-[2rem] overflow-hidden mb-4">
                      <img 
                        src={recipe.image} 
                        alt={recipe.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <button 
                          onClick={(e) => toggleFavorite(e, recipe.id)}
                          className={cn(
                            "p-2.5 rounded-full shadow-sm transition-all border border-coffee-100/30",
                            favorites.includes(recipe.id) 
                              ? "bg-coffee-500 text-white" 
                              : "bg-white text-coffee-900 hover:bg-coffee-50"
                          )}
                        >
                          <Heart size={18} fill={favorites.includes(recipe.id) ? "currentColor" : "none"} />
                        </button>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                        <div className="bg-coffee-950 px-3 py-1.5 rounded-xl text-white text-[10px] font-bold uppercase tracking-widest border border-white/5">
                          {recipe.category}
                        </div>
                      </div>
                    </div>
                    <div className="px-2 pb-2">
                      <div className="flex items-center gap-1 text-coffee-400 mb-1">
                        <MapPin size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{recipe.country}</span>
                      </div>
                      {editingRecipeNameId === recipe.id ? (
                        <div className="flex items-center gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingRecipeNameValue}
                            onChange={(e) => setEditingRecipeNameValue(e.target.value)}
                            className="flex-1 min-w-0 text-sm font-sans font-bold text-coffee-950 bg-white border border-coffee-200 rounded-xl px-2 py-1 outline-none focus:border-amber-500 shadow-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveRecipeOverride(recipe.id, { name: editingRecipeNameValue });
                                setEditingRecipeNameId(null);
                              } else if (e.key === 'Escape') {
                                setEditingRecipeNameId(null);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              saveRecipeOverride(recipe.id, { name: editingRecipeNameValue });
                              setEditingRecipeNameId(null);
                            }}
                            className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 shadow transition-all flex items-center justify-center shrink-0"
                            title="Salvar"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              resetRecipeNameToDefault(recipe.id);
                              setEditingRecipeNameId(null);
                            }}
                            className="p-1.5 rounded-lg bg-coffee-100 hover:bg-coffee-200 text-coffee-600 shadow-sm transition-all flex items-center justify-center shrink-0"
                            title="Restaurar nome padrão"
                          >
                            <RotateCcw size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-1 mb-1 group/title">
                          <h3 className="text-xl font-sans font-bold text-coffee-950 break-words leading-tight">{recipe.name}</h3>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRecipeNameId(recipe.id);
                              setEditingRecipeNameValue(recipe.name);
                            }}
                            className="opacity-0 group-hover/title:opacity-100 hover:text-amber-500 text-coffee-400 p-1 transition-opacity duration-200 flex items-center justify-center shrink-0"
                            title="Editar nome"
                          >
                            <Edit size={12} />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-coffee-400">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span className="text-xs font-medium">{recipe.prepTime}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {foodCategories.includes(recipe.category) ? <Cookie size={14} /> : <Coffee size={14} />}
                          <span className="text-xs font-medium">{recipe.difficulty}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {filteredRecipes.length > 0 && (
                <div className="pt-10 pb-8 flex items-center justify-center">
                  <img 
                    src="https://res.cloudinary.com/dvbifkpwd/image/upload/v1785199336/Mask_group_fercpf.png" 
                    alt="Fim do menu de sabores" 
                    referrerPolicy="no-referrer"
                    className="max-w-[260px] sm:max-w-[340px] md:max-w-[400px] h-auto object-contain"
                  />
                </div>
              )}

              {filteredRecipes.length === 0 && (
                <div className="py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-coffee-100 rounded-full flex items-center justify-center mx-auto text-coffee-300 p-4">
                    <img src={appLogo || DEFAULT_LOGO} alt="No results" className="w-full h-full object-contain opacity-30" referrerPolicy="no-referrer" />
                  </div>
                  <p className="text-coffee-500 font-sans italic">
                    {activeTab === 'favorites' ? 'Você ainda não favoritou nenhuma receita.' : 'Nenhuma receita encontrada com esses filtros.'}
                  </p>
                  {(activeTab === 'home' || activeTab === 'accompaniments') && (
                    <button 
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory(null);
                        setActiveIngredients([]);
                        setActiveEquipment([]);
                      }}
                      className="text-coffee-800 font-bold text-sm underline underline-offset-4"
                    >
                      Limpar todos os filtros
                    </button>
                  )}
                  {activeTab === 'favorites' && (
                    <button 
                      onClick={() => setActiveTab('home')}
                      className="text-coffee-800 font-bold text-sm underline underline-offset-4"
                    >
                      Explorar Receitas
                    </button>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Edit Name Modal */}
      <AnimatePresence>
        {isEditingName && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingName(false)}
              className="absolute inset-0 bg-coffee-950/75"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm relative z-10 shadow-2xl border border-coffee-100"
            >
              <button 
                onClick={() => setIsEditingName(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-coffee-50 text-coffee-400 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-coffee-100 flex items-center justify-center mx-auto rotate-3">
                  <Edit size={32} className="text-coffee-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-sans font-bold text-coffee-900">Editar Nome</h2>
                  <p className="text-sm text-coffee-500 mt-1">Como você gostaria de ser chamado?</p>
                </div>
                
                <div className="space-y-4">
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400" size={18} />
                    <input 
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full bg-coffee-50 border border-coffee-100 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-coffee-200 transition-all font-medium"
                      autoFocus
                    />
                  </div>
                  
                  <button 
                    onClick={handleUpdateName}
                    disabled={authLoading || !newName.trim()}
                    className="w-full bg-coffee-900 text-white py-4 rounded-xl font-bold hover:bg-coffee-800 transition-all shadow-lg shadow-coffee-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {authLoading ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Integrated Bottom Navigation & Recommendation */}
      <AnimatePresence>
        {!isExplainingRecommendation && !selectedRecipe && (
          <motion.div 
            initial={{ y: 100, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: 100, opacity: 0, x: '-50%' }}
            className="fixed bottom-6 left-1/2 w-[calc(100%-2rem)] max-w-[500px] z-[70]"
          >
            <div className="bg-coffee-950 rounded-[2.5rem] p-3 shadow-2xl flex flex-col gap-3 border border-white/5">
              {/* Recommendation Section */}
              <AnimatePresence mode="wait">
                {recommendedRecipe && (
                  <motion.div 
                    key={recommendedRecipe.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onClick={() => setIsExplainingRecommendation(true)}
                    className="relative bg-gradient-to-r from-coffee-900 to-coffee-800 rounded-[2rem] p-2 flex items-center gap-3 cursor-pointer hover:scale-[1.02] transition-all group overflow-hidden border border-white/10"
                  >
                    <motion.div 
                      animate={{ 
                        boxShadow: ["0 0 0px rgba(245, 158, 11, 0)", "0 0 20px rgba(245, 158, 11, 0.3)", "0 0 0px rgba(245, 158, 11, 0)"] 
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 pointer-events-none"
                    />
                    <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-white/10 relative">
                      <img src={recommendedRecipe.image} alt={recommendedRecipe.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={10} className="text-amber-400 fill-amber-400" />
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-[0.2em] block">Especial para você</span>
                        </div>
                        {!weather.loading && !weather.error && (
                          <div className="flex items-center gap-1 text-white/50 text-[10px] font-bold">
                            {weather.temp}ºC
                          </div>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white truncate">{recommendedRecipe.name}</h4>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-amber-400 group-hover:text-coffee-950 transition-all shadow-inner">
                      <ChevronRight size={20} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Section */}
              <div className="flex items-center justify-around px-2 py-1">
                <button 
                  onClick={() => setActiveTab('home')}
                  className={cn("p-2 transition-colors", activeTab === 'home' ? "text-white" : "text-coffee-600")}
                  title="Cafés"
                >
                  <Coffee size={24} />
                </button>

                <button 
                  onClick={() => setActiveTab('accompaniments')}
                  className={cn("p-2 transition-colors", activeTab === 'accompaniments' ? "text-white" : "text-coffee-600")}
                  title="Acompanhamentos"
                >
                  <Cookie size={24} />
                </button>

                <button 
                  onClick={() => setActiveTab('journey')}
                  className={cn("p-2 transition-colors", activeTab === 'journey' ? "text-white" : "text-coffee-600")}
                  title="Aprender"
                >
                  <BookOpen size={24} />
                </button>

                <button 
                  onClick={() => setActiveTab('favorites')}
                  className={cn("p-2 transition-colors", activeTab === 'favorites' ? "text-white" : "text-coffee-600")}
                  title="Favoritos"
                >
                  <Heart size={24} fill={activeTab === 'favorites' ? "currentColor" : "none"} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recommendation Explanation Modal */}
      <AnimatePresence>
        {isExplainingRecommendation && recommendedRecipe && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-coffee-950/98"
            >
              <div className="absolute inset-0 opacity-30">
                <img src={recommendedRecipe.image} referrerPolicy="no-referrer" className="w-full h-full object-cover blur-3xl scale-150" alt="" />
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative w-full max-w-md bg-coffee-900 border border-coffee-800 rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <div className="p-10 flex flex-col items-center text-center">
                <motion.div 
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", damping: 12 }}
                  className="w-32 h-32 rounded-[2.5rem] overflow-hidden mb-8 border-4 border-white/20 shadow-2xl relative"
                >
                  <img src={recommendedRecipe.image} alt={recommendedRecipe.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </motion.div>
                
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/30 mb-2">
                  <Sparkles size={14} className="text-amber-400" fill="currentColor" />
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-[0.2em]">Seleção do Barista</span>
                </div>

                {!weather.loading && !weather.error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      setEditTemp(weather.temp);
                      setEditLocation(weather.location);
                      setEditCondition(weather.condition);
                      setShowWeatherModal(true);
                    }}
                    className="flex items-center gap-3 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full mb-6 cursor-pointer hover:bg-white/10 transition-colors"
                    title="Ajustar clima atual"
                  >
                    <div className="flex items-center gap-1.5 text-white">
                      {weather.condition.includes('Ensolarado') ? <Sun size={14} className="text-amber-400" /> : 
                       weather.condition.includes('Chuvoso') ? <CloudRain size={14} className="text-blue-400" /> : 
                       <Cloud size={14} className="text-coffee-300" />}
                      <span className="text-xs font-bold">{weather.temp}ºC</span>
                    </div>
                    <div className="w-px h-3 bg-white/10" />
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{weather.condition}</span>
                    <div className="w-px h-3 bg-white/10" />
                    <div className="flex items-center gap-1 text-[9px] font-bold text-white/40 uppercase tracking-widest">
                      <MapPin size={10} />
                      <span className="truncate max-w-[60px]">{weather.location}</span>
                    </div>
                    <Edit size={10} className="text-white/45 ml-1" />
                  </motion.div>
                )}
                
                <h3 className="text-3xl font-sans font-bold text-white mb-6 leading-tight">
                  Por que o <span className="text-amber-400">{recommendedRecipe.name}</span> hoje?
                </h3>
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-coffee-100 text-xl leading-relaxed mb-10 font-medium italic font-sans"
                >
                  "{recommendation?.reason}"
                </motion.div>
                
                <div className="flex flex-col gap-3 w-full">
                  <button 
                    onClick={() => {
                      setIsExplainingRecommendation(false);
                      setSelectedRecipe(recommendedRecipe);
                      setCurrentStepIndex(0);
                    }}
                    className="w-full bg-amber-400 text-coffee-950 font-bold py-5 rounded-[1.5rem] flex items-center justify-center gap-3 hover:bg-amber-300 transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Coffee size={22} />
                    Ver Receita Completa
                  </button>
                  
                  <button 
                    onClick={() => setIsExplainingRecommendation(false)}
                    className="w-full bg-white/5 text-coffee-300 font-bold py-4 rounded-[1.5rem] hover:text-white hover:bg-white/10 transition-all"
                  >
                    Talvez mais tarde
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Weather Customize Modal */}
      <AnimatePresence>
        {showWeatherModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-coffee-950/90"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 25, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 25, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-2xl border border-coffee-100 flex flex-col gap-6"
            >
              <div className="flex items-center justify-between group">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-coffee-400 uppercase tracking-widest">Simulador de Clima</span>
                  <h3 className="text-xl font-sans font-bold text-coffee-950">Ajustar Temperatura</h3>
                </div>
                <button 
                  onClick={() => setShowWeatherModal(false)}
                  className="p-2 bg-coffee-100 text-coffee-600 rounded-full hover:bg-coffee-200 transition-colors pointer-events-auto"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Temperature Slide/Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black uppercase tracking-widest text-coffee-400">Temperatura (ºC)</label>
                    <span className="text-lg font-bold font-mono text-coffee-950">{editTemp}ºC</span>
                  </div>
                  <input 
                    type="range" 
                    min="-5"
                    max="45"
                    value={editTemp}
                    onChange={(e) => setEditTemp(parseInt(e.target.value))}
                    className="w-full accent-coffee-900 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-coffee-400 font-mono">
                    <span>Frio (-5ºC)</span>
                    <span>Agradável (20ºC)</span>
                    <span>Quente (45ºC)</span>
                  </div>
                </div>

                {/* City/Location Input */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-coffee-400 block">Cidade / Região</label>
                  <input 
                    type="text" 
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Ex: Poços de Caldas"
                    className="w-full bg-coffee-50 border border-coffee-100 rounded-xl p-3 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-coffee-200"
                  />
                </div>

                {/* Weather Condition selector */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-coffee-400 block">Condição Climática</label>
                  <select 
                    value={editCondition}
                    onChange={(e) => setEditCondition(e.target.value)}
                    className="w-full bg-coffee-50 border border-coffee-100 rounded-xl p-3 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-coffee-200 cursor-pointer"
                  >
                    <option value="Ensolarado">Ensolarado (Sol e calor)</option>
                    <option value="Parcialmente Nublado">Parcialmente Nublado (Agradável)</option>
                    <option value="Nublado">Nublado (Fresquinho)</option>
                    <option value="Chuvoso">Chuvoso (Pede um café quentinho)</option>
                    <option value="Nevando">Nevando (Muito frio)</option>
                    <option value="Tempestade">Tempestade (Para ficar em casa)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {weather.isCustom && (
                  <button 
                    onClick={() => {
                      weather.clearWeatherOverride();
                      setShowWeatherModal(false);
                    }}
                    className="flex-1 bg-red-50 text-red-600 font-bold py-3.5 rounded-xl hover:bg-red-100 transition-colors text-sm"
                    title="Voltar ao clima detectado por GPS/IP"
                  >
                    Resetar
                  </button>
                )}
                <button 
                  onClick={() => {
                    // Robust validation & sanitization
                    const sanitizedLocation = editLocation.replace(/<[^>]*>/g, '').trim().substring(0, 50);
                    if (!sanitizedLocation) {
                      alert('Por favor, informe uma cidade ou região válida.');
                      return;
                    }
                    const validConditions = ['Ensolarado', 'Parcialmente Nublado', 'Nublado', 'Chuvoso', 'Nevando', 'Tempestade'];
                    const validatedCondition = validConditions.includes(editCondition) ? editCondition : 'Ensolarado';
                    const validatedTemp = Math.max(-50, Math.min(60, editTemp));

                    weather.saveWeatherOverride({
                      temp: validatedTemp,
                      location: sanitizedLocation,
                      condition: validatedCondition
                    });
                    setShowWeatherModal(false);
                  }}
                  className="flex-[2] bg-coffee-950 text-white font-bold py-3.5 rounded-xl hover:bg-coffee-900 transition-colors text-sm shadow-md"
                >
                  Aplicar Clima
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showAdminLogin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-coffee-950/90"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl border border-coffee-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-sans font-bold text-coffee-900 flex items-center gap-2">
                  <Lock size={20} className="text-coffee-500" />
                  Painel Dev
                </h3>
                <button onClick={() => setShowAdminLogin(false)} className="text-coffee-400 hover:text-coffee-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-coffee-400 uppercase tracking-widest mb-2">Senha de Acesso</label>
                  <div className="relative">
                    <input 
                      type={showAdminPassword ? "text" : "password"} 
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full bg-coffee-50 border border-coffee-100 rounded-xl py-3 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-coffee-200"
                      placeholder="••••••••"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-coffee-300 hover:text-coffee-500 transition-colors"
                    >
                      {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-coffee-900 text-white py-3 rounded-xl font-bold hover:bg-coffee-800 transition-colors"
                >
                  Entrar
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Panel Modal */}
      <AnimatePresence>
        {showAdminPanel && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-coffee-950/90"
          >
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-coffee-100 no-scrollbar"
            >
              <div className="flex justify-between items-center mb-8 sticky top-0 bg-white py-2 z-10">
                <div>
                  <h3 className="text-2xl font-sans font-bold text-coffee-900">Gerenciar Receitas</h3>
                  <p className="text-xs text-coffee-400 font-medium">Adicione ou remova itens do Supabase</p>
                </div>
                <div className="flex items-center gap-3">
                  {allRecipes.length <= recipes.length && (
                    <button 
                      type="button"
                      onClick={handleSeedRecipes}
                      className="text-[10px] font-bold text-coffee-400 uppercase tracking-widest hover:text-coffee-600 flex items-center gap-1 bg-coffee-50 px-3 py-2 rounded-full transition-all"
                    >
                      <RotateCcw size={12} />
                      Sincronizar Iniciais
                    </button>
                  )}
                  <button onClick={() => setShowAdminPanel(false)} className="bg-coffee-50 p-2 rounded-full text-coffee-400 hover:text-coffee-600">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="space-y-10">
                {/* Google Sheets & CSV Integration */}
                <GoogleSheetsManager 
                  recipes={allRecipes} 
                  journey={currentJourney}
                  logoUrl={appLogo}
                  settings={{
                    custom_equipment_history: customEquipmentHistory,
                    custom_ingredient_history: customIngredientIconHistory
                  }}
                  onDataImported={handleGoogleSheetsImported} 
                />

                {/* App Customization */}
                <section className="bg-coffee-50 rounded-3xl p-6 border border-coffee-100">
                  <h4 className="text-sm font-bold text-coffee-900 uppercase tracking-widest flex items-center gap-2 mb-6">
                    <Settings size={18} className="text-coffee-500" />
                    Personalização do App
                  </h4>
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-white border-2 border-coffee-200 flex items-center justify-center overflow-hidden text-coffee-700 shrink-0 p-3">
                      <img src={appLogo || DEFAULT_LOGO} alt="Logo Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="bg-coffee-900 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-coffee-800 transition-all flex items-center gap-2">
                        <Upload size={14} />
                        Trocar Logo
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      {appLogo && (
                        <button 
                          onClick={resetLogo}
                          className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-600 flex items-center gap-1"
                        >
                          <RotateCcw size={12} />
                          Restaurar Padrão
                        </button>
                      )}
                    </div>
                  </div>
                </section>

                {/* Add New Recipe Form */}
                <section className="bg-coffee-50 rounded-3xl p-6 border border-coffee-100">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-sm font-bold text-coffee-900 uppercase tracking-widest flex items-center gap-2">
                      {editingRecipeId ? <Edit size={18} className="text-coffee-500" /> : <Plus size={18} className="text-coffee-500" />}
                      {editingRecipeId ? 'Editar Receita' : 'Nova Receita'}
                    </h4>
                    {editingRecipeId && (
                      <button 
                        onClick={handleCancelEdit}
                        className="text-[10px] font-bold text-coffee-400 uppercase tracking-widest hover:text-coffee-600 flex items-center gap-1"
                      >
                        <RotateCcw size={12} />
                        Cancelar Edição
                      </button>
                    )}
                  </div>
                  <form onSubmit={handleAddRecipe} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-coffee-400 uppercase tracking-widest mb-1.5">Nome da Receita</label>
                      <input 
                        required
                        value={newRecipe.name}
                        onChange={(e) => setNewRecipe({...newRecipe, name: e.target.value})}
                        className="w-full bg-white border border-coffee-100 rounded-xl py-2.5 px-4 text-sm"
                        placeholder="Ex: Espresso Mineiro"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-coffee-400 uppercase tracking-widest mb-1.5">País</label>
                      <input 
                        value={newRecipe.country}
                        onChange={(e) => setNewRecipe({...newRecipe, country: e.target.value})}
                        className="w-full bg-white border border-coffee-100 rounded-xl py-2.5 px-4 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-coffee-400 uppercase tracking-widest mb-1.5">Categoria</label>
                      <select 
                        value={newRecipe.category}
                        onChange={(e) => setNewRecipe({...newRecipe, category: e.target.value as any})}
                        className="w-full bg-white border border-coffee-100 rounded-xl py-2.5 px-4 text-sm"
                      >
                        {['Espresso', 'Latte', 'Cappuccino', 'Cold Brew', 'Specialty', 'Pães & Salgados', 'Bolos', 'Biscoitos & Doces'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-coffee-400 uppercase tracking-widest mb-1.5">Dificuldade</label>
                      <select 
                        value={newRecipe.difficulty}
                        onChange={(e) => setNewRecipe({...newRecipe, difficulty: e.target.value as any})}
                        className="w-full bg-white border border-coffee-100 rounded-xl py-2.5 px-4 text-sm"
                      >
                        <option value="Easy">Fácil</option>
                        <option value="Medium">Médio</option>
                        <option value="Hard">Difícil</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-coffee-400 uppercase tracking-widest mb-1.5">Tempo</label>
                      <input 
                        value={newRecipe.prepTime}
                        onChange={(e) => setNewRecipe({...newRecipe, prepTime: e.target.value})}
                        className="w-full bg-white border border-coffee-100 rounded-xl py-2.5 px-4 text-sm"
                        placeholder="Ex: 5 min"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-coffee-400 uppercase tracking-widest mb-1.5">Imagem da Receita</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-coffee-100 rounded-2xl p-4 hover:border-coffee-300 transition-all cursor-pointer bg-white group">
                              <Upload size={24} className="text-coffee-300 group-hover:text-coffee-500 mb-2" />
                              <span className="text-[10px] font-bold text-coffee-400 uppercase tracking-widest">Upload do Dispositivo</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageUpload} 
                                className="hidden" 
                              />
                            </label>
                          </div>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                              <ImageIcon size={16} className="text-coffee-300" />
                            </div>
                            <input 
                              value={newRecipe.image}
                              onChange={(e) => setNewRecipe({...newRecipe, image: e.target.value.trim()})}
                              className="w-full bg-white border border-coffee-100 rounded-xl py-2.5 pl-10 pr-4 text-sm"
                              placeholder="https://exemplo.com/imagem.jpg"
                            />
                          </div>
                        </div>
                        {newRecipe.image && (
                          <div className="relative h-32 rounded-2xl overflow-hidden border border-coffee-100 bg-white">
                            <img src={newRecipe.image} alt="Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => setNewRecipe({...newRecipe, image: ''})}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-lg"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-coffee-400 uppercase tracking-widest mb-1.5">Descrição</label>
                      <textarea 
                        value={newRecipe.description}
                        onChange={(e) => setNewRecipe({...newRecipe, description: e.target.value})}
                        className="w-full bg-white border border-coffee-100 rounded-xl py-2.5 px-4 text-sm h-20 resize-none"
                      />
                    </div>

                    {/* Dynamic Ingredients */}
                    <div className="md:col-span-2 space-y-3">
                      <label className="block text-[10px] font-bold text-coffee-400 uppercase tracking-widest">Ingredientes Detalhados</label>
                      <div className="flex gap-2">
                        <input 
                          value={tempIngredient.name}
                          onChange={(e) => setTempIngredient({...tempIngredient, name: e.target.value})}
                          placeholder="Nome (Ex: Café Moído)"
                          className="flex-1 bg-white border border-coffee-100 rounded-xl py-2 px-3 text-sm"
                        />
                        <input 
                          value={tempIngredient.amount}
                          onChange={(e) => setTempIngredient({...tempIngredient, amount: e.target.value})}
                          placeholder="Qtd (Ex: 20g)"
                          className="w-24 bg-white border border-coffee-100 rounded-xl py-2 px-3 text-sm"
                        />
                        <button type="button" onClick={addIngredient} className="bg-coffee-100 text-coffee-700 p-2 rounded-xl hover:bg-coffee-200">
                          <Plus size={20} />
                        </button>
                      </div>

                      {/* Icon selector for current temp ingredient */}
                      <div className="bg-coffee-card border border-coffee-100/50 rounded-xl p-2.5 flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-coffee-400 uppercase tracking-widest">Escolha um Ícone para o ingrediente (Opcional):</span>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(INGREDIENT_ICONS).map(([key, val]) => {
                            const Icon = val.component;
                            const isSelected = selectedTempIngredientIcon === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                title={val.label}
                                onClick={() => setSelectedTempIngredientIcon(key === selectedTempIngredientIcon ? '' : key)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] transition-all font-semibold ${
                                  isSelected
                                    ? 'bg-neutral-100 border-neutral-400 text-neutral-900 scale-105 shadow-sm'
                                    : 'bg-white border-coffee-100 text-coffee-600 hover:bg-coffee-50'
                                }`}
                              >
                                <Icon size={14} className="text-neutral-900" />
                                <span>{val.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Saved Ingredient Icons History */}
                        {customIngredientIconHistory.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-coffee-100/60 flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold text-coffee-500 uppercase tracking-widest">Seus Ícones Salvos (Histórico):</span>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                              {customIngredientIconHistory.map((item, idx) => {
                                const isSelected = selectedTempIngredientIcon === item.iconUrl;
                                return (
                                  <div key={idx} className="relative group">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTempIngredientIcon(isSelected ? '' : item.iconUrl)}
                                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] transition-all font-semibold ${
                                        isSelected
                                          ? 'bg-amber-100 border-amber-500 text-amber-950 scale-105 shadow-sm ring-1 ring-amber-400'
                                          : 'bg-white border-coffee-100 text-coffee-700 hover:bg-coffee-50'
                                      }`}
                                    >
                                      <img src={item.iconUrl} alt={item.label} className="w-4 h-4 object-contain rounded-full" referrerPolicy="no-referrer" />
                                      <span>{item.label}</span>
                                    </button>
                                    <button
                                      type="button"
                                      title="Remover do histórico"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeIngredientIconFromHistory(idx);
                                      }}
                                      className="absolute -top-1 -right-1 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow transition-all opacity-0 group-hover:opacity-100"
                                    >
                                      <X size={8} strokeWidth={3} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold text-coffee-400 uppercase shrink-0">Ou cole a URL de um ícone:</span>
                          <input
                            type="text"
                            placeholder="https://exemplo.com/icone.png"
                            value={selectedTempIngredientIcon && !INGREDIENT_ICONS[selectedTempIngredientIcon as keyof typeof INGREDIENT_ICONS] ? selectedTempIngredientIcon : ''}
                            onChange={(e) => setSelectedTempIngredientIcon(e.target.value)}
                            className="flex-1 min-w-[180px] bg-white border border-coffee-100 rounded-lg py-1 px-2.5 text-xs text-coffee-800"
                          />
                          {selectedTempIngredientIcon && (selectedTempIngredientIcon.startsWith('http') || selectedTempIngredientIcon.startsWith('data:image')) && (
                            <button
                              type="button"
                              onClick={() => saveIngredientIconToHistory(tempIngredient.name || 'Ícone', selectedTempIngredientIcon)}
                              className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow transition-colors shrink-0 flex items-center gap-1"
                              title="Salvar ícone no histórico"
                            >
                              <Plus size={12} />
                              <span>Salvar no Histórico</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {newRecipe.detailedIngredients?.map((ing, i) => (
                          <div key={i} className="bg-white border border-coffee-100 px-3 py-1 rounded-full text-xs flex items-center gap-2 shadow-sm">
                            {ing.icon && (
                              ing.icon.startsWith('http') || ing.icon.startsWith('data:image') ? (
                                <img src={ing.icon} alt="" className="w-4 h-4 object-contain rounded-full bg-amber-50" referrerPolicy="no-referrer" />
                              ) : INGREDIENT_ICONS[ing.icon as keyof typeof INGREDIENT_ICONS] ? (
                                (() => {
                                  const Icon = INGREDIENT_ICONS[ing.icon as keyof typeof INGREDIENT_ICONS].component;
                                  return <Icon size={12} className="text-neutral-900 shrink-0" />;
                                })()
                              ) : null
                            )}
                            <span className="font-medium text-coffee-800">{ing.name} ({ing.amount})</span>
                            <button type="button" onClick={() => removeIngredient(i)} className="text-red-400 hover:text-red-600">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dynamic Equipment */}
                    <div className="md:col-span-2 space-y-3">
                      <label className="block text-[10px] font-bold text-coffee-400 uppercase tracking-widest">Equipamentos</label>
                      <div className="flex gap-2">
                        <input 
                          value={tempEquipment}
                          onChange={(e) => setTempEquipment(e.target.value)}
                          placeholder="Ex: Prensa Francesa"
                          className="flex-1 bg-white border border-coffee-100 rounded-xl py-2 px-3 text-sm"
                        />
                        <button type="button" onClick={addEquipment} className="bg-coffee-100 text-coffee-700 p-2 rounded-xl hover:bg-coffee-200">
                          <Plus size={20} />
                        </button>
                      </div>

                      {/* Illustrated Equipment Catalog Selection */}
                      <div className="bg-coffee-card border border-coffee-100/50 rounded-2xl p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-coffee-400 uppercase tracking-widest">Catálogo de Equipamentos & Histórico:</span>
                          {selectedTempEquipmentIcon && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTempEquipmentIcon('');
                                setTempEquipment('');
                              }}
                              className="text-[9px] font-bold text-red-500 hover:text-red-700 uppercase tracking-widest"
                            >
                              Limpar Seleção
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
                          {combinedEquipmentCatalog.map((preset, idx) => {
                            const isSelected = selectedTempEquipmentIcon === preset.image;
                            return (
                              <div key={`${preset.name}-${idx}`} className="relative group">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTempEquipment(preset.name);
                                    setSelectedTempEquipmentIcon(preset.image);
                                    saveEquipmentToHistory(preset.name, preset.image);
                                  }}
                                  className={`w-full relative flex flex-col items-center p-2.5 rounded-xl border text-left transition-all ${
                                    isSelected
                                      ? 'bg-amber-50/50 border-amber-500 ring-2 ring-amber-500/20 scale-[1.02] shadow-sm'
                                      : 'bg-white border-coffee-100 hover:border-coffee-300 hover:bg-coffee-50/50'
                                  }`}
                                >
                                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-white mb-2 relative p-1 border border-coffee-50/50">
                                    {preset.image ? (
                                      <img 
                                        src={preset.image} 
                                        alt={preset.name} 
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-coffee-50 text-coffee-400 font-bold text-[10px] rounded text-center">
                                        {preset.name}
                                      </div>
                                    )}
                                    {isSelected && (
                                      <div className="absolute top-1 right-1 bg-amber-500 text-white rounded-full p-0.5 shadow">
                                        <Check size={10} strokeWidth={3} />
                                      </div>
                                    )}
                                    {preset.isCustom && (
                                      <div className="absolute top-1 left-1 bg-coffee-900 text-white text-[7px] font-black px-1.5 py-0.5 rounded shadow uppercase tracking-wider">
                                        Histórico
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-bold text-coffee-800 tracking-tight leading-tight text-center line-clamp-2 w-full px-0.5">
                                    {preset.name}
                                  </span>
                                </button>

                                {preset.isCustom && preset.customIndex !== undefined && (
                                  <button
                                    type="button"
                                    title="Remover do histórico"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeEquipmentFromHistory(preset.customIndex!);
                                    }}
                                    className="absolute -top-1.5 -right-1.5 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow transition-all opacity-0 group-hover:opacity-100"
                                  >
                                    <X size={10} strokeWidth={3} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="border-t border-coffee-100/60 pt-3 mt-1 space-y-2">
                          <span className="text-[10px] font-bold text-coffee-400 uppercase tracking-widest block">Ou personalize e salve no histórico:</span>
                          <div className="flex flex-wrap gap-2">
                            <input
                              type="text"
                              placeholder="URL da Imagem do Equipamento"
                              value={selectedTempEquipmentIcon && !ILLUSTRATED_EQUIPMENT_PRESETS.some(p => p.image === selectedTempEquipmentIcon) ? selectedTempEquipmentIcon : ''}
                              onChange={(e) => setSelectedTempEquipmentIcon(e.target.value)}
                              className="flex-1 min-w-[200px] bg-white border border-coffee-100 rounded-xl py-2 px-3 text-xs text-coffee-800"
                            />
                            {tempEquipment && selectedTempEquipmentIcon && (
                              <button
                                type="button"
                                onClick={() => saveEquipmentToHistory(tempEquipment, selectedTempEquipmentIcon)}
                                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow transition-colors shrink-0 flex items-center gap-1"
                                title="Salvar este equipamento no seu histórico"
                              >
                                <Plus size={14} />
                                <span>Salvar no Histórico</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {newRecipe.equipment?.map((eq, i) => {
                          const isCustom = eq.includes('::');
                          const name = isCustom ? eq.split('::')[0] : eq;
                          const iconKey = isCustom ? eq.split('::')[1] : undefined;
                          return (
                            <div key={i} className="bg-white border border-coffee-100 px-3 py-1 rounded-full text-xs flex items-center gap-2 shadow-sm">
                              {iconKey && (
                                iconKey.startsWith('http') || iconKey.startsWith('data:image') ? (
                                  <img src={iconKey} alt="" className="w-4 h-4 object-contain rounded-full bg-neutral-100" referrerPolicy="no-referrer" />
                                ) : EQUIPMENT_ICONS[iconKey as keyof typeof EQUIPMENT_ICONS] ? (
                                  (() => {
                                    const Icon = EQUIPMENT_ICONS[iconKey as keyof typeof EQUIPMENT_ICONS].component;
                                    return <Icon size={12} className="text-neutral-900 shrink-0" />;
                                  })()
                                ) : null
                              )}
                              <span className="font-medium text-coffee-800">{name}</span>
                              <button type="button" onClick={() => removeEquipment(i)} className="text-red-400 hover:text-red-600">
                                <X size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dynamic Steps */}
                    <div className="md:col-span-2 space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-bold text-coffee-400 uppercase tracking-widest">Passo a Passo</label>
                        {editingStepIndex !== null && (
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingStepIndex(null);
                              setTempStep({ title: '', description: '', image: '' });
                            }}
                            className="text-[10px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1"
                          >
                            <RotateCcw size={10} />
                            Cancelar Edição do Passo
                          </button>
                        )}
                      </div>
                      <div className="space-y-2 bg-white p-4 rounded-2xl border border-coffee-100 shadow-sm">
                        <input 
                          value={tempStep.title}
                          onChange={(e) => setTempStep({...tempStep, title: e.target.value})}
                          placeholder="Título do Passo (Ex: Moagem)"
                          className="w-full bg-coffee-50 border border-coffee-100 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-coffee-200 outline-none"
                        />
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                              <ImageIcon size={14} className="text-coffee-300" />
                            </div>
                            <input 
                              value={tempStep.image}
                              onChange={(e) => setTempStep({...tempStep, image: e.target.value.trim()})}
                              placeholder="URL da Imagem (Ex: https://...)"
                              className="w-full bg-coffee-50 border border-coffee-100 rounded-xl py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-coffee-200 outline-none"
                            />
                          </div>
                          <label className="bg-coffee-100 text-coffee-700 p-2 rounded-xl hover:bg-coffee-200 cursor-pointer transition-colors flex items-center justify-center shrink-0">
                            <Upload size={18} />
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleStepImageUpload} 
                              className="hidden" 
                            />
                          </label>
                        </div>
                        {tempStep.image && (
                          <div className="relative h-24 rounded-xl overflow-hidden border border-coffee-100 bg-coffee-50">
                            <img src={tempStep.image} alt="Step Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button 
                              type="button"
                              onClick={() => setTempStep({...tempStep, image: ''})}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-lg"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <textarea 
                            value={tempStep.description}
                            onChange={(e) => setTempStep({...tempStep, description: e.target.value})}
                            placeholder="Descrição detalhada... (Dica: Use 'Dica do Barista' em uma nova linha para destaque)"
                            className="flex-1 bg-coffee-50 border border-coffee-100 rounded-xl py-2 px-3 text-sm h-24 resize-y focus:ring-2 focus:ring-coffee-200 outline-none"
                          />
                          <button 
                            type="button" 
                            onClick={addStep} 
                            className={cn(
                              "p-3 rounded-xl transition-all self-end shadow-sm",
                              editingStepIndex !== null ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-coffee-900 text-white hover:bg-coffee-800"
                            )}
                          >
                            {editingStepIndex !== null ? <Edit size={20} /> : <Plus size={20} />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {newRecipe.steps?.map((step, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "bg-white border p-3 rounded-xl text-xs flex justify-between items-center gap-4 transition-all",
                              editingStepIndex === i ? "border-amber-400 ring-1 ring-amber-400" : "border-coffee-100"
                            )}
                          >
                            <div className="flex gap-3 flex-1 min-w-0">
                              <div className="flex flex-col gap-1 shrink-0">
                                <button 
                                  type="button" 
                                  onClick={() => moveStep(i, 'up')}
                                  disabled={i === 0}
                                  className="p-1 text-coffee-300 hover:text-coffee-600 disabled:opacity-30"
                                >
                                  <ChevronUp size={14} />
                                </button>
                                <div className="w-6 h-6 rounded-full bg-coffee-100 flex items-center justify-center text-[10px] font-bold text-coffee-900">
                                  {i + 1}
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => moveStep(i, 'down')}
                                  disabled={i === (newRecipe.steps?.length || 0) - 1}
                                  className="p-1 text-coffee-300 hover:text-coffee-600 disabled:opacity-30"
                                >
                                  <ChevronDown size={14} />
                                </button>
                              </div>
                              {step.image && (
                                <div className="w-14 h-14 rounded-lg overflow-hidden border border-coffee-100 shrink-0">
                                  <img src={step.image} alt={step.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-coffee-900 mb-0.5 truncate">{step.title}</p>
                                <p className="text-coffee-500 line-clamp-2">{step.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                type="button" 
                                onClick={() => editStep(i)} 
                                className="p-2 text-coffee-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                title="Editar Passo"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                type="button" 
                                onClick={() => removeStep(i)} 
                                className="p-2 text-coffee-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Remover Passo"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-coffee-400 uppercase tracking-widest mb-1.5">Clima Adequado</label>
                      <div className="flex flex-wrap gap-2">
                        {(['hot', 'cold', 'neutral', 'rainy'] as WeatherCondition[]).map(condition => (
                          <button
                            key={condition}
                            type="button"
                            onClick={() => {
                              const current = newRecipe.weatherSuitability || [];
                              const updated = current.includes(condition)
                                ? current.filter(c => c !== condition)
                                : [...current, condition];
                              setNewRecipe({...newRecipe, weatherSuitability: updated});
                            }}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                              newRecipe.weatherSuitability?.includes(condition)
                                ? "bg-coffee-900 text-white border-coffee-900 shadow-md"
                                : "bg-white text-coffee-400 border-coffee-100 hover:border-coffee-200"
                            )}
                          >
                            {condition === 'hot' ? '🔥 Quente' : 
                             condition === 'cold' ? '❄️ Frio' : 
                             condition === 'rainy' ? '🌧️ Chuva' : '✨ Neutro'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="md:col-span-2 bg-coffee-900 text-white py-3 rounded-xl font-bold hover:bg-coffee-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (editingRecipeId ? <Edit size={18} /> : <Plus size={18} />)}
                      {editingRecipeId ? 'Salvar Alterações' : 'Adicionar Receita'}
                    </button>
                  </form>
                </section>

                {/* List and Delete Section */}
                <section>
                  <h4 className="text-sm font-bold text-coffee-900 uppercase tracking-widest mb-6">Receitas Atuais</h4>
                  <div className="space-y-3">
                    {allRecipes.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-4 bg-white border border-coffee-100 rounded-2xl group hover:border-coffee-200 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-coffee-100">
                            <img src={r.image} alt={r.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-coffee-900">{r.name}</h5>
                            <p className="text-[10px] text-coffee-400 font-medium uppercase tracking-widest">{r.category} • {r.country}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEditClick(r)}
                            className="p-2 text-coffee-300 hover:text-coffee-600 hover:bg-coffee-50 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteRecipe(r.id)}
                            className="p-2 text-coffee-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Step Guide */}
      <AnimatePresence>
        {isFullScreenSteps && selectedRecipe && selectedRecipe.steps && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-coffee-50 flex flex-col overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-60 pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-coffee-300/40 blur-[120px]" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-coffee-400/30 blur-[120px]" />
              <div className="absolute top-[40%] right-[-5%] w-[30%] h-[30%] rounded-full bg-coffee-200/40 blur-[100px]" />
            </div>
            {/* Header - Absolute and floating */}
            <div className="absolute top-0 left-0 w-full p-6 flex items-center justify-between z-20 pointer-events-none">
              <div className="px-4 py-2 rounded-full text-coffee-900 font-bold text-sm pointer-events-auto">
                {currentStepIndex + 1} / {selectedRecipe.steps.length}
              </div>
              <button 
                onClick={() => setIsFullScreenSteps(false)}
                className="w-12 h-12 bg-coffee-900 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform pointer-events-auto"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-start p-6 pt-24 pb-36 sm:p-12 sm:pt-28 sm:pb-40 max-w-2xl mx-auto w-full overflow-y-auto no-scrollbar relative z-10 select-text">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={currentStepIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="w-full flex flex-col items-center gap-6 sm:gap-8"
                >
                  <div className="w-full max-w-[280px] aspect-[2/3] relative rounded-[2.5rem] overflow-hidden bg-coffee-50 border-8 border-white shadow-2xl mx-auto shrink-0">
                    <img 
                      src={selectedRecipe.steps[currentStepIndex].image || `https://picsum.photos/seed/${selectedRecipe.steps[currentStepIndex].title + currentStepIndex}/1024/1536`} 
                      alt={selectedRecipe.steps[currentStepIndex].title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover filter contrast-[1.05]"
                    />
                  </div>

                  <div className="w-full space-y-4 text-center">
                    <h2 className="text-2xl sm:text-4xl font-sans font-black text-coffee-950 tracking-tight leading-tight">
                      {selectedRecipe.steps[currentStepIndex].title}
                    </h2>
                    <div className="w-full text-left">
                      {renderStepContent(selectedRecipe.steps[currentStepIndex].description)}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Solid Coffee Navigation Panel */}
            <div className="fixed bottom-0 left-0 right-0 border-t border-coffee-200 bg-coffee-50 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
              <div className="p-6 sm:p-10 flex items-center justify-between w-full max-w-4xl mx-auto">
                <button 
                  onClick={() => currentStepIndex > 0 && setCurrentStepIndex(prev => prev - 1)}
                  disabled={currentStepIndex === 0}
                  className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-coffee-100 text-coffee-900 disabled:opacity-30 hover:bg-coffee-200 transition-all border border-coffee-200/40 shadow-sm"
                >
                  <ChevronRight size={24} className="rotate-180" />
                </button>

                <div className="flex gap-2 sm:gap-3 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full bg-coffee-100 border border-coffee-200/50 shadow-inner">
                  {selectedRecipe.steps.map((_, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-500",
                        i === currentStepIndex ? "w-6 sm:w-8 bg-coffee-900" : "w-1.5 bg-coffee-900/20"
                      )}
                    />
                  ))}
                </div>

                <button 
                  onClick={() => {
                    if (currentStepIndex < selectedRecipe.steps.length - 1) {
                      setCurrentStepIndex(prev => prev + 1);
                    } else {
                      setIsFullScreenSteps(false);
                    }
                  }}
                  className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-coffee-900 text-white hover:bg-coffee-800 transition-all shadow-xl border border-coffee-800/20"
                >
                  {currentStepIndex < selectedRecipe.steps.length - 1 ? (
                    <ChevronRight size={24} />
                  ) : (
                    <Check size={24} />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recipe Detail Modal */}
      <AnimatePresence>
        {selectedRecipe && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-coffee-950/60 p-0 sm:p-6"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-coffee-50 w-full max-w-3xl h-full sm:h-[90vh] sm:rounded-[3rem] overflow-hidden flex flex-col shadow-2xl border border-coffee-100"
            >
              {/* Unified Scrollable Container wrapping both Banner image and Recipe Contents */}
              <div className="flex-grow overflow-y-auto no-scrollbar flex-1 min-h-0 relative z-10 select-text">
                <div className="relative h-72 sm:h-80 w-full shrink-0">
                  <img src={selectedRecipe.image} alt={selectedRecipe.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  <div className="absolute top-6 right-6 flex gap-2 z-20">
                    <button 
                      onClick={(e) => toggleFavorite(e, selectedRecipe.id)}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all border border-coffee-200/20",
                        favorites.includes(selectedRecipe.id) 
                          ? "bg-coffee-500 text-white" 
                          : "bg-white text-coffee-950"
                      )}
                    >
                      <Heart size={20} fill={favorites.includes(selectedRecipe.id) ? "currentColor" : "none"} />
                    </button>
                    <button 
                      onClick={() => setSelectedRecipe(null)}
                      className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-coffee-950 shadow-lg border border-coffee-200/20"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-coffee-50 to-transparent"></div>
                </div>

                <div className="px-8 pb-10 overflow-visible -mt-10 relative z-10">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-coffee-500 text-xs font-bold uppercase tracking-widest">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />
                          <span>{selectedRecipe.country}</span>
                        </div>
                        <span>•</span>
                        <span>{selectedRecipe.category}</span>
                        <span>•</span>
                        <span>{selectedRecipe.difficulty}</span>
                      </div>
                      {editingRecipeNameId === selectedRecipe.id ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="text"
                            value={editingRecipeNameValue}
                            onChange={(e) => setEditingRecipeNameValue(e.target.value)}
                            className="flex-1 min-w-0 text-2xl sm:text-3xl font-sans font-black text-coffee-950 bg-white border border-coffee-200 rounded-2xl px-3 py-1.5 outline-none focus:border-amber-500 shadow-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveRecipeOverride(selectedRecipe.id, { name: editingRecipeNameValue });
                                setEditingRecipeNameId(null);
                              } else if (e.key === 'Escape') {
                                setEditingRecipeNameId(null);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              saveRecipeOverride(selectedRecipe.id, { name: editingRecipeNameValue });
                              setEditingRecipeNameId(null);
                            }}
                            className="p-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 shadow transition-all flex items-center justify-center shrink-0"
                            title="Salvar"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              resetRecipeNameToDefault(selectedRecipe.id);
                              setEditingRecipeNameId(null);
                            }}
                            className="p-2 rounded-xl bg-coffee-100 hover:bg-coffee-200 text-coffee-600 shadow-sm transition-all flex items-center justify-center shrink-0"
                            title="Restaurar nome padrão"
                          >
                            <RotateCcw size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2 group/modal-title">
                          <h2 className="text-3xl sm:text-4xl font-sans font-black text-coffee-950 break-words leading-tight">{selectedRecipe.name}</h2>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRecipeNameId(selectedRecipe.id);
                              setEditingRecipeNameValue(selectedRecipe.name);
                            }}
                            className="opacity-0 group-hover/modal-title:opacity-100 hover:text-amber-500 text-coffee-400 p-1.5 transition-opacity duration-200 flex items-center justify-center shrink-0 animate-pulse"
                            title="Editar nome"
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Navigation Sub-Tabs to avoid long scrolling on mobile */}
                    <div className="flex border-b border-coffee-200/60 gap-1.5 p-1.5 bg-coffee-100 rounded-2xl sticky top-0 border border-coffee-200/30 z-20">
                      <button
                        type="button"
                        onClick={() => setActiveModalTab('sobre')}
                        className={cn(
                          "flex-1 py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5",
                          activeModalTab === 'sobre'
                            ? "bg-white text-coffee-950 shadow-sm border border-coffee-200/20"
                            : "text-coffee-500 hover:text-coffee-800"
                        )}
                      >
                        <BookOpen size={14} className="shrink-0" />
                        <span>Sobre</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveModalTab('ingredientes')}
                        className={cn(
                          "flex-1 py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5",
                          activeModalTab === 'ingredientes'
                            ? "bg-white text-coffee-950 shadow-sm border border-coffee-200/20"
                            : "text-coffee-500 hover:text-coffee-800"
                        )}
                      >
                        <Utensils size={14} className="shrink-0" />
                        <span>Itens</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveModalTab('preparo')}
                        className={cn(
                          "flex-1 py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5",
                          activeModalTab === 'preparo'
                            ? "bg-white text-coffee-950 shadow-sm border border-coffee-200/20"
                            : "text-coffee-500 hover:text-coffee-800"
                        )}
                      >
                        <Clock size={14} className="shrink-0" />
                        <span>Preparo</span>
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeModalTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                      >
                        {activeModalTab === 'sobre' && (
                          <div className="space-y-6">
                            {/* Formatted description with markdown compatibility */}
                            <div className="text-coffee-600 leading-relaxed font-sans text-sm sm:text-base">
                              {renderFormattedContent(selectedRecipe.description)}
                            </div>

                            <div className="flex gap-8 py-4 border-y border-coffee-200">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-800">
                                  <Clock size={20} />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-widest">Tempo</p>
                                  <p className="text-sm font-bold text-coffee-900">{selectedRecipe.prepTime}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-800">
                                  <Droplets size={20} />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-widest">Dificuldade</p>
                                  <p className="text-sm font-bold text-coffee-900">{selectedRecipe.difficulty}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeModalTab === 'ingredientes' && (
                          <div className="space-y-6">
                            {/* Calculadora de Doses & Porções */}
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-3 shadow-xs">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                                    <Scale size={18} />
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="text-sm font-bold text-coffee-950 truncate">Calculadora de Doses & Porções</h4>
                                    <p className="text-[11px] text-coffee-600 leading-tight">
                                      {(selectedRecipe.category as any) === 'Acompanhamentos' 
                                        ? 'Ajuste a quantidade de porções para calcular os ingredientes' 
                                        : 'Ajuste a quantidade de xícaras/doses para calcular os ingredientes'}
                                    </p>
                                  </div>
                                </div>
                                {recipePortions !== 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setRecipePortions(1)}
                                    className="text-[10px] font-bold text-amber-800 hover:text-amber-950 bg-amber-200/60 hover:bg-amber-200 px-2.5 py-1 rounded-lg uppercase tracking-wider transition-colors shrink-0"
                                  >
                                    1x Original
                                  </button>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-amber-500/20">
                                <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-amber-500/20 shadow-xs">
                                  <button
                                    type="button"
                                    onClick={() => setRecipePortions(prev => Math.max(1, prev - 1))}
                                    className="w-8 h-8 rounded-lg bg-coffee-100 hover:bg-coffee-200 text-coffee-900 flex items-center justify-center font-bold text-base transition-colors"
                                    aria-label="Diminuir porção"
                                  >
                                    -
                                  </button>
                                  <span className="text-sm font-black text-coffee-950 px-3 min-w-[90px] text-center">
                                    {recipePortions} {(selectedRecipe.category as any) === 'Acompanhamentos' 
                                      ? (recipePortions === 1 ? 'porção' : 'porções') 
                                      : (recipePortions === 1 ? 'xícara' : 'xícaras')}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setRecipePortions(prev => prev + 1)}
                                    className="w-8 h-8 rounded-lg bg-coffee-100 hover:bg-coffee-200 text-coffee-900 flex items-center justify-center font-bold text-base transition-colors"
                                    aria-label="Aumentar porção"
                                  >
                                    +
                                  </button>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {[1, 2, 3, 4, 6, 10].map(count => (
                                    <button
                                      key={count}
                                      type="button"
                                      onClick={() => setRecipePortions(count)}
                                      className={cn(
                                        "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                                        recipePortions === count
                                          ? "bg-amber-600 text-white shadow-xs scale-105"
                                          : "bg-white text-coffee-700 border border-coffee-200/80 hover:bg-amber-50"
                                      )}
                                    >
                                      {count}x
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-sans font-bold text-coffee-950">Ingredientes</h3>
                                {recipePortions > 1 && (
                                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                                    Calculado para {recipePortions} {(selectedRecipe.category as any) === 'Acompanhamentos' ? 'porções' : 'xícaras'}
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-1 gap-3">
                                {(selectedRecipe.detailedIngredients && selectedRecipe.detailedIngredients.length > 0) ? (
                                  selectedRecipe.detailedIngredients.map((ing, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-coffee-card rounded-2xl border border-coffee-100/70 shadow-sm">
                                      <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                                          {getIngredientIcon(ing.name, ing.icon)}
                                        </div>
                                        <span className="text-sm font-semibold text-coffee-800 leading-snug">
                                          {formatIngredientText(ing.name, ing.amount, recipePortions)}
                                        </span>
                                      </div>
                                      <span className="text-sm font-bold text-coffee-300/80 ml-3 shrink-0">{i + 1}</span>
                                    </div>
                                  ))
                                ) : (selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0) ? (
                                  selectedRecipe.ingredients.map((ing, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-coffee-card rounded-2xl border border-coffee-100/70 shadow-sm">
                                      <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                                          {getIngredientIcon(ing)}
                                        </div>
                                        <span className="text-sm font-semibold text-coffee-800 leading-snug">
                                          {formatIngredientText(ing, '', recipePortions)}
                                        </span>
                                      </div>
                                      <span className="text-sm font-bold text-coffee-300/80 ml-3 shrink-0">{i + 1}</span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-coffee-400 italic text-sm px-2">Nenhum ingrediente listado.</p>
                                )}
                              </div>
                            </div>

                            {selectedRecipe.equipment && selectedRecipe.equipment.length > 0 && (
                              <div className="space-y-4 pt-2">
                                <h3 className="text-xl font-sans font-bold text-coffee-950">Equipamentos</h3>
                                <div className="relative group/scroll-container">
                                  {/* Left Scroll Button (appears on desktop hover) */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      const container = e.currentTarget.nextElementSibling;
                                      if (container) {
                                        container.scrollBy({ left: -240, behavior: 'smooth' });
                                      }
                                    }}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/95 border border-coffee-200/50 hover:bg-amber-500 hover:text-white text-coffee-950 w-8 h-8 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover/scroll-container:opacity-100 transition-opacity duration-200"
                                    aria-label="Rolar para esquerda"
                                  >
                                    <ChevronLeft size={16} />
                                  </button>

                                  <div 
                                    ref={(el) => {
                                      if (el) {
                                        if ((el as any)._hasWheelHandler) return;
                                        (el as any)._hasWheelHandler = true;
                                        el.addEventListener('wheel', (e) => {
                                          if (e.deltaY !== 0) {
                                            e.preventDefault();
                                            el.scrollBy({ left: e.deltaY * 1.5, behavior: 'auto' });
                                          }
                                        }, { passive: false });
                                      }
                                    }}
                                    className="flex gap-4 overflow-x-auto pb-2 snap-x no-scrollbar scroll-smooth"
                                  >
                                    {selectedRecipe.equipment.map((eq, i) => {
                                      const cleanName = eq.includes('::') ? eq.split('::')[0] : eq;
                                      const imageUrl = getEquipmentImage(eq, customEquipmentHistory);
                                      const isEditing = editingEquipmentIndex === i;
                                      return (
                                        <div 
                                          key={i} 
                                          title={cleanName}
                                          className="group/item relative w-28 h-28 shrink-0 snap-start rounded-2xl border border-coffee-100/70 overflow-hidden bg-white shadow-sm hover:shadow-md hover:border-amber-500 transition-all duration-300"
                                        >
                                          {isEditing ? (
                                            <div className="absolute inset-0 z-20 bg-amber-50/95 p-2 flex flex-col justify-between h-full w-full">
                                              <textarea
                                                value={editingEquipmentValue}
                                                onChange={(e) => setEditingEquipmentValue(e.target.value)}
                                                className="w-full flex-1 text-[10px] font-bold text-coffee-950 bg-transparent border-0 outline-none resize-none focus:ring-0 p-0 leading-tight"
                                                placeholder="Nome..."
                                                autoFocus
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleRenameEquipment(selectedRecipe.id, i, editingEquipmentValue);
                                                    setEditingEquipmentIndex(null);
                                                  } else if (e.key === 'Escape') {
                                                    setEditingEquipmentIndex(null);
                                                  }
                                                }}
                                              />
                                              <div className="flex justify-end gap-1 border-t border-coffee-200/30 pt-1">
                                                <button
                                                  type="button"
                                                  onClick={() => setEditingEquipmentIndex(null)}
                                                  className="px-1.5 py-0.5 rounded text-[8px] font-extrabold text-coffee-600 hover:bg-coffee-100"
                                                >
                                                  Sair
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    handleRenameEquipment(selectedRecipe.id, i, editingEquipmentValue);
                                                    setEditingEquipmentIndex(null);
                                                  }}
                                                  className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-amber-500 text-white hover:bg-amber-600"
                                                >
                                                  Ok
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              <img 
                                                src={imageUrl} 
                                                alt={cleanName} 
                                                referrerPolicy="no-referrer"
                                                className="w-full h-full object-contain p-2.5 group-hover/item:scale-105 transition-transform duration-500"
                                              />
                                              {/* Elegant minimal hover overlay */}
                                              <div className="absolute inset-0 bg-gradient-to-t from-coffee-950/80 via-coffee-950/20 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-end p-2.5">
                                                <span className="text-[10px] font-bold text-white tracking-wide truncate pr-5 w-full">
                                                  {cleanName}
                                                </span>
                                              </div>

                                              {/* Edit Pencil Button */}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingEquipmentIndex(i);
                                                  setEditingEquipmentValue(cleanName);
                                                }}
                                                title="Editar nome"
                                                className="absolute top-1 right-1 bg-white/95 hover:bg-amber-500 hover:text-white text-coffee-950 w-5 h-5 rounded-full flex items-center justify-center shadow transition-all duration-200 opacity-0 group-hover/item:opacity-100 z-10 border border-coffee-100"
                                              >
                                                <Edit size={10} />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Right Scroll Button (appears on desktop hover) */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      const container = e.currentTarget.previousElementSibling;
                                      if (container) {
                                        container.scrollBy({ left: 240, behavior: 'smooth' });
                                      }
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/95 border border-coffee-200/50 hover:bg-amber-500 hover:text-white text-coffee-950 w-8 h-8 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover/scroll-container:opacity-100 transition-opacity duration-200"
                                    aria-label="Rolar para direita"
                                  >
                                    <ChevronRight size={16} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {activeModalTab === 'preparo' && (
                          <div className="space-y-6">
                            <div className="flex items-center justify-between relative">
                              <h3 className="text-xl font-sans font-bold text-coffee-950">Modo de Preparo</h3>
                              <div className="flex items-center gap-2">
                                {selectedRecipe.steps && selectedRecipe.steps.length > 0 && (
                                  <>
                                    <button 
                                      onClick={() => setIsFullScreenSteps(true)}
                                      className="p-2 rounded-full bg-coffee-card border border-coffee-100/70 text-coffee-600 hover:bg-coffee-900 hover:text-white transition-all shadow-sm"
                                      title="Tela Cheia"
                                    >
                                      <Maximize2 size={16} />
                                    </button>
                                    <div className="flex items-center gap-2 bg-coffee-card px-3 py-1.5 rounded-full border border-coffee-100/70 shadow-sm">
                                      <span className="text-coffee-900 font-bold text-sm">{currentStepIndex + 1}</span>
                                      <span className="text-coffee-300 text-[10px]">/</span>
                                      <span className="text-coffee-400 text-[10px]">{selectedRecipe.steps.length}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {selectedRecipe.steps && selectedRecipe.steps.length > 0 ? (
                              <div className="bg-white rounded-[3rem] p-6 sm:p-8 border border-coffee-100 shadow-sm space-y-8 text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-coffee-50/30 to-transparent pointer-events-none" />
                                
                                <AnimatePresence mode="wait">
                                  {selectedRecipe.steps[currentStepIndex] && (
                                    <motion.div 
                                      key={currentStepIndex}
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 1.05 }}
                                      transition={{ duration: 0.3 }}
                                      className="space-y-6"
                                    >
                                      <div className="w-full max-w-[200px] aspect-[2/3] mx-auto relative rounded-[2rem] overflow-hidden bg-coffee-50 border-4 border-white shadow-xl rotate-1">
                                        <img 
                                          src={selectedRecipe.steps[currentStepIndex].image || `https://picsum.photos/seed/${selectedRecipe.steps[currentStepIndex].title + currentStepIndex}/1024/1536`} 
                                          alt={selectedRecipe.steps[currentStepIndex].title}
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover opacity-95 filter sepia-[0.1] contrast-[1.05]"
                                        />
                                      </div>

                                      <div className="text-center max-w-md mx-auto space-y-3">
                                        <h4 className="text-xl sm:text-2xl font-sans font-black text-coffee-950">
                                          {selectedRecipe.steps[currentStepIndex].title}
                                        </h4>
                                        <div className="text-left space-y-4">
                                          {renderStepContent(selectedRecipe.steps[currentStepIndex].description)}
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                <div className="flex flex-col items-center gap-4 pt-2">
                                  <button 
                                    onClick={() => {
                                      if (currentStepIndex < selectedRecipe.steps.length - 1) {
                                        setCurrentStepIndex(prev => prev + 1);
                                      } else {
                                        setCurrentStepIndex(0);
                                      }
                                    }}
                                    className="bg-white border border-coffee-100 px-8 py-3.5 rounded-full shadow-sm flex items-center gap-3 group hover:bg-coffee-900 hover:text-white transition-all active:scale-95"
                                  >
                                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-coffee-800 group-hover:text-white">
                                      {currentStepIndex < selectedRecipe.steps.length - 1 ? 'Continuar' : 'Reiniciar'}
                                    </span>
                                    <ChevronRight size={16} className="text-coffee-400 group-hover:text-white transition-colors" />
                                  </button>

                                  {currentStepIndex > 0 && (
                                    <button 
                                      onClick={() => setCurrentStepIndex(prev => prev - 1)}
                                      className="text-[10px] font-bold text-coffee-300 uppercase tracking-widest hover:text-coffee-500 transition-colors"
                                    >
                                      Voltar passo anterior
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="bg-white rounded-[3rem] p-12 border border-coffee-100 shadow-sm text-center">
                                <p className="text-coffee-400 italic">Modo de preparo não disponível para esta receita.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Clean Bottom Actions - Pinned */}
              <div className="p-6 bg-white border-t border-coffee-100 shrink-0 flex gap-3 sm:gap-4">
                <button 
                  onClick={() => setSelectedRecipe(null)}
                  className="px-5 sm:px-6 bg-coffee-100 text-coffee-800 py-4 rounded-2xl font-black uppercase tracking-[0.15em] hover:bg-coffee-200 transition-all active:scale-[0.98] text-xs"
                >
                  Voltar
                </button>
                <button 
                  onClick={() => {
                    setCurrentStepIndex(0);
                    setIsFullScreenSteps(true);
                  }}
                  className="flex-1 bg-coffee-950 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-coffee-900 transition-all shadow-lg hover:shadow-coffee-950/10 active:scale-[0.98] text-xs flex items-center justify-center gap-2"
                >
                  <Coffee size={14} className="stroke-[2.5]" />
                  <span>Preparar Receita</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
