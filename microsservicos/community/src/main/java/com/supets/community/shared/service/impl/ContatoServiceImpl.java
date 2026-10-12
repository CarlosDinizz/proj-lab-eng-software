package com.supets.community.shared.service.impl;

import com.supets.community.shared.dto.ContatoDto;
import com.supets.community.shared.events.SalvarContatosEvent;
import com.supets.community.shared.model.Contato;
import com.supets.community.shared.model.TipoContato;
import com.supets.community.shared.repository.ContatoRepository;
import com.supets.community.shared.service.ContatoService;
import com.supets.community.shared.service.TipoContatoService;
import jakarta.transaction.Transactional;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ContatoServiceImpl implements ContatoService {

    private final ContatoRepository repository;
    private final TipoContatoService tipoContatoService;

    public ContatoServiceImpl(ContatoRepository repository, TipoContatoService tipoContatoService) {
        this.repository = repository;
        this.tipoContatoService = tipoContatoService;
    }

    @Transactional
    public List<Contato> saveContatos(List<ContatoDto> contatos, UUID ongUuid, UUID cidadaoUuid) {
        List<Contato> novosContatos = new ArrayList<>();

        for (ContatoDto contato : contatos) {
            TipoContato tipoContato = tipoContatoService.getTipoContato(contato);

            Contato novoContato = new Contato();
            novoContato.setTipoContato(tipoContato);
            novoContato.setValor(contato.valor());

            novoContato.setCidadaoId(cidadaoUuid);
            novoContato.setOngId(ongUuid);

            novosContatos.add(repository.save(novoContato));
        }

        return novosContatos;
    }

    @ApplicationModuleListener
    public void onSaveContatos(SalvarContatosEvent event) {
        saveContatos(event.contatos(), event.ongUuid(), event.cidadaoUuid());
    }
}
