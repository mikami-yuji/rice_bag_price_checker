const MIN_ORDER_LOT_METERS = 4000;
let lastCalculationResults = {}; // To store the results for download
let simulationChart = null; // Global variable for the chart instance

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
        try {
            const inputs = JSON.parse(savedInputs);
            if (inputs.bagType) {
                const el = document.querySelector(`input[name="bagType"][value="${inputs.bagType}"]`);
                if (el) el.checked = true;
            }
            if (inputs.bagLengthType) {
                const el = document.querySelector(`input[name="bagLengthType"][value="${inputs.bagLengthType}"]`);
                if (el) el.checked = true;
            }
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val;
            };
            setVal('bagSize', inputs.bagSize);
            setVal('plateCount', inputs.plateCount);
            setVal('currentPrice', inputs.currentPrice);
            setVal('newBagPrice', inputs.newBagPrice);
            setVal('newBagCost', inputs.newBagCost);
            setVal('plateCost', inputs.plateCost);
            setVal('plateCostPrice', inputs.plateCostPrice);
            setVal('annualUsage', inputs.annualUsage);
            setVal('orderVolumeMeters', inputs.orderVolumeMeters);
        } catch (e) {
            console.error('Failed to load inputs:', e);
            localStorage.removeItem('riceBagCalculatorInputs');
        }
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
    if (simulationChart) {
        simulationChart.destroy();
        simulationChart = null;
    }
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

    // Safety cap: Limit to 300 rows to prevent freezing
    const MAX_ROWS = 300;
    const maxOrders = Math.min(MAX_ROWS, Math.max(18, Math.ceil(r.annualOrderCount) + 6, r.recoveryStartOrder + 6));

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

    if (maxOrders === MAX_ROWS && maxOrders < r.recoveryStartOrder) {
        tableHtml += `<tr><td colspan="3" style="text-align:center; color:#666;">... 以降も続きます（表示上限300回） ...</td></tr>`;
    }

    tableHtml += '</tbody></table>';
    tableElement.innerHTML = tableHtml;

    // Call chart generation
    updateSimulationChart(r, maxOrders);
}

function updateSimulationChart(r, maxOrders) {
    const canvas = document.getElementById('simulationChart');
    if (!canvas) return; // Guard clause
    const ctx = canvas.getContext('2d');

    // Prepare data
    const labels = [];
    const data = [];
    let cumulativeBenefit = -r.totalPlateCost;

    for (let order = 1; order <= maxOrders; order++) {
        labels.push(order + '回');
        cumulativeBenefit += r.costBenefitPerOrder;
        data.push(cumulativeBenefit);
    }

    // Destroy existing chart if it exists
    if (simulationChart) {
        simulationChart.destroy();
    }

    simulationChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '累計メリット額',
                data: data,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1,
                pointRadius: 3,
                pointBackgroundColor: (context) => {
                    const value = context.raw;
                    return value >= 0 ? '#4CAF50' : '#F44336';
                },
                pointBorderColor: (context) => {
                    const value = context.raw;
                    return value >= 0 ? '#4CAF50' : '#F44336';
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true, // Prevents huge height
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function (value, index, values) {
                            return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumSignificantDigits: 3 }).format(value);
                        }
                    },
                    grid: {
                        color: (context) => {
                            if (context.tick.value === 0) {
                                return '#000'; // Emphasize zero line
                            }
                            return '#e0e0e0';
                        },
                        lineWidth: (context) => {
                            if (context.tick.value === 0) {
                                return 2;
                            }
                            return 1;
                        }
                    }
                }
            }
        }
    });
}

// --- Excel Download Function ---



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