package MJC.RGSons.dto;

public class PriceSegmentExportRowDTO {
    private String rowType;
    private String districtName;
    private String storeName;
    private String itemName;
    private String sizeName;
    private Integer inwardQty;
    private Integer saleQty;
    private Double contributionInDistrict;
    private Double contributionInStore;
    private Double contributionInTotal;

    public PriceSegmentExportRowDTO() {
    }

    public String getRowType() {
        return rowType;
    }

    public void setRowType(String rowType) {
        this.rowType = rowType;
    }

    public String getDistrictName() {
        return districtName;
    }

    public void setDistrictName(String districtName) {
        this.districtName = districtName;
    }

    public String getStoreName() {
        return storeName;
    }

    public void setStoreName(String storeName) {
        this.storeName = storeName;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
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

    public Double getContributionInDistrict() {
        return contributionInDistrict;
    }

    public void setContributionInDistrict(Double contributionInDistrict) {
        this.contributionInDistrict = contributionInDistrict;
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
