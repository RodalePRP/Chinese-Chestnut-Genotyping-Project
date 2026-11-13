/**
 * Chinese Chestnut Genotyping Project — Submission backend
 * Rodale Institute · Perennial Research Program
 *
 * What this script does
 *  1. setupWorkbook()  – one-time (safe to re-run) build of every tab: program tabs,
 *     standardized columns, dropdowns, header notes, Master Submission (auto-combined),
 *     Dashboard (progress toward genotyping target), Primer, and a hidden Lists tab.
 *  2. A small JSON API (doGet/doPost) used by the GitHub Pages site (submit / map / analysis
 *     pages). Breeders never need a Google account or access to this sheet.
 *  3. A "Chestnut Project" menu in the sheet for admin tasks.
 *
 * To change program names, edit PROGRAMS below and re-run setupWorkbook().
 */

// ───────────────────────────── CONFIG ─────────────────────────────
var CONFIG = {
  TARGET_TOTAL: 2000,          // genotyping target for the project (new accessions)
  PLATE_SIZE: 94,              // usable samples per DArTag plate
  SEND_RECEIPTS: true,         // email submitter a receipt after each batch
  NOTIFY_ADMIN: true,          // email the script owner when a batch arrives
  VALIDATION_ROWS: 3000,       // rows per program tab that get dropdowns
  EXAMPLE_TREE_ID: 'OP_AUCropper_02', // starter example row; not migrated into program tabs
  SITE_URL: 'https://rodaleprp.github.io/Chinese-Chestnut-Genotyping-Project/',                // your GitHub Pages address, e.g. https://USERNAME.github.io/chestnut-genotyping/
  RAW_DATA_POLICY: 'On request only, with breeder permission, before publication',
  GENOTYPED_PLATES: [],        // DArT plate numbers whose genotype data has been returned, e.g. ['001', '002']
  FIELD_MAP_FOLDER: 'Chestnut Genotyping – Field Maps', // Drive folder (created if missing) for field maps uploaded with submissions
  FIELD_MAP_MAX_MB: 15,
  // Access codes for restricted views on the website (share privately). Leave blank to disable that level.
  TEAM_ACCESS_CODE: '',        // project team: sees everything, including "Project team only" data
  MEMBER_ACCESS_CODE: '',      // research collaborators & NNGA members: sees data breeders released to that group
  SITE_MATCH_KM: 2             // trees without a site are assigned to the nearest site centre within this distance
};

// Tab name (≤ 30 chars, no / \ ? * [ ] :) and short prefix used in Submission IDs.
// address/lat/lon = general business location, used as one map pin until individual tree GPS points exist.
var PROGRAMS = [
  { tab: 'Rodale Institute',           prefix: 'RI',   label: 'Rodale Institute', address: '611 Siegfriedale Rd, Kutztown, PA', lat: 40.5484, lon: -75.7256 },
  { tab: 'Savanna Institute',          prefix: 'SAV',  label: 'Savanna Institute', address: '2453 Atwood Ave, Madison, WI', lat: 43.0938, lon: -89.3453 },
  { tab: 'Univ of Missouri',           prefix: 'MU',   label: 'University of Missouri – Center for Agroforestry', address: '10 Research Center Rd, New Franklin, MO', lat: 39.0173, lon: -92.7374 },
  { tab: 'Route 9 Cooperative',        prefix: 'R9',   label: 'Route 9 Cooperative', address: '4300 Germano Rd SE, Carrollton, OH', lat: 40.4920, lon: -81.0261 },
  { tab: 'Yellowbud & Breadtree',      prefix: 'YB',   label: 'Yellowbud Farm / Breadtree Farms' },
  { tab: 'Evergreen & Ohio Chestnuts', prefix: 'EVG',  label: 'Evergreen / Ohio Chestnuts' },
  { tab: 'West Coast Chestnuts',       prefix: 'WCC',  label: 'West Coast Chestnuts' },
  { tab: 'NNGA Members',               prefix: 'NNGA', label: 'NNGA Members & Commercial Growers' },
  { tab: 'Other Programs',             prefix: 'OTH',  label: 'Other program / collection (not listed)' }
];

// Field Sites created by setup if a site with the same name is not already on the Field Sites tab. Values follow SITE_COLUMNS order.
var SEED_SITES = [
  ['Rodale Institute – North Orchard', 'Rodale Institute', 'North Orchard', 40.55420439303247, -75.72337233150483, 18, '', '', '', '', '', '', '', 'Kutztown, PA. Columns V1–V14. Tree position = <row>-V<column>.'],
  ['Rodale Institute – TAC Orchard', 'Rodale Institute', 'TAC Orchard, Tree As Crop', 40.55252483934734, -75.72995272992561, 19, '', '', '', '', '', '', '', 'Kutztown, PA. Reported American chestnut (C. dentata).'],
  ['Schantz Orchard – Fogelsville', 'Rodale Institute', 'Schantz Orchard', 40.58595227460015, -75.68600705936981, 19, '', '', '', '', '', '', '', 'Fogelsville, PA. Single row; position = tree number in the row. Reported Chinese × American hybrids.']
];

// Old tab names from the starter sheet → new names (renamed in place, data kept).
var LEGACY_TABS = {
  'Missouri State': 'Univ of Missouri',
  'Route 9': 'Route 9 Cooperative',
  'Yellowbud': 'Yellowbud & Breadtree',
  'Evergreen': 'Evergreen & Ohio Chestnuts',
  'WestCoastChestnut': 'West Coast Chestnuts'
};

var TAB = { RES_STRUCT: 'Results – Structure', RES_DIV: 'Results – Diversity', PRIMER: 'Primer', MASTER: 'Master Submission', DASH: 'Dashboard', LISTS: 'Lists', LOG: 'Submission Log',
            SITES: 'Field Sites', GPS: 'GPS Points' };

// Field Sites tab: one row per map layer. Several rows can share a Site Name (e.g. RGB + NDVI, or different flight dates).
var SITE_COLUMNS = [
  ['Site Name', 'Name shown in the map site list (e.g. "Rodale – North Orchard").'],
  ['Breeding Program', 'Program the site belongs to (optional).'],
  ['Field Names to Match', 'Comma-separated Field Name values from tree submissions that belong to this site, so breeder-reported trees land on the right site.'],
  ['Center Latitude', 'Decimal degrees. Used to fly to the site and to assign nearby trees.'],
  ['Center Longitude', 'Decimal degrees (negative in North America).'],
  ['Default Zoom', 'Leaflet zoom level when the site is selected (17–20 typical for an orchard). Optional — the map fits the trees if blank.'],
  ['Layer Name', 'Label for this overlay (e.g. "M3M RGB ortho – Jun 2027", "NDVI").'],
  ['Overlay Type', 'XYZ Tiles · Image · GeoTIFF (COG) · Link only'],
  ['Overlay URL', 'XYZ: https://…/{z}/{x}/{y}.png · Image: a public PNG/JPG URL (Google Drive share links work for small images) · GeoTIFF: a public Cloud-Optimized GeoTIFF URL with CORS enabled.'],
  ['Image Bounds (S,W,N,E)', 'Only for Image overlays: south, west, north, east in decimal degrees.'],
  ['Capture Date', 'Flight / survey date.'],
  ['Sensor / Platform', 'e.g. DJI Mavic 3M RGB, M3M multispectral NDVI, Trimble R12i.'],
  ['3D Model Link', 'Link to the 3D model / point cloud viewer for this site (DJI Terra, Pix4D Cloud, Sketchfab, etc.).'],
  ['Notes', '']
];
// GPS Points tab: paste Trimble exports here. Linked to trees by Submission ID, then Program Tree ID, then Point Name.
var GPS_COLUMNS = [
  ['Submission ID', 'Project ID (e.g. R9-0012). Best way to link a survey point to a tree.'],
  ['Program Tree ID', 'Breeder tree ID — used if Submission ID is blank.'],
  ['Site Name', 'Must match a Site Name on the Field Sites tab.'],
  ['Latitude', 'Decimal degrees (WGS84).'],
  ['Longitude', 'Decimal degrees (WGS84, negative in North America).'],
  ['Elevation (m)', 'Ellipsoid or orthometric height from the Trimble.'],
  ['H. Accuracy (m)', 'Horizontal precision reported by the receiver.'],
  ['Collected Date', ''],
  ['Trimble Point Name', 'Point name from the data collector. If it equals a Submission ID or Tree ID it links automatically.'],
  ['Maternal Parent', 'Maternal cultivar of the tree at this point (from the field survey). Used to color unsampled trees on the map and to cross-check samples.'],
  ['Field Row', 'Row number in the survey file.'],
  ['Field Tree', 'Tree number in the survey file.'],
  ['Source', 'Where the point came from (e.g. DCNR survey, Trimble R12i).'],
  ['Notes', '']
];

// Dropdown lists. Portal also accepts common shorthand (see SYNONYMS in Portal.html).
var LISTS = {
  species: ['C. mollissima', 'C. dentata', 'C. sativa', 'C. crenata', 'C. henryi', 'C. seguinii', 'C. pumila',
            'C. dentata × C. mollissima', 'C. sativa × C. crenata', 'Other hybrid', 'Non-Castanea (outgroup)', 'Unknown'],
  crossType: ['Controlled Cross', 'Open-Pollinated (OP)', 'Wild / Unknown Parentage', 'Unknown'],
  materialType: ['Named Cultivar (grafted)', 'Advanced Selection', 'Seedling', 'Breeding Parent', 'Species Reference', 'Wild / Feral Tree', 'Outgroup / Control'],
  priority: ['High', 'Medium', 'Low'],
  yesNo: ['Yes', 'No', 'Unknown'],
  reviewStatus: ['Pending', 'Accepted', 'Hold', 'Not Selected'],
  visibility: ['Project team only', 'Research collaborators & NNGA members'],
  states: ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS',
           'MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV',
           'WI','WY','DC','ON','QC','BC','Other']
};

