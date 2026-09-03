<script setup>
import { reactive, computed } from "vue";
import { apiUrl } from "./api";

const CATEGORIES = [
  { key: "gpu", label: "Placa de Vídeo", icon: "🖥️", defaultTerm: "placa de video" },
  { key: "cpu", label: "Processador", icon: "🧠", defaultTerm: "processador" },
  { key: "motherboard", label: "Placa-Mãe", icon: "🔌", defaultTerm: "placa mae" },
  { key: "ram", label: "Memória RAM", icon: "📶", defaultTerm: "memoria ram" },
  { key: "storage", label: "SSD", icon: "💾", defaultTerm: "ssd" },
  { key: "psu", label: "Fonte", icon: "⚡", defaultTerm: "fonte" },
  { key: "case", label: "Gabinete", icon: "🗄️", defaultTerm: "gabinete" },
  { key: "cooler", label: "Water Cooler", icon: "❄️", defaultTerm: "water cooler" },
];

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const selections = reactive({});
const panels = reactive({});
for (const cat of CATEGORIES) {
  panels[cat.key] = { open: false, query: cat.defaultTerm, results: [], loading: false, error: "" };
}

const total = computed(() =>
  Object.values(selections).reduce((sum, p) => sum + (p ? p.price : 0), 0)
);

const selectedCount = computed(() => Object.values(selections).filter(Boolean).length);

function detectSocket(name = "") {
  const n = name.toUpperCase();
  let m = n.match(/\bAM[45]\b/);
  if (m) return m[0];
  m = n.match(/\bTR4\b|\bSTRX4\b|\bSP3\b/);
  if (m) return m[0];
  m = n.match(/LGA\s?-?\s?(\d{3,4})/);
  if (m) return "LGA" + m[1];
  return null;
}

function detectDdr(name = "") {
  const n = name.toLowerCase();
  if (n.includes("ddr5")) return "DDR5";
  if (n.includes("ddr4")) return "DDR4";
  if (n.includes("ddr3")) return "DDR3";
  return null;
}

const compatWarnings = computed(() => {
  const warnings = [];
  const cpu = selections.cpu;
  const mb = selections.motherboard;
  const ram = selections.ram;

  if (cpu && mb) {
    const cpuSocket = detectSocket(cpu.name);
    const mbSocket = detectSocket(mb.name);
    if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
      warnings.push(
        `Processador (soquete ${cpuSocket}) e placa-mãe (soquete ${mbSocket}) podem não ser compatíveis.`
      );
    }
  }
  if (mb && ram) {
    const mbDdr = detectDdr(mb.name);
    const ramDdr = detectDdr(ram.name);
    if (mbDdr && ramDdr && mbDdr !== ramDdr) {
      warnings.push(
        `Placa-mãe (${mbDdr}) e memória RAM (${ramDdr}) podem não ser compatíveis.`
      );
    }
  }
  return warnings;
});

async function search(key) {
  const panel = panels[key];
  const q = panel.query.trim();
  if (!q) return;

  panel.loading = true;
  panel.error = "";
  try {
    const resp = await fetch(apiUrl(`/api/search?q=${encodeURIComponent(q)}`));
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Falha na busca.");
    panel.results = data.products;
  } catch (err) {
    panel.error = err.message || "Não foi possível buscar agora.";
    panel.results = [];
  } finally {
    panel.loading = false;
  }
}

function togglePanel(key) {
  panels[key].open = !panels[key].open;
  if (panels[key].open && panels[key].results.length === 0 && !panels[key].loading) {
    search(key);
  }
}

function selectProduct(key, product) {
  selections[key] = product;
  panels[key].open = false;
}

function removeSelection(key) {
  selections[key] = null;
}
</script>

