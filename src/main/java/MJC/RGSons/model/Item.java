package MJC.RGSons.model;

import jakarta.persistence.*;

@Entity
@Table(name = "items")
public class Item {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_code", unique = true, nullable = false)
    private String itemCode;

    @Column(name = "item_name", nullable = false, unique = true)
    private String itemName;

    @Column(name = "sale_price", nullable = true)
    private Double mrp;

    @Column(name = "brand_code", nullable = true)
    private String brandCode;

    @Column(name = "category_code", nullable = true)
    private String categoryCode;

    @Column(name = "created_at", nullable = true)
    private java.time.LocalDateTime createdAt;

    @Column(name = "update_at", nullable = true)
    private java.time.LocalDateTime updateAt;

    @Column(name = "pur_price", nullable = true)
    private Double purchasePrice;

    @Column(name = "size", nullable = true)
    private String size;

    @Column(name = "status", nullable = true)
    private Boolean status;

    public Item() {}

    public Item(String itemCode, String itemName, Double mrp) {
        this.itemCode = itemCode;
        this.itemName = itemName;
        this.mrp = mrp;
        this.brandCode = "DEFAULT";
        this.categoryCode = "DEFAULT";
        this.createdAt = java.time.LocalDateTime.now();
        this.purchasePrice = 0.0;
        this.size = "DEFAULT";
        this.status = true; // Default status to avoid DB errors
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getItemCode() { return itemCode; }
    public void setItemCode(String itemCode) { this.itemCode = itemCode; }
    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }
    public Double getMrp() { return mrp; }
    public void setMrp(Double mrp) { 
        this.mrp = mrp; 
    }
    public String getBrandCode() { return brandCode; }
    public void setBrandCode(String brandCode) { this.brandCode = brandCode; }
    public String getCategoryCode() { return categoryCode; }
    public void setCategoryCode(String categoryCode) { this.categoryCode = categoryCode; }
    public java.time.LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(java.time.LocalDateTime createdAt) { this.createdAt = createdAt; }
    public java.time.LocalDateTime getUpdateAt() { return updateAt; }
    public void setUpdateAt(java.time.LocalDateTime updateAt) { this.updateAt = updateAt; }
    public Double getPurchasePrice() { return purchasePrice; }
    public void setPurchasePrice(Double purchasePrice) { this.purchasePrice = purchasePrice; }
    public String getSize() { return size; }
    public void setSize(String size) { this.size = size; }
    public Boolean getStatus() { return status; }
    public void setStatus(Boolean status) { this.status = status; }
}
