package com.supets.ocorrencias.ocorrencia.service;

/** Distância entre dois pontos do mapa (fórmula de Haversine). */
public final class Distancia {
    private static final double RAIO_TERRA_KM = 6371.0;

    private Distancia() {}

    public static double km(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.pow(Math.sin(dLat / 2), 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.pow(Math.sin(dLon / 2), 2);
        return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(a));
    }
}
