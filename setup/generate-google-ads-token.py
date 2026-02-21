#!/usr/bin/env python3
"""
generate-google-ads-token.py

Run this ONCE after placing your google-ads.yaml in .config/
It opens a browser, you sign in with your Google account,
and it saves your personal refresh token into google-ads.yaml.

Usage:
    python setup/generate-google-ads-token.py

Requirements (install first):
    pip install google-auth-oauthlib pyyaml
"""

import os
import sys
import yaml
from google_auth_oauthlib.flow import InstalledAppFlow

# ─── Find google-ads.yaml (relative to this script's repo root) ──────────────

repo_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
yaml_path = os.path.join(repo_dir, ".config", "google-ads.yaml")

if not os.path.exists(yaml_path):
    print(f"\n❌ Error: google-ads.yaml not found at:\n   {yaml_path}")
    print("\nPlease place the google-ads.yaml file (provided by Aatir) in the .config/ folder first.")
    sys.exit(1)

# ─── Load config ─────────────────────────────────────────────────────────────

with open(yaml_path, "r") as f:
    config = yaml.safe_load(f)

if not config.get("client_id") or not config.get("client_secret"):
    print("\n❌ Error: google-ads.yaml is missing client_id or client_secret.")
    print("Make sure you're using the file provided by Aatir (not the template).")
    sys.exit(1)

if config.get("refresh_token") and not str(config.get("refresh_token", "")).startswith("YOUR_"):
    print("\n⚠️  A refresh token already exists in google-ads.yaml.")
    answer = input("Replace it with a new one? (y/N): ").strip().lower()
    if answer != "y":
        print("Keeping existing token. Done.")
        sys.exit(0)

# ─── OAuth flow ──────────────────────────────────────────────────────────────

SCOPES = ["https://www.googleapis.com/auth/adwords"]

client_config = {
    "installed": {
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": ["http://localhost"]
    }
}

print("\n🔐 Starting Google Ads OAuth authorization...")
print("   A browser window will open.")
print("   Sign in with the Google account that has access to the vFairs Google Ads account.\n")

flow = InstalledAppFlow.from_client_config(client_config, scopes=SCOPES)

credentials = flow.run_local_server(
    port=0,
    authorization_prompt_message="Please visit this URL to authorize: {url}",
    success_message="✅ Authorization successful! You can close this window.",
    open_browser=True
)

refresh_token = credentials.refresh_token

if not refresh_token:
    print("\n❌ Error: No refresh token received.")
    print("   This usually happens if you've already authorized this app before.")
    print("   Fix: go to https://myaccount.google.com/permissions, revoke access for this app, then re-run.")
    sys.exit(1)

# ─── Save token ──────────────────────────────────────────────────────────────

config["refresh_token"] = refresh_token

with open(yaml_path, "w") as f:
    yaml.dump(config, f, default_flow_style=False, sort_keys=False)

print(f"\n✅ Refresh token saved to .config/google-ads.yaml")
print(f"   Token preview: {refresh_token[:25]}...")
print("\n🎉 Done! Restart Claude Code and run /google-ads-audit")

if __name__ == "__main__":
    pass  # All code runs at module level above
