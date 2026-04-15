import React from 'react';
import { motion } from 'motion/react';
import { 
  Check, 
  Coffee, 
  Clock, 
  Thermometer, 
  Scale, 
  Trophy, 
  Star, 
  Flame, 
  Settings,
  ChevronRight,
  Lock
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Level {
  id: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'locked';
  xp: number;
  icon: React.ReactNode;
}

const levels: Level[] = [
  {
    id: 1,
    title: '1. Moagem Ideal',
    description: 'Entenda como a moagem impacta na extração.',
    status: 'completed',
    xp: 50,
    icon: <Check className="w-6 h-6" />,
  },
  {
    id: 2,
    title: '2. Proporção Perfeita',
    description: 'Descubra a proporção ideal para o seu café.',
    status: 'current',
    xp: 60,
    icon: <Coffee className="w-6 h-6" />,
  },
  {
    id: 3,
    title: '3. Tempo de Extração',
    description: 'Ajuste o tempo para alcançar o equilíbrio perfeito.',
    status: 'locked',
    xp: 60,
    icon: <Clock className="w-6 h-6" />,
  },
  {
    id: 4,
    title: '4. Temperatura',
    description: 'A temperatura certa faz toda a diferença.',
    status: 'locked',
    xp: 60,
    icon: <Thermometer className="w-6 h-6" />,
  },
  {
    id: 5,
    title: '5. Equilíbrio Sensorial',
    description: 'Identifique acidez, doçura e amargor no seu café.',
    status: 'locked',
    xp: 60,
    icon: <Scale className="w-6 h-6" />,
  },
  {
    id: 6,
    title: '6. Diagnóstico Profissional',
    description: 'Resolva problemas e extraia como um profissional.',
    status: 'locked',
    xp: 60,
    icon: <Trophy className="w-6 h-6" />,
  },
];

export default function Gamification({ userName }: { userName: string }) {
  return (
    <div className="min-h-screen bg-[#fdfaf7] pb-32">
      {/* Header Profile */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-lg">
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop" 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-coffee-950">{userName}</h2>
            <p className="text-xs font-medium text-coffee-500">
              <span className="text-green-600 font-bold">Nível 2</span> • Aprendiz de Barista
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white px-3 py-1.5 rounded-2xl shadow-sm border border-coffee-100 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span className="text-xs font-bold text-coffee-900">3 dias <span className="text-coffee-400 font-medium">streak</span></span>
          </div>
          <button className="p-2 bg-white rounded-xl shadow-sm border border-coffee-100 text-coffee-600">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 mb-8">
        <div className="flex justify-between items-end mb-2">
          <p className="text-xs font-medium text-coffee-600 italic">Você está evoluindo na arte da extração ☕</p>
          <span className="text-sm font-bold text-coffee-900">65%</span>
        </div>
        <div className="h-3 bg-coffee-100 rounded-full overflow-hidden shadow-inner">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '65%' }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-green-600 rounded-full"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 grid grid-cols-3 gap-3 mb-10">
        <div className="bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-white/40 shadow-sm flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mb-2">
            <Star className="w-5 h-5 text-amber-600 fill-amber-600" />
          </div>
          <p className="text-lg font-bold text-coffee-950">650</p>
          <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-widest">XP</p>
        </div>
        <div className="bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-white/40 shadow-sm flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-coffee-100 flex items-center justify-center mb-2">
            <Coffee className="w-5 h-5 text-coffee-700 fill-coffee-700" />
          </div>
          <p className="text-lg font-bold text-coffee-950">24</p>
          <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-widest">Grãos</p>
        </div>
        <div className="bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-white/40 shadow-sm flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mb-2">
            <Trophy className="w-5 h-5 text-orange-600 fill-orange-600" />
          </div>
          <p className="text-lg font-bold text-coffee-950">5</p>
          <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-widest">Conquistas</p>
        </div>
      </div>

      {/* Levels Path */}
      <div className="px-6 relative pb-10">
        {/* SVG Path */}
        <svg className="absolute left-[calc(1.5rem+24px)] top-10 w-full h-[calc(100%-80px)] pointer-events-none overflow-visible" style={{ zIndex: 0 }}>
          <path 
            d="M 0 0 Q 60 100 0 200 Q -60 300 0 400 Q 60 500 0 600 Q -60 700 0 800" 
            fill="none" 
            stroke="#e5e7eb" 
            strokeWidth="8" 
            strokeLinecap="round"
          />
          <motion.path 
            d="M 0 0 Q 60 100 0 200 Q -60 300 0 400 Q 60 500 0 600 Q -60 700 0 800" 
            fill="none" 
            stroke="#16a34a" 
            strokeWidth="8" 
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 0.25 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </svg>

        <div className="space-y-12 relative z-10">
          {levels.map((level, index) => (
            <div 
              key={level.id} 
              className={cn(
                "flex items-center gap-6",
                index % 2 !== 0 ? "flex-row-reverse text-right" : ""
              )}
            >
              {/* Level Icon Circle */}
              <motion.div 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-4 transition-all shrink-0",
                  level.status === 'completed' ? "bg-green-600 border-green-100 text-white" :
                  level.status === 'current' ? "bg-white border-green-600 text-coffee-900" :
                  "bg-white border-coffee-100 text-coffee-300"
                )}
              >
                {level.status === 'locked' ? <Lock className="w-6 h-6" /> : level.icon}
              </motion.div>

              {/* Level Info */}
              <div className="flex-1">
                <div className={cn(
                  "flex items-center gap-2 mb-1",
                  index % 2 !== 0 ? "justify-end" : ""
                )}>
                  <h3 className="text-sm font-bold text-coffee-950">{level.title}</h3>
                  {level.status === 'completed' && (
                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Concluído</span>
                  )}
                  {level.status === 'current' && (
                    <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Atual</span>
                  )}
                </div>
                <p className="text-xs text-coffee-500 mb-1 leading-relaxed">{level.description}</p>
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  level.status === 'completed' ? "text-green-600" :
                  level.status === 'current' ? "text-green-600" :
                  "text-coffee-300"
                )}>
                  +{level.xp} XP
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Mission Card */}
      <div className="px-6 mt-10">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-[2rem] p-6 shadow-xl border border-coffee-100 relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-coffee-50 rounded-full -mr-16 -mt-16 opacity-50" />
          
          <div className="flex gap-6 relative z-10">
            <div className="w-24 h-24 bg-coffee-50 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
              <img 
                src="https://cdn-icons-png.flaticon.com/512/924/924514.png" 
                alt="Mission" 
                className="w-16 h-16 object-contain"
              />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-[0.2em] mb-1">Missão Atual</p>
              <h4 className="text-xl font-serif font-bold text-coffee-950 mb-3">Extrair espresso equilibrado</h4>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-xs text-coffee-700">Ajustar moagem</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-xs text-coffee-700">Controlar tempo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full border border-coffee-200 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-transparent" />
                  </div>
                  <span className="text-xs text-coffee-400">Observar crema</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-bold text-coffee-900">+60 XP</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Coffee className="w-4 h-4 text-coffee-700 fill-coffee-700" />
                    <span className="text-xs font-bold text-coffee-900">+10 grãos</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button className="w-full mt-6 bg-green-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-800 transition-all shadow-lg shadow-green-900/20 group">
            Iniciar missão
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
