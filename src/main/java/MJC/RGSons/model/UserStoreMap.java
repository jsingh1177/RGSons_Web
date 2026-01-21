package MJC.RGSons.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_store_map")
public class UserStoreMap {
    
    @Id
    @UuidGenerator
    private String id;
    
    @Column(name = "user_name")
    private String userName;
    
    @Column(name = "store_code")
    private String storeCode;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "update_at")
    private LocalDateTime updateAt;
    
    // Default constructor
    public UserStoreMap() {
        this.createdAt = LocalDateTime.now();
        this.updateAt = LocalDateTime.now();
    }
    
    // Constructor with parameters
    public UserStoreMap(String userName, String storeCode) {
        this.userName = userName;
        this.storeCode = storeCode;
        this.createdAt = LocalDateTime.now();
        this.updateAt = LocalDateTime.now();
    }
    
    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserName() {
        return userName;
    }
    
    public void setUserName(String userName) {
        this.userName = userName;
    }
    
    public String getStoreCode() {
        return storeCode;
    }
    
    public void setStoreCode(String storeCode) {
        this.storeCode = storeCode;
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
    
    @Override
    public String toString() {
        return "UserStoreMap{" +
                "id='" + id + '\'' +
                ", userName='" + userName + '\'' +
                ", storeCode='" + storeCode + '\'' +
                ", createdAt=" + createdAt +
                ", updateAt=" + updateAt +
                '}';
    }
}
