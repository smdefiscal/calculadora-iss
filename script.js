let dadosRelatorio = null;
const DATA_CORTE = new Date(2024, 0, 1); // 01/01/2024

// Máscara de Data Automática
document.getElementById('data_alvara').addEventListener('input', function(e) {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length >= 5) {
        v = v.replace(/^(\d{2})(\d{2})(\d{0,4}).*/, "$1/$2/$3");
    } else if (v.length >= 3) {
        v = v.replace(/^(\d{2})(\d{0,2}).*/, "$1/$2");
    }
    e.target.value = v;
});

// Lógica do campo de Nota Fiscal
document.getElementsByName('nf_radio').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const inputNf = document.getElementById('valor_nf');
        inputNf.disabled = e.target.value === 'n';
        if (inputNf.disabled) inputNf.value = '';
    });
});

document.getElementById('btnCalcular').addEventListener('click', () => {
    try {
        const nome = document.getElementById('nome').value.trim();
        const dataStr = document.getElementById('data_alvara').value;
        const [dia, mes, ano] = dataStr.split('/').map(Number);
        const dataAlvara = new Date(ano, mes - 1, dia);
        const houveAlteracao = document.getElementById('alteracao').checked;

        if (!nome) throw "Informe o nome do contribuinte.";
        if (dataStr.length < 10 || isNaN(dataAlvara.getTime())) throw "Data inválida. Use DD/MM/AAAA.";
        if (dataAlvara > new Date()) throw "A data não pode ser futura.";

        // Regra de Isenção
        if (dataAlvara < DATA_CORTE && !houveAlteracao) {
            alert("ISENTO: Alvará aprovado antes de 01/01/2024 e sem alteração posterior.");
            dadosRelatorio = null;
            document.getElementById('btnPdf').disabled = true;
            return;
        }

        const vCub = parseFloat(document.getElementById('cub').value);
        const vMetragem = parseFloat(document.getElementById('metragem').value);
        const apresentaNf = document.querySelector('input[name="nf_radio"]:checked').value === 's';

        if (!vCub || !vMetragem || vCub <= 0 || vMetragem <= 0) throw "Valores de CUB e Metragem devem ser preenchidos.";

        let totalNf = 0, valorAbatido = 0, baseCalculo = 0;

        if (apresentaNf) {
            totalNf = (vCub * 0.2) * vMetragem;
            valorAbatido = parseFloat(document.getElementById('valor_nf').value) || 0;
            if (valorAbatido > totalNf) {
                alert("O valor abatido excede o limite (20% do CUB x Metragem). Não haverá imposto.");
                return;
            }
            baseCalculo = totalNf - valorAbatido;
        } else {
            baseCalculo = (vCub * 0.30) * vMetragem;
        }

        const iss = baseCalculo * 0.03;

        dadosRelatorio = {
            data_relatorio: new Date().toLocaleDateString('pt-BR'),
            nome,
            data_alvara: dataStr,
            v_cub: vCub,
            metragem: vMetragem,
            total_nf: totalNf,
            abatido: valorAbatido,
            iss: iss
        };

        alert("Cálculo realizado! Você já pode exportar o PDF.");
        document.getElementById('btnPdf').disabled = false;

    } catch (err) {
        alert(err);
    }
});

document.getElementById('btnPdf').addEventListener('click', () => {
    if (!dadosRelatorio) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Cabeçalho
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PREFEITURA MUNICIPAL", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Secretaria Municipal de Obras", 105, 26, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DE ISS - CONSTRUÇÃO CIVIL", 14, 40);

    // Tabela
    const rows = [
        ["Data do Relatório", dadosRelatorio.data_relatorio],
        ["Contribuinte", dadosRelatorio.nome],
        ["Data do Alvará", dadosRelatorio.data_alvara],
        ["Valor do CUB", `R$ ${dadosRelatorio.v_cub.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`],
        ["Metragem (m²)", `${dadosRelatorio.metragem.toFixed(2)} m²`],
        ["Limite p/ Abatimento", `R$ ${dadosRelatorio.total_nf.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`],
        ["Valor Abatido", `R$ ${dadosRelatorio.abatido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`],
        ["ISS Devido (3%)", `R$ ${dadosRelatorio.iss.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`],
    ];

    doc.autoTable({
        startY: 45,
        head: [['Descrição', 'Valor']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [46, 139, 87] }
    });

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Documento gerado eletronicamente pelo Sistema de ISS.", 14, doc.lastAutoTable.finalY + 10);

    doc.save(`ISS_${dadosRelatorio.nome.replace(/\s+/g, '_')}.pdf`);
});