// Column layout shared by every program tab and the Master. `who`: auto | breeder | admin
var COLUMNS = [
  { key: 'row',        header: 'Row #',                    who: 'auto',    width: 55,  note: 'Sequential row number within this program tab. Filled automatically.' },
  { key: 'subId',      header: 'Submission ID',            who: 'auto',    width: 105, note: 'Unique project ID (program prefix + number, e.g. R9-0001). Assigned automatically — use it to label leaf-tissue bags.' },
  { key: 'treeId',     header: 'Program Tree ID',          who: 'breeder', width: 140, required: true, note: 'REQUIRED. Your tree, accession, selection, or cultivar ID. Use the most specific identifier available. Must be unique within your program.' },
  { key: 'program',    header: 'Breeding Program',         who: 'auto',    width: 150, note: 'Program tab this tree was submitted under. Filled automatically.' },
  { key: 'collection', header: 'Farm / Orchard / Collection', who: 'breeder', width: 170, note: 'Farm, orchard, repository, or collection where the tree is growing now (if different from the breeding program).' },
  { key: 'submitter',  header: 'Submitter Name',           who: 'breeder', width: 140, required: true, note: 'Person providing the sample and its information.' },
  { key: 'email',      header: 'Contact Email',            who: 'breeder', width: 190, required: true, note: 'Best contact for questions about this sample.' },
  { key: 'species',    header: 'Reported Species',         who: 'breeder', width: 160, list: 'species', note: 'Species or hybrid identity currently assigned (C. mollissima, C. dentata, C. crenata, C. sativa, hybrid, or Unknown).' },
  { key: 'material',   header: 'Material Type',            who: 'breeder', width: 165, list: 'materialType', note: 'Named cultivar, advanced selection, seedling, breeding parent, species reference, or wild tree. Helps balance which populations get genotyped.' },
  { key: 'crossType',  header: 'Cross Type',               who: 'breeder', width: 160, list: 'crossType', note: 'How the tree was produced: Controlled Cross, Open-Pollinated (OP), Wild / Unknown Parentage, or Unknown.' },
  { key: 'mother',     header: 'Maternal Parent',          who: 'breeder', width: 140, note: 'Female / seed parent (cultivar, selection, or tree ID). Enter Unknown if not known.' },
  { key: 'father',     header: 'Paternal Parent',          who: 'breeder', width: 140, note: 'Male / pollen parent. For open-pollinated material enter Open-Pollinated / Unknown unless the pollen parent is known.' },
  { key: 'origin',     header: 'Original Source / Breeder', who: 'breeder', width: 165, note: 'Program, breeder, nursery, or repository where this genotype or family originated. May differ from where it grows now.' },
  { key: 'state',      header: 'State',                    who: 'breeder', width: 60,  list: 'states', note: 'Two-letter abbreviation of the state where the tree grows now (PA, NY, OH…).' },
  { key: 'town',       header: 'Town',                     who: 'breeder', width: 120, note: 'Town, city, or nearest municipality where the tree grows.' },
  { key: 'field',      header: 'Field Name',               who: 'breeder', width: 130, note: 'Orchard, field, block, planting, or trial name.' },
  { key: 'position',   header: 'Tree Position (Row-Column)', who: 'breeder', width: 120, note: 'Row and column, plot, or block information sufficient to relocate the individual tree (e.g. 07-V10 = row 07, column V10).' },
  { key: 'lat',        header: 'Latitude',                 who: 'breeder', width: 95,  note: 'GPS latitude in decimal degrees (e.g. 40.5123). Optional but needed for the project map.' },
  { key: 'lon',        header: 'Longitude',                who: 'breeder', width: 95,  note: 'GPS longitude in decimal degrees — negative in North America (e.g. -75.7891).' },
  { key: 'year',       header: 'Planted Year',             who: 'breeder', width: 85,  note: 'Year planted or established at this site. Best estimate is fine.' },
  { key: 'priority',   header: 'Breeder Priority',         who: 'breeder', width: 100, list: 'priority', note: 'How important is genotyping this tree to your program? High / Medium / Low. Used when balancing the ~2,000-genotype budget.' },
  { key: 'traits',     header: 'Trait Data Collected?',    who: 'breeder', width: 110, list: 'yesNo', note: 'Have phenotypic or performance data been collected on this tree or family? Yes / No / Unknown.' },
  { key: 'notes',      header: 'Key Traits / Notes',       who: 'breeder', width: 260, note: 'Why this tree is important: yield, nut quality/size, disease resistance, cold hardiness, phenology, form, ancestry, etc.' },
  { key: 'submittedAt',header: 'Submitted At',             who: 'auto',    width: 135, note: 'Date/time the row was received.' },
  { key: 'batchId',    header: 'Batch ID',                 who: 'auto',    width: 120, note: 'Identifies the submission batch this row arrived in.' },
  { key: 'fieldMap',   header: 'Field Map',                who: 'auto',    width: 140, note: 'Link to the field map uploaded with this submission batch (Google Drive).' },
  { key: 'rawRelease', header: 'Raw Genotype Data Release', who: 'auto',   width: 170, note: 'Raw genotype data (SNP calls) are held by the project and released only on request, with the breeder\'s written permission, before publication.' },
  { key: 'genoVis',    header: 'Genotype Visualization',   who: 'auto',    width: 150, list: 'visibility', note: 'Breeder choice: who may see plots derived from this tree\'s genotype (ancestry, structure, relatedness): Project team only, or Research collaborators & NNGA members.' },
  { key: 'phenoVis',   header: 'Phenotype Visualization',  who: 'auto',    width: 150, list: 'visibility', note: 'Breeder choice: who may see visualizations of this tree\'s trait data: Project team only, or Research collaborators & NNGA members.' },
  { key: 'gpsVis',     header: 'GPS Position Access',      who: 'auto',    width: 150, list: 'visibility', note: 'Breeder choice: who may see this tree\'s exact GPS position on the map: Project team only, or Research collaborators & NNGA members. Everyone else sees only the general site location.' },
  { key: 'status',     header: 'Review Status',            who: 'admin',   width: 105, list: 'reviewStatus', note: 'ADMIN (Rodale): Pending / Accepted / Hold / Not Selected.' },
  { key: 'popGroup',   header: 'Population Group',         who: 'admin',   width: 130, note: 'ADMIN (Rodale): population/family grouping used to balance genotyping.' },
  { key: 'tissue',     header: 'Tissue Collected',         who: 'admin',   width: 95,  list: 'yesNo', note: 'ADMIN (Rodale): leaf tissue received and freeze-dried?' },
  { key: 'plate',      header: 'DArT Plate',               who: 'admin',   width: 85,  note: 'ADMIN (Rodale): DArTag plate number.' },
  { key: 'well',       header: 'DArT Well',                who: 'admin',   width: 75,  note: 'ADMIN (Rodale): well position (A01–H12).' }
];

var COLOR = { header: '#3b2a1a', headerText: '#ffffff', auto: '#efe9e1', autoText: '#5c4a38', admin: '#dde7dd', adminHeader: '#2f4f3a', req: '#7a3b12' };

// ───────────────────────────── MENU ─────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🌰 Chestnut Project')
    .addItem('Submission links for breeders', 'showPortalLink')
    .addItem('Assign IDs to rows typed directly into tabs', 'assignMissingIds')
    .addItem('Run data-quality checks', 'buildQualityTab')
    .addItem('Build plate maps', 'buildPlateMaps')
    .addSeparator()
    .addItem('Set up / repair workbook', 'setupWorkbook')
    .addToUi();
}

function showPortalLink() {
  var ui = SpreadsheetApp.getUi(), url = siteUrl_();
  if (!url) { ui.alert('Set CONFIG.SITE_URL at the top of Code.gs to your GitHub Pages address first.'); return; }
  var links = PROGRAMS.map(function (p) { var u = url + 'submit.html?program=' + p.prefix; return '<li><b>' + esc_(p.label) + '</b><br><a target="_blank" href="' + u + '">' + u + '</a></li>'; }).join('');
  var html = HtmlService.createHtmlOutput('<div style="font-family:Arial;font-size:13px"><p><a target="_blank" href="' + url + '"><b>Open the project site</b></a> · <a target="_blank" href="' + url + 'map.html">Field map</a></p>' +
    '<p>Program-specific submission links (program pre-selected — send each breeder their own):</p><ul>' + links + '</ul></div>').setWidth(640).setHeight(520);
  ui.showModalDialog(html, 'Submission links');
}
function siteUrl_() { var u = String(CONFIG.SITE_URL || '').trim(); return u && u.slice(-1) !== '/' ? u + '/' : u; }

