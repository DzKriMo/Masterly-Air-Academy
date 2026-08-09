#!/usr/bin/env bash
#
# postfixadmin-sync.sh
#
# Materialise the Postfixadmin database into Docker Mailserver's native FILE
# provisioner config (postfix-accounts.cf / postfix-virtual.cf /
# dovecot-quotas.cf).  DMS's built-in change detection picks up the rewritten
# files and regenerates + reloads Postfix/Dovecot automatically.
#
# Run this periodically (e.g. every minute via cron) and after any change made
# in the Postfixadmin web UI.
#
# Why not direct SQL maps?  The DMS v15 image compiles Postfix without mysql/
# pgsql support and ships no Dovecot SQL driver, so the FILE provisioner is the
# supported integration point.  Postfixadmin remains the management UI.
set -euo pipefail

cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"
ENV_FILE="${REPO_ROOT}/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "postfixadmin-sync: ${ENV_FILE} not found, nothing to do" >&2
  exit 0
fi
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

: "${MAILDB_PASSWORD:?MAILDB_PASSWORD is required}"
MAIL_CONFIG_DIR="${REPO_ROOT}/docker-data/mail/config"
MAILDB_CONTAINER="$(docker compose -f "${REPO_ROOT}/docker-compose.yml" ps -q maildb 2>/dev/null | head -n1 || true)"
if [[ -z "${MAILDB_CONTAINER:-}" ]]; then
  echo "postfixadmin-sync: maildb container not running, skipping" >&2
  exit 0
fi

psql_query() {
  docker exec -e PGPASSWORD="${MAILDB_PASSWORD}" "${MAILDB_CONTAINER}" \
    psql -h localhost -U postfixadmin -d postfixadmin -tA -v ON_ERROR_STOP=1 \
    -c "$1" 2>/dev/null
}

tmpdir="$(mktemp -d)"
trap 'rm -rf "${tmpdir}"' EXIT

# --- postfix-accounts.cf: user|{SHA512-CRYPT}... for active mailboxes ---------
psql_query "SELECT username || '|' || password FROM mailbox WHERE active AND EXISTS (SELECT 1 FROM domain d WHERE d.domain = mailbox.domain AND d.active) ORDER BY username;" \
  | while IFS='|' read -r user pw; do
      [[ -z "${user}" ]] && continue
      if [[ "${pw}" == '{'* ]]; then
        printf '%s|%s\n' "${user}" "${pw}"
      else
        printf '%s|{SHA512-CRYPT}%s\n' "${user}" "${pw}"
      fi
    done > "${tmpdir}/postfix-accounts.cf"

# --- postfix-virtual.cf: address<TAB>target, one line per alias target --------
: > "${tmpdir}/postfix-virtual.cf"
psql_query "SELECT address || E'\t' || goto FROM alias WHERE active AND EXISTS (SELECT 1 FROM domain d WHERE d.domain = alias.domain AND d.active) ORDER BY address;" \
  | while IFS=$'\t' read -r address goto; do
      [[ -z "${address}" ]] && continue
      IFS=',' read -r -a targets <<< "${goto}"
      for target in "${targets[@]}"; do
        target="$(echo "${target}" | sed 's/[[:space:]]//g')"
        [[ -z "${target}" ]] && continue
        printf '%s\t%s\n' "${address}" "${target}"
      done
    done >> "${tmpdir}/postfix-virtual.cf"

# --- dovecot-quotas.cf: user:bytes for mailboxes with an explicit quota -------
psql_query "SELECT username || ':' || quota FROM mailbox WHERE quota > 0 AND active AND EXISTS (SELECT 1 FROM domain d WHERE d.domain = mailbox.domain AND d.active) ORDER BY username;" > "${tmpdir}/dovecot-quotas.cf"

# --- only rewrite files that actually changed (avoid spurious reloads) ---------
changed=0
for f in postfix-accounts.cf postfix-virtual.cf dovecot-quotas.cf; do
  if ! cmp -s "${tmpdir}/${f}" "${MAIL_CONFIG_DIR}/${f}"; then
    cp "${tmpdir}/${f}" "${MAIL_CONFIG_DIR}/${f}"
    chown root:root "${MAIL_CONFIG_DIR}/${f}"
    chmod 640 "${MAIL_CONFIG_DIR}/${f}"
    changed=1
    echo "postfixadmin-sync: updated ${f}"
  fi
done

if [[ "${changed}" -eq 1 ]]; then
  echo "postfixadmin-sync: wrote config changes (DMS will reload automatically)"
else
  echo "postfixadmin-sync: no changes"
fi
