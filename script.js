let rawData = [];
let chart;
let displayedRows = 100; // Track number of displayed rows

// Hardcoded year and month mapping
const yearMonths = {
  '2023': ['December'],
  '2024': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  '2025': ['January', 'February', 'March', 'April']
};

async function loadData(year, month) {
  if (typeof Papa === 'undefined') {
    throw new Error('Papa Parse library not loaded. Please check the script inclusion in index.html.');
  }

  if (year === 'All') {
    let allData = [];
    for (const y of Object.keys(yearMonths)) {
      for (const m of yearMonths[y]) {
        const file = `data/${y}_${m.toLowerCase()}.csv`;
        try {
          const data = await new Promise((resolve, reject) => {
            Papa.parse(file, {
              download: true,
              header: true,
              complete: (result) => resolve(result.data),
              error: (error) => reject(error)
            });
          });
          console.log(`Loaded ${file}: ${data.length} rows`); // Debug log
          if (!data || data.length === 0) {
            console.warn(`No data in ${file}`);
          }
          allData = allData.concat(data);
        } catch (error) {
          console.error(`Error loading ${file}:`, error);
        }
      }
    }
    if (allData.length === 0) {
      console.error('No data loaded for any files');
      return [];
    }
    allData.forEach(d => {
      if (d['Date and Time']) d.datetime = new Date(d['Date and Time']);
      d.BOTOLAN = parseFloat(d.BOTOLAN) || 0;
      d.OLONGAPO = parseFloat(d.OLONGAPO) || 0;
    });
    allData = allData.filter(d => d.datetime && !isNaN(d.datetime.getTime())); // Remove invalid rows
    allData.sort((a, b) => a.datetime - b.datetime);
    console.log(`Total valid rows after processing: ${allData.length}`); // Debug log
    return allData;
  } else if (month === 'All') {
    let allData = [];
    for (const m of yearMonths[year] || []) {
      const file = `data/${year}_${m.toLowerCase()}.csv`;
      try {
        const data = await new Promise((resolve, reject) => {
          Papa.parse(file, {
            download: true,
            header: true,
            complete: (result) => resolve(result.data),
            error: (error) => reject(error)
          });
        });
        console.log(`Loaded ${file}: ${data.length} rows`); // Debug log
        if (!data || data.length === 0) {
          console.warn(`No data in ${file}`);
        }
        allData = allData.concat(data);
      } catch (error) {
        console.error(`Error loading ${file}:`, error);
      }
    }
    if (allData.length === 0) {
      console.error(`No data loaded for year ${year}`);
      return [];
    }
    allData.forEach(d => {
      if (d['Date and Time']) d.datetime = new Date(d['Date and Time']);
      d.BOTOLAN = parseFloat(d.BOTOLAN) || 0;
      d.OLONGAPO = parseFloat(d.OLONGAPO) || 0;
    });
    allData = allData.filter(d => d.datetime && !isNaN(d.datetime.getTime())); // Remove invalid rows
    allData.sort((a, b) => a.datetime - b.datetime);
    console.log(`Total valid rows for year ${year}: ${allData.length}`); // Debug log
    return allData;
  } else {
    const file = `data/${year}_${month.toLowerCase()}.csv`;
    try {
      const data = await new Promise((resolve, reject) => {
        Papa.parse(file, {
          download: true,
          header: true,
          complete: (result) => resolve(result.data),
          error: (error) => reject(error)
        });
      });
      console.log(`Loaded ${file}: ${data.length} rows`); // Debug log
      if (!data || data.length === 0) {
        console.warn(`No data in ${file}`);
        return [];
      }
      data.forEach(d => {
        if (d['Date and Time']) d.datetime = new Date(d['Date and Time']);
        d.BOTOLAN = parseFloat(d.BOTOLAN) || 0;
        d.OLONGAPO = parseFloat(d.OLONGAPO) || 0;
      });
      const validData = data.filter(d => d.datetime && !isNaN(d.datetime.getTime())); // Remove invalid rows
      validData.sort((a, b) => a.datetime - b.datetime);
      console.log(`Valid rows for ${file}: ${validData.length}`); // Debug log
      if (validData.length === 0) {
        return [];
      }
      return validData;
    } catch (error) {
      console.error(`Error loading ${file}:`, error);
      return [];
    }
  }
}

function updateMonthFilter(year, selectedMonth = 'All') {
  const monthFilter = document.getElementById('monthFilter');
  monthFilter.innerHTML = '<option value="All">All</option>';
  if (year !== 'All') {
    const months = yearMonths[year] || [];
    months.forEach(month => {
      const option = document.createElement('option');
      option.value = month;
      option.textContent = month;
      monthFilter.appendChild(option);
    });
  }
  // Set the month filter to the selected month, if valid
  if (yearMonths[year] && yearMonths[year].includes(selectedMonth)) {
    monthFilter.value = selectedMonth;
  } else {
    monthFilter.value = 'All';
  }
}

function filterByMonth(data, selectedMonth) {
  if (selectedMonth === 'All') return data;
  return data.filter(d => d['Billing Month'] === selectedMonth);
}

