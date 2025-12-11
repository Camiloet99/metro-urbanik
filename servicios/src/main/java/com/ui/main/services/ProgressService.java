package com.ui.main.services;

import com.ui.main.model.dto.PagedUsersWithExperienceStatusRes;
import com.ui.main.model.dto.ProgressMeRes;
import com.ui.main.model.dto.TestSubmitReq;
import com.ui.main.model.dto.UserWithExperienceStatusRes;
import com.ui.main.repository.UserRepository;
import com.ui.main.repository.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProgressService {

    private final ExternalProgressService external;
    private final UserRepository users;

    public Mono<PagedUsersWithExperienceStatusRes> getUsersExperienceStatusPage(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        Mono<List<ExternalProgressService.UserProgressDto>> progressMono = external.readAll();
        Mono<Long> totalUsersMono = users.count();
        Mono<List<UserEntity>> pageUsersMono = users.findAll()
                .skip((long) safePage * safeSize)
                .take(safeSize)
                .collectList();

        return Mono.zip(progressMono, totalUsersMono, pageUsersMono)
                .map(tuple -> {
                    List<ExternalProgressService.UserProgressDto> progressList = tuple.getT1();
                    long totalUsers = tuple.getT2();
                    List<UserEntity> pageUsers = tuple.getT3();

                    List<UserWithExperienceStatusRes> mapped = pageUsers.stream()
                            .map(u -> mapUserWithExperienceStatus(u, progressList))
                            .toList();

                    return PagedUsersWithExperienceStatusRes.builder()
                            .userList(mapped)
                            .totalUsers(totalUsers)
                            .page(safePage)
                            .size(safeSize)
                            .build();
                });
    }


    private UserWithExperienceStatusRes mapUserWithExperienceStatus(
            UserEntity u,
            List<ExternalProgressService.UserProgressDto> progressList
    ) {
        ExternalProgressService.UserProgressDto p = findByDni(progressList, u.getDni());

        boolean initialTestDone = bool(u.getInitialTestDone());
        boolean exitTestDone    = bool(u.getExitTestDone());

        boolean m1 = p != null && p.isMedalla1();
        boolean m2 = p != null && p.isMedalla2();
        boolean m3 = p != null && p.isMedalla3();
        boolean m4 = p != null && p.isMedalla4();

        int experienceStatus = 0;

        if (initialTestDone) experienceStatus += 10;
        if (exitTestDone)    experienceStatus += 10;

        if (m1) experienceStatus += 20;
        if (m2) experienceStatus += 20;
        if (m3) experienceStatus += 20;
        if (m4) experienceStatus += 20;

        return UserWithExperienceStatusRes.of(u, experienceStatus);
    }

    public Mono<ProgressMeRes> getMyProgress(String email) {
        return users.findByEmailIgnoreCase(email)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND)))
                .flatMap(u -> external.readAll()
                        .map(list -> toRes(u, findByDni(list, u.getDni())))
                );
    }

    public Mono<ProgressMeRes> updateMedals(String email,
                                            Boolean m1, Boolean m2, Boolean m3, Boolean m4) {
        return users.findByEmailIgnoreCase(email)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND)))
                .flatMap(u -> external.readAll()
                        // usa flatMap y no retornes null
                        .flatMap(list -> {
                            var curr = findByDni(list, u.getDni()); // puede ser null
                            boolean nm1 = m1 != null ? m1 : (curr != null && curr.isMedalla1());
                            boolean nm2 = m2 != null ? m2 : (curr != null && curr.isMedalla2());
                            boolean nm3 = m3 != null ? m3 : (curr != null && curr.isMedalla3());
                            boolean nm4 = m4 != null ? m4 : (curr != null && curr.isMedalla4());

                            return external.upsertMedals(u.getDni(), nm1, nm2, nm3, nm4)
                                    .flatMap(ok -> {
                                        if (!ok) {
                                            return Mono.error(new ResponseStatusException(
                                                    HttpStatus.BAD_GATEWAY, "No se pudo actualizar medallas en nivel99"));
                                        }
                                        return Mono.just(new ProgressMeRes(
                                                nm1, nm2, nm3, nm4,
                                                bool(u.getInitialTestDone()),
                                                bool(u.getExitTestDone())
                                        ));
                                    });
                        })
                );
    }

    private static ExternalProgressService.UserProgressDto findByDni(
            List<ExternalProgressService.UserProgressDto> list, String dni) {
        if (dni == null) return null;
        String ndni = dni.trim();
        return list.stream()
                .filter(p -> ndni.equals(p.getIdEstudiante()))
                .findFirst()
                .orElse(null);
    }

    public Mono<Void> markTestDone(String email, TestSubmitReq req) {
        return users.findByEmailIgnoreCase(email)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND)))
                .flatMap(u -> {
                    String kind = req.getKind();
                    if ("test-inicial".equalsIgnoreCase(kind)) {
                        u.setInitialTestDone(true);

                        String nivel = computeRiskLevelFromInitialTest(req.getAnswers());
                        u.setNivelRiesgo(nivel);

                    } else if ("test-salida".equalsIgnoreCase(kind)) {
                        u.setExitTestDone(true);
                    } else {
                        return Mono.error(new ResponseStatusException(
                                HttpStatus.BAD_REQUEST, "kind inválido"));
                    }
                    return users.save(u).then();
                });
    }

    private String computeRiskLevelFromInitialTest(List<Object> answers) {
        if (answers == null || answers.size() < 5) {
            // por seguridad, si viene roto devolvemos un nivel neutro
            return "DESCONOCIDO";
        }

        Object q1 = answers.get(0); // medio transporte
        Object q2 = answers.get(1); // horario
        Object q3 = answers.get(2); // percepción (1–5)
        Object q4 = answers.get(3); // exposición
        Object q5 = answers.get(4); // conocimiento rutas

        int score = 0;

        // 1) Medio de transporte habitual
        score += scoreTransporte(q1);

        // 2) Horario de mayor movilidad
        score += scoreHorario(q2);

        // 3) Percepción de seguridad (1 muy inseguro – 5 muy seguro)
        score += scorePercepcion(q3);

        // 4) Exposición a riesgo (sí / no / a veces)
        score += scoreExposicion(q4);

        // 5) Conocimiento de rutas de denuncia (sí / no)
        score += scoreConocimiento(q5);

        // Clasificación simple: Bajo / Medio / Alto
        if (score >= 9) {
            return "ALTO";
        } else if (score >= 5) {
            return "MEDIO";
        } else {
            return "BAJO";
        }
    }

    private int scoreTransporte(Object ans) {
        if (ans == null) return 0;
        String v = String.valueOf(ans);
        // más vulnerable: caminar o bici
        return switch (v) {
            case "caminar_bici" -> 3;
            case "transporte_publico" -> 2;
            case "taxi_plataforma" -> 1;
            case "vehiculo_moto" -> 1;
            default -> 0;
        };
    }

    private int scoreHorario(Object ans) {
        if (ans == null) return 0;
        String v = String.valueOf(ans);
        return switch (v) {
            case "manana" -> 0;
            case "tarde" -> 1;
            case "noche" -> 2;
            case "madrugada" -> 3; // mayor riesgo
            default -> 0;
        };
    }

    private int scorePercepcion(Object ans) {
        if (ans == null) return 0;
        int n;
        if (ans instanceof Number num) {
            n = num.intValue();
        } else {
            try {
                n = Integer.parseInt(String.valueOf(ans));
            } catch (NumberFormatException e) {
                return 0;
            }
        }
        // 1 = muy inseguro, 5 = muy seguro
        return switch (n) {
            case 1 -> 3;
            case 2 -> 2;
            case 3 -> 1;
            case 4, 5 -> 0;
            default -> 0;
        };
    }

    private int scoreExposicion(Object ans) {
        if (ans == null) return 0;
        String v = String.valueOf(ans);
        return switch (v) {
            case "si" -> 3;
            case "a_veces" -> 2;
            case "no" -> 0;
            default -> 0;
        };
    }

    private int scoreConocimiento(Object ans) {
        if (ans == null) return 0;
        String v = String.valueOf(ans);
        return switch (v) {
            case "no" -> 2;
            case "si" -> 0;
            default -> 0;
        };
    }

    private static boolean bool(Boolean b) {
        return b != null && b;
    }

    private static ProgressMeRes toRes(UserEntity u, ExternalProgressService.UserProgressDto p) {
        boolean m1 = p != null && p.isMedalla1();
        boolean m2 = p != null && p.isMedalla2();
        boolean m3 = p != null && p.isMedalla3();
        boolean m4 = p != null && p.isMedalla4();
        return new ProgressMeRes(
                m1, m2, m3, m4,
                bool(u.getInitialTestDone()),
                bool(u.getExitTestDone())
        );
    }

    public Flux<UserWithExperienceStatusRes> getAllUsersExperienceStatus() {
        Mono<List<ExternalProgressService.UserProgressDto>> progressMono = external.readAll();

        return progressMono.flatMapMany(progressList ->
                users.findAll()
                        .map(u -> mapUserWithExperienceStatus(u, progressList))
        );
    }
}