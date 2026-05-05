
export interface JourneyStep {
  id: string;
  title: string;
  description: string;
  status: 'locked' | 'current' | 'completed';
  icon: string;
  image?: string;
  requirements?: string;
  reward?: string;
  content?: {
    overview: string;
    tasks: string[];
    tips?: string[];
  };
}

export const coffeeJourney: JourneyStep[] = [
  {
    id: '1',
    title: 'O Despertar do Grão',
    description: 'Sua jornada começa aqui. Aprenda sobre a origem dos grãos e como escolher o café perfeito para seu paladar.',
    status: 'completed',
    icon: 'Leaf',
    image: 'https://images.unsplash.com/photo-1495474472251-094c1f60f64c?w=1200&auto=format&fit=crop&q=80',
    reward: 'Badge: Entusiasta Iniciante',
    content: {
      overview: 'O café não é apenas uma bebida; é uma fruta com complexidade sensorial comparável ao vinho. Entender a diferença entre Arábica e Robusta é o seu primeiro passo para se tornar um mestre.',
      tasks: ['Encontrar a origem do grão no pacote', 'Experimentar um café moído na hora', 'Identificar notas frutadas ou achocolatadas'],
      tips: ['Grãos 100% Arábica costumam ser mais suaves e aromáticos.', 'Moer na hora preserva óleos essenciais voláteis.']
    }
  },
  {
    id: '2',
    title: 'Mestre da Extração',
    description: 'Domine a arte do equilíbrio. Aprenda como a temperatura da água e o tempo de infusão mudam tudo.',
    status: 'current',
    icon: 'Droplets',
    image: 'https://images.unsplash.com/photo-1459756263433-2c026e4a5541?w=1200&auto=format&fit=crop&q=80',
    requirements: 'Acesse o app por 3 dias seguidos',
    reward: 'Novo Método: Prensa Francesa',
    content: {
      overview: 'A extração é o processo de dissolver os sabores do café na água. O segredo está no equilíbrio entre acidez, doçura e amargor.',
      tasks: ['Cronometrar sua extração', 'Pesar a água e o café (Ratio)', 'Testar águas em diferentes temperaturas'],
      tips: ['Água fervendo pode queimar o café. O ideal é entre 92°C e 96°C.', 'Se o café estiver muito amargo, tente uma moagem mais grossa.']
    }
  },
  {
    id: '3',
    title: 'Alquimia do Leite',
    description: 'Crie texturas sedosas e aprenda os segredos do Latte Art básico para impressionar.',
    status: 'locked',
    icon: 'Waves',
    image: 'https://images.unsplash.com/photo-1514432324607-a07d9f4a708a?w=1200&auto=format&fit=crop&q=80',
    reward: 'Guia: Latte Art em Casa',
    content: {
      overview: 'Vaporizar leite é uma ciência. A microespuma perfeita requer controle de ar e temperatura.',
      tasks: ['Criar microespuma estável', 'Fazer um Cappuccino clássico', 'Tentar o desenho de um coração'],
      tips: ['Leite gelado facilita o controle da vaporização.', 'Bata e gire a leiteira para remover bolhas grandes.']
    }
  },
  {
    id: '4',
    title: 'Sentidos Apurados',
    description: 'Desenvolva seu paladar. Explore notas sensoriais complexas e aprenda a distinguir regiões.',
    status: 'locked',
    icon: 'Sparkles',
    image: 'https://images.unsplash.com/photo-1444418185997-1145ea024a50?w=1200&auto=format&fit=crop&q=80',
    reward: 'Badge: Sommelier de Café',
    content: {
      overview: 'A degustação técnica (cupping) permite avaliar a qualidade do café sem a influência do método de preparo.',
      tasks: ['Sentir o aroma do pó seco', 'Identificar corpo e acidez', 'Comparar dois cafés de origens diferentes'],
      tips: ['Limpe seu paladar com água entre os xícaras.', 'Tente descrever os sabores sem ler o rótulo antes.']
    }
  },
  {
    id: '5',
    title: 'Lenda do Balcão',
    description: 'O nível máximo. Você agora entende toda a cadeia do café, do grão à xícara final.',
    status: 'locked',
    icon: 'Trophy',
    image: 'https://images.unsplash.com/photo-1559056191-7440379207e9?w=1200&auto=format&fit=crop&q=80',
    reward: 'Certificado de Conclusão',
    content: {
      overview: 'Você atingiu o topo. O conhecimento agora deve ser compartilhado.',
      tasks: ['Criar sua própria receita autoral', 'Ensinar alguém a fazer um bom café', 'Visitar uma fazenda de café'],
      tips: ['O melhor café é aquele que você gosta, mas as regras ajudam a encontrar novos favoritos.']
    }
  }
];
