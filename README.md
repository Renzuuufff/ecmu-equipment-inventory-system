# ECMU Equipment Inventory System

A Netlify-ready static web app for maintaining an inventory of ECMU equipment.

## Included fields

- Equipment ID / Code
- Equipment Name
- Category
- Brand / Model
- Serial Number
- Property Number / Asset Tag
- Project Source / Where It Came From
- Acquisition / Delivery Date
- Location / Station
- Assigned Personnel / Custodian
- Status
- Last PM / Inspection Date
- Next PM / Inspection Date
- Description
- Remarks / Findings
- Equipment Picture

## Features

- Add, edit, duplicate, and delete records
- Upload and preview equipment picture
- Image compression before saving
- Search by name, serial number, project, location, description, and remarks
- Filter by category and status
- Dashboard counts
- Export CSV
- Backup and restore JSON, including photos
- Print-friendly inventory table

## Important limitation

This version is a static Netlify app. Inventory data is saved in the browser using IndexedDB.

That means:

- It works offline after first load.
- It does not require a server.
- Data is not automatically shared between computers or phones.
- Use `Backup JSON` regularly.
- For real multi-user access, connect the app to Supabase, Firebase, or another database later.

## Deploy to Netlify using drag-and-drop

1. Keep all files in this folder.
2. Zip the folder or drag the folder directly to Netlify Drop.
3. Netlify publish directory is the project root because this is a static app.
4. Open the generated `netlify.app` link.

## File list

- `index.html` — main page
- `styles.css` — layout and design
- `app.js` — inventory logic and IndexedDB storage
- `netlify.toml` — Netlify configuration
- `_redirects` — SPA fallback route
