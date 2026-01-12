package MJC.RGSons.dto;

public class StoreSalesDTO {
    private String storeCode;
    private String storeName;
    private Double totalSales;

    public StoreSalesDTO(String storeCode, String storeName, Double totalSales) {
        this.storeCode = storeCode;
        this.storeName = storeName;
        this.totalSales = totalSales;
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

    public Double getTotalSales() {
        return totalSales;
    }

    public void setTotalSales(Double totalSales) {
        this.totalSales = totalSales;
    }
}
