// Global state
var allFilms      = [];
var filteredFilms = [];
var currentSort   = { key: "box_office", order: "desc" };

// DOM references
var tableBody     = document.getElementById("tableBody");
var searchInput   = document.getElementById("searchInput");
var yearFilter    = document.getElementById("yearFilter");
var countryFilter = document.getElementById("countryFilter");
var resetBtn      = document.getElementById("resetFilters");
var resultsInfo   = document.getElementById("resultsInfo");
var modalOverlay  = document.getElementById("modalOverlay");
var modalTitle    = document.getElementById("modalTitle");
var modalBody     = document.getElementById("modalBody");
var modalClose    = document.getElementById("modalClose");
var themeToggle   = document.getElementById("themeToggle");

// Load JSON data, assign ranks, and bootstrap the page
async function loadData() {
  tableBody.innerHTML =
    '<tr><td colspan="6" class="loading"><div class="spinner"></div> Loading data...</td></tr>';

  try {
    var resp = await fetch("data/films.json");
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    allFilms = await resp.json();

    allFilms.sort(function(a, b) { return b.box_office - a.box_office; });
    allFilms.forEach(function(f, i) { f._rank = i + 1; });

    filteredFilms = allFilms.slice();
    populateFilters();
    renderStats();
    renderTable();
    renderCharts();
  } catch (err) {
    tableBody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">' +
      "Failed to load data: " + err.message + "</td></tr>";
    console.error(err);
  }
}

// Build year (decade) and country dropdown options from the loaded data
function populateFilters() {
  var decades = Array.from(new Set(allFilms.map(function(f) {
    return Math.floor(f.release_year / 10) * 10;
  }))).sort();

  decades.forEach(function(d) {
    var opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d + "s";
    yearFilter.appendChild(opt);
  });

  var countrySet = new Set();
  allFilms.forEach(function(f) {
    f.country.split(",").forEach(function(c) { countrySet.add(c.trim()); });
  });

  Array.from(countrySet).sort().forEach(function(c) {
    var opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    countryFilter.appendChild(opt);
  });
}

// Compute and render aggregate statistics
function renderStats() {
  document.getElementById("statTotal").textContent = allFilms.length;

  var total = allFilms.reduce(function(s, f) { return s + f.box_office; }, 0);
  document.getElementById("statRevenue").textContent = formatCurrency(total, true);
  document.getElementById("statAvg").textContent    = formatCurrency(total / allFilms.length, true);

  var dirCount = {};
  allFilms.forEach(function(f) {
    f.director.split(",").forEach(function(d) {
      d = d.trim();
      if (d && d !== "Unknown") dirCount[d] = (dirCount[d] || 0) + 1;
    });
  });

  var top = Object.entries(dirCount).sort(function(a, b) { return b[1] - a[1]; })[0];
  document.getElementById("statDirector").textContent =
    top ? top[0] + " (" + top[1] + ")" : "—";
}

// Sort filteredFilms and rebuild the table body
function renderTable() {
  var key  = currentSort.key;
  var mult = currentSort.order === "asc" ? 1 : -1;

  filteredFilms.sort(function(a, b) {
    var va = a[key];
    var vb = b[key];
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();
    if (va < vb) return -1 * mult;
    if (va > vb) return  1 * mult;
    return 0;
  });

  document.querySelectorAll("#filmsTable th").forEach(function(th) {
    th.classList.remove("sorted-asc", "sorted-desc");
    if (th.dataset.sort === key) {
      th.classList.add(currentSort.order === "asc" ? "sorted-asc" : "sorted-desc");
    }
  });

  var html = "";
  filteredFilms.forEach(function(f, i) {
    var rank = (key === "box_office" && currentSort.order === "desc") ? i + 1 : f._rank;
    html +=
      '<tr onclick="showModal(' + f.id + ')">' +
      '<td class="rank-cell">' + rank + '</td>' +
      '<td><strong>' + escapeHtml(f.title) + '</strong></td>' +
      '<td>' + f.release_year + '</td>' +
      '<td>' + escapeHtml(f.director) + '</td>' +
      '<td class="revenue-cell">' + formatCurrency(f.box_office) + '</td>' +
      '<td>' + escapeHtml(f.country) + '</td>' +
      '</tr>';
  });

  tableBody.innerHTML = html;
  resultsInfo.textContent = "Showing " + filteredFilms.length + " of " + allFilms.length + " films";
}

