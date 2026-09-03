<script setup>
import { ref, computed } from "vue";
import ManualBuilder from "./ManualBuilder.vue";
import { apiUrl } from "./api";

const mode = ref("auto");

const CATEGORY_ICONS = {
  gpu: "🖥️",
  cpu: "🧠",
  motherboard: "🔌",
  ram: "📶",
  storage: "💾",
  psu: "⚡",
  case: "🗄️",
  cooler: "❄️",
};

const budgetInput = ref("6000");
const profile = ref("gpu"); // "gpu" (prioriza placa de vídeo) | "balanced"
const gpuBrand = ref(""); // "" (qualquer) | "nvidia" | "amd"
const cpuBrand = ref(""); // "" (qualquer) | "intel" | "amd"
const ramGb = ref("16");
const dualChannel = ref(false);
const storageGb = ref(""); // "" = sem preferência de capacidade

const RAM_OPTIONS = [8, 16, 32, 64];
const STORAGE_OPTIONS = [
  { value: "", label: "Qualquer" },
  { value: "240", label: "240GB+" },
  { value: "480", label: "480GB+" },
  { value: "1000", label: "1TB+" },
  { value: "2000", label: "2TB+" },
];

const loading = ref(false);
const error = ref("");
const result = ref(null);

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const isOverBudget = computed(() => result.value && result.value.remaining < 0);

const progressPct = computed(() => {
  if (!result.value) return 0;
  return Math.min(100, (result.value.total / result.value.budget) * 100);
});

