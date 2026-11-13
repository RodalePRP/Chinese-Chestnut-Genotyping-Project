# Chinese Chestnut Genotyping Project — website & submission database

**Live site:** https://rodaleprp.github.io/Chinese-Chestnut-Genotyping-Project/ · **Repository:** https://github.com/RodalePRP/Chinese-Chestnut-Genotyping-Project

Static website (GitHub Pages) + Google Sheets database for the Rodale Institute / Savanna Institute project
*Population-Scale Genotyping of Chinese Chestnut Germplasm in the US* (NNGA 2026, EMEF).

| Page | What it does |
|---|---|
| `index.html` | Project overview, genotyping progress (plates filled of 21), and live **submission balance** charts (maternal parent, location, species or material, with an even-share line, effective number of groups and evenness), species by location and data availability by location |
| `submit.html` | Breeders nominate trees: paste from Excel, upload `.xlsx`/`.csv`, or enter one at a time. Columns are matched automatically, values are cleaned (e.g. `chinese` → `C. mollissima`, `OP` → `Open-Pollinated (OP)`, positive longitudes flipped), problems are flagged before anything is saved, and each batch gets Submission IDs plus an emailed receipt. |
| `database.html` | Searchable, sortable table of every submitted tree (no contact details) with CSV download; 96-well view of each DArTag plate colored by maternal parent, location or species; automated data-quality checks (duplicate IDs, wells used twice, shared field positions, missing species, etc.) |
| `map.html` | Field-site map on satellite imagery: surveyed GPS point for every sampled tree (and unsampled survey trees), colored by maternal cultivar; hover for metadata plus genotype/phenotype status; drone orthomosaic overlays; site-by-site toggling; tree search; 3D-model links. |
| `policy.html` | Data policy for breeders: raw genotype data on request with breeder permission; genotype and phenotype visualizations Internal (default) or Public; what the site does and never publishes |
| `404.html` | Branded not-found page served by GitHub Pages for broken links. |
| `analysis.html` | Population-structure scatter (PCA/MDS) and diversity table, read from CSVs in `data/`. |

```
 Breeders ──► GitHub Pages site ──(HTTPS, JSON)──► Apps Script web app ──► Google Sheet
                (this repo)                          (apps-script/Code.gs)    (one tab per program)
```

Breeders never need a Google account or access to the sheet. The sheet stays private to the project team.

Field maps uploaded with a submission are saved to a Google Drive folder (`CONFIG.FIELD_MAP_FOLDER`, created automatically, 15 MB limit) and linked from every tree in that batch. This is why the script asks for Google Drive permission.

---

## Set up (about 20 minutes, one time)

### 1. Google Sheet + Apps Script
1. Open the project Google Sheet → **Extensions → Apps Script**.
2. Replace the contents of `Code.gs` with [`apps-script/Code.gs`](apps-script/Code.gs).
3. Project Settings (gear) → tick **Show "appsscript.json" manifest file** → replace it with [`apps-script/appsscript.json`](apps-script/appsscript.json).
4. At the top of `Code.gs`, set `CONFIG.SITE_URL` to your Pages address (step 2 below) and review `PROGRAMS` (tab names, Submission-ID prefixes, display names).
5. Choose function **setupWorkbook** → **Run** → approve the permissions. This builds every tab (program tabs, Master Submission, Dashboard, Primer, Field Sites, GPS Points, Submission Log) and moves any trees already in the old tabs into the new layout. It is safe to re-run.
6. **Deploy → New deployment → Web app** — *Execute as:* **Me**, *Who has access:* **Anyone**. Copy the URL ending in `/exec`.
   After later edits to `Code.gs`, use **Deploy → Manage deployments → Edit → New version** so the URL stays the same.

### 2. GitHub Pages

**Option A: no git (web upload)**
1. On github.com click **New repository**, name it (e.g. `chestnut-genotyping`), make it **Public** (free GitHub Pages needs a public repo), and create it.
2. On the empty repo page click **uploading an existing file**. Drag in **everything inside** the `chestnut-genotyping-site` folder (the files and the `assets`, `apps-script`, `data`, `templates`, `tools` folders), not the folder itself, so `index.html` sits at the top level. Commit.
3. **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `/ (root)` → Save.** After a minute the site is live at `https://<user>.github.io/<repo>/`.

