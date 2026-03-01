package MJC.RGSons.dto;

import java.util.ArrayList;
import java.util.List;

public class ClosingStockDetailedReportDTO {
    private String storeName;
    private String district;
    private String reportDate;
    private Double grandTotalQty = 0.0;
    private Double grandTotalAmount = 0.0;
    private List<CategoryGroup> categories = new ArrayList<>();
    private List<String> sortedSizes = new ArrayList<>();

    public String getStoreName() { return storeName; }
    public void setStoreName(String storeName) { this.storeName = storeName; }

    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }

    public String getReportDate() { return reportDate; }
    public void setReportDate(String reportDate) { this.reportDate = reportDate; }

    public Double getGrandTotalQty() { return grandTotalQty; }
    public void setGrandTotalQty(Double grandTotalQty) { this.grandTotalQty = grandTotalQty; }

    public Double getGrandTotalAmount() { return grandTotalAmount; }
    public void setGrandTotalAmount(Double grandTotalAmount) { this.grandTotalAmount = grandTotalAmount; }

    public List<CategoryGroup> getCategories() { return categories; }
    public void setCategories(List<CategoryGroup> categories) { this.categories = categories; }

    public List<String> getSortedSizes() { return sortedSizes; }
    public void setSortedSizes(List<String> sortedSizes) { this.sortedSizes = sortedSizes; }

    public static class CategoryGroup {
        private String categoryName;
        private Double totalQty = 0.0;
        private Double totalAmount = 0.0;
        private List<ItemDetail> items = new ArrayList<>();

        public String getCategoryName() { return categoryName; }
        public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

        public Double getTotalQty() { return totalQty; }
        public void setTotalQty(Double totalQty) { this.totalQty = totalQty; }

        public Double getTotalAmount() { return totalAmount; }
        public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

        public List<ItemDetail> getItems() { return items; }
        public void setItems(List<ItemDetail> items) { this.items = items; }
    }

    public static class ItemDetail {
        private String itemName;
        private String sizeName;
        private Double qty;
        private Double rate;
        private Double amount;

        public String getItemName() { return itemName; }
        public void setItemName(String itemName) { this.itemName = itemName; }

        public String getSizeName() { return sizeName; }
        public void setSizeName(String sizeName) { this.sizeName = sizeName; }

        public Double getQty() { return qty; }
        public void setQty(Double qty) { this.qty = qty; }

        public Double getRate() { return rate; }
        public void setRate(Double rate) { this.rate = rate; }

        public Double getAmount() { return amount; }
        public void setAmount(Double amount) { this.amount = amount; }
    }
}
