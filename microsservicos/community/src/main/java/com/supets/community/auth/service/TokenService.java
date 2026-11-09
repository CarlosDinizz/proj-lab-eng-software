package com.supets.community.auth.service;

import com.supets.community.shared.dto.CredencialDto;

public interface TokenService {
    String gerarToken(CredencialDto credencial);
}
