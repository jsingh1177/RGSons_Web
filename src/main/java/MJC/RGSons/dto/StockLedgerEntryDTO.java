package MJC.RGSons.dto;

public class StockLedgerEntryDTO {
    private String date;
    private String description;
    private String extraInfo;
    private String sizeName;
    private String sizeCode;
    private String movementType;
    private String voucherNo;
    private Integer openingQty;
    private Integer purchaseQty;
    private Integer inwardQty;
    private Integer outwardQty;
    private Integer saleQty;
    private Integer balanceQty;
    private Double purchasePrice;
    private Double openingAmount;
    private Double purchaseAmount;
    private Double inwardAmount;
    private Double outwardAmount;
    private Double saleAmount;
    private Double balanceAmount;

    public StockLedgerEntryDTO() {
    }

    public StockLedgerEntryDTO(
            String date,
            String description,
            String extraInfo,
            String sizeName,
            String sizeCode,
            String movementType,
            String voucherNo,
            Integer openingQty,
            Integer purchaseQty,
            Integer inwardQty,
            Integer outwardQty,
            Integer saleQty,
            Integer balanceQty,
            Double purchasePrice,
            Double openingAmount,
            Double purchaseAmount,
            Double inwardAmount,
            Double outwardAmount,
            Double saleAmount,
            Double balanceAmount
    ) {
        this.date = date;
        this.description = description;
        this.extraInfo = extraInfo;
        this.sizeName = sizeName;
        this.sizeCode = sizeCode;
        this.movementType = movementType;
        this.voucherNo = voucherNo;
        this.openingQty = openingQty;
        this.purchaseQty = purchaseQty;
        this.inwardQty = inwardQty;
        this.outwardQty = outwardQty;
        this.saleQty = saleQty;
        this.balanceQty = balanceQty;
        this.purchasePrice = purchasePrice;
        this.openingAmount = openingAmount;
        this.purchaseAmount = purchaseAmount;
        this.inwardAmount = inwardAmount;
        this.outwardAmount = outwardAmount;
        this.saleAmount = saleAmount;
        this.balanceAmount = balanceAmount;
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

    public String getExtraInfo() {
        return extraInfo;
    }

    public void setExtraInfo(String extraInfo) {
        this.extraInfo = extraInfo;
    }

    public String getSizeName() {
        return sizeName;
    }

    public void setSizeName(String sizeName) {
        this.sizeName = sizeName;
    }

    public String getSizeCode() {
        return sizeCode;
    }

    public void setSizeCode(String sizeCode) {
        this.sizeCode = sizeCode;
    }

    public String getMovementType() {
        return movementType;
    }

    public void setMovementType(String movementType) {
        this.movementType = movementType;
    }

    public String getVoucherNo() {
        return voucherNo;
    }

    public void setVoucherNo(String voucherNo) {
        this.voucherNo = voucherNo;
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

    public Double getPurchasePrice() {
        return purchasePrice;
    }

    public void setPurchasePrice(Double purchasePrice) {
        this.purchasePrice = purchasePrice;
    }

    public Double getOpeningAmount() {
        return openingAmount;
    }

    public void setOpeningAmount(Double openingAmount) {
        this.openingAmount = openingAmount;
    }

    public Double getPurchaseAmount() {
        return purchaseAmount;
    }

    public void setPurchaseAmount(Double purchaseAmount) {
        this.purchaseAmount = purchaseAmount;
    }

    public Double getInwardAmount() {
        return inwardAmount;
    }

    public void setInwardAmount(Double inwardAmount) {
        this.inwardAmount = inwardAmount;
    }

    public Double getOutwardAmount() {
        return outwardAmount;
    }

    public void setOutwardAmount(Double outwardAmount) {
        this.outwardAmount = outwardAmount;
    }

    public Double getSaleAmount() {
        return saleAmount;
    }

    public void setSaleAmount(Double saleAmount) {
        this.saleAmount = saleAmount;
    }

    public Double getBalanceAmount() {
        return balanceAmount;
    }

    public void setBalanceAmount(Double balanceAmount) {
        this.balanceAmount = balanceAmount;
    }
}
