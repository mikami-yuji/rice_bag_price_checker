const MIN_ORDER_LOT_METERS = 4000;
let lastCalculationResults = {}; // To store the results for download

// --- Stepper Functions ---
function incrementAnnualUsage() {
    const input = document.getElementById('annualUsage');
    let currentValue = parseInt(input.value) || 0;
    input.value = currentValue + 4000;
    calculate();
}

function decrementAnnualUsage() {
    const input = document.getElementById('annualUsage');
    let currentValue = parseInt(input.value) || 0;
    if (currentValue > 4000) {
        input.value = currentValue - 4000;
        calculate();
    }
}

function incrementOrderVolume() {
    const input = document.getElementById('orderVolumeMeters');
    let currentValue = parseInt(input.value) || 0;
    input.value = currentValue + 4000;
    calculate();
}

function decrementOrderVolume() {
    const input = document.getElementById('orderVolumeMeters');
    let currentValue = parseInt(input.value) || 0;
    if (currentValue > 4000) {
        input.value = currentValue - 4000;
        calculate();
    }
}

// --- Input Persistence ---
function saveInputs() {
    const inputs = {
        bagType: document.querySelector('input[name="bagType"]:checked')?.value,
        bagSize: document.getElementById('bagSize').value,
        bagLengthType: document.querySelector('input[name="bagLengthType"]:checked')?.value,
        currentPrice: document.getElementById('currentPrice').value,
        newBagPrice: document.getElementById('newBagPrice').value,
        newBagCost: document.getElementById('newBagCost').value,
        plateCost: document.getElementById('plateCost').value,
        plateCostPrice: document.getElementById('plateCostPrice').value,
        plateCount: document.getElementById('plateCount').value,
        annualUsage: document.getElementById('annualUsage').value,
        orderVolumeMeters: document.getElementById('orderVolumeMeters').value
    };
    localStorage.setItem('riceBagCalculatorInputs', JSON.stringify(inputs));
}

function loadInputs() {
    const savedInputs = localStorage.getItem('riceBagCalculatorInputs');
    if (savedInputs) {
        const inputs = JSON.parse(savedInputs);
        if (inputs.bagType) document.querySelector(`input[name="bagType"][value="${inputs.bagType}"]`).checked = true;
        if (inputs.bagLengthType) document.querySelector(`input[name="bagLengthType"][value="${inputs.bagLengthType}"]`).checked = true;
        if (inputs.bagSize) document.getElementById('bagSize').value = inputs.bagSize;
        if (inputs.plateCount) document.getElementById('plateCount').value = inputs.plateCount;
        if (inputs.currentPrice) document.getElementById('currentPrice').value = inputs.currentPrice;
        if (inputs.newBagPrice) document.getElementById('newBagPrice').value = inputs.newBagPrice;
        if (inputs.newBagCost) document.getElementById('newBagCost').value = inputs.newBagCost;
        if (inputs.plateCost) document.getElementById('plateCost').value = inputs.plateCost;
        if (inputs.plateCostPrice) document.getElementById('plateCostPrice').value = inputs.plateCostPrice;
        if (inputs.annualUsage) document.getElementById('annualUsage').value = inputs.annualUsage;
        if (inputs.orderVolumeMeters) document.getElementById('orderVolumeMeters').value = inputs.orderVolumeMeters;
    }
}

function resetForm() {
    document.getElementById('bagTypeRoll').checked = true;
    document.getElementById('bagSize').value = '470';
    document.getElementById('lengthTypeNormal').checked = true;
    document.getElementById('plateCount').value = '1';
    document.getElementById('currentPrice').value = '';
    document.getElementById('newBagPrice').value = '';
    document.getElementById('newBagCost').value = '';
    document.getElementById('plateCost').value = '';
    document.getElementById('plateCostPrice').value = '';
    document.getElementById('annualUsage').value = '4000';
    document.getElementById('orderVolumeMeters').value = '4000';
    document.getElementById('results').style.display = 'none';
    document.getElementById('result-output').innerHTML = '';
    document.getElementById('simulationTable').textContent = '';
    document.getElementById('recoveryCheck').innerHTML = '';
    localStorage.removeItem('riceBagCalculatorInputs');
    lastCalculationResults = {};
}

