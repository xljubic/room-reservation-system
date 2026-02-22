/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package rs.fon.room_reservation.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import rs.fon.room_reservation.dto.CancelReservationRequest;
import rs.fon.room_reservation.dto.CreateReservationRequest;
import rs.fon.room_reservation.dto.DecideReservationRequest;
import rs.fon.room_reservation.dto.ScheduleResponse;
import rs.fon.room_reservation.model.entity.Reservation;
import rs.fon.room_reservation.model.entity.ReservationApproval;
import rs.fon.room_reservation.model.entity.Room;
import rs.fon.room_reservation.model.entity.User;
import rs.fon.room_reservation.model.enums.ApprovalDecision;
import rs.fon.room_reservation.model.enums.ReservationStatus;
import rs.fon.room_reservation.model.enums.UserRole;
import rs.fon.room_reservation.repository.ReservationApprovalRepository;
import rs.fon.room_reservation.repository.ReservationRepository;
import rs.fon.room_reservation.repository.RoomRepository;
import rs.fon.room_reservation.repository.UserRepository;

/**
 *
 * @author Aleksandar
 */
@RestController
@RequestMapping("/api/reservations")
@Tag(name = "Reservations", description = "Rezervacije sala + admin odobravanje/odbijanje")
public class ReservationController {

    private final ReservationRepository reservationRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final ReservationApprovalRepository approvalRepository;

    public ReservationController(
            ReservationRepository reservationRepository,
            RoomRepository roomRepository,
            UserRepository userRepository,
            ReservationApprovalRepository approvalRepository
    ) {
        this.reservationRepository = reservationRepository;
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
        this.approvalRepository = approvalRepository;
    }

    @Operation(summary = "Vrati zauzete termine (samo APPROVED) za dati datum")
    @GetMapping
    public List<Reservation> approvedByDate(@RequestParam String date) {
        LocalDate d = LocalDate.parse(date); // format: YYYY-MM-DD
        LocalDateTime from = d.atStartOfDay();
        LocalDateTime to = d.plusDays(1).atStartOfDay();

        return reservationRepository.findByStatusAndStartDateTimeGreaterThanEqualAndStartDateTimeLessThan(
                ReservationStatus.APPROVED, from, to
        );
    }

