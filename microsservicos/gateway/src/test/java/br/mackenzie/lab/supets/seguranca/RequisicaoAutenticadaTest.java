package br.mackenzie.lab.supets.seguranca;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.Collections;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class RequisicaoAutenticadaTest {
    @Test
    void removeTodoPrefixoReservadoSemDiferenciarMaiusculas() {
        var original = new MockHttpServletRequest();
        original.addHeader("x-usuario-id", "forjado");
        original.addHeader("X-USUARIO-PERFIL", "ONG");
        original.addHeader("x-UsUaRiO-qualquer", "privilegio-forjado");
        original.addHeader("Accept", "application/json");
        String id = java.util.UUID.randomUUID().toString();
        var request = new RequisicaoAutenticada(original, Map.of("X-Usuario-Id", id, "X-Usuario-Perfil", "CIDADAO"));
        assertThat(request.getHeader("x-usuario-id")).isEqualTo(id);
        assertThat(request.getHeader("X-USUARIO-PERFIL")).isEqualTo("CIDADAO");
        assertThat(request.getHeader("x-usuario-qualquer")).isNull();
        assertThat(Collections.list(request.getHeaders("x-usuario-qualquer"))).isEmpty();
        assertThat(Collections.list(request.getHeaderNames())).doesNotContain("x-UsUaRiO-qualquer");
        assertThat(request.getHeader("Accept")).isEqualTo("application/json");
    }
}
