// --- CONFIGURAÇÕES INICIAIS ---
let empresas = [];
let funcionarios = []; // Isso virá do Google Sheets
let valorBonusBase = 200.00;

// --- NAVEGAÇÃO ENTRE TELAS ---
function navegar(idTela) {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('active'));
    document.getElementById(idTela).classList.add('active');
    
    if(idTela === 'tela-pagamentos' || idTela === 'tela-bonificados') {
        calcularTudo();
    }
}

// --- GESTÃO DE EMPRESAS ---
function adicionarEmpresa() {
    const nome = document.getElementById('empresa-nome').value;
    const valor = parseFloat(document.getElementById('empresa-valor').value);

    if (nome && valor) {
        empresas.push({ nome, valor });
        atualizarTabelaEmpresas();
        document.getElementById('empresa-nome').value = '';
        document.getElementById('empresa-valor').value = '';
    }
}

function atualizarTabelaEmpresas() {
    const tbody = document.querySelector('#tabela-empresas tbody');
    tbody.innerHTML = '';
    let total = 0;

    empresas.forEach(emp => {
        total += emp.valor;
        tbody.innerHTML += `<tr><td>${emp.nome}</td><td>R$ ${emp.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td></tr>`;
    });

    document.getElementById('total-arrecadado').innerText = `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('resumo-total').innerText = `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

// --- LÓGICA DE CÁLCULO DE RATEIO (SEM SOBRAS) ---
function calcularTudo() {
    const totalArrecadado = empresas.reduce((acc, emp) => acc + emp.valor, 0);
    const valorBonus = parseFloat(document.getElementById('valor-bonus-config').value) || 0;
    
    // Simulação de dados (Substituir pela chamada do Google Sheets)
    // Exemplo: 250 funcionários, somando 4000 dias
    const totalDiasTrabalhados = 4000; 
    const qtdBonificados = 10; // Exemplo de contagem de matriculas com bônus

    // 1. Subtrai o total que será pago como bônus fixo
    const montanteAposBonus = totalArrecadado - (qtdBonificados * valorBonus);

    // 2. Calcula o valor do dia com precisão decimal alta para evitar erro de arredondamento
    const valorDoDia = totalDiasTrabalhados > 0 ? montanteAposBonus / totalDiasTrabalhados : 0;

    document.getElementById('resumo-dias').innerText = totalDiasTrabalhados;
    document.getElementById('resumo-valor-dia').innerText = `R$ ${valorDoDia.toLocaleString('pt-BR', {minimumFractionDigits: 4})}`;

    renderizarPagamentos(valorDoDia, valorBonus);
}

function renderizarPagamentos(valorDia, valorBonus) {
    const tbody = document.querySelector('#tabela-rateio tbody');
    const tbodyBonif = document.querySelector('#tabela-bonificados-config tbody');
    tbody.innerHTML = '';
    tbodyBonif.innerHTML = '';

    // Exemplo de funcionário para teste da lógica
    const listaExemplo = [
        { matricula: '001', nome: 'Funcionario A', setor: 'Produção', dias: 20, bonificado: true },
        { matricula: '002', nome: 'Funcionario B', setor: 'RH', dias: 18, bonificado: false }
    ];

    listaExemplo.forEach(f => {
        // Cálculo individual
        let valorFinal = f.dias * valorDia;
        if(f.bonificado) valorFinal += valorBonus;

        // Tela de Pagamento Geral
        tbody.innerHTML += `
            <tr>
                <td>${f.matricula}</td>
                <td>${f.nome}</td>
                <td>${f.setor}</td>
                <td>${f.dias}</td>
                <td><strong>R$ ${valorFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong></td>
            </tr>
        `;

        // Tela de Bonificados
        if(f.bonificado) {
            tbodyBonif.innerHTML += `
                <tr>
                    <td>${f.matricula}</td>
                    <td>${f.nome}</td>
                    <td>${f.setor}</td>
                    <td>${f.dias}</td>
                    <td>R$ ${valorBonus}</td>
                </tr>
            `;
        }
    });
}

// --- EXPORTAÇÃO ---
function exportarExcel() {
    alert("Função de exportação para Excel ativada! (Requer biblioteca SheetJS)");
}
