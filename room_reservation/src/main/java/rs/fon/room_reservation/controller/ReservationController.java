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
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import rs.fon.room_reservation.dto.CancelReservationRequest;
import rs.fon.room_reservation.dto.CreateReservationGroupItemRequest;
import rs.fon.room_reservation.dto.CreateReservationGroupRequest;
import rs.fon.room_reservation.dto.CreateReservationRequest;
import rs.fon.room_reservation.dto.DecideReservationRequest;
import rs.fon.room_reservation.dto.ReservationGroupItemResponse;
import rs.fon.room_reservation.dto.ReservationGroupResponse;
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
        LocalDate d = LocalDate.parse(date);
        LocalDateTime from = d.atStartOfDay();
        LocalDateTime to = d.plusDays(1).atStartOfDay();

        return reservationRepository.findByStatusAndStartDateTimeGreaterThanEqualAndStartDateTimeLessThan(
                ReservationStatus.APPROVED, from, to
        );
    }

    // ========= NOVO: grupno kreiranje preko istog endpointa =========
    @Operation(summary = "Kreiraj rezervaciju GRUPNO (USER -> PENDING, ADMIN -> APPROVED)")
    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateReservationGroupRequest req) {

        // 1) Validacija required polja
        if (req == null
                || req.getCreatedById() == null
                || req.getDate() == null
                || req.getPurpose() == null
                || req.getName() == null
                || req.getItems() == null
                || req.getItems().isEmpty()) {
            return ResponseEntity.badRequest().body("Missing required fields (createdById, date, purpose, name, items).");
        }

        // 2) Ucitavanje user-a (odredjuje status)
        User user = userRepository.findById(req.getCreatedById()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body("User not found.");
        }

        ReservationStatus status = (user.getRole() == UserRole.ADMIN)
                ? ReservationStatus.APPROVED
                : ReservationStatus.PENDING;

        // 3) Radno vreme
        LocalTime workStart = LocalTime.of(8, 0);
        LocalTime workEnd = LocalTime.of(20, 0);

        // 4) Generisi groupId (isti za sve stavke)
        String groupId = UUID.randomUUID().toString();
        LocalDate date = req.getDate();

        // createdAt isti za sve stavke u grupi
        LocalDateTime createdAt = LocalDateTime.now();

        // 5) Pre-validacija i overlap check po stavkama
        List<ReservationStatus> blockedStatuses = List.of(ReservationStatus.PENDING, ReservationStatus.APPROVED);

        List<Reservation> toSave = new ArrayList<>();

        for (CreateReservationGroupItemRequest item : req.getItems()) {
            if (item == null || item.getRoomId() == null
                    || item.getStartTime() == null || item.getEndTime() == null) {
                return ResponseEntity.badRequest().body("Each item must have roomId, startTime, endTime.");
            }

            // parsiranje vremena
            LocalTime startT;
            LocalTime endT;
            try {
                startT = LocalTime.parse(item.getStartTime()); // "HH:mm"
                endT = LocalTime.parse(item.getEndTime());
            } catch (DateTimeParseException ex) {
                return ResponseEntity.badRequest().body("Invalid time format. Use HH:mm (e.g. 14:00).");
            }

            if (!endT.isAfter(startT)) {
                return ResponseEntity.badRequest().body(
                        "Invalid time range for roomId=" + item.getRoomId() + ": endTime must be after startTime."
                );
            }

            if (startT.isBefore(workStart) || endT.isAfter(workEnd)) {
                return ResponseEntity.badRequest().body(
                        "Radno vreme je 08:00–20:00. Problem: roomId=" + item.getRoomId()
                        + " (" + item.getStartTime() + "-" + item.getEndTime() + ")"
                );
            }

            LocalDateTime start = date.atTime(startT);
            LocalDateTime end = date.atTime(endT);

            Room room = roomRepository.findById(item.getRoomId()).orElse(null);
            if (room == null) {
                return ResponseEntity.badRequest().body("Room not found. roomId=" + item.getRoomId());
            }

            // overlap check sa PENDING + APPROVED
            boolean hasOverlap = !reservationRepository
                    .findOverlapsWithStatuses(room.getId(), blockedStatuses, start, end)
                    .isEmpty();

            if (hasOverlap) {
                return ResponseEntity.badRequest().body(
                        "Ne moze da se rezervise: sala " + room.getCode()
                        + " u terminu " + item.getStartTime() + "-" + item.getEndTime()
                        + " (zauzeta je - PENDING ili APPROVED)."
                );
            }

            Reservation r = new Reservation();
            r.setGroupId(groupId);
            r.setRoom(room);
            r.setCreatedBy(user);

            r.setStartDateTime(start);
            r.setEndDateTime(end);

            r.setPurpose(req.getPurpose());
            r.setName(req.getName());
            r.setDescription(item.getDescription());

            r.setStatus(status);
            r.setCreatedAt(createdAt); // ✅ isti za celu grupu

            toSave.add(r);
        }

        List<Reservation> saved = reservationRepository.saveAll(toSave);
        return ResponseEntity.ok(saved);
    }

    // ===============================================================
    @Operation(summary = "Vrati moje rezervacije (po userId)")
    @GetMapping("/my")
    public List<Reservation> myReservations(@RequestParam Long userId) {
        return reservationRepository.findByCreatedByIdOrderByStartDateTimeDesc(userId);
    }

    @Operation(summary = "Otkazi rezervaciju (samo owner)")
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

    @Operation(summary = "Admin: lista PENDING rezervacija (jos uvek pojedinacne stavke)")
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
        if (admin.getRole() != UserRole.ADMIN) {
            return ResponseEntity.status(403).body("User is not ADMIN.");
        }

        if (req.getDecision() == ApprovalDecision.APPROVED) {
            // final overlap check (bar APPROVED, a moze i PENDING+APPROVED ako hoces strogo)
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

    @Operation(summary = "Admin: lista PENDING rezervacija grupisano po groupId")
    @GetMapping("/pending-groups")
    public List<ReservationGroupResponse> pendingGroups() {

        List<Reservation> pendingItems
                = reservationRepository.findByStatusAndGroupIdIsNotNullOrderByCreatedAtAsc(ReservationStatus.PENDING);

        // groupId -> response (čuvamo redosled po createdAt)
        Map<String, ReservationGroupResponse> map = new LinkedHashMap<>();

        for (Reservation r : pendingItems) {
            String gid = r.getGroupId();

            ReservationGroupResponse grp = map.get(gid);
            if (grp == null) {
                grp = new ReservationGroupResponse();
                grp.setGroupId(gid);
                grp.setCreatedById(r.getCreatedBy().getId());
                grp.setCreatedByEmail(r.getCreatedBy().getEmail());
                grp.setPurpose(r.getPurpose());
                grp.setName(r.getName());
                grp.setStatus(r.getStatus());
                grp.setCreatedAt(r.getCreatedAt());
                grp.setItems(new ArrayList<>());
                map.put(gid, grp);
            }

            ReservationGroupItemResponse item = new ReservationGroupItemResponse();
            item.setId(r.getId());
            item.setRoomId(r.getRoom().getId());
            item.setRoomCode(r.getRoom().getCode());
            item.setStartDateTime(r.getStartDateTime());
            item.setEndDateTime(r.getEndDateTime());
            item.setDescription(r.getDescription());

            grp.getItems().add(item);
        }

        return new ArrayList<>(map.values());
    }

    @Operation(summary = "Admin: approve/reject CELE GRUPE (groupId) + history")
    @PostMapping("/group/{groupId}/decide")
    public ResponseEntity<?> decideGroup(@PathVariable String groupId, @RequestBody DecideReservationRequest req) {

        if (req.getAdminId() == null || req.getDecision() == null) {
            return ResponseEntity.badRequest().body("Missing adminId or decision.");
        }

        User admin = userRepository.findById(req.getAdminId()).orElse(null);
        if (admin == null) {
            return ResponseEntity.badRequest().body("Admin user not found.");
        }
        if (admin.getRole() != UserRole.ADMIN) {
            return ResponseEntity.status(403).body("User is not ADMIN.");
        }

        List<Reservation> groupItems = reservationRepository.findByGroupIdOrderByStartDateTimeAsc(groupId);
        if (groupItems.isEmpty()) {
            return ResponseEntity.badRequest().body("Group not found: " + groupId);
        }

        // mora sve da bude PENDING da bi admin "odlucivao" (ako hoces strogo)
        // ako hoces fleksibilno, preskoci ovu proveru
        for (Reservation r : groupItems) {
            if (r.getStatus() != ReservationStatus.PENDING) {
                return ResponseEntity.badRequest().body("Group is not in PENDING state.");
            }
        }

        if (req.getDecision() == ApprovalDecision.APPROVED) {

            // FINALNA PROVERA: konflikt sa PENDING+APPROVED, ali ignorisi rezervacije iz ove iste grupe
            List<ReservationStatus> blocked = List.of(ReservationStatus.PENDING, ReservationStatus.APPROVED);

            List<String> conflicts = new ArrayList<>();

            for (Reservation r : groupItems) {
                List<Reservation> overlaps = reservationRepository.findOverlapsWithStatuses(
                        r.getRoom().getId(), blocked, r.getStartDateTime(), r.getEndDateTime()
                );

                // ignorisi overlap koji je iz iste grupe
                boolean realConflict = overlaps.stream().anyMatch(x
                        -> x.getGroupId() == null || !x.getGroupId().equals(groupId)
                );

                if (realConflict) {
                    conflicts.add("Sala " + r.getRoom().getCode()
                            + " " + r.getStartDateTime().toLocalTime()
                            + "-" + r.getEndDateTime().toLocalTime());
                }
            }

            if (!conflicts.isEmpty()) {
                return ResponseEntity.badRequest().body(
                        "Ne moze da se odobri grupa. Konflikti: " + String.join(", ", conflicts)
                );
            }

            // approve sve stavke
            for (Reservation r : groupItems) {
                r.setStatus(ReservationStatus.APPROVED);
            }

        } else {
            // reject sve stavke
            for (Reservation r : groupItems) {
                r.setStatus(ReservationStatus.REJECTED);
            }
        }

        reservationRepository.saveAll(groupItems);

        // history: upisi po stavci (najbrze, koristi postojecu tabelu)
        for (Reservation r : groupItems) {
            ReservationApproval a = new ReservationApproval();
            a.setReservation(r);
            a.setDecidedBy(admin);
            a.setDecision(req.getDecision());
            a.setComment(req.getComment());
            a.setDecidedAt(LocalDateTime.now());
            approvalRepository.save(a);
        }

        return ResponseEntity.ok(groupItems);
    }

}
