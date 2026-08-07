package MJC.RGSons.dto;

public class InventoryReplenishmentRowDTO {
    private String district;
    private String storeCode;
    private String storeName;
    private String itemCode;
    private String itemName;
    private String sizeCode;
    private String size;
    private String category;
    private Double saleQty;
    private Double saleAmount;
    private Integer noOfDays;
    private Double averageDailySale;
    private Integer forecastDays;
    private Double forecastQuantity;
    private Double closingStock;
    private Double shortExcessQty;
    private Double stockCoverageDays;
    private Double suggestedOrderQty;

    public String getDistrict() {
        return district;
    }

    public void setDistrict(String district) {
        this.district = district;
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

    public String getSize() {
        return size;
    }

    public void setSize(String size) {
        this.size = size;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Double getSaleQty() {
        return saleQty;
    }

    public void setSaleQty(Double saleQty) {
        this.saleQty = saleQty;
    }

    public Double getSaleAmount() {
        return saleAmount;
    }

    public void setSaleAmount(Double saleAmount) {
        this.saleAmount = saleAmount;
    }

    public Integer getNoOfDays() {
        return noOfDays;
    }

    public void setNoOfDays(Integer noOfDays) {
        this.noOfDays = noOfDays;
    }

    public Double getAverageDailySale() {
        return averageDailySale;
    }

    public void setAverageDailySale(Double averageDailySale) {
        this.averageDailySale = averageDailySale;
    }

    public Integer getForecastDays() {
        return forecastDays;
    }

    public void setForecastDays(Integer forecastDays) {
        this.forecastDays = forecastDays;
    }

    public Double getForecastQuantity() {
        return forecastQuantity;
    }

    public void setForecastQuantity(Double forecastQuantity) {
        this.forecastQuantity = forecastQuantity;
    }

    public Double getClosingStock() {
        return closingStock;
    }

    public void setClosingStock(Double closingStock) {
        this.closingStock = closingStock;
    }

    public Double getShortExcessQty() {
        return shortExcessQty;
    }

    public void setShortExcessQty(Double shortExcessQty) {
        this.shortExcessQty = shortExcessQty;
    }

    public Double getStockCoverageDays() {
        return stockCoverageDays;
    }

    public void setStockCoverageDays(Double stockCoverageDays) {
        this.stockCoverageDays = stockCoverageDays;
    }

    public Double getSuggestedOrderQty() {
        return suggestedOrderQty;
    }

    public void setSuggestedOrderQty(Double suggestedOrderQty) {
        this.suggestedOrderQty = suggestedOrderQty;
    }
}
