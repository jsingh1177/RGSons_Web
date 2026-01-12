package MJC.RGSons.dto;

public class CategorySalesDTO {
    private String categoryCode;
    private String categoryName;
    private Double totalSales;

    public CategorySalesDTO(String categoryCode, String categoryName, Double totalSales) {
        this.categoryCode = categoryCode;
        this.categoryName = categoryName;
        this.totalSales = totalSales;
    }

    public String getCategoryCode() {
        return categoryCode;
    }

    public void setCategoryCode(String categoryCode) {
        this.categoryCode = categoryCode;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
    }

    public Double getTotalSales() {
        return totalSales;
    }

    public void setTotalSales(Double totalSales) {
        this.totalSales = totalSales;
    }
}
