package MJC.RGSons.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "Ledger_Map",
        uniqueConstraints = @UniqueConstraint(name = "UK_ledger_Map", columnNames = {"Ledger_code", "type", "screen"})
)
public class LedgerMap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "Ledger_code")
    private String ledgerCode;

    @Column(name = "screen")
    private String screen;

    @Column(name = "type")
    private String type;

    @Column(name = "status")
    private Integer status;

    @Column(name = "Perc")
    private Double perc;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getLedgerCode() {
        return ledgerCode;
    }

    public void setLedgerCode(String ledgerCode) {
        this.ledgerCode = ledgerCode;
    }

    public String getScreen() {
        return screen;
    }

    public void setScreen(String screen) {
        this.screen = screen;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public Double getPerc() {
        return perc;
    }

    public void setPerc(Double perc) {
        this.perc = perc;
    }
}
