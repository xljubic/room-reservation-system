/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package rs.fon.room_reservation.dto;

import java.time.LocalDateTime;
import java.util.List;
import rs.fon.room_reservation.model.enums.ReservationPurpose;
import rs.fon.room_reservation.model.enums.ReservationStatus;

/**
 *
 * @author Aleksandar
 */
public class ReservationGroupResponse {

    private String groupId;
    private Long createdById;
    private String createdByEmail;
    private ReservationPurpose purpose;
    private String name;
    private ReservationStatus status;
    private LocalDateTime createdAt;

    private List<ReservationGroupItemResponse> items;

    public String getGroupId() {
        return groupId;
    }

    public void setGroupId(String groupId) {
        this.groupId = groupId;
    }

    public Long getCreatedById() {
        return createdById;
    }

    public void setCreatedById(Long createdById) {
        this.createdById = createdById;
    }

    public String getCreatedByEmail() {
        return createdByEmail;
    }

    public void setCreatedByEmail(String createdByEmail) {
        this.createdByEmail = createdByEmail;
    }

    public ReservationPurpose getPurpose() {
        return purpose;
    }

    public void setPurpose(ReservationPurpose purpose) {
        this.purpose = purpose;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public ReservationStatus getStatus() {
        return status;
    }

    public void setStatus(ReservationStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<ReservationGroupItemResponse> getItems() {
        return items;
    }

    public void setItems(List<ReservationGroupItemResponse> items) {
        this.items = items;
    }
}
