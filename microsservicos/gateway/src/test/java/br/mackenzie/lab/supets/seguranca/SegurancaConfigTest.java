package br.mackenzie.lab.supets.seguranca;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.Test;

class SegurancaConfigTest {
    @Test
    void rejeitaSegredosAusentesCurtosOuPublicados() {
        var config = new SegurancaConfig();
        for (String segredo : new String[] {null, "", " ".repeat(64), "curta", "supets-dev-segredo-local-troque-em-producao", "troque-por-um-segredo-com-no-minimo-32-caracteres"})
            assertThatThrownBy(() -> config.jwtDecoder(segredo)).isInstanceOf(IllegalStateException.class);
        assertThat(config.jwtDecoder("isolated-independent-test-key-at-least-32-bytes")).isNotNull();
    }

    @Test
    void chaveAnteriorPublicaNaoValidaNoNovoAmbiente() {
        String id = java.util.UUID.randomUUID().toString();
        var decoder = new SegurancaConfig().jwtDecoder("isolated-new-generated-environment-signing-key-2026");
        String token = TokensDeTeste.valido("supets-dev-segredo-local-troque-em-producao", id, "CIDADAO");
        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(org.springframework.security.oauth2.jwt.JwtException.class);
    }
}
