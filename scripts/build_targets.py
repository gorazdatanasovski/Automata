#!/usr/bin/env python3
"""
Reconnaissance Engine — queries Greenhouse & Lever public APIs directly.
No scraping. No manual URL hunting. Runs in seconds.

Outputs to data/targets.csv in the format expected by the TypeScript orchestrator.

Usage:
  pip install requests
  python scripts/build_targets.py
"""

import requests
import csv
import time
import os
import sys
from datetime import datetime

# ──────────────────────────────────────────────
# 1.  COMPANY SLUGS  (edit these lists freely)
# ──────────────────────────────────────────────

GREENHOUSE = {
    "Jane Street":          "janestreet",
    "Citadel":              "citadel",
    "Citadel Securities":   "citadelsecurities",
    "DRW":                  "drw",
    "Hudson River Trading": "hudsonrivertrading",
    "Akuna Capital":        "akunacapital",
    "IMC Trading":          "imc",
    "Five Rings Capital":   "fiverings",
    "Susquehanna (SIG)":    "sig",
    "Virtu Financial":      "virtu",
    "Flow Traders":         "flowtraders",
    "Tibra Capital":        "tibracapital",
    "Millennium":           "millennium",
    "Point72":              "point72",
    # Chicago Proprietary Firms
    "Group One":            "grouponetrading",
    "Geneva Trading":       "genevatrading",
    "Allston":              "allston",
    "Valkyrie":             "valkyrie",
}

LEVER = {
    "Jump Trading":         "jumptrading",
    "Optiver":              "optiver",
    "Two Sigma":            "twosigma",
    "Belvedere Trading":    "belvederetrading",
    "Peak6":                "peak6",
    "Wolverine Trading":    "wolverinetrading",
    "Aquatic Capital":      "aquaticcapital",
    "Maven Securities":     "mavensecurities",
    # Chicago Proprietary Firms
    "Spot Trading":         "spottrading",
    "TransMarket Group":    "transmarketgroup",
}

# ──────────────────────────────────────────────
# 2.  KEYWORD FILTER  (case-insensitive OR match)
# ──────────────────────────────────────────────

# 1. The Target Matrix (Strictly Trading, Quant, Equities, & Crypto)
POSITIVE_KEYWORDS = [
    "quant", "trading", "trader", "execution", "market making", 
    "sales and trading", "algorithmic", "derivatives", "options", 
    "equities", "crypto", "digital assets", "volatility", 
    "systematic", "alpha", "quantitative research", "portfolio"
]

# 2. The Kill-List (Aggressively Blocking Generic SWE & Back-Office)
NEGATIVE_KEYWORDS = [
    "software engineer", "full stack", "backend", "frontend", "web", 
    "devops", "cloud", "infrastructure", "data center", "asic", "fpga", 
    "physical design", "hardware", "legal", "hr", "human resources", 
    "recruiter", "compliance", "accountant", "tax", "marketing", 
    "facilities", "assistant", "network engineer", "desktop support", 
    "operations", "reliability engineer", "sre", "qa", "test engineer"
]

def matches(title):
    t = title.lower()
    has_positive = any(kw in t for kw in POSITIVE_KEYWORDS)
    has_negative = any(kw in t for kw in NEGATIVE_KEYWORDS)
    return has_positive and not has_negative

def is_us_location(location, title=""):
    l = location.lower() + " " + title.lower()
    if not location:
        return False
        
    non_us = ["london", "amsterdam", "sydney", "hong kong", "singapore", "paris", "frankfurt", "zurich", "dublin", "aarhus", "china", "tokyo", "uk ", " eu ", "apac", "emea"]
    if any(x in l for x in non_us):
        return False
        
    us_keywords = ["us", "usa", "united states", "remote", "new york", "ny", "chicago", "il", "san francisco", "ca", "austin", "tx", "boston", "ma", "miami", "fl"]
    # Check if any US keyword is in the location string (only the location, title remote shouldn't auto pass)
    if any(k in location.lower().split(', ') or k in location.lower().split() or k in location.lower() for k in us_keywords):
        return True
        
    return False


# ──────────────────────────────────────────────
# 3.  FETCHERS
# ──────────────────────────────────────────────

HEADERS = {"User-Agent": "Mozilla/5.0 (job-search-script/1.0)"}

