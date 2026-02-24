const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbzD7tsKOasJUNiXPlHaP3Sv9CXAKibAFNvhCiVgqyiaTjRj0m-ko1MFNkDr9qfq0PZE/exec"; 

let empresas = [];
let funcionarios = [];
const valorBonusBase = 200.00;

// Navegação entre telas
function navegar(idTela) {
    document.querySelectorAll('.tela').forEach(t => {
        t.style.display = 'none';
        t.classList.remove('active');
    });
    const telaDestino = document.getElementById(idTela);
    if (telaDestino) {
        telaDestino.style.display = 'block';
        telaDestino.classList.add('active');
    }
    if(idTela === 'tela-pagamentos' || idTela === 'tela-bonificados') calcularTudo();
}

// Carregar dados iniciais
async function carregarDadosIniciais() {
    try {
        const response = await fetch(URL_GOOGLE_SCRIPT);
        const data = await response.json();
        if (data) {
            funcionarios = data.funcionarios || [];
            empresas = data.empresas || [];
            atualizarTabelaEmpresas();
            renderizarCadastro();
        }
    } catch (e) { console.error("Erro ao carregar dados iniciais"); }
}

// --- FUNÇÕES DE EMPRESAS ---

function importarEmpresas() {
    const raw = document.getElementById('colar-empresas').value;
    if (!raw.trim()) return;
    const linhas = raw.split('\n');
    linhas.forEach(linha => {
        const colunas = linha.split('\t');
        if(colunas.length >= 2) {
            let v = colunas[1].replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
            empresas.push({ nome: colunas[0].trim(), valor: parseFloat(v) || 0 });
        }
    });
    atualizarTabelaEmpresas();
    salvarNoGoogle('salvarEmpresas', empresas);
    document.getElementById('colar-empresas').value = '';
}

function editarEmpresa(index) {
    const emp = empresas[index];
    const novoNome = prompt("Novo nome da empresa:", emp.nome);
    const novoValor = prompt("Novo valor (use ponto para decimais):", emp.valor);

    if (novoNome !== null && novoValor !== null) {
        empresas[index].nome = novoNome;
        empresas[index].valor = parseFloat(novoValor) || 0;
        atualizarTabelaEmpresas();
        salvarNoGoogle('salvarEmpresas', empresas);
    }
}

function removerEmpresa(index) {
    if(confirm("Excluir empresa?")) {
        empresas.splice(index, 1);
        atualizarTabelaEmpresas();
        salvarNoGoogle('salvarEmpresas', empresas);
    }
}

function atualizarTabelaEmpresas() {
    const tb = document.querySelector('#tabela-empresas tbody');
    tb.innerHTML = '';
    let t = 0;
    empresas.forEach((e, i) => {
        t += e.valor;
        tb.innerHTML += `<tr>
            <td>${e.nome}</td>
            <td>R$ ${e.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td>
                <button onclick="editarEmpresa(${i})" style="background:#f0ad4e">Editar</button>
                <button onclick="removerEmpresa(${i})" style="background:#d9534f">Excluir</button>
            </td>
        </tr>`;
    });
    document.getElementById('total-arrecadado').innerText = "R$ " + t.toLocaleString('pt-BR', {minimumFractionDigits: 2});
}

// --- FUNÇÕES DE FUNCIONÁRIOS ---

function importarFuncionarios() {
    const raw = document.getElementById('colar-funcionarios').value;
    if (!raw.trim()) return;
    const linhas = raw.split('\n');
    linhas.forEach(linha => {
        const cols = linha.split('\t');
        if(cols.length >= 4) {
            funcionarios.push({
                Matriculas: cols[0].trim(),
                Nome: cols[1].trim(),
                Dias: cols[2].trim(),
                Setor: cols[3].trim(),
                Bonificados: (cols[4] && cols[4].trim().toLowerCase() === 'sim') ? "Sim" : "No"
            });
        }
    });
    renderizarCadastro();
    salvarNoGoogle('salvarTodosFuncionarios', funcionarios);
    document.getElementById('colar-funcionarios').value = '';
}

