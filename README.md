# Tandem — Cooperative Language Exchange

Two players on different devices practice languages together in real-time.

## How it works

1. Player 1 creates a room → gets a 4-letter code (e.g. "ABCD")
2. Player 2 enters the code → joins the room
3. Upload a sentence file or use the demo set
4. Each player fills in blanks in the language they're learning
5. After both submit, click Reveal to see answers, then Next to continue

## File format

Sentence pairs with blanks marked by `[square brackets]`.

**Tab-separated** (one pair per line):
```
Je [mange] trois repas par jour.	我每天[吃]三顿饭。
Le [matin], je prends un petit déjeuner.	在[早上]，我吃早餐。
```

**Or alternating lines:**
```
Je [mange] trois repas par jour.
我每天[吃]三顿饭。
Le [matin], je prends un petit déjeuner.
在[早上]，我吃早餐。
```

---

## Deploy to Render (FREE) — Step by Step

### Step 1: Create a GitHub account (if you don't have one)
Go to https://github.com and sign up. It's free.

### Step 2: Create a new repository
1. Click the **+** button (top right) → **New repository**
2. Name it `tandem-online`
3. Set it to **Public**
4. Click **Create repository**

### Step 3: Upload the project files
1. On your new repo page, click **"uploading an existing file"**
2. Drag all 3 files/folders into it:
   - `package.json`
   - `server.js`
   - `public/index.html` (create the `public` folder first)
3. Click **Commit changes**

Your repo should look like:
```
tandem-online/
├── package.json
├── server.js
└── public/
    └── index.html
```

### Step 4: Deploy on Render
1. Go to https://render.com and sign up (free, use your GitHub account)
2. Click **New +** → **Web Service**
3. Connect your GitHub account if not already
4. Select the `tandem-online` repository
5. Fill in:
   - **Name**: `tandem` (or anything)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**
6. Click **Create Web Service**

### Step 5: Wait ~2 minutes
Render will install dependencies and start the server.
You'll get a URL like: `https://tandem-xxxx.onrender.com`

### Step 6: Play!
1. Open the URL on your phone or computer
2. Click **Create Room** → share the 4-letter code
3. Your partner opens the same URL → enters the code
4. Upload a sentence file or click **Demo**
5. Start learning together!

---

## Notes

- **Free tier**: Render's free tier sleeps after 15 min of inactivity.
  First load may take ~30 seconds to wake up. After that it's instant.
- **No database needed**: Everything runs in memory. Rooms are temporary.
- **Works on mobile**: The layout adapts to smaller screens.
- **Any language pair**: The app doesn't care which languages you use.
  French-Chinese, English-Spanish, Japanese-Korean — anything works.

## Run locally (for testing)

```bash
npm install
npm start
```
Open http://localhost:3000 in two browser tabs.
