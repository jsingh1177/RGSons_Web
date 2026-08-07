package MJC.RGSons.dto;

public class PriceSegmentReportDTO {
    private String districtName;
    private String storeCode;
    private String storeName;
    private String itemCode;
    private String itemName;
    private String sizeCode;
    private String sizeName;
    private Integer inwardQty;
    private Integer saleQty;
    private Double contributionInStore;
    private Double contributionInTotal;

    public PriceSegmentReportDTO(
            String districtName,
            String storeCode,
            String storeName,
            String itemCode,
            String itemName,
            String sizeCode,
            String sizeName,
            Integer inwardQty,
            Integer saleQty,
            Double contributionInStore,
            Double contributionInTotal
    ) {
        this.districtName = districtName;
        this.storeCode = storeCode;
        this.storeName = storeName;
        this.itemCode = itemCode;
        this.itemName = itemName;
        this.sizeCode = sizeCode;
        this.sizeName = sizeName;
        this.inwardQty = inwardQty;
        this.saleQty = saleQty;
        this.contributionInStore = contributionInStore;
        this.contributionInTotal = contributionInTotal;
    }

    public String getDistrictName() {
        return districtName;
    }

    public void setDistrictName(String districtName) {
        this.districtName = districtName;
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

    public Integer getInwardQty() {
        return inwardQty;
    }

    public void setInwardQty(Integer inwardQty) {
        this.inwardQty = inwardQty;
    }

    public Integer getSaleQty() {
        return saleQty;
    }

    public void setSaleQty(Integer saleQty) {
        this.saleQty = saleQty;
    }

    public Double getContributionInStore() {
        return contributionInStore;
    }

    public void setContributionInStore(Double contributionInStore) {
        this.contributionInStore = contributionInStore;
    }

    public Double getContributionInTotal() {
        return contributionInTotal;
    }

    public void setContributionInTotal(Double contributionInTotal) {
        this.contributionInTotal = contributionInTotal;
    }
}

