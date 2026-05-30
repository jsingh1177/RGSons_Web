package MJC.RGSons.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "STO_ledgers")
public class StoLedger {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "sto_id")
    private Integer stoId;

    @Column(name = "from_store")
    private String fromStore;

    @Column(name = "sto_number")
    private String stoNumber;

    @Column(name = "sto_date")
    private String stoDate;

    @Column(name = "tran_date")
    private LocalDate tranDate;

    @Column(name = "ledger_code")
    private String ledgerCode;

    @Column(name = "amount")
    private Double amount;

    @Column(name = "type")
    private String type;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getStoId() { return stoId; }
    public void setStoId(Integer stoId) { this.stoId = stoId; }

    public String getFromStore() { return fromStore; }
    public void setFromStore(String fromStore) { this.fromStore = fromStore; }

    public String getStoNumber() { return stoNumber; }
    public void setStoNumber(String stoNumber) { this.stoNumber = stoNumber; }

    public String getStoDate() { return stoDate; }
    public void setStoDate(String stoDate) { this.stoDate = stoDate; }

    public LocalDate getTranDate() { return tranDate; }
    public void setTranDate(LocalDate tranDate) { this.tranDate = tranDate; }

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

