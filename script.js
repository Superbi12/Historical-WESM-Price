let rawData = [];
let chart;

// Load JSON data
async function loadData() {
  const response = await fetch('data.json');
  rawData = await response.json();

  rawData.forEach(d => {
    d.datetime = new Date(d['Date and Time']);
  });

  rawData.sort((a, b) => a.datetime - b.datetime);
  return rawData;
}

function getUniqueBillingMonths(data) {
  const monthOrder = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3,
    'May': 4, 'June': 5, 'July': 6, 'August': 7,
    'September': 8, 'October': 9, 'November': 10, 'December': 11
  };
  const months = new Set();
  data.forEach(d => months.add(d['Billing Month']));
  return Array.from(months).sort((a, b) => (monthOrder[a] || 0) - (monthOrder[b] || 0));
}

function filterByMonth(data, selectedMonth) {
  if (selectedMonth === 'All') return data;
  return data.filter(d => d['Billing Month'] === selectedMonth);
}

function groupByInterval(data, interval) {
  const grouped = [];

  if (interval === '5min') {
    // Each entry is already 5-minutely, just return raw
    return data.map(d => ({
      label: d.datetime,
      price1: d.BOTOLAN,
      price2: d.OLONGAPO
    }));
  }

  if (interval === 'hourly') {
    const hourlyMap = {};

    data.forEach(d => {
      const key = d.datetime.getFullYear() + '-' +
                  (d.datetime.getMonth() + 1).toString().padStart(2, '0') + '-' +
                  d.datetime.getDate().toString().padStart(2, '0') + ' ' +
                  d.datetime.getHours().toString().padStart(2, '0');

      if (!hourlyMap[key]) hourlyMap[key] = { sum1: 0, sum2: 0, count: 0 };

      hourlyMap[key].sum1 += d.BOTOLAN;
      hourlyMap[key].sum2 += d.OLONGAPO;
      hourlyMap[key].count++;
    });

    for (const key in hourlyMap) {
      const avgPrice1 = hourlyMap[key].sum1 / hourlyMap[key].count;
      const avgPrice2 = hourlyMap[key].sum2 / hourlyMap[key].count;

      const [datePart, hourPart] = key.split(' ');
      const [year, month, day] = datePart.split('-');
      const hour = parseInt(hourPart);

      const labelTime = new Date(year, month - 1, day, hour);

      grouped.push({
        label: labelTime,
        price1: avgPrice1,
        price2: avgPrice2
      });
    }

    return grouped.sort((a, b) => a.label - b.label);
  }

  if (interval === 'daily') {
    const dailyMap = {};

    data.forEach(d => {
      const key = d.datetime.getFullYear() + '-' +
                  (d.datetime.getMonth() + 1).toString().padStart(2, '0') + '-' +
                  d.datetime.getDate().toString().padStart(2, '0');

      if (!dailyMap[key]) dailyMap[key] = { sum1: 0, sum2: 0, count: 0 };

      dailyMap[key].sum1 += d.BOTOLAN;
      dailyMap[key].sum2 += d.OLONGAPO;
      dailyMap[key].count++;
    });

    for (const key in dailyMap) {
      const avgPrice1 = dailyMap[key].sum1 / dailyMap[key].count;
      const avgPrice2 = dailyMap[key].sum2 / dailyMap[key].count;

      const [year, month, day] = key.split('-');
      const labelTime = new Date(year, month - 1, day); // JS months are 0-indexed

      grouped.push({
        label: labelTime,
        price1: avgPrice1,
        price2: avgPrice2
      });
    }

    return grouped.sort((a, b) => a.label - b.label);
  }

  return grouped;
}

function drawChart(data) {
  const ctx = document.getElementById('priceChart').getContext('2d');

  const labels = data.map(d => d.label.toLocaleString());
  const price1 = data.map(d => d.price1);
  const price2 = data.map(d => d.price2);

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'BOTOLAN',
          data: price1,
          borderColor: '#3498db',
          backgroundColor: 'rgba(52,152,219,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 2
        },
        {
          label: 'OLONGAPO',
          data: price2,
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46,204,113,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        title: {
          display: true,
          text: 'Market Prices Over Time',
          font: { size: 18 }
        },
        legend: { position: 'top' },
        zoom: {
          pan: {
            enabled: true,
            mode: 'x',
            modifierKey: 'ctrl' // Hold CTRL + Drag to pan
          },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x'
          },
          limits: {
            x: { minRange: 1 }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            autoSkip: true,
            maxTicksLimit: 30
          }
        },
        y: {
          beginAtZero: true
        }
      }
    }
  });

  updateTable(data); // Mirror chart data in the table
}

function updateTable(data) {
  const tableBody = document.querySelector('#dataTable tbody');
  tableBody.innerHTML = '';

  data.forEach(row => {
    const tr = document.createElement('tr');

    const dateCell = document.createElement('td');
    dateCell.textContent = row.label.toLocaleString();
    tr.appendChild(dateCell);

    const price1Cell = document.createElement('td');
    price1Cell.textContent = row.price1.toFixed(2);
    price1Cell.style.textAlign = 'center';
    tr.appendChild(price1Cell);

    const price2Cell = document.createElement('td');
    price2Cell.textContent = row.price2.toFixed(2);
    price2Cell.style.textAlign = 'center';
    tr.appendChild(price2Cell);

    tableBody.appendChild(tr);
  });
}

function updateChart() {
  const selectedMonth = document.getElementById('monthFilter').value;
  const selectedInterval = document.getElementById('intervalFilter').value;

  const filtered = filterByMonth(rawData, selectedMonth);
  const grouped = groupByInterval(filtered, selectedInterval);

  drawChart(grouped);
}

document.getElementById('downloadChart').addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'market_prices_chart.png';
  link.href = document.getElementById('priceChart').toDataURL();
  link.click();
});

async function init() {
  await loadData();

  const monthFilter = document.getElementById('monthFilter');
  const months = getUniqueBillingMonths(rawData);

  months.forEach(month => {
    const option = document.createElement('option');
    option.value = month;
    option.textContent = month;
    monthFilter.appendChild(option);
  });

  monthFilter.addEventListener('change', updateChart);
  document.getElementById('intervalFilter').addEventListener('change', updateChart);

  updateChart();
}

init();
