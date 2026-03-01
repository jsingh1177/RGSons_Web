package MJC.RGSons.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import java.time.LocalDateTime;

@Entity
@Table(name = "Inventory_Master")
public class InventoryMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "Store_code")
    private String storeCode;

    @Column(name = "Item_code")
    private String itemCode;

    @Column(name = "Item_Name")
    private String itemName;

    @Column(name = "Size_code")
    private String sizeCode;

    @Column(name = "Size_name")
    private String sizeName;

    @Column(name = "business_date")
    private String businessDate;

    @Column(name = "Opening")
    private Integer opening;

    @Column(name = "Purchase")
    private Integer purchase;

    @Column(name = "Inward")
    private Integer inward;

    @Column(name = "Outward")
    private Integer outward;

    @Column(name = "Closing")
    private Integer closing;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public InventoryMaster() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getStoreCode() {
        return storeCode;
    }

    public void setStoreCode(String storeCode) {
        this.storeCode = storeCode;
    }

    public String getItemCode() {
        return itemCode;
    }

    public void setItemCode(String itemCode) {
        this.itemCode = itemCode;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public String getSizeCode() {
        return sizeCode;
    }

    public void setSizeCode(String sizeCode) {
        this.sizeCode = sizeCode;
    }

    public String getSizeName() {
        return sizeName;
    }

    public void setSizeName(String sizeName) {
        this.sizeName = sizeName;
    }

    public String getBusinessDate() {
        return businessDate;
    }

    public void setBusinessDate(String businessDate) {
        this.businessDate = businessDate;
    }

    public Integer getOpening() {
        return opening;
    }

    public void setOpening(Integer opening) {
        this.opening = opening;
    }

    public Integer getPurchase() {
        return purchase;
    }

    public void setPurchase(Integer purchase) {
        this.purchase = purchase;
    }

    public Integer getInward() {
        return inward;
    }

    public void setInward(Integer inward) {
        this.inward = inward;
    }

    public Integer getOutward() {
        return outward;
    }

    public void setOutward(Integer outward) {
        this.outward = outward;
    }

    public Integer getClosing() {
        return closing;
    }

    public void setClosing(Integer closing) {
        this.closing = closing;
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
