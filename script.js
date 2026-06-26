"use strict";

const EPS = 1e-12;

const state = {
  tipo: "max",
  nVar: 2,
  nRest: 3,
  headers: [],
  tabela: null,
  iter: 0,
  finalizado: false,
  cOriginal: []
};

const els = {
  tipo: document.querySelector("#tipo"),
  nVar: document.querySelector("#nVar"),
  nRest: document.querySelector("#nRest"),
  messages: document.querySelector("#messages"),
  objectiveArea: document.querySelector("#objectiveArea"),
  constraintsArea: document.querySelector("#constraintsArea"),
  output: document.querySelector("#output"),
  btnGerar: document.querySelector("#btnGerar"),
  btnIniciar: document.querySelector("#btnIniciar"),
  btnProxima: document.querySelector("#btnProxima"),
  btnReiniciar: document.querySelector("#btnReiniciar")
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value, digits = 4) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  const clean = Math.abs(num) < 1e-10 ? 0 : num;
  return clean.toFixed(digits);
}

function parsePositiveInt(value, name) {
  if (value === "" || value === null || value === undefined) {
    throw new Error(`${name} vazio.`);
  }

  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 8) {
    throw new Error(`${name} deve ser um número inteiro de 1 a 8.`);
  }

  return num;
}

function parseRequiredNumber(value, label) {
  if (value === "" || value === null || value === undefined) {
    throw new Error(`${label} vazio.`);
  }

  const normalized = String(value).trim().replace(",", ".");
  const num = Number(normalized);
  if (!Number.isFinite(num)) {
    throw new Error(`${label} deve ser um número válido.`);
  }

  return num;
}

function setMessage(type, text) {
  els.messages.innerHTML = text
    ? `<div class="message ${type}">${escapeHtml(text)}</div>`
    : "";
}

function appendMessage(type, text) {
  const div = document.createElement("div");
  div.className = `message ${type}`;
  div.textContent = text;
  els.messages.appendChild(div);
}

function setOutput(html) {
  els.output.innerHTML = html;
  els.output.scrollTop = els.output.scrollHeight;
}

function resetState() {
  state.tipo = els.tipo.value;
  state.nVar = Number(els.nVar.value);
  state.nRest = Number(els.nRest.value);
  state.headers = [];
  state.tabela = null;
  state.iter = 0;
  state.finalizado = false;
  state.cOriginal = [];
}

function pivotar(tabela, linhaPivo, colunaPivo) {
  const pivo = tabela[linhaPivo][colunaPivo];
  tabela[linhaPivo] = tabela[linhaPivo].map((x) => x / pivo);

  for (let i = 0; i < tabela.length; i += 1) {
    if (i !== linhaPivo) {
      const fator = tabela[i][colunaPivo];
      tabela[i] = tabela[i].map((x, j) => x - fator * tabela[linhaPivo][j]);
    }
  }
}

function montarTableau(tipo, c, constraints, nVar, nRest) {
  const cRow = tipo === "max" ? c.map((ci) => -ci) : c.map((ci) => ci);
  const tabela = [];

  constraints.forEach(([coef, op, b], i) => {
    const linha = [...coef];

    for (let j = 0; j < nRest; j += 1) {
      if (j === i) {
        if (op === "<=") linha.push(1);
        else if (op === ">=") linha.push(-1);
        else if (op === "=") linha.push(0);
        else throw new Error(`Operador inválido: ${op}`);
      } else {
        linha.push(0);
      }
    }

    linha.push(Number(b));
    tabela.push(linha);
  });

  tabela.push([...cRow, ...Array(nRest).fill(0), 0]);

  const headers = [
    ...Array.from({ length: nVar }, (_, i) => `x${i + 1}`),
    ...Array.from({ length: nRest }, (_, i) => `f${i + 1}`),
    "b"
  ];

  return { tabela, headers };
}

function escolherPivo(tabela) {
  const ultima = tabela[tabela.length - 1].slice(0, -1);
  if (ultima.every((x) => x >= -EPS)) {
    return { linhaPivo: null, colunaPivo: null };
  }

  const minValue = Math.min(...ultima);
  const colunaPivo = ultima.indexOf(minValue);

  const razoes = tabela.slice(0, -1).map((linha) => {
    const a = linha[colunaPivo];
    return a > EPS ? linha[linha.length - 1] / a : Infinity;
  });

  if (razoes.every((r) => r === Infinity)) {
    throw new Error("Solução ilimitada: a coluna pivô não tem entradas positivas.");
  }

  return { linhaPivo: razoes.indexOf(Math.min(...razoes)), colunaPivo };
}

