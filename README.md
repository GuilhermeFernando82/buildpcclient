# buildpcclient

Frontend (Vue 3 + Vite) do Montador de PC. Consome a API do
[buildpcserve](https://github.com/GuilhermeFernando82/buildpcserve) e tem
dois modos:

- **Por orçamento**: informa um valor e a aplicação monta automaticamente a
  melhor configuração de PC dentro dele, buscando preços em tempo real.
- **Peça por peça** (`src/ManualBuilder.vue`): pesquisa livremente em cada
  categoria (GPU, CPU, placa-mãe, RAM, SSD, fonte, gabinete, water cooler) e
  monta a lista manualmente, com avisos leves de compatibilidade (socket,
  DDR) calculados no navegador.

## Rodando localmente

Precisa do [buildpcserve](https://github.com/GuilhermeFernando82/buildpcserve)
rodando (por padrão em `http://localhost:3001` — o Vite já faz proxy de
`/api` pra lá, ver `vite.config.js`):

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

## Deploy (Vercel)

1. Importe este repositório na Vercel. Framework Vite é detectado
   automaticamente (build command `npm run build`, output `dist`).
2. Em **Environment Variables**, adicione `VITE_API_BASE_URL` com a URL
   pública do backend ([buildpcserve](https://github.com/GuilhermeFernando82/buildpcserve)
   publicado no Railway/Render), sem barra no final — ex.:
   `https://seu-backend.up.railway.app`.
3. Deploy. Depois, volte no backend e defina `CORS_ORIGIN` com a URL final
   deste projeto na Vercel.

Veja `.env.example` para referência da variável.
