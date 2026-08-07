package MJC.RGSons.dto;

public class InventoryReplenishmentSummaryDTO {
    private Double totalSaleQty;
    private Double totalSaleAmount;
    private Double totalClosingStock;
    private Double totalForecastQty;
    private Double totalSuggestedOrderQty;
    private Integer totalShortItems;
    private Integer totalExcessItems;

    public Double getTotalSaleQty() {
        return totalSaleQty;
    }

    public void setTotalSaleQty(Double totalSaleQty) {
        this.totalSaleQty = totalSaleQty;
    }

    public Double getTotalSaleAmount() {
        return totalSaleAmount;
    }

    public void setTotalSaleAmount(Double totalSaleAmount) {
        this.totalSaleAmount = totalSaleAmount;
    }

    public Double getTotalClosingStock() {
        return totalClosingStock;
    }

    public void setTotalClosingStock(Double totalClosingStock) {
        this.totalClosingStock = totalClosingStock;
    }

    public Double getTotalForecastQty() {
        return totalForecastQty;
    }

    public void setTotalForecastQty(Double totalForecastQty) {
        this.totalForecastQty = totalForecastQty;
    }

    public Double getTotalSuggestedOrderQty() {
        return totalSuggestedOrderQty;
    }

    public void setTotalSuggestedOrderQty(Double totalSuggestedOrderQty) {
        this.totalSuggestedOrderQty = totalSuggestedOrderQty;
    }

    public Integer getTotalShortItems() {
        return totalShortItems;
    }

    public void setTotalShortItems(Integer totalShortItems) {
        this.totalShortItems = totalShortItems;
    }

    public Integer getTotalExcessItems() {
        return totalExcessItems;
    }

    public void setTotalExcessItems(Integer totalExcessItems) {
        this.totalExcessItems = totalExcessItems;
    }
}
