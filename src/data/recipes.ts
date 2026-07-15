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

export const recipes: Recipe[] = [
  {
    id: "core-1",
    name: "Espresso Mineiro",
    country: "Brasil",
    description: "Um espresso duplo clássico extraído sobre uma camada de doce de leite artesanal viçoso e finalizado com raspas frescas de queijo canastra curado. O verdadeiro abraço mineiro em formato de xícara.",
    image: "https://images.unsplash.com/photo-1510972527921-ce04158916a2?q=80&w=1000&auto=format&fit=crop",
    ingredients: ["Café especial moído fino", "Doce de leite artesanal", "Queijo canastra curado ralado bem fino"],
    equipment: ["Máquina de espresso", "Xícara de cerâmica", "Ralo fino (microplane)"],
    detailedIngredients: [
      { name: "Café especial (torra média)", amount: "18g" },
      { name: "Doce de leite artesanal", amount: "30g" },
      { name: "Queijo canastra curado", amount: "5g" }
    ],
    steps: [
      {
        title: "Preparar a Base",
        description: "No fundo de uma xícara de espresso pré-aquecida, adicione uma colher de sopa generosa (30g) de doce de leite artesanal mineiro de boa qualidade."
      },
      {
        title: "Extrair o Espresso",
        description: "Moa 18g de café especial na granulometria para espresso. Faça a distribuição e compactação no porta-filtro duplo. Extraia um espresso duplo (aproximadamente 40g a 50g de bebida líquido) diretamente sobre a camada de doce de leite."
      },
      {
        title: "Finalizar com Queijo",
        description: "Rale raspas finíssimas de queijo canastra curado por cima do espresso quente. O calor do café vai derreter levemente o queijo, criando um aroma incrível. Sirva imediatamente e oriente a misturar bem antes de beber."
      }
    ],
    weatherSuitability: ["cold", "neutral", "rainy"],
    category: "Espresso",
    difficulty: "Medium",
    prepTime: "5 min"
  },
  {
    id: "core-2",
    name: "Cold Brew de Rapadura",
    country: "Brasil",
    description: "Café especial extraído a frio lentamente por 18 horas, adocicado com calda de rapadura artesanal e finalizado com um toque cítrico de fatias de limão siciliano. Uma bebida extremamente refrescante, complexa e revigorante.",
    image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?q=80&w=1000&auto=format&fit=crop",
    ingredients: ["Café especial moagem grossa", "Água filtrada fria", "Rapadura artesanal", "Limão siciliano", "Gelo cristalino"],
    equipment: ["Pote de infusão fria ou Toddy", "Filtro de papel ou pano", "Faca ou descascador"],
    detailedIngredients: [
      { name: "Café especial (moagem bem grossa)", amount: "80g" },
      { name: "Água fria", amount: "800ml" },
      { name: "Rapadura ralada", amount: "50g" },
      { name: "Limão siciliano", amount: "2 fatias" },
      { name: "Gelo", amount: "A gosto" }
    ],
    steps: [
      {
        title: "Infusão a Frio",
        description: "Em um pote de vidro hermético, misture o café moído grosso com a água fria. Mexa delicadamente para umedecer todo o pó. Tampe e deixe infusionar na geladeira por 16 a 18 horas."
      },
      {
        title: "Filtragem",
        description: "Após o tempo de infusão, filtre o café passando primeiro por uma peneira fina e depois por um filtro de papel ou coador de pano limpo para obter uma bebida límpida e brilhante."
      },
      {
        title: "Calda de Rapadura",
        description: "Ferva a rapadura ralada com 50ml de água até dissolver completamente e criar um xarope leve. Deixe esfriar."
      },
      {
        title: "Montagem do Copo",
        description: "Em um copo alto, coloque bastante gelo, adicione 15ml da calda de rapadura fria, despeje 150ml do cold brew filtrado e finalize com fatias de limão siciliano ligeiramente espremidas."
      }
    ],
    weatherSuitability: ["hot", "neutral"],
    category: "Cold Brew",
    difficulty: "Easy",
    prepTime: "18h"
  },
  {
    id: "core-3",
    name: "Cappuccino de Avelã e Cacau",
    country: "Itália",
    description: "Espresso encorpado combinado com leite integral vaporizado em textura de microespuma sedosa, calda artesanal de avelã cremosa e uma generosa polvilhada de cacau 100% puro brasileiro.",
    image: "https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=1000&auto=format&fit=crop",
    ingredients: ["Café especial moído fino", "Leite integral bem gelado", "Pasta artesanal ou calda de avelã", "Cacau em pó 100%"],
    equipment: ["Máquina de espresso com bico vaporizador", "Leiteira de inox (pitcher)", "Polvilhador de cacau"],
    detailedIngredients: [
      { name: "Café especial", amount: "18g" },
      { name: "Leite integral gelado", amount: "150ml" },
      { name: "Calda de avelã premium", amount: "20g" },
      { name: "Cacau em pó", amount: "A gosto" }
    ],
    steps: [
      {
        title: "Saborizar a xícara",
        description: "Espalhe a calda de avelã nas laterais internas e no fundo de uma xícara de cappuccino de 180ml pré-aquecida."
      },
      {
        title: "Extrair o café",
        description: "Extraia um shot de espresso duplo (35g-40g de café líquido concentrado) diretamente na xícara saborizada com avelã."
      },
      {
        title: "Vaporizar o leite",
        description: "Coloque o leite integral bem gelado na pitcher de inox. Introduza o bico de vapor da máquina logo abaixo da superfície do leite, criando um turbilhão suave por cerca de 10-15 segundos, até que o leite chegue a 60°C-65°C e tenha uma microespuma brilhante e sem bolhas visíveis."
      },
      {
        title: "Montar e Decorar",
        description: "Despeje o leite vaporizado delicadamente sobre o espresso com avelã, integrando os líquidos e criando um contraste de cores. Finalize polvilhando cacau 100% por cima do creme sedoso."
      }
    ],
    weatherSuitability: ["cold", "neutral", "rainy"],
    category: "Cappuccino",
    difficulty: "Medium",
    prepTime: "5 min"
  },
  {
    id: "core-4",
    name: "Pão de Queijo Latte",
    country: "Brasil",
    description: "Uma bebida conceitual surpreendente e rica. Trata-se de um Latte de textura sedosa, levemente adoçado com melaço de cana e com um toque sutil salgadinho de queijo curado na vaporização, harmonizando perfeitamente o café com o pão de queijo.",
    image: "https://images.unsplash.com/photo-1570968915860-54d5c301fc9f?q=80&w=1000&auto=format&fit=crop",
    ingredients: ["Café especial", "Leite integral gelado", "Melaço de cana", "Queijo parmesão fino ralado"],
    equipment: ["Máquina de espresso", "Leiteira pitcher", "Xícara média"],
    detailedIngredients: [
      { name: "Café especial (torra escura aromática)", amount: "18g" },
      { name: "Leite integral gelado", amount: "140ml" },
      { name: "Melaço de cana", amount: "10ml" },
      { name: "Queijo parmesão ralado", amount: "1 pitada" }
    ],
    steps: [
      {
        title: "Adoçar",
        description: "Adicione o melaço de cana no fundo do copo de servir."
      },
      {
        title: "Extrair o Espresso",
        description: "Extraia um espresso duplo rico diretamente no copo sobre o melaço de cana."
      },
      {
        title: "Vaporizar com Queijo",
        description: "Adicione uma micro pitada de queijo parmesão ralado fino diretamente no leite gelado dentro da pitcher de inox antes de vaporizar. Vaporize o leite até formar uma textura sedosa. O queijo dará uma nota salgada umami sutilíssima que realça os açúcares naturais do leite e do melaço."
      },
      {
        title: "Despejar",
        description: "Despeje o leite vaporizado delicadamente sobre o café. Sirva com um pão de queijo quentinho acompanhando!"
      }
    ],
    weatherSuitability: ["cold", "neutral", "rainy"],
    category: "Latte",
    difficulty: "Medium",
    prepTime: "6 min"
  },
  {
    id: "core-5",
    name: "Affogato de Milho Verde",
    country: "Brasil / Itália",
    description: "A perfeita fusão da sobremesa italiana clássica com o sabor caipira brasileiro. Uma bola de sorvete cremoso de milho verde de alta qualidade afogada em um shot duplo de espresso bem quente e encorpado.",
    image: "https://images.unsplash.com/photo-1594911774802-8822a7079af1?q=80&w=1000&auto=format&fit=crop",
    ingredients: ["Sorvete artesanal de milho verde", "Café especial para espresso", "Canela em pó (opcional)"],
    equipment: ["Taça de servir", "Pegador de sorvete", "Porta-filtro de espresso"],
    detailedIngredients: [
      { name: "Sorvete de milho verde cremoso", amount: "1 bola grande" },
      { name: "Café especial", amount: "18g" },
      { name: "Canela em pó", amount: "Apenas uma pitada" }
    ],
    steps: [
      {
        title: "Gelar a Taça",
        description: "Coloque uma taça de vidro ou cerâmica pequena no congelador por 5 minutos para que fique gelada e ajude a desacelerar o derretimento do sorvete."
      },
      {
        title: "Adicionar o Sorvete",
        description: "Retire a taça do congelador e coloque uma bola bem firme e redonda de sorvete de milho verde no centro."
      },
      {
        title: "Extrair e Afogar",
        description: "Extraia um espresso duplo curto e encorpado (cerca de 35ml). Despeje o café quente imediatamente por cima da bola de sorvete de milho verde na frente de quem for consumir. Polvilhe uma pitada sutilíssima de canela se desejar."
      }
    ],
    weatherSuitability: ["hot", "neutral"],
    category: "Specialty",
    difficulty: "Easy",
    prepTime: "3 min"
  }
];

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
