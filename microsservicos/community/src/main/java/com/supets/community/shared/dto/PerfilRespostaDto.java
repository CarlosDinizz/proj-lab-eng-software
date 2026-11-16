package com.supets.community.shared.dto;

import com.supets.community.shared.enums.PerfilEnum;
import java.util.UUID;

public record PerfilRespostaDto(UUID id, String nome, PerfilEnum perfil) {}
