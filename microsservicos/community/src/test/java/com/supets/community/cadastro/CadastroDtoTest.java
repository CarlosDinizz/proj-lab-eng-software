package com.supets.community.cadastro;

import static org.assertj.core.api.Assertions.assertThat;

import com.supets.community.cidadao.dto.CidadaoDto;
import com.supets.community.ong.dto.OngDto;
import org.junit.jupiter.api.Test;

class CadastroDtoTest {
    @Test
    void toStringProtegeSenhas() {
        var cidadao = new CidadaoDto("Pessoa", "12345678901", "12345678", "Rua A", "Cidade", "SP", "pessoa@example.com", "senha123");
        var ong = new OngDto("ONG", "12345678901234", "12345678", "Rua B", "Cidade", "SP", "ong@example.com", "senha123");

        assertThat(cidadao.toString()).doesNotContain("senha123").contains("nome=Pessoa", "cpf=12345678901", "cep=12345678", "endereco=Rua A", "municipio=Cidade", "estado=SP", "email=pessoa@example.com", "senha=***");
        assertThat(ong.toString()).doesNotContain("senha123").contains("nome=ONG", "cnpj=12345678901234", "cep=12345678", "endereco=Rua B", "municipio=Cidade", "estado=SP", "email=ong@example.com", "senha=***");
    }
}