// --- Main Calculation Logic ---
function calculate() {
    // 1. Get all input values
    const bagSizeSelect = document.getElementById('bagSize');
    const inputs = {
        bagType: document.querySelector('input[name="bagType"]:checked').value,
        currentPrice: parseFloat(document.getElementById('currentPrice').value) || 0,
        newBagCost: parseFloat(document.getElementById('newBagCost').value) || 0,
        newBagPrice: parseFloat(document.getElementById('newBagPrice').value) || 0,
        annualUsage: parseFloat(document.getElementById('annualUsage').value) || 0,
        plateCost: parseFloat(document.getElementById('plateCost').value) || 0,
        plateCostPrice: parseFloat(document.getElementById('plateCostPrice').value) || 0,
        plateCount: parseInt(document.getElementById('plateCount').value) || 0,
        orderVolumeMeters: parseFloat(document.getElementById('orderVolumeMeters').value) || 0,
        bagLengthMM_base: parseInt(bagSizeSelect.value) || 0,
        bagSizeLabel: bagSizeSelect.options[bagSizeSelect.selectedIndex].text,
        bagLengthType: document.querySelector('input[name="bagLengthType"]:checked').value,
    };

    // 2. Perform calculations
    let bagLengthMM = inputs.bagLengthMM_base;
    if (inputs.bagLengthType === 'eco') {
        bagLengthMM -= 30;
    }
    const bagLengthM = bagLengthMM / 1000;

    let costBenefitLabel = '';
    let costBenefitPerUnit = 0;
    let costBenefitPerMeterForCalc = 0;

    if (inputs.bagType === 'single') {
        const costBenefitPerPiece = inputs.currentPrice - inputs.newBagPrice;
        costBenefitLabel = '1枚あたりのコストメリット額';
        costBenefitPerUnit = costBenefitPerPiece;
        if (bagLengthM > 0) {
            costBenefitPerMeterForCalc = costBenefitPerPiece / bagLengthM;
        }
    } else { // roll
        const costBenefitPerMeter = inputs.currentPrice - inputs.newBagPrice;
        costBenefitLabel = '1mあたりのコストメリット額';
        costBenefitPerUnit = costBenefitPerMeter;
        costBenefitPerMeterForCalc = costBenefitPerMeter;
    }

    const annualCostBenefit = costBenefitPerMeterForCalc * inputs.annualUsage;
    const costBenefitPerOrder = costBenefitPerMeterForCalc * inputs.orderVolumeMeters;
    const totalPlateCost = inputs.plateCost * inputs.plateCount;
    const annualOrderCount = inputs.annualUsage > 0 && inputs.orderVolumeMeters > 0 ? inputs.annualUsage / inputs.orderVolumeMeters : 0;
    const recoveryOrdersDecimal = costBenefitPerOrder > 0 ? totalPlateCost / costBenefitPerOrder : Infinity;
    const recoveryStartOrder = Math.ceil(recoveryOrdersDecimal);
    const grossProfitPerUnit = inputs.newBagPrice - inputs.newBagCost;
    const grossProfitPerOrder = grossProfitPerUnit * inputs.orderVolumeMeters;
    const profitRate = inputs.newBagPrice > 0 ? (grossProfitPerUnit / inputs.newBagPrice) * 100 : 0;
    const annualGrossProfit = grossProfitPerUnit * inputs.annualUsage;
    const plateGrossProfit = (inputs.plateCost - inputs.plateCostPrice) * inputs.plateCount;
    const totalSellerProfit = annualGrossProfit + plateGrossProfit;
    const currentOrderTotal = inputs.currentPrice * inputs.orderVolumeMeters;
    const currentAnnualTotal = inputs.currentPrice * inputs.annualUsage;
    const newBagOrderTotal = inputs.newBagPrice * inputs.orderVolumeMeters;
    const newBagOrderTotalWithPlate = newBagOrderTotal + totalPlateCost;
    const newBagAnnualTotal = inputs.newBagPrice * inputs.annualUsage;
    const pricePerBag = inputs.newBagPrice * (inputs.bagType === 'single' ? 1 : bagLengthM);
    const bagsInOrderVolume = inputs.orderVolumeMeters > 0 && bagLengthM > 0 ? inputs.orderVolumeMeters / bagLengthM : 0;

    // 3. Store results globally for download function
    lastCalculationResults = {
        inputs,
        bagLengthM,
        costBenefitLabel,
        costBenefitPerUnit,
        annualCostBenefit,
        costBenefitPerOrder,
        totalPlateCost,
        annualOrderCount,
        recoveryOrdersDecimal,
        recoveryStartOrder,
        grossProfitPerUnit,
        grossProfitPerOrder,
        profitRate,
        annualGrossProfit,
        plateGrossProfit,
        totalSellerProfit,
        currentOrderTotal,
        currentAnnualTotal,
        newBagOrderTotal,
        newBagOrderTotalWithPlate,
        newBagAnnualTotal,
        pricePerBag,
        bagsInOrderVolume
    };

    // 4. Display results on the page
    displayResults(lastCalculationResults);
    saveInputs();
}