**Option B: git command line**
```
cd chestnut-genotyping-site
git init -b main && git add -A && git commit -m "Initial site"
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```
Then turn on Pages as in step 3 above.

**Connect the site to the sheet**
4. In the repo open `assets/config.js` → pencil icon → paste the Apps Script `/exec` URL into `API_URL` → commit. Pages redeploys in about a minute.
5. In `Code.gs` set `CONFIG.SITE_URL` to the Pages address, then **Deploy → Manage deployments → Edit → New version**.
6. In the sheet, **🌰 Chestnut Project → Submission links for breeders** lists a pre-filled link for each program (`submit.html?program=R9`, etc.) to send out.

The `.nojekyll` file must stay in the repo (it tells GitHub Pages to serve the files as-is). All links are relative, so the site works at any repository name.

Until `API_URL` is set the site runs in **preview mode** using the real Rodale Institute plates 001–002 records in `tools/preview-data.json` (a banner says so; test submissions are not saved). Add `?demo=1` to any page to force preview mode. Regenerate with `node tools/build-demo.js`.

---

## Data sharing and breeder permissions

Every submission records the breeder's choices (Step 1 of `submit.html`; also on the template's Instructions tab). Each restricted item is either **Project team only** (default) or **Research collaborators & NNGA members**:

| Data | Setting | Column in program tab |
|---|---|---|
| Raw genotype data | Released only on request, with the breeder's written permission, before publication (fixed: `CONFIG.RAW_DATA_POLICY`) | Raw Genotype Data Release |
| Genotype visualizations | Project team only / Research collaborators & NNGA members | Genotype Visualization |
| Phenotype visualizations | Project team only / Research collaborators & NNGA members | Phenotype Visualization |
| Exact GPS positions | Project team only / Research collaborators & NNGA members | GPS Position Access |

The breeder must accept the data policy before Submit works; the Submission Log records the choices and when they were accepted, and the receipt email repeats them. To change a breeder's choice later, edit the dropdowns in their program tab.

**Access codes.** Set `TEAM_ACCESS_CODE` and `MEMBER_ACCESS_CODE` at the top of `Code.gs` and share them privately. Visitors enter a code with **Member access** (top bar or footer). The server filters every response by code:

- General public: submission records, balance charts and one pin per site; no exact positions, no results.
- Research collaborators & NNGA members: exact tree positions and results for trees whose breeders chose that group.
- Project team: everything.

Results live in the **Results – Structure** and **Results – Diversity** tabs of the sheet (not in this repository) and are served the same way. In preview mode the codes `PREVIEW-MEMBER` and `PREVIEW-TEAM` demonstrate the two levels.

## Google Sheet layout

| Tab | Purpose |
|---|---|
| Primer | Instructions and column definitions for breeders |
| Dashboard | Live counts by program and species, progress toward the ~2,000-genotype target, plates needed (94 samples/plate) |
| Master Submission | Read-only: every program tab combined by formula |
| One tab per program | Where submissions land. Shaded columns are filled automatically; green columns are for the Rodale team (Review Status, Population Group, Tissue Collected, DArT Plate/Well) |
| Field Sites | One row per map layer: site name, center, field names to match, overlay URL/type, capture date, sensor, 3D model link |
| GPS Points | Paste Trimble exports here; points link to trees by Submission ID → Program Tree ID → Trimble point name |
| Submission Log | One row per submitted batch: field-map link, data-sharing choices and when the policy was accepted |
| Results – Structure / Results – Diversity | Analysis results served to the Results page by access level |
| Data Quality | Built by **🌰 Chestnut Project → Run data-quality checks**: every issue with tab, row and IDs |
| Plate Maps | Built by **🌰 Chestnut Project → Build plate maps**: an 8 × 12 grid for each DArT plate |

Rows typed straight into a program tab can be given IDs with **🌰 Chestnut Project → Assign IDs to rows typed directly into tabs**.

---

## Map workflow (Trimble + DJI Mavic 3M)

**Before GPS exists.** Trees without coordinates are shown as one pin per site (Field Sites tab center, e.g. Rodale North Orchard 40.5542, −75.7234) or, if they have no site, one pin at the program's general address (set in `PROGRAMS` in `Code.gs`). Pins say that individual GPS points will be added.

