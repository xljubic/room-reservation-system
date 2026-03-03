package rs.fon.room_reservation.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import rs.fon.room_reservation.dto.ChangePasswordRequest;
import rs.fon.room_reservation.repository.UserRepository;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public static class LoginRequest {
        public String email;
        public String password;
    }

    public static class LoginResponse {
        public Long id;
        public String email;
        public String role;
        public String firstName;
        public String lastName;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        if (req == null || req.email == null || req.password == null) {
            return ResponseEntity.badRequest().body("Email i password su obavezni.");
        }

        var userOpt = userRepository.findByEmail(req.email.trim());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Pogrešan email ili šifra.");
        }

        var user = userOpt.get();
        if (user.getPasswordHash() == null || !passwordEncoder.matches(req.password, user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Pogrešan email ili šifra.");
        }

        var resp = new LoginResponse();
        resp.id = user.getId();
        resp.email = user.getEmail();
        resp.role = user.getRole().name();
        resp.firstName = user.getFirstName();
        resp.lastName = user.getLastName();

        return ResponseEntity.ok(resp);
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest req) {

        if (req == null || req.getUserId() == null) {
            return ResponseEntity.badRequest().body("Nedostaje userId.");
        }
        if (req.getOldPassword() == null || req.getOldPassword().isBlank()) {
            return ResponseEntity.badRequest().body("Unesi staru šifru.");
        }
        if (req.getNewPassword() == null || req.getNewPassword().isBlank()) {
            return ResponseEntity.badRequest().body("Unesi novu šifru.");
        }
        if (req.getNewPassword().length() < 4) {
            return ResponseEntity.badRequest().body("Nova šifra je prekratka.");
        }

        var opt = userRepository.findById(req.getUserId());
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Korisnik nije pronađen.");
        }

        var user = opt.get();
        var currentHash = user.getPasswordHash();
        if (currentHash == null || currentHash.isBlank()) {
            return ResponseEntity.badRequest().body("Korisnik nema podešenu šifru.");
        }

        if (!passwordEncoder.matches(req.getOldPassword(), currentHash)) {
            return ResponseEntity.badRequest().body("Stara šifra nije tačna.");
        }

        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);

        return ResponseEntity.ok("Šifra je uspešno promenjena.");
    }
}