package MJC.RGSons.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import java.time.LocalDateTime;

@Document(collection = "DSR_Head")
public class DSRHead {
    @Id
    private String id;

    @Field("Store_Code")
    private String storeCode;

    @Field("DSR_Date")
    private String dsrDate;

    @Field("User_ID")
    private String userId;

    @Field("DSR_Status")
    private String dsrStatus;

    @Field("Created_at")
    private LocalDateTime createdAt;

    @Field("Updated_at")
    private LocalDateTime updatedAt;

    public DSRHead() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getStoreCode() {
        return storeCode;
    }

    public void setStoreCode(String storeCode) {
        this.storeCode = storeCode;
    }

    public String getDsrDate() {
        return dsrDate;
    }

    public void setDsrDate(String dsrDate) {
        this.dsrDate = dsrDate;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getDsrStatus() {
        return dsrStatus;
    }

    public void setDsrStatus(String dsrStatus) {
        this.dsrStatus = dsrStatus;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