// ───────────────────────────── SETUP ─────────────────────────────
function setupWorkbook() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  buildLists_(ss);

  // Rename legacy tabs so any data in them is kept.
  Object.keys(LEGACY_TABS).forEach(function (oldName) {
    var sh = ss.getSheetByName(oldName);
    if (sh && !ss.getSheetByName(LEGACY_TABS[oldName])) sh.setName(LEGACY_TABS[oldName]);
  });

  PROGRAMS.forEach(function (p) { buildProgramTab_(ss, p); });
  buildMaster_(ss);
  buildDashboard_(ss);
  buildPrimer_(ss);
  buildLog_(ss);
  buildSimpleTab_(ss, TAB.SITES, SITE_COLUMNS, '#2f4f3a', 'Overlay Type', ['XYZ Tiles', 'Image', 'GeoTIFF (COG)', 'Link only']);
  var sitesSh = ss.getSheetByName(TAB.SITES);
  var haveSites = sitesSh.getLastRow() > 1 ? sitesSh.getRange(2, 1, sitesSh.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]).trim(); }) : [];
  var missing = SEED_SITES.filter(function (r) { return haveSites.indexOf(r[0]) < 0; });
  if (missing.length) sitesSh.getRange(Math.max(2, sitesSh.getLastRow() + 1), 1, missing.length, SITE_COLUMNS.length).setValues(missing);
  buildSimpleTab_(ss, TAB.GPS, GPS_COLUMNS, '#2f4f3a');
  buildSimpleTab_(ss, TAB.RES_STRUCT, [['sample_id', 'Submission ID or Program Tree ID (or pilot sample ID)'], ['group', 'Population / program label'], ['PC1', 'First axis (PCA or MDS)'], ['PC2', 'Second axis'], ['PC3', 'Optional extra axis'], ['access', 'Only for samples not in this database (e.g. pilot trees): leave blank = project team only; "' + ACCESS.MEMBER + '" = also research collaborators & NNGA members. Database trees follow their breeder\'s Genotype Visualization setting.']], '#1f4d3a');
  buildSimpleTab_(ss, TAB.RES_DIV, [['group', 'Population / program'], ['n', 'Trees'], ['Ho', 'Observed heterozygosity'], ['He', 'Expected heterozygosity'], ['F', 'Inbreeding coefficient'], ['access', 'Blank = project team only; "' + ACCESS.MEMBER + '" only if every breeder in the group allows it']], '#1f4d3a');

  // Tab order: Primer, Dashboard, Master, programs, sites, GPS, log, lists
  var order = [TAB.PRIMER, TAB.DASH, TAB.MASTER].concat(PROGRAMS.map(function (p) { return p.tab; })).concat([TAB.SITES, TAB.GPS, TAB.LOG, TAB.LISTS]);
  order.forEach(function (name, i) { var sh = ss.getSheetByName(name); if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(i + 1); } });
  ss.setActiveSheet(ss.getSheetByName(TAB.PRIMER));
  SpreadsheetApp.flush();
  try { SpreadsheetApp.getUi().alert('Workbook is set up. Next: Deploy → New deployment → Web app, then paste the /exec URL into assets/config.js on the website.'); } catch (e) {}
}

function buildLists_(ss) {
  var sh = ss.getSheetByName(TAB.LISTS) || ss.insertSheet(TAB.LISTS);
  sh.clear();
  var keys = Object.keys(LISTS);
  var maxLen = Math.max.apply(null, keys.map(function (k) { return LISTS[k].length; }));
  var grid = [keys];
  for (var i = 0; i < maxLen; i++) grid.push(keys.map(function (k) { return LISTS[k][i] || ''; }));
  sh.getRange(1, 1, grid.length, keys.length).setValues(grid);
  sh.getRange(1, 1, 1, keys.length).setFontWeight('bold');
  sh.hideSheet();
}

function listRange_(ss, listKey) {
  var sh = ss.getSheetByName(TAB.LISTS);
  var col = Object.keys(LISTS).indexOf(listKey) + 1;
  return sh.getRange(2, col, LISTS[listKey].length, 1);
}

function buildProgramTab_(ss, p) {
  var sh = ss.getSheetByName(p.tab);
  var migrated = [];
  if (sh) migrated = readExistingRows_(sh, p);
  else sh = ss.insertSheet(p.tab);

  var headers = COLUMNS.map(function (c) { return c.header; });
  var lastCol = Math.max(sh.getMaxColumns(), headers.length);
  ensureSize_(sh, 2, lastCol);
  var all = sh.getRange(1, 1, sh.getMaxRows(), lastCol);
  all.clearDataValidations(); all.clearNote();
  sh.clear();
  sh.clearConditionalFormatRules();
  sh.getBandings().forEach(function (b) { b.remove(); });
  sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (pr) { if (pr.canEdit()) pr.remove(); });

  ensureSize_(sh, CONFIG.VALIDATION_ROWS + 1, headers.length);
  formatHeader_(sh);

  if (migrated.length) {
    sh.getRange(2, 1, migrated.length, headers.length).setValues(migrated);
  }

  // Dropdowns (allow invalid so pasted shorthand isn't rejected; shows a warning triangle instead)
  var n = CONFIG.VALIDATION_ROWS;
  COLUMNS.forEach(function (c, i) {
    if (!c.list) return;
    var rule = SpreadsheetApp.newDataValidation().requireValueInRange(listRange_(ss, c.list), true).setAllowInvalid(true).build();
    sh.getRange(2, i + 1, n, 1).setDataValidation(rule);
  });
  ['lat', 'lon'].forEach(function (k) {
    var rule = SpreadsheetApp.newDataValidation().requireNumberBetween(k === 'lat' ? -90 : -180, k === 'lat' ? 90 : 180)
      .setAllowInvalid(false).setHelpText('Decimal degrees, e.g. 40.5123 / -75.7891').build();
    sh.getRange(2, colIdx_(k), n, 1).setDataValidation(rule).setNumberFormat('0.000000');
  });
  sh.getRange(2, colIdx_('year'), n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireNumberBetween(1900, 2100).setAllowInvalid(false).setHelpText('Four-digit year').build()).setNumberFormat('0');
  sh.getRange(2, colIdx_('submittedAt'), n, 1).setNumberFormat('yyyy-mm-dd hh:mm');

  // Shade auto/admin columns
  COLUMNS.forEach(function (c, i) {
    if (c.who === 'auto') sh.getRange(2, i + 1, n, 1).setBackground(COLOR.auto).setFontColor(COLOR.autoText);
    if (c.who === 'admin') sh.getRange(2, i + 1, n, 1).setBackground(COLOR.admin);
  });

  // Highlight missing Program Tree ID when other breeder data is present
  var treeCol = columnLetter_(colIdx_('treeId'));
  var cf = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($' + treeCol + '2="",COUNTA($' + columnLetter_(colIdx_('collection')) + '2:$' + columnLetter_(colIdx_('notes')) + '2)>0)')
    .setBackground('#f6c8b5').setRanges([sh.getRange(2, colIdx_('treeId'), n, 1)]).build();
  sh.setConditionalFormatRules([cf]);

  // Warning-only protection on auto + admin columns (owner/editors get a prompt, not a block)
  COLUMNS.forEach(function (c, i) {
    if (c.who === 'breeder') return;
    sh.getRange(1, i + 1, n + 1, 1).protect().setDescription(c.header + ' (filled automatically / Rodale use)').setWarningOnly(true);
  });
}

function readExistingRows_(sh, p) {
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var hdr = values[0].map(norm_);
  var lookup = {
    row: ['index', 'row #', 'row'], subId: ['submission id'], collection: ['farm / orchard / collection', 'program / collection'],
    submitter: ['submitter name'], email: ['contact email'], treeId: ['program tree id'], species: ['reported species'],
    material: ['material type'], crossType: ['cross type'], mother: ['maternal parent'], father: ['paternal parent'],
    origin: ['original source / breeder'], state: ['state'], town: ['town'], field: ['field name'],
    position: ['tree position (col-row)', 'tree position (row-tree)', 'tree position (row-column)', 'tree position'], lat: ['latitude'], lon: ['longitude'],
    year: ['planted year'], priority: ['breeder priority'], traits: ['trait data collected?'], notes: ['key traits / notes'],
    submittedAt: ['submitted at'], batchId: ['batch id'], fieldMap: ['field map'], rawRelease: ['raw genotype data release'], genoVis: ['genotype visualization'], phenoVis: ['phenotype visualization'], gpsVis: ['gps position access'], status: ['review status'], popGroup: ['population group'],
    tissue: ['tissue collected'], plate: ['dart plate'], well: ['dart well']
  };
  var map = {};
  COLUMNS.forEach(function (c) {
    var names = lookup[c.key] || [];
    for (var i = 0; i < hdr.length; i++) if (names.indexOf(hdr[i]) >= 0) { map[c.key] = i; break; }
  });
  // Starter sheet had an unlabeled "Planted Year" column right after Tree Position.
  if (map.year === undefined && map.position !== undefined && hdr[map.position + 1] === '') map.year = map.position + 1;

  var out = [];
  for (var r = 1; r < values.length; r++) {
    var src = values[r];
    var tree = map.treeId !== undefined ? String(src[map.treeId]).trim() : '';
    if (!tree || tree === CONFIG.EXAMPLE_TREE_ID) continue;
    out.push(COLUMNS.map(function (c) { return map[c.key] !== undefined ? src[map[c.key]] : ''; }));
  }
  // Fill auto fields for migrated rows
  out.forEach(function (row, i) {
    row[colIdx_('row') - 1] = i + 1;
    row[colIdx_('program') - 1] = p.label;
    if (!row[colIdx_('status') - 1]) row[colIdx_('status') - 1] = 'Pending';
  });
  assignIdsInMemory_(out, p.prefix, []);
  return out;
}

function formatHeader_(sh) {
  var headers = COLUMNS.map(function (c) { return c.header; });
  var rng = sh.getRange(1, 1, 1, headers.length);
  rng.setValues([headers]).setFontWeight('bold').setFontColor(COLOR.headerText).setBackground(COLOR.header)
     .setWrap(true).setVerticalAlignment('middle').setHorizontalAlignment('center');
  sh.setRowHeight(1, 48);
  COLUMNS.forEach(function (c, i) {
    var cell = sh.getRange(1, i + 1);
    cell.setNote(c.note);
    if (c.who === 'admin') cell.setBackground(COLOR.adminHeader);
    if (c.required) cell.setValue(c.header + ' *');
    sh.setColumnWidth(i + 1, c.width);
  });
  sh.setFrozenRows(1);
  sh.setFrozenColumns(colIdx_('treeId'));
}

