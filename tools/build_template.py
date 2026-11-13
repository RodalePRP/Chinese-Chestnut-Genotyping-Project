"""Builds templates/chestnut_submission_template.xlsx from the schema in apps-script/Code.gs.
Run from the repo root:  python3 tools/build_template.py   (needs: pip install openpyxl; node)"""
import json, subprocess, pathlib
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.comments import Comment
from openpyxl.utils import get_column_letter

root = pathlib.Path(__file__).resolve().parent.parent
js = """const fs=require('fs'),vm=require('vm');const c={};vm.createContext(c);
vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);
console.log(JSON.stringify(vm.runInContext('buildPortalConfig_({})',c)));"""
cfg = json.loads(subprocess.check_output(['node', '-e', js, str(root / 'apps-script/Code.gs')]))
fields = [f for f in cfg['columns'] if f['key'] not in ('submitter', 'email')]
fields.sort(key=lambda f: f['key'] != 'treeId')
lists = cfg['lists']

BROWN, CREAM = '3B2A1A', 'F3E7D9'
wb = Workbook()
ins = wb.active; ins.title = 'Instructions'
ws = wb.create_sheet('Submission')
for i, f in enumerate(fields, 1):
    c = ws.cell(1, i, f['header'] + (' *' if f['required'] else ''))
    c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor=BROWN)
    c.alignment = Alignment(wrap_text=True, vertical='center', horizontal='center')
    c.comment = Comment(f['note'] + (('\n\nOptions: ' + ', '.join(lists[f['list']])) if f['list'] else ''), 'Rodale')
    ws.column_dimensions[get_column_letter(i)].width = max(14, min(34, len(f['header']) + 4))
ws.row_dimensions[1].height = 36
ws.freeze_panes = 'B2'

lw = wb.create_sheet('Lists')
for j, (k, vals) in enumerate(lists.items(), 1):
    lw.cell(1, j, k).font = Font(bold=True)
    for r, v in enumerate(vals, 2): lw.cell(r, j, v)
lw.sheet_state = 'hidden'
keys = list(lists.keys())
for i, f in enumerate(fields, 1):
    col = get_column_letter(i)
    if f['list']:
        lc = get_column_letter(keys.index(f['list']) + 1)
        dv = DataValidation(type='list', formula1=f"=Lists!${lc}$2:${lc}${len(lists[f['list']]) + 1}", allow_blank=True,
                            showErrorMessage=True, errorStyle='warning', errorTitle='Not a standard option',
                            error='This value is not in the list. Keep it anyway?')
        dv.add(f'{col}2:{col}3000'); ws.add_data_validation(dv)
    elif f['key'] in ('lat', 'lon'):
        lo, hi = (-90, 90) if f['key'] == 'lat' else (-180, 180)
        dv = DataValidation(type='decimal', operator='between', formula1=str(lo), formula2=str(hi), allow_blank=True,
                            showErrorMessage=True, error='Decimal degrees, e.g. 40.5123 / -75.7891'); dv.add(f'{col}2:{col}3000'); ws.add_data_validation(dv)
    elif f['key'] == 'year':
        dv = DataValidation(type='whole', operator='between', formula1='1900', formula2='2100', allow_blank=True,
                            showErrorMessage=True, error='Four-digit year'); dv.add(f'{col}2:{col}3000'); ws.add_data_validation(dv)

ins['A1'] = 'Chinese Chestnut Genotyping — Tree Submission Template'; ins['A1'].font = Font(bold=True, size=15, color=BROWN)
lines = ['1. Fill in your details below.',
         '2. Enter your trees on the "Submission" sheet (second tab) — one row per tree. Only Program Tree ID is required; share whatever else you have.',
         '3. Upload this file on the project website (Submit trees → Upload a file) and attach your field map there, or email both to the project team.',
         'Tip: hover over a column header on the Submission sheet to see what to enter. Dropdowns accept typing too.']
for r, t in enumerate(lines, 3): ins.cell(r, 1, t)
r = 8
for label in ['Breeding program', 'Your name', 'Email', 'Farm / orchard / collection']:
    ins.cell(r, 1, label).font = Font(bold=True); ins.cell(r, 2).fill = PatternFill('solid', fgColor=CREAM); r += 1
r += 1
ins.cell(r, 1, 'Data sharing and permissions').font = Font(bold=True, size=12, color=BROWN); r += 1
ins.cell(r, 1, 'Raw genotype data').font = Font(bold=True)
ins.cell(r, 2, 'Held by the project; released to others only on request and with your written permission, before publication.'); r += 1
vis_dv = DataValidation(type='list', formula1='"Project team only,Research collaborators & NNGA members"', allow_blank=False)
agree_dv = DataValidation(type='list', formula1='"Yes"', allow_blank=False)
ins.add_data_validation(vis_dv); ins.add_data_validation(agree_dv)
for label, help_text, dv in [('Genotype visualizations', 'Who may see ancestry/structure/relatedness plots of your trees: Project team only, or Research collaborators & NNGA members', vis_dv),
                             ('Phenotype visualizations', 'Who may see charts of your trait data: Project team only, or Research collaborators & NNGA members', vis_dv),
                             ('Exact GPS positions', 'Who may see each tree\'s exact map position (others see the general site only): Project team only, or Research collaborators & NNGA members', vis_dv),
                             ('I agree to the data policy', 'Yes = I agree to the project data policy and am authorized to submit these trees', agree_dv)]:
    ins.cell(r, 1, label).font = Font(bold=True)
    c = ins.cell(r, 2, 'Project team only' if dv is vis_dv else ''); c.fill = PatternFill('solid', fgColor=CREAM); dv.add(c.coordinate)
    ins.cell(r, 3, help_text).font = Font(color='666666'); r += 1
r += 1
ins.cell(r, 1, 'Column guide').font = Font(bold=True, size=12, color=BROWN); r += 1
for h in ['Column', 'What to enter', 'Allowed values']:
    pass
for j, h in enumerate(['Column', 'What to enter', 'Allowed values'], 1):
    c = ins.cell(r, j, h); c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor=BROWN)
r += 1
for f in fields:
    ins.cell(r, 1, f['header'] + (' *' if f['required'] else '')).font = Font(bold=True)
    ins.cell(r, 2, f['note']).alignment = Alignment(wrap_text=True, vertical='top')
    ins.cell(r, 3, ', '.join(lists[f['list']]) if f['list'] else '').alignment = Alignment(wrap_text=True, vertical='top')
    r += 1
ins.column_dimensions['A'].width = 30; ins.column_dimensions['B'].width = 90; ins.column_dimensions['C'].width = 55

out = root / 'templates/chestnut_submission_template.xlsx'
wb.active = 0
wb.save(out); print('wrote', out)
