package MJC.RGSons.dto;

import java.util.HashMap;
import java.util.Map;

public class ClosingStockReportDTO {
    private String district;
    private String storeName;
    private Map<String, Double> categoryAmounts = new HashMap<>();
    private Map<String, Double> categoryQuantities = new HashMap<>();
    private Double totalAmount = 0.0;
    private Double totalQty = 0.0;

    public ClosingStockReportDTO(String district, String storeName) {
        this.district = district;
        this.storeName = storeName;
    }

    public String getDistrict() {
        return district;
    }

    public void setDistrict(String district) {
        this.district = district;
    }

    public String getStoreName() {
        return storeName;
    }

    public void setStoreName(String storeName) {
        this.storeName = storeName;
    }

    public Map<String, Double> getCategoryAmounts() {
        return categoryAmounts;
    }

    public void setCategoryAmounts(Map<String, Double> categoryAmounts) {
        this.categoryAmounts = categoryAmounts;
    }

    public Map<String, Double> getCategoryQuantities() {
        return categoryQuantities;
    }

    public void setCategoryQuantities(Map<String, Double> categoryQuantities) {
        this.categoryQuantities = categoryQuantities;
    }

    public void addCategoryData(String category, Double qty, Double amount) {
        this.categoryQuantities.put(category, qty);
        this.categoryAmounts.put(category, amount);
        this.totalQty += qty;
        this.totalAmount += amount;
    }

    public Double getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(Double totalAmount) {
        this.totalAmount = totalAmount;
    }

    public Double getTotalQty() {
        return totalQty;
    }

    public void setTotalQty(Double totalQty) {
        this.totalQty = totalQty;
    }
}