function buildMaster_(ss) {
  var sh = ss.getSheetByName(TAB.MASTER) || ss.insertSheet(TAB.MASTER);
  sh.clear();
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).clearDataValidations();
  ensureSize_(sh, 100, COLUMNS.length);
  formatHeader_(sh);
  var last = columnLetter_(COLUMNS.length);
  var tree = columnLetter_(colIdx_('treeId'));
  var data = PROGRAMS.map(function (p) { return q_(p.tab) + '!A2:' + last; }).join(';');
  var keys = PROGRAMS.map(function (p) { return q_(p.tab) + '!' + tree + '2:' + tree; }).join(';');
  sh.getRange('A2').setFormula('=IFERROR(FILTER(VSTACK(' + data + '),VSTACK(' + keys + ')<>""),"")');
  sh.getRange(2, colIdx_('submittedAt'), sh.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  sh.getRange(1, 1).setNote('READ-ONLY. This tab combines every program tab automatically. Edit data in the program tabs, not here.');
  sh.protect().setDescription('Master is formula-driven').setWarningOnly(true);
  sh.setTabColor('#3b2a1a');
}

function buildDashboard_(ss) {
  var sh = ss.getSheetByName(TAB.DASH) || ss.insertSheet(TAB.DASH);
  sh.clear();
  ensureSize_(sh, 60, 12);
  var M = q_(TAB.MASTER) + '!';
  var L = function (k) { return M + columnLetter_(colIdx_(k)) + '2:' + columnLetter_(colIdx_(k)); };

  sh.getRange('A1').setValue('Chinese Chestnut Genotyping — Submission Dashboard').setFontSize(16).setFontWeight('bold');
  sh.getRange('A2').setFormula('="Updated live from the Master Submission tab · target "&TEXT(' + CONFIG.TARGET_TOTAL + ',"#,##0")&" genotypes · "&' + CONFIG.PLATE_SIZE + '&" samples per plate"').setFontColor('#666');

  var kpi = [
    ['Trees submitted', '=SUMPRODUCT(LEN(' + L('treeId') + ')>0)'],
    ['Accepted for genotyping', '=COUNTIF(' + L('status') + ',"Accepted")'],
    ['Target', CONFIG.TARGET_TOTAL],
    ['% of target accepted', '=IFERROR(B5/B6,0)'],
    ['Plates (accepted ÷ ' + CONFIG.PLATE_SIZE + ')', '=ROUNDUP(B5/' + CONFIG.PLATE_SIZE + ',1)'],
    ['Trees with GPS', '=COUNTIFS(' + L('lat') + ',"<>",' + L('lon') + ',"<>")']
  ];
  sh.getRange(4, 1, kpi.length, 2).setValues(kpi);
  sh.getRange('B7').setNumberFormat('0%');
  sh.getRange('A4:A9').setFontWeight('bold');
  sh.getRange('B4:B9').setFontSize(13).setHorizontalAlignment('left');

  var head = ['Breeding Program', 'Submitted', 'Accepted', 'Pending', 'High priority', 'With GPS', 'Seedlings', 'Named cultivars', 'Share of submissions'];
  var r0 = 12;
  sh.getRange(r0, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground(COLOR.header).setFontColor('#fff');
  var P = L('program');
  var rows = PROGRAMS.map(function (p, i) {
    var r = r0 + 1 + i, name = 'A' + r;
    return [p.label,
      '=COUNTIF(' + P + ',' + name + ')',
      '=COUNTIFS(' + P + ',' + name + ',' + L('status') + ',"Accepted")',
      '=COUNTIFS(' + P + ',' + name + ',' + L('status') + ',"Pending")',
      '=COUNTIFS(' + P + ',' + name + ',' + L('priority') + ',"High")',
      '=COUNTIFS(' + P + ',' + name + ',' + L('lat') + ',"<>")',
      '=COUNTIFS(' + P + ',' + name + ',' + L('material') + ',"Seedling")',
      '=COUNTIFS(' + P + ',' + name + ',' + L('material') + ',"Named Cultivar (grafted)")',
      '=IFERROR(B' + r + '/$B$4,0)'];
  });
  sh.getRange(r0 + 1, 1, rows.length, head.length).setFormulas(rows.map(function (row) { return row.map(String); }));
  sh.getRange(r0 + 1, 1, rows.length, 1).setValues(PROGRAMS.map(function (p) { return [p.label]; }));
  var tot = r0 + 1 + rows.length;
  sh.getRange(tot, 1).setValue('Total').setFontWeight('bold');
  for (var c = 2; c <= 8; c++) { var col = columnLetter_(c); sh.getRange(tot, c).setFormula('=SUM(' + col + (r0 + 1) + ':' + col + (tot - 1) + ')').setFontWeight('bold'); }
  sh.getRange(r0 + 1, 9, rows.length, 1).setNumberFormat('0%');

  var s0 = tot + 3;
  sh.getRange(s0, 1, 1, 3).setValues([['Reported Species', 'Trees', 'Accepted']]).setFontWeight('bold').setBackground(COLOR.header).setFontColor('#fff');
  var sp = LISTS.species.map(function (s, i) { var r = s0 + 1 + i; return [s, '=COUNTIF(' + L('species') + ',A' + r + ')', '=COUNTIFS(' + L('species') + ',A' + r + ',' + L('status') + ',"Accepted")']; });
  sh.getRange(s0 + 1, 1, sp.length, 3).setValues(sp);

  sh.setColumnWidth(1, 300); for (var k = 2; k <= 9; k++) sh.setColumnWidth(k, 110);
  sh.setTabColor('#2f4f3a');
}

function buildPrimer_(ss) {
  var sh = ss.getSheetByName(TAB.PRIMER) || ss.insertSheet(TAB.PRIMER);
  sh.clear();
  ensureSize_(sh, COLUMNS.length + 20, 4);
  var url = siteUrl_() ? siteUrl_() + 'submit.html' : '(set CONFIG.SITE_URL in Code.gs)';
  var intro = [
    ['How to submit trees', ''],
    ['Easiest', 'Use the submission website: ' + url + ' — paste rows straight from Excel, upload a spreadsheet, or add trees one at a time. No Google account needed.'],
    ['Field map', (siteUrl_() ? siteUrl_() + 'map.html' : '(map page)') + ' — tree GPS points and drone overlays. Add sites on the Field Sites tab; paste Trimble exports on the GPS Points tab.'],
    ['Offline', 'Fill in the Excel template and email it to richard.tegtmeier@rodaleinstitute.org.'],
    ['Data sharing', 'Breeders choose at submission: raw genotype data are released only on request with their permission (before publication); genotype visualizations, phenotype visualizations and exact GPS positions are each "Project team only" (default) or "Research collaborators & NNGA members". See the Genotype Visualization, Phenotype Visualization and GPS Position Access columns and the website data policy (policy.html).'],
    ['Direct entry', 'If you have edit access you can type into your program tab. Leave the shaded columns blank — they fill automatically.'],
    ['', ''],
    ['Column', 'Definition / Instructions', 'Filled by', 'Allowed values']
  ];
  sh.getRange(1, 1, intro.length, 2).setValues(intro.map(function (r) { return [r[0], r[1]]; }));
  sh.getRange(intro.length, 1, 1, 4).setValues([intro[intro.length - 1]]);
  var rows = COLUMNS.map(function (c) {
    return [c.header + (c.required ? ' *' : ''), c.note, c.who === 'breeder' ? 'Breeder' : (c.who === 'auto' ? 'Automatic' : 'Rodale team'), c.list ? LISTS[c.list].join(', ') : ''];
  });
  sh.getRange(intro.length + 1, 1, rows.length, 4).setValues(rows).setWrap(true).setVerticalAlignment('top');
  sh.getRange('A1').setFontSize(15).setFontWeight('bold');
  sh.getRange(2, 1, 5, 1).setFontWeight('bold');
  sh.getRange(intro.length, 1, 1, 4).setFontWeight('bold').setBackground(COLOR.header).setFontColor('#fff');
  sh.getRange(intro.length + 1, 1, rows.length, 1).setFontWeight('bold');
  sh.setColumnWidth(1, 200); sh.setColumnWidth(2, 560); sh.setColumnWidth(3, 110); sh.setColumnWidth(4, 360);
  sh.getRange(2, 2, 5, 1).setWrap(true);
  sh.setFrozenRows(intro.length);
}

function buildLog_(ss) {
  var sh = ss.getSheetByName(TAB.LOG) || ss.insertSheet(TAB.LOG);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, 13).setValues([['Received', 'Batch ID', 'Program', 'Submitter', 'Email', 'Trees', 'First ID', 'Last ID', 'Field Map', 'Genotype Visualization', 'Phenotype Visualization', 'GPS Position Access', 'Data Policy Accepted']])
      .setFontWeight('bold').setBackground(COLOR.header).setFontColor('#fff');
    sh.setFrozenRows(1);
  }
}

/** Creates a header-only tab if missing; never deletes rows already entered. */
function buildSimpleTab_(ss, name, cols, color, listHeader, listValues) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  ensureSize_(sh, 500, cols.length);
  var hdr = sh.getRange(1, 1, 1, cols.length);
  hdr.setValues([cols.map(function (c) { return c[0]; })]).setFontWeight('bold').setFontColor('#fff').setBackground(color).setWrap(true).setVerticalAlignment('middle');
  cols.forEach(function (c, i) { if (c[1]) sh.getRange(1, i + 1).setNote(c[1]); sh.setColumnWidth(i + 1, c[0].length > 14 ? 170 : 120); });
  sh.setRowHeight(1, 40); sh.setFrozenRows(1);
  if (listHeader) {
    var idx = cols.map(function (c) { return c[0]; }).indexOf(listHeader) + 1;
    sh.getRange(2, idx, 499, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(listValues, true).setAllowInvalid(false).build());
  }
}

