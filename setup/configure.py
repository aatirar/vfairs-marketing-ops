#!/usr/bin/env python3
"""
configure.py — Run this once to generate your .mcp.json

This script auto-detects your OS and paths, then writes .mcp.json
at the repo root so Claude Code can find your MCP servers.

Usage:
    python setup/configure.py
"""

import os
import json
import sys
import glob

home = os.path.expanduser("~")
repo_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
config_dir = os.path.join(repo_dir, ".config")
is_windows = sys.platform == "win32"

print(f"\n🔧 Configuring vFairs Marketing Ops for {'Windows' if is_windows else 'Mac'}...")
print(f"   Repo path: {repo_dir}\n")


# ─── Helper: find pipx venv python executable ───────────────────────────────

def find_pipx_python(venv_name):
    """Find the Python executable inside a pipx venv."""
    candidates = []
    if is_windows:
        # Windows pipx may be at ~/pipx/ or ~/.local/pipx/
        candidates = [
            os.path.join(home, "pipx", "venvs", venv_name, "Scripts", "python.exe"),
            os.path.join(home, ".local", "pipx", "venvs", venv_name, "Scripts", "python.exe"),
            os.path.join(os.environ.get("PIPX_HOME", ""), "venvs", venv_name, "Scripts", "python.exe"),
        ]
    else:
        candidates = [
            os.path.join(home, ".local", "share", "pipx", "venvs", venv_name, "bin", "python"),
            os.path.join(home, ".local", "pipx", "venvs", venv_name, "bin", "python"),
            os.path.join(os.environ.get("PIPX_HOME", ""), "venvs", venv_name, "bin", "python"),
        ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return candidates[0]  # Return first candidate even if not found yet


def find_pipx_exe(venv_name, exe_name):
    """Find a pipx-installed executable."""
    candidates = []
    if is_windows:
        candidates = [
            os.path.join(home, "pipx", "venvs", venv_name, "Scripts", f"{exe_name}.exe"),
            os.path.join(home, ".local", "pipx", "venvs", venv_name, "Scripts", f"{exe_name}.exe"),
        ]
    else:
        candidates = [
            os.path.join(home, ".local", "bin", exe_name),
            os.path.join(home, ".local", "share", "pipx", "venvs", venv_name, "bin", exe_name),
        ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return candidates[0]


def find_ads_mcp_server():
    """Find the ads_mcp server.py inside the pipx venv."""
    if is_windows:
        candidates = [
            os.path.join(home, "pipx", "venvs", "google-ads-mcp", "Lib", "site-packages", "ads_mcp", "server.py"),
            os.path.join(home, ".local", "pipx", "venvs", "google-ads-mcp", "Lib", "site-packages", "ads_mcp", "server.py"),
        ]
    else:
        patterns = [
            os.path.join(home, ".local", "share", "pipx", "venvs", "google-ads-mcp", "lib", "python3.*", "site-packages", "ads_mcp", "server.py"),
            os.path.join(home, ".local", "pipx", "venvs", "google-ads-mcp", "lib", "python3.*", "site-packages", "ads_mcp", "server.py"),
        ]
        for pattern in patterns:
            matches = glob.glob(pattern)
            if matches:
                return matches[0]
        return os.path.join(home, ".local", "share", "pipx", "venvs", "google-ads-mcp", "lib", "python3.x", "site-packages", "ads_mcp", "server.py")

    for p in candidates:
        if os.path.exists(p):
            return p
    return candidates[0]


def find_gsc_python():
    """Find the Python executable in the local GSC venv."""
    if is_windows:
        return os.path.join(repo_dir, "mcp-servers", "google-search-console", ".venv", "Scripts", "python.exe")
    else:
        return os.path.join(repo_dir, "mcp-servers", "google-search-console", ".venv", "bin", "python")


def find_client_secret():
    """Find the GSC OAuth client secret file in .config/"""
    pattern = os.path.join(config_dir, "client_secret_*.json")
    matches = glob.glob(pattern)
    if matches:
        return matches[0]
    return os.path.join(config_dir, "client_secret_RENAME_ME.json")


# ─── Build config ────────────────────────────────────────────────────────────

ga_exe = find_pipx_exe("analytics-mcp", "google-analytics-mcp")
ads_python = find_pipx_python("google-ads-mcp")
ads_server = find_ads_mcp_server()
gsc_python = find_gsc_python()
client_secret = find_client_secret()
google_creds = os.path.join(config_dir, "google-credentials.json")
ads_yaml = os.path.join(config_dir, "google-ads.yaml")

config = {
    "mcpServers": {
        "google-analytics": {
            "command": ga_exe,
            "env": {
                "GOOGLE_APPLICATION_CREDENTIALS": google_creds,
                "GOOGLE_PROJECT_ID": "gdrive-mcp-456412"
            }
        },
        "google-ads": {
            "command": ads_python,
            "args": [ads_server],
            "env": {
                "GOOGLE_ADS_CONFIGURATION_FILE_PATH": ads_yaml
            }
        },
        "google-search-console": {
            "command": gsc_python,
            "args": [
                os.path.join(repo_dir, "mcp-servers", "google-search-console", "gsc_server.py")
            ],
            "env": {
                "GSC_OAUTH_CLIENT_SECRETS_FILE": client_secret
            }
        }
    }
}

# ─── Write .mcp.json ─────────────────────────────────────────────────────────

output_path = os.path.join(repo_dir, ".mcp.json")
with open(output_path, "w") as f:
    json.dump(config, f, indent=2)

print("✅ .mcp.json created at repo root!")
print("\nPaths configured:")
print(f"  GA4 executable:       {ga_exe}")
print(f"  Google Ads Python:    {ads_python}")
print(f"  Google Ads server:    {ads_server}")
print(f"  GSC Python (venv):    {gsc_python}")
print(f"  Client secret file:   {client_secret}")

# ─── Warnings ────────────────────────────────────────────────────────────────

print("\n⚠️  Checking for missing files...")
missing = []
check_files = [
    (ga_exe, "Google Analytics MCP executable (run: pipx install google-analytics-mcp)"),
    (ads_python, "Google Ads MCP Python (run: pipx install google-ads-mcp)"),
    (ads_server, "Google Ads MCP server.py (install via pipx first)"),
    (gsc_python, "GSC venv Python (run: python -m venv .venv in mcp-servers/google-search-console/)"),
    (google_creds, "google-credentials.json (get from Aatir)"),
    (ads_yaml, "google-ads.yaml (get from Aatir, then run setup/generate-google-ads-token.py)"),
    (client_secret, "client_secret_*.json (get from Aatir)"),
]
for path, description in check_files:
    if not os.path.exists(path):
        missing.append(f"  ❌ MISSING: {description}")
        missing.append(f"             Path: {path}")

if missing:
    print("\n".join(missing))
    print("\n👆 Complete the setup steps in SETUP.md, then re-run this script.")
else:
    print("  All files found! You're ready to go.")
    print("\n🎉 Setup complete! Restart Claude Code and your MCP servers will load.")
