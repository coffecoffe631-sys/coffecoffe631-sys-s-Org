
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { JourneyStep } from '../data/journey';
import { Trophy, Check, Lock, Sparkles, Droplets, Waves, Leaf, Coffee, ChevronRight, Zap, X, Maximize2, Edit, Save, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface JourneyViewProps {
  journey: JourneyStep[];
  isAdmin: boolean;
  onUpdateStep: (step: JourneyStep) => Promise<void>;
  onAddStep: (step: Omit<JourneyStep, 'id'>) => Promise<void>;
  onDeleteStep: (id: string) => Promise<void>;
}

export default function JourneyView({ journey, isAdmin, onUpdateStep, onAddStep, onDeleteStep }: JourneyViewProps) {
  const [selectedStep, setSelectedStep] = useState<JourneyStep | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingStep, setEditingStep] = useState<JourneyStep | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingMode, setIsAddingMode] = useState(false);

  // Temp states for editing lists
  const [tempTask, setTempTask] = useState('');
  const [tempTip, setTempTip] = useState('');

  const closeDetails = () => {
    setSelectedStep(null);
    setIsFullScreen(false);
    setIsEditing(false);
  };

  const handleEditStart = (step: JourneyStep) => {
    setEditingStep({ ...step });
    setIsEditing(true);
    setIsAddingMode(false);
  };

  const handleAddStart = () => {
    const newStep: Omit<JourneyStep, 'id'> = {
      title: 'Nova Etapa',
      description: 'Descrição da nova etapa...',
      status: 'locked',
      icon: 'Zap',
      image: '',
      requirements: '',
      reward: '',
      content: {
        overview: 'Visão geral desta nova etapa...',
        tasks: ['Primeira tarefa'],
        tips: ['Dica importante']
      }
    };
    setEditingStep(newStep as any);
    setIsEditing(true);
    setIsAddingMode(true);
  };

  const handleDelete = async () => {
    if (!editingStep || !('id' in editingStep)) return;
    if (!confirm('Deseja realmente excluir esta etapa?')) return;
    
    setIsSaving(true);
    try {
      await onDeleteStep((editingStep as any).id);
      setIsEditing(false);
      setSelectedStep(null);
    } catch (err) {
      console.error('Failed to delete step:', err);
      alert('Erro ao excluir a etapa.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePatch = async () => {
    if (!editingStep) return;
    setIsSaving(true);
    try {
      if (isAddingMode) {
        await onAddStep(editingStep);
      } else {
        await onUpdateStep(editingStep as JourneyStep);
        setSelectedStep(editingStep as JourneyStep);
      }
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save step:', err);
      alert('Erro ao salvar as alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-12 pb-12">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 border border-amber-200 mb-2">
          <Trophy size={14} className="text-amber-600" />
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-[0.2em]">Jornada do Conhecimento</span>
        </div>
        <h2 className="text-3xl font-sans font-bold text-coffee-950">Seu Roadmap Barista</h2>
        <p className="text-coffee-500 max-w-sm mx-auto">Complete os desafios e evolua suas habilidades para destravar recompensas exclusivas.</p>
        
        {isAdmin && (
          <div className="pt-6">
            <button 
              onClick={handleAddStart}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-coffee-950 text-white font-black uppercase tracking-widest hover:bg-coffee-900 transition-all shadow-xl hover:scale-105 active:scale-95"
            >
              <Plus size={20} />
              Adicionar Etapa
            </button>
          </div>
        )}
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-16">
        {/* Meandros Connection Path (SVG) */}
        <div className="absolute inset-x-0 top-32 bottom-32 z-0 pointer-events-none opacity-20 hidden md:block">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              d={journey.map((_, i) => {
                if (i === journey.length - 1) return "";
                const isLeft = i % 2 === 0;
                const spacing = 100 / (journey.length - 1);
                const y1 = i * spacing;
                const y2 = (i + 1) * spacing;
                const midY = y1 + (spacing / 2);
                const startX = isLeft ? 28 : 72;
                const endX = isLeft ? 72 : 28;

                // Meander path: Vertical down to middle -> Horizontal across -> Vertical down to next step
                return `M ${startX} ${y1} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${y2}`;
              }).join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              strokeDasharray="4 6"
              className="text-coffee-400"
            />
            {/* Corner Decorative Dots */}
            {journey.map((_, i) => {
              if (i === journey.length - 1) return null;
              const isLeft = i % 2 === 0;
              const spacing = 100 / (journey.length - 1);
              const midY = (i * spacing) + (spacing / 2);
              return (
                <g key={i} className="text-coffee-300">
                  <circle cx={isLeft ? "28%" : "72%"} cy={`${midY}%`} r="0.8" fill="currentColor" />
                  <circle cx={isLeft ? "72%" : "28%"} cy={`${midY}%`} r="0.8" fill="currentColor" />
                </g>
              );
            })}
          </svg>
        </div>
        
        <div className="space-y-24 relative z-10">
          {journey.map((step, index) => (
            <div 
              key={step.id}
              className={cn(
                "flex items-center w-full",
                index % 2 === 0 ? "justify-start" : "justify-end"
              )}
            >
              <div className={cn(
                "w-full md:w-[45%] relative",
                index % 2 === 0 ? "md:mr-auto" : "md:ml-auto"
              )}>
                <JourneyStepCard 
                  step={step} 
                  isEven={index % 2 === 0} 
                  onClick={() => setSelectedStep(step)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Detail Modal */}
      <AnimatePresence>
        {selectedStep && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 sm:p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={closeDetails}
               className="absolute inset-0 bg-coffee-950/80 backdrop-blur-md"
             />
             <motion.div 
               layout
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ 
                 scale: 1, 
                 opacity: 1, 
                 y: 0,
                 width: isFullScreen ? '100%' : '100%',
                 maxWidth: isFullScreen ? '100%' : '600px',
                 height: isFullScreen ? '100%' : 'auto',
                 maxHeight: isFullScreen ? '100%' : '90vh',
                 borderRadius: isFullScreen ? 0 : '2.5rem'
               }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="bg-white shadow-2xl relative z-10 overflow-y-auto no-scrollbar scroll-smooth flex flex-col"
             >
                {/* Modal Header */}
                <div className={cn(
                  "p-8 sm:p-10 text-white relative shrink-0 transition-colors",
                  selectedStep.status === 'completed' ? "bg-emerald-600" : 
                  selectedStep.status === 'current' ? "bg-amber-600" : "bg-coffee-900"
                )}>
                  <div className="absolute top-6 right-6 flex items-center gap-2">
                    {isAdmin && (
                      <button 
                        onClick={() => handleEditStart(selectedStep)}
                        className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        title="Editar Etapa"
                      >
                        <Edit size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => setIsFullScreen(!isFullScreen)}
                      className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                      title={isFullScreen ? "Sair da tela cheia" : "Tela cheia"}
                    >
                      {isFullScreen ? <ChevronRight className="rotate-90" size={18} /> : <Maximize2 size={18} />}
                    </button>
                    <button 
                      onClick={closeDetails}
                      className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left mt-4 sm:mt-0">
                    <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 overflow-hidden">
                      <GetStepIcon name={selectedStep.icon} size={40} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">
                        {selectedStep.status === 'completed' ? 'Missão Concluída' : selectedStep.status === 'current' ? 'Em Progresso' : 'Bloqueado'}
                      </span>
                      <h3 className="text-3xl sm:text-4xl font-sans font-bold leading-tight">{selectedStep.title}</h3>
                    </div>
                  </div>
                </div>

                {/* Modal Content */}
                <div className={cn(
                  "p-8 sm:p-10 space-y-10 flex-1",
                  isFullScreen ? "max-w-4xl mx-auto w-full" : ""
                )}>
                  {selectedStep.image && (
                    <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-[2rem] overflow-hidden shadow-lg border border-coffee-100">
                      <img 
                        src={selectedStep.image} 
                        alt={selectedStep.title} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-coffee-950/20 to-transparent" />
                    </div>
                  )}

                  {selectedStep.content && (
                    <>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-6 bg-coffee-800 rounded-full" />
                          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-coffee-400">Visão Geral</h4>
                        </div>
                        <p className="text-coffee-700 text-lg sm:text-xl leading-relaxed font-sans">
                          {selectedStep.content.overview}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-6 bg-coffee-800 rounded-full" />
                          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-coffee-400">Lista de Missões</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedStep.content.tasks.map((task, i) => (
                            <div key={i} className="flex items-start gap-4 p-5 rounded-3xl bg-coffee-50 border border-coffee-100/50 hover:bg-white hover:shadow-lg transition-all duration-300">
                              <div className={cn(
                                "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                                selectedStep.status === 'completed' ? "bg-emerald-100 text-emerald-600" : "bg-white border border-coffee-200 text-coffee-300 shadow-sm"
                              )}>
                                {selectedStep.status === 'completed' ? <Check size={14} strokeWidth={3} /> : <span className="text-[10px] font-bold">{i+1}</span>}
                              </div>
                              <span className="text-base font-bold text-coffee-900 leading-snug">{task}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {selectedStep.content.tips && selectedStep.content.tips.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-coffee-800 rounded-full" />
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-coffee-400">Dicas de Especialista</h4>
                          </div>
                          <div className="bg-amber-50/50 rounded-3xl p-6 border border-amber-100">
                            <ul className="space-y-4">
                              {selectedStep.content.tips.map((tip, i) => (
                                <li key={i} className="flex gap-3 text-coffee-700">
                                  <Sparkles size={18} className="text-amber-500 shrink-0" />
                                  <span className="text-base italic">{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {selectedStep.reward && (
                    <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                         <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <Trophy size={32} />
                         </div>
                         <div className="text-center sm:text-left">
                            <p className="text-xs font-black text-amber-800 uppercase tracking-[0.2em] mb-1">Recompensa Exclusiva</p>
                            <p className="text-2xl font-black text-amber-950">{selectedStep.reward}</p>
                         </div>
                      </div>
                      {selectedStep.status === 'completed' ? (
                        <div className="px-6 py-2 bg-emerald-500 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-lg shadow-emerald-500/20">Desbloqueado</div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-300">
                          <Lock size={20} />
                          <span className="text-xs font-bold uppercase tracking-widest">Bloqueado</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-4">
                    <button 
                      onClick={closeDetails}
                      className="w-full bg-coffee-950 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-coffee-900 transition-all shadow-xl hover:shadow-coffee-950/20 active:scale-[0.98]"
                    >
                      Continuar Jornada
                    </button>
                  </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && editingStep && (
          <div className="fixed inset-0 z-[310] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-coffee-950/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-y-auto max-h-[90vh] no-scrollbar"
            >
              <div className="p-8 border-b border-coffee-100 flex items-center justify-between sticky top-0 bg-white z-20">
                <h3 className="text-2xl font-sans font-bold text-coffee-950">{isAddingMode ? 'Adicionar Nova Etapa' : 'Editar Etapa da Jornada'}</h3>
                <div className="flex items-center gap-2">
                  {!isAddingMode && (
                    <button 
                      onClick={handleDelete}
                      className="p-2.5 rounded-full text-rose-500 hover:bg-rose-50 transition-colors"
                      title="Excluir Etapa"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                  <button onClick={() => setIsEditing(false)} className="p-2.5 rounded-full hover:bg-coffee-50 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-8">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-coffee-400">Título da Etapa</label>
                    <input 
                      type="text" 
                      value={editingStep.title} 
                      onChange={(e) => setEditingStep({ ...editingStep, title: e.target.value })}
                      className="w-full bg-coffee-50 border border-coffee-100 rounded-2xl p-4 focus:ring-2 focus:ring-coffee-200 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-coffee-400">Status</label>
                    <select 
                      value={editingStep.status}
                      onChange={(e) => setEditingStep({ ...editingStep, status: e.target.value as any })}
                      className="w-full bg-coffee-50 border border-coffee-100 rounded-2xl p-4 focus:ring-2 focus:ring-coffee-200 outline-none"
                    >
                      <option value="locked">Bloqueado</option>
                      <option value="current">Em Progresso</option>
                      <option value="completed">Concluído</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-coffee-400">Ícone ou URL da Imagem do Ícone</label>
                    <input 
                      type="text" 
                      value={editingStep.icon} 
                      onChange={(e) => setEditingStep({ ...editingStep, icon: e.target.value })}
                      placeholder="Ex: Leaf, Trophy ou https://..."
                      className="w-full bg-coffee-50 border border-coffee-100 rounded-2xl p-4 focus:ring-2 focus:ring-coffee-200 outline-none"
                    />
                    <p className="text-[10px] text-coffee-400">Opções: Seed, Leaf, Droplets, Waves, Sparkles, Trophy, Coffee ou URL de imagem.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-coffee-400">Preview do Ícone</label>
                    <div className="w-16 h-16 rounded-2xl bg-coffee-50 border border-coffee-100 flex items-center justify-center overflow-hidden">
                      <GetStepIcon name={editingStep.icon} size={32} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-coffee-400">Descrição Curta (Card)</label>
                  <textarea 
                    value={editingStep.description} 
                    onChange={(e) => setEditingStep({ ...editingStep, description: e.target.value })}
                    className="w-full bg-coffee-50 border border-coffee-100 rounded-2xl p-4 focus:ring-2 focus:ring-coffee-200 outline-none h-24 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-coffee-400">URL da Imagem</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-300" size={18} />
                    <input 
                      type="text" 
                      placeholder="https://images.unsplash.com/..."
                      value={editingStep.image || ''} 
                      onChange={(e) => setEditingStep({ ...editingStep, image: e.target.value })}
                      className="w-full bg-coffee-50 border border-coffee-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-coffee-200 outline-none"
                    />
                  </div>
                  {editingStep.image && (
                    <div className="mt-2 aspect-video rounded-xl overflow-hidden border border-coffee-100">
                      <img src={editingStep.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-coffee-400">Requisito (ex: Complete 5 receitas)</label>
                    <input 
                      type="text" 
                      value={editingStep.requirements || ''} 
                      onChange={(e) => setEditingStep({ ...editingStep, requirements: e.target.value })}
                      className="w-full bg-coffee-50 border border-coffee-100 rounded-2xl p-4 focus:ring-2 focus:ring-coffee-200 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-coffee-400">Recompensa</label>
                    <input 
                      type="text" 
                      value={editingStep.reward || ''} 
                      onChange={(e) => setEditingStep({ ...editingStep, reward: e.target.value })}
                      className="w-full bg-coffee-50 border border-coffee-100 rounded-2xl p-4 focus:ring-2 focus:ring-coffee-200 outline-none"
                    />
                  </div>
                </div>

                {/* Content Detail */}
                <div className="space-y-6 pt-6 border-t border-coffee-100">
                  <h4 className="text-lg font-bold text-coffee-950">Conteúdo Detalhado</h4>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-coffee-400">Visão Geral Detalhada</label>
                    <textarea 
                      value={editingStep.content?.overview || ''} 
                      onChange={(e) => setEditingStep({ 
                        ...editingStep, 
                        content: { ...editingStep.content!, overview: e.target.value } 
                      })}
                      className="w-full bg-coffee-50 border border-coffee-100 rounded-2xl p-4 focus:ring-2 focus:ring-coffee-200 outline-none h-32 resize-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-coffee-400">Missões</label>
                    <div className="space-y-2">
                      {editingStep.content?.tasks.map((task, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input 
                            type="text" 
                            value={task} 
                            onChange={(e) => {
                              const newTasks = [...editingStep.content!.tasks];
                              newTasks[idx] = e.target.value;
                              setEditingStep({ ...editingStep, content: { ...editingStep.content!, tasks: newTasks } });
                            }}
                            className="flex-1 bg-coffee-50 border border-coffee-100 rounded-xl px-4 py-2"
                          />
                          <button 
                            onClick={() => {
                              const newTasks = editingStep.content!.tasks.filter((_, i) => i !== idx);
                              setEditingStep({ ...editingStep, content: { ...editingStep.content!, tasks: newTasks } });
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                         <input 
                           type="text" 
                           placeholder="Nova missão..." 
                           value={tempTask}
                           onChange={(e) => setTempTask(e.target.value)}
                           className="flex-1 bg-white border border-coffee-100 rounded-xl px-4 py-2"
                         />
                         <button 
                           onClick={() => {
                              if (!tempTask.trim()) return;
                              setEditingStep({ 
                                ...editingStep, 
                                content: { ...editingStep.content!, tasks: [...editingStep.content!.tasks, tempTask] } 
                              });
                              setTempTask('');
                           }}
                           className="p-2 bg-coffee-950 text-white rounded-xl hover:bg-coffee-900 transition-colors"
                         >
                           <Plus size={18} />
                         </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-coffee-400">Dicas Pro</label>
                    <div className="space-y-2">
                      {editingStep.content?.tips?.map((tip, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input 
                            type="text" 
                            value={tip} 
                            onChange={(e) => {
                              const newTips = [...editingStep.content!.tips!];
                              newTips[idx] = e.target.value;
                              setEditingStep({ ...editingStep, content: { ...editingStep.content!, tips: newTips } });
                            }}
                            className="flex-1 bg-coffee-50 border border-coffee-100 rounded-xl px-4 py-2"
                          />
                          <button 
                            onClick={() => {
                              const newTips = editingStep.content!.tips!.filter((_, i) => i !== idx);
                              setEditingStep({ ...editingStep, content: { ...editingStep.content!, tips: newTips } });
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                         <input 
                           type="text" 
                           placeholder="Nova dica..." 
                           value={tempTip}
                           onChange={(e) => setTempTip(e.target.value)}
                           className="flex-1 bg-white border border-coffee-100 rounded-xl px-4 py-2"
                         />
                         <button 
                           onClick={() => {
                              if (!tempTip.trim()) return;
                              const currentTips = editingStep.content?.tips || [];
                              setEditingStep({ 
                                ...editingStep, 
                                content: { ...editingStep.content!, tips: [...currentTips, tempTip] } 
                              });
                              setTempTip('');
                           }}
                           className="p-2 bg-coffee-950 text-white rounded-xl hover:bg-coffee-900 transition-colors"
                         >
                           <Plus size={18} />
                         </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 flex gap-4 sticky bottom-0 bg-white">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-coffee-50 text-coffee-600 py-4 rounded-2xl font-bold hover:bg-coffee-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSavePatch}
                    disabled={isSaving}
                    className="flex-[2] bg-coffee-950 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-coffee-900 disabled:opacity-50 transition-all"
                  >
                    {isSaving ? <Trophy className="animate-bounce" size={20} /> : <Save size={20} />}
                    {isSaving ? 'Salvando...' : isAddingMode ? 'Adicionar Etapa' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function JourneyStepCard({ step, isEven, onClick }: { step: JourneyStep, isEven: boolean, onClick: () => void }) {
  const isCompleted = step.status === 'completed';
  const isCurrent = step.status === 'current';
  const isLocked = step.status === 'locked';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, x: isEven ? -20 : 20 }}
      whileInView={{ opacity: 1, scale: 1, x: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      className={cn(
        "flex items-center gap-5 cursor-pointer group",
        isEven ? "flex-row" : "flex-row-reverse text-right"
      )}
      onClick={onClick}
    >
      {/* Circle Icon */}
      <div className="relative shrink-0 flex items-center justify-center">
        <div className={cn(
          "w-16 h-16 rounded-3xl flex items-center justify-center border-4 shadow-xl transition-all z-10 group-hover:rotate-6 overflow-hidden",
          isCompleted ? "bg-emerald-500 border-white text-white" : 
          isCurrent ? "bg-amber-500 border-white text-white ring-4 ring-amber-100" : 
          "bg-white border-coffee-100 text-coffee-300"
        )}>
          {isLocked ? <Lock size={20} /> : isCompleted ? <Check size={24} strokeWidth={3} /> : <GetStepIcon name={step.icon} size={24} />}
        </div>
        
        {isCurrent && (
          <motion.div 
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-amber-400 rounded-3xl z-0"
          />
        )}
      </div>

      {/* Content */}
      <div className={cn(
        "flex-1 py-4 px-6 rounded-3xl border transition-all shadow-sm group-hover:shadow-lg group-hover:scale-[1.02]",
        isCompleted ? "border-emerald-100 bg-emerald-50/20" : 
        isCurrent ? "border-amber-200 bg-white ring-4 ring-amber-50/50" : 
        "border-coffee-50 bg-white/50 grayscale-[0.5] opacity-80"
      )}>
        <h4 className="text-lg font-black text-coffee-900 group-hover:text-coffee-950 truncate">
          {step.title}
        </h4>
      </div>
    </motion.div>
  );
}

function GetStepIcon({ name, size = 24 }: { name: string, size?: number }) {
  if (name.startsWith('http')) {
    return <img src={name} alt="" className="w-full h-full object-cover" />;
  }

  switch (name) {
    case 'Seed':
    case 'Leaf': return <Leaf size={size} />;
    case 'Droplets': return <Droplets size={size} />;
    case 'Waves': return <Waves size={size} />;
    case 'Sparkles': return <Sparkles size={size} />;
    case 'Trophy': return <Trophy size={size} />;
    case 'Coffee': return <Coffee size={size} />;
    default: return <Zap size={size} />;
  }
}