// ───────────────────────────── JSON API (for the GitHub Pages site) ─────────────────────────────
var API_ACTIONS = { getPortalConfig: getPortalConfig, checkExisting: checkExisting, submitBatch: submitBatch, getMapData: getMapData, getSummary: getSummary, getTrees: getTrees,
                    checkAccess: checkAccess, getResults: getResults };

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action) return api_(p.action, p.args ? JSON.parse(p.args) : []);
  return ContentService.createTextOutput('Chestnut genotyping API is running.' + (siteUrl_() ? ' Website: ' + siteUrl_() : ''));
}
function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return json_({ ok: false, error: 'Bad request' }); }
  return api_(body.action, body.args || []);
}
function api_(action, args) {
  var fn = API_ACTIONS[action];
  if (!fn) return json_({ ok: false, error: 'Unknown action: ' + action });
  try { return json_({ ok: true, data: fn.apply(null, args) }); }
  catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** Config the portal needs: programs, columns breeders fill, dropdown lists, live counts. */
function getPortalConfig() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var counts = {};
  PROGRAMS.forEach(function (p) {
    var sh = ss.getSheetByName(p.tab);
    counts[p.prefix] = sh ? countTrees_(sh) : 0;
  });
  return buildPortalConfig_(counts);
}

function buildPortalConfig_(counts) {
  return {
    programs: PROGRAMS.map(function (p) { return { prefix: p.prefix, label: p.label, tab: p.tab, count: (counts || {})[p.prefix] || 0 }; }),
    columns: COLUMNS.filter(function (c) { return c.who === 'breeder'; })
      .map(function (c) { return { key: c.key, header: c.header, list: c.list || null, required: !!c.required, note: c.note }; }),
    lists: LISTS,
    target: CONFIG.TARGET_TOTAL,
    siteUrl: siteUrl_()
  };
}

// ───────────────────────────── SUMMARY (balance charts) ─────────────────────────────
/**
 * Compact, non-identifying records for the balance charts on the website:
 * [program, location, maternal parent, species, material, status, orchard column, submitted date (yyyy-mm-dd), on a DArT plate (1/0)]
 * plus totals and the number of distinct DArT plates used.
 */
function getSummary() { return summarize_(allRows_()); }

/** Every submitted tree from every program tab, as objects keyed by COLUMNS[].key. */
function allRows_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), rows = [];
  PROGRAMS.forEach(function (p) {
    var sh = ss.getSheetByName(p.tab);
    if (!sh) return;
    var n = lastDataRow_(sh) - 1;
    if (n < 1) return;
    sh.getRange(2, 1, n, COLUMNS.length).getValues().forEach(function (r, i) {
      var o = {}; COLUMNS.forEach(function (c, j) { o[c.key] = r[j]; });
      if (String(o.treeId).trim()) { o.program = o.program || p.label; o._tab = p.tab; o._row = i + 2; rows.push(o); }
    });
  });
  return rows;
}

// ───────────────────────────── DATA AVAILABILITY ─────────────────────────────
function genoStatus_(o) {
  var plates = String(o.plate || '').split(/[;,]/).map(function (x) { return x.trim(); }).filter(String);
  if (plates.some(function (pl) { return CONFIG.GENOTYPED_PLATES.indexOf(pl) >= 0; })) return 'Genotype data available';
  if (plates.length) return 'Genotyping in progress';
  if (String(o.status) === 'Accepted') return 'Selected, not yet plated';
  return 'Not genotyped';
}
function phenoStatus_(o) { return String(o.traits || '').trim() === 'Yes' ? 'Phenotype data available' : 'No phenotype data recorded'; }

// ───────────────────────────── PUBLIC TREE TABLE ─────────────────────────────
// Fields safe to publish on the website (no names or emails).
var PUBLIC_FIELDS = ['subId', 'treeId', 'program', 'field', 'position', 'state', 'town', 'species', 'material', 'crossType', 'mother', 'father', 'year', 'status', 'plate', 'well', 'geno', 'pheno', 'genoVis', 'phenoVis', 'gpsVis'];
function getTrees() { return publicTrees_(allRows_(), readTab_(SpreadsheetApp.getActiveSpreadsheet(), TAB.GPS, GPS_COLUMNS)); }
function publicTrees_(rows, gpsRows) {
  rows.forEach(function (o) { o.geno = genoStatus_(o); o.pheno = phenoStatus_(o); });
  var str = function (v) { return v instanceof Date ? Utilities.formatDate(v, 'GMT', 'yyyy-MM-dd') : String(v == null ? '' : v).trim(); };
  var q = qualityIssues_(rows, gpsRows);
  return { fields: PUBLIC_FIELDS, rows: rows.map(function (o) { return PUBLIC_FIELDS.map(function (k) { return str(o[k]); }); }),
           qc: q.summary, issues: q.issues.map(function (i) { return [i[0], i[1], i[4], i[5], i[6]]; }) };
}

// ───────────────────────────── DATA QUALITY ─────────────────────────────
/** Pure check over all rows. Returns { issues: [[severity, check, tab, row, subId, treeId, detail]], summary: {check: count} } */
function qualityIssues_(rows, gpsRows) {
  var issues = [], s = function (v) { return String(v == null ? '' : v).trim(); };
  var add = function (sev, check, o, detail) { issues.push([sev, check, o._tab || o.program, o._row || '', s(o.subId), s(o.treeId), detail]); };
  var seenTree = {}, seenWell = {}, seenPos = {};
  rows.forEach(function (o) {
    var k = s(o.program) + '|' + normId_(o.treeId);
    (seenTree[k] = seenTree[k] || []).push(o);
    var plates = s(o.plate).split(/[;,]/), wells = s(o.well).split(/[;,]/);
    plates.forEach(function (pl, i) { pl = pl.trim(); var w = (wells[i] || '').trim(); if (pl && w) (seenWell[pl + '|' + w] = seenWell[pl + '|' + w] || []).push(o); });
    if (/^V\d+$/i.test(s(o.position))) add('Info', 'Position without row', o, 'Only the column (' + s(o.position) + ') is recorded');
    else if (s(o.field) && s(o.position)) { var pk = s(o.field).toLowerCase() + '|' + s(o.position).toLowerCase(); (seenPos[pk] = seenPos[pk] || []).push(o); }
    if (!s(o.species)) add('Warning', 'Missing species', o, 'Reported Species is blank');
    if (/open-pollinated/i.test(s(o.crossType)) && !s(o.mother)) add('Warning', 'OP tree without maternal parent', o, 'Cross Type is OP but Maternal Parent is blank');
    if (s(o.plate) && !s(o.well)) add('Error', 'Plate without well', o, 'DArT Plate set but DArT Well blank');
    if (s(o.well) && !/^([A-H](0?[1-9]|1[0-2]))(\s*[;,]\s*[A-H](0?[1-9]|1[0-2]))*$/i.test(s(o.well))) add('Error', 'Invalid well', o, 'Well "' + s(o.well) + '" is not A01–H12');
    if (s(o.status) === 'Accepted' && !s(o.plate)) add('Info', 'Accepted, not yet plated', o, 'Waiting for a DArTag plate');
    if (!s(o.field)) add('Info', 'No field name', o, 'Field Name is blank, so the tree cannot be placed on a site');
  });
  Object.keys(seenTree).forEach(function (k) { if (seenTree[k].length > 1) seenTree[k].forEach(function (o) { add('Error', 'Duplicate Tree ID', o, seenTree[k].length + ' rows share this Tree ID in the same program'); }); });
  Object.keys(seenWell).forEach(function (k) { if (seenWell[k].length > 1) seenWell[k].forEach(function (o) { add('Error', 'Well used twice', o, 'Plate|well ' + k + ' is assigned to ' + seenWell[k].length + ' trees'); }); });
  Object.keys(seenPos).forEach(function (k) { if (seenPos[k].length > 1) seenPos[k].forEach(function (o) { add('Warning', 'Shared field position', o, seenPos[k].length + ' trees recorded at ' + s(o.field) + ' ' + s(o.position)); }); });
  // Cross-check sample maternal parent against the cultivar recorded at its GPS point
  var cult = function (v) { return String(v || '').toLowerCase().replace(/[^a-z]/g, '').replace(/^au/, ''); };
  var gBySub = {}; (gpsRows || []).forEach(function (g) { var k = normId_(g['Submission ID']); if (k) gBySub[k] = g; });
  rows.forEach(function (o) {
    var g = gBySub[normId_(o.subId)];
    if (!g || !s(g['Maternal Parent']) || !s(o.mother) || /^unknown$/i.test(s(o.mother))) return;
    if (cult(g['Maternal Parent']) !== cult(o.mother)) add('Warning', 'GPS cultivar differs', o, 'Sample says ' + s(o.mother) + '; survey point ' + s(g['Trimble Point Name']) + ' says ' + s(g['Maternal Parent']));
  });
  var summary = {};
  issues.forEach(function (i) { var key = i[0] + '|' + i[1]; summary[key] = (summary[key] || 0) + 1; });
  return { issues: issues, summary: summary };
}

