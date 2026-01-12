<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1cFz-pEGPwmbkCVhG45c1tQHsfZnbdmun

## Run Locally

**Prerequisites:**  Node.js
<p>ReadForMe is a high-sensitivity scientific synthesis platform designed to transform directories of complex research into structured, actionable intelligence. Central to the experience is an AI agent named Mike, who performs a "tough screen" of your documents to identify thematic outliers—explicitly flagging and explaining why a specific article may not fit the project’s scope, such as distinguishing a cardiovascular paper within an immunology folder or separating review articles from primary literature. Unlike standard search tools, Mike synthesizes insights across your entire document library simultaneously, providing comprehensive responses with strict APA-formatted citations that automatically update whenever new PDFs are added to a project. Beyond the uploaded files, Mike identifies research gaps by connecting to the web to recommend peer-reviewed reading and future experimental directions. The process concludes with a sophisticated PDF report generator that ignores chronological chat history to logically reorganize your research questions into a professional scientific narrative, ranging from background information to experimental methodology.
</p>

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
