# EliteFlow Enterprise Documentation
#
# Generate PDF + DOCX:
#   python docs/scripts/enterprise_manual/generate.py
#
# Inputs:
#   docs/enterprise-manual-assets/screenshot-catalog.json
#   docs/enterprise-manual-assets/screenshots/page-XX.png
#
# Outputs:
#   docs/ELITEFLOW_ENTERPRISE_DOCUMENTATION.pdf
#   docs/ELITEFLOW_ENTERPRISE_DOCUMENTATION.docx
#
# Source PDF of screenshots (user-provided):
#   typically imported from Downloads/screenshot .pdf

To regenerate screenshots from a CamScanner/PDF dump:

```powershell
python -c "import fitz; from pathlib import Path; src=Path(r'c:\Users\premier\Downloads\screenshot .pdf'); out=Path('docs/enterprise-manual-assets/screenshots'); out.mkdir(parents=True, exist_ok=True); doc=fitz.open(src); 
[doc[i].get_pixmap(matrix=fitz.Matrix(2,2), alpha=False).save(str(out / f'page-{i+1:02d}.png')) for i in range(doc.page_count)]"
```

Then update `screenshot-catalog.json` if page order changes, and re-run the generator.
