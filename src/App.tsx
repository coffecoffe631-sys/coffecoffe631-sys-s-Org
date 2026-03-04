import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, MapPin, Cloud, Sun, Clock, ChevronRight, ChevronUp, ChevronDown, X, Heart, Share2, Coffee, Droplets, Zap, Loader2, Settings, Plus, Trash2, Lock, Sparkles, Edit, RotateCcw, Upload, Image as ImageIcon, User as UserIcon, LogOut, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Recipe, Ingredient, Step, WeatherCondition, recipes } from './data/recipes';
import { useWeather } from './hooks/useWeather';
import { getLocalCoffeeRecommendation } from './services/recommendationService';
import { fetchRecipesFromSupabase, insertRecipeToSupabase, deleteRecipeFromSupabase, updateRecipeInSupabase, seedRecipes } from './services/supabaseService';
import { cn } from './lib/utils';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';

export default function App() {
  const weather = useWeather();
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(true);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'favorites'>('home');
  
  // Admin State
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  
  // Temp states for dynamic fields
  const [tempIngredient, setTempIngredient] = useState({ name: '', amount: '' });
  const [tempEquipment, setTempEquipment] = useState('');
  const [tempStep, setTempStep] = useState({ title: '', description: '', image: '' });
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  
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
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isExplainingRecommendation, setIsExplainingRecommendation] = useState(false);
  const [recommendation, setRecommendation] = useState<{ recipeId: string, reason: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [appLogo, setAppLogo] = useState<string | null>(() => localStorage.getItem('coffee_app_logo'));
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isInitialAuthCheck, setIsInitialAuthCheck] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
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

  const categories = ['Espresso', 'Latte', 'Cappuccino', 'Cold Brew', 'Specialty'];
  
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
    const loadSupabaseData = async () => {
      try {
        const dbRecipes = await fetchRecipesFromSupabase();
        setAllRecipes(dbRecipes || []);
        setSupabaseError(null);
      } catch (err: any) {
        console.error("Failed to load recipes from Supabase:", err);
        setSupabaseError(err.message || "Erro de conexão");
      } finally {
        setIsLoadingSupabase(false);
      }
    };
    loadSupabaseData();
  }, []);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsInitialAuthCheck(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsInitialAuthCheck(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Check for Stripe success/cancel in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) {
      const sessionId = params.get('session_id');
      console.log('>>> [FRONTEND] Checkout concluído. Session:', sessionId);
      alert('Parabéns! Seu pagamento foi processado. Se você ainda não tem uma conta, cadastre-se com o mesmo e-mail usado no pagamento para liberar o acesso Premium.');
      setIsPremium(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('canceled')) {
      alert('A assinatura foi cancelada.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const res = await fetch(`/api/config-status`);
        if (res.ok) {
          const data = await res.json();
          console.log('>>> [FRONTEND] Config Status:', data);
          if (!data.stripe.hasSecretKey || !data.stripe.hasPriceId) {
            setConfigError('Configuração do Stripe ausente! Defina STRIPE_SECRET_KEY e STRIPE_PRICE_ID nas variáveis de ambiente.');
          }
        }
      } catch (err) {
        console.warn('Erro ao verificar configuração do servidor:', err);
      }
    };
    checkConfig();
  }, []);

  const handleSubscribe = async () => {
    if (!user) return;
    setAuthLoading(true);
    try {
      const apiUrl = `/api/create-checkout-session`;
      console.log('>>> [FRONTEND] Iniciando checkout via:', apiUrl);
      console.log('>>> [FRONTEND] Origin:', window.location.origin);
      console.log('>>> [FRONTEND] Email do usuário:', user.email);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email: user.email }),
      });
      
      console.log('>>> [FRONTEND] Resposta recebida. Status:', response.status);
      const contentType = response.headers.get('content-type');
      console.log('>>> [FRONTEND] Content-Type:', contentType);

      if (!response.ok) {
        const text = await response.text();
        console.error('>>> [FRONTEND] Erro do servidor (texto):', text);
        
        let errorMessage = `Erro do servidor (${response.status})`;
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorData.message || JSON.stringify(errorData);
        } catch (e) {
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Resposta inválida do servidor: ${text.slice(0, 100)}`);
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        const errorDetail = data.error || data.message || JSON.stringify(data);
        throw new Error(errorDetail);
      }
    } catch (err: any) {
      console.error('Erro na assinatura:', err);
      let displayError = 'Erro desconhecido';
      
      if (typeof err === 'string') {
        displayError = err;
      } else if (err.message) {
        displayError = err.message;
      } else {
        try {
          displayError = JSON.stringify(err);
        } catch (e) {
          displayError = String(err);
        }
      }
      
      alert('Erro ao processar pagamento: ' + displayError);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        
        // Se o usuário foi criado com sucesso e a confirmação está desativada,
        // o Supabase pode ou não logar automaticamente. 
        // Para garantir, tentamos o login logo após o cadastro.
        if (data.user) {
          await supabase.auth.signInWithPassword({
            email: authEmail,
            password: authPassword,
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
    await supabase.auth.signOut();
  };

  useEffect(() => {
    if (!weather.loading && allRecipes.length > 0) {
      const rec = getLocalCoffeeRecommendation({ temp: weather.temp, condition: weather.condition }, allRecipes);
      setRecommendation(rec);
    }
  }, [weather.loading, weather.temp, weather.condition, allRecipes]);

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
    const baseList = activeTab === 'favorites' 
      ? allRecipes.filter(r => favorites.includes(r.id))
      : allRecipes;

    return baseList.filter(recipe => {
      const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          recipe.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          recipe.country.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || recipe.category === selectedCategory;
      const matchesIngredients = activeIngredients.length === 0 || 
                                activeIngredients.every(ing => recipe.ingredients.includes(ing));
      const matchesEquipment = activeEquipment.length === 0 || 
                              activeEquipment.every(eq => recipe.equipment.includes(eq));
      
      return matchesSearch && matchesCategory && matchesIngredients && matchesEquipment;
    });
  }, [searchQuery, selectedCategory, activeIngredients, activeEquipment, activeTab, favorites, allRecipes]);

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
    
    // Auto-add pending step if it has content
    if (tempStep.title && tempStep.description) {
      const steps = [...(newRecipe.steps || [])];
      if (editingStepIndex !== null) {
        steps[editingStepIndex] = { ...tempStep };
      } else {
        steps.push({ ...tempStep });
      }
      newRecipe.steps = steps;
      setTempStep({ title: '', description: '', image: '' });
      setEditingStepIndex(null);
    }

    setIsSubmitting(true);
    console.log("Submitting recipe:", newRecipe);
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
            image: item.imagem || '',
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
      
      const dbRecipes = await fetchRecipesFromSupabase();
      setAllRecipes(dbRecipes || []);
      
      // Update selectedRecipe if it was the one being edited
      if (editingRecipeId && selectedRecipe?.id === editingRecipeId && updatedRecipe) {
        setSelectedRecipe(updatedRecipe);
      } else if (editingRecipeId && selectedRecipe?.id === editingRecipeId) {
        // Fallback if result mapping failed
        const refreshed = dbRecipes.find(r => r.id === editingRecipeId);
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
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert('O logo deve ter no máximo 1MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAppLogo(base64);
        localStorage.setItem('coffee_app_logo', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetLogo = () => {
    setAppLogo(null);
    localStorage.removeItem('coffee_app_logo');
  };

  const addIngredient = () => {
    if (!tempIngredient.name || !tempIngredient.amount) return;
    setNewRecipe(prev => ({
      ...prev,
      detailedIngredients: [...(prev.detailedIngredients || []), { ...tempIngredient }],
      ingredients: [...(prev.ingredients || []), tempIngredient.name]
    }));
    setTempIngredient({ name: '', amount: '' });
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
    setNewRecipe(prev => ({
      ...prev,
      equipment: [...(prev.equipment || []), tempEquipment]
    }));
    setTempEquipment('');
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

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta receita?')) return;
    try {
      await deleteRecipeFromSupabase(id);
      const dbRecipes = await fetchRecipesFromSupabase();
      setAllRecipes(dbRecipes || []);
      alert('Receita excluída!');
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  if (isInitialAuthCheck) {
    return (
      <div className="min-h-screen bg-coffee-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-coffee-100 flex items-center justify-center border-4 border-coffee-200">
            <Coffee size={32} className="text-coffee-700 animate-pulse" />
          </div>
          <Loader2 className="animate-spin text-coffee-400" size={24} />
          <span className="text-xs font-bold text-coffee-400 uppercase tracking-widest">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-coffee-50 flex items-center justify-center p-6 relative overflow-hidden">
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
            <div className="w-20 h-20 rounded-[2rem] bg-coffee-900 flex items-center justify-center mb-6 shadow-xl shadow-coffee-900/20 rotate-3">
              <Coffee size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-coffee-900 mb-2">Cheirinho Mineiro</h1>
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
                  type="password" 
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-coffee-50 border border-coffee-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-coffee-200 transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={authLoading}
              className="w-full bg-coffee-900 text-white py-5 rounded-2xl font-bold hover:bg-coffee-800 transition-all shadow-lg shadow-coffee-900/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {authLoading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  {authMode === 'login' ? 'Acessar Plataforma' : 'Criar minha Conta'}
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </form>


          <div className="mt-10 text-center">
            <p className="text-xs text-coffee-400 font-medium">
              Ao continuar, você concorda com nossos <br />
              <span className="text-coffee-900 underline cursor-pointer">Termos de Uso</span> e <span className="text-coffee-900 underline cursor-pointer">Privacidade</span>.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {configError && (
        <div className="bg-red-600 text-white px-4 py-2 text-center text-sm font-bold sticky top-0 z-[100] shadow-lg animate-pulse">
          ⚠️ {configError}
        </div>
      )}
      {/* Header */}
      <header className="sticky top-0 bg-coffee-50/80 backdrop-blur-md z-30 border-b border-coffee-100/50">
        <div className="max-w-5xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full bg-coffee-100 flex items-center justify-center border-2 border-coffee-200 cursor-pointer text-coffee-700 overflow-hidden"
            onClick={() => isAdminAuthenticated ? setShowAdminPanel(true) : setShowAdminLogin(true)}
          >
            {appLogo ? (
              <img src={appLogo} alt="App Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Coffee size={20} fill="currentColor" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-coffee-900 leading-none">Cheirinho Mineiro</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isLoadingSupabase && (
            <div className="hidden sm:flex items-center gap-1.5 text-coffee-400 mr-2">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Sincronizando</span>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-bold text-coffee-900 uppercase tracking-widest truncate max-w-[120px]">
                {user.email?.split('@')[0]}
              </span>
              <span className={cn(
                "text-[8px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded",
                isPremium ? "text-amber-600 bg-amber-50" : "text-coffee-400 bg-coffee-100"
              )}>
                {isPremium ? "Plano Premium" : "Plano Gratuito"}
              </span>
            </div>
            {!isPremium && (
              <button 
                onClick={() => setShowSubscriptionModal(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
              >
                <Sparkles size={14} />
                Assinar
              </button>
            )}
            <button 
              onClick={handleSignOut}
              className="p-2.5 rounded-full bg-coffee-100 text-coffee-600 hover:bg-coffee-200 transition-all border border-coffee-200"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
        </div>
      </header>

      <main className="px-6 py-8 space-y-8 max-w-5xl mx-auto">
        {/* Search & Filters */}
        <section className="space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400 group-focus-within:text-coffee-600 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder={activeTab === 'home' ? "Buscar por nome ou país..." : "Buscar nos favoritos..."}
              className="w-full bg-white border border-coffee-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-coffee-200 transition-all shadow-sm"
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
                <div className="bg-white rounded-2xl p-4 border border-coffee-100 shadow-sm space-y-4">
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

          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar sm:justify-center">
            <button 
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-6 py-3 rounded-2xl whitespace-nowrap text-sm font-medium transition-all",
                !selectedCategory ? "bg-coffee-900 text-white shadow-lg shadow-coffee-900/20" : "bg-white text-coffee-600 border border-coffee-100"
              )}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-6 py-3 rounded-2xl whitespace-nowrap text-sm font-medium transition-all",
                  selectedCategory === cat ? "bg-coffee-900 text-white shadow-lg shadow-coffee-900/20" : "bg-white text-coffee-600 border border-coffee-100"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Recipe Grid */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-coffee-950 break-words">
              {activeTab === 'favorites' ? 'Meus Favoritos' : (searchQuery || selectedCategory ? 'Resultados' : 'Explorar Sabores')}
            </h2>
            <span className="text-[10px] sm:text-xs font-bold text-coffee-400 uppercase tracking-widest shrink-0">{filteredRecipes.length} Receitas</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe, idx) => (
              <motion.div 
                key={recipe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => {
                  if (recipe.premium && !isPremium) {
                    setShowSubscriptionModal(true);
                  } else {
                    setSelectedRecipe(recipe);
                    setCurrentStepIndex(0);
                  }
                }}
                className="group bg-white rounded-[2.5rem] p-4 border border-coffee-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden relative"
              >
                {recipe.premium && !isPremium && (
                  <div className="absolute inset-0 z-10 bg-coffee-900/5 backdrop-blur-[2px] flex items-center justify-center rounded-[2.5rem]">
                    <div className="bg-white/90 p-4 rounded-3xl shadow-xl border border-coffee-100 flex flex-col items-center gap-2 scale-90 sm:scale-100">
                      <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                        <Lock size={20} />
                      </div>
                      <span className="text-[10px] font-bold text-coffee-900 uppercase tracking-widest">Premium</span>
                    </div>
                  </div>
                )}
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
                        "p-2.5 backdrop-blur-md rounded-full shadow-sm transition-all",
                        favorites.includes(recipe.id) 
                          ? "bg-coffee-500 text-white" 
                          : "bg-white/80 text-coffee-900 hover:bg-white"
                      )}
                    >
                      <Heart size={18} fill={favorites.includes(recipe.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <div className="bg-coffee-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-[10px] font-bold uppercase tracking-widest border border-white/10">
                      {recipe.category}
                    </div>
                  </div>
                </div>
                <div className="px-2 pb-2">
                  <div className="flex items-center gap-1 text-coffee-400 mb-1">
                    <MapPin size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{recipe.country}</span>
                  </div>
                  <h3 className="text-xl font-serif font-bold text-coffee-950 mb-1 break-words">{recipe.name}</h3>
                  <div className="flex items-center gap-4 text-coffee-400">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span className="text-xs font-medium">{recipe.prepTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Coffee size={14} />
                      <span className="text-xs font-medium">{recipe.difficulty}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredRecipes.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-coffee-100 rounded-full flex items-center justify-center mx-auto text-coffee-300">
                <Coffee size={40} />
              </div>
              <p className="text-coffee-500 font-serif italic">
                {activeTab === 'favorites' ? 'Você ainda não favoritou nenhuma receita.' : 'Nenhuma receita encontrada com esses filtros.'}
              </p>
              {activeTab === 'home' && (
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
      </main>

      {/* Subscription Modal */}
      <AnimatePresence>
        {showSubscriptionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSubscriptionModal(false)}
              className="absolute inset-0 bg-coffee-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm relative z-10 shadow-2xl border border-coffee-100"
            >
              <button 
                onClick={() => setShowSubscriptionModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-coffee-50 text-coffee-400 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-6 rotate-3">
                  <Sparkles size={32} className="text-amber-600" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-coffee-900">Seja Premium</h2>
                <p className="text-sm text-coffee-500">
                  Libere receitas exclusivas, dicas de baristas e suporte prioritário por apenas <span className="font-bold text-coffee-900">R$ 29,90/mês</span>.
                </p>
                
                <div className="py-6 space-y-3">
                  <div className="flex items-center gap-3 text-left text-xs font-medium text-coffee-600">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Zap size={12} />
                    </div>
                    Receitas ilimitadas
                  </div>
                  <div className="flex items-center gap-3 text-left text-xs font-medium text-coffee-600">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Zap size={12} />
                    </div>
                    Acesso a vídeos de preparo
                  </div>
                  <div className="flex items-center gap-3 text-left text-xs font-medium text-coffee-600">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Zap size={12} />
                    </div>
                    Sem anúncios (em breve)
                  </div>
                </div>

                <button 
                  onClick={handleSubscribe}
                  disabled={authLoading}
                  className="w-full bg-coffee-900 text-white py-4 rounded-2xl font-bold hover:bg-coffee-800 transition-all shadow-lg shadow-coffee-900/20 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {authLoading ? <Loader2 size={20} className="animate-spin" /> : "Assinar Agora"}
                </button>
                <p className="text-[10px] text-coffee-400 uppercase tracking-widest font-bold">
                  Cancele quando quiser
                </p>
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
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={10} className="text-amber-400 fill-amber-400" />
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-[0.2em] block">Especial para você</span>
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
                >
                  <Coffee size={24} />
                </button>

                <button 
                  onClick={() => setActiveTab('favorites')}
                  className={cn("p-2 transition-colors", activeTab === 'favorites' ? "text-white" : "text-coffee-600")}
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
              className="absolute inset-0 bg-coffee-950/95 backdrop-blur-xl"
            >
              <div className="absolute inset-0 opacity-30">
                <img src={recommendedRecipe.image} referrerPolicy="no-referrer" className="w-full h-full object-cover blur-3xl scale-150" alt="" />
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative w-full max-w-md bg-white/5 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-md"
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
                
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/30 mb-6">
                  <Sparkles size={14} className="text-amber-400" fill="currentColor" />
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-[0.2em]">Seleção do Barista</span>
                </div>
                
                <h3 className="text-3xl font-serif font-bold text-white mb-6 leading-tight">
                  Por que o <span className="text-amber-400">{recommendedRecipe.name}</span> hoje?
                </h3>
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-coffee-100 text-xl leading-relaxed mb-10 font-medium italic font-serif"
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

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showAdminLogin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-coffee-950/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl border border-coffee-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-serif font-bold text-coffee-900 flex items-center gap-2">
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
                  <input 
                    type="password" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-coffee-50 border border-coffee-100 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-coffee-200"
                    placeholder="••••••••"
                    autoFocus
                  />
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-coffee-950/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-coffee-100 no-scrollbar"
            >
              <div className="flex justify-between items-center mb-8 sticky top-0 bg-white py-2 z-10">
                <div>
                  <h3 className="text-2xl font-serif font-bold text-coffee-900">Gerenciar Receitas</h3>
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
                {/* App Customization */}
                <section className="bg-coffee-50 rounded-3xl p-6 border border-coffee-100">
                  <h4 className="text-sm font-bold text-coffee-900 uppercase tracking-widest flex items-center gap-2 mb-6">
                    <Settings size={18} className="text-coffee-500" />
                    Personalização do App
                  </h4>
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-white border-2 border-coffee-200 flex items-center justify-center overflow-hidden text-coffee-700 shrink-0">
                      {appLogo ? (
                        <img src={appLogo} alt="Logo Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Coffee size={32} fill="currentColor" />
                      )}
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
                    <div className="md:col-span-2 flex items-center gap-4 mb-2">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={newRecipe.premium || false}
                          onChange={(e) => setNewRecipe({...newRecipe, premium: e.target.checked})}
                          className="w-4 h-4 rounded border-coffee-200 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-[10px] font-bold text-coffee-900 uppercase tracking-widest group-hover:text-amber-600 transition-colors flex items-center gap-1">
                          <Sparkles size={12} className="text-amber-500" />
                          Receita Premium
                        </span>
                      </label>
                    </div>
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
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
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
                              onChange={(e) => setNewRecipe({...newRecipe, image: e.target.value})}
                              className="w-full bg-white border border-coffee-100 rounded-xl py-2.5 pl-10 pr-4 text-sm"
                              placeholder="Ou cole uma URL aqui..."
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
                      <div className="flex flex-wrap gap-2">
                        {allIngredients.slice(0, 8).map(ing => (
                          <button
                            key={ing}
                            type="button"
                            onClick={() => setTempIngredient({ name: ing, amount: '' })}
                            className="bg-coffee-100/50 text-coffee-600 px-2 py-1 rounded-lg text-[10px] font-bold uppercase hover:bg-coffee-200 transition-colors"
                          >
                            + {ing}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {newRecipe.detailedIngredients?.map((ing, i) => (
                          <div key={i} className="bg-white border border-coffee-100 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                            <span>{ing.name} ({ing.amount})</span>
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
                      <div className="flex flex-wrap gap-2">
                        {allEquipment.slice(0, 8).map(eq => (
                          <button
                            key={eq}
                            type="button"
                            onClick={() => setTempEquipment(eq)}
                            className="bg-coffee-100/50 text-coffee-600 px-2 py-1 rounded-lg text-[10px] font-bold uppercase hover:bg-coffee-200 transition-colors"
                          >
                            + {eq}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {newRecipe.equipment?.map((eq, i) => (
                          <div key={i} className="bg-white border border-coffee-100 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                            <span>{eq}</span>
                            <button type="button" onClick={() => removeEquipment(i)} className="text-red-400 hover:text-red-600">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
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
                              onChange={(e) => setTempStep({...tempStep, image: e.target.value})}
                              placeholder="URL da Imagem ou use o botão ao lado"
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
                            placeholder="Descrição detalhada..."
                            className="flex-1 bg-coffee-50 border border-coffee-100 rounded-xl py-2 px-3 text-sm h-16 resize-none focus:ring-2 focus:ring-coffee-200 outline-none"
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

      {/* Recipe Detail Modal */}
      <AnimatePresence>
        {selectedRecipe && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-coffee-950/40 backdrop-blur-sm p-0 sm:p-6"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-coffee-50 w-full max-w-3xl h-full sm:h-[90vh] sm:rounded-[3rem] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="relative h-72 sm:h-80 shrink-0">
                <img src={selectedRecipe.image} alt={selectedRecipe.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                <div className="absolute top-6 right-6 flex gap-2">
                  <button 
                    onClick={(e) => toggleFavorite(e, selectedRecipe.id)}
                    className={cn(
                      "w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg transition-all",
                      favorites.includes(selectedRecipe.id) 
                        ? "bg-coffee-500 text-white" 
                        : "bg-white/80 text-coffee-950"
                    )}
                  >
                    <Heart size={20} fill={favorites.includes(selectedRecipe.id) ? "currentColor" : "none"} />
                  </button>
                  <button 
                    onClick={() => setSelectedRecipe(null)}
                    className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-coffee-950 shadow-lg"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-coffee-50 to-transparent"></div>
              </div>

              <div className="px-8 pb-10 overflow-y-auto no-scrollbar flex-1 -mt-10 relative z-10">
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
                    <h2 className="text-3xl sm:text-4xl font-serif font-bold text-coffee-950 break-words">{selectedRecipe.name}</h2>
                    <p className="text-coffee-600 italic leading-relaxed break-words">{selectedRecipe.description}</p>
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

                  <div className="space-y-4">
                    <h3 className="text-xl font-serif font-bold text-coffee-950">Ingredientes</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {selectedRecipe.detailedIngredients && selectedRecipe.detailedIngredients.length > 0 ? (
                        selectedRecipe.detailedIngredients.map((ing, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-coffee-100 shadow-sm">
                            <span className="text-sm font-medium text-coffee-800">{ing.name}</span>
                            <span className="text-xs font-bold text-coffee-400 bg-coffee-50 px-3 py-1 rounded-lg uppercase tracking-wider">{ing.amount}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-coffee-400 italic text-sm px-2">Nenhum ingrediente listado.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-8 pt-4">
                    <div className="flex items-center justify-between relative">
                      <h3 className="text-xl font-serif font-bold text-coffee-950">Modo de Preparo</h3>
                      {selectedRecipe.steps && selectedRecipe.steps.length > 0 && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-coffee-100 shadow-sm">
                          <span className="text-coffee-900 font-bold text-sm">{currentStepIndex + 1}</span>
                          <span className="text-coffee-300 text-[10px]">/</span>
                          <span className="text-coffee-400 text-[10px]">{selectedRecipe.steps.length}</span>
                        </div>
                      )}
                    </div>

                    {selectedRecipe.steps && selectedRecipe.steps.length > 0 ? (
                      <div className="bg-white rounded-[3rem] p-8 border border-coffee-100 shadow-sm space-y-10 text-center relative overflow-hidden">
                        {/* Background decoration */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-coffee-50/30 to-transparent pointer-events-none" />
                        
                        <AnimatePresence mode="wait">
                          {selectedRecipe.steps[currentStepIndex] && (
                            <motion.div 
                              key={currentStepIndex}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 1.05 }}
                              transition={{ duration: 0.3 }}
                              className="space-y-8"
                            >
                              <div className="w-full max-w-[280px] aspect-[4/5] mx-auto relative">
                                <img 
                                  src={selectedRecipe.steps[currentStepIndex].image || `https://picsum.photos/seed/${selectedRecipe.steps[currentStepIndex].title + currentStepIndex}/600/750`} 
                                  alt={selectedRecipe.steps[currentStepIndex].title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-contain mix-blend-multiply opacity-90 filter contrast-[1.02]"
                                />
                              </div>

                              <div className="max-w-xs mx-auto">
                                <p className="text-lg sm:text-xl font-serif text-coffee-800/90 leading-relaxed italic">
                                  {selectedRecipe.steps[currentStepIndex].description}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex flex-col items-center gap-4 pt-4">
                          <button 
                            onClick={() => {
                              if (currentStepIndex < selectedRecipe.steps.length - 1) {
                                setCurrentStepIndex(prev => prev + 1);
                              } else {
                                setCurrentStepIndex(0);
                              }
                            }}
                            className="bg-white border border-coffee-100 px-10 py-4 rounded-full shadow-sm flex items-center gap-3 group hover:bg-coffee-900 hover:text-white transition-all active:scale-95"
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
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
