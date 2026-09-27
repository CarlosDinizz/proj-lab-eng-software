package br.mackenzie.lab.supets.util;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("ValidadorCadastro")
class ValidadorCadastroTest {

    private ValidadorCadastro validador;

    @BeforeEach
    void setUp() {
        validador = new ValidadorCadastro();
    }

    @Test
    @DisplayName("e-mail: aceita formato válido e rejeita inválido, nulo ou em branco")
    void validaEmail() {
        assertFalse(validador.isEmailValido("aluno@mackenzie.br"));
        assertTrue(validador.isEmailValido("nome.sobrenome+tag@exemplo.com.br"));
        assertFalse(validador.isEmailValido("aluno@"));
        assertFalse(validador.isEmailValido("aluno@mackenzie"));
        assertFalse(validador.isEmailValido("aluno.mackenzie.br"));
        assertFalse(validador.isEmailValido(" "));
        assertFalse(validador.isEmailValido(null));
    }

    @Test
    @DisplayName("nome: aceita de 3 a 100 caracteres após trim")
    void validaNome() {
        assertTrue(validador.isNomeValido("Ana"));
        assertTrue(validador.isNomeValido("a".repeat(100)));
        assertFalse(validador.isNomeValido("Jo"));
        assertFalse(validador.isNomeValido("a".repeat(101)));
        assertFalse(validador.isNomeValido("  Jo  "));
        assertFalse(validador.isNomeValido(null));
    }

    @Test
    @DisplayName("idade: aceita de 0 a 130, inclusive")
    void validaIdade() {
        assertTrue(validador.isIdadeValida(0));
        assertTrue(validador.isIdadeValida(130));
        assertFalse(validador.isIdadeValida(-1));
        assertFalse(validador.isIdadeValida(131));
    }

    @Test
    @DisplayName("senha: exige 8 caracteres, uma letra e um dígito")
    void validaSenhaForte() {
        assertTrue(validador.isSenhaForte("abcdefg1"));
        assertTrue(validador.isSenhaForte("Senha2026!"));
        assertFalse(validador.isSenhaForte("abcdef1"));
        assertFalse(validador.isSenhaForte("abcdefgh"));
        assertFalse(validador.isSenhaForte("12345678"));
        assertFalse(validador.isSenhaForte(null));
    }

    @Test
    @DisplayName("CPF: aceita com e sem máscara e rejeita dígitos errados ou repetidos")
    void validaCpf() {
        assertTrue(validador.isCpfValido("529.982.247-25"));
        assertTrue(validador.isCpfValido("52998224725"));
        assertFalse(validador.isCpfValido("529.982.247-24"));
        assertFalse(validador.isCpfValido("529.982.247-17"));
        assertFalse(validador.isCpfValido("111.111.111-11"));
        assertFalse(validador.isCpfValido("529.982.247"));
        assertFalse(validador.isCpfValido(null));
    }
}
