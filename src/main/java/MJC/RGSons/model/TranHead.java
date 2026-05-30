package MJC.RGSons.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "tran_head")
public class TranHead {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "invoice_no")
    private String invoiceNo;

    @Column(name = "invoice_date")
    private String invoiceDate;

    @Column(name = "tran_date")
    private LocalDate tranDate;

    @Column(name = "party_code")
    private String partyCode;

    @Column(name = "sale_amount")
    private Double saleAmount;

    @Column(name = "total_amount")
    private Double totalAmount;

    @Column(name = "other_sale")
    private Double otherSale;

    @Column(name = "total_expenses")
    private Double totalExpenses;

    @Column(name = "total_tender")
    private Double totalTender;

    @Column(name = "tender_type")
    private String tenderType;

    @Column(name = "store_code")
    private String storeCode;

    @Column(name = "Narration")
    private String narration;

    @Column(name = "status")
    private String status;

    @Column(name = "User_name")
    private String userName;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "total_qty")
    private Integer totalQty;

    @Column(name = "Tally_Sync")
    private String tallySync = "0";

    public TranHead() {
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

    // Getters and Setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }
    public String getInvoiceNo() { return invoiceNo; }
    public void setInvoiceNo(String invoiceNo) { this.invoiceNo = invoiceNo; }
    public String getInvoiceDate() { return invoiceDate; }
    public void setInvoiceDate(String invoiceDate) { this.invoiceDate = invoiceDate; }
    public LocalDate getTranDate() { return tranDate; }
    public void setTranDate(LocalDate tranDate) { this.tranDate = tranDate; }
    public String getPartyCode() { return partyCode; }
    public void setPartyCode(String partyCode) { this.partyCode = partyCode; }
    
    public Double getSaleAmount() { return saleAmount; }
    public void setSaleAmount(Double saleAmount) { this.saleAmount = saleAmount; }

    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

    public Double getOtherSale() { return otherSale; }
    public void setOtherSale(Double otherSale) { this.otherSale = otherSale; }

    public Double getTotalExpenses() { return totalExpenses; }
    public void setTotalExpenses(Double totalExpenses) { this.totalExpenses = totalExpenses; }

    public Double getTotalTender() { return totalTender; }
    public void setTotalTender(Double totalTender) { this.totalTender = totalTender; }

    public String getTenderType() { return tenderType; }
    public void setTenderType(String tenderType) { this.tenderType = tenderType; }
    public String getStoreCode() { return storeCode; }
    public void setStoreCode(String storeCode) { this.storeCode = storeCode; }

    public String getNarration() { return narration; }
    public void setNarration(String narration) { this.narration = narration; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Integer getTotalQty() { return totalQty; }
    public void setTotalQty(Integer totalQty) { this.totalQty = totalQty; }

    public String getTallySync() { return tallySync; }
    public void setTallySync(String tallySync) { this.tallySync = tallySync; }
}
