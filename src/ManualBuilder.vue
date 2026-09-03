<script setup>
import { reactive, computed } from "vue";
import PartPicker from "./PartPicker.vue";

const MAX_RAM = 4;

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

const singleCategories = CATEGORIES.filter((c) => c.key !== "ram");
const ramCategory = CATEGORIES.find((c) => c.key === "ram");

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const selections = reactive({});
for (const cat of singleCategories) selections[cat.key] = null;

// Até 4 pentes de RAM — cada posição do array é um pente (ou null se ainda
// não escolhido). Começa com 1 slot visível; "Adicionar outro pente" revela
// mais, até o limite.
const ramSticks = reactive([null]);

function addRamSlot() {
  if (ramSticks.length < MAX_RAM) ramSticks.push(null);
}

function removeRamSlot(i) {
  if (ramSticks.length > 1) {
    ramSticks.splice(i, 1);
  } else {
    ramSticks[0] = null;
  }
}

const total = computed(() => {
  const singleTotal = singleCategories.reduce(
    (sum, c) => sum + (selections[c.key] ? selections[c.key].price : 0),
    0
  );
  const ramTotal = ramSticks.reduce((sum, p) => sum + (p ? p.price : 0), 0);
  return singleTotal + ramTotal;
});

const selectedCount = computed(() => {
  const singleCount = singleCategories.filter((c) => selections[c.key]).length;
  const ramCount = ramSticks.some(Boolean) ? 1 : 0;
  return singleCount + ramCount;
});

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

  if (cpu && mb) {
    const cpuSocket = detectSocket(cpu.name);
    const mbSocket = detectSocket(mb.name);
    if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
      warnings.push(
        `Processador (soquete ${cpuSocket}) e placa-mãe (soquete ${mbSocket}) podem não ser compatíveis.`
      );
    }
  }

  if (mb) {
    const mbDdr = detectDdr(mb.name);
    if (mbDdr) {
      const mismatched = ramSticks.filter((p) => {
        const ddr = p && detectDdr(p.name);
        return ddr && ddr !== mbDdr;
      });
      if (mismatched.length) {
        warnings.push(
          `Placa-mãe (${mbDdr}) e ${mismatched.length > 1 ? "algumas memórias RAM" : "a memória RAM"} podem não ser compatíveis.`
        );
      }
    }
  }

  return warnings;
});
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
      <div v-for="cat in singleCategories" :key="cat.key" class="slot">
        <div class="slot-header">
          <span class="slot-icon">{{ cat.icon }}</span>
          <span class="slot-label">{{ cat.label }}</span>
        </div>
        <PartPicker v-model="selections[cat.key]" :category="cat.key" :default-term="cat.defaultTerm" />
      </div>

      <div class="slot slot-ram">
        <div class="slot-header">
          <span class="slot-icon">{{ ramCategory.icon }}</span>
          <span class="slot-label">{{ ramCategory.label }}</span>
          <span class="slot-count">{{ ramSticks.filter(Boolean).length }}/{{ MAX_RAM }}</span>
        </div>

        <div v-for="(stick, i) in ramSticks" :key="i" class="ram-stick">
          <div v-if="ramSticks.length > 1" class="ram-stick-header">
            <span>Pente {{ i + 1 }}</span>
            <button class="link-btn danger" @click="removeRamSlot(i)">Remover pente</button>
          </div>
          <PartPicker
            v-model="ramSticks[i]"
            category="ram"
            :default-term="ramCategory.defaultTerm"
            :search-label="ramSticks.length > 1 ? `Pesquisar pente ${i + 1}` : 'Pesquisar'"
          />
        </div>

        <button v-if="ramSticks.length < MAX_RAM" class="add-ram-btn" @click="addRamSlot">
          + Adicionar outro pente ({{ ramSticks.length }}/{{ MAX_RAM }})
        </button>
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
  flex: 1;
}

.slot-count {
  font-size: 0.7rem;
  color: var(--accent);
  background: rgba(88, 166, 255, 0.12);
  border: 1px solid rgba(88, 166, 255, 0.3);
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
}

.slot-ram {
  grid-column: span 2;
}

.ram-stick {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.7rem;
  margin-bottom: 0.7rem;
}

.ram-stick-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.78rem;
  color: var(--text-dim);
}

.link-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 0.78rem;
  cursor: pointer;
  padding: 0;
}

.link-btn.danger:hover {
  color: var(--danger);
}

.add-ram-btn {
  width: 100%;
  padding: 0.6rem;
  border-radius: 8px;
  border: 1px dashed var(--border);
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  font-size: 0.85rem;
}

.add-ram-btn:hover {
  border-color: var(--accent);
}
</style>
