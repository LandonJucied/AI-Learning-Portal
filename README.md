# AI Learning Portal — Vercel AI Assistant Edition

A plain HTML/CSS/JavaScript learning portal with a document-grounded AI assistant. The frontend remains framework-free. Vercel runs the private server-side endpoint at `/api/chat`.

## Project structure

- `index.html` — homepage
- `learn.html` — learning modules
- `challenges.html` — quizzes and challenges
- `dashboard.html` — progress dashboard
- `glossary.html` — glossary
- `resources.html` — educational resources and references
- `ai-assistant.html` — public student-facing AI chat page
- `about.html` — project information
- `css/main.css` — shared visual system and assistant styles
- `js/main.js` — existing portal interactions
- `js/ai-assistant.js` — chat UI and API calls; contains no secret keys
- `api/chat.js` — Vercel serverless function; retrieves passages and calls Gemini
- `knowledge/*.md` — searchable knowledge files included in the deployment

## Deploy to Vercel

1. Create or sign in to your Vercel account and import this project from a GitHub repository. Keep the project as a static HTML site; no framework preset or build command is required.
2. In Google AI Studio, create an API key for the Gemini API. Review the current service terms, free-tier quota, and data-use policy before using it for a school competition.
3. In Vercel, open **Project → Settings → Environment Variables**. Add `GEMINI_API_KEY` with your key. Optionally add `GEMINI_MODEL` with a supported model name (default is `gemini-2.5-flash`). Apply it to Production and Preview as desired.
4. Redeploy after adding environment variables. The assistant page will be available at `/ai-assistant.html` and the API at `/api/chat`.
5. Test the deployed site from a private/incognito browser window. Ask a sample question and confirm that a response and knowledge-file list appear.

**Never put the API key in `js/main.js`, `js/ai-assistant.js`, HTML, or any public file.** The API key must only exist as a server-side Vercel environment variable. Do not commit a real `.env` file.

## Add your own Google learning files

This version intentionally stores the knowledge library as files deployed with the site. That makes answers work without a paid database. To add material:

1. Use Google Docs/Drive to open material you are permitted to reuse.
2. For Google Docs, use **File → Download → Plain text (.txt)** or copy the content into a `.md` or `.txt` file. For PDFs, extract/copy the text you are permitted to use into `.txt` or `.md`; this starter version does not parse PDF files directly.
3. Put the new `.md` or `.txt` file in the `knowledge/` folder. Use descriptive filenames, remove irrelevant navigation/footer text, and include source title, URL, author/publisher, and access/publication date when known.
4. Commit and push the new file to GitHub. Vercel redeploys the project and includes the new knowledge file.

There is no public upload button that writes permanently to the deployed library. Vercel's serverless filesystem is not a persistent file store. Adding files to `knowledge/` and redeploying is the dependable free-tier workflow. A true web-based admin uploader would require a database/object-storage service and access controls.

Only use material you created, public-domain material, or material whose license/permission allows your intended use. Publicly viewable Google Drive content is not automatically free to redistribute. Keep a complete reference and attribution list on the Resources page for the TSA project.

## What the assistant does

- Searches `.md` and `.txt` passages in `knowledge/` using keyword overlap.
- Sends the user's question, limited recent conversation, and matched passages to the Gemini API.
- Returns the answer and the filenames of matched passages.
- Limits question length and has a best-effort per-instance request limit.
- Does not store conversations in a database; chat history remains in the page's memory while the page is open.

## Limitations and safety

- Free AI quotas, model availability, and provider terms can change. $0 usage is not guaranteed or unlimited.
- The in-memory rate limiter is only best-effort and is not a global abuse-prevention system. Before a high-traffic/public production release, add a shared rate-limit store or other abuse controls if needed.
- The answer model can still be wrong. The assistant is instructed to say when the bundled library lacks direct evidence, but students should verify important claims.
- Do not enter private/sensitive student data. Review the provider's data-use and retention terms and add a privacy notice appropriate to your school and competition.
- Do not rely on the assistant for emergencies, professional advice, or high-stakes decisions.
- The knowledge files are reference material, not model training. This is retrieval-augmented generation (RAG), not training a new model from scratch.

## Local preview

Static pages can be opened directly for layout review, but the assistant API only works after deployment to Vercel (or with a local server configured to emulate Vercel functions). Without `GEMINI_API_KEY`, the API returns a clear setup message.

## Before TSA submission

- Add and verify your actual sources and permissions on the Resources/reference page.
- Confirm the current TSA GenAI rules and complete required reflection/copyright forms.
- Test every page, navigation link, keyboard flow, mobile layout, accessibility setting, and assistant API response after deployment.
- Check the Vercel deployment URL is public and does not require login.
- Review the current Gemini API quota and data-use terms before the judges use the assistant.