function groupByInterval(data, interval) {
  const grouped = [];

  if (interval === '5min') {
    return data.map(d => ({ label: d.datetime, price1: d.BOTOLAN, price2: d.OLONGAPO }));
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
      grouped.push({ label: labelTime, price1: avgPrice1, price2: avgPrice2 });
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
      const labelTime = new Date(year, month - 1, day);
      grouped.push({ label: labelTime, price1: avgPrice1, price2: avgPrice2 });
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
          pointRadius: 2,
          hidden: false
        },
        {
          label: 'OLONGAPO',
          data: price2,
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46,204,113,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          hidden: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            autoSkip: true,
            maxTicksLimit: 100
          }
        },
        y: {
          beginAtZero: true
        }
      }
    }
  });

  updateTable(data);
  setupInteractiveLegend();
}

function updateTable(data, append = false) {
  const tableBody = document.querySelector('#dataTable tbody');
  if (!append) {
    tableBody.innerHTML = '';
    displayedRows = 100; // Reset displayed rows
  } else {
    // Remove existing "Load More" button
    const existingMoreRow = tableBody.querySelector('tr:last-child');
    if (existingMoreRow && existingMoreRow.querySelector('button')) {
      tableBody.removeChild(existingMoreRow);
    }
  }
  if (data.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No data available.</td></tr>';
    return;
  }
  const rowsToShow = data.slice(append ? displayedRows - 100 : 0, displayedRows);
  rowsToShow.forEach(row => {
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
  if (data.length > displayedRows) {
    const moreRow = document.createElement('tr');
    const moreCell = document.createElement('td');
    moreCell.colSpan = 3;
    moreCell.style.textAlign = 'center';
    const loadMoreButton = document.createElement('button');
    loadMoreButton.textContent = `Showing ${displayedRows} of ${data.length} rows. Load more...`;
    loadMoreButton.style.padding = '8px';
    loadMoreButton.style.backgroundColor = '#3498db';
    loadMoreButton.style.color = 'white';
    loadMoreButton.style.border = 'none';
    loadMoreButton.style.borderRadius = '5px';
    loadMoreButton.style.cursor = 'pointer';
    loadMoreButton.addEventListener('click', () => {
      displayedRows += 100;
      updateTable(data, true); // Append more rows
    });
    moreCell.appendChild(loadMoreButton);
    moreRow.appendChild(moreCell);
    tableBody.appendChild(moreRow);
  }
}

function setupInteractiveLegend() {
  const legend = document.querySelector('.legend-custom');
  legend.innerHTML = `
    <span id="legend-botolan" style="color: #3498db; font-weight: bold; cursor: pointer;">⬤ BOTOLAN</span>
      
    <span id="legend-olongapo" style="color: #2ecc71; font-weight: bold; cursor: pointer;">⬤ OLONGAPO</span>
  `;

  document.getElementById('legend-botolan').addEventListener('click', () => {
    chart.data.datasets[0].hidden = !chart.data.datasets[0].hidden;
    chart.update();
  });

  document.getElementById('legend-olongapo').addEventListener('click', () => {
    chart.data.datasets[1].hidden = !chart.data.datasets[1].hidden;
    chart.update();
  });
}

function showLoading(show) {
  const tableBody = document.querySelector('#dataTable tbody');
  tableBody.innerHTML = show ? '<tr><td colspan="3">Loading...</td></tr>' : '';
}

function updateChart() {
  const selectedYear = document.getElementById('yearFilter').value;
  let selectedMonth = document.getElementById('monthFilter').value;
  const selectedInterval = document.getElementById('intervalFilter').value;

  // Validate year-month combination
  if (selectedYear !== 'All' && selectedMonth !== 'All' && (!yearMonths[selectedYear] || !yearMonths[selectedYear].includes(selectedMonth))) {
    selectedMonth = 'All'; // Reset to 'All' if invalid
    document.getElementById('monthFilter').value = 'All';
  }

  showLoading(true);
  loadData(selectedYear, selectedMonth).then(data => {
    showLoading(false);
    rawData = data;
    const filtered = filterByMonth(rawData, selectedMonth);
    const grouped = groupByInterval(filtered, selectedInterval);
    if (chart) chart.destroy(); // Clear chart if no data
    if (grouped.length === 0) {
      const tableBody = document.querySelector('#dataTable tbody');
      tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center;">No data available for ${selectedMonth} ${selectedYear}.</td></tr>`;
    } else {
      drawChart(grouped);
    }
    updateMonthFilter(selectedYear, selectedMonth); // Update month filter after data load
  }).catch(error => {
    showLoading(false);
    console.error('Error updating chart:', error);
    const tableBody = document.querySelector('#dataTable tbody');
    tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center;">No data available for ${selectedMonth} ${selectedYear}.</td></tr>`;
    if (chart) chart.destroy(); // Clear chart on error
  });
}

async function init() {
  if (typeof Papa === 'undefined') {
    console.error('Papa Parse not loaded. Waiting for window load.');
    window.addEventListener('load', () => {
      initializeFilters();
    });
  } else {
    initializeFilters();
  }
}

function initializeFilters() {
  const yearFilter = document.getElementById('yearFilter');
  const monthFilter = document.getElementById('monthFilter');
  const intervalFilter = document.getElementById('intervalFilter');

  // Populate year filter
  Object.keys(yearMonths).sort().forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearFilter.appendChild(option);
  });

  // Set default filter values
  yearFilter.value = '2025';
  intervalFilter.value = 'daily';
  updateMonthFilter('2025', 'January'); // Populate month filter for 2025 with January
  monthFilter.value = 'January';

  yearFilter.addEventListener('change', updateChart);
  monthFilter.addEventListener('change', updateChart);
  intervalFilter.addEventListener('change', updateChart);

  updateChart();
}

init();