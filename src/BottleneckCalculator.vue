<script setup>
import { ref, watch } from "vue";
import PartPicker from "./PartPicker.vue";
import { apiUrl } from "./api";

const cpu = ref(null);
const gpu = ref(null);
const loading = ref(false);
const error = ref("");
const result = ref(null);

const LIMIT_LABELS = {
  cpu: "Gargalo do processador",
  gpu: "Gargalo da placa de vídeo",
  balanced: "Dupla equilibrada",
};

async function calcular() {
  if (!cpu.value || !gpu.value) return;

  loading.value = true;
  error.value = "";
  try {
    const params = new URLSearchParams({ cpu: cpu.value.name, gpu: gpu.value.name });
    const resp = await fetch(apiUrl(`/api/bottleneck?${params}`));
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Falha ao calcular o gargalo.");
    result.value = data;
  } catch (err) {
    error.value = err.message || "Não foi possível calcular agora.";
    result.value = null;
  } finally {
    loading.value = false;
  }
}

// Recalcula sozinho assim que as duas peças estiverem escolhidas (e a cada
// troca depois disso) — é uma conta local no servidor, não custa uma busca
// nas lojas.
watch([cpu, gpu], () => {
  if (cpu.value && gpu.value) calcular();
  else result.value = null;
});

// Escala as duas barras pelo maior teto entre CPU e GPU: a barra mais curta
// é, visualmente, a peça que segura o conjunto.
function barPct(value, res) {
  const max = Math.max(res.cpuCeiling, res.gpuCeiling) || 1;
  return Math.round((value / max) * 100);
}
</script>

<template>
  <div class="bottleneck">
    <p class="intro">
      Escolha um processador e uma placa de vídeo para ver qual das duas peças
      tende a limitar o desempenho em cada resolução.
    </p>

    <div class="pickers">
      <div class="picker-card">
        <span class="picker-title">🧠 Processador</span>
        <PartPicker
          v-model="cpu"
          category="cpu"
          default-term="processador"
          search-label="Escolher processador"
        />
      </div>
      <div class="picker-card">
        <span class="picker-title">🖥️ Placa de vídeo</span>
        <PartPicker
          v-model="gpu"
          category="gpu"
          default-term="placa de video"
          search-label="Escolher placa de vídeo"
        />
      </div>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="loading" class="status-msg">Calculando...</p>

    <section v-if="result && !loading" class="results">
      <p v-if="!result.cpu.matched || !result.gpu.matched" class="unmatched">
        ⚠️ Não reconhecemos o modelo
        <template v-if="!result.cpu.matched && !result.gpu.matched">
          do processador nem o da placa de vídeo
        </template>
        <template v-else-if="!result.cpu.matched">do processador</template>
        <template v-else>da placa de vídeo</template>
        na nossa base de desempenho. O resultado usa uma estimativa de faixa
        média e pode não refletir bem essa dupla.
      </p>

      <div class="res-grid">
        <div v-for="res in result.byResolution" :key="res.key" class="res-card">
          <div class="res-header">
            <span class="res-label">{{ res.label }}</span>
            <span class="res-fps">~{{ res.estimatedFps }} FPS</span>
          </div>

          <div class="verdict" :class="res.limitedBy">
            <span class="verdict-pct">{{ res.bottleneckPercent }}%</span>
            <span class="verdict-text">{{ LIMIT_LABELS[res.limitedBy] }}</span>
          </div>

          <div class="bars">
            <div class="bar-row">
              <span class="bar-name">CPU</span>
              <div class="bar-track">
                <div
                  class="bar-fill cpu"
                  :class="{ limiter: res.limitedBy === 'cpu' }"
                  :style="{ width: barPct(res.cpuCeiling, res) + '%' }"
                ></div>
              </div>
              <span class="bar-value">{{ res.cpuCeiling }}</span>
            </div>
            <div class="bar-row">
              <span class="bar-name">GPU</span>
              <div class="bar-track">
                <div
                  class="bar-fill gpu"
                  :class="{ limiter: res.limitedBy === 'gpu' }"
                  :style="{ width: barPct(res.gpuCeiling, res) + '%' }"
                ></div>
              </div>
              <span class="bar-value">{{ res.gpuCeiling }}</span>
            </div>
          </div>
        </div>
      </div>

      <p class="res-note">
        As barras mostram o teto de FPS que cada peça sustenta sozinha — quem
        tem o menor teto dita o resultado.
      </p>

      <details class="method">
        <summary>Como esse cálculo é feito</summary>
        <p>
          Cada modelo de processador e placa de vídeo tem um índice de
          desempenho relativo em jogos (0 a 100), curado a partir de médias de
          benchmarks públicos. Desse índice sai o teto aproximado de FPS que a
          peça sustenta sozinha, e o gargalo é a diferença entre os dois tetos.
        </p>
        <p>
          O teto do processador é praticamente o mesmo nas três resoluções — a
          carga dele (lógica do jogo, física, draw calls) não depende da
          quantidade de pixels. Já o da placa de vídeo cai conforme a resolução
          sobe: na média das reviews, 1440p entrega cerca de 70% do FPS de
          1080p, e 4K cerca de 42%. Por isso o mesmo par costuma ter gargalo de
          processador em 1080p e de placa de vídeo em 4K.
        </p>
        <p class="disclaimer">
          É uma estimativa de tendência por modelo, não um teste real: o gargalo
          efetivo muda com o jogo, a engine, o preset gráfico e a memória usada.
        </p>
      </details>
    </section>
  </div>
