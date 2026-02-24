// COLE O URL QUE O GOOGLE GEROU ENTRE AS ASPAS ABAIXO
const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbxRZrjXNUP5r8EOA7uSZp1GDTEeR13U_rzv9-mmRr3vYsFNNb-yDn2kXbY7FHYc20NY/exec";

let empresas = [];
let funcionarios = [];
let valorBonusBase = 200.00;

// Função para carregar dados da planilha assim que abrir o site
async function carregarDadosDaPlanilha() {
    try {
        const response = await fetch(URL_GOOGLE_SCRIPT);
        const data = await response.json();
        
        funcionarios = data.funcionarios;
        empresas = data.empresas;
        
        atualizarTabelaEmpresas();
        calcularTudo();
        console.log("Dados carregados com sucesso!");
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    }
}

// Chame essa função ao carregar a página
window.onload = carregarDadosDaPlanilha;

// Modifique a função calcularTudo para usar os dados REAIS da planilha:
function calcularTudo() {
    const totalArrecadado = empresas.reduce((acc, emp) => acc + (parseFloat(emp.valor) || 0), 0);
    const valorBonusInput = parseFloat(document.getElementById('valor-bonus-config').value) || 0;
    
    // Soma total de dias de TODOS os funcionários da planilha
    const totalDiasTrabalhados = funcionarios.reduce((acc, f) => acc + (parseFloat(f.Dias) || 0), 0);
    
    // Conta quantos estão marcados como "Sim" na coluna Bonificados
    const bonificados = funcionarios.filter(f => f.Bonificados && f.Bonificados.toLowerCase() === 'sim');
    const qtdBonificados = bonificados.length;

    // Cálculo exato para sobra zero
    const montanteParaRateioComum = totalArrecadado - (qtdBonificados * valorBonusInput);
    const valorDoDia = totalDiasTrabalhados > 0 ? montanteParaRateioComum / totalDiasTrabalhados : 0;

    // Atualiza os campos na tela
    document.getElementById('resumo-total').innerText = `R$ ${totalArrecadado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('resumo-dias').innerText = totalDiasTrabalhados;
    document.getElementById('resumo-valor-dia').innerText = `R$ ${valorDoDia.toLocaleString('pt-BR', {minimumFractionDigits: 4})}`;

    renderizarPagamentos(valorDoDia, valorBonusInput);
}

// Atualize a função renderizarPagamentos para usar as colunas exatas da sua planilha
function renderizarPagamentos(valorDia, valorBonus) {
    const tbody = document.querySelector('#tabela-rateio tbody');
    const tbodyBonif = document.querySelector('#tabela-bonificados-config tbody');
    tbody.innerHTML = '';
    tbodyBonif.innerHTML = '';

    funcionarios.forEach(f => {
        const dias = parseFloat(f.Dias) || 0;
        const eBonificado = f.Bonificados && f.Bonificados.toLowerCase() === 'sim';
        
        // Lógica: (Dias * Valor do Dia) + (200 se for bonificado)
        let valorFinal = (dias * valorDia);
        if(eBonificado) valorFinal += valorBonus;

        // Formatação de segurança para garantir que o centavo não escape no arredondamento visual
        const valorFormatado = valorFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});

        tbody.innerHTML += `
            <tr>
                <td>${f.Matriculas}</td>
                <td>${f.Nome}</td>
                <td>${f.Setor}</td>
                <td>${dias}</td>
                <td><strong>R$ ${valorFormatado}</strong></td>
            </tr>
        `;

        if(eBonificado) {
            tbodyBonif.innerHTML += `
                <tr>
                    <td>${f.Matriculas}</td>
                    <td>${f.Nome}</td>
                    <td>${f.Setor}</td>
                    <td>${dias}</td>
                    <td>R$ ${valorBonus.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                </tr>
            `;
        }
    });
}
