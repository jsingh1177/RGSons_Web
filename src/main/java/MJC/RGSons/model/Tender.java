package MJC.RGSons.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "tender")
public class Tender {
    @Id
    private String id;

    @Field("tender_name")
    private String tenderName;

    @Field("tender_code")
    private String tenderCode;

    @Field("active")
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
