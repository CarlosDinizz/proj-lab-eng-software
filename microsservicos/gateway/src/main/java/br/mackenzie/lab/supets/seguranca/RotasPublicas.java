package br.mackenzie.lab.supets.seguranca;

import java.util.List;
import org.springframework.util.AntPathMatcher;

/** Rotas que dispensam login. Qualquer outra requisição ao gateway exige um token válido. */
public final class RotasPublicas {

    private record Rota(String metodo, String caminho) {}

    private static final List<Rota> ROTAS = List.of(
        new Rota("GET", "/api/status"),
        new Rota("POST", "/community/auth/api/v1/login"),
        new Rota("POST", "/community/cidadao/api/v1"),
        new Rota("POST", "/community/ong/api/v1"),
        new Rota("GET", "/community/ong/api/v1/**"),
        new Rota("GET", "/community/v3/api-docs/**"),
        new Rota("GET", "/community/swagger-ui/**"),
        new Rota("GET", "/ocorrencia/api/v1/**"));

    private static final AntPathMatcher MATCHER = new AntPathMatcher();

    private RotasPublicas() {}

    public static boolean permite(String metodo, String caminho) {
        return ROTAS.stream()
            .anyMatch(rota -> rota.metodo().equalsIgnoreCase(metodo) && MATCHER.match(rota.caminho(), caminho));
    }
}
