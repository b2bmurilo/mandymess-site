
window.DB = (function(){
  const money = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
  // NOTE: substitua 'img' pelos URLs originais quando desejar.
  const camisetas = Array.from({length:6}, (_,i)=> ({
    id: i+1,
    handle: String(i+1),
    title: `Camiseta ${i+1}`,
    price: 99.9 + i*5,
    images: [
      `https://picsum.photos/seed/cam${i}/800/900`,
      `https://picsum.photos/seed/cam${i}b/800/900`
    ],
    sizes: ["P","M","G","GG","3G","4G"],
    category: "camisetas",
    description: "Camiseta autoral de algodão premium com modelagem confortável."
  }));

  const sueters = Array.from({length:2}, (_,i)=> ({
    id: 100+i,
    handle: String(100+i),
    title: `Suéter ${i+1}`,
    price: 159.9 + i*10,
    images: [
      `https://picsum.photos/seed/sue${i}/900/1000`,
      `https://picsum.photos/seed/sue${i}b/900/1000`
    ],
    sizes: ["P","M","G","GG","3G","4G"],
    category: "sueters",
    description: "Suéter de tricô macio, toque suave e caimento perfeito."
  }));

  const all = [...camisetas, ...sueters];

  return {
    products: all,
    byId: (id)=> all.find(p => String(p.id)===String(id) || String(p.handle)===String(id)),
    filterByCategory: (cat)=> all.filter(p=>p.category===cat),
    money
  };
})();
