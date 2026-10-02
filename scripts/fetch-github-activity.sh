#!/usr/bin/env bash
set -euo pipefail

account="${GITHUB_ACTIVITY_ACCOUNT:-ilwren}"
output="static/data/github-account-activity.json"
mkdir -p "$(dirname "$output")"

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

third_party_url="https://github-contributions-api.jogruber.de/v4/${account}?y=last"
curl_args=(
  --silent --show-error --location
  --connect-timeout 15
  --max-time 45
  --header "Accept: application/json"
  --header "User-Agent: ilwren-hugo-build"
)

# The contribution calendar is account-wide, unlike /repos/:owner/:repo/stats.
# The service scrapes the public GitHub contribution calendar and caches results.
for attempt in 1 2 3; do
  status="$(curl "${curl_args[@]}" \
    --output "$tmp_file" --write-out "%{http_code}" "$third_party_url" || true)"

  if [[ "$status" == "200" ]] && jq -e 'type == "object" and (.contributions | type == "array")' "$tmp_file" >/dev/null; then
    jq --arg account "$account" --arg source "$third_party_url" '
      {
        account: $account,
        source: $source,
        total: ((.total // {} | to_entries | map(.value) | add) // ([.contributions[]?.count] | add // 0)),
        contributions: [.contributions[] | {
          date: .date,
          count: (.count | tonumber),
          level: (.level | tonumber)
        }]
      }
    ' "$tmp_file" > "$output"
    echo "Saved account-wide GitHub activity for ${account} to ${output}."
    exit 0
  fi

  if (( attempt < 3 )); then
    echo "The contribution API was unavailable (HTTP ${status:-network error}); retrying in 5 seconds (attempt ${attempt}/3)."
    sleep 5
  fi
done

# Keep the deployment useful if the third-party service is temporarily down.
# GitHub's public profile calendar is the fallback source, still fetched only
# during the build and never from a visitor's browser.
profile_url="https://github.com/users/${account}/contributions"
profile_status="$(curl --silent --show-error --location \
  --connect-timeout 15 --max-time 45 \
  --header "User-Agent: ilwren-hugo-build" \
  --output "$tmp_file" --write-out "%{http_code}" "$profile_url" || true)"

if [[ "$profile_status" == "200" ]]; then
  if python3 - "$tmp_file" "$output" "$account" "$profile_url" <<'PY'
import json
import re
import sys

source_file, output_file, account, source_url = sys.argv[1:]
html = open(source_file, encoding="utf-8").read()
records = []

for tag_match in re.finditer(r"<[^>]*\bdata-date=\"([^\"]+)\"[^>]*>", html, re.S):
    tag = tag_match.group(0)
    count_match = re.search(r"\bdata-count=\"(\d+)\"", tag)
    level_match = re.search(r"\bdata-level=\"(\d+)\"", tag)
    if not count_match:
        continue
    records.append({
        "date": tag_match.group(1),
        "count": int(count_match.group(1)),
        "level": int(level_match.group(1)) if level_match else 0,
    })

if not records:
    raise SystemExit("GitHub profile calendar did not contain contribution cells")

payload = {
    "account": account,
    "source": source_url,
    "total": sum(item["count"] for item in records),
    "contributions": records,
}
with open(output_file, "w", encoding="utf-8") as stream:
    json.dump(payload, stream, ensure_ascii=False, indent=2)
    stream.write("\n")
PY
  then
    echo "Saved account-wide GitHub activity from the profile calendar for ${account}."
    exit 0
  fi
fi

echo "GitHub account activity was unavailable (API HTTP ${status:-network error}, profile HTTP ${profile_status:-network error}); using an empty snapshot."
printf '{"account":%s,"source":"unavailable","total":0,"contributions":[]}\n' "$(jq -Rn --arg account "$account" '$account')" > "$output"
