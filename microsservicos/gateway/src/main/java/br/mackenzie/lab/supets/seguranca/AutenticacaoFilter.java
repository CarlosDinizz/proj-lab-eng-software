package br.mackenzie.lab.supets.seguranca;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Confere o token JWT de cada requisição antes de ela seguir para os serviços.
 * <br>Com token válido, repassa quem é o usuário em X-Usuario-Id e X-Usuario-Perfil.
 * <br>Sem token, só passam as rotas de {@link RotasPublicas}.
 */
public class AutenticacaoFilter extends OncePerRequestFilter {
    public static final String CABECALHO_ID = "X-Usuario-Id";
    public static final String CABECALHO_PERFIL = "X-Usuario-Perfil";

    private static final String BEARER = "Bearer ";
    private static final Set<String> PERFIS = Set.of("CIDADAO", "ONG");

    private final JwtDecoder decoder;

    public AutenticacaoFilter(JwtDecoder decoder) {
        this.decoder = decoder;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String caminho = request.getRequestURI();
        if (caminhoSuspeito(caminho)) {
            responder(response, HttpServletResponse.SC_BAD_REQUEST, "caminho", "Caminho inválido.");
            return;
        }

        Map<String, String> usuario = new LinkedHashMap<>();
        String token = extrairToken(request);
        if (token != null) {
            try {
                usuario = lerUsuario(decoder.decode(token));
            } catch (JwtException | IllegalArgumentException e) {
                naoAutorizado(response, "Sessão inválida ou expirada. Faça login novamente.");
                return;
            }
        } else if (!RotasPublicas.permite(request.getMethod(), caminho)) {
            naoAutorizado(response, "Faça login para continuar.");
            return;
        }

        chain.doFilter(new RequisicaoAutenticada(request, usuario), response);
    }

    /**
     * As regras de rota comparam o caminho como texto; o serviço de destino o normaliza antes de usar.
     * <br>Para os dois nunca discordarem, caminhos com "..", "//", ";", "\" ou "%" são recusados.
     */
    private static boolean caminhoSuspeito(String caminho) {
        return caminho == null || caminho.contains("..") || caminho.contains("//") || caminho.contains(";")
            || caminho.contains("\\") || caminho.contains("%");
    }

    private static String extrairToken(HttpServletRequest request) {
        String valor = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (valor == null || !valor.regionMatches(true, 0, BEARER, 0, BEARER.length())) return null;
        return valor.substring(BEARER.length()).trim();
    }

    /** Os valores vão para cabeçalhos, então só passam um UUID e um perfil conhecido. */
    private static Map<String, String> lerUsuario(Jwt jwt) {
        String id = jwt.getSubject();
        String perfil = jwt.getClaimAsString("perfil");
        if (id == null || perfil == null || !PERFIS.contains(perfil)) {
            throw new IllegalArgumentException("Token sem usuário ou perfil válido");
        }
        Map<String, String> usuario = new LinkedHashMap<>();
        usuario.put(CABECALHO_ID, UUID.fromString(id).toString());
        usuario.put(CABECALHO_PERFIL, perfil);
        return usuario;
    }

    private static void naoAutorizado(HttpServletResponse response, String mensagem) throws IOException {
        response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
        responder(response, HttpServletResponse.SC_UNAUTHORIZED, "login", mensagem);
    }

    /** Mesmo formato {campo: mensagem} usado pelos serviços. Campo e mensagem são sempre textos fixos. */
    private static void responder(HttpServletResponse response, int status, String campo, String mensagem)
            throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"" + campo + "\":\"" + mensagem + "\"}");
    }
}
