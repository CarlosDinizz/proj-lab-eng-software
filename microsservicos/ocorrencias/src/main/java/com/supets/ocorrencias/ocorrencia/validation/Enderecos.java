package com.supets.ocorrencias.ocorrencia.validation;

import com.supets.ocorrencias.ocorrencia.exceptions.OpcaoInvalidaException;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Vocabulário offline compartilhado; carregado e validado uma única vez no startup. */
@Component
public final class Enderecos {
    private static final Set<String> UFS = Set.of("AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
        "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO");
    private static final Map<String, Map<String, String>> MUNICIPIOS = carregar();

    private static Map<String, Map<String, String>> carregar() {
        try (InputStream entrada = Enderecos.class.getResourceAsStream("/supets-data/municipios.json")) {
            if (entrada == null) throw new IllegalStateException("Vocabulário de municípios ausente.");
            var raiz = JsonMapper.builder().build().readTree(entrada);
            if (!raiz.isObject() || raiz.size() != UFS.size()) throw new IllegalStateException("Vocabulário de municípios inválido.");
            Map<String, Map<String, String>> resultado = new HashMap<>();
            for (String uf : UFS) {
                var nomes = raiz.get(uf);
                if (nomes == null || !nomes.isArray() || nomes.isEmpty()) throw new IllegalStateException("UF sem municípios.");
                Map<String, String> cidades = new HashMap<>();
                for (var nome : nomes) {
                    if (!nome.isString() || nome.asString().isBlank()) throw new IllegalStateException("Município inválido.");
                    String canonico = Normalizer.normalize(nome.asString().trim(), Normalizer.Form.NFC);
                    if (cidades.put(chave(canonico), canonico) != null) throw new IllegalStateException("Município duplicado.");
                }
                resultado.put(uf, Map.copyOf(cidades));
            }
            return Map.copyOf(resultado);
        } catch (Exception e) {
            throw new IllegalStateException("Não foi possível carregar o vocabulário de municípios.", e);
        }
    }

    private static String chave(String valor) {
        return Normalizer.normalize(valor.trim(), Normalizer.Form.NFC).toUpperCase(Locale.ROOT);
    }

    public static String normalizarUf(String uf) {
        String valor = uf == null ? "" : chave(uf);
        if (!MUNICIPIOS.containsKey(valor)) throw new OpcaoInvalidaException("estado", "Informe uma UF válida.");
        return valor;
    }

    public static String cidadeCanonica(String uf, String cidade, String campo) {
        String estado = normalizarUf(uf);
        String canonica = cidade == null ? null : MUNICIPIOS.get(estado).get(chave(cidade));
        if (canonica == null) throw new OpcaoInvalidaException(campo, "Selecione um município válido para a UF.");
        return canonica;
    }
}
