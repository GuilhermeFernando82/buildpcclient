<script setup>
import { reactive } from "vue";
import { apiUrl } from "./api";

const props = defineProps({
  modelValue: { type: Object, default: null },
  category: { type: String, required: true },
  defaultTerm: { type: String, default: "" },
  searchLabel: { type: String, default: "Pesquisar" },
});
const emit = defineEmits(["update:modelValue"]);

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const panel = reactive({
  open: false,
  query: props.defaultTerm,
  results: [],
  loading: false,
  error: "",
});

async function search() {
  const q = panel.query.trim();
  if (!q) return;

  panel.loading = true;
  panel.error = "";
  try {
    const resp = await fetch(
      apiUrl(`/api/search?q=${encodeURIComponent(q)}&category=${props.category}`)
    );
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

function togglePanel() {
  panel.open = !panel.open;
  if (panel.open && panel.results.length === 0 && !panel.loading) {
    search();
  }
}

function select(product) {
  emit("update:modelValue", product);
  panel.open = false;
}

function remove() {
  emit("update:modelValue", null);
}
</script>

<template>
  <div class="part-picker">
    <div v-if="modelValue" class="picked">
      <img
        v-if="modelValue.image"
        :src="modelValue.image"
        :alt="modelValue.name"
        class="picked-image"
        loading="lazy"
      />
      <p class="picked-name">
        <a :href="modelValue.url" target="_blank" rel="noopener noreferrer">{{ modelValue.name }}</a>
      </p>
      <div class="picked-footer">
        <span class="picked-store">{{ modelValue.store }}</span>
        <span class="picked-price">{{ currency.format(modelValue.price) }}</span>
      </div>
      <div class="picked-actions">
        <button class="link-btn" @click="togglePanel">Trocar</button>
        <button class="link-btn danger" @click="remove">Remover</button>
      </div>
    </div>

    <button v-else class="pick-btn" @click="togglePanel">
      {{ panel.open ? "Fechar busca" : searchLabel }}
    </button>

    <div v-if="panel.open" class="search-panel">
      <div class="search-row">
        <input
          v-model="panel.query"
          type="text"
          placeholder="O que você procura?"
          @keyup.enter="search"
        />
        <button @click="search" :disabled="panel.loading">
          {{ panel.loading ? "..." : "Buscar" }}
        </button>
      </div>

      <p v-if="panel.error" class="search-error">{{ panel.error }}</p>
      <p v-if="panel.loading" class="search-status">Buscando na Kabum e na Terabyte...</p>

      <ul v-if="panel.results.length" class="results-list">
        <li
          v-for="p in panel.results"
          :key="p.store + p.url"
          class="result-item"
          @click="select(p)"
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
      <p v-else-if="!panel.loading && !panel.error" class="search-status">
        Nenhum resultado ainda. Ajuste o termo e busque de novo.
      </p>
    </div>
  </div>
</template>

<style scoped>
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
