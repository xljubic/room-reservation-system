/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package rs.fon.room_reservation.dto;

import java.time.LocalDateTime;
import rs.fon.room_reservation.model.enums.ApprovalDecision;

/**
 *
 * @author Aleksandar
 */
public class ReservationApprovalResponse {

    private Long id;
    private LocalDateTime decidedAt;
    private ApprovalDecision decision;
    private String comment;

    private String adminFirstName;
    private String adminLastName;

    public ReservationApprovalResponse() {
    }

    public ReservationApprovalResponse(Long id, LocalDateTime decidedAt, ApprovalDecision decision, String comment,
            String adminFirstName, String adminLastName) {
        this.id = id;
        this.decidedAt = decidedAt;
        this.decision = decision;
        this.comment = comment;
        this.adminFirstName = adminFirstName;
        this.adminLastName = adminLastName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LocalDateTime getDecidedAt() {
        return decidedAt;
    }

    public void setDecidedAt(LocalDateTime decidedAt) {
        this.decidedAt = decidedAt;
    }

    public ApprovalDecision getDecision() {
        return decision;
    }

    public void setDecision(ApprovalDecision decision) {
        this.decision = decision;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public String getAdminFirstName() {
        return adminFirstName;
    }

    public void setAdminFirstName(String adminFirstName) {
        this.adminFirstName = adminFirstName;
    }

    public String getAdminLastName() {
        return adminLastName;
    }

    public void setAdminLastName(String adminLastName) {
        this.adminLastName = adminLastName;
    }
}
