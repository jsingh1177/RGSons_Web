package MJC.RGSons.model;

import jakarta.persistence.*;

@Entity
@Table(name = "tender")
public class Tender {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tender_name", nullable = false)
    private String tenderName;

    @Column(name = "tender_code", unique = true, nullable = false)
    private String tenderCode;

    @Column(name = "active")
    private Boolean active = true;

    public Tender() {}

    public Tender(String tenderName, String tenderCode, Boolean active) {
        this.tenderName = tenderName;
        this.tenderCode = tenderCode;
        this.active = active;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTenderName() { return tenderName; }
    public void setTenderName(String tenderName) { this.tenderName = tenderName; }
    public String getTenderCode() { return tenderCode; }
    public void setTenderCode(String tenderCode) { this.tenderCode = tenderCode; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    
    // Alias for frontend convenience
    public String getName() { return tenderName; }
}
