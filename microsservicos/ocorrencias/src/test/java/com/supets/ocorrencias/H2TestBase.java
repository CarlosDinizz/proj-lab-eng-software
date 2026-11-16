package com.supets.ocorrencias;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** These tests must never inherit a PostgreSQL datasource or destructive settings from the host. */
public abstract class H2TestBase {
    @DynamicPropertySource
    static void isolatedH2(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", () -> "jdbc:h2:mem:ocorrencias;MODE=PostgreSQL;DB_CLOSE_DELAY=-1");
        properties.add("spring.datasource.username", () -> "sa");
        properties.add("spring.datasource.password", () -> "");
        properties.add("spring.datasource.driver-class-name", () -> "org.h2.Driver");
        properties.add("spring.flyway.enabled", () -> "false");
        properties.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        properties.add("spring.jpa.defer-datasource-initialization", () -> "true");
        properties.add("spring.sql.init.mode", () -> "always");
    }
}
