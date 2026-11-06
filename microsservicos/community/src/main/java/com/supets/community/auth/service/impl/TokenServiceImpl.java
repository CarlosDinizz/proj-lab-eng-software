package com.supets.community.auth.service.impl;

import com.supets.community.auth.service.TokenService;
import com.supets.community.shared.dto.CredencialDto;
import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class TokenServiceImpl implements TokenService {
    private final JwtEncoder encoder;
    private final Duration expiracao;

    public TokenServiceImpl(JwtEncoder encoder, @Value("${supets.jwt.expiracao}") Duration expiracao) {
        this.encoder = encoder;
        this.expiracao = expiracao;
    }

    @Override
    public String gerarToken(CredencialDto credencial) {
        Instant agora = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer("supets-community")
            .subject(credencial.id().toString())
            .claim("nome", credencial.nome())
            .claim("perfil", credencial.perfil().name())
            .issuedAt(agora)
            .expiresAt(agora.plus(expiracao))
            .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
