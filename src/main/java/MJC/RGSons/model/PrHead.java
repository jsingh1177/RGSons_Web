package MJC.RGSons.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "pr_head")
public class PrHead {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "store_code")
    private String storeCode;

    @Column(name = "tran_date")
    private LocalDate tranDate;

    @Column(name = "invoice_no")
    private String invoiceNo;

    @Column(name = "party_code")
    private String partyCode;

    @Column(name = "pur_led")
    private String purLed;

    @Column(name = "purchase_amount")
    private Double purchaseAmount;

    @Column(name = "total_amount")
    private Double totalAmount;

    @Column(name = "narration")
    private String narration;

    @Column(name = "Total_Qty")
    private Integer totalQty;

    @Column(name = "status")
    private String status;

    @Column(name = "Tally_Sync")
    private Boolean tallySync = false;

    @Column(name = "User_NAME")
    private String userName;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public PrHead() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
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

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getStoreCode() { return storeCode; }
    public void setStoreCode(String storeCode) { this.storeCode = storeCode; }

    public LocalDate getTranDate() { return tranDate; }
    public void setTranDate(LocalDate tranDate) { this.tranDate = tranDate; }

    public String getInvoiceNo() { return invoiceNo; }
    public void setInvoiceNo(String invoiceNo) { this.invoiceNo = invoiceNo; }

    public String getPartyCode() { return partyCode; }
    public void setPartyCode(String partyCode) { this.partyCode = partyCode; }

    public String getPurLed() { return purLed; }
    public void setPurLed(String purLed) { this.purLed = purLed; }

    public Double getPurchaseAmount() { return purchaseAmount; }
    public void setPurchaseAmount(Double purchaseAmount) { this.purchaseAmount = purchaseAmount; }

    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

    public String getNarration() { return narration; }
    public void setNarration(String narration) { this.narration = narration; }

    public Integer getTotalQty() { return totalQty; }
    public void setTotalQty(Integer totalQty) { this.totalQty = totalQty; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getTallySync() { return tallySync; }
    public void setTallySync(Boolean tallySync) { this.tallySync = tallySync; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

