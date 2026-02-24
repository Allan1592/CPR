// substitua pelo seu URL do Google Apps Script
const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbwb7Z4nNU6RqJktWIB4xGzaUGSLqkI4Rfrag7pvuH1cGge-qndb6MmGYfec-qnwHDzm/exec"; 

let empresas = [];
let funcionarios = [];
const valorBonusBase = 200.00;

// --- FUNÇÃO DE NAVEGAÇÃO (CORRIGIDA) ---
function navegar(idTela) {
    console.log("Navegando para:", idTela);
    // Esconde todas as telas
    document.querySelectorAll('.tela').forEach(t => {
        t.classList.remove('active');
        t.style.display = 'none';
    });
    
    // Mostra a tela desejada
    const telaAtiva = document.getElementById(idTela);
    if (telaAtiva) {
        telaAtiva.classList.add('active');
        telaAtiva.style.display = 'block';
    }

    // Se for para a tela de pagamentos, recalcula tudo
    if(idTela === 'tela-pagamentos' || idTela === 'tela-bonificados') {
        calcularTudo();
    }
}

// --- BUSCAR DADOS AO CARREGAR PÁGINA ---
async function carregarDadosIniciais() {
    console.log("Carregando dados do Google Sheets...");
    try {
        const response = await fetch(URL_GOOGLE_SCRIPT);
        const data = await response.json();
        
        if (data) {
            funcionarios = data.funcionarios || [];
            empresas = data.empresas || [];
            
            atualizarTabelaEmpresas();
            renderizarCadastro();
            console.log("Dados carregados!");
        }
    } catch (e) {
        console.error("Erro ao carregar dados iniciais:", e);
    }
}

// Executa ao abrir o site
window.onload = () => {
    carregarDadosIniciais();
    // Garante que o Menu apareça primeiro
    navegar('tela-menu'); 
};

// --- IMPORTAÇÃO DE EMPRESAS ---
function importarEmpresas() {
    const raw = document.getElementById('colar-empresas').value;
    if(!raw.trim()) return alert("Cole os dados primeiro!");

    const linhas = raw.split('\n');
    empresas = [];

    linhas.forEach(linha => {
        const colunas = linha.split('\t');
        if(colunas.length >= 2) {
            let valorLimpo = colunas[1].replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
            empresas.push({
                nome: colunas[0].trim(),
                valor: parseFloat(valorLimpo) || 0
            });
        }
    });
    
    atualizarTabelaEmpresas();
    salvarNoGoogle('salvarEmpresas', empresas);
    document.getElementById('colar-empresas').value = '';
}

// --- IMPORTAÇÃO DE FUNCIONÁRIOS ---
function importarFuncionarios() {
    const raw = document.getElementById('colar-funcionarios').value;
    if(!raw.trim()) return alert("Cole os dados primeiro!");

    const linhas = raw.split('\n');
    let novosFuncs = [];

    linhas.forEach(linha => {
        const cols = linha.split('\t');
        if(cols.length >= 4) {
            novosFuncs.push({
                Matriculas: cols[0].trim(),
                Nome: cols[1].trim(),
                Dias: cols[2].trim(),
                Setor: cols[3].trim(),
                Bonificados: cols[4] ? cols[4].trim() : "Não"
            });
        }
    });
    
    funcionarios = novosFuncs;
    renderizarCadastro();
    salvarNoGoogle('salvarTodosFuncionarios', funcionarios);
    document.getElementById('colar-funcionarios').value = '';
}

// --- CÁLCULOS E RELATÓRIOS ---
function calcularTudo() {
    const totalArrecadado = empresas.reduce((acc, e) => acc + (parseFloat(e.valor) || 0), 0);
    const listaBonificados = funcionarios.filter(f => f.Bonificados && f.Bonificados.toLowerCase() === 'sim');
    const totalDias = funcionarios.reduce((acc, f) => acc + (parseFloat(f.Dias) || 0), 0);
    
    const custoBonus = listaBonificados.length * valorBonusBase;
    const montanteComum = totalArrecadado - custoBonus;
    
    const valorDia = totalDias > 0 ? montanteComum / totalDias : 0;

    document.getElementById('resumo-total').innerText = `R$ ${totalArrecadado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('resumo-dias').innerText = totalDias;
    document.getElementById('resumo-valor-dia').innerText = `R$ ${valorDia.toLocaleString('pt-BR', {minimumFractionDigits: 4})}`;

    renderizarRelatorios(valorDia);
}

function renderizarRelatorios(valorDia) {
    const tbodyRateio = document.querySelector('#tabela-rateio tbody');
    const tbodyBonif = document.querySelector('#tabela-bonificados tbody');
    if(!tbodyRateio) return;

    tbodyRateio.innerHTML = '';
    tbodyBonif.innerHTML = '';

    funcionarios.forEach(f => {
        const dias = parseFloat(f.Dias) || 0;
        const eBonif = f.Bonificados && f.Bonificados.toLowerCase() === 'sim';
        const valorFinal = (dias * valorDia) + (eBonif ? valorBonusBase : 0);

        tbodyRateio.innerHTML += `<tr>
            <td>${f.Matriculas}</td>
            <td>${f.Nome}</td>
            <td>${f.Setor}</td>
            <td>${dias}</td>
            <td><strong>R$ ${valorFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong></td>
        </tr>`;

        if(eBonif) {
            tbodyBonif.innerHTML += `<tr>
                <td>${f.Matriculas}</td><td>${f.Nome}</td><td>${f.Setor}</td><td>${dias}</td><td>R$ ${valorBonusBase.toLocaleString('pt-BR')}</td>
            </tr>`;
        }
    });
}

function atualizarTabelaEmpresas() {
    const tbody = document.querySelector('#tabela-empresas tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    let total = 0;
    empresas.forEach(e => {
        total += e.valor;
        tbody.innerHTML += `<tr><td>${e.nome}</td><td>R$ ${e.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td><td>-</td></tr>`;
    });
    document.getElementById('total-arrecadado').innerText = `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

function renderizarCadastro() {
    const tbody = document.querySelector('#tabela-cadastro-lista tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    funcionarios.forEach(f => {
        tbody.innerHTML += `<tr><td>${f.Matriculas}</td><td>${f.Nome}</td><td>${f.Dias}</td><td>${f.Setor}</td><td>${f.Bonificados}</td><td>-</td></tr>`;
    });
}

async function salvarNoGoogle(acao, dados) {
    console.log("Enviando para o Google...");
    try {
        await fetch(URL_GOOGLE_SCRIPT, {
            method: 'POST',
            body: JSON.stringify({ acao: acao, dados: dados })
        });
        alert("Sincronizado com sucesso!");
    } catch (e) { 
        alert("Erro ao salvar dados.");
        console.error(e);
    }
}

function exportarExcel() {
    const table = document.getElementById("tabela-rateio");
    const wb = XLSX.utils.table_to_book(table);
    XLSX.writeFile(wb, "Relatorio_Pagamento.xlsx");
}