**North Orchard survey (loaded).** `NorthOrchard_GPS_Points_import.xlsx` holds the 222 DCNR survey points (converted from PA State Plane South ftUS to WGS84) ready to paste into the GPS Points tab. 153 are linked to plate 001–002 samples; the other 69 show on the map as unsampled trees colored by maternal cultivar. Hover any point for its metadata, genotype status and phenotype status.

**Genotype / phenotype status.** A tree on a DArT plate shows *Genotyping in progress* until its plate number is added to `CONFIG.GENOTYPED_PLATES` in `Code.gs`, then *Genotype data available*. Phenotype status comes from the *Trait Data Collected?* column.

**Tree points.** Name each Trimble point with the tree's **Submission ID** (printed on the receipt / tissue bag) — then it links automatically. Export as CSV in WGS84 latitude/longitude decimal degrees and paste the columns into the **GPS Points** tab. Surveyed points replace breeder-reported coordinates on the map. Points that don't match a tree show as small grey "unlinked" dots so they can be fixed.

**Drone overlays.** The browser can't display multi-gigabyte GeoTIFFs directly, so publish orthomosaics in one of these forms and add a row on **Field Sites**:

| Overlay Type | How to make it | Notes |
|---|---|---|
| XYZ Tiles | `gdal2tiles.py --xyz -z 16-22 ortho.tif tiles/` and host the folder (cloud bucket, or in this repo for small sites); URL like `https://…/tiles/{z}/{x}/{y}.png` | Fastest and most reliable |
| GeoTIFF (COG) | `gdalwarp -t_srs EPSG:3857 ortho.tif ortho_3857.tif` then `gdal_translate -of COG ortho_3857.tif ortho_cog.tif`; host on a bucket with CORS + range requests (Google Cloud Storage, S3, Cloudflare R2) | One file per layer; good for NDVI/multispectral |
| Image | Export a reduced PNG/JPG and enter its corner coordinates in *Image Bounds (S,W,N,E)* | Quick look; Google Drive share links work for small images |
| Link only | Any URL (DJI Terra / Pix4D / Sketchfab 3D model viewer) | Shown under "3D models & links" |

GitHub limits files to 100 MB and repositories to about 1 GB, so large tile sets belong in a bucket rather than this repo. For a one-off look, drop a GeoTIFF or image onto **"Add an overlay from this computer"** on the map (session only, not shared).

---

## Analysis results
Paste results into the **Results – Structure** and **Results – Diversity** tabs of the sheet (see [`data/README.md`](data/README.md)). Do not commit tree-level results to this repository.

## Privacy
- GitHub Pages sites are public, but restricted data never are: exact GPS positions and results are filtered on the server by access code and breeder settings (see above).
- The sheet itself should be shared with named editors only (not "anyone with the link can edit") now that breeders submit through the website.

## Repository layout
```
index.html  database.html  submit.html  map.html  analysis.html  policy.html  404.html
.nojekyll            ← keep: serve files as-is on GitHub Pages
assets/config.js     ← the only file to edit (API_URL)
assets/site.css      ← shared design system (colors, type, header/footer, buttons, forms)
assets/chrome.js     ← shared header, navigation and footer
assets/api.js        ← fetch bridge to Apps Script + preview mode
assets/viz.js        ← shared chart palette and tooltip
assets/favicon.svg   ← site icon
assets/demo.js       ← generated sample data
apps-script/         ← Code.gs + appsscript.json (paste into the sheet's Apps Script)
templates/           ← Excel template with dropdowns for offline submissions
data/                ← published analysis CSVs
tools/               ← build-demo.js, build_template.py (regenerate from Code.gs)
```
After changing columns or lists in `Code.gs`, regenerate the derived files so everything stays in sync:
```
node tools/build-demo.js
python3 tools/build_template.py     # needs openpyxl
```
The submission page reads the column list from the live API, so it updates without editing HTML.

Design: IBM Plex Sans / IBM Plex Mono / Source Serif 4 (Google Fonts); forest-green palette with a chestnut-husk accent, defined as CSS variables at the top of `assets/site.css`.

Libraries (loaded from CDNs): Leaflet 1.9.4, SheetJS 0.18.5, georaster 1.6.0 + georaster-layer-for-leaflet 3.10.0. Basemaps: Esri World Imagery, OpenStreetMap.
