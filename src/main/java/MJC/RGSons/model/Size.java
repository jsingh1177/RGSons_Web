package MJC.RGSons.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "size")
public class Size {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "code", nullable = true, unique = true, length = 50)
    private String code;
    
    @Column(name = "name", length = 100)
    private String name;
    
    @Column(name = "status")
    private Boolean status;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "update_at")
    private LocalDateTime updateAt;
    
    public Size() {}
    
    public Size(String code, String name, Boolean status) {
        this.code = code;
        this.name = name;
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
    
    public String getCode() {
        return code;
    }
    
    public void setCode(String code) {
        this.code = code;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
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