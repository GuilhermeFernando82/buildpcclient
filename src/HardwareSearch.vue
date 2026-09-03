<script setup>
import { reactive, ref } from "vue";
import { apiUrl } from "./api";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const query = ref("");
const loading = ref(false);
const error = ref("");
const results = ref(null);
const failedStores = ref([]);

// Estado do histórico por produto (chave = id do produto), pra cada card
// poder abrir/fechar e carregar seu gráfico de forma independente.
const historyState = reactive({});

function getHistoryState(id) {
  if (!historyState[id]) {
    historyState[id] = { open: false, loading: false, error: "", points: [] };
  }
  return historyState[id];
}

async function search() {
  const q = query.value.trim();
  if (!q) return;

  loading.value = true;
  error.value = "";
  results.value = null;
  try {
    const resp = await fetch(apiUrl(`/api/search?q=${encodeURIComponent(q)}`));
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Falha na busca.");
    results.value = data.products;
    failedStores.value = data.failedStores || [];
  } catch (err) {
    error.value = err.message || "Não foi possível buscar agora.";
  } finally {
    loading.value = false;
  }
}

async function toggleHistory(product) {
  const state = getHistoryState(product.id);
  state.open = !state.open;
  if (state.open && state.points.length === 0 && !state.loading) {
    state.loading = true;
    state.error = "";
    try {
      const resp = await fetch(apiUrl(`/api/price-history?id=${encodeURIComponent(product.id)}`));
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Falha ao buscar histórico.");
      state.points = data.points || [];
    } catch (err) {
      state.error = err.message || "Não foi possível buscar o histórico agora.";
    } finally {
      state.loading = false;
    }
  }
}

// Gera um gráfico de linha simples em SVG a partir dos pontos {price, date}.
// Sem biblioteca externa — só um polyline escalado pro viewBox.
const CHART_W = 520;
const CHART_H = 140;
const PAD = 28;

function buildChart(points) {
  if (points.length < 2) return null;
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const stepX = (CHART_W - PAD * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = PAD + i * stepX;
    const y = PAD + (CHART_H - PAD * 2) * (1 - (p.price - min) / range);
    return { x, y, price: p.price, date: p.date };
  });

  const linePath = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  return { coords, linePath, min, max };
}
</script>

<template>
  <div class="hardware-search">
    <form class="search-form" @submit.prevent="search">
      <input
        v-model="query"
        type="text"
        placeholder="Ex: RTX 5070, Ryzen 7 7800X3D, SSD 1TB..."
      />
      <button type="submit" :disabled="loading">{{ loading ? "Buscando..." : "Buscar" }}</button>
    </form>

    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="loading" class="status-msg">Buscando na Kabum, na Terabyte e na Pato Loco...</p>

    <div v-if="results">
      <p class="results-count">
        {{ results.length }} resultado{{ results.length === 1 ? "" : "s" }}, do mais barato ao mais caro
      </p>
      <p v-if="failedStores.length" class="store-issue">
        Não foi possível consultar agora: {{ failedStores.join(", ") }}
      </p>

      <p v-if="!results.length" class="status-msg">Nenhum resultado pra essa busca.</p>

      <ul class="results-list">
        <li v-for="p in results" :key="p.id" class="result-card">
          <div class="result-main">
            <img v-if="p.image" :src="p.image" :alt="p.name" loading="lazy" />
            <div class="result-info">
              <p class="result-name">
                <a :href="p.url" target="_blank" rel="noopener noreferrer">{{ p.name }}</a>
              </p>
              <div class="result-meta">
                <span class="result-store">{{ p.store }}</span>
                <span class="result-price">{{ currency.format(p.price) }}</span>
              </div>
              <button class="history-toggle" @click="toggleHistory(p)">
                {{ getHistoryState(p.id).open ? "Ocultar histórico de preço" : "Ver histórico de preço" }}
              </button>
            </div>
          </div>

          <div v-if="getHistoryState(p.id).open" class="history-panel">
            <p v-if="getHistoryState(p.id).loading" class="status-msg">Carregando histórico...</p>
            <p v-else-if="getHistoryState(p.id).error" class="error-msg">
              {{ getHistoryState(p.id).error }}
            </p>
            <template v-else-if="getHistoryState(p.id).points.length < 2">
              <p class="status-msg">
                Ainda não temos histórico suficiente pra esse produto — começamos a acompanhar o
                preço dele agora. Pesquise de novo em alguns dias pra ver a evolução.
              </p>
            </template>
            <template v-else>
              <svg
                :viewBox="`0 0 ${CHART_W} ${CHART_H}`"
                class="history-chart"
                preserveAspectRatio="none"
              >
                <polyline
                  :points="buildChart(getHistoryState(p.id).points).linePath"
                  fill="none"
                  stroke="var(--accent)"
                  stroke-width="2"
                />
                <circle
                  v-for="(c, i) in buildChart(getHistoryState(p.id).points).coords"
                  :key="i"
                  :cx="c.x"
                  :cy="c.y"
                  r="3"
                  fill="var(--accent)"
                >
                  <title>{{ currency.format(c.price) }} — {{ dateFmt.format(new Date(c.date)) }}</title>
                </circle>
              </svg>
              <div class="chart-range">
                <span>Mín: {{ currency.format(buildChart(getHistoryState(p.id).points).min) }}</span>
                <span>Máx: {{ currency.format(buildChart(getHistoryState(p.id).points).max) }}</span>
                <span>{{ getHistoryState(p.id).points.length }} pontos registrados</span>
              </div>
            </template>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.hardware-search {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.search-form {
  display: flex;
  gap: 0.75rem;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.1rem;
}

.search-form input {
  flex: 1;
  min-width: 0;
  padding: 0.65rem 0.8rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--panel-alt);
  color: var(--text);
  font-size: 1rem;
}

.search-form button {
  padding: 0.65rem 1.2rem;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: #0d1117;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.search-form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-msg {
  color: var(--danger);
  font-size: 0.85rem;
}

.status-msg {
  color: var(--text-dim);
  font-size: 0.85rem;
}

.results-count {
  color: var(--text-dim);
  font-size: 0.85rem;
  margin: 0;
}

.store-issue {
  color: var(--warn);
  font-size: 0.85rem;
  margin: 0;
}

.results-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.result-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
}

.result-main {
  display: flex;
  gap: 1rem;
}

.result-main img {
  width: 72px;
  height: 72px;
  object-fit: contain;
  background: var(--panel-alt);
  border-radius: 8px;
  flex-shrink: 0;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-name {
  margin: 0 0 0.4rem;
  font-size: 0.92rem;
  line-height: 1.35;
}

.result-name a {
  color: var(--text);
  text-decoration: none;
}

.result-name a:hover {
  color: var(--accent);
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.result-store {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--accent);
  background: rgba(88, 166, 255, 0.12);
  border: 1px solid rgba(88, 166, 255, 0.3);
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
}

.result-price {
  font-weight: 700;
  color: var(--accent);
  font-size: 1rem;
}

.history-toggle {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.history-toggle:hover {
  color: var(--accent);
}

.history-panel {
  margin-top: 0.8rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--border);
}

.history-chart {
  width: 100%;
  height: 140px;
}

.chart-range {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--text-dim);
  margin-top: 0.4rem;
}
</style>