// --- Display Logic ---
function displayResults(r) {
    document.getElementById('results').style.display = 'block';

    const recoveryCheckDiv = document.getElementById('recoveryCheck');
    if (isFinite(r.recoveryOrdersDecimal) && r.recoveryOrdersDecimal > r.annualOrderCount) {
        recoveryCheckDiv.innerHTML = `<div class="warning">【警告】製版代の回収に1年以上かかる見込みです（回収に必要な発注回数が年間発注回数を上回っています）。</div>`;
    } else if (isFinite(r.recoveryOrdersDecimal)) {
        recoveryCheckDiv.innerHTML = `<div class="success">【達成】1年以内の製版代回収が見込めます。</div>`;
    } else {
        recoveryCheckDiv.innerHTML = '';
    }

    const outputDiv = document.getElementById('result-output');
    outputDiv.innerHTML = `
        <div class="result-item" style="background-color: #e8f5e9; padding: 10px; border-radius: 4px;">
            <span style="font-size: 1.2em;">年間コストメリット総額</span>
            <span style="font-size: 1.2em; color: #2e7d32;">${r.annualCostBenefit.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</span>
        </div>
        <div class="result-item"><span>${r.costBenefitLabel}</span> <span>${r.costBenefitPerUnit.toFixed(2)} 円</span></div>
        <div class="result-item"><span>1回の発注あたりのコストメリット額</span> <span>${r.costBenefitPerOrder.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</span></div>
        <div class="result-item"><span>製版代総額（初期投資）</span> <span>${r.totalPlateCost.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</span></div>
        <div class="result-item"><span>初期投資回収完了の発注回数</span> <span>${isFinite(r.recoveryStartOrder) ? r.recoveryStartOrder + ' 回目' : 'N/A'}</span></div>
        <hr>
        <h3>合計金額情報</h3>
        <table class="comparison-table">
            <thead><tr><th>項目</th><th>現行品</th><th>ご提案の米袋</th></tr></thead>
            <tbody>
                <tr><td>1回の発注合計</td><td>${r.currentOrderTotal.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</td><td>${r.newBagOrderTotal.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</td></tr>
                <tr><td>1回の発注合計（製版代含む）</td><td>-</td><td>${r.newBagOrderTotalWithPlate.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</td></tr>
                <tr><td>年間合計</td><td>${r.currentAnnualTotal.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</td><td>${r.newBagAnnualTotal.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</td></tr>
            </tbody>
        </table>
        <hr>
        <h3>詳細情報</h3>
        <h4>運用情報</h4>
        <div class="result-item"><span>年間発注回数</span> <span>${r.annualOrderCount.toFixed(1)} 回</span></div>
        <div class="result-item"><span>1枚あたりの参考価格（製版代含まず）</span> <span>${r.pricePerBag.toFixed(2)} 円</span></div>
        <div class="result-item"><span>1回あたりの発注総数</span> <span>${r.inputs.orderVolumeMeters}m / ${Math.floor(r.bagsInOrderVolume).toLocaleString()} 枚</span></div>
        <details>
            <summary><h4>販売者利益</h4></summary>
            <div class="result-item"><span>1回の発注あたりの粗利</span> <span>${r.grossProfitPerOrder.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</span></div>
            <div class="result-item"><span>粗利（円/m）</span> <span>${r.grossProfitPerUnit.toFixed(2)}</span></div>
            <div class="result-item"><span>粗利率（％）</span> <span>${r.profitRate.toFixed(2)} %</span></span></div>
            <div class="result-item"><span>年間粗利総額（ご提案の米袋販売）</span> <span>${r.annualGrossProfit.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</span></div>
            <div class="result-item"><span>製版代の粗利</span> <span>${r.plateGrossProfit.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</span></div>
            <div class="result-item" style="background-color: #e8f5e9; padding: 10px; border-radius: 4px;">
                <span style="font-size: 1.2em;">販売者総粗利</span>
                <span style="font-size: 1.2em; color: #2e7d32;">${r.totalSellerProfit.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</span>
            </div>
        </details>
    `;
    generateSimulationTable(r);
}

