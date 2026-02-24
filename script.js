const URL_GOOGLE_SCRIPT = "COLE_AQUI_SEU_URL"; 

let empresas = [];
let funcionarios = [];
const valorBonusBase = 200.00;

// Função de Navegação - AGORA COM TESTE DE ERRO
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
        console.log("Tela " + idTela + " ativada.");
    } else {
        console.error("Erro: A tela " + idTela + " não existe no HTML.");
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
        console.log("Aguardando configuração de URL...");
    }
}

// Importar Funcionários e reconhecer Bonificados
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
                // Se a 5ª coluna for "Sim", ele vira bonificado
                Bonificados: (cols[4] && cols[4].trim().toLowerCase() === 'sim') ? "Sim" : "No"
            });
        }
    });
    renderizarCadastro();
    salvarNoGoogle('salvarTodosFuncionarios', funcionarios);
    alert(funcionarios.length + " funcionários importados!");
}

// CÁLCULO DE RATEIO (O CORAÇÃO DO SISTEMA)
function calcularTudo() {
    // 1. Soma quanto as empresas pagaram
    const totalArrecadado = empresas.reduce((acc, e) => acc + (parseFloat(e.valor) || 0), 0);
    
    // 2. Soma o total de dias trabalhados por todos
    const totalDias = funcionarios.reduce((acc, f) => acc + (parseFloat(f.Dias) || 0), 0);
    
    // 3. Filtra quem é bonificado (Sim)
    const bonificados = funcionarios.filter(f => f.Bonificados === "Sim");
    
    // 4. Calcula o custo total dos bônus (Ex: 10 pessoas * 200 = 2000)
    const custoTotalBonus = bonificados.length * valorBonusBase;
    
    // 5. O que sobra é dividido pelos dias
    const montanteParaRateio = totalArrecadado - custoTotalBonus;
    const valorDia = totalDias > 0 ? montanteParaRateio / totalDias : 0;

    // Atualiza o painel superior
    document.getElementById('resumo-total').innerText = "R$ " + totalArrecadado.toLocaleString('pt-BR', {minimumFractionDigits: 2});
    document.getElementById('resumo-dias').innerText = totalDias;
    document.getElementById('resumo-valor-dia').innerText = "R$ " + valorDia.toLocaleString('pt-BR', {minimumFractionDigits: 4});

    renderizarTabelasFinais(valorDia);
}

function renderizarTabelasFinais(valorDia) {
    const tbodyRateio = document.querySelector('#tabela-rateio tbody');
    const tbodyBonif = document.querySelector('#tabela-bonificados tbody');
    
    tbodyRateio.innerHTML = '';
    tbodyBonif.innerHTML = '';

    funcionarios.forEach(f => {
        const dias = parseFloat(f.Dias) || 0;
        const eBonif = f.Bonificados === "Sim";
        
        // Valor = (Dias * Valor do Dia) + (Bônus se for o caso)
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
                <td>R$ ${valorBonusBase.toLocaleString('pt-BR')}</td>
            </tr>`;
        }
    });
}

// Funções de apoio
function atualizarTabelaEmpresas() {
    const tb = document.querySelector('#tabela-empresas tbody');
    if(!tb) return; tb.innerHTML = '';
    let t = 0;
    empresas.forEach(e => {
        t += e.valor;
        tb.innerHTML += `<tr><td>${e.nome}</td><td>R$ ${e.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td><td>-</td></tr>`;
    });
    document.getElementById('total-arrecadado').innerText = "R$ " + t.toLocaleString('pt-BR', {minimumFractionDigits: 2});
}

function renderizarCadastro() {
    const tb = document.querySelector('#tabela-cadastro-lista tbody');
    if(!tb) return; tb.innerHTML = '';
    funcionarios.forEach(f => {
        tb.innerHTML += `<tr><td>${f.Matriculas}</td><td>${f.Nome}</td><td>${f.Dias}</td><td>${f.Setor}</td><td>${f.Bonificados}</td><td>-</td></tr>`;
    });
}

async function salvarNoGoogle(acao, dados) {
    if (URL_GOOGLE_SCRIPT.includes("COLE_AQUI")) return;
    try {
        await fetch(URL_GOOGLE_SCRIPT, { method: 'POST', body: JSON.stringify({ acao, dados }) });
    } catch (e) { console.error("Erro ao sincronizar"); }
}

window.onload = () => {
    carregarDadosIniciais();
    navegar('tela-menu');
};
