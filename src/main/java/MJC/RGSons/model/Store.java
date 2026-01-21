package MJC.RGSons.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import org.hibernate.annotations.UuidGenerator;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Entity
@Table(name = "store")
public class Store {
    
    @Id
    @UuidGenerator
    private String id;
    
    @Column(name = "store_code")
    private String storeCode;
    
    @Column(name = "store_name")
    private String storeName;
    
    @Column(name = "address")
    private String address;
    
    @Column(name = "area")
    private String area;
    
    @Column(name = "zone")
    private String zone;
    
    @Column(name = "district")
    private String district;
    
    @Column(name = "city")
    private String city;
    
    @Column(name = "pin")
    private String pin;
    
    @Column(name = "phone")
    private String phone;
    
    @Column(name = "email")
    private String email;
    
    @Column(name = "gst_number")
    private String gstNumber;
    
    @Column(name = "vat_no")
    private String vatNo;
    
    @Column(name = "pan_no")
    private String panNo;
    
    @Column(name = "state")
    private String state;
    
    @Column(name = "status")
    private Boolean status;

    @Column(name = "Open_Status")
    private Boolean openStatus;

    @Column(name = "store_type")
    private String storeType;

    @Column(name = "business_date")
    private String businessDate;
    
    @jakarta.persistence.Transient
    private String currentUserId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "update_at")
    private LocalDateTime updateAt;
    
    // Default constructor
    public Store() {}
    
    // Constructor with required fields
    public Store(String storeCode, String storeName) {
        this.storeCode = storeCode;
        this.storeName = storeName;
        this.status = true;
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
    
    public String getStoreCode() {
        return storeCode;
    }

    public String getStoreType() {
        return storeType;
    }

    public void setStoreType(String storeType) {
        this.storeType = storeType;
    }
    
    public void setStoreCode(String storeCode) {
        this.storeCode = storeCode;
    }
    
    public String getStoreName() {
        return storeName;
    }
    
    public void setStoreName(String storeName) {
        this.storeName = storeName;
    }
    
    public String getAddress() {
        return address;
    }
    
    public void setAddress(String address) {
        this.address = address;
    }
    
    public String getVatNo() {
        return vatNo;
    }

    public void setVatNo(String vatNo) {
        this.vatNo = vatNo;
    }

    public String getPanNo() {
        return panNo;
    }

    public void setPanNo(String panNo) {
        this.panNo = panNo;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getArea() {
        return area;
    }

    public void setArea(String area) {
        this.area = area;
    }

    public String getZone() {
        return zone;
    }

    public void setZone(String zone) {
        this.zone = zone;
    }

    public String getDistrict() {
        return district;
    }

    public void setDistrict(String district) {
        this.district = district;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getPin() {
        return pin;
    }

    public void setPin(String pin) {
        this.pin = pin;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getGstNumber() {
        return gstNumber;
    }

    public void setGstNumber(String gstNumber) {
        this.gstNumber = gstNumber;
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

    public Boolean getOpenStatus() {
        return openStatus;
    }

    public void setOpenStatus(Boolean openStatus) {
        this.openStatus = openStatus;
    }

    public String getBusinessDate() {
        return businessDate;
    }
    
    public void setBusinessDate(String businessDate) {
        this.businessDate = businessDate;
    }

    public String getCurrentUserId() {
        return currentUserId;
    }

    public void setCurrentUserId(String currentUserId) {
        this.currentUserId = currentUserId;
    }
}