/** Menu: writes all issues to a "Data Quality" tab. */
function buildQualityTab() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var res = qualityIssues_(allRows_(), readTab_(ss, TAB.GPS, GPS_COLUMNS));
  var sh = ss.getSheetByName('Data Quality') || ss.insertSheet('Data Quality');
  sh.clear();
  var hdr = ['Severity', 'Check', 'Tab', 'Row', 'Submission ID', 'Program Tree ID', 'Detail'];
  sh.getRange(1, 1, 1, hdr.length).setValues([hdr]).setFontWeight('bold').setBackground(COLOR.header).setFontColor('#fff');
  var order = { Error: 0, Warning: 1, Info: 2 };
  var rows = res.issues.sort(function (a, b) { return order[a[0]] - order[b[0]] || String(a[1]).localeCompare(b[1]); });
  if (rows.length) sh.getRange(2, 1, rows.length, hdr.length).setValues(rows);
  sh.setFrozenRows(1); sh.autoResizeColumns(1, hdr.length);
  var rules = [['Error', '#f9e7e4'], ['Warning', '#fbf2d8'], ['Info', '#e6eef7']].map(function (x) {
    return SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$A2="' + x[0] + '"').setBackground(x[1]).setRanges([sh.getRange(2, 1, Math.max(1, rows.length), hdr.length)]).build();
  });
  sh.setConditionalFormatRules(rules);
  sh.getRange(1, 9).setValue('Run ' + new Date().toLocaleString()).setFontColor('#666');
  try { SpreadsheetApp.getUi().alert(rows.length + ' items listed on the Data Quality tab.'); } catch (e) {}
}

/** Menu: draws an 8 × 12 grid per DArT plate on a "Plate Maps" tab from the plate/well columns. */
function buildPlateMaps() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var plates = {};
  allRows_().forEach(function (o) {
    var pls = String(o.plate || '').split(/[;,]/), wls = String(o.well || '').split(/[;,]/);
    pls.forEach(function (pl, i) {
      pl = pl.trim(); var w = (wls[i] || '').trim().toUpperCase();
      var m = w.match(/^([A-H])0?(\d{1,2})$/); if (!pl || !m) return;
      (plates[pl] = plates[pl] || {})[m[1] + Number(m[2])] = o.subId + '\n' + o.treeId;
    });
  });
  var sh = ss.getSheetByName('Plate Maps') || ss.insertSheet('Plate Maps');
  sh.clear();
  var r = 1, names = Object.keys(plates).sort();
  names.forEach(function (pl) {
    sh.getRange(r, 1).setValue('Plate ' + pl).setFontWeight('bold').setFontSize(12);
    var grid = [[''].concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])];
    'ABCDEFGH'.split('').forEach(function (L) { var row = [L]; for (var c = 1; c <= 12; c++) row.push(plates[pl][L + c] || ''); grid.push(row); });
    var rg = sh.getRange(r + 1, 1, 9, 13);
    rg.setValues(grid).setWrap(true).setVerticalAlignment('middle').setHorizontalAlignment('center').setFontSize(8).setBorder(true, true, true, true, true, true, '#c9d1cc', SpreadsheetApp.BorderStyle.SOLID);
    sh.getRange(r + 1, 1, 1, 13).setFontWeight('bold').setBackground('#eef0ed');
    sh.getRange(r + 2, 1, 8, 1).setFontWeight('bold').setBackground('#eef0ed');
    r += 12;
  });
  for (var c = 2; c <= 13; c++) sh.setColumnWidth(c, 130);
  try { SpreadsheetApp.getUi().alert(names.length + ' plate map(s) drawn.'); } catch (e) {}
}
function summarize_(rows) {
  var plates = {}, str = function (v) { return String(v == null ? '' : v).trim(); };
  var records = rows.map(function (o) {
    str(o.plate).split(/[;,]/).forEach(function (pl) { pl = pl.trim(); if (pl) plates[pl] = true; });
    var loc = str(o.field) || str(o.collection) || [str(o.town), str(o.state)].filter(String).join(', ') || 'Not given';
    var col = (str(o.position).match(/V\d+/i) || [''])[0].toUpperCase();
    var d = o.submittedAt instanceof Date ? Utilities.formatDate(o.submittedAt, 'GMT', 'yyyy-MM-dd') : str(o.submittedAt).slice(0, 10);
    return [str(o.program), loc, str(o.mother) || 'Not given', str(o.species) || 'Not given', str(o.material) || 'Not given', str(o.status) || 'Pending', col, d, str(o.plate) ? 1 : 0, genoStatus_(o), phenoStatus_(o)];
  });
  return { target: CONFIG.TARGET_TOTAL, plateSize: CONFIG.PLATE_SIZE, platesPlanned: Math.round(CONFIG.TARGET_TOTAL / CONFIG.PLATE_SIZE),
           platesUsed: Object.keys(plates).length, programs: PROGRAMS.map(function (p) { return p.label; }),
           fields: ['program', 'location', 'mother', 'species', 'material', 'status', 'column', 'date', 'plated', 'geno', 'pheno'], records: records };
}

// ───────────────────────────── RESULTS (access-controlled) ─────────────────────────────
/** Structure-plot rows and diversity table, filtered by the viewer's access level and each breeder's Genotype Visualization setting. */
function getResults(code) {
  var role = roleFor_(code), ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = function (name) { var t = ss.getSheetByName(name); if (!t || t.getLastRow() < 2) return []; var v = t.getDataRange().getValues(), h = v.shift().map(String); return v.filter(function (r) { return r.some(String); }).map(function (r) { var o = {}; h.forEach(function (k, i) { if (k) o[k] = r[i]; }); return o; }); };
  return filterResults_(sh(TAB.RES_STRUCT), sh(TAB.RES_DIV), allRows_(), role);
}
function filterResults_(structRows, divRows, trees, role) {
  var byId = {};
  trees.forEach(function (t) { byId[normId_(t.subId)] = t; byId[normId_(t.treeId)] = t; });
  var hidden = 0;
  var structure = structRows.filter(function (r) {
    var t = byId[normId_(r.sample_id)];
    var ok = t ? allowed_(String(t.genoVis || ACCESS.TEAM), role) : allowed_(String(r.access || ACCESS.TEAM), role);
    if (!ok) hidden++;
    return ok;
  }).map(function (r) { var o = {}; Object.keys(r).forEach(function (k) { if (k !== 'access') o[k] = r[k]; }); return o; });
  var diversity = divRows.filter(function (r) { return allowed_(String(r.access || ACCESS.TEAM), role); })
    .map(function (r) { var o = {}; Object.keys(r).forEach(function (k) { if (k !== 'access') o[k] = r[k]; }); return o; });
  return { role: role, structure: structure, diversity: diversity, hidden: hidden, totalStructure: structRows.length, totalDiversity: divRows.length };
}

// ───────────────────────────── MAP DATA ─────────────────────────────
/** Everything the map page needs: trees with coordinates, field sites + overlays, unlinked GPS points. */
// ───────────────────────────── ACCESS LEVELS ─────────────────────────────
var ACCESS = { TEAM: 'Project team only', MEMBER: 'Research collaborators & NNGA members' };
/** 'team' | 'member' | 'public' for an access code entered on the website. */
function roleFor_(code) {
  code = String(code || '').trim();
  if (CONFIG.TEAM_ACCESS_CODE && code === CONFIG.TEAM_ACCESS_CODE) return 'team';
  if (CONFIG.MEMBER_ACCESS_CODE && code === CONFIG.MEMBER_ACCESS_CODE) return 'member';
  return 'public';
}
function checkAccess(code) { return { role: roleFor_(code) }; }
/** Can someone with this role see data whose breeder setting is `setting`? */
function allowed_(setting, role) { return role === 'team' || (role === 'member' && String(setting) === ACCESS.MEMBER); }

/** Removes exact positions the viewer may not see. Pure, so the website preview can use it too. */
function filterMapForRole_(data, role) {
  var out = JSON.parse(JSON.stringify(data));
  var siteOK = {};
  out.trees.forEach(function (t) {
    t.hasGps = t.lat != null;
    if (t.lat != null && !allowed_(t.gpsVis, role)) { t.lat = null; t.lon = null; t.elev = null; t.acc = null; t.fieldRow = ''; t.fieldTree = ''; t.point = ''; t.gpsRestricted = true; }
    if (t.site) siteOK[t.site] = (siteOK[t.site] !== false) && allowed_(t.gpsVis, role);
  });
  // unsampled survey points are shown only where every submitted tree at that site allows it
  out.unlinked = out.unlinked.filter(function (u) { return role === 'team' || siteOK[u.site] === true; });
  out.role = role;
  return out;
}

function getMapData(key) {
  var role = roleFor_(key);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var trees = [];
  PROGRAMS.forEach(function (p) {
    var sh = ss.getSheetByName(p.tab);
    if (!sh) return;
    var n = lastDataRow_(sh) - 1;
    if (n < 1) return;
    sh.getRange(2, 1, n, COLUMNS.length).getValues().forEach(function (r) {
      var o = {};
      COLUMNS.forEach(function (c, i) { o[c.key] = r[i]; });
      if (!String(o.treeId).trim()) return;
      trees.push(o);
    });
  });
  return filterMapForRole_(assembleMapData_(trees, readTab_(ss, TAB.SITES, SITE_COLUMNS), readTab_(ss, TAB.GPS, GPS_COLUMNS)), role);
}

function readTab_(ss, name, cols) {
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, cols.length).getValues()
    .filter(function (r) { return r.some(function (v) { return String(v).trim(); }); })
    .map(function (r) { var o = {}; cols.forEach(function (c, i) { o[c[0]] = r[i]; }); return o; });
}