// Apply search, decade, and country filters then re-render
function applyFilters() {
  var q       = searchInput.value.toLowerCase().trim();
  var decade  = yearFilter.value;
  var country = countryFilter.value;

  filteredFilms = allFilms.filter(function(f) {
    if (q && f.title.toLowerCase().indexOf(q) === -1 &&
            f.director.toLowerCase().indexOf(q) === -1) return false;
    if (decade && Math.floor(f.release_year / 10) * 10 !== +decade) return false;
    if (country && f.country.indexOf(country) === -1) return false;
    return true;
  });

  renderTable();
}

searchInput.addEventListener("input", applyFilters);
yearFilter.addEventListener("change", applyFilters);
countryFilter.addEventListener("change", applyFilters);

resetBtn.addEventListener("click", function() {
  searchInput.value   = "";
  yearFilter.value    = "";
  countryFilter.value = "";
  filteredFilms = allFilms.slice();
  renderTable();
});

// Column header click — toggle sort direction or set new sort key
document.querySelectorAll("#filmsTable th[data-sort]").forEach(function(th) {
  th.addEventListener("click", function() {
    var key = th.dataset.sort;
    if (currentSort.key === key) {
      currentSort.order = currentSort.order === "asc" ? "desc" : "asc";
    } else {
      currentSort.key   = key;
      currentSort.order = (key === "box_office" || key === "release_year") ? "desc" : "asc";
    }
    renderTable();
  });
});

// Open the film detail modal for a given film id
function showModal(id) {
  var film = allFilms.find(function(f) { return f.id === id; });
  if (!film) return;

  var pct = ((film.box_office / allFilms[0].box_office) * 100).toFixed(1);

  modalTitle.textContent = film.title;

  // ── Poster ────────────────────────────────────────────────
  // Always wrap in .modal-poster so flex layout stays consistent.
  // No inline onerror — we attach the handler after innerHTML is set.
  var posterHtml;
  if (film.poster) {
    posterHtml =
      '<div class="modal-poster">' +
        '<img src="' + escapeHtml(film.poster) + '"' +
             ' alt="' + escapeHtml(film.title) + ' poster">' +
      '</div>';
  } else {
    posterHtml =
      '<div class="modal-poster">' +
        '<div class="modal-poster-placeholder">No poster<br>available</div>' +
      '</div>';
  }

  // ── Details ───────────────────────────────────────────────
  var taglineHtml = (film.tagline && film.tagline.trim())
    ? '<p><span class="label">Tagline: </span><em>' + escapeHtml(film.tagline) + '</em></p>'
    : '';

  var detailsHtml =
    '<div class="modal-details">' +
      '<p><span class="label">Year: </span>' + film.release_year + '</p>' +
      '<p><span class="label">Director: </span>' + escapeHtml(film.director) + '</p>' +
      '<p><span class="label">Box Office: </span>' + formatCurrency(film.box_office) + '</p>' +
      '<p><span class="label">Country: </span>' + escapeHtml(film.country) + '</p>' +
      '<p><span class="label">Rank: </span>#' + film._rank + ' all-time</p>' +
      taglineHtml +
      '<div class="modal-bar-container">' +
        '<div class="modal-bar" style="width:0%"></div>' +
      '</div>' +
      '<p class="modal-bar-label">' + pct + '% of top film revenue</p>' +
    '</div>';

  modalBody.innerHTML =
    '<div class="modal-inner">' + posterHtml + detailsHtml + '</div>';

  // ── Attach image error handler AFTER innerHTML is set ─────
  var posterImg = modalBody.querySelector(".modal-poster img");
  if (posterImg) {
    posterImg.onerror = function() {
      this.parentNode.innerHTML =
        '<div class="modal-poster-placeholder">No poster<br>available</div>';
    };
  }

  modalOverlay.classList.add("active");

  // Animate the revenue bar
  setTimeout(function() {
    var bar = modalBody.querySelector(".modal-bar");
    if (bar) bar.style.width = pct + "%";
  }, 50);
}

modalClose.addEventListener("click", function() {
  modalOverlay.classList.remove("active");
});

modalOverlay.addEventListener("click", function(e) {
  if (e.target === modalOverlay) modalOverlay.classList.remove("active");
});

document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") modalOverlay.classList.remove("active");
});

// Chart instances — stored so they can be destroyed before re-render
var chartInstances = [];

