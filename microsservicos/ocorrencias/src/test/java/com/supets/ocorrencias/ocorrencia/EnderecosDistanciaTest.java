package com.supets.ocorrencias.ocorrencia;

import com.supets.ocorrencias.ocorrencia.exceptions.OpcaoInvalidaException;
import com.supets.ocorrencias.ocorrencia.service.Distancia;
import com.supets.ocorrencias.ocorrencia.validation.Enderecos;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import java.util.Locale;
import static org.junit.jupiter.api.Assertions.*;

class EnderecosDistanciaTest {
    @Test void everyPackagedUfAndMunicipalityWorksOffline() throws Exception {
        try (var input = getClass().getResourceAsStream("/supets-data/municipios.json")) {
            assertNotNull(input);
            var snapshot = JsonMapper.builder().build().readTree(input);
            assertEquals(27, snapshot.size());
            int count = 0;
            for (var entry : snapshot.properties()) {
                assertEquals(entry.getKey(), Enderecos.normalizarUf(" " + entry.getKey().toLowerCase(Locale.ROOT) + " "));
                for (var city : entry.getValue()) {
                    assertEquals(city.asString(), Enderecos.cidadeCanonica(entry.getKey(), " " + city.asString().toLowerCase(Locale.ROOT) + " ", "cidade"));
                    count++;
                }
            }
            assertTrue(count > 5500);
        }
    }

    @Test void normalizesNfcButNeverGuessesAnInvalidCityOrUf() {
        assertEquals("São Paulo", Enderecos.cidadeCanonica("sp", " sa\u0303o paulo ", "cidade"));
        for (String uf : new String[]{null, "", "ZZ", "São Paulo"}) {
            var error = assertThrows(OpcaoInvalidaException.class, () -> Enderecos.normalizarUf(uf));
            assertEquals("estado", error.getCampo());
            assertEquals("Informe uma UF válida.", error.getMessage());
        }
        for (String city : new String[]{null, "", "Sao Paulo", "Rio de Janeiro"}) {
            var error = assertThrows(OpcaoInvalidaException.class, () -> Enderecos.cidadeCanonica("SP", city, "cidade"));
            assertEquals("cidade", error.getCampo());
            assertEquals("Selecione um município válido para a UF.", error.getMessage());
        }
    }

    @Test void haversineIsFiniteAtIdenticalAntipodalPolarAndWrappedPoints() {
        assertEquals(0, Distancia.km(0, 0, 0, 0), 0);
        assertEquals(Math.PI * 6371, Distancia.km(0, 0, 0, 180), 1e-8);
        assertTrue(Double.isFinite(Distancia.km(89.999999, 0, -89.999999, 180)));
        assertEquals(Distancia.km(0, 179.99, 0, -179.99), Distancia.km(0, -179.99, 0, 179.99), 1e-12);
        assertTrue(Distancia.km(90, 0, 90, 180) < 1e-8);
        assertEquals(9.996423905, Distancia.km(0, 0, Math.toDegrees(9.996423905 / 6371), 0), 1e-10);
    }
}
