const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbwb7Z4nNU6RqJktWIB4xGzaUGSLqkI4Rfrag7pvuH1cGge-qndb6MmGYfec-qnwHDzm/exec"; 

let empresas = [];
let funcionarios = [];
const valorBonusBase = 200.00;

// Função de Navegação
function navegar(idTela) {
    console.log("Tentando abrir a tela: " + idTela);
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

    if(idTela === 'tela-pagamentos' || idTela === 'tela-bonificados') {
        calcularTudo();
    }
}

// Carregar dados ao abrir
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
    } catch (e) {
        console.log("Erro ao carregar dados iniciais.");
    }
}

// --- IMPORTAR EMPRESAS (ESSA FUNÇÃO ESTAVA FALTANDO) ---
function importarEmpresas() {
    const raw = document.getElementById('colar-empresas').value;
    if (!raw.trim()) return alert("Cole os dados das empresas primeiro!");

    const linhas = raw.split('\n');
    empresas = [];

    linhas.forEach(linha => {
        const colunas = linha.split('\t');
        if(colunas.length >= 2) {
            // Limpa o valor: remove R$, pontos de milhar e troca vírgula por ponto
            let valorLimpo = colunas[1].replace('R$', '')
                                       .replace(/\./g, '')
                                       .replace(',', '.')
                                       .trim();
            
            empresas.push({
                nome: colunas[0].trim(),
                valor: parseFloat(valorLimpo) || 0
            });
        }
    });

    atualizarTabelaEmpresas();
    salvarNoGoogle('salvarEmpresas', empresas);
    document.getElementById('colar-empresas').value = '';
    alert("Empresas processadas!");
}

// Importar Funcionários e reconhecer Bonificados
function importarFuncionarios() {
    const raw = document.getElementById('colar-funcionarios').value;
    if (!raw.trim()) return alert("Cole os dados dos funcionários primeiro!");

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
                Bonificados: (cols[4] && cols[4].trim().toLowerCase() === 'sim') ? "Sim" : "No"
            });
        }
    });
    renderizarCadastro();
    salvarNoGoogle('salvarTodosFuncionarios', funcionarios);
    document.getElementById('colar-funcionarios').value = '';
    alert(funcionarios.length + " funcionários importados!");
}

// CÁLCULO DE RATEIO
function calcularTudo() {
    const totalArrecadado = empresas.reduce((acc, e) => acc + (parseFloat(e.valor) || 0), 0);
    const totalDias = funcionarios.reduce((acc, f) => acc + (parseFloat(f.Dias) || 0), 0);
    const bonificados = funcionarios.filter(f => f.Bonificados === "Sim");
    
    const custoTotalBonus = bonificados.length * valorBonusBase;
    const montanteParaRateio = totalArrecadado - custoTotalBonus;
    
    // O valor do dia é calculado sobre o que sobra após os bônus
    const valorDia = totalDias > 0 ? montanteParaRateio / totalDias : 0;

    document.getElementById('resumo-total').innerText = "R$ " + totalArrecadado.toLocaleString('pt-BR', {minimumFractionDigits: 2});
    document.getElementById('resumo-dias').innerText = totalDias;
    document.getElementById('resumo-valor-dia').innerText = "R$ " + valorDia.toLocaleString('pt-BR', {minimumFractionDigits: 4});

    renderizarTabelasFinais(valorDia);
}

function renderizarTabelasFinais(valorDia) {
    const tbodyRateio = document.querySelector('#tabela-rateio tbody');
    const tbodyBonif = document.querySelector('#tabela-bonificados tbody');
    
    if(!tbodyRateio) return;
    tbodyRateio.innerHTML = '';
    tbodyBonif.innerHTML = '';

    funcionarios.forEach(f => {
        const dias = parseFloat(f.Dias) || 0;
        const eBonif = f.Bonificados === "Sim";
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
                <td>${f.Matriculas}</td>
                <td>${f.Nome}</td>
                <td>${f.Setor}</td>
                <td>${dias}</td>
                <td>R$ ${valorBonusBase.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            </tr>`;
        }
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
    } catch (e) { console.error("Erro ao sincronizar com Google Sheets"); }
}

function exportarExcel() {
    const wb = XLSX.utils.table_to_book(document.getElementById("tabela-rateio"));
    XLSX.writeFile(wb, "Relatorio_Rateio.xlsx");
}

window.onload = () => {
    carregarDadosIniciais();
    navegar('tela-menu');
};
