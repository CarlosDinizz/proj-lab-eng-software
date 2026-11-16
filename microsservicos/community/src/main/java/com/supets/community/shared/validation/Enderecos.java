package com.supets.community.shared.validation;

import com.supets.community.shared.exceptions.ApiException;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.HashMap;
import java.util.Map;
import java.util.Locale;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

@Component
public class Enderecos {
    private static final Set<String> UFS = Set.of("AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO");
    private final Map<String, Map<String, String>> municipios;

    public Enderecos() {
        try (InputStream fonte = Enderecos.class.getResourceAsStream("/supets-data/municipios.json")) {
            if (fonte == null) throw new IllegalStateException("Snapshot de municípios ausente.");
            var raiz = JsonMapper.builder().build().readTree(fonte);
            if (!raiz.isObject() || raiz.size() != UFS.size()) throw new IllegalStateException("Snapshot de municípios inválido.");
            Map<String, Map<String, String>> carregados = new HashMap<>();
            for (String uf : UFS) {
                var cidades = raiz.get(uf);
                if (cidades == null || !cidades.isArray() || cidades.isEmpty()) throw new IllegalStateException("Snapshot de municípios inválido.");
                Map<String, String> indice = new HashMap<>();
                for (var cidade : cidades) {
                    if (!cidade.isString() || cidade.asString().isBlank() || indice.put(chave(cidade.asString()), cidade.asString()) != null)
                        throw new IllegalStateException("Snapshot de municípios inválido.");
                }
                carregados.put(uf, Map.copyOf(indice));
            }
            municipios = Map.copyOf(carregados);
        } catch (Exception e) {
            throw new IllegalStateException("Não foi possível carregar o snapshot de municípios.", e);
        }
    }

    public String normalizarUf(String uf) {
        String normalizada = uf == null ? "" : uf.trim().toUpperCase(Locale.ROOT);
        if (!municipios.containsKey(normalizada)) throw new ApiException(HttpStatus.BAD_REQUEST, "estado", "Informe uma UF válida.");
        return normalizada;
    }

    public String cidadeCanonica(String uf, String cidade, String campo) {
        String canonica = municipios.get(normalizarUf(uf)).get(chave(cidade == null ? "" : cidade));
        if (canonica == null) throw new ApiException(HttpStatus.BAD_REQUEST, campo, "Selecione um município válido para a UF.");
        return canonica;
    }

    private static String chave(String cidade) {
        return Normalizer.normalize(cidade.trim(), Normalizer.Form.NFC).toLowerCase(Locale.ROOT);
    }
}
