"""Query Google Ads for all active /lp/ landing page URLs."""

import os
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException

# Resolve google-ads.yaml relative to this script: scripts/utils/ → repo root
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
YAML_PATH = os.path.join(REPO_ROOT, ".config", "google-ads.yaml")

def get_lp_urls(client, customer_id):
    ga_service = client.get_service("GoogleAdsService")
    query = """
        SELECT
            ad_group_ad.ad.final_urls,
            campaign.name,
            campaign.status,
            ad_group.name,
            ad_group_ad.status
        FROM ad_group_ad
        WHERE ad_group_ad.status = 'ENABLED'
          AND campaign.status = 'ENABLED'
          AND ad_group.status = 'ENABLED'
    """
    lp_urls = {}
    try:
        response = ga_service.search_stream(customer_id=customer_id, query=query)
        for batch in response:
            for row in batch.results:
                for url in row.ad_group_ad.ad.final_urls:
                    if "/lp/" in url:
                        clean = url.split("?")[0].rstrip("/")
                        if clean not in lp_urls:
                            lp_urls[clean] = set()
                        lp_urls[clean].add(row.campaign.name)
    except GoogleAdsException as ex:
        print(f"  Error: {ex.error.code().name} — {ex.failure.errors[0].message}")
    return lp_urls

def main():
    client = GoogleAdsClient.load_from_storage(YAML_PATH, version="v20")
    customer_service = client.get_service("CustomerService")
    customers = customer_service.list_accessible_customers()

    all_lp_urls = {}
    for resource_name in customers.resource_names:
        cid = resource_name.split("/")[-1]
        print(f"Checking customer: {cid}")
        urls = get_lp_urls(client, cid)
        for url, campaigns in urls.items():
            if url not in all_lp_urls:
                all_lp_urls[url] = set()
            all_lp_urls[url].update(campaigns)

    print("\n=== ACTIVE /lp/ LANDING PAGES ===")
    for url in sorted(all_lp_urls.keys()):
        campaigns = ", ".join(sorted(all_lp_urls[url]))
        print(f"{url}  [{campaigns}]")
    print(f"\nTotal unique /lp/ URLs: {len(all_lp_urls)}")

if __name__ == "__main__":
    main()
