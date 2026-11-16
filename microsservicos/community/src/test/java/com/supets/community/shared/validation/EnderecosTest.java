package com.supets.community.shared.validation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.supets.community.shared.exceptions.ApiException;
import org.junit.jupiter.api.Test;

class EnderecosTest {
    private final Enderecos enderecos = new Enderecos();

    @Test
    void snapshotEmpacotadoContemTodasAsUfsESemConsultaExterna() {
        for (String uf : "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "))
            assertThat(enderecos.normalizarUf(" " + uf.toLowerCase() + " ")).isEqualTo(uf);
        assertThat(enderecos.cidadeCanonica("sp", "  são pAuLo  ", "municipio")).isEqualTo("São Paulo");
        assertThat(enderecos.cidadeCanonica("PR", "curitiba", "cidade")).isEqualTo("Curitiba");
    }

    @Test
    void rejeitaUfDesconhecidaEParInvalidoComCampoPublico() {
        assertThatThrownBy(() -> enderecos.normalizarUf("ZZ")).isInstanceOfSatisfying(ApiException.class, e -> {
            assertThat(e.getCampo()).isEqualTo("estado");
            assertThat(e.getMessage()).isEqualTo("Informe uma UF válida.");
        });
        assertThatThrownBy(() -> enderecos.cidadeCanonica("SP", "Curitiba", "municipio")).isInstanceOfSatisfying(ApiException.class, e -> {
            assertThat(e.getCampo()).isEqualTo("municipio");
            assertThat(e.getMessage()).isEqualTo("Selecione um município válido para a UF.");
        });
    }
}
