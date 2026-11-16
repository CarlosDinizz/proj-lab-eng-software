package com.supets.ocorrencias;

import org.springframework.jdbc.datasource.DriverManagerDataSource;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.UUID;

/** No writes, schema creation, Flyway or cleanup until the isolated DB contract and sentinel pass. */
public final class IsolatedPostgres {
    private final String url;
    private final String user;
    private final String password;

    public IsolatedPostgres() {
        url = required("SUPETS_TEST_DB_URL");
        user = required("SUPETS_TEST_DB_USER");
        password = required("SUPETS_TEST_DB_PASSWORD");
        if (!"ocorrencias_test".equals(required("SUPETS_TEST_DATABASE")) || !"ocorrencias_test".equals(user)
                || !"jdbc:postgresql://ocorrencias-test-db:5432/ocorrencias_test".equals(url)) {
            throw new IllegalStateException("Refusing non-isolated occurrence test database.");
        }
        try (var c = DriverManager.getConnection(url, user, password); var s = c.createStatement()) {
            c.setReadOnly(true);
            try (var r = s.executeQuery("select current_database(), current_user, (select count(*) from supets_test_control.sentinel where label='isolated-test-only')")) {
                if (!r.next() || !"ocorrencias_test".equals(r.getString(1)) || !user.equals(r.getString(2)) || r.getInt(3) != 1) {
                    throw new IllegalStateException("Missing isolated occurrence test sentinel.");
                }
            }
        } catch (Exception e) {
            throw new IllegalStateException("Cannot verify isolated occurrence test sentinel.", e);
        }
    }

    private static String required(String key) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) throw new IllegalStateException("Required isolated test setting: " + key);
        return value;
    }

    public String createSchema() {
        String schema = "occ_test_" + UUID.randomUUID().toString().replace("-", "");
        execute("create schema " + schema);
        return schema;
    }

    public void dropSchema(String schema) {
        if (!schema.matches("occ_test_[0-9a-f]{32}")) throw new IllegalArgumentException("Not an owned test schema.");
        execute("drop schema " + schema + " cascade");
    }

    private void execute(String sql) {
        try (var c = DriverManager.getConnection(url, user, password); var s = c.createStatement()) { s.execute(sql); }
        catch (Exception e) { throw new IllegalStateException("Isolated test schema operation failed.", e); }
    }

    public String url(String schema) { return url + "?currentSchema=" + schema; }
    public String user() { return user; }
    public String password() { return password; }
    public DataSource dataSource(String schema) { return new DriverManagerDataSource(url(schema), user, password); }
}
