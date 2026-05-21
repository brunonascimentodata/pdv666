import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

let currentUser = null;
let vendas = [];
let custos = [];
let editandoId = null;
let editandoTipo = null;

const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginError = document.getElementById("loginError");
const userEmail = document.getElementById("userEmail");

const homeArea = document.getElementById("homeArea");
const contentArea = document.getElementById("contentArea");
const contentTitle = document.getElementById("contentTitle");
const contentBody = document.getElementById("contentBody");
const backHomeBtn = document.getElementById("backHomeBtn");

const totalVendasEl = document.getElementById("totalVendas");
const totalCustosEl = document.getElementById("totalCustos");
const resultadoFinalEl = document.getElementById("resultadoFinal");

loginBtn.addEventListener("click", loginUser);

passwordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loginUser();
});

async function loginUser() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  loginError.textContent = "";

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("ERRO FIREBASE:", error.code, error.message);
    loginError.textContent = `${error.code} - ${error.message}`;
  }
}

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    userEmail.textContent = user.email;

    carregarVendas();
    carregarCustos();
  } else {
    currentUser = null;
    loginScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
  }
});

document.getElementById("vendasCard").addEventListener("click", abrirVendas);
document.getElementById("custosCard").addEventListener("click", abrirCustos);
document.getElementById("resultadoCard").addEventListener("click", abrirResultado);

backHomeBtn.addEventListener("click", () => {
  contentArea.classList.add("hidden");
  homeArea.classList.remove("hidden");
  editandoId = null;
  editandoTipo = null;
});

