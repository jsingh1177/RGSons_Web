package MJC.RGSons.dto;

public class StockLedgerEntryDTO {
    private String date;
    private String description;
    private String referenceNo;
    private Integer openingQty;
    private Integer purchaseQty;
    private Integer inwardQty;
    private Integer outwardQty;
    private Integer saleQty;
    private Integer balanceQty;

    public StockLedgerEntryDTO() {
    }

    public StockLedgerEntryDTO(
            String date,
            String description,
            String referenceNo,
            Integer openingQty,
            Integer purchaseQty,
            Integer inwardQty,
            Integer outwardQty,
            Integer saleQty,
            Integer balanceQty
    ) {
        this.date = date;
        this.description = description;
        this.referenceNo = referenceNo;
        this.openingQty = openingQty;
        this.purchaseQty = purchaseQty;
        this.inwardQty = inwardQty;
        this.outwardQty = outwardQty;
        this.saleQty = saleQty;
        this.balanceQty = balanceQty;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getReferenceNo() {
        return referenceNo;
    }

    public void setReferenceNo(String referenceNo) {
        this.referenceNo = referenceNo;
    }

    public Integer getOpeningQty() {
        return openingQty;
    }

    public void setOpeningQty(Integer openingQty) {
        this.openingQty = openingQty;
    }

    public Integer getPurchaseQty() {
        return purchaseQty;
    }

    public void setPurchaseQty(Integer purchaseQty) {
        this.purchaseQty = purchaseQty;
    }

    public Integer getInwardQty() {
        return inwardQty;
    }

    public void setInwardQty(Integer inwardQty) {
        this.inwardQty = inwardQty;
    }

    public Integer getOutwardQty() {
        return outwardQty;
    }

    public void setOutwardQty(Integer outwardQty) {
        this.outwardQty = outwardQty;
    }

    public Integer getSaleQty() {
        return saleQty;
    }

    public void setSaleQty(Integer saleQty) {
        this.saleQty = saleQty;
    }

    public Integer getBalanceQty() {
        return balanceQty;
    }

    public void setBalanceQty(Integer balanceQty) {
        this.balanceQty = balanceQty;
    }
}

