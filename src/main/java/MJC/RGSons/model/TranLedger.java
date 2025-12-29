package MJC.RGSons.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "tran_ledgers")
public class TranLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tran_id", nullable = false)
    private Long tranId;

    @Column(name = "invoice_no", nullable = true)
    private String invoiceNo;

    @Column(name = "invoice_date", nullable = true)
    private LocalDate invoiceDate;

    @Column(name = "store_code", nullable = true)
    private String storeCode;

    @Column(name = "ledger_code", nullable = false)
    private String ledgerCode;

    @Column(name = "amount", nullable = false)
    private Double amount;

    @Column(name = "type", nullable = false)
    private String type; // "Other Sale", "Expense", "Tender"

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public TranLedger() {}

    public TranLedger(Long tranId, String invoiceNo, LocalDate invoiceDate, String storeCode, String ledgerCode, Double amount, String type) {
        this.tranId = tranId;
        this.invoiceNo = invoiceNo;
        this.invoiceDate = invoiceDate;
        this.storeCode = storeCode;
        this.ledgerCode = ledgerCode;
        this.amount = amount;
        this.type = type;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTranId() { return tranId; }
    public void setTranId(Long tranId) { this.tranId = tranId; }

    public String getInvoiceNo() { return invoiceNo; }
    public void setInvoiceNo(String invoiceNo) { this.invoiceNo = invoiceNo; }

    public LocalDate getInvoiceDate() { return invoiceDate; }
    public void setInvoiceDate(LocalDate invoiceDate) { this.invoiceDate = invoiceDate; }

    public String getStoreCode() { return storeCode; }
    public void setStoreCode(String storeCode) { this.storeCode = storeCode; }

    public String getLedgerCode() { return ledgerCode; }
    public void setLedgerCode(String ledgerCode) { this.ledgerCode = ledgerCode; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