async function buscarConfiguracao() {
  const budget = Number(budgetInput.value);
  if (!Number.isFinite(budget) || budget < 500 || budget > 200000) {
    error.value = "Informe um valor entre R$ 500 e R$ 200.000.";
    return;
  }

  loading.value = true;
  error.value = "";
  result.value = null;

  try {
    const params = new URLSearchParams({
      budget,
      profile: profile.value,
      ramGb: ramGb.value,
      dualChannel: dualChannel.value ? "true" : "false",
    });
    if (gpuBrand.value) params.set("gpuBrand", gpuBrand.value);
    if (cpuBrand.value) params.set("cpuBrand", cpuBrand.value);
    if (storageGb.value) params.set("storageGb", storageGb.value);
    const resp = await fetch(apiUrl(`/api/build?${params}`));
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || "Falha ao buscar configuração.");
    }
    result.value = data;
  } catch (err) {
    error.value = err.message || "Não foi possível buscar preços agora. Tente novamente.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="page">
    <header class="hero">
      <h1>Montador de PC</h1>
      <p class="subtitle">
        Informe seu orçamento e a aplicação busca em tempo real, na Kabum e na
        Terabyte, a melhor configuração de PC compatível dentro desse valor.
      </p>
    </header>

    <div class="mode-switch">
      <button :class="{ active: mode === 'auto' }" @click="mode = 'auto'">
        Por orçamento
      </button>
      <button :class="{ active: mode === 'manual' }" @click="mode = 'manual'">
        Peça por peça
      </button>
    </div>

    <ManualBuilder v-if="mode === 'manual'" />

    <form v-if="mode === 'auto'" class="budget-form" @submit.prevent="buscarConfiguracao">
      <label for="budget">Orçamento (R$)</label>
      <div class="input-row">
        <input
          id="budget"
          v-model="budgetInput"
          type="number"
          min="500"
          max="200000"
          step="50"
          placeholder="Ex: 6000"
        />
        <button type="submit" :disabled="loading">
          {{ loading ? "Buscando..." : "Buscar melhor configuração" }}
        </button>
      </div>

      <div class="options-row">
        <div class="option-group">
          <span class="option-label">Prioridade</span>
          <div class="segmented">
            <button type="button" :class="{ active: profile === 'gpu' }" @click="profile = 'gpu'">
              Priorizar GPU
            </button>
            <button
              type="button"
              :class="{ active: profile === 'balanced' }"
              @click="profile = 'balanced'"
            >
              Equilibrado
            </button>
          </div>
        </div>

        <div class="option-group">
          <span class="option-label">Marca da GPU</span>
          <div class="segmented">
            <button type="button" :class="{ active: gpuBrand === '' }" @click="gpuBrand = ''">
              Qualquer
            </button>
            <button
              type="button"
              :class="{ active: gpuBrand === 'nvidia' }"
              @click="gpuBrand = 'nvidia'"
            >
              NVIDIA
            </button>
            <button type="button" :class="{ active: gpuBrand === 'amd' }" @click="gpuBrand = 'amd'">
              AMD
            </button>
          </div>
        </div>

        <div class="option-group">
          <span class="option-label">Marca do processador</span>
          <div class="segmented">
            <button type="button" :class="{ active: cpuBrand === '' }" @click="cpuBrand = ''">
              Qualquer
            </button>
            <button
              type="button"
              :class="{ active: cpuBrand === 'intel' }"
              @click="cpuBrand = 'intel'"
            >
              Intel
            </button>
            <button type="button" :class="{ active: cpuBrand === 'amd' }" @click="cpuBrand = 'amd'">
              AMD
            </button>
          </div>
        </div>

        <div class="option-group">
          <span class="option-label">Memória RAM</span>
          <div class="ram-option-row">
            <select v-model="ramGb" class="select-input">
              <option v-for="gb in RAM_OPTIONS" :key="gb" :value="String(gb)">{{ gb }}GB</option>
            </select>
            <label class="checkbox-label">
              <input type="checkbox" v-model="dualChannel" />
              Dual channel
            </label>
          </div>
        </div>

        <div class="option-group">
          <span class="option-label">Armazenamento (SSD)</span>
          <select v-model="storageGb" class="select-input select-full">
            <option v-for="opt in STORAGE_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>
    </form>

    <section v-if="mode === 'auto' && loading" class="status">
      <div class="spinner"></div>
      <p>Consultando preços em tempo real na Kabum e na Terabyte...</p>
    </section>

    <section v-if="mode === 'auto' && result" class="results">
      <div class="summary" :class="{ over: isOverBudget }">
        <div class="summary-row">
          <span>Orçamento informado</span>
          <strong>{{ currency.format(result.budget) }}</strong>
        </div>
        <div class="summary-row">
          <span>Total da configuração</span>
          <strong>{{ currency.format(result.total) }}</strong>
        </div>
        <div class="summary-row">
          <span>{{ isOverBudget ? "Acima do orçamento" : "Restante" }}</span>
          <strong :class="isOverBudget ? 'text-danger' : 'text-accent2'">
            {{ currency.format(Math.abs(result.remaining)) }}
          </strong>
        </div>
        <div class="progress-track">
          <div
            class="progress-fill"
            :class="{ over: isOverBudget }"
            :style="{ width: progressPct + '%' }"
          ></div>
        </div>
      </div>

      <ul v-if="result.warnings?.length" class="warnings">
        <li v-for="(w, i) in result.warnings" :key="i">⚠️ {{ w }}</li>
      </ul>

      <div class="items-grid">
        <a
          v-for="item in result.items"
          :key="item.key"
          class="item-card"
          :class="{ empty: !item.product }"
          :href="item.product?.url"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div class="item-header">
            <span class="item-icon">{{ CATEGORY_ICONS[item.key] || "🔧" }}</span>
            <span class="item-label">{{ item.label }}</span>
            <span v-if="item.product" class="item-store">{{ item.product.store }}</span>
          </div>
          <template v-if="item.product">
            <img
              v-if="item.product.image"
              :src="item.product.image"
              :alt="item.product.name"
              class="item-image"
              loading="lazy"
            />
            <p class="item-name">{{ item.product.name }}</p>
            <div class="item-footer">
              <span class="item-brand">{{ item.product.brand }}</span>
              <span class="item-price">{{ currency.format(item.product.price) }}</span>
            </div>
          </template>
          <template v-else>
            <p class="item-name muted">Nenhum item disponível encontrado.</p>
          </template>
        </a>
      </div>

      <p v-if="result.storeIssues?.length" class="fetched-at store-issues">
        Não foi possível consultar agora: {{ result.storeIssues.join(", ") }}
      </p>
      <p class="fetched-at">
        Preços buscados em {{ new Date(result.fetchedAt).toLocaleString("pt-BR") }} ·
        Fontes: Kabum, Terabyte
      </p>
    </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 4rem;
}

.hero {
  text-align: center;
  margin-bottom: 2rem;
}

.mode-switch {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.mode-switch button {
  padding: 0.5rem 1.1rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text-dim);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
}

.mode-switch button.active {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(88, 166, 255, 0.1);
}

