// Em dev, o Vite faz proxy de /api para o backend local (vite.config.js) e
// VITE_API_BASE_URL fica vazio, então as chamadas usam caminho relativo.
// Em produção (Vercel), o frontend é só estático — precisa da URL completa
// do backend, definida em VITE_API_BASE_URL no ambiente do projeto Vercel.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}