/** Pure function (no Sheets calls) so it can be unit-tested. */
function assembleMapData_(treeRows, siteRows, gpsRows) {
  var numOr = function (v) { var n = Number(v); return (v === '' || v == null || isNaN(n)) ? null : n; };
  var str = function (v) { return v instanceof Date ? Utilities.formatDate(v, 'GMT', 'yyyy-MM-dd') : String(v == null ? '' : v).trim(); };

  // Sites
  var sites = {}, order = [];
  siteRows.forEach(function (r) {
    var name = str(r['Site Name']); if (!name) return;
    if (!sites[name]) { sites[name] = { name: name, program: '', fields: [], lat: null, lon: null, zoom: null, overlays: [], models: [], notes: '' }; order.push(name); }
    var s = sites[name];
    s.program = s.program || str(r['Breeding Program']);
    str(r['Field Names to Match']).split(',').forEach(function (f) { f = f.trim().toLowerCase(); if (f && s.fields.indexOf(f) < 0) s.fields.push(f); });
    if (s.lat == null) s.lat = numOr(r['Center Latitude']);
    if (s.lon == null) s.lon = numOr(r['Center Longitude']);
    if (s.zoom == null) s.zoom = numOr(r['Default Zoom']);
    var type = str(r['Overlay Type']), url = str(r['Overlay URL']);
    if (url && type && type !== 'Link only') {
      var b = str(r['Image Bounds (S,W,N,E)']).split(/[,;\s]+/).map(Number).filter(function (x) { return !isNaN(x); });
      s.overlays.push({ label: str(r['Layer Name']) || type, type: type, url: url, bounds: b.length === 4 ? [[b[0], b[1]], [b[2], b[3]]] : null,
                        date: str(r['Capture Date']), sensor: str(r['Sensor / Platform']) });
    }
    var model = str(r['3D Model Link']);
    if (model) s.models.push({ label: str(r['Layer Name']) || '3D model', url: model, date: str(r['Capture Date']) });
    if (type === 'Link only' && url) s.models.push({ label: str(r['Layer Name']) || 'Link', url: url, date: str(r['Capture Date']) });
    if (str(r['Notes'])) s.notes = str(r['Notes']);
  });

  // GPS index
  var bySub = {}, byTree = {}, byPoint = {}, usedGps = {};
  gpsRows.forEach(function (g, i) {
    if (numOr(g['Latitude']) == null || numOr(g['Longitude']) == null) return;
    var sub = normId_(g['Submission ID']), tr = normId_(g['Program Tree ID']), pt = normId_(g['Trimble Point Name']);
    if (sub) bySub[sub] = i; if (tr) byTree[tr] = i; if (pt) byPoint[pt] = i;
  });

  var out = treeRows.map(function (t) {
    var sub = normId_(t.subId), tr = normId_(t.treeId);
    var gi = bySub[sub] !== undefined ? bySub[sub] : byTree[tr] !== undefined ? byTree[tr] : byPoint[sub] !== undefined ? byPoint[sub] : byPoint[tr];
    var o = { subId: str(t.subId), treeId: str(t.treeId), program: str(t.program), species: str(t.species), material: str(t.material),
              crossType: str(t.crossType), mother: str(t.mother), father: str(t.father), field: str(t.field), position: str(t.position),
              collection: str(t.collection), state: str(t.state), town: str(t.town), year: str(t.year), priority: str(t.priority),
              status: str(t.status) || 'Pending', popGroup: str(t.popGroup), notes: str(t.notes), site: '', lat: null, lon: null, elev: null, acc: null, gps: 'None',
              plate: str(t.plate), well: str(t.well), geno: genoStatus_(t), pheno: phenoStatus_(t),
              genoVis: str(t.genoVis) || ACCESS.TEAM, phenoVis: str(t.phenoVis) || ACCESS.TEAM, gpsVis: str(t.gpsVis) || ACCESS.TEAM };
    if (gi !== undefined) {
      var g = gpsRows[gi]; usedGps[gi] = true;
      o.lat = numOr(g['Latitude']); o.lon = numOr(g['Longitude']); o.elev = numOr(g['Elevation (m)']); o.acc = numOr(g['H. Accuracy (m)']);
      o.gps = 'Surveyed'; o.site = str(g['Site Name']); o.gpsDate = str(g['Collected Date']);
      o.point = str(g['Trimble Point Name']); o.gpsMother = str(g['Maternal Parent']); o.fieldRow = str(g['Field Row']); o.fieldTree = str(g['Field Tree']); o.gpsSource = str(g['Source']);
    } else if (numOr(t.lat) != null && numOr(t.lon) != null) {
      o.lat = numOr(t.lat); o.lon = numOr(t.lon); o.gps = 'Breeder reported';
    }
    if (!o.site && o.field) {
      var f = o.field.toLowerCase(), prog = o.program.toLowerCase();
      var cands = order.filter(function (n) { var s = sites[n]; return s.fields.indexOf(f) >= 0 && (!s.program || s.program.toLowerCase() === prog); });
      if (cands.length > 1 && o.lat != null) cands.sort(function (a, b) { return siteDist_(o, sites[a]) - siteDist_(o, sites[b]); });
      if (cands.length) o.site = cands[0];
    }
    if (!o.site && o.lat != null) {
      var best = null, bestD = CONFIG.SITE_MATCH_KM;
      order.forEach(function (n) { var s = sites[n]; if (s.lat == null) return; var d = km_(o.lat, o.lon, s.lat, s.lon); if (d <= bestD) { bestD = d; best = n; } });
      if (best) o.site = best;
    }
    return o;
  });

  // One pin per site (or per program address) for trees that have no GPS point yet.
  var progByLabel = {}; PROGRAMS.forEach(function (p) { progByLabel[p.label] = p; });
  var pinMap = {}, pins = [];
  out.forEach(function (o) {
    if (o.lat != null) return;
    var s = o.site && sites[o.site], p = progByLabel[o.program], key, pin;
    if (s && s.lat != null) key = 'site|' + s.name;
    else if (p && p.lat != null) key = 'prog|' + p.label;
    else return;
    pin = pinMap[key];
    if (!pin) {
      pin = pinMap[key] = key.indexOf('site|') === 0
        ? { kind: 'site', label: s.name, site: s.name, program: s.program || o.program, lat: s.lat, lon: s.lon, address: '', count: 0, groups: {} }
        : { kind: 'program', label: p.label, site: '', program: p.label, lat: p.lat, lon: p.lon, address: p.address || '', count: 0, groups: {} };
      pins.push(pin);
    }
    pin.count++;
    var g = o.mother || o.field || 'Not given'; pin.groups[g] = (pin.groups[g] || 0) + 1;
    o.pin = key;
  });

  var unlinked = [];
  gpsRows.forEach(function (g, i) {
    if (usedGps[i] || numOr(g['Latitude']) == null || numOr(g['Longitude']) == null) return;
    unlinked.push({ label: str(g['Trimble Point Name']) || str(g['Program Tree ID']) || str(g['Submission ID']) || ('Point ' + (i + 2)),
                    site: str(g['Site Name']), lat: numOr(g['Latitude']), lon: numOr(g['Longitude']), elev: numOr(g['Elevation (m)']), date: str(g['Collected Date']),
                    mother: str(g['Maternal Parent']), fieldRow: str(g['Field Row']), fieldTree: str(g['Field Tree']), source: str(g['Source']) });
  });

  return { trees: out, sites: order.map(function (n) { return sites[n]; }), unlinked: unlinked, pins: pins, lists: LISTS,
           programs: PROGRAMS.map(function (p) { return p.label; }) };
}
function siteDist_(t, s) { return s.lat == null ? 1e9 : km_(t.lat, t.lon, s.lat, s.lon); }
function km_(a, b, c, d) { var R = 6371, r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return Math.sqrt(x * x + y * y) * R; }

/** Returns which of the given tree IDs already exist in the program's tab. */
function checkExisting(prefix, treeIds) {
  var sh = sheetForPrefix_(prefix);
  var existing = existingTreeIds_(sh);
  return treeIds.filter(function (t) { return existing[normId_(t)]; });
}

/**
 * Writes a batch of rows. payload = { prefix, batchId, contact:{name,email,collection}, rows:[{key:value}], skipExisting }
 * Large submissions are sent in chunks with the same batchId; `final` marks the last chunk.
 */
