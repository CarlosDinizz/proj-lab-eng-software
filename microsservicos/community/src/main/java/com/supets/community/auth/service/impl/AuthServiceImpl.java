package com.supets.community.auth.service.impl;

import com.supets.community.auth.dto.LoginDto;
import com.supets.community.auth.dto.LoginRespostaDto;
import com.supets.community.auth.service.AuthService;
import com.supets.community.auth.service.TokenService;
import com.supets.community.cidadao.service.CidadaoService;
import com.supets.community.ong.service.ONGService;
import com.supets.community.shared.dto.CredencialDto;
import com.supets.community.shared.exceptions.CredenciaisInvalidasException;
import java.util.List;
import java.util.ArrayList;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthServiceImpl implements AuthService {
    private final CidadaoService cidadaoService;
    private final ONGService ongService;
    private final TokenService tokenService;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    /** Hash usado quando o e-mail não existe, para a resposta levar o mesmo tempo de uma senha errada. */
    private final String hashFalso = encoder.encode("usuario-inexistente");

    public AuthServiceImpl(CidadaoService cidadaoService, ONGService ongService, TokenService tokenService) {
        this.cidadaoService = cidadaoService;
        this.ongService = ongService;
        this.tokenService = tokenService;
    }

    @Override
    public LoginRespostaDto login(LoginDto request) {
        List<CredencialDto> candidatas = new ArrayList<>(cidadaoService.buscarCredenciais(request.email()));
        candidatas.addAll(ongService.buscarCredenciais(request.email()));
        CredencialDto credencial = candidatas.size() == 1 ? candidatas.getFirst() : null;
        String hash = credencial != null && credencial.senhaHash() != null ? credencial.senhaHash() : hashFalso;
        boolean senhaConfere = encoder.matches(request.senha(), hash);
        if (credencial == null || !senhaConfere) throw new CredenciaisInvalidasException();

        String token = tokenService.gerarToken(credencial);
        return new LoginRespostaDto(token, credencial.id(), credencial.nome(), credencial.perfil());
    }
}