function editarFuncionario(index) {
    const f = funcionarios[index];
    const novoNome = prompt("Novo nome:", f.Nome);
    const novosDias = prompt("Novos dias trabalhados:", f.Dias);
    const novoSetor = prompt("Novo setor:", f.Setor);
    const bônus = confirm("Este funcionário é bonificado (R$ 200)? OK para Sim, Cancelar para Não.");

    if (novoNome !== null && novosDias !== null) {
        funcionarios[index].Nome = novoNome;
        funcionarios[index].Dias = novosDias;
        funcionarios[index].Setor = novoSetor;
        funcionarios[index].Bonificados = bônus ? "Sim" : "No";
        renderizarCadastro();
        salvarNoGoogle('salvarTodosFuncionarios', funcionarios);
    }
}

function removerFuncionario(index) {
    if(confirm("Excluir funcionário?")) {
        funcionarios.splice(index, 1);
        renderizarCadastro();
        salvarNoGoogle('salvarTodosFuncionarios', funcionarios);
    }
}

function renderizarCadastro() {
    const tb = document.querySelector('#tabela-cadastro-lista tbody');
    tb.innerHTML = '';
    funcionarios.forEach((f, i) => {
        tb.innerHTML += `<tr>
            <td>${f.Matriculas}</td>
            <td>${f.Nome}</td>
            <td>${f.Dias}</td>
            <td>${f.Setor}</td>
            <td>${f.Bonificados}</td>
            <td>
                <button onclick="editarFuncionario(${i})" style="background:#f0ad4e">Editar</button>
                <button onclick="removerFuncionario(${i})" style="background:#d9534f">Excluir</button>
            </td>
        </tr>`;
    });
}

// --- CÁLCULO E PERSISTÊNCIA ---

function calcularTudo() {
    const totalArrecadado = empresas.reduce((acc, e) => acc + (parseFloat(e.valor) || 0), 0);
    const totalDias = funcionarios.reduce((acc, f) => acc + (parseFloat(f.Dias) || 0), 0);
    const bonificados = funcionarios.filter(f => f.Bonificados === "Sim");
    
    const custoTotalBonus = bonificados.length * valorBonusBase;
    const montanteRestante = totalArrecadado - custoTotalBonus;
    const valorDia = totalDias > 0 ? montanteRestante / totalDias : 0;

    document.getElementById('resumo-total').innerText = "R$ " + totalArrecadado.toLocaleString('pt-BR', {minimumFractionDigits: 2});
    document.getElementById('resumo-dias').innerText = totalDias;
    document.getElementById('resumo-valor-dia').innerText = "R$ " + valorDia.toLocaleString('pt-BR', {minimumFractionDigits: 4});

    renderizarRelatorios(valorDia);
}

function renderizarRelatorios(valorDia) {
    const tbodyRateio = document.querySelector('#tabela-rateio tbody');
    const tbodyBonif = document.querySelector('#tabela-bonificados tbody');
    tbodyRateio.innerHTML = ''; tbodyBonif.innerHTML = '';

    funcionarios.forEach(f => {
        const dias = parseFloat(f.Dias) || 0;
        const eBonif = f.Bonificados === "Sim";
        const valorFinal = (dias * valorDia) + (eBonif ? valorBonusBase : 0);

        tbodyRateio.innerHTML += `<tr><td>${f.Matriculas}</td><td>${f.Nome}</td><td>${f.Setor}</td><td>${dias}</td><td><strong>R$ ${valorFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong></td></tr>`;
        if(eBonif) {
            tbodyBonif.innerHTML += `<tr><td>${f.Matriculas}</td><td>${f.Nome}</td><td>${f.Setor}</td><td>${dias}</td><td>R$ ${valorBonusBase.toLocaleString('pt-BR')}</td></tr>`;
        }
    });
}

async function salvarNoGoogle(acao, dados) {
    try {
        await fetch(URL_GOOGLE_SCRIPT, { method: 'POST', body: JSON.stringify({ acao, dados }) });
    } catch (e) { console.error("Erro ao salvar"); }
}

window.onload = () => { carregarDadosIniciais(); navegar('tela-menu'); };
