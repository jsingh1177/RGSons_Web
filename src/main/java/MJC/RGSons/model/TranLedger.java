package MJC.RGSons.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import java.time.LocalDateTime;

@Document(collection = "tran_ledgers")
public class TranLedger {

    @Id
    private String id;

    @Field("tran_id")
    private String tranId;

    @Field("invoice_no")
    private String invoiceNo;

    @Field("invoice_date")
    private String invoiceDate;

    @Field("store_code")
    private String storeCode;

    @Field("ledger_code")
    private String ledgerCode;

    @Field("amount")
    private Double amount;

    @Field("type")
    private String type; // "Other Sale", "Expense", "Tender"

    @Field("created_at")
    private LocalDateTime createdAt;

    @Field("updated_at")
    private LocalDateTime updatedAt;

    public TranLedger() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public TranLedger(String tranId, String invoiceNo, String invoiceDate, String storeCode, String ledgerCode, Double amount, String type) {
        this.tranId = tranId;
        this.invoiceNo = invoiceNo;
        this.invoiceDate = invoiceDate;
        this.storeCode = storeCode;
        this.ledgerCode = ledgerCode;
        this.amount = amount;
        this.type = type;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTranId() { return tranId; }
    public void setTranId(String tranId) { this.tranId = tranId; }

    public String getInvoiceNo() { return invoiceNo; }
    public void setInvoiceNo(String invoiceNo) { this.invoiceNo = invoiceNo; }

    public String getInvoiceDate() { return invoiceDate; }
    public void setInvoiceDate(String invoiceDate) { this.invoiceDate = invoiceDate; }

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