    @Operation(summary = "Kreiraj rezervaciju (USER -> PENDING, ADMIN -> APPROVED)")
    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateReservationRequest req) {

        // 1) Validacija required polja (prvo da ne dobijemo NPE)
        if (req.getRoomId() == null || req.getCreatedById() == null
                || req.getStartDateTime() == null || req.getEndDateTime() == null
                || req.getPurpose() == null || req.getName() == null) {
            return ResponseEntity.badRequest().body("Missing required fields.");
        }

        // 2) Validacija vremena (radno vreme + do mora biti posle od)
        LocalTime workStart = LocalTime.of(8, 0);
        LocalTime workEnd = LocalTime.of(20, 0);

        LocalTime startT = req.getStartDateTime().toLocalTime();
        LocalTime endT = req.getEndDateTime().toLocalTime();

        if (!req.getEndDateTime().isAfter(req.getStartDateTime())) {
            return ResponseEntity.badRequest().body("endDateTime must be after startDateTime.");
        }
        if (startT.isBefore(workStart) || endT.isAfter(workEnd)) {
            return ResponseEntity.badRequest().body("Radno vreme je 08:00–20:00.");
        }

        // 3) Učitavanje entiteta
        Room room = roomRepository.findById(req.getRoomId()).orElse(null);
        User user = userRepository.findById(req.getCreatedById()).orElse(null);

        if (room == null) {
            return ResponseEntity.badRequest().body("Room not found.");
        }
        if (user == null) {
            return ResponseEntity.badRequest().body("User not found.");
        }

        // 4) Spreči preklapanje sa već APPROVED rezervacijama
        boolean overlapApproved  = !reservationRepository
                .findOverlaps(room.getId(), ReservationStatus.APPROVED, req.getStartDateTime(), req.getEndDateTime())
                .isEmpty();
        boolean overlapPending = !reservationRepository
                .findOverlaps(room.getId(), ReservationStatus.PENDING, req.getStartDateTime(), req.getEndDateTime())
                .isEmpty();
        boolean hasOverlap = overlapApproved || overlapPending;


        if (hasOverlap) {
            return ResponseEntity.badRequest().body("Room is not available in the selected time range.");
        }

        // 5) Status zavisi od uloge: ADMIN -> APPROVED, USER -> PENDING
        ReservationStatus status = (user.getRole() == UserRole.ADMIN)
                ? ReservationStatus.APPROVED
                : ReservationStatus.PENDING;

        Reservation r = new Reservation();
        r.setRoom(room);
        r.setCreatedBy(user);
        r.setStartDateTime(req.getStartDateTime());
        r.setEndDateTime(req.getEndDateTime());
        r.setPurpose(req.getPurpose());
        r.setName(req.getName());
        r.setDescription(req.getDescription());
        r.setStatus(status);
        r.setCreatedAt(LocalDateTime.now());

        return ResponseEntity.ok(reservationRepository.save(r));
    }

    @Operation(summary = "Vrati moje rezervacije (po userId)")
    @GetMapping("/my")
    public List<Reservation> myReservations(@RequestParam Long userId) {
        return reservationRepository.findByCreatedByIdOrderByStartDateTimeDesc(userId);
    }

    @Operation(summary = "Otkaži rezervaciju (samo owner)")
    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id, @RequestBody CancelReservationRequest req) {
        Reservation r = reservationRepository.findById(id).orElse(null);
        if (r == null) {
            return ResponseEntity.notFound().build();
        }

        if (req.getUserId() == null) {
            return ResponseEntity.badRequest().body("Missing userId.");
        }

        if (!r.getCreatedBy().getId().equals(req.getUserId())) {
            return ResponseEntity.status(403).body("You can cancel only your reservations.");
        }

        if (r.getStatus() == ReservationStatus.CANCELED) {
            return ResponseEntity.ok(r);
        }

        r.setStatus(ReservationStatus.CANCELED);
        return ResponseEntity.ok(reservationRepository.save(r));
    }

    @Operation(summary = "Admin: lista PENDING rezervacija")
    @GetMapping("/pending")
    public List<Reservation> pending() {
        return reservationRepository.findByStatusOrderByCreatedAtAsc(ReservationStatus.PENDING);
    }

    @Operation(summary = "Admin: approve/reject (upis u history + update status)")
    @PostMapping("/{id}/decide")
    public ResponseEntity<?> decide(@PathVariable Long id, @RequestBody DecideReservationRequest req) {

        Reservation r = reservationRepository.findById(id).orElse(null);
        if (r == null) {
            return ResponseEntity.notFound().build();
        }

        if (req.getAdminId() == null || req.getDecision() == null) {
            return ResponseEntity.badRequest().body("Missing adminId or decision.");
        }

        User admin = userRepository.findById(req.getAdminId()).orElse(null);
        if (admin == null) {
            return ResponseEntity.badRequest().body("Admin user not found.");
        }
        if (admin.getRole() != rs.fon.room_reservation.model.enums.UserRole.ADMIN) {
            return ResponseEntity.status(403).body("User is not ADMIN.");
        }

        // Ako approve: opet proveri overlap (u međuvremenu možda neko odobrio drugi termin)
        if (req.getDecision() == ApprovalDecision.APPROVED) {
            boolean hasOverlap = !reservationRepository
                    .findOverlaps(r.getRoom().getId(), ReservationStatus.APPROVED, r.getStartDateTime(), r.getEndDateTime())
                    .isEmpty();

            if (hasOverlap) {
                return ResponseEntity.badRequest().body("Cannot approve: room overlaps with an already approved reservation.");
            }
            r.setStatus(ReservationStatus.APPROVED);
        } else {
            r.setStatus(ReservationStatus.REJECTED);
        }

        reservationRepository.save(r);

        ReservationApproval a = new ReservationApproval();
        a.setReservation(r);
        a.setDecidedBy(admin);
        a.setDecision(req.getDecision());
        a.setComment(req.getComment());
        a.setDecidedAt(LocalDateTime.now());
        approvalRepository.save(a);

        return ResponseEntity.ok(r);
    }

    //@Operation(summary = "Schedule za UI grid: rooms + APPROVED rezervacije za dan")
    @GetMapping("/schedule")
    public ScheduleResponse schedule(@RequestParam String date) {
        var rooms = roomRepository.findAll();

        LocalDate d = LocalDate.parse(date);
        LocalDateTime from = d.atStartOfDay();
        LocalDateTime to = d.plusDays(1).atStartOfDay();

        var approved = reservationRepository.findByStatusOverlappingRange(
                ReservationStatus.APPROVED, from, to
        );
        var pending = reservationRepository.findByStatusOverlappingRange(
                ReservationStatus.PENDING, from, to
        );

        ScheduleResponse resp = new ScheduleResponse();
        resp.setDate(date);
        resp.setDayStart("08:00");
        resp.setDayEnd("20:00");
        resp.setSlotMinutes(30);
        resp.setRooms(rooms);
        resp.setApprovedReservations(approved);
        resp.setPendingReservations(pending);

        return resp;
    }

}
