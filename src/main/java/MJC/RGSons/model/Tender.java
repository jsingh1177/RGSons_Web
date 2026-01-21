package MJC.RGSons.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "tender")
public class Tender {
    @Id
    @UuidGenerator
    @Column(name = "id")
    private String id;

    @Column(name = "tender_name")
    private String tenderName;

    @Column(name = "tender_code")
    private String tenderCode;

    @Column(name = "active")
    private Boolean active = true;

    public Tender() {}

    public Tender(String tenderName, String tenderCode, Boolean active) {
        this.tenderName = tenderName;
        this.tenderCode = tenderCode;
        this.active = active;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTenderName() { return tenderName; }
    public void setTenderName(String tenderName) { this.tenderName = tenderName; }
    public String getTenderCode() { return tenderCode; }
    public void setTenderCode(String tenderCode) { this.tenderCode = tenderCode; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    
    // Alias for frontend convenience
    public String getName() { return tenderName; }
}
