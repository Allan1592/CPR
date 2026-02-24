const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbwb7Z4nNU6RqJktWIB4xGzaUGSLqkI4Rfrag7pvuH1cGge-qndb6MmGYfec-qnwHDzm/exec; 

let empresas = [];
let funcionarios = [];
let valorBonusBase = 200.00;

function navegar(id) {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(id === 'tela-pagamentos') calcularTudo();
}

// --- IMPORTAÇÃO VIA "COPIAR E COLAR" ---
function importarEmpresas() {
    const raw = document.getElementById('colar-empresas').value;
    const linhas = raw.split('\n');
    empresas = [];

    linhas.forEach(linha => {
        const colunas = linha.split('\t');
        if(colunas.length >= 2) {
            empresas.push({
                nome: colunas[0].trim(),
                valor: parseFloat(colunas[1].replace('R$', '').replace('.', '').replace(',', '.')) || 0
            });
        }
    });
    atualizarTabelaEmpresas();
    salvarNoGoogle('salvarEmpresas', empresas);
}

function importarFuncionarios() {
    const raw = document.getElementById('colar-funcionarios').value;
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
}

// --- CÁLCULO DE RATEIO (SOBRA ZERO) ---
function calcularTudo() {
    const totalArrecadado = empresas.reduce((acc, e) => acc + e.valor, 0);
    const listaBonificados = funcionarios.filter(f => f.Bonificados.toLowerCase() === 'sim');
    const totalDias = funcionarios.reduce((acc, f) => acc + (parseFloat(f.Dias) || 0), 0);
    
    const custoBonus = listaBonificados.length * valorBonusBase;
    const montanteComum = totalArrecadado - custoBonus;
    
    const valorDia = totalDias > 0 ? montanteComum / totalDias : 0;

    // UI Updates
    document.getElementById('resumo-total').innerText = `R$ ${totalArrecadado.toLocaleString('pt-BR')}`;
    document.getElementById('resumo-dias').innerText = totalDias;
    document.getElementById('resumo-valor-dia').innerText = `R$ ${valorDia.toLocaleString('pt-BR', {minimumFractionDigits: 4})}`;

    renderizarRelatorios(valorDia);
}

function renderizarRelatorios(valorDia) {
    const tbodyRateio = document.querySelector('#tabela-rateio tbody');
    const tbodyBonif = document.querySelector('#tabela-bonificados tbody');
    tbodyRateio.innerHTML = '';
    tbodyBonif.innerHTML = '';

    funcionarios.forEach(f => {
        const dias = parseFloat(f.Dias) || 0;
        const eBonif = f.Bonificados.toLowerCase() === 'sim';
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
                <td>${f.Matriculas}</td><td>${f.Nome}</td><td>${f.Setor}</td><td>${dias}</td><td>R$ ${valorBonusBase}</td>
            </tr>`;
        }
    });
}

// --- PERSISTÊNCIA ---
async function salvarNoGoogle(acao, dados) {
    try {
        await fetch(URL_GOOGLE_SCRIPT, {
            method: 'POST',
            body: JSON.stringify({ acao: acao, dados: dados })
        });
        alert("Sincronizado com Google Sheets!");
    } catch (e) { alert("Erro ao salvar."); }
}

function atualizarTabelaEmpresas() {
    const tbody = document.querySelector('#tabela-empresas tbody');
    tbody.innerHTML = '';
    let total = 0;
    empresas.forEach(e => {
        total += e.valor;
        tbody.innerHTML += `<tr><td>${e.nome}</td><td>R$ ${e.valor.toLocaleString('pt-BR')}</td><td><button>X</button></td></tr>`;
    });
    document.getElementById('total-arrecadado').innerText = `R$ ${total.toLocaleString('pt-BR')}`;
}

function renderizarCadastro() {
    const tbody = document.querySelector('#tabela-cadastro-lista tbody');
    tbody.innerHTML = '';
    funcionarios.forEach(f => {
        tbody.innerHTML += `<tr><td>${f.Matriculas}</td><td>${f.Nome}</td><td>${f.Dias}</td><td>${f.Setor}</td><td>${f.Bonificados}</td><td><button>Remover</button></td></tr>`;
    });
}

function exportarExcel() {
    const wb = XLSX.utils.table_to_book(document.getElementById("tabela-rateio"));
    XLSX.writeFile(wb, "Relatorio_Rateio.xlsx");
}
