# Deploying SamDesk (Vercel + Neon) — step by step

This puts SamDesk on the internet so your whole team can log in from any
device. Total cost: **free**. Time: ~20 minutes. You do not need to install
anything on your computer.

You'll create two free accounts: **Neon** (the database) and **Vercel** (the
website host). Do them in this order.

---

## STEP 1 — Create the database (Neon)

1. Go to **https://neon.tech** and click **Sign up**. Sign up with your GitHub
   account (the same one that owns the SamDesk repo) — it's the simplest.
2. Click **Create Project**. Name it `samdesk`. Pick the region closest to you
   (e.g. *AWS Asia Pacific (Mumbai)*). Click **Create**.
3. After it's created, Neon shows a **Connection String**. Click **Copy**.
   It looks like:
   `postgresql://username:password@ep-xxxx.aws.neon.tech/neondb?sslmode=require`
4. **Paste it somewhere safe** (a notepad) — you'll need it in Step 2.

---

## STEP 2 — Deploy the website (Vercel)

1. Go to **https://vercel.com** and click **Sign up** → continue with **GitHub**.
2. Click **Add New… → Project**.
3. Find the **SamDesk** repository in the list and click **Import**.
4. Before clicking Deploy, open the **Environment Variables** section and add
   the following (Name on the left, Value on the right). Click **Add** after each:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | *(the Neon connection string you copied in Step 1)* |
   | `NEXTAUTH_SECRET` | *(any long random string — see tip below)* |
   | `NEXTAUTH_URL` | `https://samdesk.vercel.app` *(you'll fix this in Step 4)* |
   | `SEED_SECRET` | *(any random word/phrase only you know, e.g. `sam-setup-9912`)* |

   **Tip for NEXTAUTH_SECRET:** just mash a long random string of letters and
   numbers (40+ characters). It must stay secret.

   *(Optional)* To set strong starting passwords instead of the defaults, also
   add `DIRECTOR_PASSWORD`, `VP_PASSWORD`, `ACCOUNTS_PASSWORD`, `MFG_PASSWORD`,
   `DESIGN_PASSWORD`, `SALES_PASSWORD` with values of your choice.

5. **Important — set the branch.** In **Settings → Git → Production Branch**,
   set it to `claude/loving-mendel-rela5r` (that's where the current code is).
   *(If you don't see this during import, deploy first, then change it in
   Settings and redeploy.)*
6. Click **Deploy**. Wait ~2–3 minutes for it to finish.

---

## STEP 3 — Fix the app URL

1. After deploy, Vercel shows your live URL, e.g. `https://samdesk-xyz.vercel.app`.
2. Go to **Settings → Environment Variables**, edit **`NEXTAUTH_URL`** and set it
   to that exact URL (no trailing slash). Save.
3. Go to **Deployments → (top one) → ⋯ → Redeploy** so the new URL takes effect.

---

## STEP 4 — Create the team accounts (one time)

1. In your browser, visit:
   `https://YOUR-APP.vercel.app/api/seed?secret=YOUR_SEED_SECRET`
   (replace both parts with your real URL and the `SEED_SECRET` you chose).
2. You should see `{"message":"Users seeded successfully"}`.

Default logins (change them immediately — Step 5):

| Role | Email | Password |
|------|-------|----------|
| Director | director@samdesk.in | Director@123 |
| VP | vp@samdesk.in | VP@123456 |
| Accounts | accounts@samdesk.in | Accounts@123 |
| Manufacturing | mfg@samdesk.in | Mfg@123456 |
| Design | design@samdesk.in | Design@123 |
| Sales | sales@samdesk.in | Sales@123 |

*(If you set the optional password env vars in Step 2, use those instead.)*

---

## STEP 5 — Log in and secure it

1. Go to `https://YOUR-APP.vercel.app` and log in as the director.
2. Open **Settings** (sidebar) → **Change Password**. Change your password.
3. Have each team member log in and change their own password under Settings.

That's it — SamDesk is live. Share the URL and logins with your team.

---

## Updating the app later

Whenever new features are pushed to the `claude/loving-mendel-rela5r` branch,
Vercel automatically rebuilds and redeploys within a couple of minutes. You
don't have to do anything.

## Notes & safety

- All traffic is HTTPS (encrypted) automatically.
- The `/api/seed` endpoint is locked behind your `SEED_SECRET`.
- Login sessions are signed with your `NEXTAUTH_SECRET`.
- The database lives on Neon and is separate from the website host.
- You can add a custom domain (e.g. `desk.samproducts.net`) later in Vercel →
  Settings → Domains.
