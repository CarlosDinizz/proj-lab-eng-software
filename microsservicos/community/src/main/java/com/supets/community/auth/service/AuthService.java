package com.supets.community.auth.service;

import com.supets.community.auth.dto.LoginDto;
import com.supets.community.auth.dto.LoginRespostaDto;

public interface AuthService {
    LoginRespostaDto login(LoginDto request);
}
