package MJC.RGSons.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDateTime;

@Entity
@Table(name = "items")
public class Item {
    @Id
    @UuidGenerator
    private String id;

    @Column(name = "item_code")
    private String itemCode;

    @Column(name = "item_name")
    private String itemName;

    @Column(name = "sale_price")
    private Double mrp;

    @Column(name = "brand_code")
    private String brandCode;

    @Column(name = "category_code")
    private String categoryCode;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "update_at")
    private LocalDateTime updateAt;

    @Column(name = "pur_price")
    private Double purchasePrice;

    @Column(name = "size")
    private String size;

    @Column(name = "status")
    private Boolean status;

    public Item() {
        this.createdAt = LocalDateTime.now();
        this.updateAt = LocalDateTime.now();
    }

    public Item(String itemCode, String itemName, Double mrp) {
        this.itemCode = itemCode;
        this.itemName = itemName;
        this.mrp = mrp;
        this.brandCode = "DEFAULT";
        this.categoryCode = "DEFAULT";
        this.createdAt = LocalDateTime.now();
        this.updateAt = LocalDateTime.now();
        this.purchasePrice = 0.0;
        this.size = "DEFAULT";
        this.status = true; // Default status to avoid DB errors
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
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
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdateAt() { return updateAt; }
    public void setUpdateAt(LocalDateTime updateAt) { this.updateAt = updateAt; }
    public Double getPurchasePrice() { return purchasePrice; }
    public void setPurchasePrice(Double purchasePrice) { this.purchasePrice = purchasePrice; }
    public String getSize() { return size; }
    public void setSize(String size) { this.size = size; }
    public Boolean getStatus() { return status; }
    public void setStatus(Boolean status) { this.status = status; }
}
