package com.supets.community.campanha;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;
import com.supets.community.campanha.dto.CampanhaDto;
import com.supets.community.campanha.model.TipoCampanha;
import com.supets.community.campanha.model.Campanha;
import com.supets.community.campanha.repository.*;
import com.supets.community.campanha.service.impl.CampanhaServiceImpl;
import com.supets.community.shared.dto.UsuarioAutenticado;
import com.supets.community.shared.enums.PerfilEnum;
import com.supets.community.shared.exceptions.ApiException;
import com.supets.community.shared.validation.Enderecos;
import java.time.*;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RelogioCampanhaTest {
    @Test
    void regrasUsamRelogioInjetadoNaViradaDeBrasilia() {
        var repository = mock(CampanhaRepository.class);
        var tipos = mock(TipoCampanhaRepository.class);
        when(tipos.findById(1)).thenReturn(Optional.of(new TipoCampanha()));
        when(repository.saveAndFlush(any(Campanha.class))).thenAnswer(invocation -> invocation.getArgument(0));
        var usuario = new UsuarioAutenticado(UUID.randomUUID(), PerfilEnum.ONG);
        var dados = new CampanhaDto("Teste", "Descrição", LocalDate.of(2026, 11, 16), LocalDate.of(2026, 11, 17), 1, "01234567", "Rua A", "São Paulo", "SP");
        var participacoes = mock(ParticipacaoCampanhaRepository.class);
        var antes = new CampanhaServiceImpl(repository, tipos, participacoes,
            Clock.fixed(Instant.parse("2026-11-17T01:00:00Z"), ZoneId.of("America/Sao_Paulo")), new Enderecos());
        assertThat(antes.criar(usuario, dados).dataInicio()).isEqualTo(LocalDate.of(2026, 11, 16));
        var depois = new CampanhaServiceImpl(repository, tipos, participacoes,
            Clock.fixed(Instant.parse("2026-11-17T03:00:00Z"), ZoneId.of("America/Sao_Paulo")), new Enderecos());
        assertThatThrownBy(() -> depois.criar(usuario, dados)).isInstanceOf(ApiException.class).hasMessage("A campanha não pode começar no passado.");
    }
}
