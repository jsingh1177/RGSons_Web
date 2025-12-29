package MJC.RGSons.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "quality")
public class Quality {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "quality_code", nullable = true, unique = true, length = 50)
    private String qualityCode;
    
    @Column(name = "quality_name", length = 100)
    private String qualityName;
    
    @Column(name = "status")
    private Boolean status;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "update_at")
    private LocalDateTime updateAt;
    
    public Quality() {}
    
    public Quality(String qualityCode, String qualityName, Boolean status) {
        this.qualityCode = qualityCode;
        this.qualityName = qualityName;
        this.status = status;
        this.createdAt = LocalDateTime.now();
        this.updateAt = LocalDateTime.now();
    }
    
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
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
