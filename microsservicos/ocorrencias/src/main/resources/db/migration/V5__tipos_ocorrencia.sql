UPDATE tipo_ocorrencia SET tipo = 'Animal em Necessidade de Assistência Médica' WHERE id = 3;

-- V2 usou IDs explícitos: primeiro avance a sequência, sem reclassificar registros.
SELECT setval(pg_get_serial_sequence('tipo_ocorrencia', 'id'),
    GREATEST((SELECT COALESCE(MAX(id), 1) FROM tipo_ocorrencia), 1), true);
INSERT INTO tipo_ocorrencia (tipo) VALUES ('Desaparecimento');