.hero h1 {
  font-size: 2rem;
  margin: 0 0 0.5rem;
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.subtitle {
  color: var(--text-dim);
  max-width: 560px;
  margin: 0 auto;
  line-height: 1.5;
}

.budget-form {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 480px;
  margin: 0 auto 2rem;
}

.budget-form label {
  display: block;
  font-size: 0.85rem;
  color: var(--text-dim);
  margin-bottom: 0.5rem;
}

.input-row {
  display: flex;
  gap: 0.75rem;
}

.input-row input {
  flex: 1;
  min-width: 0;
  padding: 0.65rem 0.8rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--panel-alt);
  color: var(--text);
  font-size: 1rem;
}

.input-row input:focus {
  outline: 2px solid var(--accent);
}

.input-row button {
  padding: 0.65rem 1.1rem;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: #0d1117;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.input-row button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-msg {
  color: var(--danger);
  font-size: 0.85rem;
  margin: 0.75rem 0 0;
}

.options-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1.1rem;
}

.option-group {
  flex: 1;
  min-width: 180px;
}

.option-label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.4rem;
}

.segmented {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.segmented button {
  flex: 1;
  padding: 0.45rem 0.5rem;
  border: none;
  background: var(--panel-alt);
  color: var(--text-dim);
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  border-right: 1px solid var(--border);
}

.segmented button:last-child {
  border-right: none;
}

.segmented button.active {
  background: rgba(88, 166, 255, 0.15);
  color: var(--accent);
}

.select-input {
  padding: 0.45rem 0.6rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--panel-alt);
  color: var(--text);
  font-size: 0.82rem;
  font-weight: 600;
}

.select-full {
  width: 100%;
}

.ram-option-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--text-dim);
  cursor: pointer;
  white-space: nowrap;
}

.checkbox-label input {
  accent-color: var(--accent);
  cursor: pointer;
}

.status {
  text-align: center;
  color: var(--text-dim);
  padding: 2rem 0;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  margin: 0 auto 1rem;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.summary {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.25rem;
}

.summary.over {
  border-color: var(--danger);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 0.3rem 0;
  font-size: 0.95rem;
}

.summary-row span {
  color: var(--text-dim);
}

.text-danger {
  color: var(--danger);
}

.text-accent2 {
  color: var(--accent-2);
}

.progress-track {
  margin-top: 0.75rem;
  height: 8px;
  border-radius: 4px;
  background: var(--panel-alt);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent-2);
  transition: width 0.3s ease;
}

.progress-fill.over {
  background: var(--danger);
}

.warnings {
  list-style: none;
  margin: 0 0 1.25rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.warnings li {
  background: rgba(210, 153, 34, 0.12);
  border: 1px solid var(--warn);
  color: var(--warn);
  padding: 0.6rem 0.9rem;
  border-radius: 8px;
  font-size: 0.85rem;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.item-card {
  display: block;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
  text-decoration: none;
  color: var(--text);
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.item-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.item-card.empty {
  pointer-events: none;
  opacity: 0.6;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.item-icon {
  font-size: 1.1rem;
}

.item-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-dim);
  flex: 1;
}

.item-store {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--accent);
  background: rgba(88, 166, 255, 0.12);
  border: 1px solid rgba(88, 166, 255, 0.3);
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
}

.item-image {
  width: 100%;
  height: 120px;
  object-fit: contain;
  background: var(--panel-alt);
  border-radius: 8px;
  margin-bottom: 0.6rem;
}

.item-name {
  font-size: 0.9rem;
  line-height: 1.35;
  margin: 0 0 0.6rem;
  min-height: 2.7em;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-name.muted {
  color: var(--text-dim);
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.item-brand {
  color: var(--text-dim);
}

.item-price {
  font-weight: 700;
  color: var(--accent);
}

.fetched-at {
  text-align: center;
  color: var(--text-dim);
  font-size: 0.75rem;
  margin-top: 1.5rem;
}

.store-issues {
  color: var(--warn);
  margin-top: 0;
}

@media (max-width: 640px) {
  .page {
    padding: 1.5rem 1rem 3rem;
  }

  .hero h1 {
    font-size: 1.6rem;
  }

  .mode-switch {
    flex-wrap: wrap;
  }

  .budget-form {
    padding: 1.1rem;
  }

  .input-row {
    flex-direction: column;
  }

  .input-row button {
    width: 100%;
  }

  .summary {
    padding: 1.1rem;
  }

  .item-card {
    padding: 0.85rem;
  }
}
</style>
