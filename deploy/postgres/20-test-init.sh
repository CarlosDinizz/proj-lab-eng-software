#!/bin/sh
set -eu

case "${TEST_DATABASE:-false}" in
    false) exit 0 ;;
    true) ;;
    *) echo >&2 'Invalid test database flag.'; exit 1 ;;
esac
case "${APP_USER:?}:${APP_DB:?}" in
    community_test:community_test|ocorrencias_test:ocorrencias_test) ;;
    *) echo >&2 'Test sentinel requires an isolated test database.'; exit 1 ;;
esac

psql --no-psqlrc --username "${POSTGRES_USER:?}" --dbname "$APP_DB" \
    --set=ON_ERROR_STOP=1 --set=app_user="$APP_USER" <<'SQL'
SET ROLE :"app_user";
-- Keep application public schema empty for its first real Flyway migration.
CREATE SCHEMA supets_test_control;
CREATE TABLE supets_test_control.sentinel (
    label text NOT NULL PRIMARY KEY CHECK (label = 'isolated-test-only')
);
INSERT INTO supets_test_control.sentinel (label) VALUES ('isolated-test-only');
SQL
