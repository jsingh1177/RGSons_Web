package MJC.RGSons.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import java.time.LocalDateTime;

@Document(collection = "quality")
public class Quality {
    
    @Id
    private String id;
    
    @Field("quality_code")
    private String qualityCode;
    
    @Field("quality_name")
    private String qualityName;
    
    @Field("status")
    private Boolean status;
    
    @Field("created_at")
    private LocalDateTime createdAt;
    
    @Field("update_at")
    private LocalDateTime updateAt;
    
    public Quality() {}
    
    public Quality(String qualityCode, String qualityName, Boolean status) {
        this.qualityCode = qualityCode;
        this.qualityName = qualityName;
        this.status = status;
        this.createdAt = LocalDateTime.now();
        this.updateAt = LocalDateTime.now();
    }
    
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getQualityCode() {
        return qualityCode;
    }
    
    public void setQualityCode(String qualityCode) {
        this.qualityCode = qualityCode;
    }
    
    public String getQualityName() {
        return qualityName;
    }
    
    public void setQualityName(String qualityName) {
        this.qualityName = qualityName;
    }
    
    public Boolean getStatus() {
        return status;
    }
    
    public void setStatus(Boolean status) {
        this.status = status;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdateAt() {
        return updateAt;
    }
    
    public void setUpdateAt(LocalDateTime updateAt) {
        this.updateAt = updateAt;
    }
}
