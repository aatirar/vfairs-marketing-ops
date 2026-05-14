import csv
import os
from collections import defaultdict

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CUSTOMER_LIST = os.path.join(REPO_ROOT, "data", "customers", "customer-list.tsv")

# ── Active customers (customer list file) ────────────────────────
def run_active():
    with open(CUSTOMER_LIST, encoding="utf-8") as f:
        content = f.read()

    lines = content.split("\n")
    category_counts = defaultdict(int)
    other_industries = defaultdict(int)

    for line in lines:
        if "\t" not in line:
            continue
        parts = line.split("\t")
        industry = parts[0].strip()
        category = CATEGORY_MAP.get(industry, "Other Industries")
        category_counts[category] += 1
        if category == "Other Industries":
            other_industries[industry] += 1

    total = sum(category_counts.values())
    ORDER = [
        "Banking, Financial Services & Insurance",
        "Retail and Wholesale",
        "Energy, Utilities, Oil & Gas",
        "Healthcare and Life Sciences",
        "Manufacturing",
        "Government",
        "Education",
        "Technology",
        "Telecommunications and Media",
        "Travel, Transportation and Hospitality",
        "Other Industries",
    ]

    print(f"Active customers: {total}\n")
    print(f"{'Category':<45} {'Count':>6}  {'%':>6}")
    print("-" * 62)
    for cat in ORDER:
        count = category_counts.get(cat, 0)
        pct = count / total * 100
        print(f"{cat:<45} {count:>6}  {pct:>5.1f}%")

    print("\n--- Top industries in Other ---")
    for k, v in sorted(other_industries.items(), key=lambda x: -x[1])[:15]:
        print(f"  {v:3d}  {k}")


# ── Full historical analysis ──────────────────────────────────────
def run_full():
    pass  # original logic already in main block below