function renderCharts() {
  chartInstances.forEach(function(c) { c.destroy(); });
  chartInstances = [];

  var isDark    = document.documentElement.getAttribute("data-theme") === "dark";
  var gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  var textColor = isDark ? "#94a1b2" : "#6c757d";

  Chart.defaults.color = textColor;

  var palette = [
    "#f2c94c", "#f2994a", "#eb5757", "#6fcf97", "#56ccf2",
    "#bb6bd9", "#e17055", "#00cec9", "#a29bfe", "#fd79a8"
  ];

  // Top 10 horizontal bar chart
  var top10 = allFilms.slice(0, 10);
  var ctx1 = document.getElementById("topFilmsChart").getContext("2d");
  chartInstances.push(new Chart(ctx1, {
    type: "bar",
    data: {
      labels: top10.map(function(f) { return truncate(f.title, 22); }),
      datasets: [{
        label: "Worldwide Gross ($)",
        data: top10.map(function(f) { return f.box_office; }),
        backgroundColor: palette,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) { return formatCurrency(ctx.raw); }
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { callback: function(v) { return "$" + (v / 1e9).toFixed(1) + "B"; } }
        },
        y: { grid: { display: false } }
      }
    }
  }));

  // Films per decade bar chart
  var decadeMap = {};
  allFilms.forEach(function(f) {
    var d = Math.floor(f.release_year / 10) * 10;
    decadeMap[d] = (decadeMap[d] || 0) + 1;
  });
  var decadeLabels = Object.keys(decadeMap).sort();

  var ctx2 = document.getElementById("decadeChart").getContext("2d");
  chartInstances.push(new Chart(ctx2, {
    type: "bar",
    data: {
      labels: decadeLabels.map(function(d) { return d + "s"; }),
      datasets: [{
        label: "Number of Films",
        data: decadeLabels.map(function(d) { return decadeMap[d]; }),
        backgroundColor: "#6c5ce7",
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { stepSize: 1 }
        },
        x: { grid: { display: false } }
      }
    }
  }));

  // Revenue by country doughnut chart
  var countryRev = {};
  allFilms.forEach(function(f) {
    var c = f.country.indexOf(",") >= 0 ? f.country.split(",")[0].trim() : f.country;
    countryRev[c] = (countryRev[c] || 0) + f.box_office;
  });
  var cLabels = Object.keys(countryRev).sort(function(a, b) {
    return countryRev[b] - countryRev[a];
  });

  var ctx3 = document.getElementById("countryChart").getContext("2d");
  chartInstances.push(new Chart(ctx3, {
    type: "doughnut",
    data: {
      labels: cLabels,
      datasets: [{
        data: cLabels.map(function(c) { return countryRev[c]; }),
        backgroundColor: palette.slice(0, cLabels.length),
        borderWidth: 2,
        borderColor: isDark ? "#1a1932" : "#ffffff"
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 16, usePointStyle: true, pointStyle: "circle" }
        },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              return ctx.label + ": " + formatCurrency(ctx.raw, true);
            }
          }
        }
      }
    }
  }));

  // Box office vs year scatter chart
  var ctx4 = document.getElementById("yearlyChart").getContext("2d");
  chartInstances.push(new Chart(ctx4, {
    type: "scatter",
    data: {
      datasets: [{
        label: "Film",
        data: allFilms.map(function(f) { return { x: f.release_year, y: f.box_office }; }),
        backgroundColor: "rgba(242, 201, 76, 0.6)",
        pointRadius: 5,
        pointHoverRadius: 8
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              var film = allFilms.find(function(f) {
                return f.release_year === ctx.raw.x && f.box_office === ctx.raw.y;
              });
              return (film ? film.title : "") + " — " + formatCurrency(ctx.raw.y, true);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          title: { display: true, text: "Year" }
        },
        y: {
          grid: { color: gridColor },
          ticks: { callback: function(v) { return "$" + (v / 1e9).toFixed(1) + "B"; } },
          title: { display: true, text: "Worldwide Gross" }
        }
      }
    }
  }));
}

// Toggle between dark and light theme, rebuild charts with updated colors
themeToggle.addEventListener("click", function() {
  var html    = document.documentElement;
  var current = html.getAttribute("data-theme");
  var next    = current === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  themeToggle.textContent = next === "dark" ? "Dark" : "Light";
  renderCharts();
});

// Utility: format a number as a dollar amount, optionally abbreviated
function formatCurrency(value, short) {
  if (short && value >= 1e9) return "$" + (value / 1e9).toFixed(1) + "B";
  if (short && value >= 1e6) return "$" + (value / 1e6).toFixed(0) + "M";
  return "$" + value.toLocaleString("en-US");
}

// Utility: truncate a string to a given length with an ellipsis
function truncate(str, len) {
  return str.length > len ? str.slice(0, len) + "..." : str;
}

// Utility: escape HTML special characters to prevent XSS
function escapeHtml(text) {
  var div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Add a shadow to the navbar when the user scrolls down
window.addEventListener("scroll", function() {
  document.getElementById("navbar").classList.toggle("scrolled", window.scrollY > 60);
});

document.addEventListener("DOMContentLoaded", loadData);
