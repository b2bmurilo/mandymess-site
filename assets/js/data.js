
window.DB = (()=>{
  const money = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
  const products = Array.from({length:24}).map((_,i)=>{
    const id = 1000+i;
    const price = (99 + (i%7)*10) + .90;
    const handle = `produto-${i+1}`;
    return {
      id, handle,
      title: `Produto ${i+1}`,
      price, priceText: money(price),
      images: [
        `https://picsum.photos/seed/${handle}-1/900/900`,
        `https://picsum.photos/seed/${handle}-2/900/900`,
        `https://picsum.photos/seed/${handle}-3/900/900`,
        `https://picsum.photos/seed/${handle}-4/900/900`
      ]
    };
  });
  return { products, money };
})();
