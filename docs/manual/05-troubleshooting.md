# Troubleshooting — Panic Guide

> Something's wrong? Start here. Calm, step-by-step fixes.

---

## "I'm Lost"

1. Click the **Home** icon in the sidebar (top of the list).
2. You're back at the dashboard.
3. Use the sidebar to navigate to any module.
4. Or press `Cmd+K` to search for anything.

---

## "The Page Is Empty"

This is the #1 most common issue. Here's the checklist:

1. **Check the status filter chips.** Above the table, look for status buttons like `[ACTIVE] [INACTIVE] [all]`. Click **all** to remove the filter.
2. **Check the search box.** If there's text in the search field, clear it.
3. **Check the date range.** In Schedule, use the navigation arrows to go to the correct week.
4. **Check your role.** Some modules are role-gated. See [Roles & Permissions](./02-roles-permissions.md).
5. **Refresh the page.** Press `Cmd+R` (Mac) or `Ctrl+R` (Windows).

> **If** it's still empty after all 5 checks **→** The data genuinely doesn't exist yet. Create your first record.

---

## "I Don't Know What This Button Does"

**Safe rule:** Buttons have two types:

| Button Style | What It Does | Safe to Click? |
|-------------|-------------|---------------|
| Blue / Primary | Creates or saves something | Yes (you can undo by editing) |
| Gray / Outline | Navigates or cancels | Always safe |
| Red / Destructive | Archives or deletes | Shows confirmation first — read it |

**Before clicking a red button:**
- A confirmation dialog will appear.
- Read the message.
- Click **Cancel** if you're unsure.

> **Nothing is permanently deleted.** All "deletes" are actually archives. An admin can restore data.

---

## "A Shift Isn't Showing Up"

Checklist:

1. **Correct week?** Navigate to the week the shift was scheduled for.
2. **Correct tab?** Make sure you're on **Employee Schedule** (`/schedule?tab=recurring`).
3. **Is the staff member assigned?** Open the shift block. Check if "Who Is Working" has someone listed.
4. **Is the ticket archived?** If someone deleted the shift, it won't appear. Check with your admin.
5. **Is the job active?** The service plan must have status ACTIVE for tickets to show.
6. **Did you create it for the right site?** Open the shift form and verify the site selection.

---

## "I Can't Edit Something"

1. **Check your role.** Only Owner, Manager, and sometimes Supervisor can edit. See [Roles](./02-roles-permissions.md).
2. **Is the record archived?** Archived items can't be edited. Check for an "archived" banner.
3. **Stale data?** If someone else edited it simultaneously, you'll see a version conflict error. Refresh and try again.
4. **Status locked?** Some statuses prevent editing (e.g., LOCKED schedule periods).

---

## "The Form Won't Submit"

1. **Check for red error messages.** Scroll through the form — there's a field with a validation error.
2. **Required fields.** Look for fields marked with * or that have red borders.
3. **Number format.** Make sure number fields have valid numbers (no letters or symbols).
4. **Date format.** Dates must be in the correct format (use the date picker).
5. **Network issue?** Check your internet connection. Try refreshing and submitting again.

---

## "I Got an Error Toast"

When a red notification appears at the top of the screen:

1. **Read the message.** It tells you what went wrong.
2. **Common errors:**

| Error Message | What It Means | What To Do |
|--------------|--------------|------------|
| "Invalid status transition" | You tried to change a status in a way that's not allowed | Check allowed transitions in [Roles](./02-roles-permissions.md) |
| "Version conflict" | Someone else edited this record at the same time | Refresh the page and try again |
| "Duplicate key" | You're creating something that already exists | Check if the record already exists |
| "tenant_id is required" | Something went wrong with your session | Log out and log back in |
| "Could not find the underlying work ticket" | The shift data doesn't match what's in the database | Refresh the schedule and try again |

---

## "I Published the Wrong Schedule"

> **Don't panic.** Published schedules can be edited.

1. Go to **Schedule** > **Employee Schedule**.
2. Find the shift that needs to change.
3. Click on it to open the Edit form.
4. Make your changes.
5. Click **Update Shift**.

If you need to undo an entire period:
- Only an Owner/Admin can change a period's status.
- A LOCKED period cannot be changed.
- A PUBLISHED period can still have individual shifts edited.

---

## "I Accidentally Archived Something"

1. Archived items are not permanently deleted.
2. Contact your admin (Owner role).
3. They can un-archive by setting `archived_at` back to null in the database.
4. This is a manual process and requires database access.

---

## "The App Is Slow"

1. **Refresh the page.** This clears cached data.
2. **Close other tabs.** The app uses real-time connections that need memory.
3. **Check your internet.** Slow connections affect every action.
4. **Try a different browser.** Chrome or Edge work best.
5. **Clear browser cache.** Settings → Clear browsing data → Cached images and files.

---

## "I Need Help That's Not Here"

- **Check the module guide** for your specific screen: [Table of Contents](./README.md).
- **Ask your admin.** They have Owner access and can investigate.
- **Check the glossary** if a term is confusing: [Glossary](./06-glossary.md).

---

## Emergency Quick Reference

| Situation | Action |
|-----------|--------|
| Completely lost | Click **Home** in sidebar |
| Need to find anything | Press `Cmd+K` |
| Page is empty | Click **all** in status filter chips |
| Can't edit | Check your role (probably need Manager) |
| Red error message | Read it, refresh, try again |
| Need to undo | Edit the record back to its previous state |
| Accidentally archived | Ask admin to restore |
