#!/usr/bin/env bash
set -euo pipefail

repo="${GITHUB_ACTIVITY_REPO:-ilwren/ilwren.github.io}"
output="static/data/github-commit-activity.json"
mkdir -p "$(dirname "$output")"

api_url="https://api.github.com/repos/${repo}/stats/commit_activity"
tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

curl_args=(
  --silent --show-error --location
  --header "Accept: application/vnd.github+json"
  --header "X-GitHub-Api-Version: 2022-11-28"
  --header "User-Agent: ilwren-hugo-build"
)
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  curl_args+=(--header "Authorization: Bearer ${GITHUB_TOKEN}")
fi

for attempt in 1 2 3 4 5; do
  status="$(curl "${curl_args[@]}" \
    --output "$tmp_file" --write-out "%{http_code}" "$api_url")"

  if [[ "$status" == "200" ]] && jq -e 'type == "array"' "$tmp_file" >/dev/null; then
    jq '.[-52:]' "$tmp_file" > "$output"
    echo "Saved GitHub commit activity for ${repo} to ${output}."
    exit 0
  fi

  if [[ "$status" == "202" ]] && (( attempt < 5 )); then
    echo "GitHub is calculating commit statistics; retrying in 10 seconds (attempt ${attempt}/5)."
    sleep 10
  else
    echo "GitHub commit activity was unavailable (HTTP ${status}); using an empty snapshot."
    printf '[]\n' > "$output"
    exit 0
  fi
done