function generateSimulationTable(r) {
    const tableElement = document.getElementById('simulationTable');
    if (!isFinite(r.recoveryStartOrder)) {
        tableElement.innerHTML = '<p>コストメリットがないため、シミュレーションは表示できません。</p>';
        return;
    }

    let tableHtml = '<table class="simulation-table"><thead><tr><th>発注回数</th><th>累計メリット額</th><th>状態</th></tr></thead><tbody>';
    let cumulativeBenefit = -r.totalPlateCost;
    const maxOrders = Math.max(18, Math.ceil(r.annualOrderCount) + 6, r.recoveryStartOrder + 6);

    for (let order = 1; order <= maxOrders; order++) {
        cumulativeBenefit += r.costBenefitPerOrder;
        let status = '回収中';
        let statusClass = 'status-negative';
        if (order >= r.recoveryStartOrder) {
            status = '✅ 回収完了';
            statusClass = 'status-recovered';
        }
        tableHtml += `<tr><td>${order}</td><td class="${statusClass}">${cumulativeBenefit.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</td><td class="${statusClass}">${status}${order === r.recoveryStartOrder ? '  <span class="recovery-marker">← 回収完了</span>' : ''}</td></tr>`;
    }
    tableHtml += '</tbody></table>';
    tableElement.innerHTML = tableHtml;
}

