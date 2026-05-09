package MJC.RGSons.dto;

public class PurchaseSummaryDTO {
    private String storeCode;
    private String storeName;
    private String date;
    private String billNumber;
    private String partyInvoiceNo;
    private String supplierName;
    private Integer totalQuantity;
    private Double amount;

    public PurchaseSummaryDTO() {}

    public PurchaseSummaryDTO(String storeCode, String storeName, String date, String billNumber, String partyInvoiceNo, String supplierName, Integer totalQuantity, Double amount) {
        this.storeCode = storeCode;
        this.storeName = storeName;
        this.date = date;
        this.billNumber = billNumber;
        this.partyInvoiceNo = partyInvoiceNo;
        this.supplierName = supplierName;
        this.totalQuantity = totalQuantity;
        this.amount = amount;
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

    public String getPartyInvoiceNo() {
        return partyInvoiceNo;
    }

    public void setPartyInvoiceNo(String partyInvoiceNo) {
        this.partyInvoiceNo = partyInvoiceNo;
    }

    public String getSupplierName() {
        return supplierName;
    }

    public void setSupplierName(String supplierName) {
        this.supplierName = supplierName;
    }

    public Integer getTotalQuantity() {
        return totalQuantity;
    }

    public void setTotalQuantity(Integer totalQuantity) {
        this.totalQuantity = totalQuantity;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }
}