function abrirTela(titulo, html) {
  contentTitle.textContent = titulo;
  contentBody.innerHTML = html;
  homeArea.classList.add("hidden");
  contentArea.classList.remove("hidden");
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarNumeroBR(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function numero(valor) {
  if (valor === null || valor === undefined) return 0;

  return Number(
    String(valor)
      .replace("R$", "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim()
  ) || 0;
}

function dataHoje() {
  return new Date().toISOString().split("T")[0];
}

function normalizarData(data) {
  if (!data) return dataHoje();

  const texto = String(data).trim().toLowerCase();

  const meses = {
    jan: "01",
    fev: "02",
    mar: "03",
    abr: "04",
    mai: "05",
    jun: "06",
    jul: "07",
    ago: "08",
    set: "09",
    out: "10",
    nov: "11",
    dez: "12"
  };

  if (texto.includes("/")) {
    const partes = texto.split("/");

    if (partes.length === 3) {
      const dia = partes[0].padStart(2, "0");
      const mes = partes[1].padStart(2, "0");
      const ano = partes[2].length === 2 ? `20${partes[2]}` : partes[2];
      return `${ano}-${mes}-${dia}`;
    }

    if (partes.length === 2) {
      const dia = partes[0].padStart(2, "0");
      const mesTexto = partes[1].substring(0, 3);
      const mes = meses[mesTexto] || partes[1].padStart(2, "0");
      return `2026-${mes}-${dia}`;
    }
  }

  return texto;
}

function formatarDataBR(dataISO) {
  if (!dataISO) return "-";

  const partes = String(dataISO).split("-");

  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  return dataISO;
}

function lerCSV(file, callback) {
  const reader = new FileReader();

  reader.onload = (event) => {
    const texto = event.target.result;
    const linhas = texto
      .split(/\r?\n/)
      .map(linha => linha.trim())
      .filter(Boolean);

    callback(linhas);
  };

  reader.readAsText(file, "UTF-8");
}

function separarCSV(linha) {
  return linha.split(";").map(campo => campo.trim());
}

/* VENDAS */

function abrirVendas() {
  abrirTela("Vendas", `
    <div class="import-box">
      <h3>Importar vendas por CSV</h3>
      <p>Formato esperado: Data;Item;Tam;Qnt;Valor;Valor Total</p>
      <input id="vendasCsv" type="file" accept=".csv" />
      <button class="secondary-btn" id="importarVendasBtn">Importar vendas</button>
    </div>

    <form id="vendaForm">
      <div class="form-grid">
        <div>
          <label>Data</label>
          <input id="vendaData" type="date" required />
        </div>

        <div>
          <label>Tamanho</label>
          <input id="vendaTam" type="text" placeholder="P, M, G, GG, XG" />
        </div>

        <div>
          <label>Quantidade</label>
          <input id="vendaQnt" type="number" min="1" value="1" required />
        </div>

        <div>
          <label>Valor unitário</label>
          <input id="vendaValor" type="text" inputmode="decimal" placeholder="Ex: 60,00" required />
        </div>

        <div class="full">
          <label>Item</label>
          <input id="vendaItem" type="text" placeholder="Nome do produto" required />
        </div>

        <div class="full">
          <label>Observação</label>
          <input id="vendaObs" type="text" placeholder="Opcional" />
        </div>
      </div>

      <button class="primary-btn" type="submit" id="vendaSubmit">Salvar venda</button>
    </form>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Item</th>
            <th>TAM</th>
            <th>Qnt</th>
            <th>Valor</th>
            <th>Total</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody id="vendasTable"></tbody>
      </table>
    </div>
  `);

  document.getElementById("vendaData").value = dataHoje();
  document.getElementById("vendaForm").addEventListener("submit", salvarVenda);
  document.getElementById("importarVendasBtn").addEventListener("click", importarVendasCSV);

  renderVendas();
}

async function salvarVenda(event) {
  event.preventDefault();

  const qnt = numero(document.getElementById("vendaQnt").value);
  const valor = numero(document.getElementById("vendaValor").value);

  const venda = {
    data: document.getElementById("vendaData").value,
    item: document.getElementById("vendaItem").value.trim(),
    tam: document.getElementById("vendaTam").value.trim(),
    qnt,
    valor,
    total: qnt * valor,
    obs: document.getElementById("vendaObs").value.trim(),
    criadoEm: new Date().toISOString()
  };

  if (editandoId && editandoTipo === "venda") {
    await updateDoc(doc(db, "users", currentUser.uid, "vendas", editandoId), venda);
    editandoId = null;
    editandoTipo = null;
  } else {
    await addDoc(collection(db, "users", currentUser.uid, "vendas"), venda);
  }

  abrirVendas();
}

async function importarVendasCSV() {
  const input = document.getElementById("vendasCsv");
  const file = input.files[0];

  if (!file) {
    alert("Selecione um arquivo CSV de vendas.");
    return;
  }

  lerCSV(file, async (linhas) => {
    const cabecalho = linhas[0].toLowerCase();
    const dados = cabecalho.includes("data") ? linhas.slice(1) : linhas;

    let importadas = 0;

    for (const linha of dados) {
      const [data, item, tam, qnt, valor, valorTotal] = separarCSV(linha);

      if (!data || !item) continue;

      const quantidade = numero(qnt);
      const valorUnitario = numero(valor);
      const total = valorTotal ? numero(valorTotal) : quantidade * valorUnitario;

      await addDoc(collection(db, "users", currentUser.uid, "vendas"), {
        data: normalizarData(data),
        item: item || "-",
        tam: tam || "-",
        qnt: quantidade,
        valor: valorUnitario,
        total,
        obs: "Importado via CSV",
        criadoEm: new Date().toISOString()
      });

      importadas++;
    }

    alert(`${importadas} vendas importadas com sucesso.`);
  });
}

function renderVendas() {
  const tbody = document.getElementById("vendasTable");
  if (!tbody) return;

  tbody.innerHTML = vendas.map(v => `
    <tr>
      <td>${formatarDataBR(v.data)}</td>
      <td>${v.item || "-"}</td>
      <td>${v.tam || "-"}</td>
      <td>${v.qnt || 0}</td>
      <td>${formatarMoeda(v.valor)}</td>
      <td>${formatarMoeda(v.total)}</td>
      <td>
        <div class="actions">
          <button class="edit-btn" onclick="editarVenda('${v.id}')">Editar</button>
          <button class="danger-btn" onclick="excluirVenda('${v.id}')">Excluir</button>
        </div>
      </td>
    </tr>
  `).join("");
}

window.editarVenda = function(id) {
  const venda = vendas.find(v => v.id === id);
  if (!venda) return;

  editandoId = id;
  editandoTipo = "venda";

  abrirVendas();

  document.getElementById("vendaData").value = venda.data || "";
  document.getElementById("vendaItem").value = venda.item || "";
  document.getElementById("vendaTam").value = venda.tam || "";
  document.getElementById("vendaQnt").value = venda.qnt || 1;
  document.getElementById("vendaValor").value = formatarNumeroBR(venda.valor);
  document.getElementById("vendaObs").value = venda.obs || "";
  document.getElementById("vendaSubmit").textContent = "Atualizar venda";
};

window.excluirVenda = async function(id) {
  if (!confirm("Deseja excluir esta venda?")) return;
  await deleteDoc(doc(db, "users", currentUser.uid, "vendas", id));
};

/* CUSTOS */

function abrirCustos() {
  abrirTela("Custos", `
    <div class="import-box">
      <h3>Importar custos por CSV</h3>
      <p>Formato esperado: Data;Nome;Valor</p>
      <input id="custosCsv" type="file" accept=".csv" />
      <button class="secondary-btn" id="importarCustosBtn">Importar custos</button>
    </div>

    <form id="custoForm">
      <div class="form-grid">
        <div>
          <label>Data</label>
          <input id="custoData" type="date" required />
        </div>

        <div>
          <label>Nome</label>
          <input id="custoNome" type="text" placeholder="Fornecedor ou descrição" required />
        </div>

        <div>
          <label>Valor</label>
          <input id="custoValor" type="text" inputmode="decimal" placeholder="Ex: 299,94" required />
        </div>

        <div>
          <label>Status</label>
          <select id="custoStatus">
            <option value="Pago">Pago</option>
            <option value="Pendente">Pendente</option>
          </select>
        </div>

        <div class="full">
          <label>Observação</label>
          <input id="custoObs" type="text" placeholder="Opcional" />
        </div>
      </div>

      <button class="primary-btn" type="submit" id="custoSubmit">Salvar custo</button>
    </form>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Nome</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Observação</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody id="custosTable"></tbody>
      </table>
    </div>
  `);

  document.getElementById("custoData").value = dataHoje();
  document.getElementById("custoForm").addEventListener("submit", salvarCusto);
  document.getElementById("importarCustosBtn").addEventListener("click", importarCustosCSV);

  renderCustos();
}

async function salvarCusto(event) {
  event.preventDefault();

  const custo = {
    data: document.getElementById("custoData").value,
    nome: document.getElementById("custoNome").value.trim(),
    valor: numero(document.getElementById("custoValor").value),
    status: document.getElementById("custoStatus").value,
    obs: document.getElementById("custoObs").value.trim(),
    criadoEm: new Date().toISOString()
  };

  if (editandoId && editandoTipo === "custo") {
    await updateDoc(doc(db, "users", currentUser.uid, "custos", editandoId), custo);
    editandoId = null;
    editandoTipo = null;
  } else {
    await addDoc(collection(db, "users", currentUser.uid, "custos"), custo);
  }

  abrirCustos();
}

async function importarCustosCSV() {
  const input = document.getElementById("custosCsv");
  const file = input.files[0];

  if (!file) {
    alert("Selecione um arquivo CSV de custos.");
    return;
  }

  lerCSV(file, async (linhas) => {
    const cabecalho = linhas[0].toLowerCase();
    const dados = cabecalho.includes("data") ? linhas.slice(1) : linhas;

    let importadas = 0;

    for (const linha of dados) {
      const [data, nome, valor] = separarCSV(linha);

      if (!data || !nome) continue;

      await addDoc(collection(db, "users", currentUser.uid, "custos"), {
        data: normalizarData(data),
        nome: nome || "-",
        valor: numero(valor),
        status: "Pago",
        obs: "Importado via CSV",
        criadoEm: new Date().toISOString()
      });

      importadas++;
    }

    alert(`${importadas} custos importados com sucesso.`);
  });
}

function renderCustos() {
  const tbody = document.getElementById("custosTable");
  if (!tbody) return;

  tbody.innerHTML = custos.map(c => `
    <tr>
      <td>${formatarDataBR(c.data)}</td>
      <td>${c.nome || "-"}</td>
      <td>${formatarMoeda(c.valor)}</td>
      <td>${c.status || "-"}</td>
      <td>${c.obs || "-"}</td>
      <td>
        <div class="actions">
          <button class="edit-btn" onclick="editarCusto('${c.id}')">Editar</button>
          <button class="danger-btn" onclick="excluirCusto('${c.id}')">Excluir</button>
        </div>
      </td>
    </tr>
  `).join("");
}

window.editarCusto = function(id) {
  const custo = custos.find(c => c.id === id);
  if (!custo) return;

  editandoId = id;
  editandoTipo = "custo";

  abrirCustos();

  document.getElementById("custoData").value = custo.data || "";
  document.getElementById("custoNome").value = custo.nome || "";
  document.getElementById("custoValor").value = formatarNumeroBR(custo.valor);
  document.getElementById("custoStatus").value = custo.status || "Pago";
  document.getElementById("custoObs").value = custo.obs || "";
  document.getElementById("custoSubmit").textContent = "Atualizar custo";
};

window.excluirCusto = async function(id) {
  if (!confirm("Deseja excluir este custo?")) return;
  await deleteDoc(doc(db, "users", currentUser.uid, "custos", id));
};

/* RESULTADO */

function abrirResultado() {
  const meses = {};

  vendas.forEach(venda => {
    const chave = obterMesAno(venda.data);

    if (!meses[chave]) {
      meses[chave] = {
        mes: chave,
        vendas: 0,
        custos: 0,
        lucro: 0,
        margem: 0
      };
    }

    meses[chave].vendas += Number(venda.total || 0);
  });

  custos.forEach(custo => {
    const chave = obterMesAno(custo.data);

    if (!meses[chave]) {
      meses[chave] = {
        mes: chave,
        vendas: 0,
        custos: 0,
        lucro: 0,
        margem: 0
      };
    }

    meses[chave].custos += Number(custo.valor || 0);
  });

  const dadosMensais = Object.values(meses)
    .map(item => {
      item.lucro = item.vendas - item.custos;
      item.margem = item.vendas > 0 ? (item.lucro / item.vendas) * 100 : 0;
      return item;
    })
    .sort((a, b) => ordenarMes(a.mes) - ordenarMes(b.mes));

  const melhorMes = [...dadosMensais].sort((a, b) => b.lucro - a.lucro)[0];
  const piorMes = [...dadosMensais].sort((a, b) => a.lucro - b.lucro)[0];

  const totalVendas = dadosMensais.reduce((soma, item) => soma + item.vendas, 0);
  const totalCustos = dadosMensais.reduce((soma, item) => soma + item.custos, 0);
  const lucroTotal = totalVendas - totalCustos;
  const margemTotal = totalVendas > 0 ? (lucroTotal / totalVendas) * 100 : 0;

  abrirTela("Resultado financeiro", `
    <section class="summary-grid">
      <div class="summary-card">
        <span>Total de vendas</span>
        <strong>${formatarMoeda(totalVendas)}</strong>
      </div>

      <div class="summary-card">
        <span>Total de custos</span>
        <strong>${formatarMoeda(totalCustos)}</strong>
      </div>

      <div class="summary-card result">
        <span>Lucro / Resultado</span>
        <strong>${formatarMoeda(lucroTotal)}</strong>
      </div>

      <div class="summary-card">
        <span>Margem geral</span>
        <strong>${margemTotal.toFixed(1)}%</strong>
      </div>

      <div class="summary-card">
        <span>Melhor mês</span>
        <strong>${melhorMes ? melhorMes.mes : "-"}</strong>
        <small>${melhorMes ? formatarMoeda(melhorMes.lucro) : ""}</small>
      </div>

      <div class="summary-card">
        <span>Pior mês</span>
        <strong>${piorMes ? piorMes.mes : "-"}</strong>
        <small>${piorMes ? formatarMoeda(piorMes.lucro) : ""}</small>
      </div>
    </section>

    <section class="chart-box">
      <h3>Vendas, custos e lucro por mês</h3>
      <canvas id="resultadoChart"></canvas>
    </section>

    <section class="chart-box">
      <h3>Margem percentual por mês</h3>
      <canvas id="margemChart"></canvas>
    </section>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Mês</th>
            <th>Vendas</th>
            <th>Custos</th>
            <th>Lucro</th>
            <th>Margem</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${dadosMensais.map(item => `
            <tr>
              <td>${item.mes}</td>
              <td>${formatarMoeda(item.vendas)}</td>
              <td>${formatarMoeda(item.custos)}</td>
              <td>${formatarMoeda(item.lucro)}</td>
              <td>${item.margem.toFixed(1)}%</td>
              <td>${classificarMes(item)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `);

  criarGraficosResultado(dadosMensais);
}

  abrirTela("Resultado financeiro", `
    <section class="summary-grid">
      <div class="summary-card">
        <span>Total de vendas</span>
        <strong>${formatarMoeda(totalVendas)}</strong>
      </div>

      <div class="summary-card">
        <span>Total de custos</span>
        <strong>${formatarMoeda(totalCustos)}</strong>
      </div>

      <div class="summary-card result">
        <span>Resultado</span>
        <strong>${formatarMoeda(resultado)}</strong>
      </div>
    </section>
  `);
function obterMesAno(data) {
  if (!data) return "Sem data";

  const partes = String(data).split("-");

  if (partes.length === 3) {
    const ano = partes[0];
    const mes = partes[1];

    const nomes = {
      "01": "Jan",
      "02": "Fev",
      "03": "Mar",
      "04": "Abr",
      "05": "Mai",
      "06": "Jun",
      "07": "Jul",
      "08": "Ago",
      "09": "Set",
      "10": "Out",
      "11": "Nov",
      "12": "Dez"
    };

    return `${nomes[mes]}/${ano}`;
  }

  return data;
}

function ordenarMes(mesAno) {
  const mapa = {
    Jan: 1,
    Fev: 2,
    Mar: 3,
    Abr: 4,
    Mai: 5,
    Jun: 6,
    Jul: 7,
    Ago: 8,
    Set: 9,
    Out: 10,
    Nov: 11,
    Dez: 12
  };

  const [mes, ano] = mesAno.split("/");
  return Number(ano) * 100 + (mapa[mes] || 0);
}

function classificarMes(item) {
  if (item.vendas === 0 && item.custos > 0) return "Só custos";
  if (item.lucro < 0) return "Prejuízo";
  if (item.margem >= 50) return "Excelente";
  if (item.margem >= 30) return "Bom";
  if (item.margem >= 10) return "Atenção";
  return "Baixa margem";
}

function criarGraficosResultado(dadosMensais) {
  const labels = dadosMensais.map(item => item.mes);

  const vendasData = dadosMensais.map(item => item.vendas);
  const custosData = dadosMensais.map(item => item.custos);
  const lucroData = dadosMensais.map(item => item.lucro);
  const margemData = dadosMensais.map(item => item.margem);

  new Chart(document.getElementById("resultadoChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Vendas",
          data: vendasData
        },
        {
          label: "Custos",
          data: custosData
        },
        {
          label: "Lucro",
          data: lucroData
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: "#fff"
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#fff"
          }
        },
        y: {
          ticks: {
            color: "#fff"
          }
        }
      }
    }
  });

  new Chart(document.getElementById("margemChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Margem %",
          data: margemData,
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: "#fff"
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#fff"
          }
        },
        y: {
          ticks: {
            color: "#fff",
            callback: value => `${value}%`
          }
        }
      }
    }
  });
}

/* FIREBASE */

function carregarVendas() {
  const vendasRef = collection(db, "users", currentUser.uid, "vendas");
  const q = query(vendasRef, orderBy("data", "desc"));

  onSnapshot(q, (snapshot) => {
    vendas = snapshot.docs.map(docItem => ({
      id: docItem.id,
      ...docItem.data()
    }));

    renderVendas();
    atualizarResumo();
  });
}

function carregarCustos() {
  const custosRef = collection(db, "users", currentUser.uid, "custos");
  const q = query(custosRef, orderBy("data", "desc"));

  onSnapshot(q, (snapshot) => {
    custos = snapshot.docs.map(docItem => ({
      id: docItem.id,
      ...docItem.data()
    }));

    renderCustos();
    atualizarResumo();
  });
}

function atualizarResumo() {
  const totalVendas = vendas.reduce((soma, item) => soma + Number(item.total || 0), 0);
  const totalCustos = custos.reduce((soma, item) => soma + Number(item.valor || 0), 0);
  const resultado = totalVendas - totalCustos;

  totalVendasEl.textContent = formatarMoeda(totalVendas);
  totalCustosEl.textContent = formatarMoeda(totalCustos);
  resultadoFinalEl.textContent = formatarMoeda(resultado);
}