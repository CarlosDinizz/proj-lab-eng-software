package com.supets.community.auth.dto;

import com.supets.community.shared.enums.PerfilEnum;
import java.util.UUID;

public record LoginRespostaDto(String token, UUID id, String nome, PerfilEnum perfil) {}
