export interface Ingredient {
  name: string;
  amount: string;
}

export interface Step {
  title: string;
  description: string;
  image?: string;
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
  category: 'Espresso' | 'Latte' | 'Cappuccino' | 'Cold Brew' | 'Specialty' | 'Pães & Salgados' | 'Bolos' | 'Biscoitos & Doces';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  prepTime: string;
}

export const recipes: Recipe[] = [];

export const defaultAccompaniments: Recipe[] = [
  {
    id: "def-acc-1",
    name: "Pão de Queijo Mineiro Tradicional",
    country: "Brasil",
    description: "O parceiro definitivo do café coado brasileiro. Crocante por fora, incrivelmente queijudo e macio por dentro. Feito tradicionalmente com polvilho doce, azedo e queijo canastra curado de verdade.",
    image: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?q=80&w=1000&auto=format&fit=crop",
    ingredients: ["Polvilho doce", "Polvilho azedo", "Queijo canastra curado ralado", "Queijo parmesão ralado", "Leite integral", "Manteiga sem sal", "Ovos caipira", "Pitada de sal"],
    equipment: ["Forno", "Batedeira", "Ralo"],
    detailedIngredients: [
      { name: "Polvilho doce", amount: "250g" },
      { name: "Polvilho azedo", amount: "250g" },
      { name: "Queijo canastra ralado", amount: "200g" },
      { name: "Queijo parmesão ralado", amount: "100g" },
      { name: "Leite integral", amount: "200ml" },
      { name: "Manteiga sem sal", amount: "80g" },
      { name: "Ovos caipira", amount: "2 ou 3 un" },
      { name: "Sal", amount: "1 colher de chá" }
    ],
    steps: [
      {
        title: "Escaldar o Polvilho",
        description: "Misture os dois polvilhos em uma bacia grande. Ferva o leite junto com a manteiga e o sal. Despeje o líquido fervendo sobre os polvilhos de uma só vez, mexendo vigorosamente com uma colher de pau até formar uma massa empelotada. Deixe esfriar por 10 minutos."
      },
      {
        title: "Adicionar os Ovos",
        description: "Com a massa morna quase fria, adicione os ovos um a um, sovando bem com as mãos limpas após cada adição até que a massa incorpore totalmente os ovos e mude de textura."
      },
      {
        title: "Incorporar os Queijos",
        description: "Adicione os queijos Canastra e Parmesão ralados. Sove energeticamante por mais alguns minutos até que a massa fique homogênea, lisa e ligeiramente grudenta (mas moldável com as mãos untadas)."
      },
      {
        title: "Modelar e Assar",
        description: "Unte as mãos com um pouco de óleo de coco ou manteiga. Modele bolinhas de aproximadamente 40g e disponha em uma assadeira mantendo espaço entre elas. Asse em forno pré-aquecido a 200°C por cerca de 25-30 minutos, até que estejam estufados e com pintinhas douradas."
      }
    ],
    weatherSuitability: ["neutral", "cold", "rainy"],
    category: "Pães & Salgados",
    difficulty: "Easy",
    prepTime: "30 min"
  },
  {
    id: "def-acc-2",
    name: "Cookies Caseiros de Café e Chocolate Belga",
    country: "EUA / Brasil",
    description: "Biscoitos amanteigados com bordas crocantes, centro incrivelmente macio e mastigável (chewy). O segredo premium é a adição de pó de café espresso moído ultrafino na massa de açúcar mascavo e generosas gotas de chocolate meio amargo.",
    image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=1000&auto=format&fit=crop",
    ingredients: ["Farinha de trigo", "Manteiga sem sal (ponto pomada)", "Açúcar mascavo", "Açúcar refinado", "Ovo caipira", "Café espresso moído bem fino", "Gotas de chocolate meio amargo 50%", "Bicarbonato de sódio", "Essência de baunilha", "Flor de sal"],
    equipment: ["Assadeira", "Batedeira ou Fouet", "Papel manteiga"],
    detailedIngredients: [
      { name: "Farinha de trigo", amount: "220g" },
      { name: "Manteiga sem sal", amount: "120g" },
      { name: "Açúcar mascavo", amount: "100g" },
      { name: "Açúcar refinado", amount: "70g" },
      { name: "Ovo caipira", amount: "1 un" },
      { name: "Café moído ultrafino", amount: "1 colher de sopa" },
      { name: "Chocolate meio amargo em gotas", amount: "180g" },
      { name: "Bicarbonato de sódio", amount: "1/2 colher de chá" },
      { name: "Essência de baunilha", amount: "1 colher de chá" },
      { name: "Flor de sal", amount: "Para finalizar" }
    ],
    steps: [
      {
        title: "Creme Amanteigado",
        description: "Em uma tigela grande, bata a manteiga em ponto de pomada com o açúcar mascavo, o açúcar refinado e a essência de baunilha até obter um creme leve e fofo."
      },
      {
        title: "Unir Secos e Aromas",
        description: "Adicione o ovo e bata bem. Peneire a farinha de trigo, o pó de café espresso fino e o bicarbonato por cima. Misture suavemente com uma espátula até formar um composto integrado (não sobrecarregue a massa)."
      },
      {
        title: "Gotas de Chocolate",
        description: "Incorpore as gotas de chocolate à massa de cookie. Envolva levemente. Cubra a tigela com filme plástico e leve à geladeira por no mínimo 1 hora (isso desenvolve o sabor do café e evita que se espalhem demais)."
      },
      {
        title: "Forno e Flor de Sal",
        description: "Com uma colher de sorvete, forme bolas médias de massa e posicione em uma assadeira forrada com papel manteiga, deixando 5cm de espaço. Asse a 180°C por 12-14 minutos. O centro deve estar macio. Polvilhe imediatamente raspas de flor de sal."
      }
    ],
    weatherSuitability: ["neutral", "cold", "hot"],
    category: "Biscoitos & Doces",
    difficulty: "Easy",
    prepTime: "20 min"
  },
  {
    id: "def-acc-3",
    name: "Bolo de Fubá Cremoso com Toque de Erva-Doce",
    country: "Brasil",
    description: "Um clássico supremo das tardes de Minas. Uma fatia quentinha desse bolo super úmido e cremoso por dentro, combinada com um café coado na hora ou um espresso encorpado, redefine a definição de afeto.",
    image: "https://images.unsplash.com/photo-1605697040924-85229074708c?q=80&w=1000&auto=format&fit=crop",
    ingredients: ["Leite integral", "Açúcar refinado", "Fubá fino (mimosa)", "Queijo parmesão ralado", "Manteiga sem sal", "Ovos caipira", "Farinha de trigo", "Sementes de erva-doce", "Fermento químico em pó"],
    equipment: ["Liquidificador", "Forma com furo central", "Peneira"],
    detailedIngredients: [
      { name: "Leite integral", amount: "1 Litro" },
      { name: "Açúcar refinado", amount: "2 xícaras" },
      { name: "Fubá mimoso", amount: "1 xícara" },
      { name: "Farinha de trigo", amount: "3 colheres de sopa" },
      { name: "Ovos caipira", amount: "4 un" },
      { name: "Manteiga", amount: "2 colheres de sopa" },
      { name: "Queijo parmesão ralado", amount: "100g" },
      { name: "Sementes de erva-doce", amount: "1 colher de chá" },
      { name: "Fermento químico", amount: "1 colher de sopa" }
    ],
    steps: [
      {
        title: "Bater a Massa Líquida",
        description: "No liquidificador, coloque os ovos, a manteiga, o leite integral e o açúcar. Bata por 2 minutos até que fique completamente misturado e aerado."
      },
      {
        title: "Adicionar Fubá e Queijo",
        description: "Acrescente o fubá, a farinha de trigo e o queijo parmesão. Bata novamente em velocidade média por apenas 1 minuto até ficar homogênee. A massa fica muito líquida, parecendo uma sopa - acalme-se, isso é o que garante a cremosidade!"
      },
      {
        title: "Erva-Doce e Fermento",
        description: "Adicione o fermento químico em pó e as sementes de erva-doce frescas. Use a função 'Pulsar' por 3 segundos apenas para espalhar os grãos aromáticos sem triturá-los."
      },
      {
        title: "Assar até Dourar",
        description: "Despeje a massa líquida em uma forma untada com bastante manteiga e polvilhada com fubá ou farinha. Asse em forno pré-aquecido a 180°C por aproximadamente 50 minutos. O topo deve estar dourado, mas o bolo ainda deve balançar ligeiramente como gelatina."
      }
    ],
    weatherSuitability: ["neutral", "cold", "rainy"],
    category: "Bolos",
    difficulty: "Medium",
    prepTime: "60 min"
  }
];
