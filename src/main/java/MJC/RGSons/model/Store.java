package MJC.RGSons.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "store")
public class Store {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "store_code", nullable = false, unique = true, length = 50)
    private String storeCode;
    
    @Column(name = "store_name", nullable = false, length = 200)
    private String storeName;
    
    @Column(name = "address", length = 500)
    private String address;
    
    @Column(name = "area", length = 100)
    private String area;
    
    @Column(name = "zone", length = 100)
    private String zone;
    
    @Column(name = "district", length = 100)
    private String district;
    
    @Column(name = "city", length = 100)
    private String city;
    
    @Column(name = "pin", length = 10)
    private String pin;
    
    @Column(name = "phone", length = 15)
    private String phone;
    
    @Column(name = "email", length = 100)
    private String email;
    
    @Column(name = "gst_number", length = 15)
    private String gstNumber;
    
    @Column(name = "status", nullable = false)
    private Boolean status;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "update_at", nullable = false)
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
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getStoreCode() {
        return storeCode;
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
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updateAt = LocalDateTime.now();
        if (status == null) {
            status = true;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updateAt = LocalDateTime.now();
    }
    
    @Override
    public String toString() {
        return "Store{" +
                "id=" + id +
                ", storeCode='" + storeCode + '\'' +
                ", storeName='" + storeName + '\'' +
                ", address='" + address + '\'' +
                ", area='" + area + '\'' +
                ", zone='" + zone + '\'' +
                ", district='" + district + '\'' +
                ", city='" + city + '\'' +
                ", pin='" + pin + '\'' +
                ", phone='" + phone + '\'' +
                ", email='" + email + '\'' +
                ", gstNumber='" + gstNumber + '\'' +
                ", status=" + status +
                ", createdAt=" + createdAt +
                ", updateAt=" + updateAt +
                '}';
    }
}