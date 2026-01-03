package MJC.RGSons.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import java.time.LocalDateTime;

@Document(collection = "user_store_map")
public class UserStoreMap {
    
    @Id
    private String id;
    
    @Field("user_name")
    private String userName;
    
    @Field("store_code")
    private String storeCode;
    
    @Field("created_at")
    private LocalDateTime createdAt;
    
    @Field("update_at")
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
