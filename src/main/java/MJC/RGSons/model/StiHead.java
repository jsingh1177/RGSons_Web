package MJC.RGSons.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import java.time.LocalDateTime;

@Entity
@Table(name = "sti_head")
public class StiHead {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "date")
    private String date;

    @Column(name = "sti_number")
    private String stiNumber;

    @Column(name = "sto_number")
    private String stoNumber;

    @Column(name = "sto_date")
    private String stoDate;

    @Column(name = "from_store")
    private String fromStore;

    @Column(name = "to_store")
    private String toStore;

    @Column(name = "user_name")
    private String userName;

    @Column(name = "narration")
    private String narration;

    @Column(name = "received_status")
    private String receivedStatus;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public StiHead() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.receivedStatus = "PENDING";
    }

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getStiNumber() { return stiNumber; }
    public void setStiNumber(String stiNumber) { this.stiNumber = stiNumber; }

    public String getStoNumber() { return stoNumber; }
    public void setStoNumber(String stoNumber) { this.stoNumber = stoNumber; }

    public String getStoDate() { return stoDate; }
    public void setStoDate(String stoDate) { this.stoDate = stoDate; }

    public String getFromStore() { return fromStore; }
    public void setFromStore(String fromStore) { this.fromStore = fromStore; }

    public String getToStore() { return toStore; }
    public void setToStore(String toStore) { this.toStore = toStore; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getNarration() { return narration; }
    public void setNarration(String narration) { this.narration = narration; }

    public String getReceivedStatus() { return receivedStatus; }
    public void setReceivedStatus(String receivedStatus) { this.receivedStatus = receivedStatus; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
