package MJC.RGSons.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "tender_type")
public class TenderType {
    @Id
    private String id;

    @Field("tender_code")
    private String tenderCode;

    @Field("name")
    private String name;

    @Field("status")
    private Boolean status;

    public TenderType() {}

    public TenderType(String tenderCode, String name, Boolean status) {
        this.tenderCode = tenderCode;
        this.name = name;
        this.status = status;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTenderCode() { return tenderCode; }
    public void setTenderCode(String tenderCode) { this.tenderCode = tenderCode; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Boolean getStatus() { return status; }
    public void setStatus(Boolean status) { this.status = status; }
}
