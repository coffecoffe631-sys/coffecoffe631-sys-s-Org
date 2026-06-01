
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { JourneyStep } from '../data/journey';
import { Trophy, Check, Lock, Sparkles, Droplets, Waves, Leaf, Coffee, ChevronRight, Zap, X, Maximize2, Edit, Save, Plus, Trash2, Image as ImageIcon, Play, Pause, Volume2, VolumeX, Headphones } from 'lucide-react';
import { cn } from '../lib/utils';

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    // Reset player when source changes
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackRate(1);
    if (audioRef.current) {
      audioRef.current.load();
      audioRef.current.playbackRate = 1;
    }
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => {
        console.error("Audio playback failed:", err);
      });
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
    // Maintain set playback speed on metadata reload
    audioRef.current.playbackRate = playbackRate;
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const value = parseFloat(e.target.value);
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSpeedChange = () => {
    if (!audioRef.current) return;
    const rates = [1, 1.25, 1.5, 1.75, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const nextRate = rates[nextIndex];
    audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  return (
    <div className="p-5 bg-coffee-50 border border-coffee-100/80 rounded-[2rem] space-y-3 w-full shadow-sm">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-coffee-950">
          <div className="w-10 h-10 rounded-2xl bg-coffee-100 flex items-center justify-center text-coffee-800 shrink-0">
            <Headphones size={18} className={cn(isPlaying && "animate-bounce")} />
          </div>
          <div>
            <span className="block text-xs font-black uppercase tracking-wider text-coffee-900">Áudio do Desafio</span>
            <span className="block text-[10px] text-coffee-500 font-semibold">{isPlaying ? "Tocando material..." : "Clique para ouvir o áudio"}</span>
          </div>
        </div>
        
        {isPlaying && (
          <div className="flex items-end gap-0.5 h-4 px-1 shrink-0">
            <span className="w-0.5 bg-coffee-900 rounded-full animate-pulse h-3" />
            <span className="w-0.5 bg-coffee-900 rounded-full animate-bounce h-4" />
            <span className="w-0.5 bg-coffee-900 rounded-full animate-pulse h-2" />
            <span className="w-0.5 bg-coffee-900 rounded-full animate-bounce h-3" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 pt-1">
        {/* Play Button */}
        <button
          onClick={togglePlay}
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-coffee-950 text-white hover:bg-coffee-900 transition-all shadow-md shrink-0 active:scale-95"
        >
          {isPlaying ? <Pause size={20} className="fill-white" /> : <Play size={20} className="fill-white translate-x-0.5" />}
        </button>

        {/* Progress Slider */}
        <div className="flex-1 space-y-1 select-none">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSliderChange}
            className="w-full accent-coffee-950 h-1.5 bg-coffee-200/60 rounded-lg cursor-pointer outline-none"
          />
          <div className="flex justify-between text-[10px] font-mono text-coffee-500 font-bold">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Speed Option */}
        <button
          onClick={handleSpeedChange}
          className="px-2.5 py-1.5 text-xs font-black text-coffee-800 bg-coffee-100 hover:bg-coffee-200/80 rounded-xl transition-all shrink-0 font-mono active:scale-95"
          title="Alterar velocidade de reprodução"
        >
          {playbackRate.toFixed(2).replace('.00', '')}x
        </button>

        {/* Mute Button */}
        <button
          onClick={toggleMute}
          className="p-2.5 text-coffee-600 hover:bg-coffee-100 rounded-xl transition-colors shrink-0"
          title={isMuted ? "Ativar som" : "Desativar som"}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </div>
  );
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
    } else if (line.startsWith('###')) {
      flushGroup();
      const headerText = line.replace(/^###\s*/, '').trim();
      elements.push(
        <h4 key={`header-${keyIdx++}`} className="text-base sm:text-lg font-black text-coffee-950 uppercase tracking-[0.15em] mt-6 first:mt-2 mb-3">
          {headerText}
        </h4>
      );
    } else {
      const isQuoted = (line.startsWith('"') && line.endsWith('"')) || (line.startsWith('“') && line.endsWith('”'));
      const textContent = isQuoted ? line.slice(1, -1) : line;

      if (isQuoted) {
        currentGroup.push(
          <p key={`para-${keyIdx++}`} className="text-coffee-600 text-sm sm:text-base leading-relaxed font-sans italic border-l-4 border-amber-500 pl-4 py-1 bg-amber-50/30 rounded-r-2xl my-2">
            “{textContent}”
          </p>
        );
      } else {
        currentGroup.push(
          <p key={`para-${keyIdx++}`} className="text-coffee-800 text-sm sm:text-base leading-relaxed font-sans font-medium text-justify">
            {line}
          </p>
        );
      }
    }
  }

  flushGroup();

  return <div className="space-y-4">{elements}</div>;
}

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
          <div className="fixed inset-0 z-[300] bg-white flex flex-col overflow-hidden select-text">
            {/* Header Barra Superior Imersiva */}
            <div className="w-full bg-white border-b border-coffee-100/80 sticky top-0 z-30 shrink-0 select-none">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
                <button 
                  onClick={closeDetails}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-coffee-50 text-coffee-800 font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-coffee-100 transition-all select-none active:scale-95"
                >
                  <ChevronRight size={16} className="rotate-180" />
                  <span>Voltar</span>
                </button>

                <div className="hidden sm:block text-center max-w-xs truncate">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-900 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                    {selectedStep.requirements || "Jornada do Café"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button 
                      onClick={() => handleEditStart(selectedStep)}
                      className="p-2 sm:px-4 sm:py-2 rounded-xl text-coffee-800 bg-coffee-100 hover:bg-coffee-200 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
                      title="Editar Etapa"
                    >
                      <Edit size={14} />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                  )}
                  <button 
                    onClick={closeDetails}
                    className="p-2.5 rounded-xl bg-coffee-50 hover:bg-coffee-100 text-coffee-800 transition-all shadow-sm flex items-center justify-center active:scale-95"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={closeDetails}
               className="absolute hidden"
             />
             <motion.div 
               layout
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ 
                 scale: 1, 
                 opacity: 1, 
                 y: 0,
                 width: '100%',
                 maxWidth: '100%',
                 borderRadius: '0px'
               }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="bg-white relative z-10 h-full flex flex-col border-none w-full"
             >
                {/* Unified Scrollable Container wrapping both Banner and Content */}
                <div className="flex-1 overflow-y-auto min-h-0 bg-white/50 no-scrollbar relative z-10 selection:bg-amber-100 selection:text-amber-950 pb-24">
                  
                  {/* Image Section */}
                  <div className="max-w-3xl mx-auto px-6 py-8 sm:py-12 space-y-10 w-full">
                    {/* Banner com alta resolução responsivo */}
                    <div className="w-full aspect-[16/9] sm:aspect-[21/9] relative rounded-[2rem] overflow-hidden bg-coffee-50 border-4 sm:border-8 border-white shadow-xl mx-auto shrink-0 select-none">
                    <img 
                      src={selectedStep.image || 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?q=80&w=1000'} 
                      alt={selectedStep.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/35" />
                    
                    {/* Floating Action Buttons */}
                    <div className="hidden">
                      {isAdmin && (
                        <button 
                          onClick={() => handleEditStart(selectedStep)}
                          className="p-2.5 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-md text-white transition-all shadow-sm"
                          title="Editar Etapa"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      <button 
                        onClick={closeDetails}
                        className="p-2.5 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-md text-white transition-all shadow-sm"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    
                    {/* Bottom Image Subtitle status tag */}
                    <div className="absolute bottom-6 left-6">
                      <span className={cn(
                        "px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] text-white shadow-md backdrop-blur-md border",
                        selectedStep.status === 'completed' ? "bg-emerald-500/80 border-emerald-400/20" : 
                        selectedStep.status === 'current' ? "bg-amber-500/80 border-amber-400/20" : 
                        "bg-coffee-950/85 border-white/20"
                      )}>
                        {selectedStep.status === 'completed' ? 'Concluída' : selectedStep.status === 'current' ? 'Em Progresso' : 'Bloqueada'}
                      </span>
                    </div>
                  </div>
  
                  {/* Modal Content - Text, Title, Subtitle & Description */}
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <h3 className="text-3xl sm:text-4xl md:text-5xl font-sans font-black text-coffee-950 tracking-tight leading-tight">
                        {selectedStep.title}
                      </h3>
                      
                      {/* Subtitle - placed properly below the Title with beautiful visual separation */}
                      <div className="pt-1 select-none">
                        <span className="inline-block px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 uppercase tracking-widest shadow-sm">
                          {selectedStep.requirements || 'Aprendizado • Jornada do Café'}
                        </span>
                      </div>
                    </div>
  
                    {/* Separator Line */}
                    <div className="h-px bg-coffee-100/60 w-full" />

                    {/* Audio Player, if available */}
                    {selectedStep.audioUrl && (
                      <div className="w-full">
                        <AudioPlayer src={selectedStep.audioUrl} />
                      </div>
                    )}
  
                    {/* Description formatted dynamically with markdown separations */}
                    <div className="prose prose-coffee max-w-none text-coffee-900 leading-relaxed space-y-6 text-base sm:text-lg">
                      {renderFormattedContent(selectedStep.description)}
                      
                      {selectedStep.content?.overview && selectedStep.content.overview !== selectedStep.description && (
                        <div className="mt-8 pt-6 border-t border-coffee-100/60 font-sans">
                          <h4 className="text-base sm:text-lg font-black text-coffee-950 uppercase tracking-[0.15em] mb-4">Visão Geral Detalhada</h4>
                          {renderFormattedContent(selectedStep.content.overview)}
                        </div>
                      )}
                    </div>

                    {/* Checklist dos desafios práticos */}
                    {selectedStep.content?.tasks && selectedStep.content.tasks.length > 0 && (
                      <div className="mt-8 p-6 sm:p-8 bg-coffee-50/50 border border-coffee-100 rounded-3xl space-y-4 font-sans select-none font-semibold">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-coffee-900 flex items-center gap-1.5">
                          <Check className="text-coffee-600 stroke-[3]" size={14} />
                          Lista de Desafios Práticos
                        </h4>
                        <div className="space-y-3">
                          {selectedStep.content.tasks.map((task, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-coffee-100 rounded-xl">
                              <div className="mt-0.5 w-5 h-5 rounded-md bg-coffee-50 border border-coffee-150 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-coffee-400 font-mono">{idx + 1}</span>
                              </div>
                              <span className="text-sm font-semibold text-coffee-800 leading-snug">{task}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dicas adicionais do barista */}
                    {selectedStep.content?.tips && selectedStep.content.tips.length > 0 && (
                      <div className="mt-6 p-6 sm:p-8 bg-amber-50/50 border border-amber-100 rounded-3xl space-y-4 font-sans select-none font-semibold">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-amber-900 flex items-center gap-1.5">
                          <Sparkles className="text-amber-500" size={14} />
                          Dicas Técnicas Importantes
                        </h4>
                        <ul className="space-y-3">
                          {selectedStep.content.tips.map((tip, idx) => (
                            <li key={idx} className="text-sm font-semibold text-amber-950 list-none flex items-start gap-2.5">
                              <span className="text-amber-500 mt-1 select-none">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Botão de Conclusão e Saída */}
                  <div className="pt-8 flex justify-center selection:bg-transparent">
                    <button 
                      onClick={closeDetails}
                      className="w-full max-w-sm bg-coffee-950 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-coffee-900 transition-all shadow-lg hover:shadow-coffee-950/10 active:scale-[0.98] text-xs"
                    >
                      Concluir Desafio
                    </button>
                  </div>

                </div> {/* Fechamento do max-w-3xl */}
              </div> {/* Fechamento do flex-1 com scroll */}
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

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-coffee-400">Link do Áudio (Ouvir ao invés de ler - opcional)</label>
                  <div className="relative">
                    <Headphones className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400 pointer-events-none" size={18} />
                    <input 
                      type="text" 
                      placeholder="Ex: https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
                      value={editingStep.audioUrl || ''} 
                      onChange={(e) => setEditingStep({ ...editingStep, audioUrl: e.target.value })}
                      className="w-full bg-coffee-50 border border-coffee-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-coffee-200 outline-none text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-coffee-400">Insira um link direto de áudio (MP3, WAV, etc.) para que os usuários possam reproduzir o conteúdo diretamente na tela do desafio.</p>
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
