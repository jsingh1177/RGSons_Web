package MJC.RGSons.dto;

public class ItemPartyPurchaseDTO {
    private String brandName;
    private String itemName;
    private String partyName;
    private Integer qty;
    private Double amt;

    public ItemPartyPurchaseDTO() {}

    public ItemPartyPurchaseDTO(String brandName, String itemName, String partyName, Integer qty, Double amt) {
        this.brandName = brandName;
        this.itemName = itemName;
        this.partyName = partyName;
        this.qty = qty;
        this.amt = amt;
    }

    public String getBrandName() {
        return brandName;
    }

    public void setBrandName(String brandName) {
        this.brandName = brandName;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public String getPartyName() {
        return partyName;
    }

    public void setPartyName(String partyName) {
        this.partyName = partyName;
    }

    public Integer getQty() {
        return qty;
    }

    public void setQty(Integer qty) {
        this.qty = qty;
    }

    public Double getAmt() {
        return amt;
    }

    public void setAmt(Double amt) {
        this.amt = amt;
    }
}
