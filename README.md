# 📚 Autonomous Author & Book Writer Data Scraper (USA & Canada)

Autonomous lead generation, multi-source verification, and AI batch-cleaning engine designed to mine published book authors, indie authors, and writers across the United States and Canada.

Built to run **100% Free 24/7 on GitHub Actions** and locally.

---

## 🌟 Key Features

1. **Multi-Source Discovery**:
   - Searches Goodreads, Substack author directories, Amazon author media kits, and Writers Guilds.
   - Covers all 50 US States and Canadian Provinces across major genres (Fiction, Thriller, Romance, Self-Help, Business, Memoirs, etc.).

2. **Deep Verification Engine**:
   - Inspects author personal websites, Substacks, and press/contact pages.
   - Extracts direct personal emails and contact phone numbers.
   - Filters out generic addresses (`info@`, `support@`) when direct personal emails exist.

3. **AI Batch Cleaning (100 Leads per Batch)**:
   - Evaluates leads in batches of 100 via free LLM models (`google/gemini-2.0-flash-exp:free`, `deepseek/deepseek-chat:free`, `meta-llama/llama-3.3-70b-instruct:free`).
   - Confirms author role (distinguishes real authors from readers or illustrators).
   - Standardizes genre categorization, verifies book titles, and assigns a Quality Score (1 to 10).
   - Includes intelligent rule-based fallback that works offline with zero API cost.

4. **Structured Multi-Tab Master Excel (.xlsx) & CSV**:
   - `All Authors`: Complete master directory.
   - `USA Authors`: US-verified book writers.
   - `Canada Authors`: Canada-verified book writers.
   - `Summary by Genre`: Breakdown of leads per category.

5. **24/7 Cloud Execution on GitHub Actions**:
   - Runs on schedule every 4 hours in the cloud.
   - Auto-commits updated spreadsheets back to the repository.
   - Uploads downloadable Excel artifacts.

---

## 🚀 How to Push to GitHub (Roman Urdu Guide)

1. **GitHub par new repository banayein**:
   - Browser me [github.com/new](https://github.com/new) kholein.
   - Repository ka name rakhein: `author-data-scraper`.
   - **Public** choose karein (is se GitHub Actions ke unlimited free hours miltay hain) ya **Private**.
   - "Add a README file" ko **uncheck** rakhein aur Create repository par click karein.
   - Repo ka URL copy karein (e.g. `https://github.com/Reysajju/author-data-scraper.git`).

2. **Code push karein**:
   - Is folder me मौजूद `push_to_github.bat` par double-click karein.
   - Apna GitHub repo URL paste karein aur **Enter** press karein.

3. **GitHub Actions me Permissions enable karein**:
   - Apne GitHub repo me jayein -> **Settings** -> **Actions** -> **General**.
   - Neeche **Workflow permissions** me **"Read and write permissions"** select kar ke Save karein.

4. **Scraper start karein**:
   - Repo ke **Actions** tab me jayein.
   - **"24/7 Author Lead Scraper (USA & Canada)"** par click karein.
   - **Run workflow** button daba dein. Ab ye cloud me 24/7 khud chalega!
