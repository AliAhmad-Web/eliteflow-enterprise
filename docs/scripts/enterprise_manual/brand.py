"""EliteFlow enterprise documentation brand tokens (print-ready)."""

from datetime import date

# Print documentation palette — navy foundation (enterprise manuals)
# with EliteFlow product accents (purple + gold) from the design system.
NAVY = "#0B3A6E"
NAVY_DEEP = "#061F3B"
NAVY_MID = "#1565C0"
NAVY_LIGHT = "#E8F1FB"
PURPLE = "#7C3AED"
PURPLE_SOFT = "#8B5CF6"
GOLD = "#F59E0B"
GOLD_DARK = "#D97706"
BLACK = "#111827"
GRAY = "#4B5563"
GRAY_LIGHT = "#6B7280"
BORDER = "#D1D5DB"
SURFACE = "#F8FAFC"
WHITE = "#FFFFFF"
SUCCESS = "#059669"
INK = "#0F172A"

DOC_TITLE = "EliteFlow Enterprise Business Management System"
DOC_SUBTITLE = "Enterprise Product Documentation"
DOC_VERSION = "1.0.0"
DOC_CLASSIFICATION = "Product Manual · Internship Submission"
AUTHOR = "Ali Ahmad"
COPYRIGHT = "Copyright © 2026 Ali Ahmad. All Rights Reserved."
PRODUCT = "EliteFlow"
ORG = "EliteFlow Technologies"

WEB_URL = "https://eliteflow-web.vercel.app"
API_URL = "https://api-production-a778.up.railway.app"
DOMAIN = "https://eliteflow.app"


def today_str() -> str:
    return date.today().strftime("%B %d, %Y")
