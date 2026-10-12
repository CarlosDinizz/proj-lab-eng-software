package com.supets.community.shared.events;

import com.supets.community.shared.dto.ContatoDto;

import java.util.List;
import java.util.UUID;

public record SalvarContatosEvent(
    List<ContatoDto> contatos,
    UUID ongUuid,
    UUID cidadaoUuid
) {
}
