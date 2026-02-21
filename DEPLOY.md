# 🏠 ChoreQuest — Deployment Guide

## What You'll Need
- Your **Vercel account** (you already have this!)
- A **GitHub account** (free — sign up at github.com if you don't have one)
- About **15 minutes**

---

## Step 1: Create a GitHub Account (skip if you have one)

1. Go to **github.com** and click **Sign Up**
2. Follow the prompts to create a free account
3. Verify your email

---

## Step 2: Upload This Project to GitHub

1. Log into **github.com**
2. Click the **+** button in the top right corner → **New repository**
3. Name it: **chorequest**
4. Make sure **Public** is selected
5. Click **Create repository**
6. On the next page, you'll see instructions — **ignore them for now**
7. Click **"uploading an existing file"** (it's a link on that page)
8. **Unzip the chorequest.zip file** you downloaded onto your computer
9. **Drag the entire contents** of the unzipped folder into the GitHub upload area:
   - `app/` folder (contains `page.js`, `layout.js`, and `api/` folder)
   - `package.json`
   - `next.config.js`
   - This `DEPLOY.md` file (optional)
10. Click **Commit changes**

---

## Step 3: Connect to Vercel

1. Go to **vercel.com** and log in
2. Click **"Add New..."** → **Project**
3. You'll see your GitHub repositories — click **Import** next to **chorequest**
4. On the configuration screen:
   - **Framework Preset** should automatically say **Next.js** ✓
   - Leave everything else as default
5. Click **Deploy**
6. Wait about 1-2 minutes while it builds

---

## Step 4: Add the Database (Vercel KV)

This is the crucial step that gives your app a shared database!

1. After deploy finishes, you'll be on your project dashboard in Vercel
2. Click the **Storage** tab at the top
3. Click **Create Database**
4. Select **KV (Durable Redis)**
5. Name it: **chorequest-db**
6. Select the **Free** plan
7. Click **Create**
8. It will ask which environment to connect to — select **Production** and click **Connect**

---

## Step 5: Redeploy (so the app picks up the database)

1. Go to the **Deployments** tab
2. Find the most recent deployment
3. Click the **⋮** (three dots) menu on the right
4. Click **Redeploy**
5. Confirm by clicking **Redeploy** again
6. Wait for it to finish (1-2 minutes)

---

## Step 6: Open Your App! 🎉

1. Go to the **Project** tab in Vercel
2. You'll see your app URL — it'll look something like: **chorequest-abc123.vercel.app**
3. Click it!
4. **Bookmark it on your iPad** — this is the kids' main screen
5. **Bookmark it on your phones** — this is where you and Jan will verify chores

### 📱 To add it to the iPad home screen (feels like a real app!):
1. Open the URL in Safari on the iPad
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **Add to Home Screen**
4. Name it **ChoreQuest** and tap **Add**
5. Now it has its own icon on the home screen!

---

## How It Works

- **Kids tap their avatar** on the iPad → spin the wheel (first time each week) → see their chores
- **Parents/babysitter** tap the 🔒 button → enter PIN **1234** → verify chores, add/deduct points
- **Data syncs across all devices** — Owen checks off a chore on the iPad, you can verify it from your phone
- **Every Sunday at 12:01 AM** the app automatically resets for the new week

---

## Troubleshooting

**App shows "Loading ChoreQuest..." forever:**
- Make sure you completed Step 4 (adding the KV database)
- Make sure you redeployed after adding KV (Step 5)

**"Error" or blank page:**
- Go to Vercel → your project → Deployments tab
- Click on the latest deployment → check the **Functions** log for errors
- Most likely the KV database isn't connected — redo Step 4

**Want to change the PIN?**
- In the `app/page.js` file, search for `"1234"` and change it to your preferred PIN
- Commit the change in GitHub and Vercel will auto-redeploy

**Want to change chores, points, or thresholds?**
- Edit the values at the top of `app/page.js`
- `BASELINE = 150` and `STRETCH = 180` control the point thresholds
- The `standingChores` array lists all recurring chores
- Commit changes in GitHub → Vercel auto-redeploys

---

## Your Family Built This! 🎉

ChoreQuest was designed by Emily, Jan, Owen & Liam.
Have fun — and may the best chore-doer win the wheel spin!