<template>
  <div class="manual">
    <div class="manual-summary">
      <div>
        <span class="label">Itens escolhidos</span>
        <strong>{{ selectedCount }} / {{ CATEGORIES.length }}</strong>
      </div>
      <div>
        <span class="label">Total</span>
        <strong class="total-price">{{ currency.format(total) }}</strong>
      </div>
    </div>

    <ul v-if="compatWarnings.length" class="warnings">
      <li v-for="(w, i) in compatWarnings" :key="i">⚠️ {{ w }}</li>
    </ul>

    <div class="slots">
      <div v-for="cat in CATEGORIES" :key="cat.key" class="slot">
        <div class="slot-header">
          <span class="slot-icon">{{ cat.icon }}</span>
          <span class="slot-label">{{ cat.label }}</span>
        </div>

        <div v-if="selections[cat.key]" class="picked">
          <img
            v-if="selections[cat.key].image"
            :src="selections[cat.key].image"
            :alt="selections[cat.key].name"
            class="picked-image"
            loading="lazy"
          />
          <p class="picked-name">
            <a :href="selections[cat.key].url" target="_blank" rel="noopener noreferrer">{{
              selections[cat.key].name
            }}</a>
          </p>
          <div class="picked-footer">
            <span class="picked-store">{{ selections[cat.key].store }}</span>
            <span class="picked-price">{{ currency.format(selections[cat.key].price) }}</span>
          </div>
          <div class="picked-actions">
            <button class="link-btn" @click="togglePanel(cat.key)">Trocar</button>
            <button class="link-btn danger" @click="removeSelection(cat.key)">Remover</button>
          </div>
        </div>

        <button v-else class="pick-btn" @click="togglePanel(cat.key)">
          {{ panels[cat.key].open ? "Fechar busca" : "Pesquisar" }}
        </button>

        <div v-if="panels[cat.key].open" class="search-panel">
          <div class="search-row">
            <input
              v-model="panels[cat.key].query"
              type="text"
              placeholder="O que você procura?"
              @keyup.enter="search(cat.key)"
            />
            <button @click="search(cat.key)" :disabled="panels[cat.key].loading">
              {{ panels[cat.key].loading ? "..." : "Buscar" }}
            </button>
          </div>

          <p v-if="panels[cat.key].error" class="search-error">{{ panels[cat.key].error }}</p>
          <p v-if="panels[cat.key].loading" class="search-status">Buscando na Kabum e na Terabyte...</p>

          <ul v-if="panels[cat.key].results.length" class="results-list">
            <li
              v-for="p in panels[cat.key].results"
              :key="p.store + p.url"
              class="result-item"
              @click="selectProduct(cat.key, p)"
            >
              <img v-if="p.image" :src="p.image" :alt="p.name" loading="lazy" />
              <div class="result-info">
                <p class="result-name">{{ p.name }}</p>
                <div class="result-meta">
                  <span class="result-store">{{ p.store }}</span>
                  <span class="result-price">{{ currency.format(p.price) }}</span>
                </div>
              </div>
            </li>
          </ul>
          <p
            v-else-if="!panels[cat.key].loading && !panels[cat.key].error"
            class="search-status"
          >
            Nenhum resultado ainda. Ajuste o termo e busque de novo.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.manual {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.manual-summary {
  display: flex;
  justify-content: space-between;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.1rem 1.5rem;
}

.manual-summary > div {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.manual-summary .label {
  font-size: 0.75rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.total-price {
  color: var(--accent);
  font-size: 1.2rem;
}

.warnings {
  list-style: none;
  margin: 0;
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

.slots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
  align-items: start;
}

.slot {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
}

.slot-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.7rem;
}

.slot-icon {
  font-size: 1.1rem;
}

.slot-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-dim);
}

.pick-btn {
  width: 100%;
  padding: 0.7rem;
  border-radius: 8px;
  border: 1px dashed var(--border);
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  font-size: 0.9rem;
}

.pick-btn:hover {
  border-color: var(--accent);
}

.picked-image {
  width: 100%;
  height: 100px;
  object-fit: contain;
  background: var(--panel-alt);
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.picked-name {
  font-size: 0.85rem;
  line-height: 1.3;
  margin: 0 0 0.5rem;
  min-height: 2.3em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.picked-name a {
  color: var(--text);
  text-decoration: none;
}

.picked-name a:hover {
  color: var(--accent);
}

.picked-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
}

.picked-store {
  color: var(--text-dim);
}

.picked-price {
  font-weight: 700;
  color: var(--accent);
}

.picked-actions {
  display: flex;
  gap: 0.75rem;
}

.link-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 0.78rem;
  cursor: pointer;
  padding: 0;
}

.link-btn:hover {
  color: var(--accent);
}

.link-btn.danger:hover {
  color: var(--danger);
}

.search-panel {
  margin-top: 0.8rem;
  border-top: 1px solid var(--border);
  padding-top: 0.8rem;
}

.search-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.search-row input {
  flex: 1;
  min-width: 0;
  padding: 0.45rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--panel-alt);
  color: var(--text);
  font-size: 0.85rem;
}

.search-row button {
  padding: 0.45rem 0.8rem;
  border-radius: 6px;
  border: none;
  background: var(--accent);
  color: #0d1117;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.85rem;
}

.search-row button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-error {
  color: var(--danger);
  font-size: 0.78rem;
  margin: 0 0 0.5rem;
}

.search-status {
  color: var(--text-dim);
  font-size: 0.78rem;
  margin: 0;
}

.results-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 340px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.result-item {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  padding: 0.4rem;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
}

.result-item:hover {
  background: var(--panel-alt);
  border-color: var(--accent);
}

.result-item img {
  width: 44px;
  height: 44px;
  object-fit: contain;
  background: var(--panel-alt);
  border-radius: 6px;
  flex-shrink: 0;
}

.result-info {
  min-width: 0;
}

.result-name {
  font-size: 0.78rem;
  line-height: 1.25;
  margin: 0 0 0.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.result-meta {
  display: flex;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.result-store {
  color: var(--text-dim);
}

.result-price {
  color: var(--accent);
  font-weight: 600;
}
</style>
