#!/bin/sh
set -eu

: "${POSTGRES_USER:?Missing database administrator}"
: "${POSTGRES_DB:?Missing administrator database}"
: "${APP_USER:?Missing application role}"
: "${APP_PASSWORD:?Missing application password}"
: "${APP_DB:?Missing application database}"

case "${TEST_DATABASE:-false}:$APP_USER:$APP_DB" in
    false:community_app:community|false:ocorrencias_app:ocorrencias) ;;
    true:community_test:community_test|true:ocorrencias_test:ocorrencias_test) ;;
    *) echo >&2 'Invalid application database initialization contract.'; exit 1 ;;
esac
[ "$POSTGRES_USER" != "$APP_USER" ] || { echo >&2 'Application role must not be administrator.'; exit 1; }
[ "$POSTGRES_DB" = "$APP_DB" ] || { echo >&2 'Application database must match initialized database.'; exit 1; }

psql --no-psqlrc --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    --set=ON_ERROR_STOP=1 --set=app_user="$APP_USER" \
    --set=app_password="$APP_PASSWORD" --set=app_db="$APP_DB" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L', :'app_user', :'app_password') \gexec
ALTER DATABASE :"app_db" OWNER TO :"app_user";
REVOKE ALL ON DATABASE :"app_db" FROM PUBLIC;
REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;
REVOKE CONNECT ON DATABASE template1 FROM PUBLIC;
REVOKE CONNECT ON DATABASE template0 FROM PUBLIC;
ALTER SCHEMA public OWNER TO :"app_user";
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO :"app_user";
SQL