function extrairSolucao(tabela, nVar, nRest, cOriginal) {
  const totalVars = nVar + nRest;
  const resultado = Array(totalVars).fill(0);

  for (let j = 0; j < totalVars; j += 1) {
    const col = tabela.map((linha) => linha[j]);
    const colRound = col.map((v) => (Math.abs(v) < 1e-10 ? 0 : Number(v.toFixed(10))));
    const ones = colRound.filter((v) => v === 1).length;
    const zeros = colRound.filter((v) => v === 0).length;

    if (ones === 1 && zeros === tabela.length - 1) {
      const i1 = colRound.indexOf(1);
      resultado[j] = Number(tabela[i1][tabela[i1].length - 1]);
    }
  }

  const x = resultado.slice(0, nVar);
  const z = x.reduce((acc, val, i) => acc + Number(cOriginal[i]) * Number(val), 0);
  return { x, z };
}

function makeObjectiveTable(nVar) {
  const headers = Array.from({ length: nVar }, (_, i) => `<th>x${i + 1}</th>`).join("");
  const inputs = Array.from(
    { length: nVar },
    (_, i) => `<td><input class="obj-input" type="number" step="any" value="0" aria-label="Coeficiente x${i + 1} da função objetivo"></td>`
  ).join("");

  return `
    <table class="data-entry">
      <thead><tr>${headers}</tr></thead>
      <tbody><tr>${inputs}</tr></tbody>
    </table>
  `;
}

