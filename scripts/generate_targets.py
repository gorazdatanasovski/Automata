import urllib.request
import json
import csv
import ssl
import sys
import os

GREENHOUSE_SLUGS = {
    "jumptrading": "Jump Trading",
    "drw": "DRW",
    "drweng": "DRW",
    "optiverus": "Optiver",
    "optiverprivate": "Optiver",
    "imc": "IMC Trading",
    "akunacapital": "Akuna Capital",
    "chicagotradingcampus": "Chicago Trading Company",
    "chicagotrading": "Chicago Trading Company",
    "wehrtyou": "Hudson River Trading",
    "radixuniversity": "Radix Trading",
    "radixexperienced": "Radix Trading",
    "dvtrading": "DV Trading"
}

LEVER_SLUGS = {
    "transmarketgroup": "TransMarket Group"
}

# Manual Workday URLs (The Banks & Citadel)
# Append any Citadel, JPM, or Morgan Stanley Workday links here.
MANUAL_TARGETS = [
    # Format: ["Company", "Role", "URL", "Platform", "Location"]
    # ["Citadel", "Quantitative Researcher", "https://citadel.workday.com/...", "Workday", "Chicago, IL"]
]

KEYWORDS = ['quant', 'quantitative', 'algorithmic', 'trader', 'options', 'researcher', 'sales & trading']

def matches_keywords(title):
    title_lower = title.lower()
    for kw in KEYWORDS:
        if kw in title_lower:
            return True
    return False

def matches_location(location):
    if not location:
        return True # Default to true if missing
    loc_lower = location.lower()
    return "chicago" in loc_lower or "remote" in loc_lower or "us" in loc_lower or "united states" in loc_lower

def fetch_json(url):
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, context=ctx) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def process_greenhouse():
    results = []
    for slug, company_name in GREENHOUSE_SLUGS.items():
        url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs"
        print(f"Fetching Greenhouse: {company_name} ({slug})")
        data = fetch_json(url)
        if not data or 'jobs' not in data:
            continue
        
        for job in data['jobs']:
            title = job.get('title', '')
            location_data = job.get('location', {})
            location = location_data.get('name', '') if location_data else ''
            job_url = job.get('absolute_url', '')
            
            if matches_keywords(title) and matches_location(location):
                results.append([
                    company_name,
                    title,
                    job_url,
                    "Greenhouse",
                    location
                ])
    return results

def process_lever():
    results = []
    for slug, company_name in LEVER_SLUGS.items():
        url = f"https://api.lever.co/v0/postings/{slug}?mode=json"
        print(f"Fetching Lever: {company_name} ({slug})")
        data = fetch_json(url)
        if not data:
            continue
            
        for job in data:
            title = job.get('text', '')
            location = job.get('categories', {}).get('location', '')
            job_url = job.get('hostedUrl', '')
            
            if matches_keywords(title) and matches_location(location):
                results.append([
                    company_name,
                    title,
                    job_url,
                    "Lever",
                    location
                ])
    return results

def main():
    print("Starting API pull for Chicago Prop Trading firms...")
    jobs = []
    jobs.extend(process_greenhouse())
    jobs.extend(process_lever())
    jobs.extend(MANUAL_TARGETS)
    
    output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'targets.csv')
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Company', 'Role', 'URL', 'Platform', 'Location'])
        writer.writerows(jobs)
        
    print(f"\nSuccess! Found {len(jobs)} targets.")
    print(f"Saved to {os.path.abspath(output_path)}")

if __name__ == '__main__':
    main()
