package br.mackenzie.lab.supets.seguranca;

import static org.assertj.core.api.Assertions.assertThat;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

class LimiteAutenticacaoTest {
    private static final String LOGIN = "/community/auth/api/v1/login";
    private static final String CIDADAO = "/community/cidadao/api/v1";
    private static final String ONG = "/community/ong/api/v1";

    @Test
    void fronteirasSeparadasERetomadaDaJanelaSemNovoLoginAutomatico() {
        var clock = new Relogio();
        var limite = new LimiteAutenticacao(clock, 120, 60);
        for (int i = 0; i < 120; i++) assertThat(limite.verificar("192.0.2.1", "POST", LOGIN)).isZero();
        assertThat(limite.verificar("192.0.2.1", "POST", LOGIN)).isEqualTo(60);
        for (int i = 0; i < 60; i++) assertThat(limite.verificar("192.0.2.1", "POST", i % 2 == 0 ? CIDADAO : ONG)).isZero();
        assertThat(limite.verificar("192.0.2.1", "POST", ONG)).isEqualTo(60);
        assertThat(limite.verificar("192.0.2.2", "POST", LOGIN)).isZero();
        assertThat(limite.verificar("192.0.2.1", "GET", LOGIN)).isZero();
        clock.agora = 59_001;
        assertThat(limite.verificar("192.0.2.1", "POST", LOGIN)).isEqualTo(1);
        clock.agora = 60_000;
        assertThat(limite.verificar("192.0.2.1", "POST", LOGIN)).isZero();
    }

    @Test
    void mapaLimitadoRejeitaClientesNovosSemExpulsarJanelasAtivas() {
        var clock = new Relogio();
        var limite = new LimiteAutenticacao(clock, 1, 1);
        for (int i = 0; i < 4096; i++) assertThat(limite.verificar("cliente-" + i, "POST", LOGIN)).isZero();
        assertThat(limite.verificar("novo-cliente", "POST", LOGIN)).isEqualTo(60);
        assertThat(limite.verificar("cliente-0", "POST", LOGIN)).isEqualTo(60);
        clock.agora = 60_000;
        assertThat(limite.verificar("novo-cliente", "POST", LOGIN)).isZero();
    }

    private static class Relogio extends Clock {
        long agora;
        public ZoneId getZone() { return ZoneId.of("UTC"); }
        public Clock withZone(ZoneId zone) { return this; }
        public Instant instant() { return Instant.ofEpochMilli(agora); }
        public long millis() { return agora; }
    }
}
