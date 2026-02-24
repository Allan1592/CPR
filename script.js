const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbwb7Z4nNU6RqJktWIB4xGzaUGSLqkI4Rfrag7pvuH1cGge-qndb6MmGYfec-qnwHDzm/exec"; 

let empresas = [];
let funcionarios = [];
const valorBonusBase = 200.00;

// --- FUNÇÃO DE NAVEGAÇÃO ---
function navegar(idTela) {
    const telas = document.querySelectorAll('.tela');
    telas.forEach(t => {
        t.style.display = 'none';
        t.classList.remove('active');
    });
    
    const telaDestino = document.getElementById(idTela);
    if (telaDestino) {
        telaDestino.style.display = 'block';
        telaDestino.classList.add('active');
    }

    if(idTela === 'tela-pagamentos') {
        calcularTudo();
    }
}

// --- BUSCA INICIAL ---
async function carregarDadosIniciais() {
    if (URL_GOOGLE_SCRIPT.includes("COLE_AQUI")) return;
    try {
        const response = await fetch(URL_GOOGLE_SCRIPT);
        const data = await response.json();
        if (data) {
            funcionarios = data.funcionarios || [];
            empresas = data.empresas || [];
            atualizarTabelaEmpresas();
            renderizarCadastro();
        }
    } catch (e) {
        console.error("Erro na carga inicial:", e);
    }
}

// --- IMPORTAÇÕES ---
function importarEmpresas() {
    const raw = document.getElementById('colar-empresas').value;
    const linhas = raw.split('\n');
    empresas = [];
    linhas.forEach(linha => {
        const colunas = linha.split('\t');
        if(colunas.length >= 2) {
            let v = colunas[1].replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
            empresas.push({ nome: colunas[0].trim(), valor: parseFloat(v) || 0 });
        }
    });
    atualizarTabelaEmpresas();
    salvarNoGoogle('salvarEmpresas', empresas);
}

function importarFuncionarios() {
    const raw = document.getElementById('colar-funcionarios').value;
    const linhas = raw.split('\n');
    funcionarios = [];
    linhas.forEach(linha => {
        const cols = linha.split('\t');
        if(cols.length >= 4) {
            funcionarios.push({
                Matriculas: cols[0].trim(),
                Nome: cols[1].trim(),
                Dias: cols[2].trim(),
                Setor: cols[3].trim(),
                Bonificados: cols[4] ? cols[4].trim() : "Não"
            });
        }
    });
    renderizarCadastro();
    salvarNoGoogle('salvarTodosFuncionarios', funcionarios);
}

// --- CÁLCULOS ---
function calcularTudo() {
    const totalArrecadado = empresas.reduce((acc, e) => acc + (parseFloat(e.valor) || 0), 0);
    const totalDias = funcionarios.reduce((acc, f) => acc + (parseFloat(f.Dias) || 0), 0);
    const bonificados = funcionarios.filter(f => f.Bonificados && f.Bonificados.toLowerCase() === 'sim');
    
    const custoBonus = bonificados.length * valorBonusBase;
    const montanteRestante = totalArrecadado - custoBonus;
    const valorDia = totalDias > 0 ? montanteRestante / totalDias : 0;

    document.getElementById('resumo-total').innerText = "R$ " + totalArrecadado.toLocaleString('pt-BR', {minimumFractionDigits: 2});
    document.getElementById('resumo-dias').innerText = totalDias;
    document.getElementById('resumo-valor-dia').innerText = "R$ " + valorDia.toLocaleString('pt-BR', {minimumFractionDigits: 4});

    const tbody = document.querySelector('#tabela-rateio tbody');
    if(!tbody) return;
    tbody.innerHTML = '';

    funcionarios.forEach(f => {
        const dias = parseFloat(f.Dias) || 0;
        const eBonif = f.Bonificados && f.Bonificados.toLowerCase() === 'sim';
        const valorFinal = (dias * valorDia) + (eBonif ? valorBonusBase : 0);

        tbody.innerHTML += `<tr>
            <td>${f.Matriculas}</td>
            <td>${f.Nome}</td>
            <td>${f.Setor}</td>
            <td>${dias}</td>
            <td><strong>R$ ${valorFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong></td>
        </tr>`;
    });
}

function atualizarTabelaEmpresas() {
    const tb = document.querySelector('#tabela-empresas tbody');
    if(!tb) return;
    tb.innerHTML = '';
    let t = 0;
    empresas.forEach(e => {
        t += e.valor;
        tb.innerHTML += `<tr><td>${e.nome}</td><td>R$ ${e.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td><td>-</td></tr>`;
    });
    document.getElementById('total-arrecadado').innerText = "R$ " + t.toLocaleString('pt-BR', {minimumFractionDigits: 2});
}

function renderizarCadastro() {
    const tb = document.querySelector('#tabela-cadastro-lista tbody');
    if(!tb) return;
    tb.innerHTML = '';
    funcionarios.forEach(f => {
        tb.innerHTML += `<tr><td>${f.Matriculas}</td><td>${f.Nome}</td><td>${f.Dias}</td><td>${f.Setor}</td><td>${f.Bonificados}</td><td>-</td></tr>`;
    });
}

async function salvarNoGoogle(acao, dados) {
    try {
        await fetch(URL_GOOGLE_SCRIPT, { method: 'POST', body: JSON.stringify({ acao, dados }) });
        alert("Sincronizado!");
    } catch (e) { console.error(e); }
}

function exportarExcel() {
    const wb = XLSX.utils.table_to_book(document.getElementById("tabela-rateio"));
    XLSX.writeFile(wb, "Rateio.xlsx");
}

window.onload = () => {
    carregarDadosIniciais();
    navegar('tela-menu');
};
