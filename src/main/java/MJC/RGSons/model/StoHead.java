package MJC.RGSons.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.FetchType;
import jakarta.persistence.Transient;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "STO_head")
public class StoHead {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "date")
    private String date;

    @Column(name = "tran_date")
    private LocalDate tranDate;

    @Column(name = "sto_number")
    private String stoNumber;

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

    @Column(name = "received_by")
    private String receivedBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "total_qty")
    private Integer totalQty;

    @Column(name = "Amount")
    private Double totalAmount;

    @JsonProperty("Tally_Sync")
    @Column(name = "Tally_Sync")
    private String tallySync = "0";

    @Column(name = "status")
    private String status;

    @OneToMany(fetch = FetchType.EAGER)
    @JoinColumn(name = "sto_number", referencedColumnName = "sto_number", insertable = false, updatable = false)
    @OrderBy("id ASC")
    private List<StoItem> items;

    @Transient
    private String fromStoreName;

    @Transient
    private String toStoreName;

    public StoHead() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.receivedStatus = "PENDING"; // Default status
    }

    @PrePersist
    protected void prePersist() {
        final LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public LocalDate getTranDate() { return tranDate; }
    public void setTranDate(LocalDate tranDate) { this.tranDate = tranDate; }

    public String getStoNumber() { return stoNumber; }
    public void setStoNumber(String stoNumber) { this.stoNumber = stoNumber; }

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

    public String getReceivedBy() { return receivedBy; }
    public void setReceivedBy(String receivedBy) { this.receivedBy = receivedBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Integer getTotalQty() { return totalQty; }
    public void setTotalQty(Integer totalQty) { this.totalQty = totalQty; }

    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

    public String getTallySync() { return tallySync; }
    public void setTallySync(String tallySync) { this.tallySync = tallySync; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<StoItem> getItems() { return items; }
    public void setItems(List<StoItem> items) { this.items = items; }

    public String getFromStoreName() { return fromStoreName; }
    public void setFromStoreName(String fromStoreName) { this.fromStoreName = fromStoreName; }

    public String getToStoreName() { return toStoreName; }
    public void setToStoreName(String toStoreName) { this.toStoreName = toStoreName; }
}
