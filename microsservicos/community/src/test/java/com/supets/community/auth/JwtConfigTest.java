package com.supets.community.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.supets.community.auth.config.JwtConfig;
import org.junit.jupiter.api.Test;

class JwtConfigTest {
    @Test
    void rejeitaChavesAusentesCurtasEPublicadas() {
        var config = new JwtConfig();
        for (String segredo : new String[] {null, "", " ".repeat(64), "curta", "supets-dev-segredo-local-troque-em-producao", "troque-por-um-segredo-com-no-minimo-32-caracteres"})
            assertThatThrownBy(() -> config.jwtEncoder(segredo)).isInstanceOf(IllegalStateException.class);
        assertThat(config.jwtEncoder("isolated-test-only-independent-key-at-least-32-bytes")).isNotNull();
    }
}