function makeConstraintsTable(nVar, nRest) {
  const varHeaders = Array.from({ length: nVar }, (_, i) => `<th>x${i + 1}</th>`).join("");
  const rows = Array.from({ length: nRest }, (_, r) => {
    const coefInputs = Array.from(
      { length: nVar },
      (_, i) => `<td><input class="rest-coef" data-row="${r}" data-var="${i}" type="number" step="any" value="0" aria-label="Restrição ${r + 1}, coeficiente x${i + 1}"></td>`
    ).join("");

    return `
      <tr>
        <th>R${r + 1}</th>
        ${coefInputs}
        <td>
          <select class="rest-sinal" data-row="${r}" aria-label="Restrição ${r + 1}, sinal">
            <option value="<=" selected>&lt;=</option>
            <option value=">=">&gt;=</option>
            <option value="=">=</option>
          </select>
        </td>
        <td><input class="rest-b" data-row="${r}" type="number" step="any" value="0" aria-label="Restrição ${r + 1}, termo b"></td>
      </tr>
    `;
  }).join("");

  return `
    <table class="data-entry">
      <thead>
        <tr><th>Restrição</th>${varHeaders}<th>Sinal</th><th>b</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function gerarTabelas() {
  try {
    const nVar = parsePositiveInt(els.nVar.value, "Número de variáveis");
    const nRest = parsePositiveInt(els.nRest.value, "Número de restrições");

    els.objectiveArea.innerHTML = makeObjectiveTable(nVar);
    els.constraintsArea.innerHTML = makeConstraintsTable(nVar, nRest);
    resetState();
    state.nVar = nVar;
    state.nRest = nRest;

    setMessage("success", `Grade criada: ${nVar} variáveis e ${nRest} restrições.`);
    setOutput('<p class="empty-state">Preencha os coeficientes e clique em <strong>Iniciar</strong>.</p>');
  } catch (error) {
    setMessage("error", error.message);
  }
}

function readInputs() {
  const nVar = parsePositiveInt(els.nVar.value, "Número de variáveis");
  const nRest = parsePositiveInt(els.nRest.value, "Número de restrições");

  const objInputs = [...document.querySelectorAll(".obj-input")];
  const constraintRows = [...document.querySelectorAll(".rest-b")];
  if (objInputs.length !== nVar || constraintRows.length !== nRest) {
    throw new Error("Clique em Gerar campos para atualizar a grade antes de iniciar.");
  }

  const c = objInputs.map((input, i) => parseRequiredNumber(input.value, `Função objetivo: coeficiente de x${i + 1}`));
  const constraints = [];

  for (let r = 0; r < nRest; r += 1) {
    const coef = [];
    for (let i = 0; i < nVar; i += 1) {
      const input = document.querySelector(`.rest-coef[data-row="${r}"][data-var="${i}"]`);
      coef.push(parseRequiredNumber(input.value, `Restrição ${r + 1}: coeficiente x${i + 1}`));
    }

    const sinal = document.querySelector(`.rest-sinal[data-row="${r}"]`).value;
    if (!["<=", ">=", "="].includes(sinal)) {
      throw new Error(`Restrição ${r + 1}: sinal inválido. Use <=, >= ou =.`);
    }

    const bInput = document.querySelector(`.rest-b[data-row="${r}"]`);
    const b = parseRequiredNumber(bInput.value, `Restrição ${r + 1}: b`);
    constraints.push([coef, sinal, b]);
  }

  return { tipo: els.tipo.value, nVar, nRest, c, constraints };
}

function htmlTable(tabela, headers, linhaPivo = null, colunaPivo = null, title = "") {
  const head = headers.map((h, j) => `<th class="${j === colunaPivo ? "pivot-column" : ""}">${escapeHtml(h)}</th>`).join("");
  const body = tabela.map((linha, i) => {
    const cells = linha.map((value, j) => {
      const classes = [
        j === colunaPivo ? "pivot-column" : "",
        i === linhaPivo && j === colunaPivo ? "pivot-cell" : ""
      ].filter(Boolean).join(" ");
      return `<td class="${classes}">${formatNumber(value)}</td>`;
    }).join("");
    return `<tr>${cells}</tr>`;
  }).join("");

  return `
    <div class="table-card">
      ${title ? `<h3>${escapeHtml(title)}</h3>` : ""}
      <table class="simplex-table">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function gerarAvisoDidatico(constraints) {
  const precisaAviso = constraints.some(([, op]) => op === ">=" || op === "=");
  if (!precisaAviso) return "";

  return `
    <div class="message warning">
      <strong>Aviso didático:</strong> restrições com &gt;= ou = normalmente exigem Big-M ou Duas Fases
      para obter uma base inicial. Esta versão usa tableau simples e pode falhar em alguns casos.
    </div>
  `;
}

function iniciar() {
  try {
    const { tipo, nVar, nRest, c, constraints } = readInputs();
    const { tabela, headers } = montarTableau(tipo, c, constraints, nVar, nRest);

    state.tipo = tipo;
    state.nVar = nVar;
    state.nRest = nRest;
    state.headers = headers;
    state.tabela = tabela;
    state.iter = 0;
    state.finalizado = false;
    state.cOriginal = c;

    els.messages.innerHTML = "";
    if (constraints.some(([, op]) => op === ">=" || op === "=")) {
      appendMessage(
        "warning",
        "Aviso didático: >= e = normalmente exigem Big-M ou Duas Fases para base inicial. Esta versão usa tableau simples."
      );
    }

    const html = `
      ${gerarAvisoDidatico(constraints)}
      ${htmlTable(tabela, headers, null, null, "Tabela inicial (Iteração 0)")}
      <p class="empty-state">Clique em <strong>Próxima iteração</strong>.</p>
    `;
    setOutput(html);
  } catch (error) {
    setMessage("error", error.message);
  }
}

function proximaIteracao() {
  try {
    if (!state.tabela) {
      throw new Error("Primeiro clique em Iniciar.");
    }

    if (state.finalizado) {
      setOutput('<div class="message success">Já está ótimo. Clique em <strong>Reiniciar</strong> para começar novamente.</div>');
      return;
    }

    const { linhaPivo, colunaPivo } = escolherPivo(state.tabela);
    if (linhaPivo === null) {
      const { x, z } = extrairSolucao(state.tabela, state.nVar, state.nRest, state.cOriginal);
      state.finalizado = true;

      const values = x.map((val, i) => `<li>x${i + 1} = <strong>${formatNumber(val)}</strong></li>`).join("");
      const html = `
        ${htmlTable(state.tabela, state.headers, null, null, "Ótimo encontrado")}
        <h3>Resultado final</h3>
        <ul class="result-list">${values}</ul>
        <p class="final-z"><strong>Valor ótimo (Z): ${formatNumber(z)}</strong></p>
      `;
      setOutput(html);
      setMessage("success", "Ótimo encontrado.");
      return;
    }

    state.iter += 1;
    const pivoVal = state.tabela[linhaPivo][colunaPivo];
    const antes = state.tabela.map((linha) => [...linha]);
    pivotar(state.tabela, linhaPivo, colunaPivo);

    const html = `
      <div class="iteration-note">
        <strong>Iteração ${state.iter}</strong><br>
        Coluna pivô: <strong>${escapeHtml(state.headers[colunaPivo])}</strong>
        | Linha pivô: <strong>${linhaPivo + 1}</strong>
        | Pivô: <strong>${formatNumber(pivoVal, 6)}</strong>
      </div>
      ${htmlTable(antes, state.headers, linhaPivo, colunaPivo, "Tableau antes do pivoteamento")}
      ${htmlTable(state.tabela, state.headers, linhaPivo, colunaPivo, "Tableau depois do pivoteamento")}
      <p class="empty-state">Clique em <strong>Próxima iteração</strong> novamente.</p>
    `;

    setMessage("", "");
    setOutput(html);
  } catch (error) {
    setMessage("error", error.message);
  }
}

function reiniciar() {
  gerarTabelas();
  resetState();
  setMessage("success", "Reiniciado.");
}

els.btnGerar.addEventListener("click", gerarTabelas);
els.btnIniciar.addEventListener("click", iniciar);
els.btnProxima.addEventListener("click", proximaIteracao);
els.btnReiniciar.addEventListener("click", reiniciar);

gerarTabelas();