</template>

<style scoped>
.bottleneck {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.intro {
  color: var(--text-dim);
  font-size: 0.9rem;
  margin: 0;
  text-align: center;
}

.pickers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.picker-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
}

.picker-title {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-dim);
  margin-bottom: 0.6rem;
}

.error-msg {
  color: var(--danger);
  font-size: 0.85rem;
  margin: 0;
}

.status-msg {
  color: var(--text-dim);
  font-size: 0.85rem;
  margin: 0;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.unmatched {
  background: rgba(210, 153, 34, 0.12);
  border: 1px solid var(--warn);
  color: var(--warn);
  padding: 0.6rem 0.9rem;
  border-radius: 8px;
  font-size: 0.85rem;
  margin: 0;
}

.res-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.res-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
}

.res-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.75rem;
}

.res-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-dim);
}

.res-fps {
  font-weight: 700;
  color: var(--accent);
}

.verdict {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  margin-bottom: 0.85rem;
}

.verdict.cpu {
  background: rgba(210, 153, 34, 0.12);
  border: 1px solid var(--warn);
  color: var(--warn);
}

.verdict.gpu {
  background: rgba(248, 81, 73, 0.12);
  border: 1px solid var(--danger);
  color: var(--danger);
}

.verdict.balanced {
  background: rgba(63, 185, 80, 0.12);
  border: 1px solid var(--accent-2);
  color: var(--accent-2);
}

.verdict-pct {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
}

.verdict-text {
  font-size: 0.8rem;
  font-weight: 600;
}

.bars {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bar-name {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-dim);
  width: 30px;
  flex-shrink: 0;
}

.bar-track {
  flex: 1;
  height: 10px;
  border-radius: 5px;
  background: var(--panel-alt);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 5px;
  background: var(--border);
  transition: width 0.3s ease;
}

.bar-fill.limiter.cpu {
  background: var(--warn);
}

.bar-fill.limiter.gpu {
  background: var(--danger);
}

.bar-fill:not(.limiter) {
  background: var(--accent-2);
}

.bar-value {
  font-size: 0.72rem;
  color: var(--text-dim);
  width: 34px;
  text-align: right;
  flex-shrink: 0;
}

.res-note {
  font-size: 0.78rem;
  color: var(--text-dim);
  line-height: 1.45;
  margin: 0;
  text-align: center;
}

.method {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.9rem 1.1rem;
}

.method summary {
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--accent);
  font-weight: 600;
}

.method p {
  font-size: 0.82rem;
  color: var(--text-dim);
  line-height: 1.55;
  margin: 0.75rem 0 0;
}

.method .disclaimer {
  color: var(--warn);
}
</style>
