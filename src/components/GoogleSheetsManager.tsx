import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Upload, Check, Loader2, AlertCircle, RefreshCw, ExternalLink, Database, LogIn, LogOut, FileText, Plus, Sparkles } from 'lucide-react';
import { Recipe } from '../data/recipes';
import { JourneyStep } from '../data/journey';
import { signInWithGoogle, googleSignOut, initGoogleAuth, getGoogleAccessToken } from '../services/googleAuth';
import { createCoffeeGoogleSheet, syncDataToGoogleSheet, readDataFromGoogleSheet, extractSpreadsheetId } from '../services/googleSheetsService';
import { exportRecipesToExcel, parseExcelOrCsvFile, downloadExcelTemplate } from '../services/excelService';
import { updateSettingsKey, fetchSettingsKey } from '../services/supabaseService';
import * as XLSX from 'xlsx';

interface GoogleSheetsManagerProps {
  recipes: Recipe[];
  journey: JourneyStep[];
  logoUrl?: string | null;
  settings?: Record<string, any>;
  onDataImported: (data: {
    recipes?: Recipe[];
    journey?: JourneyStep[];
    logoUrl?: string;
    settings?: Record<string, any>;
  }) => void;
}

export default function GoogleSheetsManager({
  recipes,
  journey,
  logoUrl,
  settings,
  onDataImported
}: GoogleSheetsManagerProps) {
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('coffee_google_spreadsheet_id') || '';
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => {
    return localStorage.getItem('coffee_google_spreadsheet_url') || '';
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = initGoogleAuth((user, token) => {
      setGoogleUser(user);
      setAccessToken(token);
    }, () => {
      setGoogleUser(null);
      setAccessToken(null);
    });

    // Check Supabase settings for global spreadsheet ID
    fetchSettingsKey('google_spreadsheet_id').then(remoteId => {
      if (remoteId && !localStorage.getItem('coffee_google_spreadsheet_id')) {
        setSpreadsheetId(remoteId);
        localStorage.setItem('coffee_google_spreadsheet_id', remoteId);
      }
    }).catch(console.warn);

    return () => unsubscribe();
  }, []);

  const saveSpreadsheetConfig = (id: string, url?: string) => {
    const cleanId = extractSpreadsheetId(id);
    setSpreadsheetId(cleanId);
    if (url) setSpreadsheetUrl(url);
    localStorage.setItem('coffee_google_spreadsheet_id', cleanId);
    if (url) localStorage.setItem('coffee_google_spreadsheet_url', url);
    updateSettingsKey('google_spreadsheet_id', cleanId).catch(console.warn);
    if (url) updateSettingsKey('google_spreadsheet_url', url).catch(console.warn);
  };

  const handleGoogleSignIn = async () => {
    setIsConnecting(true);
    setMessage(null);
    try {
      const result = await signInWithGoogle();
      if (result) {
        setGoogleUser(result.user);
        setAccessToken(result.accessToken);
        setMessage({ type: 'success', text: `Conectado com sucesso como ${result.user.displayName || result.user.email}!` });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Erro ao autenticar com o Google.' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await googleSignOut();
    setGoogleUser(null);
    setAccessToken(null);
    setMessage({ type: 'success', text: 'Desconectado do Google.' });
  };

  const handleCreateNewSheet = async () => {
    if (!accessToken) {
      setMessage({ type: 'error', text: 'Faça login com sua conta Google primeiro.' });
      return;
    }

    setIsSyncing(true);
    setMessage(null);

    try {
      const res = await createCoffeeGoogleSheet(accessToken, {
        recipes,
        journey,
        logoUrl: logoUrl || undefined,
        settings
      });

      saveSpreadsheetConfig(res.spreadsheetId, res.spreadsheetUrl);

      setMessage({ type: 'success', text: 'Planilha criada com sucesso no seu Google Drive com as 4 abas!' });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erro ao criar planilha no Google Drive.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncToGoogle = async () => {
    const token = accessToken || getGoogleAccessToken();
    if (!token) {
      setMessage({ type: 'error', text: 'Faça login com o Google para sincronizar.' });
      return;
    }
    if (!spreadsheetId) {
      setMessage({ type: 'error', text: 'Insira um ID de Planilha ou crie uma nova planilha primeiro.' });
      return;
    }

    setIsSyncing(true);
    setMessage(null);

    try {
      const cleanId = extractSpreadsheetId(spreadsheetId);
      await syncDataToGoogleSheet(cleanId, token, {
        recipes,
        journey,
        logoUrl: logoUrl || undefined,
        settings
      });
      saveSpreadsheetConfig(cleanId);
      setMessage({ type: 'success', text: 'Dados enviados para o Google Sheets com sucesso!' });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: 'Falha ao sincronizar com o Google Sheets.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReadFromGoogle = async () => {
    if (!spreadsheetId) {
      setMessage({ type: 'error', text: 'Insira um ID ou link de Planilha do Google.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const token = accessToken || getGoogleAccessToken();
      const cleanId = extractSpreadsheetId(spreadsheetId);
      saveSpreadsheetConfig(cleanId);

      const data = await readDataFromGoogleSheet(cleanId, token || undefined);
      if ((data.receitas_cafe && data.receitas_cafe.length > 0) || data.jornada_do_cafe || data.logotipo_de_cafe) {
        onDataImported({
          recipes: data.receitas_cafe,
          journey: data.jornada_do_cafe,
          logoUrl: data.logotipo_de_cafe,
          settings: data.configuracoes_do_aplicativo
        });

        setMessage({ type: 'success', text: 'Dados atualizados do Google Sheets com sucesso e sincronizados com a nuvem!' });
      } else {
        setMessage({ type: 'error', text: 'Nenhuma receita encontrada. Verifique se a planilha está pública ("Qualquer pessoa com o link") ou se as abas estão corretas.' });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erro ao ler dados da planilha do Google Sheets: ' + (err.message || '') });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Export CSV Files ---
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTableCSV = (tableName: 'receitas_cafe' | 'jornada_do_cafe' | 'logotipo_de_cafe' | 'configuracoes_do_aplicativo') => {
    if (tableName === 'receitas_cafe') {
      const headers = ['id', 'nome', 'pais', 'descricao', 'imagem_url', 'categoria', 'tempo_preparo', 'dificuldade', 'ingredientes', 'equipamentos', 'modo_preparo', 'clima_adequado'];
      const rows = recipes.map(r => [
        r.id,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.country || 'Brasil').replace(/"/g, '""')}"`,
        `"${(r.description || '').replace(/"/g, '""')}"`,
        `"${(r.image || '').replace(/"/g, '""')}"`,
        `"${(r.category || '').replace(/"/g, '""')}"`,
        `"${(r.prepTime || '5 min').replace(/"/g, '""')}"`,
        `"${(r.difficulty || 'Easy').replace(/"/g, '""')}"`,
        `"${JSON.stringify(r.detailedIngredients || []).replace(/"/g, '""')}"`,
        `"${JSON.stringify(r.equipment || []).replace(/"/g, '""')}"`,
        `"${JSON.stringify(r.steps || []).replace(/"/g, '""')}"`,
        `"${JSON.stringify(r.weatherSuitability || []).replace(/"/g, '""')}"`
      ]);
      const csvStr = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCSV(csvStr, 'receitas_cafe.csv');
    } else if (tableName === 'jornada_do_cafe') {
      const headers = ['step', 'titulo', 'subtitulo', 'descricao', 'imagem_url', 'dica_barista', 'tempo_leitura', 'icone'];
      const rows = journey.map(j => [
        j.step,
        `"${(j.title || '').replace(/"/g, '""')}"`,
        `"${(j.subtitle || '').replace(/"/g, '""')}"`,
        `"${(j.description || '').replace(/"/g, '""')}"`,
        `"${(j.imageUrl || '').replace(/"/g, '""')}"`,
        `"${(j.baristaTip || '').replace(/"/g, '""')}"`,
        `"${(j.readTime || '3 min').replace(/"/g, '""')}"`,
        `"${(j.iconName || 'Coffee').replace(/"/g, '""')}"`
      ]);
      const csvStr = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCSV(csvStr, 'jornada_do_cafe.csv');
    } else if (tableName === 'logotipo_de_cafe') {
      const headers = ['chave', 'valor'];
      const csvStr = `${headers.join(',')}\napp_logo,"${(logoUrl || '').replace(/"/g, '""')}"`;
      downloadCSV(csvStr, 'logotipo_de_cafe.csv');
    } else if (tableName === 'configuracoes_do_aplicativo') {
      const headers = ['chave', 'valor_json'];
      const rows = Object.entries(settings || {}).map(([k, v]) => [
        k,
        `"${JSON.stringify(v).replace(/"/g, '""')}"`
      ]);
      const csvStr = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCSV(csvStr, 'configuracoes_do_aplicativo.csv');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedRecipes = await parseExcelOrCsvFile(file);
      if (parsedRecipes.length > 0) {
        const fullRecipes = parsedRecipes.map((r, idx) => ({
          ...r,
          id: `imported-${Date.now()}-${idx}`
        }));
        onDataImported({ recipes: fullRecipes });
        setMessage({ type: 'success', text: `${fullRecipes.length} receita(s) importada(s) do arquivo CSV/Excel!` });
      } else {
        setMessage({ type: 'error', text: 'Nenhuma receita identificada no arquivo CSV. Verifique os títulos das colunas.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erro ao processar o arquivo CSV.' });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="bg-coffee-50 rounded-3xl p-6 border border-coffee-100 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-coffee-100 pb-4">
        <div>
          <h4 className="text-base font-bold text-coffee-950 uppercase tracking-wider flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-600" size={20} />
            Integração com Google Sheets & Arquivos CSV
          </h4>
          <p className="text-xs text-coffee-600 mt-1">
            Conecte diretamente sua planilha do Google ou gerencie seus dados através das 4 abas/tabelas: <span className="font-semibold text-coffee-800">receitas_cafe</span>, <span className="font-semibold text-coffee-800">jornada_do_cafe</span>, <span className="font-semibold text-coffee-800">logotipo_de_cafe</span> e <span className="font-semibold text-coffee-800">configuracoes_do_aplicativo</span>.
          </p>
        </div>

        {googleUser ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
              {googleUser.displayName || googleUser.email}
            </span>
            <button
              onClick={handleGoogleSignOut}
              className="p-2 text-coffee-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Desconectar do Google"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleGoogleSignIn}
            disabled={isConnecting}
            className="gsi-material-button text-xs font-semibold shrink-0"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid #747775',
              borderRadius: '12px',
              padding: '8px 16px',
              cursor: 'pointer',
              color: '#1f1f1f',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            {isConnecting ? (
              <Loader2 size={16} className="animate-spin mr-2 text-coffee-600" />
            ) : (
              <svg className="w-4 h-4 mr-2" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
            )}
            Entrar com Google
          </button>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded-2xl text-xs font-medium flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <Check size={16} className="text-emerald-600 shrink-0" /> : <AlertCircle size={16} className="text-red-600 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* --- Section 1: Google Sheets Direct Integration --- */}
      <div className="bg-white p-5 rounded-2xl border border-coffee-100/80 space-y-4">
        <h5 className="text-xs font-bold text-coffee-900 uppercase tracking-widest flex items-center gap-2">
          <Database size={16} className="text-emerald-600" />
          Sincronização em Nuvem via Google Sheets
        </h5>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={spreadsheetId}
            onChange={(e) => {
              const val = e.target.value;
              const clean = extractSpreadsheetId(val);
              setSpreadsheetId(clean);
              localStorage.setItem('coffee_google_spreadsheet_id', clean);
              updateSettingsKey('google_spreadsheet_id', clean).catch(console.warn);
            }}
            placeholder="Link completo ou ID da Planilha do Google (ex: https://docs.google.com/spreadsheets/d/...)"
            className="flex-1 w-full px-4 py-2.5 bg-coffee-50 border border-coffee-200 rounded-xl text-xs text-coffee-900 placeholder:text-coffee-400 focus:outline-none focus:border-emerald-600"
          />

          {spreadsheetUrl && (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2.5 bg-coffee-100 hover:bg-coffee-200 text-coffee-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <ExternalLink size={14} />
              Abrir Planilha
            </a>
          )}
        </div>

        {/* Tip Box for Unlocking / Sharing Google Sheet */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-amber-950">
            <Sparkles size={14} className="text-amber-600 shrink-0" />
            Como liberar a sincronização automática em qualquer dispositivo (sem login):
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-900 leading-relaxed font-medium">
            <li>Abra sua planilha no Google Sheets e clique no botão azul <strong>Compartilhar</strong> (canto superior direito).</li>
            <li>Em <em>Acesso geral</em>, mude de <strong>Restrito</strong> para <strong>Qualquer pessoa com o link</strong> e garanta que está como <strong>Leitor</strong> (assim qualquer pessoa vê os dados no app, mas ninguém consegue alterar sua planilha).</li>
            <li>Cole o link da planilha no campo acima. Pronto! Agora qualquer dispositivo sincronizará todas as receitas automaticamente ao abrir o app.</li>
          </ol>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleCreateNewSheet}
            disabled={isSyncing || !googleUser}
            className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Criar Planilha Automática
          </button>

          <button
            onClick={handleSyncToGoogle}
            disabled={isSyncing || !googleUser || !spreadsheetId}
            className="bg-coffee-900 hover:bg-coffee-800 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Enviar para Google Sheets
          </button>

          <button
            onClick={handleReadFromGoogle}
            disabled={isLoading || !spreadsheetId}
            className="bg-white hover:bg-coffee-100 border border-coffee-200 text-coffee-900 disabled:opacity-50 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Carregar do Google Sheets
          </button>
        </div>
      </div>

      {/* --- Section 2: CSV Downloads by Table --- */}
      <div className="bg-white p-5 rounded-2xl border border-coffee-100/80 space-y-4">
        <h5 className="text-xs font-bold text-coffee-900 uppercase tracking-widest flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText size={16} className="text-coffee-600" />
            Baixar ou Importar Arquivos CSV
          </span>
          <label className="text-[11px] font-bold text-coffee-700 hover:text-emerald-700 cursor-pointer flex items-center gap-1 bg-coffee-100 px-3 py-1 rounded-lg transition-colors">
            <Upload size={12} />
            Importar CSV/Excel
            <input type="file" accept=".csv, .xlsx" onChange={handleFileUpload} className="hidden" />
          </label>
        </h5>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => exportTableCSV('receitas_cafe')}
            className="p-3 bg-coffee-50 hover:bg-coffee-100/80 border border-coffee-200/80 rounded-xl text-left transition-colors group"
          >
            <div className="text-xs font-bold text-coffee-900 flex items-center justify-between mb-1">
              <span>receitas_cafe.csv</span>
              <Download size={14} className="text-coffee-400 group-hover:text-coffee-800" />
            </div>
            <p className="text-[10px] text-coffee-500">
              {recipes.length} receita(s) cadastradas
            </p>
          </button>

          <button
            onClick={() => exportTableCSV('jornada_do_cafe')}
            className="p-3 bg-coffee-50 hover:bg-coffee-100/80 border border-coffee-200/80 rounded-xl text-left transition-colors group"
          >
            <div className="text-xs font-bold text-coffee-900 flex items-center justify-between mb-1">
              <span>jornada_do_cafe.csv</span>
              <Download size={14} className="text-coffee-400 group-hover:text-coffee-800" />
            </div>
            <p className="text-[10px] text-coffee-500">
              {journey.length} etapa(s) da jornada
            </p>
          </button>

          <button
            onClick={() => exportTableCSV('logotipo_de_cafe')}
            className="p-3 bg-coffee-50 hover:bg-coffee-100/80 border border-coffee-200/80 rounded-xl text-left transition-colors group"
          >
            <div className="text-xs font-bold text-coffee-900 flex items-center justify-between mb-1">
              <span>logotipo_de_cafe.csv</span>
              <Download size={14} className="text-coffee-400 group-hover:text-coffee-800" />
            </div>
            <p className="text-[10px] text-coffee-500">
              {logoUrl ? 'Logotipo customizado' : 'Logotipo padrão'}
            </p>
          </button>

          <button
            onClick={() => exportTableCSV('configuracoes_do_aplicativo')}
            className="p-3 bg-coffee-50 hover:bg-coffee-100/80 border border-coffee-200/80 rounded-xl text-left transition-colors group"
          >
            <div className="text-xs font-bold text-coffee-900 flex items-center justify-between mb-1">
              <span>configuracoes...csv</span>
              <Download size={14} className="text-coffee-400 group-hover:text-coffee-800" />
            </div>
            <p className="text-[10px] text-coffee-500">
              Configurações e presets
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
