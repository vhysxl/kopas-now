const fs = require('fs');
const path = require('path');
const files = ['components/kopasnow/SearchResults.tsx', 'components/kopasnow/ProductDetailActions.tsx', 'components/kopasnow/ProductCatalog.tsx', 'components/kopasnow/OrdersList.tsx', 'components/kopasnow/LocationIndicator.tsx', 'components/kopasnow/KoperasiMap.tsx', 'components/kopasnow/KoperasiList.tsx', 'components/kopasnow/AddressPicker.tsx', 'app/produk/[id]/page.tsx', 'app/orders/[id]/page.tsx', 'app/orders/page.tsx', 'app/koperasi/[id]/page.tsx', 'app/keranjang/page.tsx', 'app/cari/page.tsx'];
files.forEach(f => {
  const p = path.join('c:/Users/Hp/Documents/projects/hackathon/cooperative/kopas-now', f);
  if(fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/import\s+\{.*\}\s+from\s+[\"']lucide-react[\"'];?\r?\n/g, '');
    fs.writeFileSync(p, content);
  }
});
console.log('Done');
