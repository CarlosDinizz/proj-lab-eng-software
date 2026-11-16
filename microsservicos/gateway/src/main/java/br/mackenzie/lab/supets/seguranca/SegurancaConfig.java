package br.mackenzie.lab.supets.seguranca;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

@Configuration
public class SegurancaConfig {
    /** Emissor que o community grava nos tokens. */
    private static final String EMISSOR = "supets-community";

    /** Confere assinatura (HS256), validade e emissor dos tokens. */
    @Bean
    public JwtDecoder jwtDecoder(@Value("${supets.jwt.segredo}") String segredo) {
        if (segredo == null || segredo.isBlank()
                || segredo.equals("supets-dev-segredo-local-troque-em-producao")
                || segredo.equals("troque-por-um-segredo-com-no-minimo-32-caracteres")
                || segredo.getBytes(StandardCharsets.UTF_8).length < 32)
            throw new IllegalStateException("Configure uma chave JWT exclusiva de pelo menos 32 bytes para HS256");
        byte[] bytes = segredo.getBytes(StandardCharsets.UTF_8);
        SecretKey chave = new SecretKeySpec(bytes, "HmacSHA256");
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(chave).macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(EMISSOR));
        return decoder;
    }

    @Bean
    public AutenticacaoFilter autenticacaoFilter(JwtDecoder decoder, LimiteAutenticacao limite) {
        return new AutenticacaoFilter(decoder, limite);
    }

    @Bean
    public Clock clock() { return Clock.systemUTC(); }
}
