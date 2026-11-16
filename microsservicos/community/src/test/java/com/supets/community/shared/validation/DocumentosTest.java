package com.supets.community.shared.validation;

import static org.assertj.core.api.Assertions.assertThat;
import com.supets.community.cidadao.dto.CidadaoDto;
import com.supets.community.ong.dto.OngDto;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;

class DocumentosTest {
    @Test
    void cpfComESemMascaraExigeChecksumERejeitaRepetidos() {
        assertThat(Documentos.cpfValido("529.982.247-25")).isTrue();
        assertThat(Documentos.cpfValido("52998224725")).isTrue();
        for (String invalido : new String[] {"529.982.247-24", "529.982.247-17", "111.111.111-11", "529.982.247", "", "ABCDEFGHIJK", "52998224725!"})
            assertThat(Documentos.cpfValido(invalido)).as(invalido).isFalse();
        assertThat(Documentos.cpfValido(null)).isFalse();
    }

    @Test
    void cnpjNumericoEAlfanumericoSeguemReceitaFederal() {
        assertThat(Documentos.cnpjValido("11.222.333/0001-81")).isTrue();
        assertThat(Documentos.cnpjValido("12.ABC.345/01DE-35")).isTrue();
        assertThat(Documentos.cnpjValido(" 12.abc.345/01de-35 ")).isTrue();
        assertThat(Documentos.normalizar("12.abc.345/01de-35")).isEqualTo("12ABC34501DE35");
        for (String invalido : new String[] {"00000000000000", "11111111111111", "12ABC34501DE34", "12ABC34501DEAA", "12ABC34501DÉ35", "12ABC34501DE35!", ""})
            assertThat(Documentos.cnpjValido(invalido)).as(invalido).isFalse();
        assertThat(Documentos.cnpjValido(null)).isFalse();
    }

    @Test
    void constraintsMantemCamposEMensagensEContamBytesDaSenha() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            var pessoa = new CidadaoDto("Teste", "11111111111", "01234567", "Rua A", "São Paulo", "SP", "a@example.com", "senha123");
            assertThat(validator.validate(pessoa)).anySatisfy(v -> {
                assertThat(v.getPropertyPath().toString()).isEqualTo("cpf");
                assertThat(v.getMessage()).isEqualTo("Informe um CPF válido.");
            });
            var ong = new OngDto("Teste", "12ABC34501DE34", "01234567", "Rua A", "São Paulo", "SP", "a@example.com", "senha123");
            assertThat(validator.validate(ong)).anySatisfy(v -> {
                assertThat(v.getPropertyPath().toString()).isEqualTo("cnpj");
                assertThat(v.getMessage()).isEqualTo("Informe um CNPJ válido.");
            });
            for (String senha : new String[] {"abcdefg1", "a".repeat(71) + "1", "á".repeat(35) + "a1"})
                assertThat(validator.validate(new CidadaoDto("Teste", "52998224725", "01234567", "Rua A", "São Paulo", "SP", "a@example.com", senha))).isEmpty();
            for (String senha : new String[] {"abcdef1", "a".repeat(72) + "1", "á".repeat(36) + "1"})
                assertThat(validator.validate(new CidadaoDto("Teste", "52998224725", "01234567", "Rua A", "São Paulo", "SP", "a@example.com", senha)))
                    .anyMatch(v -> v.getPropertyPath().toString().equals("senha"));
        }
    }

    @Test
    void geradoresSinteticosProduzemDocumentosValidos() {
        for (int i = 0; i < 50; i++) {
            assertThat(Documentos.cpfValido(com.supets.community.DocumentosDeTeste.cpf())).isTrue();
            assertThat(Documentos.cnpjValido(com.supets.community.DocumentosDeTeste.cnpj())).isTrue();
        }
    }
}