CATEGORY_MAP = {
    # Banking, Financial Services and Insurance
    "Financial Services": "Banking, Financial Services & Insurance",
    "Financial services": "Banking, Financial Services & Insurance",
    "Insurance": "Banking, Financial Services & Insurance",
    "Banking": "Banking, Financial Services & Insurance",
    "Accounting": "Banking, Financial Services & Insurance",
    "Investment Management": "Banking, Financial Services & Insurance",
    "Venture Capital & Private Equity": "Banking, Financial Services & Insurance",
    "Venture Capital and Private Equity Principals": "Banking, Financial Services & Insurance",
    "Investment Banking": "Banking, Financial Services & Insurance",
    "Capital Markets": "Banking, Financial Services & Insurance",
    "CAPITAL MARKETS": "Banking, Financial Services & Insurance",
    "Chartered Accountants": "Banking, Financial Services & Insurance",
    # Retail and Wholesale
    "Retail": "Retail and Wholesale",
    "Wholesale": "Retail and Wholesale",
    "Consumer Goods": "Retail and Wholesale",
    "Consumer Services": "Retail and Wholesale",
    "E-commerce": "Retail and Wholesale",
    "Apparel": "Retail and Wholesale",
    "Apparel & Fashion": "Retail and Wholesale",
    "Textiles, Apparel & Luxury Goods": "Retail and Wholesale",
    "Textiles": "Retail and Wholesale",
    "Luxary Goods & Jewelry": "Retail and Wholesale",
    "Restaurants": "Retail and Wholesale",
    "Food & Beverages": "Retail and Wholesale",
    "Food & beverages": "Retail and Wholesale",
    "Food Production": "Retail and Wholesale",
    "Cosmetics": "Retail and Wholesale",
    "Personal Care Product Manufacturing": "Retail and Wholesale",
    "Wine and Spirits": "Retail and Wholesale",
    # Energy, Utilities, Oil & Gas
    "Oil & energy": "Energy, Utilities, Oil & Gas",
    "Oil & Energy": "Energy, Utilities, Oil & Gas",
    "OIl & Energy": "Energy, Utilities, Oil & Gas",
    "Energy": "Energy, Utilities, Oil & Gas",
    "Utilities": "Energy, Utilities, Oil & Gas",
    "Renewables & Environment": "Energy, Utilities, Oil & Gas",
    "Renewable Energy Semiconductor Manufacturing": "Energy, Utilities, Oil & Gas",
    # Healthcare and Life Sciences
    "Healthcare": "Healthcare and Life Sciences",
    "Health, Wellness & Fitness": "Healthcare and Life Sciences",
    "Medical Equipment Manufacturing": "Healthcare and Life Sciences",
    "Medical Practice": "Healthcare and Life Sciences",
    "Medical Practices": "Healthcare and Life Sciences",
    "Pharmaceuticals": "Healthcare and Life Sciences",
    "Biotechnology": "Healthcare and Life Sciences",
    "Mental Healthcare": "Healthcare and Life Sciences",
    "Mental Health Care": "Healthcare and Life Sciences",
    "Medical Center": "Healthcare and Life Sciences",
    "Veterinary Services": "Healthcare and Life Sciences",
    "Hospitals and Health Care": "Healthcare and Life Sciences",
    "Life Sciences": "Healthcare and Life Sciences",
    "Optometrists": "Healthcare and Life Sciences",
    # Manufacturing
    "Manufacturing": "Manufacturing",
    "Electrical & Electronic Manufacturing": "Manufacturing",
    "Chemical Manufacturing": "Manufacturing",
    "Automation Machinery Manufacturing": "Manufacturing",
    "Motor Vehicle Manufacturing": "Manufacturing",
    "Automotive": "Manufacturing",
    "Defense and Space Manufacturing": "Manufacturing",
    "Industrial Automation": "Manufacturing",
    "Mechanical or Industrial Engineering": "Manufacturing",
    "Mechanical Or Industrial Engineering": "Manufacturing",
    "Semiconductors": "Manufacturing",
    "Packaging and Containers": "Manufacturing",
    "Mining and Metals": "Manufacturing",
    "Appliances, Electrical, and Electronics Manufacturing": "Manufacturing",
    "Paper and Forest Products": "Manufacturing",
    "Plastics": "Manufacturing",
    "Plastics Manufacturing": "Manufacturing",
    "Computer Hardware Manufacturing": "Manufacturing",
    "Physical Infrastructure Manufacturers": "Manufacturing",
    "Marine Products": "Manufacturing",
    "Glass, Ceramics and Concrete": "Manufacturing",
    "Electronic Parts Supplier": "Manufacturing",
    # Government
    "Government Administration": "Government",
    "Government Relations Services": "Government",
    "Public Policy": "Government",
    "Public Policy Offices": "Government",
    "International Affairs": "Government",
    "International Trade & Development": "Government",
    "Military": "Government",
    "Public Safety": "Government",
    "Law Enforcement": "Government",
    "Judiciary": "Government",
    "Executive Offices": "Government",
    "Political Organization": "Government",
    "Think Tanks": "Government",
    # Education
    "Higher Education": "Education",
    "Education Management & Services": "Education",
    "Educational Institution": "Education",
    "E-Learning Providers": "Education",
    "E-learning Providers": "Education",
    "Primary and Secondary Education": "Education",
    "Professional Training and Coaching": "Education",
    "Professional Training & Coaching": "Education",
    # Technology
    "Information Technology & Services": "Technology",
    "Computer Software": "Technology",
    "Software Development": "Technology",
    "Research and Technology": "Technology",
    "Internet": "Technology",
    "Computer & Network Security": "Technology",
    "Software Company": "Technology",
    "Internet Publishing": "Technology",
    "Data Infrastructure and Analytics": "Technology",
    "Science & Technology": "Technology",
    "Information services": "Technology",
    "Information Services": "Technology",
    "Consultancy and Cyber Security": "Technology",
    "Video Conferencing": "Technology",
    "Virtual and Hybrid Event Platform": "Technology",
    # Telecommunications and Media
    "Telecommunications": "Telecommunications and Media",
    "Media Production": "Telecommunications and Media",
    "Publishing": "Telecommunications and Media",
    "Entertainment": "Telecommunications and Media",
    "Broadcast Media": "Telecommunications and Media",
    "Online Audio and Video Media": "Telecommunications and Media",
    "Newspapers": "Telecommunications and Media",
    "Media": "Telecommunications and Media",
    "Online Media": "Telecommunications and Media",
    "Online media": "Telecommunications and Media",
    "Music and Entertainment": "Telecommunications and Media",
    "Communications Agency": "Telecommunications and Media",
    "Journalism": "Telecommunications and Media",
    "Book and Periodical Publishing": "Telecommunications and Media",
    # Travel, Transportation and Hospitality
    "Leisure, Travel and Tourism": "Travel, Transportation and Hospitality",
    "Leisure, Travel & Tourism": "Travel, Transportation and Hospitality",
    "Transportation, Logistics, Supply Chain and Storage": "Travel, Transportation and Hospitality",
    "Aviation & Aerospace": "Travel, Transportation and Hospitality",
    "Hospitality": "Travel, Transportation and Hospitality",
    "Airlines/ Aviation": "Travel, Transportation and Hospitality",
    "Airlines and Aviation": "Travel, Transportation and Hospitality",
    "Logistics & Supply Chain": "Travel, Transportation and Hospitality",
    "Maritime Transportation": "Travel, Transportation and Hospitality",
    "Tourism": "Travel, Transportation and Hospitality",
    "Hotel Management": "Travel, Transportation and Hospitality",
    "Lodging & Resorts": "Travel, Transportation and Hospitality",
    "Freight Delivery": "Travel, Transportation and Hospitality",
}

if __name__ == "__main__":
    run_active()
