export const CURIOSIDADES = [
  "A pizza Margherita foi criada em 1889 em homenagem à Rainha Margherita da Itália — vermelho (tomate), branco (mussarela) e verde (manjericão), as cores da bandeira.",
  "O hambúrguer recebeu esse nome por causa da cidade de Hamburgo, na Alemanha, de onde imigrantes levaram a receita aos EUA.",
  "O sushi originalmente era uma técnica de conservação de peixe — o arroz era descartado depois!",
  "O chocolate já foi usado como moeda pelos astecas. Cacau valia mais que ouro em algumas regiões.",
  "Mel não estraga. Arqueólogos encontraram potes de mel comestíveis em tumbas egípcias com mais de 3.000 anos.",
  "A batata frita pode ter sido inventada na Bélgica, não na França, no século XVII.",
  "O café é a segunda mercadoria mais comercializada do mundo, atrás apenas do petróleo.",
  "A pimenta libera endorfina no cérebro — por isso comer apimentado pode causar sensação de prazer.",
  "O ketchup começou como um molho de peixe fermentado na China, séculos antes do tomate ser usado.",
  "A cenoura nem sempre foi laranja — originalmente era roxa. A versão laranja foi criada na Holanda no século XVII.",
  "O nome 'lasanha' vem do grego 'lasanon', que significa panela ou recipiente para cozinhar.",
  "Tomate é botanicamente uma fruta, mas legalmente um vegetal nos EUA desde 1893.",
  "A banana é tecnicamente uma baga, e o morango não é!",
  "Existem mais de 7.500 variedades de maçãs no mundo.",
  "Coca-Cola era originalmente verde e vendida como remédio em farmácias.",
  "O queijo mais caro do mundo, feito de leite de jumenta, custa mais de R$ 5.000 o quilo.",
  "A culinária japonesa tem cinco gostos básicos: doce, salgado, azedo, amargo e umami.",
  "O pão de queijo é uma invenção genuinamente brasileira, criada em Minas Gerais.",
  "Comer abacaxi pode 'comer' você de volta — ele contém bromelina, uma enzima que digere proteínas.",
  "O wasabi servido fora do Japão geralmente é raiz-forte com corante — o verdadeiro wasabi é raríssimo.",
];

export function curiosidadeAleatoria(seed = Date.now()) {
  return CURIOSIDADES[seed % CURIOSIDADES.length];
}
