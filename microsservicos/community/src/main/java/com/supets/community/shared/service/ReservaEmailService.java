package com.supets.community.shared.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservaEmailService {
    private final JdbcTemplate jdbc;

    public ReservaEmailService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional(propagation = Propagation.MANDATORY)
    public void bloquear(String emailNormalizado) {
        jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", rs -> {
            while (rs.next()) { /* PostgreSQL returns void; consuming the row acquires the lock. */ }
            return null;
        }, emailNormalizado);
    }
}
