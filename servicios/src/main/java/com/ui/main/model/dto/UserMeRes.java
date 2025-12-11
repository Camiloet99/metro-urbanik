package com.ui.main.model.dto;

import com.ui.main.repository.entity.UserEntity;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class UserMeRes {
    private Long id;
    private String email;
    private String dni;
    private String name;
    private String genero;
    private Integer edad;
    private LocalDate fechaNacimiento;

    // Teléfonos
    private String phone;              // alias principal que usa el front
    private String telefono;
    private String celular;
    private String celularSinPrefijo;  // útil para forms (+57 separado)

    // Ubicación
    private String ciudadResidencia;   // valor bruto en BD
    private String municipio;          // alias para front (mismo valor)
    private String subregion;          // valor bruto en BD
    private String barrio;             // alias para front (mismo valor)

    // Otros datos
    private String emailPersonal;
    private String tipoDocumentoId;
    private String enfoqueDiferencial; // bruto
    private String enfoque;            // alias
    private String programa;
    private String nivel;
    private String nivelRiesgo; // ⬅️ nuevo campo expuesto al front opcionalmente

    private Integer avatarId;
    private String role;

    public static UserMeRes of(UserEntity u) {
        return UserMeRes.builder()
                .id(u.getId())
                .email(u.getEmail())
                .dni(u.getDni())
                .name(u.getName())
                .genero(u.getGenero())
                .edad(u.getEdad())
                .fechaNacimiento(u.getFechaNacimiento())

                // Teléfonos
                .phone(u.getCelular())
                .telefono(u.getTelefono())
                .celular(u.getCelular())
                .celularSinPrefijo(normalizePhone(u.getCelular()))

                // Ubicación
                .ciudadResidencia(u.getCiudadResidencia())
                .municipio(u.getCiudadResidencia())
                .subregion(u.getSubregion())
                .barrio(u.getSubregion())
                .nivelRiesgo(u.getNivelRiesgo()) // ⬅️ map nuevo

                // Otros
                .emailPersonal(u.getEmailPersonal())
                .tipoDocumentoId(u.getTipoDocumentoId())
                .enfoqueDiferencial(u.getEnfoqueDiferencial())
                .enfoque(u.getEnfoqueDiferencial())
                .programa(u.getPrograma())
                .nivel(u.getNivel())
                .avatarId(u.getAvatarId())
                .role(u.getRole())
                .build();
    }

    private static String normalizePhone(String phone) {
        if (phone == null) return null;
        String p = phone.trim();
        if (p.startsWith("+57")) return p.substring(3);
        if (p.startsWith("+")) return p.substring(1);
        return p;
    }
}