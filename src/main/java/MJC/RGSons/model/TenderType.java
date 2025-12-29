package MJC.RGSons.model;

import jakarta.persistence.*;

@Entity
@Table(name = "tender_type")
public class TenderType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tender_code", unique = true, nullable = false)
    private String tenderCode;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "status")
    private Boolean status;

    public TenderType() {}

    public TenderType(String tenderCode, String name, Boolean status) {
        this.tenderCode = tenderCode;
        this.name = name;
        this.status = status;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTenderCode() { return tenderCode; }
    public void setTenderCode(String tenderCode) { this.tenderCode = tenderCode; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Boolean getStatus() { return status; }
    public void setStatus(Boolean status) { this.status = status; }
}
