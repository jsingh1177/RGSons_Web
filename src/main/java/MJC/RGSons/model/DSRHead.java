package MJC.RGSons.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDateTime;

@Entity
@Table(name = "DSR_Head")
public class DSRHead {
    @Id
    @UuidGenerator
    private String id;

    @Column(name = "Store_Code")
    private String storeCode;

    @Column(name = "DSR_Date")
    private String dsrDate;

    @Column(name = "User_ID")
    private String userId;

    @Column(name = "DSR_Status")
    private String dsrStatus;

    @Column(name = "Created_at")
    private LocalDateTime createdAt;

    @Column(name = "Updated_at")
    private LocalDateTime updatedAt;

    public DSRHead() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getStoreCode() {
        return storeCode;
    }

    public void setStoreCode(String storeCode) {
        this.storeCode = storeCode;
    }

    public String getDsrDate() {
        return dsrDate;
    }

    public void setDsrDate(String dsrDate) {
        this.dsrDate = dsrDate;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getDsrStatus() {
        return dsrStatus;
    }

    public void setDsrStatus(String dsrStatus) {
        this.dsrStatus = dsrStatus;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
