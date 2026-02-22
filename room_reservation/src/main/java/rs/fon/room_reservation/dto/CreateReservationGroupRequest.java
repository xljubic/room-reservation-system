/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package rs.fon.room_reservation.dto;

import java.time.LocalDate;
import java.util.List;
import rs.fon.room_reservation.model.enums.ReservationPurpose;

/**
 *
 * @author Aleksandar
 */
public class CreateReservationGroupRequest {

    private Long createdById;
    private LocalDate date; // isti datum za sve
    private ReservationPurpose purpose;
    private String name;
    private List<CreateReservationGroupItemRequest> items;

    public Long getCreatedById() {
        return createdById;
    }

    public void setCreatedById(Long createdById) {
        this.createdById = createdById;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
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

    public List<CreateReservationGroupItemRequest> getItems() {
        return items;
    }

    public void setItems(List<CreateReservationGroupItemRequest> items) {
        this.items = items;
    }
}
