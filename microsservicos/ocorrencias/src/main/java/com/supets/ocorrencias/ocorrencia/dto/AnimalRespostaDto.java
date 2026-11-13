package com.supets.ocorrencias.ocorrencia.dto;

import com.supets.ocorrencias.ocorrencia.model.Animal;

public record AnimalRespostaDto(
    String nome, String raca,
    Integer especieId, String especie,
    Integer sexoId, String sexo,
    Integer porteId, String porte
) {
    public static AnimalRespostaDto de(Animal a) {
        return new AnimalRespostaDto(a.getNome(), a.getRaca(),
            a.getEspecie().getId(), a.getEspecie().getNome(),
            a.getSexo() == null ? null : a.getSexo().getId(), a.getSexo() == null ? null : a.getSexo().getNome(),
            a.getPorte() == null ? null : a.getPorte().getId(), a.getPorte() == null ? null : a.getPorte().getNome());
    }
}
