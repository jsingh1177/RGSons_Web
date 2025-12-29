package MJC.RGSons.model;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_store_map")
@IdClass(UserStoreMap.UserStoreMapId.class)
public class UserStoreMap {
    
    @Id
    @Column(name = "user_name", nullable = false, length = 100)
    private String userName;
    
    @Id
    @Column(name = "store_code", nullable = false, length = 50)
    private String storeCode;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "update_at", nullable = false)
    private LocalDateTime updateAt;
    
    // Default constructor
    public UserStoreMap() {}
    
    // Constructor with parameters
    public UserStoreMap(String userName, String storeCode) {
        this.userName = userName;
        this.storeCode = storeCode;
        this.createdAt = LocalDateTime.now();
        this.updateAt = LocalDateTime.now();
    }
    
    // Getters and Setters
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
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updateAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updateAt = LocalDateTime.now();
    }
    
    @Override
    public String toString() {
        return "UserStoreMap{" +
                "userName='" + userName + '\'' +
                ", storeCode='" + storeCode + '\'' +
                ", createdAt=" + createdAt +
                ", updateAt=" + updateAt +
                '}';
    }
    
    // Composite Primary Key Class
    public static class UserStoreMapId implements Serializable {
        private String userName;
        private String storeCode;
        
        public UserStoreMapId() {}
        
        public UserStoreMapId(String userName, String storeCode) {
            this.userName = userName;
            this.storeCode = storeCode;
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
        
        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            UserStoreMapId that = (UserStoreMapId) o;
            return userName.equals(that.userName) && storeCode.equals(that.storeCode);
        }
        
        @Override
        public int hashCode() {
            return userName.hashCode() + storeCode.hashCode();
        }
    }
}