// --- Excel Download Function ---
function downloadForExcel() {
    const r = lastCalculationResults;
    if (!r || Object.keys(r).length === 0) {
        alert('先に計算を実行し、結果を表示してください。');
        return;
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const fileName = `価格比較表_${yyyy}${mm}${dd}.csv`;
    const fullDateStr = `${yyyy}/${mm}/${dd}`;

    const rows = [];
    const addRow = (...cols) => {
        const escapedCols = cols.map(col => `"${String(col).replace(/"/g, '""')}"`);
        rows.push(escapedCols.join(','));
    };

    // --- Header ---
    addRow('米袋価格メリット計算ツール - 計算結果');
    addRow('計算日', fullDateStr);
    addRow('');

    // --- Separator ---
    addRow('---', '---', '---');
    addRow('');

    // --- Basic Info ---
    addRow('■ 基本情報');
    addRow('項目', '内容');
    addRow('袋の種類', r.inputs.bagType === 'roll' ? 'ロール袋' : '単袋');
    addRow('米袋のキロ数', r.inputs.bagSizeLabel);
    addRow('袋の長さ', r.inputs.bagLengthType === 'normal' ? '通常' : 'エコ（-30mm）');
    addRow('年間使用量(m)', r.inputs.annualUsage);
    addRow('1回の発注m数', r.inputs.orderVolumeMeters);
    
    const currentPriceFormatted = r.inputs.currentPrice.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
    addRow('現行品 単価', currentPriceFormatted);

    const newBagPriceFormatted = r.inputs.newBagPrice.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
    addRow('ご提案の米袋 単価', newBagPriceFormatted);

    const plateCostFormatted = r.inputs.plateCost.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
    addRow('製版代 単価', plateCostFormatted);
    addRow('製版数', r.inputs.plateCount);
    addRow('');

    // --- Cost Benefit ---
    addRow('■ コストメリット');
    addRow('項目', '金額');
    const annualCostBenefitFormatted = r.annualCostBenefit.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
    addRow('年間コストメリット総額', annualCostBenefitFormatted);
    addRow(r.costBenefitLabel, `${r.costBenefitPerUnit.toFixed(2)} 円`);
    const costBenefitPerOrderFormatted = r.costBenefitPerOrder.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
    addRow('1回の発注あたりのコストメリット額', costBenefitPerOrderFormatted);
    const totalPlateCostFormatted = r.totalPlateCost.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
    addRow('製版代総額（初期投資）', totalPlateCostFormatted);
    const recoveryStartOrderFormatted = isFinite(r.recoveryStartOrder) ? `${r.recoveryStartOrder} 回目` : 'N/A';
    addRow('初期投資回収完了の発注回数', recoveryStartOrderFormatted);
    addRow('');

    // --- Comparison Table ---
    addRow('■ 合計金額比較');
    addRow('項目', '現行品', 'ご提案の米袋');
    const currentOrderTotalFormatted = r.currentOrderTotal.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
    const newBagOrderTotalFormatted = r.newBagOrderTotal.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
    addRow('1回の発注合計', currentOrderTotalFormatted, newBagOrderTotalFormatted);
    const newBagOrderTotalWithPlateFormatted = r.newBagOrderTotalWithPlate.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
    addRow('1回の発注合計（製版代含む）', '-', newBagOrderTotalWithPlateFormatted);
    const currentAnnualTotalFormatted = r.currentAnnualTotal.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
    const newBagAnnualTotalFormatted = r.newBagAnnualTotal.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
    addRow('年間合計', currentAnnualTotalFormatted, newBagAnnualTotalFormatted);
    
    // --- PAGE BREAK ---
    for (let i = 0; i < 12; i++) {
        addRow('');
    }

    // --- Simulation (on "page 2") ---
    if (isFinite(r.recoveryStartOrder)) {
        addRow('■ 回収シミュレーション');
        addRow('発注回数', '累計メリット額', '状態');
        let cumulativeBenefit = -r.totalPlateCost;
        const maxOrders = Math.max(18, Math.ceil(r.annualOrderCount) + 6, r.recoveryStartOrder + 6);
        for (let order = 1; order <= maxOrders; order++) {
            cumulativeBenefit += r.costBenefitPerOrder;
            let status = '回収中';
            if (order >= r.recoveryStartOrder) {
                status = '✅ 回収完了';
            }
            const cumulativeBenefitFormatted = cumulativeBenefit.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
            addRow(order, cumulativeBenefitFormatted, status);
        }
    }

    const csvString = rows.join('\n');
    const blob = new Blob(['\uFEFF', csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    const idsToWatch = [
        'bagTypeSingle', 'bagTypeRoll', 'bagSize', 'currentPrice', 'newBagCost',
        'newBagPrice', 'plateCost', 'plateCostPrice', 'plateCount',
        'annualUsage', 'lengthTypeNormal', 'lengthTypeEco'
    ];

    idsToWatch.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const eventType = (element.type === 'radio' || element.tagName.toLowerCase() === 'select') ? 'change' : 'input';
            element.addEventListener(eventType, calculate);
        }
    });

    loadInputs();
    calculate();
});