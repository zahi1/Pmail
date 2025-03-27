document.addEventListener("DOMContentLoaded", () => {
  const currentUserId = localStorage.getItem("user_id") || "0";
  if (currentUserId === "0") {
    alert("Please log in to view your dashboard.");
    return;
  }

  fetch(`/dashboard/employer/${currentUserId}`)
    .then(res => res.json())
    .then(data => {
      // 1) Status distribution (pie)
      renderStatusChart(data.status_counts);

      // 2) Monthly time series (line)
      renderTimeSeriesChart(data.time_series);

      // 3) Category distribution (bar)
      renderCategoryChart(data.category_counts);

      // 4) Day of week distribution (bar)
      renderDayOfWeekChart(data.day_of_week_counts);

      // Fill the table
      populateApplicationsTable(data.applications);
    })
    .catch(err => {
      console.error("Error fetching dashboard data:", err);
    });
});

function renderStatusChart(statusCounts) {
  const statuses = Object.keys(statusCounts);
  const counts = statuses.map(s => statusCounts[s]);

  const ctx = document.getElementById("statusChart").getContext("2d");
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: statuses,
      datasets: [{
        data: counts,
        backgroundColor: ['#ff6384','#36a2eb','#ffcd56','#4bc0c0','#9966ff']
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Application Status Distribution',
          color: '#fff'
        }
      },
      responsive: true
    }
  });
}

function renderTimeSeriesChart(timeSeriesData) {
  const months = Object.keys(timeSeriesData).sort();
  const counts = months.map(m => timeSeriesData[m]);

  const ctx = document.getElementById("timeSeriesChart").getContext("2d");
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Applications Over Time',
        data: counts,
        borderColor: '#8ab4f8',
        backgroundColor: 'rgba(138,180,248,0.2)',
        fill: true,
        tension: 0.1
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Monthly Applications Received',
          color: '#fff'
        }
      },
      scales: {
        x: {
          ticks: { color: '#fff' },
          title: {
            display: true,
            text: 'Month',
            color: '#fff'
          }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#fff' },
          title: {
            display: true,
            text: 'Count',
            color: '#fff'
          }
        }
      }
    }
  });
}

function renderCategoryChart(categoryCounts) {
  const categories = Object.keys(categoryCounts);
  const counts = categories.map(cat => categoryCounts[cat]);

  const ctx = document.getElementById("categoryChart").getContext("2d");
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: categories,
      datasets: [{
        label: 'Applications by Category',
        data: counts,
        backgroundColor: '#ff9f40'
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Applications by Category',
          color: '#fff'
        }
      },
      scales: {
        x: {
          ticks: { color: '#fff' },
          title: {
            display: true,
            text: 'Category',
            color: '#fff'
          }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#fff' },
          title: {
            display: true,
            text: 'Count',
            color: '#fff'
          }
        }
      }
    }
  });
}

function renderDayOfWeekChart(dayOfWeekData) {
  // Typical day-of-week order
  const order = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  // Filter out days that are not in dayOfWeekData
  const days = order.filter(d => dayOfWeekData[d] !== undefined);
  const counts = days.map(d => dayOfWeekData[d]);

  const ctx = document.getElementById("dayOfWeekChart").getContext("2d");
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        label: 'Applications by Day of Week',
        data: counts,
        backgroundColor: '#9f80ff'
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Applications by Day of Week',
          color: '#fff'
        }
      },
      scales: {
        x: {
          ticks: { color: '#fff' },
          title: {
            display: true,
            text: 'Day',
            color: '#fff'
          }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#fff' },
          title: {
            display: true,
            text: 'Count',
            color: '#fff'
          }
        }
      }
    }
  });
}

function populateApplicationsTable(applications) {
  const tbody = document.getElementById("applicationsTable").querySelector("tbody");
  tbody.innerHTML = "";

  applications.forEach(app => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${app.subject}</td>
      <td>${app.status}</td>
      <td>${app.created_at}</td>
      <td>${app.sender_email}</td>
      <td>${app.job_category}</td>
      <td>${app.job_type}</td>
      <td>${app.job_location}</td>
      <td>${app.job_company}</td>
    `;
    tbody.appendChild(row);
  });
}
