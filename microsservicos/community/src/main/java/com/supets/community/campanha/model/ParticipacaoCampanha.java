package com.supets.community.campanha.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "participacao_campanha")
public class ParticipacaoCampanha {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "campanha_id", nullable = false)
    private UUID campanhaId;

    @Column(name = "cidadao_id", nullable = false)
    private UUID cidadaoId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ParticipacaoCampanha() {}

    public ParticipacaoCampanha(UUID campanhaId, UUID cidadaoId, Instant createdAt) {
        this.campanhaId = campanhaId;
        this.cidadaoId = cidadaoId;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public UUID getCampanhaId() { return campanhaId; }
    public UUID getCidadaoId() { return cidadaoId; }
    public Instant getCreatedAt() { return createdAt; }
}