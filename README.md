# ReelFocus AI: Student Reels Recommendation Agent

A state-of-the-art, client-side web application built for the **"THE ALGORITHM KNOWS YOU TOO WELL"** hackathon challenge. ReelFocus AI intercepts student short-form scrolling interactions, constructs a real-time multidimensional interest profile, and recommends high-value educational technology videos that bypass shallow engagement traps.

---

## 🚀 Key Features

1. **Smartphone Feed Simulator**:
   - Allows users to swipe and scroll through 8 diverse simulated short-form videos (memes, tech vlogs, coding jokes, gadgets, gaming, and tech news).
   - Simulates high-fidelity engagement inputs: **Watch Duration (3-second hook)**, **Likes**, **Loops (Rewatches)**, **Shares**, **Saves (Bookmarks)**, and **Comments (with custom text parsing)**.

2. **Dynamic "Interest DNA" Vector**:
   - Aggregates interaction signals dynamically in the browser, showing how the model classifies student interests.
   - Handles the **Built-in Trap**: if a student watches a Java meme, an interview joke, and a laptop review, the Interest DNA minimizes basic Java syntax weights and elevates Software Engineering, DSA, and Career vectors.

3. **Gamified Productivity Dashboard ("Time Well Spent")**:
   - Models the product as a launch-ready commercial consumer tool.
   - Tracks **Time Saved** (redirected from gaming/entertainment to productive concepts), **Hype Content Filtered** (counting skipped clickbait), and **Tech DNA Rank** progression levels.

4. **Structured Agent Output**:
   - Formats recommendations precisely matching the hackathon's required output schema:
     - `CURRENT REEL`
     - `INTEREST DETECTED`
     - `WHY`
     - `RECOMMENDED TECH REEL`
     - `CATEGORY`
     - `WHY THIS RECOMMENDATION`
     - `DIFFICULTY`
     - `CONFIDENCE`

5. **Dual Recommendation Pipeline**:
   - **Local Inference Engine (Offline-First):** Uses client-side vector dot products to search and rank candidates instantly with zero server setup or latency.
   - **Live AI Agent Engine (Gemini Powered):** Connect your Google AI Studio API key to perform dynamic real-time semantic analysis and reasoning generation using Gemini 1.5 Flash.

6. **Interactive System Architecture**:
   - Visualizes the enterprise-grade data pipeline (Event Telemetry $\rightarrow$ Profiler $\rightarrow$ Cosine Retrieval $\rightarrow$ Gemini RAG Filtering) using interactive inline SVG diagrams.

---

## 🛠️ The Algorithmic Scoring Formula

To mirror actual industrial systems (like TikTok's Monolith framework), we calculate an **Engagement Weight (EW)** for every interaction:

$$EW = \text{WatchRatio} \times \left(1.0 + 0.2 \cdot \text{Liked} + 0.4 \cdot \text{Saved} + 0.5 \cdot \text{Shared} + 0.3 \cdot \text{Commented}\right) \times \left(1.0 + 0.5 \cdot (\text{Loops} - 1)\right)$$

*   **The 3-Second Hook Rule:** If the `WatchRatio` is under $15\%$, the video is treated as an early skip. The weight becomes negative ($-0.4$), dampening associated interests in the DNA matrix.
*   **Active Signal Boosting:** Saves (+0.4) and Shares (+0.5) are heavily weighted over simple Likes (+0.2), matching current Instagram and YouTube Shorts algorithms.
*   **Loop Multiplier:** Rewatching/looping content scales the score linearly to capture deep engagement.

---

## 💻 Tech Stack (100% Free Tier Friendly)

*   **Frontend:** Semantic HTML5, Vanilla JavaScript (ES6+), and responsive CSS3 variables.
*   **AI Inference:** Gemini 1.5 Flash (via free API tier on Google AI Studio - 15 RPM).
*   **Hosting:** Fully client-side. Can be hosted for free on GitHub Pages, Netlify, or Vercel with a $0\text{s}$ server boot-up time.

---

## 📖 How to Run the Project

1. Ensure all project files are structured in the directory:
   ```text
   ├── index.html
   ├── styles.css
   ├── data.js
   ├── app.js
   └── README.md
   ```
2. Double-click `index.html` or open it in any web browser (Chrome, Safari, Firefox, Edge).
3. Select a preset (like **Built-in Trap**) or create your own custom watch session by interacting with the phone mockup.
4. Click **⚡ Generate Tech Recommendations** to view the structured recommendations.
5. (Optional) Click the status pill in the top-right corner to add your Gemini API key and activate live LLM generation!
