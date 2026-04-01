# Highest-Grossing Films — Data Wrangling & Visualization

Interactive web dashboard visualising data about the highest-grossing films of all time.
Data is scraped from Wikipedia, stored in SQLite, and presented on a static web page
hosted via GitHub Pages.

## Live Demo

> **https://haron-2.github.io/DWaV_assigment/**

## Features

| Feature | Description |
|---------|-------------|
| Search | Real-time search by title or director |
| Sort | Click any column header to sort ascending / descending |
| Filter | Filter by decade and country of origin |
| Charts | Interactive Chart.js visualisations (bar, scatter, doughnut) |
| Dark / Light Mode | Toggle between themes |
| Responsive | Mobile-friendly layout |
| Film Details | Click any row to open a detail modal |

## Project Structure

```
highest-grossing-films/
├── README.md
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── data/
│   ├── films.json        <- exported data for the web page
│   └── films.db          <- SQLite database
└── notebook/
    └── scraper.ipynb     <- Jupyter Notebook (scraping + DB)
```

## Getting Started

### 1. Run the Notebook

```bash
pip install requests beautifulsoup4 pandas matplotlib
cd notebook
jupyter notebook scraper.ipynb
```

Run all cells to scrape Wikipedia, create `films.db`, and export `films.json`.

### 2. Preview Locally

```bash
python -m http.server 8000
```

Open http://localhost:8000


## Technologies

- **Python 3** — requests, BeautifulSoup, pandas, sqlite3
- **SQLite** — relational database
- **HTML5 / CSS3** — semantic markup, CSS Grid, custom properties
- **JavaScript (ES6+)** — Fetch API, DOM manipulation
- **Chart.js** — interactive charts
- **GitHub Pages** — static hosting

## Data Source

[Wikipedia — List of highest-grossing films](https://en.wikipedia.org/wiki/List_of_highest-grossing_films)

## License

MIT
