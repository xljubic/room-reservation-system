/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Interface.java to edit this template
 */
package rs.fon.room_reservation.service;

import java.util.List;
import org.springframework.http.ResponseEntity;
import rs.fon.room_reservation.dto.CancelReservationRequest;
import rs.fon.room_reservation.dto.CreateReservationGroupRequest;
import rs.fon.room_reservation.dto.DecideReservationRequest;
import rs.fon.room_reservation.dto.ReservationApprovalResponse;
import rs.fon.room_reservation.dto.ReservationGroupResponse;
import rs.fon.room_reservation.dto.ScheduleResponse;
import rs.fon.room_reservation.model.entity.Reservation;

/**
 *
 * @author Aleksandar
 */
public interface ReservationService {

    List<Reservation> approvedByDate(String date);

    ResponseEntity<?> createGroup(CreateReservationGroupRequest req);

    List<Reservation> myReservations(Long userId);

    ResponseEntity<?> cancel(Long reservationId, CancelReservationRequest req);

    List<Reservation> pendingItems();

    ResponseEntity<?> decideItem(Long reservationId, DecideReservationRequest req);

    ScheduleResponse schedule(String date);

    List<ReservationGroupResponse> pendingGroups();

    List<ReservationGroupResponse> dayGroups(String date);

    ResponseEntity<?> decideGroup(String groupId, DecideReservationRequest req);

    List<ReservationApprovalResponse> groupApprovals(String groupId);
}
