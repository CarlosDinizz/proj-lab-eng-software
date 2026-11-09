package br.mackenzie.lab.supets.seguranca;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import java.util.Map;

/**
 * Requisição repassada aos serviços: descarta qualquer cabeçalho X-Usuario-* enviado pelo cliente
 * e expõe apenas os que o gateway extraiu do token.
 */
final class RequisicaoAutenticada extends HttpServletRequestWrapper {
    private static final String PREFIXO = "x-usuario-";

    private final Map<String, String> usuario;

    RequisicaoAutenticada(HttpServletRequest request, Map<String, String> usuario) {
        super(request);
        this.usuario = usuario;
    }

    @Override
    public String getHeader(String name) {
        return reservado(name) ? valor(name) : super.getHeader(name);
    }

    @Override
    public Enumeration<String> getHeaders(String name) {
        if (!reservado(name)) return super.getHeaders(name);
        String valor = valor(name);
        return valor == null ? Collections.emptyEnumeration() : Collections.enumeration(List.of(valor));
    }

    @Override
    public Enumeration<String> getHeaderNames() {
        List<String> nomes = new ArrayList<>(usuario.keySet());
        Enumeration<String> originais = super.getHeaderNames();
        while (originais != null && originais.hasMoreElements()) {
            String nome = originais.nextElement();
            if (!reservado(nome)) nomes.add(nome);
        }
        return Collections.enumeration(nomes);
    }

    private static boolean reservado(String nome) {
        return nome != null && nome.regionMatches(true, 0, PREFIXO, 0, PREFIXO.length());
    }

    private String valor(String nome) {
        for (Map.Entry<String, String> cabecalho : usuario.entrySet()) {
            if (cabecalho.getKey().equalsIgnoreCase(nome)) return cabecalho.getValue();
        }
        return null;
    }
}
