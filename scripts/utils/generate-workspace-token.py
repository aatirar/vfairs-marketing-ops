"""
Generate Google Workspace OAuth token for workspace-mcp.

This is a personal (per-marketer) OAuth flow. Each marketer runs this once with
their own vFairs email to authorize Gmail + Calendar read/write for skills like
/morning-report. The resulting token is cached locally and never committed.

Usage:
    python scripts/utils/generate-workspace-token.py your-name@vfairs.com

The OAuth client (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET) comes from
the shared team vault — see docs/CREDENTIALS.md. Set those in .env before running.
"""

import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from google_auth_oauthlib.flow import InstalledAppFlow

# Load .env from repo root
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(REPO_ROOT / ".env")

CLIENT_ID = os.environ.get("GOOGLE_OAUTH_CLIENT_ID")
CLIENT_SECRET = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET")

if not CLIENT_ID or not CLIENT_SECRET:
    print("ERROR: GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set in .env")
    print("       Get them from the team vault entry 'vFairs Marketing OS .env values'.")
    sys.exit(1)

if len(sys.argv) < 2:
    print("Usage: python scripts/utils/generate-workspace-token.py your-name@vfairs.com")
    sys.exit(1)

USER_EMAIL = sys.argv[1]

if not USER_EMAIL.endswith("@vfairs.com"):
    print(f"WARNING: {USER_EMAIL} does not end in @vfairs.com. Continuing anyway.")

CLIENT_CONFIG = {
    "installed": {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": ["http://localhost"],
    }
}

SCOPES = [
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.readonly",
    "openid",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.settings.basic",
]

CREDENTIALS_DIR = Path.home() / ".google_workspace_mcp" / "credentials"
OUTPUT_FILE = CREDENTIALS_DIR / f"{USER_EMAIL}.json"


def main():
    print(f"Generating workspace-mcp credentials for {USER_EMAIL}")
    print(f"Output: {OUTPUT_FILE}")
    print()
    print(f"A browser window will open. Sign in with {USER_EMAIL} and approve all permissions.")
    print()

    CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)

    flow = InstalledAppFlow.from_client_config(CLIENT_CONFIG, scopes=SCOPES)
    credentials = flow.run_local_server(port=0, open_browser=True)

    creds_data = {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": list(credentials.scopes) if credentials.scopes else SCOPES,
        "expiry": credentials.expiry.isoformat() if credentials.expiry else None,
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(creds_data, f, indent=2)

    print(f"\nSuccess! Credentials saved to: {OUTPUT_FILE}")
    print("Restart Claude Code and workspace-mcp will load them automatically.")


if __name__ == "__main__":
    main()