def fetch_greenhouse(company, slug):
    url = "https://boards-api.greenhouse.io/v1/boards/{}/jobs".format(slug)
    try:
        r = requests.get(url, headers=HEADERS, timeout=12)
        if r.status_code == 404:
            print("  !  {}: Greenhouse board not found (may use Workday)".format(company))
            return []
        r.raise_for_status()
        jobs = []
        for j in r.json().get("jobs", []):
            title = j.get("title", "")
            if matches(title):
                # Greenhouse exposes the string location in `location` -> `name`
                loc_obj = j.get("location", {})
                location = loc_obj.get("name", "")
                
                # Fallback to offices if needed
                if not location:
                    location = "; ".join(loc.get("name", "") for loc in j.get("offices", []))
                
                if not location:
                    location = "Remote/Unknown"
                    
                if is_us_location(location, title):
                    jobs.append({
                        "Company":  company,
                        "Role":     title,
                        "URL":      j.get("absolute_url", ""),
                        "Platform": "Greenhouse",
                        "Location": location,
                    })
        return jobs
    except Exception as e:
        print("  x  {}: {}".format(company, e))
        return []

def fetch_lever(company, slug):
    url = "https://api.lever.co/v0/postings/{}?mode=json".format(slug)
    try:
        r = requests.get(url, headers=HEADERS, timeout=12)
        if r.status_code == 404:
            print("  !  {}: Lever board not found".format(company))
            return []
        r.raise_for_status()
        jobs = []
        for j in r.json():
            title = j.get("text", "")
            if matches(title):
                location = j.get("categories", {}).get("location", "Remote/Unknown")
                if is_us_location(location, title):
                    jobs.append({
                        "Company":  company,
                        "Role":     title,
                        "URL":      j.get("hostedUrl", j.get("applyUrl", "")),
                        "Platform": "Lever",
                        "Location": location,
                    })
        return jobs
    except Exception as e:
        print("  x  {}: {}".format(company, e))
        return []


# ──────────────────────────────────────────────
# 4.  WORKDAY  (no standard API - manual paste)
# ──────────────────────────────────────────────
# Workday doesn't expose a public API. For GS, MS, BofA, Barclays etc.,
# paste URLs manually below. The script appends them to the final CSV.

WORKDAY_MANUAL = [
    # ("Goldman Sachs",   "Summer Analyst S&T",  "https://hdprd.wd5.myworkdayjobs.com/GS/job/..."),
    # ("Morgan Stanley",  "Trading Analyst",     "https://..."),
]


# ──────────────────────────────────────────────
# 5.  MAIN
# ──────────────────────────────────────────────

def main():
    all_jobs = []

    print("\n-- Greenhouse ----------------------------------------")
    for company, slug in GREENHOUSE.items():
        found = fetch_greenhouse(company, slug)
        print("  +  {}: {} role(s) matched".format(company, len(found)))
        all_jobs.extend(found)
        time.sleep(0.3)   # polite HTTP citizen

    print("\n-- Lever ---------------------------------------------")
    for company, slug in LEVER.items():
        found = fetch_lever(company, slug)
        print("  +  {}: {} role(s) matched".format(company, len(found)))
        all_jobs.extend(found)
        time.sleep(0.3)

    # Append manual Workday entries
    for company, role, url in WORKDAY_MANUAL:
        all_jobs.append({
            "Company":  company,
            "Role":     role,
            "URL":      url,
            "Platform": "Workday",
            "Location": "Manual",
        })

    # Deduplicate by URL
    seen = set()
    unique = []
    for job in all_jobs:
        if job["URL"] not in seen:
            seen.add(job["URL"])
            unique.append(job)

    # Resolve output path relative to the project root (one level up from scripts/)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    out = os.path.join(project_root, "data", "targets.csv")

    with open(out, "w", newline="", encoding="utf-8") as f:
        fields = ["Company", "Role", "URL", "Platform", "Location"]
        w = csv.DictWriter(f, fieldnames=fields, quoting=csv.QUOTE_ALL)
        w.writeheader()
        w.writerows(unique)

    print("\n" + "-" * 50)
    print("  {} unique roles -> {}".format(len(unique), out))
    print("  Generated: {}".format(datetime.now().strftime('%Y-%m-%d %H:%M')))
    print("-" * 50 + "\n")


if __name__ == "__main__":
    main()
