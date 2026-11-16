package com.supets.community.auth.config;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

@Configuration
public class JwtConfig {

    @Bean
    public JwtEncoder jwtEncoder(@Value("${supets.jwt.segredo}") String segredo) {
        if (segredo == null || segredo.isBlank()
                || segredo.equals("supets-dev-segredo-local-troque-em-producao")
                || segredo.equals("troque-por-um-segredo-com-no-minimo-32-caracteres")
                || segredo.getBytes(StandardCharsets.UTF_8).length < 32)
            throw new IllegalStateException("Configure uma chave JWT exclusiva de pelo menos 32 bytes para HS256");
        byte[] bytes = segredo.getBytes(StandardCharsets.UTF_8);
        SecretKey chave = new SecretKeySpec(bytes, "HmacSHA256");
        return new NimbusJwtEncoder(new ImmutableSecret<>(chave));
    }
}
