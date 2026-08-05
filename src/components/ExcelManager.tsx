import React, { useState } from 'react';
import { Download, Upload, FileSpreadsheet, Check, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { Recipe } from '../data/recipes';
import { exportRecipesToExcel, downloadExcelTemplate, parseExcelOrCsvFile } from '../services/excelService';
import { insertRecipeToSupabase, fetchRecipesFromSupabase } from '../services/supabaseService';

interface ExcelManagerProps {
  recipes: Recipe[];
  onRecipesImported: (importedCount: number) => void;
}

export default function ExcelManager({ recipes, onRecipesImported }: ExcelManagerProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = () => {
    try {
      exportRecipesToExcel(recipes, `receitas_do_cafe_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setMessage({ type: 'success', text: 'Planilha exportada com sucesso!' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erro ao exportar a planilha.' });
    }
  };

  const handleDownloadTemplate = () => {
    try {
      downloadExcelTemplate();
      setMessage({ type: 'success', text: 'Modelo baixado! Preencha e importe de volta.' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erro ao baixar o modelo.' });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setMessage(null);

    try {
      const parsedRecipes = await parseExcelOrCsvFile(file);

      if (parsedRecipes.length === 0) {
        setMessage({ type: 'error', text: 'Nenhuma receita válida foi encontrada na planilha.' });
        setIsImporting(false);
        return;
      }

      let successCount = 0;
      // Save each to Supabase
      for (const recipe of parsedRecipes) {
        try {
          await insertRecipeToSupabase(recipe);
          successCount++;
        } catch (err) {
          console.warn("Falha ao salvar receita no Supabase:", recipe.name, err);
          // Fallback: update local storage custom recipes list
          const savedCustom = localStorage.getItem('coffee_user_custom_recipes');
          let customList: Recipe[] = savedCustom ? JSON.parse(savedCustom) : [];
          const recipeToSave: Recipe = {
            id: `excel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            ...recipe
          };
          customList.push(recipeToSave);
          localStorage.setItem('coffee_user_custom_recipes', JSON.stringify(customList));
          successCount++;
        }
      }

      setMessage({ 
        type: 'success', 
        text: `${successCount} receita(s) importada(s) com sucesso da planilha!` 
      });

      onRecipesImported(successCount);
    } catch (err) {
      console.error("Erro na importação:", err);
      setMessage({ type: 'error', text: 'Erro ao processar o arquivo Excel/CSV. Verifique o formato do arquivo.' });
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-coffee-50 rounded-3xl p-6 border border-coffee-100 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-coffee-900 uppercase tracking-widest flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-emerald-600" />
          Integração com Excel / Planilhas (CSV)
        </h4>
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-wider w-max">
          Importação & Exportação
        </span>
      </div>

      <p className="text-xs text-coffee-600 leading-relaxed">
        Você pode gerenciar suas receitas offline criando uma planilha no Excel. Baixe o modelo pronto com as colunas corretas, preencha suas receitas e importe diretamente para o aplicativo!
      </p>

      {message && (
        <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <Check size={16} className="text-emerald-600 shrink-0" /> : <AlertCircle size={16} className="text-red-600 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <button
          onClick={handleDownloadTemplate}
          className="bg-white hover:bg-coffee-100 text-coffee-900 border border-coffee-200 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Download size={14} className="text-coffee-600" />
          Baixar Modelo Excel
        </button>

        <label className={`bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${isImporting ? 'opacity-60 pointer-events-none' : ''}`}>
          {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {isImporting ? 'Importando...' : 'Importar Planilha'}
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileChange} 
            className="hidden" 
            disabled={isImporting}
          />
        </label>

        <button
          onClick={handleExport}
          className="bg-coffee-900 hover:bg-coffee-800 text-white px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <FileSpreadsheet size={14} className="text-coffee-200" />
          Exportar Receitas (.xlsx)
        </button>
      </div>
    </div>
  );
}
