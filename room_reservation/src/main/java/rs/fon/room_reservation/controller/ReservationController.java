/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package rs.fon.room_reservation.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

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

import rs.fon.room_reservation.dto.CreateReservationGroupRequest;

import rs.fon.room_reservation.dto.DecideReservationRequest;
import rs.fon.room_reservation.dto.ReservationApprovalResponse;

import rs.fon.room_reservation.dto.ReservationGroupResponse;
import rs.fon.room_reservation.dto.ScheduleResponse;
import rs.fon.room_reservation.model.entity.Reservation;

import rs.fon.room_reservation.service.ReservationService;

/**
 *
 * @author Aleksandar
 */
@RestController
@RequestMapping("/api/reservations")
@Tag(name = "Reservations", description = "Rezervacije sala + admin odobravanje/odbijanje")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @Operation(summary = "Vrati zauzete termine (samo APPROVED) za dati datum")
    @GetMapping
    public List<Reservation> approvedByDate(@RequestParam String date) {
        return reservationService.approvedByDate(date);
    }

    @Operation(summary = "Kreiraj rezervaciju GRUPNO (USER -> PENDING, ADMIN -> APPROVED)")
    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateReservationGroupRequest req) {
        return reservationService.createGroup(req);
    }

    @Operation(summary = "Vrati moje rezervacije (po userId)")
    @GetMapping("/my")
    public List<Reservation> myReservations(@RequestParam Long userId) {
        return reservationService.myReservations(userId);
    }

    @Operation(summary = "Otkazi rezervaciju (samo owner)")
    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id, @RequestBody CancelReservationRequest req) {
        return reservationService.cancel(id, req);
    }

    @Operation(summary = "Admin: lista PENDING rezervacija (jos uvek pojedinacne stavke)")
    @GetMapping("/pending")
    public List<Reservation> pending() {
        return reservationService.pendingItems();
    }

    @Operation(summary = "Admin: approve/reject (upis u history + update status)")
    @PostMapping("/{id}/decide")
    public ResponseEntity<?> decide(@PathVariable Long id, @RequestBody DecideReservationRequest req) {
        return reservationService.decideItem(id, req);
    }

    @GetMapping("/schedule")
    public ScheduleResponse schedule(@RequestParam String date) {
        return reservationService.schedule(date);
    }

    @Operation(summary = "Admin: lista PENDING rezervacija grupisano po groupId")
    @GetMapping("/pending-groups")
    public List<ReservationGroupResponse> pendingGroups() {
        return reservationService.pendingGroups();
    }

    @Operation(summary = "Admin: sve grupe za datum (APPROVED, PENDING, REJECTED)")
    @GetMapping("/day-groups")
    public List<ReservationGroupResponse> dayGroups(@RequestParam String date) {
        return reservationService.dayGroups(date);
    }

    @Operation(summary = "Admin: approve/reject CELE GRUPE (groupId) + history (radi i za APPROVED/REJECTED)")
    @PostMapping("/group/{groupId}/decide")
    public ResponseEntity<?> decideGroup(@PathVariable String groupId, @RequestBody DecideReservationRequest req) {
        return reservationService.decideGroup(groupId, req);
    }

    @Operation(summary = "Vrati approval history za celu grupu (groupId)")
    @GetMapping("/group/{groupId}/approvals")
    public List<ReservationApprovalResponse> groupApprovals(@PathVariable String groupId) {
        return reservationService.groupApprovals(groupId);
    }
}
