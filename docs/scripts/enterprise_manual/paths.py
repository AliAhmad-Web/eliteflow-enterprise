"""Filesystem paths for the EliteFlow enterprise documentation build."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ASSETS = ROOT / "docs" / "enterprise-manual-assets"
SCREENSHOTS_RAW = ASSETS / "screenshots"
SCREENSHOTS = ASSETS / "screenshots-clean"
# Fall back to raw if clean set missing
if not SCREENSHOTS.is_dir() or not any(SCREENSHOTS.glob("page-*.png")):
    SCREENSHOTS = SCREENSHOTS_RAW
CATALOG = ASSETS / "screenshot-catalog.json"
OUT_DIR = ROOT / "docs"
OUT_PDF = OUT_DIR / "ELITEFLOW_ENTERPRISE_DOCUMENTATION.pdf"
OUT_DOCX = OUT_DIR / "ELITEFLOW_ENTERPRISE_DOCUMENTATION.docx"
HTML_PATH = ASSETS / "manual.html"
