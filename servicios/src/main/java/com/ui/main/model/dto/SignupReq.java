package com.ui.main.model.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SignupReq {

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String dni;

    @NotBlank
    @Size(min = 8)
    private String password;

    @NotBlank
    private String municipio;

    @NotBlank
    private String barrio;

    @NotBlank
    private String nombresApellidos;

    @NotBlank
    private String ageRange; // "adolescente", "adulto", "adulto_mayor"

    @NotBlank
    private String celular;  // sin +57, eso lo agregamos en el backend

    @NotBlank
    private String genero;   // "hombre", "mujer", etc.

    @NotBlank
    private String enfoque;  // valor seleccionado en el select
}
