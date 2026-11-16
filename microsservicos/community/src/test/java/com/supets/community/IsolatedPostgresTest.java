package com.supets.community;

import java.sql.DriverManager;
import java.util.Properties;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** Fails before Spring, Flyway, or fixture cleanup can touch any non-test database. */
public abstract class IsolatedPostgresTest {
    @DynamicPropertySource
    static void isolatedDatabase(DynamicPropertyRegistry registry) {
        String url = required("SUPETS_TEST_DB_URL");
        String user = required("SUPETS_TEST_DB_USER");
        String password = required("SUPETS_TEST_DB_PASSWORD");
        if (!url.equals("jdbc:postgresql://community-test-db:5432/community_test")
                || !user.equals("community_test") || !required("SUPETS_TEST_DATABASE").equals("community_test"))
            throw new IllegalStateException("Refusing a datasource outside the isolated community test contract.");
        Properties credentials = new Properties();
        credentials.setProperty("user", user);
        credentials.setProperty("password", password);
        credentials.setProperty("connectTimeout", "2");
        credentials.setProperty("socketTimeout", "2");
        try (var connection = DriverManager.getConnection(url, credentials)) {
            connection.setReadOnly(true);
            try (var statement = connection.createStatement()) {
                statement.setQueryTimeout(2);
                try (var rs = statement.executeQuery("SELECT current_database(), current_user, (SELECT count(*) FROM supets_test_control.sentinel WHERE label = 'isolated-test-only')")) {
                    if (!rs.next() || !"community_test".equals(rs.getString(1))
                            || !"community_test".equals(rs.getString(2)) || rs.getInt(3) != 1)
                        throw new IllegalStateException("Missing isolated test sentinel.");
                }
            }
        } catch (Exception e) { throw new IllegalStateException("Refusing database writes: isolated test sentinel could not be verified.", e); }
        registry.add("spring.datasource.url", () -> url);
        registry.add("spring.datasource.hikari.jdbc-url", () -> url);
        registry.add("spring.datasource.username", () -> user);
        registry.add("spring.datasource.hikari.username", () -> user);
        registry.add("spring.datasource.password", () -> password);
        registry.add("spring.datasource.hikari.password", () -> password);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.flyway.url", () -> url);
        registry.add("spring.flyway.user", () -> user);
        registry.add("spring.flyway.password", () -> password);
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "none");
        registry.add("spring.sql.init.mode", () -> "never");
        registry.add("supets.jwt.segredo", () -> "isolated-test-only-signing-key-never-deploy-2026");
    }

    private static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) throw new IllegalStateException("Missing isolated test setting: " + name);
        return value;
    }
}
