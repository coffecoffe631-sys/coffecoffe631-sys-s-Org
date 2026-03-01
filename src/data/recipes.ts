export interface Ingredient {
  name: string;
  amount: string;
}

export interface Step {
  title: string;
  description: string;
}

export type WeatherCondition = 'hot' | 'cold' | 'neutral' | 'rainy';

export interface Recipe {
  id: string;
  name: string;
  country: string;
  description: string;
  image: string;
  ingredients: string[];
  equipment: string[];
  detailedIngredients: Ingredient[];
  steps: Step[];
  weatherSuitability: WeatherCondition[];
  category: 'Espresso' | 'Latte' | 'Cappuccino' | 'Cold Brew' | 'Specialty';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  prepTime: string;
}

export const recipes: Recipe[] = [
  {
    id: '1',
    name: 'Pão de Queijo Latte',
    country: 'Brasil',
    description: 'Um latte cremoso com um toque sutil de queijo canastra e mel, inspirado no café da manhã mineiro.',
    image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=1000&auto=format&fit=crop',
    ingredients: ['Café Espresso', 'Leite Vaporizado', 'Mel', 'Queijo Canastra Ralado'],
    equipment: ['Máquina de Espresso', 'Vaporizador de Leite'],
    detailedIngredients: [
      { name: 'Café Espresso', amount: '40ml' },
      { name: 'Leite Integral', amount: '150ml' },
      { name: 'Mel de Flores Silvestres', amount: '1 colher de chá' },
      { name: 'Queijo Canastra Ralado Fino', amount: '1 pitada' }
    ],
    steps: [
      { title: 'Base', description: 'Prepare um espresso duplo em uma xícara grande.' },
      { title: 'Adoçar', description: 'Misture o mel no espresso ainda quente até dissolver.' },
      { title: 'Texturizar', description: 'Vaporize o leite até obter uma espuma sedosa.' },
      { title: 'Finalizar', description: 'Despeje o leite sobre o café e finalize com uma pitada de queijo canastra ralado por cima.' }
    ],
    weatherSuitability: ['cold', 'neutral'],
    category: 'Latte',
    difficulty: 'Medium',
    prepTime: '5 min'
  },
  {
    id: '2',
    name: 'Cold Brew de Rapadura',
    country: 'Brasil',
    description: 'Café extraído a frio por 18 horas, adoçado com rapadura derretida e um toque de limão cravo.',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?q=80&w=1000&auto=format&fit=crop',
    ingredients: ['Café Moagem Grossa', 'Água Gelada', 'Rapadura', 'Limão Cravo'],
    equipment: ['Pote de Vidro', 'Filtro de Papel'],
    detailedIngredients: [
      { name: 'Café Moagem Grossa', amount: '50g' },
      { name: 'Água Filtrada Gelada', amount: '500ml' },
      { name: 'Xarope de Rapadura', amount: '30ml' },
      { name: 'Rodela de Limão Cravo', amount: '1 unidade' }
    ],
    steps: [
      { title: 'Infusão', description: 'Misture o café e a água no pote e deixe na geladeira por 18 horas.' },
      { title: 'Filtragem', description: 'Filtre o café usando um filtro de papel ou prensa francesa.' },
      { title: 'Xarope', description: 'Derreta a rapadura com um pouco de água quente para criar um xarope.' },
      { title: 'Servir', description: 'Sirva com gelo, adicione o xarope e decore com o limão cravo.' }
    ],
    weatherSuitability: ['hot'],
    category: 'Cold Brew',
    difficulty: 'Easy',
    prepTime: '18h'
  },
  {
    id: '3',
    name: 'Espresso Mineiro',
    country: 'Brasil',
    description: 'Um espresso clássico servido com uma pequena fatia de doce de leite na borda da xícara.',
    image: 'https://images.unsplash.com/photo-1510707577719-5d68704a8d07?q=80&w=1000&auto=format&fit=crop',
    ingredients: ['Café Grão Especial', 'Doce de Leite Viçosa'],
    equipment: ['Máquina de Espresso'],
    detailedIngredients: [
      { name: 'Café Grão Especial (Torra Média)', amount: '18g' },
      { name: 'Doce de Leite Viçosa', amount: '1 colher de café' }
    ],
    steps: [
      { title: 'Preparar', description: 'Passe o doce de leite na borda interna da xícara de espresso.' },
      { title: 'Extrair', description: 'Extraia o espresso diretamente na xícara preparada.' },
      { title: 'Degustar', description: 'Beba o café permitindo que o doce de leite se misture gradualmente.' }
    ],
    weatherSuitability: ['cold', 'neutral', 'rainy'],
    category: 'Espresso',
    difficulty: 'Easy',
    prepTime: '2 min'
  },
  {
    id: '4',
    name: 'Cappuccino de Avelã e Cacau',
    country: 'Brasil',
    description: 'Equilíbrio perfeito entre o amargor do cacau mineiro e a doçura da avelã.',
    image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=1000&auto=format&fit=crop',
    ingredients: ['Espresso', 'Leite', 'Cacau em Pó', 'Xarope de Avelã'],
    equipment: ['Máquina de Espresso', 'Vaporizador'],
    detailedIngredients: [
      { name: 'Espresso', amount: '30ml' },
      { name: 'Leite Vaporizado', amount: '120ml' },
      { name: 'Cacau em Pó 70%', amount: '1 colher de chá' },
      { name: 'Xarope de Avelã', amount: '10ml' }
    ],
    steps: [
      { title: 'Base', description: 'Misture o xarope de avelã e o cacau no fundo da xícara.' },
      { title: 'Café', description: 'Extraia o espresso por cima da mistura.' },
      { title: 'Leite', description: 'Vaporize o leite e despeje criando uma camada espessa de espuma.' }
    ],
    weatherSuitability: ['cold', 'rainy'],
    category: 'Cappuccino',
    difficulty: 'Medium',
    prepTime: '4 min'
  },
  {
    id: '5',
    name: 'Affogato de Milho Verde',
    country: 'Brasil',
    description: 'Uma sobremesa ousada unindo o sorvete de milho verde artesanal com um espresso intenso.',
    image: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?q=80&w=1000&auto=format&fit=crop',
    ingredients: ['Espresso', 'Sorvete de Milho Verde', 'Canela'],
    equipment: ['Máquina de Espresso'],
    detailedIngredients: [
      { name: 'Espresso Quente', amount: '40ml' },
      { name: 'Sorvete de Milho Verde', amount: '1 bola grande' },
      { name: 'Canela em Pó', amount: 'a gosto' }
    ],
    steps: [
      { title: 'Montagem', description: 'Coloque a bola de sorvete em uma taça de vidro.' },
      { title: 'Contraste', description: 'Extraia o espresso e despeje imediatamente sobre o sorvete.' },
      { title: 'Toque Final', description: 'Polvilhe canela por cima e sirva com uma colher.' }
    ],
    weatherSuitability: ['hot', 'neutral'],
    category: 'Specialty',
    difficulty: 'Easy',
    prepTime: '3 min'
  }
];
