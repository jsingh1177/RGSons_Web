package MJC.RGSons.dto;

public class DistrictWiseDailySaleDTO {
    private String districtName;
    private String storeCode;
    private String storeName;
    private String date;
    private String billNumber;
    private Integer totalQty;
    private Double saleAmount;
    private Double otherSale;
    private Double expense;
    private Double totalSale;
    private Double tenderAmount;

    public DistrictWiseDailySaleDTO(String districtName, String storeCode, String storeName, String date, String billNumber,
                                    Integer totalQty, Double saleAmount, Double otherSale, Double expense, Double totalSale, Double tenderAmount) {
        this.districtName = districtName;
        this.storeCode = storeCode;
        this.storeName = storeName;
        this.date = date;
        this.billNumber = billNumber;
        this.totalQty = totalQty;
        this.saleAmount = saleAmount;
        this.otherSale = otherSale;
        this.expense = expense;
        this.totalSale = totalSale;
        this.tenderAmount = tenderAmount;
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

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getBillNumber() {
        return billNumber;
    }

    public void setBillNumber(String billNumber) {
        this.billNumber = billNumber;
    }

    public Integer getTotalQty() {
        return totalQty;
    }

    public void setTotalQty(Integer totalQty) {
        this.totalQty = totalQty;
    }

    public Double getSaleAmount() {
        return saleAmount;
    }

    public void setSaleAmount(Double saleAmount) {
        this.saleAmount = saleAmount;
    }

    public Double getOtherSale() {
        return otherSale;
    }

    public void setOtherSale(Double otherSale) {
        this.otherSale = otherSale;
    }

    public Double getExpense() {
        return expense;
    }

    public void setExpense(Double expense) {
        this.expense = expense;
    }

    public Double getTotalSale() {
        return totalSale;
    }

    public void setTotalSale(Double totalSale) {
        this.totalSale = totalSale;
    }

    public Double getTenderAmount() {
        return tenderAmount;
    }

    public void setTenderAmount(Double tenderAmount) {
        this.tenderAmount = tenderAmount;
    }
}

