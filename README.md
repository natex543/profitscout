# ProfitScout — Dropshipping Product Research

A starter web app for exploring dropshipping product ideas using Google Trends' public Trending Now RSS feed, rough product economics, and optional local Ollama evaluation. It is not a verified sales-trend database.

## Run locally on Windows
1. Extract this folder.
2. Open the folder containing `package.json` and `server.js`. Click File Explorer's address bar, type `cmd`, and press Enter.
3. Run `npm install`.
4. For local AI, install Ollama from https://ollama.com/download/windows and run `ollama run llama3.2:1b` in a separate terminal.
5. Run `npm start` in the project terminal.
6. Visit `http://localhost:3000`.

## Publish a public version for free (Render)
This repo includes `render.yaml`. Upload the *contents of this folder* to a GitHub repository, then connect that repository to Render. In Render, choose **New → Blueprint** if it detects `render.yaml`, or create a **Web Service** with build command `npm install`, start command `npm start`, and environment variable `AI_PROVIDER=demo`. Render gives you a public `*.onrender.com` URL. Free services may sleep when idle and take about a minute to wake. See https://render.com/docs/free and https://render.com/docs/your-first-deploy.

**Public deployment limitation:** the free hosted version uses the shortlist scoring and Google Trends feed, not the Ollama model on your personal computer. `127.0.0.1` on a hosting service refers to the hosting server, not your PC. Keep `AI_PROVIDER=demo` for a reliable no-paid-API launch. Local AI remains available when running the app on your own computer.

## Domain
Render supplies a free `onrender.com` URL. A custom domain generally requires purchasing a domain separately. Domain names and trademark availability must be checked with a registrar and relevant trademark databases before committing.

## Data and affiliate notes
- The starter product list, supplier costs, sale prices, and margins are illustrative estimates.
- Google Trends Trending Now is a general search-topic signal, not product sales data. Product-term overlaps are weak signals only.
- Supplier search links do not pay commissions unless replaced with approved tracked affiliate URLs.
- The click log uses a local JSON file; free hosting has ephemeral storage, so do not rely on it for permanent analytics.
- Before public launch, add a privacy policy, terms, contact information, affiliate disclosure, abuse controls, and persistent storage if needed.
- Never put secrets or API keys in frontend code or a public repository.
