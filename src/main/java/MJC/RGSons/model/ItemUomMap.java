package MJC.RGSons.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "ITEM_UOM_MAP")
public class ItemUomMap {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "State_Code")
    private String stateCode;

    @Column(name = "Item_Code")
    private String itemCode;

    @Column(name = "Size_Code")
    private String sizeCode;

    @Column(name = "UOM")
    private String baseUom;

    @Column(name = "Alt_UOM")
    private String altUom;

    @Column(name = "Factor", precision = 18, scale = 4)
    private BigDecimal factor;

    @Column(name = "Purchase_Price")
    private Double purchasePrice;

    @Column(name = "Sale_Price")
    private Double salePrice;

    @Column(name = "MRP")
    private Double mrp;

    public ItemUomMap() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getStateCode() { return stateCode; }
    public void setStateCode(String stateCode) { this.stateCode = stateCode; }

    public String getItemCode() { return itemCode; }
    public void setItemCode(String itemCode) { this.itemCode = itemCode; }

    public String getSizeCode() { return sizeCode; }
    public void setSizeCode(String sizeCode) { this.sizeCode = sizeCode; }

    public String getBaseUom() { return baseUom; }
    public void setBaseUom(String baseUom) { this.baseUom = baseUom; }

    public String getAltUom() { return altUom; }
    public void setAltUom(String altUom) { this.altUom = altUom; }

    public BigDecimal getFactor() { return factor; }
    public void setFactor(BigDecimal factor) { this.factor = factor; }

    public Double getPurchasePrice() { return purchasePrice; }
    public void setPurchasePrice(Double purchasePrice) { this.purchasePrice = purchasePrice; }

    public Double getSalePrice() { return salePrice; }
    public void setSalePrice(Double salePrice) { this.salePrice = salePrice; }

    public Double getMrp() { return mrp; }
    public void setMrp(Double mrp) { this.mrp = mrp; }
}
