package MJC.RGSons.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Document(collection = "DSR_Detail")
public class DSR {
    @Id
    private String id;

    @Field("Store")
    private String store;

    @Field("Business_date")
    private String businessDate;

    @Field("Item_code")
    private String itemCode;

    @Field("Item_name")
    private String itemName;

    @Field("Size_Code")
    private String sizeCode;

    @Field("Size_Name")
    private String sizeName;

    @Field("Purchase_Price")
    private Double purchasePrice;

    @Field("MRP")
    private Double mrp;

    @Field("Opening")
    private Integer opening;

    @Field("Inward")
    private Integer inward;

    @Field("Outward")
    private Integer outward;

    @Field("Sale")
    private Integer sale;

    @Field("Closing")
    private Integer closing;

    @Field("Created_at")
    private LocalDateTime createdAt;

    @Field("Updated_at")
    private LocalDateTime updatedAt;

    public DSR() {
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

    public String getStore() {
        return store;
    }

    public void setStore(String store) {
        this.store = store;
    }

    public String getBusinessDate() {
        return businessDate;
    }

    public void setBusinessDate(String businessDate) {
        this.businessDate = businessDate;
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

    public Double getPurchasePrice() {
        return purchasePrice;
    }

    public void setPurchasePrice(Double purchasePrice) {
        this.purchasePrice = purchasePrice;
    }

    public Double getMrp() {
        return mrp;
    }

    public void setMrp(Double mrp) {
        this.mrp = mrp;
    }

    public Integer getOpening() {
        return opening;
    }

    public void setOpening(Integer opening) {
        this.opening = opening;
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

    public Integer getSale() {
        return sale;
    }

    public void setSale(Integer sale) {
        this.sale = sale;
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
