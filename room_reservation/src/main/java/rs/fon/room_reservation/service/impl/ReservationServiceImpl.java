/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package rs.fon.room_reservation.service.impl;


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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rs.fon.room_reservation.dto.CancelReservationRequest;
import rs.fon.room_reservation.dto.CreateReservationGroupItemRequest;
import rs.fon.room_reservation.dto.CreateReservationGroupRequest;
import rs.fon.room_reservation.dto.DecideReservationRequest;
import rs.fon.room_reservation.dto.ReservationApprovalResponse;
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
import rs.fon.room_reservation.service.ReservationService;

/**
 *
 * @author Aleksandar
 */
@Service
public class ReservationServiceImpl implements ReservationService {

    private final ReservationRepository reservationRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final ReservationApprovalRepository approvalRepository;

    public ReservationServiceImpl(
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

    @Override
    public List<Reservation> approvedByDate(String date) {
        LocalDate d = LocalDate.parse(date);
        LocalDateTime from = d.atStartOfDay();
        LocalDateTime to = d.plusDays(1).atStartOfDay();
        return reservationRepository.findByStatusAndStartDateTimeGreaterThanEqualAndStartDateTimeLessThan(
                ReservationStatus.APPROVED, from, to
        );
    }

    @Override
    @Transactional
    public ResponseEntity<?> createGroup(CreateReservationGroupRequest req) {
        if (req == null || req.getCreatedById() == null || req.getDate() == null
                || req.getPurpose() == null || req.getName() == null
                || req.getItems() == null || req.getItems().isEmpty()) {
            return ResponseEntity.badRequest().body("Missing required fields (createdById, date, purpose, name, items). ");
        }

        User user = userRepository.findById(req.getCreatedById()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body("User not found.");
        }

        ReservationStatus status = (user.getRole() == UserRole.ADMIN)
                ? ReservationStatus.APPROVED
                : ReservationStatus.PENDING;

        LocalTime workStart = LocalTime.of(8, 0);
        LocalTime workEnd = LocalTime.of(20, 0);

        String groupId = UUID.randomUUID().toString();
        LocalDate date = req.getDate();
        LocalDateTime createdAt = LocalDateTime.now();

        List<ReservationStatus> blockedStatuses = List.of(ReservationStatus.PENDING, ReservationStatus.APPROVED);
        List<Reservation> toSave = new ArrayList<>();

        for (CreateReservationGroupItemRequest item : req.getItems()) {
            if (item == null || item.getRoomId() == null || item.getStartTime() == null || item.getEndTime() == null) {
                return ResponseEntity.badRequest().body("Each item must have roomId, startTime, endTime.");
            }

            LocalTime startT;
            LocalTime endT;
            try {
                startT = LocalTime.parse(item.getStartTime());
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

            boolean hasOverlap = !reservationRepository
                    .findOverlapsWithStatuses(room.getId(), blockedStatuses, start, end)
                    .isEmpty();
            if (hasOverlap) {
                return ResponseEntity.badRequest().body(
                        "Ne moze da se rezervise: sala " + room.getCode() + " u terminu "
                        + item.getStartTime() + "-" + item.getEndTime()
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
            r.setCreatedAt(createdAt);

            toSave.add(r);
        }

        List<Reservation> saved = reservationRepository.saveAll(toSave);
        return ResponseEntity.ok(saved);
    }

    @Override
    public List<Reservation> myReservations(Long userId) {
        return reservationRepository.findByCreatedByIdOrderByStartDateTimeDesc(userId);
    }

    @Override
    @Transactional
    public ResponseEntity<?> cancel(Long reservationId, CancelReservationRequest req) {
        Reservation r = reservationRepository.findById(reservationId).orElse(null);
        if (r == null) {
            return ResponseEntity.notFound().build();
        }

        if (req == null || req.getUserId() == null) {
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

    @Override
    public List<Reservation> pendingItems() {
        return reservationRepository.findByStatusOrderByCreatedAtAsc(ReservationStatus.PENDING);
    }

    @Override
    @Transactional
    public ResponseEntity<?> decideItem(Long reservationId, DecideReservationRequest req) {
        Reservation r = reservationRepository.findById(reservationId).orElse(null);
        if (r == null) {
            return ResponseEntity.notFound().build();
        }

        if (req == null || req.getAdminId() == null || req.getDecision() == null) {
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

    @Override
    public ScheduleResponse schedule(String date) {
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
        var rejected = reservationRepository.findByStatusOverlappingRange(
                ReservationStatus.REJECTED, from, to
        );

        ScheduleResponse resp = new ScheduleResponse();
        resp.setDate(date);
        resp.setDayStart("08:00");
        resp.setDayEnd("20:00");
        resp.setSlotMinutes(30);
        resp.setRooms(rooms);
        resp.setApprovedReservations(approved);
        resp.setPendingReservations(pending);
        resp.setRejectedReservations(rejected);

        return resp;
    }

    @Override
    public List<ReservationGroupResponse> pendingGroups() {
        List<Reservation> pendingItems = reservationRepository
                .findByStatusAndGroupIdIsNotNullOrderByCreatedAtAsc(ReservationStatus.PENDING);

        Map<String, ReservationGroupResponse> map = new LinkedHashMap<>();

        for (Reservation r : pendingItems) {
            ReservationGroupResponse grp = map.computeIfAbsent(r.getGroupId(), gid -> createGroupHeader(r));
            grp.getItems().add(toItemResponse(r));
        }

        return new ArrayList<>(map.values());
    }

    @Override
    public List<ReservationGroupResponse> dayGroups(String date) {
        LocalDate d = LocalDate.parse(date);
        LocalDateTime from = d.atStartOfDay();
        LocalDateTime to = d.plusDays(1).atStartOfDay();

        List<ReservationStatus> statuses = List.of(
                ReservationStatus.APPROVED,
                ReservationStatus.PENDING,
                ReservationStatus.REJECTED
        );

        List<Reservation> items = reservationRepository
                .findByGroupIdIsNotNullAndStartDateTimeGreaterThanEqualAndStartDateTimeLessThanAndStatusInOrderByStartDateTimeAsc(
                        from, to, statuses
                );

        Map<String, ReservationGroupResponse> map = new LinkedHashMap<>();

        for (Reservation r : items) {
            ReservationGroupResponse grp = map.computeIfAbsent(r.getGroupId(), gid -> createGroupHeader(r));
            grp.getItems().add(toItemResponse(r));
        }

        return new ArrayList<>(map.values());
    }

    @Override
    @Transactional
    public ResponseEntity<?> decideGroup(String groupId, DecideReservationRequest req) {
        if (req == null || req.getAdminId() == null || req.getDecision() == null) {
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

        Reservation first = groupItems.get(0);
        ReservationStatus currentStatus = first.getStatus();
        User creator = first.getCreatedBy();

        if (req.getDecision() == ApprovalDecision.REJECTED && creator != null && creator.getRole() == UserRole.ADMIN) {
            return ResponseEntity.status(403).body("Admin reservations cannot be rejected. Cancel only from My Reservations.");
        }

        if (req.getDecision() == ApprovalDecision.APPROVED && currentStatus == ReservationStatus.APPROVED) {
            return ResponseEntity.ok(groupItems);
        }
        if (req.getDecision() == ApprovalDecision.REJECTED && currentStatus == ReservationStatus.REJECTED) {
            return ResponseEntity.ok(groupItems);
        }

        if (req.getDecision() == ApprovalDecision.APPROVED) {
            List<ReservationStatus> blocked = List.of(ReservationStatus.PENDING, ReservationStatus.APPROVED);
            List<String> conflicts = new ArrayList<>();

            for (Reservation r : groupItems) {
                List<Reservation> overlaps = reservationRepository.findOverlapsWithStatuses(
                        r.getRoom().getId(),
                        blocked,
                        r.getStartDateTime(),
                        r.getEndDateTime()
                );

                boolean realConflict = overlaps.stream()
                        .anyMatch(x -> x.getGroupId() == null || !x.getGroupId().equals(groupId));

                if (realConflict) {
                    conflicts.add("Sala " + r.getRoom().getCode() + " "
                            + r.getStartDateTime().toLocalTime() + "-" + r.getEndDateTime().toLocalTime());
                }
            }

            if (!conflicts.isEmpty()) {
                return ResponseEntity.badRequest().body("Ne moze da se odobri grupa. Konflikti: " + String.join(", ", conflicts));
            }

            for (Reservation r : groupItems) {
                r.setStatus(ReservationStatus.APPROVED);
            }
        } else {
            for (Reservation r : groupItems) {
                r.setStatus(ReservationStatus.REJECTED);
            }
        }

        reservationRepository.saveAll(groupItems);

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

    @Override
    public List<ReservationApprovalResponse> groupApprovals(String groupId) {
        List<ReservationApproval> approvals = approvalRepository
                .findByReservation_GroupIdOrderByDecidedAtAsc(groupId);

        List<ReservationApprovalResponse> resp = new ArrayList<>();
        for (ReservationApproval a : approvals) {
            String fn = a.getDecidedBy() != null ? a.getDecidedBy().getFirstName() : null;
            String ln = a.getDecidedBy() != null ? a.getDecidedBy().getLastName() : null;
            resp.add(new ReservationApprovalResponse(
                    a.getId(),
                    a.getDecidedAt(),
                    a.getDecision(),
                    a.getComment(),
                    fn,
                    ln
            ));
        }
        return resp;
    }

    private ReservationGroupResponse createGroupHeader(Reservation r) {
        ReservationGroupResponse grp = new ReservationGroupResponse();
        grp.setGroupId(r.getGroupId());
        grp.setCreatedById(r.getCreatedBy().getId());
        grp.setCreatedByEmail(r.getCreatedBy().getEmail());
        grp.setCreatedByRole(r.getCreatedBy().getRole());
        grp.setPurpose(r.getPurpose());
        grp.setName(r.getName());
        grp.setStatus(r.getStatus());
        grp.setCreatedAt(r.getCreatedAt());
        grp.setItems(new ArrayList<>());
        return grp;
    }

    private ReservationGroupItemResponse toItemResponse(Reservation r) {
        ReservationGroupItemResponse item = new ReservationGroupItemResponse();
        item.setId(r.getId());
        item.setRoomId(r.getRoom().getId());
        item.setRoomCode(r.getRoom().getCode());
        item.setStartDateTime(r.getStartDateTime());
        item.setEndDateTime(r.getEndDateTime());
        item.setDescription(r.getDescription());
        return item;
    }
}
