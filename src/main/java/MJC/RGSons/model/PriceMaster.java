package MJC.RGSons.model;

import jakarta.persistence.*;

@Entity
@Table(name = "Price_Master")
public class PriceMaster {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "Item_Code", nullable = false)
    private String itemCode;

    @Column(name = "Item_Name", nullable = false)
    private String itemName;

    @Column(name = "Size_Code", nullable = false)
    private String sizeCode;

    @Column(name = "Size_Name", nullable = false)
    private String sizeName;

    @Column(name = "Purchase_Price")
    private Double purchasePrice;

    @Column(name = "MRP")
    private Double mrp;

    public PriceMaster() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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
}
