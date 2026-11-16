package br.mackenzie.lab.supets.seguranca;

import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Only private gateway ingress is allowed; Caddy overwrites X-SuPets-Client-IP with its direct peer. */
@Component
public class LimiteAutenticacao {
    private static final long MINUTO = 60_000;
    private static final int MAX_CLIENTES = 4096;
    private final Clock clock;
    private final int logins;
    private final int cadastros;
    private final Map<String, Janela> clientes = new HashMap<>();
    private long ultimaLimpeza;

    public LimiteAutenticacao(Clock clock, @Value("${supets.limite.login:120}") int logins,
            @Value("${supets.limite.cadastro:60}") int cadastros) {
        this.clock = clock;
        this.logins = logins;
        this.cadastros = cadastros;
        ultimaLimpeza = clock.millis();
    }

    public boolean aplica(String metodo, String caminho) {
        return "POST".equalsIgnoreCase(metodo) && (login(caminho)
            || "/community/cidadao/api/v1".equals(caminho) || "/community/ong/api/v1".equals(caminho));
    }

    /** Zero permits; positive values are the Retry-After delay in seconds. */
    public synchronized long verificar(String ip, String metodo, String caminho) {
        if (!aplica(metodo, caminho)) return 0;
        long agora = clock.millis();
        if (agora - ultimaLimpeza >= MINUTO) {
            clientes.values().removeIf(j -> agora - j.inicio >= MINUTO);
            ultimaLimpeza = agora;
        }
        String chave = ip == null || ip.isBlank() || ip.length() > 128 ? "unknown" : ip;
        Janela janela = clientes.get(chave);
        if (janela != null && agora - janela.inicio >= MINUTO) {
            clientes.remove(chave);
            janela = null;
        }
        if (janela == null) {
            if (clientes.size() >= MAX_CLIENTES) return 60;
            janela = new Janela(agora);
            clientes.put(chave, janela);
        }
        if (login(caminho)) {
            if (janela.logins >= logins) return espera(janela, agora);
            janela.logins++;
        } else {
            if (janela.cadastros >= cadastros) return espera(janela, agora);
            janela.cadastros++;
        }
        return 0;
    }

    private static boolean login(String caminho) { return "/community/auth/api/v1/login".equals(caminho); }
    private static long espera(Janela janela, long agora) { return Math.max(1, (MINUTO - (agora - janela.inicio) + 999) / 1000); }
    private static final class Janela {
        final long inicio;
        int logins;
        int cadastros;
        Janela(long inicio) { this.inicio = inicio; }
    }
}