function submitBatch(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var p = programByPrefix_(payload.prefix);
    var sh = sheetForPrefix_(payload.prefix);
    var contact = payload.contact || {};
    if (!contact.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email || '')) throw new Error('Submitter name and a valid email are required.');
    var priv = payload.privacy || {};
    if (!priv.agree) throw new Error('Please accept the data-sharing terms before submitting.');
    var vis = function (v) { return v === ACCESS.MEMBER ? ACCESS.MEMBER : ACCESS.TEAM; };  // anything unexpected falls back to the most private option

    var props = PropertiesService.getScriptProperties();
    var key = 'batch_' + payload.batchId;
    var acc = JSON.parse(props.getProperty(key) || '{"n":0,"first":"","last":"","map":""}');
    if (payload.fieldMap && payload.fieldMap.data && !acc.map) acc.map = saveFieldMap_(payload.fieldMap, p, payload.batchId);

    var existing = existingTreeIds_(sh);
    var now = new Date();
    var rows = [], skipped = [];
    (payload.rows || []).forEach(function (r) {
      var id = String(r.treeId || '').trim();
      if (!id) return;
      if (existing[normId_(id)] && payload.skipExisting) { skipped.push(id); return; }
      existing[normId_(id)] = true;
      rows.push(COLUMNS.map(function (c) {
        switch (c.key) {
          case 'program': return p.label;
          case 'submitter': return r.submitter || contact.name;
          case 'email': return r.email || contact.email;
          case 'collection': return r.collection || contact.collection || '';
          case 'submittedAt': return now;
          case 'batchId': return payload.batchId;
          case 'fieldMap': return acc.map || '';
          case 'rawRelease': return CONFIG.RAW_DATA_POLICY;
          case 'genoVis': return vis(priv.genoVis);
          case 'phenoVis': return vis(priv.phenoVis);
          case 'gpsVis': return vis(priv.gpsVis);
          case 'status': return 'Pending';
          case 'lat': case 'lon': case 'year': return r[c.key] === '' || r[c.key] == null ? '' : Number(r[c.key]);
          default: return c.who === 'breeder' ? clean_(r[c.key]) : '';
        }
      }));
    });

    var startRow = lastDataRow_(sh) + 1;
    var startNum = startRow - 1;
    rows.forEach(function (row, i) { row[colIdx_('row') - 1] = startNum + i; });
    var ids = assignIdsInMemory_(rows, p.prefix, allSubIds_(sh));
    if (rows.length) {
      ensureSize_(sh, startRow + rows.length, COLUMNS.length);
      sh.getRange(startRow, 1, rows.length, COLUMNS.length).setValues(rows);
    }
    var mapping = rows.map(function (row) { return [row[colIdx_('subId') - 1], row[colIdx_('treeId') - 1]]; });

    acc.n += rows.length; if (!acc.first && ids.length) acc.first = ids[0]; if (ids.length) acc.last = ids[ids.length - 1];
    props.setProperty(key, JSON.stringify(acc));

    if (payload.final) {
      props.deleteProperty(key);
      var log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB.LOG);
      if (log) log.appendRow([now, payload.batchId, p.label, contact.name, contact.email, acc.n, acc.first, acc.last, acc.map || '', vis(priv.genoVis), vis(priv.phenoVis), vis(priv.gpsVis), now]);
      acc.genoVis = vis(priv.genoVis); acc.phenoVis = vis(priv.phenoVis); acc.gpsVis = vis(priv.gpsVis);
      notify_(p, contact, payload.batchId, acc);
    }
    return { added: rows.length, skipped: skipped, mapping: mapping, fieldMap: acc.map || '' };
  } finally {
    lock.releaseLock();
  }
}

/** Saves an uploaded field map (base64) to the project's Drive folder and returns its link. */
function saveFieldMap_(f, p, batchId) {
  var bytes = Utilities.base64Decode(String(f.data).replace(/^data:[^,]*,/, ''));
  if (bytes.length > CONFIG.FIELD_MAP_MAX_MB * 1024 * 1024) throw new Error('Field map is larger than ' + CONFIG.FIELD_MAP_MAX_MB + ' MB.');
  var it = DriveApp.getFoldersByName(CONFIG.FIELD_MAP_FOLDER);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(CONFIG.FIELD_MAP_FOLDER);
  var name = p.prefix + '_' + batchId + '_' + String(f.name || 'field-map').replace(/[^\w.\- ]+/g, '_');
  var file = folder.createFile(Utilities.newBlob(bytes, f.type || 'application/octet-stream', name));
  file.setDescription('Field map for ' + p.label + ', batch ' + batchId);
  return file.getUrl();
}

function notify_(p, contact, batchId, acc) {
  var ssUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  try {
    if (CONFIG.SEND_RECEIPTS && acc.n) {
      MailApp.sendEmail(contact.email, 'Chestnut genotyping submission received (' + acc.n + ' trees)',
        'Hi ' + contact.name + ',\n\nThank you — we received ' + acc.n + ' trees for ' + p.label + '.\n' +
        'Batch ID: ' + batchId + '\nSubmission IDs: ' + acc.first + ' to ' + acc.last + '\n' + (acc.map ? 'Field map received.\n' : '') +
        '\nYour data-sharing choices:\n- Raw genotype data: ' + CONFIG.RAW_DATA_POLICY + '\n- Genotype visualizations: ' + acc.genoVis + '\n- Phenotype visualizations: ' + acc.phenoVis + '\n- Exact GPS positions: ' + acc.gpsVis +
        '\nTo change these at any time, reply to this email.\n\n' +
        (siteUrl_() ? 'Project website: ' + siteUrl_() + '\n\n' : '') +
        'The Rodale team will review the submission and follow up about leaf-tissue sampling.\n\n' +
        'Richard Tegtmeier · Rodale Institute');
    }
    if (CONFIG.NOTIFY_ADMIN) {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '[Chestnut DB] ' + acc.n + ' trees from ' + p.label,
        contact.name + ' <' + contact.email + '> submitted ' + acc.n + ' trees (' + acc.first + '–' + acc.last + ').\nBatch ' + batchId + '\n' + ssUrl);
    }
  } catch (e) { console.warn('Email failed: ' + e); }
}

// ───────────────────────────── ADMIN UTILITIES ─────────────────────────────
/** Fills Row #, Submission ID, Program, Submitted At and Status for rows typed directly into program tabs. */
function assignMissingIds() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var total = 0;
  PROGRAMS.forEach(function (p) {
    var sh = ss.getSheetByName(p.tab);
    if (!sh) return;
    var last = lastDataRow_(sh);
    if (last < 2) return;
    var rng = sh.getRange(2, 1, last - 1, COLUMNS.length);
    var vals = rng.getValues();
    var used = vals.map(function (r) { return r[colIdx_('subId') - 1]; }).filter(String);
    var changed = false;
    var nextId = makeIdGen_(p.prefix, used);
    vals.forEach(function (r, i) {
      if (!String(r[colIdx_('treeId') - 1]).trim()) return;
      if (!r[colIdx_('row') - 1]) { r[colIdx_('row') - 1] = i + 1; changed = true; }
      if (!r[colIdx_('program') - 1]) { r[colIdx_('program') - 1] = p.label; changed = true; }
      if (!r[colIdx_('submittedAt') - 1]) { r[colIdx_('submittedAt') - 1] = new Date(); changed = true; }
      if (!r[colIdx_('batchId') - 1]) { r[colIdx_('batchId') - 1] = 'DIRECT-ENTRY'; changed = true; }
      if (!r[colIdx_('status') - 1]) { r[colIdx_('status') - 1] = 'Pending'; changed = true; }
      if (!r[colIdx_('subId') - 1]) { r[colIdx_('subId') - 1] = nextId(); changed = true; total++; }
    });
    if (changed) rng.setValues(vals);
  });
  try { SpreadsheetApp.getUi().alert(total + ' new Submission IDs assigned.'); } catch (e) {}
}

// ───────────────────────────── HELPERS ─────────────────────────────
function colIdx_(key) { for (var i = 0; i < COLUMNS.length; i++) if (COLUMNS[i].key === key) return i + 1; throw new Error('No column ' + key); }
function columnLetter_(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function q_(name) { return "'" + name.replace(/'/g, "''") + "'"; }
function norm_(s) { return String(s || '').toLowerCase().replace(/\*/g, '').replace(/\s+/g, ' ').trim(); }
function normId_(s) { return String(s || '').toLowerCase().replace(/\s+/g, '').trim(); }
function esc_(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function clean_(v) { if (v == null) return ''; var s = String(v).trim(); return /^[=+\-@]/.test(s) && !/^-?\d/.test(s) ? "'" + s : s; } // block formula injection

function programByPrefix_(prefix) {
  for (var i = 0; i < PROGRAMS.length; i++) if (PROGRAMS[i].prefix === prefix) return PROGRAMS[i];
  throw new Error('Unknown program: ' + prefix);
}
function sheetForPrefix_(prefix) {
  var p = programByPrefix_(prefix);
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(p.tab);
  if (!sh) throw new Error('Tab "' + p.tab + '" is missing — run Set up / repair workbook.');
  return sh;
}
function lastDataRow_(sh) {
  var n = sh.getLastRow();
  if (n < 2) return 1;
  var vals = sh.getRange(2, colIdx_('treeId'), n - 1, 1).getValues();
  for (var i = vals.length - 1; i >= 0; i--) if (String(vals[i][0]).trim()) return i + 2;
  return 1;
}
function countTrees_(sh) {
  var n = lastDataRow_(sh) - 1;
  if (n < 1) return 0;
  return sh.getRange(2, colIdx_('treeId'), n, 1).getValues().filter(function (r) { return String(r[0]).trim(); }).length;
}
function existingTreeIds_(sh) {
  var map = {}, n = lastDataRow_(sh) - 1;
  if (n < 1) return map;
  sh.getRange(2, colIdx_('treeId'), n, 1).getValues().forEach(function (r) { var k = normId_(r[0]); if (k) map[k] = true; });
  return map;
}
function allSubIds_(sh) {
  var n = lastDataRow_(sh) - 1;
  if (n < 1) return [];
  return sh.getRange(2, colIdx_('subId'), n, 1).getValues().map(function (r) { return r[0]; }).filter(String);
}
function makeIdGen_(prefix, used) {
  var max = 0, re = new RegExp('^' + prefix + '-(\\d+)$');
  used.forEach(function (id) { var m = String(id).match(re); if (m) max = Math.max(max, Number(m[1])); });
  return function () { max++; return prefix + '-' + ('0000' + max).slice(-4); };
}
function assignIdsInMemory_(rows, prefix, used) {
  var gen = makeIdGen_(prefix, used), ids = [], c = colIdx_('subId') - 1;
  rows.forEach(function (r) { if (!r[c]) r[c] = gen(); ids.push(r[c]); });
  return ids;
}
function ensureSize_(sh, rows, cols) {
  if (sh.getMaxRows() < rows) sh.insertRowsAfter(sh.getMaxRows(), rows - sh.getMaxRows());
  if (sh.getMaxColumns() < cols) sh.insertColumnsAfter(sh.getMaxColumns(), cols - sh.getMaxColumns());
}
