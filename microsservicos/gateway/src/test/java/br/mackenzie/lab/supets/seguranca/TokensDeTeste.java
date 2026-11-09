package br.mackenzie.lab.supets.seguranca;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

/** Gera tokens no mesmo formato que o community emite no login. */
public final class TokensDeTeste {

    private TokensDeTeste() {}

    public static String valido(String segredo, String id, String perfil) {
        return gerar(segredo, id, perfil, Instant.now().plusSeconds(3600));
    }

    public static String gerar(String segredo, String id, String perfil, Instant expiraEm) {
        SecretKey chave = new SecretKeySpec(segredo.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer("supets-community")
            .subject(id)
            .claim("perfil", perfil)
            .issuedAt(expiraEm.minusSeconds(7200))
            .expiresAt(expiraEm)
            .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return new NimbusJwtEncoder(new ImmutableSecret<>(chave))
            .encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
