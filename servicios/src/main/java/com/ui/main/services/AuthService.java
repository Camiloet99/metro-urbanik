package com.ui.main.services;

import com.ui.main.model.dto.RosterRow;
import com.ui.main.model.dto.SignupReq;
import com.ui.main.repository.UserRepository;
import com.ui.main.repository.entity.UserEntity;
import com.ui.main.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public Mono<Boolean> verifyIdentity(String email, String dni) {
        String norm = email.toLowerCase();
        return users.findByEmailIgnoreCase(norm)
                .map(u -> dni.equals(u.getDni()))
                .defaultIfEmpty(false);
    }
    public Mono<Void> resetPassword(String email, String dni, String newRawPassword) {
        String norm = email.toLowerCase();

        if (newRawPassword.length() < 8) {
            return Mono.error(new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Contraseña insegura (mínimo 8 caracteres)"
            ));
        }

        return users.findByEmailIgnoreCase(norm)
                .switchIfEmpty(Mono.error(new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Cuenta no registrada"
                )))
                .flatMap(u -> {
                    if (!dni.equals(u.getDni())) {
                        return Mono.error(new ResponseStatusException(
                                HttpStatus.BAD_REQUEST,
                                "No coincide email/cédula"
                        ));
                    }
                    if (!Boolean.TRUE.equals(u.getEnabled())) {
                        return Mono.error(new ResponseStatusException(
                                HttpStatus.CONFLICT,
                                "Cuenta deshabilitada"
                        ));
                    }
                    u.setPasswordHash(encoder.encode(newRawPassword));
                    return users.save(u).then();
                });
    }

    private Integer mapAgeRangeToEdad(String ageRange) {
        if (ageRange == null) return null;
        return switch (ageRange) {
            case "adolescente" -> 15;
            case "adulto" -> 30;
            case "adulto_mayor" -> 65;
            default -> null;
        };
    }

    public Mono<Void> signup(SignupReq req) {
        String norm = req.getEmail().toLowerCase();

        if (req.getPassword() == null || req.getPassword().length() < 8) {
            return Mono.error(new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Contraseña insegura (mínimo 8 caracteres)"
            ));
        }

        return users.existsByEmailIgnoreCase(norm)
                .flatMap(exists -> {
                    if (exists) {
                        return Mono.error(new ResponseStatusException(
                                HttpStatus.CONFLICT,
                                "Cuenta ya registrada"
                        ));
                    }
                    return users.existsByDni(req.getDni());
                })
                .flatMap(dniExists -> {
                    if (dniExists) {
                        return Mono.error(new ResponseStatusException(
                                HttpStatus.CONFLICT,
                                "Documento ya registrado"
                        ));
                    }

                    UserEntity u = UserEntity.builder()
                            .email(norm)
                            .dni(req.getDni())
                            .name(req.getNombresApellidos())
                            .genero(req.getGenero())
                            .edad(mapAgeRangeToEdad(req.getAgeRange()))
                            .telefono(null)
                            .celular("+57" + req.getCelular())
                            .emailPersonal(null)
                            .ciudadResidencia(req.getMunicipio())
                            .subregion(req.getBarrio()) // aquí reusamos subregion para barrio
                            .tipoDocumentoId("CC")       // o lo que uses por defecto
                            .enfoqueDiferencial(req.getEnfoque())
                            .programa(null)
                            .nivel(null)
                            .avatarId(0)
                            .passwordHash(encoder.encode(req.getPassword()))
                            .role("USER")
                            .enabled(true)
                            .initialTestDone(false)
                            .exitTestDone(false)
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .build();

                    return users.save(u).then();
                });
    }

    public Mono<String> login(String email, String password) {
        String norm = email.toLowerCase();
        return users.findByEmailIgnoreCase(norm)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas")))
                .flatMap(u -> {
                    if (!Boolean.TRUE.equals(u.getEnabled()) || !encoder.matches(password, u.getPasswordHash())) {
                        return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas"));
                    }
                    var claims = Map.<String, Object>of(
                            "uid", u.getId(), "role", u.getRole(), "avatarId", u.getAvatarId());
                    return Mono.just(jwt.generate(u.getEmail(), claims));
                });
    }
}